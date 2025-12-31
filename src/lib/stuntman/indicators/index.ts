// =============================================================================
// STUNTMAN AI - TECHNICAL INDICATORS
// =============================================================================
// Comprehensive technical analysis indicator library
// All calculations are performed in pure TypeScript with no external dependencies
// =============================================================================

import type { OHLCV } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export interface RSIResult {
  values: number[]
  overbought: number[]
  oversold: number[]
  divergence: {
    bullish: boolean
    bearish: boolean
    index: number
  }[]
}

export interface MACDResult {
  macd: number[]
  signal: number[]
  histogram: number[]
  crossovers: {
    index: number
    type: 'bullish' | 'bearish'
  }[]
}

export interface BollingerResult {
  upper: number[]
  middle: number[]
  lower: number[]
  bandwidth: number[]
  percentB: number[]
  squeeze: boolean[]
}

export interface ATRResult {
  values: number[]
  normalized: number[] // ATR as percentage of price
}

export interface StochasticResult {
  k: number[]
  d: number[]
  crossovers: {
    index: number
    type: 'bullish' | 'bearish'
  }[]
}

export interface ADXResult {
  adx: number[]
  plusDI: number[]
  minusDI: number[]
  trend: ('strong' | 'weak' | 'none')[]
}

export interface OBVResult {
  values: number[]
  sma: number[]
  divergence: {
    bullish: boolean
    bearish: boolean
    index: number
  }[]
}

export interface VWAPResult {
  vwap: number[]
  upperBand: number[]
  lowerBand: number[]
  deviation: number[]
}

export interface IchimokuResult {
  tenkan: number[]       // Conversion Line
  kijun: number[]        // Base Line
  senkouA: number[]      // Leading Span A
  senkouB: number[]      // Leading Span B
  chikou: number[]       // Lagging Span
  cloud: ('bullish' | 'bearish' | 'neutral')[]
}

export interface PivotPointsResult {
  pivot: number
  r1: number
  r2: number
  r3: number
  s1: number
  s2: number
  s3: number
}

export interface IndicatorSignal {
  indicator: string
  signal: 'bullish' | 'bearish' | 'neutral'
  strength: number // 0-1
  value: number
  description: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return sum(arr) / arr.length
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const avg = mean(arr)
  const squareDiffs = arr.map((value) => Math.pow(value - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

function max(arr: number[]): number {
  return Math.max(...arr)
}

function min(arr: number[]): number {
  return Math.min(...arr)
}

// =============================================================================
// SIMPLE MOVING AVERAGE (SMA)
// =============================================================================

export function SMA(data: number[], period: number): number[] {
  const result: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      result.push(mean(slice))
    }
  }

  return result
}

// =============================================================================
// EXPONENTIAL MOVING AVERAGE (EMA)
// =============================================================================

export function EMA(data: number[], period: number): number[] {
  const result: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else if (i === period - 1) {
      // First EMA is SMA
      const slice = data.slice(0, period)
      result.push(mean(slice))
    } else {
      // EMA = (Close - Previous EMA) * multiplier + Previous EMA
      const prevEMA = result[i - 1]
      const ema = (data[i] - prevEMA) * multiplier + prevEMA
      result.push(ema)
    }
  }

  return result
}

// =============================================================================
// WEIGHTED MOVING AVERAGE (WMA)
// =============================================================================

export function WMA(data: number[], period: number): number[] {
  const result: number[] = []
  const weightSum = (period * (period + 1)) / 2

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      let weightedSum = 0
      for (let j = 0; j < period; j++) {
        weightedSum += data[i - period + 1 + j] * (j + 1)
      }
      result.push(weightedSum / weightSum)
    }
  }

  return result
}

// =============================================================================
// RELATIVE STRENGTH INDEX (RSI)
// =============================================================================

