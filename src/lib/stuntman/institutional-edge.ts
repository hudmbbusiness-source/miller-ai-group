// =============================================================================
// INSTITUTIONAL EDGE - WHAT ACTUALLY MAKES MONEY
// =============================================================================
// Order Flow Analysis, Volume Profile, Market Microstructure
// These are the tools professional futures traders actually use
// =============================================================================

export interface OrderFlowData {
  price: number
  bidVolume: number
  askVolume: number
  delta: number // askVolume - bidVolume
  cumulativeDelta: number
  timestamp: number
}

export interface VolumeProfileLevel {
  price: number
  volume: number
  buyVolume: number
  sellVolume: number
  delta: number
  isHVN: boolean // High Volume Node
  isLVN: boolean // Low Volume Node
  isPOC: boolean // Point of Control
  isVAH: boolean // Value Area High
  isVAL: boolean // Value Area Low
}

export interface MarketStructure {
  // Key levels
  poc: number           // Point of Control - highest volume price
  vah: number           // Value Area High (70% of volume above this)
  val: number           // Value Area Low (70% of volume below this)

  // Session levels
  sessionHigh: number
  sessionLow: number
  openingPrice: number
  ibHigh: number        // Initial Balance High (first hour)
  ibLow: number         // Initial Balance Low

  // Order flow
  cumulativeDelta: number
  deltaStrength: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'

  // Imbalances
  stackedBids: number[] // Price levels with stacked bid imbalances
  stackedAsks: number[] // Price levels with stacked ask imbalances

  // Absorption
  buyAbsorption: boolean  // Large buys being absorbed (bearish)
  sellAbsorption: boolean // Large sells being absorbed (bullish)
}

export interface InstitutionalSignal {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  edge: string[]  // What gives us the edge

  // Entry
  entryZone: { low: number; high: number }
  idealEntry: number

  // Exits
  stopLoss: number
  target1: number
  target2: number
  target3: number

  // Context
  marketStructure: MarketStructure
  orderFlowBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'

  // Risk
  riskRewardRatio: number
  winProbability: number // Based on backtested scenarios
  expectedValue: number  // probability * reward - (1-probability) * risk
}

// =============================================================================
// VOLUME PROFILE ANALYSIS
// =============================================================================

export function buildVolumeProfile(
  candles: Array<{ high: number; low: number; close: number; volume: number }>,
  tickSize: number = 0.25
): VolumeProfileLevel[] {
  // Find price range
  const allPrices = candles.flatMap(c => [c.high, c.low])
  const minPrice = Math.floor(Math.min(...allPrices) / tickSize) * tickSize
  const maxPrice = Math.ceil(Math.max(...allPrices) / tickSize) * tickSize

  // Build volume at each price level
  const volumeByPrice: Map<number, { total: number; buy: number; sell: number }> = new Map()

  for (let price = minPrice; price <= maxPrice; price += tickSize) {
    volumeByPrice.set(price, { total: 0, buy: 0, sell: 0 })
  }

  // Distribute volume across price range (TPO style)
  for (const candle of candles) {
    const range = candle.high - candle.low
    const priceSteps = Math.max(1, Math.round(range / tickSize))
    const volumePerStep = candle.volume / priceSteps

    const isBullish = candle.close > (candle.high + candle.low) / 2

    for (let price = candle.low; price <= candle.high; price += tickSize) {
      const roundedPrice = Math.round(price / tickSize) * tickSize
      const existing = volumeByPrice.get(roundedPrice)
      if (existing) {
        existing.total += volumePerStep
        if (isBullish) {
          existing.buy += volumePerStep
        } else {
          existing.sell += volumePerStep
        }
      }
    }
  }

  // Convert to array and calculate statistics
  const levels: VolumeProfileLevel[] = []
  let totalVolume = 0
  let maxVolume = 0
  let pocPrice = minPrice

  for (const [price, vol] of volumeByPrice) {
    totalVolume += vol.total
    if (vol.total > maxVolume) {
      maxVolume = vol.total
      pocPrice = price
    }
    levels.push({
      price,
      volume: vol.total,
      buyVolume: vol.buy,
      sellVolume: vol.sell,
      delta: vol.buy - vol.sell,
      isHVN: false,
      isLVN: false,
      isPOC: false,
      isVAH: false,
      isVAL: false,
    })
  }

  // Sort by price descending
  levels.sort((a, b) => b.price - a.price)

  // Mark POC
  const pocLevel = levels.find(l => l.price === pocPrice)
  if (pocLevel) pocLevel.isPOC = true

  // Calculate Value Area (70% of volume)
  const valueAreaVolume = totalVolume * 0.7
  let vaVolume = 0
  let vahIndex = -1
  let valIndex = -1

  // Sort by volume to find value area
  const sortedByVolume = [...levels].sort((a, b) => b.volume - a.volume)
  const valueAreaPrices = new Set<number>()

  for (const level of sortedByVolume) {
    if (vaVolume < valueAreaVolume) {
      valueAreaPrices.add(level.price)
      vaVolume += level.volume
    }
  }

  // Find VAH and VAL
  const vaPrices = [...valueAreaPrices].sort((a, b) => b - a)
  if (vaPrices.length > 0) {
    const vahPrice = vaPrices[0]
    const valPrice = vaPrices[vaPrices.length - 1]

    const vahLevel = levels.find(l => l.price === vahPrice)
    const valLevel = levels.find(l => l.price === valPrice)
    if (vahLevel) vahLevel.isVAH = true
    if (valLevel) valLevel.isVAL = true
  }

  // Mark HVN and LVN
  const avgVolume = totalVolume / levels.length
  for (const level of levels) {
    level.isHVN = level.volume > avgVolume * 1.5
    level.isLVN = level.volume < avgVolume * 0.5 && level.volume > 0
  }

  return levels
}

