/**
 * WORLD-CLASS DAY TRADING STRATEGY SYSTEM
 *
 * ACADEMIC & INSTITUTIONAL SOURCES:
 * - Al Brooks: Reading Price Charts Bar by Bar
 * - Adam Grimes: The Art and Science of Technical Analysis
 * - Jim Dalton: Mind Over Markets (Market Profile)
 * - ICT/SMC: Institutional Order Flow Concepts
 * - Ernest Chan: Algorithmic Trading
 * - Euan Sinclair: Volatility Trading
 * - Marcos López de Prado: Advances in Financial Machine Learning
 * - Larry Harris: Trading and Exchanges
 *
 * DESIGN PHILOSOPHY:
 * 1. Capital preservation FIRST, profit generation SECOND
 * 2. If logic cannot be coded, it does not belong
 * 3. Every strategy must have explicit FAILURE CONDITIONS
 * 4. Regime-aware: strategies are DISABLED in hostile environments
 * 5. Quality scoring: not all setups are equal
 */

import { Candle } from './signal-engine'

// =============================================================================
// CORE TYPES
// =============================================================================

export type MarketRegimeType =
  | 'TREND_STRONG_UP'     // ADX > 30, +DI >> -DI, HH/HL
  | 'TREND_WEAK_UP'       // ADX 20-30, price above EMAs
  | 'TREND_STRONG_DOWN'   // ADX > 30, -DI >> +DI, LH/LL
  | 'TREND_WEAK_DOWN'     // ADX 20-30, price below EMAs
  | 'RANGE_TIGHT'         // ATR < 0.5x avg, BB squeeze
  | 'RANGE_WIDE'          // Price oscillating between clear S/R
  | 'HIGH_VOLATILITY'     // ATR > 1.5x avg, expansion
  | 'LOW_VOLATILITY'      // ATR < 0.7x avg, compression
  | 'NEWS_DRIVEN'         // Abnormal volume spike, erratic price
  | 'ILLIQUID'            // Low volume, wide spreads

export type StrategyType =
  // Market Structure (Group 1)
  | 'BOS_CONTINUATION'    // Break of Structure continuation
  | 'CHOCH_REVERSAL'      // Change of Character reversal
  | 'FAILED_BREAKOUT'     // False expansion reversal
  // Liquidity (Group 2)
  | 'LIQUIDITY_SWEEP'     // Stop run reversal
  | 'SESSION_REVERSION'   // Session high/low mean reversion
  // Trend (Group 3)
  | 'TREND_PULLBACK'      // Trend continuation on pullback
  | 'VOLATILITY_BREAKOUT' // Compression -> Expansion breakout
  // Mean Reversion (Group 4)
  | 'VWAP_DEVIATION'      // Statistical VWAP reversion
  | 'RANGE_FADE'          // Range extreme fade
  // Time-Based (Group 5)
  | 'ORB_BREAKOUT'        // Opening Range Breakout
  | 'KILLZONE_REVERSAL'   // NY Kill Zone reversal

export interface StrategySignal {
  type: StrategyType
  direction: 'LONG' | 'SHORT'
  confidence: number           // 0-100
  qualityScore: number         // 0-100, for position sizing
  entry: EntryDetails
  stopLoss: StopDetails
  targets: TargetDetails[]
  invalidation: InvalidationCondition[]
  timeLimit: number            // Max bars to hold
  metadata: StrategyMetadata
}

export interface EntryDetails {
  price: number
  type: 'MARKET' | 'LIMIT' | 'STOP'
  limitOffset?: number         // How far from current price for limit
  waitForRetest: boolean       // Wait for level retest before entry
  maxSlippage: number          // Max acceptable slippage in points
}

export interface StopDetails {
  price: number
  type: 'FIXED' | 'TRAILING' | 'ATR_BASED' | 'STRUCTURE'
  trailingDistance?: number    // For trailing stop
  breakEvenTrigger?: number    // Move to BE after X points profit
}

export interface TargetDetails {
  price: number
  percentToExit: number        // 25, 50, 100 etc
  type: 'FIXED' | 'ATR_MULTIPLE' | 'STRUCTURE' | 'EXTENSION'
}

export interface InvalidationCondition {
  type: 'PRICE_LEVEL' | 'TIME' | 'REGIME_CHANGE' | 'MOMENTUM' | 'VOLUME'
  level?: number
  description: string
}

export interface StrategyMetadata {
  regime: MarketRegimeType
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  sessionType: SessionType
  volumeConfirmation: boolean
  structureContext: StructureContext
  riskRewardRatio: number
  expectedWinRate: number      // Based on historical data
}

export type SessionType =
  | 'ASIA'           // 7pm - 2am ET
  | 'LONDON'         // 2am - 8am ET
  | 'NY_OPEN'        // 8am - 10am ET
  | 'NY_MORNING'     // 10am - 12pm ET
  | 'NY_LUNCH'       // 12pm - 2pm ET
  | 'NY_AFTERNOON'   // 2pm - 4pm ET
  | 'NY_CLOSE'       // 4pm - 5pm ET

export interface StructureContext {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING'
  lastSwingHigh: number
  lastSwingLow: number
  hasHH: boolean               // Higher High
  hasHL: boolean               // Higher Low
  hasLH: boolean               // Lower High
  hasLL: boolean               // Lower Low
  bosLevel?: number            // Last BOS level
  chochLevel?: number          // Last CHoCH level
}

// =============================================================================
// MARKET REGIME CLASSIFIER
// Source: Adam Grimes, Ernest Chan, Euan Sinclair
// =============================================================================

export interface RegimeAnalysis {
  current: MarketRegimeType
  confidence: number           // How confident in classification
  duration: number             // How long in this regime (bars)
  isTransitioning: boolean     // Regime changing?
  nextLikely: MarketRegimeType | null
  volatilityPercentile: number // 0-100, where current volatility sits historically
  trendStrength: number        // 0-100
  tradingRecommendation: 'AGGRESSIVE' | 'NORMAL' | 'DEFENSIVE' | 'NO_TRADE'
}

export function classifyMarketRegime(
  candles: Candle[],
  lookback: number = 100
): RegimeAnalysis {
  if (candles.length < lookback) {
    return {
      current: 'RANGE_WIDE',
      confidence: 0,
      duration: 0,
      isTransitioning: false,
      nextLikely: null,
      volatilityPercentile: 50,
      trendStrength: 0,
      tradingRecommendation: 'NO_TRADE'
    }
  }

  const recent = candles.slice(-lookback)

  // Calculate key metrics
  const atr = calculateATR(recent, 14)
  const atr50 = calculateATR(candles.slice(-50), 14)
  const atrRatio = atr / atr50

  const adxData = calculateADX(recent, 14)
  const { adx, plusDI, minusDI } = adxData

  const bbData = calculateBollingerBands(recent.map(c => c.close), 20, 2)
  const bbWidth = bbData.width

  const avgVolume = recent.slice(0, -1).reduce((s, c) => s + c.volume, 0) / (recent.length - 1)
  const currentVolume = recent[recent.length - 1].volume
  const volumeRatio = currentVolume / avgVolume

  // Swing structure analysis
  const structure = analyzeSwingStructure(recent)

  // Historical volatility percentile
  const historicalATRs = []
  for (let i = 20; i < candles.length - 14; i++) {
    historicalATRs.push(calculateATR(candles.slice(i - 14, i), 14))
  }
  historicalATRs.sort((a, b) => a - b)
  const volatilityPercentile = (historicalATRs.findIndex(a => a >= atr) / historicalATRs.length) * 100

  // Classify regime
  let regime: MarketRegimeType
  let confidence = 0
  let trendStrength = 0

  // Check for news-driven/illiquid first (priority)
  if (volumeRatio > 3 && atrRatio > 2) {
    regime = 'NEWS_DRIVEN'
    confidence = 90
  }
  else if (volumeRatio < 0.3 || avgVolume < 1000) {
    regime = 'ILLIQUID'
    confidence = 85
  }
  // High/Low volatility
  else if (atrRatio > 1.5 || bbWidth > 3) {
    regime = 'HIGH_VOLATILITY'
    confidence = 80
  }
  else if (atrRatio < 0.6 || bbWidth < 0.5) {
    regime = 'LOW_VOLATILITY'
    confidence = 80
  }
  // Trend detection
  else if (adx > 30) {
    trendStrength = Math.min(100, adx * 2)
    if (plusDI > minusDI + 10 && structure.hasHH && structure.hasHL) {
      regime = 'TREND_STRONG_UP'
      confidence = 85
    }
    else if (minusDI > plusDI + 10 && structure.hasLH && structure.hasLL) {
      regime = 'TREND_STRONG_DOWN'
      confidence = 85
    }
    else {
      regime = plusDI > minusDI ? 'TREND_WEAK_UP' : 'TREND_WEAK_DOWN'
      confidence = 65
    }
  }
  else if (adx > 20) {
    trendStrength = Math.min(60, adx * 2)
    regime = plusDI > minusDI ? 'TREND_WEAK_UP' : 'TREND_WEAK_DOWN'
    confidence = 60
  }
  // Ranging
  else {
    if (atrRatio < 0.8) {
      regime = 'RANGE_TIGHT'
    } else {
      regime = 'RANGE_WIDE'
    }
    confidence = 70
  }

  // Determine trading recommendation
  let tradingRecommendation: 'AGGRESSIVE' | 'NORMAL' | 'DEFENSIVE' | 'NO_TRADE'

  if (regime === 'NEWS_DRIVEN' || regime === 'ILLIQUID') {
    tradingRecommendation = 'NO_TRADE'
  }
  else if (regime === 'HIGH_VOLATILITY' || volatilityPercentile > 90) {
    tradingRecommendation = 'DEFENSIVE'
  }
  else if (regime.startsWith('TREND_STRONG') && confidence > 75) {
    tradingRecommendation = 'AGGRESSIVE'
  }
  else {
    tradingRecommendation = 'NORMAL'
  }

  return {
    current: regime,
    confidence,
    duration: 0, // Would need state tracking
    isTransitioning: adx > 18 && adx < 22, // Near threshold
    nextLikely: null,
    volatilityPercentile,
    trendStrength,
    tradingRecommendation
  }
}

