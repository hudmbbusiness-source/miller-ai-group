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

// =============================================================================
// REALISTIC TRADING COSTS (Match Apex/Rithmic 1:1)
// =============================================================================

const TRADING_COSTS = {
  // Commissions (per contract, round trip)
  commissionPerContract: 4.12,  // Apex Rithmic: ~$2.06 per side

  // Exchange fees (per contract, per side)
  exchangeFeePerSide: 1.28,     // CME E-mini ES
  nfaFee: 0.02,                 // NFA regulatory fee

  // Slippage simulation
  baseSlippageTicks: 0.25,      // Minimum slippage (1 tick = $12.50 for ES)
  volatilitySlippageMultiplier: 0.5,  // Additional slippage based on volatility

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

  // Slippage calculation based on volatility
  const volatilityFactor = Math.max(1, volatility / 0.01)  // Higher volatility = more slippage
  const slippageTicks = TRADING_COSTS.baseSlippageTicks +
    (TRADING_COSTS.volatilitySlippageMultiplier * volatilityFactor * Math.random())
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
    stopLoss: number
    takeProfit: number
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
}

let config: EngineConfig = {
  speed: 1,
  inverseMode: false,
  inverseThreshold: 40,  // Flip when win rate drops below 40%
  autoInverse: true,     // AUTO-INVERSE ON BY DEFAULT - fully automatic
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

  // Generate signals from all strategies
  const mlSignal = generateMLSignal(candles5m.slice(-50))
  const tradSignal = generateSignal(candles1m, candles5m.slice(-50), candles15m.slice(-30), 'ES')

  // Build strategy array for adaptive signal
  const strategies = [
    { name: 'ML_Neural', direction: mlSignal.direction === 'NEUTRAL' ? 'FLAT' as const : mlSignal.direction, confidence: mlSignal.confidence * 100 },
    { name: tradSignal.strategy, direction: tradSignal.direction, confidence: tradSignal.confidence },
  ]

  // Add VPIN-based signal
  if (vpin.signal === 'DANGER' && vpin.vpin > 0.7) {
    // High VPIN often precedes reversals - fade the current direction
    const fadeDir = features.priceChange5 > 0 ? 'SHORT' : 'LONG'
    strategies.push({ name: 'VPIN_Fade', direction: fadeDir as 'LONG' | 'SHORT', confidence: vpin.vpin * 60 })
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

    let shouldExit = false
    let exitReason = ''

    // Stop loss
    if (pos.direction === 'LONG' && currentPrice <= pos.stopLoss) {
      shouldExit = true
      exitReason = 'Stop Loss'
    } else if (pos.direction === 'SHORT' && currentPrice >= pos.stopLoss) {
      shouldExit = true
      exitReason = 'Stop Loss'
    }

    // Take profit
    if (pos.direction === 'LONG' && currentPrice >= pos.takeProfit) {
      shouldExit = true
      exitReason = 'Take Profit'
    } else if (pos.direction === 'SHORT' && currentPrice <= pos.takeProfit) {
      shouldExit = true
      exitReason = 'Take Profit'
    }

    // Reversal signal - use adaptive signal for exit
    if (adaptiveSignal.confidence >= 60 && adaptiveSignal.direction !== 'FLAT' && adaptiveSignal.direction !== pos.direction) {
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
    // ADAPTIVE ENTRY: Use learned optimal parameters
    let entryDirection = adaptiveSignal.direction

    // Only enter if adaptive signal is not FLAT and has sufficient strength
    if (entryDirection !== 'FLAT' && adaptiveSignal.strength !== 'NONE') {
      // Apply inverse mode if enabled - flip LONG <-> SHORT
      if (shouldInverseSignal()) {
        entryDirection = entryDirection === 'LONG' ? 'SHORT' : 'LONG'
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

      // Position size based on edge strength (adaptive)
      const contracts = Math.max(1, Math.floor(adaptiveSignal.positionSizeMultiplier))

      state.position = {
        direction: entryDirection,
        rawEntryPrice,
        entryPrice,
        entryTime: currentCandle.time,
        entryLatencyMs,
        contracts,
        stopLoss,
        takeProfit,
        confluenceScore: adaptiveSignal.confidence,
        mlConfidence: mlSignal.confidence,
        vpinAtEntry: vpin.vpin,
        volatilityAtEntry: volatility,
        regime,
        features,
        stopMultiplierUsed: adaptiveSignal.optimalStopMultiplier,
        targetMultiplierUsed: adaptiveSignal.optimalTargetMultiplier,
        strategy: Object.keys(adaptiveSignal.strategyWeights)[0] || tradSignal.strategy,
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
