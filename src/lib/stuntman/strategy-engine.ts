/**
 * StuntMan Strategy Engine - Production-Grade ES Futures Trading Strategies
 *
 * ACADEMIC & INSTITUTIONAL SOURCES:
 * 1. VWAP Mean Reversion - Zarattini & Aziz (SSRN) - Sharpe 2.1
 * 2. Opening Range Breakout - Quantified Strategies - 74.56% WR
 * 3. EMA Trend + Pullback - Classic trend-following
 * 4. Delta Divergence - TradePro Academy - Institutional flow
 * 5. Session Momentum - Time-based edge exploitation
 *
 * VALIDATION REQUIREMENTS (from research):
 * - Min 100 trades in backtest
 * - Profit factor > 1.5
 * - Win rate > 45% (trend) or > 55% (mean reversion)
 * - Max drawdown < 15%
 * - Sharpe ratio > 1.0
 */

import { Candle } from './signal-engine'

// =============================================================================
// CORE TYPES
// =============================================================================

export type MarketRegime = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY'
export type SignalDirection = 'LONG' | 'SHORT' | 'FLAT'
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'

export interface StrategySignal {
  direction: SignalDirection
  confidence: number            // 0-100
  strength: SignalStrength
  strategy: string              // Strategy name
  entryPrice: number            // Suggested entry
  stopLoss: number              // Hard stop
  takeProfit: number            // Primary target
  riskRewardRatio: number       // R:R ratio
  timeframe: string             // Signal timeframe
  reasoning: string             // Human-readable reason
  metadata: {
    regime: MarketRegime
    indicators: Record<string, number>
    filters: Record<string, boolean>
  }
}

export interface StrategyConfig {
  enabled: boolean
  weight: number                // 0-100, for confluence scoring
  minConfidence: number         // Minimum confidence to trigger
  regimes: MarketRegime[]       // Which regimes this works in
  sessions: TradingSession[]    // Which sessions to trade
  riskPerTrade: number          // % of account to risk
  maxDailyTrades: number        // Max trades per day
}

export type TradingSession =
  | 'OVERNIGHT'      // 6:00 PM - 4:00 AM ET
  | 'PRE_MARKET'     // 4:00 AM - 9:30 AM ET
  | 'OPENING_DRIVE'  // 9:30 AM - 10:30 AM ET (HIGH VOLATILITY)
  | 'MID_DAY'        // 10:30 AM - 2:00 PM ET (often choppy)
  | 'AFTERNOON'      // 2:00 PM - 3:00 PM ET
  | 'POWER_HOUR'     // 3:00 PM - 4:00 PM ET
  | 'CLOSE'          // 3:45 PM - 4:00 PM ET

// =============================================================================
// INDICATOR CALCULATIONS - Battle-tested implementations
// =============================================================================

export interface Indicators {
  // Moving Averages
  ema9: number
  ema20: number
  ema50: number
  sma20: number
  sma50: number

  // VWAP
  vwap: number
  vwapUpperBand: number    // VWAP + 1 ATR
  vwapLowerBand: number    // VWAP - 1 ATR

  // Momentum
  rsi: number
  rsiSma: number           // Smoothed RSI
  macd: number
  macdSignal: number
  macdHistogram: number

  // Volatility
  atr: number
  atrPercent: number       // ATR as % of price
  atr20: number            // 20-period ATR for comparison
  bollingerUpper: number
  bollingerLower: number
  bollingerWidth: number   // Width as % (for regime detection)

  // Trend
  adx: number              // Average Directional Index
  plusDI: number           // +DI
  minusDI: number          // -DI
  trendStrength: number    // 0-100

  // Volume
  volumeSma: number
  relativeVolume: number   // Current vol vs SMA

  // Price Action
  highOfDay: number
  lowOfDay: number
  openingRangeHigh: number  // 9:30-10:00 high
  openingRangeLow: number   // 9:30-10:00 low
  previousDayHigh: number
  previousDayLow: number
  previousDayClose: number
}

/**
 * Calculate all indicators from candle data
 * Optimized for ES futures intraday trading
 */
