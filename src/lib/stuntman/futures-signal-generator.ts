// =============================================================================
// FUTURES SIGNAL GENERATOR - INSTITUTIONAL GRADE
// =============================================================================
// Advanced signal generation for ES, NQ, MES, MNQ futures
// Uses order flow, market structure, volume profile, and intermarket analysis
// Powered by Rithmic for sub-millisecond market data
// =============================================================================

import { RithmicClient, FUTURES_SPECS, FuturesSymbol, RithmicTimeBar } from '@/lib/rithmic'

// OHLCV type for compatibility
export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Chart timeframe type
export type ChartTimeframe = '1Min' | '5Min' | '15Min' | '1Hour' | 'Daily'

// =============================================================================
// TYPES
// =============================================================================

export type FuturesSignalAction = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
export type MarketBias = 'bullish' | 'bearish' | 'neutral' | 'choppy'
export type SessionType = 'overnight' | 'pre_market' | 'regular' | 'post_market' | 'closed'

export interface FuturesSignal {
  id: string
  timestamp: number
  symbol: FuturesSymbol
  action: FuturesSignalAction
  confidence: number           // 0-100
  strength: number             // 0-100

  // Price levels
  entryPrice: number
  stopLoss: number
  takeProfit1: number          // First target (1:1 R:R minimum)
  takeProfit2: number          // Second target (2:1 R:R)
  takeProfit3: number          // Runner target (3:1+ R:R)

  // Position sizing
  riskRewardRatio: number
  suggestedContracts: number
  maxContracts: number
  riskPerContract: number      // Dollar risk per contract

  // Analysis
  bias: MarketBias
  session: SessionType
  reasoning: string[]

  // Component scores
  scores: {
    marketStructure: number
    orderFlow: number
    volumeProfile: number
    momentum: number
    intermarket: number
    timing: number
  }

  // Confluence
  confluenceCount: number
  keyLevels: {
    resistance: number[]
    support: number[]
    pivots: { r1: number; r2: number; r3: number; pp: number; s1: number; s2: number; s3: number }
  }

  // Validity
  validUntil: number           // Signal expires after this timestamp
  invalidationPrice: number    // Price that invalidates the signal
}

export interface MarketContext {
  symbol: FuturesSymbol
  currentPrice: number
  session: SessionType
  atr: number                  // Average True Range
  dailyRange: number
  dailyRangePercent: number
  volumeRatio: number          // Current volume vs average
  trendStrength: number        // 0-100
  volatility: 'low' | 'normal' | 'high' | 'extreme'
}

export interface OrderFlowData {
  deltaSum: number             // Buy volume - Sell volume
  deltaPercent: number
  cumulativeDelta: number
  largeOrderImbalance: number  // Large buyer vs seller imbalance
  absorptionDetected: boolean
  exhaustionDetected: boolean
}

export interface VolumeProfileLevel {
  price: number
  volume: number
  buyVolume: number
  sellVolume: number
  isHVN: boolean               // High Volume Node
  isLVN: boolean               // Low Volume Node
  isPOC: boolean               // Point of Control
  isVAH: boolean               // Value Area High
  isVAL: boolean               // Value Area Low
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Trading session times (ET)
const SESSIONS = {
  overnight: { start: 18, end: 8 },      // 6pm - 8am
  pre_market: { start: 8, end: 9.5 },    // 8am - 9:30am
  regular: { start: 9.5, end: 16 },      // 9:30am - 4pm
  post_market: { start: 16, end: 18 },   // 4pm - 6pm
}

// Key times for futures
const KEY_TIMES = {
  europeOpen: 3,        // 3am ET
  londonOpen: 3,        // 3am ET
  cashOpen: 9.5,        // 9:30am ET
  bondClose: 15,        // 3pm ET
  cashClose: 16,        // 4pm ET
  settleTime: 16.25,    // 4:15pm ET
}

// Minimum confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  STRONG_BUY: 85,
  BUY: 70,
  HOLD_UPPER: 55,
  HOLD_LOWER: 45,
  SELL: 30,
  STRONG_SELL: 15,
}

// =============================================================================
// FUTURES SIGNAL GENERATOR CLASS
// =============================================================================

export class FuturesSignalGenerator {
  private client: RithmicClient
  private priceCache: Map<string, OHLCV[]> = new Map()
  private signalHistory: Map<string, FuturesSignal[]> = new Map()
  private cacheTTL = 60000  // Cache TTL in ms

  constructor(client: RithmicClient) {
    this.client = client
  }

  // ===========================================================================
  // MAIN SIGNAL GENERATION
  // ===========================================================================

