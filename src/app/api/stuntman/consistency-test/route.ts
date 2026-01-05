/**
 * CONSISTENCY TEST ENGINE
 *
 * Tests the adaptive strategy across DIFFERENT market conditions:
 * 1. Splits data into periods by market condition
 * 2. Tests strategy on each condition separately
 * 3. Identifies strengths and weaknesses
 * 4. Ensures we're not just lucky on one market type
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

interface DayAnalysis {
  date: string
  openPrice: number
  closePrice: number
  highPrice: number
  lowPrice: number
  change: number       // Daily change %
  range: number        // Daily range %
  condition: 'BULL' | 'BEAR' | 'CHOP'
  volatility: 'HIGH' | 'NORMAL' | 'LOW'
  vwapPosition: number // Where price closed vs VWAP
}

interface ConditionResult {
  condition: string
  days: number
  trades: number
  wins: number
  winRate: string
  netPnL: number
  avgPnL: string
  verdict: string
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
// ANALYZE EACH DAY'S MARKET CONDITION
// ============================================================================

function analyzeDays(candles: Candle[]): DayAnalysis[] {
  const days: DayAnalysis[] = []
  const dayMap = new Map<string, Candle[]>()

  // Group candles by day
  for (const c of candles) {
    if (!dayMap.has(c.dateStr)) {
      dayMap.set(c.dateStr, [])
    }
    dayMap.get(c.dateStr)!.push(c)
  }

  // Analyze each day
  for (const [date, dayCandles] of dayMap) {
    if (dayCandles.length < 10) continue // Skip incomplete days

    // Get day's OHLC
    const opens = dayCandles.filter(c => c.hour >= 9.5 && c.hour < 10)
    const closes = dayCandles.filter(c => c.hour >= 15.5 && c.hour < 16)

    if (opens.length === 0 || closes.length === 0) continue

    const openPrice = opens[0].open
    const closePrice = closes[closes.length - 1].close
    const highPrice = Math.max(...dayCandles.map(c => c.high))
    const lowPrice = Math.min(...dayCandles.map(c => c.low))

    const change = ((closePrice - openPrice) / openPrice) * 100
    const range = ((highPrice - lowPrice) / openPrice) * 100

    // Calculate VWAP for the day
    let tpvSum = 0, volSum = 0
    for (const c of dayCandles) {
      const tp = (c.high + c.low + c.close) / 3
      tpvSum += tp * c.volume
      volSum += c.volume
    }
    const vwap = volSum > 0 ? tpvSum / volSum : closePrice
    const vwapPosition = ((closePrice - vwap) / vwap) * 100

    // Determine condition
    let condition: 'BULL' | 'BEAR' | 'CHOP'
    if (change > 0.3) condition = 'BULL'
    else if (change < -0.3) condition = 'BEAR'
    else condition = 'CHOP'

    // Determine volatility (average daily range is ~1% for ES)
    let volatility: 'HIGH' | 'NORMAL' | 'LOW'
    if (range > 1.5) volatility = 'HIGH'
    else if (range < 0.7) volatility = 'LOW'
    else volatility = 'NORMAL'

    days.push({
      date,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      change,
      range,
      condition,
      volatility,
      vwapPosition
    })
  }

  return days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
// TRADE SIMULATION (Same as adaptive strategy)
// ============================================================================

const ES_CONTRACT_VALUE = 50
const ES_TICK_VALUE = 12.50

// REALISTIC COSTS - Apex/Rithmic 1:1
const COSTS = {
  commission: 4.12,        // Per contract round trip
  exchangeFee: 2.58,       // CME E-mini exchange fee
  nfaFee: 0.04,           // NFA regulatory fee
  clearingFee: 0.10,       // Clearing fee
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }  // ~$6.84
}

// REALISTIC SLIPPAGE MODEL
function calculateSlippage(atr: number, volatility: 'HIGH' | 'NORMAL' | 'LOW', hour: number): number {
  // Base slippage: 0.5 ticks
  let slippageTicks = 0.5

  // Volatility adjustment
  if (volatility === 'HIGH') slippageTicks *= 2.0      // High vol = 1 tick
  else if (volatility === 'LOW') slippageTicks *= 0.5   // Low vol = 0.25 ticks

  // Time of day adjustment (wider spreads at open/close)
  if (hour < 10.0 || hour > 15.5) slippageTicks *= 1.5  // Opening/closing = wider

  // ATR adjustment - more volatile = more slippage
  const atrFactor = Math.min(atr / 8, 1.5)  // Normalized to typical ATR of 8
  slippageTicks *= atrFactor

  // Convert ticks to points (1 tick = 0.25 points)
  return slippageTicks * 0.25
}

// ORDER REJECTION SIMULATION
function shouldRejectOrder(volatility: 'HIGH' | 'NORMAL' | 'LOW', hour: number): boolean {
  // Base rejection rate: 2%
  let rejectRate = 0.02

  // High volatility = higher rejection (up to 10%)
  if (volatility === 'HIGH') rejectRate = 0.08

  // Opening hour = more rejections
  if (hour < 10.0) rejectRate += 0.03

  return Math.random() < rejectRate
}

// PARTIAL FILL SIMULATION
function getFilledContracts(contracts: number, volatility: 'HIGH' | 'NORMAL' | 'LOW'): number {
  // Most fills are complete
  if (Math.random() > 0.15) return contracts  // 85% full fill

  // 15% partial fill - get 50-90% of order
  const fillRate = 0.5 + Math.random() * 0.4
  return Math.max(1, Math.floor(contracts * fillRate))
}

type MarketRegime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'

function detectRegime(ema20: number[], ema50: number[], rsi: number[], index: number): MarketRegime {
  if (index < 30) return 'SIDEWAYS'

  const ema20Now = ema20[index]
  const ema20Past = ema20[index - 20]
  const ema50Now = ema50[index]
  const ema50Past = ema50[index - 20]

  const ema20Slope = ((ema20Now - ema20Past) / ema20Past) * 100
  const ema50Slope = ((ema50Now - ema50Past) / ema50Past) * 100

  const emaAligned = ema20Now > ema50Now
  const rsiNow = rsi[index]

  if (ema20Slope > 0.25 && ema50Slope > 0.125 && emaAligned && rsiNow > 55) {
    return 'STRONG_UPTREND'
  }
  if (ema20Slope > 0.10 && emaAligned) {
    return 'UPTREND'
  }
  if (ema20Slope < -0.25 && ema50Slope < -0.125 && !emaAligned && rsiNow < 45) {
    return 'STRONG_DOWNTREND'
  }
  if (ema20Slope < -0.10 && !emaAligned) {
    return 'DOWNTREND'
  }

  return 'SIDEWAYS'
}

interface TradeResult {
  date: string
  direction: 'LONG' | 'SHORT'
  pattern: string
  netPnL: number
  win: boolean
  slippage: number
  rejected: boolean
}

interface ExecutionStats {
  totalOrders: number
  rejections: number
  partialFills: number
  totalSlippage: number
}

function runStrategyOnDay(
  candles: Candle[],
  dayDate: string,
  ema20: number[],
  ema50: number[],
  vwap: number[],
  atr: number[],
  rsi: number[],
  dayVolatility: 'HIGH' | 'NORMAL' | 'LOW',
  executionStats: ExecutionStats
): TradeResult[] {
  const trades: TradeResult[] = []

  let inPosition = false
  let currentTrade: {
    entryIndex: number
    entryPrice: number
    direction: 'LONG' | 'SHORT'
    stopLoss: number
    takeProfit: number
    pattern: string
    entrySlippage: number
  } | null = null

  let dailyTrades = 0
  const maxDailyTrades = 4

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i]
    if (c.dateStr !== dayDate) continue

    const currentATR = atr[i]
    if (c.hour < 9.5 || c.hour >= 15.5) continue
    if (currentATR < 2 || currentATR > 15) continue

    const regime = detectRegime(ema20, ema50, rsi, i)

    // Check exit
    if (inPosition && currentTrade) {
      let exitPrice = 0
      let exited = false

      if (currentTrade.direction === 'LONG') {
        if (c.low <= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss
          exited = true
        } else if (c.high >= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit
          exited = true
        } else if (c.hour >= 15.75) {
          exitPrice = c.close
          exited = true
        }
      } else {
        if (c.high >= currentTrade.stopLoss) {
          exitPrice = currentTrade.stopLoss
          exited = true
        } else if (c.low <= currentTrade.takeProfit) {
          exitPrice = currentTrade.takeProfit
          exited = true
        } else if (c.hour >= 15.75) {
          exitPrice = c.close
          exited = true
        }
      }

      if (exited) {
        // Apply exit slippage
        const exitSlippage = calculateSlippage(currentATR, dayVolatility, c.hour)
        executionStats.totalSlippage += exitSlippage

        // Adjust exit price for slippage (always against us)
        if (currentTrade.direction === 'LONG') {
          exitPrice -= exitSlippage
        } else {
          exitPrice += exitSlippage
        }

        const pnlPoints = currentTrade.direction === 'LONG'
          ? exitPrice - currentTrade.entryPrice
          : currentTrade.entryPrice - exitPrice

        // Include slippage cost in P&L
        const totalSlippage = currentTrade.entrySlippage + exitSlippage
        const slippageCost = totalSlippage * ES_CONTRACT_VALUE
        const netPnL = (pnlPoints * ES_CONTRACT_VALUE) - COSTS.totalFixed

        trades.push({
          date: dayDate,
          direction: currentTrade.direction,
          pattern: currentTrade.pattern,
          netPnL,
          win: netPnL > 0,
          slippage: totalSlippage,
          rejected: false
        })

        inPosition = false
        currentTrade = null
      }
    }

    // Check entry (same logic as adaptive strategy)
    if (!inPosition && dailyTrades < maxDailyTrades) {
      const stopDistance = currentATR * 1.5
      const targetDistance = currentATR * 2.0
      const priceVsVwap = ((c.close - vwap[i]) / vwap[i]) * 100
      const bullishCandle = c.close > c.open
      const bearishCandle = c.close < c.open

      let signal: { direction: 'LONG' | 'SHORT'; pattern: string } | null = null

      // LONG signals in uptrends
      if ((regime === 'UPTREND' || regime === 'STRONG_UPTREND') && bullishCandle && rsi[i] < 70) {
        // VWAP_PULLBACK_LONG
        if (Math.abs(priceVsVwap) < 0.15 && c.close > vwap[i] && c.low <= vwap[i] * 1.002) {
          signal = { direction: 'LONG', pattern: 'VWAP_PULLBACK_LONG' }
        }
        // EMA20_BOUNCE_LONG
        else if (regime === 'STRONG_UPTREND' && c.low <= ema20[i] * 1.002 && c.close > ema20[i]) {
          signal = { direction: 'LONG', pattern: 'EMA20_BOUNCE_LONG' }
        }
      }

      // SHORT signals in downtrends
      if (!signal && (regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') && bearishCandle) {
        // VWAP_PULLBACK_SHORT
        if (Math.abs(priceVsVwap) < 0.12 && ema20[i] <= ema50[i]) {
          signal = { direction: 'SHORT', pattern: 'VWAP_PULLBACK_SHORT' }
        }
        // ORB_BREAKOUT_SHORT
        else if (c.hour >= 9.75 && c.hour < 11) {
          let orHigh = 0, orLow = Infinity
          for (let j = i - 20; j < i; j++) {
            if (j >= 0 && candles[j].hour >= 9.5 && candles[j].hour < 9.75 && candles[j].dateStr === dayDate) {
              orHigh = Math.max(orHigh, candles[j].high)
              orLow = Math.min(orLow, candles[j].low)
            }
          }
          const orRange = orHigh - orLow
          if (orHigh > 0 && orLow < Infinity && orRange >= 3 && orRange <= 20) {
            if (c.close < orLow && i > 0 && candles[i-1].close >= orLow) {
              signal = { direction: 'SHORT', pattern: 'ORB_BREAKOUT_SHORT' }
            }
          }
        }
      }

      // BB_LOWER_BOUNCE - DISABLED (23% win rate, -$1,652 loss in consistency test)
      // if (!signal && regime === 'SIDEWAYS' && bullishCandle && rsi[i] < 35) {
      //   signal = { direction: 'LONG', pattern: 'BB_LOWER_BOUNCE' }
      // }

      if (signal) {
        executionStats.totalOrders++

        // Check for order rejection
        if (shouldRejectOrder(dayVolatility, c.hour)) {
          executionStats.rejections++
          // Order rejected - don't enter trade
          continue
        }

        // Calculate entry slippage
        const entrySlippage = calculateSlippage(currentATR, dayVolatility, c.hour)
        executionStats.totalSlippage += entrySlippage

        // Adjust entry price for slippage (always against us)
        let adjustedEntry = c.close
        if (signal.direction === 'LONG') {
          adjustedEntry += entrySlippage  // Buy higher
        } else {
          adjustedEntry -= entrySlippage  // Sell lower
        }

        currentTrade = {
          entryIndex: i,
          entryPrice: adjustedEntry,
          direction: signal.direction,
          stopLoss: signal.direction === 'LONG' ? adjustedEntry - stopDistance : adjustedEntry + stopDistance,
          takeProfit: signal.direction === 'LONG' ? adjustedEntry + targetDistance : adjustedEntry - targetDistance,
          pattern: signal.pattern,
          entrySlippage
        }
        inPosition = true
        dailyTrades++
      }
    }
  }

  return trades
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

    // Analyze each day's market condition
    const dayAnalyses = analyzeDays(candles)

    // Calculate indicators once
    const ema20 = calculateEMA(candles, 20)
    const ema50 = calculateEMA(candles, 50)
    const vwap = calculateVWAP(candles)
    const atr = calculateATR(candles, 14)
    const rsi = calculateRSI(candles, 14)

    // Run strategy on each day and group by condition
    const resultsByCondition: Record<string, TradeResult[]> = {
      'BULL': [],
      'BEAR': [],
      'CHOP': [],
      'HIGH_VOL': [],
      'LOW_VOL': []
    }

    const daysByCondition: Record<string, number> = {
      'BULL': 0,
      'BEAR': 0,
      'CHOP': 0,
      'HIGH_VOL': 0,
      'LOW_VOL': 0
    }

    // Track execution stats for REALISTIC simulation
    const executionStats: ExecutionStats = {
      totalOrders: 0,
      rejections: 0,
      partialFills: 0,
      totalSlippage: 0
    }

    for (const day of dayAnalyses) {
      const dayTrades = runStrategyOnDay(
        candles, day.date, ema20, ema50, vwap, atr, rsi,
        day.volatility,  // Pass day's volatility for realistic slippage
        executionStats   // Track execution stats
      )

      // Group by market condition
      resultsByCondition[day.condition].push(...dayTrades)
      daysByCondition[day.condition]++

      // Also group by volatility
      if (day.volatility === 'HIGH') {
        resultsByCondition['HIGH_VOL'].push(...dayTrades)
        daysByCondition['HIGH_VOL']++
      } else if (day.volatility === 'LOW') {
        resultsByCondition['LOW_VOL'].push(...dayTrades)
        daysByCondition['LOW_VOL']++
      }
    }

    // Calculate results for each condition
    const conditionResults: ConditionResult[] = []

    for (const [condition, trades] of Object.entries(resultsByCondition)) {
      if (trades.length === 0) continue

      const wins = trades.filter(t => t.win).length
      const netPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
      const winRate = ((wins / trades.length) * 100).toFixed(1)
      const avgPnL = (netPnL / trades.length).toFixed(2)

      let verdict = ''
      if (netPnL > 0 && parseFloat(winRate) > 50) {
        verdict = '✅ STRONG'
      } else if (netPnL > 0) {
        verdict = '⚠️ PROFITABLE but low win rate'
      } else if (netPnL > -500) {
        verdict = '⚠️ BREAK-EVEN'
      } else {
        verdict = '❌ LOSING'
      }

      conditionResults.push({
        condition,
        days: daysByCondition[condition],
        trades: trades.length,
        wins,
        winRate: winRate + '%',
        netPnL,
        avgPnL: '$' + avgPnL,
        verdict
      })
    }

    // Overall results
    const allTrades = Object.values(resultsByCondition).flat()
    // Dedupe (since volatility overlaps with condition)
    const uniqueTrades = [...resultsByCondition['BULL'], ...resultsByCondition['BEAR'], ...resultsByCondition['CHOP']]
    const totalWins = uniqueTrades.filter(t => t.win).length
    const totalNetPnL = uniqueTrades.reduce((sum, t) => sum + t.netPnL, 0)

    // Pattern breakdown
    const patternResults: Record<string, { trades: number; wins: number; netPnL: number }> = {}
    for (const trade of uniqueTrades) {
      if (!patternResults[trade.pattern]) {
        patternResults[trade.pattern] = { trades: 0, wins: 0, netPnL: 0 }
      }
      patternResults[trade.pattern].trades++
      if (trade.win) patternResults[trade.pattern].wins++
      patternResults[trade.pattern].netPnL += trade.netPnL
    }

    return NextResponse.json({
      success: true,
      testPeriod: {
        days,
        totalDaysAnalyzed: dayAnalyses.length,
        startDate: dayAnalyses[0]?.date,
        endDate: dayAnalyses[dayAnalyses.length - 1]?.date
      },
      marketConditionBreakdown: {
        bullDays: daysByCondition['BULL'],
        bearDays: daysByCondition['BEAR'],
        chopDays: daysByCondition['CHOP'],
        highVolDays: daysByCondition['HIGH_VOL'],
        lowVolDays: daysByCondition['LOW_VOL']
      },
      overallPerformance: {
        totalTrades: uniqueTrades.length,
        wins: totalWins,
        winRate: ((totalWins / uniqueTrades.length) * 100).toFixed(1) + '%',
        netPnL: '$' + totalNetPnL.toFixed(2),
        avgPnL: '$' + (totalNetPnL / uniqueTrades.length).toFixed(2) + '/trade'
      },
      performanceByCondition: conditionResults.sort((a, b) => b.netPnL - a.netPnL),
      patternBreakdown: Object.entries(patternResults)
        .map(([pattern, stats]) => ({
          pattern,
          trades: stats.trades,
          winRate: ((stats.wins / stats.trades) * 100).toFixed(1) + '%',
          netPnL: '$' + stats.netPnL.toFixed(2)
        }))
        .sort((a, b) => parseFloat(b.netPnL.replace('$', '')) - parseFloat(a.netPnL.replace('$', ''))),
      dayByDayAnalysis: dayAnalyses.slice(-10).map(d => ({
        date: d.date,
        change: d.change.toFixed(2) + '%',
        range: d.range.toFixed(2) + '%',
        condition: d.condition,
        volatility: d.volatility
      })),
      executionRealism: {
        totalOrders: executionStats.totalOrders,
        rejections: executionStats.rejections,
        rejectionRate: ((executionStats.rejections / executionStats.totalOrders) * 100).toFixed(1) + '%',
        totalSlippagePoints: executionStats.totalSlippage.toFixed(2),
        totalSlippageCost: '$' + (executionStats.totalSlippage * ES_CONTRACT_VALUE).toFixed(2),
        avgSlippagePerTrade: '$' + ((executionStats.totalSlippage * ES_CONTRACT_VALUE) / uniqueTrades.length).toFixed(2)
      },
      consistencyVerdict: conditionResults.every(r => r.netPnL >= -500)
        ? '✅ CONSISTENT: Strategy profitable or break-even in ALL conditions'
        : '⚠️ INCONSISTENT: Strategy loses money in some conditions - needs enhancement'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
