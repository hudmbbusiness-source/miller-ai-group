// @ts-nocheck
// =============================================================================
// MULTI-MARKET COORDINATOR - PRODUCTION GRADE
// =============================================================================
// Coordinates trading across Crypto (Crypto.com) and Futures (Rithmic/Apex)
// Allocates capital, manages risk, and optimizes signal execution across markets
// Uses Rithmic for sub-millisecond futures execution
// =============================================================================

import { createCryptoComClient } from '@/lib/crypto/crypto-com'
import {
  RithmicClient,
  RithmicCredentials,
  createRithmicClient,
  PropFirmManager,
  createPropFirmManager,
  FUTURES_SPECS,
  FuturesSymbol,
  RithmicPosition,
  RithmicAccountBalance,
} from '@/lib/rithmic'
import type { SignalResult } from './signal-generator'

// =============================================================================
// TYPES
// =============================================================================

export type MarketType = 'crypto' | 'futures'
export type TradingSession = 'pre-market' | 'regular' | 'after-hours' | 'closed' | '24h'

export interface MarketState {
  market: MarketType
  connected: boolean
  session: TradingSession
  available: boolean
  latencyMs: number
  lastUpdate: number
  dailyPnL: number
  openPositions: number
  buyingPower: number
}

export interface AllocationStrategy {
  crypto: number      // Percentage allocation to crypto (0-100)
  futures: number     // Percentage allocation to futures (0-100)
  rebalanceThreshold: number  // Rebalance when drift exceeds this %
}

export interface CrossMarketSignal {
  id: string
  timestamp: number
  originalMarket: MarketType
  signal: SignalResult
  correlatedMarkets: {
    market: MarketType
    symbol: string
    correlation: number
    signalStrength: number
  }[]
  recommendation: {
    primaryMarket: MarketType
    primarySymbol: string
    confidence: number
    reasoning: string
  }
}

export interface PositionSyncState {
  crypto: {
    positions: Map<string, { quantity: number; entryPrice: number; unrealizedPnL: number }>
    totalValue: number
  }
  futures: {
    positions: Map<string, { quantity: number; entryPrice: number; unrealizedPnL: number }>
    totalValue: number
  }
  netExposure: {
    long: number
    short: number
    net: number
  }
}

export interface CoordinatorConfig {
  allocation: AllocationStrategy
  maxTotalExposure: number        // Max % of capital exposed
  maxCorrelatedExposure: number   // Max exposure to correlated assets
  preferLiquidity: boolean        // Prefer more liquid markets
  optimizeForFees: boolean        // Consider fees in routing
  enableCrossMarketHedging: boolean
  riskBudget: {
    daily: number                 // Max daily loss $
    weekly: number                // Max weekly loss $
    perTrade: number              // Max loss per trade $
  }
  propFirmPreset?: string         // e.g., 'apex_50k', 'apex_100k'
}

// =============================================================================
// CORRELATION MATRIX
// =============================================================================
// Cross-market correlations for intelligent routing
// Based on historical data - should be updated periodically

const CORRELATION_MATRIX: Record<string, Record<string, number>> = {
  // Crypto to Futures correlations
  'BTC_USDT': { 'ES': 0.45, 'NQ': 0.55, 'MES': 0.45, 'MNQ': 0.55, 'GC': 0.25 },
  'ETH_USDT': { 'ES': 0.40, 'NQ': 0.60, 'MES': 0.40, 'MNQ': 0.60, 'GC': 0.20 },
  'SOL_USDT': { 'ES': 0.35, 'NQ': 0.50, 'MES': 0.35, 'MNQ': 0.50 },

  // Futures to Crypto correlations
  'ES': { 'BTC_USDT': 0.45, 'ETH_USDT': 0.40, 'SOL_USDT': 0.35 },
  'NQ': { 'BTC_USDT': 0.55, 'ETH_USDT': 0.60, 'SOL_USDT': 0.50 },
  'MES': { 'BTC_USDT': 0.45, 'ETH_USDT': 0.40, 'SOL_USDT': 0.35 },
  'MNQ': { 'BTC_USDT': 0.55, 'ETH_USDT': 0.60, 'SOL_USDT': 0.50 },

  // Intra-crypto correlations
  'ETH_USDT_crypto': { 'BTC_USDT': 0.85, 'SOL_USDT': 0.75 },
  'SOL_USDT_crypto': { 'BTC_USDT': 0.70, 'ETH_USDT': 0.75 },

  // Intra-futures correlations
  'ES_futures': { 'NQ': 0.90, 'RTY': 0.85, 'YM': 0.95 },
  'NQ_futures': { 'ES': 0.90, 'RTY': 0.80, 'YM': 0.88 },
}