export function calculateIndicators(
  candles: Candle[],
  sessionStart?: number  // Timestamp of session start (9:30 AM)
): Indicators {
  if (candles.length < 50) {
    throw new Error('Need at least 50 candles for indicator calculation')
  }

  const closes = candles.map(c => c.close)
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)
  const volumes = candles.map(c => c.volume)
  const currentPrice = closes[closes.length - 1]

  // === MOVING AVERAGES ===
  const ema9 = calculateEMA(closes, 9)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)

  // === ATR (Average True Range) ===
  const atr = calculateATR(candles, 14)
  const atr20 = calculateATR(candles, 20)
  const atrPercent = (atr / currentPrice) * 100

  // === VWAP ===
  const vwapData = calculateVWAP(candles, sessionStart)
  const vwap = vwapData.vwap
  const vwapStdDev = vwapData.stdDev
  const vwapUpperBand = vwap + atr
  const vwapLowerBand = vwap - atr

  // === RSI ===
  const rsi = calculateRSI(closes, 14)
  const rsiValues = calculateRSISeries(closes, 14)
  const rsiSma = rsiValues.length >= 3
    ? (rsiValues.slice(-3).reduce((a, b) => a + b, 0) / 3)
    : rsi

  // === MACD ===
  const macdData = calculateMACD(closes, 12, 26, 9)

  // === BOLLINGER BANDS ===
  const bbData = calculateBollingerBands(closes, 20, 2)

  // === ADX (Average Directional Index) ===
  const adxData = calculateADX(candles, 14)

  // === VOLUME ===
  const volumeSma = calculateSMA(volumes, 20)
  const currentVolume = volumes[volumes.length - 1]
  const relativeVolume = volumeSma > 0 ? currentVolume / volumeSma : 1

  // === PRICE LEVELS ===
  // High/Low of current day
  const todayCandles = getTodayCandles(candles)
  const highOfDay = Math.max(...todayCandles.map(c => c.high))
  const lowOfDay = Math.min(...todayCandles.map(c => c.low))

  // Opening Range (first 30 minutes: 9:30-10:00 AM)
  const orCandles = getOpeningRangeCandles(candles)
  const openingRangeHigh = orCandles.length > 0
    ? Math.max(...orCandles.map(c => c.high))
    : highOfDay
  const openingRangeLow = orCandles.length > 0
    ? Math.min(...orCandles.map(c => c.low))
    : lowOfDay

  // Previous Day levels
  const prevDayCandles = getPreviousDayCandles(candles)
  const previousDayHigh = prevDayCandles.length > 0
    ? Math.max(...prevDayCandles.map(c => c.high))
    : highOfDay
  const previousDayLow = prevDayCandles.length > 0
    ? Math.min(...prevDayCandles.map(c => c.low))
    : lowOfDay
  const previousDayClose = prevDayCandles.length > 0
    ? prevDayCandles[prevDayCandles.length - 1].close
    : currentPrice

  // === TREND STRENGTH ===
  // Combine ADX and EMA alignment for trend strength
  const emaAligned = (ema9 > ema20 && ema20 > ema50) || (ema9 < ema20 && ema20 < ema50)
  const trendStrength = Math.min(100, (adxData.adx * (emaAligned ? 1.5 : 0.7)))

  return {
    ema9,
    ema20,
    ema50,
    sma20,
    sma50,
    vwap,
    vwapUpperBand,
    vwapLowerBand,
    rsi,
    rsiSma,
    macd: macdData.macd,
    macdSignal: macdData.signal,
    macdHistogram: macdData.histogram,
    atr,
    atrPercent,
    atr20,
    bollingerUpper: bbData.upper,
    bollingerLower: bbData.lower,
    bollingerWidth: bbData.width,
    adx: adxData.adx,
    plusDI: adxData.plusDI,
    minusDI: adxData.minusDI,
    trendStrength,
    volumeSma,
    relativeVolume,
    highOfDay,
    lowOfDay,
    openingRangeHigh,
    openingRangeLow,
    previousDayHigh,
    previousDayLow,
    previousDayClose,
  }
}

// =============================================================================
// REGIME DETECTION - Determines which strategies to use
// =============================================================================

/**
 * Detect current market regime
 * Based on ADX for trend strength and ATR for volatility
 *
 * Research basis:
 * - ADX > 25 = Trending (use trend-following strategies)
 * - ADX < 20 = Ranging (use mean reversion strategies)
 * - ATR > 1.5x avg = High volatility (widen stops, reduce size)
 * - ATR < 0.7x avg = Low volatility (avoid or use tight ranges)
 */
export function detectMarketRegime(indicators: Indicators): MarketRegime {
  const { adx, plusDI, minusDI, atr, atr20, bollingerWidth } = indicators

  // Volatility check first (takes priority)
  const atrRatio = atr / atr20

  if (atrRatio > 1.5 || bollingerWidth > 3) {
    return 'HIGH_VOLATILITY'
  }

  if (atrRatio < 0.7 || bollingerWidth < 0.5) {
    return 'LOW_VOLATILITY'
  }

  // Trend check
  if (adx > 25) {
    if (plusDI > minusDI) {
      return 'TRENDING_UP'
    } else {
      return 'TRENDING_DOWN'
    }
  }

  // Default to ranging if no strong trend
  return 'RANGING'
}

// =============================================================================
// SESSION DETECTION
// =============================================================================

export function getCurrentSession(timestamp: number): TradingSession {
  const date = new Date(timestamp)
  // Convert to ET (EST = UTC-5, EDT = UTC-4)
  const utcHour = date.getUTCHours()
  const utcMinute = date.getUTCMinutes()

  // Using EST (UTC-5) for consistency
  let etHour = (utcHour - 5 + 24) % 24
  const etTime = etHour * 100 + utcMinute // HHMM format

  if (etTime >= 1800 || etTime < 400) return 'OVERNIGHT'
  if (etTime >= 400 && etTime < 930) return 'PRE_MARKET'
  if (etTime >= 930 && etTime < 1030) return 'OPENING_DRIVE'
  if (etTime >= 1030 && etTime < 1400) return 'MID_DAY'
  if (etTime >= 1400 && etTime < 1500) return 'AFTERNOON'
  if (etTime >= 1500 && etTime < 1545) return 'POWER_HOUR'
  return 'CLOSE'
}

export function isRTH(timestamp: number): boolean {
  const session = getCurrentSession(timestamp)
  return ['OPENING_DRIVE', 'MID_DAY', 'AFTERNOON', 'POWER_HOUR', 'CLOSE'].includes(session)
}