  /**
   * Generate a trading signal for a futures symbol
   */
  async generateSignal(symbol: FuturesSymbol): Promise<FuturesSignal> {
    console.log(`[FuturesSignal] Generating signal for ${symbol}...`)

    // Get market data across multiple timeframes
    const [m1Data, m5Data, m15Data, h1Data, dailyData] = await Promise.all([
      this.getHistoricalData(symbol, '1Min', 100),
      this.getHistoricalData(symbol, '5Min', 100),
      this.getHistoricalData(symbol, '15Min', 100),
      this.getHistoricalData(symbol, '1Hour', 50),
      this.getHistoricalData(symbol, 'Daily', 20),
    ])

    // Get current context
    const context = await this.getMarketContext(symbol, m5Data, dailyData)

    // Run all analysis components
    const [
      marketStructure,
      orderFlow,
      volumeProfile,
      momentum,
      intermarket,
      timing,
    ] = await Promise.all([
      this.analyzeMarketStructure(m5Data, m15Data, h1Data),
      this.analyzeOrderFlow(m1Data, m5Data),
      this.analyzeVolumeProfile(m5Data, dailyData),
      this.analyzeMomentum(m5Data, m15Data, h1Data),
      this.analyzeIntermarket(symbol),
      this.analyzeTiming(context.session),
    ])

    // Calculate key levels
    const keyLevels = this.calculateKeyLevels(dailyData, context.currentPrice)

    // Combine scores with weights
    const weights = {
      marketStructure: 0.25,
      orderFlow: 0.20,
      volumeProfile: 0.15,
      momentum: 0.20,
      intermarket: 0.10,
      timing: 0.10,
    }

    const weightedScore =
      marketStructure.score * weights.marketStructure +
      orderFlow.score * weights.orderFlow +
      volumeProfile.score * weights.volumeProfile +
      momentum.score * weights.momentum +
      intermarket.score * weights.intermarket +
      timing.score * weights.timing

    // Determine action based on score
    const action = this.determineAction(weightedScore)
    const confidence = Math.abs(weightedScore - 50) * 2  // 0-100 scale

    // Calculate entry, stop loss, and targets
    const { entryPrice, stopLoss, targets, riskPerContract } = this.calculateTradeLevels(
      symbol,
      context,
      action,
      keyLevels,
      context.atr
    )

    // Count confluences
    const confluenceCount = this.countConfluences(
      marketStructure, orderFlow, volumeProfile, momentum, intermarket, timing
    )

    // Collect reasoning
    const reasoning = [
      ...marketStructure.reasons,
      ...orderFlow.reasons,
      ...volumeProfile.reasons,
      ...momentum.reasons,
      ...intermarket.reasons,
      ...timing.reasons,
    ]

    // Calculate suggested position size
    const suggestedContracts = this.calculatePositionSize(
      symbol,
      riskPerContract,
      confidence,
      confluenceCount
    )

    // Generate signal
    const signal: FuturesSignal = {
      id: `${symbol}_${Date.now()}`,
      timestamp: Date.now(),
      symbol,
      action,
      confidence,
      strength: weightedScore,

      entryPrice,
      stopLoss,
      takeProfit1: targets[0],
      takeProfit2: targets[1],
      takeProfit3: targets[2],

      riskRewardRatio: Math.abs(targets[0] - entryPrice) / Math.abs(stopLoss - entryPrice),
      suggestedContracts,
      maxContracts: Math.min(suggestedContracts * 2, 10),
      riskPerContract,

      bias: this.determineBias(weightedScore),
      session: context.session,
      reasoning,

      scores: {
        marketStructure: marketStructure.score,
        orderFlow: orderFlow.score,
        volumeProfile: volumeProfile.score,
        momentum: momentum.score,
        intermarket: intermarket.score,
        timing: timing.score,
      },

      confluenceCount,
      keyLevels,

      validUntil: Date.now() + (context.session === 'regular' ? 15 * 60 * 1000 : 30 * 60 * 1000),
      invalidationPrice: action.includes('BUY')
        ? stopLoss - context.atr * 0.5
        : stopLoss + context.atr * 0.5,
    }

    // Store in history
    const history = this.signalHistory.get(symbol) || []
    history.unshift(signal)
    this.signalHistory.set(symbol, history.slice(0, 100))

    console.log(`[FuturesSignal] ${symbol}: ${action} (${confidence.toFixed(0)}% confidence)`)
    console.log(`  Entry: ${entryPrice}, SL: ${stopLoss}, TP1: ${targets[0]}`)
    console.log(`  Confluences: ${confluenceCount}, R:R: ${signal.riskRewardRatio.toFixed(2)}`)

    return signal
  }

  // ===========================================================================
  // MARKET STRUCTURE ANALYSIS
  // ===========================================================================

  private async analyzeMarketStructure(
    m5Data: OHLCV[],
    m15Data: OHLCV[],
    h1Data: OHLCV[]
  ): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50  // Neutral starting point

    // Find swing points
    const m5Swings = this.findSwingPoints(m5Data)
    const m15Swings = this.findSwingPoints(m15Data)
    const h1Swings = this.findSwingPoints(h1Data)

    // Check for higher highs and higher lows (uptrend)
    const m5Trend = this.analyzeTrendFromSwings(m5Swings)
    const m15Trend = this.analyzeTrendFromSwings(m15Swings)
    const h1Trend = this.analyzeTrendFromSwings(h1Swings)

    // Multi-timeframe trend alignment
    if (m5Trend === 'up' && m15Trend === 'up' && h1Trend === 'up') {
      score += 25
      reasons.push('Strong uptrend: All timeframes aligned bullish (HH/HL structure)')
    } else if (m5Trend === 'down' && m15Trend === 'down' && h1Trend === 'down') {
      score -= 25
      reasons.push('Strong downtrend: All timeframes aligned bearish (LH/LL structure)')
    } else if (h1Trend === 'up' && (m5Trend === 'up' || m15Trend === 'up')) {
      score += 15
      reasons.push('Bullish structure: Higher timeframe uptrend with pullback opportunity')
    } else if (h1Trend === 'down' && (m5Trend === 'down' || m15Trend === 'down')) {
      score -= 15
      reasons.push('Bearish structure: Higher timeframe downtrend with rally opportunity')
    }

    // Check for break of structure (BOS)
    const bos = this.detectBreakOfStructure(m5Data, m5Swings)
    if (bos.detected) {
      if (bos.direction === 'bullish') {
        score += 15
        reasons.push(`Bullish BOS detected at ${bos.price.toFixed(2)}`)
      } else {
        score -= 15
        reasons.push(`Bearish BOS detected at ${bos.price.toFixed(2)}`)
      }
    }

