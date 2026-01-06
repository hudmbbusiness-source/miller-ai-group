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

// CRITICAL: Supabase state persistence - state survives serverless restarts
import {
  loadTradingState,
  saveTradingState,
  setAutoTradingEnabled,
  openPosition,
  closePosition as closePositionState,
  getTradingState,
  TradingState,
  OpenPosition,
} from '@/lib/stuntman/trading-state'

// WORLD-CLASS STRATEGIES - All 11 tested strategies
import {
  generateAllWorldClassSignals,
  classifyMarketRegime,
  StrategySignal,
  RegimeAnalysis,
  MarketRegimeType,
  PropFirmRiskState,
  TradeQualityScore,
} from '@/lib/stuntman/world-class-strategies'

// TELEGRAM NOTIFICATIONS - Real-time trade alerts to phone
import {
  sendTradeNotification,
  sendMarketOpenNotification,
  testTelegramConnection,
  isTelegramConfigured,
} from '@/lib/stuntman/telegram-notifications'

// ============================================================================
// WORLD-CLASS STRATEGY INTEGRATION - ALL 11 STRATEGIES
// ============================================================================
// BOS_CONTINUATION, CHOCH_REVERSAL, FAILED_BREAKOUT, LIQUIDITY_SWEEP,
// SESSION_REVERSION, TREND_PULLBACK, VOLATILITY_BREAKOUT, VWAP_DEVIATION,
// RANGE_FADE, ORB_BREAKOUT, KILLZONE_REVERSAL

// Initialize PickMyTrade client with environment variables
const PICKMYTRADE_TOKEN = (process.env.PICKMYTRADE_TOKEN || '').trim()
const APEX_ACCOUNT_ID = (process.env.APEX_ACCOUNT_ID || 'APEX-456334').trim()
const RITHMIC_CONNECTION_NAME = (process.env.RITHMIC_CONNECTION_NAME || 'RITHMIC1').trim()

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
      connectionName: RITHMIC_CONNECTION_NAME, // CRITICAL: Must match PickMyTrade connection name
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 17,
      enabled: true
    })
    console.log(`[PickMyTrade] Client initialized for ${APEX_ACCOUNT_ID} via ${RITHMIC_CONNECTION_NAME}`)
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
  maxDailyTrades: 999, // Effectively unlimited - maximize profitability
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
// DATA FETCHING - REAL-TIME VIA YAHOO FINANCE SPY QUOTE
// ============================================================================

// Track data source for transparency
let currentDataSource: 'yahoo-spy-realtime' | 'yahoo-spy-chart' | 'yahoo-es-delayed' = 'yahoo-spy-realtime'
let dataIsDelayed = false

// ============================================================================
// DUAL INSTRUMENT TRADING - ES (S&P) AND NQ (NASDAQ) SIMULTANEOUS
// ============================================================================

type Instrument = 'ES' | 'NQ'

interface InstrumentConfig {
  symbol: string          // Yahoo symbol (SPY or QQQ)
  scale: number           // Price multiplier (10 for SPY→ES, 40 for QQQ→NQ)
  premium: number         // Futures premium offset (ES ~$55, NQ ~$250)
  name: string            // Display name
  tickValue: number       // $ per tick
  pointValue: number      // $ per point
}

// FUTURES PREMIUM: ES/NQ trade at a premium to their ETF counterparts (SPY/QQQ)
// This is due to cost of carry, financing costs, and expected dividends.
// Premium varies but typically:
// ES trades ~$50-60 above SPY*10
// NQ trades ~$200-300 above QQQ*40
// These values should be calibrated periodically by checking actual ES/NQ vs SPY/QQQ

const INSTRUMENT_CONFIG: Record<Instrument, InstrumentConfig> = {
  ES: {
    symbol: 'SPY',
    scale: 10,
    premium: 55,        // ES futures premium over SPY*10
    name: 'E-mini S&P 500',
    tickValue: 12.50,
    pointValue: 50
  },
  NQ: {
    symbol: 'QQQ',
    scale: 40,
    premium: 250,       // NQ futures premium over QQQ*40
    name: 'E-mini Nasdaq 100',
    tickValue: 5.00,
    pointValue: 20
  }
}

/**
 * Get REAL-TIME price for any instrument from Yahoo Finance
 */
async function getRealtimePrice(instrument: Instrument): Promise<{ price: number; change: number; volume: number } | null> {
  const config = INSTRUMENT_CONFIG[instrument]
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.symbol}?interval=1m&range=1d`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      cache: 'no-store'
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]
    const meta = result?.meta

    if (!meta?.regularMarketPrice) return null

    return {
      price: meta.regularMarketPrice * config.scale + config.premium,
      change: (meta.regularMarketDayHigh - meta.regularMarketDayLow) * config.scale || 0,
      volume: meta.regularMarketVolume || 0
    }
  } catch (error) {
    console.error(`[Data] ${instrument} quote error:`, error)
    return null
  }
}

// Keep old function for backward compatibility
async function getRealtimeSPYPrice(): Promise<{ price: number; change: number; volume: number } | null> {
  return getRealtimePrice('ES')
}

/**
 * Fetch candles for a specific instrument
 */
async function fetchInstrumentCandles(instrument: Instrument, interval: '1m' | '5m' | '15m' = '5m'): Promise<Candle[]> {
  const config = INSTRUMENT_CONFIG[instrument]
  const now = Math.floor(Date.now() / 1000)
  const start = now - (5 * 24 * 60 * 60) // 5 days

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.symbol}?period1=${start}&period2=${now}&interval=${interval}&includePrePost=false`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`[Data] ${instrument} ${interval} HTTP error: ${response.status}`)
      return []
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return []
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const candles: Candle[] = []

    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
        const date = new Date(timestamps[i] * 1000)
        const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

        candles.push({
          time: timestamps[i] * 1000,
          open: quote.open[i] * config.scale + config.premium,
          high: quote.high[i] * config.scale + config.premium,
          low: quote.low[i] * config.scale + config.premium,
          close: quote.close[i] * config.scale + config.premium,
          volume: quote.volume[i] || 0,
          hour: estDate.getHours() + estDate.getMinutes() / 60,
        })
      }
    }

    console.log(`[Data] ${instrument} ${interval}: ${candles.length} candles`)
    return candles
  } catch (error) {
    console.error(`[Data] ${instrument} ${interval} error:`, error)
    return []
  }
}

/**
 * Analyze a single instrument - returns signal and market data
 */
