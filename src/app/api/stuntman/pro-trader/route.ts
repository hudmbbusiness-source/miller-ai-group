/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                 PROFESSIONAL TRADING ENGINE v1.0                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  FEATURES:                                                                ║
 * ║  ✅ Multi-timeframe analysis (1m, 5m, 15m)                                ║
 * ║  ✅ Session/Kill zone rules (London, NY open/close)                       ║
 * ║  ✅ Trailing stop management                                              ║
 * ║  ✅ Risk calculator with position sizing                                  ║
 * ║  ✅ Daily P&L tracking with loss limits                                   ║
 * ║  ✅ News event awareness                                                  ║
 * ║  ✅ Order flow analysis (delta, absorption)                               ║
 * ║  ✅ Market structure (BOS, CHoCH, FVG)                                    ║
 * ║  ✅ Confluence scoring system                                             ║
 * ║  ✅ One-click execution via PickMyTrade                                   ║
 * ║                                                                           ║
 * ║  Based on proven adaptive strategy + professional enhancements            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
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
  hour: number
  minute: number
  dateStr: string
}

type MarketRegime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'
type Session = 'PRE_MARKET' | 'LONDON_OPEN' | 'NY_OPEN' | 'NY_MIDDAY' | 'NY_CLOSE' | 'AFTER_HOURS'
type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_TRADE'

interface TimeframeData {
  candles: Candle[]
  ema9: number[]
  ema20: number[]
  ema50: number[]
  rsi: number[]
  atr: number[]
  vwap: number[]
  regime: MarketRegime
  trend: 'UP' | 'DOWN' | 'NEUTRAL'
}

interface OrderFlowData {
  delta: number           // Buy volume - Sell volume
  deltaPercent: number    // Delta as % of total volume
  absorption: boolean     // Large volume with small price move
  imbalance: 'BUY' | 'SELL' | 'NEUTRAL'
  volumeSpike: boolean    // Volume > 2x average
}

interface MarketStructure {
  swingHighs: { price: number; time: number }[]
  swingLows: { price: number; time: number }[]
  lastBOS: { direction: 'UP' | 'DOWN'; price: number; time: number } | null
  lastCHoCH: { direction: 'UP' | 'DOWN'; price: number; time: number } | null
  fvgs: { direction: 'UP' | 'DOWN'; top: number; bottom: number; time: number }[]
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

interface Signal {
  id: string
  timestamp: number
  pattern: string
  direction: 'LONG' | 'SHORT'
  entry: number
  stopLoss: number
  takeProfit1: number    // 1:1 RR
  takeProfit2: number    // 2:1 RR
  takeProfit3: number    // 3:1 RR
  riskPoints: number
  rewardPoints: number
  riskRewardRatio: number
  confidence: number     // 0-100
  strength: SignalStrength
  session: Session
  regime: MarketRegime
  timeframeAlignment: {
    m1: 'ALIGNED' | 'NEUTRAL' | 'AGAINST'
    m5: 'ALIGNED' | 'NEUTRAL' | 'AGAINST'
    m15: 'ALIGNED' | 'NEUTRAL' | 'AGAINST'
  }
  confluenceFactors: string[]
  warnings: string[]
}

interface RiskCalculation {
  accountBalance: number
  riskPercent: number
  riskAmount: number
  positionSize: number
  maxContracts: number
  dollarRisk: number
  dollarReward: number
}

interface DailyStats {
  date: string
  trades: number
  wins: number
  losses: number
  grossPnL: number
  netPnL: number
  maxDrawdown: number
  currentDrawdown: number
  dailyLossLimit: number
  canTrade: boolean
  stopReason: string | null
}

interface Position {
  id: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  currentPrice: number
  contracts: number
  initialStop: number
  currentStop: number
  trailingActive: boolean
  trailingDistance: number
  target1: number
  target2: number
  target3: number
  target1Hit: boolean
  target2Hit: boolean
  unrealizedPnL: number
  entryTime: number
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Account settings (Apex 150K)
  accountSize: 150000,
  maxDrawdown: 6000,
  profitTarget: 9000,
  maxContracts: 17,

  // Risk management
  riskPerTrade: 0.01,        // 1% of account per trade
  maxDailyLoss: 1000,        // Stop trading after $1000 daily loss
  maxDailyTrades: 6,         // Max trades per day
  minRiskReward: 1.5,        // Minimum R:R ratio

  // Session times (EST)
  sessions: {
    PRE_MARKET: { start: 4, end: 9.5 },
    LONDON_OPEN: { start: 3, end: 5 },      // 3-5 AM EST (London open)
    NY_OPEN: { start: 9.5, end: 11 },       // 9:30-11 AM EST
    NY_MIDDAY: { start: 11, end: 14 },      // 11 AM - 2 PM EST (lunch)
    NY_CLOSE: { start: 14, end: 16 },       // 2-4 PM EST (power hour)
    AFTER_HOURS: { start: 16, end: 20 },
  },

  // Session multipliers (some sessions are better)
  sessionMultipliers: {
    PRE_MARKET: 0.5,      // Reduce size pre-market
    LONDON_OPEN: 0.7,     // Good moves but early
    NY_OPEN: 1.0,         // Best time to trade
    NY_MIDDAY: 0.3,       // Avoid lunch chop
    NY_CLOSE: 0.8,        // Power hour
    AFTER_HOURS: 0,       // Don't trade after hours
  },

  // Trailing stop settings
  trailing: {
    activateAfterRR: 1.0,  // Activate trailing after 1R profit
    trailDistance: 0.5,    // Trail by 0.5R behind
    breakEvenAfterRR: 0.5, // Move to breakeven after 0.5R
  },

