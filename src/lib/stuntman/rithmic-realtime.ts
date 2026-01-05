/**
 * RITHMIC REAL-TIME MARKET DATA CLIENT
 *
 * Connects to Rithmic R|Protocol API for real-time ES futures data.
 * Uses WebSocket + Protocol Buffers (same protocol as async_rithmic Python library).
 *
 * Credentials from .env.local:
 * - RITHMIC_USER_ID
 * - RITHMIC_PASSWORD
 * - RITHMIC_SYSTEM_NAME
 */

import protobuf from 'protobufjs'

// ============================================================================
// CONFIG
// ============================================================================

const RITHMIC_CONFIG = {
  // Ticker Plant for market data
  TICKER_PLANT: {
    demo: 'wss://rituz00100.rithmic.com:443',
    live: 'wss://rituz00100.rithmic.com:443'
  },
  // Template IDs
  TEMPLATES: {
    REQUEST_LOGIN: 10,
    RESPONSE_LOGIN: 11,
    REQUEST_HEARTBEAT: 18,
    RESPONSE_HEARTBEAT: 19,
    REQUEST_MARKET_DATA_UPDATE: 100,
    LAST_TRADE: 150,
    BEST_BID_OFFER: 151,
    REQUEST_SUBSCRIBE_FOR_SYMBOL: 102,
  },
  // Update bits for market data subscription
  UPDATE_BITS: {
    LAST_TRADE: 1,
    BBO: 2,
    HIGH_LOW: 32,
    VOLUME: 8,
  }
}

// ============================================================================
// PROTOCOL BUFFER DEFINITIONS
// Based on async_rithmic Python library
// ============================================================================

// Define message types using protobufjs
const rithmicProto = protobuf.Root.fromJSON({
  nested: {
    rithmic: {
      nested: {
        // Request Login
        RequestLogin: {
          fields: {
            templateId: { type: 'int32', id: 131811 },
            templateVersion: { type: 'string', id: 128418 },
            user: { type: 'string', id: 134971 },
            password: { type: 'string', id: 130516 },
            appName: { type: 'string', id: 130514 },
            appVersion: { type: 'string', id: 134619 },
            systemName: { type: 'string', id: 128412 },
            infraType: { type: 'int32', id: 128405 }
          }
        },
        // Response Login
        ResponseLogin: {
          fields: {
            templateId: { type: 'int32', id: 131811 },
            rpCode: { type: 'string', id: 132448 },
            fcmId: { type: 'string', id: 131764 },
            ibId: { type: 'string', id: 131765 },
            uniqueUserId: { type: 'string', id: 131766 }
          }
        },
        // Request Market Data Update
        RequestMarketDataUpdate: {
          fields: {
            templateId: { type: 'int32', id: 154915 },
            symbol: { type: 'string', id: 111764 },
            exchange: { type: 'string', id: 111765 },
            request: { type: 'int32', id: 140576 },
            updateBits: { type: 'uint32', id: 154819 }
          }
        },
        // Last Trade (market data response)
        LastTrade: {
          fields: {
            templateId: { type: 'int32', id: 125667 },
            symbol: { type: 'string', id: 111764 },
            exchange: { type: 'string', id: 111765 },
            tradePrice: { type: 'double', id: 111654 },
            tradeSize: { type: 'int32', id: 111826 },
            volume: { type: 'uint64', id: 111808 },
            netChange: { type: 'double', id: 111659 },
            percentChange: { type: 'double', id: 111832 },
            vwap: { type: 'double', id: 112771 },
            tradeTime: { type: 'string', id: 111771 }
          }
        },
        // Best Bid/Offer
        BestBidOffer: {
          fields: {
            templateId: { type: 'int32', id: 125668 },
            symbol: { type: 'string', id: 111764 },
            exchange: { type: 'string', id: 111765 },
            bidPrice: { type: 'double', id: 111656 },
            bidSize: { type: 'int32', id: 111820 },
            askPrice: { type: 'double', id: 111657 },
            askSize: { type: 'int32', id: 111821 }
          }
        },
        // Heartbeat
        RequestHeartbeat: {
          fields: {
            templateId: { type: 'int32', id: 131811 }
          }
        }
      }
    }
  }
})

// ============================================================================
// TYPES
// ============================================================================

export interface RithmicQuote {
  symbol: string
  exchange: string
  lastPrice: number
  bidPrice: number
  askPrice: number
  bidSize: number
  askSize: number
  volume: number
  netChange: number
  percentChange: number
  vwap: number
  timestamp: number
}

export interface RithmicConnectionState {
  connected: boolean
  authenticated: boolean
  subscribedSymbols: string[]
  lastHeartbeat: number
  error: string | null
}

// ============================================================================
// RITHMIC REAL-TIME CLIENT
// ============================================================================

