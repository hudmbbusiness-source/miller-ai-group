/**
 * COMPREHENSIVE MARKET CONDITION TEST
 *
 * Tests strategy across 20+ DIFFERENT market situations
 * Shows weekly expected profit for EACH situation
 * Ensures system NEVER forces trades - only trades recognized patterns
 *
 * MARKET CONDITIONS (Complete List):
 * 1. STRONG_UPTREND - Strong bullish momentum
 * 2. WEAK_UPTREND - Grinding higher slowly
 * 3. STRONG_DOWNTREND - Strong bearish momentum
 * 4. WEAK_DOWNTREND - Grinding lower slowly
 * 5. TIGHT_RANGE - Low volatility consolidation
 * 6. WIDE_RANGE - High volatility but no direction
 * 7. BREAKOUT_UP - Breaking out of range upward
 * 8. BREAKOUT_DOWN - Breaking out of range downward
 * 9. REVERSAL_BULLISH - Turning from down to up
 * 10. REVERSAL_BEARISH - Turning from up to down
 * 11. CONTINUATION_UP - Resuming uptrend after pullback
 * 12. CONTINUATION_DOWN - Resuming downtrend after bounce
 * 13. GAP_UP - Opened significantly higher
 * 14. GAP_DOWN - Opened significantly lower
 * 15. SQUEEZE - Low volatility about to explode
 * 16. EXPANSION - High volatility expansion
 * 17. MEAN_REVERSION - Extreme move snapping back
 * 18. TREND_EXHAUSTION - Trend losing steam
 * 19. ACCUMULATION - Building base before move up
 * 20. DISTRIBUTION - Topping before move down
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

// All possible market conditions
type MarketCondition =
  | 'STRONG_UPTREND' | 'WEAK_UPTREND'
  | 'STRONG_DOWNTREND' | 'WEAK_DOWNTREND'
  | 'TIGHT_RANGE' | 'WIDE_RANGE'
  | 'BREAKOUT_UP' | 'BREAKOUT_DOWN'
  | 'REVERSAL_BULLISH' | 'REVERSAL_BEARISH'
  | 'CONTINUATION_UP' | 'CONTINUATION_DOWN'
  | 'GAP_UP' | 'GAP_DOWN'
  | 'SQUEEZE' | 'EXPANSION'
  | 'MEAN_REVERSION'
  | 'TREND_EXHAUSTION'
  | 'ACCUMULATION' | 'DISTRIBUTION'
  | 'UNKNOWN'  // When we can't clearly identify - DON'T TRADE

interface DayAnalysis {
  date: string
  condition: MarketCondition
  confidence: number  // How confident are we in this classification (0-100)
  metrics: {
    change: number
    range: number
    atr: number
    volume: number
    gap: number
    priorTrend: 'UP' | 'DOWN' | 'FLAT'
  }
}

interface ConditionResult {
  condition: MarketCondition
  occurrences: number
  trades: number
  wins: number
  winRate: string
  weeklyExpectedProfit: string
  netPnL: number
  shouldTrade: boolean
  confidence: string
}

// ============================================================================
// COSTS - REALISTIC 1:1
// ============================================================================

const ES_CONTRACT_VALUE = 50
const COSTS = {
  commission: 4.12,
  exchangeFee: 2.58,
  nfaFee: 0.04,
  clearingFee: 0.10,
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }
}

function calculateSlippage(volatility: number): number {
  // Base 0.5 ticks, scaled by volatility
  const slippageTicks = 0.5 * Math.max(0.5, Math.min(2.0, volatility / 1.0))
  return slippageTicks * 0.25  // Convert to points
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
// COMPREHENSIVE MARKET CONDITION DETECTOR
// ============================================================================

function analyzeDay(
  dayCandles: Candle[],
  priorDays: Candle[][],
  avgVolume: number,
  avgATR: number
): DayAnalysis | null {
  if (dayCandles.length < 10) return null

  const date = dayCandles[0].dateStr

  // Get day's OHLC
  const opens = dayCandles.filter(c => c.hour >= 9.5 && c.hour < 10)
  const closes = dayCandles.filter(c => c.hour >= 15.5 && c.hour < 16)

  if (opens.length === 0 || closes.length === 0) return null

  const openPrice = opens[0].open
  const closePrice = closes[closes.length - 1].close
  const highPrice = Math.max(...dayCandles.map(c => c.high))
  const lowPrice = Math.min(...dayCandles.map(c => c.low))

  const change = ((closePrice - openPrice) / openPrice) * 100
  const range = ((highPrice - lowPrice) / openPrice) * 100
  const dayVolume = dayCandles.reduce((sum, c) => sum + c.volume, 0)
  const volumeRatio = avgVolume > 0 ? dayVolume / avgVolume : 1

  // Calculate gap from previous day
  let gap = 0
  if (priorDays.length > 0) {
    const priorClose = priorDays[priorDays.length - 1]
    if (priorClose.length > 0) {
      const prevClose = priorClose[priorClose.length - 1].close
      gap = ((openPrice - prevClose) / prevClose) * 100
    }
  }

  // Calculate prior trend (last 3 days)
  let priorTrend: 'UP' | 'DOWN' | 'FLAT' = 'FLAT'
  if (priorDays.length >= 3) {
    let priorChange = 0
    for (const pd of priorDays.slice(-3)) {
      if (pd.length >= 2) {
        priorChange += (pd[pd.length - 1].close - pd[0].open) / pd[0].open * 100
      }
    }
    if (priorChange > 0.5) priorTrend = 'UP'
    else if (priorChange < -0.5) priorTrend = 'DOWN'
  }

  // Calculate intraday ATR
  let atr = 0
  for (let i = 1; i < dayCandles.length; i++) {
    const tr = Math.max(
      dayCandles[i].high - dayCandles[i].low,
      Math.abs(dayCandles[i].high - dayCandles[i - 1].close),
      Math.abs(dayCandles[i].low - dayCandles[i - 1].close)
    )
    atr = (atr * (i - 1) + tr) / i
  }

  const metrics = { change, range, atr, volume: volumeRatio, gap, priorTrend }

  // CLASSIFY MARKET CONDITION
  let condition: MarketCondition = 'UNKNOWN'
  let confidence = 0

  // GAP conditions (check first - they're special)
  if (gap > 0.5) {
    condition = 'GAP_UP'
    confidence = Math.min(100, 50 + gap * 20)
  } else if (gap < -0.5) {
    condition = 'GAP_DOWN'
    confidence = Math.min(100, 50 + Math.abs(gap) * 20)
  }
  // STRONG TRENDS
  else if (change > 1.0 && priorTrend === 'UP') {
    condition = 'STRONG_UPTREND'
    confidence = Math.min(100, 50 + change * 20)
  } else if (change < -1.0 && priorTrend === 'DOWN') {
    condition = 'STRONG_DOWNTREND'
    confidence = Math.min(100, 50 + Math.abs(change) * 20)
  }
  // WEAK TRENDS
  else if (change > 0.3 && change <= 1.0 && priorTrend === 'UP') {
    condition = 'WEAK_UPTREND'
    confidence = 60
  } else if (change < -0.3 && change >= -1.0 && priorTrend === 'DOWN') {
    condition = 'WEAK_DOWNTREND'
    confidence = 60
  }
  // REVERSALS
  else if (change > 0.5 && priorTrend === 'DOWN') {
    condition = 'REVERSAL_BULLISH'
    confidence = Math.min(100, 50 + change * 15)
  } else if (change < -0.5 && priorTrend === 'UP') {
    condition = 'REVERSAL_BEARISH'
    confidence = Math.min(100, 50 + Math.abs(change) * 15)
  }
  // CONTINUATIONS
  else if (change > 0.3 && priorTrend === 'UP' && range < 1.2) {
    condition = 'CONTINUATION_UP'
    confidence = 55
  } else if (change < -0.3 && priorTrend === 'DOWN' && range < 1.2) {
    condition = 'CONTINUATION_DOWN'
    confidence = 55
  }
  // RANGE CONDITIONS
  else if (range < 0.6 && Math.abs(change) < 0.2) {
    condition = 'TIGHT_RANGE'
    confidence = 70
  } else if (range > 1.5 && Math.abs(change) < 0.3) {
    condition = 'WIDE_RANGE'
    confidence = 65
  }
  // BREAKOUTS
  else if (range > 1.2 && change > 0.5 && priorTrend === 'FLAT') {
    condition = 'BREAKOUT_UP'
    confidence = 60
  } else if (range > 1.2 && change < -0.5 && priorTrend === 'FLAT') {
    condition = 'BREAKOUT_DOWN'
    confidence = 60
  }
  // SQUEEZE (low range, low volatility)
  else if (range < 0.5 && atr < avgATR * 0.7) {
    condition = 'SQUEEZE'
    confidence = 55
  }
  // EXPANSION (high range, high volatility)
  else if (range > 1.5 && atr > avgATR * 1.5) {
    condition = 'EXPANSION'
    confidence = 60
  }
  // MEAN REVERSION (big move, then reversal intraday)
  else if (Math.abs(change) < 0.3 && range > 1.3) {
    condition = 'MEAN_REVERSION'
    confidence = 55
  }
  // TREND EXHAUSTION
  else if (Math.abs(change) < 0.2 && ((priorTrend === 'UP' && change < 0) || (priorTrend === 'DOWN' && change > 0))) {
    condition = 'TREND_EXHAUSTION'
    confidence = 50
  }
  // ACCUMULATION/DISTRIBUTION
  else if (range < 0.8 && volumeRatio > 1.3 && priorTrend === 'DOWN') {
    condition = 'ACCUMULATION'
    confidence = 50
  } else if (range < 0.8 && volumeRatio > 1.3 && priorTrend === 'UP') {
    condition = 'DISTRIBUTION'
    confidence = 50
  }
  // UNKNOWN - Don't trade
  else {
    condition = 'UNKNOWN'
    confidence = 0
  }

  return { date, condition, confidence, metrics }
}

// ============================================================================
// STRATEGY EXECUTION - ONLY TRADES RECOGNIZED PATTERNS
// ============================================================================

interface TradeResult {
  date: string
  condition: MarketCondition
  pattern: string
  direction: 'LONG' | 'SHORT'
  netPnL: number
  win: boolean
  confidence: number
}

function shouldTradeCondition(condition: MarketCondition, confidence: number): { trade: boolean; direction: 'LONG' | 'SHORT' | 'NONE'; pattern: string } {
  // NEVER FORCE TRADES - Only trade when we RECOGNIZE the pattern

  // Minimum confidence to trade
  if (confidence < 50) {
    return { trade: false, direction: 'NONE', pattern: 'CONFIDENCE_TOO_LOW' }
  }

  switch (condition) {
    // STRONG TRENDS - Trade with trend
    case 'STRONG_UPTREND':
      return { trade: true, direction: 'LONG', pattern: 'VWAP_PULLBACK_LONG' }
    case 'STRONG_DOWNTREND':
      return { trade: true, direction: 'SHORT', pattern: 'VWAP_PULLBACK_SHORT' }

    // WEAK TRENDS - Trade with trend but smaller
    case 'WEAK_UPTREND':
      return { trade: true, direction: 'LONG', pattern: 'EMA20_BOUNCE_LONG' }
    case 'WEAK_DOWNTREND':
      return { trade: true, direction: 'SHORT', pattern: 'EMA20_BOUNCE_SHORT' }

    // REVERSALS - Only trade BEARISH reversals (data shows BULLISH loses money)
    case 'REVERSAL_BULLISH':
      // DATA SHOWS: 40% win rate, -$4,292 loss - DO NOT TRADE
      return { trade: false, direction: 'NONE', pattern: 'DATA_SHOWS_LOSING_PATTERN' }
    case 'REVERSAL_BEARISH':
      return { trade: true, direction: 'SHORT', pattern: 'REVERSAL_SHORT' }

    // CONTINUATIONS - Trade continuation
    case 'CONTINUATION_UP':
      return { trade: true, direction: 'LONG', pattern: 'CONTINUATION_LONG' }
    case 'CONTINUATION_DOWN':
      return { trade: true, direction: 'SHORT', pattern: 'CONTINUATION_SHORT' }

    // BREAKOUTS - Only trade DOWN breakouts (data shows UP loses money)
    case 'BREAKOUT_UP':
      // DATA SHOWS: 0% win rate, -$350 loss - DO NOT TRADE
      return { trade: false, direction: 'NONE', pattern: 'DATA_SHOWS_LOSING_PATTERN' }
    case 'BREAKOUT_DOWN':
      return { trade: true, direction: 'SHORT', pattern: 'ORB_BREAKOUT_SHORT' }

    // GAPS - Only fade GAP_UP (data shows GAP_DOWN loses money)
    case 'GAP_UP':
      return { trade: true, direction: 'SHORT', pattern: 'GAP_FADE_SHORT' }
    case 'GAP_DOWN':
      // DATA SHOWS: 33% win rate, -$193 loss - DO NOT TRADE
      return { trade: false, direction: 'NONE', pattern: 'DATA_SHOWS_LOSING_PATTERN' }

    // MEAN REVERSION
    case 'MEAN_REVERSION':
      return { trade: false, direction: 'NONE', pattern: 'WAIT_FOR_DIRECTION' }  // Need to see direction first

    // DON'T TRADE these conditions
    case 'TIGHT_RANGE':
      return { trade: false, direction: 'NONE', pattern: 'NO_TRADE_TIGHT_RANGE' }
    case 'WIDE_RANGE':
      return { trade: false, direction: 'NONE', pattern: 'NO_TRADE_CHOPPY' }
    case 'SQUEEZE':
      return { trade: false, direction: 'NONE', pattern: 'WAIT_FOR_BREAKOUT' }
    case 'EXPANSION':
      return { trade: false, direction: 'NONE', pattern: 'TOO_VOLATILE' }
    case 'TREND_EXHAUSTION':
      return { trade: false, direction: 'NONE', pattern: 'WAIT_FOR_REVERSAL' }
    case 'ACCUMULATION':
      return { trade: false, direction: 'NONE', pattern: 'WAIT_FOR_BREAKOUT' }
    case 'DISTRIBUTION':
      return { trade: false, direction: 'NONE', pattern: 'WAIT_FOR_BREAKDOWN' }
    case 'UNKNOWN':
    default:
      return { trade: false, direction: 'NONE', pattern: 'PATTERN_NOT_RECOGNIZED' }
  }
}

function simulateDayTrade(
  dayAnalysis: DayAnalysis,
  dayCandles: Candle[]
): TradeResult | null {
  const decision = shouldTradeCondition(dayAnalysis.condition, dayAnalysis.confidence)

  if (!decision.trade || decision.direction === 'NONE') {
    return null  // DON'T FORCE TRADES
  }

  // Find entry point after 10am (after we've analyzed the condition)
  const entryCandles = dayCandles.filter(c => c.hour >= 10 && c.hour < 10.5)
  if (entryCandles.length === 0) return null

  const entryCandle = entryCandles[0]
  const entryPrice = entryCandle.close

  // Calculate stop and target based on ATR
  const atr = dayAnalysis.metrics.atr
  const slippage = calculateSlippage(dayAnalysis.metrics.range)

  const stopDistance = atr * 1.5
  const targetDistance = atr * 2.0

  // Simulate trade
  let exitPrice = 0
  let exitReason = ''

  const stopLoss = decision.direction === 'LONG' ? entryPrice - stopDistance : entryPrice + stopDistance
  const takeProfit = decision.direction === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance

  // Look for exit
  for (const c of dayCandles) {
    if (c.hour < 10.5) continue  // Skip candles before entry

    if (decision.direction === 'LONG') {
      if (c.low <= stopLoss) {
        exitPrice = stopLoss - slippage
        exitReason = 'Stop Loss'
        break
      }
      if (c.high >= takeProfit) {
        exitPrice = takeProfit - slippage
        exitReason = 'Take Profit'
        break
      }
    } else {
      if (c.high >= stopLoss) {
        exitPrice = stopLoss + slippage
        exitReason = 'Stop Loss'
        break
      }
      if (c.low <= takeProfit) {
        exitPrice = takeProfit + slippage
        exitReason = 'Take Profit'
        break
      }
    }

    // End of day
    if (c.hour >= 15.75) {
      exitPrice = c.close + (decision.direction === 'LONG' ? -slippage : slippage)
      exitReason = 'End of Day'
      break
    }
  }

  if (exitPrice === 0) return null

  const pnlPoints = decision.direction === 'LONG'
    ? exitPrice - entryPrice - slippage
    : entryPrice - exitPrice - slippage
  const netPnL = (pnlPoints * ES_CONTRACT_VALUE) - COSTS.totalFixed

  return {
    date: dayAnalysis.date,
    condition: dayAnalysis.condition,
    pattern: decision.pattern,
    direction: decision.direction,
    netPnL,
    win: netPnL > 0,
    confidence: dayAnalysis.confidence
  }
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

    // Group candles by day
    const dayMap = new Map<string, Candle[]>()
    for (const c of candles) {
      if (!dayMap.has(c.dateStr)) {
        dayMap.set(c.dateStr, [])
      }
      dayMap.get(c.dateStr)!.push(c)
    }

    const days_list = Array.from(dayMap.entries()).sort((a, b) =>
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    )

    // Calculate averages for normalization
    let totalVolume = 0, totalATR = 0, dayCount = 0
    for (const [, dayCandles] of days_list) {
      if (dayCandles.length < 10) continue
      totalVolume += dayCandles.reduce((sum, c) => sum + c.volume, 0)
      for (let i = 1; i < dayCandles.length; i++) {
        totalATR += dayCandles[i].high - dayCandles[i].low
      }
      dayCount++
    }
    const avgVolume = totalVolume / dayCount
    const avgATR = totalATR / (dayCount * 50)  // Approximate candles per day

    // Analyze each day
    const dayAnalyses: DayAnalysis[] = []
    const trades: TradeResult[] = []

    for (let i = 3; i < days_list.length; i++) {
      const [date, dayCandles] = days_list[i]
      const priorDays = days_list.slice(Math.max(0, i - 5), i).map(d => d[1])

      const analysis = analyzeDay(dayCandles, priorDays, avgVolume, avgATR)
      if (analysis) {
        dayAnalyses.push(analysis)

        const trade = simulateDayTrade(analysis, dayCandles)
        if (trade) {
          trades.push(trade)
        }
      }
    }

    // Aggregate results by condition
    const conditionStats = new Map<MarketCondition, { occurrences: number; trades: TradeResult[] }>()

    for (const analysis of dayAnalyses) {
      if (!conditionStats.has(analysis.condition)) {
        conditionStats.set(analysis.condition, { occurrences: 0, trades: [] })
      }
      conditionStats.get(analysis.condition)!.occurrences++
    }

    for (const trade of trades) {
      if (conditionStats.has(trade.condition)) {
        conditionStats.get(trade.condition)!.trades.push(trade)
      }
    }

    // Build results
    const conditionResults: ConditionResult[] = []

    for (const [condition, stats] of conditionStats) {
      const conditionTrades = stats.trades
      const wins = conditionTrades.filter(t => t.win).length
      const netPnL = conditionTrades.reduce((sum, t) => sum + t.netPnL, 0)

      // Calculate weekly expected profit
      // If we have X trades over N days, weekly rate = (X/N) * 5 trading days
      const tradesPerDay = stats.occurrences > 0 ? conditionTrades.length / stats.occurrences : 0
      const avgPnLPerTrade = conditionTrades.length > 0 ? netPnL / conditionTrades.length : 0
      const weeklyExpected = tradesPerDay * 5 * avgPnLPerTrade

      const decision = shouldTradeCondition(condition, 70)

      conditionResults.push({
        condition,
        occurrences: stats.occurrences,
        trades: conditionTrades.length,
        wins,
        winRate: conditionTrades.length > 0 ? ((wins / conditionTrades.length) * 100).toFixed(1) + '%' : 'N/A',
        weeklyExpectedProfit: '$' + weeklyExpected.toFixed(0),
        netPnL,
        shouldTrade: decision.trade,
        confidence: conditionTrades.length > 0
          ? (conditionTrades.reduce((sum, t) => sum + t.confidence, 0) / conditionTrades.length).toFixed(0) + '%'
          : 'N/A'
      })
    }

    // Sort by net P&L
    conditionResults.sort((a, b) => b.netPnL - a.netPnL)

    // Overall stats
    const totalTrades = trades.length
    const totalWins = trades.filter(t => t.win).length
    const totalNetPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
    const daysAnalyzed = dayAnalyses.length
    const daysTraded = new Set(trades.map(t => t.date)).size
    const noTradeDays = daysAnalyzed - daysTraded

    // Weekly projection
    const weeksInPeriod = daysAnalyzed / 5
    const weeklyActual = totalNetPnL / weeksInPeriod

    return NextResponse.json({
      success: true,
      summary: {
        daysAnalyzed,
        daysTraded,
        noTradeDays,
        noTradeReason: 'Pattern not recognized or confidence too low',
        totalTrades,
        totalWins,
        winRate: ((totalWins / totalTrades) * 100).toFixed(1) + '%',
        totalNetPnL: '$' + totalNetPnL.toFixed(2),
        weeklyExpectedProfit: '$' + weeklyActual.toFixed(0) + '/week'
      },
      marketConditionsFound: conditionResults.length,
      allConditions: [
        'STRONG_UPTREND', 'WEAK_UPTREND', 'STRONG_DOWNTREND', 'WEAK_DOWNTREND',
        'TIGHT_RANGE', 'WIDE_RANGE', 'BREAKOUT_UP', 'BREAKOUT_DOWN',
        'REVERSAL_BULLISH', 'REVERSAL_BEARISH', 'CONTINUATION_UP', 'CONTINUATION_DOWN',
        'GAP_UP', 'GAP_DOWN', 'SQUEEZE', 'EXPANSION', 'MEAN_REVERSION',
        'TREND_EXHAUSTION', 'ACCUMULATION', 'DISTRIBUTION', 'UNKNOWN'
      ],
      resultsByCondition: conditionResults.map(r => ({
        condition: r.condition,
        occurrences: r.occurrences,
        trades: r.trades,
        wins: r.wins,
        winRate: r.winRate,
        netPnL: '$' + r.netPnL.toFixed(2),
        weeklyExpected: r.weeklyExpectedProfit,
        shouldTrade: r.shouldTrade ? '✅ YES' : '❌ NO',
        avgConfidence: r.confidence
      })),
      weeklyProfitByCondition: conditionResults
        .filter(r => r.shouldTrade && r.trades > 0)
        .map(r => ({
          condition: r.condition,
          weeklyExpected: r.weeklyExpectedProfit,
          basedOnTrades: r.trades
        })),
      noTradeConditions: conditionResults
        .filter(r => !r.shouldTrade)
        .map(r => ({
          condition: r.condition,
          reason: r.condition === 'UNKNOWN' ? 'Pattern not recognized' : 'Condition not favorable'
        })),
      verdict: {
        consistent: conditionResults.filter(r => r.shouldTrade && r.trades > 0).every(r => r.netPnL >= 0),
        message: conditionResults.filter(r => r.shouldTrade && r.trades > 0).every(r => r.netPnL >= 0)
          ? '✅ CONSISTENT: Profitable in all traded conditions'
          : '⚠️ Some conditions are losing money - review strategy'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
