// =============================================================================
// STUNTMAN AI - ADVANCED PATTERN RECOGNITION
// =============================================================================
// Custom pattern recognition system for candlestick patterns, chart patterns,
// support/resistance detection, and trend analysis
// No external ML APIs - all logic is implemented in pure TypeScript
// =============================================================================

import type { OHLCV, CandlestickPattern, ChartPattern } from '../types'
import { PATTERN_CONFIG } from '../constants'

// =============================================================================
// TYPES
// =============================================================================

export interface CandlestickResult {
  pattern: CandlestickPattern
  index: number
  confidence: number
  signal: 'bullish' | 'bearish' | 'neutral'
  description: string
}

export interface ChartPatternResult {
  pattern: ChartPattern
  startIndex: number
  endIndex: number
  confidence: number
  signal: 'bullish' | 'bearish' | 'neutral'
  targetPrice?: number
  stopLoss?: number
  description: string
}

export interface SupportResistanceLevel {
  price: number
  type: 'support' | 'resistance'
  strength: number // 0-1
  touches: number
  firstTouch: number
  lastTouch: number
  broken: boolean
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'sideways'
  strength: number // 0-1
  swings: { index: number; price: number; type: 'high' | 'low' }[]
  trendLines: {
    type: 'support' | 'resistance'
    slope: number
    startPrice: number
    endPrice: number
    startIndex: number
    endIndex: number
  }[]
}

export interface PatternScanResult {
  candlestickPatterns: CandlestickResult[]
  chartPatterns: ChartPatternResult[]
  supportResistance: SupportResistanceLevel[]
  trend: TrendAnalysis
  overallBias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
}

// =============================================================================
// CANDLESTICK HELPERS
// =============================================================================

function getBody(candle: OHLCV): number {
  return Math.abs(candle.close - candle.open)
}

function getRange(candle: OHLCV): number {
  return candle.high - candle.low
}

function getUpperWick(candle: OHLCV): number {
  return candle.high - Math.max(candle.open, candle.close)
}

function getLowerWick(candle: OHLCV): number {
  return Math.min(candle.open, candle.close) - candle.low
}

function isBullish(candle: OHLCV): boolean {
  return candle.close > candle.open
}

function isBearish(candle: OHLCV): boolean {
  return candle.close < candle.open
}

function isDoji(candle: OHLCV): boolean {
  const body = getBody(candle)
  const range = getRange(candle)
  return range > 0 && body / range < PATTERN_CONFIG.candlestick.dojiMaxBody
}

// =============================================================================
// CANDLESTICK PATTERN DETECTION
// =============================================================================