class RithmicRealtimeClient {
  private ws: WebSocket | null = null
  private state: RithmicConnectionState = {
    connected: false,
    authenticated: false,
    subscribedSymbols: [],
    lastHeartbeat: 0,
    error: null
  }
  private quotes: Map<string, RithmicQuote> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private onQuoteCallbacks: ((quote: RithmicQuote) => void)[] = []

  // Message types
  private RequestLogin = rithmicProto.lookupType('rithmic.RequestLogin')
  private ResponseLogin = rithmicProto.lookupType('rithmic.ResponseLogin')
  private RequestMarketDataUpdate = rithmicProto.lookupType('rithmic.RequestMarketDataUpdate')
  private LastTrade = rithmicProto.lookupType('rithmic.LastTrade')
  private BestBidOffer = rithmicProto.lookupType('rithmic.BestBidOffer')
  private RequestHeartbeat = rithmicProto.lookupType('rithmic.RequestHeartbeat')

  /**
   * Connect to Rithmic ticker plant
   */
  async connect(): Promise<boolean> {
    const userId = process.env.RITHMIC_USER_ID
    const password = process.env.RITHMIC_PASSWORD
    const systemName = process.env.RITHMIC_SYSTEM_NAME || 'Apex'

    if (!userId || !password) {
      this.state.error = 'Missing RITHMIC_USER_ID or RITHMIC_PASSWORD in environment'
      console.error('[Rithmic]', this.state.error)
      return false
    }

    return new Promise((resolve) => {
      try {
        const wsUrl = RITHMIC_CONFIG.TICKER_PLANT.demo
        console.log('[Rithmic] Connecting to:', wsUrl)

        // Note: In browser/serverless, we'd use native WebSocket
        // For Node.js, we'd use 'ws' package
        // This is a simplified implementation

        if (typeof WebSocket !== 'undefined') {
          this.ws = new WebSocket(wsUrl)
        } else {
          // Server-side: would need 'ws' package
          this.state.error = 'WebSocket not available in this environment'
          console.error('[Rithmic]', this.state.error)
          resolve(false)
          return
        }

        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => {
          console.log('[Rithmic] WebSocket connected, sending login...')
          this.state.connected = true
          this.sendLogin(userId, password, systemName)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[Rithmic] WebSocket error:', error)
          this.state.error = 'WebSocket error'
          resolve(false)
        }

        this.ws.onclose = () => {
          console.log('[Rithmic] WebSocket closed')
          this.state.connected = false
          this.state.authenticated = false
          this.stopHeartbeat()
        }

        // Give time for authentication
        setTimeout(() => {
          resolve(this.state.authenticated)
        }, 5000)

      } catch (error) {
        console.error('[Rithmic] Connection error:', error)
        this.state.error = error instanceof Error ? error.message : 'Connection failed'
        resolve(false)
      }
    })
  }

  /**
   * Send login request
   */
  private sendLogin(userId: string, password: string, systemName: string): void {
    const loginMsg = this.RequestLogin.create({
      templateId: RITHMIC_CONFIG.TEMPLATES.REQUEST_LOGIN,
      templateVersion: '1.0',
      user: userId,
      password: password,
      appName: 'StuntMan',
      appVersion: '1.0',
      systemName: systemName,
      infraType: 1 // TICKER_PLANT
    })

    const buffer = this.RequestLogin.encode(loginMsg).finish()
    this.sendMessage(buffer)
    console.log('[Rithmic] Login request sent')
  }

  /**
   * Subscribe to market data for a symbol
   */
  subscribeSymbol(symbol: string, exchange: string = 'CME'): void {
    if (!this.state.authenticated) {
      console.error('[Rithmic] Not authenticated, cannot subscribe')
      return
    }

    const subscribeMsg = this.RequestMarketDataUpdate.create({
      templateId: RITHMIC_CONFIG.TEMPLATES.REQUEST_MARKET_DATA_UPDATE,
      symbol: symbol,
      exchange: exchange,
      request: 1, // SUBSCRIBE
      updateBits: RITHMIC_CONFIG.UPDATE_BITS.LAST_TRADE |
                  RITHMIC_CONFIG.UPDATE_BITS.BBO |
                  RITHMIC_CONFIG.UPDATE_BITS.VOLUME
    })

    const buffer = this.RequestMarketDataUpdate.encode(subscribeMsg).finish()
    this.sendMessage(buffer)
    this.state.subscribedSymbols.push(symbol)
    console.log('[Rithmic] Subscribed to:', symbol)
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: ArrayBuffer): void {
    try {
      const bytes = new Uint8Array(data)

      // Try to decode as different message types
      // First 4 bytes typically contain message length, template ID is in the message

      // Try LastTrade
      try {
        const lastTrade = this.LastTrade.decode(bytes) as any
        if (lastTrade.tradePrice) {
          this.updateQuote(lastTrade.symbol, {
            lastPrice: lastTrade.tradePrice,
            volume: Number(lastTrade.volume) || 0,
            netChange: lastTrade.netChange || 0,
            percentChange: lastTrade.percentChange || 0,
            vwap: lastTrade.vwap || 0
          })
          return
        }
      } catch {}

      // Try BestBidOffer
      try {
        const bbo = this.BestBidOffer.decode(bytes) as any
        if (bbo.bidPrice || bbo.askPrice) {
          this.updateQuote(bbo.symbol, {
            bidPrice: bbo.bidPrice || 0,
            askPrice: bbo.askPrice || 0,
            bidSize: bbo.bidSize || 0,
            askSize: bbo.askSize || 0
          })
          return
        }
      } catch {}

      // Try ResponseLogin
      try {
        const loginResp = this.ResponseLogin.decode(bytes) as any
        if (loginResp.rpCode === '0') {
          console.log('[Rithmic] Login successful!')
          this.state.authenticated = true
          this.startHeartbeat()
        } else {
          console.error('[Rithmic] Login failed:', loginResp.rpCode)
          this.state.error = `Login failed: ${loginResp.rpCode}`
        }
        return
      } catch {}

    } catch (error) {
      // Silently ignore parse errors for unknown message types
    }
  }