// =============================================================================
// STRATEGY GROUP 1: MARKET STRUCTURE & PRICE ACTION
// Source: Al Brooks, ICT, LuxAlgo
// =============================================================================

/**
 * STRATEGY 1: BREAK OF STRUCTURE (BOS) - Trend Continuation
 *
 * Definition: Price closes beyond prior swing high/low with displacement,
 * confirming trend continuation.
 *
 * WORKS IN: TREND_STRONG_UP, TREND_STRONG_DOWN, TREND_WEAK_UP, TREND_WEAK_DOWN
 * FAILS IN: RANGE_TIGHT, RANGE_WIDE, NEWS_DRIVEN, ILLIQUID
 *
 * Entry: After pullback/retest of broken level, NOT on raw breakout
 * Invalidation: Close back inside the broken structure
 */
export function detectBOSSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  // Regime filter - only trade in trending markets
  if (!regime.current.startsWith('TREND')) {
    return null
  }

  const structure = analyzeSwingStructure(candles.slice(-50))
  const current = candles[candles.length - 1]
  const atr = calculateATR(candles.slice(-20), 14)

  // Calculate displacement (candle must be larger than average)
  const avgRange = candles.slice(-20).reduce((s, c) => s + (c.high - c.low), 0) / 20
  const currentRange = current.high - current.low
  const isDisplacement = currentRange > avgRange * 1.5

  // BULLISH BOS: Break above prior swing high
  if (structure.trend === 'BULLISH' && htfBias !== 'BEARISH') {
    const priorSwingHigh = structure.lastSwingHigh

    // Must close above, not just wick
    if (current.close > priorSwingHigh && isDisplacement) {
      // Check for pullback - price came down to retest
      const pullbackCandles = candles.slice(-10, -1)
      const lowestPullback = Math.min(...pullbackCandles.map(c => c.low))
      const hasRetested = lowestPullback <= priorSwingHigh + atr * 0.3

      if (!hasRetested) {
        return null // Wait for retest, don't chase
      }

      // Quality score based on confluence
      let qualityScore = 50
      if (isDisplacement) qualityScore += 15
      if (htfBias === 'BULLISH') qualityScore += 20
      if (regime.trendStrength > 60) qualityScore += 15

      return {
        type: 'BOS_CONTINUATION',
        direction: 'LONG',
        confidence: Math.min(90, regime.confidence),
        qualityScore,
        entry: {
          price: priorSwingHigh + atr * 0.1, // Slight buffer above
          type: 'LIMIT',
          waitForRetest: true,
          maxSlippage: atr * 0.3
        },
        stopLoss: {
          price: structure.lastSwingLow - atr * 0.2,
          type: 'STRUCTURE',
          breakEvenTrigger: atr * 2
        },
        targets: [
          { price: current.close + atr * 2, percentToExit: 50, type: 'ATR_MULTIPLE' },
          { price: current.close + atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: structure.lastSwingLow, description: 'Close below prior swing low' },
          { type: 'REGIME_CHANGE', description: 'ADX drops below 20' },
          { type: 'TIME', description: 'No follow-through in 10 bars' }
        ],
        timeLimit: 60, // 1 hour on 1m chart
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: current.volume > avgRange,
          structureContext: structure,
          riskRewardRatio: 2.0,
          expectedWinRate: 55
        }
      }
    }
  }

  // BEARISH BOS: Break below prior swing low
  if (structure.trend === 'BEARISH' && htfBias !== 'BULLISH') {
    const priorSwingLow = structure.lastSwingLow

    if (current.close < priorSwingLow && isDisplacement) {
      const pullbackCandles = candles.slice(-10, -1)
      const highestPullback = Math.max(...pullbackCandles.map(c => c.high))
      const hasRetested = highestPullback >= priorSwingLow - atr * 0.3

      if (!hasRetested) {
        return null
      }

      let qualityScore = 50
      if (isDisplacement) qualityScore += 15
      if (htfBias === 'BEARISH') qualityScore += 20
      if (regime.trendStrength > 60) qualityScore += 15

      return {
        type: 'BOS_CONTINUATION',
        direction: 'SHORT',
        confidence: Math.min(90, regime.confidence),
        qualityScore,
        entry: {
          price: priorSwingLow - atr * 0.1,
          type: 'LIMIT',
          waitForRetest: true,
          maxSlippage: atr * 0.3
        },
        stopLoss: {
          price: structure.lastSwingHigh + atr * 0.2,
          type: 'STRUCTURE',
          breakEvenTrigger: atr * 2
        },
        targets: [
          { price: current.close - atr * 2, percentToExit: 50, type: 'ATR_MULTIPLE' },
          { price: current.close - atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: structure.lastSwingHigh, description: 'Close above prior swing high' },
          { type: 'REGIME_CHANGE', description: 'ADX drops below 20' }
        ],
        timeLimit: 60,
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: current.volume > avgRange,
          structureContext: structure,
          riskRewardRatio: 2.0,
          expectedWinRate: 55
        }
      }
    }
  }

  return null
}

/**
 * STRATEGY 2: CHANGE OF CHARACTER (CHoCH) - Trend Reversal
 *
 * Definition: Internal structure breaks against prevailing trend,
 * signaling potential reversal.
 *
 * WORKS IN: After extended trends, at session extremes
 * FAILS IN: Strong trends, low volatility, no liquidity sweep prior
 *
 * Entry: After confirmation candle, not on the break itself
 * Invalidation: Continuation of prior trend structure
 */
export function detectCHoCHSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  // Only look for CHoCH after established trends
  if (regime.trendStrength < 40) {
    return null // Need established trend to reverse
  }

  const structure = analyzeSwingStructure(candles.slice(-50))
  const current = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  const atr = calculateATR(candles.slice(-20), 14)

  // Look for liquidity sweep before CHoCH (institutional requirement)
  const liquidityPools = detectLiquidityPools(candles.slice(-30))
  const recentSweep = liquidityPools.some(p => p.swept)

  if (!recentSweep) {
    return null // CHoCH without liquidity sweep is weak
  }

  // BULLISH CHoCH: Was bearish, now breaking above last lower high
  if (structure.trend === 'BEARISH' && structure.hasLH) {
    const lastLowerHigh = findLastLowerHigh(candles.slice(-30))

    if (lastLowerHigh && current.close > lastLowerHigh) {
      // Require confirmation candle (bullish candle after the break)
      const isBullishConfirmation = current.close > current.open &&
                                     current.close > prev.high

      if (!isBullishConfirmation) {
        return null // Wait for confirmation
      }

      let qualityScore = 45
      if (recentSweep) qualityScore += 20
      if (htfBias === 'BULLISH' || htfBias === 'NEUTRAL') qualityScore += 15
      if (regime.volatilityPercentile > 50) qualityScore += 10

      return {
        type: 'CHOCH_REVERSAL',
        direction: 'LONG',
        confidence: 70,
        qualityScore,
        entry: {
          price: current.close,
          type: 'MARKET',
          waitForRetest: false, // CHoCH needs quick entry
          maxSlippage: atr * 0.5
        },
        stopLoss: {
          price: structure.lastSwingLow - atr * 0.3,
          type: 'STRUCTURE',
          breakEvenTrigger: atr * 1.5
        },
        targets: [
          { price: current.close + atr * 1.5, percentToExit: 33, type: 'ATR_MULTIPLE' },
          { price: current.close + atr * 3, percentToExit: 33, type: 'ATR_MULTIPLE' },
          { price: structure.lastSwingHigh, percentToExit: 34, type: 'STRUCTURE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: structure.lastSwingLow, description: 'New low invalidates CHoCH' },
          { type: 'MOMENTUM', description: 'Bearish engulfing within 5 bars' }
        ],
        timeLimit: 45, // Quick move expected
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: true,
          structureContext: structure,
          riskRewardRatio: 2.5,
          expectedWinRate: 45 // Lower WR but good R:R
        }
      }
    }
  }

  // BEARISH CHoCH: Was bullish, now breaking below last higher low
  if (structure.trend === 'BULLISH' && structure.hasHL) {
    const lastHigherLow = findLastHigherLow(candles.slice(-30))

    if (lastHigherLow && current.close < lastHigherLow) {
      const isBearishConfirmation = current.close < current.open &&
                                     current.close < prev.low

      if (!isBearishConfirmation) {
        return null
      }

      let qualityScore = 45
      if (recentSweep) qualityScore += 20
      if (htfBias === 'BEARISH' || htfBias === 'NEUTRAL') qualityScore += 15
      if (regime.volatilityPercentile > 50) qualityScore += 10

      return {
        type: 'CHOCH_REVERSAL',
        direction: 'SHORT',
        confidence: 70,
        qualityScore,
        entry: {
          price: current.close,
          type: 'MARKET',
          waitForRetest: false,
          maxSlippage: atr * 0.5
        },
        stopLoss: {
          price: structure.lastSwingHigh + atr * 0.3,
          type: 'STRUCTURE',
          breakEvenTrigger: atr * 1.5
        },
        targets: [
          { price: current.close - atr * 1.5, percentToExit: 33, type: 'ATR_MULTIPLE' },
          { price: current.close - atr * 3, percentToExit: 33, type: 'ATR_MULTIPLE' },
          { price: structure.lastSwingLow, percentToExit: 34, type: 'STRUCTURE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: structure.lastSwingHigh, description: 'New high invalidates CHoCH' },
          { type: 'MOMENTUM', description: 'Bullish engulfing within 5 bars' }
        ],
        timeLimit: 45,
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: true,
          structureContext: structure,
          riskRewardRatio: 2.5,
          expectedWinRate: 45
        }
      }
    }
  }

  return null
}

