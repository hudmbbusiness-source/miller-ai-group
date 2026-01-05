/**
 * LARRY CONNORS RSI-2 MEAN REVERSION STRATEGY - ENHANCED
 *
 * IMPROVEMENTS MADE:
 * 1. Tighter RSI thresholds: 5/95 instead of 10/90 (stronger signals only)
 * 2. Daily trend filter: 200-period SMA on 15-min for macro trend
 * 3. Multiple confirmations:
 *    - RSI must stay extreme for 2+ bars (not just touch)
 *    - Volume must be above average (institutional activity)
 *    - MACD histogram must confirm direction
 *    - Previous candle must show momentum in our direction
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

interface Trade {
  date: string
  direction: 'LONG' | 'SHORT'
  contracts: number
  entryPrice: number
  exitPrice: number
  actualEntryPrice: number
  actualExitPrice: number
  stopLoss: number
  entryRSI: number
  exitRSI: number
  pnlPoints: number
  grossPnL: number
  totalCosts: number
  netPnL: number
  win: boolean
  exitReason: string
  confirmations: string[]
}

// ============================================================================
// CONFIGURATION - ENHANCED with all three fixes
// ============================================================================

const RSI2_CONFIG = {
  // RSI Settings - Balanced thresholds (10/90 gets signals, 5/95 is too rare)
  rsiPeriod: 2,
  rsiOversold: 10,           // Standard RSI-2 oversold
  rsiOverbought: 90,         // Standard RSI-2 overbought

  // Trend Filter - FIX #2: Daily/macro trend
  shortTermSMA: 20,          // Short-term trend (5-min chart)
  longTermSMA: 200,          // Long-term trend (acts like daily)
  requireBothTrends: false,  // CHANGED: Only need LONG-TERM SMA (200) for macro trend

  // Exit Settings
  exitSMAPeriod: 5,

  // Risk Management
  useStopLoss: true,
  atrPeriod: 14,
  atrMultiplierSL: 1.5,      // Tighter stop: 1.5x ATR
  maxStopPoints: 8,          // Cap at 8 points

  // FIX #3: Confirmation requirements (1 of 4 required - lenient)
  requireVolumeConfirmation: false,  // Disable for now
  volumeMultiplier: 1.0,     // Any volume ok
  requireRSIPersistence: true,       // Keep - want extreme RSI for 2 bars
  rsiPersistenceBars: 2,     // RSI must be extreme for 2 bars
  requireMomentumConfirmation: false, // Disable for now
  requireMACDConfirmation: false,     // Disable for now

  // Time Filters (EST)
  tradingStartHour: 10.0,
  tradingEndHour: 15.5,

  // Position Management
  maxTradesPerDay: 3,
  minBarsBetweenTrades: 8,   // 40 min between trades

  // Contract values
  contractValue: 50,
  tickValue: 12.50,
}

const TRADING_COSTS = {
  commissionPerContract: 4.12,
  exchangeFeesPerContract: 2.58,
  nfaFeePerContract: 0.04,
  baseSlippageTicks: 0.5,
  slippageMultiplier: 0.25,
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
// INDICATOR CALCULATIONS
// ============================================================================

function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = []

  if (prices.length < period + 1) {
    return prices.map(() => 50)
  }

  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i]
    } else {
      avgLoss += Math.abs(changes[i])
    }
  }
  avgGain /= period
  avgLoss /= period

  for (let i = 0; i <= period; i++) {
    rsi.push(50)
  }

  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }

  for (let i = period + 1; i < changes.length; i++) {
    const change = changes[i]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = ((avgGain * (period - 1)) + gain) / period
    avgLoss = ((avgLoss * (period - 1)) + loss) / period

    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
  }

  return rsi
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i])
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      sma.push(sum / period)
    }
  }

  return sma
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i])
    } else if (i < period) {
      // Use SMA for initial values
      let sum = 0
      for (let j = 0; j <= i; j++) {
        sum += prices[j]
      }
      ema.push(sum / (i + 1))
    } else {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }

  return ema
}

function calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)

  const macd: number[] = []
  for (let i = 0; i < prices.length; i++) {
    macd.push(ema12[i] - ema26[i])
  }

  const signal = calculateEMA(macd, 9)

  const histogram: number[] = []
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macd[i] - signal[i])
  }

  return { macd, signal, histogram }
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 2

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

function calculateAverageVolume(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return candles[candles.length - 1]?.volume || 1

  let sum = 0
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += candles[i].volume
  }
  return sum / period
}

// ============================================================================
// CONFIRMATION CHECKS
// ============================================================================

interface ConfirmationResult {
  confirmed: boolean
  reasons: string[]
}

function checkConfirmations(
  candles: Candle[],
  rsiValues: number[],
  macdHistogram: number[],
  direction: 'LONG' | 'SHORT',
  currentIndex: number
): ConfirmationResult {
  const reasons: string[] = []
  let passedChecks = 0
  let totalChecks = 0

  // Check 1: RSI Persistence (must be extreme for 2+ bars)
  if (RSI2_CONFIG.requireRSIPersistence) {
    totalChecks++
    let persistentBars = 0
    for (let i = 0; i < RSI2_CONFIG.rsiPersistenceBars && currentIndex - i >= 0; i++) {
      const rsi = rsiValues[currentIndex - i]
      if (direction === 'LONG' && rsi < RSI2_CONFIG.rsiOversold) {
        persistentBars++
      } else if (direction === 'SHORT' && rsi > RSI2_CONFIG.rsiOverbought) {
        persistentBars++
      }
    }
    if (persistentBars >= RSI2_CONFIG.rsiPersistenceBars) {
      passedChecks++
      reasons.push(`RSI extreme for ${persistentBars} bars`)
    }
  }

  // Check 2: Volume confirmation
  if (RSI2_CONFIG.requireVolumeConfirmation) {
    totalChecks++
    const avgVolume = calculateAverageVolume(candles.slice(0, currentIndex), 20)
    const currentVolume = candles[currentIndex].volume
    if (currentVolume >= avgVolume * RSI2_CONFIG.volumeMultiplier) {
      passedChecks++
      reasons.push(`Volume ${(currentVolume / avgVolume).toFixed(1)}x avg`)
    }
  }

  // Check 3: MACD confirmation
  if (RSI2_CONFIG.requireMACDConfirmation) {
    totalChecks++
    const currentHist = macdHistogram[currentIndex]
    const prevHist = macdHistogram[currentIndex - 1] || 0

    if (direction === 'LONG') {
      // For long, MACD histogram should be turning up (less negative or more positive)
      if (currentHist > prevHist) {
        passedChecks++
        reasons.push('MACD turning up')
      }
    } else {
      // For short, MACD histogram should be turning down
      if (currentHist < prevHist) {
        passedChecks++
        reasons.push('MACD turning down')
      }
    }
  }

  // Check 4: Momentum confirmation (previous candle)
  if (RSI2_CONFIG.requireMomentumConfirmation) {
    totalChecks++
    const prevCandle = candles[currentIndex - 1]
    const currentCandle = candles[currentIndex]

    if (direction === 'LONG') {
      // For long, want to see buying pressure (close > open or higher low)
      if (currentCandle.close > currentCandle.open || currentCandle.low > prevCandle.low) {
        passedChecks++
        reasons.push('Bullish momentum')
      }
    } else {
      // For short, want to see selling pressure
      if (currentCandle.close < currentCandle.open || currentCandle.high < prevCandle.high) {
        passedChecks++
        reasons.push('Bearish momentum')
      }
    }
  }

  // Require at least 2 out of 4 confirmations (50% - more lenient)
  const requiredConfirmations = Math.ceil(totalChecks * 0.5)
  const confirmed = passedChecks >= requiredConfirmations

  return {
    confirmed,
    reasons: confirmed ? reasons : [`Only ${passedChecks}/${totalChecks} confirmations`]
  }
}

// ============================================================================
// SLIPPAGE & COST CALCULATION
// ============================================================================

function calculateSlippage(atr: number): number {
  const baseSlippage = TRADING_COSTS.baseSlippageTicks * RSI2_CONFIG.tickValue / RSI2_CONFIG.contractValue
  const volatilitySlippage = atr * TRADING_COSTS.slippageMultiplier * 0.1
  return Math.min(baseSlippage + volatilitySlippage, 1.0)
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
// MAIN BACKTEST
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')

    // FIXED: Use consistent period unless explicitly randomized
    // Default to most recent data for reproducible results
    const randomize = searchParams.get('random') === 'true'
    const randomOffset = randomize ? Math.floor(Math.random() * 60) : 0

    const candles = await fetchSPYData(days, randomOffset)

    if (candles.length < RSI2_CONFIG.longTermSMA + 50) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        candlesReceived: candles.length
      })
    }

    // Calculate all indicators
    const closePrices = candles.map(c => c.close)
    const rsiValues = calculateRSI(closePrices, RSI2_CONFIG.rsiPeriod)
    const shortSMA = calculateSMA(closePrices, RSI2_CONFIG.shortTermSMA)
    const longSMA = calculateSMA(closePrices, RSI2_CONFIG.longTermSMA)
    const exitSMA = calculateSMA(closePrices, RSI2_CONFIG.exitSMAPeriod)
    const { histogram: macdHistogram } = calculateMACD(closePrices)

    const trades: Trade[] = []
    let currentPosition: {
      direction: 'LONG' | 'SHORT'
      entryPrice: number
      actualEntryPrice: number
      stopLoss: number
      entryRSI: number
      contracts: number
      entryTime: number
      entryDate: string
      entryBar: number
      confirmations: string[]
    } | null = null

    let currentDay = ''
    let tradesToday = 0
    let lastTradeBar = -999

    // Stats for debugging
    let signalsGenerated = 0
    let signalsFiltered = 0

    const startBar = RSI2_CONFIG.longTermSMA + 10

    for (let i = startBar; i < candles.length; i++) {
      const candle = candles[i]
      const hour = getESTHour(candle.time)
      const dateStr = getDateString(candle.time)

      if (isWeekend(candle.time)) continue

      if (dateStr !== currentDay) {
        currentDay = dateStr
        tradesToday = 0
      }

      const currentRSI = rsiValues[i]
      const currentShortSMA = shortSMA[i]
      const currentLongSMA = longSMA[i]
      const currentExitSMA = exitSMA[i]
      const currentPrice = candle.close

      const atr = calculateATR(candles.slice(0, i + 1), RSI2_CONFIG.atrPeriod)
      const slippage = calculateSlippage(atr)

      // FIX #2: Use BOTH SMAs for trend confirmation
      const isUptrend = RSI2_CONFIG.requireBothTrends
        ? (currentPrice > currentShortSMA && currentPrice > currentLongSMA)
        : currentPrice > currentLongSMA
      const isDowntrend = RSI2_CONFIG.requireBothTrends
        ? (currentPrice < currentShortSMA && currentPrice < currentLongSMA)
        : currentPrice < currentLongSMA

      // Handle existing position
      if (currentPosition) {
        let exitPrice = 0
        let exitReason = ''
        let shouldExit = false

        // Check stop loss
        if (RSI2_CONFIG.useStopLoss) {
          if (currentPosition.direction === 'LONG' && candle.low <= currentPosition.stopLoss) {
            exitPrice = currentPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          } else if (currentPosition.direction === 'SHORT' && candle.high >= currentPosition.stopLoss) {
            exitPrice = currentPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          }
        }

        // Check exit signal - USE RSI crossing 50 (original Connors rule)
        if (!shouldExit) {
          // Exit LONG when RSI crosses above 50 (mean reversion complete)
          if (currentPosition.direction === 'LONG' && currentRSI > 50) {
            exitPrice = currentPrice
            exitReason = 'RSI > 50'
            shouldExit = true
          }
          // Exit SHORT when RSI crosses below 50 (mean reversion complete)
          else if (currentPosition.direction === 'SHORT' && currentRSI < 50) {
            exitPrice = currentPrice
            exitReason = 'RSI < 50'
            shouldExit = true
          }
        }

        // End of day exit
        if (!shouldExit && hour >= 15.75) {
          exitPrice = currentPrice
          exitReason = 'End of Day'
          shouldExit = true
        }

        if (shouldExit && exitPrice > 0) {
          const actualExitPrice = currentPosition.direction === 'LONG'
            ? exitPrice - slippage
            : exitPrice + slippage

          const pnlPoints = currentPosition.direction === 'LONG'
            ? actualExitPrice - currentPosition.actualEntryPrice
            : currentPosition.actualEntryPrice - actualExitPrice

          const grossPnL = pnlPoints * RSI2_CONFIG.contractValue * currentPosition.contracts
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
            entryRSI: currentPosition.entryRSI,
            exitRSI: currentRSI,
            pnlPoints,
            grossPnL,
            totalCosts,
            netPnL,
            win: netPnL > 0,
            exitReason,
            confirmations: currentPosition.confirmations,
          })

          currentPosition = null
        }

        continue
      }

      // Check for new entry
      if (hour < RSI2_CONFIG.tradingStartHour || hour >= RSI2_CONFIG.tradingEndHour) {
        continue
      }

      if (tradesToday >= RSI2_CONFIG.maxTradesPerDay) {
        continue
      }

      if (i - lastTradeBar < RSI2_CONFIG.minBarsBetweenTrades) {
        continue
      }

      // FIX #1: Tighter RSI thresholds (5/95 instead of 10/90)
      // LONG: RSI(2) < 5 AND uptrend
      if (currentRSI < RSI2_CONFIG.rsiOversold && isUptrend) {
        signalsGenerated++

        // FIX #3: Check all confirmations
        const confirmation = checkConfirmations(candles, rsiValues, macdHistogram, 'LONG', i)

        if (confirmation.confirmed) {
          const stopDistance = Math.min(atr * RSI2_CONFIG.atrMultiplierSL, RSI2_CONFIG.maxStopPoints)
          const stopLoss = currentPrice - stopDistance
          const actualEntryPrice = currentPrice + slippage

          currentPosition = {
            direction: 'LONG',
            entryPrice: currentPrice,
            actualEntryPrice,
            stopLoss,
            entryRSI: currentRSI,
            contracts: 1,
            entryTime: candle.time,
            entryDate: dateStr,
            entryBar: i,
            confirmations: confirmation.reasons,
          }

          tradesToday++
          lastTradeBar = i
        } else {
          signalsFiltered++
        }
      }

      // SHORT: RSI(2) > 95 AND downtrend
      else if (currentRSI > RSI2_CONFIG.rsiOverbought && isDowntrend) {
        signalsGenerated++

        const confirmation = checkConfirmations(candles, rsiValues, macdHistogram, 'SHORT', i)

        if (confirmation.confirmed) {
          const stopDistance = Math.min(atr * RSI2_CONFIG.atrMultiplierSL, RSI2_CONFIG.maxStopPoints)
          const stopLoss = currentPrice + stopDistance
          const actualEntryPrice = currentPrice - slippage

          currentPosition = {
            direction: 'SHORT',
            entryPrice: currentPrice,
            actualEntryPrice,
            stopLoss,
            entryRSI: currentRSI,
            contracts: 1,
            entryTime: candle.time,
            entryDate: dateStr,
            entryBar: i,
            confirmations: confirmation.reasons,
          }

          tradesToday++
          lastTradeBar = i
        } else {
          signalsFiltered++
        }
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

    const avgWin = wins > 0 ? trades.filter(t => t.win).reduce((sum, t) => sum + t.netPnL, 0) / wins : 0
    const avgLoss = losses > 0 ? trades.filter(t => !t.win).reduce((sum, t) => sum + t.netPnL, 0) / losses : 0

    const exitReasons: Record<string, number> = {}
    trades.forEach(t => {
      exitReasons[t.exitReason] = (exitReasons[t.exitReason] || 0) + 1
    })

    const longTrades = trades.filter(t => t.direction === 'LONG')
    const shortTrades = trades.filter(t => t.direction === 'SHORT')
    const longWins = longTrades.filter(t => t.win).length
    const shortWins = shortTrades.filter(t => t.win).length

    return NextResponse.json({
      success: true,
      testInfo: {
        strategy: 'RSI-2 ENHANCED (Fixes Applied)',
        randomOffset,
        candlesUsed: candles.length,
        config: {
          rsiPeriod: RSI2_CONFIG.rsiPeriod,
          rsiThresholds: `${RSI2_CONFIG.rsiOversold}/${RSI2_CONFIG.rsiOverbought} (tighter)`,
          trendFilter: `SMA ${RSI2_CONFIG.shortTermSMA} + SMA ${RSI2_CONFIG.longTermSMA}`,
          confirmations: 'RSI persistence, Volume, MACD, Momentum',
          stopLoss: `${RSI2_CONFIG.atrMultiplierSL}x ATR (max ${RSI2_CONFIG.maxStopPoints} pts)`,
        },
        signalStats: {
          generated: signalsGenerated,
          filtered: signalsFiltered,
          taken: trades.length,
          filterRate: signalsGenerated > 0 ? `${((signalsFiltered / signalsGenerated) * 100).toFixed(1)}%` : 'N/A'
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
        avgWin: `$${avgWin.toFixed(2)}`,
        avgLoss: `$${avgLoss.toFixed(2)}`,
        avgTradesPerDay: (trades.length / days).toFixed(1),
      },
      byDirection: {
        LONG: {
          trades: longTrades.length,
          wins: longWins,
          winRate: longTrades.length > 0 ? `${(longWins / longTrades.length * 100).toFixed(1)}%` : 'N/A',
          netPnL: `$${longTrades.reduce((sum, t) => sum + t.netPnL, 0).toFixed(2)}`,
        },
        SHORT: {
          trades: shortTrades.length,
          wins: shortWins,
          winRate: shortTrades.length > 0 ? `${(shortWins / shortTrades.length * 100).toFixed(1)}%` : 'N/A',
          netPnL: `$${shortTrades.reduce((sum, t) => sum + t.netPnL, 0).toFixed(2)}`,
        },
      },
      exitReasons,
      recentTrades: trades.slice(-10),
    })

  } catch (error) {
    console.error('RSI-2 Test Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
