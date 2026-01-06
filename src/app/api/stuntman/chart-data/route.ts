/**
 * REAL-TIME ES/NQ CHART DATA API
 *
 * Fetches futures data from Yahoo Finance - the EXACT same source as trading signals.
 * This ensures the chart shows precisely what the system is trading on.
 *
 * Data Sources (in order):
 * 1. Try actual ES=F/NQ=F futures data first
 * 2. Fall back to SPY/QQQ ETF scaled to approximate futures prices
 */

import { NextRequest, NextResponse } from 'next/server'

// Helper to fetch Yahoo Finance data
async function fetchYahooData(symbol: string, start: number, end: number, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=${interval}&includePrePost=true`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    },
    cache: 'no-store'
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.chart?.result?.[0] || null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'ES=F'
    const interval = searchParams.get('interval') || '5m'
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    const now = Math.floor(Date.now() / 1000)
    const start = startParam ? parseInt(startParam) : now - (2 * 24 * 60 * 60)
    const end = endParam ? parseInt(endParam) : now

    let result: any = null
    let fetchSymbol = symbol
    let scale = 1
    let dataNote = ''

    // Strategy 1: Try actual futures data first (ES=F or NQ=F)
    if (symbol === 'ES=F' || symbol === 'NQ=F') {
      console.log(`[Chart Data] Trying actual ${symbol} futures data...`)
      result = await fetchYahooData(symbol, start, end, interval)

      if (result?.timestamp?.length > 10) {
        fetchSymbol = symbol
        scale = 1
        dataNote = 'Real ES Futures'
        console.log(`[Chart Data] SUCCESS: Got ${result.timestamp.length} candles from ${symbol}`)
      } else {
        console.log(`[Chart Data] Actual ${symbol} data insufficient, falling back to ETF proxy...`)
        result = null
      }
    }

    // Strategy 2: Fall back to SPY/QQQ ETF proxy
    if (!result) {
      if (symbol === 'ES=F') {
        fetchSymbol = 'SPY'
        scale = 10 // SPY × 10 ≈ ES (SPY ~$590 → ES ~$5900)
        dataNote = 'SPY ETF × 10 (proxy)'
      } else if (symbol === 'NQ=F') {
        fetchSymbol = 'QQQ'
        scale = 40 // QQQ × 40 ≈ NQ (QQQ ~$530 → NQ ~$21200)
        dataNote = 'QQQ ETF × 40 (proxy)'
      }

      console.log(`[Chart Data] Fetching ${fetchSymbol} for ${symbol}...`)
      result = await fetchYahooData(fetchSymbol, start, end, interval)
    }

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return NextResponse.json({
        success: false,
        error: 'No market data available. Market may be closed.'
      }, { status: 404 })
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    const candles = []

    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
        candles.push({
          time: timestamps[i],
          open: parseFloat((quote.open[i] * scale).toFixed(2)),
          high: parseFloat((quote.high[i] * scale).toFixed(2)),
          low: parseFloat((quote.low[i] * scale).toFixed(2)),
          close: parseFloat((quote.close[i] * scale).toFixed(2)),
          volume: quote.volume[i] || 0
        })
      }
    }

    // Get current price from meta
    const meta = result.meta
    const currentPrice = meta?.regularMarketPrice ? parseFloat((meta.regularMarketPrice * scale).toFixed(2)) : null
    const previousClose = meta?.previousClose ? parseFloat((meta.previousClose * scale).toFixed(2)) : null

    // Calculate market hours status
    const lastCandle = candles[candles.length - 1]
    const lastCandleTime = lastCandle ? new Date(lastCandle.time * 1000) : null
    const now_date = new Date()
    const dataAge = lastCandleTime ? Math.floor((now_date.getTime() - lastCandleTime.getTime()) / 1000 / 60) : null

    console.log(`[Chart Data] Returned ${candles.length} candles for ${symbol} (${dataNote})`)

    return NextResponse.json({
      success: true,
      symbol: symbol,
      sourceSymbol: fetchSymbol,
      scale: scale,
      interval: interval,
      candles: candles,
      currentPrice: currentPrice,
      previousClose: previousClose,
      lastUpdate: new Date().toISOString(),
      candleCount: candles.length,
      dataNote: dataNote,
      dataAgeMinutes: dataAge,
      isProxy: scale !== 1
    })

  } catch (error) {
    console.error('[Chart Data] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