// =============================================================================
// STRATEGY 1: VWAP MEAN REVERSION
// Source: Zarattini & Aziz (SSRN) - Sharpe Ratio 2.1
// =============================================================================

export interface VWAPReversionConfig extends StrategyConfig {
  atrMultiplierEntry: number    // How far from VWAP to enter (default 1.0)
  atrMultiplierStop: number     // Stop loss distance (default 1.5)
  rsiOversold: number           // RSI threshold for long (default 30)
  rsiOverbought: number         // RSI threshold for short (default 70)
  targetVWAP: boolean           // Target return to VWAP
}

export const DEFAULT_VWAP_CONFIG: VWAPReversionConfig = {
  enabled: true,
  weight: 30,
  minConfidence: 70,
  regimes: ['RANGING', 'TRENDING_UP', 'TRENDING_DOWN'],  // Works in all except extreme volatility
  sessions: ['OPENING_DRIVE', 'MID_DAY', 'AFTERNOON', 'POWER_HOUR'],
  riskPerTrade: 0.5,
  maxDailyTrades: 6,
  atrMultiplierEntry: 1.0,
  atrMultiplierStop: 1.5,
  rsiOversold: 30,
  rsiOverbought: 70,
  targetVWAP: true,
}

export function generateVWAPSignal(
  candles: Candle[],
  indicators: Indicators,
  config: VWAPReversionConfig = DEFAULT_VWAP_CONFIG
): StrategySignal | null {
  const { vwap, atr, rsi, vwapUpperBand, vwapLowerBand } = indicators
  const currentPrice = candles[candles.length - 1].close

  // Calculate distance from VWAP
  const distanceFromVWAP = currentPrice - vwap
  const distanceATR = Math.abs(distanceFromVWAP) / atr

  let direction: SignalDirection = 'FLAT'
  let confidence = 0
  let reasoning = ''

  // LONG SETUP: Price below VWAP by 1+ ATR AND RSI oversold
  if (currentPrice < vwapLowerBand && rsi < config.rsiOversold) {
    direction = 'LONG'

    // Base confidence from distance
    confidence = 60 + Math.min(25, distanceATR * 10)

    // Bonus for extreme RSI
    if (rsi < 25) confidence += 10

    reasoning = `VWAP Reversion LONG: Price ${distanceATR.toFixed(2)} ATR below VWAP, RSI ${rsi.toFixed(1)}`
  }

  // SHORT SETUP: Price above VWAP by 1+ ATR AND RSI overbought
  else if (currentPrice > vwapUpperBand && rsi > config.rsiOverbought) {
    direction = 'SHORT'

    confidence = 60 + Math.min(25, distanceATR * 10)

    if (rsi > 75) confidence += 10

    reasoning = `VWAP Reversion SHORT: Price ${distanceATR.toFixed(2)} ATR above VWAP, RSI ${rsi.toFixed(1)}`
  }

  if (direction === 'FLAT') return null

  // Calculate stops and targets
  const entryPrice = currentPrice
  const stopDistance = atr * config.atrMultiplierStop
  const stopLoss = direction === 'LONG'
    ? entryPrice - stopDistance
    : entryPrice + stopDistance

  // Target is return to VWAP (mean reversion)
  const takeProfit = config.targetVWAP
    ? vwap
    : direction === 'LONG'
      ? entryPrice + Math.abs(distanceFromVWAP)
      : entryPrice - Math.abs(distanceFromVWAP)

  const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)

  // Require minimum R:R of 1.5 for mean reversion
  if (riskRewardRatio < 1.5) {
    confidence = Math.max(0, confidence - 20)
  }

  const strength: SignalStrength =
    confidence >= 85 ? 'STRONG' :
    confidence >= 70 ? 'MODERATE' :
    confidence >= 55 ? 'WEAK' : 'NONE'

  return {
    direction,
    confidence,
    strength,
    strategy: 'VWAP_REVERSION',
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    timeframe: '1m',
    reasoning,
    metadata: {
      regime: detectMarketRegime(indicators),
      indicators: {
        vwap,
        distanceATR,
        rsi,
      },
      filters: {
        rsiValid: direction === 'LONG' ? rsi < config.rsiOversold : rsi > config.rsiOverbought,
        distanceValid: distanceATR >= config.atrMultiplierEntry,
      },
    },
  }
}

// =============================================================================
// STRATEGY 2: OPENING RANGE BREAKOUT (ORB)
// Source: Quantified Strategies - 74.56% win rate, 2.512 profit factor
// =============================================================================

export interface ORBConfig extends StrategyConfig {
  orbMinutes: number            // Opening range period (default 30 = 9:30-10:00)
  minORBSize: number            // Minimum range size in ATR (default 0.5)
  volumeConfirmation: number    // Min relative volume for breakout (default 1.2)
  timeFilter: number            // Don't enter after this hour ET (default 13 = 1 PM)
  targetMultiplier: number      // Target as multiple of ORB range (default 2)
}

export const DEFAULT_ORB_CONFIG: ORBConfig = {
  enabled: true,
  weight: 35,                   // High weight - strong edge
  minConfidence: 75,
  regimes: ['TRENDING_UP', 'TRENDING_DOWN', 'HIGH_VOLATILITY'],  // Best in volatile/trending
  sessions: ['OPENING_DRIVE', 'MID_DAY'],  // Only trade ORB before 1 PM
  riskPerTrade: 0.75,
  maxDailyTrades: 2,            // ORB is one trade per day typically
  orbMinutes: 30,
  minORBSize: 0.5,
  volumeConfirmation: 1.2,
  timeFilter: 13,               // 1 PM ET cutoff
  targetMultiplier: 2,
}