export function detectCandlestickPatterns(candles: OHLCV[]): CandlestickResult[] {
  const results: CandlestickResult[] = []

  for (let i = 2; i < candles.length; i++) {
    const current = candles[i]
    const prev = candles[i - 1]
    const prevPrev = candles[i - 2]

    // ==========================================================================
    // SINGLE CANDLE PATTERNS
    // ==========================================================================

    // Doji
    if (isDoji(current)) {
      const range = getRange(current)
      const upperWick = getUpperWick(current)
      const lowerWick = getLowerWick(current)

      // Dragonfly Doji (bullish)
      if (lowerWick > range * 0.6 && upperWick < range * 0.1) {
        results.push({
          pattern: 'dragonfly_doji',
          index: i,
          confidence: 0.7,
          signal: 'bullish',
          description: 'Dragonfly Doji - potential bullish reversal',
        })
      }
      // Gravestone Doji (bearish)
      else if (upperWick > range * 0.6 && lowerWick < range * 0.1) {
        results.push({
          pattern: 'gravestone_doji',
          index: i,
          confidence: 0.7,
          signal: 'bearish',
          description: 'Gravestone Doji - potential bearish reversal',
        })
      }
      // Regular Doji
      else {
        results.push({
          pattern: 'doji',
          index: i,
          confidence: 0.5,
          signal: 'neutral',
          description: 'Doji - market indecision',
        })
      }
    }

    // Hammer / Hanging Man
    const body = getBody(current)
    const range = getRange(current)
    const lowerWick = getLowerWick(current)
    const upperWick = getUpperWick(current)

    if (
      body > 0 &&
      lowerWick >= body * PATTERN_CONFIG.candlestick.longWickRatio &&
      upperWick < body * 0.5
    ) {
      // Check trend context
      const recentTrend = getTrendDirection(candles.slice(Math.max(0, i - 10), i))

      if (recentTrend === 'down') {
        results.push({
          pattern: 'hammer',
          index: i,
          confidence: 0.75,
          signal: 'bullish',
          description: 'Hammer - bullish reversal after downtrend',
        })
      } else if (recentTrend === 'up') {
        results.push({
          pattern: 'hanging_man',
          index: i,
          confidence: 0.65,
          signal: 'bearish',
          description: 'Hanging Man - potential bearish reversal after uptrend',
        })
      }
    }

    // Inverted Hammer / Shooting Star
    if (
      body > 0 &&
      upperWick >= body * PATTERN_CONFIG.candlestick.longWickRatio &&
      lowerWick < body * 0.5
    ) {
      const recentTrend = getTrendDirection(candles.slice(Math.max(0, i - 10), i))

      if (recentTrend === 'down') {
        results.push({
          pattern: 'inverted_hammer',
          index: i,
          confidence: 0.65,
          signal: 'bullish',
          description: 'Inverted Hammer - potential bullish reversal',
        })
      } else if (recentTrend === 'up') {
        results.push({
          pattern: 'shooting_star',
          index: i,
          confidence: 0.75,
          signal: 'bearish',
          description: 'Shooting Star - bearish reversal after uptrend',
        })
      }
    }

    // Marubozu (strong momentum candle)
    if (
      range > 0 &&
      upperWick < range * 0.05 &&
      lowerWick < range * 0.05
    ) {
      results.push({
        pattern: 'marubozu',
        index: i,
        confidence: 0.8,
        signal: isBullish(current) ? 'bullish' : 'bearish',
        description: `${isBullish(current) ? 'Bullish' : 'Bearish'} Marubozu - strong momentum`,
      })
    }

    // ==========================================================================
    // TWO CANDLE PATTERNS
    // ==========================================================================

    // Bullish Engulfing
    if (
      isBearish(prev) &&
      isBullish(current) &&
      current.open < prev.close &&
      current.close > prev.open &&
      getBody(current) > getBody(prev) * PATTERN_CONFIG.candlestick.engulfingMinRatio
    ) {
      results.push({
        pattern: 'bullish_engulfing',
        index: i,
        confidence: 0.8,
        signal: 'bullish',
        description: 'Bullish Engulfing - strong bullish reversal',
      })
    }

    // Bearish Engulfing
    if (
      isBullish(prev) &&
      isBearish(current) &&
      current.open > prev.close &&
      current.close < prev.open &&
      getBody(current) > getBody(prev) * PATTERN_CONFIG.candlestick.engulfingMinRatio
    ) {
      results.push({
        pattern: 'bearish_engulfing',
        index: i,
        confidence: 0.8,
        signal: 'bearish',
        description: 'Bearish Engulfing - strong bearish reversal',
      })
    }

    // Piercing Line
    if (
      isBearish(prev) &&
      isBullish(current) &&
      current.open < prev.low &&
      current.close > prev.open + getBody(prev) * 0.5 &&
      current.close < prev.open
    ) {
      results.push({
        pattern: 'piercing_line',
        index: i,
        confidence: 0.7,
        signal: 'bullish',
        description: 'Piercing Line - bullish reversal pattern',
      })
    }

    // Dark Cloud Cover
    if (
      isBullish(prev) &&
      isBearish(current) &&
      current.open > prev.high &&
      current.close < prev.close - getBody(prev) * 0.5 &&
      current.close > prev.open
    ) {
      results.push({
        pattern: 'dark_cloud_cover',
        index: i,
        confidence: 0.7,
        signal: 'bearish',
        description: 'Dark Cloud Cover - bearish reversal pattern',
      })
    }

    // Tweezer Top
    if (
      i >= 1 &&
      Math.abs(prev.high - current.high) < getRange(prev) * 0.05 &&
      isBullish(prev) &&
      isBearish(current)
    ) {
      results.push({
        pattern: 'tweezer_top',
        index: i,
        confidence: 0.65,
        signal: 'bearish',
        description: 'Tweezer Top - bearish reversal at resistance',
      })
    }

    // Tweezer Bottom
    if (
      i >= 1 &&
      Math.abs(prev.low - current.low) < getRange(prev) * 0.05 &&
      isBearish(prev) &&
      isBullish(current)
    ) {
      results.push({
        pattern: 'tweezer_bottom',
        index: i,
        confidence: 0.65,
        signal: 'bullish',
        description: 'Tweezer Bottom - bullish reversal at support',
      })
    }

    // ==========================================================================
    // THREE CANDLE PATTERNS
    // ==========================================================================

    if (i >= 2) {
      // Morning Star
      if (
        isBearish(prevPrev) &&
        getBody(prev) < getBody(prevPrev) * 0.3 &&
        isBullish(current) &&
        current.close > prevPrev.open + getBody(prevPrev) * 0.5
      ) {
        results.push({
          pattern: 'morning_star',
          index: i,
          confidence: 0.85,
          signal: 'bullish',
          description: 'Morning Star - strong bullish reversal',
        })
      }

      // Evening Star
      if (
        isBullish(prevPrev) &&
        getBody(prev) < getBody(prevPrev) * 0.3 &&
        isBearish(current) &&
        current.close < prevPrev.close - getBody(prevPrev) * 0.5
      ) {
        results.push({
          pattern: 'evening_star',
          index: i,
          confidence: 0.85,
          signal: 'bearish',
          description: 'Evening Star - strong bearish reversal',
        })
      }

      // Three White Soldiers
      if (
        i >= 2 &&
        isBullish(prevPrev) &&
        isBullish(prev) &&
        isBullish(current) &&
        prev.close > prevPrev.close &&
        current.close > prev.close &&
        getBody(prev) > getRange(prev) * 0.5 &&
        getBody(current) > getRange(current) * 0.5
      ) {
        results.push({
          pattern: 'three_white_soldiers',
          index: i,
          confidence: 0.85,
          signal: 'bullish',
          description: 'Three White Soldiers - strong bullish continuation',
        })
      }

      // Three Black Crows
      if (
        i >= 2 &&
        isBearish(prevPrev) &&
        isBearish(prev) &&
        isBearish(current) &&
        prev.close < prevPrev.close &&
        current.close < prev.close &&
        getBody(prev) > getRange(prev) * 0.5 &&
        getBody(current) > getRange(current) * 0.5
      ) {
        results.push({
          pattern: 'three_black_crows',
          index: i,
          confidence: 0.85,
          signal: 'bearish',
          description: 'Three Black Crows - strong bearish continuation',
        })
      }
    }
  }

  return results
}