// =============================================================================
// TRADING HOURS
// =============================================================================

interface TradingHours {
  start: number   // Hour in ET (0-23)
  end: number
  days: number[]  // 0=Sunday, 6=Saturday
}

const MARKET_HOURS: Record<MarketType, TradingHours> = {
  crypto: { start: 0, end: 24, days: [0, 1, 2, 3, 4, 5, 6] },  // 24/7
  futures: { start: 18, end: 17, days: [0, 1, 2, 3, 4, 5] },   // Sun 6pm - Fri 5pm ET
}

// =============================================================================
// MULTI-MARKET COORDINATOR CLASS
// =============================================================================

export class MultiMarketCoordinator {
  private config: CoordinatorConfig
  private cryptoClient: ReturnType<typeof createCryptoComClient>
  private rithmicClient: RithmicClient | null = null
  private propFirmManager: PropFirmManager | null = null

  private marketStates: Map<MarketType, MarketState> = new Map()
  private positionSync: PositionSyncState = {
    crypto: { positions: new Map(), totalValue: 0 },
    futures: { positions: new Map(), totalValue: 0 },
    netExposure: { long: 0, short: 0, net: 0 },
  }

  private dailyPnL = { crypto: 0, futures: 0, total: 0 }
  private weeklyPnL = { crypto: 0, futures: 0, total: 0 }

  // Event handlers for real-time updates
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map()

  // Rithmic account ID for futures trading
  private futuresAccountId: string = ''