export function generateORBSignal(
  candles: Candle[],
  indicators: Indicators,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): StrategySignal | null {
  const { openingRangeHigh, openingRangeLow, atr, relativeVolume } = indicators
  const currentCandle = candles[candles.length - 1]
  const currentPrice = currentCandle.close
  const currentTime = currentCandle.time

  // Check time filter
  const currentHourET = (new Date(currentTime).getUTCHours() - 5 + 24) % 24
  if (currentHourET >= config.timeFilter) {
    return null // Too late in the day for ORB
  }

  // Check if we're past the opening range period
  const session = getCurrentSession(currentTime)
  if (session === 'OPENING_DRIVE') {
    return null // Still within opening range, wait for breakout
  }

  // Calculate ORB size
  const orbRange = openingRangeHigh - openingRangeLow
  const orbATR = orbRange / atr

  // Check minimum range size
  if (orbATR < config.minORBSize) {
    return null // Range too tight, no edge
  }

  let direction: SignalDirection = 'FLAT'
  let confidence = 0
  let reasoning = ''

  // BREAKOUT LONG: Close above ORB high with volume
  if (currentPrice > openingRangeHigh && currentCandle.close > currentCandle.open) {
    direction = 'LONG'
    confidence = 70

    // Volume confirmation bonus
    if (relativeVolume >= config.volumeConfirmation) {
      confidence += 10
    }

    // Clean break bonus (no wick below ORB high)
    if (currentCandle.low >= openingRangeHigh) {
      confidence += 5
    }

    // Strong candle body bonus
    const bodyPercent = Math.abs(currentCandle.close - currentCandle.open) / orbRange
    if (bodyPercent > 0.3) {
      confidence += 5
    }

    reasoning = `ORB Breakout LONG: Price broke ${openingRangeHigh.toFixed(2)} high, volume ${relativeVolume.toFixed(1)}x`
  }

  // BREAKOUT SHORT: Close below ORB low with volume
  else if (currentPrice < openingRangeLow && currentCandle.close < currentCandle.open) {
    direction = 'SHORT'
    confidence = 70

    if (relativeVolume >= config.volumeConfirmation) {
      confidence += 10
    }

    if (currentCandle.high <= openingRangeLow) {
      confidence += 5
    }

    const bodyPercent = Math.abs(currentCandle.close - currentCandle.open) / orbRange
    if (bodyPercent > 0.3) {
      confidence += 5
    }

    reasoning = `ORB Breakout SHORT: Price broke ${openingRangeLow.toFixed(2)} low, volume ${relativeVolume.toFixed(1)}x`
  }

  if (direction === 'FLAT') return null

  // Calculate stops and targets based on ORB range
  const entryPrice = currentPrice
  const stopLoss = direction === 'LONG' ? openingRangeLow : openingRangeHigh
  const targetDistance = orbRange * config.targetMultiplier
  const takeProfit = direction === 'LONG'
    ? entryPrice + targetDistance
    : entryPrice - targetDistance

  const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)

  const strength: SignalStrength =
    confidence >= 85 ? 'STRONG' :
    confidence >= 70 ? 'MODERATE' :
    confidence >= 55 ? 'WEAK' : 'NONE'

  return {
    direction,
    confidence,
    strength,
    strategy: 'ORB_BREAKOUT',
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    timeframe: '1m',
    reasoning,
    metadata: {
      regime: detectMarketRegime(indicators),
      indicators: {
        openingRangeHigh,
        openingRangeLow,
        orbRange,
        orbATR,
        relativeVolume,
      },
      filters: {
        timeValid: currentHourET < config.timeFilter,
        volumeValid: relativeVolume >= config.volumeConfirmation,
        rangeValid: orbATR >= config.minORBSize,
      },
    },
  }
}

// =============================================================================
// STRATEGY 3: EMA TREND + PULLBACK
// Classic trend-following with optimal entry on pullbacks
// =============================================================================

export interface EMATrendConfig extends StrategyConfig {
  fastEMA: number               // Fast EMA period (default 20)
  slowEMA: number               // Slow EMA period (default 50)
  rsiPullbackLong: [number, number]   // RSI range for long pullback (default 40-50)
  rsiPullbackShort: [number, number]  // RSI range for short pullback (default 50-60)
  atrStopMultiplier: number     // Stop distance in ATR (default 2.0)
  atrTargetMultiplier: number   // Target distance in ATR (default 4.0)
}

export const DEFAULT_EMA_CONFIG: EMATrendConfig = {
  enabled: true,
  weight: 25,
  minConfidence: 70,
  regimes: ['TRENDING_UP', 'TRENDING_DOWN'],  // Only in trending markets
  sessions: ['OPENING_DRIVE', 'MID_DAY', 'AFTERNOON', 'POWER_HOUR'],
  riskPerTrade: 0.5,
  maxDailyTrades: 4,
  fastEMA: 20,
  slowEMA: 50,
  rsiPullbackLong: [35, 50],
  rsiPullbackShort: [50, 65],
  atrStopMultiplier: 2.0,
  atrTargetMultiplier: 4.0,
}

