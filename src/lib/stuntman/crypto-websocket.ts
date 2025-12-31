// =============================================================================
// STUNTMAN AI - CRYPTO.COM WEBSOCKET CLIENT
// =============================================================================
// Real-time market data streaming with automatic reconnection
// =============================================================================

import { CRYPTO_COM_API, WS_CHANNELS } from './constants'
import type { WebSocketMessage, WebSocketStatus, Timeframe, Ticker, OrderBook, Trade, OHLCV } from './types'

// =============================================================================
// TYPES
// =============================================================================

type MessageHandler = (data: unknown) => void

interface Subscription {
  channel: string
  callbacks: Set<MessageHandler>
}

interface ParsedTickerData {
  i: string // instrument_name
  h: string // high_price
  l: string // low_price
  a: string // last_traded_price
  v: string // volume
  vv: string // quote_volume
  c: string // price_change_24h
  b: string // bid_price
  k: string // ask_price
  t: number // timestamp
}

interface ParsedBookData {
  bids: [string, string, number][] // [price, quantity, count]
  asks: [string, string, number][]
  t: number
}

interface ParsedTradeData {
  d: string // trade_id
  s: string // side (BUY/SELL)
  p: string // price
  q: string // quantity
  t: number // timestamp
  i: string // instrument_name
}

interface ParsedCandleData {
  o: string // open
  h: string // high
  l: string // low
  c: string // close
  v: string // volume
  t: number // open_time
  ut: number // update_time (close_time)
}

// =============================================================================
// CRYPTO WEBSOCKET CLIENT
// =============================================================================

export class CryptoWebSocket {
  private ws: WebSocket | null = null
  private subscriptions: Map<string, Subscription> = new Map()
  private messageQueue: object[] = []
  private reconnectAttempts = 0
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private status: WebSocketStatus = 'disconnected'
  private statusCallbacks: Set<(status: WebSocketStatus) => void> = new Set()
  private requestId = 0
  private pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> =
    new Map()

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.setStatus('connecting')

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(CRYPTO_COM_API.WS_MARKET_URL)