// =============================================================================
// CHART PATTERN DETECTION
// =============================================================================

export function detectChartPatterns(candles: OHLCV[]): ChartPatternResult[] {
  const results: ChartPatternResult[] = []
  const minBars = PATTERN_CONFIG.chartPatterns.minPatternBars
  const maxBars = PATTERN_CONFIG.chartPatterns.maxPatternBars

  // Find swing highs and lows
  const swings = findSwingPoints(candles, PATTERN_CONFIG.trend.swingStrength)
  const highs = swings.filter((s) => s.type === 'high')
  const lows = swings.filter((s) => s.type === 'low')

  // ==========================================================================
  // HEAD AND SHOULDERS
  // ==========================================================================

  if (highs.length >= 3) {
    for (let i = 2; i < highs.length; i++) {
      const leftShoulder = highs[i - 2]
      const head = highs[i - 1]
      const rightShoulder = highs[i]

      // Check if head is higher than both shoulders
      if (
        head.price > leftShoulder.price &&
        head.price > rightShoulder.price &&
        Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.05
      ) {
        // Find neckline
        const leftLow = findLowestBetween(candles, leftShoulder.index, head.index)
        const rightLow = findLowestBetween(candles, head.index, rightShoulder.index)

        if (leftLow && rightLow) {
          const neckline = (leftLow.low + rightLow.low) / 2
          const patternHeight = head.price - neckline

          results.push({
            pattern: 'head_and_shoulders',
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
            confidence: 0.8,
            signal: 'bearish',
            targetPrice: neckline - patternHeight,
            stopLoss: head.price,
            description: 'Head and Shoulders - bearish reversal pattern',
          })
        }
      }
    }
  }

  // ==========================================================================
  // INVERSE HEAD AND SHOULDERS
  // ==========================================================================

  if (lows.length >= 3) {
    for (let i = 2; i < lows.length; i++) {
      const leftShoulder = lows[i - 2]
      const head = lows[i - 1]
      const rightShoulder = lows[i]

      // Check if head is lower than both shoulders
      if (
        head.price < leftShoulder.price &&
        head.price < rightShoulder.price &&
        Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.05
      ) {
        // Find neckline
        const leftHigh = findHighestBetween(candles, leftShoulder.index, head.index)
        const rightHigh = findHighestBetween(candles, head.index, rightShoulder.index)

        if (leftHigh && rightHigh) {
          const neckline = (leftHigh.high + rightHigh.high) / 2
          const patternHeight = neckline - head.price

          results.push({
            pattern: 'inverse_head_and_shoulders',
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
            confidence: 0.8,
            signal: 'bullish',
            targetPrice: neckline + patternHeight,
            stopLoss: head.price,
            description: 'Inverse Head and Shoulders - bullish reversal pattern',
          })
        }
      }
    }
  }

  // ==========================================================================
  // DOUBLE TOP
  // ==========================================================================

  if (highs.length >= 2) {
    for (let i = 1; i < highs.length; i++) {
      const firstTop = highs[i - 1]
      const secondTop = highs[i]

      // Check if tops are at similar levels
      if (
        Math.abs(firstTop.price - secondTop.price) / firstTop.price < 0.03 &&
        secondTop.index - firstTop.index >= minBars
      ) {
        const trough = findLowestBetween(candles, firstTop.index, secondTop.index)

        if (trough) {
          const patternHeight = firstTop.price - trough.low

          results.push({
            pattern: 'double_top',
            startIndex: firstTop.index,
            endIndex: secondTop.index,
            confidence: 0.75,
            signal: 'bearish',
            targetPrice: trough.low - patternHeight,
            stopLoss: Math.max(firstTop.price, secondTop.price),
            description: 'Double Top - bearish reversal pattern',
          })
        }
      }
    }
  }

  // ==========================================================================
  // DOUBLE BOTTOM
  // ==========================================================================

  if (lows.length >= 2) {
    for (let i = 1; i < lows.length; i++) {
      const firstBottom = lows[i - 1]
      const secondBottom = lows[i]

      // Check if bottoms are at similar levels
      if (
        Math.abs(firstBottom.price - secondBottom.price) / firstBottom.price < 0.03 &&
        secondBottom.index - firstBottom.index >= minBars
      ) {
        const peak = findHighestBetween(candles, firstBottom.index, secondBottom.index)

        if (peak) {
          const patternHeight = peak.high - firstBottom.price

          results.push({
            pattern: 'double_bottom',
            startIndex: firstBottom.index,
            endIndex: secondBottom.index,
            confidence: 0.75,
            signal: 'bullish',
            targetPrice: peak.high + patternHeight,
            stopLoss: Math.min(firstBottom.price, secondBottom.price),
            description: 'Double Bottom - bullish reversal pattern',
          })
        }
      }
    }
  }

  // ==========================================================================
  // TRIANGLES
  // ==========================================================================

  // Look for converging trendlines
  if (highs.length >= 2 && lows.length >= 2) {
    const recentHighs = highs.slice(-3)
    const recentLows = lows.slice(-3)

    // Calculate slopes
    if (recentHighs.length >= 2 && recentLows.length >= 2) {
      const highSlope =
        (recentHighs[recentHighs.length - 1].price - recentHighs[0].price) /
        (recentHighs[recentHighs.length - 1].index - recentHighs[0].index)

      const lowSlope =
        (recentLows[recentLows.length - 1].price - recentLows[0].price) /
        (recentLows[recentLows.length - 1].index - recentLows[0].index)

      const startIdx = Math.min(recentHighs[0].index, recentLows[0].index)
      const endIdx = Math.max(
        recentHighs[recentHighs.length - 1].index,
        recentLows[recentLows.length - 1].index
      )

      // Ascending Triangle
      if (Math.abs(highSlope) < 0.001 && lowSlope > 0.001) {
        results.push({
          pattern: 'ascending_triangle',
          startIndex: startIdx,
          endIndex: endIdx,
          confidence: 0.7,
          signal: 'bullish',
          description: 'Ascending Triangle - bullish continuation',
        })
      }

      // Descending Triangle
      if (highSlope < -0.001 && Math.abs(lowSlope) < 0.001) {
        results.push({
          pattern: 'descending_triangle',
          startIndex: startIdx,
          endIndex: endIdx,
          confidence: 0.7,
          signal: 'bearish',
          description: 'Descending Triangle - bearish continuation',
        })
      }

      // Symmetrical Triangle
      if (highSlope < -0.001 && lowSlope > 0.001) {
        results.push({
          pattern: 'symmetrical_triangle',
          startIndex: startIdx,
          endIndex: endIdx,
          confidence: 0.6,
          signal: 'neutral',
          description: 'Symmetrical Triangle - breakout pending',
        })
      }
    }
  }

  // ==========================================================================
  // FLAGS AND PENNANTS
  // ==========================================================================

  // Look for sharp move followed by consolidation
  for (let i = 20; i < candles.length - 10; i++) {
    // Check for flagpole (sharp move)
    const poleStart = candles[i - 20]
    const poleEnd = candles[i - 10]
    const poleMove = (poleEnd.close - poleStart.close) / poleStart.close

    if (Math.abs(poleMove) > 0.05) {
      // 5% move
      // Check for consolidation (flag)
      const flagCandles = candles.slice(i - 10, i)
      const flagHighs = flagCandles.map((c) => c.high)
      const flagLows = flagCandles.map((c) => c.low)
      const flagRange = Math.max(...flagHighs) - Math.min(...flagLows)
      const poleRange = Math.abs(poleEnd.close - poleStart.close)

      if (flagRange < poleRange * 0.5) {
        // Consolidation is tight
        if (poleMove > 0) {
          results.push({
            pattern: 'bull_flag',
            startIndex: i - 20,
            endIndex: i,
            confidence: 0.7,
            signal: 'bullish',
            targetPrice: candles[i].close + poleRange,
            description: 'Bull Flag - bullish continuation',
          })
        } else {
          results.push({
            pattern: 'bear_flag',
            startIndex: i - 20,
            endIndex: i,
            confidence: 0.7,
            signal: 'bearish',
            targetPrice: candles[i].close - poleRange,
            description: 'Bear Flag - bearish continuation',
          })
        }
      }
    }
  }

  return results
}

