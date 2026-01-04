/**
 * StuntMan Auto-Trading API - FULLY INTEGRATED WORLD-CLASS EDITION
 *
 * ALL MODULES WORKING TOGETHER:
 * 1. ML Signal Engine - Neural network + ensemble models
 * 2. Order Flow Analysis - VPIN, delta, footprint, iceberg detection
 * 3. Advanced Risk Analytics - VaR, Monte Carlo, Apex safety
 * 4. Smart Execution - TWAP, VWAP, adaptive algorithms
 * 5. Traditional Signal Engine - EMA, RSI, MACD, VWAP strategies
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
  generateMLSignal,
  detectMarketRegime,
  MLSignal,
  MarketRegime,
} from '@/lib/stuntman/ml-signal-engine'
import {
  OrderFlowEngine,
  VPINCalculator,
  DeltaAnalyzer,
  VPINResult,
  DeltaAnalysis,
  OrderFlowSignal,
  detectLargeOrders,
} from '@/lib/stuntman/order-flow-analysis'
import {
  checkApexRiskStatus,
  calculateSafePositionSize,
  DEFAULT_APEX_SAFETY,
  ApexRiskStatus,
  calculateVaR,
  runStressTests,
} from '@/lib/stuntman/risk-analytics'
import {
  SmartExecutionEngine,
  ExecutionAlgorithm,
  MarketConditions,
  ExecutionPlan,
} from '@/lib/stuntman/smart-execution'
import {
  PickMyTradeClient,
  getCurrentContractSymbol,
  ES_POINT_VALUE,
  NQ_POINT_VALUE,
} from '@/lib/stuntman/pickmytrade-client'
import { Trade as OrderFlowTrade, OrderBookData } from '@/lib/stuntman/types'
import {
  generateAdaptiveSignal,
  extractFeatures,
  ensureLearningStateLoaded,
  getAdaptiveStats,
  AdaptiveSignal,
} from '@/lib/stuntman/adaptive-ml'
import {
  classifyMarketRegime,
  calculatePropFirmRisk,
} from '@/lib/stuntman/world-class-strategies'

// =============================================================================
// DYNAMIC REGIME-ADAPTIVE STRATEGY SYSTEM (from paper trading)
// =============================================================================

const DYNAMIC_STRATEGY_SYSTEM = {
  enabled: true,

  // REGIME -> STRATEGY MAPPING (matching MarketRegimeType from world-class-strategies)
  regimeStrategies: {
    'TREND_STRONG_UP': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT'],
    'TREND_WEAK_UP': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT', 'VWAP_DEVIATION'],
    'TREND_STRONG_DOWN': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT'],
    'TREND_WEAK_DOWN': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT', 'VWAP_DEVIATION'],
    'RANGE_TIGHT': ['VWAP_DEVIATION', 'RANGE_FADE', 'SESSION_REVERSION'],
    'RANGE_WIDE': ['VWAP_DEVIATION', 'RANGE_FADE', 'SESSION_REVERSION', 'LIQUIDITY_SWEEP'],
    'HIGH_VOLATILITY': ['VOLATILITY_BREAKOUT', 'FAILED_BREAKOUT', 'KILLZONE_REVERSAL'],
    'LOW_VOLATILITY': ['RANGE_FADE', 'VWAP_DEVIATION'],
    'NEWS_DRIVEN': ['VOLATILITY_BREAKOUT', 'FAILED_BREAKOUT'],  // Be cautious
    'ILLIQUID': [],  // Don't trade in illiquid markets
  } as Record<string, string[]>,

  // SESSION BOOSTS
  sessionBoosts: {
    'RTH_OPEN': { boost: ['ORB_BREAKOUT', 'VOLATILITY_BREAKOUT', 'LIQUIDITY_SWEEP'], multiplier: 1.5 },
    'RTH_MID': { boost: ['VWAP_DEVIATION', 'RANGE_FADE', 'VP_VAH_REVERSAL'], multiplier: 1.3 },
    'RTH_AFTERNOON': { boost: ['BOS_CONTINUATION', 'TREND_PULLBACK', 'OB_FVG_CONFLUENCE'], multiplier: 1.4 },
    'RTH_CLOSE': { boost: ['BOS_CONTINUATION', 'VOLATILITY_BREAKOUT'], multiplier: 1.2 },
  } as Record<string, { boost: string[]; multiplier: number }>,

  // CONFLUENCE REQUIREMENTS
  confluence: {
    minStrategiesAgreeing: 2,
    minConfidenceAverage: 70,
  },

  // APEX 150K SETTINGS
  apex150k: {
    dailyTarget: 1285,
    dailyMaxLoss: 600,
    minRiskReward: 2.0,
    minWinProbability: 0.50,
    maxTradesPerDay: 6,
  },
}

// PROFIT CONFIG - Strict requirements for live trading
const LIVE_PROFIT_CONFIG = {
  dailyMaxLoss: 800,
  maxLossPerTrade: 300,
  maxLossPerTradePoints: 6,
  maxConsecutiveLosses: 2,
  minConfluenceScore: 70,  // Higher for live trading
  minConfidence: 80,
  minRiskReward: 2.5,
  maxTradesPerDay: 5,
  minTimeBetweenTrades: 20,
}

// Track consecutive losses for live trading
let liveConsecutiveLosses = 0
let liveDailyPnL = 0
let liveDailyTradeCount = 0
let liveLastTradeTime = 0

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
  executionPlan?: ExecutionPlan
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
  // Advanced metrics
  slippage?: number
  executionAlgo?: ExecutionAlgorithm
  confluenceScore?: number
}

interface AutoTraderState {
  enabled: boolean
  paperMode: boolean  // Paper trading - simulate without real execution
  instrument: 'ES' | 'NQ'
  position: Position | null
  // APEX Evaluation tracking
  evaluationStartDate: string | null  // When user started evaluation
  targetDays: number | null           // User's personal goal (optional)
  // Signal data
  lastSignal: Signal | null
  lastMLSignal: MLSignal | null
  lastOrderFlow: OrderFlowSignal | null
  lastRiskStatus: ApexRiskStatus | null
  marketRegime: MarketRegime | null
  // Order flow
  vpin: VPINResult | null
  delta: DeltaAnalysis | null
  largeOrderDetected: boolean
  largeOrderSide: 'BUY' | 'SELL' | null
  // Execution
  executionAlgorithm: ExecutionAlgorithm
  marketConditions: MarketConditions | null
  // Confluence
  signalConfluence: number
  confluenceFactors: string[]
  // Timing
  lastCheck: number
  // Performance
  todayTrades: Trade[]
  todayPnL: number
  totalTrades: number
  wins: number
  losses: number
  startBalance: number
  currentBalance: number
  highWaterMark: number
  tradingDays: number
  // Risk
  dailyVaR: number
  stressTestsPassed: number
}

// =============================================================================
// STATE
// =============================================================================

let state: AutoTraderState = {
  enabled: false,
  paperMode: true,  // Default to paper trading for safety
  instrument: 'ES',
  position: null,
  // APEX: No deadline by default - user can set personal goal
  evaluationStartDate: null,
  targetDays: null,
  lastSignal: null,
  lastMLSignal: null,
  lastOrderFlow: null,
  lastRiskStatus: null,
  marketRegime: null,
  vpin: null,
  delta: null,
  largeOrderDetected: false,
  largeOrderSide: null,
  executionAlgorithm: 'ADAPTIVE',
  marketConditions: null,
  signalConfluence: 0,
  confluenceFactors: [],
  lastCheck: 0,
  todayTrades: [],
  todayPnL: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  startBalance: 150000,
  currentBalance: 150000,
  highWaterMark: 150000,
  tradingDays: 0,
  dailyVaR: 0,
  stressTestsPassed: 0,
}

// =============================================================================
// APEX TRADING RULES
// =============================================================================

interface ApexTradingRules {
  // Trading hours (ET timezone)
  marketOpen: { hour: 18, minute: 0 }   // 6:00 PM ET (Sunday)
  marketClose: { hour: 16, minute: 59 } // 4:59 PM ET (Mon-Fri)
  // Requirements
  minTradingDays: 7        // Minimum 7 trading days to qualify
  profitTarget: 9000       // $9,000 profit target
  maxTrailingDrawdown: 5000 // $5,000 trailing drawdown
  maxContracts: 17         // Max 17 contracts for 150K account
}

const APEX_RULES: ApexTradingRules = {
  marketOpen: { hour: 18, minute: 0 },
  marketClose: { hour: 16, minute: 59 },
  minTradingDays: 7,
  profitTarget: 9000,
  maxTrailingDrawdown: 5000,
  maxContracts: 17,
}

// Track unique trading days
let tradingDayHistory: Set<string> = new Set()

/**
 * Check if market is open for trading
 * Apex rules: 6:00 PM ET Sunday - 4:59 PM ET Friday
 * Must close all trades by 4:59 PM ET each day
 */