        this.ws.onopen = () => {
          console.log('[StuntMan WS] Connected to Crypto.com')
          this.reconnectAttempts = 0
          this.setStatus('connected')
          this.startHeartbeat()
          this.flushMessageQueue()
          this.resubscribeAll()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          console.log(`[StuntMan WS] Disconnected: ${event.code} ${event.reason}`)
          this.cleanup()
          this.setStatus('disconnected')

          if (event.code !== 1000) {
            // Not a clean close
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('[StuntMan WS] Error:', error)
          this.setStatus('error')
          reject(error)
        }
      } catch (error) {
        this.setStatus('error')
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.cleanup()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.pendingRequests.forEach(({ reject }) => reject(new Error('Connection closed')))
    this.pendingRequests.clear()
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= CRYPTO_COM_API.WS_MAX_RECONNECT_ATTEMPTS) {
      console.error('[StuntMan WS] Max reconnect attempts reached')
      this.setStatus('error')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    const delay = CRYPTO_COM_API.WS_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`[StuntMan WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error)
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        id: this.getNextRequestId(),
        method: 'public/heartbeat',
      })
    }, CRYPTO_COM_API.WS_HEARTBEAT_INTERVAL)
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      // Handle heartbeat response
      if (message.method === 'public/heartbeat') {
        this.send({ id: message.id, method: 'public/respond-heartbeat' })
        return
      }

      // Handle subscription data
      if (message.result?.channel) {
        const channel = message.result.channel
        const subscription = this.subscriptions.get(channel)

        if (subscription) {
          const parsedData = this.parseChannelData(channel, message.result.data)
          subscription.callbacks.forEach((cb) => cb(parsedData))
        }
        return
      }

      // Handle request responses
      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id)!
        this.pendingRequests.delete(message.id)

        if (message.code === 0) {
          resolve(message.result)
        } else {
          reject(new Error(`API Error: ${message.code}`))
        }
      }
    } catch (error) {
      console.error('[StuntMan WS] Failed to parse message:', error)
    }
  }

  private parseChannelData(channel: string, data: unknown[]): unknown {
    if (!data || data.length === 0) return null

    // Ticker channel
    if (channel.startsWith('ticker.')) {
      const raw = data[0] as ParsedTickerData
      return this.parseTicker(raw)
    }

    // Order book channel
    if (channel.startsWith('book.')) {
      const raw = data[0] as ParsedBookData
      return this.parseOrderBook(channel, raw)
    }

    // Trade channel
    if (channel.startsWith('trade.')) {
      return data.map((t) => this.parseTrade(t as ParsedTradeData))
    }

    // Candlestick channel
    if (channel.startsWith('candlestick.')) {
      return data.map((c) => this.parseCandle(c as ParsedCandleData))
    }

    return data
  }

  private parseTicker(raw: ParsedTickerData): Ticker {
    const lastPrice = parseFloat(raw.a)
    const openPrice = lastPrice - parseFloat(raw.c)

    return {
      instrumentName: raw.i,
      lastPrice,
      bidPrice: parseFloat(raw.b),
      askPrice: parseFloat(raw.k),
      highPrice: parseFloat(raw.h),
      lowPrice: parseFloat(raw.l),
      volume: parseFloat(raw.v),
      quoteVolume: parseFloat(raw.vv),
      priceChange24h: parseFloat(raw.c),
      priceChangePercent24h: openPrice > 0 ? (parseFloat(raw.c) / openPrice) * 100 : 0,
      openPrice,
      timestamp: raw.t,
    }
  }

  private parseOrderBook(channel: string, raw: ParsedBookData): OrderBook {
    const instrumentMatch = channel.match(/book\.([^.]+)/)
    const instrumentName = instrumentMatch ? instrumentMatch[1] : ''

    const bids = raw.bids.map(([price, quantity]) => ({
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      total: 0,
      percentage: 0,
    }))

    const asks = raw.asks.map(([price, quantity]) => ({
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

    // Calculate order book imbalance
    const bidVolume = bids.slice(0, 5).reduce((sum, b) => sum + b.quantity * b.price, 0)
    const askVolume = asks.slice(0, 5).reduce((sum, a) => sum + a.quantity * a.price, 0)
    const imbalance = bidVolume + askVolume > 0 ? (bidVolume - askVolume) / (bidVolume + askVolume) : 0

    return {
      instrumentName,
      bids,
      asks,
      spread,
      spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
      midPrice,
      imbalance,
      timestamp: raw.t,
    }
  }

  private parseTrade(raw: ParsedTradeData): Trade {
    return {
      id: raw.d,
      instrumentName: raw.i,
      price: parseFloat(raw.p),
      quantity: parseFloat(raw.q),
      side: raw.s as 'BUY' | 'SELL',
      timestamp: raw.t,
      isMaker: false,
    }
  }

  private parseCandle(raw: ParsedCandleData): OHLCV {
    return {
      openTime: raw.t,
      closeTime: raw.ut,
      open: parseFloat(raw.o),
      high: parseFloat(raw.h),
      low: parseFloat(raw.l),
      close: parseFloat(raw.c),
      volume: parseFloat(raw.v),
      quoteVolume: 0,
      tradeCount: 0,
    }
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  subscribe(channel: string, callback: MessageHandler): () => void {
    let subscription = this.subscriptions.get(channel)

    if (!subscription) {
      subscription = { channel, callbacks: new Set() }
      this.subscriptions.set(channel, subscription)

      // Send subscription request
      this.sendSubscription([channel])
    }

    subscription.callbacks.add(callback)

    // Return unsubscribe function
    return () => this.unsubscribe(channel, callback)
  }

  unsubscribe(channel: string, callback: MessageHandler): void {
    const subscription = this.subscriptions.get(channel)

    if (subscription) {
      subscription.callbacks.delete(callback)

      if (subscription.callbacks.size === 0) {
        this.subscriptions.delete(channel)
        this.sendUnsubscription([channel])
      }
    }
  }

  private sendSubscription(channels: string[]): void {
    this.send({
      id: this.getNextRequestId(),
      method: 'subscribe',
      params: { channels },
    })
  }

  private sendUnsubscription(channels: string[]): void {
    this.send({
      id: this.getNextRequestId(),
      method: 'unsubscribe',
      params: { channels },
    })
  }

  private resubscribeAll(): void {
    const channels = Array.from(this.subscriptions.keys())
    if (channels.length > 0) {
      console.log(`[StuntMan WS] Resubscribing to ${channels.length} channels`)
      this.sendSubscription(channels)
    }
  }

  // ==========================================================================
  // CONVENIENCE SUBSCRIPTION METHODS
  // ==========================================================================

  subscribeTicker(instrument: string, callback: (ticker: Ticker) => void): () => void {
    return this.subscribe(WS_CHANNELS.ticker(instrument), (data) => callback(data as Ticker))
  }

  subscribeOrderBook(instrument: string, callback: (book: OrderBook) => void, depth = 10): () => void {
    return this.subscribe(WS_CHANNELS.book(instrument, depth), (data) => callback(data as OrderBook))
  }

  subscribeTrades(instrument: string, callback: (trades: Trade[]) => void): () => void {
    return this.subscribe(WS_CHANNELS.trade(instrument), (data) => callback(data as Trade[]))
  }

  subscribeCandles(
    instrument: string,
    timeframe: Timeframe,
    callback: (candles: OHLCV[]) => void
  ): () => void {
    return this.subscribe(WS_CHANNELS.candlestick(instrument, timeframe), (data) =>
      callback(data as OHLCV[])
    )
  }

  // ==========================================================================
  // SEND UTILITIES
  // ==========================================================================

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private getNextRequestId(): number {
    return ++this.requestId
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  private setStatus(status: WebSocketStatus): void {
    this.status = status
    this.statusCallbacks.forEach((cb) => cb(status))
  }

  getStatus(): WebSocketStatus {
    return this.status
  }

  onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let wsInstance: CryptoWebSocket | null = null

export function getCryptoWebSocket(): CryptoWebSocket {
  if (!wsInstance) {
    wsInstance = new CryptoWebSocket()
  }
  return wsInstance
}

export function destroyCryptoWebSocket(): void {
  if (wsInstance) {
    wsInstance.disconnect()
    wsInstance = null
  }
}