  constructor(config: CoordinatorConfig) {
    this.config = config
    this.cryptoClient = createCryptoComClient()

    // Initialize market states
    this.marketStates.set('crypto', {
      market: 'crypto',
      connected: false,
      session: '24h',
      available: false,
      latencyMs: 0,
      lastUpdate: 0,
      dailyPnL: 0,
      openPositions: 0,
      buyingPower: 0,
    })

    this.marketStates.set('futures', {
      market: 'futures',
      connected: false,
      session: 'closed',
      available: false,
      latencyMs: 0,
      lastUpdate: 0,
      dailyPnL: 0,
      openPositions: 0,
      buyingPower: 0,
    })
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize all market connections
   */
  async initialize(rithmicCredentials?: RithmicCredentials): Promise<void> {
    console.log('[Coordinator] Initializing multi-market coordinator...')

    // Initialize Crypto.com
    await this.initializeCrypto()

    // Initialize Rithmic if credentials provided
    if (rithmicCredentials) {
      await this.initializeFutures(rithmicCredentials)
    }

    // Start background processes
    this.startPositionSync()
    this.startMarketMonitoring()

    console.log('[Coordinator] Initialization complete')
  }

  private async initializeCrypto(): Promise<void> {
    try {
      // Test connection
      const ticker = await this.cryptoClient.getTicker('BTC_USDT')

      const state = this.marketStates.get('crypto')!
      state.connected = !!ticker
      state.available = this.cryptoClient.canAuthenticate()
      state.session = '24h'
      state.lastUpdate = Date.now()

      if (state.available) {
        const balance = await this.cryptoClient.getAccountBalance()
        state.buyingPower = balance.reduce((sum, b) => {
          if (b.instrument_name === 'USDT') {
            return sum + parseFloat(b.quantity)
          }
          return sum
        }, 0)
      }

      console.log('[Coordinator] Crypto.com connected:', state.connected)
    } catch (error) {
      console.error('[Coordinator] Crypto initialization failed:', error)
    }
  }

  private async initializeFutures(credentials: RithmicCredentials): Promise<void> {
    try {
      // Create Rithmic client (demo environment for testing, live for production)
      const environment = process.env.RITHMIC_ENVIRONMENT as 'demo' | 'live' | 'test' || 'demo'
      this.rithmicClient = createRithmicClient(credentials, environment)

      // Connect to all plants
      await this.rithmicClient.connect()

      // Set up event handlers
      this.setupRithmicEventHandlers()

      const state = this.marketStates.get('futures')!
      state.connected = this.rithmicClient.isConnected()
      state.available = state.connected
      state.session = this.getCurrentFuturesSession()
      state.lastUpdate = Date.now()

      // Get accounts
      const accounts = this.rithmicClient.getAllAccounts()
      if (accounts.length > 0) {
        this.futuresAccountId = accounts[0].accountId

        // Get balance
        const balance = this.rithmicClient.getBalance(this.futuresAccountId)
        if (balance) {
          state.buyingPower = balance.buyingPower
          state.dailyPnL = balance.closedPnL
        }

        // Initialize prop firm manager if preset specified
        if (this.config.propFirmPreset) {
          this.propFirmManager = createPropFirmManager(
            this.rithmicClient,
            this.config.propFirmPreset,
            this.futuresAccountId,
            balance?.totalEquity || 50000,
            {
              emergencyFlatten: true,
              alertWebhook: process.env.ALERT_WEBHOOK_URL,
            }
          )

          // Forward prop firm alerts
          this.propFirmManager.on('alert', (alert) => {
            this.emit('propfirm:alert', alert)
          })

          this.propFirmManager.on('emergency_flatten', (data) => {
            this.emit('propfirm:emergency', data)
          })

          console.log(`[Coordinator] Prop firm manager initialized: ${this.config.propFirmPreset}`)
        }
      }

      console.log('[Coordinator] Rithmic connected:', state.connected)
      console.log(`[Coordinator] Latency: ${this.rithmicClient.getLatency('order')}ms`)
    } catch (error) {
      console.error('[Coordinator] Futures initialization failed:', error)
    }
  }

  private setupRithmicEventHandlers(): void {
    if (!this.rithmicClient) return

    // Position updates
    this.rithmicClient.on('position_update', (position: RithmicPosition) => {
      this.handleFuturesPositionUpdate(position)
    })

    // Balance updates
    this.rithmicClient.on('account_update', (balance: RithmicAccountBalance) => {
      const state = this.marketStates.get('futures')!
      state.buyingPower = balance.buyingPower
      state.dailyPnL = balance.closedPnL
      this.dailyPnL.futures = balance.closedPnL + balance.openPnL
      this.updateTotalPnL()
    })

    // Fill events
    this.rithmicClient.on('fill', (fill) => {
      this.emit('trade:executed', {
        market: 'futures',
        ...fill,
      })
    })

    // Market data
    this.rithmicClient.on('tick', (tick) => {
      this.emit('market:tick', { market: 'futures', ...tick })
    })

    // Connection health
    this.rithmicClient.on('disconnected', () => {
      const state = this.marketStates.get('futures')!
      state.connected = false
      state.available = false
      this.emit('market:disconnected', { market: 'futures' })
    })

    this.rithmicClient.on('connected', () => {
      const state = this.marketStates.get('futures')!
      state.connected = true
      state.available = true
      this.emit('market:connected', { market: 'futures' })
    })
  }

  private handleFuturesPositionUpdate(position: RithmicPosition): void {
    this.positionSync.futures.positions.set(position.symbol, {
      quantity: position.netPosition,
      entryPrice: position.avgEntryPrice,
      unrealizedPnL: position.openPnL,
    })

    // Update market state
    const state = this.marketStates.get('futures')!
    state.openPositions = this.positionSync.futures.positions.size

    this.calculateNetExposure()
    this.emit('position:update', { market: 'futures', position })
  }

  // ===========================================================================
  // SIGNAL ROUTING
  // ===========================================================================

  /**
   * Route a signal to the optimal market
   */
  async routeSignal(signal: SignalResult): Promise<CrossMarketSignal> {
    const correlatedMarkets = this.findCorrelatedMarkets(signal.symbol)
    const recommendation = await this.determineOptimalExecution(signal, correlatedMarkets)

    const crossMarketSignal: CrossMarketSignal = {
      id: `${Date.now()}-${signal.symbol}`,
      timestamp: Date.now(),
      originalMarket: this.getMarketType(signal.symbol),
      signal,
      correlatedMarkets,
      recommendation,
    }

    this.emit('signal:routed', crossMarketSignal)
    return crossMarketSignal
  }

  /**
   * Find correlated instruments across markets
   */
  private findCorrelatedMarkets(symbol: string): CrossMarketSignal['correlatedMarkets'] {
    const correlations = CORRELATION_MATRIX[symbol] || {}
    const results: CrossMarketSignal['correlatedMarkets'] = []

    for (const [correlatedSymbol, correlation] of Object.entries(correlations)) {
      if (correlation >= 0.3) {  // Only include meaningful correlations
        const market = this.getMarketType(correlatedSymbol)
        const state = this.marketStates.get(market)

        if (state?.available) {
          results.push({
            market,
            symbol: correlatedSymbol,
            correlation,
            signalStrength: correlation * 0.8,  // Reduce strength for correlated signals
          })
        }
      }
    }

    return results.sort((a, b) => b.correlation - a.correlation)
  }

  /**
   * Determine optimal market and execution
   */
  private async determineOptimalExecution(
    signal: SignalResult,
    correlatedMarkets: CrossMarketSignal['correlatedMarkets']
  ): Promise<CrossMarketSignal['recommendation']> {
    const originalMarket = this.getMarketType(signal.symbol)
    const originalState = this.marketStates.get(originalMarket)!

    // Factors to consider:
    // 1. Market availability
    // 2. Liquidity (prefer crypto for 24/7, futures for high volume)
    // 3. Fees (crypto: 0.1%, futures: lower per-contract)
    // 4. Current exposure (avoid over-concentration)
    // 5. Prop firm rules (for futures)
    // 6. Correlation to existing positions

    let bestMarket = originalMarket
    let bestSymbol = signal.symbol
    let confidence = signal.confidence
    const reasons: string[] = []

    // Check if original market is available
    if (!originalState.available || originalState.session === 'closed') {
      // Try correlated market
      for (const correlated of correlatedMarkets) {
        const state = this.marketStates.get(correlated.market)
        if (state?.available && state.session !== 'closed') {
          bestMarket = correlated.market
          bestSymbol = correlated.symbol
          confidence *= correlated.correlation
          reasons.push(`Original market unavailable, routing to correlated ${correlated.symbol}`)
          break
        }
      }
    }

    // Check prop firm rules for futures
    if (bestMarket === 'futures' && this.propFirmManager) {
      const validation = this.propFirmManager.validateTrade({
        accountId: this.futuresAccountId,
        symbol: bestSymbol,
        exchange: FUTURES_SPECS[bestSymbol as FuturesSymbol]?.exchange || 'CME',
        side: signal.action === 'BUY' ? 'buy' : 'sell',
        orderType: 'market',
        quantity: 1,  // Will be adjusted later
      })

      if (!validation.allowed) {
        reasons.push(`Prop firm restriction: ${validation.reason}`)
        confidence *= 0.5

        // Try crypto instead
        const cryptoCorrelated = correlatedMarkets.find(c => c.market === 'crypto')
        if (cryptoCorrelated && this.marketStates.get('crypto')?.available) {
          bestMarket = 'crypto'
          bestSymbol = cryptoCorrelated.symbol
          reasons.push('Switching to crypto due to prop firm limits')
        }
      }
    }

    // Check exposure limits
    const exposure = await this.calculateExposure(bestMarket)
    if (exposure.percent > this.config.maxTotalExposure) {
      // Try other market
      const alternateMarket = bestMarket === 'crypto' ? 'futures' : 'crypto'
      const alternateState = this.marketStates.get(alternateMarket)

      if (alternateState?.available) {
        const alternateExposure = await this.calculateExposure(alternateMarket)
        if (alternateExposure.percent < exposure.percent) {
          const correlated = correlatedMarkets.find(c => c.market === alternateMarket)
          if (correlated) {
            bestMarket = alternateMarket
            bestSymbol = correlated.symbol
            confidence *= correlated.correlation
            reasons.push(`Exposure limit in ${originalMarket}, routing to ${alternateMarket}`)
          }
        }
      }
    }

    // Optimize for fees if enabled
    if (this.config.optimizeForFees && signal.action !== 'HOLD') {
      const cryptoFee = 0.001 * (signal.positionSize || 1000)  // 0.1% taker
      const futuresFee = 2.50  // ~$2.50 per contract round trip

      if (bestMarket === 'crypto' && futuresFee < cryptoFee) {
        const correlated = correlatedMarkets.find(c => c.market === 'futures')
        if (correlated && this.marketStates.get('futures')?.available) {
          bestMarket = 'futures'
          bestSymbol = correlated.symbol
          reasons.push('Lower fees in futures market')
        }
      }
    }

    // Prefer Rithmic futures for speed if both markets available
    if (bestMarket === 'crypto' && this.rithmicClient?.isConnected()) {
      const futuresLatency = this.rithmicClient.getLatency('order')
      const cryptoLatency = this.marketStates.get('crypto')?.latencyMs || 100

      if (futuresLatency < cryptoLatency * 0.5) {  // Rithmic is significantly faster
        const correlated = correlatedMarkets.find(c => c.market === 'futures')
        if (correlated) {
          reasons.push(`Rithmic faster (${futuresLatency}ms vs ${cryptoLatency}ms)`)
        }
      }
    }

    // Check for hedging opportunity
    if (this.config.enableCrossMarketHedging) {
      const hedge = await this.checkHedgingOpportunity(signal, correlatedMarkets)
      if (hedge) {
        reasons.push(hedge.reason)
      }
    }

    return {
      primaryMarket: bestMarket,
      primarySymbol: bestSymbol,
      confidence,
      reasoning: reasons.join('; ') || 'Direct execution in original market',
    }
  }

  // ===========================================================================
  // EXECUTION
  // ===========================================================================

  /**
   * Execute a trade in futures market via Rithmic
   */
  async executeFuturesTrade(
    symbol: FuturesSymbol,
    side: 'buy' | 'sell',
    quantity: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!this.rithmicClient || !this.rithmicClient.isConnected()) {
      return { success: false, error: 'Rithmic not connected' }
    }

    // Validate with prop firm manager
    if (this.propFirmManager) {
      const validation = this.propFirmManager.validateTrade({
        accountId: this.futuresAccountId,
        symbol,
        exchange: FUTURES_SPECS[symbol]?.exchange || 'CME',
        side,
        orderType: 'market',
        quantity,
        stopPrice: stopLoss,
      })

      if (!validation.allowed) {
        return { success: false, error: validation.reason }
      }

      // Adjust quantity if needed
      if (validation.maxQuantity && validation.maxQuantity < quantity) {
        quantity = validation.maxQuantity
      }
    }

    try {
      let order

      if (stopLoss && takeProfit) {
        // Bracket order
        order = await this.rithmicClient.bracketOrder(
          this.futuresAccountId,
          symbol,
          side,
          quantity,
          stopLoss,
          takeProfit,
          FUTURES_SPECS[symbol]?.exchange || 'CME'
        )
      } else {
        // Simple market order
        order = await this.rithmicClient.marketOrder(
          this.futuresAccountId,
          symbol,
          side,
          quantity,
          FUTURES_SPECS[symbol]?.exchange || 'CME'
        )
      }

      return { success: true, orderId: order.orderId }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      }
    }
  }

  /**
   * Close all futures positions (emergency or planned)
   */
  async flattenFuturesPositions(): Promise<void> {
    if (!this.rithmicClient) return

    await this.rithmicClient.cancelAllOrders(this.futuresAccountId)

    const positions = this.rithmicClient.getAllPositions(this.futuresAccountId)
    for (const position of positions) {
      if (position.netPosition !== 0) {
        await this.rithmicClient.flattenPosition(
          this.futuresAccountId,
          position.symbol,
          position.exchange
        )
      }
    }

    console.log('[Coordinator] All futures positions flattened')
  }

  // ===========================================================================
  // POSITION MANAGEMENT
  // ===========================================================================

  /**
   * Get synchronized position state across all markets
   */
  async getPositionSync(): Promise<PositionSyncState> {
    await this.syncPositions()
    return { ...this.positionSync }
  }

  /**
   * Sync positions from all markets
   */
  private async syncPositions(): Promise<void> {
    // Sync crypto positions
    if (this.marketStates.get('crypto')?.available) {
      try {
        const balance = await this.cryptoClient.getAccountBalance()
        this.positionSync.crypto.positions.clear()

        let totalValue = 0
        for (const b of balance) {
          if (b.instrument_name !== 'USDT' && parseFloat(b.quantity) > 0) {
            const ticker = await this.cryptoClient.getTicker(`${b.instrument_name}_USDT`)
            const price = ticker ? parseFloat(ticker.a) : 0
            const value = parseFloat(b.quantity) * price

            this.positionSync.crypto.positions.set(b.instrument_name, {
              quantity: parseFloat(b.quantity),
              entryPrice: price,  // Would need actual entry from DB
              unrealizedPnL: 0,
            })
            totalValue += value
          }
        }
        this.positionSync.crypto.totalValue = totalValue
      } catch (error) {
        console.error('[Coordinator] Crypto sync failed:', error)
      }
    }

    // Sync futures positions from Rithmic
    if (this.rithmicClient && this.rithmicClient.isConnected()) {
      try {
        const positions = await this.rithmicClient.requestPositions(this.futuresAccountId)
        this.positionSync.futures.positions.clear()

        let totalValue = 0
        for (const p of positions) {
          if (p.netPosition !== 0) {
            const spec = FUTURES_SPECS[p.symbol as FuturesSymbol]
            const value = Math.abs(p.netPosition) * p.avgEntryPrice * (spec?.pointValue || 1)

            this.positionSync.futures.positions.set(p.symbol, {
              quantity: p.netPosition,
              entryPrice: p.avgEntryPrice,
              unrealizedPnL: p.openPnL,
            })
            totalValue += value
          }
        }
        this.positionSync.futures.totalValue = totalValue
      } catch (error) {
        console.error('[Coordinator] Futures sync failed:', error)
      }
    }

    this.calculateNetExposure()
  }

  /**
   * Calculate net exposure
   */
  private calculateNetExposure(): void {
    let longExposure = 0
    let shortExposure = 0

    for (const [, pos] of this.positionSync.crypto.positions) {
      if (pos.quantity > 0) longExposure += pos.quantity * pos.entryPrice
    }

    for (const [symbol, pos] of this.positionSync.futures.positions) {
      const spec = FUTURES_SPECS[symbol as FuturesSymbol]
      const value = Math.abs(pos.quantity) * pos.entryPrice * (spec?.pointValue || 1)

      if (pos.quantity > 0) longExposure += value
      else shortExposure += value
    }

    this.positionSync.netExposure = {
      long: longExposure,
      short: shortExposure,
      net: longExposure - shortExposure,
    }
  }

  /**
   * Calculate current exposure for a market
   */
  private async calculateExposure(market: MarketType): Promise<{ value: number; percent: number }> {
    const state = this.marketStates.get(market)
    if (!state) return { value: 0, percent: 0 }

    let totalCapital = 0
    let exposedCapital = 0

    if (market === 'crypto') {
      totalCapital = state.buyingPower + this.positionSync.crypto.totalValue
      exposedCapital = this.positionSync.crypto.totalValue
    } else {
      totalCapital = state.buyingPower + this.positionSync.futures.totalValue
      exposedCapital = this.positionSync.futures.totalValue
    }

    return {
      value: exposedCapital,
      percent: totalCapital > 0 ? (exposedCapital / totalCapital) * 100 : 0,
    }
  }

  // ===========================================================================
  // RISK MANAGEMENT
  // ===========================================================================

  /**
   * Check if trade is within risk limits
   */
  async checkRiskLimits(market: MarketType, tradeValue: number): Promise<{
    allowed: boolean
    reason?: string
  }> {
    const { riskBudget } = this.config

    // Check daily loss limit
    if (this.dailyPnL.total <= -riskBudget.daily) {
      return { allowed: false, reason: `Daily loss limit reached: $${Math.abs(this.dailyPnL.total).toFixed(2)}` }
    }

    // Check weekly loss limit
    if (this.weeklyPnL.total <= -riskBudget.weekly) {
      return { allowed: false, reason: `Weekly loss limit reached: $${Math.abs(this.weeklyPnL.total).toFixed(2)}` }
    }

    // Check per-trade limit
    if (tradeValue > riskBudget.perTrade) {
      return { allowed: false, reason: `Trade size $${tradeValue} exceeds limit $${riskBudget.perTrade}` }
    }

    // Check prop firm rules for futures
    if (market === 'futures' && this.propFirmManager && !this.propFirmManager.canTrade()) {
      return { allowed: false, reason: 'Prop firm trading disabled' }
    }

    // Check total exposure
    const exposure = await this.calculateExposure(market)
    if (exposure.percent + (tradeValue / exposure.value) * 100 > this.config.maxTotalExposure) {
      return { allowed: false, reason: `Would exceed max exposure of ${this.config.maxTotalExposure}%` }
    }

    // Check correlated exposure
    const correlatedExposure = await this.calculateCorrelatedExposure()
    if (correlatedExposure > this.config.maxCorrelatedExposure) {
      return { allowed: false, reason: `Correlated exposure ${correlatedExposure.toFixed(1)}% exceeds limit` }
    }

    return { allowed: true }
  }

  /**
   * Calculate exposure to correlated assets
   */
  private async calculateCorrelatedExposure(): Promise<number> {
    let maxCorrelatedExposure = 0

    // Check crypto positions against each other
    const cryptoPositions = Array.from(this.positionSync.crypto.positions.entries())
    for (let i = 0; i < cryptoPositions.length; i++) {
      for (let j = i + 1; j < cryptoPositions.length; j++) {
        const [symbol1] = cryptoPositions[i]
        const [symbol2] = cryptoPositions[j]
        const correlation = CORRELATION_MATRIX[`${symbol1}_crypto`]?.[symbol2] || 0

        if (correlation > 0.7) {
          maxCorrelatedExposure = Math.max(maxCorrelatedExposure, correlation * 100)
        }
      }
    }

    // Check cross-market correlations
    for (const [cryptoSymbol] of this.positionSync.crypto.positions) {
      for (const [futuresSymbol] of this.positionSync.futures.positions) {
        const correlation = CORRELATION_MATRIX[`${cryptoSymbol}_USDT`]?.[futuresSymbol] || 0
        if (correlation > 0.5) {
          maxCorrelatedExposure = Math.max(maxCorrelatedExposure, correlation * 100)
        }
      }
    }

    return maxCorrelatedExposure
  }

  /**
   * Check for hedging opportunities
   */
  private async checkHedgingOpportunity(
    signal: SignalResult,
    correlatedMarkets: CrossMarketSignal['correlatedMarkets']
  ): Promise<{ action: 'hedge' | 'none'; reason: string } | null> {
    // Check if we have an existing position that could be hedged
    const market = this.getMarketType(signal.symbol)
    const oppositeMarket = market === 'crypto' ? 'futures' : 'crypto'

    const existingPos = market === 'crypto'
      ? this.positionSync.crypto.positions.get(signal.symbol.replace('_USDT', ''))
      : this.positionSync.futures.positions.get(signal.symbol)

    if (!existingPos) return null

    // Check if signal is opposite to our position
    const isLong = existingPos.quantity > 0
    const signalIsOpposite = (isLong && signal.action === 'SELL') ||
                             (!isLong && signal.action === 'BUY')

    if (signalIsOpposite && existingPos.unrealizedPnL < 0) {
      // We're underwater and getting an opposite signal - consider hedging
      const correlated = correlatedMarkets.find(c => c.market === oppositeMarket)
      if (correlated && correlated.correlation > 0.6) {
        return {
          action: 'hedge',
          reason: `Potential hedge: ${signal.action} ${correlated.symbol} to offset ${signal.symbol} position`,
        }
      }
    }

    return null
  }

  private updateTotalPnL(): void {
    this.dailyPnL.total = this.dailyPnL.crypto + this.dailyPnL.futures
  }

  // ===========================================================================
  // PROP FIRM INTEGRATION
  // ===========================================================================

  /**
   * Get prop firm risk state
   */
  getPropFirmRiskState() {
    if (!this.propFirmManager) return null
    return this.propFirmManager.getRiskState()
  }

  /**
   * Get prop firm summary report
   */
  getPropFirmReport() {
    if (!this.propFirmManager) return null
    return this.propFirmManager.getSummaryReport()
  }

  // ===========================================================================
  // ALLOCATION
  // ===========================================================================

  /**
   * Get current allocation status
   */
  async getAllocationStatus(): Promise<{
    crypto: { target: number; actual: number; drift: number }
    futures: { target: number; actual: number; drift: number }
    needsRebalance: boolean
  }> {
    const cryptoState = this.marketStates.get('crypto')!
    const futuresState = this.marketStates.get('futures')!

    const cryptoValue = cryptoState.buyingPower + this.positionSync.crypto.totalValue
    const futuresValue = futuresState.buyingPower + this.positionSync.futures.totalValue
    const totalValue = cryptoValue + futuresValue

    const cryptoActual = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 50
    const futuresActual = totalValue > 0 ? (futuresValue / totalValue) * 100 : 50

    const cryptoDrift = Math.abs(cryptoActual - this.config.allocation.crypto)
    const futuresDrift = Math.abs(futuresActual - this.config.allocation.futures)

    return {
      crypto: {
        target: this.config.allocation.crypto,
        actual: cryptoActual,
        drift: cryptoDrift,
      },
      futures: {
        target: this.config.allocation.futures,
        actual: futuresActual,
        drift: futuresDrift,
      },
      needsRebalance: cryptoDrift > this.config.allocation.rebalanceThreshold ||
                      futuresDrift > this.config.allocation.rebalanceThreshold,
    }
  }

  // ===========================================================================
  // MARKET STATE
  // ===========================================================================

  /**
   * Get current market states
   */
  getMarketStates(): Map<MarketType, MarketState> {
    return new Map(this.marketStates)
  }

  /**
   * Get Rithmic connection health
   */
  getRithmicHealth() {
    if (!this.rithmicClient) return null
    return this.rithmicClient.getConnectionHealth()
  }

  /**
   * Get market type for a symbol
   */
  private getMarketType(symbol: string): MarketType {
    // Crypto symbols contain underscore (e.g., BTC_USDT)
    if (symbol.includes('_')) return 'crypto'
    // Futures symbols are like ES, NQ, MES, etc.
    return 'futures'
  }

  /**
   * Get current futures session
   */
  private getCurrentFuturesSession(): TradingSession {
    const now = new Date()
    const etHour = now.getUTCHours() - 5  // Convert to ET (approximate)
    const day = now.getUTCDay()

    // Futures: Sun 6pm - Fri 5pm ET
    if (day === 6) return 'closed'  // Saturday
    if (day === 0 && etHour < 18) return 'closed'  // Sunday before 6pm
    if (day === 5 && etHour >= 17) return 'closed'  // Friday after 5pm

    // Pre-market: Before 9:30am
    if (etHour < 9 || (etHour === 9 && now.getUTCMinutes() < 30)) return 'pre-market'
    // After-hours: After 4pm
    if (etHour >= 16) return 'after-hours'

    return 'regular'
  }

  // ===========================================================================
  // BACKGROUND PROCESSES
  // ===========================================================================

  private positionSyncInterval: NodeJS.Timeout | null = null
  private marketMonitorInterval: NodeJS.Timeout | null = null

  private startPositionSync(): void {
    // Sync every 10 seconds
    this.positionSyncInterval = setInterval(() => {
      this.syncPositions().catch(console.error)
    }, 10000)
  }

  private startMarketMonitoring(): void {
    // Update market states every 5 seconds
    this.marketMonitorInterval = setInterval(async () => {
      // Update crypto state
      const cryptoState = this.marketStates.get('crypto')!
      try {
        const start = Date.now()
        await this.cryptoClient.getTicker('BTC_USDT')
        cryptoState.latencyMs = Date.now() - start
        cryptoState.lastUpdate = Date.now()
        cryptoState.connected = true
      } catch {
        cryptoState.connected = false
      }

      // Update futures state
      const futuresState = this.marketStates.get('futures')!
      if (this.rithmicClient) {
        futuresState.session = this.getCurrentFuturesSession()
        futuresState.available = futuresState.session !== 'closed' && this.rithmicClient.isConnected()
        futuresState.latencyMs = this.rithmicClient.getLatency('order')
        futuresState.connected = this.rithmicClient.isConnected()
      }

      this.emit('market:update', {
        crypto: cryptoState,
        futures: futuresState,
      })
    }, 5000)
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)

    return () => {
      this.eventHandlers.get(event)?.delete(handler)
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async shutdown(): Promise<void> {
    if (this.positionSyncInterval) {
      clearInterval(this.positionSyncInterval)
    }
    if (this.marketMonitorInterval) {
      clearInterval(this.marketMonitorInterval)
    }
    if (this.rithmicClient) {
      await this.rithmicClient.disconnect()
    }

    console.log('[Coordinator] Shutdown complete')
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMultiMarketCoordinator(
  config?: Partial<CoordinatorConfig>
): MultiMarketCoordinator {
  const defaultConfig: CoordinatorConfig = {
    allocation: {
      crypto: 40,
      futures: 60,  // Prefer futures for lower fees and faster execution
      rebalanceThreshold: 10,
    },
    maxTotalExposure: 80,
    maxCorrelatedExposure: 60,
    preferLiquidity: true,
    optimizeForFees: true,
    enableCrossMarketHedging: true,
    riskBudget: {
      daily: 500,
      weekly: 1500,
      perTrade: 200,
    },
    propFirmPreset: 'apex_50k',
  }

  return new MultiMarketCoordinator({ ...defaultConfig, ...config })
}