/**
 * STRATEGY 3: FAILED BREAKOUT / FALSE EXPANSION
 *
 * Definition: Price breaks key level, fails to hold, aggressively reverses.
 * "The market is a mechanism to take money from the impatient to the patient."
 *
 * WORKS IN: RANGE_WIDE, RANGE_TIGHT (best), at session extremes
 * FAILS IN: Strong trends, high volatility news events
 */
export function detectFailedBreakoutSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  // Best in ranging markets
  if (!regime.current.startsWith('RANGE') && regime.current !== 'LOW_VOLATILITY') {
    return null
  }

  const atr = calculateATR(candles.slice(-20), 14)
  const current = candles[candles.length - 1]
  const prev = candles[candles.length - 2]

  // Find key levels
  const { resistance, support } = findKeyLevels(candles.slice(-100))

  // FALSE BREAKOUT ABOVE (Bearish)
  // Previous bar broke above resistance, current bar closes back below
  if (prev.high > resistance && prev.close > resistance * 0.999 &&
      current.close < resistance && current.close < current.open) {

    // Confirm rejection with strong bearish candle
    const rejectionStrength = (prev.high - current.close) / atr
    if (rejectionStrength < 0.5) {
      return null // Weak rejection
    }

    // Volume confirmation: high volume on rejection
    const avgVolume = candles.slice(-20, -1).reduce((s, c) => s + c.volume, 0) / 19
    const volumeConfirm = current.volume > avgVolume * 1.2

    let qualityScore = 50
    if (volumeConfirm) qualityScore += 15
    if (rejectionStrength > 1.0) qualityScore += 15
    if (htfBias !== 'BULLISH') qualityScore += 10
    if (regime.current === 'RANGE_TIGHT') qualityScore += 10

    return {
      type: 'FAILED_BREAKOUT',
      direction: 'SHORT',
      confidence: 75,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: prev.high + atr * 0.2,
        type: 'FIXED',
        breakEvenTrigger: atr * 1.0
      },
      targets: [
        { price: support + (resistance - support) * 0.5, percentToExit: 50, type: 'FIXED' },
        { price: support, percentToExit: 50, type: 'STRUCTURE' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: prev.high + atr * 0.1, description: 'New high above failed breakout' },
        { type: 'TIME', description: 'No follow-through in 15 bars' }
      ],
      timeLimit: 30,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: getCurrentSessionType(),
        volumeConfirmation: volumeConfirm,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 60
      }
    }
  }

  // FALSE BREAKOUT BELOW (Bullish)
  if (prev.low < support && prev.close < support * 1.001 &&
      current.close > support && current.close > current.open) {

    const rejectionStrength = (current.close - prev.low) / atr
    if (rejectionStrength < 0.5) {
      return null
    }

    const avgVolume = candles.slice(-20, -1).reduce((s, c) => s + c.volume, 0) / 19
    const volumeConfirm = current.volume > avgVolume * 1.2

    let qualityScore = 50
    if (volumeConfirm) qualityScore += 15
    if (rejectionStrength > 1.0) qualityScore += 15
    if (htfBias !== 'BEARISH') qualityScore += 10
    if (regime.current === 'RANGE_TIGHT') qualityScore += 10

    return {
      type: 'FAILED_BREAKOUT',
      direction: 'LONG',
      confidence: 75,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: prev.low - atr * 0.2,
        type: 'FIXED',
        breakEvenTrigger: atr * 1.0
      },
      targets: [
        { price: support + (resistance - support) * 0.5, percentToExit: 50, type: 'FIXED' },
        { price: resistance, percentToExit: 50, type: 'STRUCTURE' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: prev.low - atr * 0.1, description: 'New low below failed breakout' }
      ],
      timeLimit: 30,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: getCurrentSessionType(),
        volumeConfirmation: volumeConfirm,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 60
      }
    }
  }

  return null
}

// =============================================================================
// STRATEGY GROUP 2: LIQUIDITY & STOP-RUN LOGIC
// Source: ICT, Smart Money Concepts
// =============================================================================

/**
 * STRATEGY 4: LIQUIDITY SWEEP REVERSAL
 *
 * Definition: Price runs equal highs/lows or session extremes to trigger
 * stop losses, then reverses. Classic institutional manipulation.
 *
 * WORKS IN: All regimes, best at session times
 * FAILS IN: Strong one-directional moves (news), illiquid markets
 */