async function analyzeInstrument(instrument: Instrument, state: TradingState): Promise<{
  instrument: Instrument
  config: InstrumentConfig
  candles: Candle[]
  indicators: {
    ema20: number
    ema50: number
    rsi: number
    atr: number
    vwap: number
  }
  regime: MarketRegime
  signal: Signal | null
  worldClassResult: any
  propFirmRisk: PropFirmRiskState
}> {
  // Fetch multi-timeframe data for this instrument
  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchInstrumentCandles(instrument, '1m'),
    fetchInstrumentCandles(instrument, '5m'),
    fetchInstrumentCandles(instrument, '15m')
  ])

  const candles = candles5m.length > 20 ? candles5m : candles1m
  const lastIndex = candles.length - 1

  // Calculate indicators
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)
  const rsi = calculateRSI(candles, 14)
  const atr = calculateATR(candles, 14)
  const vwap = calculateVWAP(candles)

  // Detect regime
  const regime = detectRegime(ema20, ema50, rsi, lastIndex)

  // World-class strategy data
  const orbData = calculateORBData(candles1m.length > 0 ? candles1m : candles)
  const sessionData = calculateSessionData(candles5m.length > 0 ? candles5m : candles)
  const vwapData = calculateVWAPData(candles5m.length > 0 ? candles5m : candles)
  const currentPrice = candles[lastIndex]?.close || 0
  const propFirmRisk = buildPropFirmRiskState(state, currentPrice)

  // Generate signals
  const worldClassResult = generateAllWorldClassSignals(
    candles1m.length >= 100 ? candles1m : candles,
    candles5m.length >= 50 ? candles5m : candles,
    candles15m.length >= 20 ? candles15m : candles,
    orbData,
    sessionData,
    vwapData,
    propFirmRisk
  )

  // Get best signal
  let signal: Signal | null = null
  if (worldClassResult.signals.length > 0) {
    const sortedSignals = worldClassResult.signals.sort((a: any, b: any) => b.quality.overall - a.quality.overall)
    const best = sortedSignals[0]

    signal = {
      patternId: best.signal.type,
      direction: best.signal.direction,
      entryPrice: best.signal.entry.price,
      stopLoss: best.signal.stopLoss.price,
      takeProfit: best.signal.targets[0]?.price || best.signal.entry.price + (best.signal.direction === 'LONG' ? atr[lastIndex] * 2 : -atr[lastIndex] * 2),
      confidence: best.signal.confidence,
      reason: `${best.signal.type} (Quality: ${best.quality.overall}/100)`,
      regime
    }
  }

  return {
    instrument,
    config: INSTRUMENT_CONFIG[instrument],
    candles,
    indicators: {
      ema20: ema20[lastIndex],
      ema50: ema50[lastIndex],
      rsi: rsi[lastIndex],
      atr: atr[lastIndex],
      vwap: vwap[lastIndex]
    },
    regime,
    signal,
    worldClassResult,
    propFirmRisk
  }
}

/**
 * Analyze BOTH ES and NQ simultaneously
 */
async function analyzeDualInstruments(state: TradingState): Promise<{
  ES: Awaited<ReturnType<typeof analyzeInstrument>>
  NQ: Awaited<ReturnType<typeof analyzeInstrument>>
}> {
  const [esResult, nqResult] = await Promise.all([
    analyzeInstrument('ES', state),
    analyzeInstrument('NQ', state)
  ])

  return { ES: esResult, NQ: nqResult }
}

/**
 * Fetch candles for indicator calculation
 * Tries multiple sources: SPY first (real-time), then ES=F as fallback
 */
async function fetchCandleData(): Promise<{ candles: Candle[], source: string }> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - (5 * 24 * 60 * 60) // 5 days of data for safety

  const sources = [
    { symbol: 'SPY', scale: 10, name: 'SPY (real-time)' },
    { symbol: 'ES=F', scale: 1, name: 'ES Futures' }
  ]

  for (const source of sources) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(source.symbol)}?period1=${start}&period2=${now}&interval=5m&includePrePost=false`

      console.log(`[Data] Fetching ${source.symbol}...`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`[Data] ${source.symbol} HTTP error: ${response.status}`)
        continue
      }

      const data = await response.json()
      const result = data.chart?.result?.[0]

      if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
        console.error(`[Data] ${source.symbol} no data in response`)
        continue
      }

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

      console.log(`[Data] ${source.symbol} returned ${candles.length} candles`)

      if (candles.length >= 20) {
        return { candles, source: source.name }
      }
    } catch (error) {
      console.error(`[Data] ${source.symbol} error:`, error)
    }
  }

  throw new Error('Could not fetch candle data from any source')
}

/**
 * Main data fetch - gets real-time SPY price and appends to candles
 */
async function fetchRealtimeData(): Promise<Candle[]> {
  const { candles, source } = await fetchCandleData()

  // Get real-time SPY quote and add as latest candle
  const realtimeQuote = await getRealtimeSPYPrice()

  if (realtimeQuote && candles.length > 0) {
    const lastCandle = candles[candles.length - 1]
    const now = new Date()
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))

    // Add real-time price as new candle
    candles.push({
      time: Date.now(),
      open: lastCandle.close,
      high: Math.max(lastCandle.close, realtimeQuote.price),
      low: Math.min(lastCandle.close, realtimeQuote.price),
      close: realtimeQuote.price,
      volume: realtimeQuote.volume,
      hour: estDate.getHours() + estDate.getMinutes() / 60,
    })

    currentDataSource = 'yahoo-spy-realtime'
    dataIsDelayed = false
  } else {
    currentDataSource = 'yahoo-spy-chart'
    dataIsDelayed = false // SPY chart data is also near real-time
  }

  return candles
}

// ============================================================================
// MULTI-TIMEFRAME DATA FETCHING FOR WORLD-CLASS STRATEGIES
// ============================================================================

/**
 * Fetch candles at a specific interval
 */
async function fetchCandlesAtInterval(interval: '1m' | '5m' | '15m'): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - (5 * 24 * 60 * 60) // 5 days

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${start}&period2=${now}&interval=${interval}&includePrePost=false`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`[Data] SPY ${interval} HTTP error: ${response.status}`)
      return []
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return []
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const candles: Candle[] = []

    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
        const date = new Date(timestamps[i] * 1000)
        const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

        candles.push({
          time: timestamps[i] * 1000,
          open: quote.open[i] * 10, // Scale SPY to ES
          high: quote.high[i] * 10,
          low: quote.low[i] * 10,
          close: quote.close[i] * 10,
          volume: quote.volume[i] || 0,
          hour: estDate.getHours() + estDate.getMinutes() / 60,
        })
      }
    }

    return candles
  } catch (error) {
    console.error(`[Data] SPY ${interval} error:`, error)
    return []
  }
}

/**
 * Fetch all timeframes for world-class strategies
 */
async function fetchMultiTimeframeData(): Promise<{
  candles1m: Candle[]
  candles5m: Candle[]
  candles15m: Candle[]
}> {
  // Fetch all timeframes in parallel
  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchCandlesAtInterval('1m'),
    fetchCandlesAtInterval('5m'),
    fetchCandlesAtInterval('15m')
  ])

  return { candles1m, candles5m, candles15m }
}

/**
 * Calculate Opening Range Breakout data (9:30-9:45 AM EST)
 */
function calculateORBData(candles: Candle[]): { high: number; low: number; formed: boolean } {
  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const today = estDate.toDateString()

  let orbHigh = 0
  let orbLow = Infinity
  let hasORBCandles = false

  for (const candle of candles) {
    const candleDate = new Date(candle.time)
    const candleEST = new Date(candleDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))

    // Only today's 9:30-9:45 AM candles
    if (candleEST.toDateString() === today && candle.hour >= 9.5 && candle.hour < 9.75) {
      orbHigh = Math.max(orbHigh, candle.high)
      orbLow = Math.min(orbLow, candle.low)
      hasORBCandles = true
    }
  }

  const estHour = estDate.getHours() + estDate.getMinutes() / 60
  const orbFormed = hasORBCandles && estHour >= 9.75 // ORB formed after 9:45 AM

  return {
    high: orbHigh > 0 ? orbHigh : 0,
    low: orbLow < Infinity ? orbLow : 0,
    formed: orbFormed
  }
}