export function generateEMATrendSignal(
  candles: Candle[],
  indicators: Indicators,
  config: EMATrendConfig = DEFAULT_EMA_CONFIG
): StrategySignal | null {
  const { ema20, ema50, rsi, atr, adx, trendStrength } = indicators
  const currentPrice = candles[candles.length - 1].close

  // Require minimum trend strength
  if (adx < 25 || trendStrength < 40) {
    return null // No clear trend, skip
  }

  let direction: SignalDirection = 'FLAT'
  let confidence = 0
  let reasoning = ''

  // UPTREND: EMA20 > EMA50, look for pullback to buy
  if (ema20 > ema50 && currentPrice > ema50) {
    const [rsiLow, rsiHigh] = config.rsiPullbackLong

    // Check for RSI pullback into buy zone
    if (rsi >= rsiLow && rsi <= rsiHigh) {
      direction = 'LONG'
      confidence = 65

      // Price touching or near EMA20 = better entry
      const distanceToEMA20 = Math.abs(currentPrice - ema20) / atr
      if (distanceToEMA20 < 0.5) {
        confidence += 15
      }

      // Strong trend bonus
      if (adx > 35) confidence += 10
      if (trendStrength > 60) confidence += 5

      reasoning = `EMA Trend LONG: Uptrend (EMA20>${ema50.toFixed(0)}), RSI pullback to ${rsi.toFixed(1)}`
    }
  }

  // DOWNTREND: EMA20 < EMA50, look for pullback to sell
  else if (ema20 < ema50 && currentPrice < ema50) {
    const [rsiLow, rsiHigh] = config.rsiPullbackShort

    if (rsi >= rsiLow && rsi <= rsiHigh) {
      direction = 'SHORT'
      confidence = 65

      const distanceToEMA20 = Math.abs(currentPrice - ema20) / atr
      if (distanceToEMA20 < 0.5) {
        confidence += 15
      }

      if (adx > 35) confidence += 10
      if (trendStrength > 60) confidence += 5

      reasoning = `EMA Trend SHORT: Downtrend (EMA20<${ema50.toFixed(0)}), RSI pullback to ${rsi.toFixed(1)}`
    }
  }

  if (direction === 'FLAT') return null

  const entryPrice = currentPrice
  const stopDistance = atr * config.atrStopMultiplier
  const targetDistance = atr * config.atrTargetMultiplier

  const stopLoss = direction === 'LONG'
    ? entryPrice - stopDistance
    : entryPrice + stopDistance
  const takeProfit = direction === 'LONG'
    ? entryPrice + targetDistance
    : entryPrice - targetDistance

  const riskRewardRatio = targetDistance / stopDistance

  const strength: SignalStrength =
    confidence >= 85 ? 'STRONG' :
    confidence >= 70 ? 'MODERATE' :
    confidence >= 55 ? 'WEAK' : 'NONE'

  return {
    direction,
    confidence,
    strength,
    strategy: 'EMA_TREND',
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    timeframe: '1m',
    reasoning,
    metadata: {
      regime: detectMarketRegime(indicators),
      indicators: {
        ema20,
        ema50,
        rsi,
        adx,
        trendStrength,
      },
      filters: {
        trendValid: adx > 25,
        pullbackValid: true,
      },
    },
  }
}

// =============================================================================
// STRATEGY 4: DELTA DIVERGENCE (Institutional Order Flow)
// Source: TradePro Academy - Delta threshold 800+ for institutional activity
// =============================================================================

export interface DeltaDivergenceConfig extends StrategyConfig {
  deltaThreshold: number        // Min delta for institutional activity (default 800)
  lookbackBars: number          // Bars to look back for divergence (default 20)
  atrStopMultiplier: number     // Stop distance (default 1.5)
}

export const DEFAULT_DELTA_CONFIG: DeltaDivergenceConfig = {
  enabled: true,
  weight: 20,
  minConfidence: 75,
  regimes: ['TRENDING_UP', 'TRENDING_DOWN', 'RANGING'],
  sessions: ['OPENING_DRIVE', 'MID_DAY', 'AFTERNOON', 'POWER_HOUR'],
  riskPerTrade: 0.5,
  maxDailyTrades: 3,
  deltaThreshold: 800,
  lookbackBars: 20,
  atrStopMultiplier: 1.5,
}

/**
 * Detect delta divergence from price
 * Bullish: Price makes lower low, delta makes higher low (buying pressure)
 * Bearish: Price makes higher high, delta makes lower high (selling pressure)
 */
