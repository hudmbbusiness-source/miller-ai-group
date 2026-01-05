/**
 * DAILY BIAS STRATEGY - Uses 5 years of daily data to detect market direction
 *
 * This strategy analyzes daily price action to determine:
 * 1. Overall market trend (BULLISH / BEARISH / NEUTRAL)
 * 2. Today's bias for intraday trading
 * 3. Key levels (support/resistance) from daily charts
 *
 * When integrated with STUNTMAN OG:
 * - Only take LONG trades when daily bias is BULLISH
 * - Only take SHORT trades when daily bias is BEARISH
 * - Skip trading when NEUTRAL (choppy/uncertain)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'

// =============================================================================
// TYPES
// =============================================================================

interface DailyCandle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  // Calculated fields
  change?: number
  changePercent?: number
  range?: number
  bodySize?: number
  upperWick?: number
  lowerWick?: number
}

interface DailyIndicators {
  ema9: number
  ema21: number
  ema50: number
  ema200: number
  rsi14: number
  macdLine: number
  macdSignal: number
  macdHist: number
  atr14: number
  adx14: number
  bbUpper: number
  bbMiddle: number
  bbLower: number
}

interface DailyBias {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: number // 0-100
  confidence: number // 0-100
  reasons: string[]
}

interface PatternResult {
  name: string
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  avgPnL: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
}

interface BacktestTrade {
  entryDate: string
  exitDate: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  holdingDays: number
  pattern: string
}

// =============================================================================
// DATA LOADING
// =============================================================================

let dailyDataCache: DailyCandle[] | null = null

async function loadDailyData(): Promise<DailyCandle[]> {
  if (dailyDataCache) return dailyDataCache

  try {
    const filePath = path.join(process.cwd(), 'data', 'spy_daily_5years.json')
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const records = JSON.parse(fileContent)

    // Convert and sort oldest to newest
    const candles: DailyCandle[] = records
      .map((r: any) => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume || 0,
      }))
      .sort((a: DailyCandle, b: DailyCandle) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

    // Calculate additional fields
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i]
      const prev = candles[i - 1]
      c.change = c.close - prev.close
      c.changePercent = (c.change / prev.close) * 100
      c.range = c.high - c.low
      c.bodySize = Math.abs(c.close - c.open)
      c.upperWick = c.high - Math.max(c.open, c.close)
      c.lowerWick = Math.min(c.open, c.close) - c.low
    }

    dailyDataCache = candles
    console.log(`Loaded ${candles.length} daily candles from ${candles[0]?.date} to ${candles[candles.length-1]?.date}`)
    return candles
  } catch (error) {
    console.error('Failed to load daily data:', error)
    return []
  }
}

// =============================================================================
// INDICATOR CALCULATIONS
// =============================================================================

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for first value
  let sum = 0
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i]
  }
  ema[period - 1] = sum / period

  // Calculate EMA for rest
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }

  return ema
}

function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate gains and losses
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains[i] = change > 0 ? change : 0
    losses[i] = change < 0 ? -change : 0
  }

  // Calculate average gains and losses
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    avgGain += gains[i] || 0
    avgLoss += losses[i] || 0
  }
  avgGain /= period
  avgLoss /= period

  // First RSI
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))

  // Rest of RSI values
  for (let i = period + 1; i < data.length; i++) {
    avgGain = (avgGain * (period - 1) + (gains[i] || 0)) / period
    avgLoss = (avgLoss * (period - 1) + (losses[i] || 0)) / period
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))
  }

  return rsi
}

function calculateMACD(data: number[]): { macd: number[], signal: number[], hist: number[] } {
  const ema12 = calculateEMA(data, 12)
  const ema26 = calculateEMA(data, 26)
  const macd: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (ema12[i] !== undefined && ema26[i] !== undefined) {
      macd[i] = ema12[i] - ema26[i]
    }
  }

  const signal = calculateEMA(macd.filter(v => v !== undefined), 9)
  const hist: number[] = []

  let signalIdx = 0
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== undefined && signal[signalIdx] !== undefined) {
      hist[i] = macd[i] - signal[signalIdx]
      signalIdx++
    }
  }

  return { macd, signal, hist }
}

function calculateATR(candles: DailyCandle[], period: number = 14): number[] {
  const atr: number[] = []
  const tr: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close

    tr[i] = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
  }

  // First ATR is SMA of TR
  let sum = 0
  for (let i = 1; i <= period; i++) {
    sum += tr[i] || 0
  }
  atr[period] = sum / period

  // Rest using smoothed average
  for (let i = period + 1; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
  }

  return atr
}

function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): { upper: number[], middle: number[], lower: number[] } {
  const middle: number[] = []
  const upper: number[] = []
  const lower: number[] = []

  for (let i = period - 1; i < data.length; i++) {
    // Calculate SMA
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j]
    }
    const sma = sum / period
    middle[i] = sma

    // Calculate standard deviation
    let sqSum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += Math.pow(data[j] - sma, 2)
    }
    const std = Math.sqrt(sqSum / period)

    upper[i] = sma + stdDev * std
    lower[i] = sma - stdDev * std
  }

  return { upper, middle, lower }
}

function calculateAllIndicators(candles: DailyCandle[]): DailyIndicators[] {
  const closes = candles.map(c => c.close)

  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const ema50 = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  const rsi14 = calculateRSI(closes, 14)
  const { macd, signal, hist } = calculateMACD(closes)
  const atr14 = calculateATR(candles, 14)
  const bb = calculateBollingerBands(closes, 20, 2)

  const indicators: DailyIndicators[] = []

  for (let i = 0; i < candles.length; i++) {
    indicators[i] = {
      ema9: ema9[i] || 0,
      ema21: ema21[i] || 0,
      ema50: ema50[i] || 0,
      ema200: ema200[i] || 0,
      rsi14: rsi14[i] || 50,
      macdLine: macd[i] || 0,
      macdSignal: signal[i] || 0,
      macdHist: hist[i] || 0,
      atr14: atr14[i] || 0,
      adx14: 25, // Simplified - would need DI+/DI- calculation
      bbUpper: bb.upper[i] || 0,
      bbMiddle: bb.middle[i] || 0,
      bbLower: bb.lower[i] || 0,
    }
  }

  return indicators
}

// =============================================================================
// PATTERN DETECTION & SIGNALS
// =============================================================================

interface DailySignal {
  date: string
  direction: 'LONG' | 'SHORT' | 'FLAT'
  pattern: string
  confidence: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  reasons: string[]
}

// Pattern 1: EMA Crossover (Golden Cross / Death Cross)
function detectEMACrossover(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number
): DailySignal | null {
  if (index < 2) return null

  const curr = indicators[index]
  const prev = indicators[index - 1]
  const candle = candles[index]

  // Golden Cross: EMA9 crosses above EMA21
  if (prev.ema9 < prev.ema21 && curr.ema9 > curr.ema21) {
    // Confirm with EMA50 trend
    if (curr.ema21 > curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'LONG',
        pattern: 'GOLDEN_CROSS',
        confidence: 75,
        entryPrice: candle.close,
        stopLoss: candle.close - atr * 2,
        takeProfit: candle.close + atr * 3,
        reasons: ['EMA9 crossed above EMA21', 'EMA21 > EMA50 confirms uptrend']
      }
    }
  }

  // Death Cross: EMA9 crosses below EMA21
  if (prev.ema9 > prev.ema21 && curr.ema9 < curr.ema21) {
    if (curr.ema21 < curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'SHORT',
        pattern: 'DEATH_CROSS',
        confidence: 75,
        entryPrice: candle.close,
        stopLoss: candle.close + atr * 2,
        takeProfit: candle.close - atr * 3,
        reasons: ['EMA9 crossed below EMA21', 'EMA21 < EMA50 confirms downtrend']
      }
    }
  }

  return null
}

// Pattern 2: RSI Divergence
function detectRSIDivergence(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number,
  lookback: number = 10
): DailySignal | null {
  if (index < lookback + 1) return null

  const curr = indicators[index]
  const candle = candles[index]

  // Bullish Divergence: Price makes lower low, RSI makes higher low
  let priceLowerLow = false
  let rsiHigherLow = false

  for (let i = index - lookback; i < index; i++) {
    if (candles[i].low < candle.low && indicators[i].rsi14 < curr.rsi14) {
      // Found potential bullish divergence point
      if (candles[index].low < candles[i].low) {
        priceLowerLow = true
      }
      if (curr.rsi14 > indicators[i].rsi14 && curr.rsi14 < 40) {
        rsiHigherLow = true
      }
    }
  }

  if (priceLowerLow && rsiHigherLow && curr.rsi14 < 35) {
    const atr = curr.atr14
    return {
      date: candle.date,
      direction: 'LONG',
      pattern: 'RSI_BULLISH_DIVERGENCE',
      confidence: 70,
      entryPrice: candle.close,
      stopLoss: candle.low - atr,
      takeProfit: candle.close + atr * 2.5,
      reasons: ['Price made lower low', 'RSI made higher low', `RSI oversold at ${curr.rsi14.toFixed(1)}`]
    }
  }

  // Bearish Divergence: Price makes higher high, RSI makes lower high
  let priceHigherHigh = false
  let rsiLowerHigh = false

  for (let i = index - lookback; i < index; i++) {
    if (candles[i].high > candle.high && indicators[i].rsi14 > curr.rsi14) {
      if (candles[index].high > candles[i].high) {
        priceHigherHigh = true
      }
      if (curr.rsi14 < indicators[i].rsi14 && curr.rsi14 > 60) {
        rsiLowerHigh = true
      }
    }
  }

  if (priceHigherHigh && rsiLowerHigh && curr.rsi14 > 65) {
    const atr = curr.atr14
    return {
      date: candle.date,
      direction: 'SHORT',
      pattern: 'RSI_BEARISH_DIVERGENCE',
      confidence: 70,
      entryPrice: candle.close,
      stopLoss: candle.high + atr,
      takeProfit: candle.close - atr * 2.5,
      reasons: ['Price made higher high', 'RSI made lower high', `RSI overbought at ${curr.rsi14.toFixed(1)}`]
    }
  }

  return null
}

// Pattern 3: Bollinger Band Mean Reversion
function detectBBMeanReversion(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number
): DailySignal | null {
  if (index < 2) return null

  const curr = indicators[index]
  const prev = indicators[index - 1]
  const candle = candles[index]
  const prevCandle = candles[index - 1]

  // Long: Price touched lower band yesterday, bounced today
  if (prevCandle.low <= prev.bbLower && candle.close > candle.open && curr.rsi14 < 40) {
    const atr = curr.atr14
    return {
      date: candle.date,
      direction: 'LONG',
      pattern: 'BB_LOWER_BOUNCE',
      confidence: 72,
      entryPrice: candle.close,
      stopLoss: Math.min(prevCandle.low, candle.low) - atr * 0.5,
      takeProfit: curr.bbMiddle + (curr.bbMiddle - curr.bbLower) * 0.5,
      reasons: ['Price bounced off lower Bollinger Band', 'RSI oversold', 'Bullish candle confirmation']
    }
  }

  // Short: Price touched upper band yesterday, rejected today
  if (prevCandle.high >= prev.bbUpper && candle.close < candle.open && curr.rsi14 > 60) {
    const atr = curr.atr14
    return {
      date: candle.date,
      direction: 'SHORT',
      pattern: 'BB_UPPER_REJECT',
      confidence: 72,
      entryPrice: candle.close,
      stopLoss: Math.max(prevCandle.high, candle.high) + atr * 0.5,
      takeProfit: curr.bbMiddle - (curr.bbUpper - curr.bbMiddle) * 0.5,
      reasons: ['Price rejected from upper Bollinger Band', 'RSI overbought', 'Bearish candle confirmation']
    }
  }

  return null
}

// Pattern 4: MACD Crossover with Trend
function detectMACDCrossover(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number
): DailySignal | null {
  if (index < 2) return null

  const curr = indicators[index]
  const prev = indicators[index - 1]
  const candle = candles[index]

  // Bullish MACD crossover
  if (prev.macdLine < prev.macdSignal && curr.macdLine > curr.macdSignal) {
    // Confirm with price above EMA50
    if (candle.close > curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'LONG',
        pattern: 'MACD_BULLISH_CROSS',
        confidence: 68,
        entryPrice: candle.close,
        stopLoss: candle.close - atr * 2,
        takeProfit: candle.close + atr * 3,
        reasons: ['MACD line crossed above signal', 'Price above EMA50', 'Momentum turning bullish']
      }
    }
  }

  // Bearish MACD crossover
  if (prev.macdLine > prev.macdSignal && curr.macdLine < curr.macdSignal) {
    if (candle.close < curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'SHORT',
        pattern: 'MACD_BEARISH_CROSS',
        confidence: 68,
        entryPrice: candle.close,
        stopLoss: candle.close + atr * 2,
        takeProfit: candle.close - atr * 3,
        reasons: ['MACD line crossed below signal', 'Price below EMA50', 'Momentum turning bearish']
      }
    }
  }

  return null
}

// Pattern 5: EMA Pullback in Trend
function detectEMAPullback(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number
): DailySignal | null {
  if (index < 5) return null

  const curr = indicators[index]
  const candle = candles[index]

  // Uptrend pullback: EMA9 > EMA21 > EMA50, price pulls back to EMA21
  if (curr.ema9 > curr.ema21 && curr.ema21 > curr.ema50) {
    // Check if price touched or came close to EMA21
    const touchedEMA21 = candle.low <= curr.ema21 * 1.005 && candle.close > curr.ema21

    if (touchedEMA21 && candle.close > candle.open) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'LONG',
        pattern: 'EMA_PULLBACK_LONG',
        confidence: 74,
        entryPrice: candle.close,
        stopLoss: curr.ema50 - atr * 0.5,
        takeProfit: candle.close + atr * 2.5,
        reasons: ['Strong uptrend (EMA9 > EMA21 > EMA50)', 'Price pulled back to EMA21', 'Bullish bounce candle']
      }
    }
  }

  // Downtrend pullback: EMA9 < EMA21 < EMA50, price pulls back to EMA21
  if (curr.ema9 < curr.ema21 && curr.ema21 < curr.ema50) {
    const touchedEMA21 = candle.high >= curr.ema21 * 0.995 && candle.close < curr.ema21

    if (touchedEMA21 && candle.close < candle.open) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'SHORT',
        pattern: 'EMA_PULLBACK_SHORT',
        confidence: 74,
        entryPrice: candle.close,
        stopLoss: curr.ema50 + atr * 0.5,
        takeProfit: candle.close - atr * 2.5,
        reasons: ['Strong downtrend (EMA9 < EMA21 < EMA50)', 'Price pulled back to EMA21', 'Bearish rejection candle']
      }
    }
  }

  return null
}

// Pattern 6: Inside Day Breakout
function detectInsideDayBreakout(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  index: number
): DailySignal | null {
  if (index < 2) return null

  const curr = indicators[index]
  const candle = candles[index]
  const prevCandle = candles[index - 1]
  const prev2Candle = candles[index - 2]

  // Check if yesterday was an inside day (contained within day before)
  const wasInsideDay = prevCandle.high < prev2Candle.high && prevCandle.low > prev2Candle.low

  if (!wasInsideDay) return null

  // Bullish breakout: Today breaks above the mother candle
  if (candle.close > prev2Candle.high && candle.close > candle.open) {
    // Confirm with trend
    if (curr.ema21 > curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'LONG',
        pattern: 'INSIDE_DAY_BREAKOUT_LONG',
        confidence: 76,
        entryPrice: candle.close,
        stopLoss: prevCandle.low - atr * 0.3,
        takeProfit: candle.close + (candle.close - prevCandle.low) * 1.5,
        reasons: ['Inside day pattern formed', 'Bullish breakout above mother candle', 'Trend confirmation (EMA21 > EMA50)']
      }
    }
  }

  // Bearish breakout: Today breaks below the mother candle
  if (candle.close < prev2Candle.low && candle.close < candle.open) {
    if (curr.ema21 < curr.ema50) {
      const atr = curr.atr14
      return {
        date: candle.date,
        direction: 'SHORT',
        pattern: 'INSIDE_DAY_BREAKOUT_SHORT',
        confidence: 76,
        entryPrice: candle.close,
        stopLoss: prevCandle.high + atr * 0.3,
        takeProfit: candle.close - (prevCandle.high - candle.close) * 1.5,
        reasons: ['Inside day pattern formed', 'Bearish breakout below mother candle', 'Trend confirmation (EMA21 < EMA50)']
      }
    }
  }

  return null
}

// =============================================================================
// BACKTESTING
// =============================================================================

function runBacktest(
  candles: DailyCandle[],
  indicators: DailyIndicators[],
  patternDetector: (c: DailyCandle[], i: DailyIndicators[], idx: number) => DailySignal | null,
  maxHoldingDays: number = 10
): { trades: BacktestTrade[], result: PatternResult } {
  const trades: BacktestTrade[] = []
  let position: {
    direction: 'LONG' | 'SHORT'
    entryDate: string
    entryPrice: number
    stopLoss: number
    takeProfit: number
    pattern: string
    entryIndex: number
  } | null = null

  // Start from index 200 to ensure all indicators are calculated
  for (let i = 200; i < candles.length; i++) {
    const candle = candles[i]

    // Check for exit first if we have a position
    if (position) {
      const holdingDays = i - position.entryIndex
      let exitReason: string | null = null
      let exitPrice = candle.close

      if (position.direction === 'LONG') {
        if (candle.low <= position.stopLoss) {
          exitReason = 'Stop Loss'
          exitPrice = position.stopLoss
        } else if (candle.high >= position.takeProfit) {
          exitReason = 'Take Profit'
          exitPrice = position.takeProfit
        } else if (holdingDays >= maxHoldingDays) {
          exitReason = 'Time Exit'
        }
      } else {
        if (candle.high >= position.stopLoss) {
          exitReason = 'Stop Loss'
          exitPrice = position.stopLoss
        } else if (candle.low <= position.takeProfit) {
          exitReason = 'Take Profit'
          exitPrice = position.takeProfit
        } else if (holdingDays >= maxHoldingDays) {
          exitReason = 'Time Exit'
        }
      }

      if (exitReason) {
        const pnl = position.direction === 'LONG'
          ? exitPrice - position.entryPrice
          : position.entryPrice - exitPrice
        const pnlPercent = (pnl / position.entryPrice) * 100

        trades.push({
          entryDate: position.entryDate,
          exitDate: candle.date,
          direction: position.direction,
          entryPrice: position.entryPrice,
          exitPrice,
          pnl,
          pnlPercent,
          holdingDays,
          pattern: position.pattern
        })

        position = null
      }
    }

    // Check for new entry if no position
    if (!position) {
      const signal = patternDetector(candles, indicators, i)
      if (signal && signal.direction !== 'FLAT') {
        position = {
          direction: signal.direction,
          entryDate: signal.date,
          entryPrice: signal.entryPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          pattern: signal.pattern,
          entryIndex: i
        }
      }
    }
  }

  // Calculate statistics
  const wins = trades.filter(t => t.pnl > 0).length
  const losses = trades.filter(t => t.pnl <= 0).length
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  // Calculate max drawdown
  let peak = 0
  let maxDrawdown = 0
  let cumPnL = 0
  for (const trade of trades) {
    cumPnL += trade.pnl
    if (cumPnL > peak) peak = cumPnL
    const drawdown = peak - cumPnL
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  // Calculate Sharpe ratio (simplified)
  const returns = trades.map(t => t.pnlPercent)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

  return {
    trades,
    result: {
      name: trades[0]?.pattern || 'Unknown',
      trades: trades.length,
      wins,
      losses,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      totalPnL,
      avgPnL,
      profitFactor,
      maxDrawdown,
      sharpeRatio
    }
  }
}

// =============================================================================
// CURRENT BIAS CALCULATION
// =============================================================================

function calculateCurrentBias(
  candles: DailyCandle[],
  indicators: DailyIndicators[]
): DailyBias {
  const lastIdx = candles.length - 1
  const curr = indicators[lastIdx]
  const candle = candles[lastIdx]

  const reasons: string[] = []
  let bullishScore = 0
  let bearishScore = 0

  // Trend alignment (weight: 30)
  if (curr.ema9 > curr.ema21 && curr.ema21 > curr.ema50) {
    bullishScore += 30
    reasons.push('EMAs aligned bullish (9>21>50)')
  } else if (curr.ema9 < curr.ema21 && curr.ema21 < curr.ema50) {
    bearishScore += 30
    reasons.push('EMAs aligned bearish (9<21<50)')
  }

  // Price vs EMA200 (weight: 20)
  if (candle.close > curr.ema200) {
    bullishScore += 20
    reasons.push('Price above 200 EMA')
  } else {
    bearishScore += 20
    reasons.push('Price below 200 EMA')
  }

  // RSI (weight: 15)
  if (curr.rsi14 > 50 && curr.rsi14 < 70) {
    bullishScore += 15
    reasons.push(`RSI bullish at ${curr.rsi14.toFixed(1)}`)
  } else if (curr.rsi14 < 50 && curr.rsi14 > 30) {
    bearishScore += 15
    reasons.push(`RSI bearish at ${curr.rsi14.toFixed(1)}`)
  }

  // MACD (weight: 15)
  if (curr.macdHist > 0) {
    bullishScore += 15
    reasons.push('MACD histogram positive')
  } else {
    bearishScore += 15
    reasons.push('MACD histogram negative')
  }

  // Recent momentum (weight: 20)
  const recentClose = candles.slice(-5).map(c => c.close)
  const recentTrend = recentClose[4] - recentClose[0]
  if (recentTrend > 0) {
    bullishScore += 20
    reasons.push('5-day momentum positive')
  } else {
    bearishScore += 20
    reasons.push('5-day momentum negative')
  }

  const totalScore = bullishScore + bearishScore
  const strength = Math.abs(bullishScore - bearishScore)
  const confidence = Math.min(100, strength * 1.5)

  let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  if (bullishScore > bearishScore + 20) {
    direction = 'BULLISH'
  } else if (bearishScore > bullishScore + 20) {
    direction = 'BEARISH'
  } else {
    direction = 'NEUTRAL'
  }

  return {
    direction,
    strength,
    confidence,
    reasons
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'bias'

    const candles = await loadDailyData()
    if (candles.length === 0) {
      return NextResponse.json({ success: false, error: 'No daily data available' })
    }

    const indicators = calculateAllIndicators(candles)

    if (action === 'bias') {
      // Return current market bias
      const bias = calculateCurrentBias(candles, indicators)
      const lastCandle = candles[candles.length - 1]
      const lastIndicator = indicators[indicators.length - 1]

      return NextResponse.json({
        success: true,
        date: lastCandle.date,
        price: lastCandle.close,
        bias,
        indicators: {
          ema9: lastIndicator.ema9.toFixed(2),
          ema21: lastIndicator.ema21.toFixed(2),
          ema50: lastIndicator.ema50.toFixed(2),
          ema200: lastIndicator.ema200.toFixed(2),
          rsi14: lastIndicator.rsi14.toFixed(1),
          macdHist: lastIndicator.macdHist.toFixed(3),
          atr14: lastIndicator.atr14.toFixed(2),
        },
        dataRange: {
          from: candles[0].date,
          to: lastCandle.date,
          totalDays: candles.length
        }
      })
    }

    if (action === 'backtest') {
      // Run backtests on all patterns
      const patterns = [
        { name: 'EMA_CROSSOVER', detector: detectEMACrossover },
        { name: 'RSI_DIVERGENCE', detector: detectRSIDivergence },
        { name: 'BB_MEAN_REVERSION', detector: detectBBMeanReversion },
        { name: 'MACD_CROSSOVER', detector: detectMACDCrossover },
        { name: 'EMA_PULLBACK', detector: detectEMAPullback },
        { name: 'INSIDE_DAY_BREAKOUT', detector: detectInsideDayBreakout },
      ]

      const results: PatternResult[] = []
      const allTrades: BacktestTrade[] = []

      for (const pattern of patterns) {
        const { trades, result } = runBacktest(candles, indicators, pattern.detector)
        result.name = pattern.name
        results.push(result)
        allTrades.push(...trades)
      }

      // Sort by profit factor
      results.sort((a, b) => b.profitFactor - a.profitFactor)

      return NextResponse.json({
        success: true,
        backtest: {
          dataRange: {
            from: candles[0].date,
            to: candles[candles.length - 1].date,
            totalDays: candles.length,
            tradingDays: candles.length - 200 // Exclude warmup period
          },
          patterns: results,
          bestPattern: results[0],
          totalTrades: allTrades.length,
          summary: {
            avgWinRate: (results.reduce((sum, r) => sum + r.winRate, 0) / results.length).toFixed(1) + '%',
            avgProfitFactor: (results.reduce((sum, r) => sum + r.profitFactor, 0) / results.length).toFixed(2),
            bestWinRate: Math.max(...results.map(r => r.winRate)).toFixed(1) + '%',
            bestProfitFactor: Math.max(...results.map(r => r.profitFactor)).toFixed(2),
          }
        }
      })
    }

    if (action === 'signals') {
      // Return all signals from today
      const signals: DailySignal[] = []
      const lastIdx = candles.length - 1

      const detectors = [
        detectEMACrossover,
        detectRSIDivergence,
        detectBBMeanReversion,
        detectMACDCrossover,
        detectEMAPullback,
        detectInsideDayBreakout,
      ]

      for (const detector of detectors) {
        const signal = detector(candles, indicators, lastIdx)
        if (signal) signals.push(signal)
      }

      return NextResponse.json({
        success: true,
        date: candles[lastIdx].date,
        signals,
        activeSignals: signals.filter(s => s.direction !== 'FLAT').length
      })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' })

  } catch (error) {
    console.error('Daily bias API error:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'clear-cache') {
      dailyDataCache = null
      return NextResponse.json({ success: true, message: 'Cache cleared' })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' })

  } catch (error) {
    console.error('Daily bias POST error:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}
