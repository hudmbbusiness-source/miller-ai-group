/**
 * Crypto.com Exchange API Integration
 *
 * Provides integration with Crypto.com Exchange for Stuntman AI trading bot.
 * Supports both public (market data) and private (trading) endpoints.
 *
 * Features:
 * - Exponential backoff with retry for failed requests
 * - Request caching to prevent stale data
 * - Connection health tracking
 * - Automatic reconnection on failures
 */

import crypto from 'crypto'

// API Configuration - Using Exchange v1 API (the current live API)
// Note: The old /v2 Spot API was decommissioned in July 2024
// URL format: https://api.crypto.com/exchange/v1/{method}
const CRYPTO_COM_API_BASE = 'https://api.crypto.com/exchange/v1'
const CRYPTO_COM_PUBLIC_API_URL = 'https://api.crypto.com/exchange/v1/public'

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

// Cache configuration
const CACHE_CONFIG = {
  tickerTTL: 5000,      // 5 seconds for ticker data
  balanceTTL: 10000,    // 10 seconds for balance data
  orderBookTTL: 2000,   // 2 seconds for order book
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return entry.data
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl })
}

// Connection health tracking
interface ConnectionHealth {
  lastSuccessfulRequest: number
  consecutiveFailures: number
  isHealthy: boolean
}

const connectionHealth: ConnectionHealth = {
  lastSuccessfulRequest: Date.now(),
  consecutiveFailures: 0,
  isHealthy: true,
}

export function getConnectionHealth(): ConnectionHealth {
  return { ...connectionHealth }
}

// Sleep utility for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