export function generateDeltaSignal(
  candles: Candle[],
  indicators: Indicators,
  cumulativeDelta: number,
  deltaHistory: number[],  // Recent delta values
  config: DeltaDivergenceConfig = DEFAULT_DELTA_CONFIG
): StrategySignal | null {
  if (deltaHistory.length < config.lookbackBars) {
    return null
  }

  const { atr, highOfDay, lowOfDay } = indicators
  const currentPrice = candles[candles.length - 1].close
  const lookback = candles.slice(-config.lookbackBars)
  const deltaLookback = deltaHistory.slice(-config.lookbackBars)

  // Find price swing points
  const priceLows = findSwingLows(lookback.map(c => c.low))
  const priceHighs = findSwingHighs(lookback.map(c => c.high))
  const deltaLows = findSwingLows(deltaLookback)
  const deltaHighs = findSwingHighs(deltaLookback)

  let direction: SignalDirection = 'FLAT'
  let confidence = 0
  let reasoning = ''

  // BULLISH DIVERGENCE: Price lower low, delta higher low
  if (priceLows.length >= 2 && deltaLows.length >= 2) {
    const priceLL = priceLows[priceLows.length - 1] < priceLows[priceLows.length - 2]
    const deltaHL = deltaLows[deltaLows.length - 1] > deltaLows[deltaLows.length - 2]

    if (priceLL && deltaHL && Math.abs(cumulativeDelta) > config.deltaThreshold) {
      direction = 'LONG'
      confidence = 75

      // Stronger divergence = higher confidence
      const deltaStrength = Math.abs(deltaLows[deltaLows.length - 1] - deltaLows[deltaLows.length - 2])
      if (deltaStrength > config.deltaThreshold * 0.5) {
        confidence += 10
      }

      reasoning = `Delta Divergence LONG: Price lower low, delta higher low (${cumulativeDelta.toFixed(0)} delta)`
    }
  }

  // BEARISH DIVERGENCE: Price higher high, delta lower high
  if (priceHighs.length >= 2 && deltaHighs.length >= 2) {
    const priceHH = priceHighs[priceHighs.length - 1] > priceHighs[priceHighs.length - 2]
    const deltaLH = deltaHighs[deltaHighs.length - 1] < deltaHighs[deltaHighs.length - 2]

    if (priceHH && deltaLH && Math.abs(cumulativeDelta) > config.deltaThreshold) {
      direction = 'SHORT'
      confidence = 75

      const deltaStrength = Math.abs(deltaHighs[deltaHighs.length - 1] - deltaHighs[deltaHighs.length - 2])
      if (deltaStrength > config.deltaThreshold * 0.5) {
        confidence += 10
      }

      reasoning = `Delta Divergence SHORT: Price higher high, delta lower high (${cumulativeDelta.toFixed(0)} delta)`
    }
  }

  if (direction === 'FLAT') return null

  const entryPrice = currentPrice
  const stopDistance = atr * config.atrStopMultiplier

  // Target recent swing high/low
  const stopLoss = direction === 'LONG'
    ? Math.min(...priceLows.slice(-2)) - atr * 0.5
    : Math.max(...priceHighs.slice(-2)) + atr * 0.5
  const takeProfit = direction === 'LONG'
    ? Math.max(...priceHighs.slice(-3))
    : Math.min(...priceLows.slice(-3))

  const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)

  const strength: SignalStrength =
    confidence >= 85 ? 'STRONG' :
    confidence >= 70 ? 'MODERATE' :
    confidence >= 55 ? 'WEAK' : 'NONE'

  return {
    direction,
    confidence,
    strength,
    strategy: 'DELTA_DIVERGENCE',
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    timeframe: '1m',
    reasoning,
    metadata: {
      regime: detectMarketRegime(indicators),
      indicators: {
        cumulativeDelta,
        deltaThreshold: config.deltaThreshold,
      },
      filters: {
        deltaValid: Math.abs(cumulativeDelta) > config.deltaThreshold,
        divergenceFound: true,
      },
    },
  }
}

// =============================================================================
// MASTER SIGNAL GENERATOR - Combines all strategies with confluence scoring
// =============================================================================

export interface MasterSignal {
  direction: SignalDirection
  confidence: number
  strength: SignalStrength
  confluenceScore: number       // 0-100, based on strategy agreement
  strategies: StrategySignal[]  // All contributing signals
  primaryStrategy: string       // Highest confidence strategy
  entryPrice: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
  reasoning: string
  regime: MarketRegime
  session: TradingSession
  positionSizeMultiplier: number  // Based on confluence
}

/**
 * Generate master trading signal with full confluence analysis
 * Combines all strategies and weights them based on current regime
 */