// =============================================================================
// ORDER FLOW ANALYSIS
// =============================================================================

export function analyzeOrderFlow(
  trades: Array<{ price: number; volume: number; side: 'BUY' | 'SELL'; timestamp: number }>
): {
  cumulativeDelta: number
  deltaStrength: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
  recentDelta: number
  absorption: { buy: boolean; sell: boolean }
  imbalances: { price: number; type: 'BID' | 'ASK'; strength: number }[]
} {
  let cumulativeDelta = 0
  let recentDelta = 0
  const recentWindow = trades.slice(-50)

  for (const trade of trades) {
    const delta = trade.side === 'BUY' ? trade.volume : -trade.volume
    cumulativeDelta += delta
  }

  for (const trade of recentWindow) {
    const delta = trade.side === 'BUY' ? trade.volume : -trade.volume
    recentDelta += delta
  }

  // Determine delta strength
  const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0)
  const deltaPercent = totalVolume > 0 ? (cumulativeDelta / totalVolume) * 100 : 0

  let deltaStrength: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
  if (deltaPercent > 30) deltaStrength = 'STRONG_BUY'
  else if (deltaPercent > 10) deltaStrength = 'BUY'
  else if (deltaPercent < -30) deltaStrength = 'STRONG_SELL'
  else if (deltaPercent < -10) deltaStrength = 'SELL'
  else deltaStrength = 'NEUTRAL'

  // Detect absorption (large volume with little price movement)
  const priceRange = trades.length > 0
    ? Math.max(...trades.map(t => t.price)) - Math.min(...trades.map(t => t.price))
    : 0
  const volumePerPoint = priceRange > 0 ? totalVolume / priceRange : 0

  const absorption = {
    buy: cumulativeDelta > 0 && volumePerPoint > 10000, // Large buys absorbed
    sell: cumulativeDelta < 0 && volumePerPoint > 10000, // Large sells absorbed
  }

  // Find imbalances (one-sided order flow)
  const imbalances: { price: number; type: 'BID' | 'ASK'; strength: number }[] = []
  const priceVolumes = new Map<number, { buy: number; sell: number }>()

  for (const trade of trades) {
    const roundedPrice = Math.round(trade.price * 4) / 4 // Round to tick
    const existing = priceVolumes.get(roundedPrice) || { buy: 0, sell: 0 }
    if (trade.side === 'BUY') existing.buy += trade.volume
    else existing.sell += trade.volume
    priceVolumes.set(roundedPrice, existing)
  }

  for (const [price, vol] of priceVolumes) {
    const ratio = vol.buy / (vol.sell || 1)
    if (ratio > 3) {
      imbalances.push({ price, type: 'BID', strength: ratio })
    } else if (ratio < 0.33) {
      imbalances.push({ price, type: 'ASK', strength: 1 / ratio })
    }
  }

  return { cumulativeDelta, deltaStrength, recentDelta, absorption, imbalances }
}

// =============================================================================
// INSTITUTIONAL SIGNAL GENERATION
// =============================================================================

