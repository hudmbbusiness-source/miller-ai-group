/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    ⚠️  CRITICAL - DO NOT EDIT  ⚠️                         ║
 * ║                                                                           ║
 * ║  This file contains the LIVE version of the proven adaptive strategy.    ║
 * ║  It uses IDENTICAL logic to the tested backtest (adaptive/route.ts).     ║
 * ║                                                                           ║
 * ║  🚨 CLAUDE: DO NOT MODIFY THIS FILE WITHOUT EXPLICIT USER PERMISSION 🚨   ║
 * ║  If user asks to "improve" or "enhance", FIRST notify them:              ║
 * ║  "This is a proven strategy with verified results. Are you sure you      ║
 * ║   want me to modify it? Changes may affect the tested performance."      ║
 * ║                                                                           ║
 * ║  Last verified: January 5, 2026                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * LIVE ADAPTIVE TRADING - Uses EXACT same logic as tested adaptive strategy
 *
 * THIS MATCHES THE TESTED BACKTEST 1:1
 *
 * Patterns used:
 * - VWAP_PULLBACK_LONG/SHORT (71.4%/57.1% win rate)
 * - EMA20_BOUNCE_LONG (57.1% win rate)
 * - ORB_BREAKOUT_SHORT (100% win rate)
 *
 * Regime Detection:
 * - STRONG_UPTREND/UPTREND → LONG only
 * - STRONG_DOWNTREND/DOWNTREND → SHORT only
 * - SIDEWAYS → NO TRADE (never forces)
 *
 * POST: Generate signal for current market
 * GET: Get current status
 */

import { NextRequest, NextResponse } from 'next/server'

// PickMyTrade integration - ENABLED for live execution to Apex
import { PickMyTradeClient, getCurrentContractSymbol, TradeResult } from '@/lib/stuntman/pickmytrade-client'

// Initialize PickMyTrade client with environment variables
const PICKMYTRADE_TOKEN = process.env.PICKMYTRADE_TOKEN || ''
const APEX_ACCOUNT_ID = process.env.APEX_ACCOUNT_ID || 'APEX-456334'

let pickMyTradeClient: PickMyTradeClient | null = null

function getPickMyTradeClient(): PickMyTradeClient | null {
  if (!PICKMYTRADE_TOKEN) {
    console.log('[PickMyTrade] No token configured - live execution disabled')
    return null
  }

  if (!pickMyTradeClient) {
    pickMyTradeClient = new PickMyTradeClient({
      token: PICKMYTRADE_TOKEN,
      accountId: APEX_ACCOUNT_ID,
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 17,
      enabled: true
    })
    console.log(`[PickMyTrade] Client initialized for ${APEX_ACCOUNT_ID}`)
  }

  return pickMyTradeClient
}

// ============================================================================
// TYPES - EXACT SAME AS TESTED
// ============================================================================

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  hour: number
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

// ============================================================================
// CONFIG - EXACT SAME AS TESTED
// ============================================================================

const CONFIG = {
  tradingStartHour: 9.5,
  tradingEndHour: 15.5,
  maxDailyTrades: 4,
  minATR: 2,
  maxATR: 15,
  strongTrendSlope: 0.25,
  trendSlope: 0.10,
  stopMultiplier: 1.5,
  targetMultiplier: 2.0,
}

// ============================================================================
// INDICATORS - EXACT SAME AS TESTED
// ============================================================================

function calculateEMA(candles: Candle[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      ema.push(candles[i].close)
    } else if (i === period - 1) {
      const sum = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0)
      ema.push(sum / period)
    } else {
      ema.push((candles[i].close - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }
  return ema
}

function calculateRSI(candles: Candle[], period: number = 14): number[] {
  const rsi: number[] = []
  let avgGain = 0, avgLoss = 0

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      rsi.push(50)
      continue
    }

    const change = candles[i].close - candles[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i
      avgLoss = (avgLoss * (i - 1) + loss) / i
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  return rsi
}

function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atr.push(candles[i].high - candles[i].low)
      continue
    }

    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    )

    if (i < period) {
      atr.push((atr[i - 1] * i + tr) / (i + 1))
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr) / period)
    }
  }
  return atr
}

function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = []
  let cumVolume = 0
  let cumTP = 0

  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    cumVolume += candles[i].volume || 1
    cumTP += tp * (candles[i].volume || 1)
    vwap.push(cumTP / cumVolume)
  }
  return vwap
}