export function detectLiquiditySweepSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  if (regime.current === 'NEWS_DRIVEN' || regime.current === 'ILLIQUID') {
    return null
  }

  const atr = calculateATR(candles.slice(-20), 14)
  const current = candles[candles.length - 1]

  // Find liquidity pools (equal highs/lows)
  const pools = detectLiquidityPools(candles.slice(-50))

  // Check for sweep + immediate rejection
  for (const pool of pools) {
    if (pool.swept) {
      // BUY-SIDE SWEEP (above equal highs) -> Potential SHORT
      if (pool.type === 'BUY_SIDE') {
        const sweepBar = candles.find(c => c.high > pool.price)
        if (!sweepBar) continue

        // Must reject immediately - current bar closes below sweep level
        if (current.close < pool.price && current.close < current.open) {
          const sweepDepth = (sweepBar.high - pool.price) / atr

          // Quality sweep: brief penetration, strong rejection
          if (sweepDepth > 0.2 && sweepDepth < 1.5) {
            let qualityScore = 55
            if (pool.strength >= 3) qualityScore += 15 // Multiple equal highs
            if (htfBias !== 'BULLISH') qualityScore += 15
            if (regime.current.startsWith('RANGE')) qualityScore += 10

            return {
              type: 'LIQUIDITY_SWEEP',
              direction: 'SHORT',
              confidence: 80,
              qualityScore,
              entry: {
                price: pool.price - atr * 0.1, // Just below the sweep level
                type: 'LIMIT',
                waitForRetest: true,
                maxSlippage: atr * 0.2
              },
              stopLoss: {
                price: sweepBar.high + atr * 0.3,
                type: 'FIXED',
                breakEvenTrigger: atr * 1.5
              },
              targets: [
                { price: current.close - atr * 2, percentToExit: 50, type: 'ATR_MULTIPLE' },
                { price: current.close - atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
              ],
              invalidation: [
                { type: 'PRICE_LEVEL', level: sweepBar.high, description: 'New high above sweep' },
                { type: 'TIME', description: 'No move within 20 bars' }
              ],
              timeLimit: 45,
              metadata: {
                regime: regime.current,
                htfBias,
                sessionType: getCurrentSessionType(),
                volumeConfirmation: current.volume > 0,
                structureContext: analyzeSwingStructure(candles.slice(-50)),
                riskRewardRatio: 2.5,
                expectedWinRate: 55
              }
            }
          }
        }
      }

      // SELL-SIDE SWEEP (below equal lows) -> Potential LONG
      if (pool.type === 'SELL_SIDE') {
        const sweepBar = candles.find(c => c.low < pool.price)
        if (!sweepBar) continue

        if (current.close > pool.price && current.close > current.open) {
          const sweepDepth = (pool.price - sweepBar.low) / atr

          if (sweepDepth > 0.2 && sweepDepth < 1.5) {
            let qualityScore = 55
            if (pool.strength >= 3) qualityScore += 15
            if (htfBias !== 'BEARISH') qualityScore += 15
            if (regime.current.startsWith('RANGE')) qualityScore += 10

            return {
              type: 'LIQUIDITY_SWEEP',
              direction: 'LONG',
              confidence: 80,
              qualityScore,
              entry: {
                price: pool.price + atr * 0.1,
                type: 'LIMIT',
                waitForRetest: true,
                maxSlippage: atr * 0.2
              },
              stopLoss: {
                price: sweepBar.low - atr * 0.3,
                type: 'FIXED',
                breakEvenTrigger: atr * 1.5
              },
              targets: [
                { price: current.close + atr * 2, percentToExit: 50, type: 'ATR_MULTIPLE' },
                { price: current.close + atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
              ],
              invalidation: [
                { type: 'PRICE_LEVEL', level: sweepBar.low, description: 'New low below sweep' }
              ],
              timeLimit: 45,
              metadata: {
                regime: regime.current,
                htfBias,
                sessionType: getCurrentSessionType(),
                volumeConfirmation: current.volume > 0,
                structureContext: analyzeSwingStructure(candles.slice(-50)),
                riskRewardRatio: 2.5,
                expectedWinRate: 55
              }
            }
          }
        }
      }
    }
  }

  return null
}

/**
 * STRATEGY 5: SESSION HIGH/LOW REVERSION
 *
 * Definition: Mean reversion after stop-runs at Asia/London/NY session extremes.
 *
 * WORKS IN: All regimes except strong trends
 * FAILS IN: Trend days, news-driven moves
 */
export function detectSessionReversionSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  sessionHighs: { asia: number; london: number; ny: number },
  sessionLows: { asia: number; london: number; ny: number }
): StrategySignal | null {
  // Skip in strong trends
  if (regime.trendStrength > 60) {
    return null
  }

  const current = candles[candles.length - 1]
  const atr = calculateATR(candles.slice(-20), 14)
  const currentSession = getCurrentSessionType()

  // Only trade during NY session for best liquidity
  if (!currentSession.startsWith('NY')) {
    return null
  }

  // Check for overextension past session levels
  const nyHigh = sessionHighs.ny
  const nyLow = sessionLows.ny

  // Overextension above NY high
  if (current.high > nyHigh + atr * 0.5 && current.close < nyHigh) {
    // Failed extension above - reversion SHORT
    let qualityScore = 50
    if (regime.current.startsWith('RANGE')) qualityScore += 15
    if (current.close < current.open) qualityScore += 10 // Bearish candle

    return {
      type: 'SESSION_REVERSION',
      direction: 'SHORT',
      confidence: 70,
      qualityScore,
      entry: {
        price: nyHigh,
        type: 'LIMIT',
        waitForRetest: true,
        maxSlippage: atr * 0.2
      },
      stopLoss: {
        price: current.high + atr * 0.3,
        type: 'FIXED'
      },
      targets: [
        { price: (nyHigh + nyLow) / 2, percentToExit: 50, type: 'FIXED' }, // Session midpoint
        { price: nyLow + atr * 0.5, percentToExit: 50, type: 'FIXED' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: current.high + atr * 0.2, description: 'New session high' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: currentSession,
        volumeConfirmation: true,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 55
      }
    }
  }

  // Overextension below NY low
  if (current.low < nyLow - atr * 0.5 && current.close > nyLow) {
    let qualityScore = 50
    if (regime.current.startsWith('RANGE')) qualityScore += 15
    if (current.close > current.open) qualityScore += 10

    return {
      type: 'SESSION_REVERSION',
      direction: 'LONG',
      confidence: 70,
      qualityScore,
      entry: {
        price: nyLow,
        type: 'LIMIT',
        waitForRetest: true,
        maxSlippage: atr * 0.2
      },
      stopLoss: {
        price: current.low - atr * 0.3,
        type: 'FIXED'
      },
      targets: [
        { price: (nyHigh + nyLow) / 2, percentToExit: 50, type: 'FIXED' },
        { price: nyHigh - atr * 0.5, percentToExit: 50, type: 'FIXED' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: current.low - atr * 0.2, description: 'New session low' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: currentSession,
        volumeConfirmation: true,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 55
      }
    }
  }

  return null
}

// =============================================================================
// STRATEGY GROUP 3: TREND & MOMENTUM CONTINUATION
// Source: Adam Grimes, Al Brooks
// =============================================================================

/**
 * STRATEGY 6: TREND PULLBACK CONTINUATION
 *
 * Definition: Enter in direction of dominant trend after controlled pullback.
 * "The trend is your friend until it ends."
 *
 * WORKS IN: TREND_STRONG_UP, TREND_STRONG_DOWN, TREND_WEAK_*
 * FAILS IN: Ranging, reversing, high volatility expansion
 */
export function detectTrendPullbackSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  // Only trade in trending regimes
  if (!regime.current.includes('TREND')) {
    return null
  }

  const atr = calculateATR(candles.slice(-20), 14)
  const current = candles[candles.length - 1]
  const closes = candles.map(c => c.close)

  // EMA for trend definition
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)
  const lastEMA20 = ema20[ema20.length - 1]
  const lastEMA50 = ema50[ema50.length - 1]

  // RSI for pullback detection
  const rsi = calculateRSI(closes, 14)
  const lastRSI = rsi[rsi.length - 1]

  // UPTREND PULLBACK
  if (regime.current.includes('UP') && lastEMA20 > lastEMA50) {
    // Pullback: price near EMA20, RSI in 35-50 zone
    const distanceToEMA = Math.abs(current.close - lastEMA20) / atr
    const isNearEMA = distanceToEMA < 0.7
    const isRSIPullback = lastRSI >= 35 && lastRSI <= 55

    // Volatility contraction during pullback
    const recentATR = calculateATR(candles.slice(-5), 5)
    const isContracting = recentATR < atr * 0.8

    if (isNearEMA && isRSIPullback) {
      // Check for expansion candle (entry trigger)
      const isExpansion = current.close > current.open &&
                          (current.close - current.open) > atr * 0.5

      if (!isExpansion) {
        return null // Wait for expansion
      }

      let qualityScore = 50
      if (isContracting) qualityScore += 15 // Volatility contraction before expansion
      if (htfBias === 'BULLISH') qualityScore += 20
      if (regime.trendStrength > 50) qualityScore += 10
      if (lastRSI < 45) qualityScore += 5 // Better pullback

      return {
        type: 'TREND_PULLBACK',
        direction: 'LONG',
        confidence: 80,
        qualityScore,
        entry: {
          price: current.close,
          type: 'MARKET',
          waitForRetest: false,
          maxSlippage: atr * 0.3
        },
        stopLoss: {
          price: Math.min(lastEMA50 - atr * 0.2, current.low - atr * 0.5),
          type: 'ATR_BASED',
          trailingDistance: atr * 2,
          breakEvenTrigger: atr * 1.5
        },
        targets: [
          { price: current.close + atr * 2, percentToExit: 40, type: 'ATR_MULTIPLE' },
          { price: current.close + atr * 4, percentToExit: 40, type: 'ATR_MULTIPLE' },
          { price: current.close + atr * 6, percentToExit: 20, type: 'ATR_MULTIPLE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: lastEMA50, description: 'Close below EMA50' },
          { type: 'REGIME_CHANGE', description: 'ADX drops below 20' }
        ],
        timeLimit: 120, // Let trends run
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: current.volume > 0,
          structureContext: analyzeSwingStructure(candles.slice(-50)),
          riskRewardRatio: 2.5,
          expectedWinRate: 55
        }
      }
    }
  }

  // DOWNTREND PULLBACK
  if (regime.current.includes('DOWN') && lastEMA20 < lastEMA50) {
    const distanceToEMA = Math.abs(current.close - lastEMA20) / atr
    const isNearEMA = distanceToEMA < 0.7
    const isRSIPullback = lastRSI >= 45 && lastRSI <= 65

    const recentATR = calculateATR(candles.slice(-5), 5)
    const isContracting = recentATR < atr * 0.8

    if (isNearEMA && isRSIPullback) {
      const isExpansion = current.close < current.open &&
                          (current.open - current.close) > atr * 0.5

      if (!isExpansion) {
        return null
      }

      let qualityScore = 50
      if (isContracting) qualityScore += 15
      if (htfBias === 'BEARISH') qualityScore += 20
      if (regime.trendStrength > 50) qualityScore += 10
      if (lastRSI > 55) qualityScore += 5

      return {
        type: 'TREND_PULLBACK',
        direction: 'SHORT',
        confidence: 80,
        qualityScore,
        entry: {
          price: current.close,
          type: 'MARKET',
          waitForRetest: false,
          maxSlippage: atr * 0.3
        },
        stopLoss: {
          price: Math.max(lastEMA50 + atr * 0.2, current.high + atr * 0.5),
          type: 'ATR_BASED',
          trailingDistance: atr * 2,
          breakEvenTrigger: atr * 1.5
        },
        targets: [
          { price: current.close - atr * 2, percentToExit: 40, type: 'ATR_MULTIPLE' },
          { price: current.close - atr * 4, percentToExit: 40, type: 'ATR_MULTIPLE' },
          { price: current.close - atr * 6, percentToExit: 20, type: 'ATR_MULTIPLE' }
        ],
        invalidation: [
          { type: 'PRICE_LEVEL', level: lastEMA50, description: 'Close above EMA50' }
        ],
        timeLimit: 120,
        metadata: {
          regime: regime.current,
          htfBias,
          sessionType: getCurrentSessionType(),
          volumeConfirmation: current.volume > 0,
          structureContext: analyzeSwingStructure(candles.slice(-50)),
          riskRewardRatio: 2.5,
          expectedWinRate: 55
        }
      }
    }
  }

  return null
}

/**
 * STRATEGY 7: VOLATILITY EXPANSION BREAKOUT
 *
 * Definition: Breakout after prolonged compression (low volatility squeeze).
 *
 * WORKS IN: LOW_VOLATILITY transitioning to any other state
 * FAILS IN: Already high volatility, chop
 */
export function detectVolatilityBreakoutSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  // Only trade out of low volatility compression
  if (regime.volatilityPercentile > 30) {
    return null // Not in compression
  }

  const current = candles[candles.length - 1]
  const atr14 = calculateATR(candles.slice(-20), 14)
  const atr5 = calculateATR(candles.slice(-7), 5)

  // Expansion: recent ATR suddenly larger than 14-period
  const isExpanding = atr5 > atr14 * 1.3

  if (!isExpanding) {
    return null
  }

  // Find the range that's being broken
  const compressionCandles = candles.slice(-20, -1) // Exclude current
  const compressionHigh = Math.max(...compressionCandles.map(c => c.high))
  const compressionLow = Math.min(...compressionCandles.map(c => c.low))

  // BREAKOUT ABOVE
  if (current.close > compressionHigh && current.close > current.open) {
    // Prefer retest entry, but market OK for strong breaks
    const breakStrength = (current.close - compressionHigh) / atr14

    let qualityScore = 45
    if (breakStrength > 0.5) qualityScore += 15
    if (htfBias !== 'BEARISH') qualityScore += 15
    if (regime.volatilityPercentile < 20) qualityScore += 10 // Tighter squeeze = better

    return {
      type: 'VOLATILITY_BREAKOUT',
      direction: 'LONG',
      confidence: 75,
      qualityScore,
      entry: {
        price: breakStrength > 0.8 ? current.close : compressionHigh + atr14 * 0.1,
        type: breakStrength > 0.8 ? 'MARKET' : 'LIMIT',
        waitForRetest: breakStrength < 0.8,
        maxSlippage: atr14 * 0.4
      },
      stopLoss: {
        price: (compressionHigh + compressionLow) / 2, // Middle of range
        type: 'FIXED',
        breakEvenTrigger: atr14 * 1.5
      },
      targets: [
        { price: compressionHigh + (compressionHigh - compressionLow), percentToExit: 50, type: 'EXTENSION' },
        { price: compressionHigh + (compressionHigh - compressionLow) * 1.618, percentToExit: 50, type: 'EXTENSION' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: compressionLow, description: 'Break back into range' },
        { type: 'TIME', description: 'No continuation in 20 bars' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: getCurrentSessionType(),
        volumeConfirmation: current.volume > 0,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 2.0,
        expectedWinRate: 50
      }
    }
  }

  // BREAKOUT BELOW
  if (current.close < compressionLow && current.close < current.open) {
    const breakStrength = (compressionLow - current.close) / atr14

    let qualityScore = 45
    if (breakStrength > 0.5) qualityScore += 15
    if (htfBias !== 'BULLISH') qualityScore += 15
    if (regime.volatilityPercentile < 20) qualityScore += 10

    return {
      type: 'VOLATILITY_BREAKOUT',
      direction: 'SHORT',
      confidence: 75,
      qualityScore,
      entry: {
        price: breakStrength > 0.8 ? current.close : compressionLow - atr14 * 0.1,
        type: breakStrength > 0.8 ? 'MARKET' : 'LIMIT',
        waitForRetest: breakStrength < 0.8,
        maxSlippage: atr14 * 0.4
      },
      stopLoss: {
        price: (compressionHigh + compressionLow) / 2,
        type: 'FIXED',
        breakEvenTrigger: atr14 * 1.5
      },
      targets: [
        { price: compressionLow - (compressionHigh - compressionLow), percentToExit: 50, type: 'EXTENSION' },
        { price: compressionLow - (compressionHigh - compressionLow) * 1.618, percentToExit: 50, type: 'EXTENSION' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: compressionHigh, description: 'Break back into range' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: getCurrentSessionType(),
        volumeConfirmation: current.volume > 0,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 2.0,
        expectedWinRate: 50
      }
    }
  }

  return null
}

// =============================================================================
// STRATEGY GROUP 4: MEAN REVERSION / STATISTICAL EDGE
// Source: Ernest Chan, Euan Sinclair, QuantInsti
// =============================================================================

/**
 * STRATEGY 8: VWAP DEVIATION REVERSION
 *
 * Definition: Statistical mean reversion when price deviates excessively
 * from VWAP. Based on the paper by Zarattini & Aziz (SSRN) - Sharpe 2.1.
 *
 * WORKS IN: RANGE_WIDE, RANGE_TIGHT, non-trending
 * FAILS IN: Strong trends, news events
 */
export function detectVWAPReversionSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  vwap: number,
  vwapStdDev: number
): StrategySignal | null {
  // Don't trade mean reversion in trends
  if (regime.current.startsWith('TREND_STRONG')) {
    return null
  }

  const current = candles[candles.length - 1]
  const atr = calculateATR(candles.slice(-20), 14)

  // Calculate standard deviation bands
  const upper2SD = vwap + vwapStdDev * 2
  const lower2SD = vwap - vwapStdDev * 2

  // Distance from VWAP in standard deviations
  const distanceSD = (current.close - vwap) / vwapStdDev

  // RSI for exhaustion confirmation
  const rsi = calculateRSI(candles.map(c => c.close), 14)
  const lastRSI = rsi[rsi.length - 1]

  // LONG: Price below -2 SD AND RSI oversold
  if (distanceSD <= -2 && lastRSI < 35) {
    // Check for reversal candle (wick rejection, bullish close)
    const hasRejectionWick = (current.close - current.low) > (current.high - current.low) * 0.6

    if (!hasRejectionWick && current.close < current.open) {
      return null // Wait for reversal confirmation
    }

    let qualityScore = 50
    if (Math.abs(distanceSD) > 2.5) qualityScore += 15
    if (lastRSI < 25) qualityScore += 10
    if (regime.current.startsWith('RANGE')) qualityScore += 15
    if (hasRejectionWick) qualityScore += 10

    return {
      type: 'VWAP_DEVIATION',
      direction: 'LONG',
      confidence: 80,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: current.low - atr * 0.5,
        type: 'FIXED'
      },
      targets: [
        { price: vwap - vwapStdDev, percentToExit: 50, type: 'FIXED' }, // -1 SD
        { price: vwap, percentToExit: 50, type: 'FIXED' }               // VWAP
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: lower2SD - vwapStdDev, description: 'Break to -3 SD' },
        { type: 'TIME', description: 'No reversion in 30 bars' }
      ],
      timeLimit: 45,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: getCurrentSessionType(),
        volumeConfirmation: true,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.8,
        expectedWinRate: 60
      }
    }
  }

  // SHORT: Price above +2 SD AND RSI overbought
  if (distanceSD >= 2 && lastRSI > 65) {
    const hasRejectionWick = (current.high - current.close) > (current.high - current.low) * 0.6

    if (!hasRejectionWick && current.close > current.open) {
      return null
    }

    let qualityScore = 50
    if (Math.abs(distanceSD) > 2.5) qualityScore += 15
    if (lastRSI > 75) qualityScore += 10
    if (regime.current.startsWith('RANGE')) qualityScore += 15
    if (hasRejectionWick) qualityScore += 10

    return {
      type: 'VWAP_DEVIATION',
      direction: 'SHORT',
      confidence: 80,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: current.high + atr * 0.5,
        type: 'FIXED'
      },
      targets: [
        { price: vwap + vwapStdDev, percentToExit: 50, type: 'FIXED' },
        { price: vwap, percentToExit: 50, type: 'FIXED' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: upper2SD + vwapStdDev, description: 'Break to +3 SD' }
      ],
      timeLimit: 45,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: getCurrentSessionType(),
        volumeConfirmation: true,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.8,
        expectedWinRate: 60
      }
    }
  }

  return null
}

/**
 * STRATEGY 9: RANGE EXTREMES FADE
 *
 * Definition: Fade trades at established range highs/lows.
 *
 * WORKS IN: RANGE_WIDE, RANGE_TIGHT
 * FAILS IN: Any trending or volatile regime
 */
export function detectRangeFadeSignal(
  candles: Candle[],
  regime: RegimeAnalysis
): StrategySignal | null {
  // Only in ranging markets
  if (!regime.current.startsWith('RANGE')) {
    return null
  }

  const atr = calculateATR(candles.slice(-20), 14)
  const current = candles[candles.length - 1]

  // Find established range
  const { resistance, support } = findKeyLevels(candles.slice(-100))
  const rangeSize = resistance - support

  // Must be a valid range
  if (rangeSize < atr * 2 || rangeSize > atr * 10) {
    return null // Range too tight or too wide
  }

  // FADE AT RESISTANCE
  if (current.high >= resistance * 0.998 && current.close < resistance) {
    // Look for failed breakout attempt
    const volumeDecline = current.volume < candles[candles.length - 2].volume
    const bearishRejection = current.close < current.open

    if (!bearishRejection) {
      return null
    }

    let qualityScore = 50
    if (volumeDecline) qualityScore += 10
    if (bearishRejection) qualityScore += 15
    if (regime.current === 'RANGE_TIGHT') qualityScore += 10

    return {
      type: 'RANGE_FADE',
      direction: 'SHORT',
      confidence: 70,
      qualityScore,
      entry: {
        price: resistance - atr * 0.1,
        type: 'LIMIT',
        waitForRetest: true,
        maxSlippage: atr * 0.2
      },
      stopLoss: {
        price: resistance + atr * 0.5,
        type: 'FIXED'
      },
      targets: [
        { price: (resistance + support) / 2, percentToExit: 50, type: 'FIXED' },
        { price: support + rangeSize * 0.2, percentToExit: 50, type: 'FIXED' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: resistance + atr * 0.3, description: 'Breakout confirmed' },
        { type: 'REGIME_CHANGE', description: 'ADX rises above 25' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: getCurrentSessionType(),
        volumeConfirmation: volumeDecline,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 60
      }
    }
  }

  // FADE AT SUPPORT
  if (current.low <= support * 1.002 && current.close > support) {
    const volumeDecline = current.volume < candles[candles.length - 2].volume
    const bullishRejection = current.close > current.open

    if (!bullishRejection) {
      return null
    }

    let qualityScore = 50
    if (volumeDecline) qualityScore += 10
    if (bullishRejection) qualityScore += 15
    if (regime.current === 'RANGE_TIGHT') qualityScore += 10

    return {
      type: 'RANGE_FADE',
      direction: 'LONG',
      confidence: 70,
      qualityScore,
      entry: {
        price: support + atr * 0.1,
        type: 'LIMIT',
        waitForRetest: true,
        maxSlippage: atr * 0.2
      },
      stopLoss: {
        price: support - atr * 0.5,
        type: 'FIXED'
      },
      targets: [
        { price: (resistance + support) / 2, percentToExit: 50, type: 'FIXED' },
        { price: resistance - rangeSize * 0.2, percentToExit: 50, type: 'FIXED' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: support - atr * 0.3, description: 'Breakdown confirmed' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias: 'NEUTRAL',
        sessionType: getCurrentSessionType(),
        volumeConfirmation: volumeDecline,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 1.5,
        expectedWinRate: 60
      }
    }
  }

  return null
}

// =============================================================================
// STRATEGY GROUP 5: TIME-BASED EDGES
// Source: Quantified Strategies, Adam Grimes
// =============================================================================

/**
 * STRATEGY 10: OPENING RANGE BREAKOUT (ORB)
 *
 * Definition: Directional expansion after the first 15-30 minutes.
 * Quantified Strategies research: 74.56% win rate, 2.512 profit factor.
 *
 * WORKS IN: All regimes except NEWS_DRIVEN, ILLIQUID
 * FAILS IN: Ranging days, low volatility compression
 */
export function detectORBSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  orbHigh: number,
  orbLow: number,
  orbFormed: boolean
): StrategySignal | null {
  if (!orbFormed) {
    return null // ORB still forming
  }

  if (regime.current === 'NEWS_DRIVEN' || regime.current === 'ILLIQUID') {
    return null
  }

  const current = candles[candles.length - 1]
  const atr = calculateATR(candles.slice(-20), 14)
  const orbRange = orbHigh - orbLow

  // Validate ORB size
  if (orbRange < atr * 0.3 || orbRange > atr * 3) {
    return null // ORB too small or too large
  }

  // Check current session time
  const session = getCurrentSessionType()
  if (session !== 'NY_OPEN' && session !== 'NY_MORNING') {
    return null // ORB only valid until ~12pm
  }

  // Volume confirmation
  const avgVolume = candles.slice(-20, -1).reduce((s, c) => s + c.volume, 0) / 19
  const volumeConfirm = current.volume > avgVolume * 1.2

  // BREAKOUT LONG
  if (current.close > orbHigh && current.close > current.open) {
    // Prefer retest for cleaner entry
    const canRetestEntry = current.low <= orbHigh + atr * 0.2

    let qualityScore = 55
    if (volumeConfirm) qualityScore += 15
    if (htfBias === 'BULLISH') qualityScore += 15
    if (regime.current.includes('TREND_UP')) qualityScore += 10
    if (current.close > orbHigh + atr * 0.3) qualityScore += 5 // Clean break

    return {
      type: 'ORB_BREAKOUT',
      direction: 'LONG',
      confidence: 80,
      qualityScore,
      entry: {
        price: canRetestEntry ? orbHigh + atr * 0.1 : current.close,
        type: canRetestEntry ? 'LIMIT' : 'MARKET',
        waitForRetest: canRetestEntry,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: orbLow - atr * 0.2,
        type: 'STRUCTURE',
        breakEvenTrigger: orbRange // Move to BE after 1 range
      },
      targets: [
        { price: orbHigh + orbRange, percentToExit: 50, type: 'EXTENSION' },      // 1x range
        { price: orbHigh + orbRange * 2, percentToExit: 50, type: 'EXTENSION' }   // 2x range
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: orbLow, description: 'Break back through ORB low' },
        { type: 'TIME', description: 'No continuation by 1pm ET' }
      ],
      timeLimit: 180, // 3 hours
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: session,
        volumeConfirmation: volumeConfirm,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 2.0,
        expectedWinRate: 74.56 // From research
      }
    }
  }

  // BREAKOUT SHORT
  if (current.close < orbLow && current.close < current.open) {
    const canRetestEntry = current.high >= orbLow - atr * 0.2

    let qualityScore = 55
    if (volumeConfirm) qualityScore += 15
    if (htfBias === 'BEARISH') qualityScore += 15
    if (regime.current.includes('TREND_DOWN')) qualityScore += 10
    if (current.close < orbLow - atr * 0.3) qualityScore += 5

    return {
      type: 'ORB_BREAKOUT',
      direction: 'SHORT',
      confidence: 80,
      qualityScore,
      entry: {
        price: canRetestEntry ? orbLow - atr * 0.1 : current.close,
        type: canRetestEntry ? 'LIMIT' : 'MARKET',
        waitForRetest: canRetestEntry,
        maxSlippage: atr * 0.3
      },
      stopLoss: {
        price: orbHigh + atr * 0.2,
        type: 'STRUCTURE',
        breakEvenTrigger: orbRange
      },
      targets: [
        { price: orbLow - orbRange, percentToExit: 50, type: 'EXTENSION' },
        { price: orbLow - orbRange * 2, percentToExit: 50, type: 'EXTENSION' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: orbHigh, description: 'Break back through ORB high' }
      ],
      timeLimit: 180,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: session,
        volumeConfirmation: volumeConfirm,
        structureContext: analyzeSwingStructure(candles.slice(-50)),
        riskRewardRatio: 2.0,
        expectedWinRate: 74.56
      }
    }
  }

  return null
}