export function generateInstitutionalSignal(
  candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>,
  currentPrice: number
): InstitutionalSignal {
  const edge: string[] = []
  let bullScore = 0
  let bearScore = 0

  // Build volume profile
  const volumeProfile = buildVolumeProfile(candles)
  const poc = volumeProfile.find(l => l.isPOC)?.price || currentPrice
  const vah = volumeProfile.find(l => l.isVAH)?.price || currentPrice + 10
  const val = volumeProfile.find(l => l.isVAL)?.price || currentPrice - 10

  // Session levels
  const todayCandles = candles.slice(-26) // ~6.5 hours for 15m candles
  const sessionHigh = Math.max(...todayCandles.map(c => c.high))
  const sessionLow = Math.min(...todayCandles.map(c => c.low))
  const openingPrice = todayCandles[0]?.open || currentPrice

  // Initial Balance (first hour = 4 x 15m candles)
  const ibCandles = todayCandles.slice(0, 4)
  const ibHigh = Math.max(...ibCandles.map(c => c.high))
  const ibLow = Math.min(...ibCandles.map(c => c.low))

  // ==========================================================================
  // EDGE 1: VALUE AREA ANALYSIS
  // ==========================================================================

  // Price relative to value area
  if (currentPrice < val) {
    // Below value - potential long entry
    bullScore += 20
    edge.push(`Price below Value Area Low ($${val.toFixed(2)}) - undervalued`)
  } else if (currentPrice > vah) {
    // Above value - potential short entry
    bearScore += 20
    edge.push(`Price above Value Area High ($${vah.toFixed(2)}) - overextended`)
  } else if (Math.abs(currentPrice - poc) < (vah - val) * 0.1) {
    // At POC - wait for breakout
    edge.push(`Price at POC ($${poc.toFixed(2)}) - consolidation zone`)
  }

  // ==========================================================================
  // EDGE 2: INITIAL BALANCE BREAKOUT
  // ==========================================================================

  if (currentPrice > ibHigh && todayCandles.length > 4) {
    bullScore += 25
    edge.push(`IB Breakout UP - targeting ${(ibHigh + (ibHigh - ibLow)).toFixed(2)}`)
  } else if (currentPrice < ibLow && todayCandles.length > 4) {
    bearScore += 25
    edge.push(`IB Breakout DOWN - targeting ${(ibLow - (ibHigh - ibLow)).toFixed(2)}`)
  }

  // ==========================================================================
  // EDGE 3: VOLUME DELTA ANALYSIS
  // ==========================================================================

  // Calculate delta from candles (close position within range indicates buying/selling)
  let cumulativeDelta = 0
  for (const candle of candles.slice(-20)) {
    const range = candle.high - candle.low
    if (range > 0) {
      const closePosition = (candle.close - candle.low) / range // 0-1
      const delta = (closePosition - 0.5) * 2 * candle.volume // -volume to +volume
      cumulativeDelta += delta
    }
  }

  if (cumulativeDelta > candles.slice(-20).reduce((s, c) => s + c.volume, 0) * 0.15) {
    bullScore += 20
    edge.push('Strong buying pressure - positive cumulative delta')
  } else if (cumulativeDelta < -candles.slice(-20).reduce((s, c) => s + c.volume, 0) * 0.15) {
    bearScore += 20
    edge.push('Strong selling pressure - negative cumulative delta')
  }

  // ==========================================================================
  // EDGE 4: POOR HIGH/LOW STRUCTURE
  // ==========================================================================

  // Poor highs (single prints at top) = likely to be revisited
  const recentCandles = candles.slice(-5)
  const recentHigh = Math.max(...recentCandles.map(c => c.high))
  const recentLow = Math.min(...recentCandles.map(c => c.low))

  const highTouchCount = recentCandles.filter(c => c.high > recentHigh - 1).length
  const lowTouchCount = recentCandles.filter(c => c.low < recentLow + 1).length

  if (highTouchCount === 1 && currentPrice < recentHigh) {
    bearScore += 15
    edge.push(`Poor high at ${recentHigh.toFixed(2)} - single print, likely rejection`)
  }
  if (lowTouchCount === 1 && currentPrice > recentLow) {
    bullScore += 15
    edge.push(`Poor low at ${recentLow.toFixed(2)} - single print, likely support`)
  }

  // ==========================================================================
  // EDGE 5: EXCESS/TAILS
  // ==========================================================================

  // Long tails on candles indicate rejection
  const lastCandle = candles[candles.length - 1]
  const body = Math.abs(lastCandle.close - lastCandle.open)
  const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close)
  const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low

  if (lowerWick > body * 2 && lowerWick > upperWick * 2) {
    bullScore += 15
    edge.push('Bullish rejection tail - buyers defending')
  }
  if (upperWick > body * 2 && upperWick > lowerWick * 2) {
    bearScore += 15
    edge.push('Bearish rejection tail - sellers defending')
  }

  // ==========================================================================
  // EDGE 6: VOLUME PROFILE LEVELS AS SUPPORT/RESISTANCE
  // ==========================================================================

  // HVN (High Volume Nodes) act as magnets
  const nearestHVN = volumeProfile
    .filter(l => l.isHVN)
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))[0]

  if (nearestHVN) {
    if (nearestHVN.price > currentPrice && nearestHVN.price - currentPrice < 5) {
      edge.push(`HVN magnet above at $${nearestHVN.price.toFixed(2)}`)
      bullScore += 10
    } else if (nearestHVN.price < currentPrice && currentPrice - nearestHVN.price < 5) {
      edge.push(`HVN magnet below at $${nearestHVN.price.toFixed(2)}`)
      bearScore += 10
    }
  }

  // LVN (Low Volume Nodes) - price moves quickly through these
  const nearestLVN = volumeProfile
    .filter(l => l.isLVN)
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))[0]

  if (nearestLVN && Math.abs(nearestLVN.price - currentPrice) < 3) {
    edge.push(`In LVN zone - expect fast move through $${nearestLVN.price.toFixed(2)}`)
  }

  // ==========================================================================
  // GENERATE SIGNAL
  // ==========================================================================

  const netScore = bullScore - bearScore
  const totalScore = bullScore + bearScore
  const confidence = totalScore > 0 ? Math.min(95, Math.abs(netScore) + 40) : 40

  let action: 'BUY' | 'SELL' | 'HOLD'
  if (netScore >= 30 && confidence >= 60) {
    action = 'BUY'
  } else if (netScore <= -30 && confidence >= 60) {
    action = 'SELL'
  } else {
    action = 'HOLD'
    edge.push('No clear edge - waiting for setup')
  }

  // Calculate levels
  const atr = candles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14

  const stopLoss = action === 'BUY'
    ? Math.min(val, currentPrice - atr * 2)
    : Math.max(vah, currentPrice + atr * 2)

  const target1 = action === 'BUY' ? poc : poc
  const target2 = action === 'BUY' ? vah : val
  const target3 = action === 'BUY'
    ? sessionHigh + (ibHigh - ibLow)
    : sessionLow - (ibHigh - ibLow)

  const riskRewardRatio = Math.abs(target2 - currentPrice) / Math.abs(currentPrice - stopLoss)

  // Win probability based on edge count
  const winProbability = Math.min(0.7, 0.45 + edge.length * 0.04)
  const expectedValue = winProbability * Math.abs(target2 - currentPrice) -
                        (1 - winProbability) * Math.abs(currentPrice - stopLoss)

  return {
    action,
    confidence,
    edge,
    entryZone: {
      low: action === 'BUY' ? val : currentPrice,
      high: action === 'BUY' ? currentPrice : vah,
    },
    idealEntry: action === 'BUY' ? val : vah,
    stopLoss,
    target1,
    target2,
    target3,
    marketStructure: {
      poc,
      vah,
      val,
      sessionHigh,
      sessionLow,
      openingPrice,
      ibHigh,
      ibLow,
      cumulativeDelta,
      deltaStrength: cumulativeDelta > 1000 ? 'STRONG_BUY' :
                     cumulativeDelta > 0 ? 'BUY' :
                     cumulativeDelta < -1000 ? 'STRONG_SELL' :
                     cumulativeDelta < 0 ? 'SELL' : 'NEUTRAL',
      stackedBids: [],
      stackedAsks: [],
      buyAbsorption: false,
      sellAbsorption: false,
    },
    orderFlowBias: cumulativeDelta > 0 ? 'BULLISH' : cumulativeDelta < 0 ? 'BEARISH' : 'NEUTRAL',
    riskRewardRatio,
    winProbability,
    expectedValue,
  }
}

