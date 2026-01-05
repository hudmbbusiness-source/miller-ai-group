/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║   ███████╗████████╗██╗   ██╗███╗   ██╗████████╗███╗   ███╗ █████╗ ███╗   ██╗ ║
 * ║   ██╔════╝╚══██╔══╝██║   ██║████╗  ██║╚══██╔══╝████╗ ████║██╔══██╗████╗  ██║ ║
 * ║   ███████╗   ██║   ██║   ██║██╔██╗ ██║   ██║   ██╔████╔██║███████║██╔██╗ ██║ ║
 * ║   ╚════██║   ██║   ██║   ██║██║╚██╗██║   ██║   ██║╚██╔╝██║██╔══██║██║╚██╗██║ ║
 * ║   ███████║   ██║   ╚██████╔╝██║ ╚████║   ██║   ██║ ╚═╝ ██║██║  ██║██║ ╚████║ ║
 * ║   ╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ║
 * ║                                                                           ║
 * ║                          ██╗   ██╗██████╗                                 ║
 * ║                          ██║   ██║╚════██╗                                ║
 * ║                          ██║   ██║ █████╔╝                                ║
 * ║                          ╚██╗ ██╔╝██╔═══╝                                 ║
 * ║                           ╚████╔╝ ███████╗                                ║
 * ║                            ╚═══╝  ╚══════╝                                ║
 * ║                                                                           ║
 * ║                    EXPERIMENTAL VERSION FOR TESTING                       ║
 * ║                                                                           ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  STUNTMAN V2 - Copy of OG for testing new features                        ║
 * ║                                                                           ║
 * ║  CURRENT STATUS: Same as OG (no improvements found yet)                   ║
 * ║                                                                           ║
 * ║  TESTED AND REJECTED FEATURES:                                            ║
 * ║  ❌ Session Filter (skip lunch hour) - HURT performance by $9,660         ║
 * ║                                                                           ║
 * ║  BASE RESULTS (matches OG):                                               ║
 * ║  - 60 days: $10,244 net profit                                            ║
 * ║  - Win Rate: 60.3%                                                        ║
 * ║  - Profit Factor: 1.65                                                    ║
 * ║                                                                           ║
 * ║  Created: January 5, 2026                                                 ║
 * ║  API Endpoint: /api/stuntman/stuntman-v2                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * STUNTMAN V2 - Experimental version for testing new features
 *
 * PROVEN PATTERNS (DO NOT CHANGE):
 * - VWAP_PULLBACK_LONG: 71.4% win rate
 * - VWAP_PULLBACK_SHORT: 57.1% win rate
 * - ORB_BREAKOUT_SHORT: 100% win rate
 * - EMA20_BOUNCE_LONG: 57.1% win rate
 *
 * DISABLED PATTERNS (LOST MONEY - DO NOT RE-ENABLE):
 * - BB_LOWER_BOUNCE: 0% win rate, -$657 loss
 *
 * REGIME RULES (DO NOT CHANGE):
 * - STRONG_UPTREND/UPTREND → LONG only
 * - STRONG_DOWNTREND/DOWNTREND → SHORT only
 * - SIDEWAYS → NO TRADE (never forces trades)
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

type MarketRegime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'

interface Signal {
  patternId: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  confidence: number
  reason: string
  regime: MarketRegime
}

interface Trade {
  entryTime: string
  exitTime: string
  patternId: string
  direction: 'LONG' | 'SHORT'
  regime: MarketRegime
  entryPrice: number
  exitPrice: number
  grossPnL: number
  netPnL: number
  costs: number
  exitReason: string
}

// ============================================================================
// REALISTIC COSTS
// ============================================================================

const ES_CONTRACT_VALUE = 50
const ES_TICK_VALUE = 12.50

const COSTS = {
  commission: 4.12,
  exchangeFee: 2.58,
  nfaFee: 0.04,
  clearingFee: 0.10,
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }
}

function getSlippage(atr: number, avgATR: number): number {
  const factor = Math.min(atr / avgATR, 2)
  return 0.5 * (1 + 0.5 * factor) * 0.25 // ticks to points
}

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  tradingStartHour: 9.5,
  tradingEndHour: 15.5,
  maxDailyTrades: 4,
  minATR: 2,
  maxATR: 15,

  // Regime thresholds
  strongTrendSlope: 0.25,  // EMA slope % for strong trend
  trendSlope: 0.10,        // EMA slope % for regular trend

  // Position sizing
  stopMultiplier: 1.5,
  targetMultiplier: 2.0,
}

// ============================================================================
// DATA FETCHING - WITH RANDOM HISTORICAL PERIODS
// ============================================================================

