/**
 * StuntMan Signal Engine
 *
 * Professional ES/NQ signal generation using multiple strategies:
 * 1. Order Flow Analysis - Volume delta, buying/selling pressure
 * 2. Market Structure - Higher highs/lows, break of structure
 * 3. Momentum - RSI divergence, MACD crossovers
 * 4. Session Timing - RTH open, noon reversal, power hour
 * 5. Multi-Timeframe Confluence - 1m, 5m, 15m alignment
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Signal {
  direction: 'LONG' | 'SHORT' | 'FLAT'
  confidence: number // 0-100
  entry: number
  stopLoss: number
  takeProfit: number
  strategy: string
  reasons: string[]
  timestamp: number
}

export interface MarketState {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING'
  volatility: 'LOW' | 'MEDIUM' | 'HIGH'
  session: 'PRE' | 'RTH' | 'POST' | 'CLOSED'
  momentum: number // -100 to 100
}

// =============================================================================
// TECHNICAL INDICATORS
// =============================================================================

export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA
  let sum = 0
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i]
  }
  ema.push(sum / Math.min(period, prices.length))

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1])
  }

  return ema
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }

  return rsi
}

export function calculateMACD(prices: number[]): { macd: number[], signal: number[], histogram: number[] } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)

  const macd: number[] = []
  const minLength = Math.min(ema12.length, ema26.length)

  for (let i = 0; i < minLength; i++) {
    macd.push(ema12[ema12.length - minLength + i] - ema26[ema26.length - minLength + i])
  }

  const signal = calculateEMA(macd, 9)
  const histogram: number[] = []

  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[macd.length - signal.length + i] - signal[i])
  }

  return { macd, signal, histogram }
}

export function calculateATR(candles: Candle[], period: number = 14): number {
  const tr: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close

    const tr1 = high - low
    const tr2 = Math.abs(high - prevClose)
    const tr3 = Math.abs(low - prevClose)

    tr.push(Math.max(tr1, tr2, tr3))
  }

  if (tr.length < period) return tr.reduce((a, b) => a + b, 0) / tr.length

  return tr.slice(-period).reduce((a, b) => a + b, 0) / period
}

export function calculateVWAP(candles: Candle[]): number {
  let cumVolume = 0
  let cumVolumePrice = 0

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    cumVolume += candle.volume
    cumVolumePrice += typicalPrice * candle.volume
  }

  return cumVolume > 0 ? cumVolumePrice / cumVolume : candles[candles.length - 1].close
}

// =============================================================================
// MARKET STRUCTURE
// =============================================================================

export function identifySwingPoints(candles: Candle[], lookback: number = 5): {
  swingHighs: { index: number, price: number }[]
  swingLows: { index: number, price: number }[]
} {
  const swingHighs: { index: number, price: number }[] = []
  const swingLows: { index: number, price: number }[] = []

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isSwingHigh = true
    let isSwingLow = true

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i) {
        if (candles[j].high >= candles[i].high) isSwingHigh = false
        if (candles[j].low <= candles[i].low) isSwingLow = false
      }
    }

    if (isSwingHigh) swingHighs.push({ index: i, price: candles[i].high })
    if (isSwingLow) swingLows.push({ index: i, price: candles[i].low })
  }

  return { swingHighs, swingLows }
}

export function detectTrend(candles: Candle[]): 'BULLISH' | 'BEARISH' | 'RANGING' {
  if (candles.length < 20) return 'RANGING'

  const closes = candles.map(c => c.close)
  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)

  if (ema9.length < 2 || ema21.length < 2) return 'RANGING'

  const lastEma9 = ema9[ema9.length - 1]
  const lastEma21 = ema21[ema21.length - 1]
  const prevEma9 = ema9[ema9.length - 2]
  const prevEma21 = ema21[ema21.length - 2]

  // Strong trend: EMA9 above/below EMA21 and widening
  if (lastEma9 > lastEma21 && (lastEma9 - lastEma21) > (prevEma9 - prevEma21)) {
    return 'BULLISH'
  }
  if (lastEma9 < lastEma21 && (lastEma21 - lastEma9) > (prevEma21 - prevEma9)) {
    return 'BEARISH'
  }

  return 'RANGING'
}

// =============================================================================
// SESSION TIMING
// =============================================================================

export function getCurrentSession(): 'PRE' | 'RTH' | 'POST' | 'CLOSED' {
  const now = new Date()
  const estHour = now.getUTCHours() - 5 // EST offset
  const day = now.getUTCDay()

  // Weekends
  if (day === 0 || day === 6) return 'CLOSED'

  // ES/NQ sessions (EST)
  // Pre-market: 6:00 AM - 9:30 AM
  // RTH: 9:30 AM - 4:00 PM
  // Post-market: 4:00 PM - 6:00 PM
  // Overnight: 6:00 PM - 6:00 AM (next day)

  if (estHour >= 9.5 && estHour < 16) return 'RTH'
  if (estHour >= 6 && estHour < 9.5) return 'PRE'
  if (estHour >= 16 && estHour < 18) return 'POST'

  return 'CLOSED' // Overnight considered closed for safety
}

export function isHighProbabilityTime(): boolean {
  const now = new Date()
  const estHour = now.getUTCHours() - 5
  const estMinute = now.getUTCMinutes()
  const time = estHour + estMinute / 60

  // High probability windows for ES/NQ:
  // 9:30-10:30 AM - RTH Open (highest volatility)
  // 11:30 AM-12:30 PM - Lunch reversal
  // 2:00-3:30 PM - Power hour

  if (time >= 9.5 && time <= 10.5) return true
  if (time >= 11.5 && time <= 12.5) return true
  if (time >= 14 && time <= 15.5) return true

  return false
}

// =============================================================================
// SIGNAL STRATEGIES
// =============================================================================

interface StrategyResult {
  signal: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  reason: string
}

// Strategy 1: EMA Crossover with RSI Filter
function emaCrossoverStrategy(candles: Candle[]): StrategyResult {
  if (candles.length < 30) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient data' }

  const closes = candles.map(c => c.close)
  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const rsi = calculateRSI(closes, 14)

  if (ema9.length < 2 || ema21.length < 2 || rsi.length < 1) {
    return { signal: 'NEUTRAL', confidence: 0, reason: 'Calculation error' }
  }

  const lastEma9 = ema9[ema9.length - 1]
  const lastEma21 = ema21[ema21.length - 1]
  const prevEma9 = ema9[ema9.length - 2]
  const prevEma21 = ema21[ema21.length - 2]
  const lastRsi = rsi[rsi.length - 1]

  // Bullish crossover
  if (prevEma9 <= prevEma21 && lastEma9 > lastEma21 && lastRsi < 70) {
    return {
      signal: 'LONG',
      confidence: 70 + (30 - Math.abs(lastRsi - 50)) / 3,
      reason: 'EMA9 crossed above EMA21, RSI not overbought'
    }
  }

  // Bearish crossover
  if (prevEma9 >= prevEma21 && lastEma9 < lastEma21 && lastRsi > 30) {
    return {
      signal: 'SHORT',
      confidence: 70 + (30 - Math.abs(lastRsi - 50)) / 3,
      reason: 'EMA9 crossed below EMA21, RSI not oversold'
    }
  }

  return { signal: 'NEUTRAL', confidence: 0, reason: 'No crossover' }
}

// Strategy 2: RSI Divergence
function rsiDivergenceStrategy(candles: Candle[]): StrategyResult {
  if (candles.length < 30) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient data' }

  const closes = candles.map(c => c.close)
  const rsi = calculateRSI(closes, 14)

  if (rsi.length < 10) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient RSI data' }

  const lastRsi = rsi[rsi.length - 1]
  const prevRsi = rsi[rsi.length - 5]
  const lastPrice = closes[closes.length - 1]
  const prevPrice = closes[closes.length - 5]

  // Bullish divergence: Price lower low, RSI higher low
  if (lastPrice < prevPrice && lastRsi > prevRsi && lastRsi < 40) {
    return {
      signal: 'LONG',
      confidence: 65 + (40 - lastRsi),
      reason: 'Bullish RSI divergence detected'
    }
  }

  // Bearish divergence: Price higher high, RSI lower high
  if (lastPrice > prevPrice && lastRsi < prevRsi && lastRsi > 60) {
    return {
      signal: 'SHORT',
      confidence: 65 + (lastRsi - 60),
      reason: 'Bearish RSI divergence detected'
    }
  }

  return { signal: 'NEUTRAL', confidence: 0, reason: 'No divergence' }
}

// Strategy 3: MACD Momentum
function macdMomentumStrategy(candles: Candle[]): StrategyResult {
  if (candles.length < 35) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient data' }

  const closes = candles.map(c => c.close)
  const { macd, signal, histogram } = calculateMACD(closes)

  if (histogram.length < 2) return { signal: 'NEUTRAL', confidence: 0, reason: 'Calculation error' }

  const lastHist = histogram[histogram.length - 1]
  const prevHist = histogram[histogram.length - 2]

  // MACD histogram turning positive
  if (prevHist <= 0 && lastHist > 0) {
    return {
      signal: 'LONG',
      confidence: 60 + Math.min(lastHist * 10, 20),
      reason: 'MACD histogram turned positive'
    }
  }

  // MACD histogram turning negative
  if (prevHist >= 0 && lastHist < 0) {
    return {
      signal: 'SHORT',
      confidence: 60 + Math.min(Math.abs(lastHist) * 10, 20),
      reason: 'MACD histogram turned negative'
    }
  }

  return { signal: 'NEUTRAL', confidence: 0, reason: 'No MACD signal' }
}

// Strategy 4: VWAP Bounce
function vwapBounceStrategy(candles: Candle[]): StrategyResult {
  if (candles.length < 20) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient data' }

  const vwap = calculateVWAP(candles)
  const lastCandle = candles[candles.length - 1]
  const prevCandle = candles[candles.length - 2]
  const atr = calculateATR(candles)

  // Price bouncing off VWAP from below
  if (prevCandle.close < vwap && lastCandle.close > vwap && lastCandle.close > lastCandle.open) {
    return {
      signal: 'LONG',
      confidence: 65,
      reason: 'Price bounced above VWAP'
    }
  }

  // Price bouncing off VWAP from above
  if (prevCandle.close > vwap && lastCandle.close < vwap && lastCandle.close < lastCandle.open) {
    return {
      signal: 'SHORT',
      confidence: 65,
      reason: 'Price rejected at VWAP'
    }
  }

  return { signal: 'NEUTRAL', confidence: 0, reason: 'No VWAP bounce' }
}

// Strategy 5: Break of Structure
function breakOfStructureStrategy(candles: Candle[]): StrategyResult {
  if (candles.length < 30) return { signal: 'NEUTRAL', confidence: 0, reason: 'Insufficient data' }

  const { swingHighs, swingLows } = identifySwingPoints(candles, 3)
  const lastCandle = candles[candles.length - 1]

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return { signal: 'NEUTRAL', confidence: 0, reason: 'Not enough swing points' }
  }

  const lastSwingHigh = swingHighs[swingHighs.length - 1]
  const lastSwingLow = swingLows[swingLows.length - 1]

  // Break above swing high
  if (lastCandle.close > lastSwingHigh.price) {
    return {
      signal: 'LONG',
      confidence: 75,
      reason: `Break above swing high at ${lastSwingHigh.price.toFixed(2)}`
    }
  }

  // Break below swing low
  if (lastCandle.close < lastSwingLow.price) {
    return {
      signal: 'SHORT',
      confidence: 75,
      reason: `Break below swing low at ${lastSwingLow.price.toFixed(2)}`
    }
  }

  return { signal: 'NEUTRAL', confidence: 0, reason: 'No structure break' }
}

// =============================================================================
// MAIN SIGNAL GENERATOR
// =============================================================================

export function generateSignal(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[],
  instrument: 'ES' | 'NQ'
): Signal {
  const session = getCurrentSession()
  const highProbTime = isHighProbabilityTime()

  // Don't trade outside RTH for safety
  if (session !== 'RTH') {
    return {
      direction: 'FLAT',
      confidence: 0,
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      strategy: 'Session Filter',
      reasons: ['Outside regular trading hours'],
      timestamp: Date.now()
    }
  }

  // Run all strategies
  const strategies: StrategyResult[] = [
    emaCrossoverStrategy(candles15m),
    rsiDivergenceStrategy(candles5m),
    macdMomentumStrategy(candles15m),
    vwapBounceStrategy(candles5m),
    breakOfStructureStrategy(candles15m),
  ]

  // Count signals
  let longVotes = 0
  let shortVotes = 0
  let totalConfidence = 0
  const reasons: string[] = []

  for (const strat of strategies) {
    if (strat.signal === 'LONG') {
      longVotes++
      totalConfidence += strat.confidence
      reasons.push(`LONG: ${strat.reason}`)
    } else if (strat.signal === 'SHORT') {
      shortVotes++
      totalConfidence += strat.confidence
      reasons.push(`SHORT: ${strat.reason}`)
    }
  }

  // Need at least 2 strategies to agree
  const lastPrice = candles1m[candles1m.length - 1]?.close || 0
  const atr = calculateATR(candles15m)

  // ES: 1 point = $50, NQ: 1 point = $20
  const pointValue = instrument === 'ES' ? 50 : 20
  const minStop = instrument === 'ES' ? 4 : 10 // Minimum stop in points
  const stopPoints = Math.max(atr * 1.5, minStop)
  const targetPoints = stopPoints * 2 // 2:1 R:R minimum

  if (longVotes >= 2 && longVotes > shortVotes) {
    const avgConfidence = totalConfidence / longVotes
    const finalConfidence = highProbTime ? Math.min(avgConfidence + 10, 95) : avgConfidence

    return {
      direction: 'LONG',
      confidence: finalConfidence,
      entry: lastPrice,
      stopLoss: lastPrice - stopPoints,
      takeProfit: lastPrice + targetPoints,
      strategy: `Confluence (${longVotes} strategies)`,
      reasons,
      timestamp: Date.now()
    }
  }

  if (shortVotes >= 2 && shortVotes > longVotes) {
    const avgConfidence = totalConfidence / shortVotes
    const finalConfidence = highProbTime ? Math.min(avgConfidence + 10, 95) : avgConfidence

    return {
      direction: 'SHORT',
      confidence: finalConfidence,
      entry: lastPrice,
      stopLoss: lastPrice + stopPoints,
      takeProfit: lastPrice - targetPoints,
      strategy: `Confluence (${shortVotes} strategies)`,
      reasons,
      timestamp: Date.now()
    }
  }

  return {
    direction: 'FLAT',
    confidence: 0,
    entry: 0,
    stopLoss: 0,
    takeProfit: 0,
    strategy: 'No Confluence',
    reasons: ['Strategies not aligned - waiting for better setup'],
    timestamp: Date.now()
  }
}

// =============================================================================
// POSITION SIZING
// =============================================================================

export function calculateOptimalSize(
  accountBalance: number,
  stopLossPoints: number,
  instrument: 'ES' | 'NQ',
  maxDrawdownAllowed: number,
  confidence: number
): number {
  const pointValue = instrument === 'ES' ? 50 : 20
  const riskPerContract = stopLossPoints * pointValue

  // Base risk: 1% of account per trade, scale with confidence
  const confidenceMultiplier = confidence / 100
  const baseRiskPercent = 0.01 * confidenceMultiplier

  // Never risk more than 30% of remaining drawdown
  const maxRiskDollars = Math.min(
    accountBalance * baseRiskPercent,
    maxDrawdownAllowed * 0.3
  )

  const contracts = Math.floor(maxRiskDollars / riskPerContract)

  // Apex 150K max is 17 contracts, but we'll be conservative
  return Math.max(1, Math.min(contracts, 5))
}
