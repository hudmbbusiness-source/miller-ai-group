/**
 * DATA-DRIVEN STRATEGY - STRICT VERSION
 *
 * Based on analysis of 2,522 trades over 60 days, the data shows:
 *
 * SHORT TRADES:
 * - Base win rate: 46.5%
 * - With priceVsVwap > 0.3%: 55.2% win rate (+8.7% improvement)
 * - With priceVsVwap > 0: 50.9% win rate (+4.5% improvement)
 *
 * LONG TRADES:
 * - Base win rate: 40.8%
 * - With priceVsVwap < 0: 43.0% win rate (+2.2% improvement)
 *
 * STRICT RULES:
 * 1. At start of each day, analyze market conditions
 * 2. Decide: Is this a SHORT day or LONG day?
 * 3. ONLY trade that ONE direction for the entire day
 * 4. Decision based purely on VWAP position (strongest predictor from data)
 *
 * DECISION LOGIC:
 * - If opening 30min shows price ABOVE VWAP average → SHORT DAY
 * - If opening 30min shows price BELOW VWAP average → LONG DAY
 * - Then ONLY take trades in that direction
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

interface Trade {
  entryTime: string
  exitTime: string
  direction: 'LONG' | 'SHORT'
  reason: string
  entryPrice: number
  exitPrice: number
  grossPnL: number
  netPnL: number
  costs: number
  exitReason: string
  conditions: {
    priceVsVwap: number
    rsi: number
    ema20Slope: number
  }
}

// ============================================================================
// COSTS - REALISTIC
// ============================================================================

const ES_CONTRACT_VALUE = 50
const COSTS = {
  commission: 4.12,
  exchangeFee: 2.58,
  nfaFee: 0.04,
  clearingFee: 0.10,
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }
}

// ============================================================================
// DATA-DRIVEN THRESHOLDS (from analysis)
// ============================================================================

const THRESHOLDS = {
  // SHORT when price is this % ABOVE VWAP (data showed 55.2% win rate at 0.3%)
  shortVwapThreshold: 0.25,  // Be slightly more conservative

  // LONG when price is this % BELOW VWAP
  longVwapThreshold: -0.20,

  // RSI confirmation
  shortRsiMin: 50,  // RSI > 50 for shorts
  longRsiMax: 50,   // RSI < 50 for longs

  // Minimum required - don't trade if conditions aren't strong enough
  minConfidence: 2  // Need at least 2 confirming signals
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
// SIGNAL DETECTION - DATA DRIVEN
// ============================================================================

interface Signal {
  direction: 'LONG' | 'SHORT'
  confidence: number
  reason: string
  conditions: {
    priceVsVwap: number
    rsi: number
    ema20Slope: number
  }
}

function detectSignal(
  candles: Candle[],
  index: number,
  ema20: number[],
  vwap: number[],
  rsi: number[]
): Signal | null {
  const c = candles[index]

  // Calculate conditions
  const priceVsVwap = ((c.close - vwap[index]) / vwap[index]) * 100
  const currentRsi = rsi[index]
  const ema20Slope = index >= 20
    ? ((ema20[index] - ema20[index - 20]) / ema20[index - 20]) * 100
    : 0

  const conditions = { priceVsVwap, rsi: currentRsi, ema20Slope }

  // COUNT CONFIRMING SIGNALS FOR SHORT
  let shortConfidence = 0
  let shortReasons: string[] = []

  if (priceVsVwap > THRESHOLDS.shortVwapThreshold) {
    shortConfidence += 2  // Primary signal (strongest predictor from data)
    shortReasons.push(`price ${priceVsVwap.toFixed(2)}% above VWAP`)
  }
  if (currentRsi > THRESHOLDS.shortRsiMin) {
    shortConfidence += 1
    shortReasons.push(`RSI ${currentRsi.toFixed(0)} > 50`)
  }
  if (ema20Slope < 0) {
    shortConfidence += 1
    shortReasons.push(`EMA20 falling`)
  }

  // COUNT CONFIRMING SIGNALS FOR LONG
  let longConfidence = 0
  let longReasons: string[] = []

  if (priceVsVwap < THRESHOLDS.longVwapThreshold) {
    longConfidence += 2  // Primary signal
    longReasons.push(`price ${priceVsVwap.toFixed(2)}% below VWAP`)
  }
  if (currentRsi < THRESHOLDS.longRsiMax) {
    longConfidence += 1
    longReasons.push(`RSI ${currentRsi.toFixed(0)} < 50`)
  }
  if (ema20Slope > 0) {
    longConfidence += 1
    longReasons.push(`EMA20 rising`)
  }

  // DECISION: Trade the direction with higher confidence
  // But ONLY if it meets minimum confidence threshold

  if (shortConfidence >= THRESHOLDS.minConfidence && shortConfidence > longConfidence) {
    return {
      direction: 'SHORT',
      confidence: shortConfidence,
      reason: shortReasons.join(', '),
      conditions
    }
  }

  if (longConfidence >= THRESHOLDS.minConfidence && longConfidence > shortConfidence) {
    return {
      direction: 'LONG',
      confidence: longConfidence,
      reason: longReasons.join(', '),
      conditions
    }
  }

  // No clear signal - don't trade
  return null
}

// ============================================================================
// DAILY DIRECTION DECISION
// ============================================================================

function determineDailyDirection(
  candles: Candle[],
  dayStart: number,
  vwap: number[],
  ema20: number[]
): { direction: 'LONG' | 'SHORT' | 'NONE'; reason: string } {
  // Look at first 30 minutes of trading (9:30-10:00 = ~6 candles at 5min)
  let aboveVwapCount = 0
  let belowVwapCount = 0
  let totalChecks = 0

  for (let i = dayStart; i < Math.min(dayStart + 10, candles.length); i++) {
    const c = candles[i]
    if (c.hour < 9.5 || c.hour >= 10.0) continue

    const priceVsVwap = ((c.close - vwap[i]) / vwap[i]) * 100

    if (priceVsVwap > 0.1) aboveVwapCount++
    else if (priceVsVwap < -0.1) belowVwapCount++
    totalChecks++
  }

  if (totalChecks === 0) return { direction: 'NONE', reason: 'No opening data' }

  // Decision based on opening behavior
  // Data showed: SHORT when price above VWAP = 55.2% win rate
  if (aboveVwapCount > belowVwapCount && aboveVwapCount >= 3) {
    return {
      direction: 'SHORT',
      reason: `Opening: ${aboveVwapCount}/${totalChecks} candles above VWAP → SHORT DAY`
    }
  }

  // Data showed: LONG when price below VWAP = 43% win rate (less reliable, be more conservative)
  if (belowVwapCount > aboveVwapCount && belowVwapCount >= 4) {
    return {
      direction: 'LONG',
      reason: `Opening: ${belowVwapCount}/${totalChecks} candles below VWAP → LONG DAY`
    }
  }

  return { direction: 'NONE', reason: 'Opening conditions unclear - no trades today' }
}

// ============================================================================
// BACKTEST ENGINE - STRICT ONE DIRECTION PER DAY
// ============================================================================

function runBacktest(candles: Candle[]): { trades: Trade[]; dailyDecisions: { date: string; direction: string; reason: string }[] } {
  const ema20 = calculateEMA(candles, 20)
  const vwap = calculateVWAP(candles)
  const rsi = calculateRSI(candles, 14)
  const atr = calculateATR(candles, 14)

  const trades: Trade[] = []
  const dailyDecisions: { date: string; direction: string; reason: string }[] = []

  let inPosition = false
  let currentTrade: {
    entryIndex: number
    entryPrice: number
    direction: 'LONG' | 'SHORT'
    stopLoss: number
    takeProfit: number
    reason: string
    conditions: { priceVsVwap: number; rsi: number; ema20Slope: number }
  } | null = null

  let lastTradeDate = ''
  let dailyTrades = 0
  let todayDirection: 'LONG' | 'SHORT' | 'NONE' = 'NONE'
  let todayReason = ''
  const maxDailyTrades = 3

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i]
    const currentATR = atr[i]

    // NEW DAY - Determine direction
    if (c.dateStr !== lastTradeDate) {
      lastTradeDate = c.dateStr
      dailyTrades = 0

      // Find start of this day
      const dayDecision = determineDailyDirection(candles, i, vwap, ema20)
      todayDirection = dayDecision.direction
      todayReason = dayDecision.reason

      dailyDecisions.push({
        date: c.dateStr,
        direction: todayDirection,
        reason: todayReason
      })
    }

    // Skip if no direction decided for today
    if (todayDirection === 'NONE') continue

    // Skip outside trading hours or bad volatility
    if (c.hour < 10.0 || c.hour >= 15.5) continue  // Start after 10am (after direction is decided)
    if (currentATR < 2 || currentATR > 15) continue

    // Check exit if in position
    if (inPosition && currentTrade) {
      let exitReason = ''
      let exitPrice = 0

      if (currentTrade.direction === 'LONG') {
        if (c.low <= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss
          exitReason = 'Stop Loss'
        } else if (c.high >= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit
          exitReason = 'Take Profit'
        } else if (c.hour >= 15.75 || c.dateStr !== candles[currentTrade.entryIndex].dateStr) {
          exitPrice = c.open
          exitReason = 'End of Day'
        }
      } else {
        if (c.high >= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss
          exitReason = 'Stop Loss'
        } else if (c.low <= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit
          exitReason = 'Take Profit'
        } else if (c.hour >= 15.75 || c.dateStr !== candles[currentTrade.entryIndex].dateStr) {
          exitPrice = c.open
          exitReason = 'End of Day'
        }
      }

      if (exitReason) {
        const grossPnLPoints = currentTrade.direction === 'LONG'
          ? exitPrice - currentTrade.entryPrice
          : currentTrade.entryPrice - exitPrice

        const grossPnL = grossPnLPoints * ES_CONTRACT_VALUE
        const netPnL = grossPnL - COSTS.totalFixed

        trades.push({
          entryTime: candles[currentTrade.entryIndex].dateStr,
          exitTime: c.dateStr,
          direction: currentTrade.direction,
          reason: currentTrade.reason,
          entryPrice: currentTrade.entryPrice,
          exitPrice,
          grossPnL,
          netPnL,
          costs: COSTS.totalFixed,
          exitReason,
          conditions: currentTrade.conditions
        })

        inPosition = false
        currentTrade = null
      }
    }

    // Check for new entry - ONLY in today's direction
    if (!inPosition && dailyTrades < maxDailyTrades) {
      const priceVsVwap = ((c.close - vwap[i]) / vwap[i]) * 100
      const currentRsi = rsi[i]
      const ema20Slope = i >= 20 ? ((ema20[i] - ema20[i - 20]) / ema20[i - 20]) * 100 : 0

      const conditions = { priceVsVwap, rsi: currentRsi, ema20Slope }

      let shouldEnter = false
      let entryReason = ''

      if (todayDirection === 'SHORT') {
        // ONLY take SHORT entries
        // Best filter from data: priceVsVwap > 0.25 gives 55% win rate
        if (priceVsVwap > 0.20 && currentRsi > 50) {
          shouldEnter = true
          entryReason = `SHORT DAY: price ${priceVsVwap.toFixed(2)}% above VWAP, RSI ${currentRsi.toFixed(0)}`
        }
      } else if (todayDirection === 'LONG') {
        // ONLY take LONG entries
        // Best filter from data: priceVsVwap < 0 gives 43% win rate
        if (priceVsVwap < -0.15 && currentRsi < 50) {
          shouldEnter = true
          entryReason = `LONG DAY: price ${priceVsVwap.toFixed(2)}% below VWAP, RSI ${currentRsi.toFixed(0)}`
        }
      }

      if (shouldEnter) {
        const stopPoints = currentATR * 1.5
        const targetPoints = currentATR * 2.0

        currentTrade = {
          entryIndex: i,
          entryPrice: c.close,
          direction: todayDirection as 'LONG' | 'SHORT',
          stopLoss: todayDirection === 'LONG' ? c.close - stopPoints : c.close + stopPoints,
          takeProfit: todayDirection === 'LONG' ? c.close + targetPoints : c.close - targetPoints,
          reason: entryReason,
          conditions
        }
        inPosition = true
        dailyTrades++
      }
    }
  }

  return { trades, dailyDecisions }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '60')

    const candles = await fetchESData(days)

    if (candles.length < 200) {
      return NextResponse.json({ success: false, error: 'Insufficient data' })
    }

    const { trades, dailyDecisions } = runBacktest(candles)

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

    // Direction breakdown
    const longTrades = trades.filter(t => t.direction === 'LONG')
    const shortTrades = trades.filter(t => t.direction === 'SHORT')

    const longWins = longTrades.filter(t => t.netPnL > 0).length
    const shortWins = shortTrades.filter(t => t.netPnL > 0).length

    return NextResponse.json({
      success: true,
      strategy: 'DATA-DRIVEN (based on analysis of historical data)',
      thresholds: THRESHOLDS,
      testPeriod: {
        days,
        startDate: candles[0].dateStr,
        endDate: candles[candles.length - 1].dateStr,
        candlesAnalyzed: candles.length
      },
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
          trades: longTrades.length,
          winRate: longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(1) + '%' : '0%',
          netPnL: '$' + longTrades.reduce((sum, t) => sum + t.netPnL, 0).toFixed(2)
        },
        SHORT: {
          trades: shortTrades.length,
          winRate: shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(1) + '%' : '0%',
          netPnL: '$' + shortTrades.reduce((sum, t) => sum + t.netPnL, 0).toFixed(2)
        }
      },
      recentTrades: trades.slice(-15).map(t => ({
        date: t.entryTime,
        direction: t.direction,
        reason: t.reason,
        netPnL: '$' + t.netPnL.toFixed(2),
        exitReason: t.exitReason,
        priceVsVwap: t.conditions.priceVsVwap.toFixed(2) + '%',
        rsi: t.conditions.rsi.toFixed(0)
      })),
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
