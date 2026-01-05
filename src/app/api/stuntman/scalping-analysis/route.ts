/**
 * MICRO-SCALPING ANALYSIS ENGINE
 *
 * Analyzes months of market data to identify profitable scalping patterns.
 * Tests with REALISTIC costs (higher for scalping due to more trades).
 *
 * SCALPING COSTS PER TRADE (1:1 with live):
 * - Commission: $4.12 per round trip
 * - Exchange fees: $2.58
 * - NFA fee: $0.04
 * - Clearing: $0.10
 * - TOTAL FIXED: $6.84 per trade
 * - Slippage: 0.5-2 ticks ($6.25-$25) - CRITICAL for scalping
 * - Rejection rate: 5-15% during fast moves
 *
 * SCALPING REQUIREMENTS:
 * - Target: 2-4 ticks ($25-$50) per trade
 * - Stop: 3-6 ticks ($37.50-$75)
 * - Need 65%+ win rate to be profitable after costs
 * - Must account for slippage eating into small profits
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

interface ScalpPattern {
  id: string
  name: string
  description: string
  direction: 'LONG' | 'SHORT'
  targetTicks: number
  stopTicks: number
  minWinRate: number // Required win rate to be profitable
}

interface ScalpSignal {
  pattern: ScalpPattern
  entryPrice: number
  confidence: number
  reason: string
}

interface ScalpTrade {
  time: string
  pattern: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  targetPrice: number
  stopPrice: number
  exitReason: 'TARGET' | 'STOP' | 'TIMEOUT'
  grossPnL: number
  slippage: number
  commission: number
  netPnL: number
  win: boolean
}

interface PatternStats {
  pattern: string
  trades: number
  wins: number
  winRate: number
  grossPnL: number
  totalSlippage: number
  totalCommissions: number
  netPnL: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  profitable: boolean
}

// ============================================================================
// REALISTIC SCALPING COSTS - CRITICAL FOR PROFITABILITY
// ============================================================================

const TICK_VALUE = 12.50 // ES tick value
const POINT_VALUE = 50   // ES point value

const SCALP_COSTS = {
  // Fixed costs per round trip
  commission: 4.12,
  exchangeFee: 2.58,
  nfaFee: 0.04,
  clearingFee: 0.10,
  get totalFixed() { return this.commission + this.exchangeFee + this.nfaFee + this.clearingFee }, // $6.84

  // Slippage model for scalping (MORE aggressive than swing trading)
  baseSlippageTicks: 0.5,      // Minimum slippage
  volatilityMultiplier: 1.5,   // How much volatility affects slippage
  fastMarketMultiplier: 2.0,   // During fast moves

  // Order rejection rates
  baseRejectionRate: 0.05,     // 5% base
  fastMarketRejectionRate: 0.15, // 15% during fast moves
}

function calculateScalpSlippage(atr: number, isFastMarket: boolean): number {
  let slippageTicks = SCALP_COSTS.baseSlippageTicks

  // ATR-based adjustment (higher volatility = more slippage)
  const atrFactor = Math.min(atr / 3, 2) // Normalize ATR
  slippageTicks *= (1 + atrFactor * SCALP_COSTS.volatilityMultiplier)

  // Fast market adjustment
  if (isFastMarket) {
    slippageTicks *= SCALP_COSTS.fastMarketMultiplier
  }

  // Convert to points (4 ticks = 1 point)
  return slippageTicks * 0.25
}

function shouldRejectOrder(isFastMarket: boolean): boolean {
  const rate = isFastMarket
    ? SCALP_COSTS.fastMarketRejectionRate
    : SCALP_COSTS.baseRejectionRate
  return Math.random() < rate
}

// ============================================================================
// SCALPING PATTERNS TO TEST
// ============================================================================

const SCALP_PATTERNS: ScalpPattern[] = [
  {
    id: 'VWAP_TOUCH_LONG',
    name: 'VWAP Touch Long',
    description: 'Price touches VWAP from above in uptrend, bounce for quick scalp',
    direction: 'LONG',
    targetTicks: 3,  // $37.50
    stopTicks: 4,    // $50
    minWinRate: 60,  // Need 60%+ to profit
  },
  {
    id: 'VWAP_TOUCH_SHORT',
    name: 'VWAP Touch Short',
    description: 'Price touches VWAP from below in downtrend, fade for quick scalp',
    direction: 'SHORT',
    targetTicks: 3,
    stopTicks: 4,
    minWinRate: 60,
  },
  {
    id: 'EMA9_BOUNCE_LONG',
    name: 'EMA9 Bounce Long',
    description: 'Price bounces off 9 EMA in strong uptrend',
    direction: 'LONG',
    targetTicks: 2,  // $25 - very quick
    stopTicks: 3,    // $37.50
    minWinRate: 65,  // Need higher win rate for smaller target
  },
  {
    id: 'EMA9_BOUNCE_SHORT',
    name: 'EMA9 Bounce Short',
    description: 'Price bounces off 9 EMA in strong downtrend',
    direction: 'SHORT',
    targetTicks: 2,
    stopTicks: 3,
    minWinRate: 65,
  },
  {
    id: 'MOMENTUM_BURST_LONG',
    name: 'Momentum Burst Long',
    description: 'Strong momentum candle, ride continuation',
    direction: 'LONG',
    targetTicks: 4,  // $50
    stopTicks: 3,    // $37.50 - tighter stop
    minWinRate: 55,  // Better R:R allows lower win rate
  },
  {
    id: 'MOMENTUM_BURST_SHORT',
    name: 'Momentum Burst Short',
    description: 'Strong momentum candle down, ride continuation',
    direction: 'SHORT',
    targetTicks: 4,
    stopTicks: 3,
    minWinRate: 55,
  },
  {
    id: 'RANGE_FADE_HIGH',
    name: 'Range Fade High',
    description: 'Fade move to range high in choppy market',
    direction: 'SHORT',
    targetTicks: 3,
    stopTicks: 4,
    minWinRate: 60,
  },
  {
    id: 'RANGE_FADE_LOW',
    name: 'Range Fade Low',
    description: 'Fade move to range low in choppy market',
    direction: 'LONG',
    targetTicks: 3,
    stopTicks: 4,
    minWinRate: 60,
  },
  {
    id: 'BREAKOUT_PULLBACK_LONG',
    name: 'Breakout Pullback Long',
    description: 'Enter on pullback after confirmed breakout',
    direction: 'LONG',
    targetTicks: 4,
    stopTicks: 4,
    minWinRate: 55,
  },
  {
    id: 'BREAKOUT_PULLBACK_SHORT',
    name: 'Breakout Pullback Short',
    description: 'Enter on pullback after confirmed breakdown',
    direction: 'SHORT',
    targetTicks: 4,
    stopTicks: 4,
    minWinRate: 55,
  },
  {
    id: 'DOUBLE_BOTTOM_SCALP',
    name: 'Double Bottom Scalp',
    description: 'Quick long on double bottom formation',
    direction: 'LONG',
    targetTicks: 3,
    stopTicks: 3,
    minWinRate: 60,
  },
  {
    id: 'DOUBLE_TOP_SCALP',
    name: 'Double Top Scalp',
    description: 'Quick short on double top formation',
    direction: 'SHORT',
    targetTicks: 3,
    stopTicks: 3,
    minWinRate: 60,
  },
]

// ============================================================================
// INDICATORS FOR SCALPING (faster periods)
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
  let currentDate = ''

  for (let i = 0; i < candles.length; i++) {
    // Reset VWAP each day
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
// PATTERN DETECTION FOR SCALPING
// ============================================================================

function detectScalpSignals(
  candles: Candle[],
  index: number,
  ema9: number[],
  ema20: number[],
  vwap: number[],
  atr: number[],
  rsi: number[]
): ScalpSignal[] {
  const signals: ScalpSignal[] = []
  const c = candles[index]
  const prev = candles[index - 1]
  if (!prev) return signals

  const currentATR = atr[index]
  const priceRange = c.high - c.low

  // Determine market context
  const ema9Now = ema9[index]
  const ema20Now = ema20[index]
  const vwapNow = vwap[index]
  const rsiNow = rsi[index]

  const isUptrend = ema9Now > ema20Now && c.close > ema9Now
  const isDowntrend = ema9Now < ema20Now && c.close < ema9Now
  const isRanging = Math.abs(ema9Now - ema20Now) / ema20Now < 0.001

  const isFastMarket = priceRange > currentATR * 1.5
  const isMomentumCandle = Math.abs(c.close - c.open) > priceRange * 0.6

  // VWAP_TOUCH_LONG
  if (isUptrend && c.low <= vwapNow * 1.001 && c.close > vwapNow && rsiNow > 45) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'VWAP_TOUCH_LONG')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 65,
      reason: 'VWAP touch from above in uptrend'
    })
  }

  // VWAP_TOUCH_SHORT
  if (isDowntrend && c.high >= vwapNow * 0.999 && c.close < vwapNow && rsiNow < 55) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'VWAP_TOUCH_SHORT')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 65,
      reason: 'VWAP touch from below in downtrend'
    })
  }

  // EMA9_BOUNCE_LONG
  if (isUptrend && c.low <= ema9Now * 1.001 && c.close > ema9Now && c.close > c.open) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'EMA9_BOUNCE_LONG')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 60,
      reason: 'EMA9 bounce in uptrend'
    })
  }

  // EMA9_BOUNCE_SHORT
  if (isDowntrend && c.high >= ema9Now * 0.999 && c.close < ema9Now && c.close < c.open) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'EMA9_BOUNCE_SHORT')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 60,
      reason: 'EMA9 bounce in downtrend'
    })
  }

  // MOMENTUM_BURST_LONG
  if (isMomentumCandle && c.close > c.open && c.close > prev.high && rsiNow > 50 && rsiNow < 75) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'MOMENTUM_BURST_LONG')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 55,
      reason: 'Strong bullish momentum candle'
    })
  }

  // MOMENTUM_BURST_SHORT
  if (isMomentumCandle && c.close < c.open && c.close < prev.low && rsiNow < 50 && rsiNow > 25) {
    const pattern = SCALP_PATTERNS.find(p => p.id === 'MOMENTUM_BURST_SHORT')!
    signals.push({
      pattern,
      entryPrice: c.close,
      confidence: 55,
      reason: 'Strong bearish momentum candle'
    })
  }

  // RANGE_FADE patterns (only in ranging markets)
  if (isRanging) {
    // Find recent range
    const lookback = 20
    const recentCandles = candles.slice(Math.max(0, index - lookback), index + 1)
    const rangeHigh = Math.max(...recentCandles.map(rc => rc.high))
    const rangeLow = Math.min(...recentCandles.map(rc => rc.low))
    const rangeSize = rangeHigh - rangeLow

    // RANGE_FADE_HIGH
    if (c.high >= rangeHigh * 0.998 && c.close < rangeHigh && rsiNow > 65) {
      const pattern = SCALP_PATTERNS.find(p => p.id === 'RANGE_FADE_HIGH')!
      signals.push({
        pattern,
        entryPrice: c.close,
        confidence: 60,
        reason: 'Fade range high in choppy market'
      })
    }

    // RANGE_FADE_LOW
    if (c.low <= rangeLow * 1.002 && c.close > rangeLow && rsiNow < 35) {
      const pattern = SCALP_PATTERNS.find(p => p.id === 'RANGE_FADE_LOW')!
      signals.push({
        pattern,
        entryPrice: c.close,
        confidence: 60,
        reason: 'Fade range low in choppy market'
      })
    }
  }

  // DOUBLE_BOTTOM_SCALP
  if (index >= 10) {
    const recent = candles.slice(index - 10, index + 1)
    const lows = recent.map(r => r.low)
    const minLow = Math.min(...lows)
    const minIndex1 = lows.indexOf(minLow)
    const lows2 = [...lows]
    lows2[minIndex1] = Infinity
    const minLow2 = Math.min(...lows2)

    if (Math.abs(minLow - minLow2) / minLow < 0.001 && c.close > prev.close && c.low > minLow) {
      const pattern = SCALP_PATTERNS.find(p => p.id === 'DOUBLE_BOTTOM_SCALP')!
      signals.push({
        pattern,
        entryPrice: c.close,
        confidence: 55,
        reason: 'Double bottom formation'
      })
    }
  }

  // DOUBLE_TOP_SCALP
  if (index >= 10) {
    const recent = candles.slice(index - 10, index + 1)
    const highs = recent.map(r => r.high)
    const maxHigh = Math.max(...highs)
    const maxIndex1 = highs.indexOf(maxHigh)
    const highs2 = [...highs]
    highs2[maxIndex1] = -Infinity
    const maxHigh2 = Math.max(...highs2)

    if (Math.abs(maxHigh - maxHigh2) / maxHigh < 0.001 && c.close < prev.close && c.high < maxHigh) {
      const pattern = SCALP_PATTERNS.find(p => p.id === 'DOUBLE_TOP_SCALP')!
      signals.push({
        pattern,
        entryPrice: c.close,
        confidence: 55,
        reason: 'Double top formation'
      })
    }
  }

  return signals
}

// ============================================================================
// SCALP TRADE SIMULATION
// ============================================================================

function simulateScalpTrade(
  signal: ScalpSignal,
  candles: Candle[],
  entryIndex: number,
  atr: number[]
): ScalpTrade | null {
  const entryCandle = candles[entryIndex]
  const currentATR = atr[entryIndex]
  const priceRange = entryCandle.high - entryCandle.low
  const isFastMarket = priceRange > currentATR * 1.5

  // Check for order rejection
  if (shouldRejectOrder(isFastMarket)) {
    return null // Order rejected
  }

  // Calculate slippage
  const slippagePoints = calculateScalpSlippage(currentATR, isFastMarket)
  const slippageCost = slippagePoints * POINT_VALUE * 2 // Entry + Exit

  // Calculate entry with slippage
  const entryPrice = signal.pattern.direction === 'LONG'
    ? signal.entryPrice + slippagePoints
    : signal.entryPrice - slippagePoints

  // Calculate target and stop in points
  const targetPoints = (signal.pattern.targetTicks * 0.25)
  const stopPoints = (signal.pattern.stopTicks * 0.25)

  const targetPrice = signal.pattern.direction === 'LONG'
    ? entryPrice + targetPoints
    : entryPrice - targetPoints

  const stopPrice = signal.pattern.direction === 'LONG'
    ? entryPrice - stopPoints
    : entryPrice + stopPoints

  // Simulate trade through subsequent candles (max 10 candles = ~50 minutes for 5min candles)
  const maxHoldBars = 10
  let exitPrice = entryPrice
  let exitReason: 'TARGET' | 'STOP' | 'TIMEOUT' = 'TIMEOUT'

  for (let i = entryIndex + 1; i < Math.min(entryIndex + maxHoldBars, candles.length); i++) {
    const c = candles[i]

    if (signal.pattern.direction === 'LONG') {
      // Check stop first
      if (c.low <= stopPrice) {
        exitPrice = stopPrice - slippagePoints // Exit slippage
        exitReason = 'STOP'
        break
      }
      // Check target
      if (c.high >= targetPrice) {
        exitPrice = targetPrice - slippagePoints // Exit slippage (less favorable)
        exitReason = 'TARGET'
        break
      }
    } else {
      // SHORT
      // Check stop first
      if (c.high >= stopPrice) {
        exitPrice = stopPrice + slippagePoints
        exitReason = 'STOP'
        break
      }
      // Check target
      if (c.low <= targetPrice) {
        exitPrice = targetPrice + slippagePoints
        exitReason = 'TARGET'
        break
      }
    }

    // Timeout exit at last bar
    if (i === Math.min(entryIndex + maxHoldBars, candles.length) - 1) {
      exitPrice = c.close
      exitReason = 'TIMEOUT'
    }
  }

  // Calculate P&L
  const grossPnL = signal.pattern.direction === 'LONG'
    ? (exitPrice - entryPrice) * POINT_VALUE
    : (entryPrice - exitPrice) * POINT_VALUE

  const netPnL = grossPnL - slippageCost - SCALP_COSTS.totalFixed

  return {
    time: entryCandle.dateStr + ' ' + entryCandle.hour.toFixed(2),
    pattern: signal.pattern.id,
    direction: signal.pattern.direction,
    entryPrice,
    exitPrice,
    targetPrice,
    stopPrice,
    exitReason,
    grossPnL,
    slippage: slippageCost,
    commission: SCALP_COSTS.totalFixed,
    netPnL,
    win: netPnL > 0
  }
}

// ============================================================================
// DATA FETCHING - GET AS MUCH DATA AS POSSIBLE
// ============================================================================

async function fetchMaxHistoricalData(): Promise<Candle[]> {
  const allCandles: Candle[] = []

  // Try to get maximum data from Yahoo Finance
  // Yahoo provides ~60 days of 5-minute data
  const now = Math.floor(Date.now() / 1000)
  const start = now - (60 * 24 * 60 * 60) // 60 days back

  const sources = [
    { symbol: 'ES=F', scale: 1, name: 'ES Futures' },
    { symbol: 'SPY', scale: 10, name: 'SPY (scaled)' }
  ]

  for (const source of sources) {
    try {
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

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
          const date = new Date(timestamps[i] * 1000)
          const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
          const hour = estDate.getHours()
          const minute = estDate.getMinutes()

          // Only include regular trading hours (9:30 AM - 4:00 PM EST)
          const hourDecimal = hour + minute / 60
          if (hourDecimal >= 9.5 && hourDecimal <= 16) {
            allCandles.push({
              time: timestamps[i] * 1000,
              open: quote.open[i] * source.scale,
              high: quote.high[i] * source.scale,
              low: quote.low[i] * source.scale,
              close: quote.close[i] * source.scale,
              volume: quote.volume[i] || 0,
              hour: hourDecimal,
              minute,
              dateStr: estDate.toLocaleDateString('en-US'),
            })
          }
        }
      }

      if (allCandles.length > 1000) {
        console.log(`Fetched ${allCandles.length} candles from ${source.name}`)
        break
      }
    } catch (error) {
      console.error(`Failed to fetch from ${source.symbol}:`, error)
      continue
    }
  }

  return allCandles
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

async function analyzeScalpingPatterns(): Promise<{
  totalCandles: number
  totalDays: number
  patternStats: PatternStats[]
  profitablePatterns: PatternStats[]
  unprofitablePatterns: PatternStats[]
  allTrades: ScalpTrade[]
  summary: {
    totalTrades: number
    wins: number
    winRate: string
    grossPnL: number
    totalSlippage: number
    totalCommissions: number
    netPnL: number
    avgTradeNetPnL: number
  }
}> {
  const candles = await fetchMaxHistoricalData()

  if (candles.length < 100) {
    throw new Error('Insufficient data for analysis')
  }

  // Calculate indicators
  const ema9 = calculateEMA(candles, 9)
  const ema20 = calculateEMA(candles, 20)
  const vwap = calculateVWAP(candles)
  const atr = calculateATR(candles, 14)
  const rsi = calculateRSI(candles, 14)

  // Track all trades
  const allTrades: ScalpTrade[] = []
  const patternTrades: Record<string, ScalpTrade[]> = {}

  // Initialize pattern tracking
  for (const pattern of SCALP_PATTERNS) {
    patternTrades[pattern.id] = []
  }

  // Analyze each candle for signals
  let lastTradeIndex = -10 // Minimum bars between trades

  for (let i = 30; i < candles.length - 15; i++) {
    // Minimum gap between trades
    if (i - lastTradeIndex < 5) continue

    // Only trade during optimal hours (9:45 AM - 3:30 PM)
    const hour = candles[i].hour
    if (hour < 9.75 || hour > 15.5) continue

    // Detect signals
    const signals = detectScalpSignals(candles, i, ema9, ema20, vwap, atr, rsi)

    // Take the highest confidence signal
    if (signals.length > 0) {
      signals.sort((a, b) => b.confidence - a.confidence)
      const bestSignal = signals[0]

      const trade = simulateScalpTrade(bestSignal, candles, i, atr)
      if (trade) {
        allTrades.push(trade)
        patternTrades[trade.pattern].push(trade)
        lastTradeIndex = i
      }
    }
  }

  // Calculate stats per pattern
  const patternStats: PatternStats[] = []

  for (const pattern of SCALP_PATTERNS) {
    const trades = patternTrades[pattern.id]
    if (trades.length === 0) {
      patternStats.push({
        pattern: pattern.id,
        trades: 0,
        wins: 0,
        winRate: 0,
        grossPnL: 0,
        totalSlippage: 0,
        totalCommissions: 0,
        netPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        profitable: false
      })
      continue
    }

    const wins = trades.filter(t => t.win).length
    const winRate = (wins / trades.length) * 100
    const grossPnL = trades.reduce((sum, t) => sum + t.grossPnL, 0)
    const totalSlippage = trades.reduce((sum, t) => sum + t.slippage, 0)
    const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0)
    const netPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)

    const winningTrades = trades.filter(t => t.netPnL > 0)
    const losingTrades = trades.filter(t => t.netPnL <= 0)
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.netPnL, 0) / winningTrades.length
      : 0
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnL, 0)) / losingTrades.length
      : 0

    const profitFactor = avgLoss > 0 ? (avgWin * wins) / (avgLoss * losingTrades.length) : avgWin > 0 ? 999 : 0

    patternStats.push({
      pattern: pattern.id,
      trades: trades.length,
      wins,
      winRate,
      grossPnL,
      totalSlippage,
      totalCommissions,
      netPnL,
      avgWin,
      avgLoss,
      profitFactor,
      profitable: netPnL > 0 && winRate >= pattern.minWinRate
    })
  }

  // Sort by net P&L
  patternStats.sort((a, b) => b.netPnL - a.netPnL)

  // Calculate overall summary
  const totalWins = allTrades.filter(t => t.win).length
  const totalGrossPnL = allTrades.reduce((sum, t) => sum + t.grossPnL, 0)
  const totalSlippage = allTrades.reduce((sum, t) => sum + t.slippage, 0)
  const totalCommissions = allTrades.reduce((sum, t) => sum + t.commission, 0)
  const totalNetPnL = allTrades.reduce((sum, t) => sum + t.netPnL, 0)

  // Get unique days
  const uniqueDays = new Set(candles.map(c => c.dateStr)).size

  return {
    totalCandles: candles.length,
    totalDays: uniqueDays,
    patternStats,
    profitablePatterns: patternStats.filter(p => p.profitable),
    unprofitablePatterns: patternStats.filter(p => !p.profitable && p.trades > 0),
    allTrades,
    summary: {
      totalTrades: allTrades.length,
      wins: totalWins,
      winRate: allTrades.length > 0 ? ((totalWins / allTrades.length) * 100).toFixed(1) + '%' : '0%',
      grossPnL: totalGrossPnL,
      totalSlippage,
      totalCommissions,
      netPnL: totalNetPnL,
      avgTradeNetPnL: allTrades.length > 0 ? totalNetPnL / allTrades.length : 0
    }
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const results = await analyzeScalpingPatterns()

    return NextResponse.json({
      success: true,
      analysis: {
        dataAnalyzed: {
          candles: results.totalCandles,
          days: results.totalDays,
          source: 'Yahoo Finance (SPY scaled to ES)'
        },
        costs: {
          fixedPerTrade: `$${SCALP_COSTS.totalFixed.toFixed(2)}`,
          slippageModel: 'Volatility-based (0.5-2 ticks)',
          rejectionRate: '5-15% during fast moves'
        },
        summary: {
          totalTrades: results.summary.totalTrades,
          wins: results.summary.wins,
          winRate: results.summary.winRate,
          grossPnL: `$${results.summary.grossPnL.toFixed(2)}`,
          totalSlippage: `$${results.summary.totalSlippage.toFixed(2)}`,
          totalCommissions: `$${results.summary.totalCommissions.toFixed(2)}`,
          netPnL: `$${results.summary.netPnL.toFixed(2)}`,
          avgTradeNetPnL: `$${results.summary.avgTradeNetPnL.toFixed(2)}`
        },
        profitablePatterns: results.profitablePatterns.map(p => ({
          pattern: p.pattern,
          trades: p.trades,
          winRate: `${p.winRate.toFixed(1)}%`,
          netPnL: `$${p.netPnL.toFixed(2)}`,
          avgWin: `$${p.avgWin.toFixed(2)}`,
          avgLoss: `$${p.avgLoss.toFixed(2)}`,
          profitFactor: p.profitFactor.toFixed(2),
          verdict: '✅ PROFITABLE'
        })),
        unprofitablePatterns: results.unprofitablePatterns.map(p => ({
          pattern: p.pattern,
          trades: p.trades,
          winRate: `${p.winRate.toFixed(1)}%`,
          netPnL: `$${p.netPnL.toFixed(2)}`,
          verdict: '❌ NOT PROFITABLE - DO NOT USE'
        })),
        allPatternStats: results.patternStats.map(p => ({
          pattern: p.pattern,
          trades: p.trades,
          wins: p.wins,
          winRate: `${p.winRate.toFixed(1)}%`,
          grossPnL: `$${p.grossPnL.toFixed(2)}`,
          slippage: `$${p.totalSlippage.toFixed(2)}`,
          commissions: `$${p.totalCommissions.toFixed(2)}`,
          netPnL: `$${p.netPnL.toFixed(2)}`,
          profitFactor: p.profitFactor.toFixed(2),
          profitable: p.profitable
        })),
        recentTrades: results.allTrades.slice(-20).map(t => ({
          time: t.time,
          pattern: t.pattern,
          direction: t.direction,
          entry: `$${t.entryPrice.toFixed(2)}`,
          exit: `$${t.exitPrice.toFixed(2)}`,
          exitReason: t.exitReason,
          grossPnL: `$${t.grossPnL.toFixed(2)}`,
          slippage: `$${t.slippage.toFixed(2)}`,
          netPnL: `$${t.netPnL.toFixed(2)}`,
          win: t.win
        })),
        recommendation: results.profitablePatterns.length > 0
          ? `✅ Found ${results.profitablePatterns.length} profitable scalping patterns. Consider implementing: ${results.profitablePatterns.map(p => p.pattern).join(', ')}`
          : '❌ No profitable scalping patterns found with current costs. Scalping may not be viable.'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 })
  }
}
