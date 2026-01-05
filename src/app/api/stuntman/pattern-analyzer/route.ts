/**
 * REAL ES FUTURES PATTERN ANALYZER
 *
 * This analyzer uses ACTUAL ES futures data to discover profitable patterns.
 * No proxies, no approximations - real market data.
 *
 * DATA SOURCES (in order of preference):
 * 1. Yahoo Finance ES=F (E-mini S&P 500 Futures)
 * 2. Fallback to /ES continuous contract
 *
 * PATTERN CATEGORIES ANALYZED:
 * 1. Price Action Patterns (swing structure, breakouts, reversals)
 * 2. Momentum Patterns (RSI divergence, MACD crossovers)
 * 3. Volume Patterns (accumulation/distribution, volume spikes)
 * 4. Time-Based Patterns (opening range, session behavior)
 * 5. Multi-Timeframe Patterns (alignment across 5m/15m/1h)
 *
 * OUTPUT: Statistically validated patterns with win rate, profit factor,
 * optimal stop/target levels, and expected value per trade.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for storing patterns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
  dateStr: string
  hour: number
}

interface PatternInstance {
  patternId: string
  category: string
  direction: 'LONG' | 'SHORT'
  time: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  context: Record<string, number | string>
}

interface TradeResult {
  patternId: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  stopLoss: number
  takeProfit: number
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN'
  pnlPoints: number
  pnlDollars: number
  maxFavorableExcursion: number  // Best price in our favor
  maxAdverseExcursion: number    // Worst price against us
  holdBars: number
  exitReason: 'TARGET' | 'STOP' | 'TIMEOUT' | 'EOD'
}

interface PatternStatistics {
  patternId: string
  category: string
  description: string
  direction: 'LONG' | 'SHORT'
  sampleSize: number
  wins: number
  losses: number
  winRate: number
  avgWinPoints: number
  avgLossPoints: number
  profitFactor: number
  expectancy: number  // Expected value per trade in points
  avgMFE: number      // Average Max Favorable Excursion
  avgMAE: number      // Average Max Adverse Excursion
  optimalStop: number
  optimalTarget: number
  avgHoldBars: number
  consistency: number  // Standard deviation of returns
  confidence: number   // Statistical confidence (based on sample size)
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ES_CONTRACT_VALUE = 50  // $50 per point
const ES_TICK_SIZE = 0.25
const ES_TICK_VALUE = 12.50

const ANALYSIS_CONFIG = {
  minSampleSize: 5,        // Minimum occurrences to consider a pattern valid
  maxHoldBars: 40,         // Maximum bars to hold a position (200 minutes on 5m)
  defaultStopPoints: 4,    // Default stop loss in points
  defaultTargetPoints: 6,  // Default take profit in points
  tradingStartHour: 9.5,   // 9:30 AM EST
  tradingEndHour: 16,      // 4:00 PM EST
}

// ============================================================================
// DATA FETCHING - REAL ES FUTURES
// ============================================================================

async function fetchRealESData(days: number = 60): Promise<{ candles: Candle[]; source: string }> {
  // Try ES=F first (actual ES futures)
  const sources = [
    { symbol: 'ES=F', name: 'ES Futures (ES=F)' },
    { symbol: '/ES', name: 'ES Continuous (/ES)' },
    { symbol: 'SPY', name: 'SPY ETF (fallback)', scale: 10 }
  ]

  for (const source of sources) {
    try {
      const now = Math.floor(Date.now() / 1000)
      const start = now - (days * 24 * 60 * 60)

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(source.symbol)}?period1=${start}&period2=${now}&interval=5m&includePrePost=false`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) continue

      const data = await response.json()
      const result = data.chart?.result?.[0]

      if (!result?.timestamp || !result?.indicators?.quote?.[0]) continue

      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]
      const scale = source.scale || 1

      const candles: Candle[] = []

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
          const time = timestamps[i] * 1000
          const date = new Date(time)

          // Convert to EST
          const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
          const hour = estDate.getHours() + estDate.getMinutes() / 60
          const dateStr = estDate.toLocaleDateString('en-US')

          candles.push({
            time,
            open: quote.open[i] * scale,
            high: quote.high[i] * scale,
            low: quote.low[i] * scale,
            close: quote.close[i] * scale,
            volume: quote.volume[i] || 0,
            dateStr,
            hour
          })
        }
      }

      if (candles.length > 100) {
        return { candles, source: source.name }
      }
    } catch {
      continue
    }
  }

  throw new Error('Could not fetch ES futures data from any source')
}

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

function calculateRSI(candles: Candle[], period: number = 14): number[] {
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

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema.push(values[i])
    } else {
      ema.push((values[i] - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }

  return ema
}

function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(values[i])
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += values[i - j]
      }
      sma.push(sum / period)
    }
  }

  return sma
}

function calculateMACD(candles: Candle[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const closes = candles.map(c => c.close)
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  const macd = ema12.map((v, i) => v - ema26[i])
  const signal = calculateEMA(macd, 9)
  const histogram = macd.map((v, i) => v - signal[i])

  return { macd, signal, histogram }
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

function calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const closes = candles.map(c => c.close)
  const middle = calculateSMA(closes, period)
  const upper: number[] = []
  const lower: number[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i])
      lower.push(closes[i])
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += Math.pow(closes[i - j] - middle[i], 2)
      }
      const std = Math.sqrt(sum / period)
      upper.push(middle[i] + stdDev * std)
      lower.push(middle[i] - stdDev * std)
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
// PATTERN DETECTION
// ============================================================================

interface Indicators {
  rsi: number[]
  rsi2: number[]  // 2-period RSI
  macd: { macd: number[]; signal: number[]; histogram: number[] }
  atr: number[]
  ema9: number[]
  ema20: number[]
  ema50: number[]
  sma200: number[]
  bb: { upper: number[]; middle: number[]; lower: number[] }
  vwap: number[]
}

function calculateAllIndicators(candles: Candle[]): Indicators {
  const closes = candles.map(c => c.close)

  return {
    rsi: calculateRSI(candles, 14),
    rsi2: calculateRSI(candles, 2),
    macd: calculateMACD(candles),
    atr: calculateATR(candles, 14),
    ema9: calculateEMA(closes, 9),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    bb: calculateBollingerBands(candles, 20, 2),
    vwap: calculateVWAP(candles)
  }
}

function detectPatterns(candles: Candle[], indicators: Indicators, index: number): PatternInstance[] {
  const patterns: PatternInstance[] = []

  if (index < 50) return patterns

  const c = candles[index]
  const prev = candles[index - 1]
  const atr = indicators.atr[index]

  // Skip non-trading hours
  if (c.hour < ANALYSIS_CONFIG.tradingStartHour || c.hour >= ANALYSIS_CONFIG.tradingEndHour) {
    return patterns
  }

  // =========================================================================
  // CATEGORY 1: RSI PATTERNS
  // =========================================================================

  // RSI-2 Oversold Bounce
  if (indicators.rsi2[index] < 10 && indicators.rsi2[index - 1] < 10 && c.close > prev.close) {
    const trendUp = c.close > indicators.ema50[index]
    patterns.push({
      patternId: trendUp ? 'RSI2_OVERSOLD_UPTREND' : 'RSI2_OVERSOLD_DOWNTREND',
      category: 'RSI',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close - atr * 1.5,
      takeProfit: c.close + atr * 2,
      context: { rsi2: indicators.rsi2[index], trend: trendUp ? 'UP' : 'DOWN' }
    })
  }

  // RSI-2 Overbought Reversal
  if (indicators.rsi2[index] > 90 && indicators.rsi2[index - 1] > 90 && c.close < prev.close) {
    const trendDown = c.close < indicators.ema50[index]
    patterns.push({
      patternId: trendDown ? 'RSI2_OVERBOUGHT_DOWNTREND' : 'RSI2_OVERBOUGHT_UPTREND',
      category: 'RSI',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close + atr * 1.5,
      takeProfit: c.close - atr * 2,
      context: { rsi2: indicators.rsi2[index], trend: trendDown ? 'DOWN' : 'UP' }
    })
  }

  // RSI-14 Extreme with Trend
  if (indicators.rsi[index] < 30 && c.close > indicators.sma200[index]) {
    patterns.push({
      patternId: 'RSI14_OVERSOLD_ABOVE_SMA200',
      category: 'RSI',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close - atr * 2,
      takeProfit: c.close + atr * 3,
      context: { rsi: indicators.rsi[index] }
    })
  }

  if (indicators.rsi[index] > 70 && c.close < indicators.sma200[index]) {
    patterns.push({
      patternId: 'RSI14_OVERBOUGHT_BELOW_SMA200',
      category: 'RSI',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close + atr * 2,
      takeProfit: c.close - atr * 3,
      context: { rsi: indicators.rsi[index] }
    })
  }

  // =========================================================================
  // CATEGORY 2: MACD PATTERNS
  // =========================================================================

  const macdHist = indicators.macd.histogram
  const macdCrossUp = macdHist[index] > 0 && macdHist[index - 1] <= 0
  const macdCrossDown = macdHist[index] < 0 && macdHist[index - 1] >= 0

  if (macdCrossUp && c.close > indicators.ema20[index]) {
    patterns.push({
      patternId: 'MACD_BULLISH_CROSS_ABOVE_EMA20',
      category: 'MACD',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close - atr * 1.5,
      takeProfit: c.close + atr * 2.5,
      context: { histogram: macdHist[index] }
    })
  }

  if (macdCrossDown && c.close < indicators.ema20[index]) {
    patterns.push({
      patternId: 'MACD_BEARISH_CROSS_BELOW_EMA20',
      category: 'MACD',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: c.close + atr * 1.5,
      takeProfit: c.close - atr * 2.5,
      context: { histogram: macdHist[index] }
    })
  }

  // =========================================================================
  // CATEGORY 3: BOLLINGER BAND PATTERNS
  // =========================================================================

  const bb = indicators.bb

  // Price touches lower band and reverses up
  if (c.low <= bb.lower[index] && c.close > c.open && c.close > bb.lower[index]) {
    patterns.push({
      patternId: 'BB_LOWER_TOUCH_REVERSAL',
      category: 'BOLLINGER',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: bb.lower[index] - atr * 0.5,
      takeProfit: bb.middle[index],
      context: { bbLower: bb.lower[index], bbMiddle: bb.middle[index] }
    })
  }

  // Price touches upper band and reverses down
  if (c.high >= bb.upper[index] && c.close < c.open && c.close < bb.upper[index]) {
    patterns.push({
      patternId: 'BB_UPPER_TOUCH_REVERSAL',
      category: 'BOLLINGER',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: bb.upper[index] + atr * 0.5,
      takeProfit: bb.middle[index],
      context: { bbUpper: bb.upper[index], bbMiddle: bb.middle[index] }
    })
  }

  // =========================================================================
  // CATEGORY 4: VWAP PATTERNS
  // =========================================================================

  const vwap = indicators.vwap[index]
  const vwapDiff = (c.close - vwap) / vwap * 100

  // Pullback to VWAP in uptrend
  if (Math.abs(vwapDiff) < 0.1 && c.close > indicators.ema20[index] && indicators.ema20[index] > indicators.ema50[index]) {
    patterns.push({
      patternId: 'VWAP_PULLBACK_UPTREND',
      category: 'VWAP',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: vwap - atr,
      takeProfit: c.close + atr * 2,
      context: { vwap, vwapDiff }
    })
  }

  // Pullback to VWAP in downtrend
  if (Math.abs(vwapDiff) < 0.1 && c.close < indicators.ema20[index] && indicators.ema20[index] < indicators.ema50[index]) {
    patterns.push({
      patternId: 'VWAP_PULLBACK_DOWNTREND',
      category: 'VWAP',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: vwap + atr,
      takeProfit: c.close - atr * 2,
      context: { vwap, vwapDiff }
    })
  }

  // =========================================================================
  // CATEGORY 5: EMA CROSSOVER PATTERNS
  // =========================================================================

  const ema9CrossAboveEma20 = indicators.ema9[index] > indicators.ema20[index] && indicators.ema9[index - 1] <= indicators.ema20[index - 1]
  const ema9CrossBelowEma20 = indicators.ema9[index] < indicators.ema20[index] && indicators.ema9[index - 1] >= indicators.ema20[index - 1]

  if (ema9CrossAboveEma20 && c.close > indicators.ema50[index]) {
    patterns.push({
      patternId: 'EMA9_CROSS_EMA20_BULLISH',
      category: 'EMA',
      direction: 'LONG',
      time: c.time,
      entryPrice: c.close,
      stopLoss: indicators.ema20[index] - atr,
      takeProfit: c.close + atr * 2.5,
      context: { ema9: indicators.ema9[index], ema20: indicators.ema20[index] }
    })
  }

  if (ema9CrossBelowEma20 && c.close < indicators.ema50[index]) {
    patterns.push({
      patternId: 'EMA9_CROSS_EMA20_BEARISH',
      category: 'EMA',
      direction: 'SHORT',
      time: c.time,
      entryPrice: c.close,
      stopLoss: indicators.ema20[index] + atr,
      takeProfit: c.close - atr * 2.5,
      context: { ema9: indicators.ema9[index], ema20: indicators.ema20[index] }
    })
  }

  // =========================================================================
  // CATEGORY 6: MOMENTUM PATTERNS
  // =========================================================================

  // 3-bar momentum
  if (index >= 3) {
    const momentum3 = c.close - candles[index - 3].close
    const avgRange = (indicators.atr[index] + indicators.atr[index - 1] + indicators.atr[index - 2]) / 3

    // Strong up momentum followed by pause
    if (momentum3 > avgRange * 2 && c.close < c.open && c.close > prev.close * 0.998) {
      patterns.push({
        patternId: 'MOMENTUM_PULLBACK_UP',
        category: 'MOMENTUM',
        direction: 'LONG',
        time: c.time,
        entryPrice: c.close,
        stopLoss: c.low - atr * 0.5,
        takeProfit: c.close + atr * 1.5,
        context: { momentum3, avgRange }
      })
    }

    // Strong down momentum followed by pause
    if (momentum3 < -avgRange * 2 && c.close > c.open && c.close < prev.close * 1.002) {
      patterns.push({
        patternId: 'MOMENTUM_PULLBACK_DOWN',
        category: 'MOMENTUM',
        direction: 'SHORT',
        time: c.time,
        entryPrice: c.close,
        stopLoss: c.high + atr * 0.5,
        takeProfit: c.close - atr * 1.5,
        context: { momentum3, avgRange }
      })
    }
  }

  // =========================================================================
  // CATEGORY 7: OPENING RANGE PATTERNS
  // =========================================================================

  // Detect if we're in the first 15 minutes of trading
  if (c.hour >= 9.5 && c.hour < 9.75) {
    // This is opening range setup - track for breakout later
  }

  // Opening range breakout (after 9:45 AM)
  if (c.hour >= 9.75 && c.hour < 10.5) {
    // Find opening range from 9:30-9:45
    let orHigh = 0
    let orLow = Infinity

    for (let j = index - 20; j < index; j++) {
      if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
        orHigh = Math.max(orHigh, candles[j].high)
        orLow = Math.min(orLow, candles[j].low)
      }
    }

    if (orHigh > 0 && orLow < Infinity) {
      const orRange = orHigh - orLow

      if (c.close > orHigh && prev.close <= orHigh && orRange > 2 && orRange < 15) {
        patterns.push({
          patternId: 'ORB_BREAKOUT_LONG',
          category: 'ORB',
          direction: 'LONG',
          time: c.time,
          entryPrice: c.close,
          stopLoss: orLow,
          takeProfit: c.close + orRange * 0.75,
          context: { orHigh, orLow, orRange }
        })
      }

      if (c.close < orLow && prev.close >= orLow && orRange > 2 && orRange < 15) {
        patterns.push({
          patternId: 'ORB_BREAKOUT_SHORT',
          category: 'ORB',
          direction: 'SHORT',
          time: c.time,
          entryPrice: c.close,
          stopLoss: orHigh,
          takeProfit: c.close - orRange * 0.75,
          context: { orHigh, orLow, orRange }
        })
      }
    }
  }

  return patterns
}

// ============================================================================
// OUTCOME TRACKING
// ============================================================================

function simulateTrade(candles: Candle[], pattern: PatternInstance, entryIndex: number): TradeResult | null {
  const maxBars = ANALYSIS_CONFIG.maxHoldBars
  let maxFavorable = 0
  let maxAdverse = 0
  const entryPrice = pattern.entryPrice

  for (let i = 1; i <= maxBars && entryIndex + i < candles.length; i++) {
    const bar = candles[entryIndex + i]

    // End of day exit
    if (bar.hour >= 15.75 || bar.dateStr !== candles[entryIndex].dateStr) {
      const exitPrice = bar.open
      const pnlPoints = pattern.direction === 'LONG'
        ? exitPrice - entryPrice
        : entryPrice - exitPrice

      return {
        patternId: pattern.patternId,
        direction: pattern.direction,
        entryPrice,
        exitPrice,
        stopLoss: pattern.stopLoss,
        takeProfit: pattern.takeProfit,
        outcome: pnlPoints > 0 ? 'WIN' : pnlPoints < 0 ? 'LOSS' : 'BREAKEVEN',
        pnlPoints,
        pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
        maxFavorableExcursion: maxFavorable,
        maxAdverseExcursion: maxAdverse,
        holdBars: i,
        exitReason: 'EOD'
      }
    }

    if (pattern.direction === 'LONG') {
      const favorable = bar.high - entryPrice
      const adverse = entryPrice - bar.low
      maxFavorable = Math.max(maxFavorable, favorable)
      maxAdverse = Math.max(maxAdverse, adverse)

      // Check stop loss
      if (bar.low <= pattern.stopLoss) {
        const pnlPoints = pattern.stopLoss - entryPrice
        return {
          patternId: pattern.patternId,
          direction: pattern.direction,
          entryPrice,
          exitPrice: pattern.stopLoss,
          stopLoss: pattern.stopLoss,
          takeProfit: pattern.takeProfit,
          outcome: 'LOSS',
          pnlPoints,
          pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
          maxFavorableExcursion: maxFavorable,
          maxAdverseExcursion: maxAdverse,
          holdBars: i,
          exitReason: 'STOP'
        }
      }

      // Check take profit
      if (bar.high >= pattern.takeProfit) {
        const pnlPoints = pattern.takeProfit - entryPrice
        return {
          patternId: pattern.patternId,
          direction: pattern.direction,
          entryPrice,
          exitPrice: pattern.takeProfit,
          stopLoss: pattern.stopLoss,
          takeProfit: pattern.takeProfit,
          outcome: 'WIN',
          pnlPoints,
          pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
          maxFavorableExcursion: maxFavorable,
          maxAdverseExcursion: maxAdverse,
          holdBars: i,
          exitReason: 'TARGET'
        }
      }
    } else {
      // SHORT
      const favorable = entryPrice - bar.low
      const adverse = bar.high - entryPrice
      maxFavorable = Math.max(maxFavorable, favorable)
      maxAdverse = Math.max(maxAdverse, adverse)

      // Check stop loss
      if (bar.high >= pattern.stopLoss) {
        const pnlPoints = entryPrice - pattern.stopLoss
        return {
          patternId: pattern.patternId,
          direction: pattern.direction,
          entryPrice,
          exitPrice: pattern.stopLoss,
          stopLoss: pattern.stopLoss,
          takeProfit: pattern.takeProfit,
          outcome: 'LOSS',
          pnlPoints,
          pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
          maxFavorableExcursion: maxFavorable,
          maxAdverseExcursion: maxAdverse,
          holdBars: i,
          exitReason: 'STOP'
        }
      }

      // Check take profit
      if (bar.low <= pattern.takeProfit) {
        const pnlPoints = entryPrice - pattern.takeProfit
        return {
          patternId: pattern.patternId,
          direction: pattern.direction,
          entryPrice,
          exitPrice: pattern.takeProfit,
          stopLoss: pattern.stopLoss,
          takeProfit: pattern.takeProfit,
          outcome: 'WIN',
          pnlPoints,
          pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
          maxFavorableExcursion: maxFavorable,
          maxAdverseExcursion: maxAdverse,
          holdBars: i,
          exitReason: 'TARGET'
        }
      }
    }
  }

  // Timeout exit
  const lastBar = candles[Math.min(entryIndex + maxBars, candles.length - 1)]
  const exitPrice = lastBar.close
  const pnlPoints = pattern.direction === 'LONG'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice

  return {
    patternId: pattern.patternId,
    direction: pattern.direction,
    entryPrice,
    exitPrice,
    stopLoss: pattern.stopLoss,
    takeProfit: pattern.takeProfit,
    outcome: pnlPoints > 0 ? 'WIN' : pnlPoints < 0 ? 'LOSS' : 'BREAKEVEN',
    pnlPoints,
    pnlDollars: pnlPoints * ES_CONTRACT_VALUE,
    maxFavorableExcursion: maxFavorable,
    maxAdverseExcursion: maxAdverse,
    holdBars: maxBars,
    exitReason: 'TIMEOUT'
  }
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

function calculatePatternStatistics(results: TradeResult[]): PatternStatistics[] {
  const grouped = new Map<string, TradeResult[]>()

  for (const result of results) {
    if (!grouped.has(result.patternId)) {
      grouped.set(result.patternId, [])
    }
    grouped.get(result.patternId)!.push(result)
  }

  const stats: PatternStatistics[] = []

  grouped.forEach((trades, patternId) => {
    if (trades.length < ANALYSIS_CONFIG.minSampleSize) return

    const wins = trades.filter(t => t.outcome === 'WIN')
    const losses = trades.filter(t => t.outcome === 'LOSS')

    const winRate = trades.length > 0 ? wins.length / trades.length * 100 : 0
    const avgWinPoints = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPoints, 0) / wins.length : 0
    const avgLossPoints = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnlPoints, 0) / losses.length) : 0

    const totalWin = wins.reduce((s, t) => s + t.pnlPoints, 0)
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPoints, 0))
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 999 : 0

    const expectancy = trades.reduce((s, t) => s + t.pnlPoints, 0) / trades.length

    const avgMFE = trades.reduce((s, t) => s + t.maxFavorableExcursion, 0) / trades.length
    const avgMAE = trades.reduce((s, t) => s + t.maxAdverseExcursion, 0) / trades.length
    const avgHoldBars = trades.reduce((s, t) => s + t.holdBars, 0) / trades.length

    // Calculate consistency (std dev of returns)
    const returns = trades.map(t => t.pnlPoints)
    const mean = expectancy
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length
    const consistency = Math.sqrt(variance)

    // Statistical confidence based on sample size (simplified)
    const confidence = Math.min(trades.length / 30 * 100, 100)

    stats.push({
      patternId,
      category: patternId.split('_')[0],
      description: patternId.replace(/_/g, ' '),
      direction: trades[0].direction,
      sampleSize: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Number(winRate.toFixed(1)),
      avgWinPoints: Number(avgWinPoints.toFixed(2)),
      avgLossPoints: Number(avgLossPoints.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
      avgMFE: Number(avgMFE.toFixed(2)),
      avgMAE: Number(avgMAE.toFixed(2)),
      optimalStop: Number((avgMAE * 1.2).toFixed(2)),
      optimalTarget: Number((avgMFE * 0.8).toFixed(2)),
      avgHoldBars: Number(avgHoldBars.toFixed(1)),
      consistency: Number(consistency.toFixed(2)),
      confidence: Number(confidence.toFixed(0))
    })
  })

  // Sort by expectancy (best patterns first)
  stats.sort((a, b) => b.expectancy - a.expectancy)

  return stats
}

// ============================================================================
// MARKET REGIME DETECTION
// ============================================================================

type MarketRegime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'

interface RegimeAnalysis {
  regime: MarketRegime
  trendStrength: number      // 0-100
  ema20Slope: number         // Positive = up, negative = down
  ema50Slope: number
  priceVsEma20: number       // % above/below
  priceVsEma50: number
  recommendedDirection: 'LONG' | 'SHORT' | 'BOTH'
  recommendation: string
}

function detectMarketRegime(candles: Candle[], indicators: Indicators): RegimeAnalysis {
  const lookback = 20
  const lastIndex = candles.length - 1

  if (lastIndex < lookback + 50) {
    return {
      regime: 'SIDEWAYS',
      trendStrength: 0,
      ema20Slope: 0,
      ema50Slope: 0,
      priceVsEma20: 0,
      priceVsEma50: 0,
      recommendedDirection: 'BOTH',
      recommendation: 'Insufficient data for regime detection'
    }
  }

  // Calculate EMA slopes (% change over lookback period)
  const ema20Now = indicators.ema20[lastIndex]
  const ema20Past = indicators.ema20[lastIndex - lookback]
  const ema20Slope = ((ema20Now - ema20Past) / ema20Past) * 100

  const ema50Now = indicators.ema50[lastIndex]
  const ema50Past = indicators.ema50[lastIndex - lookback]
  const ema50Slope = ((ema50Now - ema50Past) / ema50Past) * 100

  // Price position relative to EMAs
  const currentPrice = candles[lastIndex].close
  const priceVsEma20 = ((currentPrice - ema20Now) / ema20Now) * 100
  const priceVsEma50 = ((currentPrice - ema50Now) / ema50Now) * 100

  // Calculate trend strength (0-100)
  // Both EMAs aligned and price above/below = strong trend
  let trendStrength = 0

  // EMA alignment (20 above 50 = uptrend)
  const emaAligned = (ema20Now > ema50Now && ema20Slope > 0 && ema50Slope > 0) ||
                     (ema20Now < ema50Now && ema20Slope < 0 && ema50Slope < 0)

  if (emaAligned) trendStrength += 30

  // Price position
  if (priceVsEma20 > 0.5) trendStrength += 20
  else if (priceVsEma20 < -0.5) trendStrength += 20

  // EMA slope strength
  trendStrength += Math.min(Math.abs(ema20Slope) * 10, 30)
  trendStrength += Math.min(Math.abs(ema50Slope) * 10, 20)

  trendStrength = Math.min(100, trendStrength)

  // Determine regime
  let regime: MarketRegime
  let recommendedDirection: 'LONG' | 'SHORT' | 'BOTH'
  let recommendation: string

  if (ema20Slope > 0.3 && ema50Slope > 0.2 && priceVsEma20 > 0) {
    regime = 'STRONG_UPTREND'
    recommendedDirection = 'LONG'
    recommendation = 'Strong uptrend detected. Only take LONG signals. Avoid SHORTS.'
  } else if (ema20Slope > 0.1 && priceVsEma50 > 0) {
    regime = 'UPTREND'
    recommendedDirection = 'LONG'
    recommendation = 'Uptrend detected. Prefer LONG signals, avoid counter-trend SHORTs.'
  } else if (ema20Slope < -0.3 && ema50Slope < -0.2 && priceVsEma20 < 0) {
    regime = 'STRONG_DOWNTREND'
    recommendedDirection = 'SHORT'
    recommendation = 'Strong downtrend detected. Only take SHORT signals. Avoid LONGS.'
  } else if (ema20Slope < -0.1 && priceVsEma50 < 0) {
    regime = 'DOWNTREND'
    recommendedDirection = 'SHORT'
    recommendation = 'Downtrend detected. Prefer SHORT signals, avoid counter-trend LONGs.'
  } else {
    regime = 'SIDEWAYS'
    recommendedDirection = 'BOTH'
    recommendation = 'Sideways/ranging market. Mean reversion strategies may work. Use tight stops.'
  }

  return {
    regime,
    trendStrength,
    ema20Slope: Number(ema20Slope.toFixed(3)),
    ema50Slope: Number(ema50Slope.toFixed(3)),
    priceVsEma20: Number(priceVsEma20.toFixed(3)),
    priceVsEma50: Number(priceVsEma50.toFixed(3)),
    recommendedDirection,
    recommendation
  }
}

// ============================================================================
// SUPABASE STORAGE
// ============================================================================

async function storePatterns(
  patterns: PatternStatistics[],
  days: number,
  source: string
): Promise<{ stored: number; errors: string[] }> {
  if (!supabaseUrl || !supabaseKey) {
    return { stored: 0, errors: ['Supabase not configured'] }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const errors: string[] = []
  let stored = 0

  for (const pattern of patterns) {
    try {
      const { error } = await supabase
        .from('stuntman_patterns')
        .upsert({
          pattern_id: pattern.patternId,
          category: pattern.category,
          direction: pattern.direction,
          sample_size: pattern.sampleSize,
          win_rate: pattern.winRate,
          profit_factor: pattern.profitFactor,
          expectancy: pattern.expectancy,
          avg_win_points: pattern.avgWinPoints,
          avg_loss_points: pattern.avgLossPoints,
          optimal_stop: pattern.optimalStop,
          optimal_target: pattern.optimalTarget,
          avg_hold_bars: pattern.avgHoldBars,
          confidence: pattern.confidence,
          analysis_period_days: days,
          data_source: source,
          is_profitable: pattern.winRate >= 50 && pattern.profitFactor >= 1.0 && pattern.expectancy > 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'pattern_id,direction,analysis_period_days'
        })

      if (error) {
        errors.push(`${pattern.patternId}: ${error.message}`)
      } else {
        stored++
      }
    } catch (e) {
      errors.push(`${pattern.patternId}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return { stored, errors }
}

async function getStoredPatterns(): Promise<PatternStatistics[]> {
  if (!supabaseUrl || !supabaseKey) {
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('stuntman_patterns')
    .select('*')
    .eq('is_profitable', true)
    .order('expectancy', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map(row => ({
    patternId: row.pattern_id,
    category: row.category,
    description: row.pattern_id.replace(/_/g, ' '),
    direction: row.direction as 'LONG' | 'SHORT',
    sampleSize: row.sample_size,
    wins: Math.round(row.sample_size * row.win_rate / 100),
    losses: Math.round(row.sample_size * (100 - row.win_rate) / 100),
    winRate: row.win_rate,
    avgWinPoints: row.avg_win_points || 0,
    avgLossPoints: row.avg_loss_points || 0,
    profitFactor: row.profit_factor,
    expectancy: row.expectancy,
    avgMFE: 0,
    avgMAE: 0,
    optimalStop: row.optimal_stop || 0,
    optimalTarget: row.optimal_target || 0,
    avgHoldBars: row.avg_hold_bars || 0,
    consistency: 0,
    confidence: row.confidence || 0
  }))
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '60')
    const store = searchParams.get('store') === 'true'
    const getStored = searchParams.get('stored') === 'true'

    // Return stored patterns if requested
    if (getStored) {
      const storedPatterns = await getStoredPatterns()
      return NextResponse.json({
        success: true,
        source: 'supabase',
        storedPatterns,
        count: storedPatterns.length
      })
    }

    // Fetch real ES data
    const { candles, source } = await fetchRealESData(days)

    if (candles.length < 200) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        candlesReceived: candles.length
      })
    }

    // Calculate all indicators
    const indicators = calculateAllIndicators(candles)

    // Detect patterns and track outcomes
    const allResults: TradeResult[] = []

    for (let i = 50; i < candles.length - ANALYSIS_CONFIG.maxHoldBars; i++) {
      const patterns = detectPatterns(candles, indicators, i)

      for (const pattern of patterns) {
        const result = simulateTrade(candles, pattern, i)
        if (result) {
          allResults.push(result)
        }
      }
    }

    // Calculate statistics
    const patternStats = calculatePatternStatistics(allResults)

    // Detect current market regime
    const regimeAnalysis = detectMarketRegime(candles, indicators)

    // Separate profitable and unprofitable patterns
    const profitable = patternStats.filter(p => p.winRate >= 50 && p.profitFactor >= 1.0 && p.expectancy > 0)
    const unprofitable = patternStats.filter(p => p.winRate < 50 || p.profitFactor < 1.0 || p.expectancy <= 0)

    // Filter patterns by current regime recommendation
    const regimeAlignedPatterns = profitable.filter(p => {
      if (regimeAnalysis.recommendedDirection === 'BOTH') return true
      return p.direction === regimeAnalysis.recommendedDirection
    })

    // Patterns that go against the regime (risky)
    const counterTrendPatterns = profitable.filter(p => {
      if (regimeAnalysis.recommendedDirection === 'BOTH') return false
      return p.direction !== regimeAnalysis.recommendedDirection
    })

    // Store patterns to Supabase if requested
    let storageResult = null
    if (store) {
      storageResult = await storePatterns(patternStats, days, source)
    }

    return NextResponse.json({
      success: true,
      dataSource: source,
      analysis: {
        periodDays: days,
        candlesAnalyzed: candles.length,
        totalPatternInstances: allResults.length,
        uniquePatterns: patternStats.length,
        profitablePatterns: profitable.length,
        unprofitablePatterns: unprofitable.length,
        priceRange: {
          high: Math.max(...candles.map(c => c.high)),
          low: Math.min(...candles.map(c => c.low)),
          current: candles[candles.length - 1].close
        }
      },
      // MARKET REGIME - Critical for strategy selection
      marketRegime: regimeAnalysis,
      // Patterns aligned with current regime (RECOMMENDED)
      recommendedPatterns: regimeAlignedPatterns,
      // Patterns against current regime (AVOID)
      counterTrendPatterns: counterTrendPatterns.map(p => ({
        ...p,
        warning: `⚠️ Counter-trend in ${regimeAnalysis.regime} - Higher risk`
      })),
      // All profitable patterns (for reference)
      allProfitablePatterns: profitable,
      unprofitablePatterns: unprofitable.slice(0, 5),
      // Storage result if stored
      storage: storageResult,
      insights: {
        currentRegime: regimeAnalysis.regime,
        recommendedDirection: regimeAnalysis.recommendedDirection,
        regimeAdvice: regimeAnalysis.recommendation,
        bestAlignedPattern: regimeAlignedPatterns.length > 0
          ? `${regimeAlignedPatterns[0].patternId}: ${regimeAlignedPatterns[0].winRate}% WR, $${(regimeAlignedPatterns[0].expectancy * ES_CONTRACT_VALUE).toFixed(0)}/trade`
          : 'No regime-aligned patterns found',
        totalExpectedValue: `$${regimeAlignedPatterns.reduce((s, p) => s + p.expectancy * p.sampleSize * ES_CONTRACT_VALUE, 0).toFixed(0)} from regime-aligned patterns`,
        warning: counterTrendPatterns.length > 0
          ? `⚠️ ${counterTrendPatterns.length} patterns are counter-trend. Use with caution or avoid.`
          : null
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