  /**
   * Update quote data
   */
  private updateQuote(symbol: string, data: Partial<RithmicQuote>): void {
    const existing = this.quotes.get(symbol) || {
      symbol,
      exchange: 'CME',
      lastPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      bidSize: 0,
      askSize: 0,
      volume: 0,
      netChange: 0,
      percentChange: 0,
      vwap: 0,
      timestamp: Date.now()
    }

    const updated: RithmicQuote = {
      ...existing,
      ...data,
      timestamp: Date.now()
    }

    this.quotes.set(symbol, updated)

    // Notify callbacks
    this.onQuoteCallbacks.forEach(cb => cb(updated))
  }

  /**
   * Send message to Rithmic
   */
  private sendMessage(buffer: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Rithmic protocol: 4-byte length prefix + message
      const lengthBuffer = new ArrayBuffer(4)
      const lengthView = new DataView(lengthBuffer)
      lengthView.setUint32(0, buffer.length, true) // little-endian

      const combined = new Uint8Array(4 + buffer.length)
      combined.set(new Uint8Array(lengthBuffer), 0)
      combined.set(buffer, 4)

      this.ws.send(combined)
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = this.RequestHeartbeat.create({
        templateId: RITHMIC_CONFIG.TEMPLATES.REQUEST_HEARTBEAT
      })
      const buffer = this.RequestHeartbeat.encode(heartbeat).finish()
      this.sendMessage(buffer)
      this.state.lastHeartbeat = Date.now()
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Get current quote for symbol
   */
  getQuote(symbol: string): RithmicQuote | null {
    return this.quotes.get(symbol) || null
  }

  /**
   * Get all quotes
   */
  getAllQuotes(): RithmicQuote[] {
    return Array.from(this.quotes.values())
  }

  /**
   * Register quote callback
   */
  onQuote(callback: (quote: RithmicQuote) => void): void {
    this.onQuoteCallbacks.push(callback)
  }

  /**
   * Get connection state
   */
  getState(): RithmicConnectionState {
    return { ...this.state }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.state.connected = false
    this.state.authenticated = false
  }
}

// Export singleton
export const rithmicRealtime = new RithmicRealtimeClient()

// ============================================================================
// SIMPLIFIED INTERFACE FOR LIVE-ADAPTIVE
// ============================================================================

let rithmicInitialized = false
let lastESQuote: RithmicQuote | null = null

/**
 * Initialize Rithmic connection and subscribe to ES
 */
export async function initRithmicData(): Promise<boolean> {
  if (rithmicInitialized && rithmicRealtime.getState().authenticated) {
    return true
  }

  const connected = await rithmicRealtime.connect()
  if (connected) {
    rithmicRealtime.subscribeSymbol('ESH5', 'CME') // ES March 2025 contract
    rithmicRealtime.onQuote((quote) => {
      if (quote.symbol.startsWith('ES')) {
        lastESQuote = quote
      }
    })
    rithmicInitialized = true
    return true
  }

  return false
}

/**
 * Get current ES price from Rithmic (or null if not connected)
 */
export function getRithmicESPrice(): number | null {
  if (lastESQuote && Date.now() - lastESQuote.timestamp < 60000) {
    return lastESQuote.lastPrice
  }
  return null
}

/**
 * Get full ES quote from Rithmic
 */
export function getRithmicESQuote(): RithmicQuote | null {
  return lastESQuote
}

/**
 * Check if Rithmic is connected and providing data
 */
export function isRithmicConnected(): boolean {
  const state = rithmicRealtime.getState()
  return state.connected && state.authenticated
}