// =============================================================================
// SUPPORT AND RESISTANCE DETECTION
// =============================================================================

export function detectSupportResistance(candles: OHLCV[]): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = []
  const { lookbackPeriod, minTouches, priceZonePercent } = PATTERN_CONFIG.supportResistance

  // Use recent candles for level detection
  const recentCandles = candles.slice(-lookbackPeriod)
  const allPrices: { price: number; type: 'high' | 'low'; index: number }[] = []

  // Collect all swing highs and lows
  recentCandles.forEach((c, i) => {
    allPrices.push({ price: c.high, type: 'high', index: candles.length - lookbackPeriod + i })
    allPrices.push({ price: c.low, type: 'low', index: candles.length - lookbackPeriod + i })
  })

  // Cluster prices into zones
  const zones: Map<number, { prices: number[]; indices: number[] }> = new Map()
  const currentPrice = candles[candles.length - 1].close
  const zoneSize = currentPrice * (priceZonePercent / 100)

  for (const item of allPrices) {
    const zoneKey = Math.round(item.price / zoneSize) * zoneSize

    if (!zones.has(zoneKey)) {
      zones.set(zoneKey, { prices: [], indices: [] })
    }

    const zone = zones.get(zoneKey)!
    zone.prices.push(item.price)
    zone.indices.push(item.index)
  }

  // Convert zones to levels
  for (const [zonePrice, data] of zones) {
    if (data.prices.length >= minTouches) {
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      const type = avgPrice > currentPrice ? 'resistance' : 'support'
      const strength = Math.min(data.prices.length / 10, 1) // More touches = stronger

      levels.push({
        price: avgPrice,
        type,
        strength,
        touches: data.prices.length,
        firstTouch: Math.min(...data.indices),
        lastTouch: Math.max(...data.indices),
        broken: type === 'support' ? currentPrice < avgPrice * 0.99 : currentPrice > avgPrice * 1.01,
      })
    }
  }

  // Sort by strength
  levels.sort((a, b) => b.strength - a.strength)

  return levels.slice(0, 10) // Return top 10 levels
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

