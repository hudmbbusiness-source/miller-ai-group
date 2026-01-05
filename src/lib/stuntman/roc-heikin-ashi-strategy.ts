/**
 * ROC (Rate of Change) + Heikin Ashi Strategy
 *
 * BACKTESTED RESULTS (from LiberatedStockTrader):
 * - 93% market outperformance (vs 43% with regular candles)
 * - 55% win rate (vs 45% with regular candles)
 * - 2.7:1 reward/risk ratio (vs 1.84 with regular candles)
 * - 114 trades over 40 days on 5-min chart
 *
 * WHY IT WORKS:
 * - Heikin Ashi smooths price action, reducing noise/whipsaws
 * - ROC measures momentum with clear overbought/oversold zones
 * - Combination filters out false signals
 *
 * RULES:
 * 1. Calculate Heikin Ashi candles from regular OHLC
 * 2. Calculate ROC with period 9 on Heikin Ashi close
 * 3. LONG: ROC crosses above 0 AND Heikin Ashi is green
 * 4. SHORT: ROC crosses below 0 AND Heikin Ashi is red
 * 5. EXIT: ROC crosses back through 0 OR opposite signal
 */

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface HeikinAshiCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  isGreen: boolean
  bodySize: number
}

export interface ROCSignal {
  direction: 'LONG' | 'SHORT' | 'FLAT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  confidence: number
  roc: number
  rocCrossover: boolean
  haColor: 'GREEN' | 'RED'
  reason: string
}

// Configuration
const ROC_CONFIG = {
  rocPeriod: 9,           // ROC lookback period
  rocThreshold: 0,        // Zero line for crossover
  minBodySize: 0.3,       // Min HA body size as % of range (filter dojis)
  atrMultiplierSL: 1.5,   // ATR multiplier for stop loss
  atrMultiplierTP: 2.7,   // ATR multiplier for take profit (matches backtested R:R)
  minROCStrength: 0.1,    // Minimum ROC value for strong signal
}

/**
 * Calculate Heikin Ashi candles from regular candles
 */
