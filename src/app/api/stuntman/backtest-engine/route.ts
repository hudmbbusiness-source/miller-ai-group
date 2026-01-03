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
  Candle,
} from '@/lib/stuntman/signal-engine'
import {
  VPINCalculator,
  DeltaAnalyzer,
} from '@/lib/stuntman/order-flow-analysis'
import { Trade as OrderFlowTrade } from '@/lib/stuntman/types'
import {
  generateAdaptiveSignal,
  extractFeatures,
  detectMarketRegime as detectAdaptiveRegime,
  recordTradeOutcome,
  getAdaptiveStats,
  ensureLearningStateLoaded,
  saveLearningStateToDB,
  MarketRegime as AdaptiveMarketRegime,
  PatternFeatures,
  TradeOutcome,
} from '@/lib/stuntman/adaptive-ml'
import {
  checkApexRiskStatus,
  DEFAULT_APEX_SAFETY,
  ApexRiskStatus,
} from '@/lib/stuntman/risk-analytics'
// === NEW PRODUCTION-GRADE STRATEGY ENGINE ===
import {
  calculateIndicators,
  detectMarketRegime,
  generateMasterSignal,
  generateVWAPSignal,
  generateORBSignal,
  generateEMATrendSignal,
  getCurrentSession,
  isRTH,
  Indicators,
  MasterSignal,
  MarketRegime,
  TradingSession,
  DEFAULT_VWAP_CONFIG,
  DEFAULT_ORB_CONFIG,
  DEFAULT_EMA_CONFIG,
} from '@/lib/stuntman/strategy-engine'

// === INSTITUTIONAL-GRADE ADVANCED STRATEGIES ===
import {
  analyzeMarket,
  generateAdvancedMasterSignal,
  AdvancedAnalysis,
  AdvancedSignal,
} from '@/lib/stuntman/advanced-strategies'

// =============================================================================
// APEX 150K ACCOUNT CONFIGURATION - CRITICAL SAFETY LIMITS
// =============================================================================

