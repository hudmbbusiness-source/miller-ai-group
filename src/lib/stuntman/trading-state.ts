/**
 * TRADING STATE PERSISTENCE
 *
 * Stores all trading state in Supabase so it NEVER gets lost.
 * This ensures positions, P&L, and trade history survive serverless restarts.
 *
 * State includes:
 * - Current open position
 * - Daily trades count
 * - Total P&L
 * - Trade history
 * - Auto-trading enabled status
 */

import { createClient } from '@supabase/supabase-js'

// Supabase client for persistence
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// State key for the trading state
const TRADING_STATE_KEY = 'stuntman_live_trading_state'

// =============================================================================
// TYPES
// =============================================================================

export interface OpenPosition {
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  contracts: number
  patternId: string
  entryTime: string  // ISO timestamp
  symbol: string
}

export interface TradeRecord {
  id: string
  time: string
  pattern: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  contracts: number
  pnl: number
  exitReason: string
}

export interface TradingState {
  // Auto-trading
  enabled: boolean

  // Current position
  currentPosition: OpenPosition | null

  // Daily tracking
  dailyTrades: number
  dailyPnL: number
  lastTradeDate: string  // YYYY-MM-DD

  // Cumulative
  totalPnL: number
  totalTrades: number
  totalWins: number
  totalLosses: number

  // History (last 50 trades)
  tradeHistory: TradeRecord[]

  // Metadata
  lastUpdated: string
  accountId: string
}

// Default state - NOTE: accountId should be set from environment, not hardcoded
const DEFAULT_STATE: TradingState = {
  enabled: false, // CRITICAL: Default to DISABLED for safety
  currentPosition: null,
  dailyTrades: 0,
  dailyPnL: 0,
  lastTradeDate: new Date().toISOString().split('T')[0],
  totalPnL: 0,
  totalTrades: 0,
  totalWins: 0,
  totalLosses: 0,
  tradeHistory: [],
  lastUpdated: new Date().toISOString(),
  accountId: process.env.APEX_ACCOUNT_ID || 'NOT_CONFIGURED' // NO hardcoded fallback
}

// In-memory cache
let cachedState: TradingState | null = null
let lastLoadTime = 0
const CACHE_TTL = 2000 // 2 seconds cache

// =============================================================================
// LOAD STATE
// =============================================================================

export async function loadTradingState(): Promise<TradingState> {
  // Check cache first
  const now = Date.now()
  if (cachedState && (now - lastLoadTime) < CACHE_TTL) {
    return cachedState
  }

  if (!supabase) {
    console.log('[TradingState] Supabase not configured, using in-memory state')
    if (!cachedState) {
      cachedState = { ...DEFAULT_STATE }
    }
    return cachedState
  }

  try {
    const { data, error } = await supabase
      .from('stuntman_trading_state')
      .select('state')
      .eq('key', TRADING_STATE_KEY)
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.log('[TradingState] No saved state found, using defaults')
        cachedState = { ...DEFAULT_STATE }
        lastLoadTime = now
        return cachedState
      }
      console.error('[TradingState] Load error:', error)
      cachedState = cachedState || { ...DEFAULT_STATE }
      return cachedState
    }

    if (data?.state) {
      cachedState = data.state as TradingState

      // Reset daily counters if new day
      const today = new Date().toISOString().split('T')[0]
      if (cachedState.lastTradeDate !== today) {
        console.log(`[TradingState] New day detected, resetting daily counters`)
        cachedState.dailyTrades = 0
        cachedState.dailyPnL = 0
        cachedState.lastTradeDate = today
        // Save the reset
        await saveTradingState(cachedState)
      }

      lastLoadTime = now
      console.log(`[TradingState] Loaded: enabled=${cachedState.enabled}, position=${cachedState.currentPosition?.direction || 'NONE'}, dailyTrades=${cachedState.dailyTrades}`)
      return cachedState
    }

    cachedState = { ...DEFAULT_STATE }
    lastLoadTime = now
    return cachedState

  } catch (error) {
    console.error('[TradingState] Load exception:', error)
    cachedState = cachedState || { ...DEFAULT_STATE }
    return cachedState
  }
}

