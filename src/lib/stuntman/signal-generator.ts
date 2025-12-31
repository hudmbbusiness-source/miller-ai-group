// @ts-nocheck
// =============================================================================
// STUNTMAN AI - SIGNAL GENERATOR
// =============================================================================
// Combines technical indicators, pattern recognition, and market data
// to generate high-confidence trading signals
// =============================================================================

import type {
  OHLCV,
  Signal,
  IndicatorValues,
  PatternDetection,
  StrategyConfig,
  Timeframe,
  TradingSide,
} from './types'
import { SIGNAL_THRESHOLDS } from './constants'
import {
  RSI,
  MACD,
  EMA,
  BollingerBands,
  ATR,
  ADX,
  OBV,
  VWAP,
  Stochastic,
  generateIndicatorSignals,
} from './indicators'
import {
  scanPatterns,
  detectCandlestickPatterns,
  detectSupportResistance,
  analyzeTrend,
} from './patterns'

// =============================================================================
// TYPES
// =============================================================================

export interface SignalGeneratorConfig {
  minStrength: number
  minConfidence: number
  minConfirmations: number
  signalCooldown: number // ms
  requireTrend: boolean
  requireVolume: boolean
}

export interface MarketContext {
  trend: 'up' | 'down' | 'sideways'
  volatility: 'low' | 'medium' | 'high'
  volume: 'low' | 'normal' | 'high'
  momentum: 'bullish' | 'bearish' | 'neutral'
}

export interface SignalCandidate {
  side: TradingSide
  strength: number
  confidence: number
  sources: string[]
  indicators: IndicatorValues
  patterns: PatternDetection
  reason: string
}

// =============================================================================
// SIGNAL GENERATOR CLASS
// =============================================================================

export class SignalGenerator {
  private config: SignalGeneratorConfig
  private lastSignals: Map<string, number> = new Map() // instrument -> timestamp

  constructor(config?: Partial<SignalGeneratorConfig>) {
    this.config = {
      minStrength: config?.minStrength ?? SIGNAL_THRESHOLDS.minSignalStrength,
      minConfidence: config?.minConfidence ?? SIGNAL_THRESHOLDS.minExecutionConfidence,
      minConfirmations: config?.minConfirmations ?? SIGNAL_THRESHOLDS.minConfirmations,
      signalCooldown: config?.signalCooldown ?? SIGNAL_THRESHOLDS.signalCooldown,
      requireTrend: config?.requireTrend ?? true,
      requireVolume: config?.requireVolume ?? true,
    }
  }

  // ===========================================================================
  // MAIN SIGNAL GENERATION
  // ===========================================================================

  generateSignal(
    instrument: string,
    candles: OHLCV[],
    strategy?: StrategyConfig
  ): Signal | null {
    if (candles.length < 50) {
      return null // Not enough data
    }

    // Check cooldown
    const lastSignalTime = this.lastSignals.get(instrument) || 0
    if (Date.now() - lastSignalTime < this.config.signalCooldown) {
      return null
    }

    // Analyze market context
    const context = this.analyzeMarketContext(candles)

    // Calculate all indicators
    const indicators = this.calculateIndicators(candles, strategy)

    // Detect patterns
    const patterns = this.detectPatterns(candles)

    // Generate signal candidates
    const candidates = this.generateCandidates(indicators, patterns, context)

    // Select best candidate
    const bestCandidate = this.selectBestCandidate(candidates)

    if (!bestCandidate) {
      return null
    }

    // Create signal
    const signal = this.createSignal(instrument, bestCandidate, indicators, patterns)

    // Update cooldown
    this.lastSignals.set(instrument, Date.now())

    return signal
  }

  // ===========================================================================
  // MARKET CONTEXT ANALYSIS
  // ===========================================================================

  private analyzeMarketContext(candles: OHLCV[]): MarketContext {
    const closes = candles.map((c) => c.close)
    const volumes = candles.map((c) => c.volume)

    // Trend analysis
    const trend = analyzeTrend(candles)
    const trendDirection = trend.direction

    // Volatility analysis (ATR-based)
    const atrResult = ATR(candles, 14)
    const lastATR = atrResult.normalized[atrResult.normalized.length - 1]
    let volatility: MarketContext['volatility'] = 'medium'
    if (!isNaN(lastATR)) {
      if (lastATR < 1) volatility = 'low'
      else if (lastATR > 3) volatility = 'high'
    }

    // Volume analysis
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5
    let volume: MarketContext['volume'] = 'normal'
    if (recentVolume > avgVolume * 1.5) volume = 'high'
    else if (recentVolume < avgVolume * 0.5) volume = 'low'

    // Momentum analysis
    const macdResult = MACD(closes)
    const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1]
    let momentum: MarketContext['momentum'] = 'neutral'
    if (!isNaN(lastHistogram)) {
      if (lastHistogram > 0) momentum = 'bullish'
      else if (lastHistogram < 0) momentum = 'bearish'
    }