interface FetchResult {
  candles: Candle[]
  periodStart: string
  periodEnd: string
  marketCondition: string
}

// Pick random window from AVAILABLE data (Yahoo only keeps ~60 days of 5m data)
// So we pick random SUBSETS of the available data to test on different market segments
function getRandomHistoricalPeriod(days: number): { start: number; end: number; label: string; offset: number } {
  const now = Math.floor(Date.now() / 1000)
  // Yahoo Finance keeps ~60 days of 5m data, so fetch all and pick random subsets
  // We'll fetch full 60 days but tell caller to use random subset
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60)

  // Random offset: pick different starting points within the data
  // This means test 1 might use days 1-30, test 2 might use days 15-45, etc.
  const maxOffset = Math.max(0, 60 - days)
  const randomOffset = Math.floor(Math.random() * (maxOffset + 1))

  const startDate = new Date((sixtyDaysAgo + randomOffset * 24 * 60 * 60) * 1000)
  const endDate = new Date((sixtyDaysAgo + (randomOffset + days) * 24 * 60 * 60) * 1000)
  const label = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return { start: sixtyDaysAgo, end: now, label, offset: randomOffset }
}

// Classify market condition based on price change
function classifyMarketCondition(candles: Candle[]): string {
  if (candles.length < 10) return 'UNKNOWN'
  const startPrice = candles[0].close
  const endPrice = candles[candles.length - 1].close
  const change = ((endPrice - startPrice) / startPrice) * 100

  // Calculate volatility
  let maxDrawdown = 0
  let maxRunup = 0
  let peak = startPrice
  let trough = startPrice

  for (const c of candles) {
    if (c.close > peak) peak = c.close
    if (c.close < trough) trough = c.close
    const drawdown = ((peak - c.close) / peak) * 100
    const runup = ((c.close - trough) / trough) * 100
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
    if (runup > maxRunup) maxRunup = runup
  }

  const volatility = Math.max(maxDrawdown, maxRunup)

  if (change > 8) return 'STRONG_BULL'
  if (change > 3) return 'BULL'
  if (change < -8) return 'STRONG_BEAR'
  if (change < -3) return 'BEAR'
  if (volatility > 10) return 'VOLATILE_CHOP'
  return 'SIDEWAYS'
}

// FMP Daily data interface
interface FMPDailyRecord {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap: number
}

// Global cache for daily data (loaded once from local file)
let dailyDataCache: Candle[] | null = null

// Load 5 YEARS of daily data from local file (saved from FMP API)
async function loadDailyDataFromFile(): Promise<Candle[]> {
  if (dailyDataCache) return dailyDataCache

  try {
    // Read from local file - NO API calls needed!
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'data', 'spy_daily_5years.json')
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const records: FMPDailyRecord[] = JSON.parse(fileContent)

    // Convert to Candle format, sorted oldest to newest
    const candles: Candle[] = records.reverse().map(r => ({
      time: new Date(r.date).getTime(),
      open: r.open * 10,   // Scale SPY to ES prices
      high: r.high * 10,
      low: r.low * 10,
      close: r.close * 10,
      volume: r.volume,
      hour: 10,  // Mid-day for daily bars
      dateStr: r.date,
    }))

    dailyDataCache = candles
    return candles
  } catch (e) {
    console.error('Failed to load daily data from file:', e)
    throw new Error('Could not load local daily data file')
  }
}

// Fetch DAILY data from local file - 5 YEARS of history!
async function fetchDailyData(testDays: number = 60): Promise<FetchResult> {
  const allCandles = await loadDailyDataFromFile()

  // Pick random period from 5 years of data
  const maxStart = Math.max(0, allCandles.length - testDays)
  const startIdx = Math.floor(Math.random() * (maxStart + 1))
  const selectedCandles = allCandles.slice(startIdx, startIdx + testDays)

  return {
    candles: selectedCandles,
    periodStart: selectedCandles[0]?.dateStr || 'N/A',
    periodEnd: selectedCandles[selectedCandles.length - 1]?.dateStr || 'N/A',
    marketCondition: classifyMarketCondition(selectedCandles)
  }
}

