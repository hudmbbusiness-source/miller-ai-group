/**
 * COMBINED STRATEGY BACKTEST - ORB + ROC/Heikin Ashi
 *
 * TWO STRATEGIES WORKING TOGETHER:
 * 1. ORB (Opening Range Breakout) - 1 trade in morning
 * 2. ROC+HA (Rate of Change + Heikin Ashi) - Multiple trades throughout day
 *
 * This allows MORE TRADES = MORE PROFIT POTENTIAL
 *
 * ORB Source: Trade That Swing (74% win rate)
 * ROC+HA Source: LiberatedStockTrader (55% win rate, 2.7:1 R:R)
 */

import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// TYPES
// =============================================================================

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
  strategy: 'ORB' | 'ROC_HA'
  direction: 'LONG' | 'SHORT'
  contracts: number
  entryPrice: number
  exitPrice: number
  actualEntryPrice: number
  actualExitPrice: number
  stopLoss: number
  takeProfit: number
  stopDistance: number
  riskReward: number
  pnlPoints: number
  grossPnL: number
  totalCosts: number
  netPnL: number
  win: boolean
  exitReason: string
  signalReason: string
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

// =============================================================================
// CONFIG
// =============================================================================

const ORB_CONFIG = {
  orbStartHour: 9.5,        // 9:30 AM EST
  orbEndHour: 9.75,         // 9:45 AM EST (15 min range)
  tradingEndHour: 15.0,     // 3:00 PM EST
  takeProfitRatio: 0.75,    // 75% of OR range
  minRangePoints: 3,
  maxRangePoints: 30,
  contractValue: 50,
  tickValue: 12.50,
}

const ROC_CONFIG = {
  rocPeriod: 9,             // ROC lookback period
  minBodySize: 0.3,         // Min HA body size (filter dojis)
  atrMultiplierSL: 1.5,     // ATR multiplier for stop loss
  atrMultiplierTP: 2.7,     // ATR multiplier for take profit (2.7:1 R:R from research)
  minROCStrength: 0.1,      // Minimum ROC value for signal
  maxTradesPerDay: 5,       // Cap ROC trades per day to avoid overtrading
}

const COST_CONFIG = {
  commission: 4.12,
  exchangeFee: 2.58,
  nfaFee: 0.04,
  baseSlippageTicks: 0.5,
  volatilitySlippageMultiplier: 0.1,
  maxSlippageTicks: 2.0,
  spreadTicks: 0.25,
  rejectionRate: 0.02,
}

// =============================================================================
// HELPERS
// =============================================================================

function getESTHour(timestamp: number): number {
  const date = new Date(timestamp)
  const estString = date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false })
  const [hourStr, minuteStr] = estString.split(':')
  return parseInt(hourStr) + (parseInt(minuteStr) / 60)
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function isWeekday(timestamp: number): boolean {
  const date = new Date(timestamp)
  const day = date.getUTCDay()
  return day !== 0 && day !== 6
}

function calculateSlippage(volatility: number, direction: 'LONG' | 'SHORT', isEntry: boolean): number {
  const volatilityFactor = volatility * COST_CONFIG.volatilitySlippageMultiplier
  let slippageTicks = COST_CONFIG.baseSlippageTicks + volatilityFactor
  slippageTicks = Math.min(slippageTicks, COST_CONFIG.maxSlippageTicks)
  const randomFactor = 0.7 + (Math.random() * 0.6)
  slippageTicks *= randomFactor
  const slippagePoints = slippageTicks * 0.25

  if (direction === 'LONG') {
    return isEntry ? slippagePoints : -slippagePoints
  } else {
    return isEntry ? -slippagePoints : slippagePoints
  }
}

function calculateFixedCosts(): number {
  return COST_CONFIG.commission + COST_CONFIG.exchangeFee + COST_CONFIG.nfaFee
}

function isOrderRejected(): boolean {
  return Math.random() < COST_CONFIG.rejectionRate
}

// =============================================================================
// HEIKIN ASHI + ROC FUNCTIONS
// =============================================================================

function calculateHeikinAshi(candles: Candle[]): HeikinAshiCandle[] {
  if (candles.length === 0) return []
  const haCandles: HeikinAshiCandle[] = []

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const haClose = (c.open + c.high + c.low + c.close) / 4
    let haOpen: number
    if (i === 0) {
      haOpen = (c.open + c.close) / 2
    } else {
      haOpen = (haCandles[i - 1].open + haCandles[i - 1].close) / 2
    }
    const haHigh = Math.max(c.high, haOpen, haClose)
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

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 1
  let atrSum = 0
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    atrSum += tr
  }
  return atrSum / period
}

