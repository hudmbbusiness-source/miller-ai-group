/**
 * Crypto.com Exchange API Integration
 *
 * Provides integration with Crypto.com Exchange for Stuntman AI trading bot.
 * Supports both public (market data) and private (trading) endpoints.
 */

import crypto from 'crypto'

// API Configuration - Using Exchange v1 API (the current live API)
// Note: The old /v2 Spot API was decommissioned in July 2024
const CRYPTO_COM_API_URL = 'https://api.crypto.com/exchange/v1/private'
const CRYPTO_COM_PUBLIC_API_URL = 'https://api.crypto.com/exchange/v1/public'

// Types
export interface CryptoComCredentials {
  apiKey: string
  apiSecret?: string // Required for authenticated endpoints
}

export interface Ticker {
  instrument_name: string
  last_traded_price: string
  bid_price: string
  ask_price: string
  high_price: string
  low_price: string
  volume: string
  timestamp: number
  price_change_24h: string
  price_change_percentage_24h: string
}

export interface AccountBalance {
  currency: string
  balance: string
  available: string
  order: string
  stake: string
}

export interface OrderRequest {
  instrument_name: string
  side: 'BUY' | 'SELL'
  type: 'LIMIT' | 'MARKET'
  quantity: string
  price?: string
  time_in_force?: 'GOOD_TILL_CANCEL' | 'IMMEDIATE_OR_CANCEL' | 'FILL_OR_KILL'
}

export interface Order {
  order_id: string
  client_oid?: string
  status: 'ACTIVE' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED'
  side: 'BUY' | 'SELL'
  price: string
  quantity: string
  filled_quantity: string
  avg_price: string
  instrument_name: string
  create_time: number
}

export interface Trade {
  trade_id: string
  order_id: string
  instrument_name: string
  side: 'BUY' | 'SELL'
  price: string
  quantity: string
  fee: string
  fee_currency: string
  create_time: number
}

// Market Data (Public - No Auth Required)
export interface MarketData {
  ticker: Ticker | null
  orderbook: {
    bids: Array<{ price: string; quantity: string }>
    asks: Array<{ price: string; quantity: string }>
  } | null
  recentTrades: Array<{
    price: string
    quantity: string
    side: 'BUY' | 'SELL'
    timestamp: number
  }>
}

/**
 * Crypto.com Exchange API Client
 */
export class CryptoComClient {
  private apiKey: string
  private apiSecret?: string

  constructor(credentials: CryptoComCredentials) {
    this.apiKey = credentials.apiKey
    this.apiSecret = credentials.apiSecret
  }

