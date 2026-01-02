// =============================================================================
// PROFESSIONAL SIGNAL ENGINE - INSTITUTIONAL GRADE
// =============================================================================
// Multi-indicator confluence system with advanced risk management
// Built for real money trading on prop firm accounts
// =============================================================================

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketRegime {
  type: 'STRONG_TREND_UP' | 'TREND_UP' | 'RANGING' | 'TREND_DOWN' | 'STRONG_TREND_DOWN'
  strength: number // 0-100
  volatility: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
  atr: number
  adx: number
}

export interface SignalResult {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number // 0-100
  strength: number // 0-100
  entryPrice: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
  positionSize: number // contracts
  reasoning: string[]
  indicators: {
    rsi: number
    macd: { value: number; signal: number; histogram: number }
    bollingerBands: { upper: number; middle: number; lower: number; percentB: number }
    atr: number
    adx: number
    ema9: number
    ema21: number
    ema50: number
    vwap: number
    volumeProfile: 'ABOVE_AVG' | 'NORMAL' | 'BELOW_AVG'
  }
  regime: MarketRegime
  timestamp: number
}

// =============================================================================
// TECHNICAL INDICATOR CALCULATIONS
// =============================================================================

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i])
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1])
    }
  }
  return result
}

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
  }
  return result
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50) // Default neutral
    } else {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period

      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        result.push(100 - (100 / (1 + rs)))
      }
    }
  }
  return result
}

export function calculateMACD(closes: number[], fast: number = 12, slow: number = 26, signal: number = 9): {
  macd: number[]
  signal: number[]
  histogram: number[]
} {
  const emaFast = calculateEMA(closes, fast)
  const emaSlow = calculateEMA(closes, slow)
  const macdLine = emaFast.map((f, i) => f - emaSlow[i])
  const signalLine = calculateEMA(macdLine, signal)
  const histogram = macdLine.map((m, i) => m - signalLine[i])

  return { macd: macdLine, signal: signalLine, histogram }
}

export function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): {
  upper: number[]
  middle: number[]
  lower: number[]
  percentB: number[]
} {
  const middle = calculateSMA(closes, period)
  const upper: number[] = []
  const lower: number[] = []
  const percentB: number[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN)
      lower.push(NaN)
      percentB.push(50)
    } else {
      const slice = closes.slice(i - period + 1, i + 1)
      const mean = middle[i]
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
      const std = Math.sqrt(variance)

      const upperBand = mean + stdDev * std
      const lowerBand = mean - stdDev * std

      upper.push(upperBand)
      lower.push(lowerBand)
      percentB.push(((closes[i] - lowerBand) / (upperBand - lowerBand)) * 100)
    }
  }

  return { upper, middle, lower, percentB }
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const trueRanges: number[] = []
  const atr: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low)
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
      trueRanges.push(tr)
    }
  }

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      atr.push(trueRanges.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1))
    } else if (i === period - 1) {
      atr.push(trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period)
    } else {
      atr.push((atr[i - 1] * (period - 1) + trueRanges[i]) / period)
    }
  }

  return atr
}

export function calculateADX(candles: Candle[], period: number = 14): number[] {
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      plusDM.push(0)
      minusDM.push(0)
      tr.push(candles[i].high - candles[i].low)
    } else {
      const upMove = candles[i].high - candles[i - 1].high
      const downMove = candles[i - 1].low - candles[i].low

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
      tr.push(Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      ))
    }
  }

  const smoothedTR = calculateEMA(tr, period)
  const smoothedPlusDM = calculateEMA(plusDM, period)
  const smoothedMinusDM = calculateEMA(minusDM, period)

  const plusDI = smoothedPlusDM.map((dm, i) => (dm / smoothedTR[i]) * 100)
  const minusDI = smoothedMinusDM.map((dm, i) => (dm / smoothedTR[i]) * 100)

  const dx = plusDI.map((plus, i) => {
    const sum = plus + minusDI[i]
    return sum === 0 ? 0 : (Math.abs(plus - minusDI[i]) / sum) * 100
  })

  return calculateEMA(dx, period)
}

export function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = []
  let cumulativeTPV = 0
  let cumulativeVolume = 0

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    cumulativeTPV += typicalPrice * candle.volume
    cumulativeVolume += candle.volume
    vwap.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice)
  }

  return vwap
}

// =============================================================================
// MARKET REGIME DETECTION
// =============================================================================