function detectROCCrossover(roc: number[]): { crossed: boolean; direction: 'UP' | 'DOWN' | 'NONE' } {
  if (roc.length < 2) return { crossed: false, direction: 'NONE' }
  const current = roc[roc.length - 1]
  const previous = roc[roc.length - 2]

  if (previous <= 0 && current > 0) return { crossed: true, direction: 'UP' }
  if (previous >= 0 && current < 0) return { crossed: true, direction: 'DOWN' }
  return { crossed: false, direction: 'NONE' }
}

// =============================================================================
// FETCH DATA
// =============================================================================

async function fetchSPYData(days: number = 30): Promise<Candle[]> {
  const endDate = Math.floor(Date.now() / 1000)
  const startDate = endDate - (days * 24 * 60 * 60)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startDate}&period2=${endDate}&interval=5m&includePrePost=true`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })

  if (!response.ok) throw new Error(`Failed to fetch SPY data: ${response.status}`)

  const data = await response.json()
  const result = data.chart?.result?.[0]
  if (!result) throw new Error('No data returned from Yahoo Finance')

  const timestamps = result.timestamp || []
  const quotes = result.indicators?.quote?.[0] || {}
  const candles: Candle[] = []

  for (let i = 0; i < timestamps.length; i++) {
    const open = quotes.open?.[i]
    const high = quotes.high?.[i]
    const low = quotes.low?.[i]
    const close = quotes.close?.[i]
    const volume = quotes.volume?.[i]
    if (open == null || high == null || low == null || close == null) continue

    candles.push({
      time: timestamps[i] * 1000,
      open: open * 10,
      high: high * 10,
      low: low * 10,
      close: close * 10,
      volume: volume || 0,
    })
  }
  return candles
}

// =============================================================================
// COMBINED BACKTEST
// =============================================================================

function runCombinedBacktest(candles: Candle[]): { trades: Trade[], orbTrades: number, rocTrades: number } {
  const trades: Trade[] = []
  let orbTrades = 0
  let rocTrades = 0

  // Group candles by date
  const candlesByDate: Map<string, Candle[]> = new Map()
  for (const candle of candles) {
    if (!isWeekday(candle.time)) continue
    const dateStr = getDateString(candle.time)
    if (!candlesByDate.has(dateStr)) candlesByDate.set(dateStr, [])
    candlesByDate.get(dateStr)!.push(candle)
  }

  // Process each trading day
  for (const [dateStr, dayCandles] of candlesByDate) {
    dayCandles.sort((a, b) => a.time - b.time)

    // =========================================================================
    // STRATEGY 1: ORB (Opening Range Breakout)
    // =========================================================================
    const orbCandles = dayCandles.filter(c => {
      const hour = getESTHour(c.time)
      return hour >= ORB_CONFIG.orbStartHour && hour < ORB_CONFIG.orbEndHour
    })

    let orbTradeTaken = false
    let orHigh = 0, orLow = 0, orRange = 0

    if (orbCandles.length > 0) {
      orHigh = Math.max(...orbCandles.map(c => c.high))
      orLow = Math.min(...orbCandles.map(c => c.low))
      orRange = orHigh - orLow

      if (orRange >= ORB_CONFIG.minRangePoints && orRange <= ORB_CONFIG.maxRangePoints) {
        const tradingCandles = dayCandles.filter(c => {
          const hour = getESTHour(c.time)
          return hour >= ORB_CONFIG.orbEndHour && hour < ORB_CONFIG.tradingEndHour
        })

        for (const candle of tradingCandles) {
          if (orbTradeTaken) break
          if (isOrderRejected()) continue

          // LONG breakout
          if (candle.close > orHigh) {
            const entrySlippage = calculateSlippage(orRange, 'LONG', true)
            const actualEntry = candle.close + entrySlippage
            const stopLoss = orLow
            const takeProfit = actualEntry + (orRange * ORB_CONFIG.takeProfitRatio)
            const stopDistance = actualEntry - stopLoss

            // Find exit
            let exitPrice = candle.close
            let exitReason = 'End of Day'
            const remainingCandles = tradingCandles.slice(tradingCandles.indexOf(candle) + 1)

            for (const exitCandle of remainingCandles) {
              if (exitCandle.low <= stopLoss) {
                exitPrice = stopLoss
                exitReason = 'Stop Loss'
                break
              }
              if (exitCandle.high >= takeProfit) {
                exitPrice = takeProfit
                exitReason = 'Take Profit'
                break
              }
            }
            if (exitReason === 'End of Day' && remainingCandles.length > 0) {
              exitPrice = remainingCandles[remainingCandles.length - 1].close
            }

            const exitSlippage = calculateSlippage(orRange, 'LONG', false)
            const actualExit = exitPrice + exitSlippage
            const pnlPoints = actualExit - actualEntry
            const grossPnL = pnlPoints * ORB_CONFIG.contractValue
            const costs = calculateFixedCosts() + (COST_CONFIG.spreadTicks * ORB_CONFIG.tickValue)

            trades.push({
              date: dateStr,
              strategy: 'ORB',
              direction: 'LONG',
              contracts: 1,
              entryPrice: candle.close,
              exitPrice,
              actualEntryPrice: actualEntry,
              actualExitPrice: actualExit,
              stopLoss,
              takeProfit,
              stopDistance,
              riskReward: (takeProfit - actualEntry) / stopDistance,
              pnlPoints,
              grossPnL,
              totalCosts: costs,
              netPnL: grossPnL - costs,
              win: grossPnL - costs > 0,
              exitReason,
              signalReason: `ORB LONG: Close ${candle.close.toFixed(2)} > OR High ${orHigh.toFixed(2)}`,
            })
            orbTrades++
            orbTradeTaken = true
          }
          // SHORT breakout
          else if (candle.close < orLow) {
            const entrySlippage = calculateSlippage(orRange, 'SHORT', true)
            const actualEntry = candle.close + entrySlippage
            const stopLoss = orHigh
            const takeProfit = actualEntry - (orRange * ORB_CONFIG.takeProfitRatio)
            const stopDistance = stopLoss - actualEntry

            let exitPrice = candle.close
            let exitReason = 'End of Day'
            const remainingCandles = tradingCandles.slice(tradingCandles.indexOf(candle) + 1)

            for (const exitCandle of remainingCandles) {
              if (exitCandle.high >= stopLoss) {
                exitPrice = stopLoss
                exitReason = 'Stop Loss'
                break
              }
              if (exitCandle.low <= takeProfit) {
                exitPrice = takeProfit
                exitReason = 'Take Profit'
                break
              }
            }
            if (exitReason === 'End of Day' && remainingCandles.length > 0) {
              exitPrice = remainingCandles[remainingCandles.length - 1].close
            }

            const exitSlippage = calculateSlippage(orRange, 'SHORT', false)
            const actualExit = exitPrice + exitSlippage
            const pnlPoints = actualEntry - actualExit
            const grossPnL = pnlPoints * ORB_CONFIG.contractValue
            const costs = calculateFixedCosts() + (COST_CONFIG.spreadTicks * ORB_CONFIG.tickValue)

            trades.push({
              date: dateStr,
              strategy: 'ORB',
              direction: 'SHORT',
              contracts: 1,
              entryPrice: candle.close,
              exitPrice,
              actualEntryPrice: actualEntry,
              actualExitPrice: actualExit,
              stopLoss,
              takeProfit,
              stopDistance,
              riskReward: (actualEntry - takeProfit) / stopDistance,
              pnlPoints,
              grossPnL,
              totalCosts: costs,
              netPnL: grossPnL - costs,
              win: grossPnL - costs > 0,
              exitReason,
              signalReason: `ORB SHORT: Close ${candle.close.toFixed(2)} < OR Low ${orLow.toFixed(2)}`,
            })
            orbTrades++
            orbTradeTaken = true
          }
        }
      }
    }

    // =========================================================================
    // STRATEGY 2: ROC + Heikin Ashi (Multiple trades per day)
    // =========================================================================
    let rocTradesThisDay = 0
    let inRocPosition = false
    let rocPosition: { direction: 'LONG' | 'SHORT', entry: number, stopLoss: number, takeProfit: number, entryIndex: number } | null = null

    // Get all trading candles for ROC (after 10:00 AM to avoid ORB conflict)
    const rocTradingCandles = dayCandles.filter(c => {
      const hour = getESTHour(c.time)
      return hour >= 10.0 && hour < ORB_CONFIG.tradingEndHour
    })

    if (rocTradingCandles.length < ROC_CONFIG.rocPeriod + 5) continue

    for (let i = ROC_CONFIG.rocPeriod + 5; i < rocTradingCandles.length; i++) {
      const candlesUpToNow = rocTradingCandles.slice(0, i + 1)
      const currentCandle = rocTradingCandles[i]
      const atr = calculateATR(candlesUpToNow)

      // Check for exit if in position
      if (inRocPosition && rocPosition) {
        let shouldExit = false
        let exitPrice = currentCandle.close
        let exitReason = ''

        if (rocPosition.direction === 'LONG') {
          if (currentCandle.low <= rocPosition.stopLoss) {
            exitPrice = rocPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          } else if (currentCandle.high >= rocPosition.takeProfit) {
            exitPrice = rocPosition.takeProfit
            exitReason = 'Take Profit'
            shouldExit = true
          }
        } else {
          if (currentCandle.high >= rocPosition.stopLoss) {
            exitPrice = rocPosition.stopLoss
            exitReason = 'Stop Loss'
            shouldExit = true
          } else if (currentCandle.low <= rocPosition.takeProfit) {
            exitPrice = rocPosition.takeProfit
            exitReason = 'Take Profit'
            shouldExit = true
          }
        }

        // End of day exit
        if (!shouldExit && i === rocTradingCandles.length - 1) {
          exitReason = 'End of Day'
          shouldExit = true
        }

        if (shouldExit) {
          const exitSlippage = calculateSlippage(atr, rocPosition.direction, false)
          const actualExit = exitPrice + exitSlippage
          const pnlPoints = rocPosition.direction === 'LONG'
            ? actualExit - rocPosition.entry
            : rocPosition.entry - actualExit
          const grossPnL = pnlPoints * ORB_CONFIG.contractValue
          const costs = calculateFixedCosts() + (COST_CONFIG.spreadTicks * ORB_CONFIG.tickValue)

          trades.push({
            date: dateStr,
            strategy: 'ROC_HA',
            direction: rocPosition.direction,
            contracts: 1,
            entryPrice: rocPosition.entry,
            exitPrice,
            actualEntryPrice: rocPosition.entry,
            actualExitPrice: actualExit,
            stopLoss: rocPosition.stopLoss,
            takeProfit: rocPosition.takeProfit,
            stopDistance: Math.abs(rocPosition.entry - rocPosition.stopLoss),
            riskReward: ROC_CONFIG.atrMultiplierTP / ROC_CONFIG.atrMultiplierSL,
            pnlPoints,
            grossPnL,
            totalCosts: costs,
            netPnL: grossPnL - costs,
            win: grossPnL - costs > 0,
            exitReason,
            signalReason: `ROC+HA ${rocPosition.direction}`,
          })
          rocTrades++
          inRocPosition = false
          rocPosition = null
        }
        continue
      }

      // Check for new ROC+HA signal
      if (rocTradesThisDay >= ROC_CONFIG.maxTradesPerDay) continue
      if (isOrderRejected()) continue

      const haCandles = calculateHeikinAshi(candlesUpToNow)
      const currentHA = haCandles[haCandles.length - 1]
      const previousHA = haCandles[haCandles.length - 2]

      if (currentHA.bodySize < ROC_CONFIG.minBodySize) continue

      const haPrices = haCandles.map(c => c.close)
      const rocValues = calculateROC(haPrices, ROC_CONFIG.rocPeriod)
      const crossover = detectROCCrossover(rocValues)
      const currentROC = rocValues[rocValues.length - 1]

      // LONG: ROC crosses above 0 AND HA is green
      if (crossover.crossed && crossover.direction === 'UP' && currentHA.isGreen) {
        const entrySlippage = calculateSlippage(atr, 'LONG', true)
        const actualEntry = currentCandle.close + entrySlippage
        const stopLoss = actualEntry - (atr * ROC_CONFIG.atrMultiplierSL)
        const takeProfit = actualEntry + (atr * ROC_CONFIG.atrMultiplierTP)

        rocPosition = { direction: 'LONG', entry: actualEntry, stopLoss, takeProfit, entryIndex: i }
        inRocPosition = true
        rocTradesThisDay++
      }
      // SHORT: ROC crosses below 0 AND HA is red
      else if (crossover.crossed && crossover.direction === 'DOWN' && !currentHA.isGreen) {
        const entrySlippage = calculateSlippage(atr, 'SHORT', true)
        const actualEntry = currentCandle.close + entrySlippage
        const stopLoss = actualEntry + (atr * ROC_CONFIG.atrMultiplierSL)
        const takeProfit = actualEntry - (atr * ROC_CONFIG.atrMultiplierTP)

        rocPosition = { direction: 'SHORT', entry: actualEntry, stopLoss, takeProfit, entryIndex: i }
        inRocPosition = true
        rocTradesThisDay++
      }
    }

    // Close any remaining ROC position at end of day
    if (inRocPosition && rocPosition) {
      const lastCandle = rocTradingCandles[rocTradingCandles.length - 1]
      const atr = calculateATR(rocTradingCandles)
      const exitSlippage = calculateSlippage(atr, rocPosition.direction, false)
      const actualExit = lastCandle.close + exitSlippage
      const pnlPoints = rocPosition.direction === 'LONG'
        ? actualExit - rocPosition.entry
        : rocPosition.entry - actualExit
      const grossPnL = pnlPoints * ORB_CONFIG.contractValue
      const costs = calculateFixedCosts() + (COST_CONFIG.spreadTicks * ORB_CONFIG.tickValue)

      trades.push({
        date: dateStr,
        strategy: 'ROC_HA',
        direction: rocPosition.direction,
        contracts: 1,
        entryPrice: rocPosition.entry,
        exitPrice: lastCandle.close,
        actualEntryPrice: rocPosition.entry,
        actualExitPrice: actualExit,
        stopLoss: rocPosition.stopLoss,
        takeProfit: rocPosition.takeProfit,
        stopDistance: Math.abs(rocPosition.entry - rocPosition.stopLoss),
        riskReward: ROC_CONFIG.atrMultiplierTP / ROC_CONFIG.atrMultiplierSL,
        pnlPoints,
        grossPnL,
        totalCosts: costs,
        netPnL: grossPnL - costs,
        win: grossPnL - costs > 0,
        exitReason: 'End of Day',
        signalReason: `ROC+HA ${rocPosition.direction}`,
      })
      rocTrades++
    }
  }

  return { trades, orbTrades, rocTrades }
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const randomize = searchParams.get('randomize') !== 'false'

    const maxOffset = 30
    const randomOffset = randomize ? Math.floor(Math.random() * maxOffset) : 0
    const fetchDays = days + maxOffset

    const allCandles = await fetchSPYData(fetchDays)
    const candlesPerDay = Math.floor(allCandles.length / fetchDays)
    const offsetCandles = randomOffset * candlesPerDay
    const candles = allCandles.slice(offsetCandles, offsetCandles + (days * candlesPerDay))

    const { trades, orbTrades, rocTrades } = runCombinedBacktest(candles)

    // Calculate stats
    const wins = trades.filter(t => t.win).length
    const losses = trades.length - wins
    const grossProfit = trades.filter(t => t.grossPnL > 0).reduce((sum, t) => sum + t.grossPnL, 0)
    const grossLoss = Math.abs(trades.filter(t => t.grossPnL < 0).reduce((sum, t) => sum + t.grossPnL, 0))
    const totalCosts = trades.reduce((sum, t) => sum + t.totalCosts, 0)
    const netPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)

    // Stats by strategy
    const orbTradesArr = trades.filter(t => t.strategy === 'ORB')
    const rocTradesArr = trades.filter(t => t.strategy === 'ROC_HA')

    const orbWins = orbTradesArr.filter(t => t.win).length
    const orbNetPnL = orbTradesArr.reduce((sum, t) => sum + t.netPnL, 0)

    const rocWins = rocTradesArr.filter(t => t.win).length
    const rocNetPnL = rocTradesArr.reduce((sum, t) => sum + t.netPnL, 0)

    return NextResponse.json({
      success: true,
      testInfo: {
        randomOffset,
        candlesUsed: candles.length,
        note: 'COMBINED: ORB (1/day) + ROC+HA (multiple/day)',
      },
      summary: {
        totalTrades: trades.length,
        wins,
        losses,
        winRate: `${((wins / trades.length) * 100).toFixed(2)}%`,
        grossProfit: `$${grossProfit.toFixed(2)}`,
        grossLoss: `$${grossLoss.toFixed(2)}`,
        totalCosts: `$${totalCosts.toFixed(2)}`,
        netPnL: `$${netPnL.toFixed(2)}`,
        profitFactor: grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'N/A',
        avgTradesPerDay: (trades.length / 21).toFixed(1),
      },
      byStrategy: {
        ORB: {
          trades: orbTrades,
          wins: orbWins,
          winRate: orbTrades > 0 ? `${((orbWins / orbTrades) * 100).toFixed(2)}%` : 'N/A',
          netPnL: `$${orbNetPnL.toFixed(2)}`,
        },
        ROC_HA: {
          trades: rocTrades,
          wins: rocWins,
          winRate: rocTrades > 0 ? `${((rocWins / rocTrades) * 100).toFixed(2)}%` : 'N/A',
          netPnL: `$${rocNetPnL.toFixed(2)}`,
        },
      },
      recentTrades: trades.slice(-15),
    })
  } catch (error) {
    console.error('Combined Backtest Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
