/**
 * StuntMan Advanced Strategy Engine - Institutional Grade
 *
 * SOURCES:
 * - Order Flow: TradePro Academy, OrderFlows (Michael Valtos - 20yr institutional)
 * - Volume Profile: Axia Futures, NinjaTrader, ATAS
 * - Smart Money Concepts: ICT (Michael Huddleston), LuxAlgo
 * - Statistical: QuantInsti, Hudson & Thames, Purdue Research
 * - Footprint: Tradingriot, Optimus Futures, HighStrike
 *
 * This is NOT basic indicator crossover trading.
 * This is how institutions actually trade.
 */

import { Candle } from './signal-engine'

// =============================================================================
// TYPES
// =============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'FLAT'

export interface AdvancedSignal {
  direction: SignalDirection
  confidence: number           // 0-100
  strategy: string
  entryPrice: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
  reasoning: string
  metadata: Record<string, unknown>
}

// =============================================================================
// 1. ORDER FLOW ANALYSIS - How institutions actually trade
// =============================================================================

export interface OrderFlowData {
  bidVolume: number[]         // Volume at bid for each price level
  askVolume: number[]         // Volume at ask for each price level
  delta: number               // Ask volume - Bid volume
  cumulativeDelta: number     // Running total of delta
  imbalances: Imbalance[]     // Detected imbalances
}

export interface Imbalance {
  price: number
  type: 'BUY' | 'SELL'
  ratio: number               // How many times larger (e.g., 3x = 300%)
  stacked: boolean            // Part of 3+ consecutive imbalances
}

export interface DeltaDivergence {
  detected: boolean
  type: 'BULLISH' | 'BEARISH'
  priceExtreme: number
  deltaExtreme: number
  confidence: number
}

