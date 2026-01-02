// @ts-nocheck
// =============================================================================
// POSITION EXIT ENGINE - PRODUCTION GRADE
// =============================================================================
// Automated position management with stop loss, take profit, trailing stops
// Monitors positions in real-time and executes exits automatically
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'

// =============================================================================
// TYPES
// =============================================================================

export interface PositionExitRules {
  stopLoss: {
    enabled: boolean
    type: 'fixed' | 'atr' | 'percent'
    value: number           // Price, ATR multiplier, or percent
    triggerPrice?: number   // Calculated trigger price
  }
  takeProfit: {
    enabled: boolean
    type: 'fixed' | 'atr' | 'percent' | 'rr'  // rr = risk:reward ratio
    value: number
    triggerPrice?: number
  }
  trailingStop: {
    enabled: boolean
    activationPercent: number   // Activate after X% profit
    trailPercent: number        // Trail by X%
    activated: boolean
    highWaterMark?: number      // Highest price since activation
    triggerPrice?: number
  }
  timeStop: {
    enabled: boolean
    maxHoldingMinutes: number
    enteredAt?: Date
  }
  breakEven: {
    enabled: boolean
    activationPercent: number   // Move stop to breakeven after X% profit
    activated: boolean
  }
  partialExits: {
    enabled: boolean
    levels: {
      profitPercent: number     // Exit at X% profit
      exitPercent: number       // Exit Y% of position
      executed: boolean
    }[]
  }
}

export interface MonitoredPosition {
  id: string
  accountId: string
  userId: string
  instrumentName: string
  side: 'long' | 'short'
  quantity: number
  remainingQuantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  exitRules: PositionExitRules
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'closing' | 'closed'
  closeReason?: string
}

export interface ExitEvent {
  positionId: string
  type: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'time_stop' | 'partial_exit' | 'manual'
  triggeredAt: number
  triggerPrice: number
  currentPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
}

// =============================================================================
// EXIT ENGINE CLASS
// =============================================================================

export class PositionExitEngine {
  private positions: Map<string, MonitoredPosition> = new Map()
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map()
  private cryptoClient: ReturnType<typeof createCryptoComClient>

  // Monitoring intervals
  private monitorInterval: NodeJS.Timeout | null = null
  private priceUpdateInterval: NodeJS.Timeout | null = null

  // Event handlers
  private onExitTriggered: ((event: ExitEvent) => Promise<void>) | null = null
  private onPositionUpdated: ((position: MonitoredPosition) => void) | null = null

  // Configuration
  private checkIntervalMs = 1000       // Check positions every second
  private priceUpdateIntervalMs = 500  // Update prices every 500ms
  private staleThresholdMs = 5000      // Consider price stale after 5s