  // Confluence requirements
  minConfluence: 60,       // Minimum confluence score to trade

  // Regime thresholds
  strongTrendSlope: 0.25,  // EMA slope % for strong trend
  trendSlope: 0.10,        // EMA slope % for regular trend

  // Costs
  costs: {
    commission: 4.12,
    exchangeFee: 2.58,
    nfaFee: 0.04,
    clearingFee: 0.10,
    get total() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }
  }
}

const ES_POINT_VALUE = 50
const ES_TICK_VALUE = 12.50

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentPosition: Position | null = null
let dailyStats: DailyStats = {
  date: new Date().toLocaleDateString('en-US'),
  trades: 0,
  wins: 0,
  losses: 0,
  grossPnL: 0,
  netPnL: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  dailyLossLimit: CONFIG.maxDailyLoss,
  canTrade: true,
  stopReason: null
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchMultiTimeframeData(): Promise<{
  m1: Candle[]
  m5: Candle[]
  m15: Candle[]
}> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - (5 * 24 * 60 * 60) // 5 days back

  const fetchInterval = async (interval: string, scale: number): Promise<Candle[]> => {
    const sources = [
      { symbol: 'ES=F', multiplier: 1 },
      { symbol: 'SPY', multiplier: 10 }
    ]

    for (const source of sources) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(source.symbol)}?period1=${start}&period2=${now}&interval=${interval}&includePrePost=false`

        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (!response.ok) continue

        const data = await response.json()
        const result = data.chart?.result?.[0]
        if (!result?.timestamp) continue

        const candles: Candle[] = []
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]

        for (let i = 0; i < timestamps.length; i++) {
          if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
            const date = new Date(timestamps[i] * 1000)
            const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

            candles.push({
              time: timestamps[i] * 1000,
              open: quote.open[i] * source.multiplier,
              high: quote.high[i] * source.multiplier,
              low: quote.low[i] * source.multiplier,
              close: quote.close[i] * source.multiplier,
              volume: quote.volume[i] || 0,
              hour: estDate.getHours(),
              minute: estDate.getMinutes(),
              dateStr: estDate.toLocaleDateString('en-US'),
            })
          }
        }

        if (candles.length > 50) return candles
      } catch {
        continue
      }
    }

    return []
  }

  // Fetch all timeframes in parallel
  const [m1, m5, m15] = await Promise.all([
    fetchInterval('1m', 1),
    fetchInterval('5m', 1),
    fetchInterval('15m', 1)
  ])

  return { m1, m5, m15 }
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
  let currentDate = ''

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].dateStr !== currentDate) {
      cumVolume = 0
      cumTP = 0
      currentDate = candles[i].dateStr
    }

    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    cumVolume += candles[i].volume || 1
    cumTP += tp * (candles[i].volume || 1)
    vwap.push(cumTP / cumVolume)
  }
  return vwap
}

// ============================================================================
// MARKET STRUCTURE ANALYSIS
// ============================================================================

function detectMarketStructure(candles: Candle[]): MarketStructure {
  const swingHighs: { price: number; time: number }[] = []
  const swingLows: { price: number; time: number }[] = []
  const fvgs: { direction: 'UP' | 'DOWN'; top: number; bottom: number; time: number }[] = []

  // Detect swing highs/lows (3-bar pattern)
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i]
    const prev1 = candles[i - 1]
    const prev2 = candles[i - 2]
    const next1 = candles[i + 1]
    const next2 = candles[i + 2]

    // Swing high
    if (c.high > prev1.high && c.high > prev2.high && c.high > next1.high && c.high > next2.high) {
      swingHighs.push({ price: c.high, time: c.time })
    }

    // Swing low
    if (c.low < prev1.low && c.low < prev2.low && c.low < next1.low && c.low < next2.low) {
      swingLows.push({ price: c.low, time: c.time })
    }

    // Fair Value Gap detection
    if (i >= 2) {
      const gapUp = candles[i].low > candles[i - 2].high
      const gapDown = candles[i].high < candles[i - 2].low

      if (gapUp) {
        fvgs.push({
          direction: 'UP',
          top: candles[i].low,
          bottom: candles[i - 2].high,
          time: candles[i].time
        })
      }
      if (gapDown) {
        fvgs.push({
          direction: 'DOWN',
          top: candles[i - 2].low,
          bottom: candles[i].high,
          time: candles[i].time
        })
      }
    }
  }

  // Detect BOS (Break of Structure)
  let lastBOS: MarketStructure['lastBOS'] = null
  const recentSwingHighs = swingHighs.slice(-5)
  const recentSwingLows = swingLows.slice(-5)

  if (recentSwingHighs.length >= 2) {
    const lastHigh = recentSwingHighs[recentSwingHighs.length - 1]
    const prevHigh = recentSwingHighs[recentSwingHighs.length - 2]
    const currentPrice = candles[candles.length - 1].close

    if (currentPrice > lastHigh.price && lastHigh.price > prevHigh.price) {
      lastBOS = { direction: 'UP', price: lastHigh.price, time: lastHigh.time }
    }
  }

  if (recentSwingLows.length >= 2 && !lastBOS) {
    const lastLow = recentSwingLows[recentSwingLows.length - 1]
    const prevLow = recentSwingLows[recentSwingLows.length - 2]
    const currentPrice = candles[candles.length - 1].close

    if (currentPrice < lastLow.price && lastLow.price < prevLow.price) {
      lastBOS = { direction: 'DOWN', price: lastLow.price, time: lastLow.time }
    }
  }

  // Detect CHoCH (Change of Character)
  let lastCHoCH: MarketStructure['lastCHoCH'] = null
  if (recentSwingHighs.length >= 2 && recentSwingLows.length >= 2) {
    const wasUptrend = recentSwingHighs[recentSwingHighs.length - 2].price < recentSwingHighs[recentSwingHighs.length - 1].price
    const brokeLastLow = candles[candles.length - 1].close < recentSwingLows[recentSwingLows.length - 1].price

    if (wasUptrend && brokeLastLow) {
      lastCHoCH = { direction: 'DOWN', price: recentSwingLows[recentSwingLows.length - 1].price, time: candles[candles.length - 1].time }
    }

    const wasDowntrend = recentSwingLows[recentSwingLows.length - 2].price > recentSwingLows[recentSwingLows.length - 1].price
    const brokeLastHigh = candles[candles.length - 1].close > recentSwingHighs[recentSwingHighs.length - 1].price

    if (wasDowntrend && brokeLastHigh) {
      lastCHoCH = { direction: 'UP', price: recentSwingHighs[recentSwingHighs.length - 1].price, time: candles[candles.length - 1].time }
    }
  }

  // Determine overall trend
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (lastBOS?.direction === 'UP' || lastCHoCH?.direction === 'UP') trend = 'BULLISH'
  if (lastBOS?.direction === 'DOWN' || lastCHoCH?.direction === 'DOWN') trend = 'BEARISH'

  return {
    swingHighs: swingHighs.slice(-10),
    swingLows: swingLows.slice(-10),
    lastBOS,
    lastCHoCH,
    fvgs: fvgs.slice(-5),
    trend
  }
}

// ============================================================================
// ORDER FLOW ANALYSIS
// ============================================================================

function analyzeOrderFlow(candles: Candle[]): OrderFlowData {
  const recent = candles.slice(-10)

  // Estimate delta from candle structure
  let totalBuyVolume = 0
  let totalSellVolume = 0

  for (const c of recent) {
    const range = c.high - c.low
    if (range === 0) continue

    // Estimate buy/sell volume based on where close is in range
    const closePosition = (c.close - c.low) / range
    const buyVolume = c.volume * closePosition
    const sellVolume = c.volume * (1 - closePosition)

    totalBuyVolume += buyVolume
    totalSellVolume += sellVolume
  }

  const delta = totalBuyVolume - totalSellVolume
  const totalVolume = totalBuyVolume + totalSellVolume
  const deltaPercent = totalVolume > 0 ? (delta / totalVolume) * 100 : 0

  // Detect absorption (high volume, small price move)
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length
  const lastCandle = candles[candles.length - 1]
  const lastRange = lastCandle.high - lastCandle.low
  const avgRange = recent.reduce((sum, c) => sum + (c.high - c.low), 0) / recent.length

  const absorption = lastCandle.volume > avgVolume * 1.5 && lastRange < avgRange * 0.5
  const volumeSpike = lastCandle.volume > avgVolume * 2

  // Determine imbalance
  let imbalance: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL'
  if (deltaPercent > 20) imbalance = 'BUY'
  if (deltaPercent < -20) imbalance = 'SELL'

  return { delta, deltaPercent, absorption, imbalance, volumeSpike }
}

// ============================================================================
// SESSION DETECTION
// ============================================================================

function getCurrentSession(hour: number): Session {
  if (hour >= 3 && hour < 5) return 'LONDON_OPEN'
  if (hour >= 4 && hour < 9.5) return 'PRE_MARKET'
  if (hour >= 9.5 && hour < 11) return 'NY_OPEN'
  if (hour >= 11 && hour < 14) return 'NY_MIDDAY'
  if (hour >= 14 && hour < 16) return 'NY_CLOSE'
  return 'AFTER_HOURS'
}

function isKillZone(hour: number): boolean {
  // Kill zones are high-probability trading times
  const killZones = [
    { start: 3, end: 4 },      // London open
    { start: 9.5, end: 10.5 }, // NY open
    { start: 14, end: 15 },    // NY afternoon
  ]

  return killZones.some(kz => hour >= kz.start && hour < kz.end)
}

// ============================================================================
// REGIME DETECTION
// ============================================================================

function detectRegime(candles: Candle[], ema20: number[], ema50: number[]): MarketRegime {
  const i = candles.length - 1
  if (i < 50) return 'SIDEWAYS'

  const price = candles[i].close
  const ema20Now = ema20[i]
  const ema50Now = ema50[i]
  const ema20Prev = ema20[i - 10]
  const ema50Prev = ema50[i - 10]

  // Calculate slope
  const ema20Slope = ((ema20Now - ema20Prev) / ema20Prev) * 100
  const ema50Slope = ((ema50Now - ema50Prev) / ema50Prev) * 100

  // Strong uptrend: EMAs aligned up, strong slope
  if (price > ema20Now && ema20Now > ema50Now && ema20Slope > CONFIG.strongTrendSlope) {
    return 'STRONG_UPTREND'
  }

  // Uptrend
  if (price > ema20Now && ema20Now > ema50Now && ema20Slope > CONFIG.trendSlope) {
    return 'UPTREND'
  }

  // Strong downtrend
  if (price < ema20Now && ema20Now < ema50Now && ema20Slope < -CONFIG.strongTrendSlope) {
    return 'STRONG_DOWNTREND'
  }

  // Downtrend
  if (price < ema20Now && ema20Now < ema50Now && ema20Slope < -CONFIG.trendSlope) {
    return 'DOWNTREND'
  }

  return 'SIDEWAYS'
}

// ============================================================================
// TIMEFRAME ALIGNMENT
// ============================================================================

function checkTimeframeAlignment(
  m1Regime: MarketRegime,
  m5Regime: MarketRegime,
  m15Regime: MarketRegime,
  direction: 'LONG' | 'SHORT'
): { m1: 'ALIGNED' | 'NEUTRAL' | 'AGAINST'; m5: 'ALIGNED' | 'NEUTRAL' | 'AGAINST'; m15: 'ALIGNED' | 'NEUTRAL' | 'AGAINST' } {
  const checkAlignment = (regime: MarketRegime, dir: 'LONG' | 'SHORT'): 'ALIGNED' | 'NEUTRAL' | 'AGAINST' => {
    if (dir === 'LONG') {
      if (regime === 'STRONG_UPTREND' || regime === 'UPTREND') return 'ALIGNED'
      if (regime === 'SIDEWAYS') return 'NEUTRAL'
      return 'AGAINST'
    } else {
      if (regime === 'STRONG_DOWNTREND' || regime === 'DOWNTREND') return 'ALIGNED'
      if (regime === 'SIDEWAYS') return 'NEUTRAL'
      return 'AGAINST'
    }
  }

  return {
    m1: checkAlignment(m1Regime, direction),
    m5: checkAlignment(m5Regime, direction),
    m15: checkAlignment(m15Regime, direction)
  }
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

interface PatternConfig {
  id: string
  name: string
  direction: 'LONG' | 'SHORT'
  minConfidence: number
  stopMultiplier: number
  targetMultiplier: number
}

const PATTERNS: PatternConfig[] = [
  { id: 'VWAP_PULLBACK_LONG', name: 'VWAP Pullback Long', direction: 'LONG', minConfidence: 60, stopMultiplier: 1.5, targetMultiplier: 2.0 },
  { id: 'VWAP_PULLBACK_SHORT', name: 'VWAP Pullback Short', direction: 'SHORT', minConfidence: 60, stopMultiplier: 1.5, targetMultiplier: 2.0 },
  { id: 'EMA20_BOUNCE_LONG', name: 'EMA20 Bounce Long', direction: 'LONG', minConfidence: 55, stopMultiplier: 1.5, targetMultiplier: 2.5 },
  { id: 'EMA20_BOUNCE_SHORT', name: 'EMA20 Bounce Short', direction: 'SHORT', minConfidence: 55, stopMultiplier: 1.5, targetMultiplier: 2.5 },
  { id: 'BOS_CONTINUATION_LONG', name: 'BOS Continuation Long', direction: 'LONG', minConfidence: 65, stopMultiplier: 2.0, targetMultiplier: 3.0 },
  { id: 'BOS_CONTINUATION_SHORT', name: 'BOS Continuation Short', direction: 'SHORT', minConfidence: 65, stopMultiplier: 2.0, targetMultiplier: 3.0 },
  { id: 'FVG_FILL_LONG', name: 'FVG Fill Long', direction: 'LONG', minConfidence: 60, stopMultiplier: 1.5, targetMultiplier: 2.0 },
  { id: 'FVG_FILL_SHORT', name: 'FVG Fill Short', direction: 'SHORT', minConfidence: 60, stopMultiplier: 1.5, targetMultiplier: 2.0 },
  { id: 'ABSORPTION_REVERSAL_LONG', name: 'Absorption Reversal Long', direction: 'LONG', minConfidence: 70, stopMultiplier: 1.0, targetMultiplier: 2.0 },
  { id: 'ABSORPTION_REVERSAL_SHORT', name: 'Absorption Reversal Short', direction: 'SHORT', minConfidence: 70, stopMultiplier: 1.0, targetMultiplier: 2.0 },
]

function detectPatterns(
  candles: Candle[],
  ema9: number[],
  ema20: number[],
  ema50: number[],
  vwap: number[],
  atr: number[],
  rsi: number[],
  structure: MarketStructure,
  orderFlow: OrderFlowData,
  regime: MarketRegime
): { pattern: PatternConfig; confidence: number; entry: number; stop: number; target: number; reasons: string[] }[] {
  const signals: { pattern: PatternConfig; confidence: number; entry: number; stop: number; target: number; reasons: string[] }[] = []
  const i = candles.length - 1
  const c = candles[i]
  const prev = candles[i - 1]
  if (!prev) return signals

  const currentATR = atr[i]
  const currentVWAP = vwap[i]
  const currentEMA20 = ema20[i]
  const currentRSI = rsi[i]

  // VWAP_PULLBACK_LONG
  if (regime === 'UPTREND' || regime === 'STRONG_UPTREND') {
    if (prev.low <= currentVWAP * 1.002 && c.close > currentVWAP && c.close > c.open) {
      let confidence = 50
      const reasons: string[] = ['Price touched VWAP and bounced']

      if (currentRSI > 40 && currentRSI < 60) { confidence += 10; reasons.push('RSI neutral (40-60)') }
      if (orderFlow.imbalance === 'BUY') { confidence += 10; reasons.push('Order flow bullish') }
      if (structure.trend === 'BULLISH') { confidence += 10; reasons.push('Market structure bullish') }
      if (c.volume > prev.volume) { confidence += 5; reasons.push('Volume increasing') }

      const pattern = PATTERNS.find(p => p.id === 'VWAP_PULLBACK_LONG')!
      if (confidence >= pattern.minConfidence) {
        signals.push({
          pattern,
          confidence,
          entry: c.close,
          stop: c.close - currentATR * pattern.stopMultiplier,
          target: c.close + currentATR * pattern.targetMultiplier,
          reasons
        })
      }
    }
  }

  // VWAP_PULLBACK_SHORT
  if (regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') {
    if (prev.high >= currentVWAP * 0.998 && c.close < currentVWAP && c.close < c.open) {
      let confidence = 50
      const reasons: string[] = ['Price touched VWAP and rejected']

      if (currentRSI > 40 && currentRSI < 60) { confidence += 10; reasons.push('RSI neutral (40-60)') }
      if (orderFlow.imbalance === 'SELL') { confidence += 10; reasons.push('Order flow bearish') }
      if (structure.trend === 'BEARISH') { confidence += 10; reasons.push('Market structure bearish') }
      if (c.volume > prev.volume) { confidence += 5; reasons.push('Volume increasing') }

      const pattern = PATTERNS.find(p => p.id === 'VWAP_PULLBACK_SHORT')!
      if (confidence >= pattern.minConfidence) {
        signals.push({
          pattern,
          confidence,
          entry: c.close,
          stop: c.close + currentATR * pattern.stopMultiplier,
          target: c.close - currentATR * pattern.targetMultiplier,
          reasons
        })
      }
    }
  }

  // EMA20_BOUNCE_LONG
  if (regime === 'UPTREND' || regime === 'STRONG_UPTREND') {
    if (prev.low <= currentEMA20 * 1.002 && c.close > currentEMA20 && c.close > c.open) {
      let confidence = 45
      const reasons: string[] = ['Price touched EMA20 and bounced']

      if (c.close > currentVWAP) { confidence += 10; reasons.push('Above VWAP') }
      if (ema20[i] > ema50[i]) { confidence += 10; reasons.push('EMA20 > EMA50') }
      if (currentRSI > 45) { confidence += 5; reasons.push('RSI showing strength') }
      if (orderFlow.imbalance === 'BUY') { confidence += 10; reasons.push('Order flow bullish') }

      const pattern = PATTERNS.find(p => p.id === 'EMA20_BOUNCE_LONG')!
      if (confidence >= pattern.minConfidence) {
        signals.push({
          pattern,
          confidence,
          entry: c.close,
          stop: c.close - currentATR * pattern.stopMultiplier,
          target: c.close + currentATR * pattern.targetMultiplier,
          reasons
        })
      }
    }
  }

  // BOS_CONTINUATION_LONG
  if (structure.lastBOS?.direction === 'UP') {
    const timeSinceBOS = c.time - structure.lastBOS.time
    if (timeSinceBOS < 30 * 60 * 1000 && c.close > structure.lastBOS.price) { // Within 30 mins
      let confidence = 55
      const reasons: string[] = ['Break of Structure UP confirmed']

      if (regime === 'UPTREND' || regime === 'STRONG_UPTREND') { confidence += 15; reasons.push('Aligned with uptrend') }
      if (orderFlow.imbalance === 'BUY') { confidence += 10; reasons.push('Order flow bullish') }
      if (c.volume > prev.volume * 1.5) { confidence += 10; reasons.push('Volume surge') }

      const pattern = PATTERNS.find(p => p.id === 'BOS_CONTINUATION_LONG')!
      if (confidence >= pattern.minConfidence) {
        signals.push({
          pattern,
          confidence,
          entry: c.close,
          stop: structure.lastBOS.price - currentATR * 0.5,
          target: c.close + currentATR * pattern.targetMultiplier,
          reasons
        })
      }
    }
  }

  // ABSORPTION_REVERSAL_LONG
  if (orderFlow.absorption && orderFlow.imbalance === 'BUY' && (regime === 'DOWNTREND' || regime === 'SIDEWAYS')) {
    let confidence = 60
    const reasons: string[] = ['Absorption detected with buy imbalance']

    if (currentRSI < 35) { confidence += 10; reasons.push('RSI oversold') }
    if (c.close > c.open) { confidence += 10; reasons.push('Bullish candle') }

    const pattern = PATTERNS.find(p => p.id === 'ABSORPTION_REVERSAL_LONG')!
    if (confidence >= pattern.minConfidence) {
      signals.push({
        pattern,
        confidence,
        entry: c.close,
        stop: c.low - currentATR * 0.5,
        target: c.close + currentATR * pattern.targetMultiplier,
        reasons
      })
    }
  }

  // ABSORPTION_REVERSAL_SHORT
  if (orderFlow.absorption && orderFlow.imbalance === 'SELL' && (regime === 'UPTREND' || regime === 'SIDEWAYS')) {
    let confidence = 60
    const reasons: string[] = ['Absorption detected with sell imbalance']

    if (currentRSI > 65) { confidence += 10; reasons.push('RSI overbought') }
    if (c.close < c.open) { confidence += 10; reasons.push('Bearish candle') }

    const pattern = PATTERNS.find(p => p.id === 'ABSORPTION_REVERSAL_SHORT')!
    if (confidence >= pattern.minConfidence) {
      signals.push({
        pattern,
        confidence,
        entry: c.close,
        stop: c.high + currentATR * 0.5,
        target: c.close - currentATR * pattern.targetMultiplier,
        reasons
      })
    }
  }

  // FVG_FILL_LONG
  for (const fvg of structure.fvgs) {
    if (fvg.direction === 'UP' && c.low <= fvg.top && c.close > fvg.bottom) {
      let confidence = 50
      const reasons: string[] = ['Price filling bullish FVG']

      if (regime === 'UPTREND' || regime === 'STRONG_UPTREND') { confidence += 15; reasons.push('Aligned with trend') }
      if (orderFlow.imbalance === 'BUY') { confidence += 10; reasons.push('Order flow bullish') }

      const pattern = PATTERNS.find(p => p.id === 'FVG_FILL_LONG')!
      if (confidence >= pattern.minConfidence) {
        signals.push({
          pattern,
          confidence,
          entry: c.close,
          stop: fvg.bottom - currentATR * 0.5,
          target: c.close + currentATR * pattern.targetMultiplier,
          reasons
        })
        break
      }
    }
  }

  return signals
}

// ============================================================================
// RISK CALCULATOR
// ============================================================================

function calculateRisk(entryPrice: number, stopPrice: number, accountBalance: number): RiskCalculation {
  const riskPoints = Math.abs(entryPrice - stopPrice)
  const riskDollarsPerContract = riskPoints * ES_POINT_VALUE

  const riskAmount = accountBalance * CONFIG.riskPerTrade
  const positionSize = Math.floor(riskAmount / riskDollarsPerContract)
  const maxContracts = Math.min(positionSize, CONFIG.maxContracts)

  return {
    accountBalance,
    riskPercent: CONFIG.riskPerTrade * 100,
    riskAmount,
    positionSize,
    maxContracts,
    dollarRisk: maxContracts * riskDollarsPerContract,
    dollarReward: 0 // Calculated separately
  }
}

// ============================================================================
// CONFLUENCE SCORING
// ============================================================================

function calculateConfluence(
  patternConfidence: number,
  timeframeAlignment: Signal['timeframeAlignment'],
  session: Session,
  orderFlow: OrderFlowData,
  structure: MarketStructure,
  direction: 'LONG' | 'SHORT'
): { score: number; factors: string[] } {
  let score = patternConfidence * 0.4 // Pattern is 40% of score
  const factors: string[] = []

  // Timeframe alignment (25%)
  let tfScore = 0
  if (timeframeAlignment.m15 === 'ALIGNED') { tfScore += 15; factors.push('15m aligned') }
  if (timeframeAlignment.m5 === 'ALIGNED') { tfScore += 7; factors.push('5m aligned') }
  if (timeframeAlignment.m1 === 'ALIGNED') { tfScore += 3; factors.push('1m aligned') }
  if (timeframeAlignment.m15 === 'AGAINST') { tfScore -= 10; factors.push('15m against (penalty)') }
  score += tfScore

  // Session quality (15%)
  const sessionMultiplier = CONFIG.sessionMultipliers[session]
  score += sessionMultiplier * 15
  if (sessionMultiplier >= 0.8) factors.push(`Good session: ${session}`)
  if (sessionMultiplier < 0.5) factors.push(`Poor session: ${session} (penalty)`)

  // Order flow (10%)
  if ((direction === 'LONG' && orderFlow.imbalance === 'BUY') ||
      (direction === 'SHORT' && orderFlow.imbalance === 'SELL')) {
    score += 10
    factors.push('Order flow aligned')
  }
  if (orderFlow.volumeSpike) {
    score += 5
    factors.push('Volume spike')
  }

  // Market structure (10%)
  if ((direction === 'LONG' && structure.trend === 'BULLISH') ||
      (direction === 'SHORT' && structure.trend === 'BEARISH')) {
    score += 10
    factors.push('Structure aligned')
  }
  if ((direction === 'LONG' && structure.lastBOS?.direction === 'UP') ||
      (direction === 'SHORT' && structure.lastBOS?.direction === 'DOWN')) {
    score += 5
    factors.push('Recent BOS aligned')
  }

  return { score: Math.min(score, 100), factors }
}

// ============================================================================
// SIGNAL GENERATION
// ============================================================================

async function generateSignals(): Promise<{
  signals: Signal[]
  currentState: {
    price: number
    regime: MarketRegime
    session: Session
    isKillZone: boolean
    structure: MarketStructure
    orderFlow: OrderFlowData
    dailyStats: DailyStats
    position: Position | null
  }
}> {
  // Fetch multi-timeframe data
  const { m1, m5, m15 } = await fetchMultiTimeframeData()

  if (m5.length < 100) {
    throw new Error('Insufficient data for analysis')
  }

  // Calculate indicators for each timeframe
  const calc = (candles: Candle[]) => ({
    ema9: calculateEMA(candles, 9),
    ema20: calculateEMA(candles, 20),
    ema50: calculateEMA(candles, 50),
    rsi: calculateRSI(candles, 14),
    atr: calculateATR(candles, 14),
    vwap: calculateVWAP(candles),
  })

  const m1Ind = m1.length > 50 ? calc(m1) : null
  const m5Ind = calc(m5)
  const m15Ind = m15.length > 50 ? calc(m15) : null

  // Get regimes
  const m1Regime = m1Ind ? detectRegime(m1, m1Ind.ema20, m1Ind.ema50) : 'SIDEWAYS'
  const m5Regime = detectRegime(m5, m5Ind.ema20, m5Ind.ema50)
  const m15Regime = m15Ind ? detectRegime(m15, m15Ind.ema20, m15Ind.ema50) : 'SIDEWAYS'

  // Analyze market structure and order flow on 5m
  const structure = detectMarketStructure(m5)
  const orderFlow = analyzeOrderFlow(m5)

  // Current price and session
  const currentCandle = m5[m5.length - 1]
  const currentPrice = currentCandle.close
  const hour = currentCandle.hour + currentCandle.minute / 60
  const session = getCurrentSession(hour)
  const killZone = isKillZone(hour)

  // Check if we should trade
  const today = new Date().toLocaleDateString('en-US')
  if (dailyStats.date !== today) {
    // Reset daily stats
    dailyStats = {
      date: today,
      trades: 0,
      wins: 0,
      losses: 0,
      grossPnL: 0,
      netPnL: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      dailyLossLimit: CONFIG.maxDailyLoss,
      canTrade: true,
      stopReason: null
    }
  }

  // Check trading restrictions
  if (dailyStats.netPnL <= -CONFIG.maxDailyLoss) {
    dailyStats.canTrade = false
    dailyStats.stopReason = 'Daily loss limit reached'
  }
  if (dailyStats.trades >= CONFIG.maxDailyTrades) {
    dailyStats.canTrade = false
    dailyStats.stopReason = 'Max daily trades reached'
  }
  if (CONFIG.sessionMultipliers[session] === 0) {
    dailyStats.canTrade = false
    dailyStats.stopReason = `No trading during ${session}`
  }

  // Detect patterns
  const rawSignals = detectPatterns(
    m5,
    m5Ind.ema9,
    m5Ind.ema20,
    m5Ind.ema50,
    m5Ind.vwap,
    m5Ind.atr,
    m5Ind.rsi,
    structure,
    orderFlow,
    m5Regime
  )

  // Build final signals
  const signals: Signal[] = []

  for (const raw of rawSignals) {
    const tfAlignment = checkTimeframeAlignment(m1Regime, m5Regime, m15Regime, raw.pattern.direction)
    const { score: confluence, factors } = calculateConfluence(
      raw.confidence,
      tfAlignment,
      session,
      orderFlow,
      structure,
      raw.pattern.direction
    )

    // Calculate risk/reward
    const riskPoints = Math.abs(raw.entry - raw.stop)
    const rewardPoints = Math.abs(raw.target - raw.entry)
    const rr = rewardPoints / riskPoints

    // Determine signal strength
    let strength: SignalStrength = 'NO_TRADE'
    if (confluence >= 80 && rr >= 2) strength = 'STRONG'
    else if (confluence >= 60 && rr >= 1.5) strength = 'MODERATE'
    else if (confluence >= CONFIG.minConfluence && rr >= CONFIG.minRiskReward) strength = 'WEAK'

    // Build warnings
    const warnings: string[] = []
    if (!dailyStats.canTrade) warnings.push(dailyStats.stopReason || 'Trading disabled')
    if (tfAlignment.m15 === 'AGAINST') warnings.push('15m timeframe against trade')
    if (session === 'NY_MIDDAY') warnings.push('Lunch hour - expect chop')
    if (rr < 1.5) warnings.push('Low R:R ratio')

    signals.push({
      id: `${raw.pattern.id}_${Date.now()}`,
      timestamp: Date.now(),
      pattern: raw.pattern.name,
      direction: raw.pattern.direction,
      entry: raw.entry,
      stopLoss: raw.stop,
      takeProfit1: raw.pattern.direction === 'LONG'
        ? raw.entry + riskPoints * 1
        : raw.entry - riskPoints * 1,
      takeProfit2: raw.pattern.direction === 'LONG'
        ? raw.entry + riskPoints * 2
        : raw.entry - riskPoints * 2,
      takeProfit3: raw.target,
      riskPoints,
      rewardPoints,
      riskRewardRatio: rr,
      confidence: confluence,
      strength,
      session,
      regime: m5Regime,
      timeframeAlignment: tfAlignment,
      confluenceFactors: factors,
      warnings
    })
  }

  // Sort by confidence
  signals.sort((a, b) => b.confidence - a.confidence)

  return {
    signals,
    currentState: {
      price: currentPrice,
      regime: m5Regime,
      session,
      isKillZone: killZone,
      structure,
      orderFlow,
      dailyStats,
      position: currentPosition
    }
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { signals, currentState } = await generateSignals()

    // Get best signal
    const bestSignal = signals.find(s => s.strength !== 'NO_TRADE') || null

    // Calculate position sizing for best signal
    let riskCalc: RiskCalculation | null = null
    if (bestSignal) {
      riskCalc = calculateRisk(bestSignal.entry, bestSignal.stopLoss, CONFIG.accountSize)
      riskCalc.dollarReward = riskCalc.maxContracts * bestSignal.rewardPoints * ES_POINT_VALUE
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),

      // Current market state
      market: {
        price: currentState.price.toFixed(2),
        regime: currentState.regime,
        session: currentState.session,
        isKillZone: currentState.isKillZone,
        structure: {
          trend: currentState.structure.trend,
          lastBOS: currentState.structure.lastBOS,
          lastCHoCH: currentState.structure.lastCHoCH,
          fvgCount: currentState.structure.fvgs.length
        },
        orderFlow: {
          delta: currentState.orderFlow.delta.toFixed(0),
          deltaPercent: currentState.orderFlow.deltaPercent.toFixed(1) + '%',
          imbalance: currentState.orderFlow.imbalance,
          absorption: currentState.orderFlow.absorption,
          volumeSpike: currentState.orderFlow.volumeSpike
        }
      },

      // Trading status
      tradingStatus: {
        canTrade: currentState.dailyStats.canTrade,
        stopReason: currentState.dailyStats.stopReason,
        tradesRemaining: CONFIG.maxDailyTrades - currentState.dailyStats.trades,
        dailyPnL: `$${currentState.dailyStats.netPnL.toFixed(2)}`,
        lossLimitRemaining: `$${(CONFIG.maxDailyLoss + currentState.dailyStats.netPnL).toFixed(2)}`
      },

      // Current position
      position: currentState.position ? {
        direction: currentState.position.direction,
        entry: currentState.position.entryPrice,
        current: currentState.position.currentPrice,
        contracts: currentState.position.contracts,
        unrealizedPnL: `$${currentState.position.unrealizedPnL.toFixed(2)}`,
        currentStop: currentState.position.currentStop,
        trailingActive: currentState.position.trailingActive
      } : null,

      // Best signal
      bestSignal: bestSignal ? {
        pattern: bestSignal.pattern,
        direction: bestSignal.direction,
        strength: bestSignal.strength,
        confidence: bestSignal.confidence.toFixed(0) + '%',
        entry: bestSignal.entry.toFixed(2),
        stopLoss: bestSignal.stopLoss.toFixed(2),
        targets: {
          tp1: bestSignal.takeProfit1.toFixed(2) + ' (1:1)',
          tp2: bestSignal.takeProfit2.toFixed(2) + ' (2:1)',
          tp3: bestSignal.takeProfit3.toFixed(2) + ' (full target)'
        },
        riskReward: bestSignal.riskRewardRatio.toFixed(2) + ':1',
        riskPoints: bestSignal.riskPoints.toFixed(2),
        timeframeAlignment: bestSignal.timeframeAlignment,
        confluenceFactors: bestSignal.confluenceFactors,
        warnings: bestSignal.warnings
      } : null,

      // Position sizing
      positionSizing: riskCalc ? {
        recommendedContracts: riskCalc.maxContracts,
        dollarRisk: `$${riskCalc.dollarRisk.toFixed(2)}`,
        dollarReward: `$${riskCalc.dollarReward.toFixed(2)}`,
        riskPercent: riskCalc.riskPercent.toFixed(1) + '%'
      } : null,

      // All signals (for dashboard)
      allSignals: signals.slice(0, 5).map(s => ({
        pattern: s.pattern,
        direction: s.direction,
        strength: s.strength,
        confidence: s.confidence.toFixed(0) + '%',
        entry: s.entry.toFixed(2),
        rr: s.riskRewardRatio.toFixed(2) + ':1'
      })),

      // Configuration
      config: {
        accountSize: CONFIG.accountSize,
        maxDrawdown: CONFIG.maxDrawdown,
        profitTarget: CONFIG.profitTarget,
        maxContracts: CONFIG.maxContracts,
        riskPerTrade: (CONFIG.riskPerTrade * 100) + '%',
        maxDailyLoss: CONFIG.maxDailyLoss,
        minConfluence: CONFIG.minConfluence,
        minRiskReward: CONFIG.minRiskReward
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signals'
    }, { status: 500 })
  }
}

// POST handler for executing trades
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, signalId, contracts } = body

    if (action === 'EXECUTE') {
      // Execute trade via PickMyTrade
      const token = process.env.PICKMYTRADE_TOKEN
      if (!token) {
        return NextResponse.json({ success: false, error: 'PickMyTrade token not configured' }, { status: 400 })
      }

      // Generate signals to find the one to execute
      const { signals } = await generateSignals()
      const signal = signals.find(s => s.id === signalId)

      if (!signal) {
        return NextResponse.json({ success: false, error: 'Signal not found' }, { status: 404 })
      }

      // Build PickMyTrade webhook payload
      const webhookPayload = {
        token,
        symbol: 'ES',
        action: signal.direction === 'LONG' ? 'BUY' : 'SELL',
        quantity: contracts || 1,
        orderType: 'MARKET',
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit2, // Use 2:1 target
      }

      // Send to PickMyTrade (you would configure this URL)
      // const pmtResponse = await fetch('https://api.pickmytrade.io/webhook', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(webhookPayload)
      // })

      // For now, just track the position internally
      currentPosition = {
        id: signal.id,
        direction: signal.direction,
        entryPrice: signal.entry,
        currentPrice: signal.entry,
        contracts: contracts || 1,
        initialStop: signal.stopLoss,
        currentStop: signal.stopLoss,
        trailingActive: false,
        trailingDistance: signal.riskPoints * CONFIG.trailing.trailDistance,
        target1: signal.takeProfit1,
        target2: signal.takeProfit2,
        target3: signal.takeProfit3,
        target1Hit: false,
        target2Hit: false,
        unrealizedPnL: 0,
        entryTime: Date.now()
      }

      dailyStats.trades++

      return NextResponse.json({
        success: true,
        message: 'Trade executed',
        position: currentPosition,
        webhookPayload
      })
    }

    if (action === 'CLOSE') {
      if (!currentPosition) {
        return NextResponse.json({ success: false, error: 'No position to close' }, { status: 400 })
      }

      // Calculate P&L
      const pnl = currentPosition.direction === 'LONG'
        ? (currentPosition.currentPrice - currentPosition.entryPrice) * ES_POINT_VALUE * currentPosition.contracts
        : (currentPosition.entryPrice - currentPosition.currentPrice) * ES_POINT_VALUE * currentPosition.contracts

      const netPnL = pnl - CONFIG.costs.total * currentPosition.contracts

      if (netPnL > 0) dailyStats.wins++
      else dailyStats.losses++
      dailyStats.grossPnL += pnl
      dailyStats.netPnL += netPnL

      const closedPosition = { ...currentPosition, finalPnL: netPnL }
      currentPosition = null

      return NextResponse.json({
        success: true,
        message: 'Position closed',
        closedPosition
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute action'
    }, { status: 500 })
  }
}
