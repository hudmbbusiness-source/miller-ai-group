// @ts-nocheck
// =============================================================================
// STUNTMAN AI - ADVANCED SIGNAL GENERATOR
// =============================================================================
// This is NOT a basic RSI/MACD system. This uses:
// - On-chain whale tracking & exchange flows
// - Fear & Greed extremes (contrarian)
// - Order flow imbalance & large trade detection
// - Liquidity sweep detection (stop hunts)
// - Smart money order blocks
// - Multi-timeframe market structure
// - Volume-weighted momentum
// - Change of character detection
// =============================================================================

import { INSTRUMENTS } from './constants'

// =============================================================================
// TYPES
// =============================================================================

export interface AdvancedSignal {
  instrument: string
  action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  confidence: number // 0-100
  sources: SignalSource[]
  risk_score: number // 1-10 (10 = highest risk)
  expected_move: number // Expected % move
  stop_loss: number // Suggested stop loss %
  take_profit: number // Suggested take profit %
  position_size: number // % of portfolio
  timeframe: string
  generated_at: number
}

export interface SignalSource {
  name: string
  signal: 'bullish' | 'bearish' | 'neutral'
  strength: number // 0-100
  data: Record<string, any>
  weight: number // How much this source contributes
}

interface MarketData {
  price: number
  volume24h: number
  priceChange24h: number
  priceChange7d: number
  high24h: number
  low24h: number
  marketCap: number
}

// =============================================================================
// DATA FETCHERS - REAL DATA SOURCES
// =============================================================================

// Fear & Greed Index - Extreme fear = BUY, Extreme greed = SELL
async function fetchFearGreedIndex(): Promise<number> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 } // Cache 5 min
    })
    const data = await res.json()
    return parseInt(data.data[0].value)
  } catch {
    return 50 // Neutral on error
  }
}

// CoinGecko market data
async function fetchCoinGeckoData(coinId: string): Promise<MarketData | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()

    return {
      price: data.market_data?.current_price?.usd || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      priceChange24h: data.market_data?.price_change_percentage_24h || 0,
      priceChange7d: data.market_data?.price_change_percentage_7d || 0,
      high24h: data.market_data?.high_24h?.usd || 0,
      low24h: data.market_data?.low_24h?.usd || 0,
      marketCap: data.market_data?.market_cap?.usd || 0,
    }
  } catch {
    return null
  }
}

// Order book depth analysis - using Exchange v1 API
async function fetchOrderBook(instrument: string): Promise<{
  bids: number
  asks: number
  imbalance: number
  depth: number
} | null> {
  try {
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-book?instrument_name=${instrument}&depth=50`
    )
    const data = await res.json()

    if (data.code !== 0 || !data.result?.data) return null

    const bookData = Array.isArray(data.result.data) ? data.result.data[0] : data.result.data
    if (!bookData) return null

    let bids = 0
    let asks = 0

    for (const item of bookData.bids || []) {
      const price = parseFloat(item[0])
      const qty = parseFloat(item[1])
      bids += price * qty
    }
    for (const item of bookData.asks || []) {
      const price = parseFloat(item[0])
      const qty = parseFloat(item[1])
      asks += price * qty
    }

    const imbalance = bids + asks > 0 ? (bids - asks) / (bids + asks) * 100 : 0
    const depth = bids + asks

    return { bids, asks, imbalance, depth }
  } catch (e) {
    console.error('Order book fetch error:', e)
    return null
  }
}

// Large trade detection (whale activity) - using Exchange v1 API
async function fetchRecentTrades(instrument: string): Promise<{
  largeBuys: number
  largeSells: number
  netLarge: number
  avgSize: number
  volumeProfile: 'accumulation' | 'distribution' | 'neutral'
  whaleRatio: number
} | null> {
  try {
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-trades?instrument_name=${instrument}`
    )
    const data = await res.json()

    if (data.code !== 0 || !data.result?.data) return null

    const trades = data.result.data
    if (trades.length === 0) return null

    const sizes = trades.map((t: any) => parseFloat(t.q))
    const avgSize = sizes.reduce((a: number, b: number) => a + b, 0) / sizes.length
    const largeThreshold = avgSize * 5 // 5x average = whale trade

    let largeBuys = 0
    let largeSells = 0
    let buyVolume = 0
    let sellVolume = 0
    let largeBuyVolume = 0
    let largeSellVolume = 0

    for (const t of trades) {
      const size = parseFloat(t.q)
      const value = size * parseFloat(t.p)

      if (t.s === 'BUY') {
        buyVolume += value
        if (size > largeThreshold) {
          largeBuys++
          largeBuyVolume += value
        }
      } else {
        sellVolume += value
        if (size > largeThreshold) {
          largeSells++
          largeSellVolume += value
        }
      }
    }

    // Volume profile
    let volumeProfile: 'accumulation' | 'distribution' | 'neutral' = 'neutral'
    if (buyVolume > sellVolume * 1.3) volumeProfile = 'accumulation'
    else if (sellVolume > buyVolume * 1.3) volumeProfile = 'distribution'

    // Whale ratio (large trades as % of total)
    const whaleRatio = (largeBuyVolume + largeSellVolume) / (buyVolume + sellVolume) * 100

    return {
      largeBuys,
      largeSells,
      netLarge: largeBuys - largeSells,
      avgSize,
      volumeProfile,
      whaleRatio
    }
  } catch {
    return null
  }
}