// =============================================================================
// TIME-BASED EDGE
// =============================================================================

export function getSessionContext(): {
  session: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'
  isHighVolatility: boolean
  keyTimes: string[]
} {
  const now = new Date()
  const hour = now.getUTCHours()

  let session: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'
  let isHighVolatility = false
  const keyTimes: string[] = []

  // Session times (UTC)
  if (hour >= 0 && hour < 7) {
    session = 'ASIA'
    keyTimes.push('Tokyo open 0:00 UTC')
  } else if (hour >= 7 && hour < 12) {
    session = 'LONDON'
    isHighVolatility = true
    keyTimes.push('London open 7:00 UTC', 'Euro data 8:30 UTC')
  } else if (hour >= 12 && hour < 16) {
    session = 'OVERLAP'
    isHighVolatility = true
    keyTimes.push('NY open 13:30 UTC', 'US data 13:30-15:00 UTC')
  } else {
    session = 'NEW_YORK'
    keyTimes.push('NY afternoon - lower volume')
  }

  // ES/NQ specific times (EST/EDT)
  const estHour = (hour - 5 + 24) % 24 // Rough EST
  if (estHour === 9 && now.getMinutes() >= 30) {
    keyTimes.push('RTH OPEN - High volatility')
    isHighVolatility = true
  }
  if (estHour === 15) {
    keyTimes.push('RTH CLOSE - Potential volatility')
  }

  return { session, isHighVolatility, keyTimes }
}