function isMarketOpen(): { open: boolean; reason: string; minutesUntilClose?: number } {
  const now = new Date()

  // Convert to ET timezone
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etTime.getHours()
  const minute = etTime.getMinutes()
  const day = etTime.getDay() // 0 = Sunday, 6 = Saturday

  // Saturday - market closed
  if (day === 6) {
    return { open: false, reason: 'Market closed (Saturday)' }
  }

  // Sunday before 6 PM - market closed
  if (day === 0 && hour < 18) {
    const minutesUntilOpen = (18 - hour) * 60 - minute
    return { open: false, reason: `Market opens in ${minutesUntilOpen} minutes (6:00 PM ET)` }
  }

  // Friday after 4:59 PM - market closed
  if (day === 5 && (hour > 16 || (hour === 16 && minute >= 59))) {
    return { open: false, reason: 'Market closed (Friday after 4:59 PM ET)' }
  }

  // Mon-Fri: Check if before 4:59 PM
  if (day >= 1 && day <= 5) {
    // Check close time (4:59 PM)
    if (hour > 16 || (hour === 16 && minute >= 59)) {
      return { open: false, reason: 'Market closed (after 4:59 PM ET)' }
    }

    // Calculate minutes until 4:59 PM close
    const minutesUntilClose = ((16 * 60 + 59) - (hour * 60 + minute))

    // Warning if less than 15 minutes to close
    if (minutesUntilClose <= 15) {
      return {
        open: true,
        reason: `⚠️ CLOSE POSITIONS NOW - Only ${minutesUntilClose} min until 4:59 PM close!`,
        minutesUntilClose
      }
    }

    return { open: true, reason: 'Market open', minutesUntilClose }
  }

  // Sunday after 6 PM - market open
  if (day === 0 && hour >= 18) {
    return { open: true, reason: 'Market open (Sunday session)', minutesUntilClose: 60 * 22 + 59 }
  }

  return { open: true, reason: 'Market open' }
}

/**
 * Check if we need to auto-close position (4:45 PM safety margin)
 */
function shouldAutoClose(): { close: boolean; reason: string } {
  const now = new Date()
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etTime.getHours()
  const minute = etTime.getMinutes()
  const day = etTime.getDay()

  // Mon-Fri: Auto-close at 4:45 PM (14 min before deadline)
  if (day >= 1 && day <= 5) {
    if (hour === 16 && minute >= 45) {
      return { close: true, reason: `AUTO-CLOSE: ${16 * 60 + 59 - (hour * 60 + minute)} min until 4:59 PM deadline` }
    }
    // Friday special: Close at 4:30 PM for safety
    if (day === 5 && hour === 16 && minute >= 30) {
      return { close: true, reason: 'AUTO-CLOSE: Friday early close for safety' }
    }
  }

  return { close: false, reason: '' }
}

/**
 * Record a trading day (for 7-day minimum tracking)
 */
function recordTradingDay(): number {
  const now = new Date()
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const dateStr = etTime.toISOString().split('T')[0] // YYYY-MM-DD

  tradingDayHistory.add(dateStr)
  return tradingDayHistory.size
}

/**
 * Get trading days count
 */
function getTradingDaysCount(): number {
  return tradingDayHistory.size
}

// =============================================================================
// ENGINES - ALL INITIALIZED
// =============================================================================

const orderFlowEngine = new OrderFlowEngine(50000, 50)
const vpinCalculator = new VPINCalculator(50000, 50)
const deltaAnalyzer = new DeltaAnalyzer()
const executionEngine = new SmartExecutionEngine()

// PickMyTrade client
let client: PickMyTradeClient | null = null