export interface Absorption {
  detected: boolean
  price: number
  type: 'BUY_ABSORBED' | 'SELL_ABSORBED'  // Buy pressure absorbed by sellers, etc.
  volume: number
  priceMovement: number       // How little price moved despite volume
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate Exponential Moving Average
 */
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

// =============================================================================
// 1. ORDER FLOW ANALYSIS - Delta Divergence
// =============================================================================

/**
 * Detect Delta Divergence
 *
 * Delta divergence is when price makes new high/low but delta doesn't confirm.
 * This signals exhaustion and potential reversal.
 *
 * Source: TradePro Academy, Tradingriot
 */
export function detectDeltaDivergence(
  candles: Candle[],
  deltaHistory: number[],
  lookback: number = 20
): DeltaDivergence {
  if (candles.length < lookback || deltaHistory.length < lookback) {
    return { detected: false, type: 'BULLISH', priceExtreme: 0, deltaExtreme: 0, confidence: 0 }
  }

  const recentCandles = candles.slice(-lookback)
  const recentDelta = deltaHistory.slice(-lookback)

  // Find price swing highs/lows
  const priceHighs: { index: number; price: number }[] = []
  const priceLows: { index: number; price: number }[] = []

  for (let i = 2; i < recentCandles.length - 2; i++) {
    const c = recentCandles[i]
    const isHigh = c.high > recentCandles[i - 1].high &&
                   c.high > recentCandles[i - 2].high &&
                   c.high > recentCandles[i + 1].high &&
                   c.high > recentCandles[i + 2].high
    const isLow = c.low < recentCandles[i - 1].low &&
                  c.low < recentCandles[i - 2].low &&
                  c.low < recentCandles[i + 1].low &&
                  c.low < recentCandles[i + 2].low

    if (isHigh) priceHighs.push({ index: i, price: c.high })
    if (isLow) priceLows.push({ index: i, price: c.low })
  }

  // Check for BEARISH divergence: Higher price high, lower delta high
  if (priceHighs.length >= 2) {
    const lastTwo = priceHighs.slice(-2)
    if (lastTwo[1].price > lastTwo[0].price) {
      // Price made higher high
      const delta1 = recentDelta[lastTwo[0].index]
      const delta2 = recentDelta[lastTwo[1].index]

      if (delta2 < delta1) {
        // Delta made lower high - BEARISH DIVERGENCE
        const divergenceStrength = Math.abs((delta1 - delta2) / delta1) * 100
        return {
          detected: true,
          type: 'BEARISH',
          priceExtreme: lastTwo[1].price,
          deltaExtreme: delta2,
          confidence: Math.min(95, 60 + divergenceStrength),
        }
      }
    }
  }

  // Check for BULLISH divergence: Lower price low, higher delta low
  if (priceLows.length >= 2) {
    const lastTwo = priceLows.slice(-2)
    if (lastTwo[1].price < lastTwo[0].price) {
      // Price made lower low
      const delta1 = recentDelta[lastTwo[0].index]
      const delta2 = recentDelta[lastTwo[1].index]

      if (delta2 > delta1) {
        // Delta made higher low - BULLISH DIVERGENCE
        const divergenceStrength = Math.abs((delta2 - delta1) / Math.abs(delta1)) * 100
        return {
          detected: true,
          type: 'BULLISH',
          priceExtreme: lastTwo[1].price,
          deltaExtreme: delta2,
          confidence: Math.min(95, 60 + divergenceStrength),
        }
      }
    }
  }

  return { detected: false, type: 'BULLISH', priceExtreme: 0, deltaExtreme: 0, confidence: 0 }
}

/**
 * Detect Absorption
 *
 * Absorption occurs when large volume executes with minimal price movement.
 * This signals limit orders absorbing market orders - potential reversal.
 *
 * Source: Optimus Futures, NinjaTrader
 */
export function detectAbsorption(
  candles: Candle[],
  volumeThreshold: number = 1.5  // 1.5x average volume
): Absorption {
  if (candles.length < 20) {
    return { detected: false, price: 0, type: 'BUY_ABSORBED', volume: 0, priceMovement: 0 }
  }

  const recent = candles.slice(-20)
  const avgVolume = recent.slice(0, -1).reduce((s, c) => s + c.volume, 0) / 19
  const current = recent[recent.length - 1]
  const currentVolume = current.volume

  // High volume with small body = absorption
  const bodySize = Math.abs(current.close - current.open)
  const range = current.high - current.low
  const bodyRatio = range > 0 ? bodySize / range : 0

  if (currentVolume > avgVolume * volumeThreshold && bodyRatio < 0.3) {
    // Determine direction of absorption
    const isBullishCandle = current.close > current.open
    const type = isBullishCandle ? 'SELL_ABSORBED' : 'BUY_ABSORBED'

    return {
      detected: true,
      price: current.close,
      type,
      volume: currentVolume,
      priceMovement: bodySize,
    }
  }

  return { detected: false, price: 0, type: 'BUY_ABSORBED', volume: 0, priceMovement: 0 }
}

/**
 * Detect Stacked Imbalances
 *
 * 3+ consecutive price levels with significant buy/sell imbalance
 * These act as strong support/resistance levels.
 *
 * Source: Tradingriot, ATAS
 */
export function detectStackedImbalances(
  bidVolumes: number[],
  askVolumes: number[],
  prices: number[],
  imbalanceThreshold: number = 3.0  // 300% = 3x ratio
): Imbalance[] {
  const imbalances: Imbalance[] = []

  for (let i = 0; i < prices.length; i++) {
    const bid = bidVolumes[i] || 1
    const ask = askVolumes[i] || 1

    // Buy imbalance: ask volume >> bid volume
    if (ask / bid >= imbalanceThreshold) {
      imbalances.push({
        price: prices[i],
        type: 'BUY',
        ratio: ask / bid,
        stacked: false,
      })
    }
    // Sell imbalance: bid volume >> ask volume
    else if (bid / ask >= imbalanceThreshold) {
      imbalances.push({
        price: prices[i],
        type: 'SELL',
        ratio: bid / ask,
        stacked: false,
      })
    }
  }

  // Mark stacked imbalances (3+ consecutive of same type)
  for (let i = 0; i < imbalances.length - 2; i++) {
    if (imbalances[i].type === imbalances[i + 1].type &&
        imbalances[i].type === imbalances[i + 2].type) {
      imbalances[i].stacked = true
      imbalances[i + 1].stacked = true
      imbalances[i + 2].stacked = true
    }
  }

  return imbalances.filter(im => im.stacked)
}

// =============================================================================
// 2. VOLUME PROFILE - Where the real value is
// =============================================================================

export interface VolumeProfileData {
  poc: number                 // Point of Control - highest volume price
  vah: number                 // Value Area High (70% of volume)
  val: number                 // Value Area Low
  hvns: number[]              // High Volume Nodes
  lvns: number[]              // Low Volume Nodes
  profileShape: 'P' | 'b' | 'D' | 'B'  // P=bullish, b=bearish, D=balanced, B=double
  developing: boolean         // Is this developing (current session)?
}

export interface VolumeNode {
  price: number
  volume: number
  type: 'HVN' | 'LVN'
}

/**
 * Calculate Volume Profile
 *
 * POC = Fair value, price is attracted to it
 * VAH/VAL = 70% of trading activity
 * HVN = Support/Resistance (price sticks)
 * LVN = Price passes through quickly
 *
 * Source: Axia Futures, NinjaTrader, TradingView
 */
export function calculateVolumeProfile(
  candles: Candle[],
  numBuckets: number = 24
): VolumeProfileData {
  if (candles.length < 10) {
    const price = candles[candles.length - 1]?.close || 0
    return {
      poc: price,
      vah: price,
      val: price,
      hvns: [],
      lvns: [],
      profileShape: 'D',
      developing: true,
    }
  }

  // Find price range
  let minPrice = Infinity
  let maxPrice = -Infinity
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low
    if (c.high > maxPrice) maxPrice = c.high
  }

  const priceRange = maxPrice - minPrice
  const bucketSize = priceRange / numBuckets

  // Distribute volume into buckets
  const volumeByBucket: number[] = new Array(numBuckets).fill(0)
  const priceByBucket: number[] = new Array(numBuckets).fill(0).map((_, i) =>
    minPrice + (i + 0.5) * bucketSize
  )

  for (const c of candles) {
    // Distribute candle's volume across its price range
    const candleRange = c.high - c.low || bucketSize
    const volumePerTick = c.volume / (candleRange / bucketSize)

    for (let i = 0; i < numBuckets; i++) {
      const bucketLow = minPrice + i * bucketSize
      const bucketHigh = bucketLow + bucketSize

      // Check if candle overlaps this bucket
      if (c.high >= bucketLow && c.low <= bucketHigh) {
        const overlapLow = Math.max(c.low, bucketLow)
        const overlapHigh = Math.min(c.high, bucketHigh)
        const overlapRatio = (overlapHigh - overlapLow) / candleRange
        volumeByBucket[i] += c.volume * overlapRatio
      }
    }
  }

