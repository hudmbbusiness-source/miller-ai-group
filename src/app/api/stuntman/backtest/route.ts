// =============================================================================
// STUNTMAN AI - BACKTESTING API
// =============================================================================
// Run strategy backtests on historical data
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  RSI,
  MACD,
  EMA,
  BollingerBands,
  ATR,
  generateIndicatorSignals,
} from '@/lib/stuntman/indicators'
import { FEES, TRADING_CONFIG } from '@/lib/stuntman/constants'
import type { OHLCV } from '@/lib/stuntman/types'

// =============================================================================
// TYPES
// =============================================================================

interface BacktestConfig {
  instrument: string
  timeframe: string
  startDate: string
  endDate: string
  initialBalance: number
  strategy: 'rsi' | 'macd' | 'ema_cross' | 'combined'
  stopLossPercent: number
  takeProfitPercent: number
  positionSizePercent: number
}

interface BacktestTrade {
  id: number
  entryTime: number
  exitTime: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  fees: number
  reason: string
  holdingPeriod: number
}

interface BacktestResult {
  success: boolean
  config: BacktestConfig
  trades: BacktestTrade[]
  metrics: {
    totalReturn: number
    totalReturnPercent: number
    winRate: number
    profitFactor: number
    maxDrawdown: number
    maxDrawdownPercent: number
    sharpeRatio: number
    sortinoRatio: number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    avgWin: number
    avgLoss: number
    avgHoldingPeriod: number
    largestWin: number
    largestLoss: number
    consecutiveWins: number
    consecutiveLosses: number
    finalBalance: number
    totalFees: number
  }
  equity: { time: number; value: number }[]
  drawdown: { time: number; value: number }[]
}

// =============================================================================
// FETCH HISTORICAL DATA
// =============================================================================

async function fetchHistoricalData(
  instrument: string,
  timeframe: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<OHLCV[]> {
  const allCandles: OHLCV[] = []
  let currentStart = startTimestamp

  // Fetch in chunks of 300 candles (API limit)
  while (currentStart < endTimestamp) {
    try {
      const res = await fetch(
        `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${instrument}&timeframe=${timeframe}&start_ts=${currentStart}&count=300`
      )
      const data = await res.json()

      if (data.code !== 0 || !data.result?.data?.length) break

      const candles = data.result.data.map((c: any) => ({
        openTime: c.t,
        closeTime: c.ut || c.t,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
        quoteVolume: 0,
        tradeCount: 0,
      }))

      allCandles.push(...candles)

      // Move to next chunk
      const lastCandle = candles[candles.length - 1]
      currentStart = lastCandle.closeTime + 1

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Error fetching candles:', error)
      break
    }
  }

  // Sort and deduplicate
  const uniqueCandles = allCandles
    .sort((a, b) => a.openTime - b.openTime)
    .filter((candle, index, arr) =>
      index === 0 || candle.openTime !== arr[index - 1].openTime
    )
    .filter(c => c.openTime >= startTimestamp && c.openTime <= endTimestamp)

  return uniqueCandles
}

// =============================================================================
// STRATEGY IMPLEMENTATIONS
// =============================================================================

interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD'
  strength: number
  reason: string
}

function rsiStrategy(candles: OHLCV[], index: number): Signal {
  if (index < 15) return { type: 'HOLD', strength: 0, reason: 'Warming up' }

  const closes = candles.slice(0, index + 1).map(c => c.close)
  const rsi = RSI(closes, 14)
  const lastRSI = rsi.values[rsi.values.length - 1]

  if (isNaN(lastRSI)) return { type: 'HOLD', strength: 0, reason: 'No signal' }

  if (lastRSI <= 30) {
    return { type: 'BUY', strength: (30 - lastRSI) / 30, reason: `RSI oversold: ${lastRSI.toFixed(1)}` }
  }
  if (lastRSI >= 70) {
    return { type: 'SELL', strength: (lastRSI - 70) / 30, reason: `RSI overbought: ${lastRSI.toFixed(1)}` }
  }

  return { type: 'HOLD', strength: 0, reason: 'RSI neutral' }
}

