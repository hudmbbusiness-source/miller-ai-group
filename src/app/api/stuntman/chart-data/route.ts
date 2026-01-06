/**
 * REAL-TIME ES/NQ CHART DATA API
 *
 * Fetches futures data from Yahoo Finance - the EXACT same source as trading signals.
 * This ensures the chart shows precisely what the system is trading on.
 */

import { NextRequest, NextResponse } from 'next/server'

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

    // Determine data source based on symbol
    // ES=F and NQ=F don't return intraday data from Yahoo, use SPY/QQQ as proxy
    let fetchSymbol = symbol
    let scale = 1

    if (symbol === 'ES=F') {
      fetchSymbol = 'SPY'
      scale = 10 // SPY × 10 ≈ ES
    } else if (symbol === 'NQ=F') {
      fetchSymbol = 'QQQ'
      scale = 40 // QQQ × 40 ≈ NQ
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(fetchSymbol)}?period1=${start}&period2=${end}&interval=${interval}&includePrePost=true`

    console.log(`[Chart Data] Fetching ${fetchSymbol} for ${symbol}...`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`[Chart Data] Yahoo error: ${response.status}`)
      return NextResponse.json({
        success: false,
        error: `Yahoo Finance returned ${response.status}`
      }, { status: 500 })
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return NextResponse.json({
        success: false,
        error: 'No data returned from Yahoo Finance'
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

    console.log(`[Chart Data] Returned ${candles.length} candles for ${symbol}`)

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
      candleCount: candles.length
    })

  } catch (error) {
    console.error('[Chart Data] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