export function detectMarketRegime(candles: Candle[]): MarketRegime {
  const closes = candles.map(c => c.close)
  const atr = calculateATR(candles, 14)
  const adx = calculateADX(candles, 14)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)

  const currentATR = atr[atr.length - 1]
  const avgATR = atr.slice(-20).reduce((a, b) => a + b, 0) / 20
  const currentADX = adx[adx.length - 1]
  const currentPrice = closes[closes.length - 1]
  const currentEMA20 = ema20[ema20.length - 1]
  const currentEMA50 = ema50[ema50.length - 1]

  // Determine volatility
  let volatility: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
  const volatilityRatio = currentATR / avgATR
  if (volatilityRatio < 0.7) volatility = 'LOW'
  else if (volatilityRatio < 1.3) volatility = 'NORMAL'
  else if (volatilityRatio < 2) volatility = 'HIGH'
  else volatility = 'EXTREME'

  // Determine trend
  let type: MarketRegime['type']
  const emaSpread = ((currentEMA20 - currentEMA50) / currentEMA50) * 100

  if (currentADX > 40) {
    type = emaSpread > 0 ? 'STRONG_TREND_UP' : 'STRONG_TREND_DOWN'
  } else if (currentADX > 25) {
    type = emaSpread > 0 ? 'TREND_UP' : 'TREND_DOWN'
  } else {
    type = 'RANGING'
  }

  return {
    type,
    strength: Math.min(100, currentADX * 2),
    volatility,
    atr: currentATR,
    adx: currentADX
  }
}

// =============================================================================
// SIGNAL GENERATION - MULTI-INDICATOR CONFLUENCE
// =============================================================================