export function RSI(
  data: number[],
  period: number = 14,
  overbought: number = 70,
  oversold: number = 30
): RSIResult {
  const changes: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  const rsi: number[] = []
  const overboughtPoints: number[] = []
  const oversoldPoints: number[] = []
  const divergence: RSIResult['divergence'] = []

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1])
  }

  // Separate gains and losses
  for (const change of changes) {
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // Calculate RSI
  for (let i = 0; i < changes.length; i++) {
    if (i < period - 1) {
      rsi.push(NaN)
      continue
    }

    let avgGain: number
    let avgLoss: number

    if (i === period - 1) {
      // First RSI uses simple average
      avgGain = mean(gains.slice(0, period))
      avgLoss = mean(losses.slice(0, period))
    } else {
      // Subsequent uses smoothed average
      const prevAvgGain = rsi.length > 0 ? gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period : 0
      const prevAvgLoss = rsi.length > 0 ? losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period : 0
      avgGain = (prevAvgGain * (period - 1) + gains[i]) / period
      avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period
    }

    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    }
  }

  // Pad RSI to match data length
  rsi.unshift(NaN)

  // Find overbought/oversold points
  for (let i = 0; i < rsi.length; i++) {
    if (!isNaN(rsi[i])) {
      if (rsi[i] >= overbought) overboughtPoints.push(i)
      if (rsi[i] <= oversold) oversoldPoints.push(i)
    }
  }

  // Detect divergences
  for (let i = period + 10; i < data.length; i++) {
    const priceTrend = data[i] - data[i - 10]
    const rsiTrend = rsi[i] - rsi[i - 10]

    if (priceTrend > 0 && rsiTrend < -5) {
      divergence.push({ bullish: false, bearish: true, index: i })
    } else if (priceTrend < 0 && rsiTrend > 5) {
      divergence.push({ bullish: true, bearish: false, index: i })
    }
  }

  return {
    values: rsi,
    overbought: overboughtPoints,
    oversold: oversoldPoints,
    divergence,
  }
}

// =============================================================================
// MACD (Moving Average Convergence Divergence)
// =============================================================================

export function MACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEMA = EMA(data, fastPeriod)
  const slowEMA = EMA(data, slowPeriod)
  const macdLine: number[] = []
  const crossovers: MACDResult['crossovers'] = []

  // Calculate MACD line
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  // Calculate signal line
  const validMacd = macdLine.filter((v) => !isNaN(v))
  const signalEMA = EMA(validMacd, signalPeriod)

  // Align signal with MACD
  const signal: number[] = []
  let signalIndex = 0
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      signal.push(NaN)
    } else {
      signal.push(signalEMA[signalIndex] || NaN)
      signalIndex++
    }
  }

  // Calculate histogram
  const histogram: number[] = []
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signal[i])) {
      histogram.push(NaN)
    } else {
      histogram.push(macdLine[i] - signal[i])
    }
  }

  // Detect crossovers
  for (let i = 1; i < histogram.length; i++) {
    if (isNaN(histogram[i]) || isNaN(histogram[i - 1])) continue

    // Bullish crossover: MACD crosses above signal
    if (histogram[i - 1] < 0 && histogram[i] >= 0) {
      crossovers.push({ index: i, type: 'bullish' })
    }
    // Bearish crossover: MACD crosses below signal
    else if (histogram[i - 1] > 0 && histogram[i] <= 0) {
      crossovers.push({ index: i, type: 'bearish' })
    }
  }

  return {
    macd: macdLine,
    signal,
    histogram,
    crossovers,
  }
}

// =============================================================================
// BOLLINGER BANDS
// =============================================================================