// =============================================================================
// SAVE STATE
// =============================================================================

export async function saveTradingState(state: TradingState): Promise<boolean> {
  // Update cache immediately
  state.lastUpdated = new Date().toISOString()
  cachedState = state
  lastLoadTime = Date.now()

  if (!supabase) {
    console.log('[TradingState] Supabase not configured, state only in memory')
    return false
  }

  try {
    const { error } = await supabase
      .from('stuntman_trading_state')
      .upsert({
        key: TRADING_STATE_KEY,
        state: state,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('[TradingState] Save error:', error)
      return false
    }

    console.log(`[TradingState] Saved: enabled=${state.enabled}, position=${state.currentPosition?.direction || 'NONE'}`)
    return true

  } catch (error) {
    console.error('[TradingState] Save exception:', error)
    return false
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Enable/disable auto-trading
 */
export async function setAutoTradingEnabled(enabled: boolean): Promise<TradingState> {
  const state = await loadTradingState()
  state.enabled = enabled
  await saveTradingState(state)
  return state
}

/**
 * Open a new position
 */
export async function openPosition(position: OpenPosition): Promise<TradingState> {
  const state = await loadTradingState()

  if (state.currentPosition) {
    console.warn('[TradingState] Already have an open position!')
    return state
  }

  state.currentPosition = position
  state.dailyTrades++
  await saveTradingState(state)

  console.log(`[TradingState] Opened ${position.direction} position at ${position.entryPrice}`)
  return state
}

/**
 * Close current position
 */
export async function closePosition(exitPrice: number, exitReason: string): Promise<{ state: TradingState, pnl: number }> {
  const state = await loadTradingState()

  if (!state.currentPosition) {
    console.warn('[TradingState] No position to close!')
    return { state, pnl: 0 }
  }

  const pos = state.currentPosition
  const pointValue = 50 // ES point value
  const priceDiff = pos.direction === 'LONG'
    ? exitPrice - pos.entryPrice
    : pos.entryPrice - exitPrice
  const pnl = priceDiff * pointValue * pos.contracts

  // Record the trade
  const trade: TradeRecord = {
    id: `trade_${Date.now()}`,
    time: new Date().toISOString(),
    pattern: pos.patternId,
    direction: pos.direction,
    entryPrice: pos.entryPrice,
    exitPrice: exitPrice,
    contracts: pos.contracts,
    pnl: pnl,
    exitReason: exitReason
  }

  // Update state
  state.currentPosition = null
  state.dailyPnL += pnl
  state.totalPnL += pnl
  state.totalTrades++

  if (pnl >= 0) {
    state.totalWins++
  } else {
    state.totalLosses++
  }

  // Add to history (keep last 50)
  state.tradeHistory.unshift(trade)
  if (state.tradeHistory.length > 50) {
    state.tradeHistory = state.tradeHistory.slice(0, 50)
  }

  await saveTradingState(state)

  console.log(`[TradingState] Closed position: ${exitReason}, P&L: $${pnl.toFixed(2)}`)
  return { state, pnl }
}

/**
 * Get current state (cached if fresh)
 */
export async function getTradingState(): Promise<TradingState> {
  return loadTradingState()
}

/**
 * Ensure the table exists
 */
export async function ensureTradingStateTable(): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    // Try to insert default state - will fail if table doesn't exist
    const { error } = await supabase
      .from('stuntman_trading_state')
      .upsert({
        key: TRADING_STATE_KEY,
        state: DEFAULT_STATE,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      })

    if (error && error.message?.includes('does not exist')) {
      console.log('[TradingState] Table does not exist, needs to be created via migration')
      return false
    }

    return true
  } catch (error) {
    console.error('[TradingState] Table check error:', error)
    return false
  }
}

/**
 * Force clear position (emergency use only)
 */
export async function forceCleatPosition(): Promise<TradingState> {
  const state = await loadTradingState()
  state.currentPosition = null
  await saveTradingState(state)
  console.log('[TradingState] Force cleared position')
  return state
}