    return {
      trend: trendDirection,
      volatility,
      volume,
      momentum,
    }
  }

  // ===========================================================================
  // INDICATOR CALCULATION
  // ===========================================================================

  private calculateIndicators(candles: OHLCV[], strategy?: StrategyConfig): IndicatorValues {
    const closes = candles.map((c) => c.close)
    const config = strategy?.indicators

    // RSI
    const rsiPeriod = config?.rsi?.period || 14
    const rsiResult = RSI(closes, rsiPeriod)
    const lastRSI = rsiResult.values[rsiResult.values.length - 1]

    // MACD
    const macdFast = config?.macd?.fast || 12
    const macdSlow = config?.macd?.slow || 26
    const macdSignalPeriod = config?.macd?.signal || 9
    const macdResult = MACD(closes, macdFast, macdSlow, macdSignalPeriod)

    // EMAs
    const emaPeriods = config?.ema?.periods || [9, 21, 50, 200]
    const emas: Record<number, number> = {}
    for (const period of emaPeriods) {
      const emaValues = EMA(closes, period)
      emas[period] = emaValues[emaValues.length - 1]
    }

    // Bollinger Bands
    const bbPeriod = config?.bollinger?.period || 20
    const bbStdDev = config?.bollinger?.stdDev || 2
    const bbResult = BollingerBands(closes, bbPeriod, bbStdDev)

    // ATR
    const atrPeriod = config?.atr?.period || 14
    const atrResult = ATR(candles, atrPeriod)

    // ADX
    const adxPeriod = config?.adx?.period || 14
    const adxResult = ADX(candles, adxPeriod)

    // Stochastic
    const stochResult = Stochastic(candles)

    // OBV
    const obvResult = OBV(candles)

    // VWAP
    const vwapResult = VWAP(candles)

    return {
      rsi: isNaN(lastRSI) ? undefined : lastRSI,
      macd: {
        macd: macdResult.macd[macdResult.macd.length - 1],
        signal: macdResult.signal[macdResult.signal.length - 1],
        histogram: macdResult.histogram[macdResult.histogram.length - 1],
      },
      ema: emas,
      sma: {},
      bollingerBands: {
        upper: bbResult.upper[bbResult.upper.length - 1],
        middle: bbResult.middle[bbResult.middle.length - 1],
        lower: bbResult.lower[bbResult.lower.length - 1],
        percentB: bbResult.percentB[bbResult.percentB.length - 1],
      },
      atr: atrResult.values[atrResult.values.length - 1],
      adx: {
        adx: adxResult.adx[adxResult.adx.length - 1],
        plusDI: adxResult.plusDI[adxResult.plusDI.length - 1],
        minusDI: adxResult.minusDI[adxResult.minusDI.length - 1],
      },
      stochastic: {
        k: stochResult.k[stochResult.k.length - 1],
        d: stochResult.d[stochResult.d.length - 1],
      },
      obv: obvResult.values[obvResult.values.length - 1],
      vwap: vwapResult.vwap[vwapResult.vwap.length - 1],
    }
  }

  // ===========================================================================
  // PATTERN DETECTION
  // ===========================================================================

  private detectPatterns(candles: OHLCV[]): PatternDetection {
    const scanResult = scanPatterns(candles)

    // Get recent candlestick patterns only
    const recentCandlestick = scanResult.candlestickPatterns
      .filter((p) => p.index >= candles.length - 5)
      .map((p) => p.pattern)

    // Get chart patterns
    const chartPatterns = scanResult.chartPatterns.map((p) => p.pattern)

    // Get support/resistance levels near current price
    const currentPrice = candles[candles.length - 1].close
    const nearbyLevels = scanResult.supportResistance
      .filter((level) => Math.abs(level.price - currentPrice) / currentPrice < 0.03)

    const support = nearbyLevels.find((l) => l.type === 'support')?.price
    const resistance = nearbyLevels.find((l) => l.type === 'resistance')?.price

    return {
      candlestick: recentCandlestick,
      chart: chartPatterns,
      trend: scanResult.trend.direction,
      trendStrength: scanResult.trend.strength,
      support,
      resistance,
    }
  }

  // ===========================================================================
  // SIGNAL CANDIDATE GENERATION
  // ===========================================================================

  private generateCandidates(
    indicators: IndicatorValues,
    patterns: PatternDetection,
    context: MarketContext
  ): SignalCandidate[] {
    const candidates: SignalCandidate[] = []

    // =========================================================================
    // RSI-BASED SIGNALS
    // =========================================================================

    if (indicators.rsi !== undefined) {
      // Oversold bounce
      if (indicators.rsi <= 30) {
        candidates.push({
          side: 'buy',
          strength: Math.min((30 - indicators.rsi) / 30, 1),
          confidence: 0.6,
          sources: ['RSI Oversold'],
          indicators,
          patterns,
          reason: `RSI oversold at ${indicators.rsi.toFixed(1)}`,
        })
      }

      // Overbought reversal
      if (indicators.rsi >= 70) {
        candidates.push({
          side: 'sell',
          strength: Math.min((indicators.rsi - 70) / 30, 1),
          confidence: 0.6,
          sources: ['RSI Overbought'],
          indicators,
          patterns,
          reason: `RSI overbought at ${indicators.rsi.toFixed(1)}`,
        })
      }
    }

    // =========================================================================
    // MACD-BASED SIGNALS
    // =========================================================================

    if (indicators.macd) {
      const { macd, signal, histogram } = indicators.macd

      if (!isNaN(histogram)) {
        // Bullish crossover
        if (histogram > 0 && macd > signal) {
          candidates.push({
            side: 'buy',
            strength: Math.min(Math.abs(histogram) * 10, 1),
            confidence: 0.65,
            sources: ['MACD Bullish'],
            indicators,
            patterns,
            reason: 'MACD bullish crossover',
          })
        }

        // Bearish crossover
        if (histogram < 0 && macd < signal) {
          candidates.push({
            side: 'sell',
            strength: Math.min(Math.abs(histogram) * 10, 1),
            confidence: 0.65,
            sources: ['MACD Bearish'],
            indicators,
            patterns,
            reason: 'MACD bearish crossover',
          })
        }
      }
    }

    // =========================================================================
    // BOLLINGER BAND SIGNALS
    // =========================================================================

    if (indicators.bollingerBands?.percentB !== undefined) {
      const percentB = indicators.bollingerBands.percentB

      // Price below lower band
      if (percentB <= 0) {
        candidates.push({
          side: 'buy',
          strength: Math.min(Math.abs(percentB), 1),
          confidence: 0.55,
          sources: ['BB Oversold'],
          indicators,
          patterns,
          reason: 'Price below lower Bollinger Band',
        })
      }

      // Price above upper band
      if (percentB >= 1) {
        candidates.push({
          side: 'sell',
          strength: Math.min(percentB - 1, 1),
          confidence: 0.55,
          sources: ['BB Overbought'],
          indicators,
          patterns,
          reason: 'Price above upper Bollinger Band',
        })
      }
    }

    // =========================================================================
    // TREND-FOLLOWING SIGNALS (EMA CROSSOVERS)
    // =========================================================================

    if (indicators.ema && indicators.ema[9] && indicators.ema[21]) {
      const fastEMA = indicators.ema[9]
      const slowEMA = indicators.ema[21]

      if (fastEMA > slowEMA && context.trend === 'up') {
        candidates.push({
          side: 'buy',
          strength: 0.7,
          confidence: 0.7,
          sources: ['EMA Bullish', 'Trend Up'],
          indicators,
          patterns,
          reason: 'EMA 9 above EMA 21 in uptrend',
        })
      }

      if (fastEMA < slowEMA && context.trend === 'down') {
        candidates.push({
          side: 'sell',
          strength: 0.7,
          confidence: 0.7,
          sources: ['EMA Bearish', 'Trend Down'],
          indicators,
          patterns,
          reason: 'EMA 9 below EMA 21 in downtrend',
        })
      }
    }

    // =========================================================================
    // ADX TREND STRENGTH SIGNALS
    // =========================================================================

    if (indicators.adx) {
      const { adx, plusDI, minusDI } = indicators.adx

      if (!isNaN(adx) && adx >= 25) {
        // Strong trend
        if (plusDI > minusDI) {
          candidates.push({
            side: 'buy',
            strength: Math.min(adx / 50, 1),
            confidence: 0.7,
            sources: ['ADX Strong Trend', 'DI+ Leading'],
            indicators,
            patterns,
            reason: `Strong uptrend (ADX: ${adx.toFixed(1)})`,
          })
        } else {
          candidates.push({
            side: 'sell',
            strength: Math.min(adx / 50, 1),
            confidence: 0.7,
            sources: ['ADX Strong Trend', 'DI- Leading'],
            indicators,
            patterns,
            reason: `Strong downtrend (ADX: ${adx.toFixed(1)})`,
          })
        }
      }
    }

    // =========================================================================
    // STOCHASTIC SIGNALS
    // =========================================================================

    if (indicators.stochastic) {
      const { k, d } = indicators.stochastic

      if (!isNaN(k) && !isNaN(d)) {
        // Oversold bounce
        if (k <= 20 && d <= 20 && k > d) {
          candidates.push({
            side: 'buy',
            strength: (20 - Math.min(k, d)) / 20,
            confidence: 0.6,
            sources: ['Stoch Oversold'],
            indicators,
            patterns,
            reason: 'Stochastic oversold with bullish crossover',
          })
        }

        // Overbought reversal
        if (k >= 80 && d >= 80 && k < d) {
          candidates.push({
            side: 'sell',
            strength: (Math.max(k, d) - 80) / 20,
            confidence: 0.6,
            sources: ['Stoch Overbought'],
            indicators,
            patterns,
            reason: 'Stochastic overbought with bearish crossover',
          })
        }
      }
    }

    // =========================================================================
    // PATTERN-BASED SIGNALS
    // =========================================================================

    // Candlestick patterns
    const bullishPatterns = ['hammer', 'inverted_hammer', 'bullish_engulfing', 'morning_star', 'piercing_line', 'three_white_soldiers', 'dragonfly_doji', 'tweezer_bottom']
    const bearishPatterns = ['hanging_man', 'shooting_star', 'bearish_engulfing', 'evening_star', 'dark_cloud_cover', 'three_black_crows', 'gravestone_doji', 'tweezer_top']

    for (const pattern of patterns.candlestick) {
      if (bullishPatterns.includes(pattern)) {
        const existing = candidates.find((c) => c.side === 'buy')
        if (existing) {
          existing.strength += 0.2
          existing.confidence += 0.1
          existing.sources.push(`Pattern: ${pattern}`)
        } else {
          candidates.push({
            side: 'buy',
            strength: 0.6,
            confidence: 0.7,
            sources: [`Pattern: ${pattern}`],
            indicators,
            patterns,
            reason: `Bullish candlestick pattern: ${pattern}`,
          })
        }
      }

      if (bearishPatterns.includes(pattern)) {
        const existing = candidates.find((c) => c.side === 'sell')
        if (existing) {
          existing.strength += 0.2
          existing.confidence += 0.1
          existing.sources.push(`Pattern: ${pattern}`)
        } else {
          candidates.push({
            side: 'sell',
            strength: 0.6,
            confidence: 0.7,
            sources: [`Pattern: ${pattern}`],
            indicators,
            patterns,
            reason: `Bearish candlestick pattern: ${pattern}`,
          })
        }
      }
    }

    // Chart patterns
    for (const pattern of patterns.chart) {
      const bullishChartPatterns = ['inverse_head_and_shoulders', 'double_bottom', 'ascending_triangle', 'bull_flag', 'falling_wedge', 'cup_and_handle']
      const bearishChartPatterns = ['head_and_shoulders', 'double_top', 'descending_triangle', 'bear_flag', 'rising_wedge']

      if (bullishChartPatterns.includes(pattern)) {
        candidates.push({
          side: 'buy',
          strength: 0.8,
          confidence: 0.75,
          sources: [`Chart: ${pattern}`],
          indicators,
          patterns,
          reason: `Bullish chart pattern: ${pattern}`,
        })
      }

      if (bearishChartPatterns.includes(pattern)) {
        candidates.push({
          side: 'sell',
          strength: 0.8,
          confidence: 0.75,
          sources: [`Chart: ${pattern}`],
          indicators,
          patterns,
          reason: `Bearish chart pattern: ${pattern}`,
        })
      }
    }

    // =========================================================================
    // SUPPORT/RESISTANCE SIGNALS
    // =========================================================================

    if (patterns.support) {
      const nearSupport = patterns.support
      candidates.push({
        side: 'buy',
        strength: 0.6,
        confidence: 0.65,
        sources: ['Near Support'],
        indicators,
        patterns,
        reason: `Price near support at ${nearSupport.toFixed(2)}`,
      })
    }

    if (patterns.resistance) {
      const nearResistance = patterns.resistance
      candidates.push({
        side: 'sell',
        strength: 0.6,
        confidence: 0.65,
        sources: ['Near Resistance'],
        indicators,
        patterns,
        reason: `Price near resistance at ${nearResistance.toFixed(2)}`,
      })
    }

    // =========================================================================
    // APPLY CONTEXT MODIFIERS
    // =========================================================================

    for (const candidate of candidates) {
      // Boost confidence if aligned with trend
      if (
        (candidate.side === 'buy' && context.trend === 'up') ||
        (candidate.side === 'sell' && context.trend === 'down')
      ) {
        candidate.confidence *= 1.2
        candidate.sources.push('Trend Aligned')
      }

      // Reduce confidence if against trend
      if (
        (candidate.side === 'buy' && context.trend === 'down') ||
        (candidate.side === 'sell' && context.trend === 'up')
      ) {
        candidate.confidence *= 0.8
      }

      // Boost if high volume confirms
      if (context.volume === 'high') {
        candidate.confidence *= 1.1
        candidate.sources.push('Volume Confirmation')
      }

      // Reduce if low volume
      if (context.volume === 'low') {
        candidate.confidence *= 0.9
      }

      // Reduce for high volatility (more risk)
      if (context.volatility === 'high') {
        candidate.confidence *= 0.9
      }

      // Cap values
      candidate.strength = Math.min(candidate.strength, 1)
      candidate.confidence = Math.min(candidate.confidence, 1)
    }

    return candidates
  }

  // ===========================================================================
  // SELECT BEST CANDIDATE
  // ===========================================================================

  private selectBestCandidate(candidates: SignalCandidate[]): SignalCandidate | null {
    // Filter by minimum thresholds
    const validCandidates = candidates.filter(
      (c) =>
        c.strength >= this.config.minStrength &&
        c.confidence >= this.config.minConfidence &&
        c.sources.length >= this.config.minConfirmations
    )

    if (validCandidates.length === 0) {
      return null
    }

    // Consolidate candidates by side
    const buyCandidate = this.consolidateCandidates(
      validCandidates.filter((c) => c.side === 'buy')
    )
    const sellCandidate = this.consolidateCandidates(
      validCandidates.filter((c) => c.side === 'sell')
    )

    // Return the stronger signal
    if (!buyCandidate && !sellCandidate) return null
    if (!buyCandidate) return sellCandidate
    if (!sellCandidate) return buyCandidate

    // Compare by score (strength * confidence)
    const buyScore = buyCandidate.strength * buyCandidate.confidence
    const sellScore = sellCandidate.strength * sellCandidate.confidence

    // Need significant difference to pick one
    if (Math.abs(buyScore - sellScore) < 0.1) {
      return null // Too close, no clear signal
    }

    return buyScore > sellScore ? buyCandidate : sellCandidate
  }

  private consolidateCandidates(candidates: SignalCandidate[]): SignalCandidate | null {
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    // Combine all sources
    const allSources = [...new Set(candidates.flatMap((c) => c.sources))]

    // Average strength and confidence
    const avgStrength = candidates.reduce((sum, c) => sum + c.strength, 0) / candidates.length
    const avgConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length

    // Boost for multiple confirmations
    const confirmationBoost = Math.min(allSources.length * 0.1, 0.3)

    return {
      side: candidates[0].side,
      strength: Math.min(avgStrength + confirmationBoost, 1),
      confidence: Math.min(avgConfidence + confirmationBoost, 1),
      sources: allSources,
      indicators: candidates[0].indicators,
      patterns: candidates[0].patterns,
      reason: candidates.map((c) => c.reason).join(' | '),
    }
  }

  // ===========================================================================
  // CREATE SIGNAL
  // ===========================================================================

  private createSignal(
    instrument: string,
    candidate: SignalCandidate,
    indicators: IndicatorValues,
    patterns: PatternDetection
  ): Signal {
    const now = Date.now()

    return {
      id: `SIG-${now}-${Math.random().toString(36).substr(2, 9)}`,
      instrumentName: instrument,
      side: candidate.side,
      strength: candidate.strength,
      confidence: candidate.confidence,
      source: candidate.sources.join(', '),
      indicators,
      patterns,
      timestamp: now,
      validUntil: now + SIGNAL_THRESHOLDS.signalValidityDuration,
    }
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  updateConfig(config: Partial<SignalGeneratorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): SignalGeneratorConfig {
    return { ...this.config }
  }

  clearCooldowns(): void {
    this.lastSignals.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let generatorInstance: SignalGenerator | null = null

export function getSignalGenerator(): SignalGenerator {
  if (!generatorInstance) {
    generatorInstance = new SignalGenerator()
  }
  return generatorInstance
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SignalGenerator