function macdStrategy(candles: OHLCV[], index: number): Signal {
  if (index < 35) return { type: 'HOLD', strength: 0, reason: 'Warming up' }

  const closes = candles.slice(0, index + 1).map(c => c.close)
  const macd = MACD(closes, 12, 26, 9)
  const histogram = macd.histogram

  const current = histogram[histogram.length - 1]
  const previous = histogram[histogram.length - 2]

  if (isNaN(current) || isNaN(previous)) return { type: 'HOLD', strength: 0, reason: 'No signal' }

  // Bullish crossover
  if (previous < 0 && current >= 0) {
    return { type: 'BUY', strength: 0.8, reason: 'MACD bullish crossover' }
  }
  // Bearish crossover
  if (previous > 0 && current <= 0) {
    return { type: 'SELL', strength: 0.8, reason: 'MACD bearish crossover' }
  }

  return { type: 'HOLD', strength: 0, reason: 'No MACD crossover' }
}

function emaCrossStrategy(candles: OHLCV[], index: number): Signal {
  if (index < 22) return { type: 'HOLD', strength: 0, reason: 'Warming up' }

  const closes = candles.slice(0, index + 1).map(c => c.close)
  const ema9 = EMA(closes, 9)
  const ema21 = EMA(closes, 21)

  const current9 = ema9[ema9.length - 1]
  const current21 = ema21[ema21.length - 1]
  const prev9 = ema9[ema9.length - 2]
  const prev21 = ema21[ema21.length - 2]

  if (isNaN(current9) || isNaN(current21)) return { type: 'HOLD', strength: 0, reason: 'No signal' }

  // Golden cross (EMA9 crosses above EMA21)
  if (prev9 <= prev21 && current9 > current21) {
    return { type: 'BUY', strength: 0.7, reason: 'EMA 9/21 golden cross' }
  }
  // Death cross (EMA9 crosses below EMA21)
  if (prev9 >= prev21 && current9 < current21) {
    return { type: 'SELL', strength: 0.7, reason: 'EMA 9/21 death cross' }
  }

  return { type: 'HOLD', strength: 0, reason: 'No EMA crossover' }
}

function combinedStrategy(candles: OHLCV[], index: number): Signal {
  const rsiSignal = rsiStrategy(candles, index)
  const macdSignal = macdStrategy(candles, index)
  const emaSignal = emaCrossStrategy(candles, index)

  let buyScore = 0
  let sellScore = 0
  const reasons: string[] = []

  if (rsiSignal.type === 'BUY') {
    buyScore += rsiSignal.strength
    reasons.push(rsiSignal.reason)
  } else if (rsiSignal.type === 'SELL') {
    sellScore += rsiSignal.strength
    reasons.push(rsiSignal.reason)
  }

  if (macdSignal.type === 'BUY') {
    buyScore += macdSignal.strength
    reasons.push(macdSignal.reason)
  } else if (macdSignal.type === 'SELL') {
    sellScore += macdSignal.strength
    reasons.push(macdSignal.reason)
  }

  if (emaSignal.type === 'BUY') {
    buyScore += emaSignal.strength
    reasons.push(emaSignal.reason)
  } else if (emaSignal.type === 'SELL') {
    sellScore += emaSignal.strength
    reasons.push(emaSignal.reason)
  }

  // Require at least 2 confirming signals
  if (buyScore >= 1.2 && buyScore > sellScore) {
    return { type: 'BUY', strength: Math.min(buyScore / 3, 1), reason: reasons.join(', ') }
  }
  if (sellScore >= 1.2 && sellScore > buyScore) {
    return { type: 'SELL', strength: Math.min(sellScore / 3, 1), reason: reasons.join(', ') }
  }

  return { type: 'HOLD', strength: 0, reason: 'No confirmed signal' }
}