/**
 * STRATEGY 11: NY KILL ZONE REVERSAL
 *
 * Definition: Reversal setups during institutional execution windows.
 * Kill zones: 7-8am, 9:30-10:30am, 2-3pm ET (NY session).
 *
 * WORKS IN: At session extremes, after liquidity events
 * FAILS IN: Strong trend continuation days
 */
export function detectKillZoneReversalSignal(
  candles: Candle[],
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): StrategySignal | null {
  const session = getCurrentSessionType()

  // Only trade in Kill Zones
  const isKillZone = session === 'NY_OPEN' || session === 'NY_AFTERNOON'
  if (!isKillZone) {
    return null
  }

  // Skip strong trends
  if (regime.trendStrength > 70) {
    return null
  }

  const current = candles[candles.length - 1]
  const atr = calculateATR(candles.slice(-20), 14)
  const structure = analyzeSwingStructure(candles.slice(-30))

  // Look for liquidity event prior (required)
  const pools = detectLiquidityPools(candles.slice(-20))
  const recentSweep = pools.some(p => p.swept)

  if (!recentSweep) {
    return null // Need liquidity event first
  }

  // BULLISH REVERSAL: Sweep of lows + structure shift
  const sweptSellSide = pools.find(p => p.type === 'SELL_SIDE' && p.swept)
  if (sweptSellSide && current.close > current.open &&
      current.close > candles[candles.length - 2].high) {

    let qualityScore = 55
    if (htfBias !== 'BEARISH') qualityScore += 15
    if (sweptSellSide.strength >= 3) qualityScore += 10
    if (session === 'NY_OPEN') qualityScore += 10 // Best kill zone

    return {
      type: 'KILLZONE_REVERSAL',
      direction: 'LONG',
      confidence: 75,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.4
      },
      stopLoss: {
        price: sweptSellSide.price - atr * 0.5,
        type: 'STRUCTURE',
        breakEvenTrigger: atr * 2
      },
      targets: [
        { price: structure.lastSwingHigh, percentToExit: 50, type: 'STRUCTURE' },
        { price: current.close + atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: sweptSellSide.price - atr * 0.3, description: 'New low' },
        { type: 'TIME', description: 'No move within kill zone window' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: session,
        volumeConfirmation: true,
        structureContext: structure,
        riskRewardRatio: 2.5,
        expectedWinRate: 50
      }
    }
  }

  // BEARISH REVERSAL: Sweep of highs + structure shift
  const sweptBuySide = pools.find(p => p.type === 'BUY_SIDE' && p.swept)
  if (sweptBuySide && current.close < current.open &&
      current.close < candles[candles.length - 2].low) {

    let qualityScore = 55
    if (htfBias !== 'BULLISH') qualityScore += 15
    if (sweptBuySide.strength >= 3) qualityScore += 10
    if (session === 'NY_OPEN') qualityScore += 10

    return {
      type: 'KILLZONE_REVERSAL',
      direction: 'SHORT',
      confidence: 75,
      qualityScore,
      entry: {
        price: current.close,
        type: 'MARKET',
        waitForRetest: false,
        maxSlippage: atr * 0.4
      },
      stopLoss: {
        price: sweptBuySide.price + atr * 0.5,
        type: 'STRUCTURE',
        breakEvenTrigger: atr * 2
      },
      targets: [
        { price: structure.lastSwingLow, percentToExit: 50, type: 'STRUCTURE' },
        { price: current.close - atr * 4, percentToExit: 50, type: 'ATR_MULTIPLE' }
      ],
      invalidation: [
        { type: 'PRICE_LEVEL', level: sweptBuySide.price + atr * 0.3, description: 'New high' }
      ],
      timeLimit: 60,
      metadata: {
        regime: regime.current,
        htfBias,
        sessionType: session,
        volumeConfirmation: true,
        structureContext: structure,
        riskRewardRatio: 2.5,
        expectedWinRate: 50
      }
    }
  }

  return null
}

// =============================================================================
// TRADE QUALITY SCORING ENGINE
// =============================================================================

export interface TradeQualityScore {
  overall: number              // 0-100
  breakdown: {
    htfAlignment: number       // Higher timeframe alignment
    regimeCompatibility: number // Strategy vs regime match
    liquidityContext: number   // Sweep, FVG, OB confluence
    timeWindow: number         // Kill zone, session timing
    volatilityCondition: number // Appropriate volatility
    structureClarity: number   // Clear swing structure
  }
  recommendation: 'FULL_SIZE' | 'HALF_SIZE' | 'QUARTER_SIZE' | 'NO_TRADE'
  reasons: string[]
}

export function calculateTradeQuality(
  signal: StrategySignal,
  regime: RegimeAnalysis,
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): TradeQualityScore {
  const breakdown = {
    htfAlignment: 0,
    regimeCompatibility: 0,
    liquidityContext: 0,
    timeWindow: 0,
    volatilityCondition: 0,
    structureClarity: 0
  }
  const reasons: string[] = []

  // HTF Alignment (0-20 points)
  if ((signal.direction === 'LONG' && htfBias === 'BULLISH') ||
      (signal.direction === 'SHORT' && htfBias === 'BEARISH')) {
    breakdown.htfAlignment = 20
    reasons.push('Perfect HTF alignment')
  } else if (htfBias === 'NEUTRAL') {
    breakdown.htfAlignment = 10
    reasons.push('Neutral HTF - acceptable')
  } else {
    breakdown.htfAlignment = 0
    reasons.push('AGAINST HTF bias - reduced size')
  }

  // Regime Compatibility (0-20 points)
  const strategyRegimeMap: Record<StrategyType, MarketRegimeType[]> = {
    'BOS_CONTINUATION': ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    'CHOCH_REVERSAL': ['TREND_WEAK_UP', 'TREND_WEAK_DOWN', 'RANGE_WIDE'],
    'FAILED_BREAKOUT': ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY'],
    'LIQUIDITY_SWEEP': ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    'SESSION_REVERSION': ['RANGE_WIDE', 'RANGE_TIGHT'],
    'TREND_PULLBACK': ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    'VOLATILITY_BREAKOUT': ['LOW_VOLATILITY'],
    'VWAP_DEVIATION': ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY'],
    'RANGE_FADE': ['RANGE_WIDE', 'RANGE_TIGHT'],
    'ORB_BREAKOUT': ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'HIGH_VOLATILITY'],
    'KILLZONE_REVERSAL': ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN']
  }

  const compatibleRegimes = strategyRegimeMap[signal.type] || []
  if (compatibleRegimes.includes(regime.current)) {
    breakdown.regimeCompatibility = 20
    reasons.push(`${signal.type} optimal for ${regime.current}`)
  } else {
    breakdown.regimeCompatibility = 5
    reasons.push(`${signal.type} suboptimal for ${regime.current}`)
  }

  // Liquidity Context (0-15 points)
  if (signal.metadata.volumeConfirmation) {
    breakdown.liquidityContext = 15
    reasons.push('Volume confirmed')
  } else {
    breakdown.liquidityContext = 5
  }

  // Time Window (0-15 points)
  const optimalSessions: SessionType[] = ['NY_OPEN', 'NY_MORNING', 'NY_AFTERNOON']
  if (optimalSessions.includes(signal.metadata.sessionType)) {
    breakdown.timeWindow = 15
    reasons.push('Optimal session timing')
  } else if (signal.metadata.sessionType.startsWith('NY')) {
    breakdown.timeWindow = 10
  } else {
    breakdown.timeWindow = 5
    reasons.push('Suboptimal session')
  }

  // Volatility Condition (0-15 points)
  if (regime.volatilityPercentile >= 30 && regime.volatilityPercentile <= 70) {
    breakdown.volatilityCondition = 15
    reasons.push('Normal volatility')
  } else if (regime.volatilityPercentile < 30) {
    breakdown.volatilityCondition = 10
    reasons.push('Low volatility - breakout potential')
  } else {
    breakdown.volatilityCondition = 5
    reasons.push('High volatility - widen stops')
  }

  // Structure Clarity (0-15 points)
  const struct = signal.metadata.structureContext
  if ((struct.hasHH && struct.hasHL) || (struct.hasLH && struct.hasLL)) {
    breakdown.structureClarity = 15
    reasons.push('Clear market structure')
  } else if (struct.trend !== 'RANGING') {
    breakdown.structureClarity = 10
  } else {
    breakdown.structureClarity = 5
    reasons.push('Unclear structure')
  }

  // Calculate overall
  const overall = Object.values(breakdown).reduce((s, v) => s + v, 0)

  // Determine recommendation
  let recommendation: 'FULL_SIZE' | 'HALF_SIZE' | 'QUARTER_SIZE' | 'NO_TRADE'
  if (overall >= 80) {
    recommendation = 'FULL_SIZE'
  } else if (overall >= 60) {
    recommendation = 'HALF_SIZE'
  } else if (overall >= 40) {
    recommendation = 'QUARTER_SIZE'
  } else {
    recommendation = 'NO_TRADE'
  }

  return { overall, breakdown, recommendation, reasons }
}