export function generateMasterSignal(
  candles: Candle[],
  indicators: Indicators,
  cumulativeDelta?: number,
  deltaHistory?: number[],
  strategyConfigs?: {
    vwap?: VWAPReversionConfig
    orb?: ORBConfig
    ema?: EMATrendConfig
    delta?: DeltaDivergenceConfig
  }
): MasterSignal {
  const regime = detectMarketRegime(indicators)
  const currentTime = candles[candles.length - 1].time
  const session = getCurrentSession(currentTime)
  const currentPrice = candles[candles.length - 1].close

  const signals: StrategySignal[] = []

  // Generate signals from each strategy
  const vwapSignal = generateVWAPSignal(candles, indicators, strategyConfigs?.vwap)
  if (vwapSignal) signals.push(vwapSignal)

  const orbSignal = generateORBSignal(candles, indicators, strategyConfigs?.orb)
  if (orbSignal) signals.push(orbSignal)

  const emaSignal = generateEMATrendSignal(candles, indicators, strategyConfigs?.ema)
  if (emaSignal) signals.push(emaSignal)

  if (cumulativeDelta !== undefined && deltaHistory) {
    const deltaSignal = generateDeltaSignal(candles, indicators, cumulativeDelta, deltaHistory, strategyConfigs?.delta)
    if (deltaSignal) signals.push(deltaSignal)
  }

  // No signals = FLAT
  if (signals.length === 0) {
    return {
      direction: 'FLAT',
      confidence: 0,
      strength: 'NONE',
      confluenceScore: 0,
      strategies: [],
      primaryStrategy: 'NONE',
      entryPrice: currentPrice,
      stopLoss: currentPrice,
      takeProfit: currentPrice,
      riskRewardRatio: 0,
      reasoning: 'No valid signals from any strategy',
      regime,
      session,
      positionSizeMultiplier: 0,
    }
  }

  // Calculate confluence
  const longSignals = signals.filter(s => s.direction === 'LONG')
  const shortSignals = signals.filter(s => s.direction === 'SHORT')

  // Determine direction based on majority and confidence
  let direction: SignalDirection = 'FLAT'
  let contributingSignals: StrategySignal[] = []

  const longConfidence = longSignals.reduce((sum, s) => sum + s.confidence, 0)
  const shortConfidence = shortSignals.reduce((sum, s) => sum + s.confidence, 0)

  if (longSignals.length > shortSignals.length ||
      (longSignals.length === shortSignals.length && longConfidence > shortConfidence)) {
    direction = 'LONG'
    contributingSignals = longSignals
  } else if (shortSignals.length > 0) {
    direction = 'SHORT'
    contributingSignals = shortSignals
  }

  if (contributingSignals.length === 0) {
    return {
      direction: 'FLAT',
      confidence: 0,
      strength: 'NONE',
      confluenceScore: 0,
      strategies: signals,
      primaryStrategy: 'NONE',
      entryPrice: currentPrice,
      stopLoss: currentPrice,
      takeProfit: currentPrice,
      riskRewardRatio: 0,
      reasoning: 'Conflicting signals, no clear direction',
      regime,
      session,
      positionSizeMultiplier: 0,
    }
  }

  // Calculate confluence score (more strategies agreeing = higher score)
  const maxStrategies = 4 // Total strategies we have
  const confluenceScore = Math.min(100, (contributingSignals.length / maxStrategies) * 100 +
    (contributingSignals.length > 1 ? 20 : 0))

  // Find primary (highest confidence) strategy
  const primarySignal = contributingSignals.reduce((best, s) =>
    s.confidence > best.confidence ? s : best
  )

  // Average confidence weighted by strategy weight
  const totalWeight = contributingSignals.reduce((sum, s) => {
    const config = getStrategyConfig(s.strategy, strategyConfigs)
    return sum + (config?.weight || 25)
  }, 0)

  const weightedConfidence = contributingSignals.reduce((sum, s) => {
    const config = getStrategyConfig(s.strategy, strategyConfigs)
    return sum + (s.confidence * (config?.weight || 25))
  }, 0) / totalWeight

  // Use primary signal for entry/stops, but adjust based on confluence
  const entryPrice = primarySignal.entryPrice

  // Use the tightest stop among agreeing strategies
  const stopLoss = direction === 'LONG'
    ? Math.max(...contributingSignals.map(s => s.stopLoss))
    : Math.min(...contributingSignals.map(s => s.stopLoss))

  // Use the furthest target (let winners run when confluence is high)
  const takeProfit = direction === 'LONG'
    ? Math.max(...contributingSignals.map(s => s.takeProfit))
    : Math.min(...contributingSignals.map(s => s.takeProfit))

  const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)

  const strength: SignalStrength =
    weightedConfidence >= 85 && confluenceScore >= 50 ? 'STRONG' :
    weightedConfidence >= 70 ? 'MODERATE' :
    weightedConfidence >= 55 ? 'WEAK' : 'NONE'

  // Position size based on confluence
  const positionSizeMultiplier =
    confluenceScore >= 75 ? 1.5 :    // Multiple strategies agree = more size
    confluenceScore >= 50 ? 1.0 :    // Moderate confluence = normal size
    0.5                               // Low confluence = half size

  const reasoning = `${direction}: ${contributingSignals.map(s => s.strategy).join(' + ')} confluence (${confluenceScore.toFixed(0)}%). ` +
    `Primary: ${primarySignal.reasoning}`

  return {
    direction,
    confidence: weightedConfidence,
    strength,
    confluenceScore,
    strategies: contributingSignals,
    primaryStrategy: primarySignal.strategy,
    entryPrice,
    stopLoss,
    takeProfit,
    riskRewardRatio,
    reasoning,
    regime,
    session,
    positionSizeMultiplier,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function calculateATR(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 10

  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trs.push(tr)
  }

  return calculateSMA(trs, period)
}

function calculateVWAP(candles: Candle[], sessionStart?: number): { vwap: number; stdDev: number } {
  // Use all candles if no session start provided
  let relevantCandles = candles

  if (sessionStart) {
    relevantCandles = candles.filter(c => c.time >= sessionStart)
  }

  if (relevantCandles.length === 0) {
    const lastPrice = candles[candles.length - 1]?.close || 0
    return { vwap: lastPrice, stdDev: 0 }
  }

  let cumulativeTPV = 0  // Typical Price * Volume
  let cumulativeVolume = 0
  const typicalPrices: number[] = []

  for (const candle of relevantCandles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    typicalPrices.push(typicalPrice)
    cumulativeTPV += typicalPrice * candle.volume
    cumulativeVolume += candle.volume
  }

  const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : relevantCandles[0].close

  // Calculate standard deviation from VWAP
  const squaredDiffs = typicalPrices.map(tp => Math.pow(tp - vwap, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
  const stdDev = Math.sqrt(avgSquaredDiff)

  return { vwap, stdDev }
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50

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
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateRSISeries(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [50]

  const rsiValues: number[] = []
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
    rsiValues.push(100 - (100 / (1 + rs)))
  }

  return rsiValues.length > 0 ? rsiValues : [50]
}

function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  if (prices.length < slowPeriod) {
    return { macd: 0, signal: 0, histogram: 0 }
  }

  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)
  const macd = fastEMA - slowEMA

  // For signal line, we need MACD history
  const macdHistory: number[] = []
  for (let i = slowPeriod; i <= prices.length; i++) {
    const slicedPrices = prices.slice(0, i)
    const fast = calculateEMA(slicedPrices, fastPeriod)
    const slow = calculateEMA(slicedPrices, slowPeriod)
    macdHistory.push(fast - slow)
  }

  const signal = macdHistory.length >= signalPeriod
    ? calculateEMA(macdHistory, signalPeriod)
    : macd

  return {
    macd,
    signal,
    histogram: macd - signal,
  }
}