export function BollingerBands(
  data: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerResult {
  const middle = SMA(data, period)
  const upper: number[] = []
  const lower: number[] = []
  const bandwidth: number[] = []
  const percentB: number[] = []
  const squeeze: boolean[] = []

  for (let i = 0; i < data.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN)
      lower.push(NaN)
      bandwidth.push(NaN)
      percentB.push(NaN)
      squeeze.push(false)
    } else {
      const slice = data.slice(Math.max(0, i - period + 1), i + 1)
      const sd = stdDev(slice)

      const upperBand = middle[i] + sd * stdDevMultiplier
      const lowerBand = middle[i] - sd * stdDevMultiplier

      upper.push(upperBand)
      lower.push(lowerBand)

      // Bandwidth: (Upper - Lower) / Middle
      const bw = (upperBand - lowerBand) / middle[i] * 100
      bandwidth.push(bw)

      // %B: (Price - Lower) / (Upper - Lower)
      const pb = (data[i] - lowerBand) / (upperBand - lowerBand)
      percentB.push(pb)

      // Squeeze detection: bandwidth below threshold
      squeeze.push(bw < 10) // Squeeze when bandwidth < 10%
    }
  }

  return {
    upper,
    middle,
    lower,
    bandwidth,
    percentB,
    squeeze,
  }
}

// =============================================================================
// AVERAGE TRUE RANGE (ATR)
// =============================================================================

export function ATR(candles: OHLCV[], period: number = 14): ATRResult {
  const trueRanges: number[] = []
  const atr: number[] = []
  const normalized: number[] = []

  // Calculate True Range
  for (let i = 0; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }

  // Calculate ATR using EMA
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(NaN)
      normalized.push(NaN)
    } else if (i === period - 1) {
      const avg = mean(trueRanges.slice(0, period))
      atr.push(avg)
      normalized.push((avg / candles[i].close) * 100)
    } else {
      const newATR = (atr[i - 1] * (period - 1) + trueRanges[i]) / period
      atr.push(newATR)
      normalized.push((newATR / candles[i].close) * 100)
    }
  }

  return {
    values: atr,
    normalized,
  }
}

// =============================================================================
// STOCHASTIC OSCILLATOR
// =============================================================================

export function Stochastic(
  candles: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smooth: number = 3
): StochasticResult {
  const rawK: number[] = []
  const crossovers: StochasticResult['crossovers'] = []

  // Calculate raw %K
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(NaN)
    } else {
      const slice = candles.slice(i - kPeriod + 1, i + 1)
      const highest = max(slice.map((c) => c.high))
      const lowest = min(slice.map((c) => c.low))
      const current = candles[i].close

      if (highest === lowest) {
        rawK.push(50)
      } else {
        rawK.push(((current - lowest) / (highest - lowest)) * 100)
      }
    }
  }

  // Smooth %K
  const k = SMA(rawK.filter((v) => !isNaN(v)), smooth)

  // Pad k to match length
  const paddedK: number[] = []
  let kIndex = 0
  for (let i = 0; i < rawK.length; i++) {
    if (isNaN(rawK[i])) {
      paddedK.push(NaN)
    } else {
      paddedK.push(k[kIndex] || NaN)
      kIndex++
    }
  }

  // Calculate %D (SMA of %K)
  const d = SMA(paddedK.filter((v) => !isNaN(v)), dPeriod)

  // Pad d to match length
  const paddedD: number[] = []
  let dIndex = 0
  for (let i = 0; i < paddedK.length; i++) {
    if (isNaN(paddedK[i])) {
      paddedD.push(NaN)
    } else {
      paddedD.push(d[dIndex] || NaN)
      dIndex++
    }
  }

  // Detect crossovers
  for (let i = 1; i < paddedK.length; i++) {
    if (isNaN(paddedK[i]) || isNaN(paddedD[i])) continue

    // Bullish crossover: %K crosses above %D
    if (paddedK[i - 1] < paddedD[i - 1] && paddedK[i] > paddedD[i]) {
      crossovers.push({ index: i, type: 'bullish' })
    }
    // Bearish crossover: %K crosses below %D
    else if (paddedK[i - 1] > paddedD[i - 1] && paddedK[i] < paddedD[i]) {
      crossovers.push({ index: i, type: 'bearish' })
    }
  }

  return {
    k: paddedK,
    d: paddedD,
    crossovers,
  }
}