  constructor() {
    this.cryptoClient = createCryptoComClient()
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Start the exit engine
   */
  async start(): Promise<void> {
    console.log('[ExitEngine] Starting position exit engine...')

    // Load active positions from database
    await this.loadActivePositions()

    // Start price updates
    this.startPriceUpdates()

    // Start position monitoring
    this.startPositionMonitoring()

    console.log(`[ExitEngine] Monitoring ${this.positions.size} positions`)
  }

  /**
   * Stop the exit engine
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval)
      this.priceUpdateInterval = null
    }
    console.log('[ExitEngine] Stopped')
  }

  /**
   * Set exit event handler
   */
  setExitHandler(handler: (event: ExitEvent) => Promise<void>): void {
    this.onExitTriggered = handler
  }

  /**
   * Set position update handler
   */
  setUpdateHandler(handler: (position: MonitoredPosition) => void): void {
    this.onPositionUpdated = handler
  }

  // ===========================================================================
  // POSITION MANAGEMENT
  // ===========================================================================

  /**
   * Add a position to monitor
   */
  addPosition(position: MonitoredPosition): void {
    // Calculate initial trigger prices
    this.calculateTriggerPrices(position)
    this.positions.set(position.id, position)

    console.log(`[ExitEngine] Added position ${position.id}: ${position.side} ${position.instrumentName}`)
    console.log(`  Entry: $${position.entryPrice}, SL: $${position.exitRules.stopLoss.triggerPrice}, TP: $${position.exitRules.takeProfit.triggerPrice}`)
  }

  /**
   * Remove a position from monitoring
   */
  removePosition(positionId: string): void {
    this.positions.delete(positionId)
    console.log(`[ExitEngine] Removed position ${positionId}`)
  }

  /**
   * Update position exit rules
   */
  updateExitRules(positionId: string, rules: Partial<PositionExitRules>): void {
    const position = this.positions.get(positionId)
    if (!position) return

    position.exitRules = { ...position.exitRules, ...rules }
    this.calculateTriggerPrices(position)
    position.updatedAt = new Date()

    console.log(`[ExitEngine] Updated exit rules for ${positionId}`)
  }

  /**
   * Get all monitored positions
   */
  getPositions(): MonitoredPosition[] {
    return Array.from(this.positions.values())
  }

  /**
   * Get position by ID
   */
  getPosition(positionId: string): MonitoredPosition | undefined {
    return this.positions.get(positionId)
  }

  // ===========================================================================
  // TRIGGER PRICE CALCULATION
  // ===========================================================================

  /**
   * Calculate trigger prices based on exit rules
   */
  private calculateTriggerPrices(position: MonitoredPosition): void {
    const { entryPrice, side, exitRules } = position

    // Stop Loss
    if (exitRules.stopLoss.enabled) {
      let stopPrice: number

      switch (exitRules.stopLoss.type) {
        case 'fixed':
          stopPrice = exitRules.stopLoss.value
          break
        case 'percent':
          if (side === 'long') {
            stopPrice = entryPrice * (1 - exitRules.stopLoss.value / 100)
          } else {
            stopPrice = entryPrice * (1 + exitRules.stopLoss.value / 100)
          }
          break
        case 'atr':
          // ATR-based stop would need current ATR value
          // For now, use 2% as default
          if (side === 'long') {
            stopPrice = entryPrice * (1 - 0.02 * exitRules.stopLoss.value)
          } else {
            stopPrice = entryPrice * (1 + 0.02 * exitRules.stopLoss.value)
          }
          break
        default:
          stopPrice = side === 'long' ? entryPrice * 0.98 : entryPrice * 1.02
      }

      exitRules.stopLoss.triggerPrice = stopPrice
    }

    // Take Profit
    if (exitRules.takeProfit.enabled) {
      let takeProfitPrice: number

      switch (exitRules.takeProfit.type) {
        case 'fixed':
          takeProfitPrice = exitRules.takeProfit.value
          break
        case 'percent':
          if (side === 'long') {
            takeProfitPrice = entryPrice * (1 + exitRules.takeProfit.value / 100)
          } else {
            takeProfitPrice = entryPrice * (1 - exitRules.takeProfit.value / 100)
          }
          break
        case 'rr':
          // Risk:Reward ratio based on stop loss distance
          const stopDistance = Math.abs(entryPrice - (exitRules.stopLoss.triggerPrice || entryPrice * 0.98))
          if (side === 'long') {
            takeProfitPrice = entryPrice + (stopDistance * exitRules.takeProfit.value)
          } else {
            takeProfitPrice = entryPrice - (stopDistance * exitRules.takeProfit.value)
          }
          break
        case 'atr':
          if (side === 'long') {
            takeProfitPrice = entryPrice * (1 + 0.02 * exitRules.takeProfit.value)
          } else {
            takeProfitPrice = entryPrice * (1 - 0.02 * exitRules.takeProfit.value)
          }
          break
        default:
          takeProfitPrice = side === 'long' ? entryPrice * 1.04 : entryPrice * 0.96
      }

      exitRules.takeProfit.triggerPrice = takeProfitPrice
    }

    // Partial exits - calculate trigger prices
    if (exitRules.partialExits.enabled) {
      for (const level of exitRules.partialExits.levels) {
        if (!level.executed) {
          // Trigger at profit percent from entry
          if (side === 'long') {
            (level as Record<string, unknown>).triggerPrice = entryPrice * (1 + level.profitPercent / 100)
          } else {
            (level as Record<string, unknown>).triggerPrice = entryPrice * (1 - level.profitPercent / 100)
          }
        }
      }
    }
  }

  // ===========================================================================
  // PRICE UPDATES
  // ===========================================================================

  /**
   * Start real-time price updates
   */
  private startPriceUpdates(): void {
    this.priceUpdateInterval = setInterval(async () => {
      const instruments = new Set<string>()

      for (const position of this.positions.values()) {
        instruments.add(position.instrumentName)
      }

      for (const instrument of instruments) {
        try {
          const ticker = await this.cryptoClient.getTicker(instrument)
          if (ticker) {
            this.priceCache.set(instrument, {
              price: parseFloat(ticker.a),  // Ask price
              timestamp: Date.now(),
            })
          }
        } catch (error) {
          console.error(`[ExitEngine] Price update failed for ${instrument}:`, error)
        }
      }
    }, this.priceUpdateIntervalMs)
  }

  /**
   * Get current price for instrument
   */
  private getCurrentPrice(instrument: string): number | null {
    const cached = this.priceCache.get(instrument)
    if (!cached) return null
    if (Date.now() - cached.timestamp > this.staleThresholdMs) return null
    return cached.price
  }

  // ===========================================================================
  // POSITION MONITORING
  // ===========================================================================

  /**
   * Start position monitoring loop
   */
  private startPositionMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.checkAllPositions()
    }, this.checkIntervalMs)
  }

  /**
   * Check all positions for exit conditions
   */
  private async checkAllPositions(): Promise<void> {
    for (const position of this.positions.values()) {
      if (position.status !== 'active') continue

      const currentPrice = this.getCurrentPrice(position.instrumentName)
      if (!currentPrice) continue

      // Update position with current price
      position.currentPrice = currentPrice
      position.unrealizedPnL = this.calculatePnL(position, currentPrice)
      position.unrealizedPnLPercent = (position.unrealizedPnL / (position.entryPrice * position.remainingQuantity)) * 100

      // Check exit conditions in priority order
      await this.checkExitConditions(position, currentPrice)

      // Notify of position update
      this.onPositionUpdated?.(position)
    }
  }

  /**
   * Check all exit conditions for a position
   */
  private async checkExitConditions(position: MonitoredPosition, currentPrice: number): Promise<void> {
    const { exitRules, side } = position

    // 1. Check Stop Loss
    if (exitRules.stopLoss.enabled && exitRules.stopLoss.triggerPrice) {
      const triggered = side === 'long'
        ? currentPrice <= exitRules.stopLoss.triggerPrice
        : currentPrice >= exitRules.stopLoss.triggerPrice

      if (triggered) {
        await this.triggerExit(position, 'stop_loss', currentPrice, position.remainingQuantity)
        return
      }
    }

    // 2. Check Take Profit
    if (exitRules.takeProfit.enabled && exitRules.takeProfit.triggerPrice) {
      const triggered = side === 'long'
        ? currentPrice >= exitRules.takeProfit.triggerPrice
        : currentPrice <= exitRules.takeProfit.triggerPrice

      if (triggered) {
        await this.triggerExit(position, 'take_profit', currentPrice, position.remainingQuantity)
        return
      }
    }

    // 3. Check Trailing Stop
    if (exitRules.trailingStop.enabled) {
      await this.checkTrailingStop(position, currentPrice)
    }

    // 4. Check Time Stop
    if (exitRules.timeStop.enabled && exitRules.timeStop.enteredAt) {
      const holdingTime = Date.now() - exitRules.timeStop.enteredAt.getTime()
      const maxHoldingTime = exitRules.timeStop.maxHoldingMinutes * 60 * 1000

      if (holdingTime >= maxHoldingTime) {
        await this.triggerExit(position, 'time_stop', currentPrice, position.remainingQuantity)
        return
      }
    }

    // 5. Check Break Even
    if (exitRules.breakEven.enabled && !exitRules.breakEven.activated) {
      const profitPercent = position.unrealizedPnLPercent

      if (profitPercent >= exitRules.breakEven.activationPercent) {
        // Move stop loss to break even
        exitRules.stopLoss.triggerPrice = position.entryPrice
        exitRules.breakEven.activated = true
        console.log(`[ExitEngine] Break even activated for ${position.id} at ${currentPrice}`)
      }
    }

    // 6. Check Partial Exits
    if (exitRules.partialExits.enabled) {
      for (const level of exitRules.partialExits.levels) {
        if (level.executed) continue

        const triggerPrice = (level as Record<string, unknown>).triggerPrice as number
        const triggered = side === 'long'
          ? currentPrice >= triggerPrice
          : currentPrice <= triggerPrice

        if (triggered) {
          const exitQuantity = position.remainingQuantity * (level.exitPercent / 100)
          await this.triggerExit(position, 'partial_exit', currentPrice, exitQuantity)
          level.executed = true
        }
      }
    }
  }

  /**
   * Check and update trailing stop
   */
  private async checkTrailingStop(position: MonitoredPosition, currentPrice: number): Promise<void> {
    const { exitRules, side, entryPrice } = position
    const trailing = exitRules.trailingStop

    const profitPercent = position.unrealizedPnLPercent

    // Activate trailing stop if profit threshold reached
    if (!trailing.activated && profitPercent >= trailing.activationPercent) {
      trailing.activated = true
      trailing.highWaterMark = currentPrice
      trailing.triggerPrice = this.calculateTrailingStopPrice(side, currentPrice, trailing.trailPercent)

      console.log(`[ExitEngine] Trailing stop activated for ${position.id} at ${currentPrice}`)
      console.log(`  High water mark: ${trailing.highWaterMark}, Trigger: ${trailing.triggerPrice}`)
    }

    // Update trailing stop if activated
    if (trailing.activated) {
      // Update high water mark
      if (side === 'long' && currentPrice > (trailing.highWaterMark || 0)) {
        trailing.highWaterMark = currentPrice
        trailing.triggerPrice = this.calculateTrailingStopPrice(side, currentPrice, trailing.trailPercent)
      } else if (side === 'short' && currentPrice < (trailing.highWaterMark || Infinity)) {
        trailing.highWaterMark = currentPrice
        trailing.triggerPrice = this.calculateTrailingStopPrice(side, currentPrice, trailing.trailPercent)
      }

      // Check if trailing stop triggered
      const triggered = side === 'long'
        ? currentPrice <= trailing.triggerPrice!
        : currentPrice >= trailing.triggerPrice!

      if (triggered) {
        await this.triggerExit(position, 'trailing_stop', currentPrice, position.remainingQuantity)
      }
    }
  }

  /**
   * Calculate trailing stop trigger price
   */
  private calculateTrailingStopPrice(side: 'long' | 'short', currentPrice: number, trailPercent: number): number {
    if (side === 'long') {
      return currentPrice * (1 - trailPercent / 100)
    } else {
      return currentPrice * (1 + trailPercent / 100)
    }
  }

  // ===========================================================================
  // EXIT EXECUTION
  // ===========================================================================

  /**
   * Trigger an exit
   */
  private async triggerExit(
    position: MonitoredPosition,
    type: ExitEvent['type'],
    currentPrice: number,
    quantity: number
  ): Promise<void> {
    const pnl = this.calculatePnL(position, currentPrice, quantity)
    const pnlPercent = (pnl / (position.entryPrice * quantity)) * 100

    const event: ExitEvent = {
      positionId: position.id,
      type,
      triggeredAt: Date.now(),
      triggerPrice: this.getTriggerPrice(position, type),
      currentPrice,
      quantity,
      pnl,
      pnlPercent,
    }

    console.log(`[ExitEngine] EXIT TRIGGERED: ${type.toUpperCase()}`)
    console.log(`  Position: ${position.id} (${position.side} ${position.instrumentName})`)
    console.log(`  Quantity: ${quantity} @ $${currentPrice}`)
    console.log(`  P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)

    // Update position state
    position.remainingQuantity -= quantity
    if (position.remainingQuantity <= 0) {
      position.status = 'closed'
      position.closeReason = type
    }

    // Execute the exit
    if (this.onExitTriggered) {
      try {
        await this.onExitTriggered(event)
      } catch (error) {
        console.error(`[ExitEngine] Exit execution failed:`, error)
        // Revert position state on failure
        position.remainingQuantity += quantity
        position.status = 'active'
        position.closeReason = undefined
      }
    }

    // Update database
    await this.updatePositionInDB(position, event)
  }

  /**
   * Get the trigger price for an exit type
   */
  private getTriggerPrice(position: MonitoredPosition, type: ExitEvent['type']): number {
    switch (type) {
      case 'stop_loss':
        return position.exitRules.stopLoss.triggerPrice || position.currentPrice
      case 'take_profit':
        return position.exitRules.takeProfit.triggerPrice || position.currentPrice
      case 'trailing_stop':
        return position.exitRules.trailingStop.triggerPrice || position.currentPrice
      default:
        return position.currentPrice
    }
  }

  /**
   * Calculate P&L for a position
   */
  private calculatePnL(position: MonitoredPosition, currentPrice: number, quantity?: number): number {
    const qty = quantity || position.remainingQuantity
    const priceDiff = currentPrice - position.entryPrice

    if (position.side === 'long') {
      return priceDiff * qty
    } else {
      return -priceDiff * qty
    }
  }

  // ===========================================================================
  // DATABASE OPERATIONS
  // ===========================================================================

  /**
   * Load active positions from database
   */
  private async loadActivePositions(): Promise<void> {
    try {
      const supabase = await createClient()
      const { data: positions, error } = await supabase
        .from('stuntman_positions')
        .select('*')
        .eq('status', 'open')

      if (error) {
        console.error('[ExitEngine] Failed to load positions:', error)
        return
      }

      for (const pos of positions || []) {
        const monitoredPos: MonitoredPosition = {
          id: pos.id,
          accountId: pos.account_id,
          userId: pos.user_id,
          instrumentName: pos.instrument_name,
          side: pos.side === 'buy' ? 'long' : 'short',
          quantity: parseFloat(pos.quantity),
          remainingQuantity: parseFloat(pos.quantity),
          entryPrice: parseFloat(pos.entry_price),
          currentPrice: parseFloat(pos.entry_price),
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          exitRules: this.parseExitRules(pos),
          createdAt: new Date(pos.opened_at),
          updatedAt: new Date(),
          status: 'active',
        }

        this.addPosition(monitoredPos)
      }
    } catch (error) {
      console.error('[ExitEngine] Error loading positions:', error)
    }
  }

  /**
   * Parse exit rules from database position
   */
  private parseExitRules(pos: Record<string, unknown>): PositionExitRules {
    return {
      stopLoss: {
        enabled: !!pos.stop_loss,
        type: 'fixed',
        value: parseFloat(pos.stop_loss as string) || 0,
        triggerPrice: parseFloat(pos.stop_loss as string) || undefined,
      },
      takeProfit: {
        enabled: !!pos.take_profit,
        type: 'fixed',
        value: parseFloat(pos.take_profit as string) || 0,
        triggerPrice: parseFloat(pos.take_profit as string) || undefined,
      },
      trailingStop: {
        enabled: !!(pos.trailing_stop_percent),
        activationPercent: 1,
        trailPercent: parseFloat(pos.trailing_stop_percent as string) || 1.5,
        activated: false,
      },
      timeStop: {
        enabled: false,
        maxHoldingMinutes: 1440,  // 24 hours default
        enteredAt: new Date(pos.opened_at as string),
      },
      breakEven: {
        enabled: true,
        activationPercent: 1,
        activated: false,
      },
      partialExits: {
        enabled: false,
        levels: [],
      },
    }
  }

  /**
   * Update position in database after exit
   */
  private async updatePositionInDB(position: MonitoredPosition, event: ExitEvent): Promise<void> {
    try {
      const supabase = await createClient()

      if (position.status === 'closed') {
        await supabase
          .from('stuntman_positions')
          .update({
            status: 'closed',
            close_reason: event.type,
            closed_at: new Date().toISOString(),
            close_price: event.currentPrice,
            realized_pnl: event.pnl,
          })
          .eq('id', position.id)
      } else {
        // Partial exit - update remaining quantity
        await supabase
          .from('stuntman_positions')
          .update({
            quantity: position.remainingQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', position.id)
      }

      // Log the exit event
      await supabase
        .from('stuntman_trades')
        .insert({
          account_id: position.accountId,
          user_id: position.userId,
          position_id: position.id,
          instrument_name: position.instrumentName,
          side: position.side === 'long' ? 'sell' : 'buy',  // Exit is opposite
          quantity: event.quantity,
          price: event.currentPrice,
          pnl: event.pnl,
          pnl_percent: event.pnlPercent,
          executed_at: new Date().toISOString(),
        })

    } catch (error) {
      console.error('[ExitEngine] Database update failed:', error)
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let exitEngineInstance: PositionExitEngine | null = null

export function getPositionExitEngine(): PositionExitEngine {
  if (!exitEngineInstance) {
    exitEngineInstance = new PositionExitEngine()
  }
  return exitEngineInstance
}

export function createPositionExitEngine(): PositionExitEngine {
  return new PositionExitEngine()
}