function calculateBB(candles: Candle[], period: number = 20): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = []
  const middle: number[] = []
  const lower: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      middle.push(candles[i].close)
      upper.push(candles[i].close)
      lower.push(candles[i].close)
    } else {
      const slice = candles.slice(i - period + 1, i + 1)
      const sma = slice.reduce((sum, c) => sum + c.close, 0) / period
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.close - sma, 2), 0) / period
      const stdDev = Math.sqrt(variance)
      middle.push(sma)
      upper.push(sma + stdDev * 2)
      lower.push(sma - stdDev * 2)
    }
  }
  return { upper, middle, lower }
}

// ============================================================================
// REGIME DETECTION - EXACT SAME AS TESTED
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

  // STRONG UPTREND
  if (ema20Slope > CONFIG.strongTrendSlope && ema50Slope > CONFIG.strongTrendSlope * 0.5 && emaAligned && rsiNow > 55) {
    return 'STRONG_UPTREND'
  }

  // UPTREND
  if (ema20Slope > CONFIG.trendSlope && emaAligned) {
    return 'UPTREND'
  }

  // STRONG DOWNTREND
  if (ema20Slope < -CONFIG.strongTrendSlope && ema50Slope < -CONFIG.strongTrendSlope * 0.5 && !emaAligned && rsiNow < 45) {
    return 'STRONG_DOWNTREND'
  }

  // DOWNTREND
  if (ema20Slope < -CONFIG.trendSlope && !emaAligned) {
    return 'DOWNTREND'
  }

  return 'SIDEWAYS'
}

// ============================================================================
// SIGNAL DETECTION - EXACT SAME AS TESTED (proven profitable patterns only)
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
  const currentATR = atr[index]

  const stopDistance = currentATR * CONFIG.stopMultiplier
  const targetDistance = currentATR * CONFIG.targetMultiplier

  // Only SHORTs in downtrends
  if (regime !== 'DOWNTREND' && regime !== 'STRONG_DOWNTREND') {
    return null
  }

  // VWAP_PULLBACK_SHORT - 57.1% win rate
  const vwapDiff = (c.close - vwap[index]) / vwap[index] * 100
  const nearVWAP = Math.abs(vwapDiff) < 0.15
  const belowVWAP = c.close < vwap[index]

  if (nearVWAP && belowVWAP && c.high >= vwap[index] * 0.998) {
    return {
      patternId: 'VWAP_PULLBACK_SHORT',
      direction: 'SHORT',
      entryPrice: c.close,
      stopLoss: c.close + stopDistance,
      takeProfit: c.close - targetDistance,
      confidence: 70,
      reason: `VWAP rejection in ${regime}`,
      regime
    }
  }

  // ORB_BREAKOUT_SHORT - 100% win rate
  if (c.hour >= 9.75 && c.hour < 11) {
    let orHigh = 0, orLow = Infinity
    const today = new Date(c.time).toDateString()

    for (let j = index - 20; j < index; j++) {
      if (j >= 0) {
        const candleDate = new Date(candles[j].time).toDateString()
        if (candleDate === today && candles[j].hour >= 9.5 && candles[j].hour < 9.75) {
          orHigh = Math.max(orHigh, candles[j].high)
          orLow = Math.min(orLow, candles[j].low)
        }
      }
    }

    if (orHigh > 0 && orLow < Infinity) {
      const orRange = orHigh - orLow
      if (orRange >= 2 && orRange <= 15 && c.close < orLow) {
        return {
          patternId: 'ORB_BREAKOUT_SHORT',
          direction: 'SHORT',
          entryPrice: c.close,
          stopLoss: Math.min(orHigh, c.close + 6),
          takeProfit: c.close - (orRange * 0.5),
          confidence: 75,
          reason: `ORB breakdown in ${regime}`,
          regime
        }
      }
    }
  }

  return null
}

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
  const currentATR = atr[index]

  const stopDistance = currentATR * CONFIG.stopMultiplier
  const targetDistance = currentATR * CONFIG.targetMultiplier

  // Only LONGs in uptrends
  if (regime !== 'UPTREND' && regime !== 'STRONG_UPTREND') {
    return null
  }

  // Require bullish candle
  if (c.close <= c.open) return null

  // RSI not overbought
  if (rsi[index] > 70) return null

  // VWAP_PULLBACK_LONG - 71.4% win rate (BEST pattern)
  const vwapDiff = (c.close - vwap[index]) / vwap[index] * 100
  const nearVWAP = Math.abs(vwapDiff) < 0.15
  const aboveVWAP = c.close > vwap[index]

  if (nearVWAP && aboveVWAP && c.low <= vwap[index] * 1.002) {
    return {
      patternId: 'VWAP_PULLBACK_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: c.close - stopDistance,
      takeProfit: c.close + targetDistance,
      confidence: 72,
      reason: `VWAP bounce in ${regime}`,
      regime
    }
  }

  // EMA20_BOUNCE_LONG - 57.1% win rate
  const touchedEMA20 = c.low <= ema20[index] * 1.002 && c.low >= ema20[index] * 0.995
  const closedAboveEMA20 = c.close > ema20[index]

  if (touchedEMA20 && closedAboveEMA20 && regime === 'STRONG_UPTREND') {
    return {
      patternId: 'EMA20_BOUNCE_LONG',
      direction: 'LONG',
      entryPrice: c.close,
      stopLoss: ema20[index] - (currentATR * 0.5),
      takeProfit: c.close + targetDistance,
      confidence: 60,
      reason: `EMA20 support in ${regime}`,
      regime
    }
  }

  return null
}

