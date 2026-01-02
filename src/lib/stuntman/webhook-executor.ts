// @ts-nocheck
// =============================================================================
// WEBHOOK EXECUTOR - PRODUCTION GRADE
// =============================================================================
// Executes trades via webhooks to PickMyTrade, TradersPost, or custom endpoints
// Supports multiple prop firm platforms through webhook bridges
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type WebhookProvider = 'pickmytrade' | 'traderspost' | 'custom'
export type OrderAction = 'buy' | 'sell' | 'close' | 'cancel'
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok'

export interface WebhookConfig {
  provider: WebhookProvider
  webhookUrl: string
  secretKey?: string
  accountId?: string
  defaultRiskPercent: number
  maxPositionSize: number
  enableLogging: boolean
}

export interface WebhookSignal {
  // Core signal data
  ticker: string                    // e.g., "ES", "NQ", "MES"
  action: OrderAction
  orderType: OrderType

  // Position sizing
  quantity?: number                 // Fixed quantity
  riskPercent?: number              // Risk-based sizing
  dollarRisk?: number               // Fixed dollar risk

  // Price levels
  price?: number                    // Limit/stop price
  stopLoss?: number                 // Stop loss price
  takeProfit?: number               // Take profit price
  trailingStop?: number             // Trailing stop in points/percent

  // Order options
  timeInForce?: TimeInForce
  reduceOnly?: boolean
  closePosition?: boolean

  // Metadata
  strategyId?: string
  signalId?: string
  comment?: string
}

export interface WebhookResponse {
  success: boolean
  orderId?: string
  message?: string
  executionTime?: number
  error?: string
}

export interface ExecutionLog {
  id: string
  timestamp: number
  signal: WebhookSignal
  response: WebhookResponse
  provider: WebhookProvider
  latencyMs: number
}

// =============================================================================
// PICKMYTRADE PAYLOAD FORMAT
// =============================================================================
// PickMyTrade expects specific JSON format for TradingView webhook integration
// Documentation: https://docs.pickmytrade.trade

interface PickMyTradePayload {
  ticker: string
  action: 'buy' | 'sell' | 'close' | 'cancel'
  sentiment?: 'long' | 'short' | 'flat'
  quantity?: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  trailingStop?: number
  orderType?: 'market' | 'limit' | 'stop'
  reduceOnly?: boolean
  comment?: string
  // Account identification
  account?: string
  secret?: string
}

// =============================================================================
// TRADERSPOST PAYLOAD FORMAT
// =============================================================================

interface TradersPostPayload {
  ticker: string
  action: 'buy' | 'sell' | 'exit'
  orderType?: 'market' | 'limit' | 'stop'
  limitPrice?: number
  stopPrice?: number
  quantity?: number | 'all'
  sentiment?: 'bullish' | 'bearish' | 'flat'
}

// =============================================================================
// WEBHOOK EXECUTOR CLASS
// =============================================================================

export class WebhookExecutor {
  private config: WebhookConfig
  private executionLogs: ExecutionLog[] = []
  private maxLogs = 1000

  // Rate limiting
  private lastExecutionTime = 0
  private minExecutionInterval = 100  // Minimum 100ms between executions

  // Retry configuration
  private maxRetries = 3
  private retryDelayMs = 500

  constructor(config: WebhookConfig) {
    this.config = config
  }

  // ===========================================================================
  // EXECUTION
  // ===========================================================================