// =============================================================================
// AVERAGE DIRECTIONAL INDEX (ADX)
// =============================================================================

export function ADX(candles: OHLCV[], period: number = 14): ADXResult {
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []

  // Calculate +DM, -DM, and TR
  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high
    const lowDiff = candles[i - 1].low - candles[i].low

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0)
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0)

    const trueRange = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    )
    tr.push(trueRange)
  }

  // Calculate smoothed values
  const smoothedPlusDM = EMA(plusDM, period)
  const smoothedMinusDM = EMA(minusDM, period)
  const smoothedTR = EMA(tr, period)

  // Calculate +DI and -DI
  const plusDI: number[] = []
  const minusDI: number[] = []

  for (let i = 0; i < smoothedPlusDM.length; i++) {
    if (isNaN(smoothedPlusDM[i]) || smoothedTR[i] === 0) {
      plusDI.push(NaN)
      minusDI.push(NaN)
    } else {
      plusDI.push((smoothedPlusDM[i] / smoothedTR[i]) * 100)
      minusDI.push((smoothedMinusDM[i] / smoothedTR[i]) * 100)
    }
  }

  // Calculate DX
  const dx: number[] = []
  for (let i = 0; i < plusDI.length; i++) {
    if (isNaN(plusDI[i]) || isNaN(minusDI[i])) {
      dx.push(NaN)
    } else {
      const diSum = plusDI[i] + minusDI[i]
      dx.push(diSum === 0 ? 0 : (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100)
    }
  }

  // Calculate ADX (smoothed DX)
  const adx = EMA(dx.filter((v) => !isNaN(v)), period)

  // Pad ADX
  const paddedADX: number[] = []
  let adxIndex = 0
  for (let i = 0; i < dx.length; i++) {
    if (isNaN(dx[i])) {
      paddedADX.push(NaN)
    } else {
      paddedADX.push(adx[adxIndex] || NaN)
      adxIndex++
    }
  }

  // Pad to match original data length
  paddedADX.unshift(NaN)
  plusDI.unshift(NaN)
  minusDI.unshift(NaN)

  // Determine trend strength
  const trend: ADXResult['trend'] = []
  for (let i = 0; i < paddedADX.length; i++) {
    if (isNaN(paddedADX[i])) {
      trend.push('none')
    } else if (paddedADX[i] >= 25) {
      trend.push('strong')
    } else if (paddedADX[i] >= 20) {
      trend.push('weak')
    } else {
      trend.push('none')
    }
  }

  return {
    adx: paddedADX,
    plusDI,
    minusDI,
    trend,
  }
}

// =============================================================================
// ON-BALANCE VOLUME (OBV)
// =============================================================================

export function OBV(candles: OHLCV[], maPeriod: number = 20): OBVResult {
  const obv: number[] = [0]
  const divergence: OBVResult['divergence'] = []

  // Calculate OBV
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close
    const close = candles[i].close
    const volume = candles[i].volume

    if (close > prevClose) {
      obv.push(obv[i - 1] + volume)
    } else if (close < prevClose) {
      obv.push(obv[i - 1] - volume)
    } else {
      obv.push(obv[i - 1])
    }
  }

  // Calculate SMA of OBV
  const obvSMA = SMA(obv, maPeriod)

  // Detect divergences
  for (let i = maPeriod + 10; i < candles.length; i++) {
    const priceTrend = candles[i].close - candles[i - 10].close
    const obvTrend = obv[i] - obv[i - 10]

    // Bullish divergence: price down, OBV up
    if (priceTrend < 0 && obvTrend > 0) {
      divergence.push({ bullish: true, bearish: false, index: i })
    }
    // Bearish divergence: price up, OBV down
    else if (priceTrend > 0 && obvTrend < 0) {
      divergence.push({ bullish: false, bearish: true, index: i })
    }
  }

  return {
    values: obv,
    sma: obvSMA,
    divergence,
  }
}

