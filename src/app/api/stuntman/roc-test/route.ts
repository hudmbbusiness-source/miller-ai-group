/**
 * ROC + HEIKIN ASHI STRATEGY BACKTEST
 *
 * ISOLATED TEST - No other strategies
 *
 * Research Source: LiberatedStockTrader
 * - 93% market outperformance
 * - 55% win rate
 * - 2.7:1 reward/risk ratio
 * - 114 trades over 40 days on 5-min chart
 *
 * Rules:
 * 1. Calculate Heikin Ashi candles from regular OHLC
 * 2. Calculate ROC with period 9 on Heikin Ashi close
 * 3. LONG: ROC crosses above 0 AND Heikin Ashi is green
 * 4. SHORT: ROC crosses below 0 AND Heikin Ashi is red
 * 5. EXIT: ROC crosses back through 0 OR opposite signal
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
}

interface HeikinAshiCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  isGreen: boolean
  bodySize: number
}

interface Trade {
  date: string
  direction: 'LONG' | 'SHORT'
  contracts: number
  entryPrice: number
  exitPrice: number
  actualEntryPrice: number
  actualExitPrice: number
  stopLoss: number
  takeProfit: number
  pnlPoints: number
  grossPnL: number
  totalCosts: number
  netPnL: number
  win: boolean
  exitReason: string
  signalReason: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROC_CONFIG = {
  // ROC Settings
  rocPeriod: 9,              // ROC lookback period
  rocThreshold: 0,           // Zero line for crossover
  minBodySize: 0.3,          // Min HA body size as % of range (filter dojis)
  minROCStrength: 0.1,       // Minimum ROC value for strong signal

  // Stop Loss / Take Profit (ATR-based)
  atrPeriod: 14,
  atrMultiplierSL: 1.5,      // ATR multiplier for stop loss
  atrMultiplierTP: 2.7,      // ATR multiplier for take profit (from research)

  // Risk Management
  maxTradesPerDay: 5,        // Max trades per day
  minMinutesBetweenTrades: 30, // Minimum 30 min between trades

  // Time Filters (EST)
  tradingStartHour: 10.0,    // 10:00 AM EST (avoid opening volatility)
  tradingEndHour: 15.5,      // 3:30 PM EST (avoid close)

  // Contract values
  contractValue: 50,         // $50 per point for ES
  tickValue: 12.50,          // $12.50 per tick for ES
}

// Realistic trading costs for ES futures
const TRADING_COSTS = {
  commissionPerContract: 4.12,
  exchangeFeesPerContract: 2.58,
  nfaFeePerContract: 0.04,
  baseSlippageTicks: 0.5,
  slippageMultiplier: 0.3,
  spreadTicks: 0.25,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getESTHour(timestamp: number): number {
  const date = new Date(timestamp)
  const estString = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const [hours, minutes] = estString.split(':').map(Number)
  return hours + minutes / 60
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const estString = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return estString
}

function isWeekend(timestamp: number): boolean {
  const date = new Date(timestamp)
  const day = date.getDay()
  return day === 0 || day === 6
}

// ============================================================================
// HEIKIN ASHI CALCULATION
// ============================================================================

function calculateHeikinAshi(candles: Candle[]): HeikinAshiCandle[] {
  if (candles.length === 0) return []

  const haCandles: HeikinAshiCandle[] = []

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]

    // HA Close = (Open + High + Low + Close) / 4
    const haClose = (c.open + c.high + c.low + c.close) / 4

    // HA Open = (Previous HA Open + Previous HA Close) / 2
    let haOpen: number
    if (i === 0) {
      haOpen = (c.open + c.close) / 2
    } else {
      haOpen = (haCandles[i - 1].open + haCandles[i - 1].close) / 2
    }

    // HA High = Max(High, HA Open, HA Close)
    const haHigh = Math.max(c.high, haOpen, haClose)

    // HA Low = Min(Low, HA Open, HA Close)
    const haLow = Math.min(c.low, haOpen, haClose)

    const isGreen = haClose > haOpen
    const bodySize = Math.abs(haClose - haOpen)
    const range = haHigh - haLow

    haCandles.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      isGreen,
      bodySize: range > 0 ? bodySize / range : 0,
    })
  }

  return haCandles
}

// ============================================================================
// ROC CALCULATION
// ============================================================================

function calculateROC(prices: number[], period: number): number[] {
  const roc: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      roc.push(0)
    } else {
      const current = prices[i]
      const previous = prices[i - period]
      roc.push(previous !== 0 ? ((current - previous) / previous) * 100 : 0)
    }
  }

  return roc
}

// ============================================================================
// ATR CALCULATION
// ============================================================================

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 1

  let atrSum = 0
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    atrSum += tr
  }

  return atrSum / period
}

// ============================================================================
// SLIPPAGE & COST CALCULATION
// ============================================================================

function calculateSlippage(atr: number): number {
  const baseSlippage = TRADING_COSTS.baseSlippageTicks * ROC_CONFIG.tickValue / ROC_CONFIG.contractValue
  const volatilitySlippage = atr * TRADING_COSTS.slippageMultiplier * 0.1
  return baseSlippage + volatilitySlippage
}

function calculateTradeCosts(contracts: number): number {
  const commission = TRADING_COSTS.commissionPerContract * contracts
  const exchangeFees = TRADING_COSTS.exchangeFeesPerContract * contracts
  const nfaFees = TRADING_COSTS.nfaFeePerContract * contracts
  return commission + exchangeFees + nfaFees
}

// ============================================================================
// FETCH SPY DATA FROM YAHOO FINANCE
// ============================================================================

async function fetchSPYData(days: number = 30, randomOffset: number = 0): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000)
  const effectiveEnd = now - (randomOffset * 24 * 60 * 60)
  const start = effectiveEnd - (days * 24 * 60 * 60)

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${start}&period2=${effectiveEnd}&interval=5m&includePrePost=false`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`)
  }

  const data = await response.json()
  const result = data.chart?.result?.[0]

  if (!result || !result.timestamp) {
    throw new Error('No data from Yahoo Finance')
  }

  const timestamps = result.timestamp
  const quote = result.indicators?.quote?.[0]

  if (!quote) {
    throw new Error('No quote data')
  }

  const candles: Candle[] = []

  for (let i = 0; i < timestamps.length; i++) {
    if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
      // Scale SPY to ES prices (SPY * 10 ≈ ES)
      candles.push({
        time: timestamps[i] * 1000,
        open: quote.open[i] * 10,
        high: quote.high[i] * 10,
        low: quote.low[i] * 10,
        close: quote.close[i] * 10,
        volume: quote.volume[i] || 0,
      })
    }
  }

  return candles
}

// ============================================================================
// ROC+HA SIGNAL DETECTION
// ============================================================================

interface ROCSignal {
  direction: 'LONG' | 'SHORT' | 'FLAT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  confidence: number
  reason: string
}

function detectROCCrossover(roc: number[], threshold: number = 0): { crossed: boolean; direction: 'UP' | 'DOWN' | 'NONE' } {
  if (roc.length < 2) return { crossed: false, direction: 'NONE' }

  const current = roc[roc.length - 1]
  const previous = roc[roc.length - 2]

  // Crossed above zero
  if (previous <= threshold && current > threshold) {
    return { crossed: true, direction: 'UP' }
  }

  // Crossed below zero
  if (previous >= threshold && current < threshold) {
    return { crossed: true, direction: 'DOWN' }
  }

  return { crossed: false, direction: 'NONE' }
}

function generateROCSignal(candles: Candle[], haCandles: HeikinAshiCandle[], rocValues: number[], atr: number): ROCSignal {
  const noSignal: ROCSignal = {
    direction: 'FLAT',
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    confidence: 0,
    reason: '',
  }

  if (haCandles.length < 2 || rocValues.length < 2) {
    return noSignal
  }

  const currentHA = haCandles[haCandles.length - 1]
  const previousHA = haCandles[haCandles.length - 2]
  const currentROC = rocValues[rocValues.length - 1]
  const crossover = detectROCCrossover(rocValues, ROC_CONFIG.rocThreshold)
  const currentPrice = candles[candles.length - 1].close

  // Filter: Skip if HA body is too small (doji = indecision)
  if (currentHA.bodySize < ROC_CONFIG.minBodySize) {
    return noSignal
  }

  // LONG SIGNAL: ROC crosses above 0 AND HA is green
  if (crossover.crossed && crossover.direction === 'UP' && currentHA.isGreen) {
    const hasConfirmation = previousHA.isGreen
    const rocStrength = Math.abs(currentROC)

    let confidence = 70
    if (hasConfirmation) confidence += 10
    if (rocStrength > ROC_CONFIG.minROCStrength) confidence += 10
    if (currentHA.bodySize > 0.5) confidence += 5

    const stopLoss = currentPrice - (atr * ROC_CONFIG.atrMultiplierSL)
    const takeProfit = currentPrice + (atr * ROC_CONFIG.atrMultiplierTP)

    return {
      direction: 'LONG',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      confidence: Math.min(95, confidence),
      reason: `ROC crossed above 0 (${currentROC.toFixed(2)}), HA green${hasConfirmation ? ', confirmed' : ''}`,
    }
  }

  // SHORT SIGNAL: ROC crosses below 0 AND HA is red
  if (crossover.crossed && crossover.direction === 'DOWN' && !currentHA.isGreen) {
    const hasConfirmation = !previousHA.isGreen
    const rocStrength = Math.abs(currentROC)

    let confidence = 70
    if (hasConfirmation) confidence += 10
    if (rocStrength > ROC_CONFIG.minROCStrength) confidence += 10
    if (currentHA.bodySize > 0.5) confidence += 5

    const stopLoss = currentPrice + (atr * ROC_CONFIG.atrMultiplierSL)
    const takeProfit = currentPrice - (atr * ROC_CONFIG.atrMultiplierTP)

    return {
      direction: 'SHORT',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      confidence: Math.min(95, confidence),
      reason: `ROC crossed below 0 (${currentROC.toFixed(2)}), HA red${hasConfirmation ? ', confirmed' : ''}`,
    }
  }

  return noSignal
}

// ============================================================================
// MAIN BACKTEST
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')

    // Random offset for different market conditions each test
    const randomOffset = Math.floor(Math.random() * 60)

    // Fetch data
    const candles = await fetchSPYData(days, randomOffset)

    if (candles.length < ROC_CONFIG.rocPeriod + 20) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        candlesReceived: candles.length
      })
    }

    // Calculate indicators once for all data
    const haCandles = calculateHeikinAshi(candles)
    const haPrices = haCandles.map(c => c.close)
    const rocValues = calculateROC(haPrices, ROC_CONFIG.rocPeriod)

    // Track trades
    const trades: Trade[] = []
    let currentPosition: {
      direction: 'LONG' | 'SHORT'
      entryPrice: number
      actualEntryPrice: number
      stopLoss: number
      takeProfit: number
      contracts: number
      entryTime: number
      entryDate: string
      signalReason: string
    } | null = null

    // Daily tracking
    let currentDay = ''
    let tradesToday = 0
    let lastTradeTime = 0

    // Process each candle
    for (let i = ROC_CONFIG.rocPeriod + 10; i < candles.length; i++) {
      const candle = candles[i]
      const hour = getESTHour(candle.time)
      const dateStr = getDateString(candle.time)

      // Skip weekends
      if (isWeekend(candle.time)) continue

      // Reset daily counter
      if (dateStr !== currentDay) {
        currentDay = dateStr
        tradesToday = 0
      }

      // Calculate ATR for this point
      const atr = calculateATR(candles.slice(0, i + 1), ROC_CONFIG.atrPeriod)
      const slippage = calculateSlippage(atr)

      // Check if we have a position
      if (currentPosition) {
        let exitPrice = 0
        let exitReason = ''
        let shouldExit = false

        // Check stop loss
        if (currentPosition.direction === 'LONG') {
          if (candle.low <= currentPosition.stopLoss) {
            exitPrice = currentPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          } else if (candle.high >= currentPosition.takeProfit) {
            exitPrice = currentPosition.takeProfit
            exitReason = 'Take Profit'
            shouldExit = true
          }
        } else {
          if (candle.high >= currentPosition.stopLoss) {
            exitPrice = currentPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          } else if (candle.low <= currentPosition.takeProfit) {
            exitPrice = currentPosition.takeProfit
            exitReason = 'Take Profit'
            shouldExit = true
          }
        }

        // Check for exit signal (ROC crosses back)
        if (!shouldExit) {
          const rocSlice = rocValues.slice(0, i + 1)
          const crossover = detectROCCrossover(rocSlice)

          if (currentPosition.direction === 'LONG' && crossover.crossed && crossover.direction === 'DOWN') {
            exitPrice = candle.close
            exitReason = 'ROC Exit Signal'
            shouldExit = true
          } else if (currentPosition.direction === 'SHORT' && crossover.crossed && crossover.direction === 'UP') {
            exitPrice = candle.close
            exitReason = 'ROC Exit Signal'
            shouldExit = true
          }
        }

        // End of day exit
        if (!shouldExit && hour >= 15.75) {
          exitPrice = candle.close
          exitReason = 'End of Day'
          shouldExit = true
        }

        // Execute exit
        if (shouldExit && exitPrice > 0) {
          const actualExitPrice = currentPosition.direction === 'LONG'
            ? exitPrice - slippage
            : exitPrice + slippage

          const pnlPoints = currentPosition.direction === 'LONG'
            ? actualExitPrice - currentPosition.actualEntryPrice
            : currentPosition.actualEntryPrice - actualExitPrice

          const grossPnL = pnlPoints * ROC_CONFIG.contractValue * currentPosition.contracts
          const totalCosts = calculateTradeCosts(currentPosition.contracts)
          const netPnL = grossPnL - totalCosts

          trades.push({
            date: currentPosition.entryDate,
            direction: currentPosition.direction,
            contracts: currentPosition.contracts,
            entryPrice: currentPosition.entryPrice,
            exitPrice,
            actualEntryPrice: currentPosition.actualEntryPrice,
            actualExitPrice,
            stopLoss: currentPosition.stopLoss,
            takeProfit: currentPosition.takeProfit,
            pnlPoints,
            grossPnL,
            totalCosts,
            netPnL,
            win: netPnL > 0,
            exitReason,
            signalReason: currentPosition.signalReason,
          })

          currentPosition = null
        }

        continue // Don't look for new signals while in position
      }

      // Check for new entry
      if (hour < ROC_CONFIG.tradingStartHour || hour >= ROC_CONFIG.tradingEndHour) {
        continue
      }

      if (tradesToday >= ROC_CONFIG.maxTradesPerDay) {
        continue
      }

      if (candle.time - lastTradeTime < ROC_CONFIG.minMinutesBetweenTrades * 60 * 1000) {
        continue
      }

      // Generate signal
      const candleSlice = candles.slice(0, i + 1)
      const haSlice = haCandles.slice(0, i + 1)
      const rocSlice = rocValues.slice(0, i + 1)

      const signal = generateROCSignal(candleSlice, haSlice, rocSlice, atr)

      if (signal.direction !== 'FLAT') {
        const actualEntryPrice = signal.direction === 'LONG'
          ? signal.entryPrice + slippage
          : signal.entryPrice - slippage

        currentPosition = {
          direction: signal.direction,
          entryPrice: signal.entryPrice,
          actualEntryPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          contracts: 1,
          entryTime: candle.time,
          entryDate: dateStr,
          signalReason: signal.reason,
        }

        tradesToday++
        lastTradeTime = candle.time
      }
    }

    // Calculate summary
    const wins = trades.filter(t => t.win).length
    const losses = trades.length - wins
    const winRate = trades.length > 0 ? (wins / trades.length * 100).toFixed(2) : '0'
    const grossProfit = trades.filter(t => t.netPnL > 0).reduce((sum, t) => sum + t.grossPnL, 0)
    const grossLoss = Math.abs(trades.filter(t => t.netPnL <= 0).reduce((sum, t) => sum + t.grossPnL, 0))
    const totalCosts = trades.reduce((sum, t) => sum + t.totalCosts, 0)
    const netPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'N/A'

    // Exit reason breakdown
    const exitReasons: Record<string, number> = {}
    trades.forEach(t => {
      exitReasons[t.exitReason] = (exitReasons[t.exitReason] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      testInfo: {
        strategy: 'ROC + Heikin Ashi',
        randomOffset,
        candlesUsed: candles.length,
        config: {
          rocPeriod: ROC_CONFIG.rocPeriod,
          atrMultiplierSL: ROC_CONFIG.atrMultiplierSL,
          atrMultiplierTP: ROC_CONFIG.atrMultiplierTP,
          tradingHours: `${ROC_CONFIG.tradingStartHour}:00 - ${ROC_CONFIG.tradingEndHour}:00 EST`,
        }
      },
      summary: {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: `${winRate}%`,
        grossProfit: `$${grossProfit.toFixed(2)}`,
        grossLoss: `$${grossLoss.toFixed(2)}`,
        totalCosts: `$${totalCosts.toFixed(2)}`,
        netPnL: `$${netPnL.toFixed(2)}`,
        profitFactor,
        avgTradesPerDay: (trades.length / days).toFixed(1),
      },
      exitReasons,
      recentTrades: trades.slice(-15),
    })

  } catch (error) {
    console.error('ROC Test Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