  // Find POC (highest volume bucket)
  let pocIndex = 0
  let maxVolume = 0
  for (let i = 0; i < numBuckets; i++) {
    if (volumeByBucket[i] > maxVolume) {
      maxVolume = volumeByBucket[i]
      pocIndex = i
    }
  }
  const poc = priceByBucket[pocIndex]

  // Calculate Value Area (70% of total volume)
  const totalVolume = volumeByBucket.reduce((a, b) => a + b, 0)
  const targetVolume = totalVolume * 0.70

  let vaVolume = volumeByBucket[pocIndex]
  let vaLowIndex = pocIndex
  let vaHighIndex = pocIndex

  while (vaVolume < targetVolume && (vaLowIndex > 0 || vaHighIndex < numBuckets - 1)) {
    const lowCandidate = vaLowIndex > 0 ? volumeByBucket[vaLowIndex - 1] : 0
    const highCandidate = vaHighIndex < numBuckets - 1 ? volumeByBucket[vaHighIndex + 1] : 0

    if (lowCandidate >= highCandidate && vaLowIndex > 0) {
      vaLowIndex--
      vaVolume += lowCandidate
    } else if (vaHighIndex < numBuckets - 1) {
      vaHighIndex++
      vaVolume += highCandidate
    } else {
      break
    }
  }

  const vah = priceByBucket[vaHighIndex]
  const val = priceByBucket[vaLowIndex]

  // Find HVNs and LVNs
  const avgVolume = totalVolume / numBuckets
  const hvns: number[] = []
  const lvns: number[] = []

  for (let i = 0; i < numBuckets; i++) {
    if (volumeByBucket[i] > avgVolume * 1.5) {
      hvns.push(priceByBucket[i])
    } else if (volumeByBucket[i] < avgVolume * 0.5) {
      lvns.push(priceByBucket[i])
    }
  }

  // Determine profile shape
  let profileShape: 'P' | 'b' | 'D' | 'B' = 'D'
  if (pocIndex > numBuckets * 0.6) profileShape = 'P'      // POC at top = bullish
  else if (pocIndex < numBuckets * 0.4) profileShape = 'b'  // POC at bottom = bearish

  return { poc, vah, val, hvns, lvns, profileShape, developing: false }
}

/**
 * Generate Volume Profile Signal
 *
 * Strategy: Mean reversion to POC when price is at extremes
 */
export function generateVolumeProfileSignal(
  currentPrice: number,
  profile: VolumeProfileData,
  atr: number
): AdvancedSignal | null {
  // Price below VAL = potential long to POC
  if (currentPrice < profile.val) {
    const distanceToVAL = profile.val - currentPrice
    const distanceToPOC = profile.poc - currentPrice

    if (distanceToVAL > atr * 0.5) {
      return {
        direction: 'LONG',
        confidence: Math.min(85, 60 + (distanceToVAL / atr) * 10),
        strategy: 'VP_VAL_REVERSAL',
        entryPrice: currentPrice,
        stopLoss: currentPrice - atr * 1.5,
        takeProfit: profile.poc,
        riskRewardRatio: distanceToPOC / (atr * 1.5),
        reasoning: `Price at VAL ($${profile.val.toFixed(2)}), target POC ($${profile.poc.toFixed(2)})`,
        metadata: { profile },
      }
    }
  }

  // Price above VAH = potential short to POC
  if (currentPrice > profile.vah) {
    const distanceToVAH = currentPrice - profile.vah
    const distanceToPOC = currentPrice - profile.poc

    if (distanceToVAH > atr * 0.5) {
      return {
        direction: 'SHORT',
        confidence: Math.min(85, 60 + (distanceToVAH / atr) * 10),
        strategy: 'VP_VAH_REVERSAL',
        entryPrice: currentPrice,
        stopLoss: currentPrice + atr * 1.5,
        takeProfit: profile.poc,
        riskRewardRatio: distanceToPOC / (atr * 1.5),
        reasoning: `Price at VAH ($${profile.vah.toFixed(2)}), target POC ($${profile.poc.toFixed(2)})`,
        metadata: { profile },
      }
    }
  }

  return null
}

// =============================================================================
// 3. SMART MONEY CONCEPTS (ICT) - How institutions manipulate price
// =============================================================================

export interface OrderBlock {
  price: number
  high: number
  low: number
  type: 'BULLISH' | 'BEARISH'
  volume: number
  timestamp: number
  tested: boolean
  mitigated: boolean
}

export interface FairValueGap {
  high: number                // Top of gap
  low: number                 // Bottom of gap
  type: 'BULLISH' | 'BEARISH'
  timestamp: number
  size: number
  filled: boolean
  fillPercentage: number
}

export interface LiquidityPool {
  price: number
  type: 'BUY_SIDE' | 'SELL_SIDE'  // Buy stops above, sell stops below
  strength: number            // Number of equal highs/lows
  swept: boolean
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING'
  lastBOS: { price: number; type: 'BULLISH' | 'BEARISH' } | null
  lastCHoCH: { price: number; type: 'BULLISH' | 'BEARISH' } | null
  swingHigh: number
  swingLow: number
}