  /**
   * Execute a trade signal via webhook
   */
  async execute(signal: WebhookSignal): Promise<WebhookResponse> {
    // Rate limiting
    const now = Date.now()
    const timeSinceLastExecution = now - this.lastExecutionTime
    if (timeSinceLastExecution < this.minExecutionInterval) {
      await this.sleep(this.minExecutionInterval - timeSinceLastExecution)
    }
    this.lastExecutionTime = Date.now()

    // Build payload based on provider
    const payload = this.buildPayload(signal)

    // Execute with retry
    let lastError: Error | null = null
    let response: WebhookResponse = { success: false, error: 'Unknown error' }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        response = await this.sendWebhook(payload)
        const latencyMs = Date.now() - startTime

        // Log execution
        this.logExecution(signal, response, latencyMs)

        if (response.success) {
          return response
        }
      } catch (error) {
        lastError = error as Error
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelayMs * Math.pow(2, attempt))
        }
      }
    }

    // All retries failed
    const errorResponse: WebhookResponse = {
      success: false,
      error: lastError?.message || 'Execution failed after retries',
    }

    this.logExecution(signal, errorResponse, 0)
    return errorResponse
  }

  /**
   * Execute a buy order
   */
  async buy(ticker: string, options: Partial<WebhookSignal> = {}): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action: 'buy',
      orderType: 'market',
      ...options,
    })
  }

  /**
   * Execute a sell order
   */
  async sell(ticker: string, options: Partial<WebhookSignal> = {}): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action: 'sell',
      orderType: 'market',
      ...options,
    })
  }

  /**
   * Close a position
   */
  async closePosition(ticker: string, options: Partial<WebhookSignal> = {}): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action: 'close',
      orderType: 'market',
      closePosition: true,
      ...options,
    })
  }

  /**
   * Execute a bracket order (entry + stop loss + take profit)
   */
  async bracketOrder(
    ticker: string,
    action: 'buy' | 'sell',
    stopLoss: number,
    takeProfit: number,
    options: Partial<WebhookSignal> = {}
  ): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action,
      orderType: 'market',
      stopLoss,
      takeProfit,
      ...options,
    })
  }

  /**
   * Set or update stop loss
   */
  async setStopLoss(ticker: string, stopPrice: number): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action: 'sell',
      orderType: 'stop',
      price: stopPrice,
      reduceOnly: true,
    })
  }

  /**
   * Set or update take profit
   */
  async setTakeProfit(ticker: string, targetPrice: number): Promise<WebhookResponse> {
    return this.execute({
      ticker,
      action: 'sell',
      orderType: 'limit',
      price: targetPrice,
      reduceOnly: true,
    })
  }

  // ===========================================================================
  // PAYLOAD BUILDING
  // ===========================================================================

  /**
   * Build payload based on provider
   */
  private buildPayload(signal: WebhookSignal): Record<string, unknown> {
    switch (this.config.provider) {
      case 'pickmytrade':
        return this.buildPickMyTradePayload(signal)
      case 'traderspost':
        return this.buildTradersPostPayload(signal)
      case 'custom':
      default:
        return this.buildCustomPayload(signal)
    }
  }

  /**
   * Build PickMyTrade payload
   */
  private buildPickMyTradePayload(signal: WebhookSignal): PickMyTradePayload {
    const payload: PickMyTradePayload = {
      ticker: signal.ticker,
      action: signal.action === 'cancel' ? 'cancel' : signal.action,
    }

    // Sentiment (required for PickMyTrade)
    if (signal.action === 'buy') {
      payload.sentiment = 'long'
    } else if (signal.action === 'sell') {
      payload.sentiment = 'short'
    } else {
      payload.sentiment = 'flat'
    }

    // Quantity
    if (signal.quantity) {
      payload.quantity = signal.quantity
    } else if (signal.riskPercent) {
      // PickMyTrade can calculate quantity from risk percent
      // We pass it in the comment or use their risk management
      payload.comment = `risk:${signal.riskPercent}%`
    }

    // Price levels
    if (signal.price) {
      payload.price = signal.price
    }
    if (signal.stopLoss) {
      payload.stopLoss = signal.stopLoss
    }
    if (signal.takeProfit) {
      payload.takeProfit = signal.takeProfit
    }
    if (signal.trailingStop) {
      payload.trailingStop = signal.trailingStop
    }

    // Order type
    if (signal.orderType) {
      payload.orderType = signal.orderType === 'stop_limit' ? 'stop' : signal.orderType
    }

    // Reduce only (for closing positions)
    if (signal.reduceOnly || signal.closePosition) {
      payload.reduceOnly = true
    }

    // Comment/metadata
    const comments: string[] = []
    if (signal.strategyId) comments.push(`strategy:${signal.strategyId}`)
    if (signal.signalId) comments.push(`signal:${signal.signalId}`)
    if (signal.comment) comments.push(signal.comment)
    if (comments.length > 0) {
      payload.comment = comments.join('|')
    }

    // Account identification
    if (this.config.accountId) {
      payload.account = this.config.accountId
    }
    if (this.config.secretKey) {
      payload.secret = this.config.secretKey
    }

    return payload
  }

  /**
   * Build TradersPost payload
   */
  private buildTradersPostPayload(signal: WebhookSignal): TradersPostPayload {
    const payload: TradersPostPayload = {
      ticker: signal.ticker,
      action: signal.action === 'close' ? 'exit' : signal.action,
    }

    // Sentiment
    if (signal.action === 'buy') {
      payload.sentiment = 'bullish'
    } else if (signal.action === 'sell') {
      payload.sentiment = 'bearish'
    } else {
      payload.sentiment = 'flat'
    }

    // Quantity
    if (signal.closePosition) {
      payload.quantity = 'all'
    } else if (signal.quantity) {
      payload.quantity = signal.quantity
    }

    // Price levels
    if (signal.orderType === 'limit' && signal.price) {
      payload.orderType = 'limit'
      payload.limitPrice = signal.price
    } else if (signal.orderType === 'stop' && signal.price) {
      payload.orderType = 'stop'
      payload.stopPrice = signal.price
    } else {
      payload.orderType = 'market'
    }

    return payload
  }

  /**
   * Build custom payload (flexible format)
   */
  private buildCustomPayload(signal: WebhookSignal): Record<string, unknown> {
    return {
      ...signal,
      timestamp: Date.now(),
      account: this.config.accountId,
      secret: this.config.secretKey,
    }
  }

  // ===========================================================================
  // HTTP
  // ===========================================================================

  /**
   * Send webhook request
   */
  private async sendWebhook(payload: Record<string, unknown>): Promise<WebhookResponse> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.secretKey && { 'X-Webhook-Secret': this.config.secretKey }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),  // 10 second timeout
      })

      const executionTime = Date.now()

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          executionTime,
        }
      }

      // Try to parse JSON response
      try {
        const data = await response.json()
        return {
          success: true,
          orderId: data.orderId || data.id || data.order_id,
          message: data.message || 'Order executed',
          executionTime,
        }
      } catch {
        // Non-JSON response is still success
        return {
          success: true,
          message: 'Order executed',
          executionTime,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      }
    }
  }

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  /**
   * Log execution
   */
  private logExecution(signal: WebhookSignal, response: WebhookResponse, latencyMs: number): void {
    if (!this.config.enableLogging) return

    const log: ExecutionLog = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      signal,
      response,
      provider: this.config.provider,
      latencyMs,
    }

    this.executionLogs.unshift(log)

    // Trim logs to max size
    if (this.executionLogs.length > this.maxLogs) {
      this.executionLogs = this.executionLogs.slice(0, this.maxLogs)
    }

    // Console log for visibility
    const status = response.success ? '✓' : '✗'
    const action = signal.action.toUpperCase()
    console.log(`[Webhook] ${status} ${action} ${signal.ticker} - ${latencyMs}ms - ${response.message || response.error}`)
  }

  /**
   * Get execution logs
   */
  getExecutionLogs(limit = 100): ExecutionLog[] {
    return this.executionLogs.slice(0, limit)
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number
    successRate: number
    averageLatencyMs: number
    failureRate: number
  } {
    if (this.executionLogs.length === 0) {
      return { totalExecutions: 0, successRate: 0, averageLatencyMs: 0, failureRate: 0 }
    }

    const successful = this.executionLogs.filter(log => log.response.success)
    const totalLatency = this.executionLogs.reduce((sum, log) => sum + log.latencyMs, 0)

    return {
      totalExecutions: this.executionLogs.length,
      successRate: (successful.length / this.executionLogs.length) * 100,
      averageLatencyMs: totalLatency / this.executionLogs.length,
      failureRate: ((this.executionLogs.length - successful.length) / this.executionLogs.length) * 100,
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Test webhook connectivity
   */
  async testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const startTime = Date.now()

    try {
      // Send a test ping (most webhook services accept empty or test payloads)
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true, ticker: 'TEST', action: 'ping' }),
        signal: AbortSignal.timeout(5000),
      })

      const latencyMs = Date.now() - startTime

      return {
        success: response.ok || response.status === 400,  // 400 means it received but rejected test
        latencyMs,
      }
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a PickMyTrade executor
 */
export function createPickMyTradeExecutor(
  webhookUrl: string,
  secretKey?: string,
  accountId?: string
): WebhookExecutor {
  return new WebhookExecutor({
    provider: 'pickmytrade',
    webhookUrl,
    secretKey,
    accountId,
    defaultRiskPercent: 2,
    maxPositionSize: 10,
    enableLogging: true,
  })
}

/**
 * Create a TradersPost executor
 */
export function createTradersPostExecutor(
  webhookUrl: string,
  secretKey?: string
): WebhookExecutor {
  return new WebhookExecutor({
    provider: 'traderspost',
    webhookUrl,
    secretKey,
    defaultRiskPercent: 2,
    maxPositionSize: 10,
    enableLogging: true,
  })
}

/**
 * Create a custom webhook executor
 */
export function createCustomWebhookExecutor(
  webhookUrl: string,
  options: Partial<WebhookConfig> = {}
): WebhookExecutor {
  return new WebhookExecutor({
    provider: 'custom',
    webhookUrl,
    defaultRiskPercent: 2,
    maxPositionSize: 10,
    enableLogging: true,
    ...options,
  })
}