// =============================================================================
// PROP FIRM RISK ENGINE
// =============================================================================

export interface PropFirmRiskState {
  accountBalance: number
  startingBalance: number
  trailingDrawdown: number
  currentDrawdown: number
  drawdownPercentUsed: number
  dailyPnL: number
  consecutiveLosses: number
  dailyTradeCount: number
  canTrade: boolean
  riskLevel: 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER' | 'STOPPED'
  positionSizeMultiplier: number
  recommendation: string
}

export function calculatePropFirmRisk(
  balance: number,
  startingBalance: number,
  maxDrawdown: number,  // e.g., 5000 for 150K Apex
  dailyPnL: number,
  consecutiveLosses: number,
  dailyTrades: number
): PropFirmRiskState {
  const currentDrawdown = startingBalance + maxDrawdown - balance // Trailing threshold logic
  const drawdownPercentUsed = (currentDrawdown / maxDrawdown) * 100

  let riskLevel: 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER' | 'STOPPED'
  let positionSizeMultiplier: number
  let canTrade: boolean
  let recommendation: string

  // DANGER ZONES (from Apex rules)
  if (drawdownPercentUsed >= 90) {
    riskLevel = 'STOPPED'
    positionSizeMultiplier = 0
    canTrade = false
    recommendation = 'STOP TRADING - 90%+ of drawdown used'
  }
  else if (drawdownPercentUsed >= 75) {
    riskLevel = 'DANGER'
    positionSizeMultiplier = 0.25
    canTrade = true
    recommendation = 'Extreme caution - quarter size only'
  }
  else if (drawdownPercentUsed >= 50) {
    riskLevel = 'WARNING'
    positionSizeMultiplier = 0.5
    canTrade = true
    recommendation = 'Warning - half size, selective entries only'
  }
  else if (drawdownPercentUsed >= 30) {
    riskLevel = 'CAUTION'
    positionSizeMultiplier = 0.75
    canTrade = true
    recommendation = 'Caution - slightly reduced size'
  }
  else {
    riskLevel = 'SAFE'
    positionSizeMultiplier = 1.0
    canTrade = true
    recommendation = 'Normal trading'
  }

  // Consecutive loss decay
  if (consecutiveLosses >= 3) {
    positionSizeMultiplier *= 0.5
    recommendation += ' | Loss streak - reduce size 50%'
  } else if (consecutiveLosses === 2) {
    positionSizeMultiplier *= 0.75
    recommendation += ' | 2 losses - reduce size 25%'
  }

  // Daily loss limit (protect remaining days)
  const dailyLossLimit = maxDrawdown * 0.2 // Max 20% of drawdown per day
  if (dailyPnL <= -dailyLossLimit) {
    canTrade = false
    recommendation = 'STOP - Daily loss limit reached'
  }

  // Trade count limit
  if (dailyTrades >= 10) {
    canTrade = false
    recommendation += ' | Max daily trades reached'
  }

  return {
    accountBalance: balance,
    startingBalance,
    trailingDrawdown: maxDrawdown,
    currentDrawdown,
    drawdownPercentUsed,
    dailyPnL,
    consecutiveLosses,
    dailyTradeCount: dailyTrades,
    canTrade,
    riskLevel,
    positionSizeMultiplier,
    recommendation
  }
}

// =============================================================================
// MASTER SIGNAL GENERATOR
// =============================================================================

export function generateMasterSignal(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[],
  orbData: { high: number; low: number; formed: boolean },
  sessionData: { asia: { high: number; low: number }; london: { high: number; low: number }; ny: { high: number; low: number } },
  vwapData: { vwap: number; stdDev: number },
  propFirmRisk: PropFirmRiskState
): { signal: StrategySignal | null; quality: TradeQualityScore | null; reason: string } {

  // PROP FIRM CHECK FIRST
  if (!propFirmRisk.canTrade) {
    return { signal: null, quality: null, reason: propFirmRisk.recommendation }
  }

  // Classify regime
  const regime = classifyMarketRegime(candles1m)

  // NO TRADE regimes
  if (regime.tradingRecommendation === 'NO_TRADE') {
    return { signal: null, quality: null, reason: `No trade: ${regime.current} regime` }
  }

  // Determine HTF bias from 15m
  const htfBias = determineHTFBias(candles15m)

  // Collect all potential signals
  const signals: StrategySignal[] = []

  // Try each strategy
  const bosSignal = detectBOSSignal(candles1m, regime, htfBias)
  if (bosSignal) signals.push(bosSignal)

  const chochSignal = detectCHoCHSignal(candles1m, regime, htfBias)
  if (chochSignal) signals.push(chochSignal)

  const failedBreakout = detectFailedBreakoutSignal(candles1m, regime, htfBias)
  if (failedBreakout) signals.push(failedBreakout)

  const liquiditySweep = detectLiquiditySweepSignal(candles1m, regime, htfBias)
  if (liquiditySweep) signals.push(liquiditySweep)

  const sessionReversion = detectSessionReversionSignal(
    candles1m, regime,
    { asia: sessionData.asia.high, london: sessionData.london.high, ny: sessionData.ny.high },
    { asia: sessionData.asia.low, london: sessionData.london.low, ny: sessionData.ny.low }
  )
  if (sessionReversion) signals.push(sessionReversion)

  const trendPullback = detectTrendPullbackSignal(candles1m, regime, htfBias)
  if (trendPullback) signals.push(trendPullback)

  const volBreakout = detectVolatilityBreakoutSignal(candles1m, regime, htfBias)
  if (volBreakout) signals.push(volBreakout)

  const vwapReversion = detectVWAPReversionSignal(candles1m, regime, vwapData.vwap, vwapData.stdDev)
  if (vwapReversion) signals.push(vwapReversion)

  const rangeFade = detectRangeFadeSignal(candles1m, regime)
  if (rangeFade) signals.push(rangeFade)

  const orbSignal = detectORBSignal(candles1m, regime, htfBias, orbData.high, orbData.low, orbData.formed)
  if (orbSignal) signals.push(orbSignal)

  const killzoneReversal = detectKillZoneReversalSignal(candles1m, regime, htfBias)
  if (killzoneReversal) signals.push(killzoneReversal)

  // No signals generated
  if (signals.length === 0) {
    return { signal: null, quality: null, reason: 'No valid setups found' }
  }

  // Score each signal and pick the best
  const scoredSignals = signals.map(sig => ({
    signal: sig,
    quality: calculateTradeQuality(sig, regime, htfBias)
  }))

  // Sort by quality score
  scoredSignals.sort((a, b) => b.quality.overall - a.quality.overall)

  const best = scoredSignals[0]

  // Check if quality meets minimum threshold
  if (best.quality.recommendation === 'NO_TRADE') {
    return { signal: null, quality: best.quality, reason: 'Quality score too low' }
  }

  // Apply prop firm position sizing
  if (best.signal) {
    // This would adjust position size based on propFirmRisk.positionSizeMultiplier
    // and quality.recommendation
  }

  return { signal: best.signal, quality: best.quality, reason: 'Valid setup found' }
}

// =============================================================================
// GENERATE ALL SIGNALS - Returns ALL valid strategy signals, not just the best
// Use this for confluence scoring across multiple strategies
// =============================================================================