/**
 * Detect Order Blocks
 *
 * Order Block = Last opposing candle before an explosive move
 * Price often returns to "rebalance" remaining institutional orders
 *
 * Source: ICT, LuxAlgo
 */
export function detectOrderBlocks(
  candles: Candle[],
  minImpulseMultiple: number = 2.0  // Impulse must be 2x the OB candle
): OrderBlock[] {
  if (candles.length < 10) return []

  const orderBlocks: OrderBlock[] = []
  const avgRange = candles.slice(-20).reduce((s, c) => s + (c.high - c.low), 0) / 20

  for (let i = 1; i < candles.length - 2; i++) {
    const current = candles[i]
    const next = candles[i + 1]

    const currentRange = current.high - current.low
    const nextRange = next.high - next.low
    const isBearishCandle = current.close < current.open
    const isBullishNext = next.close > next.open

    // BULLISH ORDER BLOCK: Bearish candle followed by strong bullish impulse
    if (isBearishCandle && isBullishNext && nextRange > currentRange * minImpulseMultiple) {
      orderBlocks.push({
        price: (current.high + current.low) / 2,
        high: current.high,
        low: current.low,
        type: 'BULLISH',
        volume: current.volume,
        timestamp: current.time,
        tested: false,
        mitigated: false,
      })
    }

    // BEARISH ORDER BLOCK: Bullish candle followed by strong bearish impulse
    const isBullishCandle = current.close > current.open
    const isBearishNext = next.close < next.open

    if (isBullishCandle && isBearishNext && nextRange > currentRange * minImpulseMultiple) {
      orderBlocks.push({
        price: (current.high + current.low) / 2,
        high: current.high,
        low: current.low,
        type: 'BEARISH',
        volume: current.volume,
        timestamp: current.time,
        tested: false,
        mitigated: false,
      })
    }
  }

  // Check if order blocks have been tested/mitigated
  const lastCandle = candles[candles.length - 1]
  for (const ob of orderBlocks) {
    if (ob.type === 'BULLISH') {
      // Bullish OB is tested when price returns to it from above
      if (lastCandle.low <= ob.high && lastCandle.low >= ob.low) {
        ob.tested = true
      }
      // Mitigated if price closes below the OB
      if (lastCandle.close < ob.low) {
        ob.mitigated = true
      }
    } else {
      // Bearish OB is tested when price returns to it from below
      if (lastCandle.high >= ob.low && lastCandle.high <= ob.high) {
        ob.tested = true
      }
      // Mitigated if price closes above the OB
      if (lastCandle.close > ob.high) {
        ob.mitigated = true
      }
    }
  }

  return orderBlocks.filter(ob => !ob.mitigated)
}

/**
 * Detect Fair Value Gaps (FVG)
 *
 * FVG = 3-candle pattern where middle candle's range doesn't overlap with outer candles
 * Price returns to fill ~70% of FVGs
 *
 * Source: ICT, ATAS
 */
export function detectFairValueGaps(
  candles: Candle[],
  minGapSize: number = 0  // Minimum gap size in points
): FairValueGap[] {
  if (candles.length < 3) return []

  const gaps: FairValueGap[] = []

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2]
    const c2 = candles[i - 1]
    const c3 = candles[i]

    // BULLISH FVG: Gap between c1.high and c3.low
    if (c3.low > c1.high) {
      const gapSize = c3.low - c1.high
      if (gapSize >= minGapSize) {
        gaps.push({
          high: c3.low,
          low: c1.high,
          type: 'BULLISH',
          timestamp: c2.time,
          size: gapSize,
          filled: false,
          fillPercentage: 0,
        })
      }
    }

    // BEARISH FVG: Gap between c3.high and c1.low
    if (c3.high < c1.low) {
      const gapSize = c1.low - c3.high
      if (gapSize >= minGapSize) {
        gaps.push({
          high: c1.low,
          low: c3.high,
          type: 'BEARISH',
          timestamp: c2.time,
          size: gapSize,
          filled: false,
          fillPercentage: 0,
        })
      }
    }
  }

  // Check if gaps have been filled
  const lastCandle = candles[candles.length - 1]
  for (const gap of gaps) {
    if (gap.type === 'BULLISH') {
      // Bullish FVG filled when price drops into it
      if (lastCandle.low <= gap.high) {
        const fillDepth = Math.min(gap.high - lastCandle.low, gap.size)
        gap.fillPercentage = (fillDepth / gap.size) * 100
        gap.filled = gap.fillPercentage >= 50
      }
    } else {
      // Bearish FVG filled when price rises into it
      if (lastCandle.high >= gap.low) {
        const fillDepth = Math.min(lastCandle.high - gap.low, gap.size)
        gap.fillPercentage = (fillDepth / gap.size) * 100
        gap.filled = gap.fillPercentage >= 50
      }
    }
  }

  return gaps.filter(g => !g.filled)
}

/**
 * Detect Liquidity Pools
 *
 * Liquidity = Where stop losses cluster (equal highs/lows)
 * Institutions sweep these areas to fill large orders
 *
 * Source: ICT, Smart Money Concepts
 */
