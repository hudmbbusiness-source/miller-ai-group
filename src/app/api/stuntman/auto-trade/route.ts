/**
 * StuntMan Auto-Trading API
 *
 * Fully automated trading system that:
 * 1. Fetches real-time market data
 * 2. Generates signals using the signal engine
 * 3. Executes trades via PickMyTrade
 * 4. Manages positions and risk
 * 5. Tracks P&L and performance
 *
 * POST /api/stuntman/auto-trade - Start/stop auto-trading
 * GET /api/stuntman/auto-trade - Get status and stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateSignal,
  calculateOptimalSize,
  getCurrentSession,
  Candle,
  Signal,
} from '@/lib/stuntman/signal-engine'
import {
  PickMyTradeClient,
  getCurrentContractSymbol,
  ES_POINT_VALUE,
  NQ_POINT_VALUE,
} from '@/lib/stuntman/pickmytrade-client'

// =============================================================================
// TYPES
// =============================================================================

interface Position {
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  contracts: number
  stopLoss: number
  takeProfit: number
  entryTime: number
  signal: Signal
}

interface Trade {
  id: string
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  contracts: number
  pnl: number
  entryTime: number
  exitTime: number
  reason: string
}

interface AutoTraderState {
  enabled: boolean
  instrument: 'ES' | 'NQ'
  position: Position | null
  lastSignal: Signal | null
  lastCheck: number
  todayTrades: Trade[]
  todayPnL: number
  totalTrades: number
  wins: number
  losses: number
  startBalance: number
  currentBalance: number
}

// =============================================================================
// STATE (In production, use Redis or database)
// =============================================================================

let state: AutoTraderState = {
  enabled: false,
  instrument: 'ES',
  position: null,
  lastSignal: null,
  lastCheck: 0,
  todayTrades: [],
  todayPnL: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  startBalance: 150000,
  currentBalance: 150000,
}

// PickMyTrade client
let client: PickMyTradeClient | null = null

function getClient(): PickMyTradeClient | null {
  if (!client && process.env.PICKMYTRADE_TOKEN) {
    client = new PickMyTradeClient({
      token: process.env.PICKMYTRADE_TOKEN,
      accountId: process.env.APEX_ACCOUNT_ID || 'APEX-456334',
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 5,
      enabled: true,
    })
  }
  return client
}

// =============================================================================
// MARKET DATA FETCHING
// =============================================================================

async function fetchCandles(
  instrument: 'ES' | 'NQ',
  timeframe: '1' | '5' | '15',
  count: number = 100
): Promise<Candle[]> {
  try {
    // Using Crypto.com for BTC as proxy (in production, use futures data provider)
    // For now, we'll generate synthetic data based on current price
    // TODO: Integrate with real futures data provider (Tradovate, Rithmic, etc.)

    const symbol = instrument === 'ES' ? 'BTC_USDT' : 'ETH_USDT'
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${symbol}&timeframe=${timeframe}m&count=${count}`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      throw new Error('Failed to fetch candles')
    }

    const data = await res.json()

    if (data.result?.data) {
      // Scale prices to ES/NQ range
      const multiplier = instrument === 'ES' ? 60 : 200 // Approximate scaling
      return data.result.data.map((c: any) => ({
        time: c.t,
        open: c.o * multiplier / 1000,
        high: c.h * multiplier / 1000,
        low: c.l * multiplier / 1000,
        close: c.c * multiplier / 1000,
        volume: c.v,
      }))
    }

    return []
  } catch (e) {
    console.error('Failed to fetch candles:', e)
    return []
  }
}

// =============================================================================
// TRADE EXECUTION
// =============================================================================

async function executeEntry(signal: Signal, instrument: 'ES' | 'NQ'): Promise<boolean> {
  const pmt = getClient()
  if (!pmt || !pmt.isEnabled) {
    console.log('[AutoTrade] PickMyTrade not available')
    return false
  }

  const symbol = getCurrentContractSymbol(instrument)
  const pointValue = instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE

  // Calculate position size based on signal confidence and risk
  const stopDistance = Math.abs(signal.entry - signal.stopLoss)
  const contracts = calculateOptimalSize(
    state.currentBalance,
    stopDistance,
    instrument,
    5000 - (150000 - state.currentBalance), // Remaining drawdown
    signal.confidence
  )

  const dollarStop = stopDistance * pointValue * contracts
  const dollarTarget = Math.abs(signal.takeProfit - signal.entry) * pointValue * contracts

  const result = await pmt.executeSignal({
    action: signal.direction === 'LONG' ? 'BUY' : 'SELL',
    symbol,
    quantity: contracts,
    orderType: 'MKT',
    dollarStopLoss: dollarStop,
    dollarTakeProfit: dollarTarget,
    reason: signal.strategy,
  })

  if (result.success) {
    state.position = {
      instrument,
      direction: signal.direction as 'LONG' | 'SHORT',
      entryPrice: signal.entry,
      contracts,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      entryTime: Date.now(),
      signal,
    }
    console.log(`[AutoTrade] Opened ${signal.direction} position: ${contracts}x ${symbol}`)
    return true
  }

  console.error('[AutoTrade] Entry failed:', result.message)
  return false
}

async function executeExit(reason: string, exitPrice: number): Promise<boolean> {
  if (!state.position) return false

  const pmt = getClient()
  if (!pmt) return false

  const symbol = getCurrentContractSymbol(state.position.instrument)
  const result = await pmt.closePosition(symbol)

  if (result.success) {
    const pointValue = state.position.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE
    const priceDiff = state.position.direction === 'LONG'
      ? exitPrice - state.position.entryPrice
      : state.position.entryPrice - exitPrice
    const pnl = priceDiff * pointValue * state.position.contracts

    // Record trade
    const trade: Trade = {
      id: `T${Date.now()}`,
      instrument: state.position.instrument,
      direction: state.position.direction,
      entryPrice: state.position.entryPrice,
      exitPrice,
      contracts: state.position.contracts,
      pnl,
      entryTime: state.position.entryTime,
      exitTime: Date.now(),
      reason,
    }

    state.todayTrades.push(trade)
    state.todayPnL += pnl
    state.totalTrades++
    if (pnl > 0) state.wins++
    else state.losses++
    state.currentBalance += pnl
    state.position = null

    console.log(`[AutoTrade] Closed position: ${reason}, P&L: $${pnl.toFixed(2)}`)
    return true
  }

  return false
}

// =============================================================================
// AUTO-TRADING LOOP
// =============================================================================

async function runAutoTrader(): Promise<void> {
  if (!state.enabled) return

  const session = getCurrentSession()

  // Only trade during RTH
  if (session !== 'RTH') {
    console.log('[AutoTrade] Outside trading hours, waiting...')
    return
  }

  // Fetch candles for all timeframes
  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchCandles(state.instrument, '1', 100),
    fetchCandles(state.instrument, '5', 100),
    fetchCandles(state.instrument, '15', 100),
  ])

  if (candles1m.length === 0 || candles5m.length === 0 || candles15m.length === 0) {
    console.log('[AutoTrade] No candle data available')
    return
  }

  // Generate signal
  const signal = generateSignal(candles1m, candles5m, candles15m, state.instrument)
  state.lastSignal = signal
  state.lastCheck = Date.now()

  const currentPrice = candles1m[candles1m.length - 1].close

  // Position management
  if (state.position) {
    // Check stop loss
    if (state.position.direction === 'LONG' && currentPrice <= state.position.stopLoss) {
      await executeExit('Stop Loss Hit', currentPrice)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice >= state.position.stopLoss) {
      await executeExit('Stop Loss Hit', currentPrice)
      return
    }

    // Check take profit
    if (state.position.direction === 'LONG' && currentPrice >= state.position.takeProfit) {
      await executeExit('Take Profit Hit', currentPrice)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice <= state.position.takeProfit) {
      await executeExit('Take Profit Hit', currentPrice)
      return
    }

    // Check for reversal signal
    if (signal.direction !== 'FLAT' && signal.direction !== state.position.direction && signal.confidence > 75) {
      await executeExit('Reversal Signal', currentPrice)
      await executeEntry(signal, state.instrument)
    }
  } else {
    // No position - look for entry
    if (signal.direction !== 'FLAT' && signal.confidence >= 65) {
      await executeEntry(signal, state.instrument)
    }
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const winRate = state.totalTrades > 0
      ? (state.wins / state.totalTrades) * 100
      : 0

    const profitFactor = state.losses > 0 && state.wins > 0
      ? state.todayTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) /
        Math.abs(state.todayTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
      : 0

    // Calculate Apex withdrawal amount (after passing evaluation)
    const profitAboveTarget = Math.max(0, state.todayPnL - 9000)
    const withdrawable = state.todayPnL >= 9000 ? profitAboveTarget * 0.9 : 0 // 90% payout

    return NextResponse.json({
      success: true,
      status: {
        enabled: state.enabled,
        instrument: state.instrument,
        session: getCurrentSession(),
        hasPosition: !!state.position,
        position: state.position,
        lastSignal: state.lastSignal,
        lastCheck: state.lastCheck,
      },
      performance: {
        todayPnL: state.todayPnL,
        todayTrades: state.todayTrades.length,
        totalTrades: state.totalTrades,
        wins: state.wins,
        losses: state.losses,
        winRate,
        profitFactor,
        startBalance: state.startBalance,
        currentBalance: state.currentBalance,
        drawdownUsed: state.startBalance - state.currentBalance,
        profitTarget: 9000,
        targetProgress: (state.todayPnL / 9000) * 100,
        withdrawable,
      },
      recentTrades: state.todayTrades.slice(-10),
      configured: !!process.env.PICKMYTRADE_TOKEN,
    })
  } catch (e) {
    console.error('Auto-trade status error:', e)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (body.action === 'start') {
      if (!process.env.PICKMYTRADE_TOKEN) {
        return NextResponse.json({
          error: 'PickMyTrade not configured',
          message: 'Add PICKMYTRADE_TOKEN to enable auto-trading',
        }, { status: 503 })
      }

      state.enabled = true
      state.instrument = body.instrument || 'ES'

      // Run immediately
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        message: 'Auto-trading started',
        instrument: state.instrument,
      })
    }

    if (body.action === 'stop') {
      state.enabled = false

      // Close any open position
      if (state.position) {
        const candles = await fetchCandles(state.instrument, '1', 1)
        const currentPrice = candles[0]?.close || state.position.entryPrice
        await executeExit('Manual Stop', currentPrice)
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-trading stopped',
      })
    }

    if (body.action === 'check') {
      // Manual trigger for signal check
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        signal: state.lastSignal,
        position: state.position,
      })
    }

    if (body.action === 'reset') {
      // Reset daily stats
      state.todayTrades = []
      state.todayPnL = 0
      state.currentBalance = state.startBalance

      return NextResponse.json({
        success: true,
        message: 'Daily stats reset',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    console.error('Auto-trade error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