async function fetchESData(days: number, useRandom: boolean = false): Promise<FetchResult> {
  const sources = [
    { symbol: 'SPY', scale: 10 }  // SPY has better historical data than ES=F
  ]

  // Yahoo only has ~60 days of 5m data - fetch all and pick random subset if needed
  const now = Math.floor(Date.now() / 1000)
  const start = now - (60 * 24 * 60 * 60)  // Always fetch 60 days

  // For random mode: pick a random subset of the available days
  const randomPeriod = useRandom ? getRandomHistoricalPeriod(days) : null

  for (const source of sources) {
    try {
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

      if (candles.length > 100) {
          // If random mode, pick a subset based on random offset
          let selectedCandles = candles
          if (useRandom && randomPeriod) {
            // Group candles by day and pick random subset of days
            const candlesByDay: Record<string, Candle[]> = {}
            for (const c of candles) {
              if (!candlesByDay[c.dateStr]) candlesByDay[c.dateStr] = []
              candlesByDay[c.dateStr].push(c)
            }
            const allDays = Object.keys(candlesByDay).sort()

            // Pick random starting day, get 'days' worth of data
            const maxStartIdx = Math.max(0, allDays.length - days)
            const startIdx = Math.floor(Math.random() * (maxStartIdx + 1))
            const selectedDays = allDays.slice(startIdx, startIdx + days)

            selectedCandles = []
            for (const day of selectedDays) {
              selectedCandles.push(...candlesByDay[day])
            }
          }

          return {
            candles: selectedCandles,
            periodStart: selectedCandles[0]?.dateStr || 'N/A',
            periodEnd: selectedCandles[selectedCandles.length - 1]?.dateStr || 'N/A',
            marketCondition: classifyMarketCondition(selectedCandles)
          }
        }
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
// REGIME DETECTION
// ============================================================================

function detectRegime(
  ema20: number[],
  ema50: number[],
  rsi: number[],
  index: number
): MarketRegime {
  if (index < 30) return 'SIDEWAYS'

  const ema20Now = ema20[index]
  const ema20Past = ema20[index - 20]
  const ema50Now = ema50[index]
  const ema50Past = ema50[index - 20]

  const ema20Slope = ((ema20Now - ema20Past) / ema20Past) * 100
  const ema50Slope = ((ema50Now - ema50Past) / ema50Past) * 100

  const emaAligned = ema20Now > ema50Now
  const rsiNow = rsi[index]

  // STRONG UPTREND: Both EMAs rising sharply, EMA20 > EMA50, RSI > 55
  if (ema20Slope > CONFIG.strongTrendSlope && ema50Slope > CONFIG.strongTrendSlope * 0.5 && emaAligned && rsiNow > 55) {
    return 'STRONG_UPTREND'
  }

  // UPTREND: EMA20 rising, above EMA50
  if (ema20Slope > CONFIG.trendSlope && emaAligned) {
    return 'UPTREND'
  }

  // STRONG DOWNTREND: Both EMAs falling sharply, EMA20 < EMA50, RSI < 45
  if (ema20Slope < -CONFIG.strongTrendSlope && ema50Slope < -CONFIG.strongTrendSlope * 0.5 && !emaAligned && rsiNow < 45) {
    return 'STRONG_DOWNTREND'
  }

  // DOWNTREND: EMA20 falling, below EMA50
  if (ema20Slope < -CONFIG.trendSlope && !emaAligned) {
    return 'DOWNTREND'
  }

  return 'SIDEWAYS'
}

// ============================================================================
// SHORT PATTERNS (for DOWNTREND/SIDEWAYS)
// ============================================================================

function detectShortSignal(
  candles: Candle[],
  index: number,
  ema20: number[],
  ema50: number[],
  bb: { upper: number[]; middle: number[]; lower: number[] },
  vwap: number[],
  atr: number[],
  regime: MarketRegime
): Signal | null {
  const c = candles[index]
  const prev = candles[index - 1]
  const currentATR = atr[index]

  const stopDistance = currentATR * CONFIG.stopMultiplier
  const targetDistance = currentATR * CONFIG.targetMultiplier

  // VWAP_PULLBACK_SHORT - Price returns to VWAP, SHORT on rejection
  const vwapDiff = Math.abs((c.close - vwap[index]) / vwap[index] * 100)
  if (vwapDiff < 0.12 && c.close < c.open && ema20[index] <= ema50[index]) {
    return {
      patternId: 'VWAP_PULLBACK_SHORT',
      direction: 'SHORT',
      entryPrice: c.close,
      stopLoss: c.close + stopDistance,
      takeProfit: c.close - targetDistance,
      confidence: 65,
      reason: `VWAP rejection in ${regime}`,
      regime
    }
  }

  // BB_UPPER_FADE - DISABLED (63.3% win rate but -$570 net - wins too small)
  // High win rate but poor risk:reward - costs eat the small profits
  // if (c.high >= bb.upper[index] && c.close < c.open && c.close < bb.upper[index]) {
  //   return {
  //     patternId: 'BB_UPPER_FADE',
  //     direction: 'SHORT',
  //     ...
  //   }
  // }

  // EMA20_BOUNCE_SHORT - DISABLED (39.5% win rate, -$3,760 over 60 days)
  // This pattern consistently loses money - removing it
  // const touchedEMA20 = c.high >= ema20[index] * 0.998 && c.high <= ema20[index] * 1.002
  // if (touchedEMA20 && c.close < c.open && ema20[index] < ema50[index]) {
  //   return {
  //     patternId: 'EMA20_BOUNCE_SHORT',
  //     direction: 'SHORT',
  //     ...
  //   }
  // }

  // ORB_BREAKOUT_SHORT - Opening range breakdown
  if (c.hour >= 9.75 && c.hour < 11) {
    let orHigh = 0, orLow = Infinity

    for (let j = index - 20; j < index; j++) {
      if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
        orHigh = Math.max(orHigh, candles[j].high)
        orLow = Math.min(orLow, candles[j].low)
      }
    }

    const orRange = orHigh - orLow
    if (orHigh > 0 && orLow < Infinity && orRange >= 3 && orRange <= 20) {
      if (c.close < orLow && prev.close >= orLow) {
        return {
          patternId: 'ORB_BREAKOUT_SHORT',
          direction: 'SHORT',
          entryPrice: c.close,
          stopLoss: orHigh,
          takeProfit: c.close - (orRange * 0.75),
          confidence: 70,
          reason: `ORB breakdown, range ${orRange.toFixed(1)} pts`,
          regime
        }
      }
    }
  }

  return null
}

// ============================================================================
// LONG PATTERNS (for UPTREND) - ENHANCED with stricter criteria
// ============================================================================

function detectLongSignal(
  candles: Candle[],
  index: number,
  ema20: number[],
  ema50: number[],
  bb: { upper: number[]; middle: number[]; lower: number[] },
  vwap: number[],
  atr: number[],
  rsi: number[],
  regime: MarketRegime
): Signal | null {
  const c = candles[index]
  const prev = candles[index - 1]
  const currentATR = atr[index]

  const stopDistance = currentATR * CONFIG.stopMultiplier
  const targetDistance = currentATR * CONFIG.targetMultiplier

  // Only take LONGs in uptrends
  if (regime !== 'UPTREND' && regime !== 'STRONG_UPTREND') {
    return null
  }

  // ENHANCED: Require bullish candle for all LONG entries
  const bullishCandle = c.close > c.open
  if (!bullishCandle) return null

  // ENHANCED: RSI must not be overbought (< 70)
  if (rsi[index] > 70) return null

  // VWAP_PULLBACK_LONG - ENHANCED
  // Price pulls back to VWAP in uptrend, bounces with volume
  const vwapDiff = (c.close - vwap[index]) / vwap[index] * 100
  const nearVWAP = Math.abs(vwapDiff) < 0.15
  const aboveVWAP = c.close > vwap[index]

  if (nearVWAP && aboveVWAP && c.low <= vwap[index] * 1.002) {
    // ENHANCED: Require price bounced OFF vwap (touched and closed above)
    return {
      patternId: 'VWAP_PULLBACK_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: c.close - stopDistance,
      takeProfit: c.close + targetDistance,
      confidence: 65,
      reason: `VWAP bounce in ${regime}, RSI ${rsi[index].toFixed(0)}`,
      regime
    }
  }

  // EMA20_BOUNCE_LONG - ENHANCED
  // Price respects EMA20 as support in uptrend
  const touchedEMA20 = c.low <= ema20[index] * 1.002 && c.low >= ema20[index] * 0.995
  const closedAboveEMA20 = c.close > ema20[index]

  if (touchedEMA20 && closedAboveEMA20 && regime === 'STRONG_UPTREND') {
    // ENHANCED: Only in STRONG uptrend for EMA bounces
    return {
      patternId: 'EMA20_BOUNCE_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: ema20[index] - (currentATR * 0.5), // Tight stop below EMA
      takeProfit: c.close + targetDistance,
      confidence: 60,
      reason: `EMA20 support bounce in ${regime}`,
      regime
    }
  }

  // BB_LOWER_BOUNCE - DISABLED
  // DATA SHOWS: 0% win rate, -$657 loss - pattern doesn't work reliably
  // Previous tests: 23% win rate, -$1,652 loss in consistency test
  // NEVER trade this pattern - it loses money
  /*
  const touchedLowerBB = c.low <= bb.lower[index] * 1.001
  const closedAboveLowerBB = c.close > bb.lower[index]

  if (touchedLowerBB && closedAboveLowerBB && rsi[index] < 40) {
    return {
      patternId: 'BB_LOWER_BOUNCE',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: bb.lower[index] - (currentATR * 0.5),
      takeProfit: bb.middle[index],
      confidence: 60,
      reason: `BB lower bounce, RSI oversold ${rsi[index].toFixed(0)}`,
      regime
    }
  }
  */

  // ORB_BREAKOUT_LONG - Opening range breakout up in uptrend
  if (c.hour >= 9.75 && c.hour < 11 && regime === 'STRONG_UPTREND') {
    let orHigh = 0, orLow = Infinity

    for (let j = index - 20; j < index; j++) {
      if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === c.dateStr) {
        orHigh = Math.max(orHigh, candles[j].high)
        orLow = Math.min(orLow, candles[j].low)
      }
    }

    const orRange = orHigh - orLow
    if (orHigh > 0 && orLow < Infinity && orRange >= 3 && orRange <= 20) {
      if (c.close > orHigh && prev.close <= orHigh) {
        return {
          patternId: 'ORB_BREAKOUT_LONG',
          direction: 'LONG',
          entryPrice: c.close,
          stopLoss: orLow,
          takeProfit: c.close + (orRange * 0.75),
          confidence: 70,
          reason: `ORB breakout in ${regime}, range ${orRange.toFixed(1)} pts`,
          regime
        }
      }
    }
  }

  // MOMENTUM_CONTINUATION - Strong move, small pullback, continuation
  if (index >= 5 && regime === 'STRONG_UPTREND') {
    const momentum5 = c.close - candles[index - 5].close
    const isPullback = prev.close < prev.open // Previous candle was red
    const isContinuation = c.close > prev.high // Current breaks previous high

    if (momentum5 > currentATR * 1.5 && isPullback && isContinuation) {
      return {
        patternId: 'MOMENTUM_CONTINUATION',
        direction: 'LONG',
        entryPrice: c.close,
        stopLoss: prev.low - (currentATR * 0.3),
        takeProfit: c.close + targetDistance,
        confidence: 65,
        reason: `Momentum continuation after pullback in ${regime}`,
        regime
      }
    }
  }

  return null
}

// ============================================================================
// SIDEWAYS PATTERNS (Mean reversion only)
// ============================================================================

function detectSidewaysLongSignal(
  candles: Candle[],
  index: number,
  bb: { upper: number[]; middle: number[]; lower: number[] },
  atr: number[],
  rsi: number[],
  regime: MarketRegime
): Signal | null {
  const c = candles[index]
  const currentATR = atr[index]

  // BB_LOWER_BOUNCE - Mean reversion from oversold in sideways
  const touchedLowerBB = c.low <= bb.lower[index] * 1.001
  const closedAboveLowerBB = c.close > bb.lower[index]
  const bullishCandle = c.close > c.open
  const oversold = rsi[index] < 35

  if (touchedLowerBB && closedAboveLowerBB && bullishCandle && oversold) {
    return {
      patternId: 'BB_LOWER_BOUNCE',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: bb.lower[index] - (currentATR * 0.5),
      takeProfit: bb.middle[index], // Target middle band
      confidence: 60,
      reason: `BB lower mean reversion, RSI ${rsi[index].toFixed(0)}`,
      regime
    }
  }

  return null
}

// ============================================================================
// DAILY PATTERNS (for 5-year historical testing on daily bars)
// ============================================================================

function detectDailySignal(
  candles: Candle[],
  index: number,
  ema20: number[],
  ema50: number[],
  atr: number[],
  rsi: number[],
  regime: MarketRegime
): Signal | null {
  if (index < 5) return null

  const c = candles[index]
  const prev = candles[index - 1]
  const currentATR = atr[index]

  const stopDistance = currentATR * 1.5
  const targetDistance = currentATR * 2.5

  // ===== LONG PATTERNS (Uptrend only) =====
  if (regime === 'STRONG_UPTREND' || regime === 'UPTREND') {
    const bullishCandle = c.close > c.open

    // DAILY_EMA_PULLBACK_LONG - Price pulls back to EMA20 in uptrend
    if (c.low <= ema20[index] * 1.01 && c.close > ema20[index] && bullishCandle) {
      // Previous candle was a pullback (red)
      if (prev.close < prev.open) {
        return {
          patternId: 'DAILY_EMA_PULLBACK_LONG',
          direction: 'LONG',
          entryPrice: c.close,
          stopLoss: c.low - currentATR,
          takeProfit: c.close + targetDistance,
          confidence: 65,
          reason: `Daily EMA20 pullback in ${regime}`,
          regime
        }
      }
    }

    // DAILY_RSI_BOUNCE_LONG - RSI oversold bounce in uptrend
    if (rsi[index] < 40 && rsi[index] > rsi[index - 1] && bullishCandle) {
      return {
        patternId: 'DAILY_RSI_BOUNCE_LONG',
        direction: 'LONG',
        entryPrice: c.close,
        stopLoss: c.low - stopDistance,
        takeProfit: c.close + targetDistance,
        confidence: 60,
        reason: `Daily RSI bounce from ${rsi[index].toFixed(0)} in ${regime}`,
        regime
      }
    }

    // DAILY_BREAKOUT_LONG - New 5-day high breakout
    let high5 = 0
    for (let j = index - 5; j < index; j++) {
      if (j >= 0) high5 = Math.max(high5, candles[j].high)
    }
    if (c.close > high5 && bullishCandle && regime === 'STRONG_UPTREND') {
      return {
        patternId: 'DAILY_BREAKOUT_LONG',
        direction: 'LONG',
        entryPrice: c.close,
        stopLoss: c.close - stopDistance,
        takeProfit: c.close + targetDistance,
        confidence: 65,
        reason: `Daily 5-day high breakout in ${regime}`,
        regime
      }
    }
  }

  // ===== SHORT PATTERNS (Downtrend only) =====
  if (regime === 'STRONG_DOWNTREND' || regime === 'DOWNTREND') {
    const bearishCandle = c.close < c.open

    // DAILY_EMA_REJECTION_SHORT - Price rallies to EMA20 and rejects
    if (c.high >= ema20[index] * 0.99 && c.close < ema20[index] && bearishCandle) {
      // Previous candle was a rally (green)
      if (prev.close > prev.open) {
        return {
          patternId: 'DAILY_EMA_REJECTION_SHORT',
          direction: 'SHORT',
          entryPrice: c.close,
          stopLoss: c.high + currentATR,
          takeProfit: c.close - targetDistance,
          confidence: 65,
          reason: `Daily EMA20 rejection in ${regime}`,
          regime
        }
      }
    }

    // DAILY_RSI_REJECTION_SHORT - RSI overbought rejection in downtrend
    if (rsi[index] > 60 && rsi[index] < rsi[index - 1] && bearishCandle) {
      return {
        patternId: 'DAILY_RSI_REJECTION_SHORT',
        direction: 'SHORT',
        entryPrice: c.close,
        stopLoss: c.high + stopDistance,
        takeProfit: c.close - targetDistance,
        confidence: 60,
        reason: `Daily RSI rejection from ${rsi[index].toFixed(0)} in ${regime}`,
        regime
      }
    }

    // DAILY_BREAKDOWN_SHORT - New 5-day low breakdown
    let low5 = Infinity
    for (let j = index - 5; j < index; j++) {
      if (j >= 0) low5 = Math.min(low5, candles[j].low)
    }
    if (c.close < low5 && bearishCandle && regime === 'STRONG_DOWNTREND') {
      return {
        patternId: 'DAILY_BREAKDOWN_SHORT',
        direction: 'SHORT',
        entryPrice: c.close,
        stopLoss: c.close + stopDistance,
        takeProfit: c.close - targetDistance,
        confidence: 65,
        reason: `Daily 5-day low breakdown in ${regime}`,
        regime
      }
    }
  }

  return null
}

// ============================================================================
// BACKTEST ENGINE
// ============================================================================

function runBacktest(candles: Candle[], avgATR: number, useDaily: boolean = false): { trades: Trade[]; regimeStats: Record<string, unknown> } {
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)
  const bb = calculateBB(candles, 20)
  const vwap = calculateVWAP(candles)
  const atr = calculateATR(candles, 14)
  const rsi = calculateRSI(candles, 14)

  const trades: Trade[] = []
  let inPosition = false
  let currentTrade: {
    entryIndex: number
    entryPrice: number
    direction: 'LONG' | 'SHORT'
    stopLoss: number
    takeProfit: number
    patternId: string
    regime: MarketRegime
    entrySlippage: number
  } | null = null

  let lastTradeDate = ''
  let dailyTrades = 0

  // Track regime distribution
  const regimeCounts: Record<MarketRegime, number> = {
    'STRONG_UPTREND': 0,
    'UPTREND': 0,
    'SIDEWAYS': 0,
    'DOWNTREND': 0,
    'STRONG_DOWNTREND': 0
  }

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i]
    const currentATR = atr[i]

    // Detect current regime
    const regime = detectRegime(ema20, ema50, rsi, i)
    regimeCounts[regime]++

    // Reset daily counter
    if (c.dateStr !== lastTradeDate) {
      lastTradeDate = c.dateStr
      dailyTrades = 0
    }

    // Skip filters based on mode
    if (!useDaily) {
      // INTRADAY MODE: Check trading hours
      if (c.hour < CONFIG.tradingStartHour || c.hour >= CONFIG.tradingEndHour) continue
      if (currentATR < CONFIG.minATR || currentATR > CONFIG.maxATR) continue
    }
    // DAILY MODE: No hour filter, just skip very low/high ATR
    if (useDaily && (currentATR < 10 || currentATR > 200)) continue

    // Check exit if in position
    if (inPosition && currentTrade) {
      let exitReason = ''
      let exitPrice = 0
      const exitSlippage = getSlippage(currentATR, avgATR)

      if (currentTrade.direction === 'LONG') {
        if (c.low <= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss - exitSlippage
          exitReason = 'Stop Loss'
        } else if (c.high >= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit - exitSlippage
          exitReason = 'Take Profit'
        } else if (!useDaily && (c.hour >= 15.83 || c.dateStr !== candles[currentTrade.entryIndex].dateStr)) {
          // End of Day exit - ONLY for intraday mode
          exitPrice = c.open - exitSlippage
          exitReason = 'End of Day'
        }
      } else {
        if (c.high >= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss + exitSlippage
          exitReason = 'Stop Loss'
        } else if (c.low <= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit + exitSlippage
          exitReason = 'Take Profit'
        } else if (!useDaily && (c.hour >= 15.83 || c.dateStr !== candles[currentTrade.entryIndex].dateStr)) {
          // End of Day exit - ONLY for intraday mode
          exitPrice = c.open + exitSlippage
          exitReason = 'End of Day'
        }
      }

      if (exitReason) {
        const grossPnLPoints = currentTrade.direction === 'LONG'
          ? exitPrice - currentTrade.entryPrice
          : currentTrade.entryPrice - exitPrice

        const grossPnL = grossPnLPoints * ES_CONTRACT_VALUE
        const costs = COSTS.totalFixed + (currentTrade.entrySlippage + exitSlippage) * ES_CONTRACT_VALUE
        const netPnL = grossPnL - COSTS.totalFixed

        trades.push({
          entryTime: candles[currentTrade.entryIndex].dateStr,
          exitTime: c.dateStr,
          patternId: currentTrade.patternId,
          direction: currentTrade.direction,
          regime: currentTrade.regime,
          entryPrice: currentTrade.entryPrice,
          exitPrice,
          grossPnL,
          netPnL,
          costs,
          exitReason
        })

        inPosition = false
        currentTrade = null
      }
    }

    // Check for new entry
    if (!inPosition && dailyTrades < CONFIG.maxDailyTrades) {
      let signal: Signal | null = null

      // Use DAILY patterns for daily mode, INTRADAY patterns otherwise
      if (useDaily) {
        // DAILY MODE: Use swing trading patterns
        signal = detectDailySignal(candles, i, ema20, ema50, atr, rsi, regime)
      } else {
        // INTRADAY MODE: Use original patterns

        if (regime === 'STRONG_UPTREND' || regime === 'UPTREND') {
          // ONLY LONGs in uptrends
          signal = detectLongSignal(candles, i, ema20, ema50, bb, vwap, atr, rsi, regime)
        }

        if (regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') {
          // ONLY SHORTs in downtrends (NOT sideways!)
          signal = detectShortSignal(candles, i, ema20, ema50, bb, vwap, atr, regime)
        }

        // SIDEWAYS: DON'T TRADE - consistency test showed BB_LOWER_BOUNCE has 23% win rate
        // Skip sideways completely - it's just noise
        if (regime === 'SIDEWAYS') {
          signal = null
        }
      }

      if (signal) {
        const entrySlippage = getSlippage(currentATR, avgATR)
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
          regime: signal.regime,
          entrySlippage
        }
        inPosition = true
        dailyTrades++
      }
    }
  }

  return { trades, regimeStats: regimeCounts }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '60')
    const useRandom = searchParams.get('random') === 'true'
    const mode = searchParams.get('mode') || 'intraday'  // 'intraday' or 'daily'

    // Use daily data for true historical testing (goes back 2 years)
    let fetchResult: FetchResult
    let minCandles = 200

    if (mode === 'daily') {
      fetchResult = await fetchDailyData(days)  // Random 60-day period from 5 years
      minCandles = 55  // Need at least 55 candles for indicators + trades
    } else {
      fetchResult = await fetchESData(days, useRandom)
    }

    const { candles, periodStart, periodEnd, marketCondition } = fetchResult

    if (candles.length < minCandles) {
      return NextResponse.json({ success: false, error: 'Insufficient data', candleCount: candles.length })
    }

    const atr = calculateATR(candles, 14)
    const atrSlice = atr.slice(0, Math.min(200, atr.length))
    const avgATR = atrSlice.reduce((sum, v) => sum + v, 0) / atrSlice.length

    const useDaily = mode === 'daily'
    const { trades, regimeStats } = runBacktest(candles, avgATR, useDaily)

    // Calculate stats
    const wins = trades.filter(t => t.netPnL > 0).length
    const losses = trades.filter(t => t.netPnL <= 0).length
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0

    const totalGrossPnL = trades.reduce((sum, t) => sum + t.grossPnL, 0)
    const totalNetPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
    const totalCosts = trades.reduce((sum, t) => sum + t.costs, 0)

    const netWins = trades.filter(t => t.netPnL > 0).reduce((sum, t) => sum + t.netPnL, 0)
    const netLosses = Math.abs(trades.filter(t => t.netPnL < 0).reduce((sum, t) => sum + t.netPnL, 0))
    const netProfitFactor = netLosses > 0 ? netWins / netLosses : netWins > 0 ? 999 : 0

    // Max drawdown
    let peak = 0, maxDrawdown = 0, runningPnL = 0
    for (const trade of trades) {
      runningPnL += trade.netPnL
      if (runningPnL > peak) peak = runningPnL
      const dd = peak - runningPnL
      if (dd > maxDrawdown) maxDrawdown = dd
    }

    // Pattern and direction breakdown
    const patternStats: Record<string, { trades: number; wins: number; netPnL: number }> = {}
    const directionStats = { LONG: { trades: 0, wins: 0, netPnL: 0 }, SHORT: { trades: 0, wins: 0, netPnL: 0 } }

    for (const trade of trades) {
      // Pattern
      if (!patternStats[trade.patternId]) {
        patternStats[trade.patternId] = { trades: 0, wins: 0, netPnL: 0 }
      }
      patternStats[trade.patternId].trades++
      if (trade.netPnL > 0) patternStats[trade.patternId].wins++
      patternStats[trade.patternId].netPnL += trade.netPnL

      // Direction
      directionStats[trade.direction].trades++
      if (trade.netPnL > 0) directionStats[trade.direction].wins++
      directionStats[trade.direction].netPnL += trade.netPnL
    }

    return NextResponse.json({
      success: true,
      strategy: 'STUNTMAN V2 (Experimental)',
      testPeriod: {
        mode,
        days,
        startDate: periodStart,
        endDate: periodEnd,
        candlesAnalyzed: candles.length,
        marketCondition,
        isRandomPeriod: useRandom || mode === 'daily'
      },
      regimeDistribution: regimeStats,
      performance: {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: winRate.toFixed(1) + '%',
        grossPnL: '$' + totalGrossPnL.toFixed(2),
        totalCosts: '$' + totalCosts.toFixed(2),
        netPnL: '$' + totalNetPnL.toFixed(2),
        netProfitFactor: netProfitFactor.toFixed(2),
        maxDrawdown: '$' + maxDrawdown.toFixed(2),
        avgNetPnL: '$' + (trades.length > 0 ? (totalNetPnL / trades.length).toFixed(2) : '0') + '/trade'
      },
      directionBreakdown: {
        LONG: {
          trades: directionStats.LONG.trades,
          winRate: directionStats.LONG.trades > 0 ? ((directionStats.LONG.wins / directionStats.LONG.trades) * 100).toFixed(1) + '%' : '0%',
          netPnL: '$' + directionStats.LONG.netPnL.toFixed(2)
        },
        SHORT: {
          trades: directionStats.SHORT.trades,
          winRate: directionStats.SHORT.trades > 0 ? ((directionStats.SHORT.wins / directionStats.SHORT.trades) * 100).toFixed(1) + '%' : '0%',
          netPnL: '$' + directionStats.SHORT.netPnL.toFixed(2)
        }
      },
      patternBreakdown: Object.entries(patternStats)
        .sort((a, b) => b[1].netPnL - a[1].netPnL)
        .map(([id, s]) => ({
          pattern: id,
          trades: s.trades,
          winRate: ((s.wins / s.trades) * 100).toFixed(1) + '%',
          netPnL: '$' + s.netPnL.toFixed(2)
        })),
      recentTrades: trades.slice(-20),
      verdict: totalNetPnL > 0
        ? `✅ PROFITABLE: $${totalNetPnL.toFixed(0)} net over ${days} days`
        : `❌ NOT PROFITABLE: $${totalNetPnL.toFixed(0)} net loss`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
