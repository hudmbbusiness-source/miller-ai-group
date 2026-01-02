// =============================================================================
// PROP FIRM MANAGER - INSTITUTIONAL GRADE
// =============================================================================
// Real-time prop firm rule enforcement with Rithmic integration
// Protects your funded account from rule violations
// =============================================================================

import { EventEmitter } from 'events'
import {
  RithmicClient,
  RithmicPosition,
  RithmicAccountBalance,
  RithmicOrder,
  OrderRequest,
  PropFirmRules,
  FuturesSymbol,
  FUTURES_SPECS,
  APEX_RULES_50K,
  APEX_RULES_100K,
} from './index'

// =============================================================================
// TYPES
// =============================================================================

export interface PropFirmConfig {
  rules: PropFirmRules
  accountId: string
  startingBalance: number
  startDate: Date
  alertWebhook?: string
  emergencyFlatten?: boolean
}

export interface RiskState {
  // Current state
  currentBalance: number
  openPnL: number
  closedPnL: number
  totalPnL: number
  highWaterMark: number

  // Drawdown tracking
  trailingDrawdown: number
  maxDrawdownReached: number
  distanceToDrawdown: number
  drawdownPercent: number

  // Daily tracking
  dailyPnL: number
  dailyTrades: number
  dailyMaxLoss: number

  // Position state
  totalContracts: number
  maxContractsAllowed: number
  positionsBySymbol: Map<string, number>

  // Status
  isTradingAllowed: boolean
  isInDanger: boolean
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical'
  violations: string[]
  warnings: string[]

  // Timestamps
  lastUpdate: number
  tradingDaysCount: number
}

export interface TradeValidation {
  allowed: boolean
  reason?: string
  maxQuantity?: number
  riskLevel: 'safe' | 'caution' | 'warning'
}

export interface PropFirmAlert {
  type: 'warning' | 'danger' | 'violation' | 'success'
  message: string
  riskState: Partial<RiskState>
  timestamp: number
}

// =============================================================================
// PROP FIRM PRESETS
// =============================================================================

export const PROP_FIRM_PRESETS: Record<string, PropFirmRules> = {
  'apex_50k': APEX_RULES_50K,
  'apex_100k': APEX_RULES_100K,
  'apex_150k': {
    firmName: 'Apex Trader Funding',
    accountSize: 150000,
    maxDailyLoss: 0,  // Apex has no daily loss limit
    maxTrailingDrawdown: 5000,  // $5,000 trailing threshold
    profitTarget: 9000,  // $9,000 profit goal
    minTradingDays: 7,  // Minimum 7 trading days
    maxPositionSize: 17,  // 17 contracts max
    allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC', 'SI', 'HG', 'ZB', 'ZN', 'ZC'] as FuturesSymbol[],
    tradingHoursOnly: true,  // No positions past 4:59 PM EST
    newsRestriction: false,
    scalingPlan: [
      { profitLevel: 0, maxContracts: 8 },
      { profitLevel: 2500, maxContracts: 12 },
      { profitLevel: 5000, maxContracts: 17 },
    ],
  },
  'apex_250k': {
    ...APEX_RULES_100K,
    accountSize: 250000,
    maxTrailingDrawdown: 6500,
    profitTarget: 15000,
    maxPositionSize: 20,
    scalingPlan: [
      { profitLevel: 0, maxContracts: 10 },
      { profitLevel: 7500, maxContracts: 15 },
      { profitLevel: 12500, maxContracts: 20 },
    ],
  },
  'topstep_50k': {
    firmName: 'TopStep',
    accountSize: 50000,
    maxDailyLoss: 1000,
    maxTrailingDrawdown: 2000,
    profitTarget: 3000,
    minTradingDays: 5,
    maxPositionSize: 5,
    allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'] as FuturesSymbol[],
    tradingHoursOnly: true,
    newsRestriction: true,
    scalingPlan: [
      { profitLevel: 0, maxContracts: 2 },
      { profitLevel: 1000, maxContracts: 3 },
      { profitLevel: 2000, maxContracts: 5 },
    ],
  },
  'topstep_100k': {
    firmName: 'TopStep',
    accountSize: 100000,
    maxDailyLoss: 2000,
    maxTrailingDrawdown: 3000,
    profitTarget: 6000,
    minTradingDays: 5,
    maxPositionSize: 10,
    allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'] as FuturesSymbol[],
    tradingHoursOnly: true,
    newsRestriction: true,
    scalingPlan: [
      { profitLevel: 0, maxContracts: 4 },
      { profitLevel: 2000, maxContracts: 7 },
      { profitLevel: 4000, maxContracts: 10 },
    ],
  },
  'mff_50k': {
    firmName: 'My Funded Futures',
    accountSize: 50000,
    maxDailyLoss: 1100,
    maxTrailingDrawdown: 2000,
    profitTarget: 2500,
    minTradingDays: 3,
    maxPositionSize: 4,
    allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'] as FuturesSymbol[],
    tradingHoursOnly: false,
    newsRestriction: false,
    scalingPlan: [
      { profitLevel: 0, maxContracts: 2 },
      { profitLevel: 1000, maxContracts: 3 },
      { profitLevel: 1800, maxContracts: 4 },
    ],
  },
}

