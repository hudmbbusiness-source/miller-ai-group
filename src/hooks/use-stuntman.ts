'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getCryptoWebSocket, CryptoWebSocket } from '@/lib/stuntman/crypto-websocket'
import type { Ticker, OrderBook, Trade, OHLCV, WebSocketStatus, Timeframe } from '@/lib/stuntman/types'

// =============================================================================
// WEBSOCKET CONNECTION HOOK
// =============================================================================

export function useWebSocketConnection() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const wsRef = useRef<CryptoWebSocket | null>(null)

  useEffect(() => {
    const ws = getCryptoWebSocket()
    wsRef.current = ws

    const unsubscribe = ws.onStatusChange(setStatus)

    // Connect if not already connected
    if (!ws.isConnected()) {
      ws.connect().catch(console.error)
    } else {
      setStatus(ws.getStatus())
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const connect = useCallback(() => {
    wsRef.current?.connect().catch(console.error)
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect()
  }, [])

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  }
}

// =============================================================================
// REAL-TIME TICKER HOOK
// =============================================================================

export function useTicker(instrument: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ws = getCryptoWebSocket()

    // Connect if needed
    if (!ws.isConnected()) {
      ws.connect().catch(console.error)
    }

    const unsubscribe = ws.subscribeTicker(instrument, (data) => {
      setTicker(data)
      setLoading(false)
    })

    // Fetch initial data via HTTP as fallback
    fetch(`https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${instrument}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.result?.data?.[0]) {
          const t = data.result.data[0]
          const lastPrice = parseFloat(t.a)
          const priceChange = parseFloat(t.c)
          setTicker({
            instrumentName: instrument,
            lastPrice,
            bidPrice: parseFloat(t.b) || lastPrice,
            askPrice: parseFloat(t.k) || lastPrice,
            highPrice: parseFloat(t.h),
            lowPrice: parseFloat(t.l),
            volume: parseFloat(t.v),
            quoteVolume: parseFloat(t.vv) || 0,
            priceChange24h: priceChange,
            priceChangePercent24h: priceChange * 100,
            openPrice: lastPrice - priceChange,
            timestamp: Date.now(),
          })
          setLoading(false)
        }
      })
      .catch(console.error)

    return unsubscribe
  }, [instrument])

  return { ticker, loading }
}

// =============================================================================
// REAL-TIME ORDER BOOK HOOK
// =============================================================================

export function useOrderBook(instrument: string, depth: number = 10) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ws = getCryptoWebSocket()

    if (!ws.isConnected()) {
      ws.connect().catch(console.error)
    }

    const unsubscribe = ws.subscribeOrderBook(instrument, (data) => {
      setOrderBook(data)
      setLoading(false)
    }, depth)

    // Fetch initial data via HTTP
    fetch(`https://api.crypto.com/exchange/v1/public/get-book?instrument_name=${instrument}&depth=${depth}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.result?.data?.[0]) {
          const book = data.result.data[0]

          let bidTotal = 0
          const bids = (book.bids || []).slice(0, depth).map((b: any) => {
            bidTotal += parseFloat(b[1])
            return {
              price: parseFloat(b[0]),
              quantity: parseFloat(b[1]),
              total: bidTotal,
              percentage: 0,
            }
          })

          let askTotal = 0
          const asks = (book.asks || []).slice(0, depth).map((a: any) => {
            askTotal += parseFloat(a[1])
            return {
              price: parseFloat(a[0]),
              quantity: parseFloat(a[1]),
              total: askTotal,
              percentage: 0,
            }
          })

          const maxTotal = Math.max(bidTotal, askTotal)
          bids.forEach((b: any) => b.percentage = maxTotal > 0 ? (b.quantity / maxTotal) * 100 : 0)
          asks.forEach((a: any) => a.percentage = maxTotal > 0 ? (a.quantity / maxTotal) * 100 : 0)

          const bestBid = bids[0]?.price || 0
          const bestAsk = asks[0]?.price || 0
          const midPrice = (bestBid + bestAsk) / 2
          const spread = bestAsk - bestBid

          setOrderBook({
            instrumentName: instrument,
            bids,
            asks,
            spread,
            spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
            midPrice,
            imbalance: 0,
            timestamp: Date.now(),
          })
          setLoading(false)
        }
      })
      .catch(console.error)

    return unsubscribe
  }, [instrument, depth])

  return { orderBook, loading }
}