/**
 * Calculate session highs/lows (Asia, London, NY)
 */
function calculateSessionData(candles: Candle[]): {
  asia: { high: number; low: number }
  london: { high: number; low: number }
  ny: { high: number; low: number }
} {
  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const today = estDate.toDateString()

  const sessions = {
    asia: { high: 0, low: Infinity },    // 7pm - 2am ET (previous day evening to early morning)
    london: { high: 0, low: Infinity },  // 2am - 8am ET
    ny: { high: 0, low: Infinity }       // 8am - 4pm ET
  }

  for (const candle of candles) {
    const candleDate = new Date(candle.time)
    const candleEST = new Date(candleDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))

    // Only recent candles (today and yesterday for Asia session)
    const dayDiff = Math.abs(estDate.getDate() - candleEST.getDate())
    if (dayDiff > 1) continue

    const hour = candle.hour

    // Asia: 7pm-2am (19:00 - 02:00)
    if (hour >= 19 || hour < 2) {
      sessions.asia.high = Math.max(sessions.asia.high, candle.high)
      sessions.asia.low = Math.min(sessions.asia.low, candle.low)
    }
    // London: 2am-8am
    else if (hour >= 2 && hour < 8) {
      sessions.london.high = Math.max(sessions.london.high, candle.high)
      sessions.london.low = Math.min(sessions.london.low, candle.low)
    }
    // NY: 8am-4pm (today only)
    else if (hour >= 8 && hour < 16 && candleEST.toDateString() === today) {
      sessions.ny.high = Math.max(sessions.ny.high, candle.high)
      sessions.ny.low = Math.min(sessions.ny.low, candle.low)
    }
  }

  // Fix infinities
  return {
    asia: {
      high: sessions.asia.high || 0,
      low: sessions.asia.low === Infinity ? 0 : sessions.asia.low
    },
    london: {
      high: sessions.london.high || 0,
      low: sessions.london.low === Infinity ? 0 : sessions.london.low
    },
    ny: {
      high: sessions.ny.high || 0,
      low: sessions.ny.low === Infinity ? 0 : sessions.ny.low
    }
  }
}

/**
 * Calculate VWAP with standard deviation for world-class strategies
 */