// =============================================================================
// PROP FIRM MANAGER CLASS
// =============================================================================

export class PropFirmManager extends EventEmitter {
  private client: RithmicClient
  private config: PropFirmConfig
  private riskState: RiskState

  // Daily tracking
  private dailyStartBalance: number = 0
  private dailyStartDate: Date = new Date()
  private tradingDays: Set<string> = new Set()

  // Alert throttling
  private lastAlertTime: Map<string, number> = new Map()
  private alertCooldown = 60000 // 1 minute between same alerts

  // Emergency state
  private emergencyFlattenTriggered = false

  constructor(client: RithmicClient, config: PropFirmConfig) {
    super()
    this.client = client
    this.config = config

    // Initialize risk state
    this.riskState = this.createInitialRiskState()

    // Set up event listeners
    this.setupEventListeners()
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  private createInitialRiskState(): RiskState {
    return {
      currentBalance: this.config.startingBalance,
      openPnL: 0,
      closedPnL: 0,
      totalPnL: 0,
      highWaterMark: this.config.startingBalance,
      trailingDrawdown: this.config.startingBalance - this.config.rules.maxTrailingDrawdown,
      maxDrawdownReached: 0,
      distanceToDrawdown: this.config.rules.maxTrailingDrawdown,
      drawdownPercent: 0,
      dailyPnL: 0,
      dailyTrades: 0,
      dailyMaxLoss: this.config.rules.maxDailyLoss,
      totalContracts: 0,
      maxContractsAllowed: this.getMaxContractsForProfitLevel(0),
      positionsBySymbol: new Map(),
      isTradingAllowed: true,
      isInDanger: false,
      riskLevel: 'safe',
      violations: [],
      warnings: [],
      lastUpdate: Date.now(),
      tradingDaysCount: 0,
    }
  }

  private setupEventListeners(): void {
    // Position updates
    this.client.on('position_update', (position: RithmicPosition) => {
      this.handlePositionUpdate(position)
    })

    // Balance updates
    this.client.on('account_update', (balance: RithmicAccountBalance) => {
      this.handleBalanceUpdate(balance)
    })

    // Order fills
    this.client.on('fill', () => {
      this.riskState.dailyTrades++
      this.recordTradingDay()
    })

    // PnL updates
    this.client.on('pnl_update', (update: { openPnL: number; closedPnL: number }) => {
      this.riskState.openPnL = update.openPnL
      this.riskState.closedPnL = update.closedPnL
      this.updateRiskState()
    })
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  private handlePositionUpdate(position: RithmicPosition): void {
    if (position.accountId !== this.config.accountId) return

    // Update position tracking
    const currentQty = Math.abs(position.netPosition)
    this.riskState.positionsBySymbol.set(position.symbol, currentQty)

    // Calculate total contracts
    this.riskState.totalContracts = Array.from(this.riskState.positionsBySymbol.values())
      .reduce((sum, qty) => sum + qty, 0)

    // Update P&L
    this.riskState.openPnL = position.openPnL

    this.updateRiskState()
  }

  private handleBalanceUpdate(balance: RithmicAccountBalance): void {
    if (balance.accountId !== this.config.accountId) return

    this.riskState.currentBalance = balance.totalEquity
    this.riskState.openPnL = balance.openPnL
    this.riskState.closedPnL = balance.closedPnL

    // Update daily P&L
    this.riskState.dailyPnL = balance.closedPnL + balance.openPnL

    // Check for new day
    this.checkNewTradingDay()

    this.updateRiskState()
  }

  private updateRiskState(): void {
    const rules = this.config.rules

    // Calculate total P&L
    this.riskState.totalPnL = this.riskState.openPnL + this.riskState.closedPnL

    // Update high water mark (only when profitable)
    if (this.riskState.currentBalance > this.riskState.highWaterMark) {
      this.riskState.highWaterMark = this.riskState.currentBalance

      // Trailing drawdown moves UP with profit (Apex style)
      this.riskState.trailingDrawdown = this.riskState.highWaterMark - rules.maxTrailingDrawdown
    }

    // Calculate distance to drawdown
    this.riskState.distanceToDrawdown = this.riskState.currentBalance - this.riskState.trailingDrawdown
    this.riskState.maxDrawdownReached = this.riskState.highWaterMark - this.riskState.currentBalance
    this.riskState.drawdownPercent = (this.riskState.maxDrawdownReached / rules.maxTrailingDrawdown) * 100

    // Update max contracts allowed based on profit level
    this.riskState.maxContractsAllowed = this.getMaxContractsForProfitLevel(this.riskState.totalPnL)

    // Check for violations
    this.checkForViolations()

    // Determine risk level
    this.determineRiskLevel()

    // Emit update
    this.riskState.lastUpdate = Date.now()
    this.emit('risk_state_update', this.getRiskState())

    // Send alerts if needed
    this.sendAlerts()
  }

  private checkForViolations(): void {
    const rules = this.config.rules
    this.riskState.violations = []
    this.riskState.warnings = []

    // Check trailing drawdown violation
    if (this.riskState.currentBalance <= this.riskState.trailingDrawdown) {
      this.riskState.violations.push('TRAILING DRAWDOWN BREACHED')
      this.riskState.isTradingAllowed = false

      if (this.config.emergencyFlatten && !this.emergencyFlattenTriggered) {
        this.triggerEmergencyFlatten()
      }
    }

    // Check daily loss limit
    if (rules.maxDailyLoss && this.riskState.dailyPnL <= rules.maxDailyLoss) {
      this.riskState.violations.push('DAILY LOSS LIMIT REACHED')
      this.riskState.isTradingAllowed = false
    }

    // Check position size
    if (this.riskState.totalContracts > rules.maxPositionSize) {
      this.riskState.violations.push(`POSITION SIZE EXCEEDED (${this.riskState.totalContracts}/${rules.maxPositionSize})`)
    }

    // Check scaling plan
    if (this.riskState.totalContracts > this.riskState.maxContractsAllowed) {
      this.riskState.violations.push(`SCALING PLAN EXCEEDED (${this.riskState.totalContracts}/${this.riskState.maxContractsAllowed})`)
    }

    // Warnings (approaching limits)
    const drawdownWarningThreshold = 0.7 // 70% of max drawdown
    if (this.riskState.drawdownPercent >= drawdownWarningThreshold * 100) {
      this.riskState.warnings.push(`Approaching drawdown limit (${this.riskState.drawdownPercent.toFixed(1)}%)`)
    }

    if (rules.maxDailyLoss && this.riskState.dailyPnL <= rules.maxDailyLoss * 0.7) {
      this.riskState.warnings.push(`Approaching daily loss limit ($${Math.abs(this.riskState.dailyPnL).toFixed(0)})`)
    }
  }

  private determineRiskLevel(): void {
    const drawdownPercent = this.riskState.drawdownPercent

    if (this.riskState.violations.length > 0) {
      this.riskState.riskLevel = 'critical'
      this.riskState.isInDanger = true
    } else if (drawdownPercent >= 80) {
      this.riskState.riskLevel = 'danger'
      this.riskState.isInDanger = true
    } else if (drawdownPercent >= 60) {
      this.riskState.riskLevel = 'warning'
      this.riskState.isInDanger = true
    } else if (drawdownPercent >= 40) {
      this.riskState.riskLevel = 'caution'
      this.riskState.isInDanger = false
    } else {
      this.riskState.riskLevel = 'safe'
      this.riskState.isInDanger = false
    }
  }

  private getMaxContractsForProfitLevel(profit: number): number {
    const rules = this.config.rules
    let maxContracts = rules.scalingPlan[0]?.maxContracts || 1

    for (const level of rules.scalingPlan) {
      if (profit >= level.profitLevel) {
        maxContracts = level.maxContracts
      }
    }

    return Math.min(maxContracts, rules.maxPositionSize)
  }

  private checkNewTradingDay(): void {
    const today = new Date().toISOString().split('T')[0]

    if (this.dailyStartDate.toISOString().split('T')[0] !== today) {
      // New trading day
      this.dailyStartDate = new Date()
      this.dailyStartBalance = this.riskState.currentBalance
      this.riskState.dailyPnL = 0
      this.riskState.dailyTrades = 0

      // Reset daily trading allowance if we were stopped
      if (!this.riskState.violations.includes('TRAILING DRAWDOWN BREACHED')) {
        this.riskState.isTradingAllowed = true
      }

      console.log(`[PropFirmManager] New trading day: ${today}`)
      this.emit('new_trading_day', { date: today, startBalance: this.dailyStartBalance })
    }
  }

  private recordTradingDay(): void {
    const today = new Date().toISOString().split('T')[0]
    if (!this.tradingDays.has(today)) {
      this.tradingDays.add(today)
      this.riskState.tradingDaysCount = this.tradingDays.size
    }
  }

  // ===========================================================================
  // TRADE VALIDATION
  // ===========================================================================

  /**
   * Validate a trade before execution
   */
  validateTrade(request: OrderRequest): TradeValidation {
    const rules = this.config.rules
    const symbol = request.symbol as FuturesSymbol

    // Check if trading is allowed
    if (!this.riskState.isTradingAllowed) {
      return {
        allowed: false,
        reason: 'Trading disabled due to rule violations',
        riskLevel: 'warning',
      }
    }

    // Check if instrument is allowed
    if (!rules.allowedInstruments.includes(symbol)) {
      return {
        allowed: false,
        reason: `${symbol} not in allowed instruments list`,
        riskLevel: 'warning',
      }
    }

    // Check position size
    const currentPosition = this.riskState.positionsBySymbol.get(symbol) || 0
    const newTotal = this.riskState.totalContracts - currentPosition + request.quantity

    if (newTotal > rules.maxPositionSize) {
      return {
        allowed: false,
        reason: `Would exceed max position size (${newTotal}/${rules.maxPositionSize})`,
        maxQuantity: rules.maxPositionSize - (this.riskState.totalContracts - currentPosition),
        riskLevel: 'warning',
      }
    }

    // Check scaling plan
    if (newTotal > this.riskState.maxContractsAllowed) {
      return {
        allowed: false,
        reason: `Would exceed scaling plan (${newTotal}/${this.riskState.maxContractsAllowed} at current P&L)`,
        maxQuantity: this.riskState.maxContractsAllowed - (this.riskState.totalContracts - currentPosition),
        riskLevel: 'warning',
      }
    }

    // Calculate potential loss
    if (request.stopPrice !== undefined && request.limitPrice !== undefined) {
      const spec = FUTURES_SPECS[symbol]
      if (spec) {
        const ticksRisk = Math.abs(request.limitPrice - request.stopPrice) / spec.tickSize
        const potentialLoss = ticksRisk * spec.tickSize * spec.pointValue * request.quantity

        // Check if potential loss would breach drawdown
        if (this.riskState.distanceToDrawdown - potentialLoss < 0) {
          return {
            allowed: false,
            reason: `Potential loss ($${potentialLoss.toFixed(0)}) would breach trailing drawdown`,
            riskLevel: 'warning',
          }
        }

        // Warning if high risk
        if (potentialLoss > this.riskState.distanceToDrawdown * 0.5) {
          return {
            allowed: true,
            reason: 'High risk trade - potential loss is >50% of remaining drawdown',
            riskLevel: 'caution',
          }
        }
      }
    }

    // Determine risk level based on current state
    let riskLevel: 'safe' | 'caution' | 'warning' = 'safe'
    if (this.riskState.drawdownPercent >= 50) {
      riskLevel = 'caution'
    }

    return {
      allowed: true,
      riskLevel,
    }
  }

  /**
   * Calculate safe position size based on risk parameters
   */
  calculateSafePositionSize(
    symbol: FuturesSymbol,
    entryPrice: number,
    stopLoss: number,
    riskPercent: number = 1
  ): number {
    const spec = FUTURES_SPECS[symbol]
    if (!spec) return 0

    // Calculate risk per contract
    const ticksRisk = Math.abs(entryPrice - stopLoss) / spec.tickSize
    const riskPerContract = ticksRisk * spec.tickSize * spec.pointValue

    if (riskPerContract === 0) return 0

    // Calculate max risk amount
    const maxRiskAmount = this.riskState.distanceToDrawdown * (riskPercent / 100)

    // Calculate max contracts based on risk
    let maxContractsByRisk = Math.floor(maxRiskAmount / riskPerContract)

    // Limit by scaling plan
    const currentPosition = this.riskState.positionsBySymbol.get(symbol) || 0
    const remainingScaling = this.riskState.maxContractsAllowed - (this.riskState.totalContracts - currentPosition)

    // Limit by max position size
    const remainingPosition = this.config.rules.maxPositionSize - (this.riskState.totalContracts - currentPosition)

    // Return the minimum of all constraints
    return Math.max(0, Math.min(maxContractsByRisk, remainingScaling, remainingPosition))
  }

  // ===========================================================================
  // EMERGENCY ACTIONS
  // ===========================================================================

  private async triggerEmergencyFlatten(): Promise<void> {
    if (this.emergencyFlattenTriggered) return

    this.emergencyFlattenTriggered = true
    console.error('[PropFirmManager] EMERGENCY FLATTEN TRIGGERED!')

    this.emit('emergency_flatten', {
      reason: 'Trailing drawdown breached',
      riskState: this.getRiskState(),
    })

    try {
      // Cancel all orders
      await this.client.cancelAllOrders(this.config.accountId)

      // Flatten all positions
      const positions = this.client.getAllPositions(this.config.accountId)
      for (const position of positions) {
        if (position.netPosition !== 0) {
          await this.client.flattenPosition(
            this.config.accountId,
            position.symbol,
            position.exchange
          )
        }
      }

      console.log('[PropFirmManager] All positions flattened')
      this.sendWebhookAlert({
        type: 'violation',
        message: '🚨 EMERGENCY FLATTEN - All positions closed due to drawdown breach',
        riskState: this.getRiskState(),
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('[PropFirmManager] Emergency flatten failed:', error)
    }
  }

  /**
   * Manually flatten all positions
   */
  async flattenAll(): Promise<void> {
    console.log('[PropFirmManager] Manual flatten requested')

    await this.client.cancelAllOrders(this.config.accountId)

    const positions = this.client.getAllPositions(this.config.accountId)
    for (const position of positions) {
      if (position.netPosition !== 0) {
        await this.client.flattenPosition(
          this.config.accountId,
          position.symbol,
          position.exchange
        )
      }
    }

    this.emit('positions_flattened', { manual: true })
  }

  // ===========================================================================
  // ALERTS
  // ===========================================================================

  private sendAlerts(): void {
    // Danger alert
    if (this.riskState.riskLevel === 'danger' || this.riskState.riskLevel === 'critical') {
      this.throttledAlert('danger', {
        type: 'danger',
        message: `⚠️ DANGER: ${this.riskState.drawdownPercent.toFixed(1)}% of drawdown used. Distance: $${this.riskState.distanceToDrawdown.toFixed(0)}`,
        riskState: this.getRiskState(),
        timestamp: Date.now(),
      })
    }

    // Warning alert
    if (this.riskState.riskLevel === 'warning') {
      this.throttledAlert('warning', {
        type: 'warning',
        message: `⚡ WARNING: ${this.riskState.drawdownPercent.toFixed(1)}% of drawdown used`,
        riskState: this.getRiskState(),
        timestamp: Date.now(),
      })
    }

    // Violation alerts
    for (const violation of this.riskState.violations) {
      this.throttledAlert(`violation_${violation}`, {
        type: 'violation',
        message: `🚨 VIOLATION: ${violation}`,
        riskState: this.getRiskState(),
        timestamp: Date.now(),
      })
    }
  }

  private throttledAlert(key: string, alert: PropFirmAlert): void {
    const lastTime = this.lastAlertTime.get(key) || 0
    const now = Date.now()

    if (now - lastTime >= this.alertCooldown) {
      this.lastAlertTime.set(key, now)
      this.emit('alert', alert)

      if (this.config.alertWebhook) {
        this.sendWebhookAlert(alert)
      }
    }
  }

  private async sendWebhookAlert(alert: PropFirmAlert): Promise<void> {
    if (!this.config.alertWebhook) return

    try {
      await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alert.message,
          type: alert.type,
          riskState: {
            balance: alert.riskState.currentBalance,
            drawdownPercent: alert.riskState.drawdownPercent,
            distanceToDrawdown: alert.riskState.distanceToDrawdown,
            dailyPnL: alert.riskState.dailyPnL,
          },
          timestamp: alert.timestamp,
        }),
      })
    } catch (error) {
      console.error('[PropFirmManager] Failed to send webhook alert:', error)
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get current risk state
   */
  getRiskState(): RiskState {
    return { ...this.riskState }
  }

  /**
   * Get prop firm rules
   */
  getRules(): PropFirmRules {
    return { ...this.config.rules }
  }

  /**
   * Check if trading is allowed
   */
  canTrade(): boolean {
    return this.riskState.isTradingAllowed
  }

  /**
   * Get progress toward profit target
   */
  getProfitProgress(): { current: number; target: number; percent: number } | null {
    const target = this.config.rules.profitTarget
    if (!target) return null

    return {
      current: this.riskState.totalPnL,
      target,
      percent: (this.riskState.totalPnL / target) * 100,
    }
  }

  /**
   * Get trading days progress
   */
  getTradingDaysProgress(): { current: number; required: number; percent: number } | null {
    const required = this.config.rules.minTradingDays
    if (!required) return null

    return {
      current: this.riskState.tradingDaysCount,
      required,
      percent: (this.riskState.tradingDaysCount / required) * 100,
    }
  }

  /**
   * Reset for new evaluation period
   */
  resetEvaluation(newStartingBalance?: number): void {
    this.config.startingBalance = newStartingBalance || this.config.startingBalance
    this.config.startDate = new Date()
    this.tradingDays.clear()
    this.emergencyFlattenTriggered = false
    this.riskState = this.createInitialRiskState()

    console.log('[PropFirmManager] Evaluation reset')
    this.emit('evaluation_reset', { startingBalance: this.config.startingBalance })
  }

  /**
   * Update rules (e.g., when switching account size)
   */
  updateRules(rules: PropFirmRules): void {
    this.config.rules = rules
    this.riskState.maxContractsAllowed = this.getMaxContractsForProfitLevel(this.riskState.totalPnL)
    this.updateRiskState()
  }

  /**
   * Get summary report
   */
  getSummaryReport(): {
    account: string
    firm: string
    balance: number
    totalPnL: number
    drawdownUsed: string
    tradingDays: number
    profitProgress: string | null
    status: string
    violations: string[]
    warnings: string[]
  } {
    const profitProgress = this.getProfitProgress()

    return {
      account: this.config.accountId,
      firm: this.config.rules.firmName,
      balance: this.riskState.currentBalance,
      totalPnL: this.riskState.totalPnL,
      drawdownUsed: `${this.riskState.drawdownPercent.toFixed(1)}%`,
      tradingDays: this.riskState.tradingDaysCount,
      profitProgress: profitProgress
        ? `$${profitProgress.current.toFixed(0)} / $${profitProgress.target} (${profitProgress.percent.toFixed(1)}%)`
        : null,
      status: this.riskState.riskLevel.toUpperCase(),
      violations: [...this.riskState.violations],
      warnings: [...this.riskState.warnings],
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPropFirmManager(
  client: RithmicClient,
  preset: keyof typeof PROP_FIRM_PRESETS | PropFirmRules,
  accountId: string,
  startingBalance: number,
  options: {
    alertWebhook?: string
    emergencyFlatten?: boolean
  } = {}
): PropFirmManager {
  const rules = typeof preset === 'string'
    ? PROP_FIRM_PRESETS[preset]
    : preset

  return new PropFirmManager(client, {
    rules,
    accountId,
    startingBalance,
    startDate: new Date(),
    alertWebhook: options.alertWebhook,
    emergencyFlatten: options.emergencyFlatten ?? true,
  })
}