export function generateProfessionalSignal(
  candles: Candle[],
  accountBalance: number,
  maxRiskPercent: number = 1.5,
  maxContracts: number = 17,
  tickValue: number = 12.50 // MES tick value
): SignalResult {
  if (candles.length < 50) {
    return createHoldSignal('Insufficient data for analysis')
  }

  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const volumes = candles.map(c => c.volume)
  const currentPrice = closes[closes.length - 1]

  // Calculate all indicators
  const rsi = calculateRSI(closes, 14)
  const macd = calculateMACD(closes, 12, 26, 9)
  const bb = calculateBollingerBands(closes, 20, 2)
  const atr = calculateATR(candles, 14)
  const adx = calculateADX(candles, 14)
  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const ema50 = calculateEMA(closes, 50)
  const vwap = calculateVWAP(candles)

  // Current values
  const current = {
    rsi: rsi[rsi.length - 1],
    macd: {
      value: macd.macd[macd.macd.length - 1],
      signal: macd.signal[macd.signal.length - 1],
      histogram: macd.histogram[macd.histogram.length - 1]
    },
    bb: {
      upper: bb.upper[bb.upper.length - 1],
      middle: bb.middle[bb.middle.length - 1],
      lower: bb.lower[bb.lower.length - 1],
      percentB: bb.percentB[bb.percentB.length - 1]
    },
    atr: atr[atr.length - 1],
    adx: adx[adx.length - 1],
    ema9: ema9[ema9.length - 1],
    ema21: ema21[ema21.length - 1],
    ema50: ema50[ema50.length - 1],
    vwap: vwap[vwap.length - 1]
  }

  // Previous values for crossover detection
  const prev = {
    macdHistogram: macd.histogram[macd.histogram.length - 2],
    rsi: rsi[rsi.length - 2],
    ema9: ema9[ema9.length - 2],
    ema21: ema21[ema21.length - 2]
  }

  // Volume analysis
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const currentVolume = volumes[volumes.length - 1]
  const volumeProfile = currentVolume > avgVolume * 1.5 ? 'ABOVE_AVG' :
                        currentVolume < avgVolume * 0.5 ? 'BELOW_AVG' : 'NORMAL'

  // Market regime
  const regime = detectMarketRegime(candles)

  // ==========================================================================
  // SIGNAL SCORING SYSTEM
  // ==========================================================================

  let bullScore = 0
  let bearScore = 0
  const reasoning: string[] = []

  // 1. TREND ANALYSIS (Weight: 25%)
  if (currentPrice > current.ema21 && current.ema21 > current.ema50) {
    bullScore += 25
    reasoning.push('Price above EMAs - bullish structure')
  } else if (currentPrice < current.ema21 && current.ema21 < current.ema50) {
    bearScore += 25
    reasoning.push('Price below EMAs - bearish structure')
  }

  // 2. EMA CROSSOVER (Weight: 15%)
  if (prev.ema9 < prev.ema21 && current.ema9 > current.ema21) {
    bullScore += 15
    reasoning.push('EMA 9/21 bullish crossover')
  } else if (prev.ema9 > prev.ema21 && current.ema9 < current.ema21) {
    bearScore += 15
    reasoning.push('EMA 9/21 bearish crossover')
  }

  // 3. RSI ANALYSIS (Weight: 15%)
  if (current.rsi < 30) {
    bullScore += 15
    reasoning.push(`RSI oversold (${current.rsi.toFixed(1)})`)
  } else if (current.rsi > 70) {
    bearScore += 15
    reasoning.push(`RSI overbought (${current.rsi.toFixed(1)})`)
  } else if (current.rsi > 50 && current.rsi < 60) {
    bullScore += 5
  } else if (current.rsi < 50 && current.rsi > 40) {
    bearScore += 5
  }

  // RSI divergence detection
  const priceChange = currentPrice - closes[closes.length - 10]
  const rsiChange = current.rsi - rsi[rsi.length - 10]
  if (priceChange < 0 && rsiChange > 0 && current.rsi < 40) {
    bullScore += 10
    reasoning.push('Bullish RSI divergence detected')
  } else if (priceChange > 0 && rsiChange < 0 && current.rsi > 60) {
    bearScore += 10
    reasoning.push('Bearish RSI divergence detected')
  }

  // 4. MACD ANALYSIS (Weight: 15%)
  if (current.macd.histogram > 0 && prev.macdHistogram < 0) {
    bullScore += 15
    reasoning.push('MACD histogram turned positive')
  } else if (current.macd.histogram < 0 && prev.macdHistogram > 0) {
    bearScore += 15
    reasoning.push('MACD histogram turned negative')
  } else if (current.macd.histogram > prev.macdHistogram && current.macd.histogram > 0) {
    bullScore += 7
    reasoning.push('MACD momentum increasing')
  } else if (current.macd.histogram < prev.macdHistogram && current.macd.histogram < 0) {
    bearScore += 7
    reasoning.push('MACD momentum decreasing')
  }

  // 5. BOLLINGER BANDS (Weight: 10%)
  if (current.bb.percentB < 10) {
    bullScore += 10
    reasoning.push('Price at lower Bollinger Band - potential bounce')
  } else if (current.bb.percentB > 90) {
    bearScore += 10
    reasoning.push('Price at upper Bollinger Band - potential pullback')
  }

  // 6. VWAP ANALYSIS (Weight: 10%)
  if (currentPrice > current.vwap && currentPrice > current.ema21) {
    bullScore += 10
    reasoning.push('Price above VWAP - institutional buying')
  } else if (currentPrice < current.vwap && currentPrice < current.ema21) {
    bearScore += 10
    reasoning.push('Price below VWAP - institutional selling')
  }

  // 7. VOLUME CONFIRMATION (Weight: 10%)
  if (volumeProfile === 'ABOVE_AVG') {
    if (bullScore > bearScore) {
      bullScore += 10
      reasoning.push('Strong volume confirming bullish move')
    } else if (bearScore > bullScore) {
      bearScore += 10
      reasoning.push('Strong volume confirming bearish move')
    }
  }

  // 8. ADX TREND STRENGTH (Modifier)
  if (current.adx > 25) {
    const modifier = Math.min(1.3, 1 + (current.adx - 25) / 50)
    if (bullScore > bearScore) {
      bullScore = Math.round(bullScore * modifier)
      reasoning.push(`ADX ${current.adx.toFixed(1)} confirms trend strength`)
    } else {
      bearScore = Math.round(bearScore * modifier)
      reasoning.push(`ADX ${current.adx.toFixed(1)} confirms trend strength`)
    }
  }

  // ==========================================================================
  // SIGNAL DECISION
  // ==========================================================================

  const totalScore = bullScore + bearScore
  const netScore = bullScore - bearScore
  const confidence = Math.min(95, Math.abs(netScore))
  const strength = Math.min(100, Math.max(bullScore, bearScore))

  // Minimum threshold for trade
  const MIN_CONFIDENCE = 60
  const MIN_STRENGTH = 40

  let action: 'BUY' | 'SELL' | 'HOLD'
  if (netScore >= MIN_CONFIDENCE && strength >= MIN_STRENGTH) {
    action = 'BUY'
  } else if (netScore <= -MIN_CONFIDENCE && strength >= MIN_STRENGTH) {
    action = 'SELL'
  } else {
    action = 'HOLD'
    reasoning.push(`Confidence too low (${confidence}) or conflicting signals`)
  }

  // ==========================================================================
  // RISK MANAGEMENT - STOP LOSS & TAKE PROFIT
  // ==========================================================================

  const atrMultiplierSL = 2.0 // 2x ATR for stop loss
  const atrMultiplierTP = 3.0 // 3x ATR for take profit (1.5:1 R:R)

  let stopLoss: number
  let takeProfit: number

  if (action === 'BUY') {
    stopLoss = currentPrice - (current.atr * atrMultiplierSL)
    takeProfit = currentPrice + (current.atr * atrMultiplierTP)
  } else if (action === 'SELL') {
    stopLoss = currentPrice + (current.atr * atrMultiplierSL)
    takeProfit = currentPrice - (current.atr * atrMultiplierTP)
  } else {
    stopLoss = currentPrice
    takeProfit = currentPrice
  }

  const riskRewardRatio = atrMultiplierTP / atrMultiplierSL

  // ==========================================================================
  // POSITION SIZING - KELLY CRITERION MODIFIED
  // ==========================================================================

  const riskAmount = accountBalance * (maxRiskPercent / 100)
  const stopLossPoints = Math.abs(currentPrice - stopLoss)
  const stopLossTicks = stopLossPoints / 0.25 // ES/MES tick size
  const riskPerContract = stopLossTicks * tickValue

  let positionSize = Math.floor(riskAmount / riskPerContract)
  positionSize = Math.min(positionSize, maxContracts)
  positionSize = Math.max(positionSize, 1)

  // Reduce size in high volatility
  if (regime.volatility === 'HIGH') positionSize = Math.max(1, Math.floor(positionSize * 0.7))
  if (regime.volatility === 'EXTREME') positionSize = Math.max(1, Math.floor(positionSize * 0.5))

  // Reduce size for low confidence trades
  if (confidence < 70) positionSize = Math.max(1, Math.floor(positionSize * 0.5))

  return {
    action,
    confidence,
    strength,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    positionSize,
    reasoning,
    indicators: {
      rsi: current.rsi,
      macd: current.macd,
      bollingerBands: { ...current.bb, percentB: current.bb.percentB },
      atr: current.atr,
      adx: current.adx,
      ema9: current.ema9,
      ema21: current.ema21,
      ema50: current.ema50,
      vwap: current.vwap,
      volumeProfile
    },
    regime,
    timestamp: Date.now()
  }
}

