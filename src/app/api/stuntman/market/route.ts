// =============================================================================
// STUNTMAN AI - MARKET DATA API
// =============================================================================
// Real-time and historical market data from Crypto.com
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CRYPTO_COM_API, INSTRUMENTS, TIMEFRAMES } from '@/lib/stuntman/constants'
import type { Timeframe, OHLCV, Ticker, OrderBook, Trade } from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// CRYPTO.COM API HELPERS
// =============================================================================

interface CryptoComResponse<T = unknown> {
  code: number
  result?: {
    data?: T
    instrument_name?: string
  }
}

async function fetchCryptoCom<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${CRYPTO_COM_API.PUBLIC_API_URL}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 5 }, // Cache for 5 seconds
    })

    if (!response.ok) {
      console.error(`Crypto.com API error: ${response.status}`)
      return null
    }

    const data: CryptoComResponse<T> = await response.json()
    if (data.code !== 0) {
      console.error(`Crypto.com API error code: ${data.code}`)
      return null
    }

    return (data.result?.data || data.result) as T
  } catch (error) {
    console.error('Crypto.com API fetch error:', error)
    return null
  }
}

// =============================================================================
// DATA PARSERS
// =============================================================================

interface RawTicker {
  i: string // instrument_name
  h: string // high_24h
  l: string // low_24h
  a: string // latest_price
  v: string // total_24h_volume
  vv: string // quote_volume
  c: string // price_change_24h
  b: string // best_bid
  k: string // best_ask
  t: number // timestamp
}

interface RawCandlestick {
  o: string
  h: string
  l: string
  c: string
  v: string
  t: number
}

interface RawOrderBook {
  bids: [string, string, number][]
  asks: [string, string, number][]
  t: number
}

interface RawTrade {
  d: string
  s: string
  p: string
  q: string
  t: number
  i: string
}

function parseTicker(raw: RawTicker): Ticker {
  const lastPrice = parseFloat(raw.a)
  const priceChange = parseFloat(raw.c)
  const openPrice = lastPrice - priceChange

  return {
    instrumentName: raw.i,
    lastPrice,
    bidPrice: parseFloat(raw.b),
    askPrice: parseFloat(raw.k),
    highPrice: parseFloat(raw.h),
    lowPrice: parseFloat(raw.l),
    volume: parseFloat(raw.v),
    quoteVolume: parseFloat(raw.vv),
    priceChange24h: priceChange,
    priceChangePercent24h: openPrice > 0 ? (priceChange / openPrice) * 100 : 0,
    openPrice,
    timestamp: raw.t,
  }
}

function parseCandles(raw: RawCandlestick[], instrument: string): OHLCV[] {
  return raw.map((c) => ({
    openTime: c.t,
    closeTime: c.t + 60000, // Approximate
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
    quoteVolume: 0,
    tradeCount: 0,
  }))
}

function parseOrderBook(raw: RawOrderBook, instrument: string): OrderBook {
  const bids = (raw.bids || []).slice(0, 20).map(([price, quantity]) => ({
    price: parseFloat(price),
    quantity: parseFloat(quantity),
    total: 0,
    percentage: 0,
  }))

  const asks = (raw.asks || []).slice(0, 20).map(([price, quantity]) => ({
    price: parseFloat(price),
    quantity: parseFloat(quantity),
    total: 0,
    percentage: 0,
  }))

  // Calculate totals and percentages
  let bidTotal = 0
  let askTotal = 0
  const maxTotal = Math.max(
    bids.reduce((sum, b) => sum + b.quantity, 0),
    asks.reduce((sum, a) => sum + a.quantity, 0)
  )

  bids.forEach((bid) => {
    bidTotal += bid.quantity
    bid.total = bidTotal
    bid.percentage = maxTotal > 0 ? (bid.quantity / maxTotal) * 100 : 0
  })

  asks.forEach((ask) => {
    askTotal += ask.quantity
    ask.total = askTotal
    ask.percentage = maxTotal > 0 ? (ask.quantity / maxTotal) * 100 : 0
  })

  const bestBid = bids[0]?.price || 0
  const bestAsk = asks[0]?.price || 0
  const midPrice = (bestBid + bestAsk) / 2
  const spread = bestAsk - bestBid

  // Calculate imbalance
  const bidVolume = bids.slice(0, 5).reduce((sum, b) => sum + b.quantity * b.price, 0)
  const askVolume = asks.slice(0, 5).reduce((sum, a) => sum + a.quantity * a.price, 0)
  const imbalance = bidVolume + askVolume > 0 ? (bidVolume - askVolume) / (bidVolume + askVolume) : 0

  return {
    instrumentName: instrument,
    bids,
    asks,
    spread,
    spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
    midPrice,
    imbalance,
    timestamp: raw.t,
  }
}