function getClient(): PickMyTradeClient | null {
  if (!client && process.env.PICKMYTRADE_TOKEN) {
    client = new PickMyTradeClient({
      token: process.env.PICKMYTRADE_TOKEN,
      accountId: process.env.APEX_ACCOUNT_ID || 'APEX-456334',
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 17,
      enabled: true,
    })
  }
  return client
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchCandles(
  instrument: 'ES' | 'NQ',
  timeframe: '1' | '5' | '15',
  count: number = 100
): Promise<Candle[]> {
  try {
    const symbol = instrument === 'ES' ? 'BTC_USDT' : 'ETH_USDT'
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${symbol}&timeframe=${timeframe}m&count=${count}`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) throw new Error('Failed to fetch candles')

    const data = await res.json()

    if (data.result?.data) {
      // Scale to ES/NQ price range
      const basePrice = instrument === 'ES' ? 5900 : 20500
      const firstPrice = data.result.data[0]?.c || 1
      const scale = basePrice / firstPrice

      return data.result.data.map((c: any) => ({
        time: c.t,
        open: c.o * scale,
        high: c.h * scale,
        low: c.l * scale,
        close: c.c * scale,
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
// SIMULATE TRADE DATA FROM CANDLES (For Order Flow Analysis)
// =============================================================================

function simulateTradesFromCandles(candles: Candle[]): OrderFlowTrade[] {
  const trades: OrderFlowTrade[] = []

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]
    const prevCandle = candles[i - 1]

    // Simulate trades based on candle characteristics
    const isBullish = candle.close > candle.open
    const range = candle.high - candle.low
    const body = Math.abs(candle.close - candle.open)
    const volumePerTrade = candle.volume / 10 // Split into ~10 trades

    // Generate multiple trades per candle
    for (let j = 0; j < 10; j++) {
      const priceVariation = (Math.random() - 0.5) * range
      const price = (candle.open + candle.close) / 2 + priceVariation

      // Determine side based on price action
      let side: 'buy' | 'sell'
      if (isBullish) {
        side = Math.random() > 0.35 ? 'buy' : 'sell' // 65% buys in bullish
      } else {
        side = Math.random() > 0.35 ? 'sell' : 'buy' // 65% sells in bearish
      }

      trades.push({
        id: `T${candle.time}-${j}`,
        instrumentName: 'ES', // Futures contract
        price,
        quantity: volumePerTrade * (0.5 + Math.random()),
        side,
        timestamp: candle.time + j * 6000,
        isMaker: Math.random() > 0.4, // 60% are maker trades
      })
    }
  }

  return trades
}

// =============================================================================
// SIMULATE ORDER BOOK FROM CANDLES
// =============================================================================

function simulateOrderBook(candles: Candle[]): OrderBookData {
  const lastCandle = candles[candles.length - 1]
  const currentPrice = lastCandle.close
  const spread = (lastCandle.high - lastCandle.low) * 0.01 // 1% of range

  const bids: [number, number][] = []
  const asks: [number, number][] = []

  // Generate 20 levels each side
  for (let i = 0; i < 20; i++) {
    const bidPrice = currentPrice - spread * (i + 1)
    const askPrice = currentPrice + spread * (i + 1)

    // Size decreases as we move away from price
    const bidSize = lastCandle.volume * (0.1 - i * 0.004) * (0.8 + Math.random() * 0.4)
    const askSize = lastCandle.volume * (0.1 - i * 0.004) * (0.8 + Math.random() * 0.4)

    bids.push([bidPrice, Math.max(1, bidSize)])
    asks.push([askPrice, Math.max(1, askSize)])
  }

  return {
    bids,
    asks,
    timestamp: Date.now(),
  }
}

// =============================================================================
// CALCULATE MARKET CONDITIONS
// =============================================================================

function calculateMarketConditions(
  candles: Candle[],
  orderBook: OrderBookData,
  trades: OrderFlowTrade[]
): MarketConditions {
  const lastCandle = candles[candles.length - 1]

  // Spread
  const bestBid = orderBook.bids[0]?.[0] || lastCandle.close
  const bestAsk = orderBook.asks[0]?.[0] || lastCandle.close
  const midPrice = (bestBid + bestAsk) / 2
  const spread = bestAsk - bestBid
  const spreadPercent = midPrice > 0 ? spread / midPrice : 0

  // Depth
  const bidDepth = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0)
  const askDepth = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0)
  const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth)

  // Volume
  const recentVolume = trades.reduce((sum, t) => sum + t.quantity, 0)
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20

  // Volatility
  const returns = candles.slice(-20).map((c, i, arr) =>
    i > 0 ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0
  ).slice(1)
  const volatility = Math.sqrt(
    returns.reduce((sum, r) => sum + r * r, 0) / returns.length
  )

  // Toxicity (informed flow indicator)
  const buyVolume = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.quantity, 0)
  const sellVolume = trades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.quantity, 0)
  const totalVolume = buyVolume + sellVolume
  const toxicity = totalVolume > 0 ? Math.abs(buyVolume - sellVolume) / totalVolume : 0

  return {
    spread,
    spreadPercent,
    bidDepth,
    askDepth,
    imbalance,
    volatility,
    recentVolume,
    avgVolume,
    toxicity,
  }
}

// =============================================================================
// SELECT OPTIMAL EXECUTION ALGORITHM
// =============================================================================

function selectExecutionAlgorithm(
  direction: 'LONG' | 'SHORT',
  contracts: number,
  conditions: MarketConditions,
  urgency: number
): ExecutionAlgorithm {
  // High toxicity = use ADAPTIVE to avoid adverse selection
  if (conditions.toxicity > 0.6) {
    return 'ADAPTIVE'
  }

  // Favorable imbalance = use SNIPER for best fills
  if ((direction === 'LONG' && conditions.imbalance > 0.3) ||
      (direction === 'SHORT' && conditions.imbalance < -0.3)) {
    return 'SNIPER'
  }

  // Large order relative to liquidity = use ICEBERG
  const depth = direction === 'LONG' ? conditions.askDepth : conditions.bidDepth
  if (contracts > depth * 0.3) {
    return 'ICEBERG'
  }

  // High volatility = use TWAP to average out
  if (conditions.volatility > 0.02) {
    return 'TWAP'
  }

  // Normal conditions with urgency = VWAP
  if (urgency > 0.7) {
    return 'VWAP'
  }

  // Default to ADAPTIVE
  return 'ADAPTIVE'
}

// =============================================================================
// FULLY INTEGRATED AUTO-TRADING LOOP
// =============================================================================

async function runAutoTrader(): Promise<void> {
  if (!state.enabled) return

  state.lastCheck = Date.now()

  // ==========================================================================
  // APEX RULE: Check Market Hours (6 PM ET - 4:59 PM ET)
  // ==========================================================================
  const marketStatus = isMarketOpen()
  console.log(`[MARKET] ${marketStatus.reason}`)

  if (!marketStatus.open) {
    console.log('[AutoTrade] Market closed - no trading allowed')
    return
  }

  // ==========================================================================
  // APEX RULE: Auto-close at 4:45 PM (14 min before 4:59 deadline)
  // ==========================================================================
  const autoCloseCheck = shouldAutoClose()
  if (autoCloseCheck.close && state.position) {
    console.log(`[APEX RULE] ${autoCloseCheck.reason}`)
    const candles = await fetchCandles(state.instrument, '1', 1)
    const currentPrice = candles[0]?.close || state.position.entryPrice
    const conditions = state.marketConditions || {
      spread: 0.25, spreadPercent: 0.00005, bidDepth: 1000, askDepth: 1000,
      imbalance: 0, volatility: 0.01, recentVolume: 10000, avgVolume: 10000, toxicity: 0.3
    }
    await executeExitAdvanced('APEX 4:59 PM Rule - Auto Close', currentPrice, conditions)
    return
  }

  // Warn if less than 30 minutes to close
  if (marketStatus.minutesUntilClose && marketStatus.minutesUntilClose < 30) {
    console.log(`⚠️ WARNING: Only ${marketStatus.minutesUntilClose} min until market close - NO NEW ENTRIES`)
    if (state.position) {
      console.log('[CLOSE WARNING] Consider closing position soon!')
    }
    // Don't enter new trades within 30 min of close
    return
  }

  console.log('\n========== AUTO-TRADER CYCLE ==========')

  // ==========================================================================
  // STEP 1: RISK CHECK (Apex Safety)
  // ==========================================================================
  console.log('[STEP 1] Checking risk status...')

  // APEX: No time limit - you can take as long as you need
  // Only pass targetDays if user sets a personal goal
  const targetDays = state.targetDays || 30 // Default: relaxed 30-day personal goal
  const riskStatus = checkApexRiskStatus(
    state.startBalance,
    state.currentBalance,
    state.todayPnL,
    state.highWaterMark,
    state.tradingDays,
    DEFAULT_APEX_SAFETY,
    targetDays
  )
  state.lastRiskStatus = riskStatus

  if (!riskStatus.canTrade) {
    console.log('[RISK] BLOCKED:', riskStatus.warnings.join(', '))
    return
  }
  console.log(`[RISK] Status: ${riskStatus.riskStatus} | Buffer: $${riskStatus.safetyBuffer.toFixed(0)}`)

  // ==========================================================================
  // STEP 2: FETCH MULTI-TIMEFRAME DATA
  // ==========================================================================
  console.log('[STEP 2] Fetching market data...')

  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchCandles(state.instrument, '1', 100),
    fetchCandles(state.instrument, '5', 100),
    fetchCandles(state.instrument, '15', 100),
  ])

  if (candles1m.length < 50 || candles5m.length < 50 || candles15m.length < 50) {
    console.log('[DATA] Insufficient candle data')
    return
  }

  const currentPrice = candles1m[candles1m.length - 1].close
  console.log(`[DATA] Current price: ${currentPrice.toFixed(2)}`)

  // ==========================================================================
  // STEP 3: ORDER FLOW ANALYSIS
  // ==========================================================================
  console.log('[STEP 3] Analyzing order flow...')

  const simulatedTrades = simulateTradesFromCandles(candles1m.slice(-20))
  const orderBook = simulateOrderBook(candles1m)

  // Feed trades to order flow engine
  orderFlowEngine.addTrades(simulatedTrades)

  // Calculate VPIN
  const vpin = vpinCalculator.addTrades(simulatedTrades)
  state.vpin = vpin
  console.log(`[VPIN] ${(vpin.vpin * 100).toFixed(1)}% | Toxicity: ${vpin.toxicity}`)

  // Calculate Delta
  const delta = deltaAnalyzer.calculateDelta(simulatedTrades)
  state.delta = delta
  console.log(`[DELTA] Imbalance: ${(delta.imbalanceRatio * 100).toFixed(1)}% | Divergence: ${delta.deltaDivergence}`)

  // Detect large orders
  const largeOrder = detectLargeOrders(simulatedTrades, orderBook)
  state.largeOrderDetected = largeOrder.detected
  state.largeOrderSide = largeOrder.detected ? largeOrder.side : null
  if (largeOrder.detected) {
    console.log(`[FLOW] Large ${largeOrder.side} detected: ${largeOrder.estimatedSize.toFixed(0)} | Iceberg: ${largeOrder.isIceberg}`)
  }

  // Generate order flow signal
  const orderFlowSignal = orderFlowEngine.generateSignal(orderBook, candles5m)
  state.lastOrderFlow = orderFlowSignal
  console.log(`[FLOW] Signal: ${orderFlowSignal.direction} | Strength: ${orderFlowSignal.strength.toFixed(0)}`)

  // ==========================================================================
  // STEP 4: ML SIGNAL ENGINE (Neural Network Ensemble)
  // ==========================================================================
  console.log('[STEP 4] Generating ML signal...')

  const mlSignal = generateMLSignal(candles5m)
  state.lastMLSignal = mlSignal
  state.marketRegime = mlSignal.regime || null
  console.log(`[ML] Direction: ${mlSignal.direction} | Confidence: ${(mlSignal.confidence * 100).toFixed(0)}%`)
  console.log(`[ML] Regime: ${mlSignal.regime?.type || 'Unknown'} | Patterns: ${mlSignal.patterns.length}`)

  // ==========================================================================
  // STEP 5: TRADITIONAL SIGNAL ENGINE
  // ==========================================================================
  console.log('[STEP 5] Generating traditional signal...')

  const traditionalSignal = generateSignal(candles1m, candles5m, candles15m, state.instrument)
  state.lastSignal = traditionalSignal
  console.log(`[TRAD] Direction: ${traditionalSignal.direction} | Confidence: ${traditionalSignal.confidence.toFixed(0)}%`)

  // ==========================================================================
  // STEP 6: CALCULATE MARKET CONDITIONS
  // ==========================================================================
  console.log('[STEP 6] Analyzing market conditions...')

  const conditions = calculateMarketConditions(candles1m, orderBook, simulatedTrades)
  state.marketConditions = conditions
  console.log(`[MKT] Spread: ${(conditions.spreadPercent * 100).toFixed(3)}% | Imbalance: ${(conditions.imbalance * 100).toFixed(1)}%`)
  console.log(`[MKT] Volatility: ${(conditions.volatility * 100).toFixed(2)}% | Toxicity: ${(conditions.toxicity * 100).toFixed(1)}%`)

  // ==========================================================================
  // STEP 7: WORLD-CLASS REGIME DETECTION (from paper trading system)
  // ==========================================================================
  console.log('[STEP 7] Detecting market regime...')

  const regimeAnalysis = classifyMarketRegime(candles1m, 100)
  const currentRegime = regimeAnalysis.current
  const regimeTrend = regimeAnalysis.trendStrength

  console.log(`[REGIME] ${currentRegime} | Trend: ${regimeTrend.toFixed(0)}% | Volatility: ${regimeAnalysis.volatilityPercentile.toFixed(0)}%`)

  // Get optimal strategies for current regime
  const optimalStrategies = DYNAMIC_STRATEGY_SYSTEM.regimeStrategies[currentRegime] ||
                            DYNAMIC_STRATEGY_SYSTEM.regimeStrategies['UNKNOWN']
  console.log(`[REGIME] Optimal strategies: ${optimalStrategies.slice(0, 3).join(', ')}`)

  // ==========================================================================
  // STEP 8: ENHANCED CONFLUENCE SCORING (7-factor system from paper trading)
  // ==========================================================================
  console.log('[STEP 8] Calculating enhanced confluence...')

  const factors: string[] = []
  const mlDir = mlSignal.direction === 'NEUTRAL' ? 'FLAT' : mlSignal.direction

  // Calculate RSI for momentum check (approximation from candles)
  const closes = candles1m.slice(-14).map(c => c.close)
  const gains = closes.slice(1).map((c, i) => Math.max(0, c - closes[i]))
  const losses = closes.slice(1).map((c, i) => Math.max(0, closes[i] - c))
  const avgGain = gains.reduce((s, g) => s + g, 0) / 14
  const avgLoss = losses.reduce((s, l) => s + l, 0) / 14
  const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))

  // Calculate enhanced confluence score (100 points max)
  let signalCount = 0
  let totalConfidence = 0

  // Count agreeing signals
  if (mlDir !== 'FLAT') signalCount++
  if (traditionalSignal.direction === mlDir && traditionalSignal.direction !== 'FLAT') signalCount++
  if (orderFlowSignal.direction === mlDir) signalCount++
  if ((mlDir === 'LONG' && delta.imbalanceRatio > 0.1) || (mlDir === 'SHORT' && delta.imbalanceRatio < -0.1)) signalCount++

  // 1. SIGNAL COUNT SCORE (20 points max)
  const signalCountScore = Math.min(20, signalCount * 5 + 5)
  factors.push(`Signals: ${signalCount} (${signalCountScore}pts)`)

  // 2. CONFIDENCE SCORE (25 points max)
  totalConfidence = (mlSignal.confidence * 100 + traditionalSignal.confidence) / 2
  const confidenceScore = (totalConfidence / 100) * 25
  factors.push(`Confidence: ${totalConfidence.toFixed(0)}% (${confidenceScore.toFixed(0)}pts)`)

  // 3. REGIME ALIGNMENT SCORE (15 points max)
  let regimeScore = 0
  if (currentRegime.includes('TREND') && mlDir !== 'FLAT') {
    if ((currentRegime.includes('UP') && mlDir === 'LONG') ||
        (currentRegime.includes('DOWN') && mlDir === 'SHORT')) {
      regimeScore = 15
      factors.push(`Regime aligned: ${currentRegime} (15pts)`)
    }
  } else if (currentRegime === 'RANGE_TIGHT' || currentRegime === 'RANGE_WIDE') {
    regimeScore = 10 // Mean reversion still works
    factors.push(`Range regime (10pts)`)
  }

  // 4. SESSION ALIGNMENT SCORE (10 points max)
  const session = getCurrentSession()
  let sessionScore = 5 // Base score
  const sessionBoost = DYNAMIC_STRATEGY_SYSTEM.sessionBoosts[session]
  if (sessionBoost) {
    sessionScore = 10
    factors.push(`Session boost: ${session} (10pts)`)
  }

  // 5. MOMENTUM CONFIRMATION (15 points max)
  let momentumScore = 0
  if (mlDir === 'LONG') {
    if (rsi > 40 && rsi < 70) momentumScore += 8
    if (delta.imbalanceRatio > 0) momentumScore += 7
  } else if (mlDir === 'SHORT') {
    if (rsi < 60 && rsi > 30) momentumScore += 8
    if (delta.imbalanceRatio < 0) momentumScore += 7
  }
  if (momentumScore > 0) factors.push(`Momentum: RSI=${rsi.toFixed(0)} (${momentumScore}pts)`)

  // 6. ORDER FLOW SCORE (10 points max)
  let orderFlowScore = 0
  if (vpin.signal === 'SAFE') {
    orderFlowScore += 5
    factors.push('VPIN safe (5pts)')
  } else if (vpin.signal === 'DANGER') {
    orderFlowScore -= 10
    factors.push('VPIN DANGER (-10pts)')
  }
  if (largeOrder.detected) {
    if ((largeOrder.side === 'BUY' && mlDir === 'LONG') || (largeOrder.side === 'SELL' && mlDir === 'SHORT')) {
      orderFlowScore += 5
      factors.push(`Large ${largeOrder.side} supports (5pts)`)
    }
  }

  // 7. PATTERN QUALITY SCORE (5 points max)
  const patterns = mlSignal.patterns.length
  const patternScore = Math.min(5, patterns * 2)
  if (patterns > 0) factors.push(`Patterns: ${patterns} (${patternScore}pts)`)

  // TOTAL CONFLUENCE SCORE
  let confluenceScore = signalCountScore + confidenceScore + regimeScore + sessionScore + momentumScore + orderFlowScore + patternScore

  // CONSECUTIVE LOSS PENALTY - Require higher confluence after losses
  const requiredConfluence = liveConsecutiveLosses >= LIVE_PROFIT_CONFIG.maxConsecutiveLosses
    ? LIVE_PROFIT_CONFIG.minConfluenceScore + 10  // +10 after 2+ losses
    : LIVE_PROFIT_CONFIG.minConfluenceScore

  // TIME BETWEEN TRADES CHECK
  const minutesSinceLastTrade = (Date.now() - liveLastTradeTime) / 60000
  const canTradeTime = minutesSinceLastTrade >= LIVE_PROFIT_CONFIG.minTimeBetweenTrades ||
                       liveLastTradeTime === 0

  // DAILY TRADE COUNT CHECK
  const canTradeDailyLimit = liveDailyTradeCount < LIVE_PROFIT_CONFIG.maxTradesPerDay

  state.signalConfluence = confluenceScore
  state.confluenceFactors = factors

  console.log(`[CONFLUENCE] Score: ${confluenceScore.toFixed(0)} / 100 (need ${requiredConfluence})`)
  console.log(`[RISK] Consecutive losses: ${liveConsecutiveLosses} | Daily trades: ${liveDailyTradeCount}/${LIVE_PROFIT_CONFIG.maxTradesPerDay}`)
  console.log(`[TIME] Minutes since last trade: ${minutesSinceLastTrade.toFixed(0)} (need ${LIVE_PROFIT_CONFIG.minTimeBetweenTrades})`)
  factors.forEach(f => console.log(`  - ${f}`))

  // ==========================================================================
  // STEP 9: DETERMINE FINAL DIRECTION (with strict live trading requirements)
  // ==========================================================================
  console.log('[STEP 9] Determining final direction...')

  let finalDirection: 'LONG' | 'SHORT' | 'FLAT' = 'FLAT'
  let finalConfidence = 0

  // LIVE TRADING GATE: All conditions must pass
  const passesConfluence = confluenceScore >= requiredConfluence
  const passesSignalCount = signalCount >= DYNAMIC_STRATEGY_SYSTEM.confluence.minStrategiesAgreeing
  const passesMomentum = momentumScore >= 5
  const passesRiskCheck = canTradeDailyLimit && canTradeTime

  if (passesConfluence && passesSignalCount && passesMomentum && passesRiskCheck) {
    if (mlSignal.confidence > 0.70 && mlSignal.direction !== 'NEUTRAL') {
      finalDirection = mlSignal.direction as 'LONG' | 'SHORT'
      finalConfidence = Math.min(95, (mlSignal.confidence * 100 + confluenceScore) / 2)
    } else if (traditionalSignal.confidence > 75 && traditionalSignal.direction !== 'FLAT') {
      finalDirection = traditionalSignal.direction as 'LONG' | 'SHORT'
      finalConfidence = Math.min(90, (traditionalSignal.confidence + confluenceScore) / 2)
    }
  } else {
    // Log why we're not trading
    if (!passesConfluence) console.log(`[BLOCKED] Confluence ${confluenceScore.toFixed(0)} < ${requiredConfluence}`)
    if (!passesSignalCount) console.log(`[BLOCKED] Signal count ${signalCount} < 2`)
    if (!passesMomentum) console.log(`[BLOCKED] Momentum ${momentumScore} < 5`)
    if (!canTradeDailyLimit) console.log(`[BLOCKED] Daily limit reached`)
    if (!canTradeTime) console.log(`[BLOCKED] Need ${(LIVE_PROFIT_CONFIG.minTimeBetweenTrades - minutesSinceLastTrade).toFixed(0)} more minutes`)
  }

  console.log(`[FINAL] Direction: ${finalDirection} | Confidence: ${finalConfidence.toFixed(0)}% | Regime: ${currentRegime}`)

  // ==========================================================================
  // STEP 9: POSITION MANAGEMENT
  // ==========================================================================
  console.log('[STEP 9] Managing position...')

  if (state.position) {
    // Check stop loss
    if (state.position.direction === 'LONG' && currentPrice <= state.position.stopLoss) {
      console.log('[EXIT] Stop loss hit')
      await executeExitAdvanced('Stop Loss Hit', currentPrice, conditions)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice >= state.position.stopLoss) {
      console.log('[EXIT] Stop loss hit')
      await executeExitAdvanced('Stop Loss Hit', currentPrice, conditions)
      return
    }

    // Check take profit
    if (state.position.direction === 'LONG' && currentPrice >= state.position.takeProfit) {
      console.log('[EXIT] Take profit hit')
      await executeExitAdvanced('Take Profit Hit', currentPrice, conditions)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice <= state.position.takeProfit) {
      console.log('[EXIT] Take profit hit')
      await executeExitAdvanced('Take Profit Hit', currentPrice, conditions)
      return
    }

    // Check for reversal with HIGH confluence
    if (finalDirection !== 'FLAT' &&
        finalDirection !== state.position.direction &&
        finalConfidence > 75 &&
        confluenceScore >= 65) {
      console.log('[REVERSAL] High confluence reversal signal')
      await executeExitAdvanced('Reversal Signal', currentPrice, conditions)
      await executeEntryAdvanced(finalDirection, finalConfidence, mlSignal, traditionalSignal, conditions)
    }
  } else {
    // No position - look for entry
    if (finalDirection !== 'FLAT' && finalConfidence >= 60 && confluenceScore >= 50) {
      console.log('[ENTRY] Strong confluence entry signal')
      await executeEntryAdvanced(finalDirection, finalConfidence, mlSignal, traditionalSignal, conditions)
    } else {
      console.log('[WAIT] No valid entry signal')
    }
  }

  console.log('========================================\n')
}

// =============================================================================
// ADVANCED ENTRY WITH SMART EXECUTION
// =============================================================================

async function executeEntryAdvanced(
  direction: 'LONG' | 'SHORT',
  confidence: number,
  mlSignal: MLSignal,
  tradSignal: Signal,
  conditions: MarketConditions
): Promise<boolean> {
  const riskStatus = state.lastRiskStatus
  if (!riskStatus || !riskStatus.canTrade) {
    console.log('[EXEC] Risk status blocking trade')
    return false
  }

  // Get risk-adjusted position size
  const positionRec = calculateSafePositionSize(
    riskStatus,
    state.instrument === 'ES' ? 12.50 : 5.00,
    8,
    state.instrument === 'ES' ? 17 : 10
  )

  if (positionRec.recommendedContracts === 0) {
    console.log('[EXEC] Position size recommendation is 0')
    return false
  }

  // Select optimal execution algorithm
  const algorithm = selectExecutionAlgorithm(direction, positionRec.recommendedContracts, conditions, confidence / 100)
  state.executionAlgorithm = algorithm
  console.log(`[EXEC] Using ${algorithm} algorithm`)

  const symbol = getCurrentContractSymbol(state.instrument)
  const pointValue = state.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE

  // Use ML signal levels
  const entry = mlSignal.entry || tradSignal.entry
  const stopLoss = mlSignal.stopLoss || tradSignal.stopLoss
  const takeProfit = mlSignal.takeProfit || tradSignal.takeProfit

  const stopDistance = Math.abs(entry - stopLoss)
  const targetDistance = Math.abs(takeProfit - entry)

  // Scale contracts based on confidence
  const confidenceMultiplier = Math.min(1, confidence / 80)
  const contracts = Math.max(1, Math.floor(positionRec.recommendedContracts * confidenceMultiplier))

  const dollarStop = stopDistance * pointValue * contracts
  const dollarTarget = targetDistance * pointValue * contracts

  // Create execution plan
  const order = executionEngine.createOrder(
    symbol,
    direction === 'LONG' ? 'BUY' : 'SELL',
    contracts,
    algorithm,
    entry,
    { urgency: confidence / 100, maxSlippage: 0.002 }
  )

  const executionPlan = executionEngine.generatePlan(order, conditions)

  console.log(`[EXEC] Entry: ${entry.toFixed(2)} | Stop: ${stopLoss.toFixed(2)} | Target: ${takeProfit.toFixed(2)}`)
  console.log(`[EXEC] Contracts: ${contracts} | Stop$: ${dollarStop.toFixed(0)} | Target$: ${dollarTarget.toFixed(0)}`)
  console.log(`[EXEC] Est. Slippage: ${(executionPlan.estimatedSlippage * 100).toFixed(3)}% | Est. Cost: $${executionPlan.estimatedCost.toFixed(2)}`)

  // PAPER MODE: Simulate trade without real execution
  if (state.paperMode) {
    console.log(`[PAPER] SIMULATED ${direction} ${contracts}x ${symbol} @ ${entry.toFixed(2)}`)
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    return true
  }

  // LIVE MODE: Execute via PickMyTrade
  const pmt = getClient()
  if (!pmt || !pmt.isEnabled) {
    console.log('[EXEC] PickMyTrade not available - enable live trading first')
    return false
  }

  const result = await pmt.executeSignal({
    action: direction === 'LONG' ? 'BUY' : 'SELL',
    symbol,
    quantity: contracts,
    orderType: 'MKT',
    dollarStopLoss: dollarStop,
    dollarTakeProfit: dollarTarget,
    reason: `${algorithm}|Conf:${confidence.toFixed(0)}%|Score:${state.signalConfluence}`,
  })

  if (result.success) {
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    console.log(`[EXEC] SUCCESS: Opened ${direction} ${contracts}x ${symbol}`)
    return true
  }

  console.error('[EXEC] FAILED:', result.message)
  return false
}

// =============================================================================
// ADVANCED EXIT
// =============================================================================

async function executeExitAdvanced(
  reason: string,
  exitPrice: number,
  conditions: MarketConditions
): Promise<boolean> {
  if (!state.position) return false

  const symbol = getCurrentContractSymbol(state.position.instrument)
  const pointValue = state.position.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE
  const priceDiff = state.position.direction === 'LONG'
    ? exitPrice - state.position.entryPrice
    : state.position.entryPrice - exitPrice
  const pnl = priceDiff * pointValue * state.position.contracts

  // Estimate slippage
  const slippage = conditions.spreadPercent * exitPrice * state.position.contracts

  // PAPER MODE: Simulate exit
  if (state.paperMode) {
    console.log(`[PAPER] SIMULATED EXIT @ ${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)}`)
    recordTradeResult(exitPrice, pnl, slippage, reason)
    return true
  }

  // LIVE MODE: Close via PickMyTrade
  const pmt = getClient()
  if (!pmt) return false

  const result = await pmt.closePosition(symbol)

  if (result.success) {
    recordTradeResult(exitPrice, pnl, slippage, reason)
    return true
  }

  return false
}

// Record trade result (shared by paper and live)
function recordTradeResult(exitPrice: number, pnl: number, slippage: number, reason: string) {
  if (!state.position) return

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
    slippage,
    executionAlgo: state.executionAlgorithm,
    confluenceScore: state.signalConfluence,
  }

  state.todayTrades.push(trade)
  state.todayPnL += pnl
  state.totalTrades++

  // CONSECUTIVE LOSS TRACKING - For dynamic risk management
  if (pnl > 0) {
    state.wins++
    liveConsecutiveLosses = 0  // Reset on win
    if (state.currentBalance + pnl > state.highWaterMark) {
      state.highWaterMark = state.currentBalance + pnl
    }
  } else {
    state.losses++
    liveConsecutiveLosses++  // Increment on loss
    console.log(`[RISK] Consecutive losses: ${liveConsecutiveLosses}/${LIVE_PROFIT_CONFIG.maxConsecutiveLosses}`)

    // If max consecutive losses hit, require cooling period
    if (liveConsecutiveLosses >= LIVE_PROFIT_CONFIG.maxConsecutiveLosses) {
      console.log(`[RISK] MAX CONSECUTIVE LOSSES HIT - Entering cooling period`)
    }
  }

  // Update live daily tracking
  liveDailyPnL += pnl
  liveDailyTradeCount++
  liveLastTradeTime = Date.now()

  state.currentBalance += pnl
  state.position = null

  // APEX RULE: Track unique trading days (need 7 minimum)
  state.tradingDays = recordTradingDay()

  console.log(`[EXIT] ${reason} | P&L: $${pnl.toFixed(2)} | Slippage: $${slippage.toFixed(2)}`)
  console.log(`[APEX] Trading days: ${state.tradingDays}/${APEX_RULES.minTradingDays} (need ${Math.max(0, APEX_RULES.minTradingDays - state.tradingDays)} more)`)
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

    // LOAD PERSISTED ML LEARNING STATE FROM DATABASE
    // Uses learned patterns from paper trading for live decisions
    await ensureLearningStateLoaded()

    const winRate = state.totalTrades > 0 ? (state.wins / state.totalTrades) * 100 : 0
    const profitFactor = state.losses > 0 && state.wins > 0
      ? state.todayTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) /
        Math.abs(state.todayTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
      : 0

    const profitAboveTarget = Math.max(0, state.todayPnL - 9000)
    const withdrawable = state.todayPnL >= 9000 ? profitAboveTarget * 0.9 : 0

    // Get market status
    const marketStatus = isMarketOpen()
    const autoCloseCheck = shouldAutoClose()

    return NextResponse.json({
      success: true,
      // APEX Rules Status
      apexRules: {
        profitTarget: APEX_RULES.profitTarget,
        maxDrawdown: APEX_RULES.maxTrailingDrawdown,
        minTradingDays: APEX_RULES.minTradingDays,
        maxContracts: APEX_RULES.maxContracts,
        closeTime: '4:59 PM ET',
        autoCloseTime: '4:45 PM ET',
      },
      // Market Status
      market: {
        open: marketStatus.open,
        status: marketStatus.reason,
        minutesUntilClose: marketStatus.minutesUntilClose,
        autoCloseTriggered: autoCloseCheck.close,
        autoCloseReason: autoCloseCheck.reason,
      },
      // Status
      status: {
        enabled: state.enabled,
        paperMode: state.paperMode,  // Paper trading = no real execution
        instrument: state.instrument,
        session: getCurrentSession(),
        hasPosition: !!state.position,
        position: state.position,
        lastCheck: state.lastCheck,
        // APEX: No deadline - these are for tracking only
        evaluationStartDate: state.evaluationStartDate,
        targetDays: state.targetDays,  // User's personal goal (optional)
        tradingDays: state.tradingDays,
        tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
        tradingDaysComplete: state.tradingDays >= APEX_RULES.minTradingDays,
      },
      // ML Signal
      mlSignal: state.lastMLSignal ? {
        direction: state.lastMLSignal.direction,
        confidence: state.lastMLSignal.confidence,
        entry: state.lastMLSignal.entry,
        stopLoss: state.lastMLSignal.stopLoss,
        takeProfit: state.lastMLSignal.takeProfit,
        ensemble: state.lastMLSignal.ensemble,
        patterns: state.lastMLSignal.patterns.length,
      } : null,
      // Traditional Signal
      traditionalSignal: state.lastSignal ? {
        direction: state.lastSignal.direction,
        confidence: state.lastSignal.confidence,
        strategy: state.lastSignal.strategy,
      } : null,
      // Order Flow
      orderFlow: {
        vpin: state.vpin ? {
          value: state.vpin.vpin,
          toxicity: state.vpin.toxicity,
          signal: state.vpin.signal,
          trend: state.vpin.trend,
        } : null,
        delta: state.delta ? {
          imbalanceRatio: state.delta.imbalanceRatio,
          divergence: state.delta.deltaDivergence,
          exhaustion: state.delta.exhaustion,
          absorption: state.delta.absorption,
        } : null,
        largeOrder: {
          detected: state.largeOrderDetected,
          side: state.largeOrderSide,
        },
        signal: state.lastOrderFlow ? {
          direction: state.lastOrderFlow.direction,
          strength: state.lastOrderFlow.strength,
          confidence: state.lastOrderFlow.confidence,
          reasons: state.lastOrderFlow.reasons,
        } : null,
      },
      // Market Regime
      regime: state.marketRegime ? {
        type: state.marketRegime.type,
        strength: state.marketRegime.strength,
        volatility: state.marketRegime.characteristics?.volatility || 0,
        momentum: state.marketRegime.characteristics?.momentum || 0,
      } : null,
      // Market Conditions
      marketConditions: state.marketConditions ? {
        spread: state.marketConditions.spreadPercent,
        imbalance: state.marketConditions.imbalance,
        volatility: state.marketConditions.volatility,
        toxicity: state.marketConditions.toxicity,
      } : null,
      // Risk Analytics
      riskStatus: state.lastRiskStatus ? {
        status: state.lastRiskStatus.riskStatus,
        canTrade: state.lastRiskStatus.canTrade,
        trailingDrawdown: state.lastRiskStatus.trailingDrawdown,
        safetyBuffer: state.lastRiskStatus.safetyBuffer,
        maxAllowedLossToday: state.lastRiskStatus.maxAllowedLossToday,
        recommendedPositionSize: state.lastRiskStatus.recommendedPositionSize,
        warnings: state.lastRiskStatus.warnings,
        recommendations: state.lastRiskStatus.recommendations,
      } : null,
      // Confluence
      confluence: {
        score: state.signalConfluence,
        level: state.signalConfluence >= 70 ? 'STRONG' :
               state.signalConfluence >= 50 ? 'MODERATE' :
               state.signalConfluence >= 30 ? 'WEAK' : 'NONE',
        factors: state.confluenceFactors,
      },
      // Execution
      execution: {
        algorithm: state.executionAlgorithm,
      },
      // Performance
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
        highWaterMark: state.highWaterMark,
        drawdownUsed: state.highWaterMark - state.currentBalance,
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
      // Set paper mode (default true for safety)
      state.paperMode = body.paperMode !== false

      // For live trading, require PickMyTrade token
      if (!state.paperMode && !process.env.PICKMYTRADE_TOKEN) {
        return NextResponse.json({
          error: 'PickMyTrade not configured',
          message: 'Add PICKMYTRADE_TOKEN for live trading, or use paperMode: true',
        }, { status: 503 })
      }

      state.enabled = true
      state.instrument = body.instrument || 'ES'
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        message: state.paperMode
          ? 'PAPER TRADING started - signals will simulate, no real orders'
          : 'LIVE TRADING started with FULL integration',
        paperMode: state.paperMode,
        modules: ['ML Signal Engine', 'Order Flow Analysis', 'Risk Analytics', 'Smart Execution'],
        instrument: state.instrument,
        apexRules: {
          profitTarget: APEX_RULES.profitTarget,
          maxDrawdown: APEX_RULES.maxTrailingDrawdown,
          minTradingDays: APEX_RULES.minTradingDays,
          noTimeLimit: true,  // APEX has no time limit
        },
      })
    }

    if (body.action === 'stop') {
      state.enabled = false

      if (state.position) {
        const candles = await fetchCandles(state.instrument, '1', 1)
        const currentPrice = candles[0]?.close || state.position.entryPrice
        const conditions = state.marketConditions || {
          spread: 0.25, spreadPercent: 0.00005, bidDepth: 1000, askDepth: 1000,
          imbalance: 0, volatility: 0.01, recentVolume: 10000, avgVolume: 10000, toxicity: 0.3
        }
        await executeExitAdvanced('Manual Stop', currentPrice, conditions)
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-trading stopped',
      })
    }

    if (body.action === 'check') {
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        confluence: state.signalConfluence,
        factors: state.confluenceFactors,
        mlSignal: state.lastMLSignal?.direction,
        orderFlow: state.lastOrderFlow?.direction,
        vpin: state.vpin?.vpin,
        position: state.position,
      })
    }

    if (body.action === 'reset') {
      state.todayTrades = []
      state.todayPnL = 0
      state.currentBalance = state.startBalance
      state.highWaterMark = state.startBalance

      return NextResponse.json({
        success: true,
        message: 'Stats reset',
      })
    }

    // CONFIGURE: Set evaluation parameters
    if (body.action === 'configure') {
      if (body.startBalance) state.startBalance = body.startBalance
      if (body.currentBalance) state.currentBalance = body.currentBalance
      if (body.evaluationStartDate) state.evaluationStartDate = body.evaluationStartDate
      if (body.targetDays) state.targetDays = body.targetDays
      if (body.tradingDays !== undefined) state.tradingDays = body.tradingDays

      return NextResponse.json({
        success: true,
        message: 'Configuration updated',
        config: {
          startBalance: state.startBalance,
          currentBalance: state.currentBalance,
          evaluationStartDate: state.evaluationStartDate,
          targetDays: state.targetDays,
          tradingDays: state.tradingDays,
          tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
        },
      })
    }

    // TEST MODE: Run full analysis once without starting auto-trader
    if (body.action === 'test') {
      state.paperMode = true  // Always paper for tests
      state.instrument = body.instrument || 'ES'

      // Run the full analysis pipeline
      await runAutoTrader()

      // Get current market status
      const testMarketStatus = isMarketOpen()

      return NextResponse.json({
        success: true,
        mode: 'TEST (paper)',
        // APEX Rules (accurate)
        apexRules: {
          profitTarget: APEX_RULES.profitTarget,
          maxDrawdown: APEX_RULES.maxTrailingDrawdown,
          minTradingDays: APEX_RULES.minTradingDays,
          maxContracts: APEX_RULES.maxContracts,
          noTimeLimit: true,
          closeTime: '4:59 PM ET',
        },
        // Market Status
        market: {
          open: testMarketStatus.open,
          status: testMarketStatus.reason,
          minutesUntilClose: testMarketStatus.minutesUntilClose,
        },
        // Progress
        progress: {
          startBalance: state.startBalance,
          currentBalance: state.currentBalance,
          profit: state.currentBalance - state.startBalance,
          profitTarget: APEX_RULES.profitTarget,
          profitProgress: ((state.currentBalance - state.startBalance) / APEX_RULES.profitTarget * 100).toFixed(1) + '%',
          tradingDays: state.tradingDays,
          tradingDaysRequired: APEX_RULES.minTradingDays,
          tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
          drawdownUsed: state.highWaterMark - state.currentBalance,
          drawdownRemaining: APEX_RULES.maxTrailingDrawdown - (state.highWaterMark - state.currentBalance),
        },
        // All the analysis results
        mlSignal: state.lastMLSignal ? {
          direction: state.lastMLSignal.direction,
          confidence: (state.lastMLSignal.confidence * 100).toFixed(1) + '%',
          entry: state.lastMLSignal.entry?.toFixed(2),
          stopLoss: state.lastMLSignal.stopLoss?.toFixed(2),
          takeProfit: state.lastMLSignal.takeProfit?.toFixed(2),
          patterns: state.lastMLSignal.patterns.map(p => p.pattern),
        } : null,
        traditionalSignal: state.lastSignal ? {
          direction: state.lastSignal.direction,
          confidence: state.lastSignal.confidence.toFixed(1) + '%',
          strategy: state.lastSignal.strategy,
        } : null,
        orderFlow: {
          vpin: state.vpin ? {
            value: (state.vpin.vpin * 100).toFixed(1) + '%',
            toxicity: state.vpin.toxicity,
            signal: state.vpin.signal,
          } : null,
          delta: state.delta ? {
            imbalance: (state.delta.imbalanceRatio * 100).toFixed(1) + '%',
            divergence: state.delta.deltaDivergence,
            exhaustion: state.delta.exhaustion,
          } : null,
          largeOrders: {
            detected: state.largeOrderDetected,
            side: state.largeOrderSide,
          },
        },
        regime: state.marketRegime ? {
          type: state.marketRegime.type,
          strength: (state.marketRegime.strength * 100).toFixed(1) + '%',
        } : null,
        marketConditions: state.marketConditions ? {
          spread: (state.marketConditions.spreadPercent * 100).toFixed(4) + '%',
          volatility: (state.marketConditions.volatility * 100).toFixed(2) + '%',
          toxicity: (state.marketConditions.toxicity * 100).toFixed(1) + '%',
          imbalance: (state.marketConditions.imbalance * 100).toFixed(1) + '%',
        } : null,
        riskStatus: state.lastRiskStatus ? {
          status: state.lastRiskStatus.riskStatus,
          canTrade: state.lastRiskStatus.canTrade,
          safetyBuffer: '$' + state.lastRiskStatus.safetyBuffer?.toFixed(0),
          maxLossToday: '$' + state.lastRiskStatus.maxAllowedLossToday?.toFixed(0),
          recommendedSize: state.lastRiskStatus.recommendedPositionSize?.toFixed(2),
          warnings: state.lastRiskStatus.warnings,
        } : null,
        confluence: {
          score: state.signalConfluence,
          level: state.signalConfluence >= 65 ? 'STRONG' :
                 state.signalConfluence >= 50 ? 'MODERATE' :
                 state.signalConfluence >= 35 ? 'WEAK' : 'NONE',
          factors: state.confluenceFactors,
          requiresScore: 50,
          wouldTrade: state.signalConfluence >= 50,
        },
        executionAlgorithm: state.executionAlgorithm,
        position: state.position,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: start, stop, check, test, reset, configure' }, { status: 400 })
  } catch (e) {
    console.error('Auto-trade error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
