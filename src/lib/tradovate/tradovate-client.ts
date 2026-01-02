// =============================================================================
// TRADOVATE API CLIENT - PRODUCTION GRADE
// =============================================================================
// Full-featured client for Tradovate API integration
// Supports Apex Trader Funding and other prop firms using Tradovate
// =============================================================================

import {
  TradovateClientConfig,
  TradovateCredentials,
  AccessTokenRequest,
  AccessTokenResponse,
  TokenRenewalResponse,
  TradovateAccount,
  AccountBalance,
  CashBalance,
  MarginSnapshot,
  Contract,
  Product,
  PlaceOrderRequest,
  PlaceOCORequest,
  PlaceBracketRequest,
  Order,
  OrderVersion,
  Execution,
  Fill,
  Position,
  PositionWithPnL,
  Quote,
  DOM,
  ChartData,
  ChartTimeframe,
  OHLCV,
  ConnectionHealth,
  TradovateAPIError,
  PropFirmRules,
  APEX_RULES,
  FUTURES_SPECS,
  FuturesSymbol,
} from './types'

// =============================================================================
// API ENDPOINTS
// =============================================================================

const ENDPOINTS = {
  demo: {
    api: 'https://demo.tradovateapi.com/v1',
    md: 'https://md-demo.tradovateapi.com/v1',
    ws: 'wss://demo.tradovateapi.com/v1/websocket',
    mdWs: 'wss://md-demo.tradovateapi.com/v1/websocket',
  },
  live: {
    api: 'https://live.tradovateapi.com/v1',
    md: 'https://md.tradovateapi.com/v1',
    ws: 'wss://live.tradovateapi.com/v1/websocket',
    mdWs: 'wss://md.tradovateapi.com/v1/websocket',
  },
}

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_CONFIG = {
  accountTTL: 30000,      // 30 seconds
  positionTTL: 5000,      // 5 seconds
  quoteTTL: 1000,         // 1 second
  contractTTL: 3600000,   // 1 hour
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// =============================================================================
// TRADOVATE CLIENT CLASS
// =============================================================================

export class TradovateClient {
  private config: TradovateClientConfig
  private endpoints: typeof ENDPOINTS.demo
  private accessToken: string | null = null
  private mdAccessToken: string | null = null
  private tokenExpiry: Date | null = null
  private userId: number | null = null
  private accounts: TradovateAccount[] = []
  private selectedAccountId: number | null = null

  // WebSocket connections
  private tradingWs: WebSocket | null = null
  private marketDataWs: WebSocket | null = null
  private wsRequestId = 0
  private wsCallbacks: Map<number, (data: unknown) => void> = new Map()

  // Connection health
  private health: ConnectionHealth = {
    connected: false,
    lastHeartbeat: 0,
    consecutiveFailures: 0,
    latencyMs: 0,
    tradingEnabled: false,
    marketDataEnabled: false,
  }

  // Cache
  private cache: Map<string, CacheEntry<unknown>> = new Map()

  // Event handlers
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map()

  // Heartbeat interval
  private heartbeatTimer: NodeJS.Timeout | null = null
  private tokenRefreshTimer: NodeJS.Timeout | null = null

  constructor(config: TradovateClientConfig) {
    this.config = config
    this.endpoints = config.mode === 'live' ? ENDPOINTS.live : ENDPOINTS.demo
  }

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  /**
   * Authenticate with Tradovate API
   */
  async authenticate(): Promise<boolean> {
    try {
      const request: AccessTokenRequest = {
        name: this.config.credentials.username,
        password: this.config.credentials.password,
        appId: this.config.credentials.appId,
        appVersion: this.config.credentials.appVersion,
        cid: this.config.credentials.clientId,
        sec: this.config.credentials.clientSecret,
        deviceId: this.config.credentials.deviceId,
      }

      const response = await this.fetchWithRetry<AccessTokenResponse>(
        `${this.endpoints.api}/auth/accesstokenrequest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      )

      if (response.errorText) {
        throw new TradovateAPIError(response.errorText, 'AUTH_FAILED')
      }

      this.accessToken = response.accessToken
      this.mdAccessToken = response.mdAccessToken || response.accessToken
      this.tokenExpiry = new Date(response.expirationTime)
      this.userId = response.userId

      // Set up automatic token refresh (5 minutes before expiry)
      this.scheduleTokenRefresh()

      // Load accounts
      await this.loadAccounts()

      // Connect WebSockets if enabled
      if (this.config.enableMarketData) {
        await this.connectWebSockets()
      }

      this.health.connected = true
      this.health.tradingEnabled = true

      console.log(`[Tradovate] Authenticated as ${response.name} (${this.config.mode} mode)`)
      console.log(`[Tradovate] Token expires: ${this.tokenExpiry.toISOString()}`)

      return true
    } catch (error) {
      this.health.connected = false
      this.health.consecutiveFailures++
      throw error
    }
  }

  /**
   * Refresh access token before expiry
   */
  private async refreshToken(): Promise<void> {
    if (!this.accessToken) {
      throw new TradovateAPIError('No token to refresh', 'NO_TOKEN')
    }

    try {
      const response = await this.fetchWithRetry<TokenRenewalResponse>(
        `${this.endpoints.api}/auth/renewaccesstoken`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )

      this.accessToken = response.accessToken
      this.mdAccessToken = response.mdAccessToken || response.accessToken
      this.tokenExpiry = new Date(response.expirationTime)

      this.scheduleTokenRefresh()

      console.log(`[Tradovate] Token refreshed, expires: ${this.tokenExpiry.toISOString()}`)
    } catch (error) {
      console.error('[Tradovate] Token refresh failed:', error)
      // Re-authenticate if refresh fails
      await this.authenticate()
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer)
    }

    if (!this.tokenExpiry) return

    // Refresh 5 minutes before expiry
    const refreshTime = this.tokenExpiry.getTime() - Date.now() - 5 * 60 * 1000

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(() => this.refreshToken(), refreshTime)
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.tokenExpiry && this.tokenExpiry > new Date()
  }

  // ===========================================================================
  // ACCOUNTS
  // ===========================================================================

  /**
   * Load user accounts
   */
  async loadAccounts(): Promise<TradovateAccount[]> {
    const accounts = await this.get<TradovateAccount[]>('/account/list')
    this.accounts = accounts.filter(a => a.active)

    // Select first active account if none selected
    if (!this.selectedAccountId && this.accounts.length > 0) {
      this.selectedAccountId = this.accounts[0].id
    }

    return this.accounts
  }

  /**
   * Get current selected account
   */
  getSelectedAccount(): TradovateAccount | undefined {
    return this.accounts.find(a => a.id === this.selectedAccountId)
  }

  /**
   * Select an account for trading
   */
  selectAccount(accountId: number): void {
    if (!this.accounts.find(a => a.id === accountId)) {
      throw new TradovateAPIError(`Account ${accountId} not found`, 'ACCOUNT_NOT_FOUND')
    }
    this.selectedAccountId = accountId
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId?: number): Promise<AccountBalance> {
    const id = accountId || this.selectedAccountId
    if (!id) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    return this.get<AccountBalance>(`/account/find?name=${id}`)
  }

  /**
   * Get cash balance
   */
  async getCashBalance(accountId?: number): Promise<CashBalance> {
    const id = accountId || this.selectedAccountId
    if (!id) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    const balances = await this.get<CashBalance[]>(`/cashBalance/list`)
    return balances.find(b => b.accountId === id) || balances[0]
  }

  /**
   * Get margin snapshot
   */
  async getMarginSnapshot(accountId?: number): Promise<MarginSnapshot> {
    const id = accountId || this.selectedAccountId
    if (!id) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    const snapshots = await this.get<MarginSnapshot[]>(`/marginSnapshot/list`)
    return snapshots.find(s => s.accountId === id) || snapshots[0]
  }

  // ===========================================================================
  // CONTRACTS
  // ===========================================================================

  /**
   * Find contract by symbol
   */
  async findContract(symbol: string): Promise<Contract> {
    const cacheKey = `contract:${symbol}`
    const cached = this.getFromCache<Contract>(cacheKey)
    if (cached) return cached

    const contract = await this.get<Contract>(`/contract/find?name=${symbol}`)
    this.setCache(cacheKey, contract, CACHE_CONFIG.contractTTL)

    return contract
  }

  /**
   * Get product details
   */
  async getProduct(productId: number): Promise<Product> {
    const cacheKey = `product:${productId}`
    const cached = this.getFromCache<Product>(cacheKey)
    if (cached) return cached

    const product = await this.get<Product>(`/product/item?id=${productId}`)
    this.setCache(cacheKey, product, CACHE_CONFIG.contractTTL)

    return product
  }

  /**
   * Get front month contract for a symbol
   */
  async getFrontMonthContract(symbol: FuturesSymbol): Promise<Contract> {
    // Front month contracts follow pattern: SYMYM (e.g., ESH5 for ES March 2025)
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear() % 100

    // Map months to contract codes
    const monthCodes = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z']
    const spec = FUTURES_SPECS[symbol]

    // Find next valid contract month
    let contractMonth = monthCodes[month]
    let contractYear = year

    // If current month isn't a valid contract month, find next one
    if (!spec.contractMonths.includes(contractMonth)) {
      for (let i = month + 1; i < 12; i++) {
        if (spec.contractMonths.includes(monthCodes[i])) {
          contractMonth = monthCodes[i]
          break
        }
      }
      // If no valid month found this year, use first month of next year
      if (!spec.contractMonths.includes(contractMonth)) {
        contractMonth = spec.contractMonths[0]
        contractYear = year + 1
      }
    }

    const contractSymbol = `${symbol}${contractMonth}${contractYear}`
    return this.findContract(contractSymbol)
  }

  // ===========================================================================
  // ORDERS
  // ===========================================================================

  /**
   * Place a market order
   */
  async placeMarketOrder(
    symbol: string,
    action: 'Buy' | 'Sell',
    quantity: number,
    customTag?: string
  ): Promise<Order> {
    const account = this.getSelectedAccount()
    if (!account) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    // Pre-trade risk check
    await this.checkRiskLimits(symbol, quantity, action)

    const request: PlaceOrderRequest = {
      accountSpec: account.name,
      accountId: account.id,
      action,
      symbol,
      orderQty: quantity,
      orderType: 'Market',
      isAutomated: true,
      customTag50: customTag,
    }

    return this.post<Order>('/order/placeorder', request)
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(
    symbol: string,
    action: 'Buy' | 'Sell',
    quantity: number,
    price: number,
    customTag?: string
  ): Promise<Order> {
    const account = this.getSelectedAccount()
    if (!account) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    await this.checkRiskLimits(symbol, quantity, action)

    const request: PlaceOrderRequest = {
      accountSpec: account.name,
      accountId: account.id,
      action,
      symbol,
      orderQty: quantity,
      orderType: 'Limit',
      price,
      isAutomated: true,
      customTag50: customTag,
    }

    return this.post<Order>('/order/placeorder', request)
  }

  /**
   * Place a stop order
   */
  async placeStopOrder(
    symbol: string,
    action: 'Buy' | 'Sell',
    quantity: number,
    stopPrice: number,
    customTag?: string
  ): Promise<Order> {
    const account = this.getSelectedAccount()
    if (!account) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    const request: PlaceOrderRequest = {
      accountSpec: account.name,
      accountId: account.id,
      action,
      symbol,
      orderQty: quantity,
      orderType: 'Stop',
      stopPrice,
      isAutomated: true,
      customTag50: customTag,
    }

    return this.post<Order>('/order/placeorder', request)
  }

  /**
   * Place a bracket order (entry + stop loss + take profit)
   */
  async placeBracketOrder(
    symbol: string,
    action: 'Buy' | 'Sell',
    quantity: number,
    entryPrice: number | null,  // null for market order
    stopLoss: number,
    takeProfit: number,
    customTag?: string
  ): Promise<Order> {
    const account = this.getSelectedAccount()
    if (!account) throw new TradovateAPIError('No account selected', 'NO_ACCOUNT')

    await this.checkRiskLimits(symbol, quantity, action)

    const exitAction = action === 'Buy' ? 'Sell' : 'Buy'

    const request: PlaceBracketRequest = {
      accountSpec: account.name,
      accountId: account.id,
      action,
      symbol,
      orderQty: quantity,
      orderType: entryPrice ? 'Limit' : 'Market',
      price: entryPrice || undefined,
      bracket1: {
        action: exitAction,
        orderType: 'Stop',
        stopPrice: stopLoss,
      },
      bracket2: {
        action: exitAction,
        orderType: 'Limit',
        price: takeProfit,
      },
    }

    return this.post<Order>('/order/placeorder', request)
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<{ commandId: number }> {
    return this.post<{ commandId: number }>('/order/cancelorder', { orderId })
  }

  /**
   * Modify an order
   */
  async modifyOrder(
    orderId: number,
    orderQty?: number,
    price?: number,
    stopPrice?: number
  ): Promise<Order> {
    return this.post<Order>('/order/modifyorder', {
      orderId,
      orderQty,
      price,
      stopPrice,
    })
  }

  /**
   * Get all open orders
   */
  async getOpenOrders(accountId?: number): Promise<Order[]> {
    const id = accountId || this.selectedAccountId
    const orders = await this.get<Order[]>('/order/list')
    return orders.filter(o =>
      o.accountId === id &&
      ['Working', 'Submitted', 'PendingSubmit'].includes(o.ordStatus)
    )
  }

  /**
   * Get order history
   */
  async getOrderHistory(accountId?: number, limit = 50): Promise<Order[]> {
    const id = accountId || this.selectedAccountId
    const orders = await this.get<Order[]>('/order/list')
    return orders
      .filter(o => o.accountId === id)
      .slice(0, limit)
  }

  /**
   * Get fills for an order
   */
  async getOrderFills(orderId: number): Promise<Fill[]> {
    return this.get<Fill[]>(`/fill/list?orderId=${orderId}`)
  }

  // ===========================================================================
  // POSITIONS
  // ===========================================================================

  /**
   * Get all positions
   */
  async getPositions(accountId?: number): Promise<Position[]> {
    const id = accountId || this.selectedAccountId
    const cacheKey = `positions:${id}`

    // Check cache
    const cached = this.getFromCache<Position[]>(cacheKey)
    if (cached) return cached

    const positions = await this.get<Position[]>('/position/list')
    const filtered = positions.filter(p => p.accountId === id && p.netPos !== 0)

    this.setCache(cacheKey, filtered, CACHE_CONFIG.positionTTL)
    return filtered
  }

  /**
   * Get positions with P&L
   */
  async getPositionsWithPnL(accountId?: number): Promise<PositionWithPnL[]> {
    const positions = await this.getPositions(accountId)
    const positionsWithPnL: PositionWithPnL[] = []

    for (const position of positions) {
      // Get current price
      const contract = await this.get<Contract>(`/contract/item?id=${position.contractId}`)
      const quote = await this.getQuote(contract.name)

      const currentPrice = quote?.entries?.[0]?.price || position.netPrice || 0
      const pointValue = this.getPointValue(contract.name)

      const unrealizedPnL = position.netPos * (currentPrice - (position.netPrice || 0)) * pointValue
      const realizedPnL = position.soldValue - position.boughtValue

      positionsWithPnL.push({
        ...position,
        currentPrice,
        unrealizedPnL,
        realizedPnL,
        totalPnL: unrealizedPnL + realizedPnL,
        marginUsed: Math.abs(position.netPos) * this.getMarginRequired(contract.name),
      })
    }

    return positionsWithPnL
  }

  /**
   * Close a position
   */
  async closePosition(contractId: number): Promise<Order> {
    const positions = await this.getPositions()
    const position = positions.find(p => p.contractId === contractId)

    if (!position || position.netPos === 0) {
      throw new TradovateAPIError('No position to close', 'NO_POSITION')
    }

    const contract = await this.get<Contract>(`/contract/item?id=${contractId}`)
    const action = position.netPos > 0 ? 'Sell' : 'Buy'
    const quantity = Math.abs(position.netPos)

    return this.placeMarketOrder(contract.name, action, quantity, 'POSITION_CLOSE')
  }

  /**
   * Liquidate all positions
   */
  async liquidateAll(): Promise<Order[]> {
    const positions = await this.getPositions()
    const orders: Order[] = []

    for (const position of positions) {
      if (position.netPos !== 0) {
        const order = await this.closePosition(position.contractId)
        orders.push(order)
      }
    }

    return orders
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  /**
   * Get quote for a symbol
   */
  async getQuote(symbol: string): Promise<Quote | null> {
    const cacheKey = `quote:${symbol}`
    const cached = this.getFromCache<Quote>(cacheKey)
    if (cached) return cached

    try {
      const contract = await this.findContract(symbol)
      const quote = await this.getMD<Quote>(`/md/getquote?contractId=${contract.id}`)
      this.setCache(cacheKey, quote, CACHE_CONFIG.quoteTTL)
      return quote
    } catch {
      return null
    }
  }

  /**
   * Get DOM (Depth of Market)
   */
  async getDOM(symbol: string): Promise<DOM | null> {
    try {
      const contract = await this.findContract(symbol)
      return this.getMD<DOM>(`/md/getdom?contractId=${contract.id}`)
    } catch {
      return null
    }
  }

  /**
   * Get historical bars
   */
  async getHistoricalBars(
    symbol: string,
    timeframe: ChartTimeframe,
    startDate: Date,
    endDate?: Date
  ): Promise<OHLCV[]> {
    const contract = await this.findContract(symbol)
    const end = endDate || new Date()

    const response = await this.getMD<ChartData>(
      `/md/getchart?contractId=${contract.id}` +
      `&chartDescription=${encodeURIComponent(JSON.stringify({
        underlyingType: 'Tick',
        elementSize: this.timeframeToTicks(timeframe),
        elementSizeUnit: 'UnderlyingUnits',
        withHistogram: false,
      }))}` +
      `&timeRange=${encodeURIComponent(JSON.stringify({
        asFarAsTimestamp: startDate.toISOString(),
        closestTimestamp: end.toISOString(),
      }))}`
    )

    return response.bars || []
  }

  /**
   * Subscribe to real-time quotes
   */
  subscribeQuotes(symbol: string, callback: (quote: Quote) => void): () => void {
    return this.subscribe('md/quote', symbol, callback)
  }

  /**
   * Subscribe to real-time DOM
   */
  subscribeDOM(symbol: string, callback: (dom: DOM) => void): () => void {
    return this.subscribe('md/dom', symbol, callback)
  }

  // ===========================================================================
  // RISK MANAGEMENT
  // ===========================================================================

  /**
   * Check risk limits before placing an order
   */
  async checkRiskLimits(symbol: string, quantity: number, action: 'Buy' | 'Sell'): Promise<void> {
    const rules = this.config.propFirmRules || APEX_RULES

    // Check max position size
    if (quantity > rules.maxPositionSize) {
      throw new TradovateAPIError(
        `Order quantity ${quantity} exceeds max position size ${rules.maxPositionSize}`,
        'RISK_LIMIT_EXCEEDED'
      )
    }

    // Check allowed instruments
    const baseSymbol = symbol.replace(/[A-Z]\d+$/, '') // Remove contract month/year
    if (rules.allowedInstruments.length > 0 && !rules.allowedInstruments.includes(baseSymbol)) {
      throw new TradovateAPIError(
        `Instrument ${baseSymbol} not in allowed list`,
        'INSTRUMENT_NOT_ALLOWED'
      )
    }

    // Check daily loss
    const marginSnapshot = await this.getMarginSnapshot()
    const dailyPnL = marginSnapshot.netLiq - marginSnapshot.cashValue

    if (dailyPnL <= rules.maxDailyLoss) {
      throw new TradovateAPIError(
        `Daily loss limit reached: ${dailyPnL.toFixed(2)}`,
        'DAILY_LOSS_LIMIT'
      )
    }

    // Check drawdown
    // TODO: Implement trailing drawdown tracking

    // Check position correlation
    const positions = await this.getPositions()
    if (positions.length >= rules.scalingPlan[0].maxContracts) {
      // Check if we can scale up based on profit
      const cashBalance = await this.getCashBalance()
      const profit = cashBalance.realizedPnL

      let allowedContracts = rules.scalingPlan[0].maxContracts
      for (const level of rules.scalingPlan) {
        if (profit >= level.profitLevel) {
          allowedContracts = level.maxContracts
        }
      }

      const totalPosition = positions.reduce((sum, p) => sum + Math.abs(p.netPos), 0)
      if (totalPosition + quantity > allowedContracts) {
        throw new TradovateAPIError(
          `Total position ${totalPosition + quantity} would exceed allowed ${allowedContracts} contracts`,
          'POSITION_LIMIT_EXCEEDED'
        )
      }
    }
  }

  /**
   * Get current daily P&L
   */
  async getDailyPnL(): Promise<number> {
    const cashBalance = await this.getCashBalance()
    return cashBalance.realizedPnL
  }

  /**
   * Get current drawdown
   */
  async getDrawdown(): Promise<{ current: number; max: number; percent: number }> {
    const marginSnapshot = await this.getMarginSnapshot()
    const cashBalance = await this.getCashBalance()

    const peak = cashBalance.amount  // Starting balance
    const current = marginSnapshot.netLiq
    const drawdown = peak - current
    const percent = (drawdown / peak) * 100

    return { current: drawdown, max: drawdown, percent }
  }

  // ===========================================================================
  // WEBSOCKET
  // ===========================================================================

  /**
   * Connect to WebSocket endpoints
   */
  async connectWebSockets(): Promise<void> {
    await Promise.all([
      this.connectTradingWs(),
      this.connectMarketDataWs(),
    ])

    this.startHeartbeat()
  }

  private async connectTradingWs(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tradingWs = new WebSocket(this.endpoints.ws)

      this.tradingWs.onopen = () => {
        // Authenticate
        this.sendWs(this.tradingWs!, {
          op: 'authorize',
          url: '',
          body: { token: this.accessToken },
        })
        this.health.tradingEnabled = true
        resolve()
      }

      this.tradingWs.onmessage = (event) => {
        this.handleWsMessage(event.data, 'trading')
      }

      this.tradingWs.onerror = (error) => {
        console.error('[Tradovate] Trading WS error:', error)
        this.health.tradingEnabled = false
        reject(error)
      }

      this.tradingWs.onclose = () => {
        this.health.tradingEnabled = false
        if (this.config.autoReconnect) {
          setTimeout(() => this.connectTradingWs(), 5000)
        }
      }
    })
  }

  private async connectMarketDataWs(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.marketDataWs = new WebSocket(this.endpoints.mdWs)

      this.marketDataWs.onopen = () => {
        // Authenticate
        this.sendWs(this.marketDataWs!, {
          op: 'authorize',
          url: '',
          body: { token: this.mdAccessToken },
        })
        this.health.marketDataEnabled = true
        resolve()
      }

      this.marketDataWs.onmessage = (event) => {
        this.handleWsMessage(event.data, 'marketData')
      }

      this.marketDataWs.onerror = (error) => {
        console.error('[Tradovate] Market Data WS error:', error)
        this.health.marketDataEnabled = false
        reject(error)
      }

      this.marketDataWs.onclose = () => {
        this.health.marketDataEnabled = false
        if (this.config.autoReconnect) {
          setTimeout(() => this.connectMarketDataWs(), 5000)
        }
      }
    })
  }

  private sendWs(ws: WebSocket, request: { op: string; url: string; body?: unknown }): number {
    const id = ++this.wsRequestId
    const message = `${request.op}\n${id}\n${request.url}\n${JSON.stringify(request.body || {})}`
    ws.send(message)
    return id
  }

  private handleWsMessage(data: string, type: 'trading' | 'marketData'): void {
    try {
      // Tradovate WS messages can be frames or events
      if (data.startsWith('o')) return // Open frame
      if (data.startsWith('h')) {
        this.health.lastHeartbeat = Date.now()
        return // Heartbeat
      }
      if (data.startsWith('a')) {
        // Array of messages
        const messages = JSON.parse(data.slice(1))
        for (const msg of messages) {
          this.processWsEvent(JSON.parse(msg))
        }
      }
    } catch (error) {
      console.error('[Tradovate] WS parse error:', error)
    }
  }

  private processWsEvent(event: { e: string; d: unknown; i?: number; s?: number }): void {
    // Handle response to request
    if (event.i && this.wsCallbacks.has(event.i)) {
      const callback = this.wsCallbacks.get(event.i)!
      this.wsCallbacks.delete(event.i)
      callback(event.d)
      return
    }

    // Handle subscription events
    const handlers = this.eventHandlers.get(event.e)
    if (handlers) {
      handlers.forEach(handler => handler(event.d))
    }
  }

  private subscribe<T>(eventType: string, symbol: string, callback: (data: T) => void): () => void {
    const key = `${eventType}:${symbol}`

    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set())

      // Send subscription request
      if (this.marketDataWs && this.marketDataWs.readyState === WebSocket.OPEN) {
        this.sendWs(this.marketDataWs, {
          op: 'subscribe',
          url: eventType,
          body: { symbol },
        })
      }
    }

    const handlers = this.eventHandlers.get(key)!
    handlers.add(callback as (data: unknown) => void)

    // Return unsubscribe function
    return () => {
      handlers.delete(callback as (data: unknown) => void)
      if (handlers.size === 0) {
        this.eventHandlers.delete(key)
        if (this.marketDataWs && this.marketDataWs.readyState === WebSocket.OPEN) {
          this.sendWs(this.marketDataWs, {
            op: 'unsubscribe',
            url: eventType,
            body: { symbol },
          })
        }
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.tradingWs && this.tradingWs.readyState === WebSocket.OPEN) {
        this.tradingWs.send('[]')
      }
      if (this.marketDataWs && this.marketDataWs.readyState === WebSocket.OPEN) {
        this.marketDataWs.send('[]')
      }
    }, this.config.heartbeatInterval || 2500)
  }

  // ===========================================================================
  // HTTP UTILITIES
  // ===========================================================================

  private async get<T>(path: string): Promise<T> {
    return this.fetchWithRetry<T>(`${this.endpoints.api}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.fetchWithRetry<T>(`${this.endpoints.api}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  private async getMD<T>(path: string): Promise<T> {
    return this.fetchWithRetry<T>(`${this.endpoints.md}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.mdAccessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  private async fetchWithRetry<T>(url: string, options: RequestInit): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(15000),
        })

        this.health.latencyMs = Date.now() - startTime

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1')
          await this.sleep(retryAfter * 1000)
          continue
        }

        if (!response.ok) {
          const errorText = await response.text()
          throw new TradovateAPIError(
            `HTTP ${response.status}: ${errorText}`,
            response.status.toString()
          )
        }

        const data = await response.json()

        // Check for API-level errors
        if (data.errorText) {
          throw new TradovateAPIError(data.errorText, data.errorCode)
        }
        if (data.failureText) {
          throw new TradovateAPIError(data.failureText, data.failureReason)
        }

        this.health.consecutiveFailures = 0
        return data as T

      } catch (error) {
        lastError = error as Error
        this.health.consecutiveFailures++

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
            RETRY_CONFIG.maxDelayMs
          )
          await this.sleep(delay)
        }
      }
    }

    throw lastError || new TradovateAPIError('Request failed after retries', 'RETRY_EXHAUSTED')
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private getPointValue(symbol: string): number {
    const baseSymbol = symbol.replace(/[A-Z]\d+$/, '') as FuturesSymbol
    return FUTURES_SPECS[baseSymbol]?.pointValue || 1
  }

  private getMarginRequired(symbol: string): number {
    const baseSymbol = symbol.replace(/[A-Z]\d+$/, '') as FuturesSymbol
    return FUTURES_SPECS[baseSymbol]?.marginInitial || 0
  }

  private timeframeToTicks(tf: ChartTimeframe): number {
    const map: Record<ChartTimeframe, number> = {
      '1Min': 60, '2Min': 120, '3Min': 180, '5Min': 300,
      '10Min': 600, '15Min': 900, '30Min': 1800,
      '1Hour': 3600, '2Hour': 7200, '4Hour': 14400,
      'Daily': 86400, 'Weekly': 604800, 'Monthly': 2592000,
    }
    return map[tf] || 60
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer)
      this.tokenRefreshTimer = null
    }

    if (this.tradingWs) {
      this.tradingWs.close()
      this.tradingWs = null
    }

    if (this.marketDataWs) {
      this.marketDataWs.close()
      this.marketDataWs = null
    }

    this.accessToken = null
    this.health.connected = false
    this.health.tradingEnabled = false
    this.health.marketDataEnabled = false

    console.log('[Tradovate] Disconnected')
  }

  /**
   * Get connection health
   */
  getHealth(): ConnectionHealth {
    return { ...this.health }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createTradovateClient(
  credentials: TradovateCredentials,
  mode: 'demo' | 'live' = 'demo',
  propFirmRules?: PropFirmRules
): TradovateClient {
  return new TradovateClient({
    mode,
    credentials,
    propFirmRules: propFirmRules || APEX_RULES,
    enableMarketData: true,
    autoReconnect: true,
    heartbeatInterval: 2500,
    maxRetries: 3,
    retryDelay: 1000,
  })
}