    // Check for change of character (CHoCH)
    const choch = this.detectChangeOfCharacter(m15Data, m15Swings)
    if (choch.detected) {
      if (choch.direction === 'bullish') {
        score += 20
        reasons.push('Bullish CHoCH: Potential trend reversal to upside')
      } else {
        score -= 20
        reasons.push('Bearish CHoCH: Potential trend reversal to downside')
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score))

    return { score, reasons }
  }

  private findSwingPoints(data: OHLCV[]): { highs: number[]; lows: number[] } {
    const highs: number[] = []
    const lows: number[] = []
    const lookback = 3

    for (let i = lookback; i < data.length - lookback; i++) {
      // Swing high
      let isSwingHigh = true
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j].high >= data[i].high) {
          isSwingHigh = false
          break
        }
      }
      if (isSwingHigh) highs.push(data[i].high)

      // Swing low
      let isSwingLow = true
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && data[j].low <= data[i].low) {
          isSwingLow = false
          break
        }
      }
      if (isSwingLow) lows.push(data[i].low)
    }

    return { highs, lows }
  }

  private analyzeTrendFromSwings(swings: { highs: number[]; lows: number[] }): 'up' | 'down' | 'neutral' {
    if (swings.highs.length < 2 || swings.lows.length < 2) return 'neutral'

    const recentHighs = swings.highs.slice(-3)
    const recentLows = swings.lows.slice(-3)

    // Check for higher highs and higher lows
    let higherHighs = true
    let higherLows = true
    let lowerHighs = true
    let lowerLows = true

    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] <= recentHighs[i - 1]) higherHighs = false
      if (recentHighs[i] >= recentHighs[i - 1]) lowerHighs = false
    }
    for (let i = 1; i < recentLows.length; i++) {
      if (recentLows[i] <= recentLows[i - 1]) higherLows = false
      if (recentLows[i] >= recentLows[i - 1]) lowerLows = false
    }

    if (higherHighs && higherLows) return 'up'
    if (lowerHighs && lowerLows) return 'down'
    return 'neutral'
  }

  private detectBreakOfStructure(data: OHLCV[], swings: { highs: number[]; lows: number[] }): {
    detected: boolean
    direction: 'bullish' | 'bearish'
    price: number
  } {
    if (swings.highs.length < 2 || swings.lows.length < 2) {
      return { detected: false, direction: 'bullish', price: 0 }
    }

    const lastHigh = swings.highs[swings.highs.length - 1]
    const lastLow = swings.lows[swings.lows.length - 1]
    const currentClose = data[data.length - 1].close

    // Bullish BOS: Price breaks above last swing high
    if (currentClose > lastHigh) {
      return { detected: true, direction: 'bullish', price: lastHigh }
    }

    // Bearish BOS: Price breaks below last swing low
    if (currentClose < lastLow) {
      return { detected: true, direction: 'bearish', price: lastLow }
    }

    return { detected: false, direction: 'bullish', price: 0 }
  }

  private detectChangeOfCharacter(data: OHLCV[], swings: { highs: number[]; lows: number[] }): {
    detected: boolean
    direction: 'bullish' | 'bearish'
  } {
    if (swings.highs.length < 3 || swings.lows.length < 3) {
      return { detected: false, direction: 'bullish' }
    }

    const trend = this.analyzeTrendFromSwings(swings)
    const currentClose = data[data.length - 1].close

    // In downtrend, CHoCH is when price breaks above a lower high
    if (trend === 'down') {
      const lastLowerHigh = swings.highs[swings.highs.length - 1]
      if (currentClose > lastLowerHigh) {
        return { detected: true, direction: 'bullish' }
      }
    }

    // In uptrend, CHoCH is when price breaks below a higher low
    if (trend === 'up') {
      const lastHigherLow = swings.lows[swings.lows.length - 1]
      if (currentClose < lastHigherLow) {
        return { detected: true, direction: 'bearish' }
      }
    }

    return { detected: false, direction: 'bullish' }
  }

  // ===========================================================================
  // ORDER FLOW ANALYSIS
  // ===========================================================================

  private async analyzeOrderFlow(
    m1Data: OHLCV[],
    m5Data: OHLCV[]
  ): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50

    // Calculate delta (buy vs sell volume approximation)
    // Since we don't have tick data, we estimate using candle structure
    const delta = this.calculateDelta(m1Data)

    if (delta.cumulativeDelta > 0) {
      const strength = Math.min(delta.deltaPercent * 2, 25)
      score += strength
      if (delta.deltaPercent > 60) {
        reasons.push(`Strong buying pressure: ${delta.deltaPercent.toFixed(0)}% buy-side dominance`)
      } else if (delta.deltaPercent > 55) {
        reasons.push(`Moderate buying pressure: ${delta.deltaPercent.toFixed(0)}% buy-side`)
      }
    } else {
      const strength = Math.min(Math.abs(delta.deltaPercent - 50) * 2, 25)
      score -= strength
      if (delta.deltaPercent < 40) {
        reasons.push(`Strong selling pressure: ${(100 - delta.deltaPercent).toFixed(0)}% sell-side dominance`)
      } else if (delta.deltaPercent < 45) {
        reasons.push(`Moderate selling pressure: ${(100 - delta.deltaPercent).toFixed(0)}% sell-side`)
      }
    }

    // Detect absorption (price not moving despite volume)
    const absorption = this.detectAbsorption(m5Data)
    if (absorption.detected) {
      if (absorption.type === 'bullish') {
        score += 15
        reasons.push('Bullish absorption: Sellers being absorbed at support')
      } else {
        score -= 15
        reasons.push('Bearish absorption: Buyers being absorbed at resistance')
      }
    }

    // Detect exhaustion (climactic volume with reversal)
    const exhaustion = this.detectExhaustion(m5Data)
    if (exhaustion.detected) {
      if (exhaustion.type === 'buying') {
        score -= 10
        reasons.push('Buying exhaustion detected: Potential top forming')
      } else {
        score += 10
        reasons.push('Selling exhaustion detected: Potential bottom forming')
      }
    }

    // Large order imbalance
    const imbalance = this.detectLargeOrderImbalance(m1Data)
    if (Math.abs(imbalance) > 0.2) {
      if (imbalance > 0) {
        score += 10
        reasons.push('Large buy imbalance detected: Institutional buying')
      } else {
        score -= 10
        reasons.push('Large sell imbalance detected: Institutional selling')
      }
    }

    score = Math.max(0, Math.min(100, score))
    return { score, reasons }
  }

  private calculateDelta(data: OHLCV[]): {
    deltaSum: number
    deltaPercent: number
    cumulativeDelta: number
  } {
    let buyVolume = 0
    let sellVolume = 0

    for (const bar of data) {
      const range = bar.high - bar.low
      if (range === 0) continue

      // Estimate: volume above close = selling, below = buying
      const buyRatio = (bar.close - bar.low) / range
      buyVolume += bar.volume * buyRatio
      sellVolume += bar.volume * (1 - buyRatio)
    }

    const totalVolume = buyVolume + sellVolume
    const deltaSum = buyVolume - sellVolume
    const deltaPercent = totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50

    return { deltaSum, deltaPercent, cumulativeDelta: deltaSum }
  }

  private detectAbsorption(data: OHLCV[]): { detected: boolean; type: 'bullish' | 'bearish' } {
    const recent = data.slice(-5)
    if (recent.length < 5) return { detected: false, type: 'bullish' }

    const avgVolume = recent.reduce((sum, b) => sum + b.volume, 0) / recent.length
    const lastBar = recent[recent.length - 1]
    const priceChange = Math.abs(lastBar.close - lastBar.open)
    const range = lastBar.high - lastBar.low

    // High volume with small price change = absorption
    if (lastBar.volume > avgVolume * 1.5 && priceChange < range * 0.3) {
      // Determine direction based on where close is in range
      const closePosition = (lastBar.close - lastBar.low) / range
      return {
        detected: true,
        type: closePosition > 0.5 ? 'bullish' : 'bearish',
      }
    }

    return { detected: false, type: 'bullish' }
  }

  private detectExhaustion(data: OHLCV[]): { detected: boolean; type: 'buying' | 'selling' } {
    const recent = data.slice(-10)
    if (recent.length < 10) return { detected: false, type: 'buying' }

    const avgVolume = recent.slice(0, -1).reduce((sum, b) => sum + b.volume, 0) / (recent.length - 1)
    const lastBar = recent[recent.length - 1]

    // Climactic volume (2x+ average) with reversal candle
    if (lastBar.volume > avgVolume * 2) {
      const isReversalUp = lastBar.close > lastBar.open && lastBar.low < recent[recent.length - 2].low
      const isReversalDown = lastBar.close < lastBar.open && lastBar.high > recent[recent.length - 2].high

      if (isReversalUp) {
        return { detected: true, type: 'selling' }
      }
      if (isReversalDown) {
        return { detected: true, type: 'buying' }
      }
    }

    return { detected: false, type: 'buying' }
  }

  private detectLargeOrderImbalance(data: OHLCV[]): number {
    const recent = data.slice(-20)
    const avgVolume = recent.reduce((sum, b) => sum + b.volume, 0) / recent.length

    let largeUpBars = 0
    let largeDownBars = 0

    for (const bar of recent) {
      if (bar.volume > avgVolume * 1.5) {
        if (bar.close > bar.open) largeUpBars++
        else largeDownBars++
      }
    }

    const total = largeUpBars + largeDownBars
    if (total === 0) return 0

    return (largeUpBars - largeDownBars) / total
  }

  // ===========================================================================
  // VOLUME PROFILE ANALYSIS
  // ===========================================================================

  private async analyzeVolumeProfile(
    m5Data: OHLCV[],
    dailyData: OHLCV[]
  ): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50

    // Build volume profile
    const profile = this.buildVolumeProfile(m5Data)
    const currentPrice = m5Data[m5Data.length - 1].close

    // Check if price is at POC (Point of Control)
    const poc = profile.find(l => l.isPOC)
    if (poc && Math.abs(currentPrice - poc.price) / poc.price < 0.001) {
      reasons.push(`Price at POC (${poc.price.toFixed(2)}): High volume acceptance zone`)
    }

    // Check if price is at Value Area High/Low
    const vah = profile.find(l => l.isVAH)
    const val = profile.find(l => l.isVAL)

    if (vah && currentPrice >= vah.price) {
      score -= 10
      reasons.push(`Price at/above VAH (${vah.price.toFixed(2)}): Potential resistance`)
    }
    if (val && currentPrice <= val.price) {
      score += 10
      reasons.push(`Price at/below VAL (${val.price.toFixed(2)}): Potential support`)
    }

    // Check for Low Volume Nodes (LVN) - price moves fast through these
    const nearbyLVN = profile.filter(l =>
      l.isLVN && Math.abs(currentPrice - l.price) / currentPrice < 0.003
    )
    if (nearbyLVN.length > 0) {
      reasons.push('Price near LVN: Expect faster price movement')
    }

    // Check for High Volume Nodes (HVN) - price consolidates here
    const nearbyHVN = profile.filter(l =>
      l.isHVN && Math.abs(currentPrice - l.price) / currentPrice < 0.002
    )
    if (nearbyHVN.length > 0) {
      reasons.push('Price at HVN: Strong support/resistance zone')
    }

    // Compare today's value area to previous day
    const yesterday = dailyData[dailyData.length - 2]
    const today = dailyData[dailyData.length - 1]

    if (yesterday && today) {
      if (today.close > yesterday.high) {
        score += 15
        reasons.push('Price above yesterday\'s high: Bullish trend continuation')
      } else if (today.close < yesterday.low) {
        score -= 15
        reasons.push('Price below yesterday\'s low: Bearish trend continuation')
      }
    }

    score = Math.max(0, Math.min(100, score))
    return { score, reasons }
  }

  private buildVolumeProfile(data: OHLCV[]): VolumeProfileLevel[] {
    if (data.length === 0) return []

    // Find price range
    let minPrice = Infinity
    let maxPrice = -Infinity
    for (const bar of data) {
      minPrice = Math.min(minPrice, bar.low)
      maxPrice = Math.max(maxPrice, bar.high)
    }

    // Create price buckets
    const numBuckets = 50
    const bucketSize = (maxPrice - minPrice) / numBuckets
    const buckets: { price: number; volume: number; buyVolume: number; sellVolume: number }[] = []

    for (let i = 0; i < numBuckets; i++) {
      buckets.push({
        price: minPrice + (i + 0.5) * bucketSize,
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
      })
    }

    // Distribute volume into buckets
    for (const bar of data) {
      const lowBucket = Math.floor((bar.low - minPrice) / bucketSize)
      const highBucket = Math.min(Math.floor((bar.high - minPrice) / bucketSize), numBuckets - 1)

      const volumePerBucket = bar.volume / (highBucket - lowBucket + 1)
      const buyRatio = (bar.close - bar.low) / (bar.high - bar.low || 1)

      for (let i = lowBucket; i <= highBucket; i++) {
        if (i >= 0 && i < numBuckets) {
          buckets[i].volume += volumePerBucket
          buckets[i].buyVolume += volumePerBucket * buyRatio
          buckets[i].sellVolume += volumePerBucket * (1 - buyRatio)
        }
      }
    }

    // Find POC, VAH, VAL
    const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0)
    const sortedByVolume = [...buckets].sort((a, b) => b.volume - a.volume)
    const pocBucket = sortedByVolume[0]

    // Value area = 70% of volume around POC
    let valueAreaVolume = 0
    const valueAreaBuckets = new Set<number>()
    const pocIndex = buckets.indexOf(pocBucket)
    valueAreaBuckets.add(pocIndex)
    valueAreaVolume += pocBucket.volume

    let low = pocIndex
    let high = pocIndex

    while (valueAreaVolume < totalVolume * 0.7) {
      const lowVol = low > 0 ? buckets[low - 1].volume : 0
      const highVol = high < buckets.length - 1 ? buckets[high + 1].volume : 0

      if (lowVol >= highVol && low > 0) {
        low--
        valueAreaBuckets.add(low)
        valueAreaVolume += buckets[low].volume
      } else if (high < buckets.length - 1) {
        high++
        valueAreaBuckets.add(high)
        valueAreaVolume += buckets[high].volume
      } else {
        break
      }
    }

    // Find HVN and LVN
    const avgVolume = totalVolume / numBuckets
    const hvnThreshold = avgVolume * 1.5
    const lvnThreshold = avgVolume * 0.5

    // Create profile levels
    return buckets.map((bucket, i) => ({
      price: bucket.price,
      volume: bucket.volume,
      buyVolume: bucket.buyVolume,
      sellVolume: bucket.sellVolume,
      isPOC: bucket === pocBucket,
      isVAH: i === high,
      isVAL: i === low,
      isHVN: bucket.volume >= hvnThreshold,
      isLVN: bucket.volume <= lvnThreshold && bucket.volume > 0,
    }))
  }

  // ===========================================================================
  // MOMENTUM ANALYSIS
  // ===========================================================================

  private async analyzeMomentum(
    m5Data: OHLCV[],
    m15Data: OHLCV[],
    h1Data: OHLCV[]
  ): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50

    // Calculate RSI on multiple timeframes
    const rsi5m = this.calculateRSI(m5Data, 14)
    const rsi15m = this.calculateRSI(m15Data, 14)
    const rsi1h = this.calculateRSI(h1Data, 14)

    // RSI analysis
    if (rsi5m > 70 && rsi15m > 70) {
      score -= 15
      reasons.push(`Overbought: RSI 5m=${rsi5m.toFixed(0)}, 15m=${rsi15m.toFixed(0)}`)
    } else if (rsi5m < 30 && rsi15m < 30) {
      score += 15
      reasons.push(`Oversold: RSI 5m=${rsi5m.toFixed(0)}, 15m=${rsi15m.toFixed(0)}`)
    } else if (rsi1h > 50 && rsi15m > 50 && rsi5m > 50) {
      score += 10
      reasons.push('Bullish momentum: All timeframe RSIs above 50')
    } else if (rsi1h < 50 && rsi15m < 50 && rsi5m < 50) {
      score -= 10
      reasons.push('Bearish momentum: All timeframe RSIs below 50')
    }

    // RSI divergence
    const divergence = this.detectRSIDivergence(m15Data, rsi15m)
    if (divergence.detected) {
      if (divergence.type === 'bullish') {
        score += 20
        reasons.push('Bullish RSI divergence: Price making lower lows, RSI making higher lows')
      } else {
        score -= 20
        reasons.push('Bearish RSI divergence: Price making higher highs, RSI making lower highs')
      }
    }

    // MACD
    const macd = this.calculateMACD(m15Data)
    if (macd.histogram > 0 && macd.histogramSlope > 0) {
      score += 10
      reasons.push('MACD bullish: Histogram positive and rising')
    } else if (macd.histogram < 0 && macd.histogramSlope < 0) {
      score -= 10
      reasons.push('MACD bearish: Histogram negative and falling')
    }

    // MACD crossover
    if (macd.crossover === 'bullish') {
      score += 15
      reasons.push('Bullish MACD crossover')
    } else if (macd.crossover === 'bearish') {
      score -= 15
      reasons.push('Bearish MACD crossover')
    }

    score = Math.max(0, Math.min(100, score))
    return { score, reasons }
  }

  private calculateRSI(data: OHLCV[], period: number): number {
    if (data.length < period + 1) return 50

    let gains = 0
    let losses = 0

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close
      if (change >= 0) gains += change
      else losses -= change
    }

    let avgGain = gains / period
    let avgLoss = losses / period

    // Calculate smoothed averages
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      const gain = change >= 0 ? change : 0
      const loss = change < 0 ? -change : 0

      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  private detectRSIDivergence(data: OHLCV[], currentRSI: number): {
    detected: boolean
    type: 'bullish' | 'bearish'
  } {
    if (data.length < 20) return { detected: false, type: 'bullish' }

    const recent = data.slice(-20)
    const swings = this.findSwingPoints(recent)

    // Check for bullish divergence: lower low in price, higher low in RSI
    if (swings.lows.length >= 2) {
      const lastLow = swings.lows[swings.lows.length - 1]
      const prevLow = swings.lows[swings.lows.length - 2]

      if (lastLow < prevLow && currentRSI > 30) {
        // Price made lower low but RSI didn't confirm
        return { detected: true, type: 'bullish' }
      }
    }

    // Check for bearish divergence: higher high in price, lower high in RSI
    if (swings.highs.length >= 2) {
      const lastHigh = swings.highs[swings.highs.length - 1]
      const prevHigh = swings.highs[swings.highs.length - 2]

      if (lastHigh > prevHigh && currentRSI < 70) {
        return { detected: true, type: 'bearish' }
      }
    }

    return { detected: false, type: 'bullish' }
  }

  private calculateMACD(data: OHLCV[]): {
    macd: number
    signal: number
    histogram: number
    histogramSlope: number
    crossover: 'bullish' | 'bearish' | 'none'
  } {
    const closes = data.map(d => d.close)
    const ema12 = this.calculateEMA(closes, 12)
    const ema26 = this.calculateEMA(closes, 26)

    const macdLine = ema12.map((v, i) => v - ema26[i])
    const signalLine = this.calculateEMA(macdLine, 9)
    const histogram = macdLine.map((v, i) => v - signalLine[i])

    const current = histogram.length - 1
    const prev = histogram.length - 2

    let crossover: 'bullish' | 'bearish' | 'none' = 'none'
    if (prev >= 0) {
      if (macdLine[current] > signalLine[current] && macdLine[prev] <= signalLine[prev]) {
        crossover = 'bullish'
      } else if (macdLine[current] < signalLine[current] && macdLine[prev] >= signalLine[prev]) {
        crossover = 'bearish'
      }
    }

    return {
      macd: macdLine[current],
      signal: signalLine[current],
      histogram: histogram[current],
      histogramSlope: prev >= 0 ? histogram[current] - histogram[prev] : 0,
      crossover,
    }
  }

  private calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)

    ema[0] = data[0]
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1]
    }

    return ema
  }

  // ===========================================================================
  // INTERMARKET ANALYSIS
  // ===========================================================================

  private async analyzeIntermarket(symbol: FuturesSymbol): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50

    // For now, return neutral - would need additional data feeds
    // In production, would analyze:
    // - ES vs NQ correlation (tech sector strength)
    // - Bond yields (ZN, ZB) vs equities
    // - VIX levels and direction
    // - Dollar index (DX)
    // - Sector rotation (XLF, XLE, etc.)

    // Placeholder analysis based on symbol
    if (symbol === 'ES' || symbol === 'MES') {
      reasons.push('S&P 500 futures: Broad market exposure')
    } else if (symbol === 'NQ' || symbol === 'MNQ') {
      reasons.push('NASDAQ futures: Tech-heavy, higher beta')
    }

    return { score, reasons }
  }

  // ===========================================================================
  // TIMING ANALYSIS
  // ===========================================================================

  private async analyzeTiming(session: SessionType): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 50

    const now = new Date()
    const etHour = (now.getUTCHours() - 5 + 24) % 24
    const minutes = now.getUTCMinutes()
    const timeDecimal = etHour + minutes / 60

    // Session-based scoring
    if (session === 'regular') {
      score += 10
      reasons.push('Regular trading hours: Best liquidity')

      // Key times during regular session
      if (Math.abs(timeDecimal - 9.5) < 0.25) {
        score += 5
        reasons.push('Cash market open: High volatility opportunity')
      } else if (Math.abs(timeDecimal - 10) < 0.25) {
        score += 5
        reasons.push('Initial balance forming (9:30-10:00): Key reference levels')
      } else if (Math.abs(timeDecimal - 15) < 0.25) {
        reasons.push('Bond market close: Potential repositioning')
      } else if (timeDecimal >= 15.5) {
        score -= 5
        reasons.push('Late session: Reduced conviction, wait for tomorrow')
      }
    } else if (session === 'overnight') {
      score -= 5
      reasons.push('Overnight session: Lower liquidity, wider spreads')

      if (Math.abs(timeDecimal - 3) < 0.5) {
        score += 5
        reasons.push('Europe/London open: Increased activity')
      }
    } else if (session === 'pre_market') {
      reasons.push('Pre-market: Building positions ahead of open')
    } else if (session === 'closed') {
      score = 50
      reasons.push('Market closed')
    }

    // Day of week
    const dayOfWeek = now.getUTCDay()
    if (dayOfWeek === 1) {
      reasons.push('Monday: Weekend gap risk, cautious sizing')
    } else if (dayOfWeek === 5 && timeDecimal > 14) {
      score -= 5
      reasons.push('Friday afternoon: Reduced activity, avoid new positions')
    }

    score = Math.max(0, Math.min(100, score))
    return { score, reasons }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private async getMarketContext(
    symbol: FuturesSymbol,
    m5Data: OHLCV[],
    dailyData: OHLCV[]
  ): Promise<MarketContext> {
    const currentPrice = m5Data[m5Data.length - 1]?.close || 0
    const session = this.getCurrentSession()
    const atr = this.calculateATR(m5Data, 14)
    const today = dailyData[dailyData.length - 1]
    const dailyRange = today ? today.high - today.low : 0
    const dailyRangePercent = currentPrice > 0 ? (dailyRange / currentPrice) * 100 : 0

    // Calculate average volume
    const avgVolume = m5Data.slice(-50).reduce((sum, b) => sum + b.volume, 0) / 50
    const recentVolume = m5Data.slice(-5).reduce((sum, b) => sum + b.volume, 0) / 5
    const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1

    // Trend strength using ADX concept
    const trendStrength = this.calculateTrendStrength(m5Data)

    // Volatility classification
    const avgATR = this.calculateATR(dailyData, 14)
    const volatility = atr > avgATR * 1.5 ? 'extreme'
      : atr > avgATR * 1.2 ? 'high'
      : atr < avgATR * 0.8 ? 'low'
      : 'normal'

    return {
      symbol,
      currentPrice,
      session,
      atr,
      dailyRange,
      dailyRangePercent,
      volumeRatio,
      trendStrength,
      volatility,
    }
  }

  private getCurrentSession(): SessionType {
    const now = new Date()
    const day = now.getUTCDay()
    if (day === 0 || day === 6) return 'closed'

    const etHour = (now.getUTCHours() - 5 + 24) % 24
    const timeDecimal = etHour + now.getUTCMinutes() / 60

    if (timeDecimal >= 18 || timeDecimal < 8) return 'overnight'
    if (timeDecimal >= 8 && timeDecimal < 9.5) return 'pre_market'
    if (timeDecimal >= 9.5 && timeDecimal < 16) return 'regular'
    if (timeDecimal >= 16 && timeDecimal < 18) return 'post_market'

    return 'closed'
  }

  private calculateATR(data: OHLCV[], period: number): number {
    if (data.length < period + 1) return 0

    const trueRanges: number[] = []
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high
      const low = data[i].low
      const prevClose = data[i - 1].close
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
      trueRanges.push(tr)
    }

    // Calculate ATR as EMA of true ranges
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period
    }

    return atr
  }

  private calculateTrendStrength(data: OHLCV[]): number {
    if (data.length < 20) return 50

    const closes = data.map(d => d.close)
    const sma20 = closes.slice(-20).reduce((sum, c) => sum + c, 0) / 20
    const currentClose = closes[closes.length - 1]

    // Calculate how far price is from SMA as percentage
    const deviation = ((currentClose - sma20) / sma20) * 100

    // Convert to 0-100 scale (0 = strong downtrend, 100 = strong uptrend)
    return Math.max(0, Math.min(100, 50 + deviation * 10))
  }

  private calculateKeyLevels(dailyData: OHLCV[], currentPrice: number): FuturesSignal['keyLevels'] {
    // Calculate pivot points from previous day
    const yesterday = dailyData[dailyData.length - 2]
    if (!yesterday) {
      return {
        resistance: [],
        support: [],
        pivots: { r1: 0, r2: 0, r3: 0, pp: 0, s1: 0, s2: 0, s3: 0 },
      }
    }

    const { high, low, close } = yesterday
    const pp = (high + low + close) / 3
    const r1 = 2 * pp - low
    const r2 = pp + (high - low)
    const r3 = high + 2 * (pp - low)
    const s1 = 2 * pp - high
    const s2 = pp - (high - low)
    const s3 = low - 2 * (high - pp)

    // Find resistance levels above current price
    const resistance = [r1, r2, r3, yesterday.high].filter(l => l > currentPrice).sort((a, b) => a - b)

    // Find support levels below current price
    const support = [s1, s2, s3, yesterday.low].filter(l => l < currentPrice).sort((a, b) => b - a)

    return {
      resistance,
      support,
      pivots: { r1, r2, r3, pp, s1, s2, s3 },
    }
  }

  private determineAction(score: number): FuturesSignalAction {
    if (score >= CONFIDENCE_THRESHOLDS.STRONG_BUY) return 'STRONG_BUY'
    if (score >= CONFIDENCE_THRESHOLDS.BUY) return 'BUY'
    if (score >= CONFIDENCE_THRESHOLDS.HOLD_LOWER && score <= CONFIDENCE_THRESHOLDS.HOLD_UPPER) return 'HOLD'
    if (score <= CONFIDENCE_THRESHOLDS.STRONG_SELL) return 'STRONG_SELL'
    if (score <= CONFIDENCE_THRESHOLDS.SELL) return 'SELL'
    return 'HOLD'
  }

  private determineBias(score: number): MarketBias {
    if (score >= 70) return 'bullish'
    if (score <= 30) return 'bearish'
    if (score >= 45 && score <= 55) return 'choppy'
    return 'neutral'
  }

  private calculateTradeLevels(
    symbol: FuturesSymbol,
    context: MarketContext,
    action: FuturesSignalAction,
    keyLevels: FuturesSignal['keyLevels'],
    atr: number
  ): { entryPrice: number; stopLoss: number; targets: number[]; riskPerContract: number } {
    const spec = FUTURES_SPECS[symbol]
    const tickSize = spec.tickSize
    const pointValue = spec.pointValue

    const entryPrice = context.currentPrice

    let stopLoss: number
    let targets: number[]

    if (action.includes('BUY')) {
      // Long trade
      stopLoss = Math.max(
        entryPrice - atr * 1.5,
        keyLevels.support[0] ? keyLevels.support[0] - tickSize * 2 : entryPrice - atr * 2
      )
      stopLoss = Math.round(stopLoss / tickSize) * tickSize

      const risk = entryPrice - stopLoss
      targets = [
        Math.round((entryPrice + risk * 1.5) / tickSize) * tickSize,  // 1.5:1 R:R
        Math.round((entryPrice + risk * 2.5) / tickSize) * tickSize,  // 2.5:1 R:R
        Math.round((entryPrice + risk * 4) / tickSize) * tickSize,    // 4:1 R:R
      ]
    } else {
      // Short trade
      stopLoss = Math.min(
        entryPrice + atr * 1.5,
        keyLevels.resistance[0] ? keyLevels.resistance[0] + tickSize * 2 : entryPrice + atr * 2
      )
      stopLoss = Math.round(stopLoss / tickSize) * tickSize

      const risk = stopLoss - entryPrice
      targets = [
        Math.round((entryPrice - risk * 1.5) / tickSize) * tickSize,
        Math.round((entryPrice - risk * 2.5) / tickSize) * tickSize,
        Math.round((entryPrice - risk * 4) / tickSize) * tickSize,
      ]
    }

    const riskPerContract = Math.abs(entryPrice - stopLoss) * pointValue

    return { entryPrice, stopLoss, targets, riskPerContract }
  }

  private countConfluences(...analyses: { score: number; reasons: string[] }[]): number {
    let count = 0
    for (const analysis of analyses) {
      if (analysis.score >= 60 || analysis.score <= 40) {
        count++
      }
    }
    return count
  }

  private calculatePositionSize(
    symbol: FuturesSymbol,
    riskPerContract: number,
    confidence: number,
    confluenceCount: number
  ): number {
    // Base position: 1 contract
    let contracts = 1

    // Scale up with confidence
    if (confidence >= 80 && confluenceCount >= 4) {
      contracts = 2
    }
    if (confidence >= 90 && confluenceCount >= 5) {
      contracts = 3
    }

    // Use micro contracts for lower risk
    if (symbol === 'MES' || symbol === 'MNQ') {
      contracts *= 2  // Can trade more micros
    }

    return contracts
  }

  private async getHistoricalData(
    symbol: FuturesSymbol,
    timeframe: ChartTimeframe,
    bars: number
  ): Promise<OHLCV[]> {
    const cacheKey = `${symbol}_${timeframe}`
    const cached = this.priceCache.get(cacheKey)

    // Return cached data if available
    if (cached && cached.length >= bars) {
      return cached.slice(-bars)
    }

    // Generate simulated data for now (will be replaced with real Rithmic data)
    // This is needed because Rithmic requires a dev kit and protocol buffer implementation
    const basePrices: Record<string, number> = {
      ES: 5980, NQ: 21200, MES: 5980, MNQ: 21200,
      RTY: 2050, CL: 72.50, GC: 2650, SI: 30.50,
      ZB: 118, ZN: 110, ZC: 450, HG: 4.20
    }

    const basePrice = basePrices[symbol] || 5000
    const data: OHLCV[] = []
    const now = Date.now()
    const interval = this.getTimeframeMs(timeframe)

    for (let i = bars - 1; i >= 0; i--) {
      const timestamp = now - i * interval
      const noise = (Math.random() - 0.5) * basePrice * 0.002
      const open = basePrice + noise
      const close = open + (Math.random() - 0.5) * basePrice * 0.001
      data.push({
        timestamp,
        open,
        high: Math.max(open, close) + Math.random() * basePrice * 0.0005,
        low: Math.min(open, close) - Math.random() * basePrice * 0.0005,
        close,
        volume: Math.floor(1000 + Math.random() * 5000)
      })
    }

    this.priceCache.set(cacheKey, data)
    return data
  }

  private getTimeframeMs(tf: ChartTimeframe): number {
    const map: Record<ChartTimeframe, number> = {
      '1Min': 60 * 1000,
      '2Min': 2 * 60 * 1000,
      '3Min': 3 * 60 * 1000,
      '5Min': 5 * 60 * 1000,
      '10Min': 10 * 60 * 1000,
      '15Min': 15 * 60 * 1000,
      '30Min': 30 * 60 * 1000,
      '1Hour': 60 * 60 * 1000,
      '2Hour': 2 * 60 * 60 * 1000,
      '4Hour': 4 * 60 * 60 * 1000,
      'Daily': 24 * 60 * 60 * 1000,
      'Weekly': 7 * 24 * 60 * 60 * 1000,
      'Monthly': 30 * 24 * 60 * 60 * 1000,
    }
    return map[tf] || 60 * 1000
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createFuturesSignalGenerator(client: TradovateClient): FuturesSignalGenerator {
  return new FuturesSignalGenerator(client)
}