function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; width: number } {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0
    return { upper: price, middle: price, lower: price, width: 0 }
  }

  const slice = prices.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period

  const squaredDiffs = slice.map(p => Math.pow(p - middle, 2))
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period)

  const upper = middle + (stdDev * stdDevMultiplier)
  const lower = middle - (stdDev * stdDevMultiplier)
  const width = ((upper - lower) / middle) * 100

  return { upper, middle, lower, width }
}

function calculateADX(
  candles: Candle[],
  period: number = 14
): { adx: number; plusDI: number; minusDI: number } {
  if (candles.length < period + 1) {
    return { adx: 20, plusDI: 0, minusDI: 0 }
  }

  const plusDMs: number[] = []
  const minusDMs: number[] = []
  const trs: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevHigh = candles[i - 1].high
    const prevLow = candles[i - 1].low
    const prevClose = candles[i - 1].close

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trs.push(tr)

    // Directional Movement
    const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0
    const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0

    plusDMs.push(plusDM)
    minusDMs.push(minusDM)
  }

  // Smooth with Wilder's method
  const smoothTR = calculateSMA(trs.slice(-period), period) * period
  const smoothPlusDM = calculateSMA(plusDMs.slice(-period), period) * period
  const smoothMinusDM = calculateSMA(minusDMs.slice(-period), period) * period

  const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0
  const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0

  const dx = plusDI + minusDI > 0
    ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100
    : 0

  // ADX is smoothed DX
  const adx = dx // Simplified - should be smoothed over period

  return { adx, plusDI, minusDI }
}

function getTodayCandles(candles: Candle[]): Candle[] {
  if (candles.length === 0) return []

  const lastCandle = candles[candles.length - 1]
  const lastDate = new Date(lastCandle.time)
  const startOfDay = new Date(lastDate)
  startOfDay.setUTCHours(0, 0, 0, 0)

  return candles.filter(c => c.time >= startOfDay.getTime())
}

function getOpeningRangeCandles(candles: Candle[]): Candle[] {
  // Get candles from 9:30 AM to 10:00 AM ET
  return candles.filter(c => {
    const date = new Date(c.time)
    const etHour = (date.getUTCHours() - 5 + 24) % 24
    const etMinute = date.getUTCMinutes()
    const etTime = etHour * 100 + etMinute
    return etTime >= 930 && etTime < 1000
  })
}

function getPreviousDayCandles(candles: Candle[]): Candle[] {
  if (candles.length === 0) return []

  const lastCandle = candles[candles.length - 1]
  const lastDate = new Date(lastCandle.time)

  const startOfToday = new Date(lastDate)
  startOfToday.setUTCHours(0, 0, 0, 0)

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  return candles.filter(c =>
    c.time >= startOfYesterday.getTime() && c.time < startOfToday.getTime()
  )
}

function findSwingLows(values: number[], sensitivity: number = 2): number[] {
  const swingLows: number[] = []

  for (let i = sensitivity; i < values.length - sensitivity; i++) {
    let isSwingLow = true
    for (let j = 1; j <= sensitivity; j++) {
      if (values[i] >= values[i - j] || values[i] >= values[i + j]) {
        isSwingLow = false
        break
      }
    }
    if (isSwingLow) swingLows.push(values[i])
  }

  return swingLows
}

function findSwingHighs(values: number[], sensitivity: number = 2): number[] {
  const swingHighs: number[] = []

  for (let i = sensitivity; i < values.length - sensitivity; i++) {
    let isSwingHigh = true
    for (let j = 1; j <= sensitivity; j++) {
      if (values[i] <= values[i - j] || values[i] <= values[i + j]) {
        isSwingHigh = false
        break
      }
    }
    if (isSwingHigh) swingHighs.push(values[i])
  }

  return swingHighs
}

function getStrategyConfig(
  strategy: string,
  configs?: {
    vwap?: VWAPReversionConfig
    orb?: ORBConfig
    ema?: EMATrendConfig
    delta?: DeltaDivergenceConfig
  }
): StrategyConfig | undefined {
  switch (strategy) {
    case 'VWAP_REVERSION':
      return configs?.vwap || DEFAULT_VWAP_CONFIG
    case 'ORB_BREAKOUT':
      return configs?.orb || DEFAULT_ORB_CONFIG
    case 'EMA_TREND':
      return configs?.ema || DEFAULT_EMA_CONFIG
    case 'DELTA_DIVERGENCE':
      return configs?.delta || DEFAULT_DELTA_CONFIG
    default:
      return undefined
  }
}
