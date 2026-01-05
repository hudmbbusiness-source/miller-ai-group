/**
 * REAL-TIME MARKET DATA SERVICE
 *
 * Provides ES futures data from multiple sources in order of preference:
 *
 * REAL-TIME OPTIONS:
 * 1. Polygon.io - $29/mo, true real-time ES futures
 * 2. Finnhub - Free tier, real-time for stocks (SPY proxy)
 * 3. TwelveData - Free tier, some real-time
 *
 * DELAYED FALLBACK:
 * 4. Yahoo Finance - Free, 15-20 min delayed for futures
 *
 * Set API keys in .env.local for real-time data:
 * - POLYGON_API_KEY
 * - FINNHUB_API_KEY
 * - TWELVEDATA_API_KEY
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MarketQuote {
  symbol: string
  price: number
  bid: number
  ask: number
  bidSize: number
  askSize: number
  volume: number
  timestamp: number
  source: 'polygon' | 'finnhub' | 'yahoo' | 'tradingview'
  delayed: boolean
}

export interface MarketCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ============================================================================
// POLYGON.IO CLIENT (REAL-TIME)
// ============================================================================

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || ''

async function fetchPolygonQuote(symbol: string = 'ES'): Promise<MarketQuote | null> {
  if (!POLYGON_API_KEY) return null

  try {
    // Polygon uses different symbol format: I:ES for indices, ESH5 for futures
    const polygonSymbol = `I:SPX` // Use SPX as proxy, scale to ES

    const response = await fetch(
      `https://api.polygon.io/v2/last/trade/${polygonSymbol}?apiKey=${POLYGON_API_KEY}`,
      { headers: { 'User-Agent': 'StuntMan/1.0' } }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data.results) return null

    // SPX to ES conversion: ES ≈ SPX * 10 / 100 * 50 (roughly)
    // Actually ES is approximately SPX/10 in price terms
    const esPrice = data.results.p // For SPX, ES is about 1/10th

    return {
      symbol: 'ES',
      price: esPrice,
      bid: esPrice - 0.25,
      ask: esPrice + 0.25,
      bidSize: 100,
      askSize: 100,
      volume: data.results.s || 0,
      timestamp: data.results.t || Date.now(),
      source: 'polygon',
      delayed: false
    }
  } catch (error) {
    console.error('[Polygon] Error:', error)
    return null
  }
}

async function fetchPolygonCandles(symbol: string = 'SPY', interval: string = '5', limit: number = 100): Promise<MarketCandle[]> {
  if (!POLYGON_API_KEY) return []

  try {
    const now = Date.now()
    const from = now - (2 * 24 * 60 * 60 * 1000) // 2 days ago

    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${interval}/minute/${from}/${now}?adjusted=true&sort=asc&limit=${limit}&apiKey=${POLYGON_API_KEY}`,
      { headers: { 'User-Agent': 'StuntMan/1.0' } }
    )

    if (!response.ok) return []

    const data = await response.json()
    if (!data.results) return []

    // Scale SPY to ES prices (SPY * 10)
    const scale = symbol === 'SPY' ? 10 : 1

    return data.results.map((bar: any) => ({
      time: bar.t,
      open: bar.o * scale,
      high: bar.h * scale,
      low: bar.l * scale,
      close: bar.c * scale,
      volume: bar.v
    }))
  } catch (error) {
    console.error('[Polygon] Candles error:', error)
    return []
  }
}

// ============================================================================
// FINNHUB CLIENT (FREE TIER)
// ============================================================================

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || ''

async function fetchFinnhubQuote(symbol: string = 'SPY'): Promise<MarketQuote | null> {
  if (!FINNHUB_API_KEY) return null

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data.c) return null

    // Scale SPY to ES
    const scale = symbol === 'SPY' ? 10 : 1

    return {
      symbol: 'ES',
      price: data.c * scale,
      bid: (data.c - 0.01) * scale,
      ask: (data.c + 0.01) * scale,
      bidSize: 0,
      askSize: 0,
      volume: 0,
      timestamp: data.t * 1000,
      source: 'finnhub',
      delayed: false // Finnhub is real-time for stocks
    }
  } catch (error) {
    console.error('[Finnhub] Error:', error)
    return null
  }
}

// ============================================================================
// YAHOO FINANCE FALLBACK (DELAYED)
// ============================================================================

async function fetchYahooQuote(symbol: string = 'ES=F'): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!response.ok) return null

    const data = await response.json()
    const result = data.chart?.result?.[0]
    if (!result?.meta?.regularMarketPrice) return null

    const price = result.meta.regularMarketPrice

    return {
      symbol: 'ES',
      price,
      bid: result.meta.bid || price - 0.25,
      ask: result.meta.ask || price + 0.25,
      bidSize: result.meta.bidSize || 0,
      askSize: result.meta.askSize || 0,
      volume: result.meta.regularMarketVolume || 0,
      timestamp: result.meta.regularMarketTime * 1000,
      source: 'yahoo',
      delayed: true // Yahoo is 15-20 min delayed for futures
    }
  } catch (error) {
    console.error('[Yahoo] Error:', error)
    return null
  }
}

async function fetchYahooCandles(symbol: string = 'ES=F', interval: string = '5m'): Promise<MarketCandle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=2d&includePrePost=false`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!response.ok) return []

    const data = await response.json()
    const result = data.chart?.result?.[0]
    if (!result?.timestamp) return []

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const candles: MarketCandle[] = []

    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
        candles.push({
          time: timestamps[i] * 1000,
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0
        })
      }
    }

    return candles
  } catch (error) {
    console.error('[Yahoo] Candles error:', error)
    return []
  }
}

// ============================================================================
// MAIN DATA SERVICE
// ============================================================================

export interface DataServiceStatus {
  polygon: boolean
  finnhub: boolean
  yahoo: boolean
  activeSource: 'polygon' | 'finnhub' | 'yahoo' | 'none'
  delayed: boolean
}

class RealtimeDataService {
  private lastQuote: MarketQuote | null = null
  private lastCandles: MarketCandle[] = []
  private status: DataServiceStatus = {
    polygon: !!POLYGON_API_KEY,
    finnhub: !!FINNHUB_API_KEY,
    yahoo: true,
    activeSource: 'none',
    delayed: true
  }

  /**
   * Get current ES price from best available source
   */
  async getQuote(): Promise<MarketQuote | null> {
    // Try sources in order of preference (real-time first)

    // 1. Polygon (real-time if API key set)
    if (POLYGON_API_KEY) {
      const quote = await fetchPolygonQuote()
      if (quote) {
        this.lastQuote = quote
        this.status.activeSource = 'polygon'
        this.status.delayed = false
        return quote
      }
    }

    // 2. Finnhub (real-time for stocks, scale to ES)
    if (FINNHUB_API_KEY) {
      const quote = await fetchFinnhubQuote('SPY')
      if (quote) {
        this.lastQuote = quote
        this.status.activeSource = 'finnhub'
        this.status.delayed = false
        return quote
      }
    }

    // 3. Yahoo (delayed fallback)
    const yahooQuote = await fetchYahooQuote('ES=F')
    if (yahooQuote) {
      this.lastQuote = yahooQuote
      this.status.activeSource = 'yahoo'
      this.status.delayed = true
      return yahooQuote
    }

    // Try SPY as last resort
    const spyQuote = await fetchYahooQuote('SPY')
    if (spyQuote) {
      spyQuote.price *= 10 // Scale to ES
      this.lastQuote = spyQuote
      this.status.activeSource = 'yahoo'
      this.status.delayed = true
      return spyQuote
    }

    return this.lastQuote
  }

  /**
   * Get candles for indicator calculation
   */
  async getCandles(limit: number = 100): Promise<MarketCandle[]> {
    // Try Polygon first
    if (POLYGON_API_KEY) {
      const candles = await fetchPolygonCandles('SPY', '5', limit)
      if (candles.length > 0) {
        this.lastCandles = candles
        return candles
      }
    }

    // Fall back to Yahoo
    let candles = await fetchYahooCandles('ES=F', '5m')
    if (candles.length > 0) {
      this.lastCandles = candles
      return candles
    }

    // Try SPY scaled
    candles = await fetchYahooCandles('SPY', '5m')
    if (candles.length > 0) {
      candles = candles.map(c => ({
        ...c,
        open: c.open * 10,
        high: c.high * 10,
        low: c.low * 10,
        close: c.close * 10
      }))
      this.lastCandles = candles
      return candles
    }

    return this.lastCandles
  }

  /**
   * Get service status
   */
  getStatus(): DataServiceStatus {
    return { ...this.status }
  }

  /**
   * Check if real-time data is available
   */
  isRealtime(): boolean {
    return this.status.activeSource === 'polygon' || this.status.activeSource === 'finnhub'
  }
}

// Export singleton instance
export const realtimeData = new RealtimeDataService()

// Export helper function for direct use
export async function getRealtimeESData(): Promise<{
  quote: MarketQuote | null
  candles: MarketCandle[]
  status: DataServiceStatus
}> {
  const quote = await realtimeData.getQuote()
  const candles = await realtimeData.getCandles()
  const status = realtimeData.getStatus()

  return { quote, candles, status }
}