const APEX_150K_CONFIG = {
  accountSize: 150000,           // $150,000 account
  maxTrailingDrawdown: 5000,     // $5,000 max trailing drawdown (CORRECT - per Apex rules)
  profitTarget: 9000,            // $9,000 profit target to pass
  minTradingDays: 7,             // Minimum 7 trading days required
  maxContracts: 17,              // Maximum 17 contracts for 150K account

  // SAFETY BUFFERS - Stop BEFORE hitting limits
  safetyBuffer: 0.80,            // Stop at 80% of max drawdown ($4,000)
  criticalBuffer: 0.90,          // EMERGENCY STOP at 90% ($4,500)
  dailyLossLimit: 0.25,          // Max 25% of remaining drawdown per day

  // Position sizing based on drawdown
  positionSizing: {
    safe: 1.0,       // 0-40% drawdown: full size
    caution: 0.75,   // 40-60% drawdown: 75% size
    warning: 0.50,   // 60-80% drawdown: 50% size
    danger: 0.25,    // 80-90% drawdown: 25% size
    stop: 0,         // 90%+ drawdown: NO TRADING
  },

  // APEX TIMING RULES
  mandatoryCloseTime: 1659,      // 4:59 PM ET - MUST close all positions
  noNewTradesAfter: 1630,        // 4:30 PM ET - No new trades after this (29 min buffer)

  // TRAILING THRESHOLD BEHAVIOR (Rithmic accounts)
  // Once profit target ($9,000) is reached, trailing threshold STOPS trailing
  trailingStopsAtTarget: true,
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
// BRUTALLY REALISTIC EXECUTION SIMULATION (1:1 with Live Trading)
// =============================================================================

interface SlippageFactors {
  volumeFactor: number
  volatilityFactor: number
  sizeFactor: number
  timeFactor: number
}

interface ExecutionResult {
  executed: boolean
  executionPrice: number
  bidPrice: number
  askPrice: number
  spread: number
  slippage: number
  slippageTicks: number
  contractsFilled: number
  rejected: boolean
  rejectionReason: string
  factors: SlippageFactors
}

// Calculate bid/ask spread based on time of day and volatility
function calculateSpread(candle: Candle, timeOfDay: 'RTH_OPEN' | 'RTH_MID' | 'RTH_CLOSE' | 'PRE' | 'POST'): number {
  let spreadTicks = 1  // Base: 1 tick = $12.50

  switch (timeOfDay) {
    case 'RTH_OPEN': spreadTicks *= 1.5; break   // Wider at open
    case 'RTH_MID': spreadTicks *= 1.0; break    // Tightest mid-day
    case 'RTH_CLOSE': spreadTicks *= 1.25; break // Slightly wider at close
    case 'PRE': spreadTicks *= 2.5; break        // Much wider pre-market
    case 'POST': spreadTicks *= 2.0; break       // Wider post-market
  }

  // Volatility adjustment
  const candleRange = (candle.high - candle.low) / candle.close
  if (candleRange > 0.005) spreadTicks *= 1.5
  if (candleRange > 0.01) spreadTicks *= 2.0

  spreadTicks *= (0.8 + Math.random() * 0.4)  // ±20% variation
  return spreadTicks * TRADING_COSTS.tickSize
}

function getTimeOfDay(timestamp: number): 'RTH_OPEN' | 'RTH_MID' | 'RTH_CLOSE' | 'PRE' | 'POST' {
  const date = new Date(timestamp)
  const estHour = date.getUTCHours() - 5
  const estMinute = date.getUTCMinutes()
  const time = estHour + estMinute / 60

  if (time >= 9.5 && time < 10) return 'RTH_OPEN'
  if (time >= 10 && time < 15.5) return 'RTH_MID'
  if (time >= 15.5 && time < 16) return 'RTH_CLOSE'
  if (time >= 6 && time < 9.5) return 'PRE'
  return 'POST'
}

// Volume-based slippage calculation
function calculateDynamicSlippage(
  candle: Candle,
  recentCandles: Candle[],
  contracts: number,
): { slippageTicks: number; factors: SlippageFactors } {
  const avgVolume = recentCandles.slice(-20).reduce((s, c) => s + c.volume, 0) / Math.max(1, recentCandles.slice(-20).length)
  const volumeRatio = avgVolume > 0 ? candle.volume / avgVolume : 1

  let volumeFactor = 1.0
  if (volumeRatio < 0.3) volumeFactor = 2.5
  else if (volumeRatio < 0.5) volumeFactor = 1.8
  else if (volumeRatio < 0.8) volumeFactor = 1.3
  else if (volumeRatio > 2.0) volumeFactor = 0.8

  const candleRange = (candle.high - candle.low) / candle.close
  const avgRange = recentCandles.slice(-20).reduce((s, c) => s + (c.high - c.low) / c.close, 0) / Math.max(1, recentCandles.slice(-20).length)
  const volatilityRatio = avgRange > 0 ? candleRange / avgRange : 1

  let volatilityFactor = 1.0
  if (volatilityRatio > 3.0) volatilityFactor = 3.0
  else if (volatilityRatio > 2.0) volatilityFactor = 2.0
  else if (volatilityRatio > 1.5) volatilityFactor = 1.5
  else if (volatilityRatio < 0.5) volatilityFactor = 0.8

  let sizeFactor = 1.0
  if (contracts >= 10) sizeFactor = 2.0
  else if (contracts >= 5) sizeFactor = 1.5
  else if (contracts >= 3) sizeFactor = 1.2

  const timeOfDay = getTimeOfDay(candle.time)
  let timeFactor = 1.0
  switch (timeOfDay) {
    case 'RTH_OPEN': timeFactor = 1.8; break
    case 'RTH_CLOSE': timeFactor = 1.4; break
    case 'PRE': timeFactor = 2.5; break
    case 'POST': timeFactor = 2.0; break
    default: timeFactor = 1.0
  }

  const baseSlippageTicks = 0.5
  const totalSlippageTicks = baseSlippageTicks * volumeFactor * volatilityFactor * sizeFactor * timeFactor
  const randomFactor = 0.7 + Math.random() * 0.6
  const cappedSlippage = Math.min(totalSlippageTicks * randomFactor, 10)

  return { slippageTicks: cappedSlippage, factors: { volumeFactor, volatilityFactor, sizeFactor, timeFactor } }
}

// Order rejection simulation
function simulateOrderRejection(candle: Candle, recentCandles: Candle[], contracts: number): { rejected: boolean; reason: string } {
  const candleRange = (candle.high - candle.low) / candle.close
  const avgRange = recentCandles.slice(-20).reduce((s, c) => s + (c.high - c.low) / c.close, 0) / Math.max(1, recentCandles.slice(-20).length)
  const volatilityRatio = avgRange > 0 ? candleRange / avgRange : 1

  let rejectionProbability = 0.02
  if (volatilityRatio > 3.0) rejectionProbability = 0.15
  else if (volatilityRatio > 2.0) rejectionProbability = 0.08
  else if (volatilityRatio > 1.5) rejectionProbability = 0.04

  if (contracts > 10) rejectionProbability *= 1.5
  if (contracts > 20) rejectionProbability *= 2.0

  const timeOfDay = getTimeOfDay(candle.time)
  if (timeOfDay === 'RTH_OPEN') rejectionProbability *= 1.5
  if (timeOfDay === 'PRE' || timeOfDay === 'POST') rejectionProbability *= 2.0

  if (Math.random() < rejectionProbability) {
    const reasons = ['Price moved too fast', 'Insufficient liquidity', 'Market moving', 'Exchange latency']
    return { rejected: true, reason: reasons[Math.floor(Math.random() * reasons.length)] }
  }
  return { rejected: false, reason: '' }
}

// Partial fill simulation
function simulateOrderFill(candle: Candle, recentCandles: Candle[], contracts: number): { fillPercentage: number; contractsFilled: number } {
  const avgVolume = recentCandles.slice(-20).reduce((s, c) => s + c.volume, 0) / Math.max(1, recentCandles.slice(-20).length)
  const volumeRatio = avgVolume > 0 ? candle.volume / avgVolume : 1

  let fillPercentage = 100
  if (volumeRatio < 0.3 && contracts > 3) fillPercentage = 60 + Math.random() * 30
  else if (volumeRatio < 0.5 && contracts > 5) fillPercentage = 75 + Math.random() * 20
  else if (contracts > 10) fillPercentage = 85 + Math.random() * 15

  return { fillPercentage, contractsFilled: Math.max(1, Math.floor(contracts * fillPercentage / 100)) }
}

// Gap/flash crash check
function checkForGap(currentCandle: Candle, previousCandle: Candle | null, position: { direction: 'LONG' | 'SHORT'; stopLoss: number } | null): { stoppedOut: boolean; gapExitPrice: number; gapSlippage: number } {
  if (!previousCandle || !position) return { stoppedOut: false, gapExitPrice: 0, gapSlippage: 0 }

  const gap = currentCandle.open - previousCandle.close
  const gapPoints = Math.abs(gap)

  if (gapPoints <= 2) return { stoppedOut: false, gapExitPrice: 0, gapSlippage: 0 }

  if (position.direction === 'LONG' && gap < 0 && currentCandle.open < position.stopLoss) {
    return { stoppedOut: true, gapExitPrice: currentCandle.open, gapSlippage: Math.abs(currentCandle.open - position.stopLoss) }
  }
  if (position.direction === 'SHORT' && gap > 0 && currentCandle.open > position.stopLoss) {
    return { stoppedOut: true, gapExitPrice: currentCandle.open, gapSlippage: Math.abs(currentCandle.open - position.stopLoss) }
  }

  return { stoppedOut: false, gapExitPrice: 0, gapSlippage: 0 }
}

// Full execution price calculation
function calculateExecutionPrice(candle: Candle, recentCandles: Candle[], direction: 'LONG' | 'SHORT', isEntry: boolean, contracts: number): ExecutionResult {
  const timeOfDay = getTimeOfDay(candle.time)
  const spreadPoints = calculateSpread(candle, timeOfDay)
  const midPrice = candle.close
  const bidPrice = midPrice - spreadPoints / 2
  const askPrice = midPrice + spreadPoints / 2

  const rejection = simulateOrderRejection(candle, recentCandles, contracts)
  if (rejection.rejected) {
    return {
      executed: false, executionPrice: 0, bidPrice, askPrice, spread: spreadPoints,
      slippage: 0, slippageTicks: 0, contractsFilled: 0, rejected: true,
      rejectionReason: rejection.reason, factors: { volumeFactor: 0, volatilityFactor: 0, sizeFactor: 0, timeFactor: 0 }
    }
  }

  const fill = simulateOrderFill(candle, recentCandles, contracts)
  const { slippageTicks, factors } = calculateDynamicSlippage(candle, recentCandles, fill.contractsFilled)
  const slippagePoints = slippageTicks * TRADING_COSTS.tickSize

  let executionPrice: number
  if (isEntry) {
    executionPrice = direction === 'LONG' ? askPrice + slippagePoints : bidPrice - slippagePoints
  } else {
    executionPrice = direction === 'LONG' ? bidPrice - slippagePoints : askPrice + slippagePoints
  }

  return {
    executed: true, executionPrice, bidPrice, askPrice, spread: spreadPoints,
    slippage: slippagePoints, slippageTicks, contractsFilled: fill.contractsFilled,
    rejected: false, rejectionReason: '', factors
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
  // ENTRY ANALYTICS - For analyzing what works
  entryAnalytics: {
    strategy: string           // Which strategy triggered entry
    rsiAtEntry: number         // RSI value at entry
    ema20Distance: number      // % distance from EMA20
    ema50Distance: number      // % distance from EMA50
    regime: string             // Market regime at entry
    hourOfDay: number          // Hour (0-23) EST
    atrAtEntry: number         // Volatility at entry
    trendStrength: number      // How strong was the trend
  }
}

// ENTRY ANALYTICS TRACKING - Aggregate stats for analysis
interface EntryAnalytics {
  byStrategy: Record<string, { wins: number; losses: number; totalPnL: number; avgPnL: number }>
  byRsiBucket: Record<string, { wins: number; losses: number; totalPnL: number }>
  byRegime: Record<string, { wins: number; losses: number; totalPnL: number }>
  byHour: Record<number, { wins: number; losses: number; totalPnL: number }>
  byConfidenceBucket: Record<string, { wins: number; losses: number; totalPnL: number }>
  byTrendStrength: Record<string, { wins: number; losses: number; totalPnL: number }>
}

let entryAnalytics: EntryAnalytics = {
  byStrategy: {},
  byRsiBucket: {},
  byRegime: {},
  byHour: {},
  byConfidenceBucket: {},
  byTrendStrength: {},
}

function resetEntryAnalytics(): void {
  entryAnalytics = {
    byStrategy: {},
    byRsiBucket: {},
    byRegime: {},
    byHour: {},
    byConfidenceBucket: {},
    byTrendStrength: {},
  }
}

function recordEntryAnalytics(trade: BacktestTrade): void {
  const isWin = trade.netPnL > 0
  const analytics = trade.entryAnalytics

  // By Strategy
  if (!entryAnalytics.byStrategy[analytics.strategy]) {
    entryAnalytics.byStrategy[analytics.strategy] = { wins: 0, losses: 0, totalPnL: 0, avgPnL: 0 }
  }
  const strat = entryAnalytics.byStrategy[analytics.strategy]
  if (isWin) strat.wins++
  else strat.losses++
  strat.totalPnL += trade.netPnL
  strat.avgPnL = strat.totalPnL / (strat.wins + strat.losses)

  // By RSI Bucket (0-30, 30-40, 40-50, 50-60, 60-70, 70-100)
  const rsiBucket = analytics.rsiAtEntry < 30 ? '0-30' :
                    analytics.rsiAtEntry < 40 ? '30-40' :
                    analytics.rsiAtEntry < 50 ? '40-50' :
                    analytics.rsiAtEntry < 60 ? '50-60' :
                    analytics.rsiAtEntry < 70 ? '60-70' : '70-100'
  if (!entryAnalytics.byRsiBucket[rsiBucket]) {
    entryAnalytics.byRsiBucket[rsiBucket] = { wins: 0, losses: 0, totalPnL: 0 }
  }
  if (isWin) entryAnalytics.byRsiBucket[rsiBucket].wins++
  else entryAnalytics.byRsiBucket[rsiBucket].losses++
  entryAnalytics.byRsiBucket[rsiBucket].totalPnL += trade.netPnL

  // By Regime
  if (!entryAnalytics.byRegime[analytics.regime]) {
    entryAnalytics.byRegime[analytics.regime] = { wins: 0, losses: 0, totalPnL: 0 }
  }
  if (isWin) entryAnalytics.byRegime[analytics.regime].wins++
  else entryAnalytics.byRegime[analytics.regime].losses++
  entryAnalytics.byRegime[analytics.regime].totalPnL += trade.netPnL

  // By Hour
  if (!entryAnalytics.byHour[analytics.hourOfDay]) {
    entryAnalytics.byHour[analytics.hourOfDay] = { wins: 0, losses: 0, totalPnL: 0 }
  }
  if (isWin) entryAnalytics.byHour[analytics.hourOfDay].wins++
  else entryAnalytics.byHour[analytics.hourOfDay].losses++
  entryAnalytics.byHour[analytics.hourOfDay].totalPnL += trade.netPnL

  // By Confidence Bucket
  const confBucket = trade.confluenceScore < 70 ? '60-70' :
                     trade.confluenceScore < 80 ? '70-80' :
                     trade.confluenceScore < 90 ? '80-90' : '90+'
  if (!entryAnalytics.byConfidenceBucket[confBucket]) {
    entryAnalytics.byConfidenceBucket[confBucket] = { wins: 0, losses: 0, totalPnL: 0 }
  }
  if (isWin) entryAnalytics.byConfidenceBucket[confBucket].wins++
  else entryAnalytics.byConfidenceBucket[confBucket].losses++
  entryAnalytics.byConfidenceBucket[confBucket].totalPnL += trade.netPnL

  // By Trend Strength
  const trendBucket = analytics.trendStrength < 0.5 ? 'weak' :
                      analytics.trendStrength < 1.0 ? 'moderate' : 'strong'
  if (!entryAnalytics.byTrendStrength[trendBucket]) {
    entryAnalytics.byTrendStrength[trendBucket] = { wins: 0, losses: 0, totalPnL: 0 }
  }
  if (isWin) entryAnalytics.byTrendStrength[trendBucket].wins++
  else entryAnalytics.byTrendStrength[trendBucket].losses++
  entryAnalytics.byTrendStrength[trendBucket].totalPnL += trade.netPnL
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
    regime: AdaptiveMarketRegime  // Market regime at entry (for ML learning)
    features: PatternFeatures    // Pattern features at entry
    stopMultiplierUsed: number   // For adaptive learning
    targetMultiplierUsed: number // For adaptive learning
    strategy: string             // Strategy that generated signal
    // Entry analytics for analysis
    entryAnalytics: {
      strategy: string
      rsiAtEntry: number
      ema20Distance: number
      ema50Distance: number
      regime: string
      hourOfDay: number
      atrAtEntry: number
      trendStrength: number
    }
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
  // Cost breakdown (ENHANCED with spread and gaps)
  costBreakdown: {
    commissions: number
    exchangeFees: number
    slippage: number
    spread: number           // Bid/ask spread costs
    gapLosses: number        // Extra losses from gapped stops
  }
  // Latency stats
  latencyStats: {
    totalLatencyMs: number
    avgLatencyMs: number
    maxLatencyMs: number
    minLatencyMs: number
  }
  // EXECUTION QUALITY STATS
  executionStats: {
    totalOrders: number
    rejectedOrders: number
    partialFills: number
    avgFillPercentage: number
    avgSlippageTicks: number
    avgSpreadTicks: number
    gappedStops: number
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
  // Advanced analysis history
  deltaHistory: number[]      // Historical delta values for divergence detection
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
    preMarket: false,      // ❌ Skip - thin liquidity, unpredictable gaps
    openingHour: true,     // ✅ 9:30-10:30 - High volatility, clear trends
    midDay: false,         // ❌ Skip - LUNCH HOUR CHOP kills profits
    afternoonPush: true,   // ✅ 2:00-3:00 - Momentum builds, institutions active
    powerHour: true,       // ✅ 3:00-4:00 - Strong directional moves, best setups
    afterHours: false,     // ❌ Skip - news reactions, wide spreads
    overnight: false,      // ❌ Skip - thin markets, no edge
  }
}

// =============================================================================
// FOCUSED STRATEGY MODE - Use ONLY the proven ORB strategy
// =============================================================================
// The ORB (Opening Range Breakout) strategy has:
// - 74.56% documented win rate (Quantified Strategies)
// - 2.512 profit factor
// - Clear, mechanical rules

const FOCUSED_MODE = {
  enabled: false,              // DISABLED - ORB signals not generating properly
  onlyORBSignals: true,        // Only take ORB breakout trades
  onlyTrendingDays: false,     // Allow all days for now

  // Time window for ORB trades (after range forms, before exhaustion)
  orbTradeWindowStart: 1000,   // 10:00 AM ET (after 30-min range forms)
  orbTradeWindowEnd: 1500,     // 3:00 PM ET (extended window)

  // ORB-specific requirements - LOOSENED
  minORBRangePoints: 1,        // Min 1 point range
  maxORBRangePoints: 50,       // Allow larger ranges
  minBreakoutVolume: 1.0,      // No volume requirement

  // Only trade ONE direction per day (first clear breakout)
  oneDirectionPerDay: false,

  // Maximum trades per day in focused mode
  maxDailyTrades: 4,           // Allow more trades
}

// =============================================================================
// PRODUCTION-READY PROFIT MAXIMIZATION CONFIG
// =============================================================================

const PROFIT_CONFIG = {
  // DAILY LOSS LIMIT - Protect the account at all costs
  dailyMaxLoss: 800,           // Stop trading if down $800 in a day (tighter)
  dailyMaxLossPercent: 0.53,   // Or 0.53% of account

  // MAX RISK PER TRADE - Prevent catastrophic single-trade losses
  maxLossPerTrade: 300,        // Maximum $300 risk per trade (6 points ES with 1 contract)
  maxLossPerTradePoints: 6,    // Max 6 point stop on ES ($300 with 1 contract)

  // LOSING STREAK LIMITER - Stop after consecutive losses
  maxConsecutiveLosses: 2,     // Stop trading after 2 losses in a row (wait for next day)

  // ENTRY REQUIREMENTS - ULTRA SELECTIVE - Only take the ABSOLUTE BEST setups
  minConfluenceScore: 70,      // Need 70+ confluence (was 60 - too low)
  minConfidence: 80,           // Need 80%+ confidence (was 75)
  minRiskReward: 2.5,          // Need 2.5:1 R:R minimum (was 2.0)

  // MTF ALIGNMENT - Trade with the trend ONLY
  requireMTFAlignment: true,   // Higher timeframes must agree

  // TRADE FREQUENCY - STRICT Quality over quantity
  maxTradesPerDay: 5,          // Maximum 5 trades per day (was 8 - too many)
  minTimeBetweenTrades: 20,    // Wait 20 minutes between trades (was 15)

  // MOMENTUM REQUIREMENTS - STRICTER
  requireMomentumConfirm: true,  // RSI and MACD must confirm
  rsiOversoldThreshold: 40,      // Only long when RSI > 40 (was 35)
  rsiOverboughtThreshold: 60,    // Only short when RSI < 60 (was 65)

  // VOLATILITY FILTER
  minATRMultiple: 0.6,          // Skip if ATR too low (no movement)
  maxATRMultiple: 2.5,          // Skip if ATR too high (too risky)

  // TREND STRENGTH - STRICTER
  minTrendStrength: 0.7,        // EMA alignment must be 70%+ (was 60%)

  // STOP LOSS TIGHTENING
  maxStopATRMultiplier: 0.8,   // Even tighter stops: max 0.8 ATR (was 1.0)
}

// Daily P&L tracking
let dailyPnL = 0
let dailyTradeCount = 0
let lastTradeIndex = 0
let currentTradingDay = ''
let consecutiveLosses = 0       // Track losing streak

// =============================================================================
// SESSION DETECTION & FILTERING (Local version for config compatibility)
// =============================================================================

type LocalTradingSession = 'preMarket' | 'openingHour' | 'midDay' | 'afternoonPush' | 'powerHour' | 'afterHours' | 'overnight'

function getLocalSession(timestamp: number): LocalTradingSession {
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

  const session = getLocalSession(timestamp)
  return config.tradeSessions[session]
}

function getSessionInfo(timestamp: number): { session: LocalTradingSession; canTrade: boolean; reason: string } {
  const session = getLocalSession(timestamp)
  const canTrade = !config.sessionFilter || config.tradeSessions[session]

  const sessionNames: Record<LocalTradingSession, string> = {
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
// APEX TIMING RULES - 4:59 PM ET MANDATORY CLOSE
// =============================================================================

function getETTime(timestamp: number): { hour: number; minute: number; etTime: number } {
  const date = new Date(timestamp)
  // Convert to ET (UTC-5, simplified - ignores DST)
  const utcHour = date.getUTCHours()
  const utcMinute = date.getUTCMinutes()
  const etHour = (utcHour - 5 + 24) % 24
  const etTime = etHour * 100 + utcMinute // HHMM format
  return { hour: etHour, minute: utcMinute, etTime }
}

function isNearMandatoryClose(timestamp: number): boolean {
  // Returns true if we're at or past 4:30 PM ET (no new trades)
  const { etTime } = getETTime(timestamp)
  return etTime >= APEX_150K_CONFIG.noNewTradesAfter
}

function mustForceClose(timestamp: number): boolean {
  // Returns true if we're at or past 4:59 PM ET (MUST close all positions)
  const { etTime } = getETTime(timestamp)
  return etTime >= APEX_150K_CONFIG.mandatoryCloseTime
}

function getTimeToClose(timestamp: number): { minutes: number; urgent: boolean; message: string } {
  const { hour, minute } = getETTime(timestamp)
  const closeHour = 16
  const closeMinute = 59

  // Calculate minutes until 4:59 PM
  let currentMinutes = hour * 60 + minute
  let closeMinutes = closeHour * 60 + closeMinute

  // Handle overnight (if current time is before market open)
  if (currentMinutes < 9 * 60 + 30) {
    // Before 9:30 AM - market not open yet
    currentMinutes += 24 * 60
  }

  const minutesRemaining = closeMinutes - currentMinutes

  let message = ''
  let urgent = false

  if (minutesRemaining <= 0) {
    message = 'PAST CLOSE TIME - MUST BE FLAT'
    urgent = true
  } else if (minutesRemaining <= 5) {
    message = `CRITICAL: ${minutesRemaining} min until close - EXIT NOW`
    urgent = true
  } else if (minutesRemaining <= 15) {
    message = `WARNING: ${minutesRemaining} min until close - tighten stops`
    urgent = true
  } else if (minutesRemaining <= 29) {
    message = `CAUTION: ${minutesRemaining} min until close - no new trades`
    urgent = false
  }

  return { minutes: minutesRemaining, urgent, message }
}

// =============================================================================
// PA (PERFORMANCE ACCOUNT) RULES - FOR FUNDED ACCOUNTS
// =============================================================================
// These rules apply AFTER passing the evaluation

const PA_RULES = {
  // CONTRACT SCALING RULE
  // Only use half contracts until EOD balance exceeds trailing threshold + $100
  halfContractsUntilSafe: true,
  safetyNetBuffer: 100,        // Must be trailing threshold + $100 to use full size

  // 30% NEGATIVE P&L RULE (MAE - Maximum Adverse Excursion)
  // Open loss CANNOT exceed 30% of start-of-day profit
  maxMAEPercent: 0.30,

  // 5:1 RISK-REWARD RATIO RULE
  // Must maintain 5:1 ratio in PA (NOT during eval)
  minRiskRewardPA: 5.0,

  // NO HEDGING RULE
  // Cannot hold simultaneous long AND short positions
  allowHedging: false,

  // ONE DIRECTION RULE
  // Cannot switch directions (long to short) in same session
  oneDirectionPerSession: true,
}

// Track PA state
interface PAState {
  isPA: boolean                   // Are we in a Performance Account?
  startOfDayBalance: number       // Balance at start of trading day
  startOfDayProfit: number        // Profit at start of day (relative to trailing threshold)
  maxAllowedLoss: number          // 30% of start-of-day profit
  currentSessionDirection: 'LONG' | 'SHORT' | null  // First trade direction today
  halfContractsActive: boolean    // Are we using half size?
}

let paState: PAState = {
  isPA: false,
  startOfDayBalance: 150000,
  startOfDayProfit: 0,
  maxAllowedLoss: 0,
  currentSessionDirection: null,
  halfContractsActive: false,
}

function resetPAStateForNewDay(currentBalance: number, trailingThreshold: number): void {
  // Called at start of each trading day
  paState.startOfDayBalance = currentBalance
  paState.startOfDayProfit = currentBalance - trailingThreshold

  // 30% MAE Rule: Max loss is 30% of start-of-day profit
  paState.maxAllowedLoss = paState.startOfDayProfit * PA_RULES.maxMAEPercent

  // Contract Scaling: Use half size until balance > threshold + $100
  paState.halfContractsActive = currentBalance < (trailingThreshold + PA_RULES.safetyNetBuffer)

  // Reset session direction
  paState.currentSessionDirection = null
}

function checkPAViolation(
  currentBalance: number,
  openPnL: number,
  proposedDirection: 'LONG' | 'SHORT' | null,
): { violation: boolean; reason: string } {
  if (!paState.isPA) return { violation: false, reason: '' }

  // Check 30% MAE Rule
  if (openPnL < 0 && Math.abs(openPnL) > paState.maxAllowedLoss) {
    return {
      violation: true,
      reason: `30% MAE VIOLATION: Open loss $${Math.abs(openPnL).toFixed(0)} exceeds max allowed $${paState.maxAllowedLoss.toFixed(0)}`
    }
  }

  // Check One Direction Rule
  if (proposedDirection && paState.currentSessionDirection && proposedDirection !== paState.currentSessionDirection) {
    return {
      violation: true,
      reason: `ONE DIRECTION VIOLATION: Already traded ${paState.currentSessionDirection}, cannot switch to ${proposedDirection}`
    }
  }

  return { violation: false, reason: '' }
}

function getPAContractMultiplier(): number {
  if (!paState.isPA) return 1.0

  // Contract Scaling Rule: Use half size if below safety threshold
  if (paState.halfContractsActive) return 0.5

  return 1.0
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
    spread: 0,
    gapLosses: 0,
  },
  latencyStats: {
    totalLatencyMs: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0,
    minLatencyMs: Infinity,
  },
  executionStats: {
    totalOrders: 0,
    rejectedOrders: 0,
    partialFills: 0,
    avgFillPercentage: 100,
    avgSlippageTicks: 0,
    avgSpreadTicks: 0,
    gappedStops: 0,
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
  deltaHistory: [],
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
// FETCH HISTORICAL DATA - RANDOMIZED PERIODS FOR TRUE ML LEARNING
// =============================================================================
//
// CRITICAL: Each paper trading run uses a DIFFERENT historical period
// This prevents overfitting to a single market condition and ensures
// the ML actually learns to trade various market regimes:
// - Bull markets, bear markets, sideways
// - High volatility, low volatility
// - Different times of year (earnings, FOMC, etc.)
//
// =============================================================================

// Data sources in priority order
const DATA_SOURCES = {
  // SPY has 2 years of intraday data available
  SPY: 'SPY',
}

// Track which periods we've trained on for diversity
interface TrainingPeriod {
  startDate: string
  endDate: string
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE'
  trainedCount: number
}

let trainingHistory: TrainingPeriod[] = []

// Generate a random historical period
function getRandomHistoricalPeriod(): { startTime: number; endTime: number; periodLabel: string } {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  // Yahoo Finance limits for intraday data:
  // - 1m: last 7 days only
  // - 5m/15m: last 60 days
  // - 1h: last 730 days (2 years)
  //
  // We'll use 5m data and pick random 7-day windows from the last 60 days
  // This gives us ~8 different possible training periods

  const maxLookback = 55 * oneDay  // 55 days back (leaving buffer)
  const windowSize = 7 * oneDay     // 7 days of data per run

  // Pick a random start point
  const randomOffset = Math.floor(Math.random() * (maxLookback - windowSize))
  const endTime = now - randomOffset
  const startTime = endTime - windowSize

  // Create human-readable label
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return {
    startTime: Math.floor(startTime / 1000),
    endTime: Math.floor(endTime / 1000),
    periodLabel,
  }
}

// Detect market regime from candles (for logging/tracking)
function detectPeriodRegime(candles: Candle[]): 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE' {
  if (candles.length < 50) return 'SIDEWAYS'

  const first = candles[0].close
  const last = candles[candles.length - 1].close
  const change = (last - first) / first * 100

  // Calculate volatility
  let totalRange = 0
  for (const c of candles) {
    totalRange += (c.high - c.low) / c.close
  }
  const avgRange = totalRange / candles.length * 100

  if (avgRange > 0.5) return 'VOLATILE'  // High volatility
  if (change > 3) return 'BULL'           // Up more than 3%
  if (change < -3) return 'BEAR'          // Down more than 3%
  return 'SIDEWAYS'
}

async function fetchHistoricalData(days: number = 7): Promise<boolean> {
  try {
    // GET A RANDOM HISTORICAL PERIOD - Different each run!
    const { startTime, endTime, periodLabel } = getRandomHistoricalPeriod()

    console.log(`[BACKTEST] ========================================`)
    console.log(`[BACKTEST] RANDOMIZED TRAINING PERIOD: ${periodLabel}`)
    console.log(`[BACKTEST] ========================================`)
    console.log(`[BACKTEST] This ensures ML learns DIFFERENT market conditions each run`)

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }

    // Use SPY - has reliable intraday data going back 60 days
    // Scale to ES prices (SPY ~$590 → ES ~$5900)
    const symbol = DATA_SOURCES.SPY
    const scale = 10
    const dataLabel = `SPY→ES (${periodLabel})`

    console.log(`[BACKTEST] Fetching ${symbol} data, scaling ${scale}x to ES prices`)

    // Build URLs with random time period
    const url1m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime}&period2=${endTime}&interval=1m&includePrePost=true`
    const url5m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime}&period2=${endTime}&interval=5m&includePrePost=true`
    const url15m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTime}&period2=${endTime}&interval=15m&includePrePost=true`

    // Fetch all timeframes in parallel
    const [res1m, res5m, res15m] = await Promise.all([
      fetch(url1m, { headers, cache: 'no-store' }),
      fetch(url5m, { headers, cache: 'no-store' }),
      fetch(url15m, { headers, cache: 'no-store' }),
    ])

    // Parse 1m data (may not be available for older periods)
    if (res1m.ok) {
      const data = await res1m.json()
      const result = data.chart?.result?.[0]
      if (result?.timestamp && result?.indicators?.quote?.[0]) {
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        historicalData.candles1m = timestamps.map((t: number, i: number) => ({
          time: t * 1000,
          open: (quote.open[i] || quote.close[i] || 0) * scale,
          high: (quote.high[i] || quote.close[i] || 0) * scale,
          low: (quote.low[i] || quote.close[i] || 0) * scale,
          close: (quote.close[i] || 0) * scale,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles1m.length} 1m candles`)
      }
    } else {
      console.log('[BACKTEST] 1m data not available for this period (expected for older dates)')
      historicalData.candles1m = []
    }

    // Parse 5m data - THIS IS OUR PRIMARY DATA SOURCE
    if (res5m.ok) {
      const data = await res5m.json()
      const result = data.chart?.result?.[0]
      if (result?.timestamp && result?.indicators?.quote?.[0]) {
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        historicalData.candles5m = timestamps.map((t: number, i: number) => ({
          time: t * 1000,
          open: (quote.open[i] || quote.close[i] || 0) * scale,
          high: (quote.high[i] || quote.close[i] || 0) * scale,
          low: (quote.low[i] || quote.close[i] || 0) * scale,
          close: (quote.close[i] || 0) * scale,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles5m.length} 5m candles`)

        // Detect and log market regime for this period
        const regime = detectPeriodRegime(historicalData.candles5m)
        console.log(`[BACKTEST] Detected market regime: ${regime}`)

        // Track training history
        trainingHistory.push({
          startDate: new Date(startTime * 1000).toISOString(),
          endDate: new Date(endTime * 1000).toISOString(),
          regime,
          trainedCount: 1,
        })
      }
    } else {
      console.error('[BACKTEST] Failed to fetch 5m data')
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
          open: (quote.open[i] || quote.close[i] || 0) * scale,
          high: (quote.high[i] || quote.close[i] || 0) * scale,
          low: (quote.low[i] || quote.close[i] || 0) * scale,
          close: (quote.close[i] || 0) * scale,
          volume: quote.volume[i] || 0,
        })).filter((c: Candle) => c.close > 0)

        console.log(`[BACKTEST] Loaded ${historicalData.candles15m.length} 15m candles`)
      }
    }

    // If 1m data not available, generate it from 5m data
    if (historicalData.candles1m.length === 0 && historicalData.candles5m.length > 0) {
      console.log('[BACKTEST] Generating synthetic 1m candles from 5m data...')
      historicalData.candles1m = generateSynthetic1mCandles(historicalData.candles5m)
      console.log(`[BACKTEST] Generated ${historicalData.candles1m.length} synthetic 1m candles`)
    }

    state.totalCandles = historicalData.candles1m.length || historicalData.candles5m.length * 5

    // Store data source info for API response
    currentDataSource = {
      symbol,
      isRealES: false,  // Using SPY scaled
      label: dataLabel,
      period: periodLabel,
      regime: detectPeriodRegime(historicalData.candles5m),
    }

    const totalCandles = historicalData.candles1m.length + historicalData.candles5m.length + historicalData.candles15m.length
    console.log(`[BACKTEST] Total loaded: ${totalCandles} candles from ${periodLabel}`)
    console.log(`[BACKTEST] Training on: ${currentDataSource.regime} market conditions`)

    return historicalData.candles5m.length > 50
  } catch (e) {
    console.error('[BACKTEST] Failed to fetch data:', e)
    return false
  }
}

// Generate synthetic 1m candles from 5m candles for older periods
function generateSynthetic1mCandles(candles5m: Candle[]): Candle[] {
  const result: Candle[] = []

  for (const candle of candles5m) {
    // Split each 5m candle into 5 synthetic 1m candles
    const range = candle.high - candle.low
    const direction = candle.close >= candle.open ? 1 : -1

    for (let i = 0; i < 5; i++) {
      const progress = i / 5
      const nextProgress = (i + 1) / 5

      // Simulate price movement within the 5m candle
      const noise = (Math.random() - 0.5) * range * 0.3

      let open: number, close: number, high: number, low: number

      if (direction > 0) {
        // Bullish 5m candle - general upward movement
        open = candle.open + (candle.close - candle.open) * progress + noise
        close = candle.open + (candle.close - candle.open) * nextProgress + noise
      } else {
        // Bearish 5m candle - general downward movement
        open = candle.open + (candle.close - candle.open) * progress + noise
        close = candle.open + (candle.close - candle.open) * nextProgress + noise
      }

      // Add some wick
      const wickNoise = Math.random() * range * 0.2
      high = Math.max(open, close) + wickNoise
      low = Math.min(open, close) - wickNoise

      // Clamp to parent candle's range
      high = Math.min(high, candle.high)
      low = Math.max(low, candle.low)

      result.push({
        time: candle.time + i * 60 * 1000,  // Add 1 minute per candle
        open: Math.max(low, Math.min(high, open)),
        high,
        low,
        close: Math.max(low, Math.min(high, close)),
        volume: Math.floor(candle.volume / 5),
      })
    }
  }

  return result
}

// Track current data source for API response
let currentDataSource: {
  symbol: string
  isRealES: boolean
  label: string
  period?: string
  regime?: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE'
} = {
  symbol: 'SPY',
  isRealES: false,
  label: 'SPY→ES (randomized period)',
  period: 'Not loaded',
  regime: 'SIDEWAYS',
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

  // ==========================================================================
  // PRODUCTION-GRADE STRATEGY ENGINE - Research-backed strategies
  // VWAP Mean Reversion (Sharpe 2.1), ORB (74.56% WR), EMA Trend + Pullback
  // ==========================================================================

  // Calculate all technical indicators
  let indicators: Indicators
  try {
    indicators = calculateIndicators(candles1m)
  } catch (e) {
    // Not enough data for indicators
    state.candlesProcessed++
    state.currentIndex = index
    return
  }

  // Detect market regime using new strategy engine
  const regime = detectMarketRegime(indicators)

  // Extract pattern features for adaptive ML (uses old adaptive-ml regime detection)
  const features = extractFeatures(candles1m)
  const adaptiveRegime = detectAdaptiveRegime(candles1m, features)
  const session = getCurrentSession(currentCandle.time)

  // Generate master signal from all strategies with confluence scoring
  const masterSignal = generateMasterSignal(
    candles1m,
    indicators,
    vpin.vpin,        // Cumulative delta for order flow analysis
    [vpin.vpin],      // Delta history (simplified)
    {
      vwap: DEFAULT_VWAP_CONFIG,
      orb: DEFAULT_ORB_CONFIG,
      ema: DEFAULT_EMA_CONFIG,
    }
  )

  // === ADVANCED INSTITUTIONAL ANALYSIS ===
  // Order Flow, Volume Profile, Smart Money Concepts, Statistical
  const advancedAnalysis = analyzeMarket(
    candles1m,
    state.deltaHistory || [],  // Delta history for divergence detection
    [],   // Bid volumes (would need L2 data)
    [],   // Ask volumes (would need L2 data)
    candles1m.map(c => c.close)
  )

  // Generate advanced signal using institutional methods
  const advancedSignal = generateAdvancedMasterSignal(
    candles1m,
    advancedAnalysis,
    indicators.atr
  )

  // Track delta for divergence detection
  state.deltaHistory.push(vpin.vpin)
  if (state.deltaHistory.length > 100) {
    state.deltaHistory = state.deltaHistory.slice(-100)  // Keep last 100
  }

  // For backwards compatibility with adaptive ML
  const closes = candles1m.map(c => c.close)
  const price = currentPrice
  const lastEma20 = indicators.ema20
  const lastEma50 = indicators.ema50
  const lastRsi = indicators.rsi

  // Convert master signal to adaptive format
  const strategies: Array<{ name: string; direction: 'LONG' | 'SHORT' | 'FLAT'; confidence: number }> =
    masterSignal.strategies.map(s => ({
      name: s.strategy,
      direction: s.direction,
      confidence: s.confidence,
    }))

  // Generate ADAPTIVE signal (learns from past performance)
  // Uses the strategies from the new engine
  const adaptiveSignal = generateAdaptiveSignal(candles1m, strategies)

  // Track ML predictions
  state.mlAccuracy.totalPredictions++
  const confLevel = adaptiveSignal.confidence > 80 ? 'high' : adaptiveSignal.confidence > 60 ? 'medium' : 'low'
  state.mlAccuracy.byConfidenceLevel[confLevel].total++

  // Position Management
  if (state.position) {
    const pos = state.position

    // =========================================================================
    // APEX 4:59 PM ET MANDATORY CLOSE - MUST BE FLAT BY CLOSE
    // =========================================================================
    if (mustForceClose(currentCandle.time)) {
      // FORCE CLOSE - No choice, Apex requires all positions closed by 4:59 PM ET
      const closeExecution = calculateExecutionPrice(
        currentCandle,
        recentCandles,
        pos.direction,
        false,  // isEntry
        pos.contracts
      )

      // Even if rejected, we MUST close - try again at market
      const exitPrice = closeExecution.executed
        ? closeExecution.executionPrice
        : currentCandle.close  // Emergency market close

      const exitLatency = simulateLatency()
      const grossPnL = pos.direction === 'LONG'
        ? (exitPrice - pos.entryPrice) * pos.contracts * TRADING_COSTS.pointValue
        : (pos.entryPrice - exitPrice) * pos.contracts * TRADING_COSTS.pointValue

      const volatility = (currentCandle.high - currentCandle.low) / currentCandle.close
      const costs = calculateTradeCosts(pos.contracts, pos.entryPrice, exitPrice, volatility)
      const netPnL = grossPnL - costs.totalCosts
      const totalLatency = pos.entryLatencyMs + exitLatency

      // Record the force-closed trade
      const trade: BacktestTrade = {
        id: `trade_${state.trades.length + 1}`,
        timestamp: currentCandle.time,
        direction: pos.direction,
        rawEntryPrice: pos.rawEntryPrice,
        entryPrice: pos.entryPrice,
        rawExitPrice: currentCandle.close,
        exitPrice: exitPrice,
        contracts: pos.contracts,
        grossPnL,
        costs,
        netPnL,
        pnlPercent: (netPnL / APEX_150K_CONFIG.accountSize) * 100,
        holdingTime: (currentCandle.time - pos.entryTime) / 60000,
        latencyMs: totalLatency,
        entryReason: pos.strategy || 'Unknown',
        exitReason: 'APEX 4:59 PM MANDATORY CLOSE',
        confluenceScore: pos.confluenceScore || 0,
        mlConfidence: pos.mlConfidence || 0,
        vpinAtEntry: pos.vpinAtEntry || 0,
        entryAnalytics: {
          strategy: pos.strategy || 'Unknown',
          rsiAtEntry: indicators.rsi,
          ema20Distance: ((currentPrice - indicators.ema20) / indicators.ema20) * 100,
          ema50Distance: ((currentPrice - indicators.ema50) / indicators.ema50) * 100,
          regime: regime.type,
          hourOfDay: new Date(currentCandle.time).getUTCHours() - 5,
          atrAtEntry: indicators.atr,
          trendStrength: regime.strength,
        },
      }

      state.trades.push(trade)
      recordEntryAnalytics(trade)
      dailyPnL += netPnL

      // Update state
      state.grossPnL += grossPnL
      state.totalCosts += costs.totalCosts
      state.totalPnL += netPnL
      state.currentBalance += netPnL
      state.costBreakdown.commissions += costs.commission
      state.costBreakdown.exchangeFees += costs.exchangeFees
      state.costBreakdown.slippage += costs.slippage

      if (netPnL > 0) {
        state.wins++
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

      state.position = null
      state.candlesProcessed++
      state.currentIndex = index
      return  // Position closed, done for this candle
    }

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
        entryAnalytics: pos.entryAnalytics,
      }

      state.trades.push(trade)

      // Record entry analytics for analysis
      recordEntryAnalytics(trade)

      // Update totals with NET P&L (after costs)
      state.grossPnL += grossPnL
      state.totalCosts += costs.totalCosts
      state.totalPnL += netPnL
      state.currentBalance += netPnL

      // PROFIT TRACKING: Update daily P&L for daily loss limit enforcement
      dailyPnL += netPnL

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

    // =========================================================================
    // APEX TIMING CHECK - 4:30 PM ET NO NEW TRADES
    // =========================================================================
    if (isNearMandatoryClose(currentCandle.time)) {
      // AFTER 4:30 PM ET - No new trades allowed
      // This gives us 29 minutes buffer before mandatory 4:59 PM close
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

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

    // ==========================================================================
    // PRODUCTION-READY ENTRY LOGIC - PROFIT MAXIMIZATION
    // Only take the ABSOLUTE BEST setups - quality over quantity
    // ==========================================================================

    // CHECK 1: Daily loss limit - PROTECT THE ACCOUNT
    const tradingDay = new Date(currentCandle.time).toDateString()
    if (tradingDay !== currentTradingDay) {
      // New trading day - reset counters
      currentTradingDay = tradingDay
      dailyPnL = 0
      dailyTradeCount = 0
    }

    if (dailyPnL <= -PROFIT_CONFIG.dailyMaxLoss) {
      // STOP TRADING - Hit daily loss limit
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

    // CHECK 2: Max trades per day
    if (dailyTradeCount >= PROFIT_CONFIG.maxTradesPerDay) {
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

    // CHECK 3: Minimum time between trades (avoid overtrading)
    if (index - lastTradeIndex < PROFIT_CONFIG.minTimeBetweenTrades) {
      state.candlesProcessed++
      state.currentIndex = index
      return
    }

    // CHECK 4: Momentum confirmation
    const currentRSI = indicators.rsi
    const macdHistogram = indicators.macdHistogram

    // Determine which signal to use
    let signalToUse: { direction: 'LONG' | 'SHORT'; confidence: number; strategy: string; stopLoss: number; takeProfit: number; riskRewardRatio: number } | null = null

    // ==========================================================================
    // FOCUSED MODE: Only use ORB signals (74.56% documented win rate)
    // ==========================================================================
    if (FOCUSED_MODE.enabled) {
      // Check if we're in the ORB trade window (10:00 AM - 1:00 PM ET)
      const { etTime } = getETTime(currentCandle.time)
      if (etTime < FOCUSED_MODE.orbTradeWindowStart || etTime > FOCUSED_MODE.orbTradeWindowEnd) {
        // Outside ORB window - skip
        state.candlesProcessed++
        state.currentIndex = index
        return
      }

      // Check daily trade limit for focused mode
      if (dailyTradeCount >= FOCUSED_MODE.maxDailyTrades) {
        state.candlesProcessed++
        state.currentIndex = index
        return
      }

      // Find the ORB signal specifically from masterSignal.strategies
      const orbSignal = masterSignal.strategies.find(s => s.strategy === 'ORB_BREAKOUT')

      if (orbSignal && orbSignal.direction !== 'FLAT') {
        // Validate ORB range is within acceptable bounds
        const orbHigh = indicators.openingRangeHigh
        const orbLow = indicators.openingRangeLow
        const orbRange = orbHigh - orbLow

        // Skip if range too small or too large
        if (orbRange < FOCUSED_MODE.minORBRangePoints || orbRange > FOCUSED_MODE.maxORBRangePoints) {
          state.candlesProcessed++
          state.currentIndex = index
          return
        }

        // Validate volume on breakout
        if (indicators.relativeVolume < FOCUSED_MODE.minBreakoutVolume) {
          state.candlesProcessed++
          state.currentIndex = index
          return
        }

        // Check regime - only trade trending days
        if (FOCUSED_MODE.onlyTrendingDays) {
          if (regime.type !== 'TRENDING_UP' && regime.type !== 'TRENDING_DOWN' && regime.type !== 'HIGH_VOLATILITY') {
            state.candlesProcessed++
            state.currentIndex = index
            return
          }
        }

        // ORB signal is valid - use it
        signalToUse = {
          direction: orbSignal.direction as 'LONG' | 'SHORT',
          confidence: orbSignal.confidence,
          strategy: 'ORB_BREAKOUT',
          stopLoss: orbSignal.direction === 'LONG' ? orbLow : orbHigh,
          takeProfit: orbSignal.direction === 'LONG'
            ? currentPrice + (orbRange * 2)  // 2R target
            : currentPrice - (orbRange * 2),
          riskRewardRatio: 2.0,
        }
      }
    }
    // ==========================================================================
    // FALLBACK: Standard multi-strategy mode (if FOCUSED_MODE disabled)
    // ==========================================================================
    else {
      // Advanced signal takes priority if it exists and meets STRICT requirements
      if (advancedSignal &&
          advancedSignal.direction !== 'FLAT' &&
          advancedSignal.confidence >= PROFIT_CONFIG.minConfidence &&
          advancedSignal.riskRewardRatio >= PROFIT_CONFIG.minRiskReward) {

        // Momentum must confirm direction
        const momentumConfirms = advancedSignal.direction === 'LONG'
          ? (currentRSI > PROFIT_CONFIG.rsiOversoldThreshold && macdHistogram > 0)
          : (currentRSI < PROFIT_CONFIG.rsiOverboughtThreshold && macdHistogram < 0)

        if (!PROFIT_CONFIG.requireMomentumConfirm || momentumConfirms) {
          signalToUse = {
            direction: advancedSignal.direction as 'LONG' | 'SHORT',
            confidence: advancedSignal.confidence,
            strategy: advancedSignal.strategy,
            stopLoss: advancedSignal.stopLoss,
            takeProfit: advancedSignal.takeProfit,
            riskRewardRatio: advancedSignal.riskRewardRatio,
          }
        }
      }

      // Fall back to master signal ONLY if it meets STRICT requirements
      if (!signalToUse &&
          masterSignal.direction !== 'FLAT' &&
          masterSignal.confluenceScore >= PROFIT_CONFIG.minConfluenceScore &&
          masterSignal.confidence >= PROFIT_CONFIG.minConfidence &&
          masterSignal.riskRewardRatio >= PROFIT_CONFIG.minRiskReward) {

        // Momentum must confirm
        const momentumConfirms = masterSignal.direction === 'LONG'
          ? (currentRSI > PROFIT_CONFIG.rsiOversoldThreshold && macdHistogram > 0)
          : (currentRSI < PROFIT_CONFIG.rsiOverboughtThreshold && macdHistogram < 0)

        if (!PROFIT_CONFIG.requireMomentumConfirm || momentumConfirms) {
          signalToUse = {
            direction: masterSignal.direction as 'LONG' | 'SHORT',
            confidence: masterSignal.confidence,
            strategy: masterSignal.primaryStrategy,
            stopLoss: masterSignal.stopLoss,
            takeProfit: masterSignal.takeProfit,
            riskRewardRatio: masterSignal.riskRewardRatio,
          }
        }
      }
    }

    const shouldEnter = signalToUse !== null

    if (shouldEnter && signalToUse) {
      let entryDir: 'LONG' | 'SHORT' = signalToUse.direction

      // Apply inverse mode if enabled - flip LONG <-> SHORT
      if (shouldInverseSignal()) {
        entryDir = entryDir === 'LONG' ? 'SHORT' : 'LONG'
      }

      // MTF FILTER: Only trade in direction of higher timeframe trend
      if (!signalAlignedWithMTF(entryDir, mtfTrend)) {
        // Signal against higher timeframe trend - skip entry
        state.candlesProcessed++
        state.currentIndex = index
        return
      }

      // PA ONE DIRECTION RULE: Check if we're violating the one direction rule
      // (Only applies in Performance Account mode)
      const paViolation = checkPAViolation(state.currentBalance, 0, entryDir)
      if (paViolation.violation) {
        // Block trade - would violate PA rules
        state.candlesProcessed++
        state.currentIndex = index
        return
      }

      // Track session direction for One Direction Rule
      if (paState.isPA && !paState.currentSessionDirection) {
        paState.currentSessionDirection = entryDir
      }

      const atr = indicators.atr

      // USE STRATEGY ENGINE's CALCULATED STOPS & TARGETS
      // These are based on research-backed strategies, not arbitrary multipliers
      const rawEntryPrice = currentPrice

      // Calculate volatility for slippage
      const recentPrices = candles1m.slice(-20).map(c => (c.high - c.low) / c.close)
      const volatility = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length

      // Simulate entry latency
      const entryLatencyMs = simulateLatency()

      // Apply slippage to entry price (slippage works against you)
      const entryPrice = applySlippage(currentPrice, entryDir, true, volatility)

      // USE SIGNAL's CALCULATED STOPS & TARGETS
      // These come from institutional analysis (order flow, volume profile, SMC, etc.)
      const slippageAdjustment = Math.abs(entryPrice - rawEntryPrice)
      let stopLoss = entryDir === 'LONG'
        ? signalToUse.stopLoss - slippageAdjustment
        : signalToUse.stopLoss + slippageAdjustment
      const takeProfit = signalToUse.takeProfit

      // MAX LOSS PER TRADE - Cap stop loss to prevent catastrophic losses
      // With ES at $50/point, 8 points = $400 max risk per contract
      const rawRiskPoints = Math.abs(entryPrice - stopLoss)
      if (rawRiskPoints > PROFIT_CONFIG.maxLossPerTradePoints) {
        // Tighten the stop to respect max loss limit
        stopLoss = entryDir === 'LONG'
          ? entryPrice - PROFIT_CONFIG.maxLossPerTradePoints
          : entryPrice + PROFIT_CONFIG.maxLossPerTradePoints
      }

      // Calculate partial profit targets (1R and 2R)
      const riskAmount = Math.abs(entryPrice - stopLoss)
      const target1 = entryDir === 'LONG'
        ? entryPrice + riskAmount      // 1R profit
        : entryPrice - riskAmount
      const target2 = entryDir === 'LONG'
        ? entryPrice + (riskAmount * 2) // 2R profit
        : entryPrice - (riskAmount * 2)

      // Trailing stop distance (1.5x ATR after first target hit)
      const trailingDistance = atr * 1.5

      // Position size based on confidence AND Apex risk level
      // Higher confidence = larger position, but always respect Apex limits
      const confidenceMultiplier = signalToUse.confidence >= 85 ? 1.5 :
                                   signalToUse.confidence >= 75 ? 1.0 : 0.75
      const baseContracts = useAdvanced ? confidenceMultiplier : masterSignal.positionSizeMultiplier
      const riskAdjustedContracts = baseContracts * apexRisk.positionSizeMultiplier

      // APEX MAX CONTRACTS LIMIT - 17 contracts max for 150K account
      // Also apply PA contract scaling if in Performance Account
      const paMultiplier = getPAContractMultiplier()
      const contracts = Math.min(
        APEX_150K_CONFIG.maxContracts,  // Hard cap at 17
        Math.max(1, Math.floor(riskAdjustedContracts * paMultiplier))
      )

      // Calculate entry analytics
      const entryHour = new Date(currentCandle.time).getUTCHours() - 5 // EST
      const ema20Distance = ((price - lastEma20) / price) * 100
      const ema50Distance = ((price - lastEma50) / price) * 100
      const trendStrength = indicators.trendStrength

      // Stop/target multipliers for adaptive learning
      const stopMultiplier = riskAmount / atr
      const targetMultiplier = Math.abs(takeProfit - entryPrice) / atr

      state.position = {
        direction: entryDir,
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
        confluenceScore: signalToUse.confidence,  // Use the actual signal's confidence
        mlConfidence: signalToUse.confidence / 100,
        vpinAtEntry: vpin.vpin,
        volatilityAtEntry: volatility,
        regime: adaptiveRegime,  // Use adaptive regime for ML learning
        features,
        stopMultiplierUsed: stopMultiplier,
        targetMultiplierUsed: targetMultiplier,
        strategy: signalToUse.strategy,
        entryAnalytics: {
          strategy: signalToUse.strategy,
          rsiAtEntry: lastRsi,
          ema20Distance,
          ema50Distance,
          regime: masterSignal.regime,
          hourOfDay: entryHour,
          atrAtEntry: atr,
          trendStrength,
        },
      }

      // PROFIT TRACKING: Update trade frequency counters
      dailyTradeCount++
      lastTradeIndex = index
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
    // Localhost bypass for testing
    const host = request.headers.get('host') || ''
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

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
      // BRUTALLY REALISTIC Trading Costs (1:1 with Live Trading)
      tradingCosts: {
        total: (state.totalCosts || 0).toFixed(2),
        breakdown: {
          commissions: (state.costBreakdown?.commissions || 0).toFixed(2),
          exchangeFees: (state.costBreakdown?.exchangeFees || 0).toFixed(2),
          slippage: (state.costBreakdown?.slippage || 0).toFixed(2),
          spread: (state.costBreakdown?.spread || 0).toFixed(2),
          gapLosses: (state.costBreakdown?.gapLosses || 0).toFixed(2),
        },
        avgCostPerTrade: state.trades.length > 0
          ? (state.totalCosts / state.trades.length).toFixed(2)
          : '0.00',
        costAsPercentOfGross: state.grossPnL !== 0
          ? ((state.totalCosts / Math.abs(state.grossPnL)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      // EXECUTION QUALITY STATS - Shows how realistic the simulation is
      executionStats: {
        totalOrders: state.executionStats?.totalOrders || 0,
        rejectedOrders: state.executionStats?.rejectedOrders || 0,
        rejectionRate: (state.executionStats?.totalOrders || 0) > 0
          ? (((state.executionStats?.rejectedOrders || 0) / state.executionStats.totalOrders) * 100).toFixed(1) + '%'
          : '0%',
        partialFills: state.executionStats?.partialFills || 0,
        avgFillPercentage: (state.executionStats?.avgFillPercentage || 100).toFixed(1) + '%',
        avgSlippageTicks: (state.executionStats?.avgSlippageTicks || 0).toFixed(2),
        avgSlippageDollars: '$' + ((state.executionStats?.avgSlippageTicks || 0) * TRADING_COSTS.tickValue).toFixed(2),
        avgSpreadTicks: (state.executionStats?.avgSpreadTicks || 0).toFixed(2),
        avgSpreadDollars: '$' + ((state.executionStats?.avgSpreadTicks || 0) * TRADING_COSTS.tickValue).toFixed(2),
        gappedStops: state.executionStats?.gappedStops || 0,
        gapLossTotal: '$' + (state.costBreakdown?.gapLosses || 0).toFixed(2),
      },
      // Latency Simulation Stats
      latencyStats: {
        avgLatencyMs: (state.latencyStats?.avgLatencyMs || 0).toFixed(0) + 'ms',
        maxLatencyMs: (state.latencyStats?.maxLatencyMs || 0).toFixed(0) + 'ms',
        minLatencyMs: (state.latencyStats?.minLatencyMs === Infinity || !state.latencyStats?.minLatencyMs)
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
      // Data Source Info - RANDOMIZED FOR TRUE ML LEARNING
      dataSource: {
        provider: 'Yahoo Finance + Adaptive ML',
        instrument: currentDataSource.label,
        symbol: currentDataSource.symbol,
        isRealES: currentDataSource.isRealES,
        // CRITICAL: Random historical period each run
        period: currentDataSource.period || 'Not loaded',
        marketRegime: currentDataSource.regime || 'UNKNOWN',
        timeframes: ['1m', '5m', '15m'],
        candlesLoaded: {
          '1m': historicalData.candles1m.length,
          '5m': historicalData.candles5m.length,
          '15m': historicalData.candles15m.length,
        },
        note: 'RANDOMIZED: Each run trains on DIFFERENT market conditions',
        trainingDiversity: `ML learning from ${trainingHistory.length} different periods`,
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
    // Localhost bypass for testing
    const host = request.headers.get('host') || ''
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

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

      // Reset entry analytics
      resetEntryAnalytics()

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
      state.costBreakdown = { commissions: 0, exchangeFees: 0, slippage: 0, spread: 0, gapLosses: 0 }

      // Reset daily profit tracking
      dailyPnL = 0
      dailyTradeCount = 0
      lastTradeIndex = 0
      currentTradingDay = ''
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