export function calculateHeikinAshi(candles: Candle[]): HeikinAshiCandle[] {
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

/**
 * Calculate Rate of Change (ROC)
 * ROC = ((Current Price - Price n periods ago) / Price n periods ago) * 100
 */
export function calculateROC(prices: number[], period: number): number[] {
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

/**
 * Calculate ATR for stop loss/take profit
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
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

/**
 * Detect ROC crossover
 */
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

/**
 * Generate ROC + Heikin Ashi trading signal
 */
export function generateROCHASignal(candles: Candle[]): ROCSignal {
  const noSignal: ROCSignal = {
    direction: 'FLAT',
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    confidence: 0,
    roc: 0,
    rocCrossover: false,
    haColor: 'GREEN',
    reason: '',
  }

  if (candles.length < ROC_CONFIG.rocPeriod + 5) {
    return { ...noSignal, reason: 'Insufficient data' }
  }

  // Calculate Heikin Ashi candles
  const haCandles = calculateHeikinAshi(candles)
  const currentHA = haCandles[haCandles.length - 1]
  const previousHA = haCandles[haCandles.length - 2]

  // Calculate ROC on HA close prices
  const haPrices = haCandles.map(c => c.close)
  const rocValues = calculateROC(haPrices, ROC_CONFIG.rocPeriod)
  const currentROC = rocValues[rocValues.length - 1]

  // Detect ROC crossover
  const crossover = detectROCCrossover(rocValues, ROC_CONFIG.rocThreshold)

  // Calculate ATR for stops
  const atr = calculateATR(candles)
  const currentPrice = candles[candles.length - 1].close

  // Filter: Skip if HA body is too small (doji = indecision)
  if (currentHA.bodySize < ROC_CONFIG.minBodySize) {
    return { ...noSignal, reason: 'Weak candle body (indecision)', roc: currentROC, haColor: currentHA.isGreen ? 'GREEN' : 'RED' }
  }

  // LONG SIGNAL: ROC crosses above 0 AND HA is green
  if (crossover.crossed && crossover.direction === 'UP' && currentHA.isGreen) {
    // Confirmation: Previous HA should also be green (trend confirmation)
    const hasConfirmation = previousHA.isGreen
    const rocStrength = Math.abs(currentROC)

    // Calculate confidence based on signal strength
    let confidence = 70
    if (hasConfirmation) confidence += 10
    if (rocStrength > ROC_CONFIG.minROCStrength) confidence += 10
    if (currentHA.bodySize > 0.5) confidence += 5  // Strong body

    const stopLoss = currentPrice - (atr * ROC_CONFIG.atrMultiplierSL)
    const takeProfit = currentPrice + (atr * ROC_CONFIG.atrMultiplierTP)

    return {
      direction: 'LONG',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      confidence: Math.min(95, confidence),
      roc: currentROC,
      rocCrossover: true,
      haColor: 'GREEN',
      reason: `ROC crossed above 0 (${currentROC.toFixed(2)}), HA green${hasConfirmation ? ', trend confirmed' : ''}`,
    }
  }

  // SHORT SIGNAL: ROC crosses below 0 AND HA is red
  if (crossover.crossed && crossover.direction === 'DOWN' && !currentHA.isGreen) {
    // Confirmation: Previous HA should also be red (trend confirmation)
    const hasConfirmation = !previousHA.isGreen
    const rocStrength = Math.abs(currentROC)

    // Calculate confidence based on signal strength
    let confidence = 70
    if (hasConfirmation) confidence += 10
    if (rocStrength > ROC_CONFIG.minROCStrength) confidence += 10
    if (currentHA.bodySize > 0.5) confidence += 5  // Strong body

    const stopLoss = currentPrice + (atr * ROC_CONFIG.atrMultiplierSL)
    const takeProfit = currentPrice - (atr * ROC_CONFIG.atrMultiplierTP)

    return {
      direction: 'SHORT',
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      confidence: Math.min(95, confidence),
      roc: currentROC,
      rocCrossover: true,
      haColor: 'RED',
      reason: `ROC crossed below 0 (${currentROC.toFixed(2)}), HA red${hasConfirmation ? ', trend confirmed' : ''}`,
    }
  }

  // No crossover or conditions not met
  return {
    ...noSignal,
    roc: currentROC,
    haColor: currentHA.isGreen ? 'GREEN' : 'RED',
    reason: crossover.crossed
      ? `ROC crossed but HA color doesn't confirm (ROC: ${currentROC.toFixed(2)}, HA: ${currentHA.isGreen ? 'GREEN' : 'RED'})`
      : `Waiting for ROC crossover (ROC: ${currentROC.toFixed(2)})`,
  }
}

/**
 * Check if we should exit an existing position
 */
export function shouldExitROCHA(
  candles: Candle[],
  positionDirection: 'LONG' | 'SHORT',
  entryPrice: number
): { shouldExit: boolean; reason: string } {
  if (candles.length < ROC_CONFIG.rocPeriod + 5) {
    return { shouldExit: false, reason: 'Insufficient data' }
  }

  const haCandles = calculateHeikinAshi(candles)
  const currentHA = haCandles[haCandles.length - 1]

  const haPrices = haCandles.map(c => c.close)
  const rocValues = calculateROC(haPrices, ROC_CONFIG.rocPeriod)
  const crossover = detectROCCrossover(rocValues, ROC_CONFIG.rocThreshold)

  // Exit LONG if ROC crosses below 0
  if (positionDirection === 'LONG' && crossover.crossed && crossover.direction === 'DOWN') {
    return { shouldExit: true, reason: 'ROC crossed below 0' }
  }

  // Exit SHORT if ROC crosses above 0
  if (positionDirection === 'SHORT' && crossover.crossed && crossover.direction === 'UP') {
    return { shouldExit: true, reason: 'ROC crossed above 0' }
  }

  // Exit if HA color reverses (trend change)
  if (positionDirection === 'LONG' && !currentHA.isGreen && currentHA.bodySize > ROC_CONFIG.minBodySize) {
    return { shouldExit: true, reason: 'HA turned red (bearish reversal)' }
  }

  if (positionDirection === 'SHORT' && currentHA.isGreen && currentHA.bodySize > ROC_CONFIG.minBodySize) {
    return { shouldExit: true, reason: 'HA turned green (bullish reversal)' }
  }

  return { shouldExit: false, reason: '' }
}