// =============================================================================
// REAL-TIME TRADES HOOK
// =============================================================================

export function useRecentTrades(instrument: string, limit: number = 50) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ws = getCryptoWebSocket()

    if (!ws.isConnected()) {
      ws.connect().catch(console.error)
    }

    const unsubscribe = ws.subscribeTrades(instrument, (newTrades) => {
      setTrades(prev => {
        const combined = [...newTrades, ...prev]
        return combined.slice(0, limit)
      })
      setLoading(false)
    })

    // Fetch initial trades via HTTP
    fetch(`https://api.crypto.com/exchange/v1/public/get-trades?instrument_name=${instrument}&count=${limit}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.result?.data) {
          const initialTrades = data.result.data.map((t: any) => ({
            id: t.d,
            instrumentName: instrument,
            price: parseFloat(t.p),
            quantity: parseFloat(t.q),
            side: t.s as 'BUY' | 'SELL',
            timestamp: t.t,
            isMaker: false,
          }))
          setTrades(initialTrades)
          setLoading(false)
        }
      })
      .catch(console.error)

    return unsubscribe
  }, [instrument, limit])

  return { trades, loading }
}

// =============================================================================
// CANDLESTICK DATA HOOK
// =============================================================================

export function useCandlesticks(instrument: string, timeframe: Timeframe, count: number = 200) {
  const [candles, setCandles] = useState<OHLCV[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ws = getCryptoWebSocket()

    if (!ws.isConnected()) {
      ws.connect().catch(console.error)
    }

    // Subscribe to real-time updates
    const unsubscribe = ws.subscribeCandles(instrument, timeframe, (newCandles) => {
      setCandles(prev => {
        if (prev.length === 0) return newCandles

        // Update the last candle or add new one
        const updated = [...prev]
        const lastCandle = updated[updated.length - 1]
        const newCandle = newCandles[0]

        if (newCandle && lastCandle && newCandle.openTime === lastCandle.openTime) {
          // Update existing candle
          updated[updated.length - 1] = newCandle
        } else if (newCandle) {
          // Add new candle
          updated.push(newCandle)
          if (updated.length > count) {
            updated.shift()
          }
        }

        return updated
      })
    })

    // Fetch initial data via HTTP
    fetch(`https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${instrument}&timeframe=${timeframe}&count=${count}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.result?.data) {
          const candleData = data.result.data
            .sort((a: any, b: any) => a.t - b.t)
            .map((c: any) => ({
              openTime: c.t,
              closeTime: c.ut || c.t,
              open: parseFloat(c.o),
              high: parseFloat(c.h),
              low: parseFloat(c.l),
              close: parseFloat(c.c),
              volume: parseFloat(c.v),
              quoteVolume: 0,
              tradeCount: 0,
            }))
          setCandles(candleData)
          setLoading(false)
        }
      })
      .catch(console.error)

    return unsubscribe
  }, [instrument, timeframe, count])

  return { candles, loading }
}

// =============================================================================
// ACCOUNT BALANCE HOOK
// =============================================================================

interface Balance {
  currency: string
  quantity: number
  valueUSD: number
}

export function useAccountBalance() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [totalUSD, setTotalUSD] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/balance')
      const data = await res.json()

      if (data.success) {
        setBalances(data.balances || [])
        setTotalUSD(data.totalUSD || 0)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch balance')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [refresh])

  return { balances, totalUSD, loading, error, refresh }
}

// =============================================================================
// TRADING SIGNALS HOOK
// =============================================================================

interface Signal {
  instrument: string
  action: string
  confidence: number
  risk_score: number
  stop_loss: number
  take_profit: number
  position_size: number
  sources: Array<{ name: string; signal: string; strength: number }>
}

export function useTradingSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  const scan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      })
      const data = await res.json()

      if (data.success) {
        setSignals(data.signals || [])
        setLastScan(new Date())
      }
    } catch (e) {
      console.error('Signal scan error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { signals, loading, lastScan, scan }
}
