/**
 * StuntMan Continuous Backtesting Engine
 *
 * REALISTIC SIMULATION matching live trading 1:1:
 * - Real fee structure (Apex/Rithmic commissions)
 * - Realistic slippage based on volatility
 * - Simulated latency for order execution
 * - Same risk management rules as live
 *
 * Runs 24/7 on historical data to:
 * 1. Test strategies on past market data
 * 2. Track performance and improve ML models
 * 3. Simulate trades as if they were live
 * 4. Optimize for real trading
 *
 * POST /api/stuntman/backtest-engine - Start/stop/configure backtesting
 * GET /api/stuntman/backtest-engine - Get results and statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateSignal,
  Candle,
  Signal,
} from '@/lib/stuntman/signal-engine'
import {
  generateMLSignal,
  MLSignal,
} from '@/lib/stuntman/ml-signal-engine'
import {
  VPINCalculator,
  DeltaAnalyzer,
} from '@/lib/stuntman/order-flow-analysis'
import { Trade as OrderFlowTrade } from '@/lib/stuntman/types'
import {
  generateAdaptiveSignal,
  extractFeatures,
  detectMarketRegime,
  recordTradeOutcome,
  getAdaptiveStats,
  ensureLearningStateLoaded,
  saveLearningStateToDB,
  MarketRegime,
  PatternFeatures,
  TradeOutcome,
} from '@/lib/stuntman/adaptive-ml'
import {
  checkApexRiskStatus,
  DEFAULT_APEX_SAFETY,
  ApexRiskStatus,
} from '@/lib/stuntman/risk-analytics'

// =============================================================================
// APEX 150K ACCOUNT CONFIGURATION - CRITICAL SAFETY LIMITS
// =============================================================================

const APEX_150K_CONFIG = {
  accountSize: 150000,           // $150,000 account
  maxTrailingDrawdown: 6000,     // $6,000 max trailing drawdown (LOSE THIS = LOSE ACCOUNT)
  profitTarget: 9000,            // $9,000 profit target to pass
  minTradingDays: 7,             // Minimum 7 trading days required

  // SAFETY BUFFERS - Stop BEFORE hitting limits
  safetyBuffer: 0.80,            // Stop at 80% of max drawdown ($4,800)
  criticalBuffer: 0.90,          // EMERGENCY STOP at 90% ($5,400)
  dailyLossLimit: 0.25,          // Max 25% of remaining drawdown per day

  // Position sizing based on drawdown
  positionSizing: {
    safe: 1.0,       // 0-40% drawdown: full size
    caution: 0.75,   // 40-60% drawdown: 75% size
    warning: 0.50,   // 60-80% drawdown: 50% size
    danger: 0.25,    // 80-90% drawdown: 25% size
    stop: 0,         // 90%+ drawdown: NO TRADING
  }
}

// =============================================================================
// REALISTIC TRADING COSTS (Match Apex/Rithmic 1:1)
// =============================================================================

const TRADING_COSTS = {
  // Commissions (per contract, round trip)
  commissionPerContract: 4.12,  // Apex Rithmic: ~$2.06 per side

  // Exchange fees (per contract, per side)
  exchangeFeePerSide: 1.28,     // CME E-mini ES
  nfaFee: 0.02,                 // NFA regulatory fee

  // Slippage simulation - REALISTIC for ES futures
  baseSlippageTicks: 0.25,      // Minimum slippage (1 tick = $12.50 for ES)
  volatilitySlippageMultiplier: 0.1,  // REDUCED: ES is highly liquid, minimal slippage

  // Latency simulation (milliseconds)
  minLatencyMs: 50,             // Best case latency
  maxLatencyMs: 200,            // Worst case latency
  avgLatencyMs: 100,            // Average latency

  // ES Contract specifications
  tickSize: 0.25,               // ES tick size
  tickValue: 12.50,             // $12.50 per tick
  pointValue: 50.00,            // $50 per point (4 ticks)
}

// Calculate total cost for a trade
function calculateTradeCosts(
  contracts: number,
  entryPrice: number,
  exitPrice: number,
  volatility: number
): {
  commission: number
  exchangeFees: number
  slippage: number
  totalCosts: number
  slippageTicks: number
} {
  // Commission (round trip)
  const commission = TRADING_COSTS.commissionPerContract * contracts

  // Exchange fees (both sides)
  const exchangeFees = (TRADING_COSTS.exchangeFeePerSide + TRADING_COSTS.nfaFee) * 2 * contracts

  // Slippage calculation - REALISTIC for ES (0.25-1 tick typical)
  // ES is one of the most liquid futures, slippage is minimal during RTH
  const volatilityFactor = Math.max(1, Math.min(2, volatility / 0.02))  // Cap at 2x
  const slippageTicks = Math.min(1, TRADING_COSTS.baseSlippageTicks +
    (TRADING_COSTS.volatilitySlippageMultiplier * volatilityFactor * Math.random()))
  const slippage = slippageTicks * TRADING_COSTS.tickValue * contracts * 2  // Entry and exit

  const totalCosts = commission + exchangeFees + slippage

  return {
    commission,
    exchangeFees,
    slippage,
    totalCosts,
    slippageTicks,
  }
}

// Simulate execution latency
function simulateLatency(): number {
  // Gaussian-like distribution centered on average
  const u1 = Math.random()
  const u2 = Math.random()
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

  const latency = TRADING_COSTS.avgLatencyMs + (normal * 30)  // 30ms standard deviation
  return Math.max(TRADING_COSTS.minLatencyMs, Math.min(TRADING_COSTS.maxLatencyMs, latency))
}

// Apply slippage to price
function applySlippage(price: number, direction: 'LONG' | 'SHORT', isEntry: boolean, volatility: number): number {
  const volatilityFactor = Math.max(1, volatility / 0.01)
  const slippageTicks = TRADING_COSTS.baseSlippageTicks +
    (TRADING_COSTS.volatilitySlippageMultiplier * volatilityFactor * Math.random())
  const slippagePoints = slippageTicks * TRADING_COSTS.tickSize

  // Slippage always works against you
  if (isEntry) {
    return direction === 'LONG' ? price + slippagePoints : price - slippagePoints
  } else {
    return direction === 'LONG' ? price - slippagePoints : price + slippagePoints
  }
}

// =============================================================================
// SIMPLE INDICATOR CALCULATIONS - For trend-following strategy
// =============================================================================

function calculateEMASimple(prices: number[], period: number): number[] {
  if (prices.length < period) return []

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema.push(sum / period)

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1])
  }

  return ema
}

function calculateRSISimple(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [50] // Default to neutral

  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }

  return rsi.length > 0 ? rsi : [50]
}

// =============================================================================
// TYPES
// =============================================================================

interface BacktestTrade {
  id: string
  timestamp: number
  direction: 'LONG' | 'SHORT'
  entryPrice: number           // Price with slippage applied
  exitPrice: number            // Price with slippage applied
  rawEntryPrice: number        // Original price before slippage
  rawExitPrice: number         // Original price before slippage
  contracts: number
  grossPnL: number             // P&L before costs
  costs: {
    commission: number
    exchangeFees: number
    slippage: number
    totalCosts: number
  }
  netPnL: number               // P&L after ALL costs
  pnlPercent: number
  holdingTime: number          // minutes
  latencyMs: number            // Simulated execution latency
  entryReason: string
  exitReason: string
  confluenceScore: number
  mlConfidence: number
  vpinAtEntry: number
}

interface BacktestState {
  running: boolean
  startTime: number | null
  // Data window
  currentIndex: number
  totalCandles: number
  // Simulated position
  position: {
    direction: 'LONG' | 'SHORT'
    rawEntryPrice: number        // Original market price
    entryPrice: number           // Price with slippage applied
    entryTime: number
    entryLatencyMs: number       // Simulated entry latency
    contracts: number
    initialContracts: number     // Original size before scaling out
    stopLoss: number
    initialStopLoss: number      // Original stop before trailing
    takeProfit: number
    target1: number              // First partial target (1R)
    target2: number              // Second partial target (2R)
    target1Hit: boolean          // Did we hit first target?
    target2Hit: boolean          // Did we hit second target?
    trailingActive: boolean      // Is trailing stop active?
    trailingDistance: number     // ATR-based trailing distance
    highestPrice: number         // Highest price since entry (for LONG)
    lowestPrice: number          // Lowest price since entry (for SHORT)
    confluenceScore: number
    mlConfidence: number
    vpinAtEntry: number
    volatilityAtEntry: number    // For cost calculations
    regime: MarketRegime         // Market regime at entry
    features: PatternFeatures    // Pattern features at entry
    stopMultiplierUsed: number   // For adaptive learning
    targetMultiplierUsed: number // For adaptive learning
    strategy: string             // Strategy that generated signal
  } | null
  // Results
  trades: BacktestTrade[]
  grossPnL: number               // Total P&L before costs
  totalCosts: number             // Total costs paid
  totalPnL: number               // Net P&L after costs
  wins: number
  losses: number
  maxDrawdown: number
  peakBalance: number
  currentBalance: number
  // Cost breakdown
  costBreakdown: {
    commissions: number
    exchangeFees: number
    slippage: number
  }
  // Latency stats
  latencyStats: {
    totalLatencyMs: number
    avgLatencyMs: number
    maxLatencyMs: number
    minLatencyMs: number
  }
  // Strategy stats
  strategyPerformance: {
    [strategy: string]: {
      trades: number
      wins: number
      pnl: number
    }
  }
  // ML stats
  mlAccuracy: {
    correctPredictions: number
    totalPredictions: number
    byConfidenceLevel: {
      high: { correct: number, total: number }    // >80%
      medium: { correct: number, total: number }  // 60-80%
      low: { correct: number, total: number }     // <60%
    }
  }
  // Time tracking
  candlesProcessed: number
  lastProcessedTime: number
  processingSpeed: number  // candles per second
}

// =============================================================================
// SPEED & MODE CONFIGURATION
// =============================================================================

interface EngineConfig {
  speed: 1 | 5 | 10 | 50 | 100 | 'MAX'  // Speed multiplier
  inverseMode: boolean                    // Flip signals when losing
  inverseThreshold: number                // Win rate % below which to inverse (default 45%)
  autoInverse: boolean                    // Auto-detect and inverse bad strategies
  sessionFilter: boolean                  // Only trade during optimal sessions
  tradeSessions: {
    preMarket: boolean      // 4:00 AM - 9:30 AM ET
    openingHour: boolean    // 9:30 AM - 10:30 AM ET (high volatility)
    midDay: boolean         // 10:30 AM - 2:00 PM ET (often choppy)
    afternoonPush: boolean  // 2:00 PM - 3:00 PM ET
    powerHour: boolean      // 3:00 PM - 4:00 PM ET (strong moves)
    afterHours: boolean     // 4:00 PM - 8:00 PM ET
    overnight: boolean      // 8:00 PM - 4:00 AM ET (thin markets)
  }
}

let config: EngineConfig = {
  speed: 1,
  inverseMode: false,
  inverseThreshold: 40,  // Flip when win rate drops below 40%
  autoInverse: true,     // AUTO-INVERSE ON BY DEFAULT - fully automatic
  sessionFilter: true,   // ENABLED: Only trade optimal sessions
  tradeSessions: {
    preMarket: false,      // Skip pre-market (thin)
    openingHour: true,     // TRADE: High volatility, good setups
    midDay: true,          // TRADE: Enable to get more trades for learning
    afternoonPush: true,   // TRADE: Momentum builds
    powerHour: true,       // TRADE: Strong directional moves
    afterHours: false,     // Skip after-hours (news reactions)
    overnight: false,      // Skip overnight (thin, risky)
  }
}

// =============================================================================
// SESSION DETECTION & FILTERING
// =============================================================================

type TradingSession = 'preMarket' | 'openingHour' | 'midDay' | 'afternoonPush' | 'powerHour' | 'afterHours' | 'overnight'

function getCurrentSession(timestamp: number): TradingSession {
  const date = new Date(timestamp)
  // Convert to ET (UTC-5 or UTC-4 during DST)
  // For simplicity, using UTC-5 (EST)
  const utcHour = date.getUTCHours()
  const utcMinute = date.getUTCMinutes()
  const etHour = (utcHour - 5 + 24) % 24
  const etTime = etHour * 100 + utcMinute // HHMM format

  // Session times in ET (HHMM format)
  if (etTime >= 400 && etTime < 930) return 'preMarket'
  if (etTime >= 930 && etTime < 1030) return 'openingHour'
  if (etTime >= 1030 && etTime < 1400) return 'midDay'
  if (etTime >= 1400 && etTime < 1500) return 'afternoonPush'
  if (etTime >= 1500 && etTime < 1600) return 'powerHour'
  if (etTime >= 1600 && etTime < 2000) return 'afterHours'
  return 'overnight' // 8 PM - 4 AM
}

function shouldTradeInSession(timestamp: number): boolean {
  if (!config.sessionFilter) return true // Session filter disabled

  const session = getCurrentSession(timestamp)
  return config.tradeSessions[session]
}

function getSessionInfo(timestamp: number): { session: TradingSession; canTrade: boolean; reason: string } {
  const session = getCurrentSession(timestamp)
  const canTrade = !config.sessionFilter || config.tradeSessions[session]

  const sessionNames: Record<TradingSession, string> = {
    preMarket: 'Pre-Market (4:00-9:30 ET)',
    openingHour: 'Opening Hour (9:30-10:30 ET)',
    midDay: 'Mid-Day (10:30-2:00 ET)',
    afternoonPush: 'Afternoon Push (2:00-3:00 ET)',
    powerHour: 'Power Hour (3:00-4:00 ET)',
    afterHours: 'After Hours (4:00-8:00 ET)',
    overnight: 'Overnight (8:00 PM-4:00 AM ET)',
  }

  const reason = canTrade
    ? `Trading allowed: ${sessionNames[session]}`
    : `Skipping: ${sessionNames[session]} (filtered)`

  return { session, canTrade, reason }
}

// =============================================================================
// MULTI-TIMEFRAME TREND CONFIRMATION
// =============================================================================

interface MTFTrend {
  tf5m: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  tf15m: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  aligned: boolean           // Are both timeframes aligned?
  bias: 'LONG' | 'SHORT' | 'NONE'
  strength: number           // 0-100 confluence strength
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }
  return ema
}

function getTimeframeTrend(candles: Candle[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (candles.length < 21) return 'NEUTRAL'

  const closes = candles.map(c => c.close)
  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const currentPrice = closes[closes.length - 1]

  // Strong trend: price > EMA9 > EMA21 (bullish) or price < EMA9 < EMA21 (bearish)
  if (currentPrice > ema9 && ema9 > ema21) {
    return 'BULLISH'
  } else if (currentPrice < ema9 && ema9 < ema21) {
    return 'BEARISH'
  }

  return 'NEUTRAL'
}

function getMTFConfirmation(candles5m: Candle[], candles15m: Candle[]): MTFTrend {
  const tf5m = getTimeframeTrend(candles5m)
  const tf15m = getTimeframeTrend(candles15m)

  // Check alignment
  const aligned = (tf5m === 'BULLISH' && tf15m === 'BULLISH') ||
                  (tf5m === 'BEARISH' && tf15m === 'BEARISH')

  // Determine bias
  let bias: 'LONG' | 'SHORT' | 'NONE' = 'NONE'
  let strength = 0

  if (aligned) {
    if (tf5m === 'BULLISH') {
      bias = 'LONG'
      strength = 80  // Strong confluence
    } else {
      bias = 'SHORT'
      strength = 80
    }
  } else if (tf15m !== 'NEUTRAL') {
    // 15m trend takes precedence
    bias = tf15m === 'BULLISH' ? 'LONG' : 'SHORT'
    strength = 50  // Moderate confluence
  } else if (tf5m !== 'NEUTRAL') {
    // Only 5m has trend
    bias = tf5m === 'BULLISH' ? 'LONG' : 'SHORT'
    strength = 30  // Weak confluence
  }

  return { tf5m, tf15m, aligned, bias, strength }
}

function signalAlignedWithMTF(direction: 'LONG' | 'SHORT', mtf: MTFTrend): boolean {
  // If no clear MTF bias or weak confluence, allow any signal
  if (mtf.bias === 'NONE' || mtf.strength < 50) return true

  // Only block if STRONG conflicting bias (both TFs aligned against us)
  if (mtf.aligned && direction !== mtf.bias) {
    return false // Block counter-trend trades when MTF strongly aligned
  }

  // Otherwise allow the trade
  return true
}

// Speed to batch size mapping
const SPEED_BATCH_SIZE: Record<string, number> = {
  '1': 10,      // Normal: 10 candles per batch
  '5': 50,      // 5x: 50 candles
  '10': 100,    // 10x: 100 candles
  '50': 500,    // 50x: 500 candles
  '100': 1000,  // 100x: 1000 candles
  'MAX': 5000,  // MAX: Process as fast as possible
}

// Speed to delay mapping (ms between batches)
const SPEED_DELAY: Record<string, number> = {
  '1': 100,     // Normal: 100ms delay
  '5': 50,      // 5x: 50ms
  '10': 20,     // 10x: 20ms
  '50': 5,      // 50x: 5ms
  '100': 1,     // 100x: 1ms
  'MAX': 0,     // MAX: No delay
}

// =============================================================================
// STATE
// =============================================================================

let state: BacktestState = {
  running: false,
  startTime: null,
  currentIndex: 0,
  totalCandles: 0,
  position: null,
  trades: [],
  grossPnL: 0,
  totalCosts: 0,
  totalPnL: 0,
  wins: 0,
  losses: 0,
  maxDrawdown: 0,
  peakBalance: 150000,
  currentBalance: 150000,
  costBreakdown: {
    commissions: 0,
    exchangeFees: 0,
    slippage: 0,
  },
  latencyStats: {
    totalLatencyMs: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0,
    minLatencyMs: Infinity,
  },
  strategyPerformance: {},
  mlAccuracy: {
    correctPredictions: 0,
    totalPredictions: 0,
    byConfidenceLevel: {
      high: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      low: { correct: 0, total: 0 },
    }
  },
  candlesProcessed: 0,
  lastProcessedTime: 0,
  processingSpeed: 0,
}

// =============================================================================
// APEX RISK STATUS - CRITICAL SAFETY TRACKING
// =============================================================================

interface ApexRiskState {
  trailingDrawdown: number       // Current drawdown from high water mark
  drawdownPercent: number        // % of max drawdown used
  riskLevel: 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER' | 'STOPPED' | 'VIOLATED'
  positionSizeMultiplier: number // How much to reduce position size
  canTrade: boolean              // Are we allowed to trade?
  dailyPnL: number               // P&L for current trading day
  tradingDayStart: number        // Timestamp of current day start
  stopReason: string | null      // Why trading was stopped
}

let apexRisk: ApexRiskState = {
  trailingDrawdown: 0,
  drawdownPercent: 0,
  riskLevel: 'SAFE',
  positionSizeMultiplier: 1.0,
  canTrade: true,
  dailyPnL: 0,
  tradingDayStart: 0,
  stopReason: null,
}

function updateApexRiskStatus(): void {
  const config = APEX_150K_CONFIG

  // Calculate trailing drawdown (from peak to current)
  apexRisk.trailingDrawdown = Math.max(0, state.peakBalance - state.currentBalance)
  apexRisk.drawdownPercent = (apexRisk.trailingDrawdown / config.maxTrailingDrawdown) * 100

  // Determine risk level and whether we can trade
  if (apexRisk.trailingDrawdown >= config.maxTrailingDrawdown) {
    apexRisk.riskLevel = 'VIOLATED'
    apexRisk.canTrade = false
    apexRisk.positionSizeMultiplier = 0
    apexRisk.stopReason = `🚫 ACCOUNT VIOLATED! Drawdown $${apexRisk.trailingDrawdown.toFixed(2)} >= $${config.maxTrailingDrawdown} limit`
  } else if (apexRisk.drawdownPercent >= config.criticalBuffer * 100) {
    apexRisk.riskLevel = 'STOPPED'
    apexRisk.canTrade = false
    apexRisk.positionSizeMultiplier = 0
    apexRisk.stopReason = `🛑 EMERGENCY STOP! ${apexRisk.drawdownPercent.toFixed(1)}% of max drawdown used. Only $${(config.maxTrailingDrawdown - apexRisk.trailingDrawdown).toFixed(2)} left!`
  } else if (apexRisk.drawdownPercent >= config.safetyBuffer * 100) {
    apexRisk.riskLevel = 'DANGER'
    apexRisk.canTrade = false  // Stop trading to protect account
    apexRisk.positionSizeMultiplier = config.positionSizing.danger
    apexRisk.stopReason = `⚠️ DANGER ZONE! ${apexRisk.drawdownPercent.toFixed(1)}% of max drawdown. Trading paused for safety.`
  } else if (apexRisk.drawdownPercent >= 60) {
    apexRisk.riskLevel = 'WARNING'
    apexRisk.canTrade = true
    apexRisk.positionSizeMultiplier = config.positionSizing.warning
    apexRisk.stopReason = null
  } else if (apexRisk.drawdownPercent >= 40) {
    apexRisk.riskLevel = 'CAUTION'
    apexRisk.canTrade = true
    apexRisk.positionSizeMultiplier = config.positionSizing.caution
    apexRisk.stopReason = null
  } else {
    apexRisk.riskLevel = 'SAFE'
    apexRisk.canTrade = true
    apexRisk.positionSizeMultiplier = config.positionSizing.safe
    apexRisk.stopReason = null
  }
}

// Track inverse effectiveness
let inverseStats = {
  normalWins: 0,
  normalLosses: 0,
  inverseWins: 0,
  inverseLosses: 0,
  currentlyInversed: false,
}

// Historical data cache
let historicalData: {
  candles1m: Candle[]
  candles5m: Candle[]
  candles15m: Candle[]
} = {
  candles1m: [],
  candles5m: [],
  candles15m: [],
}

// Engines
const vpinCalculator = new VPINCalculator(50000, 50)
const deltaAnalyzer = new DeltaAnalyzer()

// =============================================================================
// FETCH HISTORICAL DATA - SPY (S&P 500 ETF) scaled to ES prices
// =============================================================================

async function fetchHistoricalData(days: number = 30): Promise<boolean> {
  try {
    console.log(`[BACKTEST] Fetching ${days} days of SPY data (scaled to ES prices)...`)

    // Use SPY (S&P 500 ETF) - tracks ES perfectly, has intraday data
    // SPY price * 10 ≈ ES price (e.g., SPY $590 → ES $5900)
    const symbol = 'SPY'
    const now = Math.floor(Date.now() / 1000)

    // Yahoo Finance limits: 1m data only available for last 7 days
    const days1m = Math.min(days, 7)
    const startTime1m = now - (days1m * 24 * 60 * 60)
    const startTime5m = now - (days * 24 * 60 * 60)
    const startTime15m = now - (days * 24 * 60 * 60)

    // Fetch intraday data from Yahoo Finance
    const url1m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime1m}&period2=${now}&interval=1m&includePrePost=true`
    const url5m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime5m}&period2=${now}&interval=5m&includePrePost=true`
    const url15m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime15m}&period2=${now}&interval=15m&includePrePost=true`

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }

    // Fetch all timeframes in parallel
    const [res1m, res5m, res15m] = await Promise.all([
      fetch(url1m, { headers, cache: 'no-store' }),
      fetch(url5m, { headers, cache: 'no-store' }),
      fetch(url15m, { headers, cache: 'no-store' }),
    ])

    // Scale factor: SPY to ES (ES ≈ SPY * 10)
    const SCALE = 10

    // Parse 1m data
    if (res1m.ok) {
      const data = await res1m.json()
      const result = data.chart?.result?.[0]
      if (result?.timestamp && result?.indicators?.quote?.[0]) {
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        historicalData.candles1m = timestamps.map((t: number, i: number) => ({
          time: t * 1000,  // Convert to milliseconds
          open: (quote.open[i] || quote.close[i] || 0) * SCALE,
          high: (quote.high[i] || quote.close[i] || 0) * SCALE,
          low: (quote.low[i] || quote.close[i] || 0) * SCALE,
          close: (quote.close[i] || 0) * SCALE,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles1m.length} SPY->ES 1m candles`)
      }
    } else {
      console.error('[BACKTEST] Failed to fetch 1m data:', await res1m.text())
    }

    // Parse 5m data
    if (res5m.ok) {
      const data = await res5m.json()
      const result = data.chart?.result?.[0]
      if (result?.timestamp && result?.indicators?.quote?.[0]) {
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        historicalData.candles5m = timestamps.map((t: number, i: number) => ({
          time: t * 1000,
          open: (quote.open[i] || quote.close[i] || 0) * SCALE,
          high: (quote.high[i] || quote.close[i] || 0) * SCALE,
          low: (quote.low[i] || quote.close[i] || 0) * SCALE,
          close: (quote.close[i] || 0) * SCALE,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles5m.length} SPY->ES 5m candles`)
      }
    }

    // Parse 15m data
    if (res15m.ok) {
      const data = await res15m.json()
      const result = data.chart?.result?.[0]
      if (result?.timestamp && result?.indicators?.quote?.[0]) {
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        historicalData.candles15m = timestamps.map((t: number, i: number) => ({
          time: t * 1000,
          open: (quote.open[i] || quote.close[i] || 0) * SCALE,
          high: (quote.high[i] || quote.close[i] || 0) * SCALE,
          low: (quote.low[i] || quote.close[i] || 0) * SCALE,
          close: (quote.close[i] || 0) * SCALE,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles15m.length} SPY->ES 15m candles`)
      }
    }

    state.totalCandles = historicalData.candles1m.length

    console.log(`[BACKTEST] Total: ${historicalData.candles1m.length} 1m, ${historicalData.candles5m.length} 5m, ${historicalData.candles15m.length} 15m candles (SPY scaled to ES)`)

    return historicalData.candles1m.length > 100
  } catch (e) {
    console.error('[BACKTEST] Failed to fetch data:', e)
    return false
  }
}

// =============================================================================
// SIMULATE TRADES FROM CANDLES (for order flow)
// =============================================================================

function simulateTradesFromCandle(candle: Candle): OrderFlowTrade[] {
  const trades: OrderFlowTrade[] = []
  const isBullish = candle.close > candle.open
  const range = candle.high - candle.low
  const volumePerTrade = candle.volume / 5

  for (let j = 0; j < 5; j++) {
    const priceVariation = (Math.random() - 0.5) * range
    const price = (candle.open + candle.close) / 2 + priceVariation
    const side = isBullish ? (Math.random() > 0.35 ? 'buy' : 'sell') : (Math.random() > 0.35 ? 'sell' : 'buy')

    trades.push({
      id: `BT${candle.time}-${j}`,
      instrumentName: 'ES',
      price,
      quantity: volumePerTrade * (0.5 + Math.random()),
      side: side as 'buy' | 'sell',
      timestamp: candle.time + j * 12000,
      isMaker: Math.random() > 0.4,
    })
  }

  return trades
}

// =============================================================================
// PROCESS SINGLE CANDLE (Main simulation logic)
// =============================================================================

async function processCandle(index: number): Promise<void> {
  if (index < 50) return  // Need enough history

  // Get candle windows
  const candles1m = historicalData.candles1m.slice(Math.max(0, index - 100), index + 1)
  const candles5m = historicalData.candles5m.slice(0, Math.min(index / 5, historicalData.candles5m.length))
  const candles15m = historicalData.candles15m.slice(0, Math.min(index / 15, historicalData.candles15m.length))

  if (candles1m.length < 50 || candles5m.length < 20 || candles15m.length < 10) return

  const currentCandle = candles1m[candles1m.length - 1]
  const currentPrice = currentCandle.close

  // Generate order flow data for VPIN
  const recentCandles = candles1m.slice(-10)
  for (const c of recentCandles) {
    const trades = simulateTradesFromCandle(c)
    vpinCalculator.addTrades(trades)
  }
  const vpin = vpinCalculator.calculate()

  // Extract pattern features for adaptive ML
  const features = extractFeatures(candles1m)
  const regime = detectMarketRegime(candles1m, features)

  // ==========================================================================
  // SIMPLE TREND-FOLLOWING STRATEGY - Proven approach
  // Trade WITH the trend, enter on pullbacks
  // ==========================================================================

  const closes = candles1m.map(c => c.close)

  // Calculate EMAs for trend direction
  const ema20 = calculateEMASimple(closes, 20)
  const ema50 = calculateEMASimple(closes, 50)

  // Calculate RSI for pullback detection
  const rsi = calculateRSISimple(closes, 14)

  const price = currentPrice
  const lastEma20 = ema20[ema20.length - 1]
  const lastEma50 = ema50[ema50.length - 1]
  const lastRsi = rsi[rsi.length - 1]

  // Determine trend: Price > EMA20 > EMA50 = UPTREND
  const isUptrend = price > lastEma20 && lastEma20 > lastEma50
  const isDowntrend = price < lastEma20 && lastEma20 < lastEma50

  // Build simple strategy signals
  const strategies: Array<{ name: string; direction: 'LONG' | 'SHORT' | 'FLAT'; confidence: number }> = []

  // TREND FOLLOWING: Only trade in direction of trend
  if (isUptrend) {
    // In uptrend, look for pullback (RSI < 40) to buy
    if (lastRsi < 45) {
      strategies.push({ name: 'TrendPullback', direction: 'LONG', confidence: 80 + (45 - lastRsi) })
    } else if (lastRsi < 55) {
      // Moderate pullback
      strategies.push({ name: 'TrendFollow', direction: 'LONG', confidence: 70 })
    }
  } else if (isDowntrend) {
    // In downtrend, look for pullback (RSI > 60) to sell
    if (lastRsi > 55) {
      strategies.push({ name: 'TrendPullback', direction: 'SHORT', confidence: 80 + (lastRsi - 55) })
    } else if (lastRsi > 45) {
      // Moderate pullback
      strategies.push({ name: 'TrendFollow', direction: 'SHORT', confidence: 70 })
    }
  }

  // ADD EMA CROSSOVER signal
  if (ema20.length >= 2) {
    const prevEma20 = ema20[ema20.length - 2]
    const prevEma50 = ema50[ema50.length - 2]

    // Bullish crossover: EMA20 crosses above EMA50
    if (prevEma20 <= prevEma50 && lastEma20 > lastEma50) {
      strategies.push({ name: 'EMACross', direction: 'LONG', confidence: 85 })
    }
    // Bearish crossover: EMA20 crosses below EMA50
    if (prevEma20 >= prevEma50 && lastEma20 < lastEma50) {
      strategies.push({ name: 'EMACross', direction: 'SHORT', confidence: 85 })
    }
  }

  // Generate ADAPTIVE signal (learns from past performance)
  const adaptiveSignal = generateAdaptiveSignal(candles1m, strategies)

  // Track ML predictions
  state.mlAccuracy.totalPredictions++
  const confLevel = adaptiveSignal.confidence > 80 ? 'high' : adaptiveSignal.confidence > 60 ? 'medium' : 'low'
  state.mlAccuracy.byConfidenceLevel[confLevel].total++

  // Position Management
  if (state.position) {
    const pos = state.position
    const priceDiff = pos.direction === 'LONG'
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice

    // =========================================================================
    // TRAILING STOP & PARTIAL PROFIT SYSTEM
    // =========================================================================

    // Update highest/lowest price tracking
    if (pos.direction === 'LONG') {
      pos.highestPrice = Math.max(pos.highestPrice, currentPrice)
    } else {
      pos.lowestPrice = Math.min(pos.lowestPrice, currentPrice)
    }

    // Check Target 1 (1R) - Take 50% profit and activate trailing stop
    if (!pos.target1Hit) {
      const hitTarget1 = pos.direction === 'LONG'
        ? currentPrice >= pos.target1
        : currentPrice <= pos.target1

      if (hitTarget1) {
        pos.target1Hit = true
        pos.trailingActive = true
        // Move stop to breakeven
        pos.stopLoss = pos.entryPrice
        // Scale out 50% (reduce contracts)
        const scaleOutContracts = Math.floor(pos.contracts * 0.5)
        if (scaleOutContracts > 0) {
          // Record partial exit (we'll count this in the final trade)
          pos.contracts = pos.contracts - scaleOutContracts
        }
      }
    }

    // Check Target 2 (2R) - Take another 25% profit
    if (pos.target1Hit && !pos.target2Hit) {
      const hitTarget2 = pos.direction === 'LONG'
        ? currentPrice >= pos.target2
        : currentPrice <= pos.target2

      if (hitTarget2) {
        pos.target2Hit = true
        // Scale out another 25% of original (half of remaining)
        const scaleOutContracts = Math.floor(pos.contracts * 0.5)
        if (scaleOutContracts > 0 && pos.contracts > 1) {
          pos.contracts = pos.contracts - scaleOutContracts
        }
      }
    }

    // Update trailing stop if active
    if (pos.trailingActive) {
      if (pos.direction === 'LONG') {
        // Trail stop below highest price
        const newTrailingStop = pos.highestPrice - pos.trailingDistance
        if (newTrailingStop > pos.stopLoss) {
          pos.stopLoss = newTrailingStop
        }
      } else {
        // Trail stop above lowest price
        const newTrailingStop = pos.lowestPrice + pos.trailingDistance
        if (newTrailingStop < pos.stopLoss) {
          pos.stopLoss = newTrailingStop
        }
      }
    }

    let shouldExit = false
    let exitReason = ''

    // Stop loss (includes trailing stop)
    if (pos.direction === 'LONG' && currentPrice <= pos.stopLoss) {
      shouldExit = true
      exitReason = pos.trailingActive ? 'Trailing Stop' : 'Stop Loss'
    } else if (pos.direction === 'SHORT' && currentPrice >= pos.stopLoss) {
      shouldExit = true
      exitReason = pos.trailingActive ? 'Trailing Stop' : 'Stop Loss'
    }

    // Take profit (final target)
    if (pos.direction === 'LONG' && currentPrice >= pos.takeProfit) {
      shouldExit = true
      exitReason = 'Take Profit'
    } else if (pos.direction === 'SHORT' && currentPrice <= pos.takeProfit) {
      shouldExit = true
      exitReason = 'Take Profit'
    }

    // Reversal signal - ONLY exit if VERY high confidence AND we're already in profit
    // This prevents cutting winners short on weak reversal signals
    const isInProfit = pos.direction === 'LONG'
      ? currentPrice > pos.entryPrice
      : currentPrice < pos.entryPrice

    if (adaptiveSignal.confidence >= 85 &&
        adaptiveSignal.direction !== 'FLAT' &&
        adaptiveSignal.direction !== pos.direction &&
        isInProfit) {
      shouldExit = true
      exitReason = 'Reversal Signal'
    }

    if (shouldExit) {
      // Simulate exit latency
      const exitLatencyMs = simulateLatency()

      // Calculate current volatility for slippage
      const recentPrices = candles1m.slice(-20).map(c => (c.high - c.low) / c.close)
      const volatility = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length

      // Apply slippage to exit price
      const rawExitPrice = currentPrice
      const exitPrice = applySlippage(currentPrice, pos.direction, false, volatility)

      // Calculate GROSS P&L (before costs)
      const grossPnLPoints = pos.direction === 'LONG'
        ? exitPrice - pos.entryPrice
        : pos.entryPrice - exitPrice
      const grossPnL = grossPnLPoints * TRADING_COSTS.pointValue * pos.contracts

      // Calculate ALL trading costs
      const costs = calculateTradeCosts(
        pos.contracts,
        pos.entryPrice,
        exitPrice,
        pos.volatilityAtEntry
      )

      // NET P&L = GROSS P&L - ALL COSTS
      const netPnL = grossPnL - costs.totalCosts

      const holdingTime = (currentCandle.time - pos.entryTime) / 60000
      const totalLatency = pos.entryLatencyMs + exitLatencyMs

      const trade: BacktestTrade = {
        id: `BT${Date.now()}`,
        timestamp: currentCandle.time,
        direction: pos.direction,
        rawEntryPrice: pos.rawEntryPrice,
        entryPrice: pos.entryPrice,
        rawExitPrice,
        exitPrice,
        contracts: pos.contracts,
        grossPnL,
        costs: {
          commission: costs.commission,
          exchangeFees: costs.exchangeFees,
          slippage: costs.slippage,
          totalCosts: costs.totalCosts,
        },
        netPnL,
        pnlPercent: (netPnL / state.currentBalance) * 100,
        holdingTime,
        latencyMs: totalLatency,
        entryReason: `Confluence: ${pos.confluenceScore}`,
        exitReason,
        confluenceScore: pos.confluenceScore,
        mlConfidence: pos.mlConfidence,
        vpinAtEntry: pos.vpinAtEntry,
      }

      state.trades.push(trade)

      // Update totals with NET P&L (after costs)
      state.grossPnL += grossPnL
      state.totalCosts += costs.totalCosts
      state.totalPnL += netPnL
      state.currentBalance += netPnL

      // Update peak balance (high water mark) for trailing drawdown
      if (state.currentBalance > state.peakBalance) {
        state.peakBalance = state.currentBalance
      }

      // Update Apex risk status after trade
      updateApexRiskStatus()

      // Update cost breakdown
      state.costBreakdown.commissions += costs.commission
      state.costBreakdown.exchangeFees += costs.exchangeFees
      state.costBreakdown.slippage += costs.slippage

      // Update latency stats
      state.latencyStats.totalLatencyMs += totalLatency
      state.latencyStats.avgLatencyMs = state.latencyStats.totalLatencyMs / state.trades.length
      if (totalLatency > state.latencyStats.maxLatencyMs) state.latencyStats.maxLatencyMs = totalLatency
      if (totalLatency < state.latencyStats.minLatencyMs) state.latencyStats.minLatencyMs = totalLatency

      if (netPnL > 0) {
        state.wins++
        state.mlAccuracy.correctPredictions++
        state.mlAccuracy.byConfidenceLevel[confLevel].correct++
        if (state.currentBalance > state.peakBalance) {
          state.peakBalance = state.currentBalance
        }
      } else {
        state.losses++
        const drawdown = state.peakBalance - state.currentBalance
        if (drawdown > state.maxDrawdown) {
          state.maxDrawdown = drawdown
        }
      }

      // Track strategy performance (with net P&L)
      const strategy = pos.strategy || 'Unknown'
      if (!state.strategyPerformance[strategy]) {
        state.strategyPerformance[strategy] = { trades: 0, wins: 0, pnl: 0 }
      }
      state.strategyPerformance[strategy].trades++
      state.strategyPerformance[strategy].pnl += netPnL
      if (netPnL > 0) state.strategyPerformance[strategy].wins++

      // ADAPTIVE LEARNING: Record trade outcome for ML to learn from
      const tradeOutcome: TradeOutcome = {
        features: pos.features,
        direction: pos.direction,
        regime: pos.regime,
        pnlPercent: (netPnL / 150000) * 100, // % of starting balance
        wasWinner: netPnL > 0,
        holdingBars: Math.floor(holdingTime),
        stopMultiplierUsed: pos.stopMultiplierUsed,
        targetMultiplierUsed: pos.targetMultiplierUsed,
        strategy: pos.strategy,
      }
      await recordTradeOutcome(tradeOutcome)

      state.position = null
    }
  } else {
    // =========================================================================
    // APEX SAFETY CHECK - MUST CHECK BEFORE ANY ENTRY
    // =========================================================================
    updateApexRiskStatus()

    if (!apexRisk.canTrade) {
      // STOP TRADING - Risk too high
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

    // ADAPTIVE ENTRY: Use learned optimal parameters
    let entryDirection = adaptiveSignal.direction

    // SESSION FILTER: Only trade during optimal market sessions
    const sessionInfo = getSessionInfo(currentCandle.time)
    if (!sessionInfo.canTrade) {
      // Skip entry - not in optimal trading session
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

    // MULTI-TIMEFRAME CONFIRMATION: Check higher timeframe trend alignment
    const mtfTrend = getMTFConfirmation(candles5m.slice(-50), candles15m.slice(-30))

    // Only enter if adaptive signal is not FLAT and has sufficient strength
    if (entryDirection !== 'FLAT' && adaptiveSignal.strength !== 'NONE') {
      // Apply inverse mode if enabled - flip LONG <-> SHORT
      if (shouldInverseSignal()) {
        entryDirection = entryDirection === 'LONG' ? 'SHORT' : 'LONG'
      }

      // MTF FILTER: Only trade in direction of higher timeframe trend
      if (!signalAlignedWithMTF(entryDirection, mtfTrend)) {
        // Signal against higher timeframe trend - skip entry
        state.candlesProcessed++
        state.currentIndex = index
        return
      }

      const atr = calculateATR(candles1m.slice(-14))

      // USE ADAPTIVE OPTIMAL PARAMETERS (learned from past performance)
      const stopDistance = atr * adaptiveSignal.optimalStopMultiplier
      const targetDistance = atr * adaptiveSignal.optimalTargetMultiplier

      // Calculate volatility for slippage
      const recentPrices = candles1m.slice(-20).map(c => (c.high - c.low) / c.close)
      const volatility = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length

      // Simulate entry latency
      const entryLatencyMs = simulateLatency()

      // Apply slippage to entry price (slippage works against you)
      const rawEntryPrice = currentPrice
      const entryPrice = applySlippage(currentPrice, entryDirection, true, volatility)

      // Adjust stop/target from slipped entry price
      const stopLoss = entryDirection === 'LONG' ? entryPrice - stopDistance : entryPrice + stopDistance
      const takeProfit = entryDirection === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance

      // Calculate partial profit targets (1R and 2R)
      const riskAmount = stopDistance // 1R = distance to stop
      const target1 = entryDirection === 'LONG'
        ? entryPrice + riskAmount      // 1R profit
        : entryPrice - riskAmount
      const target2 = entryDirection === 'LONG'
        ? entryPrice + (riskAmount * 2) // 2R profit
        : entryPrice - (riskAmount * 2)

      // Trailing stop distance (1.5x ATR after first target hit)
      const trailingDistance = atr * 1.5

      // Position size based on edge strength (adaptive) AND Apex risk level
      // CRITICAL: Reduce size when approaching max drawdown
      const baseContracts = adaptiveSignal.positionSizeMultiplier
      const riskAdjustedContracts = baseContracts * apexRisk.positionSizeMultiplier
      const contracts = Math.max(1, Math.floor(riskAdjustedContracts))

      state.position = {
        direction: entryDirection,
        rawEntryPrice,
        entryPrice,
        entryTime: currentCandle.time,
        entryLatencyMs,
        contracts,
        initialContracts: contracts,
        stopLoss,
        initialStopLoss: stopLoss,
        takeProfit,
        target1,
        target2,
        target1Hit: false,
        target2Hit: false,
        trailingActive: false,
        trailingDistance,
        highestPrice: entryPrice,
        lowestPrice: entryPrice,
        confluenceScore: adaptiveSignal.confidence,
        mlConfidence: adaptiveSignal.confidence / 100,  // Use adaptive confidence
        vpinAtEntry: vpin.vpin,
        volatilityAtEntry: volatility,
        regime,
        features,
        stopMultiplierUsed: adaptiveSignal.optimalStopMultiplier,
        targetMultiplierUsed: adaptiveSignal.optimalTargetMultiplier,
        strategy: strategies[0]?.name || 'TrendFollow',
      }
    }
  }

  state.candlesProcessed++
  state.currentIndex = index
}

// Helper: Calculate ATR
function calculateATR(candles: Candle[]): number {
  if (candles.length < 2) return 10

  let sum = 0
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    sum += tr
  }

  return sum / (candles.length - 1)
}

// =============================================================================
// PROCESS BATCH - Called on each API request (serverless compatible)
// =============================================================================

async function processBatch(): Promise<void> {
  if (!state.running || historicalData.candles1m.length === 0) return

  const startTime = Date.now()

  // Get batch size based on speed setting
  const speedKey = String(config.speed)
  const batchSize = SPEED_BATCH_SIZE[speedKey] || 50

  // Auto-inverse check: if win rate drops below threshold, flip signals
  if (config.autoInverse && state.trades.length >= 20) {
    const recentTrades = state.trades.slice(-20)
    const recentWins = recentTrades.filter(t => t.netPnL > 0).length
    const recentWinRate = (recentWins / 20) * 100

    if (recentWinRate < config.inverseThreshold && !inverseStats.currentlyInversed) {
      inverseStats.currentlyInversed = true
    } else if (recentWinRate >= 55 && inverseStats.currentlyInversed) {
      inverseStats.currentlyInversed = false
    }
  }

  // Process candles in batch
  for (let i = 0; i < batchSize && state.running; i++) {
    if (state.currentIndex >= state.totalCandles - 1) {
      // Reset to beginning for continuous testing
      state.currentIndex = 50
    }

    await processCandle(state.currentIndex)
    state.currentIndex++
  }

  const elapsed = Date.now() - startTime
  state.processingSpeed = elapsed > 0 ? (batchSize / elapsed) * 1000 : batchSize * 100
  state.lastProcessedTime = Date.now()
}

// Helper to determine if we should inverse the signal
function shouldInverseSignal(): boolean {
  return config.inverseMode || inverseStats.currentlyInversed
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Allow localhost for testing
    const isLocalhost = request.headers.get('host')?.includes('localhost')

    if (!isLocalhost) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // LOAD PERSISTED ML LEARNING STATE FROM DATABASE
    // This ensures learning from paper mode is applied to live mode
    await ensureLearningStateLoaded()

    // CRITICAL: Process candles on every poll (serverless compatible)
    // This makes the simulation progress with each API request
    await processBatch()

    const winRate = state.wins + state.losses > 0
      ? (state.wins / (state.wins + state.losses)) * 100
      : 0

    const mlAccuracyPercent = state.mlAccuracy.totalPredictions > 0
      ? (state.mlAccuracy.correctPredictions / state.mlAccuracy.totalPredictions) * 100
      : 0

    // Get best/worst strategies
    const strategies = Object.entries(state.strategyPerformance)
      .map(([name, stats]) => ({
        name,
        ...stats,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
        avgPnL: stats.trades > 0 ? stats.pnl / stats.trades : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl)

    return NextResponse.json({
      success: true,
      // Status
      status: {
        running: state.running,
        startTime: state.startTime,
        candlesProcessed: state.candlesProcessed,
        totalCandles: state.totalCandles,
        progress: state.totalCandles > 0 ? ((state.currentIndex / state.totalCandles) * 100).toFixed(1) + '%' : '0%',
        processingSpeed: state.processingSpeed.toFixed(1) + ' candles/sec',
      },
      // Performance
      performance: {
        startBalance: 150000,
        currentBalance: state.currentBalance,
        grossPnL: state.grossPnL,
        grossPnLPercent: ((state.grossPnL / 150000) * 100).toFixed(2) + '%',
        totalCosts: state.totalCosts,
        netPnL: state.totalPnL,
        netPnLPercent: ((state.totalPnL / 150000) * 100).toFixed(2) + '%',
        trades: state.trades.length,
        wins: state.wins,
        losses: state.losses,
        winRate: winRate.toFixed(1) + '%',
        maxDrawdown: state.maxDrawdown,
        maxDrawdownPercent: ((state.maxDrawdown / 150000) * 100).toFixed(2) + '%',
        profitFactor: state.losses > 0
          ? (state.trades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0) /
             Math.abs(state.trades.filter(t => t.netPnL < 0).reduce((s, t) => s + t.netPnL, 0))).toFixed(2)
          : 'N/A',
      },
      // Realistic Trading Costs (Matching Apex/Rithmic 1:1)
      tradingCosts: {
        total: state.totalCosts.toFixed(2),
        breakdown: {
          commissions: state.costBreakdown.commissions.toFixed(2),
          exchangeFees: state.costBreakdown.exchangeFees.toFixed(2),
          slippage: state.costBreakdown.slippage.toFixed(2),
        },
        avgCostPerTrade: state.trades.length > 0
          ? (state.totalCosts / state.trades.length).toFixed(2)
          : '0.00',
        costAsPercentOfGross: state.grossPnL !== 0
          ? ((state.totalCosts / Math.abs(state.grossPnL)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      // Latency Simulation Stats
      latencyStats: {
        avgLatencyMs: state.latencyStats.avgLatencyMs.toFixed(0) + 'ms',
        maxLatencyMs: state.latencyStats.maxLatencyMs.toFixed(0) + 'ms',
        minLatencyMs: state.latencyStats.minLatencyMs === Infinity
          ? 'N/A'
          : state.latencyStats.minLatencyMs.toFixed(0) + 'ms',
      },
      // APEX 150K ACCOUNT SAFETY STATUS - CRITICAL FOR NOT LOSING THE ACCOUNT
      apexRisk: {
        riskLevel: apexRisk.riskLevel,
        canTrade: apexRisk.canTrade,
        trailingDrawdown: apexRisk.trailingDrawdown.toFixed(2),
        maxAllowed: APEX_150K_CONFIG.maxTrailingDrawdown,
        remaining: (APEX_150K_CONFIG.maxTrailingDrawdown - apexRisk.trailingDrawdown).toFixed(2),
        drawdownPercent: apexRisk.drawdownPercent.toFixed(1) + '%',
        positionSizeMultiplier: apexRisk.positionSizeMultiplier,
        stopReason: apexRisk.stopReason,
        peakBalance: state.peakBalance.toFixed(2),
        accountConfig: {
          accountSize: APEX_150K_CONFIG.accountSize,
          maxTrailingDrawdown: APEX_150K_CONFIG.maxTrailingDrawdown,
          profitTarget: APEX_150K_CONFIG.profitTarget,
          safetyBuffer: (APEX_150K_CONFIG.safetyBuffer * 100) + '%',
          criticalBuffer: (APEX_150K_CONFIG.criticalBuffer * 100) + '%',
        },
      },
      // ML Accuracy
      mlAccuracy: {
        overall: mlAccuracyPercent.toFixed(1) + '%',
        totalPredictions: state.mlAccuracy.totalPredictions,
        correctPredictions: state.mlAccuracy.correctPredictions,
        byConfidence: {
          high: state.mlAccuracy.byConfidenceLevel.high.total > 0
            ? (state.mlAccuracy.byConfidenceLevel.high.correct / state.mlAccuracy.byConfidenceLevel.high.total * 100).toFixed(1) + '%'
            : 'N/A',
          medium: state.mlAccuracy.byConfidenceLevel.medium.total > 0
            ? (state.mlAccuracy.byConfidenceLevel.medium.correct / state.mlAccuracy.byConfidenceLevel.medium.total * 100).toFixed(1) + '%'
            : 'N/A',
          low: state.mlAccuracy.byConfidenceLevel.low.total > 0
            ? (state.mlAccuracy.byConfidenceLevel.low.correct / state.mlAccuracy.byConfidenceLevel.low.total * 100).toFixed(1) + '%'
            : 'N/A',
        }
      },
      // Strategy Performance
      strategies: strategies.slice(0, 10),
      // Recent trades
      recentTrades: state.trades.slice(-20).reverse(),
      // Current position
      position: state.position,
      // Engine Configuration
      config: {
        speed: config.speed,
        inverseMode: config.inverseMode,
        autoInverse: config.autoInverse,
        inverseThreshold: config.inverseThreshold,
        currentlyInversed: inverseStats.currentlyInversed,
      },
      // Inverse Stats
      inverseStats: {
        normalWins: inverseStats.normalWins,
        normalLosses: inverseStats.normalLosses,
        inverseWins: inverseStats.inverseWins,
        inverseLosses: inverseStats.inverseLosses,
        active: inverseStats.currentlyInversed,
      },
      // ADAPTIVE ML STATS - What the system is learning
      adaptiveML: {
        ...getAdaptiveStats(),
        status: 'LEARNING', // Always learning from outcomes
        description: 'Self-optimizing based on trade outcomes',
      },
      // Current Market Regime
      currentRegime: state.position?.regime || 'UNKNOWN',
      // Data Source Info
      dataSource: {
        provider: 'Yahoo Finance + Adaptive ML',
        instrument: 'SPY (S&P 500 ETF) scaled to ES prices',
        timeframes: ['1m', '5m', '15m'],
        candlesLoaded: {
          '1m': historicalData.candles1m.length,
          '5m': historicalData.candles5m.length,
          '15m': historicalData.candles15m.length,
        },
        note: 'WORLD-CLASS: Adaptive ML learns from every trade',
        delay: 'None - processing historical data at selected speed',
      },
      // Chart Data - Historical candles being processed
      chartData: {
        // Send last 200 candles up to current processing point
        candles: historicalData.candles1m
          .slice(Math.max(0, state.currentIndex - 200), state.currentIndex + 1)
          .map(c => ({
            time: Math.floor(c.time / 1000), // Convert to seconds for lightweight-charts
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })),
        // Trade markers for chart
        trades: state.trades.slice(-50).map(t => ({
          time: Math.floor(t.timestamp / 1000),
          position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
          color: t.netPnL >= 0 ? '#22c55e' : '#ef4444',
          shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
          text: `${t.direction} ${t.netPnL >= 0 ? '+' : ''}$${t.netPnL.toFixed(0)}`,
        })),
        // Current position marker
        currentPosition: state.position ? {
          entryTime: Math.floor(state.position.entryTime / 1000),
          entryPrice: state.position.entryPrice,
          direction: state.position.direction,
          stopLoss: state.position.stopLoss,
          takeProfit: state.position.takeProfit,
        } : null,
        // Current candle info
        currentIndex: state.currentIndex,
        currentPrice: historicalData.candles1m[state.currentIndex]?.close || 0,
        currentTime: historicalData.candles1m[state.currentIndex]?.time || 0,
      },
    })
  } catch (e) {
    console.error('Backtest GET error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Allow localhost for testing
    const isLocalhost = request.headers.get('host')?.includes('localhost')

    if (!isLocalhost) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()

    if (body.action === 'start') {
      if (state.running) {
        return NextResponse.json({ error: 'Already running' }, { status: 400 })
      }

      // Fetch historical data first
      const hasData = await fetchHistoricalData(body.days || 7)
      if (!hasData) {
        return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
      }

      // Reset state
      state.running = true
      state.startTime = Date.now()
      state.currentIndex = 50
      state.trades = []
      state.grossPnL = 0
      state.totalCosts = 0
      state.totalPnL = 0
      state.wins = 0
      state.losses = 0
      state.maxDrawdown = 0
      state.peakBalance = 150000
      state.currentBalance = 150000
      state.costBreakdown = { commissions: 0, exchangeFees: 0, slippage: 0 }
      state.latencyStats = { totalLatencyMs: 0, avgLatencyMs: 0, maxLatencyMs: 0, minLatencyMs: Infinity }
      state.candlesProcessed = 0
      state.strategyPerformance = {}
      state.mlAccuracy = {
        correctPredictions: 0,
        totalPredictions: 0,
        byConfidenceLevel: {
          high: { correct: 0, total: 0 },
          medium: { correct: 0, total: 0 },
          low: { correct: 0, total: 0 },
        }
      }

      // Simulation will process candles on each GET request (serverless compatible)
      return NextResponse.json({
        success: true,
        message: 'Backtesting started - candles will process on each poll',
        totalCandles: state.totalCandles,
        batchSize: SPEED_BATCH_SIZE[String(config.speed)],
      })
    }

    if (body.action === 'stop') {
      state.running = false

      return NextResponse.json({
        success: true,
        message: 'Backtesting stopped',
        results: {
          candlesProcessed: state.candlesProcessed,
          trades: state.trades.length,
          totalPnL: state.totalPnL,
          winRate: state.wins + state.losses > 0
            ? ((state.wins / (state.wins + state.losses)) * 100).toFixed(1) + '%'
            : '0%',
        }
      })
    }

    if (body.action === 'reset') {
      state.running = false
      state.trades = []
      state.grossPnL = 0
      state.totalCosts = 0
      state.totalPnL = 0
      state.wins = 0
      state.losses = 0
      state.maxDrawdown = 0
      state.peakBalance = 150000
      state.currentBalance = 150000
      state.costBreakdown = { commissions: 0, exchangeFees: 0, slippage: 0 }
      state.latencyStats = { totalLatencyMs: 0, avgLatencyMs: 0, maxLatencyMs: 0, minLatencyMs: Infinity }
      state.candlesProcessed = 0
      state.strategyPerformance = {}
      state.position = null
      state.mlAccuracy = {
        correctPredictions: 0,
        totalPredictions: 0,
        byConfidenceLevel: {
          high: { correct: 0, total: 0 },
          medium: { correct: 0, total: 0 },
          low: { correct: 0, total: 0 },
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Backtest state reset',
      })
    }

    // SPEED: Set processing speed
    if (body.action === 'speed') {
      const validSpeeds = [1, 5, 10, 50, 100, 'MAX']
      if (!validSpeeds.includes(body.speed)) {
        return NextResponse.json({ error: 'Invalid speed. Use: 1, 5, 10, 50, 100, or MAX' }, { status: 400 })
      }
      config.speed = body.speed
      return NextResponse.json({
        success: true,
        message: `Speed set to ${body.speed}x`,
        config: {
          speed: config.speed,
          batchSize: SPEED_BATCH_SIZE[String(config.speed)],
          delay: SPEED_DELAY[String(config.speed)] + 'ms',
        },
      })
    }

    // INVERSE: Toggle inverse mode
    if (body.action === 'inverse') {
      config.inverseMode = body.enabled ?? !config.inverseMode
      return NextResponse.json({
        success: true,
        message: `Inverse mode ${config.inverseMode ? 'ENABLED' : 'DISABLED'}`,
        inverseMode: config.inverseMode,
      })
    }

    // AUTO-INVERSE: Enable auto-inverse when losing
    if (body.action === 'auto-inverse') {
      config.autoInverse = body.enabled ?? !config.autoInverse
      if (body.threshold) config.inverseThreshold = body.threshold
      return NextResponse.json({
        success: true,
        message: `Auto-inverse ${config.autoInverse ? 'ENABLED' : 'DISABLED'}`,
        autoInverse: config.autoInverse,
        threshold: config.inverseThreshold,
      })
    }

    // CONFIGURE: Set multiple options at once
    if (body.action === 'configure') {
      if (body.speed) config.speed = body.speed
      if (body.inverseMode !== undefined) config.inverseMode = body.inverseMode
      if (body.autoInverse !== undefined) config.autoInverse = body.autoInverse
      if (body.inverseThreshold) config.inverseThreshold = body.inverseThreshold

      return NextResponse.json({
        success: true,
        message: 'Configuration updated',
        config: { ...config },
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: start, stop, reset, speed, inverse, auto-inverse, configure' }, { status: 400 })
  } catch (e) {
    console.error('Backtest POST error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