  /**
   * Convert params object to sorted string format required by Crypto.com
   * Keys are sorted alphabetically, values are concatenated without delimiters
   * Handles nested objects and arrays up to 3 levels deep
   */
  private paramsToString(obj: Record<string, unknown>, level: number = 0): string {
    if (level >= 3) {
      return String(obj)
    }

    if (!obj || typeof obj !== 'object') {
      return ''
    }

    const keys = Object.keys(obj).sort()
    let result = ''

    for (const key of keys) {
      const value = obj[key]
      result += key

      if (value === null || value === undefined) {
        result += 'null'
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            result += this.paramsToString(item as Record<string, unknown>, level + 1)
          } else {
            result += String(item)
          }
        }
      } else if (typeof value === 'object') {
        result += this.paramsToString(value as Record<string, unknown>, level + 1)
      } else {
        result += String(value)
      }
    }

    return result
  }

  /**
   * Generate request signature for authenticated endpoints
   * Uses Crypto.com's required format: method + id + api_key + sorted_params + nonce
   */
  private generateSignature(
    method: string,
    requestId: string,
    apiKey: string,
    params: Record<string, unknown>,
    nonce: number
  ): string {
    if (!this.apiSecret) {
      throw new Error('API secret is required for authenticated requests')
    }

    // Convert params to sorted string format (NOT JSON)
    const paramsString = params && Object.keys(params).length > 0
      ? this.paramsToString(params)
      : ''

    // Signature payload: method + id + api_key + params_string + nonce
    const sigPayload = `${method}${requestId}${apiKey}${paramsString}${nonce}`

    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(sigPayload)
      .digest('hex')
  }

  /**
   * Make authenticated request
   */
  private async authenticatedRequest<T>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.apiSecret) {
      throw new Error('API secret is required for authenticated requests. Please configure STUNTMAN_CRYPTO_SECRET in environment.')
    }

    const requestId = `stuntman_${Date.now()}`
    const nonce = Date.now()
    const signature = this.generateSignature(method, requestId, this.apiKey, params, nonce)

    const body = {
      id: requestId,
      method,
      api_key: this.apiKey,
      params,
      sig: signature,
      nonce,
    }

    const response = await fetch(CRYPTO_COM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.code !== 0) {
      throw new Error(`Crypto.com API Error: ${data.message || 'Unknown error'}`)
    }

    return data.result as T
  }

  // ===== PUBLIC ENDPOINTS (No Auth Required) =====

  /**
   * Get ticker data for an instrument
   */
  async getTicker(instrumentName: string): Promise<Ticker | null> {
    try {
      const response = await fetch(
        `${CRYPTO_COM_PUBLIC_API_URL}/get-tickers?instrument_name=${instrumentName}`
      )
      const data = await response.json()

      if (data.code === 0 && data.result?.data?.[0]) {
        const t = data.result.data[0]
        return {
          instrument_name: t.i,
          last_traded_price: t.a,
          bid_price: t.b,
          ask_price: t.k,
          high_price: t.h,
          low_price: t.l,
          volume: t.v,
          timestamp: t.t,
          price_change_24h: String(parseFloat(t.a) * parseFloat(t.c)),
          price_change_percentage_24h: String(parseFloat(t.c) * 100),
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching ticker:', error)
      return null
    }
  }

  /**
   * Get all tickers
   */
  async getAllTickers(): Promise<Ticker[]> {
    try {
      const response = await fetch(`${CRYPTO_COM_PUBLIC_API_URL}/get-tickers`)
      const data = await response.json()

      if (data.code === 0 && data.result?.data) {
        return data.result.data.map((t: any) => ({
          instrument_name: t.i,
          last_traded_price: t.a,
          bid_price: t.b,
          ask_price: t.k,
          high_price: t.h,
          low_price: t.l,
          volume: t.v,
          timestamp: t.t,
          price_change_24h: String(parseFloat(t.a) * parseFloat(t.c)),
          price_change_percentage_24h: String(parseFloat(t.c) * 100),
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching all tickers:', error)
      return []
    }
  }

  /**
   * Get order book for an instrument
   */
  async getOrderBook(instrumentName: string, depth: number = 10): Promise<{
    bids: Array<{ price: string; quantity: string }>
    asks: Array<{ price: string; quantity: string }>
  } | null> {
    try {
      const response = await fetch(
        `${CRYPTO_COM_PUBLIC_API_URL}/get-book?instrument_name=${instrumentName}&depth=${depth}`
      )
      const data = await response.json()

      if (data.code === 0 && data.result?.data?.[0]) {
        const book = data.result.data[0]
        return {
          bids: (book.bids || []).map((b: [string, string, number]) => ({ price: b[0], quantity: b[1] })),
          asks: (book.asks || []).map((a: [string, string, number]) => ({ price: a[0], quantity: a[1] })),
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching order book:', error)
      return null
    }
  }

  /**
   * Get recent trades for an instrument
   */
  async getRecentTrades(instrumentName: string): Promise<Array<{
    price: string
    quantity: string
    side: 'BUY' | 'SELL'
    timestamp: number
  }>> {
    try {
      const response = await fetch(
        `${CRYPTO_COM_PUBLIC_API_URL}/get-trades?instrument_name=${instrumentName}`
      )
      const data = await response.json()

      if (data.code === 0 && data.result?.data) {
        return data.result.data.map((trade: { p: string; q: string; s: string; t: number; d: string }) => ({
          price: trade.p,
          quantity: trade.q,
          side: trade.s as 'BUY' | 'SELL',
          timestamp: trade.t,
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching recent trades:', error)
      return []
    }
  }

  /**
   * Get comprehensive market data for an instrument
   */
  async getMarketData(instrumentName: string): Promise<MarketData> {
    const [ticker, orderbook, recentTrades] = await Promise.all([
      this.getTicker(instrumentName),
      this.getOrderBook(instrumentName),
      this.getRecentTrades(instrumentName),
    ])

    return {
      ticker,
      orderbook,
      recentTrades,
    }
  }

  // ===== PRIVATE ENDPOINTS (Auth Required) =====

  /**
   * Get account balances
   */
  async getAccountBalance(): Promise<AccountBalance[]> {
    const result = await this.authenticatedRequest<{ account_list: AccountBalance[] }>(
      'private/get-account-summary'
    )
    return result.account_list || []
  }

  /**
   * Create a new order
   */
  async createOrder(order: OrderRequest): Promise<Order> {
    const result = await this.authenticatedRequest<{ order_info: Order }>(
      'private/create-order',
      {
        instrument_name: order.instrument_name,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        time_in_force: order.time_in_force || 'GOOD_TILL_CANCEL',
      }
    )
    return result.order_info
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, instrumentName: string): Promise<void> {
    await this.authenticatedRequest('private/cancel-order', {
      order_id: orderId,
      instrument_name: instrumentName,
    })
  }

  /**
   * Get open orders
   */
  async getOpenOrders(instrumentName?: string): Promise<Order[]> {
    const params: Record<string, unknown> = {}
    if (instrumentName) {
      params.instrument_name = instrumentName
    }

    const result = await this.authenticatedRequest<{ order_list: Order[] }>(
      'private/get-open-orders',
      params
    )
    return result.order_list || []
  }

  /**
   * Get order history
   */
  async getOrderHistory(instrumentName?: string, pageSize: number = 20): Promise<Order[]> {
    const params: Record<string, unknown> = { page_size: pageSize }
    if (instrumentName) {
      params.instrument_name = instrumentName
    }

    const result = await this.authenticatedRequest<{ order_list: Order[] }>(
      'private/get-order-history',
      params
    )
    return result.order_list || []
  }

  /**
   * Get trade history
   */
  async getTradeHistory(instrumentName?: string, pageSize: number = 20): Promise<Trade[]> {
    const params: Record<string, unknown> = { page_size: pageSize }
    if (instrumentName) {
      params.instrument_name = instrumentName
    }

    const result = await this.authenticatedRequest<{ trade_list: Trade[] }>(
      'private/get-trades',
      params
    )
    return result.trade_list || []
  }

  /**
   * Check if client is configured for authenticated requests
   */
  canAuthenticate(): boolean {
    return !!this.apiSecret
  }
}

/**
 * Create a Crypto.com client instance from environment variables
 * API key is optional for public endpoints (market data)
 */
export function createCryptoComClient(): CryptoComClient {
  const apiKey = process.env.STUNTMAN_CRYPTO_API_KEY || ''
  const apiSecret = process.env.STUNTMAN_CRYPTO_SECRET

  return new CryptoComClient({
    apiKey,
    apiSecret,
  })
}

/**
 * Get supported trading pairs for Stuntman
 */
export const STUNTMAN_TRADING_PAIRS = [
  'BTC_USDT',
  'ETH_USDT',
  'SOL_USDT',
  'BNB_USDT',
  'XRP_USDT',
  'DOGE_USDT',
  'ADA_USDT',
  'AVAX_USDT',
  'DOT_USDT',
  'MATIC_USDT',
]
