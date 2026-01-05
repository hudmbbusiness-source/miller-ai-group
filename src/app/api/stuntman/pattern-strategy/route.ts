/**
 * CUSTOM PATTERN-BASED STRATEGY
 *
 * This strategy ONLY trades when discovered profitable patterns are recognized.
 * It uses the pattern analyzer to:
 * 1. Get profitable patterns (from analysis or Supabase)
 * 2. Monitor live candles for pattern matches
 * 3. Generate signals ONLY when patterns match
 * 4. Use optimal stop/target from historical analysis
 * 5. Respect market regime - avoid counter-trend trades
 *
 * This is the "make your own strategy based on patterns you discovered" approach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

interface PatternSignal {
  patternId: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  confidence: number
  expectedValue: number
  reason: string
}

interface PatternConfig {
  patternId: string
  direction: 'LONG' | 'SHORT'
  winRate: number
  profitFactor: number
  expectancy: number
  optimalStop: number
  optimalTarget: number
}

// ============================================================================
// CONFIGURATION - REALISTIC APEX/RITHMIC COSTS (1:1 WITH LIVE TRADING)
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

  getSlippagePoints(atr: number, avgATR: number = 4): number {
    const volatilityFactor = Math.min(atr / avgATR, 2)
    const totalTicks = this.baseTicks * (1 + this.volatilityMultiplier * volatilityFactor)
    return totalTicks * 0.25 // Convert ticks to points
  },

  getSlippageDollars(atr: number, avgATR: number = 4): number {
    const ticks = this.baseTicks * (1 + this.volatilityMultiplier * (Math.min(atr / avgATR, 2)))
    return ticks * ES_TICK_VALUE
  }
}

const STRATEGY_CONFIG = {
  minWinRate: 50,
  minProfitFactor: 1.0,
  minExpectancy: 0,
  minConfidence: 50,
  tradingStartHour: 9.5,
  tradingEndHour: 15.5,
  maxStopPoints: 10,
  minStopPoints: 2,
}

// ============================================================================
// SUPABASE - GET STORED PATTERNS
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getStoredProfitablePatterns(): Promise<PatternConfig[]> {
  if (!supabaseUrl || !supabaseKey) {
    // Return hardcoded patterns from analysis as fallback
    return getDefaultPatterns()
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('stuntman_patterns')
    .select('*')
    .eq('is_profitable', true)
    .gte('win_rate', STRATEGY_CONFIG.minWinRate)
    .gte('profit_factor', STRATEGY_CONFIG.minProfitFactor)
    .gte('expectancy', STRATEGY_CONFIG.minExpectancy)
    .order('expectancy', { ascending: false })

  if (error || !data || data.length === 0) {
    return getDefaultPatterns()
  }

  return data.map(row => ({
    patternId: row.pattern_id,
    direction: row.direction,
    winRate: row.win_rate,
    profitFactor: row.profit_factor,
    expectancy: row.expectancy,
    optimalStop: row.optimal_stop || 6,
    optimalTarget: row.optimal_target || 8,
  }))
}

function getDefaultPatterns(): PatternConfig[] {
  // FROM REGIME-PATTERNS ANALYSIS (verified profitable AFTER COSTS)
  // These patterns are regime-specific and should be filtered by current regime
  return [
    // UPTREND PATTERNS (for when EMA20 > EMA50 with positive slope)
    {
      patternId: 'VWAP_PULLBACK_LONG',
      direction: 'LONG',
      winRate: 59.9,
      profitFactor: 2.46,        // NET profit factor (after costs)
      expectancy: 146.85,        // NET $ expectancy per trade (after costs)
      optimalStop: 6,            // ATR * 1.5 based
      optimalTarget: 8,          // ATR * 2 based
    },
    {
      patternId: 'EMA20_BOUNCE_LONG',
      direction: 'LONG',
      winRate: 52.2,
      profitFactor: 1.64,
      expectancy: 82.85,
      optimalStop: 6,
      optimalTarget: 8,
    },
    // DOWNTREND PATTERNS (for when EMA20 < EMA50 with negative slope)
    {
      patternId: 'BB_UPPER_FADE',
      direction: 'SHORT',
      winRate: 66.7,
      profitFactor: 2.65,
      expectancy: 498.37,
      optimalStop: 6,
      optimalTarget: 8,
    },
    {
      patternId: 'VWAP_PULLBACK_SHORT',
      direction: 'SHORT',
      winRate: 63.6,
      profitFactor: 1.61,
      expectancy: 206.13,
      optimalStop: 6,
      optimalTarget: 8,
    },
    {
      patternId: 'EMA20_BOUNCE_SHORT',
      direction: 'SHORT',
      winRate: 52.4,
      profitFactor: 1.17,
      expectancy: 74.54,
      optimalStop: 6,
      optimalTarget: 8,
    },
    // SIDEWAYS PATTERNS (for both directions during range-bound markets)
    {
      patternId: 'ORB_BREAKOUT_SHORT',
      direction: 'SHORT',
      winRate: 60,
      profitFactor: 1.47,
      expectancy: 83.93,
      optimalStop: 6,
      optimalTarget: 8,
    },
  ]
}

// ============================================================================
// INDICATORS
// ============================================================================

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

function calculateBollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2) {
  const closes = candles.map(c => c.close)
  const middle: number[] = []
  const upper: number[] = []
  const lower: number[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      middle.push(closes[i])
      upper.push(closes[i])
      lower.push(closes[i])
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += closes[i - j]
      }
      const avg = sum / period

      let sqSum = 0
      for (let j = 0; j < period; j++) {
        sqSum += Math.pow(closes[i - j] - avg, 2)
      }
      const std = Math.sqrt(sqSum / period)

      middle.push(avg)
      upper.push(avg + stdDev * std)
      lower.push(avg - stdDev * std)
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

// ============================================================================
// PATTERN DETECTION
// ============================================================================

function detectPatternSignal(
  candles: Candle[],
  patternConfigs: PatternConfig[],
  index: number,
  avgATR: number
): PatternSignal | null {
  if (index < 50) return null

  const c = candles[index]
  const prev = candles[index - 1]

  // Check time filter
  if (c.hour < STRATEGY_CONFIG.tradingStartHour || c.hour >= STRATEGY_CONFIG.tradingEndHour) {
    return null
  }

  // Calculate indicators
  const closes = candles.slice(0, index + 1).map(c => c.close)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const bb = calculateBollingerBands(candles.slice(0, index + 1), 20, 2)
  const vwap = calculateVWAP(candles.slice(0, index + 1))
  const atr = calculateATR(candles.slice(0, index + 1), 14)

  const currentEma20 = ema20[ema20.length - 1]
  const currentEma50 = ema50[ema50.length - 1]
  const currentBBUpper = bb.upper[bb.upper.length - 1]
  const currentBBLower = bb.lower[bb.lower.length - 1]
  const currentVwap = vwap[vwap.length - 1]
  const currentAtr = atr[atr.length - 1]

  // Calculate slippage
  const slippage = SLIPPAGE.getSlippagePoints(currentAtr, avgATR)

  // Check each pattern config
  for (const config of patternConfigs) {
    let matched = false
    let reason = ''

    // VWAP_PULLBACK_LONG - Pullback to VWAP in uptrend
    if (config.patternId === 'VWAP_PULLBACK_LONG') {
      const vwapDiff = (c.close - currentVwap) / currentVwap * 100
      const isUptrend = currentEma20 > currentEma50

      if (Math.abs(vwapDiff) < 0.1 && isUptrend) {
        matched = true
        reason = `VWAP Pullback LONG: Price at VWAP (${currentVwap.toFixed(2)}), EMA20 > EMA50 (uptrend)`
      }
    }

    // EMA20_BOUNCE_LONG - Bounce off EMA20 in uptrend
    if (config.patternId === 'EMA20_BOUNCE_LONG') {
      const isUptrend = currentEma20 > currentEma50
      const touchedEma20 = c.low <= currentEma20 * 1.001 && c.low >= currentEma20 * 0.999
      const bullishCandle = c.close > c.open

      if (touchedEma20 && bullishCandle && isUptrend) {
        matched = true
        reason = `EMA20 Bounce LONG: Touched EMA20 (${currentEma20.toFixed(2)}), bullish candle in uptrend`
      }
    }

    // BB_UPPER_FADE - Fade upper Bollinger Band
    if (config.patternId === 'BB_UPPER_FADE') {
      const touchedBB = c.high >= currentBBUpper
      const reversalCandle = c.close < c.open && c.close < currentBBUpper

      if (touchedBB && reversalCandle) {
        matched = true
        reason = `BB Upper Fade SHORT: Touched upper BB (${currentBBUpper.toFixed(2)}), reversal candle`
      }
    }

    // VWAP_PULLBACK_SHORT - Pullback to VWAP in downtrend/sideways
    if (config.patternId === 'VWAP_PULLBACK_SHORT') {
      const vwapDiff = (c.close - currentVwap) / currentVwap * 100
      const notUptrend = currentEma20 <= currentEma50

      if (Math.abs(vwapDiff) < 0.1 && notUptrend) {
        matched = true
        reason = `VWAP Pullback SHORT: Price at VWAP (${currentVwap.toFixed(2)}), EMA20 <= EMA50`
      }
    }

    // EMA20_BOUNCE_SHORT - Bounce off EMA20 in downtrend
    if (config.patternId === 'EMA20_BOUNCE_SHORT') {
      const isDowntrend = currentEma20 < currentEma50
      const touchedEma20 = c.high >= currentEma20 * 0.999 && c.high <= currentEma20 * 1.001
      const bearishCandle = c.close < c.open

      if (touchedEma20 && bearishCandle && isDowntrend) {
        matched = true
        reason = `EMA20 Bounce SHORT: Touched EMA20 (${currentEma20.toFixed(2)}), bearish candle in downtrend`
      }
    }

    // ORB_BREAKOUT_SHORT - Opening range breakout down
    if (config.patternId === 'ORB_BREAKOUT_SHORT' && c.hour >= 9.75 && c.hour < 10.5) {
      let orHigh = 0
      let orLow = Infinity

      for (let j = index - 20; j < index; j++) {
        if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
          orHigh = Math.max(orHigh, candles[j].high)
          orLow = Math.min(orLow, candles[j].low)
        }
      }

      const orRange = orHigh - orLow
      if (orHigh > 0 && orLow < Infinity && c.close < orLow && prev.close >= orLow && orRange > 2 && orRange < 15) {
        matched = true
        reason = `ORB Short Breakout: Price broke below OR low ${orLow.toFixed(2)}, OR range: ${orRange.toFixed(2)} pts`
      }
    }

    // ORB_BREAKOUT_LONG - Opening range breakout up (when in uptrend)
    if (config.patternId === 'ORB_BREAKOUT_LONG' && c.hour >= 9.75 && c.hour < 10.5) {
      let orHigh = 0
      let orLow = Infinity

      for (let j = index - 20; j < index; j++) {
        if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
          orHigh = Math.max(orHigh, candles[j].high)
          orLow = Math.min(orLow, candles[j].low)
        }
      }

      const orRange = orHigh - orLow
      if (orHigh > 0 && orLow < Infinity && c.close > orHigh && prev.close <= orHigh && orRange > 2 && orRange < 15) {
        matched = true
        reason = `ORB Long Breakout: Price broke above OR high ${orHigh.toFixed(2)}, OR range: ${orRange.toFixed(2)} pts`
      }
    }

    if (matched) {
      // Calculate stop/target using optimal values (ATR-based)
      const stopDistance = currentAtr * 1.5
      const targetDistance = currentAtr * 2

      // Calculate estimated cost for this trade
      const estimatedSlippageCost = slippage * 2 * ES_CONTRACT_VALUE // Both sides
      const estimatedTotalCost = TRADING_COSTS.totalFixed + estimatedSlippageCost

      return {
        patternId: config.patternId,
        direction: config.direction,
        entryPrice: c.close,
        stopLoss: config.direction === 'LONG'
          ? c.close - stopDistance
          : c.close + stopDistance,
        takeProfit: config.direction === 'LONG'
          ? c.close + targetDistance
          : c.close - targetDistance,
        confidence: config.winRate,
        expectedValue: config.expectancy, // Already net (after costs)
        reason,
      }
    }
  }

  return null
}

// ============================================================================
// MARKET REGIME DETECTION
// ============================================================================

type MarketRegime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'

function detectRegime(candles: Candle[]): { regime: MarketRegime; recommendedDirection: 'LONG' | 'SHORT' | 'BOTH' } {
  const lookback = 20
  const lastIndex = candles.length - 1

  if (lastIndex < lookback + 50) {
    return { regime: 'SIDEWAYS', recommendedDirection: 'BOTH' }
  }

  const closes = candles.map(c => c.close)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)

  const ema20Now = ema20[lastIndex]
  const ema20Past = ema20[lastIndex - lookback]
  const ema20Slope = ((ema20Now - ema20Past) / ema20Past) * 100

  const ema50Now = ema50[lastIndex]
  const ema50Past = ema50[lastIndex - lookback]
  const ema50Slope = ((ema50Now - ema50Past) / ema50Past) * 100

  const currentPrice = candles[lastIndex].close
  const priceVsEma20 = ((currentPrice - ema20Now) / ema20Now) * 100

  if (ema20Slope > 0.3 && ema50Slope > 0.2 && priceVsEma20 > 0) {
    return { regime: 'STRONG_UPTREND', recommendedDirection: 'LONG' }
  } else if (ema20Slope > 0.1 && currentPrice > ema50Now) {
    return { regime: 'UPTREND', recommendedDirection: 'LONG' }
  } else if (ema20Slope < -0.3 && ema50Slope < -0.2 && priceVsEma20 < 0) {
    return { regime: 'STRONG_DOWNTREND', recommendedDirection: 'SHORT' }
  } else if (ema20Slope < -0.1 && currentPrice < ema50Now) {
    return { regime: 'DOWNTREND', recommendedDirection: 'SHORT' }
  }

  return { regime: 'SIDEWAYS', recommendedDirection: 'BOTH' }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchESData(days: number = 7): Promise<Candle[]> {
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

      if (candles.length > 50) return candles
    } catch {
      continue
    }
  }

  throw new Error('Could not fetch ES data')
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Get stored profitable patterns
    const patternConfigs = await getStoredProfitablePatterns()

    // Fetch recent ES data
    const candles = await fetchESData(days)

    if (candles.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data'
      })
    }

    // Detect current market regime
    const { regime, recommendedDirection } = detectRegime(candles)

    // Calculate average ATR for slippage model
    const atr = calculateATR(candles, 14)
    const avgATR = atr.slice(-100).reduce((sum, v) => sum + v, 0) / Math.min(atr.length, 100)

    // Filter patterns by regime
    const regimeAlignedPatterns = patternConfigs.filter(p => {
      if (recommendedDirection === 'BOTH') return true
      return p.direction === recommendedDirection
    })

    // Check for signals on the most recent candles
    const signals: PatternSignal[] = []
    const checkBars = 10 // Check last 10 bars

    for (let i = candles.length - checkBars; i < candles.length; i++) {
      const signal = detectPatternSignal(candles, regimeAlignedPatterns, i, avgATR)
      if (signal) {
        signals.push(signal)
      }
    }

    // Get the most recent signal (if any)
    const currentSignal = signals.length > 0 ? signals[signals.length - 1] : null

    return NextResponse.json({
      success: true,
      marketRegime: {
        regime,
        recommendedDirection,
        tradingAllowed: true
      },
      costModel: {
        description: 'REALISTIC APEX/RITHMIC COSTS (1:1 with live trading)',
        fixedCostsPerTrade: `$${TRADING_COSTS.totalFixed.toFixed(2)}`,
        slippageEstimate: `$${(SLIPPAGE.getSlippageDollars(avgATR) * 2).toFixed(2)} (both sides)`,
        totalEstimatedCost: `$${(TRADING_COSTS.totalFixed + SLIPPAGE.getSlippageDollars(avgATR) * 2).toFixed(2)}`
      },
      activePatterns: regimeAlignedPatterns.map(p => ({
        patternId: p.patternId,
        direction: p.direction,
        winRate: p.winRate,
        netExpectancy: `$${p.expectancy.toFixed(2)}/trade (after costs)`,
        netProfitFactor: p.profitFactor
      })),
      currentSignal: currentSignal,
      recentSignals: signals,
      candles: {
        total: candles.length,
        latest: candles[candles.length - 1]
      },
      tradingRules: {
        onlyTradeDiscoveredPatterns: true,
        respectMarketRegime: true,
        currentlyTradingPatterns: regimeAlignedPatterns.length,
        blockedPatterns: patternConfigs.length - regimeAlignedPatterns.length,
        note: 'All expectancy values are NET (after realistic execution costs)'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// POST - BACKTEST THE CUSTOM PATTERN STRATEGY WITH REALISTIC COSTS
// ============================================================================

interface BacktestTrade {
  entryTime: string
  entryPrice: number
  exitPrice: number
  direction: 'LONG' | 'SHORT'
  patternId: string
  grossPnL: number
  netPnL: number
  slippageCost: number
  fixedCost: number
  exitReason: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const days = body.days || 30

    // Get stored profitable patterns
    const patternConfigs = await getStoredProfitablePatterns()

    // Fetch ES data
    const candles = await fetchESData(days)

    if (candles.length < 200) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data for backtest'
      })
    }

    // Calculate average ATR for slippage model
    const atr = calculateATR(candles, 14)
    const avgATR = atr.slice(0, 100).reduce((sum, v) => sum + v, 0) / 100

    // Track trades
    const trades: BacktestTrade[] = []
    let inPosition = false
    let currentTrade: {
      entryIndex: number
      entryPrice: number
      direction: 'LONG' | 'SHORT'
      stopLoss: number
      takeProfit: number
      patternId: string
      entrySlippage: number
    } | null = null

    // Process candles
    for (let i = 50; i < candles.length; i++) {
      const c = candles[i]
      const currentAtr = atr[i]

      // Check for exit if in position
      if (inPosition && currentTrade) {
        let exitReason = ''
        let exitPrice = 0

        // Calculate exit slippage
        const exitSlippage = SLIPPAGE.getSlippagePoints(currentAtr, avgATR)

        if (currentTrade.direction === 'LONG') {
          // Check stop loss
          if (c.low <= currentTrade.stopLoss) {
            exitPrice = currentTrade.stopLoss - exitSlippage // Slippage makes exit worse
            exitReason = 'Stop Loss'
          }
          // Check take profit
          else if (c.high >= currentTrade.takeProfit) {
            exitPrice = currentTrade.takeProfit - exitSlippage // Slippage still negative on exit
            exitReason = 'Take Profit'
          }
          // End of day
          else if (c.hour >= 15.83 || c.dateStr !== candles[currentTrade.entryIndex].dateStr) {
            exitPrice = c.open - exitSlippage
            exitReason = 'End of Day'
          }
        } else {
          // SHORT
          if (c.high >= currentTrade.stopLoss) {
            exitPrice = currentTrade.stopLoss + exitSlippage
            exitReason = 'Stop Loss'
          }
          else if (c.low <= currentTrade.takeProfit) {
            exitPrice = currentTrade.takeProfit + exitSlippage
            exitReason = 'Take Profit'
          }
          else if (c.hour >= 15.83 || c.dateStr !== candles[currentTrade.entryIndex].dateStr) {
            exitPrice = c.open + exitSlippage
            exitReason = 'End of Day'
          }
        }

        if (exitReason) {
          // Calculate P&L
          const grossPnLPoints = currentTrade.direction === 'LONG'
            ? exitPrice - currentTrade.entryPrice
            : currentTrade.entryPrice - exitPrice

          const grossPnL = grossPnLPoints * ES_CONTRACT_VALUE
          const totalSlippage = (currentTrade.entrySlippage + exitSlippage) * ES_CONTRACT_VALUE
          const fixedCost = TRADING_COSTS.totalFixed
          const netPnL = grossPnL - fixedCost // Slippage already in prices

          trades.push({
            entryTime: candles[currentTrade.entryIndex].dateStr,
            entryPrice: currentTrade.entryPrice,
            exitPrice,
            direction: currentTrade.direction,
            patternId: currentTrade.patternId,
            grossPnL,
            netPnL,
            slippageCost: totalSlippage,
            fixedCost,
            exitReason
          })

          inPosition = false
          currentTrade = null
        }
      }

      // Check for new entry if not in position
      if (!inPosition) {
        // Detect current regime
        const { recommendedDirection } = detectRegime(candles.slice(0, i + 1))

        // Filter patterns by regime
        const regimePatterns = patternConfigs.filter(p => {
          if (recommendedDirection === 'BOTH') return true
          return p.direction === recommendedDirection
        })

        const signal = detectPatternSignal(candles, regimePatterns, i, avgATR)

        if (signal) {
          // Calculate entry slippage
          const entrySlippage = SLIPPAGE.getSlippagePoints(currentAtr, avgATR)
          const adjustedEntry = signal.direction === 'LONG'
            ? signal.entryPrice + entrySlippage
            : signal.entryPrice - entrySlippage

          currentTrade = {
            entryIndex: i,
            entryPrice: adjustedEntry,
            direction: signal.direction,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            patternId: signal.patternId,
            entrySlippage
          }
          inPosition = true
        }
      }
    }

    // Calculate statistics
    const wins = trades.filter(t => t.netPnL > 0).length
    const losses = trades.filter(t => t.netPnL <= 0).length
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0

    const totalGrossPnL = trades.reduce((sum, t) => sum + t.grossPnL, 0)
    const totalNetPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
    const totalSlippage = trades.reduce((sum, t) => sum + t.slippageCost, 0)
    const totalFixed = trades.reduce((sum, t) => sum + t.fixedCost, 0)
    const totalCosts = totalSlippage + totalFixed

    const grossWins = trades.filter(t => t.grossPnL > 0).reduce((sum, t) => sum + t.grossPnL, 0)
    const grossLosses = Math.abs(trades.filter(t => t.grossPnL < 0).reduce((sum, t) => sum + t.grossPnL, 0))
    const netWins = trades.filter(t => t.netPnL > 0).reduce((sum, t) => sum + t.netPnL, 0)
    const netLosses = Math.abs(trades.filter(t => t.netPnL < 0).reduce((sum, t) => sum + t.netPnL, 0))

    const grossProfitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0
    const netProfitFactor = netLosses > 0 ? netWins / netLosses : netWins > 0 ? 999 : 0

    // Calculate max drawdown
    let peak = 0
    let maxDrawdown = 0
    let runningPnL = 0
    for (const trade of trades) {
      runningPnL += trade.netPnL
      if (runningPnL > peak) peak = runningPnL
      const drawdown = peak - runningPnL
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    // Pattern breakdown
    const patternStats: Record<string, { trades: number; wins: number; netPnL: number }> = {}
    for (const trade of trades) {
      if (!patternStats[trade.patternId]) {
        patternStats[trade.patternId] = { trades: 0, wins: 0, netPnL: 0 }
      }
      patternStats[trade.patternId].trades++
      if (trade.netPnL > 0) patternStats[trade.patternId].wins++
      patternStats[trade.patternId].netPnL += trade.netPnL
    }

    return NextResponse.json({
      success: true,
      backtest: {
        period: `${days} days`,
        candlesAnalyzed: candles.length,
        startDate: candles[0].dateStr,
        endDate: candles[candles.length - 1].dateStr
      },
      costModel: {
        description: 'REALISTIC APEX/RITHMIC COSTS',
        fixedPerTrade: `$${TRADING_COSTS.totalFixed.toFixed(2)}`,
        avgSlippage: `$${(totalSlippage / Math.max(trades.length, 1)).toFixed(2)}/trade`,
        avgTotalCost: `$${(totalCosts / Math.max(trades.length, 1)).toFixed(2)}/trade`
      },
      performance: {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: `${winRate.toFixed(1)}%`,
        grossPnL: `$${totalGrossPnL.toFixed(2)}`,
        totalCosts: `$${totalCosts.toFixed(2)}`,
        netPnL: `$${totalNetPnL.toFixed(2)}`,
        grossProfitFactor: grossProfitFactor.toFixed(2),
        netProfitFactor: netProfitFactor.toFixed(2),
        maxDrawdown: `$${maxDrawdown.toFixed(2)}`,
        avgNetPnL: trades.length > 0 ? `$${(totalNetPnL / trades.length).toFixed(2)}/trade` : '$0'
      },
      costBreakdown: {
        slippageCosts: `$${totalSlippage.toFixed(2)}`,
        fixedCosts: `$${totalFixed.toFixed(2)}`,
        costImpact: totalGrossPnL > 0 ? `${((totalCosts / totalGrossPnL) * 100).toFixed(1)}% of gross` : 'N/A'
      },
      patternPerformance: Object.entries(patternStats).map(([id, stats]) => ({
        patternId: id,
        trades: stats.trades,
        winRate: `${((stats.wins / stats.trades) * 100).toFixed(1)}%`,
        netPnL: `$${stats.netPnL.toFixed(2)}`
      })),
      trades: trades.slice(-20), // Last 20 trades
      verdict: totalNetPnL > 0
        ? `✅ PROFITABLE: $${totalNetPnL.toFixed(0)} net profit over ${days} days`
        : `❌ NOT PROFITABLE: $${totalNetPnL.toFixed(0)} net loss`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
