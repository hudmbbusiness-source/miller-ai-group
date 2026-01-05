/**
 * REGIME-SEGMENTED PATTERN ANALYZER
 *
 * This analyzer finds patterns that work in EACH market regime:
 * 1. UPTREND patterns (LONG focused)
 * 2. DOWNTREND patterns (SHORT focused)
 * 3. SIDEWAYS patterns (mean reversion)
 *
 * It segments historical data by regime FIRST, then finds patterns
 * that work consistently within each regime.
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// TYPES
// ============================================================================

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  hour: number
  dateStr: string
}

type MarketRegime = 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'

interface RegimeSegment {
  regime: MarketRegime
  startIndex: number
  endIndex: number
  startDate: string
  endDate: string
  candleCount: number
  priceChange: number
}

interface PatternResult {
  patternId: string
  direction: 'LONG' | 'SHORT'
  wins: number
  losses: number
  winRate: number
  avgWinPoints: number
  avgLossPoints: number
  profitFactor: number
  expectancy: number
  // Net performance (after all costs)
  netExpectancy: number
  netProfitFactor: number
  totalGrossPnL: number
  totalNetPnL: number
  totalCosts: number
  avgCostPerTrade: number
  // Per-trade breakdown
  avgSlippageCost: number
  avgFixedCost: number
}

interface RegimePatterns {
  regime: MarketRegime
  segments: number
  totalCandles: number
  patterns: PatternResult[]
  bestPattern: PatternResult | null
  totalExpectedValue: number
}

// ============================================================================
// CONSTANTS - REALISTIC APEX/RITHMIC COSTS
// ============================================================================

const ES_CONTRACT_VALUE = 50 // $50 per point
const ES_TICK_VALUE = 12.50 // $12.50 per tick (0.25 points)

// FIXED COSTS PER CONTRACT (ROUND TRIP)
const TRADING_COSTS = {
  commission: 4.12,       // Rithmic/Apex commission
  exchangeFee: 2.58,      // CME E-mini exchange fee
  nfaFee: 0.04,           // NFA regulatory fee
  clearingFee: 0.10,      // Clearing fee
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee } // ~$6.84
}

// SLIPPAGE MODEL (per side)
const SLIPPAGE = {
  baseTicks: 0.5,         // Base slippage: 0.5 tick per side
  volatilityMultiplier: 0.5, // Additional slippage during volatility

  // Get realistic slippage based on market conditions
  getSlippagePoints(atr: number, avgATR: number = 4): number {
    // Higher ATR = more slippage
    const volatilityFactor = Math.min(atr / avgATR, 2)
    const totalTicks = this.baseTicks * (1 + this.volatilityMultiplier * volatilityFactor)
    return totalTicks * 0.25 // Convert ticks to points (0.25 per tick for ES)
  },

  // Get slippage in dollars per side
  getSlippageDollars(atr: number, avgATR: number = 4): number {
    const ticks = this.baseTicks * (1 + this.volatilityMultiplier * (Math.min(atr / avgATR, 2)))
    return ticks * ES_TICK_VALUE // $12.50 per tick
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchESData(days: number = 90): Promise<Candle[]> {
  const sources = [
    { symbol: 'ES=F', scale: 1 },
    { symbol: 'SPY', scale: 10 }
  ]

  for (const source of sources) {
    try {
      const now = Math.floor(Date.now() / 1000)
      const start = now - (days * 24 * 60 * 60)

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(source.symbol)}?period1=${start}&period2=${now}&interval=5m&includePrePost=false`

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (!response.ok) continue

      const data = await response.json()
      const result = data.chart?.result?.[0]

      if (!result?.timestamp) continue

      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      const candles: Candle[] = []

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
          const time = timestamps[i] * 1000
          const date = new Date(time)
          const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

          candles.push({
            time,
            open: quote.open[i] * source.scale,
            high: quote.high[i] * source.scale,
            low: quote.low[i] * source.scale,
            close: quote.close[i] * source.scale,
            volume: quote.volume[i] || 0,
            hour: estDate.getHours() + estDate.getMinutes() / 60,
            dateStr: estDate.toLocaleDateString('en-US'),
          })
        }
      }

      if (candles.length > 100) return candles
    } catch {
      continue
    }
  }

  throw new Error('Could not fetch ES data')
}

// ============================================================================
// INDICATORS
// ============================================================================

function calculateEMA(candles: Candle[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      ema.push(candles[i].close)
    } else {
      ema.push((candles[i].close - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }

  return ema
}

function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = []

  for (let i = 0; i < candles.length; i++) {
    const tr = i === 0
      ? candles[i].high - candles[i].low
      : Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        )

    if (i < period) {
      atr.push(tr)
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr) / period)
    }
  }

  return atr
}

function calculateRSI(candles: Candle[], period: number = 2): number[] {
  const rsi: number[] = []
  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      rsi.push(50)
      continue
    }

    const change = candles[i].close - candles[i - 1].close
    const gain = Math.max(change, 0)
    const loss = Math.max(-change, 0)

    if (i < period) {
      avgGain = (avgGain * (i - 1) + gain) / i
      avgLoss = (avgLoss * (i - 1) + loss) / i
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }

    const rs = avgLoss > 0 ? avgGain / avgLoss : 100
    rsi.push(100 - (100 / (1 + rs)))
  }

  return rsi
}

function calculateBB(candles: Candle[], period: number = 20) {
  const upper: number[] = []
  const lower: number[] = []
  const middle: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(candles[i].close)
      lower.push(candles[i].close)
      middle.push(candles[i].close)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close
      }
      const avg = sum / period

      let sqSum = 0
      for (let j = 0; j < period; j++) {
        sqSum += Math.pow(candles[i - j].close - avg, 2)
      }
      const std = Math.sqrt(sqSum / period)

      middle.push(avg)
      upper.push(avg + 2 * std)
      lower.push(avg - 2 * std)
    }
  }

  return { upper, middle, lower }
}

function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = []
  let cumulativeTPV = 0
  let cumulativeVolume = 0
  let currentDay = ''

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].dateStr !== currentDay) {
      currentDay = candles[i].dateStr
      cumulativeTPV = 0
      cumulativeVolume = 0
    }

    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3
    cumulativeTPV += typicalPrice * candles[i].volume
    cumulativeVolume += candles[i].volume

    vwap.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : candles[i].close)
  }

  return vwap
}

// ============================================================================
// REGIME SEGMENTATION
// ============================================================================

function segmentByRegime(candles: Candle[]): RegimeSegment[] {
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)

  const segments: RegimeSegment[] = []
  let currentRegime: MarketRegime | null = null
  let segmentStart = 0

  // Look at daily closes to determine regime
  const dailyCloses: { date: string; close: number; ema20: number; ema50: number; index: number }[] = []
  let lastDate = ''

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].dateStr !== lastDate && candles[i].hour >= 15.5) {
      dailyCloses.push({
        date: candles[i].dateStr,
        close: candles[i].close,
        ema20: ema20[i],
        ema50: ema50[i],
        index: i
      })
      lastDate = candles[i].dateStr
    }
  }

  // Determine regime for each day
  for (let i = 5; i < dailyCloses.length; i++) {
    const current = dailyCloses[i]
    const past = dailyCloses[i - 5]

    // Calculate slope over 5 days
    const priceChange = (current.close - past.close) / past.close * 100
    const ema20Above50 = current.ema20 > current.ema50

    let regime: MarketRegime
    if (priceChange > 0.5 && ema20Above50) {
      regime = 'UPTREND'
    } else if (priceChange < -0.5 && !ema20Above50) {
      regime = 'DOWNTREND'
    } else {
      regime = 'SIDEWAYS'
    }

    // Start new segment if regime changed
    if (regime !== currentRegime) {
      if (currentRegime !== null && segmentStart < current.index) {
        segments.push({
          regime: currentRegime,
          startIndex: segmentStart,
          endIndex: current.index - 1,
          startDate: candles[segmentStart].dateStr,
          endDate: candles[current.index - 1].dateStr,
          candleCount: current.index - segmentStart,
          priceChange: ((candles[current.index - 1].close - candles[segmentStart].close) / candles[segmentStart].close) * 100
        })
      }
      currentRegime = regime
      segmentStart = current.index
    }
  }

  // Add final segment
  if (currentRegime !== null && segmentStart < candles.length - 1) {
    segments.push({
      regime: currentRegime,
      startIndex: segmentStart,
      endIndex: candles.length - 1,
      startDate: candles[segmentStart].dateStr,
      endDate: candles[candles.length - 1].dateStr,
      candleCount: candles.length - segmentStart,
      priceChange: ((candles[candles.length - 1].close - candles[segmentStart].close) / candles[segmentStart].close) * 100
    })
  }

  return segments
}

// ============================================================================
// PATTERN DETECTION & TRACKING
// ============================================================================

interface PatternSignal {
  patternId: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  atr: number
}

function detectPatterns(
  candles: Candle[],
  index: number,
  ema20: number[],
  ema50: number[],
  rsi2: number[],
  bb: { upper: number[]; middle: number[]; lower: number[] },
  vwap: number[],
  atr: number[]
): PatternSignal[] {
  const patterns: PatternSignal[] = []

  if (index < 50) return patterns

  const c = candles[index]
  const prev = candles[index - 1]
  const currentATR = atr[index]

  // Skip non-trading hours
  if (c.hour < 9.5 || c.hour >= 16) return patterns

  // === LONG PATTERNS (for uptrends) ===

  // RSI2 Oversold Bounce
  if (rsi2[index] < 10 && rsi2[index - 1] < 10 && c.close > prev.close) {
    patterns.push({
      patternId: 'RSI2_OVERSOLD_BOUNCE',
      direction: 'LONG',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // BB Lower Touch Reversal
  if (c.low <= bb.lower[index] && c.close > c.open && c.close > bb.lower[index]) {
    patterns.push({
      patternId: 'BB_LOWER_BOUNCE',
      direction: 'LONG',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // VWAP Pullback Long
  const vwapDiff = (c.close - vwap[index]) / vwap[index] * 100
  if (Math.abs(vwapDiff) < 0.1 && ema20[index] > ema50[index]) {
    patterns.push({
      patternId: 'VWAP_PULLBACK_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // EMA Bounce Long
  if (c.low <= ema20[index] * 1.001 && c.low >= ema20[index] * 0.999 && c.close > c.open && ema20[index] > ema50[index]) {
    patterns.push({
      patternId: 'EMA20_BOUNCE_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // Momentum Continuation Long
  if (index >= 3) {
    const mom3 = c.close - candles[index - 3].close
    if (mom3 > currentATR * 2 && c.close < c.open && c.close > prev.close * 0.998) {
      patterns.push({
        patternId: 'MOMENTUM_PULLBACK_LONG',
        direction: 'LONG',
        entryPrice: c.close,
        atr: currentATR
      })
    }
  }

  // === SHORT PATTERNS (for downtrends) ===

  // RSI2 Overbought Reversal
  if (rsi2[index] > 90 && rsi2[index - 1] > 90 && c.close < prev.close) {
    patterns.push({
      patternId: 'RSI2_OVERBOUGHT_FADE',
      direction: 'SHORT',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // BB Upper Touch Reversal
  if (c.high >= bb.upper[index] && c.close < c.open && c.close < bb.upper[index]) {
    patterns.push({
      patternId: 'BB_UPPER_FADE',
      direction: 'SHORT',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // VWAP Pullback Short
  if (Math.abs(vwapDiff) < 0.1 && ema20[index] < ema50[index]) {
    patterns.push({
      patternId: 'VWAP_PULLBACK_SHORT',
      direction: 'SHORT',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // EMA Bounce Short
  if (c.high >= ema20[index] * 0.999 && c.high <= ema20[index] * 1.001 && c.close < c.open && ema20[index] < ema50[index]) {
    patterns.push({
      patternId: 'EMA20_BOUNCE_SHORT',
      direction: 'SHORT',
      entryPrice: c.close,
      atr: currentATR
    })
  }

  // Momentum Continuation Short
  if (index >= 3) {
    const mom3 = c.close - candles[index - 3].close
    if (mom3 < -currentATR * 2 && c.close > c.open && c.close < prev.close * 1.002) {
      patterns.push({
        patternId: 'MOMENTUM_PULLBACK_SHORT',
        direction: 'SHORT',
        entryPrice: c.close,
        atr: currentATR
      })
    }
  }

  // === ORB PATTERNS (work in any regime) ===

  if (c.hour >= 9.75 && c.hour < 10.5) {
    let orHigh = 0
    let orLow = Infinity

    for (let j = index - 20; j < index; j++) {
      if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
        orHigh = Math.max(orHigh, candles[j].high)
        orLow = Math.min(orLow, candles[j].low)
      }
    }

    const orRange = orHigh - orLow
    if (orHigh > 0 && orLow < Infinity && orRange > 2 && orRange < 15) {
      if (c.close > orHigh && prev.close <= orHigh) {
        patterns.push({
          patternId: 'ORB_BREAKOUT_LONG',
          direction: 'LONG',
          entryPrice: c.close,
          atr: currentATR
        })
      }
      if (c.close < orLow && prev.close >= orLow) {
        patterns.push({
          patternId: 'ORB_BREAKOUT_SHORT',
          direction: 'SHORT',
          entryPrice: c.close,
          atr: currentATR
        })
      }
    }
  }

  return patterns
}

interface TradeResult {
  outcome: 'WIN' | 'LOSS'
  grossPnlPoints: number    // Before costs
  netPnlPoints: number      // After costs
  grossPnlDollars: number
  netPnlDollars: number
  slippageCost: number      // Entry + Exit slippage in dollars
  fixedCost: number         // Commission + fees
  totalCost: number
  holdBars: number
  exitReason: 'STOP' | 'TARGET' | 'EOD' | 'TIMEOUT'
}

function simulateTrade(
  candles: Candle[],
  signal: PatternSignal,
  entryIndex: number,
  avgATR: number,
  maxBars: number = 40
): TradeResult | null {
  const stop = signal.atr * 1.5
  const target = signal.atr * 2

  // Calculate slippage for entry and exit
  const entrySlippage = SLIPPAGE.getSlippagePoints(signal.atr, avgATR)
  const exitSlippage = SLIPPAGE.getSlippagePoints(signal.atr, avgATR)
  const totalSlippagePoints = entrySlippage + exitSlippage

  // Fixed costs per contract
  const fixedCost = TRADING_COSTS.totalFixed
  const slippageCostDollars = totalSlippagePoints * ES_CONTRACT_VALUE

  // Adjusted entry price (worse due to slippage)
  const adjustedEntry = signal.direction === 'LONG'
    ? signal.entryPrice + entrySlippage  // Buy higher
    : signal.entryPrice - entrySlippage  // Sell lower

  let grossPnlPoints = 0
  let exitReason: TradeResult['exitReason'] = 'TIMEOUT'
  let holdBars = maxBars

  for (let i = 1; i <= maxBars && entryIndex + i < candles.length; i++) {
    const bar = candles[entryIndex + i]

    // End of day exit (must close by 3:50 PM)
    if (bar.hour >= 15.83 || bar.dateStr !== candles[entryIndex].dateStr) {
      // Exit at open with slippage
      grossPnlPoints = signal.direction === 'LONG'
        ? (bar.open - exitSlippage) - adjustedEntry
        : adjustedEntry - (bar.open + exitSlippage)
      exitReason = 'EOD'
      holdBars = i
      break
    }

    if (signal.direction === 'LONG') {
      // Stop hit (exit at stop - slippage)
      if (bar.low <= signal.entryPrice - stop) {
        grossPnlPoints = -stop - totalSlippagePoints
        exitReason = 'STOP'
        holdBars = i
        break
      }
      // Target hit (exit at target - slippage for exit)
      if (bar.high >= signal.entryPrice + target) {
        grossPnlPoints = target - totalSlippagePoints
        exitReason = 'TARGET'
        holdBars = i
        break
      }
    } else {
      // Stop hit
      if (bar.high >= signal.entryPrice + stop) {
        grossPnlPoints = -stop - totalSlippagePoints
        exitReason = 'STOP'
        holdBars = i
        break
      }
      // Target hit
      if (bar.low <= signal.entryPrice - target) {
        grossPnlPoints = target - totalSlippagePoints
        exitReason = 'TARGET'
        holdBars = i
        break
      }
    }
  }

  // If timeout, calculate based on last bar
  if (exitReason === 'TIMEOUT') {
    const lastBar = candles[Math.min(entryIndex + maxBars, candles.length - 1)]
    grossPnlPoints = signal.direction === 'LONG'
      ? (lastBar.close - exitSlippage) - adjustedEntry
      : adjustedEntry - (lastBar.close + exitSlippage)
  }

  // Calculate dollar amounts
  const grossPnlDollars = grossPnlPoints * ES_CONTRACT_VALUE
  const totalCost = fixedCost // Slippage already included in grossPnlPoints
  const netPnlDollars = grossPnlDollars - fixedCost
  const netPnlPoints = netPnlDollars / ES_CONTRACT_VALUE

  return {
    outcome: netPnlDollars > 0 ? 'WIN' : 'LOSS',
    grossPnlPoints,
    netPnlPoints,
    grossPnlDollars,
    netPnlDollars,
    slippageCost: slippageCostDollars,
    fixedCost,
    totalCost: fixedCost + slippageCostDollars,
    holdBars,
    exitReason
  }
}

// ============================================================================
// ANALYZE PATTERNS PER REGIME
// ============================================================================

interface PatternStats {
  wins: number
  losses: number
  grossWinPoints: number
  grossLossPoints: number
  netWinDollars: number
  netLossDollars: number
  totalSlippageCost: number
  totalFixedCost: number
  totalTrades: number
}

function analyzeRegimePatterns(
  candles: Candle[],
  segments: RegimeSegment[],
  targetRegime: MarketRegime
): RegimePatterns {
  // Get all segments for this regime
  const regimeSegments = segments.filter(s => s.regime === targetRegime)

  if (regimeSegments.length === 0) {
    return {
      regime: targetRegime,
      segments: 0,
      totalCandles: 0,
      patterns: [],
      bestPattern: null,
      totalExpectedValue: 0
    }
  }

  // Calculate indicators for full dataset
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)
  const rsi2 = calculateRSI(candles, 2)
  const bb = calculateBB(candles, 20)
  const vwap = calculateVWAP(candles)
  const atr = calculateATR(candles, 14)

  // Calculate average ATR for slippage model
  const avgATR = atr.slice(-500).reduce((sum, v) => sum + v, 0) / 500

  // Track results by pattern
  const patternResults: Map<string, PatternStats> = new Map()

  // Analyze each regime segment
  for (const segment of regimeSegments) {
    for (let i = segment.startIndex + 50; i < segment.endIndex - 40; i++) {
      const signals = detectPatterns(candles, i, ema20, ema50, rsi2, bb, vwap, atr)

      // Only consider patterns aligned with regime
      for (const signal of signals) {
        // In uptrend, prefer LONG. In downtrend, prefer SHORT. In sideways, both ok.
        if (targetRegime === 'UPTREND' && signal.direction === 'SHORT') continue
        if (targetRegime === 'DOWNTREND' && signal.direction === 'LONG') continue

        const result = simulateTrade(candles, signal, i, avgATR)
        if (!result) continue

        if (!patternResults.has(signal.patternId)) {
          patternResults.set(signal.patternId, {
            wins: 0,
            losses: 0,
            grossWinPoints: 0,
            grossLossPoints: 0,
            netWinDollars: 0,
            netLossDollars: 0,
            totalSlippageCost: 0,
            totalFixedCost: 0,
            totalTrades: 0
          })
        }

        const stats = patternResults.get(signal.patternId)!
        stats.totalTrades++
        stats.totalSlippageCost += result.slippageCost
        stats.totalFixedCost += result.fixedCost

        if (result.netPnlDollars > 0) {
          stats.wins++
          stats.grossWinPoints += result.grossPnlPoints
          stats.netWinDollars += result.netPnlDollars
        } else {
          stats.losses++
          stats.grossLossPoints += Math.abs(result.grossPnlPoints)
          stats.netLossDollars += Math.abs(result.netPnlDollars)
        }
      }
    }
  }

  // Convert to pattern results
  const patterns: PatternResult[] = []

  patternResults.forEach((stats, patternId) => {
    const total = stats.wins + stats.losses
    if (total < 5) return // Need minimum sample

    // Gross metrics (before costs)
    const winRate = (stats.wins / total) * 100
    const avgWin = stats.wins > 0 ? stats.grossWinPoints / stats.wins : 0
    const avgLoss = stats.losses > 0 ? stats.grossLossPoints / stats.losses : 0
    const grossProfitFactor = stats.grossLossPoints > 0 ? stats.grossWinPoints / stats.grossLossPoints : stats.grossWinPoints > 0 ? 999 : 0
    const grossExpectancy = (stats.grossWinPoints - stats.grossLossPoints) / total

    // Net metrics (after costs)
    const totalGrossPnL = (stats.grossWinPoints - stats.grossLossPoints) * ES_CONTRACT_VALUE
    const totalCosts = stats.totalSlippageCost + stats.totalFixedCost
    const totalNetPnL = stats.netWinDollars - stats.netLossDollars
    const netExpectancy = totalNetPnL / total
    const netProfitFactor = stats.netLossDollars > 0 ? stats.netWinDollars / stats.netLossDollars : stats.netWinDollars > 0 ? 999 : 0

    patterns.push({
      patternId,
      direction: patternId.includes('LONG') || (patternId.includes('BOUNCE') && !patternId.includes('SHORT')) ? 'LONG' : 'SHORT',
      wins: stats.wins,
      losses: stats.losses,
      winRate: Number(winRate.toFixed(1)),
      avgWinPoints: Number(avgWin.toFixed(2)),
      avgLossPoints: Number(avgLoss.toFixed(2)),
      profitFactor: Number(grossProfitFactor.toFixed(2)),
      expectancy: Number(grossExpectancy.toFixed(2)),
      // Net metrics
      netExpectancy: Number(netExpectancy.toFixed(2)),
      netProfitFactor: Number(netProfitFactor.toFixed(2)),
      totalGrossPnL: Number(totalGrossPnL.toFixed(2)),
      totalNetPnL: Number(totalNetPnL.toFixed(2)),
      totalCosts: Number(totalCosts.toFixed(2)),
      avgCostPerTrade: Number((totalCosts / total).toFixed(2)),
      avgSlippageCost: Number((stats.totalSlippageCost / total).toFixed(2)),
      avgFixedCost: Number((stats.totalFixedCost / total).toFixed(2))
    })
  })

  // Sort by NET expectancy (the real number that matters)
  patterns.sort((a, b) => b.netExpectancy - a.netExpectancy)

  // Filter profitable AFTER COSTS
  const profitablePatterns = patterns.filter(p => p.netExpectancy > 0 && p.netProfitFactor >= 1.0)

  return {
    regime: targetRegime,
    segments: regimeSegments.length,
    totalCandles: regimeSegments.reduce((sum, s) => sum + s.candleCount, 0),
    patterns: profitablePatterns,
    bestPattern: profitablePatterns.length > 0 ? profitablePatterns[0] : null,
    totalExpectedValue: profitablePatterns.reduce((sum, p) => sum + p.totalNetPnL, 0)
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '90')

    const candles = await fetchESData(days)

    if (candles.length < 500) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        candlesReceived: candles.length
      })
    }

    // Segment data by regime
    const segments = segmentByRegime(candles)

    // Analyze patterns for each regime
    const uptrendPatterns = analyzeRegimePatterns(candles, segments, 'UPTREND')
    const downtrendPatterns = analyzeRegimePatterns(candles, segments, 'DOWNTREND')
    const sidewaysPatterns = analyzeRegimePatterns(candles, segments, 'SIDEWAYS')

    // Detect current regime
    const ema20 = calculateEMA(candles, 20)
    const ema50 = calculateEMA(candles, 50)
    const lastIndex = candles.length - 1
    const ema20Slope = ((ema20[lastIndex] - ema20[lastIndex - 20]) / ema20[lastIndex - 20]) * 100

    let currentRegime: MarketRegime
    if (ema20Slope > 0.1 && ema20[lastIndex] > ema50[lastIndex]) {
      currentRegime = 'UPTREND'
    } else if (ema20Slope < -0.1 && ema20[lastIndex] < ema50[lastIndex]) {
      currentRegime = 'DOWNTREND'
    } else {
      currentRegime = 'SIDEWAYS'
    }

    // Get patterns for current regime
    const activePatterns = currentRegime === 'UPTREND' ? uptrendPatterns :
                          currentRegime === 'DOWNTREND' ? downtrendPatterns :
                          sidewaysPatterns

    // Calculate total costs across all patterns
    const allPatterns = [
      ...uptrendPatterns.patterns,
      ...downtrendPatterns.patterns,
      ...sidewaysPatterns.patterns
    ]
    const totalTrades = allPatterns.reduce((sum, p) => sum + p.wins + p.losses, 0)
    const totalCosts = allPatterns.reduce((sum, p) => sum + p.totalCosts, 0)
    const totalGrossPnL = allPatterns.reduce((sum, p) => sum + p.totalGrossPnL, 0)
    const totalNetPnL = allPatterns.reduce((sum, p) => sum + p.totalNetPnL, 0)

    return NextResponse.json({
      success: true,
      analysis: {
        periodDays: days,
        candlesAnalyzed: candles.length,
        segmentsFound: segments.length,
        dataSource: candles[0]?.open > 1000 ? 'ES=F (Real Futures)' : 'SPY (Scaled 10x)'
      },
      costModel: {
        description: 'REALISTIC APEX/RITHMIC COSTS',
        fixedCostsPerTrade: {
          commission: `$${TRADING_COSTS.commission}`,
          exchangeFee: `$${TRADING_COSTS.exchangeFee}`,
          nfaFee: `$${TRADING_COSTS.nfaFee}`,
          clearingFee: `$${TRADING_COSTS.clearingFee}`,
          total: `$${TRADING_COSTS.totalFixed.toFixed(2)}`
        },
        slippage: {
          baseTicks: SLIPPAGE.baseTicks,
          volatilityMultiplier: SLIPPAGE.volatilityMultiplier,
          estimatedPerSide: '$6.25-$12.50'
        },
        totalEstimatedCostPerTrade: '$15-$25'
      },
      segments: segments.map(s => ({
        regime: s.regime,
        dates: `${s.startDate} - ${s.endDate}`,
        candles: s.candleCount,
        priceChange: `${s.priceChange.toFixed(2)}%`
      })),
      currentRegime: {
        regime: currentRegime,
        ema20Slope: `${ema20Slope.toFixed(3)}%`,
        recommendation: currentRegime === 'UPTREND' ? 'Trade LONG patterns only' :
                       currentRegime === 'DOWNTREND' ? 'Trade SHORT patterns only' :
                       'Both directions - use mean reversion'
      },
      patternsByRegime: {
        UPTREND: uptrendPatterns,
        DOWNTREND: downtrendPatterns,
        SIDEWAYS: sidewaysPatterns
      },
      activePatterns: activePatterns,
      summary: {
        uptrendPatterns: uptrendPatterns.patterns.length,
        downtrendPatterns: downtrendPatterns.patterns.length,
        sidewaysPatterns: sidewaysPatterns.patterns.length,
        totalTrades,
        financials: {
          grossPnL: `$${totalGrossPnL.toFixed(2)}`,
          totalCosts: `$${totalCosts.toFixed(2)}`,
          netPnL: `$${totalNetPnL.toFixed(2)}`,
          avgCostPerTrade: totalTrades > 0 ? `$${(totalCosts / totalTrades).toFixed(2)}` : '$0',
          costImpact: totalGrossPnL > 0 ? `${((totalCosts / totalGrossPnL) * 100).toFixed(1)}% of gross profits` : 'N/A'
        },
        verdict: totalNetPnL > 0
          ? `✅ PROFITABLE AFTER COSTS: $${totalNetPnL.toFixed(0)} net profit`
          : `❌ NOT PROFITABLE: $${totalNetPnL.toFixed(0)} net loss`
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