export function analyzeTrend(candles: OHLCV[]): TrendAnalysis {
  const swings = findSwingPoints(candles, PATTERN_CONFIG.trend.swingStrength)
  const highs = swings.filter((s) => s.type === 'high')
  const lows = swings.filter((s) => s.type === 'low')

  // Determine trend direction
  let direction: TrendAnalysis['direction'] = 'sideways'
  let strength = 0.5

  if (highs.length >= 2 && lows.length >= 2) {
    const recentHighs = highs.slice(-3)
    const recentLows = lows.slice(-3)

    // Higher highs and higher lows = uptrend
    const higherHighs =
      recentHighs.length >= 2 &&
      recentHighs.every((h, i) => i === 0 || h.price > recentHighs[i - 1].price)

    const higherLows =
      recentLows.length >= 2 &&
      recentLows.every((l, i) => i === 0 || l.price > recentLows[i - 1].price)

    // Lower highs and lower lows = downtrend
    const lowerHighs =
      recentHighs.length >= 2 &&
      recentHighs.every((h, i) => i === 0 || h.price < recentHighs[i - 1].price)

    const lowerLows =
      recentLows.length >= 2 &&
      recentLows.every((l, i) => i === 0 || l.price < recentLows[i - 1].price)

    if (higherHighs && higherLows) {
      direction = 'up'
      strength = 0.8
    } else if (lowerHighs && lowerLows) {
      direction = 'down'
      strength = 0.8
    } else if (higherHighs || higherLows) {
      direction = 'up'
      strength = 0.6
    } else if (lowerHighs || lowerLows) {
      direction = 'down'
      strength = 0.6
    }
  }

  // Calculate trendlines
  const trendLines: TrendAnalysis['trendLines'] = []

  // Resistance trendline (connecting highs)
  if (highs.length >= 2) {
    const h1 = highs[highs.length - 2]
    const h2 = highs[highs.length - 1]
    const slope = (h2.price - h1.price) / (h2.index - h1.index)

    trendLines.push({
      type: 'resistance',
      slope,
      startPrice: h1.price,
      endPrice: h2.price,
      startIndex: h1.index,
      endIndex: h2.index,
    })
  }

  // Support trendline (connecting lows)
  if (lows.length >= 2) {
    const l1 = lows[lows.length - 2]
    const l2 = lows[lows.length - 1]
    const slope = (l2.price - l1.price) / (l2.index - l1.index)

    trendLines.push({
      type: 'support',
      slope,
      startPrice: l1.price,
      endPrice: l2.price,
      startIndex: l1.index,
      endIndex: l2.index,
    })
  }

  return {
    direction,
    strength,
    swings,
    trendLines,
  }
}