// ============================================================================
// DATA FETCHING - REAL-TIME
// ============================================================================

async function fetchRealtimeData(): Promise<Candle[]> {
  // Fetch last 100 candles (5-minute) for indicator calculation
  const now = Math.floor(Date.now() / 1000)
  const start = now - (2 * 24 * 60 * 60) // 2 days of data

  try {
    // Try ES futures first
    const sources = [
      { symbol: 'ES=F', scale: 1 },
      { symbol: 'SPY', scale: 10 }
    ]

    for (const source of sources) {
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
          const date = new Date(timestamps[i] * 1000)
          const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

          candles.push({
            time: timestamps[i] * 1000,
            open: quote.open[i] * source.scale,
            high: quote.high[i] * source.scale,
            low: quote.low[i] * source.scale,
            close: quote.close[i] * source.scale,
            volume: quote.volume[i] || 0,
            hour: estDate.getHours() + estDate.getMinutes() / 60,
          })
        }
      }

      if (candles.length > 50) return candles
    }

    throw new Error('Could not fetch real-time data')
  } catch (error) {
    throw error
  }
}

// ============================================================================
// LIVE TRADING STATE
// ============================================================================

let isEnabled = false
let currentPosition: {
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  patternId: string
} | null = null
let dailyTrades = 0
let lastTradeDate = ''
let totalPnL = 0
let tradeHistory: Array<{
  time: string
  pattern: string
  direction: string
  pnl: number
}> = []