function createHoldSignal(reason: string): SignalResult {
  return {
    action: 'HOLD',
    confidence: 0,
    strength: 0,
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    riskRewardRatio: 0,
    positionSize: 0,
    reasoning: [reason],
    indicators: {
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0, percentB: 50 },
      atr: 0,
      adx: 0,
      ema9: 0,
      ema21: 0,
      ema50: 0,
      vwap: 0,
      volumeProfile: 'NORMAL'
    },
    regime: {
      type: 'RANGING',
      strength: 0,
      volatility: 'NORMAL',
      atr: 0,
      adx: 0
    },
    timestamp: Date.now()
  }
}

// =============================================================================
// MULTI-TIMEFRAME ANALYSIS
// =============================================================================

export interface MultiTimeframeSignal {
  primary: SignalResult
  higher: SignalResult | null
  alignment: 'ALIGNED' | 'PARTIAL' | 'CONFLICTING'
  finalAction: 'BUY' | 'SELL' | 'HOLD'
  finalConfidence: number
}

export function analyzeMultiTimeframe(
  primaryCandles: Candle[],
  higherCandles: Candle[] | null,
  accountBalance: number,
  maxRiskPercent: number = 1.5,
  maxContracts: number = 17
): MultiTimeframeSignal {
  const primary = generateProfessionalSignal(primaryCandles, accountBalance, maxRiskPercent, maxContracts)

  if (!higherCandles || higherCandles.length < 50) {
    return {
      primary,
      higher: null,
      alignment: 'PARTIAL',
      finalAction: primary.action,
      finalConfidence: primary.confidence * 0.8
    }
  }

  const higher = generateProfessionalSignal(higherCandles, accountBalance, maxRiskPercent, maxContracts)

  let alignment: 'ALIGNED' | 'PARTIAL' | 'CONFLICTING'
  let finalConfidence: number
  let finalAction: 'BUY' | 'SELL' | 'HOLD'

  if (primary.action === higher.action && primary.action !== 'HOLD') {
    alignment = 'ALIGNED'
    finalConfidence = Math.min(95, (primary.confidence + higher.confidence) / 2 + 15)
    finalAction = primary.action
  } else if (primary.action === 'HOLD' || higher.action === 'HOLD') {
    alignment = 'PARTIAL'
    finalConfidence = primary.confidence * 0.7
    finalAction = primary.action
  } else {
    alignment = 'CONFLICTING'
    finalConfidence = 0
    finalAction = 'HOLD'
  }

  return {
    primary,
    higher,
    alignment,
    finalAction,
    finalConfidence
  }
}