// =============================================================================
// BACKTEST ENGINE
// =============================================================================

async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const startTimestamp = new Date(config.startDate).getTime()
  const endTimestamp = new Date(config.endDate).getTime()

  // Fetch historical data
  const candles = await fetchHistoricalData(
    config.instrument,
    config.timeframe,
    startTimestamp,
    endTimestamp
  )

  if (candles.length < 50) {
    throw new Error(`Insufficient data: only ${candles.length} candles found`)
  }

  // Initialize backtest state
  let balance = config.initialBalance
  let position: { side: 'LONG'; entryPrice: number; quantity: number; entryTime: number } | null = null
  const trades: BacktestTrade[] = []
  const equity: { time: number; value: number }[] = []
  const drawdown: { time: number; value: number }[] = []
  let peakBalance = balance
  let tradeId = 0

  // Select strategy
  const getSignal = (i: number): Signal => {
    switch (config.strategy) {
      case 'rsi': return rsiStrategy(candles, i)
      case 'macd': return macdStrategy(candles, i)
      case 'ema_cross': return emaCrossStrategy(candles, i)
      case 'combined': return combinedStrategy(candles, i)
      default: return combinedStrategy(candles, i)
    }
  }

  // Run through candles
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]
    const currentPrice = candle.close

    // Track equity
    const currentValue = position
      ? balance + (currentPrice - position.entryPrice) * position.quantity
      : balance

    equity.push({ time: candle.openTime, value: currentValue })

    // Track drawdown
    if (currentValue > peakBalance) peakBalance = currentValue
    const dd = ((peakBalance - currentValue) / peakBalance) * 100
    drawdown.push({ time: candle.openTime, value: dd })

    // Check stop loss / take profit
    if (position) {
      const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100

      // Stop loss hit
      if (pnlPercent <= -config.stopLossPercent) {
        const exitPrice = position.entryPrice * (1 - config.stopLossPercent / 100)
        const pnl = (exitPrice - position.entryPrice) * position.quantity
        const fees = exitPrice * position.quantity * FEES.taker

        trades.push({
          id: ++tradeId,
          entryTime: position.entryTime,
          exitTime: candle.openTime,
          side: 'LONG',
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.quantity,
          pnl: pnl - fees,
          pnlPercent: -config.stopLossPercent,
          fees,
          reason: 'Stop loss hit',
          holdingPeriod: candle.openTime - position.entryTime,
        })

        balance += pnl - fees
        position = null
        continue
      }

      // Take profit hit
      if (pnlPercent >= config.takeProfitPercent) {
        const exitPrice = position.entryPrice * (1 + config.takeProfitPercent / 100)
        const pnl = (exitPrice - position.entryPrice) * position.quantity
        const fees = exitPrice * position.quantity * FEES.taker

        trades.push({
          id: ++tradeId,
          entryTime: position.entryTime,
          exitTime: candle.openTime,
          side: 'LONG',
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.quantity,
          pnl: pnl - fees,
          pnlPercent: config.takeProfitPercent,
          fees,
          reason: 'Take profit hit',
          holdingPeriod: candle.openTime - position.entryTime,
        })

        balance += pnl - fees
        position = null
        continue
      }
    }

    // Get strategy signal
    const signal = getSignal(i)

    // Execute trades based on signal
    if (!position && signal.type === 'BUY' && signal.strength >= 0.5) {
      // Open long position
      const positionValue = balance * (config.positionSizePercent / 100)
      const fees = positionValue * FEES.taker
      const quantity = (positionValue - fees) / currentPrice

      if (quantity > 0 && positionValue >= TRADING_CONFIG.MIN_ORDER_VALUE) {
        position = {
          side: 'LONG',
          entryPrice: currentPrice,
          quantity,
          entryTime: candle.openTime,
        }
        balance -= fees
      }
    } else if (position && signal.type === 'SELL' && signal.strength >= 0.5) {
      // Close long position
      const pnl = (currentPrice - position.entryPrice) * position.quantity
      const fees = currentPrice * position.quantity * FEES.taker
      const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100

      trades.push({
        id: ++tradeId,
        entryTime: position.entryTime,
        exitTime: candle.openTime,
        side: 'LONG',
        entryPrice: position.entryPrice,
        exitPrice: currentPrice,
        quantity: position.quantity,
        pnl: pnl - fees,
        pnlPercent,
        fees,
        reason: signal.reason,
        holdingPeriod: candle.openTime - position.entryTime,
      })

      balance += pnl - fees
      position = null
    }
  }

  // Close any open position at end
  if (position) {
    const lastPrice = candles[candles.length - 1].close
    const pnl = (lastPrice - position.entryPrice) * position.quantity
    const fees = lastPrice * position.quantity * FEES.taker
    const pnlPercent = ((lastPrice - position.entryPrice) / position.entryPrice) * 100

    trades.push({
      id: ++tradeId,
      entryTime: position.entryTime,
      exitTime: candles[candles.length - 1].openTime,
      side: 'LONG',
      entryPrice: position.entryPrice,
      exitPrice: lastPrice,
      quantity: position.quantity,
      pnl: pnl - fees,
      pnlPercent,
      fees,
      reason: 'End of backtest',
      holdingPeriod: candles[candles.length - 1].openTime - position.entryTime,
    })

    balance += pnl - fees
  }

  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl <= 0)
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0)
  const maxDD = Math.max(...drawdown.map(d => d.value))

  // Calculate Sharpe ratio (simplified)
  const returns = trades.map(t => t.pnlPercent)
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length)
    : 1
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0

  // Calculate Sortino ratio
  const negativeReturns = returns.filter(r => r < 0)
  const downside = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.map(r => Math.pow(r, 2)).reduce((a, b) => a + b, 0) / negativeReturns.length)
    : 1
  const sortinoRatio = downside > 0 ? (avgReturn / downside) * Math.sqrt(252) : 0

  // Profit factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Consecutive wins/losses
  let maxConsecWins = 0
  let maxConsecLosses = 0
  let consecWins = 0
  let consecLosses = 0
  for (const trade of trades) {
    if (trade.pnl > 0) {
      consecWins++
      consecLosses = 0
      maxConsecWins = Math.max(maxConsecWins, consecWins)
    } else {
      consecLosses++
      consecWins = 0
      maxConsecLosses = Math.max(maxConsecLosses, consecLosses)
    }
  }

  return {
    success: true,
    config,
    trades,
    metrics: {
      totalReturn: totalPnL,
      totalReturnPercent: (totalPnL / config.initialBalance) * 100,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      profitFactor,
      maxDrawdown: maxDD,
      maxDrawdownPercent: maxDD,
      sharpeRatio,
      sortinoRatio,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
        : 0,
      avgLoss: losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        : 0,
      avgHoldingPeriod: trades.length > 0
        ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length / (1000 * 60 * 60)
        : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      consecutiveWins: maxConsecWins,
      consecutiveLosses: maxConsecLosses,
      finalBalance: balance,
      totalFees,
    },
    equity: equity.filter((_, i) => i % 10 === 0), // Sample every 10th point
    drawdown: drawdown.filter((_, i) => i % 10 === 0),
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const config: BacktestConfig = {
      instrument: body.instrument || 'BTC_USDT',
      timeframe: body.timeframe || '15m',
      startDate: body.startDate,
      endDate: body.endDate,
      initialBalance: body.initialBalance || 1000,
      strategy: body.strategy || 'combined',
      stopLossPercent: body.stopLossPercent || 2,
      takeProfitPercent: body.takeProfitPercent || 4,
      positionSizePercent: body.positionSizePercent || 50,
    }

    // Validate dates
    if (!config.startDate || !config.endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    const result = await runBacktest(config)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Backtest error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Backtest failed',
    }, { status: 500 })
  }
}