// Fetch with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // Update health on success
      connectionHealth.lastSuccessfulRequest = Date.now()
      connectionHealth.consecutiveFailures = 0
      connectionHealth.isHealthy = true

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Update health on failure
      connectionHealth.consecutiveFailures++
      if (connectionHealth.consecutiveFailures >= 3) {
        connectionHealth.isHealthy = false
      }

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        console.warn(`Request timeout (attempt ${attempt + 1}/${retries + 1}): ${url}`)
      } else {
        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}`)
      }

      // If we have more retries, wait with exponential backoff
      if (attempt < retries) {
        const delay = getRetryDelay(attempt)
        console.log(`Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Request failed after all retries')
}

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
    requestId: number,
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
   * Make authenticated request to Crypto.com Exchange API v1
   * URL format: POST https://api.crypto.com/exchange/v1/{method}
   * Includes exponential backoff retry on failure
   */
  private async authenticatedRequest<T>(
    method: string,
    params: Record<string, unknown> = {},
    useCache: boolean = false,
    cacheTTL: number = CACHE_CONFIG.balanceTTL
  ): Promise<T> {
    // Check cache first if enabled
    if (useCache) {
      const cacheKey = `auth:${method}:${JSON.stringify(params)}`
      const cached = getCached<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    if (!this.apiSecret) {
      throw new Error('API secret is required for authenticated requests. Please configure STUNTMAN_CRYPTO_SECRET in environment.')
    }

    // ID must be a numeric value (long integer)
    const requestId = Date.now()
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

    // URL includes the method path
    const url = `${CRYPTO_COM_API_BASE}/${method}`

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.code !== 0) {
      throw new Error(`Crypto.com API Error: ${data.message || 'Unknown error'} (code: ${data.code})`)
    }

    const result = data.result as T

    // Cache the result if enabled
    if (useCache) {
      const cacheKey = `auth:${method}:${JSON.stringify(params)}`
      setCache(cacheKey, result, cacheTTL)
    }

    return result
  }

  // ===== PUBLIC ENDPOINTS (No Auth Required) =====

  /**
   * Get ticker data for an instrument
   * Uses caching and retry mechanism
   */
  async getTicker(instrumentName: string, skipCache: boolean = false): Promise<Ticker | null> {
    const cacheKey = `ticker:${instrumentName}`

    // Check cache first
    if (!skipCache) {
      const cached = getCached<Ticker>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    try {
      const response = await fetchWithRetry(
        `${CRYPTO_COM_PUBLIC_API_URL}/get-tickers?instrument_name=${instrumentName}`
      )
      const data = await response.json()

      if (data.code === 0 && data.result?.data?.[0]) {
        const t = data.result.data[0]
        const ticker: Ticker = {
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

        // Cache the result
        setCache(cacheKey, ticker, CACHE_CONFIG.tickerTTL)
        return ticker
      }
      return null
    } catch (error) {
      console.error('Error fetching ticker:', error)
      // Return stale cache on error if available
      const staleCache = cache.get(cacheKey) as CacheEntry<Ticker> | undefined
      if (staleCache) {
        console.warn('Returning stale ticker data due to fetch error')
        return staleCache.data
      }
      return null
    }
  }

  /**
   * Get all tickers
   * Uses caching and retry mechanism
   */
  async getAllTickers(skipCache: boolean = false): Promise<Ticker[]> {
    const cacheKey = 'tickers:all'

    // Check cache first
    if (!skipCache) {
      const cached = getCached<Ticker[]>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    try {
      const response = await fetchWithRetry(`${CRYPTO_COM_PUBLIC_API_URL}/get-tickers`)
      const data = await response.json()

      if (data.code === 0 && data.result?.data) {
        const tickers = data.result.data.map((t: any) => ({
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

        // Cache the result
        setCache(cacheKey, tickers, CACHE_CONFIG.tickerTTL)
        return tickers
      }
      return []
    } catch (error) {
      console.error('Error fetching all tickers:', error)
      // Return stale cache on error if available
      const staleCache = cache.get(cacheKey) as CacheEntry<Ticker[]> | undefined
      if (staleCache) {
        console.warn('Returning stale tickers data due to fetch error')
        return staleCache.data
      }
      return []
    }
  }

  /**
   * Get order book for an instrument
   * Uses caching and retry mechanism
   */
  async getOrderBook(instrumentName: string, depth: number = 10, skipCache: boolean = false): Promise<{
    bids: Array<{ price: string; quantity: string }>
    asks: Array<{ price: string; quantity: string }>
  } | null> {
    const cacheKey = `orderbook:${instrumentName}:${depth}`

    // Check cache first
    if (!skipCache) {
      const cached = getCached<{ bids: Array<{ price: string; quantity: string }>; asks: Array<{ price: string; quantity: string }> }>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    try {
      const response = await fetchWithRetry(
        `${CRYPTO_COM_PUBLIC_API_URL}/get-book?instrument_name=${instrumentName}&depth=${depth}`
      )
      const data = await response.json()

      if (data.code === 0 && data.result?.data?.[0]) {
        const book = data.result.data[0]
        const orderBook = {
          bids: (book.bids || []).map((b: [string, string, number]) => ({ price: b[0], quantity: b[1] })),
          asks: (book.asks || []).map((a: [string, string, number]) => ({ price: a[0], quantity: a[1] })),
        }

        // Cache the result
        setCache(cacheKey, orderBook, CACHE_CONFIG.orderBookTTL)
        return orderBook
      }
      return null
    } catch (error) {
      console.error('Error fetching order book:', error)
      return null
    }
  }

  /**
   * Get recent trades for an instrument
   * Uses retry mechanism
   */
  async getRecentTrades(instrumentName: string): Promise<Array<{
    price: string
    quantity: string
    side: 'BUY' | 'SELL'
    timestamp: number
  }>> {
    try {
      const response = await fetchWithRetry(
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
   * Uses private/user-balance endpoint (Exchange API v1)
   * Includes caching to reduce API calls
   */
  async getAccountBalance(skipCache: boolean = false): Promise<AccountBalance[]> {
    const result = await this.authenticatedRequest<{
      data: Array<{
        currency: string
        balance: string
        available: string
        order: string
        stake: string
      }>
    }>('private/user-balance', {}, !skipCache, CACHE_CONFIG.balanceTTL)
    return result.data || []
  }

  /**
   * Force refresh account balance (bypasses cache)
   */
  async refreshAccountBalance(): Promise<AccountBalance[]> {
    return this.getAccountBalance(true)
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    cache.clear()
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