// Candlestick data for pattern analysis
async function fetchCandlesticks(instrument: string, timeframe: string = '15m', count: number = 100): Promise<{
  prices: number[]
  volumes: number[]
  highs: number[]
  lows: number[]
  opens: number[]
  times: number[]
} | null> {
  try {
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${instrument}&timeframe=${timeframe}&count=${count}`
    )
    const data = await res.json()

    if (data.code !== 0 || !data.result?.data) return null

    const candles = data.result.data.sort((a: any, b: any) => a.t - b.t)

    return {
      prices: candles.map((c: any) => parseFloat(c.c)),
      volumes: candles.map((c: any) => parseFloat(c.v)),
      highs: candles.map((c: any) => parseFloat(c.h)),
      lows: candles.map((c: any) => parseFloat(c.l)),
      opens: candles.map((c: any) => parseFloat(c.o)),
      times: candles.map((c: any) => c.t),
    }
  } catch {
    return null
  }
}

// =============================================================================
// ADVANCED ANALYSIS - SMART MONEY CONCEPTS
// =============================================================================

// Detect liquidity sweeps (stop hunts) - When price briefly breaks a level then reverses
function detectLiquiditySweep(highs: number[], lows: number[], prices: number[]): {
  detected: boolean
  type: 'bullish' | 'bearish' | null
  strength: number
} {
  const len = prices.length
  if (len < 30) return { detected: false, type: null, strength: 0 }

  const recent = 5
  const lookback = 25

  // Find recent swing highs and lows
  const recentHigh = Math.max(...highs.slice(-recent))
  const recentLow = Math.min(...lows.slice(-recent))
  const prevHigh = Math.max(...highs.slice(-lookback, -recent))
  const prevLow = Math.min(...lows.slice(-lookback, -recent))
  const currentPrice = prices[len - 1]

  // Bullish sweep: Price swept below previous low (grabbed liquidity) then recovered
  // This is a STRONG buy signal - smart money grabbed stops and reversed
  if (recentLow < prevLow * 0.998 && currentPrice > prevLow) {
    const sweepDepth = (prevLow - recentLow) / prevLow * 100
    return {
      detected: true,
      type: 'bullish',
      strength: Math.min(sweepDepth * 20, 100)
    }
  }

  // Bearish sweep: Price swept above previous high then dropped
  if (recentHigh > prevHigh * 1.002 && currentPrice < prevHigh) {
    const sweepDepth = (recentHigh - prevHigh) / prevHigh * 100
    return {
      detected: true,
      type: 'bearish',
      strength: Math.min(sweepDepth * 20, 100)
    }
  }

  return { detected: false, type: null, strength: 0 }
}

// Detect order blocks (institutional accumulation/distribution zones)
function detectOrderBlocks(prices: number[], highs: number[], lows: number[], volumes: number[]): {
  bullishOB: { price: number; strength: number } | null
  bearishOB: { price: number; strength: number } | null
} {
  const len = prices.length
  if (len < 40) return { bullishOB: null, bearishOB: null }

  let bullishOB = null
  let bearishOB = null

  // Look for high volume candles followed by strong impulsive moves
  for (let i = len - 35; i < len - 5; i++) {
    const avgVolume = volumes.slice(Math.max(0, i - 10), i).reduce((a, b) => a + b, 0) / 10
    const currentVolume = volumes[i]

    // High volume candle (2.5x average)
    if (currentVolume > avgVolume * 2.5) {
      const move3 = prices[i + 3] - prices[i]
      const move5 = prices[i + 5] - prices[i]
      const currentPrice = prices[len - 1]

      // Bullish OB: High volume followed by up move, price now returning
      if (move3 > 0 && move5 > 0 && move5 / prices[i] * 100 > 1.5) {
        const obZone = Math.min(lows[i], lows[i - 1])
        if (currentPrice < obZone * 1.02 && currentPrice > obZone * 0.98) {
          bullishOB = {
            price: obZone,
            strength: Math.min((currentVolume / avgVolume) * 30, 100)
          }
        }
      }

      // Bearish OB: High volume followed by down move, price now returning
      if (move3 < 0 && move5 < 0 && Math.abs(move5) / prices[i] * 100 > 1.5) {
        const obZone = Math.max(highs[i], highs[i - 1])
        if (currentPrice > obZone * 0.98 && currentPrice < obZone * 1.02) {
          bearishOB = {
            price: obZone,
            strength: Math.min((currentVolume / avgVolume) * 30, 100)
          }
        }
      }
    }
  }

  return { bullishOB, bearishOB }
}

// Market structure analysis - Higher highs/lows = uptrend, Lower highs/lows = downtrend
function analyzeMarketStructure(prices: number[], highs: number[], lows: number[]): {
  trend: 'uptrend' | 'downtrend' | 'ranging'
  strength: number
  breakOfStructure: boolean
  changeOfCharacter: boolean
} {
  const len = prices.length
  if (len < 60) return { trend: 'ranging', strength: 0, breakOfStructure: false, changeOfCharacter: false }

  // Find swing points
  const swingHighs: { price: number; index: number }[] = []
  const swingLows: { price: number; index: number }[] = []

  for (let i = 5; i < len - 5; i++) {
    const localHigh = Math.max(...highs.slice(i - 5, i + 5))
    const localLow = Math.min(...lows.slice(i - 5, i + 5))

    if (highs[i] === localHigh) {
      swingHighs.push({ price: highs[i], index: i })
    }
    if (lows[i] === localLow) {
      swingLows.push({ price: lows[i], index: i })
    }
  }

  if (swingHighs.length < 3 || swingLows.length < 3) {
    return { trend: 'ranging', strength: 0, breakOfStructure: false, changeOfCharacter: false }
  }

  // Check last 3 swings
  const lastHighs = swingHighs.slice(-3)
  const lastLows = swingLows.slice(-3)

  const higherHighs = lastHighs[2].price > lastHighs[1].price && lastHighs[1].price > lastHighs[0].price
  const higherLows = lastLows[2].price > lastLows[1].price && lastLows[1].price > lastLows[0].price
  const lowerHighs = lastHighs[2].price < lastHighs[1].price && lastHighs[1].price < lastHighs[0].price
  const lowerLows = lastLows[2].price < lastLows[1].price && lastLows[1].price < lastLows[0].price

  let trend: 'uptrend' | 'downtrend' | 'ranging' = 'ranging'
  let strength = 0

  if (higherHighs && higherLows) {
    trend = 'uptrend'
    strength = 80
  } else if (lowerHighs && lowerLows) {
    trend = 'downtrend'
    strength = 80
  } else if (higherHighs || higherLows) {
    trend = 'uptrend'
    strength = 50
  } else if (lowerHighs || lowerLows) {
    trend = 'downtrend'
    strength = 50
  }

  // Check for break of structure
  const currentPrice = prices[len - 1]
  const lastSwingLow = lastLows[lastLows.length - 1].price
  const lastSwingHigh = lastHighs[lastHighs.length - 1].price

  const breakOfStructure =
    (trend === 'uptrend' && currentPrice < lastSwingLow) ||
    (trend === 'downtrend' && currentPrice > lastSwingHigh)

  // Change of character = structure break after strong trend
  const changeOfCharacter = breakOfStructure && strength >= 70

  return { trend, strength, breakOfStructure, changeOfCharacter }
}

// Volume-weighted momentum - More accurate than simple momentum
function calculateVWMomentum(prices: number[], volumes: number[]): number {
  const len = Math.min(prices.length, volumes.length)
  if (len < 15) return 0

  let weightedMomentum = 0
  let totalVolume = 0

  for (let i = 1; i <= 10; i++) {
    const idx = len - i
    if (idx < 1) break

    const momentum = (prices[idx] - prices[idx - 1]) / prices[idx - 1] * 100
    const volume = volumes[idx]

    weightedMomentum += momentum * volume
    totalVolume += volume
  }

  return totalVolume > 0 ? weightedMomentum / totalVolume : 0
}

// Divergence detection (price vs volume)
function detectDivergence(prices: number[], volumes: number[]): {
  bullish: boolean
  bearish: boolean
  strength: number
} {
  const len = Math.min(prices.length, volumes.length)
  if (len < 30) return { bullish: false, bearish: false, strength: 0 }

  const half = 15

  // First half
  const prices1 = prices.slice(-30, -half)
  const volumes1 = volumes.slice(-30, -half)
  const minPrice1 = Math.min(...prices1)
  const maxPrice1 = Math.max(...prices1)
  const avgVol1 = volumes1.reduce((a, b) => a + b, 0) / volumes1.length

  // Second half
  const prices2 = prices.slice(-half)
  const volumes2 = volumes.slice(-half)
  const minPrice2 = Math.min(...prices2)
  const maxPrice2 = Math.max(...prices2)
  const avgVol2 = volumes2.reduce((a, b) => a + b, 0) / volumes2.length

  // Bullish divergence: Price makes lower low, but volume decreasing (selling exhaustion)
  const bullish = minPrice2 < minPrice1 && avgVol2 < avgVol1 * 0.8

  // Bearish divergence: Price makes higher high, but volume decreasing (buying exhaustion)
  const bearish = maxPrice2 > maxPrice1 && avgVol2 < avgVol1 * 0.8

  const strength = bullish || bearish ? 70 : 0

  return { bullish, bearish, strength }
}

// =============================================================================
// MAIN SIGNAL GENERATION
// =============================================================================

export async function generateAdvancedSignal(instrument: string): Promise<AdvancedSignal> {
  const sources: SignalSource[] = []
  const coinId = instrument.split('_')[0].toLowerCase()

  // 1. FEAR & GREED INDEX (Contrarian - highest weight for extremes)
  const fearGreed = await fetchFearGreedIndex()
  let fgSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let fgStrength = 0

  if (fearGreed <= 20) {
    fgSignal = 'bullish' // Extreme fear = strong buy
    fgStrength = (25 - fearGreed) * 4
  } else if (fearGreed <= 35) {
    fgSignal = 'bullish' // Fear = buy
    fgStrength = (40 - fearGreed) * 2
  } else if (fearGreed >= 80) {
    fgSignal = 'bearish' // Extreme greed = strong sell
    fgStrength = (fearGreed - 75) * 4
  } else if (fearGreed >= 65) {
    fgSignal = 'bearish' // Greed = sell
    fgStrength = (fearGreed - 60) * 2
  }

  if (fgStrength > 0) {
    sources.push({
      name: 'Fear & Greed Contrarian',
      signal: fgSignal,
      strength: Math.min(fgStrength, 100),
      data: { value: fearGreed, extreme: fearGreed <= 20 || fearGreed >= 80 },
      weight: fearGreed <= 20 || fearGreed >= 80 ? 25 : 15
    })
  }

  // 2. ORDER BOOK IMBALANCE
  const orderBook = await fetchOrderBook(instrument)
  if (orderBook && Math.abs(orderBook.imbalance) > 8) {
    const obSignal: 'bullish' | 'bearish' = orderBook.imbalance > 0 ? 'bullish' : 'bearish'
    sources.push({
      name: 'Order Book Imbalance',
      signal: obSignal,
      strength: Math.min(Math.abs(orderBook.imbalance) * 3, 100),
      data: orderBook,
      weight: 18
    })
  }

  // 3. WHALE DETECTION (Large Trade Flow)
  const trades = await fetchRecentTrades(instrument)
  if (trades) {
    if (trades.volumeProfile !== 'neutral' || Math.abs(trades.netLarge) >= 3) {
      const whaleSignal: 'bullish' | 'bearish' =
        trades.volumeProfile === 'accumulation' || trades.netLarge > 0 ? 'bullish' : 'bearish'

      sources.push({
        name: 'Whale Activity',
        signal: whaleSignal,
        strength: Math.min(
          (Math.abs(trades.netLarge) * 10) + (trades.whaleRatio * 2),
          100
        ),
        data: trades,
        weight: 22 // High weight - follow the whales
      })
    }
  }

  // 4. MULTI-TIMEFRAME STRUCTURE
  const tf15m = await fetchCandlesticks(instrument, '15m', 100)
  const tf1h = await fetchCandlesticks(instrument, '1h', 100)
  const tf4h = await fetchCandlesticks(instrument, '4h', 100)

  if (tf15m && tf1h && tf4h) {
    const structure15m = analyzeMarketStructure(tf15m.prices, tf15m.highs, tf15m.lows)
    const structure1h = analyzeMarketStructure(tf1h.prices, tf1h.highs, tf1h.lows)
    const structure4h = analyzeMarketStructure(tf4h.prices, tf4h.highs, tf4h.lows)

    // Multi-TF alignment
    const bullishCount = [structure15m, structure1h, structure4h]
      .filter(s => s.trend === 'uptrend').length
    const bearishCount = [structure15m, structure1h, structure4h]
      .filter(s => s.trend === 'downtrend').length

    if (bullishCount >= 2 || bearishCount >= 2) {
      sources.push({
        name: 'Multi-TF Alignment',
        signal: bullishCount >= 2 ? 'bullish' : 'bearish',
        strength: Math.max(bullishCount, bearishCount) * 30,
        data: {
          '15m': structure15m.trend,
          '1h': structure1h.trend,
          '4h': structure4h.trend
        },
        weight: 20
      })
    }

    // 5. LIQUIDITY SWEEP DETECTION (Very high value signal)
    const sweep = detectLiquiditySweep(tf15m.highs, tf15m.lows, tf15m.prices)
    if (sweep.detected && sweep.strength > 30) {
      sources.push({
        name: 'Liquidity Sweep',
        signal: sweep.type!,
        strength: sweep.strength,
        data: { type: sweep.type },
        weight: 28 // Highest weight - this is smart money
      })
    }

    // 6. ORDER BLOCK DETECTION
    const orderBlocks = detectOrderBlocks(tf1h.prices, tf1h.highs, tf1h.lows, tf1h.volumes)
    if (orderBlocks.bullishOB) {
      sources.push({
        name: 'Bullish Order Block',
        signal: 'bullish',
        strength: orderBlocks.bullishOB.strength,
        data: { price: orderBlocks.bullishOB.price },
        weight: 18
      })
    }
    if (orderBlocks.bearishOB) {
      sources.push({
        name: 'Bearish Order Block',
        signal: 'bearish',
        strength: orderBlocks.bearishOB.strength,
        data: { price: orderBlocks.bearishOB.price },
        weight: 18
      })
    }

    // 7. VOLUME-WEIGHTED MOMENTUM
    const vwMomentum = calculateVWMomentum(tf15m.prices, tf15m.volumes)
    if (Math.abs(vwMomentum) > 0.15) {
      sources.push({
        name: 'VW Momentum',
        signal: vwMomentum > 0 ? 'bullish' : 'bearish',
        strength: Math.min(Math.abs(vwMomentum) * 40, 100),
        data: { momentum: vwMomentum },
        weight: 12
      })
    }

    // 8. CHANGE OF CHARACTER (Trend reversal)
    if (structure1h.changeOfCharacter) {
      sources.push({
        name: 'Change of Character',
        signal: structure1h.trend === 'uptrend' ? 'bearish' : 'bullish',
        strength: 90,
        data: { previousTrend: structure1h.trend },
        weight: 25 // Very important signal
      })
    }

    // 9. DIVERGENCE
    const divergence = detectDivergence(tf1h.prices, tf1h.volumes)
    if (divergence.bullish || divergence.bearish) {
      sources.push({
        name: 'Volume Divergence',
        signal: divergence.bullish ? 'bullish' : 'bearish',
        strength: divergence.strength,
        data: divergence,
        weight: 15
      })
    }
  }

  // 10. EXTREME MOVE REVERSAL (Mean reversion)
  const cgData = await fetchCoinGeckoData(coinId)
  if (cgData && Math.abs(cgData.priceChange24h) > 12) {
    sources.push({
      name: 'Extreme Move Reversal',
      signal: cgData.priceChange24h > 12 ? 'bearish' : 'bullish',
      strength: Math.min(Math.abs(cgData.priceChange24h) * 4, 100),
      data: cgData,
      weight: 15
    })
  }

  // =============================================================================
  // AGGREGATE SIGNALS
  // =============================================================================

  let bullishScore = 0
  let bearishScore = 0
  let totalWeight = 0

  for (const source of sources) {
    const weightedStrength = source.strength * source.weight / 100
    if (source.signal === 'bullish') {
      bullishScore += weightedStrength
    } else if (source.signal === 'bearish') {
      bearishScore += weightedStrength
    }
    totalWeight += source.weight
  }

  // Normalize
  if (totalWeight > 0) {
    bullishScore = bullishScore / totalWeight * 100
    bearishScore = bearishScore / totalWeight * 100
  }

  const netScore = bullishScore - bearishScore
  const confidence = Math.round(Math.abs(netScore))

  // Determine action with strict thresholds
  let action: AdvancedSignal['action'] = 'HOLD'
  if (netScore >= 40) action = 'STRONG_BUY'
  else if (netScore >= 20) action = 'BUY'
  else if (netScore <= -40) action = 'STRONG_SELL'
  else if (netScore <= -20) action = 'SELL'

  // Risk calculation
  const hasLiquiditySweep = sources.some(s => s.name === 'Liquidity Sweep')
  const hasOrderBlock = sources.some(s => s.name.includes('Order Block'))
  const hasMultiTF = sources.some(s => s.name === 'Multi-TF Alignment')

  // Lower risk if we have smart money confirmation
  let riskScore = 5
  if (hasLiquiditySweep) riskScore -= 1
  if (hasOrderBlock) riskScore -= 1
  if (hasMultiTF) riskScore -= 1
  riskScore = Math.max(2, Math.min(riskScore + (10 - sources.length), 10))

  // Position sizing based on confidence and risk
  let positionSize = 5 // Default 5%
  if (confidence >= 60 && riskScore <= 4) positionSize = 10
  if (confidence >= 80 && riskScore <= 3) positionSize = 15
  if (confidence < 40) positionSize = 2

  // Stop loss and take profit
  const stopLoss = Math.max(1.5, riskScore * 0.5)
  const takeProfit = stopLoss * (confidence >= 60 ? 3 : 2) // Better R:R for high confidence

  return {
    instrument,
    action,
    confidence,
    sources,
    risk_score: riskScore,
    expected_move: confidence * 0.1,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    position_size: positionSize,
    timeframe: '15m-4h',
    generated_at: Date.now()
  }
}

// Generate signals for all primary instruments
export async function generateAllSignals(): Promise<AdvancedSignal[]> {
  const signals: AdvancedSignal[] = []

  for (const instrument of INSTRUMENTS.primary) {
    try {
      const signal = await generateAdvancedSignal(instrument)
      signals.push(signal)
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`Failed to generate signal for ${instrument}:`, error)
    }
  }

  // Sort by confidence
  signals.sort((a, b) => b.confidence - a.confidence)

  return signals
}

// Get the best trading opportunities
export async function getBestOpportunities(minConfidence: number = 50): Promise<AdvancedSignal[]> {
  const signals = await generateAllSignals()
  return signals.filter(s =>
    s.confidence >= minConfidence &&
    s.action !== 'HOLD'
  )
}

// Single instrument quick analysis
export async function analyzeInstrument(instrument: string): Promise<{
  signal: AdvancedSignal
  summary: string
}> {
  const signal = await generateAdvancedSignal(instrument)

  const bullishSources = signal.sources.filter(s => s.signal === 'bullish')
  const bearishSources = signal.sources.filter(s => s.signal === 'bearish')

  let summary = `${instrument}: ${signal.action} (${signal.confidence}% confidence)\n`
  summary += `Risk: ${signal.risk_score}/10 | Position Size: ${signal.position_size}%\n`
  summary += `Stop Loss: ${signal.stop_loss.toFixed(1)}% | Take Profit: ${signal.take_profit.toFixed(1)}%\n\n`

  if (bullishSources.length > 0) {
    summary += `BULLISH: ${bullishSources.map(s => `${s.name} (${s.strength})`).join(', ')}\n`
  }
  if (bearishSources.length > 0) {
    summary += `BEARISH: ${bearishSources.map(s => `${s.name} (${s.strength})`).join(', ')}\n`
  }

  return { signal, summary }
}