function parseTrades(raw: RawTrade[]): Trade[] {
  return raw.map((t) => ({
    id: t.d,
    instrumentName: t.i,
    price: parseFloat(t.p),
    quantity: parseFloat(t.q),
    side: t.s as 'BUY' | 'SELL',
    timestamp: t.t,
    isMaker: false,
  }))
}

// =============================================================================
// GET - Fetch market data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'tickers'
    const instrument = searchParams.get('instrument') || 'BTC_USDT'
    const timeframe = (searchParams.get('timeframe') || '15m') as Timeframe
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    switch (action) {
      // ==========================================================================
      // TICKERS - All instruments or specific
      // ==========================================================================
      case 'tickers': {
        const instruments = searchParams.get('instruments')?.split(',') || INSTRUMENTS.all

        // Fetch ticker for all instruments
        const raw = await fetchCryptoCom<RawTicker[]>('get-ticker')

        if (!raw) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch tickers',
          }, { status: 502 })
        }

        // Filter and parse
        const tickers = raw
          .filter((t) => instruments.includes(t.i))
          .map(parseTicker)
          .sort((a, b) => b.quoteVolume - a.quoteVolume)

        return NextResponse.json({
          success: true,
          tickers,
          timestamp: Date.now(),
        })
      }

      // ==========================================================================
      // TICKER - Single instrument
      // ==========================================================================
      case 'ticker': {
        const raw = await fetchCryptoCom<RawTicker[]>(`get-ticker?instrument_name=${instrument}`)

        if (!raw || raw.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch ticker',
          }, { status: 502 })
        }

        const ticker = parseTicker(raw[0])

        return NextResponse.json({
          success: true,
          ticker,
        })
      }

      // ==========================================================================
      // CANDLES - Historical OHLCV data
      // ==========================================================================
      case 'candles': {
        // Map timeframe to Crypto.com format
        const timeframeMap: Record<Timeframe, string> = {
          '1m': '1m',
          '5m': '5m',
          '15m': '15m',
          '30m': '30m',
          '1h': '1h',
          '4h': '4h',
          '1d': '1D',
          '1w': '1W',
        }

        const cryptoTimeframe = timeframeMap[timeframe]
        if (!cryptoTimeframe) {
          return NextResponse.json({
            success: false,
            error: 'Invalid timeframe',
          }, { status: 400 })
        }

        const raw = await fetchCryptoCom<RawCandlestick[]>(
          `get-candlestick?instrument_name=${instrument}&timeframe=${cryptoTimeframe}&count=${limit}`
        )

        if (!raw) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch candles',
          }, { status: 502 })
        }

        const candles = parseCandles(raw, instrument)

        // Cache to database for indicators
        if (candles.length > 0) {
          await cacheMarketData(supabase, instrument, timeframe, candles)
        }

        return NextResponse.json({
          success: true,
          instrument,
          timeframe,
          candles,
          count: candles.length,
        })
      }

      // ==========================================================================
      // ORDERBOOK - Order book depth
      // ==========================================================================
      case 'orderbook': {
        const depth = Math.min(parseInt(searchParams.get('depth') || '20'), 50)

        const raw = await fetchCryptoCom<RawOrderBook>(
          `get-book?instrument_name=${instrument}&depth=${depth}`
        )

        if (!raw) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch order book',
          }, { status: 502 })
        }

        const orderBook = parseOrderBook(raw, instrument)

        return NextResponse.json({
          success: true,
          orderBook,
        })
      }

      // ==========================================================================
      // TRADES - Recent trades
      // ==========================================================================
      case 'trades': {
        const raw = await fetchCryptoCom<RawTrade[]>(
          `get-trades?instrument_name=${instrument}&count=${limit}`
        )

        if (!raw) {
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch trades',
          }, { status: 502 })
        }

        const trades = parseTrades(raw)

        return NextResponse.json({
          success: true,
          instrument,
          trades,
          count: trades.length,
        })
      }

      // ==========================================================================
      // INSTRUMENTS - Available trading pairs
      // ==========================================================================
      case 'instruments': {
        return NextResponse.json({
          success: true,
          instruments: {
            primary: INSTRUMENTS.primary,
            secondary: INSTRUMENTS.secondary,
            all: INSTRUMENTS.all,
          },
          timeframes: Object.entries(TIMEFRAMES).map(([key, value]) => ({
            value: key,
            label: value.label,
            ms: value.ms,
          })),
        })
      }

      // ==========================================================================
      // CACHED - Get cached market data from database
      // ==========================================================================
      case 'cached': {
        const startTime = searchParams.get('start')
        const endTime = searchParams.get('end')

        let query = (supabase
          .from('stuntman_market_data') as SupabaseAny)
          .select('*')
          .eq('instrument_name', instrument)
          .eq('timeframe', timeframe)
          .order('open_time', { ascending: true })
          .limit(limit)

        if (startTime) {
          query = query.gte('open_time', parseInt(startTime))
        }
        if (endTime) {
          query = query.lte('open_time', parseInt(endTime))
        }

        const { data: cachedData, error } = await query

        if (error) {
          console.error('Cached data fetch error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to fetch cached data',
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          instrument,
          timeframe,
          candles: cachedData || [],
          count: cachedData?.length || 0,
          source: 'cache',
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Market API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// CACHE MARKET DATA
// =============================================================================

async function cacheMarketData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  instrument: string,
  timeframe: Timeframe,
  candles: OHLCV[]
): Promise<void> {
  try {
    // Prepare data for upsert
    const cacheData = candles.map((c) => ({
      instrument_name: instrument,
      timeframe,
      open_time: c.openTime,
      close_time: c.closeTime,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      quote_volume: c.quoteVolume,
      trade_count: c.tradeCount,
      updated_at: new Date().toISOString(),
    }))

    // Upsert to database (update if exists, insert if not)
    await (supabase
      .from('stuntman_market_data') as SupabaseAny)
      .upsert(cacheData, {
        onConflict: 'instrument_name,timeframe,open_time',
        ignoreDuplicates: false,
      })
  } catch (error) {
    // Non-critical, just log
    console.error('Market data cache error:', error)
  }
}

// =============================================================================
// POST - Batch fetch market data
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { instruments, include_orderbook = false, include_trades = false } = body

    if (!instruments || !Array.isArray(instruments) || instruments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'instruments array required',
      }, { status: 400 })
    }

    // Limit to 20 instruments per request
    const requestedInstruments = instruments.slice(0, 20)

    // Fetch all tickers first
    const raw = await fetchCryptoCom<RawTicker[]>('get-ticker')

    if (!raw) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch market data',
      }, { status: 502 })
    }

    const tickerMap = new Map<string, Ticker>()
    raw.forEach((t) => {
      if (requestedInstruments.includes(t.i)) {
        tickerMap.set(t.i, parseTicker(t))
      }
    })

    // Build response
    const marketData: Record<string, {
      ticker: Ticker | null
      orderBook?: OrderBook | null
      trades?: Trade[]
    }> = {}

    for (const inst of requestedInstruments) {
      marketData[inst] = {
        ticker: tickerMap.get(inst) || null,
      }
    }

    // Optionally fetch order books (sequential to avoid rate limits)
    if (include_orderbook) {
      for (const inst of requestedInstruments.slice(0, 5)) {
        const bookRaw = await fetchCryptoCom<RawOrderBook>(
          `get-book?instrument_name=${inst}&depth=20`
        )
        if (bookRaw) {
          marketData[inst].orderBook = parseOrderBook(bookRaw, inst)
        }
      }
    }

    // Optionally fetch recent trades
    if (include_trades) {
      for (const inst of requestedInstruments.slice(0, 5)) {
        const tradesRaw = await fetchCryptoCom<RawTrade[]>(
          `get-trades?instrument_name=${inst}&count=50`
        )
        if (tradesRaw) {
          marketData[inst].trades = parseTrades(tradesRaw)
        }
      }
    }

    return NextResponse.json({
      success: true,
      marketData,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Market POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