export function detectLiquidityPools(
  candles: Candle[],
  tolerance: number = 0.0005  // 0.05% tolerance for "equal" prices
): LiquidityPool[] {
  if (candles.length < 10) return []

  const pools: LiquidityPool[] = []

  // Find equal highs (buy-side liquidity above)
  const highs = candles.map((c, i) => ({ price: c.high, index: i }))

  for (let i = 0; i < highs.length; i++) {
    let equalCount = 1
    const basePrice = highs[i].price

    for (let j = i + 1; j < highs.length; j++) {
      const priceDiff = Math.abs(highs[j].price - basePrice) / basePrice
      if (priceDiff <= tolerance) {
        equalCount++
      }
    }

    if (equalCount >= 2) {
      pools.push({
        price: basePrice,
        type: 'BUY_SIDE',
        strength: equalCount,
        swept: false,
      })
    }
  }

  // Find equal lows (sell-side liquidity below)
  const lows = candles.map((c, i) => ({ price: c.low, index: i }))

  for (let i = 0; i < lows.length; i++) {
    let equalCount = 1
    const basePrice = lows[i].price

    for (let j = i + 1; j < lows.length; j++) {
      const priceDiff = Math.abs(lows[j].price - basePrice) / basePrice
      if (priceDiff <= tolerance) {
        equalCount++
      }
    }

    if (equalCount >= 2) {
      pools.push({
        price: basePrice,
        type: 'SELL_SIDE',
        strength: equalCount,
        swept: false,
      })
    }
  }

  // Check if pools have been swept
  const lastCandle = candles[candles.length - 1]
  for (const pool of pools) {
    if (pool.type === 'BUY_SIDE' && lastCandle.high > pool.price) {
      pool.swept = true
    }
    if (pool.type === 'SELL_SIDE' && lastCandle.low < pool.price) {
      pool.swept = true
    }
  }

  return pools
}

/**
 * Detect Market Structure (BOS, CHoCH)
 *
 * BOS = Break of Structure (trend continuation)
 * CHoCH = Change of Character (potential reversal)
 *
 * Source: ICT, LuxAlgo
 */
export function detectMarketStructure(candles: Candle[]): MarketStructure {
  if (candles.length < 20) {
    return {
      trend: 'RANGING',
      lastBOS: null,
      lastCHoCH: null,
      swingHigh: candles[candles.length - 1]?.high || 0,
      swingLow: candles[candles.length - 1]?.low || 0,
    }
  }

  // Find swing highs and lows
  const swingHighs: { price: number; index: number }[] = []
  const swingLows: { price: number; index: number }[] = []

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i]

    const isSwingHigh = c.high >= candles[i - 1].high &&
                        c.high >= candles[i - 2].high &&
                        c.high >= candles[i + 1].high &&
                        c.high >= candles[i + 2].high

    const isSwingLow = c.low <= candles[i - 1].low &&
                       c.low <= candles[i - 2].low &&
                       c.low <= candles[i + 1].low &&
                       c.low <= candles[i + 2].low

    if (isSwingHigh) swingHighs.push({ price: c.high, index: i })
    if (isSwingLow) swingLows.push({ price: c.low, index: i })
  }

  // Determine trend from swing points
  let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING'
  let lastBOS: { price: number; type: 'BULLISH' | 'BEARISH' } | null = null
  let lastCHoCH: { price: number; type: 'BULLISH' | 'BEARISH' } | null = null

  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-3)
    const recentLows = swingLows.slice(-3)

    // Check for higher highs and higher lows (bullish)
    const higherHighs = recentHighs.length >= 2 &&
      recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price
    const higherLows = recentLows.length >= 2 &&
      recentLows[recentLows.length - 1].price > recentLows[recentLows.length - 2].price

    // Check for lower highs and lower lows (bearish)
    const lowerHighs = recentHighs.length >= 2 &&
      recentHighs[recentHighs.length - 1].price < recentHighs[recentHighs.length - 2].price
    const lowerLows = recentLows.length >= 2 &&
      recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price

    if (higherHighs && higherLows) {
      trend = 'BULLISH'
      lastBOS = { price: recentHighs[recentHighs.length - 1].price, type: 'BULLISH' }
    } else if (lowerHighs && lowerLows) {
      trend = 'BEARISH'
      lastBOS = { price: recentLows[recentLows.length - 1].price, type: 'BEARISH' }
    }

    // Detect CHoCH (structure break against the trend)
    const lastCandle = candles[candles.length - 1]
    if (trend === 'BULLISH' && recentLows.length >= 1) {
      if (lastCandle.close < recentLows[recentLows.length - 1].price) {
        lastCHoCH = { price: recentLows[recentLows.length - 1].price, type: 'BEARISH' }
      }
    }
    if (trend === 'BEARISH' && recentHighs.length >= 1) {
      if (lastCandle.close > recentHighs[recentHighs.length - 1].price) {
        lastCHoCH = { price: recentHighs[recentHighs.length - 1].price, type: 'BULLISH' }
      }
    }
  }

  return {
    trend,
    lastBOS,
    lastCHoCH,
    swingHigh: swingHighs[swingHighs.length - 1]?.price || candles[candles.length - 1].high,
    swingLow: swingLows[swingLows.length - 1]?.price || candles[candles.length - 1].low,
  }
}

// =============================================================================
// 4. STATISTICAL/QUANTITATIVE STRATEGIES
// =============================================================================

/**
 * Z-Score Mean Reversion
 *
 * Entry: |z-score| >= 2.0 (price 2 standard deviations from mean)
 * Exit: |z-score| <= 0.5 (price near mean)
 *
 * Source: QuantInsti, Hudson & Thames
 */