// =============================================================================
// VOLUME WEIGHTED AVERAGE PRICE (VWAP)
// =============================================================================

export function VWAP(candles: OHLCV[], stdDevMultiplier: number = 2): VWAPResult {
  const vwap: number[] = []
  const upperBand: number[] = []
  const lowerBand: number[] = []
  const deviation: number[] = []

  let cumulativeTPV = 0 // Typical Price * Volume
  let cumulativeVolume = 0
  const typicalPrices: number[] = []

  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    typicalPrices.push(tp)

    cumulativeTPV += tp * candles[i].volume
    cumulativeVolume += candles[i].volume

    const currentVWAP = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : tp
    vwap.push(currentVWAP)

    // Calculate standard deviation of price from VWAP
    const priceDeviations = typicalPrices.map((p, j) => {
      const weight = candles[j].volume / cumulativeVolume
      return Math.pow(p - currentVWAP, 2) * weight
    })
    const variance = sum(priceDeviations)
    const sd = Math.sqrt(variance)

    upperBand.push(currentVWAP + sd * stdDevMultiplier)
    lowerBand.push(currentVWAP - sd * stdDevMultiplier)
    deviation.push(((candles[i].close - currentVWAP) / currentVWAP) * 100)
  }

  return {
    vwap,
    upperBand,
    lowerBand,
    deviation,
  }
}

// =============================================================================
// ICHIMOKU CLOUD
// =============================================================================

export function Ichimoku(
  candles: OHLCV[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuResult {
  const tenkan: number[] = []
  const kijun: number[] = []
  const senkouA: number[] = []
  const senkouB: number[] = []
  const chikou: number[] = []
  const cloud: IchimokuResult['cloud'] = []

  // Helper to calculate period high-low average
  const periodHL = (start: number, end: number): number => {
    const slice = candles.slice(start, end + 1)
    const high = max(slice.map((c) => c.high))
    const low = min(slice.map((c) => c.low))
    return (high + low) / 2
  }

  for (let i = 0; i < candles.length; i++) {
    // Tenkan-sen (Conversion Line)
    if (i < tenkanPeriod - 1) {
      tenkan.push(NaN)
    } else {
      tenkan.push(periodHL(i - tenkanPeriod + 1, i))
    }

    // Kijun-sen (Base Line)
    if (i < kijunPeriod - 1) {
      kijun.push(NaN)
    } else {
      kijun.push(periodHL(i - kijunPeriod + 1, i))
    }

    // Senkou Span A (Leading Span A)
    if (isNaN(tenkan[i]) || isNaN(kijun[i])) {
      senkouA.push(NaN)
    } else {
      senkouA.push((tenkan[i] + kijun[i]) / 2)
    }

    // Senkou Span B (Leading Span B)
    if (i < senkouBPeriod - 1) {
      senkouB.push(NaN)
    } else {
      senkouB.push(periodHL(i - senkouBPeriod + 1, i))
    }

    // Chikou Span (Lagging Span)
    chikou.push(candles[i].close)

    // Cloud determination
    if (isNaN(senkouA[i]) || isNaN(senkouB[i])) {
      cloud.push('neutral')
    } else if (senkouA[i] > senkouB[i]) {
      cloud.push('bullish')
    } else if (senkouA[i] < senkouB[i]) {
      cloud.push('bearish')
    } else {
      cloud.push('neutral')
    }
  }

  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    chikou,
    cloud,
  }
}

// =============================================================================
// PIVOT POINTS (Standard)
// =============================================================================

export function PivotPoints(candle: OHLCV): PivotPointsResult {
  const pivot = (candle.high + candle.low + candle.close) / 3

  return {
    pivot,
    r1: 2 * pivot - candle.low,
    r2: pivot + (candle.high - candle.low),
    r3: candle.high + 2 * (pivot - candle.low),
    s1: 2 * pivot - candle.high,
    s2: pivot - (candle.high - candle.low),
    s3: candle.low - 2 * (candle.high - pivot),
  }
}

// =============================================================================
// COMMODITY CHANNEL INDEX (CCI)
// =============================================================================

export function CCI(candles: OHLCV[], period: number = 20): number[] {
  const cci: number[] = []
  const typicalPrices: number[] = []

  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    typicalPrices.push(tp)

    if (i < period - 1) {
      cci.push(NaN)
    } else {
      const slice = typicalPrices.slice(i - period + 1, i + 1)
      const sma = mean(slice)
      const meanDeviation = mean(slice.map((p) => Math.abs(p - sma)))

      if (meanDeviation === 0) {
        cci.push(0)
      } else {
        cci.push((tp - sma) / (0.015 * meanDeviation))
      }
    }
  }

  return cci
}

