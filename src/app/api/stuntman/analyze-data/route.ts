/**
 * DATA ANALYSIS ENGINE
 *
 * This analyzes ACTUAL market data to find what conditions predict profitable trades.
 * NO GUESSING - pure data analysis.
 *
 * Process:
 * 1. Look at every candle in history
 * 2. Simulate a LONG trade and a SHORT trade from each candle
 * 3. Track which were profitable
 * 4. Analyze the CONDITIONS that existed when trades were profitable
 * 5. Build a prediction model based on actual data
 */

import { NextRequest, NextResponse } from 'next/server'

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

interface TradeResult {
  index: number
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  pnlPoints: number
  profitable: boolean
  // Conditions at entry
  conditions: {
    ema20Slope: number      // EMA20 momentum
    ema50Slope: number      // EMA50 momentum
    emaAlignment: number    // EMA20 vs EMA50 position
    rsi: number
    atrPercent: number      // ATR as % of price
    priceVsVwap: number     // Price position relative to VWAP
    priceVsEma20: number    // Price position relative to EMA20
    priceVsBBUpper: number  // Distance from upper BB
    priceVsBBLower: number  // Distance from lower BB
    candleBody: number      // Bullish (+) or bearish (-) body
    hourOfDay: number
    volumeRatio: number     // Volume vs average
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchESData(days: number): Promise<Candle[]> {
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
// TRADE SIMULATION
// ============================================================================

function simulateTrade(
  candles: Candle[],
  entryIndex: number,
  direction: 'LONG' | 'SHORT',
  stopPoints: number,
  targetPoints: number
): { exitPrice: number; pnlPoints: number } {
  const entryPrice = candles[entryIndex].close

  // Look forward max 50 candles or until end of day
  for (let i = entryIndex + 1; i < Math.min(entryIndex + 50, candles.length); i++) {
    const c = candles[i]

    // End of day exit
    if (c.dateStr !== candles[entryIndex].dateStr || c.hour >= 15.83) {
      const pnl = direction === 'LONG' ? c.open - entryPrice : entryPrice - c.open
      return { exitPrice: c.open, pnlPoints: pnl }
    }

    if (direction === 'LONG') {
      // Check stop loss first
      if (c.low <= entryPrice - stopPoints) {
        return { exitPrice: entryPrice - stopPoints, pnlPoints: -stopPoints }
      }
      // Check target
      if (c.high >= entryPrice + targetPoints) {
        return { exitPrice: entryPrice + targetPoints, pnlPoints: targetPoints }
      }
    } else {
      // SHORT
      if (c.high >= entryPrice + stopPoints) {
        return { exitPrice: entryPrice + stopPoints, pnlPoints: -stopPoints }
      }
      if (c.low <= entryPrice - targetPoints) {
        return { exitPrice: entryPrice - targetPoints, pnlPoints: targetPoints }
      }
    }
  }

  // Didn't hit stop or target - exit at last candle
  const lastCandle = candles[Math.min(entryIndex + 49, candles.length - 1)]
  const pnl = direction === 'LONG' ? lastCandle.close - entryPrice : entryPrice - lastCandle.close
  return { exitPrice: lastCandle.close, pnlPoints: pnl }
}

// ============================================================================
// DATA ANALYSIS
// ============================================================================

function analyzeAllTrades(candles: Candle[]): { longResults: TradeResult[]; shortResults: TradeResult[] } {
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)
  const atr = calculateATR(candles, 14)
  const rsi = calculateRSI(candles, 14)
  const bb = calculateBB(candles, 20)
  const vwap = calculateVWAP(candles)

  // Calculate average volume
  const avgVolume = candles.slice(0, 200).reduce((sum, c) => sum + c.volume, 0) / 200

  const longResults: TradeResult[] = []
  const shortResults: TradeResult[] = []

  // Use ATR-based stops and targets (1.5 ATR stop, 2 ATR target)
  const stopMultiplier = 1.5
  const targetMultiplier = 2.0

  for (let i = 50; i < candles.length - 50; i++) {
    const c = candles[i]

    // Only analyze during trading hours
    if (c.hour < 9.5 || c.hour >= 15.5) continue

    const currentATR = atr[i]
    if (currentATR < 2 || currentATR > 15) continue

    const stopPoints = currentATR * stopMultiplier
    const targetPoints = currentATR * targetMultiplier

    // Calculate conditions at this candle
    const ema20Slope = i >= 20 ? ((ema20[i] - ema20[i - 20]) / ema20[i - 20]) * 100 : 0
    const ema50Slope = i >= 20 ? ((ema50[i] - ema50[i - 20]) / ema50[i - 20]) * 100 : 0

    const conditions = {
      ema20Slope,
      ema50Slope,
      emaAlignment: ((ema20[i] - ema50[i]) / ema50[i]) * 100,
      rsi: rsi[i],
      atrPercent: (currentATR / c.close) * 100,
      priceVsVwap: ((c.close - vwap[i]) / vwap[i]) * 100,
      priceVsEma20: ((c.close - ema20[i]) / ema20[i]) * 100,
      priceVsBBUpper: ((bb.upper[i] - c.close) / c.close) * 100,
      priceVsBBLower: ((c.close - bb.lower[i]) / c.close) * 100,
      candleBody: ((c.close - c.open) / c.open) * 100,
      hourOfDay: c.hour,
      volumeRatio: avgVolume > 0 ? c.volume / avgVolume : 1
    }

    // Simulate LONG trade
    const longSim = simulateTrade(candles, i, 'LONG', stopPoints, targetPoints)
    longResults.push({
      index: i,
      direction: 'LONG',
      entryPrice: c.close,
      exitPrice: longSim.exitPrice,
      pnlPoints: longSim.pnlPoints,
      profitable: longSim.pnlPoints > 0,
      conditions
    })

    // Simulate SHORT trade
    const shortSim = simulateTrade(candles, i, 'SHORT', stopPoints, targetPoints)
    shortResults.push({
      index: i,
      direction: 'SHORT',
      entryPrice: c.close,
      exitPrice: shortSim.exitPrice,
      pnlPoints: shortSim.pnlPoints,
      profitable: shortSim.pnlPoints > 0,
      conditions
    })
  }

  return { longResults, shortResults }
}

// ============================================================================
// FIND PATTERNS IN PROFITABLE TRADES
// ============================================================================

function analyzeWinningConditions(results: TradeResult[]): {
  winRate: number
  avgConditions: Record<string, { winners: number; losers: number; diff: number }>
  bestConditions: string[]
} {
  const winners = results.filter(r => r.profitable)
  const losers = results.filter(r => !r.profitable)

  const winRate = (winners.length / results.length) * 100

  // Compare average conditions for winners vs losers
  const conditionKeys = Object.keys(results[0]?.conditions || {})
  const avgConditions: Record<string, { winners: number; losers: number; diff: number }> = {}

  for (const key of conditionKeys) {
    const winnerAvg = winners.length > 0
      ? winners.reduce((sum, r) => sum + (r.conditions as Record<string, number>)[key], 0) / winners.length
      : 0
    const loserAvg = losers.length > 0
      ? losers.reduce((sum, r) => sum + (r.conditions as Record<string, number>)[key], 0) / losers.length
      : 0

    avgConditions[key] = {
      winners: winnerAvg,
      losers: loserAvg,
      diff: winnerAvg - loserAvg
    }
  }

  // Find conditions with biggest difference between winners and losers
  const bestConditions = Object.entries(avgConditions)
    .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
    .slice(0, 5)
    .map(([key, val]) => `${key}: winners=${val.winners.toFixed(2)}, losers=${val.losers.toFixed(2)}, diff=${val.diff.toFixed(2)}`)

  return { winRate, avgConditions, bestConditions }
}

// ============================================================================
// FIND OPTIMAL FILTERS
// ============================================================================

function findOptimalFilters(results: TradeResult[], direction: 'LONG' | 'SHORT') {
  // Test different filter thresholds and find what improves win rate
  const filters: { name: string; condition: (r: TradeResult) => boolean; winRate: number; trades: number; improvement: number }[] = []

  const baseWinRate = (results.filter(r => r.profitable).length / results.length) * 100

  // Test EMA20 slope filters
  for (const threshold of [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
    const filtered = direction === 'LONG'
      ? results.filter(r => r.conditions.ema20Slope > threshold)
      : results.filter(r => r.conditions.ema20Slope < threshold)

    if (filtered.length > 20) {
      const wr = (filtered.filter(r => r.profitable).length / filtered.length) * 100
      filters.push({
        name: `ema20Slope ${direction === 'LONG' ? '>' : '<'} ${threshold}`,
        condition: direction === 'LONG'
          ? (r) => r.conditions.ema20Slope > threshold
          : (r) => r.conditions.ema20Slope < threshold,
        winRate: wr,
        trades: filtered.length,
        improvement: wr - baseWinRate
      })
    }
  }

  // Test RSI filters
  for (const threshold of [30, 40, 50, 60, 70]) {
    const filtered = direction === 'LONG'
      ? results.filter(r => r.conditions.rsi < threshold)
      : results.filter(r => r.conditions.rsi > threshold)

    if (filtered.length > 20) {
      const wr = (filtered.filter(r => r.profitable).length / filtered.length) * 100
      filters.push({
        name: `RSI ${direction === 'LONG' ? '<' : '>'} ${threshold}`,
        condition: direction === 'LONG'
          ? (r) => r.conditions.rsi < threshold
          : (r) => r.conditions.rsi > threshold,
        winRate: wr,
        trades: filtered.length,
        improvement: wr - baseWinRate
      })
    }
  }

  // Test price vs VWAP filters
  for (const threshold of [-0.3, -0.15, 0, 0.15, 0.3]) {
    const filtered = direction === 'LONG'
      ? results.filter(r => r.conditions.priceVsVwap < threshold)
      : results.filter(r => r.conditions.priceVsVwap > threshold)

    if (filtered.length > 20) {
      const wr = (filtered.filter(r => r.profitable).length / filtered.length) * 100
      filters.push({
        name: `priceVsVwap ${direction === 'LONG' ? '<' : '>'} ${threshold}`,
        condition: direction === 'LONG'
          ? (r) => r.conditions.priceVsVwap < threshold
          : (r) => r.conditions.priceVsVwap > threshold,
        winRate: wr,
        trades: filtered.length,
        improvement: wr - baseWinRate
      })
    }
  }

  // Test EMA alignment filters
  for (const threshold of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const filtered = direction === 'LONG'
      ? results.filter(r => r.conditions.emaAlignment > threshold)
      : results.filter(r => r.conditions.emaAlignment < threshold)

    if (filtered.length > 20) {
      const wr = (filtered.filter(r => r.profitable).length / filtered.length) * 100
      filters.push({
        name: `emaAlignment ${direction === 'LONG' ? '>' : '<'} ${threshold}`,
        condition: direction === 'LONG'
          ? (r) => r.conditions.emaAlignment > threshold
          : (r) => r.conditions.emaAlignment < threshold,
        winRate: wr,
        trades: filtered.length,
        improvement: wr - baseWinRate
      })
    }
  }

  // Sort by improvement
  filters.sort((a, b) => b.improvement - a.improvement)

  return {
    baseWinRate,
    bestFilters: filters.slice(0, 10)
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '60')

    console.log(`Fetching ${days} days of data...`)
    const candles = await fetchESData(days)

    if (candles.length < 200) {
      return NextResponse.json({ success: false, error: 'Insufficient data' })
    }

    console.log(`Analyzing ${candles.length} candles...`)
    const { longResults, shortResults } = analyzeAllTrades(candles)

    console.log(`Analyzing ${longResults.length} LONG trades and ${shortResults.length} SHORT trades...`)

    // Analyze what makes winning trades
    const longAnalysis = analyzeWinningConditions(longResults)
    const shortAnalysis = analyzeWinningConditions(shortResults)

    // Find optimal filters
    const longFilters = findOptimalFilters(longResults, 'LONG')
    const shortFilters = findOptimalFilters(shortResults, 'SHORT')

    return NextResponse.json({
      success: true,
      dataAnalyzed: {
        days,
        candles: candles.length,
        startDate: candles[0].dateStr,
        endDate: candles[candles.length - 1].dateStr
      },
      longTrades: {
        total: longResults.length,
        baseWinRate: longAnalysis.winRate.toFixed(1) + '%',
        bestConditions: longAnalysis.bestConditions,
        optimalFilters: longFilters.bestFilters.map(f => ({
          filter: f.name,
          winRate: f.winRate.toFixed(1) + '%',
          trades: f.trades,
          improvement: '+' + f.improvement.toFixed(1) + '%'
        }))
      },
      shortTrades: {
        total: shortResults.length,
        baseWinRate: shortAnalysis.winRate.toFixed(1) + '%',
        bestConditions: shortAnalysis.bestConditions,
        optimalFilters: shortFilters.bestFilters.map(f => ({
          filter: f.name,
          winRate: f.winRate.toFixed(1) + '%',
          trades: f.trades,
          improvement: '+' + f.improvement.toFixed(1) + '%'
        }))
      },
      recommendation: {
        message: 'Use these filters to decide when to trade LONG vs SHORT',
        longConditions: longFilters.bestFilters.slice(0, 3).map(f => f.name),
        shortConditions: shortFilters.bestFilters.slice(0, 3).map(f => f.name)
      }
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