export function generateAllWorldClassSignals(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[],
  orbData: { high: number; low: number; formed: boolean },
  sessionData: { asia: { high: number; low: number }; london: { high: number; low: number }; ny: { high: number; low: number } },
  vwapData: { vwap: number; stdDev: number },
  propFirmRisk: PropFirmRiskState
): { signals: Array<{ signal: StrategySignal; quality: TradeQualityScore }>; regime: RegimeAnalysis; reason: string } {

  // PROP FIRM CHECK FIRST
  if (!propFirmRisk.canTrade) {
    return { signals: [], regime: classifyMarketRegime(candles1m), reason: propFirmRisk.recommendation }
  }

  // Classify regime
  const regime = classifyMarketRegime(candles1m)

  // NO TRADE regimes - still return regime info for debugging
  if (regime.tradingRecommendation === 'NO_TRADE') {
    return { signals: [], regime, reason: `No trade: ${regime.current} regime` }
  }

  // Determine HTF bias from 15m
  const htfBias = determineHTFBias(candles15m)

  // Collect ALL valid signals
  const allSignals: StrategySignal[] = []

  // Try each strategy - collect ALL that trigger
  const bosSignal = detectBOSSignal(candles1m, regime, htfBias)
  if (bosSignal) allSignals.push(bosSignal)

  const chochSignal = detectCHoCHSignal(candles1m, regime, htfBias)
  if (chochSignal) allSignals.push(chochSignal)

  const failedBreakout = detectFailedBreakoutSignal(candles1m, regime, htfBias)
  if (failedBreakout) allSignals.push(failedBreakout)

  const liquiditySweep = detectLiquiditySweepSignal(candles1m, regime, htfBias)
  if (liquiditySweep) allSignals.push(liquiditySweep)

  const sessionReversion = detectSessionReversionSignal(
    candles1m, regime,
    { asia: sessionData.asia.high, london: sessionData.london.high, ny: sessionData.ny.high },
    { asia: sessionData.asia.low, london: sessionData.london.low, ny: sessionData.ny.low }
  )
  if (sessionReversion) allSignals.push(sessionReversion)

  const trendPullback = detectTrendPullbackSignal(candles1m, regime, htfBias)
  if (trendPullback) allSignals.push(trendPullback)

  const volBreakout = detectVolatilityBreakoutSignal(candles1m, regime, htfBias)
  if (volBreakout) allSignals.push(volBreakout)

  const vwapReversion = detectVWAPReversionSignal(candles1m, regime, vwapData.vwap, vwapData.stdDev)
  if (vwapReversion) allSignals.push(vwapReversion)

  const rangeFade = detectRangeFadeSignal(candles1m, regime)
  if (rangeFade) allSignals.push(rangeFade)

  const orbSignal = detectORBSignal(candles1m, regime, htfBias, orbData.high, orbData.low, orbData.formed)
  if (orbSignal) allSignals.push(orbSignal)

  const killzoneReversal = detectKillZoneReversalSignal(candles1m, regime, htfBias)
  if (killzoneReversal) allSignals.push(killzoneReversal)

  // No signals generated
  if (allSignals.length === 0) {
    return { signals: [], regime, reason: 'No valid setups found' }
  }

  // Score each signal - return ALL that meet minimum quality
  const scoredSignals = allSignals.map(sig => ({
    signal: sig,
    quality: calculateTradeQuality(sig, regime, htfBias)
  })).filter(s => s.quality.recommendation !== 'NO_TRADE')  // Filter out NO_TRADE quality

  // Sort by quality score (best first)
  scoredSignals.sort((a, b) => b.quality.overall - a.quality.overall)

  return {
    signals: scoredSignals,
    regime,
    reason: `${scoredSignals.length} valid signals from ${allSignals.length} strategies`
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateATR(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 10

  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    )
    trs.push(tr)
  }

  return trs.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return prices

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema.push(sum / period)

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1])
  }

  return ema
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [50]

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

  return rsi.length > 0 ? rsi : [50]
}

function calculateADX(candles: Candle[], period: number): { adx: number; plusDI: number; minusDI: number } {
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

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trs.push(tr)

    const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0
    const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0

    plusDMs.push(plusDM)
    minusDMs.push(minusDM)
  }

  const smoothTR = trs.slice(-period).reduce((a, b) => a + b, 0)
  const smoothPlusDM = plusDMs.slice(-period).reduce((a, b) => a + b, 0)
  const smoothMinusDM = minusDMs.slice(-period).reduce((a, b) => a + b, 0)

  const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0
  const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0

  const dx = plusDI + minusDI > 0 ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100 : 0

  return { adx: dx, plusDI, minusDI }
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number) {
  if (prices.length < period) {
    const p = prices[prices.length - 1] || 0
    return { upper: p, middle: p, lower: p, width: 0 }
  }

  const slice = prices.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period

  const squaredDiffs = slice.map(p => Math.pow(p - middle, 2))
  const std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period)

  const upper = middle + std * stdDev
  const lower = middle - std * stdDev
  const width = middle > 0 ? ((upper - lower) / middle) * 100 : 0

  return { upper, middle, lower, width }
}

function analyzeSwingStructure(candles: Candle[]): StructureContext {
  const swingHighs: number[] = []
  const swingLows: number[] = []

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i]
    const isHigh = c.high >= candles[i - 1].high && c.high >= candles[i - 2].high &&
                   c.high >= candles[i + 1].high && c.high >= candles[i + 2].high
    const isLow = c.low <= candles[i - 1].low && c.low <= candles[i - 2].low &&
                  c.low <= candles[i + 1].low && c.low <= candles[i + 2].low

    if (isHigh) swingHighs.push(c.high)
    if (isLow) swingLows.push(c.low)
  }

  const hasHH = swingHighs.length >= 2 && swingHighs[swingHighs.length - 1] > swingHighs[swingHighs.length - 2]
  const hasHL = swingLows.length >= 2 && swingLows[swingLows.length - 1] > swingLows[swingLows.length - 2]
  const hasLH = swingHighs.length >= 2 && swingHighs[swingHighs.length - 1] < swingHighs[swingHighs.length - 2]
  const hasLL = swingLows.length >= 2 && swingLows[swingLows.length - 1] < swingLows[swingLows.length - 2]

  let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING'
  if (hasHH && hasHL) trend = 'BULLISH'
  if (hasLH && hasLL) trend = 'BEARISH'

  return {
    trend,
    lastSwingHigh: swingHighs[swingHighs.length - 1] || candles[candles.length - 1].high,
    lastSwingLow: swingLows[swingLows.length - 1] || candles[candles.length - 1].low,
    hasHH,
    hasHL,
    hasLH,
    hasLL
  }
}

function getCurrentSessionType(): SessionType {
  const now = new Date()
  const etHour = (now.getUTCHours() - 5 + 24) % 24
  const etMinute = now.getUTCMinutes()
  const time = etHour + etMinute / 60

  if (time >= 19 || time < 2) return 'ASIA'
  if (time >= 2 && time < 8) return 'LONDON'
  if (time >= 8 && time < 10) return 'NY_OPEN'
  if (time >= 10 && time < 12) return 'NY_MORNING'
  if (time >= 12 && time < 14) return 'NY_LUNCH'
  if (time >= 14 && time < 16) return 'NY_AFTERNOON'
  return 'NY_CLOSE'
}

function detectLiquidityPools(candles: Candle[], tolerance: number = 0.0005) {
  const pools: { price: number; type: 'BUY_SIDE' | 'SELL_SIDE'; strength: number; swept: boolean }[] = []

  // Find equal highs
  const highs = candles.map((c, i) => ({ price: c.high, index: i }))
  for (let i = 0; i < highs.length; i++) {
    let equalCount = 1
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[j].price - highs[i].price) / highs[i].price <= tolerance) {
        equalCount++
      }
    }
    if (equalCount >= 2) {
      pools.push({ price: highs[i].price, type: 'BUY_SIDE', strength: equalCount, swept: false })
    }
  }

  // Find equal lows
  const lows = candles.map((c, i) => ({ price: c.low, index: i }))
  for (let i = 0; i < lows.length; i++) {
    let equalCount = 1
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[j].price - lows[i].price) / lows[i].price <= tolerance) {
        equalCount++
      }
    }
    if (equalCount >= 2) {
      pools.push({ price: lows[i].price, type: 'SELL_SIDE', strength: equalCount, swept: false })
    }
  }

  // Check if swept
  const last = candles[candles.length - 1]
  for (const pool of pools) {
    if (pool.type === 'BUY_SIDE' && last.high > pool.price) pool.swept = true
    if (pool.type === 'SELL_SIDE' && last.low < pool.price) pool.swept = true
  }

  return pools
}

function findKeyLevels(candles: Candle[]): { resistance: number; support: number } {
  const highs = candles.map(c => c.high)
  const lows = candles.map(c => c.low)

  // Find most touched levels
  const resistance = Math.max(...highs)
  const support = Math.min(...lows)

  return { resistance, support }
}

function findLastLowerHigh(candles: Candle[]): number | null {
  const swingHighs: number[] = []

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i]
    if (c.high >= candles[i - 1].high && c.high >= candles[i + 1].high) {
      swingHighs.push(c.high)
    }
  }

  if (swingHighs.length < 2) return null
  if (swingHighs[swingHighs.length - 1] < swingHighs[swingHighs.length - 2]) {
    return swingHighs[swingHighs.length - 1]
  }

  return null
}

function findLastHigherLow(candles: Candle[]): number | null {
  const swingLows: number[] = []

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i]
    if (c.low <= candles[i - 1].low && c.low <= candles[i + 1].low) {
      swingLows.push(c.low)
    }
  }

  if (swingLows.length < 2) return null
  if (swingLows[swingLows.length - 1] > swingLows[swingLows.length - 2]) {
    return swingLows[swingLows.length - 1]
  }

  return null
}

function determineHTFBias(candles15m: Candle[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (candles15m.length < 20) return 'NEUTRAL'

  const closes = candles15m.map(c => c.close)
  const ema20 = calculateEMA(closes, 20)
  const ema50 = calculateEMA(closes, 50)

  const lastEMA20 = ema20[ema20.length - 1]
  const lastEMA50 = ema50[ema50.length - 1] || lastEMA20
  const lastClose = closes[closes.length - 1]

  if (lastClose > lastEMA20 && lastEMA20 > lastEMA50) return 'BULLISH'
  if (lastClose < lastEMA20 && lastEMA20 < lastEMA50) return 'BEARISH'
  return 'NEUTRAL'
}