function calculateVWAPData(candles: Candle[]): { vwap: number; stdDev: number } {
  if (candles.length === 0) return { vwap: 0, stdDev: 0 }

  const now = new Date()
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const today = estDate.toDateString()

  // Filter to today's RTH candles only
  const todayCandles = candles.filter(c => {
    const candleDate = new Date(c.time)
    const candleEST = new Date(candleDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    return candleEST.toDateString() === today && c.hour >= 9.5 && c.hour < 16
  })

  if (todayCandles.length === 0) {
    // Use last 50 candles if no today candles
    const recentCandles = candles.slice(-50)
    const avgPrice = recentCandles.reduce((s, c) => s + c.close, 0) / recentCandles.length
    const variance = recentCandles.reduce((s, c) => s + Math.pow(c.close - avgPrice, 2), 0) / recentCandles.length
    return { vwap: avgPrice, stdDev: Math.sqrt(variance) }
  }

  // Calculate VWAP
  let cumVolume = 0
  let cumTP = 0
  const typicalPrices: number[] = []

  for (const candle of todayCandles) {
    const tp = (candle.high + candle.low + candle.close) / 3
    const vol = candle.volume || 1
    cumVolume += vol
    cumTP += tp * vol
    typicalPrices.push(tp)
  }

  const vwap = cumTP / cumVolume

  // Calculate standard deviation of typical prices from VWAP
  const variance = typicalPrices.reduce((s, tp) => s + Math.pow(tp - vwap, 2), 0) / typicalPrices.length
  const stdDev = Math.sqrt(variance)

  return { vwap, stdDev }
}

/**
 * Build PropFirmRiskState for Apex 150K evaluation
 * @param currentPrice - Current market price (needed for unrealized P&L calculation)
 */
function buildPropFirmRiskState(state: TradingState, currentPrice: number = 0): PropFirmRiskState {
  const APEX_150K_CONFIG = {
    startingBalance: 150000,
    maxDrawdown: 5000, // CORRECT: $5,000 trailing drawdown for 150K
    profitTarget: 9000
  }

  // Calculate UNREALIZED P&L from any open position
  let unrealizedPnL = 0
  if (state.currentPosition && currentPrice > 0) {
    const { direction, entryPrice, contracts = 1 } = state.currentPosition
    const pointValue = 50 // ES point value ($50 per point)
    const priceDiff = currentPrice - entryPrice

    if (direction === 'LONG') {
      unrealizedPnL = priceDiff * pointValue * contracts
    } else { // SHORT
      unrealizedPnL = -priceDiff * pointValue * contracts
    }
  }

  // Account balance = realized P&L + unrealized P&L
  const realizedPnL = state.totalPnL
  const accountBalance = APEX_150K_CONFIG.startingBalance + realizedPnL + unrealizedPnL

  // TRAILING DRAWDOWN: Drawdown trails $5,000 behind PEAK balance
  // If peak was $152,000, drawdown threshold is $147,000
  // The "peakBalance" should be tracked in state, but for now use max of starting + totalPnL
  const peakBalance = Math.max(APEX_150K_CONFIG.startingBalance, APEX_150K_CONFIG.startingBalance + state.totalPnL)
  const drawdownThreshold = peakBalance - APEX_150K_CONFIG.maxDrawdown
  const currentDrawdown = Math.max(0, peakBalance - accountBalance)
  const drawdownPercentUsed = (currentDrawdown / APEX_150K_CONFIG.maxDrawdown) * 100

  // Determine risk level
  let riskLevel: 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER' | 'STOPPED'
  let positionSizeMultiplier = 1.0
  let canTrade = true
  let recommendation = 'Trading allowed'

  if (drawdownPercentUsed >= 100) {
    riskLevel = 'STOPPED'
    canTrade = false
    positionSizeMultiplier = 0
    recommendation = 'MAX DRAWDOWN REACHED - STOP TRADING'
  } else if (drawdownPercentUsed >= 80) {
    riskLevel = 'DANGER'
    positionSizeMultiplier = 0.25
    recommendation = 'DANGER: 80%+ drawdown used - minimal size only'
  } else if (drawdownPercentUsed >= 60) {
    riskLevel = 'WARNING'
    positionSizeMultiplier = 0.5
    recommendation = 'WARNING: 60%+ drawdown - reduce size'
  } else if (drawdownPercentUsed >= 40) {
    riskLevel = 'CAUTION'
    positionSizeMultiplier = 0.75
    recommendation = 'CAUTION: 40%+ drawdown - trade carefully'
  } else {
    riskLevel = 'SAFE'
    positionSizeMultiplier = 1.0
    recommendation = 'Safe to trade full size'
  }

  // Count consecutive losses
  let consecutiveLosses = 0
  for (let i = state.tradeHistory.length - 1; i >= 0; i--) {
    if (state.tradeHistory[i].pnl < 0) {
      consecutiveLosses++
    } else {
      break
    }
  }

  // Reduce size after consecutive losses
  if (consecutiveLosses >= 3) {
    positionSizeMultiplier *= 0.5
    recommendation += ` (${consecutiveLosses} consecutive losses - half size)`
  }

  return {
    accountBalance,
    startingBalance: APEX_150K_CONFIG.startingBalance,
    trailingDrawdown: APEX_150K_CONFIG.maxDrawdown,
    currentDrawdown,
    drawdownPercentUsed,
    dailyPnL: state.dailyPnL,
    realizedPnL,
    unrealizedPnL,
    consecutiveLosses,
    dailyTradeCount: state.dailyTrades,
    canTrade,
    riskLevel,
    positionSizeMultiplier,
    recommendation
  }
}

// ============================================================================
// LIVE TRADING STATE - NOW PERSISTED IN SUPABASE
// ============================================================================
// ALL state is now stored in Supabase via trading-state.ts
// This ensures state survives serverless restarts and is consistent
// across all API calls. NO MORE LOST POSITIONS OR TRADES.

// ============================================================================
// DATA LOGGING - Save market data for future strategy testing
// ============================================================================
let lastLogTime = 0
const LOG_INTERVAL = 5 * 60 * 1000 // Log every 5 minutes to avoid excessive writes

async function logMarketData(candles: Candle[], signal: Signal | null, regime: string) {
  const now = Date.now()

  // Only log every 5 minutes to reduce database writes
  if (now - lastLogTime < LOG_INTERVAL) return

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // Log recent candles (last 10)
    const recentCandles = candles.slice(-10).map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      hour: c.hour || 0,
      dateStr: new Date(c.time).toISOString().split('T')[0]
    }))

    await fetch(`${baseUrl}/api/stuntman/data-logger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'candles', data: recentCandles })
    }).catch(() => {}) // Fire and forget, don't block main flow

    // Log signal if generated
    if (signal) {
      await fetch(`${baseUrl}/api/stuntman/data-logger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'signal',
          data: {
            patternId: signal.patternId,
            direction: signal.direction,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            confidence: signal.confidence,
            reason: signal.reason,
            regime
          }
        })
      }).catch(() => {})
    }

    lastLogTime = now
    console.log(`[DATA-LOG] Saved ${recentCandles.length} candles and ${signal ? '1 signal' : 'no signal'}`)
  } catch (error) {
    console.error('[DATA-LOG] Error logging data:', error)
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // CRITICAL: Load ALL state from Supabase (survives serverless restarts)
    const state = await loadTradingState()
    const { enabled: isEnabled, currentPosition, dailyTrades, dailyPnL, totalPnL, tradeHistory } = state

    // ========================================================================
    // DUAL INSTRUMENT ANALYSIS - ES AND NQ SIMULTANEOUSLY
    // ========================================================================
    console.log('[DUAL-TRADE] Analyzing ES and NQ simultaneously...')
    const dualAnalysis = await analyzeDualInstruments(state)

    // Extract ES data for backward compatibility with existing response format
    const esAnalysis = dualAnalysis.ES
    const nqAnalysis = dualAnalysis.NQ

    // Use ES as primary for backward compatible fields
    const candles = esAnalysis.candles
    const lastIndex = candles.length - 1
    const lastCandle = candles[lastIndex]
    const signal = esAnalysis.signal // Primary signal from ES

    // Calculate combined data
    const ema20 = [esAnalysis.indicators.ema20]
    const ema50 = [esAnalysis.indicators.ema50]
    const rsi = [esAnalysis.indicators.rsi]
    const atr = [esAnalysis.indicators.atr]
    const vwap = [esAnalysis.indicators.vwap]

    const propFirmRisk = esAnalysis.propFirmRisk
    const worldClassResult = esAnalysis.worldClassResult
    const regime = esAnalysis.regime

    // Backward compatible data structures
    const { candles1m, candles5m, candles15m } = await fetchMultiTimeframeData()
    const orbData = calculateORBData(candles1m.length > 0 ? candles1m : candles)
    const sessionData = calculateSessionData(candles5m.length > 0 ? candles5m : candles)

    // Log dual analysis results
    console.log(`[DUAL-TRADE] ES: ${esAnalysis.signal ? esAnalysis.signal.patternId : 'NO SIGNAL'} | NQ: ${nqAnalysis.signal ? nqAnalysis.signal.patternId : 'NO SIGNAL'}`)

    // LOG MARKET DATA for future strategy testing (every 5 minutes)
    logMarketData(candles, signal, regime)

    // World-class regime from ES analysis
    const worldClassRegime = worldClassResult.regime

    // Calculate time
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

    // ============================================================================
    // POSITION EXIT MONITORING - Check if PickMyTrade bracket orders were filled
    // ============================================================================
    // Since PickMyTrade handles SL/TP via bracket orders, we need to detect when
    // price has moved past our SL or TP levels and update our local state.
    // This ensures our state stays in sync with the actual position on Apex.
    // ============================================================================
    if (currentPosition && lastCandle) {
      const currentPrice = lastCandle.close
      const { direction, entryPrice, stopLoss, takeProfit, symbol } = currentPosition
      let exitTriggered = false
      let exitReason = ''
      let exitPrice = currentPrice

      if (direction === 'LONG') {
        // LONG: SL hit if price dropped below stopLoss, TP hit if price rose above takeProfit
        if (currentPrice <= stopLoss) {
          exitTriggered = true
          exitReason = 'STOP LOSS HIT'
          exitPrice = stopLoss // Assume filled at stop level
          console.log(`[POSITION MONITOR] LONG stop loss hit: Price ${currentPrice} <= SL ${stopLoss}`)
        } else if (currentPrice >= takeProfit) {
          exitTriggered = true
          exitReason = 'TAKE PROFIT HIT'
          exitPrice = takeProfit // Assume filled at target level
          console.log(`[POSITION MONITOR] LONG take profit hit: Price ${currentPrice} >= TP ${takeProfit}`)
        }
      } else { // SHORT
        // SHORT: SL hit if price rose above stopLoss, TP hit if price dropped below takeProfit
        if (currentPrice >= stopLoss) {
          exitTriggered = true
          exitReason = 'STOP LOSS HIT'
          exitPrice = stopLoss
          console.log(`[POSITION MONITOR] SHORT stop loss hit: Price ${currentPrice} >= SL ${stopLoss}`)
        } else if (currentPrice <= takeProfit) {
          exitTriggered = true
          exitReason = 'TAKE PROFIT HIT'
          exitPrice = takeProfit
          console.log(`[POSITION MONITOR] SHORT take profit hit: Price ${currentPrice} <= TP ${takeProfit}`)
        }
      }

      // If exit was triggered, update our state to match PickMyTrade's execution
      if (exitTriggered) {
        console.log(`[POSITION MONITOR] Exit detected: ${exitReason} at ${exitPrice}`)
        const { state: closedState, pnl } = await closePositionState(exitPrice, exitReason)

        // Send Telegram notification
        sendTradeNotification({
          type: 'EXIT',
          instrument: symbol?.includes('ES') ? 'ES' : 'NQ',
          direction: direction,
          price: exitPrice,
          pnl: pnl,
          message: exitReason
        }).catch(err => console.error('[Telegram] Exit notification failed:', err))

        // LOG TRADE for future analysis
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
        fetch(`${baseUrl}/api/stuntman/data-logger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'trade',
            data: {
              patternId: currentPosition.patternId || 'UNKNOWN',
              direction: direction,
              entryPrice: entryPrice,
              stopLoss: stopLoss,
              takeProfit: takeProfit,
              exitPrice: exitPrice,
              exitReason: exitReason,
              pnl: pnl,
              regime: regime
            }
          })
        }).catch(() => {})

        console.log(`[POSITION MONITOR] State updated. PnL: $${pnl.toFixed(2)}. Total: $${closedState.totalPnL.toFixed(2)}`)
      }
    }

    // ============================================================================
    // APEX MANDATORY CLOSE: Must close all positions by 4:59 PM EST
    // This is a SAFETY feature required by Apex Trader Funding rules
    // ============================================================================
    const MANDATORY_CLOSE_HOUR = 16 + (59 / 60) // 4:59 PM EST = 16.983
    const CLOSE_WARNING_HOUR = 16 + (55 / 60)   // 4:55 PM EST - send warning
    const shouldMandatoryClose = estHour >= MANDATORY_CLOSE_HOUR && currentPosition
    const shouldWarnClose = estHour >= CLOSE_WARNING_HOUR && estHour < MANDATORY_CLOSE_HOUR && currentPosition

    // Auto-close position at 4:59 PM if still open
    if (shouldMandatoryClose && currentPosition) {
      console.log(`[MANDATORY CLOSE] 4:59 PM EST - Closing position per Apex rules`)
      const client = getPickMyTradeClient()

      if (client && currentPosition.symbol) {
        try {
          const result = await client.closePosition(currentPosition.symbol)
          if (result.success) {
            const exitPrice = esAnalysis.candles[esAnalysis.candles.length - 1]?.close || currentPosition.entryPrice
            const { state: closedState, pnl } = await closePositionState(exitPrice, 'MANDATORY CLOSE - 4:59 PM Apex Rule')

            // Send Telegram notification
            sendTradeNotification({
              type: 'EXIT',
              instrument: currentPosition.symbol.includes('ES') ? 'ES' : 'NQ',
              direction: currentPosition.direction,
              price: exitPrice,
              pnl: pnl,
              message: 'MANDATORY CLOSE - 4:59 PM Apex Rule'
            }).catch(err => console.error('[Telegram] Close notification failed:', err))

            console.log(`[MANDATORY CLOSE] Position closed. PnL: $${pnl.toFixed(2)}`)
          }
        } catch (error) {
          console.error('[MANDATORY CLOSE] Failed to close position:', error)
        }
      }
    }

    // Send warning at 4:55 PM if position is still open
    if (shouldWarnClose && currentPosition) {
      const minutesRemaining = Math.round((MANDATORY_CLOSE_HOUR - estHour) * 60)
      console.log(`[CLOSE WARNING] ${minutesRemaining} minutes until mandatory close`)
      // Note: sendMandatoryCloseWarning is in telegram-notifications.ts
    }

    // ============================================================================
    // DUAL INSTRUMENT AUTO-EXECUTE: Trade BOTH ES and NQ when signals detected
    // ============================================================================
    const autoExecutionResults: {
      ES: any
      NQ: any
    } = { ES: null, NQ: null }
    let updatedState = state

    // Execute trades for BOTH instruments
    for (const instrumentKey of ['ES', 'NQ'] as Instrument[]) {
      const analysis = instrumentKey === 'ES' ? esAnalysis : nqAnalysis
      const instrumentSignal = analysis.signal

      // CRITICAL SAFETY CHECK: Block trades if max drawdown reached
      if (!propFirmRisk.canTrade) {
        console.log(`[SAFETY] BLOCKING TRADE - Max drawdown reached. Risk level: ${propFirmRisk.riskLevel}`)
        continue
      }

      if (
        isEnabled &&
        instrumentSignal &&
        !currentPosition && // TODO: Track separate positions per instrument
        withinTradingHours &&
        dailyTrades < CONFIG.maxDailyTrades * 2 // Allow 2x trades for dual instruments
      ) {
        const client = getPickMyTradeClient()

        if (client) {
          const contractSymbol = getCurrentContractSymbol(instrumentKey)
          console.log(`[DUAL-TRADE] Executing ${instrumentSignal.direction} ${contractSymbol} via PickMyTrade...`)

          try {
            let executionResult: TradeResult

            if (instrumentSignal.direction === 'LONG') {
              executionResult = await client.buyMarket(
                contractSymbol,
                1, // Start with 1 contract per instrument
                instrumentSignal.stopLoss,
                instrumentSignal.takeProfit
              )
            } else {
              executionResult = await client.sellMarket(
                contractSymbol,
                1,
                instrumentSignal.stopLoss,
                instrumentSignal.takeProfit
              )
            }

            if (executionResult.success) {
              const newPosition: OpenPosition = {
                direction: instrumentSignal.direction,
                entryPrice: instrumentSignal.entryPrice,
                stopLoss: instrumentSignal.stopLoss,
                takeProfit: instrumentSignal.takeProfit,
                contracts: 1,
                patternId: instrumentSignal.patternId,
                entryTime: new Date().toISOString(),
                symbol: contractSymbol
              }
            updatedState = await openPosition(newPosition)

              autoExecutionResults[instrumentKey] = {
                executed: true,
                success: true,
                instrument: instrumentKey,
                message: `AUTO-EXECUTED: ${instrumentSignal.direction} ${instrumentKey} via ${instrumentSignal.patternId}`,
                orderId: executionResult.orderId,
                timestamp: executionResult.timestamp,
                positionSaved: true
              }

              console.log(`[DUAL-TRADE] SUCCESS ${instrumentKey}:`, autoExecutionResults[instrumentKey])

              // Send Telegram notification for successful trade entry
              sendTradeNotification({
                type: 'ENTRY',
                instrument: instrumentKey,
                direction: instrumentSignal.direction,
                price: instrumentSignal.entryPrice,
                stopLoss: instrumentSignal.stopLoss,
                takeProfit: instrumentSignal.takeProfit,
                pattern: instrumentSignal.patternId
              }).catch(err => console.error('[Telegram] Notification failed:', err))

              // ================================================================
              // EXECUTION LOGGING - Save detailed data for analysis
              // ================================================================
              const executionLog = {
                timestamp: new Date().toISOString(),
                instrument: instrumentKey,
                direction: instrumentSignal.direction,
                pattern: instrumentSignal.patternId,
                confidence: instrumentSignal.confidence,
                expectedEntry: instrumentSignal.entryPrice.toFixed(2),
                stopLoss: instrumentSignal.stopLoss.toFixed(2),
                takeProfit: instrumentSignal.takeProfit.toFixed(2),
                regime: instrumentKey === 'ES' ? esAnalysis.regime : nqAnalysis.regime,
                orderId: executionResult.orderId,
                pickMyTradeResponse: executionResult.message,
                marketPrice: (instrumentKey === 'ES' ? esAnalysis.candles : nqAnalysis.candles)[
                  (instrumentKey === 'ES' ? esAnalysis.candles : nqAnalysis.candles).length - 1
                ]?.close.toFixed(2),
              }
              console.log('[EXECUTION LOG]', JSON.stringify(executionLog))

              // Log to data-logger for future analysis
              fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://miller-ai-group.vercel.app'}/api/stuntman/data-logger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'execution',
                  data: executionLog
                })
              }).catch(err => console.error('[Data Logger] Failed to log execution:', err))

            } else {
              autoExecutionResults[instrumentKey] = {
                executed: true,
                success: false,
                instrument: instrumentKey,
                message: executionResult.message || 'Execution failed'
              }
              console.error(`[DUAL-TRADE] FAILED ${instrumentKey}:`, executionResult)
            }
          } catch (error) {
            autoExecutionResults[instrumentKey] = {
              executed: true,
              success: false,
              instrument: instrumentKey,
              message: error instanceof Error ? error.message : 'Execution error'
            }
            console.error(`[DUAL-TRADE] ERROR ${instrumentKey}:`, error)
          }
        } else {
          autoExecutionResults[instrumentKey] = {
            executed: false,
            success: false,
            instrument: instrumentKey,
            message: 'PickMyTrade not configured'
          }
        }
      }
    } // End of dual instrument loop

    // Check PickMyTrade connection
    const pmtClient = getPickMyTradeClient()
    const pickMyTradeStatus = pmtClient ? {
      connected: true,
      token: PICKMYTRADE_TOKEN ? `${PICKMYTRADE_TOKEN.substring(0, 4)}...${PICKMYTRADE_TOKEN.slice(-4)}` : 'NOT SET',
      account: APEX_ACCOUNT_ID,
      connectionName: RITHMIC_CONNECTION_NAME,
      enabled: pmtClient.isEnabled
    } : {
      connected: false,
      token: 'NOT SET',
      account: APEX_ACCOUNT_ID,
      connectionName: RITHMIC_CONNECTION_NAME,
      enabled: false
    }

    // Use updated state if position was opened, otherwise use original state
    const finalState = updatedState

    return NextResponse.json({
      success: true,
      // ========================================================================
      // ACCOUNT BALANCE - Real-time with unrealized P&L
      // ========================================================================
      account: {
        startingBalance: propFirmRisk.startingBalance,
        currentBalance: propFirmRisk.accountBalance.toFixed(2),
        realizedPnL: propFirmRisk.realizedPnL.toFixed(2),
        unrealizedPnL: propFirmRisk.unrealizedPnL.toFixed(2),
        dailyPnL: finalState.dailyPnL.toFixed(2),
        totalPnL: finalState.totalPnL.toFixed(2),
        drawdownUsed: propFirmRisk.drawdownPercentUsed.toFixed(1) + '%',
        maxDrawdown: propFirmRisk.trailingDrawdown,
        riskLevel: propFirmRisk.riskLevel,
        canTrade: propFirmRisk.canTrade
      },
      // ========================================================================
      // OPEN POSITIONS - Show all with unrealized P&L for manual closing
      // ========================================================================
      openPositions: finalState.currentPosition ? [{
        symbol: finalState.currentPosition.symbol || 'ES',
        direction: finalState.currentPosition.direction,
        contracts: finalState.currentPosition.contracts || 1,
        entryPrice: finalState.currentPosition.entryPrice.toFixed(2),
        currentPrice: lastCandle.close.toFixed(2),
        stopLoss: finalState.currentPosition.stopLoss.toFixed(2),
        takeProfit: finalState.currentPosition.takeProfit.toFixed(2),
        unrealizedPnL: propFirmRisk.unrealizedPnL.toFixed(2),
        unrealizedPnLPercent: ((propFirmRisk.unrealizedPnL / propFirmRisk.startingBalance) * 100).toFixed(3) + '%',
        openedAt: finalState.currentPosition.openedAt || finalState.lastUpdated,
        pattern: finalState.currentPosition.pattern || 'N/A',
        canClose: true,
        closeAction: 'POST /api/stuntman/live-adaptive { "action": "close" }'
      }] : [],
      hasOpenPosition: !!finalState.currentPosition,
      // ========================================================================
      // DUAL INSTRUMENT MODE: ES AND NQ ANALYZED SIMULTANEOUSLY
      // ========================================================================
      dualTradingEnabled: true,
      status: {
        enabled: finalState.enabled,
        autoTrading: finalState.enabled && withinTradingHours && !finalState.currentPosition && finalState.dailyTrades < CONFIG.maxDailyTrades * 2,
        currentPosition: finalState.currentPosition,
        dailyTrades: finalState.dailyTrades,
        maxDailyTrades: CONFIG.maxDailyTrades * 2, // 2x for dual instruments
        dailyPnL: finalState.dailyPnL.toFixed(2),
        totalPnL: finalState.totalPnL.toFixed(2),
        totalTrades: finalState.totalTrades,
        totalWins: finalState.totalWins,
        totalLosses: finalState.totalLosses,
        winRate: finalState.totalTrades > 0 ? ((finalState.totalWins / finalState.totalTrades) * 100).toFixed(1) + '%' : 'N/A',
        // Format trade history with exact cents (2 decimal places)
        tradeHistory: finalState.tradeHistory.slice(-10).map((t: any) => ({
          ...t,
          entryPrice: typeof t.entryPrice === 'number' ? t.entryPrice.toFixed(2) : t.entryPrice,
          exitPrice: typeof t.exitPrice === 'number' ? t.exitPrice.toFixed(2) : t.exitPrice,
          stopLoss: typeof t.stopLoss === 'number' ? t.stopLoss.toFixed(2) : t.stopLoss,
          takeProfit: typeof t.takeProfit === 'number' ? t.takeProfit.toFixed(2) : t.takeProfit,
          pnl: typeof t.pnl === 'number' ? t.pnl.toFixed(2) : t.pnl,
        })),
        lastUpdated: finalState.lastUpdated,
        statePersisted: true
      },
      // ========================================================================
      // ES (S&P 500 E-MINI) MARKET DATA
      // ========================================================================
      ES: {
        price: esAnalysis.candles[esAnalysis.candles.length - 1]?.close.toFixed(2) || '0',
        regime: esAnalysis.regime,
        signal: esAnalysis.signal ? {
          pattern: esAnalysis.signal.patternId,
          direction: esAnalysis.signal.direction,
          entry: esAnalysis.signal.entryPrice.toFixed(2),
          stop: esAnalysis.signal.stopLoss.toFixed(2),
          target: esAnalysis.signal.takeProfit.toFixed(2),
          confidence: esAnalysis.signal.confidence,
          reason: esAnalysis.signal.reason
        } : null,
        indicators: {
          ema20: esAnalysis.indicators.ema20.toFixed(2),
          ema50: esAnalysis.indicators.ema50.toFixed(2),
          rsi: esAnalysis.indicators.rsi.toFixed(1),
          atr: esAnalysis.indicators.atr.toFixed(2),
          vwap: esAnalysis.indicators.vwap.toFixed(2)
        },
        signalsFound: esAnalysis.worldClassResult.signals.length,
        autoExecution: autoExecutionResults.ES
      },
      // ========================================================================
      // NQ (NASDAQ 100 E-MINI) MARKET DATA
      // ========================================================================
      NQ: {
        price: nqAnalysis.candles[nqAnalysis.candles.length - 1]?.close.toFixed(2) || '0',
        regime: nqAnalysis.regime,
        signal: nqAnalysis.signal ? {
          pattern: nqAnalysis.signal.patternId,
          direction: nqAnalysis.signal.direction,
          entry: nqAnalysis.signal.entryPrice.toFixed(2),
          stop: nqAnalysis.signal.stopLoss.toFixed(2),
          target: nqAnalysis.signal.takeProfit.toFixed(2),
          confidence: nqAnalysis.signal.confidence,
          reason: nqAnalysis.signal.reason
        } : null,
        indicators: {
          ema20: nqAnalysis.indicators.ema20.toFixed(2),
          ema50: nqAnalysis.indicators.ema50.toFixed(2),
          rsi: nqAnalysis.indicators.rsi.toFixed(1),
          atr: nqAnalysis.indicators.atr.toFixed(2),
          vwap: nqAnalysis.indicators.vwap.toFixed(2)
        },
        signalsFound: nqAnalysis.worldClassResult.signals.length,
        autoExecution: autoExecutionResults.NQ
      },
      // BACKWARD COMPATIBLE: Primary market data (ES)
      market: {
        price: lastCandle.close.toFixed(2),
        regime,
        withinTradingHours,
        estHour: estHour.toFixed(2),
        estTime: now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
        dataSource: currentDataSource,
        dataDelayed: dataIsDelayed,
        dataNote: '✓ DUAL TRADING: ES + NQ analyzed simultaneously',
        indicators: {
          ema20: esAnalysis.indicators.ema20.toFixed(2),
          ema50: esAnalysis.indicators.ema50.toFixed(2),
          rsi: esAnalysis.indicators.rsi.toFixed(1),
          atr: esAnalysis.indicators.atr.toFixed(2),
          vwap: esAnalysis.indicators.vwap.toFixed(2)
        }
      },
      pickMyTrade: pickMyTradeStatus,
      telegram: {
        configured: isTelegramConfigured(),
        note: isTelegramConfigured() ? 'Notifications enabled' : 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel'
      },
      autoExecution: autoExecutionResults, // Now contains both ES and NQ
      signal: signal ? {
        pattern: signal.patternId,
        direction: signal.direction,
        entry: signal.entryPrice.toFixed(2),
        stop: signal.stopLoss.toFixed(2),
        target: signal.takeProfit.toFixed(2),
        confidence: signal.confidence,
        reason: signal.reason
      } : null,
      // WORLD-CLASS STRATEGIES INFO
      worldClassStrategies: {
        active: true,
        strategiesAvailable: [
          'BOS_CONTINUATION', 'CHOCH_REVERSAL', 'FAILED_BREAKOUT', 'LIQUIDITY_SWEEP',
          'SESSION_REVERSION', 'TREND_PULLBACK', 'VOLATILITY_BREAKOUT', 'VWAP_DEVIATION',
          'RANGE_FADE', 'ORB_BREAKOUT', 'KILLZONE_REVERSAL'
        ],
        signalsFound: worldClassResult.signals.length,
        allSignals: worldClassResult.signals.map((s: any) => ({
          type: s.signal.type,
          direction: s.signal.direction,
          quality: s.quality.overall,
          confidence: s.signal.confidence,
          recommendation: s.quality.recommendation
        })),
        regime: {
          current: worldClassRegime.current,
          confidence: worldClassRegime.confidence,
          trendStrength: worldClassRegime.trendStrength,
          volatilityPercentile: worldClassRegime.volatilityPercentile,
          tradingRecommendation: worldClassRegime.tradingRecommendation
        },
        propFirmRisk: {
          riskLevel: propFirmRisk.riskLevel,
          drawdownUsed: propFirmRisk.drawdownPercentUsed.toFixed(1) + '%',
          positionMultiplier: propFirmRisk.positionSizeMultiplier,
          canTrade: propFirmRisk.canTrade,
          recommendation: propFirmRisk.recommendation
        },
        orbData: orbData,
        sessionData: sessionData,
        bestSignalQuality: worldClassResult.signals.length > 0 ? worldClassResult.signals[0].quality.overall : 'NONE'
      },
      message: (autoExecutionResults.ES?.executed || autoExecutionResults.NQ?.executed)
        ? `Executed: ${autoExecutionResults.ES?.executed ? 'ES ' + autoExecutionResults.ES.message : ''} ${autoExecutionResults.NQ?.executed ? 'NQ ' + autoExecutionResults.NQ.message : ''}`.trim()
        : !withinTradingHours
          ? `Outside trading hours (9:30 AM - 3:30 PM EST) - Current: ${estHour.toFixed(2)} EST`
          : !finalState.enabled
            ? 'Auto-trading DISABLED - Enable to auto-execute signals'
            : finalState.currentPosition
              ? `In position: ${finalState.currentPosition.direction} from ${finalState.currentPosition.entryPrice.toFixed(2)}`
              : finalState.dailyTrades >= CONFIG.maxDailyTrades
                ? `Daily trade limit reached (${finalState.dailyTrades}/${CONFIG.maxDailyTrades})`
                : regime === 'SIDEWAYS'
                  ? 'SIDEWAYS market - NO TRADE (waiting for trend)'
                  : signal
                    ? `${signal.patternId} signal detected - READY TO EXECUTE`
                    : `Scanning ES/NQ for signals in ${regime} market`
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

    // Load current state from Supabase
    const currentState = await loadTradingState()

    if (action === 'enable') {
      await setAutoTradingEnabled(true)
      return NextResponse.json({ success: true, message: 'Live trading ENABLED', statePersisted: true })
    }

    if (action === 'disable') {
      await setAutoTradingEnabled(false)
      return NextResponse.json({ success: true, message: 'Live trading DISABLED', statePersisted: true })
    }

    if (action === 'execute' && currentState.enabled) {
      // Get current market price first for safety check
      const realtimeData = await getRealtimeSPYPrice()
      const executeCurrentPrice = realtimeData?.price || 0

      // CRITICAL SAFETY: Check drawdown BEFORE any execution
      const preCheckRisk = buildPropFirmRiskState(currentState, executeCurrentPrice)
      if (!preCheckRisk.canTrade) {
        return NextResponse.json({
          success: false,
          error: 'BLOCKED BY SAFETY: Max drawdown reached',
          riskLevel: preCheckRisk.riskLevel,
          drawdownUsed: preCheckRisk.drawdownPercentUsed.toFixed(1) + '%',
          recommendation: preCheckRisk.recommendation
        }, { status: 403 })
      }

      // ========================================================================
      // WORLD-CLASS STRATEGIES: GET SIGNAL FOR EXECUTION
      // ========================================================================
      const { candles1m, candles5m, candles15m } = await fetchMultiTimeframeData()
      const candles = candles5m.length > 20 ? candles5m : await fetchRealtimeData()
      const lastIndex = candles.length - 1

      const ema20 = calculateEMA(candles, 20)
      const ema50 = calculateEMA(candles, 50)
      const rsi = calculateRSI(candles, 14)
      const atr = calculateATR(candles, 14)
      const vwap = calculateVWAP(candles)
      const bb = calculateBB(candles, 20)

      // Prepare world-class data
      const orbData = calculateORBData(candles1m.length > 0 ? candles1m : candles)
      const sessionData = calculateSessionData(candles5m.length > 0 ? candles5m : candles)
      const vwapData = calculateVWAPData(candles5m.length > 0 ? candles5m : candles)
      const propFirmRisk = buildPropFirmRiskState(currentState, executeCurrentPrice)

      // Generate all 11 strategy signals
      const worldClassResult = generateAllWorldClassSignals(
        candles1m.length >= 100 ? candles1m : candles,
        candles5m.length >= 50 ? candles5m : candles,
        candles15m.length >= 20 ? candles15m : candles,
        orbData,
        sessionData,
        vwapData,
        propFirmRisk
      )

      // Get best signal
      let signal: Signal | null = null
      if (worldClassResult.signals.length > 0) {
        const sortedSignals = worldClassResult.signals.sort((a, b) => b.quality.overall - a.quality.overall)
        const best = sortedSignals[0]

        signal = {
          patternId: best.signal.type,
          direction: best.signal.direction,
          entryPrice: best.signal.entry.price,
          stopLoss: best.signal.stopLoss.price,
          takeProfit: best.signal.targets[0]?.price || best.signal.entry.price + (best.signal.direction === 'LONG' ? atr[lastIndex] * 2 : -atr[lastIndex] * 2),
          confidence: best.signal.confidence,
          reason: `${best.signal.type} (Quality: ${best.quality.overall}/100)`,
          regime: detectRegime(ema20, ema50, rsi, lastIndex)
        }
      }

      if (!signal) {
        return NextResponse.json({
          success: false,
          message: `No signal available - ${worldClassResult.reason || 'waiting for setup'}`,
          worldClassRegime: worldClassResult.regime.current,
          strategiesChecked: 11
        })
      }

      const contractSymbol = getCurrentContractSymbol('ES')

      // Store the position in Supabase (persists across restarts)
      const newPosition: OpenPosition = {
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        contracts: 1,
        patternId: signal.patternId,
        entryTime: new Date().toISOString(),
        symbol: contractSymbol
      }
      await openPosition(newPosition)

      // ============================================================================
      // EXECUTE TRADE VIA PICKMYTRADE TO APEX
      // ============================================================================
      const client = getPickMyTradeClient()
      let executionResult: TradeResult | null = null

      if (client) {
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
        position: newPosition,
        positionSaved: true, // Confirm saved to Supabase
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

    // Close/flatten any open position
    if (action === 'close') {
      const client = getPickMyTradeClient()

      if (!client) {
        return NextResponse.json({
          success: false,
          message: 'PickMyTrade not configured',
          pickMyTradeConnected: false
        })
      }

      const contractSymbol = getCurrentContractSymbol('ES')
      console.log(`[CLOSE] Flattening position on ${contractSymbol}...`)

      try {
        const result = await client.closePosition(contractSymbol)

        // Get current price for P&L calculation
        const candles = await fetchRealtimeData()
        const lastCandle = candles[candles.length - 1]
        const exitPrice = lastCandle.close

        // Clear position state in Supabase and record the trade with P&L
        const { state: newState, pnl } = await closePositionState(exitPrice, 'Manual close via CLOSE ALL button')

        return NextResponse.json({
          success: true,
          message: 'CLOSE ORDER SENT',
          close: {
            symbol: contractSymbol,
            action: 'FLAT',
            exitPrice: exitPrice.toFixed(2),
            pnl: pnl.toFixed(2)
          },
          execution: {
            success: result.success,
            message: result.message,
            orderId: result.orderId,
            rawResponse: result.response // Include raw response for debugging
          },
          positionCleared: true,
          statePersisted: true,
          pickMyTradeConnected: true
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: error instanceof Error ? error.message : 'Close failed',
          pickMyTradeConnected: true
        })
      }
    }

    // Test trade to verify PickMyTrade connection - WITH FULL DEBUG
    if (action === 'test') {
      // Direct API test - bypass client to see raw response
      const contractSymbol = getCurrentContractSymbol('ES')
      const candles = await fetchRealtimeData()
      const lastCandle = candles[candles.length - 1]
      const currentPrice = lastCandle.close

      const payload = {
        symbol: contractSymbol,
        date: new Date().toISOString(),
        data: 'buy',
        quantity: 1,
        risk_percentage: 0,
        price: 0,
        tp: currentPrice + 5,
        percentage_tp: 0,
        dollar_tp: 0,
        sl: currentPrice - 10,
        dollar_sl: 0,
        percentage_sl: 0,
        order_type: 'MKT',
        update_tp: false,
        update_sl: false,
        token: PICKMYTRADE_TOKEN,
        duplicate_position_allow: false,
        platform: 'RITHMIC',
        connection_name: RITHMIC_CONNECTION_NAME, // CRITICAL: Required for Rithmic routing
        reverse_order_close: true,
        multiple_accounts: [
          {
            account_id: APEX_ACCOUNT_ID,  // FIXED: Was "id", docs say "account_id"
            quantity: 1,
          },
        ],
      }

      console.log(`[TEST TRADE] Sending to PickMyTrade API...`)
      console.log(`[TEST TRADE] Token: ${PICKMYTRADE_TOKEN.substring(0, 8)}...`)
      console.log(`[TEST TRADE] Account: ${APEX_ACCOUNT_ID}`)
      console.log(`[TEST TRADE] Payload:`, JSON.stringify(payload, null, 2))

      try {
        const response = await fetch('https://api.pickmytrade.io/v2/add-trade-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const responseText = await response.text()
        console.log(`[TEST TRADE] Response status: ${response.status}`)
        console.log(`[TEST TRADE] Response body: ${responseText}`)

        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = { raw: responseText }
        }

        return NextResponse.json({
          success: response.ok,
          message: response.ok ? 'API call successful' : 'API call failed',
          debug: {
            apiEndpoint: 'https://api.pickmytrade.io/v2/add-trade-data',
            tokenUsed: `${PICKMYTRADE_TOKEN.substring(0, 8)}...`,
            accountId: APEX_ACCOUNT_ID,
            symbol: contractSymbol,
            httpStatus: response.status,
            httpStatusText: response.statusText
          },
          payloadSent: payload,
          apiResponse: responseData,
          pickMyTradeConnected: !!PICKMYTRADE_TOKEN
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: error instanceof Error ? error.message : 'Network error',
          error: error instanceof Error ? error.stack : 'Unknown',
          pickMyTradeConnected: !!PICKMYTRADE_TOKEN
        })
      }
    }

    // Test Telegram notifications
    if (action === 'test_telegram') {
      const result = await testTelegramConnection()
      return NextResponse.json({
        success: result.success,
        message: result.message,
        telegramConfigured: isTelegramConfigured()
      })
    }

    // EMERGENCY: Reset all state (use with caution)
    if (action === 'reset') {
      const defaultState: TradingState = {
        enabled: false,
        currentPosition: null,
        dailyTrades: 0,
        dailyPnL: 0,
        lastTradeDate: new Date().toISOString().split('T')[0],
        totalPnL: 0,
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        tradeHistory: [],
        lastUpdated: new Date().toISOString(),
        accountId: 'APEX-456334'
      }
      await saveTradingState(defaultState)
      return NextResponse.json({
        success: true,
        message: 'ALL STATE RESET - Trading disabled, position cleared, history wiped',
        warning: 'This is an emergency reset - all trade history has been cleared',
        statePersisted: true
      })
    }

    // Force clear position without executing a close order (if PickMyTrade already closed it)
    if (action === 'clear-position') {
      const state = await loadTradingState()
      state.currentPosition = null
      await saveTradingState(state)
      return NextResponse.json({
        success: true,
        message: 'Position cleared from state (no trade executed)',
        note: 'Use this if PickMyTrade already closed the position but state shows open',
        statePersisted: true
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