export function calculateZScore(
  prices: number[],
  period: number = 20
): { zscore: number; mean: number; stdDev: number } {
  if (prices.length < period) {
    return { zscore: 0, mean: prices[prices.length - 1] || 0, stdDev: 0 }
  }

  const recent = prices.slice(-period)
  const mean = recent.reduce((a, b) => a + b, 0) / period

  const squaredDiffs = recent.map(p => Math.pow(p - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const stdDev = Math.sqrt(variance)

  const currentPrice = prices[prices.length - 1]
  const zscore = stdDev > 0 ? (currentPrice - mean) / stdDev : 0

  return { zscore, mean, stdDev }
}

export function generateZScoreSignal(
  prices: number[],
  atr: number,
  entryThreshold: number = 2.0,
  exitThreshold: number = 0.5
): AdvancedSignal | null {
  const { zscore, mean, stdDev } = calculateZScore(prices)
  const currentPrice = prices[prices.length - 1]

  // LONG: Z-score <= -2 (price too low, expect reversion up)
  if (zscore <= -entryThreshold) {
    return {
      direction: 'LONG',
      confidence: Math.min(90, 70 + Math.abs(zscore) * 5),
      strategy: 'ZSCORE_REVERSION',
      entryPrice: currentPrice,
      stopLoss: currentPrice - stdDev * 1.5,
      takeProfit: mean,
      riskRewardRatio: Math.abs(mean - currentPrice) / (stdDev * 1.5),
      reasoning: `Z-score ${zscore.toFixed(2)} <= -${entryThreshold}, price ${stdDev.toFixed(2)} below mean`,
      metadata: { zscore, mean, stdDev },
    }
  }

  // SHORT: Z-score >= 2 (price too high, expect reversion down)
  if (zscore >= entryThreshold) {
    return {
      direction: 'SHORT',
      confidence: Math.min(90, 70 + Math.abs(zscore) * 5),
      strategy: 'ZSCORE_REVERSION',
      entryPrice: currentPrice,
      stopLoss: currentPrice + stdDev * 1.5,
      takeProfit: mean,
      riskRewardRatio: Math.abs(currentPrice - mean) / (stdDev * 1.5),
      reasoning: `Z-score ${zscore.toFixed(2)} >= ${entryThreshold}, price ${stdDev.toFixed(2)} above mean`,
      metadata: { zscore, mean, stdDev },
    }
  }

  return null
}

/**
 * Calculate Half-Life of Mean Reversion
 *
 * Tells you how many bars it takes for price to revert halfway to mean
 * Lower half-life = faster reversion = better for trading
 *
 * Source: Hudson & Thames, QuantInsti
 */
export function calculateHalfLife(prices: number[]): number {
  if (prices.length < 20) return Infinity

  // Ornstein-Uhlenbeck regression
  const y = prices.slice(1).map((p, i) => p - prices[i])
  const x = prices.slice(0, -1)

  // Simple linear regression: y = beta * x + alpha
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)

  const beta = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  // Half-life = -ln(2) / beta
  if (beta >= 0) return Infinity  // Not mean-reverting
  const halfLife = -Math.log(2) / beta

  return Math.max(1, halfLife)
}

// =============================================================================
// 5. MASTER ADVANCED SIGNAL GENERATOR
// =============================================================================

export interface AdvancedAnalysis {
  // Order Flow
  deltaDivergence: DeltaDivergence
  absorption: Absorption
  stackedImbalances: Imbalance[]

  // Volume Profile
  volumeProfile: VolumeProfileData

  // Smart Money
  orderBlocks: OrderBlock[]
  fvgs: FairValueGap[]
  liquidityPools: LiquidityPool[]
  marketStructure: MarketStructure

  // Statistical
  zscore: { zscore: number; mean: number; stdDev: number }
  halfLife: number
}

/**
 * Perform Complete Advanced Analysis
 */
export function analyzeMarket(
  candles: Candle[],
  deltaHistory: number[] = [],
  bidVolumes: number[] = [],
  askVolumes: number[] = [],
  prices: number[] = []
): AdvancedAnalysis {
  const closes = candles.map(c => c.close)

  return {
    // Order Flow
    deltaDivergence: detectDeltaDivergence(candles, deltaHistory),
    absorption: detectAbsorption(candles),
    stackedImbalances: detectStackedImbalances(bidVolumes, askVolumes, prices),

    // Volume Profile
    volumeProfile: calculateVolumeProfile(candles),

    // Smart Money
    orderBlocks: detectOrderBlocks(candles),
    fvgs: detectFairValueGaps(candles),
    liquidityPools: detectLiquidityPools(candles),
    marketStructure: detectMarketStructure(candles),

    // Statistical
    zscore: calculateZScore(closes),
    halfLife: calculateHalfLife(closes),
  }
}

/**
 * Generate Master Advanced Signal
 *
 * Combines all analysis into a single high-confidence signal
 *
 * CRITICAL: These are REVERSAL strategies. In strong trends, they FAIL.
 * We must filter/penalize counter-trend signals.
 */
export function generateAdvancedMasterSignal(
  candles: Candle[],
  analysis: AdvancedAnalysis,
  atr: number
): AdvancedSignal | null {
  const currentPrice = candles[candles.length - 1].close
  const signals: AdvancedSignal[] = []

  // ==========================================================================
  // TREND DETECTION - Critical for filtering reversal signals
  // ==========================================================================
  const ema20 = calculateEMA(candles.slice(-30).map(c => c.close), 20)
  const ema50 = calculateEMA(candles.slice(-60).map(c => c.close), 50)
  const currentEma20 = ema20[ema20.length - 1] || currentPrice
  const currentEma50 = ema50[ema50.length - 1] || currentPrice

  // Determine trend direction and strength
  const priceAboveEma20 = currentPrice > currentEma20
  const priceAboveEma50 = currentPrice > currentEma50
  const ema20AboveEma50 = currentEma20 > currentEma50

  // STRONG UPTREND: Price > EMA20 > EMA50
  // STRONG DOWNTREND: Price < EMA20 < EMA50
  const isStrongUptrend = priceAboveEma20 && priceAboveEma50 && ema20AboveEma50
  const isStrongDowntrend = !priceAboveEma20 && !priceAboveEma50 && !ema20AboveEma50

  // Trend bias for signal filtering
  const trendBias: 'LONG' | 'SHORT' | 'NEUTRAL' =
    isStrongUptrend ? 'LONG' :
    isStrongDowntrend ? 'SHORT' :
    'NEUTRAL'

  // ==========================================================================
  // REVERSAL SIGNALS - Penalize heavily in strong trends
  // ==========================================================================

  // 1. Delta Divergence Signal (HIGHEST PRIORITY - Leading indicator)
  // NOTE: This is a REVERSAL indicator - reduce confidence in strong trends
  if (analysis.deltaDivergence.detected && analysis.deltaDivergence.confidence >= 70) {
    const dir = analysis.deltaDivergence.type === 'BULLISH' ? 'LONG' : 'SHORT'

    // COUNTER-TREND PENALTY: In strong trend, reversal signals get 50% confidence reduction
    let adjustedConfidence = analysis.deltaDivergence.confidence
    if ((trendBias === 'LONG' && dir === 'SHORT') || (trendBias === 'SHORT' && dir === 'LONG')) {
      adjustedConfidence *= 0.5  // 50% penalty for counter-trend
    }

    // Only add if still above minimum threshold after penalty
    if (adjustedConfidence >= 50) {
      signals.push({
        direction: dir,
        confidence: adjustedConfidence,
        strategy: 'DELTA_DIVERGENCE',
        entryPrice: currentPrice,
        stopLoss: dir === 'LONG' ? currentPrice - atr * 1.5 : currentPrice + atr * 1.5,
        takeProfit: dir === 'LONG' ? currentPrice + atr * 3 : currentPrice - atr * 3,
        riskRewardRatio: 2.0,
        reasoning: `Delta divergence: ${analysis.deltaDivergence.type}${trendBias !== 'NEUTRAL' && trendBias !== dir ? ' (counter-trend)' : ''}`,
        metadata: { deltaDivergence: analysis.deltaDivergence },
      })
    }
  }

  // 2. Order Block + FVG Confluence
  // NOTE: Order blocks are REVERSAL setups - price returning to supply/demand zone
  const activeOBs = analysis.orderBlocks.filter(ob => ob.tested && !ob.mitigated)
  const activeFVGs = analysis.fvgs.filter(fvg => !fvg.filled && fvg.fillPercentage < 30)

  for (const ob of activeOBs) {
    // Check if there's an FVG near the order block
    const nearbyFVG = activeFVGs.find(fvg =>
      Math.abs(fvg.low - ob.price) < atr || Math.abs(fvg.high - ob.price) < atr
    )

    if (nearbyFVG || ob.volume > 0) {
      const dir = ob.type === 'BULLISH' ? 'LONG' : 'SHORT'

      // COUNTER-TREND PENALTY
      let adjustedConfidence = nearbyFVG ? 85 : 75
      if ((trendBias === 'LONG' && dir === 'SHORT') || (trendBias === 'SHORT' && dir === 'LONG')) {
        adjustedConfidence *= 0.5  // 50% penalty for counter-trend
      }

      if (adjustedConfidence >= 50) {
        signals.push({
          direction: dir,
          confidence: adjustedConfidence,
          strategy: 'OB_FVG_CONFLUENCE',
          entryPrice: currentPrice,
          stopLoss: dir === 'LONG' ? ob.low - atr * 0.5 : ob.high + atr * 0.5,
          takeProfit: dir === 'LONG' ? currentPrice + atr * 3 : currentPrice - atr * 3,
          riskRewardRatio: 2.5,
          reasoning: `Order block ${ob.type} at ${ob.price.toFixed(2)}${nearbyFVG ? ' + FVG confluence' : ''}${trendBias !== 'NEUTRAL' && trendBias !== dir ? ' (counter-trend)' : ''}`,
          metadata: { orderBlock: ob, fvg: nearbyFVG },
        })
      }
    }
  }

  // 3. Liquidity Sweep + Structure Shift (ICT classic setup)
  // NOTE: This is a REVERSAL setup
  const sweptPools = analysis.liquidityPools.filter(p => p.swept)
  if (sweptPools.length > 0 && analysis.marketStructure.lastCHoCH) {
    const dir = analysis.marketStructure.lastCHoCH.type === 'BULLISH' ? 'LONG' : 'SHORT'

    // COUNTER-TREND PENALTY
    let adjustedConfidence = 80
    if ((trendBias === 'LONG' && dir === 'SHORT') || (trendBias === 'SHORT' && dir === 'LONG')) {
      adjustedConfidence *= 0.5
    }

    if (adjustedConfidence >= 50) {
      signals.push({
        direction: dir,
        confidence: adjustedConfidence,
        strategy: 'LIQUIDITY_SWEEP_MSS',
        entryPrice: currentPrice,
        stopLoss: dir === 'LONG' ? analysis.marketStructure.swingLow - atr * 0.5 : analysis.marketStructure.swingHigh + atr * 0.5,
        takeProfit: dir === 'LONG' ? currentPrice + atr * 4 : currentPrice - atr * 4,
        riskRewardRatio: 3.0,
        reasoning: `Liquidity swept + CHoCH ${analysis.marketStructure.lastCHoCH.type}${trendBias !== 'NEUTRAL' && trendBias !== dir ? ' (counter-trend)' : ''}`,
        metadata: { sweptPools, choch: analysis.marketStructure.lastCHoCH },
      })
    }
  }

  // 4. Volume Profile + Z-Score Mean Reversion
  // NOTE: Mean reversion is a COUNTER-TREND strategy
  const vpSignal = generateVolumeProfileSignal(currentPrice, analysis.volumeProfile, atr)
  if (vpSignal && Math.abs(analysis.zscore.zscore) >= 1.5) {
    // Apply counter-trend penalty
    if ((trendBias === 'LONG' && vpSignal.direction === 'SHORT') ||
        (trendBias === 'SHORT' && vpSignal.direction === 'LONG')) {
      vpSignal.confidence *= 0.5
    }

    if (vpSignal.confidence >= 50) {
      vpSignal.confidence = Math.min(95, vpSignal.confidence + 10)
      vpSignal.reasoning += ` + Z-score ${analysis.zscore.zscore.toFixed(2)}${trendBias !== 'NEUTRAL' && trendBias !== vpSignal.direction ? ' (counter-trend)' : ''}`
      signals.push(vpSignal)
    }
  }

  // 5. Pure Z-Score if extreme
  // NOTE: Z-Score is MEAN REVERSION = counter-trend
  if (Math.abs(analysis.zscore.zscore) >= 2.0) {
    const zSignal = generateZScoreSignal(candles.map(c => c.close), atr)
    if (zSignal) {
      // Apply counter-trend penalty
      if ((trendBias === 'LONG' && zSignal.direction === 'SHORT') ||
          (trendBias === 'SHORT' && zSignal.direction === 'LONG')) {
        zSignal.confidence *= 0.5
      }

      if (zSignal.confidence >= 50) {
        signals.push(zSignal)
      }
    }
  }

  // 6. Absorption at key levels
  // NOTE: Absorption is a REVERSAL signal
  if (analysis.absorption.detected) {
    const nearPOC = Math.abs(analysis.absorption.price - analysis.volumeProfile.poc) < atr
    const nearOB = analysis.orderBlocks.some(ob =>
      analysis.absorption.price >= ob.low && analysis.absorption.price <= ob.high
    )

    if (nearPOC || nearOB) {
      const dir = analysis.absorption.type === 'SELL_ABSORBED' ? 'LONG' : 'SHORT'

      // COUNTER-TREND PENALTY
      let adjustedConfidence = 75
      if ((trendBias === 'LONG' && dir === 'SHORT') || (trendBias === 'SHORT' && dir === 'LONG')) {
        adjustedConfidence *= 0.5
      }

      if (adjustedConfidence >= 50) {
        signals.push({
          direction: dir,
          confidence: adjustedConfidence,
          strategy: 'ABSORPTION_REVERSAL',
          entryPrice: currentPrice,
          stopLoss: dir === 'LONG' ? currentPrice - atr * 1.5 : currentPrice + atr * 1.5,
          takeProfit: dir === 'LONG' ? currentPrice + atr * 2.5 : currentPrice - atr * 2.5,
          riskRewardRatio: 1.67,
          reasoning: `Absorption at ${nearPOC ? 'POC' : 'Order Block'}${trendBias !== 'NEUTRAL' && trendBias !== dir ? ' (counter-trend)' : ''}`,
          metadata: { absorption: analysis.absorption },
        })
      }
    }
  }

  // Select the highest confidence signal with proper confluence
  if (signals.length === 0) return null

  // Count agreeing directions
  const longSignals = signals.filter(s => s.direction === 'LONG')
  const shortSignals = signals.filter(s => s.direction === 'SHORT')

  let bestSignals: AdvancedSignal[]
  if (longSignals.length > shortSignals.length) {
    bestSignals = longSignals
  } else if (shortSignals.length > longSignals.length) {
    bestSignals = shortSignals
  } else {
    // Equal - take the one with higher total confidence
    const longConf = longSignals.reduce((s, sig) => s + sig.confidence, 0)
    const shortConf = shortSignals.reduce((s, sig) => s + sig.confidence, 0)
    bestSignals = longConf >= shortConf ? longSignals : shortSignals
  }

  // Return highest confidence agreeing signal
  bestSignals.sort((a, b) => b.confidence - a.confidence)
  const best = bestSignals[0]

  // Boost confidence if multiple strategies agree
  if (bestSignals.length >= 2) {
    best.confidence = Math.min(95, best.confidence + 10)
    best.reasoning = `[${bestSignals.length} strategies agree] ` + best.reasoning
  }

  return best
}