// ============================================================================
// API HANDLERS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const candles = await fetchRealtimeData()
    const lastIndex = candles.length - 1
    const lastCandle = candles[lastIndex]

    // Calculate indicators
    const ema20 = calculateEMA(candles, 20)
    const ema50 = calculateEMA(candles, 50)
    const rsi = calculateRSI(candles, 14)
    const atr = calculateATR(candles, 14)
    const vwap = calculateVWAP(candles)
    const bb = calculateBB(candles, 20)

    // Detect current regime
    const regime = detectRegime(ema20, ema50, rsi, lastIndex)

    // Check for signal
    let signal: Signal | null = null

    if (regime === 'STRONG_UPTREND' || regime === 'UPTREND') {
      signal = detectLongSignal(candles, lastIndex, ema20, ema50, bb, vwap, atr, rsi, regime)
    } else if (regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') {
      signal = detectShortSignal(candles, lastIndex, ema20, ema50, bb, vwap, atr, regime)
    }
    // SIDEWAYS = no signal (never forces trades)

    const now = new Date()
    const estHour = parseFloat(now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false
    })) + parseFloat(now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      minute: '2-digit'
    })) / 60

    const withinTradingHours = estHour >= CONFIG.tradingStartHour && estHour <= CONFIG.tradingEndHour

    // Check PickMyTrade connection
    const pmtClient = getPickMyTradeClient()
    const pickMyTradeStatus = pmtClient ? {
      connected: true,
      token: PICKMYTRADE_TOKEN ? `${PICKMYTRADE_TOKEN.substring(0, 4)}...${PICKMYTRADE_TOKEN.slice(-4)}` : 'NOT SET',
      account: APEX_ACCOUNT_ID,
      enabled: pmtClient.isEnabled
    } : {
      connected: false,
      token: 'NOT SET',
      account: APEX_ACCOUNT_ID,
      enabled: false
    }

    return NextResponse.json({
      success: true,
      status: {
        enabled: isEnabled,
        currentPosition,
        dailyTrades,
        totalPnL: totalPnL.toFixed(2),
        tradeHistory: tradeHistory.slice(-10)
      },
      market: {
        price: lastCandle.close.toFixed(2),
        regime,
        withinTradingHours,
        estHour: estHour.toFixed(2),
        estTime: now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
        indicators: {
          ema20: ema20[lastIndex].toFixed(2),
          ema50: ema50[lastIndex].toFixed(2),
          rsi: rsi[lastIndex].toFixed(1),
          atr: atr[lastIndex].toFixed(2),
          vwap: vwap[lastIndex].toFixed(2)
        }
      },
      pickMyTrade: pickMyTradeStatus,
      signal: signal ? {
        pattern: signal.patternId,
        direction: signal.direction,
        entry: signal.entryPrice.toFixed(2),
        stop: signal.stopLoss.toFixed(2),
        target: signal.takeProfit.toFixed(2),
        confidence: signal.confidence,
        reason: signal.reason
      } : null,
      message: !withinTradingHours
        ? `Outside trading hours (9:30 AM - 3:30 PM EST) - Current: ${estHour.toFixed(2)} EST`
        : regime === 'SIDEWAYS'
          ? 'SIDEWAYS market - NO TRADE (waiting for trend)'
          : signal
            ? `${signal.patternId} signal detected`
            : `No signal in ${regime} market`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'enable') {
      isEnabled = true
      return NextResponse.json({ success: true, message: 'Live trading ENABLED' })
    }

    if (action === 'disable') {
      isEnabled = false
      return NextResponse.json({ success: true, message: 'Live trading DISABLED' })
    }

    if (action === 'execute' && isEnabled) {
      // Get current signal
      const candles = await fetchRealtimeData()
      const lastIndex = candles.length - 1

      const ema20 = calculateEMA(candles, 20)
      const ema50 = calculateEMA(candles, 50)
      const rsi = calculateRSI(candles, 14)
      const atr = calculateATR(candles, 14)
      const vwap = calculateVWAP(candles)
      const bb = calculateBB(candles, 20)

      const regime = detectRegime(ema20, ema50, rsi, lastIndex)

      let signal: Signal | null = null
      if (regime === 'STRONG_UPTREND' || regime === 'UPTREND') {
        signal = detectLongSignal(candles, lastIndex, ema20, ema50, bb, vwap, atr, rsi, regime)
      } else if (regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') {
        signal = detectShortSignal(candles, lastIndex, ema20, ema50, bb, vwap, atr, regime)
      }

      if (!signal) {
        return NextResponse.json({
          success: false,
          message: `No signal available - ${regime === 'SIDEWAYS' ? 'SIDEWAYS market, not trading' : 'waiting for setup'}`
        })
      }

      // Store the signal for execution
      currentPosition = {
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        patternId: signal.patternId
      }

      dailyTrades++

      // ============================================================================
      // EXECUTE TRADE VIA PICKMYTRADE TO APEX
      // ============================================================================
      const client = getPickMyTradeClient()
      let executionResult: TradeResult | null = null

      if (client) {
        const contractSymbol = getCurrentContractSymbol('ES')
        console.log(`[LiveAdaptive] Executing ${signal.direction} ${contractSymbol} via PickMyTrade...`)

        try {
          if (signal.direction === 'LONG') {
            executionResult = await client.buyMarket(
              contractSymbol,
              1, // Start with 1 contract for safety
              signal.stopLoss,
              signal.takeProfit
            )
          } else {
            executionResult = await client.sellMarket(
              contractSymbol,
              1, // Start with 1 contract for safety
              signal.stopLoss,
              signal.takeProfit
            )
          }

          console.log(`[LiveAdaptive] Execution result:`, executionResult)
        } catch (error) {
          console.error(`[LiveAdaptive] Execution error:`, error)
          executionResult = {
            success: false,
            message: error instanceof Error ? error.message : 'Execution failed',
            timestamp: Date.now(),
            signal: {
              action: signal.direction === 'LONG' ? 'BUY' : 'SELL',
              symbol: contractSymbol,
              quantity: 1,
              orderType: 'MKT'
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Signal generated: ${signal.direction} via ${signal.patternId}`,
        signal: {
          pattern: signal.patternId,
          direction: signal.direction,
          entry: signal.entryPrice.toFixed(2),
          stop: signal.stopLoss.toFixed(2),
          target: signal.takeProfit.toFixed(2),
          reason: signal.reason
        },
        position: currentPosition,
        execution: executionResult ? {
          success: executionResult.success,
          message: executionResult.message,
          orderId: executionResult.orderId,
          timestamp: executionResult.timestamp
        } : {
          success: false,
          message: 'PickMyTrade not configured - set PICKMYTRADE_TOKEN in environment'
        },
        pickMyTradeConnected: !!client
      })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