// =============================================================================
// WILLIAMS %R
// =============================================================================

export function WilliamsR(candles: OHLCV[], period: number = 14): number[] {
  const result: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      const slice = candles.slice(i - period + 1, i + 1)
      const highest = max(slice.map((c) => c.high))
      const lowest = min(slice.map((c) => c.low))
      const close = candles[i].close

      if (highest === lowest) {
        result.push(-50)
      } else {
        result.push(((highest - close) / (highest - lowest)) * -100)
      }
    }
  }

  return result
}

// =============================================================================
// RATE OF CHANGE (ROC)
// =============================================================================

export function ROC(data: number[], period: number = 12): number[] {
  const result: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN)
    } else {
      const previousValue = data[i - period]
      if (previousValue === 0) {
        result.push(0)
      } else {
        result.push(((data[i] - previousValue) / previousValue) * 100)
      }
    }
  }

  return result
}

// =============================================================================
// MOMENTUM
// =============================================================================

export function Momentum(data: number[], period: number = 10): number[] {
  const result: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(NaN)
    } else {
      result.push(data[i] - data[i - period])
    }
  }

  return result
}

// =============================================================================
// AGGREGATE INDICATOR SIGNALS
// =============================================================================

export function generateIndicatorSignals(
  candles: OHLCV[],
  config: {
    rsiPeriod?: number
    macdFast?: number
    macdSlow?: number
    macdSignal?: number
    bbPeriod?: number
    bbStdDev?: number
    atrPeriod?: number
    adxPeriod?: number
  } = {}
): IndicatorSignal[] {
  const signals: IndicatorSignal[] = []
  const closes = candles.map((c) => c.close)
  const lastCandle = candles[candles.length - 1]
  const lastClose = lastCandle.close

  // RSI Signal
  const rsi = RSI(closes, config.rsiPeriod || 14)
  const lastRSI = rsi.values[rsi.values.length - 1]
  if (!isNaN(lastRSI)) {
    let rsiSignal: IndicatorSignal['signal'] = 'neutral'
    let rsiStrength = 0.5
    let rsiDesc = 'RSI is neutral'

    if (lastRSI >= 70) {
      rsiSignal = 'bearish'
      rsiStrength = Math.min((lastRSI - 70) / 30, 1)
      rsiDesc = `RSI overbought at ${lastRSI.toFixed(1)}`
    } else if (lastRSI <= 30) {
      rsiSignal = 'bullish'
      rsiStrength = Math.min((30 - lastRSI) / 30, 1)
      rsiDesc = `RSI oversold at ${lastRSI.toFixed(1)}`
    }

    signals.push({
      indicator: 'RSI',
      signal: rsiSignal,
      strength: rsiStrength,
      value: lastRSI,
      description: rsiDesc,
    })
  }

  // MACD Signal
  const macd = MACD(
    closes,
    config.macdFast || 12,
    config.macdSlow || 26,
    config.macdSignal || 9
  )
  const lastMACD = macd.macd[macd.macd.length - 1]
  const lastSignal = macd.signal[macd.signal.length - 1]
  const lastHistogram = macd.histogram[macd.histogram.length - 1]

  if (!isNaN(lastMACD) && !isNaN(lastSignal)) {
    let macdSignalType: IndicatorSignal['signal'] = 'neutral'
    let macdStrength = 0.5
    let macdDesc = 'MACD is neutral'

    const recentCrossover = macd.crossovers[macd.crossovers.length - 1]
    if (recentCrossover && recentCrossover.index >= macd.macd.length - 3) {
      macdSignalType = recentCrossover.type === 'bullish' ? 'bullish' : 'bearish'
      macdStrength = 0.8
      macdDesc = `MACD ${recentCrossover.type} crossover`
    } else if (lastHistogram > 0) {
      macdSignalType = 'bullish'
      macdStrength = 0.6
      macdDesc = 'MACD above signal line'
    } else if (lastHistogram < 0) {
      macdSignalType = 'bearish'
      macdStrength = 0.6
      macdDesc = 'MACD below signal line'
    }

    signals.push({
      indicator: 'MACD',
      signal: macdSignalType,
      strength: macdStrength,
      value: lastHistogram,
      description: macdDesc,
    })
  }

  // Bollinger Bands Signal
  const bb = BollingerBands(closes, config.bbPeriod || 20, config.bbStdDev || 2)
  const lastUpper = bb.upper[bb.upper.length - 1]
  const lastLower = bb.lower[bb.lower.length - 1]
  const lastPercentB = bb.percentB[bb.percentB.length - 1]

  if (!isNaN(lastPercentB)) {
    let bbSignal: IndicatorSignal['signal'] = 'neutral'
    let bbStrength = 0.5
    let bbDesc = 'Price within Bollinger Bands'

    if (lastPercentB >= 1) {
      bbSignal = 'bearish'
      bbStrength = Math.min(lastPercentB - 0.5, 1)
      bbDesc = 'Price above upper Bollinger Band'
    } else if (lastPercentB <= 0) {
      bbSignal = 'bullish'
      bbStrength = Math.min(0.5 - lastPercentB, 1)
      bbDesc = 'Price below lower Bollinger Band'
    }

    signals.push({
      indicator: 'Bollinger Bands',
      signal: bbSignal,
      strength: bbStrength,
      value: lastPercentB,
      description: bbDesc,
    })
  }

  // ADX Signal
  const adx = ADX(candles, config.adxPeriod || 14)
  const lastADX = adx.adx[adx.adx.length - 1]
  const lastPlusDI = adx.plusDI[adx.plusDI.length - 1]
  const lastMinusDI = adx.minusDI[adx.minusDI.length - 1]

  if (!isNaN(lastADX) && !isNaN(lastPlusDI) && !isNaN(lastMinusDI)) {
    let adxSignal: IndicatorSignal['signal'] = 'neutral'
    let adxStrength = 0.5
    let adxDesc = 'No clear trend'

    if (lastADX >= 25) {
      if (lastPlusDI > lastMinusDI) {
        adxSignal = 'bullish'
        adxStrength = Math.min(lastADX / 50, 1)
        adxDesc = `Strong uptrend (ADX: ${lastADX.toFixed(1)})`
      } else {
        adxSignal = 'bearish'
        adxStrength = Math.min(lastADX / 50, 1)
        adxDesc = `Strong downtrend (ADX: ${lastADX.toFixed(1)})`
      }
    }

    signals.push({
      indicator: 'ADX',
      signal: adxSignal,
      strength: adxStrength,
      value: lastADX,
      description: adxDesc,
    })
  }

  return signals
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  SMA,
  EMA,
  WMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  Stochastic,
  ADX,
  OBV,
  VWAP,
  Ichimoku,
  PivotPoints,
  CCI,
  WilliamsR,
  ROC,
  Momentum,
  generateIndicatorSignals,
}