// =============================================================================
// COMPREHENSIVE PATTERN SCAN
// =============================================================================

export function scanPatterns(candles: OHLCV[]): PatternScanResult {
  const candlestickPatterns = detectCandlestickPatterns(candles)
  const chartPatterns = detectChartPatterns(candles)
  const supportResistance = detectSupportResistance(candles)
  const trend = analyzeTrend(candles)

  // Calculate overall bias
  let bullishScore = 0
  let bearishScore = 0

  // Weight candlestick patterns (recent only)
  const recentCandlestick = candlestickPatterns.filter(
    (p) => p.index >= candles.length - 5
  )
  for (const pattern of recentCandlestick) {
    if (pattern.signal === 'bullish') bullishScore += pattern.confidence
    if (pattern.signal === 'bearish') bearishScore += pattern.confidence
  }

  // Weight chart patterns
  for (const pattern of chartPatterns) {
    if (pattern.signal === 'bullish') bullishScore += pattern.confidence * 1.5
    if (pattern.signal === 'bearish') bearishScore += pattern.confidence * 1.5
  }

  // Weight trend
  if (trend.direction === 'up') bullishScore += trend.strength
  if (trend.direction === 'down') bearishScore += trend.strength

  // Determine overall bias
  let overallBias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const totalScore = bullishScore + bearishScore

  if (totalScore > 0) {
    const bullishRatio = bullishScore / totalScore
    if (bullishRatio > 0.6) overallBias = 'bullish'
    else if (bullishRatio < 0.4) overallBias = 'bearish'
  }

  const confidence = Math.abs(bullishScore - bearishScore) / Math.max(totalScore, 1)

  return {
    candlestickPatterns,
    chartPatterns,
    supportResistance,
    trend,
    overallBias,
    confidence: Math.min(confidence, 1),
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function findSwingPoints(
  candles: OHLCV[],
  strength: number
): { index: number; price: number; type: 'high' | 'low' }[] {
  const swings: { index: number; price: number; type: 'high' | 'low' }[] = []

  for (let i = strength; i < candles.length - strength; i++) {
    const current = candles[i]
    const leftCandles = candles.slice(i - strength, i)
    const rightCandles = candles.slice(i + 1, i + strength + 1)

    // Check for swing high
    const isSwingHigh =
      leftCandles.every((c) => c.high <= current.high) &&
      rightCandles.every((c) => c.high <= current.high)

    // Check for swing low
    const isSwingLow =
      leftCandles.every((c) => c.low >= current.low) &&
      rightCandles.every((c) => c.low >= current.low)

    if (isSwingHigh) {
      swings.push({ index: i, price: current.high, type: 'high' })
    }
    if (isSwingLow) {
      swings.push({ index: i, price: current.low, type: 'low' })
    }
  }

  return swings
}

function findLowestBetween(candles: OHLCV[], start: number, end: number): OHLCV | null {
  if (start >= end || start < 0 || end > candles.length) return null

  let lowest = candles[start]
  for (let i = start + 1; i < end; i++) {
    if (candles[i].low < lowest.low) {
      lowest = candles[i]
    }
  }
  return lowest
}

function findHighestBetween(candles: OHLCV[], start: number, end: number): OHLCV | null {
  if (start >= end || start < 0 || end > candles.length) return null

  let highest = candles[start]
  for (let i = start + 1; i < end; i++) {
    if (candles[i].high > highest.high) {
      highest = candles[i]
    }
  }
  return highest
}

function getTrendDirection(candles: OHLCV[]): 'up' | 'down' | 'sideways' {
  if (candles.length < 2) return 'sideways'

  const firstClose = candles[0].close
  const lastClose = candles[candles.length - 1].close
  const change = (lastClose - firstClose) / firstClose

  if (change > 0.02) return 'up'
  if (change < -0.02) return 'down'
  return 'sideways'
}

// =============================================================================
// EXPORT
// =============================================================================

export default {
  detectCandlestickPatterns,
  detectChartPatterns,
  detectSupportResistance,
  analyzeTrend,
  scanPatterns,
}
