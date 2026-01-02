// @ts-nocheck
// =============================================================================
// RISK ENFORCEMENT ENGINE - PRODUCTION GRADE
// =============================================================================
// Real-time risk management for prop firm compliance
// Monitors and enforces daily loss limits, drawdown, position limits
// Integrated with Rithmic for sub-millisecond execution
// =============================================================================

import {
  FUTURES_SPECS,
  FuturesSymbol,
  PropFirmRules,
  APEX_RULES_50K as APEX_RULES,
  APEX_RULES_100K,
} from '@/lib/rithmic'

// =============================================================================
// TYPES
// =============================================================================

export interface RiskLimits {
  // Daily limits
  maxDailyLoss: number              // $ amount
  maxDailyLossPercent: number       // % of starting balance

  // Trailing drawdown (prop firm style)
  maxTrailingDrawdown: number       // $ amount
  trailingDrawdownHighWater: number // Highest equity reached

  // Position limits
  maxPositionSize: number           // Max contracts per position
  maxTotalExposure: number          // Max total contracts open
  maxCorrelatedPositions: number    // Max correlated positions

  // Per trade limits
  maxRiskPerTrade: number           // $ risk per trade
  maxRiskPerTradePercent: number    // % risk per trade

  // Time limits
  tradingHoursOnly: boolean
  noTradingBeforeNews: boolean
  noTradingLastHour: boolean

  // Scaling rules
  scalingEnabled: boolean
  scalingLevels: { profitLevel: number; maxContracts: number }[]
}

export interface RiskState {
  // Current P&L
  dailyPnL: number
  dailyPnLPercent: number
  weeklyPnL: number
  monthlyPnL: number

  // Drawdown tracking
  currentDrawdown: number
  currentDrawdownPercent: number
  highWaterMark: number
  isAtHighWaterMark: boolean

  // Position state
  openPositions: number
  totalExposure: number             // Total contracts
  exposureBySymbol: Map<string, number>

  // Risk status
  status: 'normal' | 'warning' | 'critical' | 'halted'
  violations: RiskViolation[]
  allowNewTrades: boolean
  allowedContractsRemaining: number

  // Timestamps
  lastUpdate: number
  tradingStartTime: number
  startingBalance: number
}

export interface RiskViolation {
  id: string
  type: 'daily_loss' | 'drawdown' | 'position_size' | 'exposure' | 'correlation' | 'time' | 'other'
  severity: 'warning' | 'critical' | 'halt'
  message: string
  timestamp: number
  value: number
  limit: number
  action: 'warn' | 'reduce' | 'close_all' | 'halt_trading'
}

export interface TradeValidation {
  allowed: boolean
  maxContracts: number
  warnings: string[]
  errors: string[]
  adjustedStopLoss?: number
  adjustedTakeProfit?: number
}

// =============================================================================
// RISK ENGINE CLASS
// =============================================================================

export class RiskEngine {
  private limits: RiskLimits
  private state: RiskState
  private propFirmRules: PropFirmRules

  // Event handlers
  private onViolation: ((violation: RiskViolation) => void) | null = null
  private onStatusChange: ((state: RiskState) => void) | null = null

  constructor(limits: RiskLimits, propFirmRules: PropFirmRules = APEX_RULES, startingBalance: number) {
    this.limits = limits
    this.propFirmRules = propFirmRules

    this.state = {
      dailyPnL: 0,
      dailyPnLPercent: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
      highWaterMark: startingBalance,
      isAtHighWaterMark: true,
      openPositions: 0,
      totalExposure: 0,
      exposureBySymbol: new Map(),
      status: 'normal',
      violations: [],
      allowNewTrades: true,
      allowedContractsRemaining: limits.maxTotalExposure,
      lastUpdate: Date.now(),
      tradingStartTime: Date.now(),
      startingBalance,
    }
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  setViolationHandler(handler: (violation: RiskViolation) => void): void {
    this.onViolation = handler
  }

  setStatusHandler(handler: (state: RiskState) => void): void {
    this.onStatusChange = handler
  }

  updateLimits(limits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...limits }
    this.checkAllLimits()
  }

  // ===========================================================================
  // TRADE VALIDATION
  // ===========================================================================

  /**
   * Validate a proposed trade before execution
   */
  validateTrade(
    symbol: FuturesSymbol,
    side: 'buy' | 'sell',
    contracts: number,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): TradeValidation {
    const warnings: string[] = []
    const errors: string[] = []
    let maxContracts = contracts
    let allowed = true

    // 1. Check if trading is halted
    if (this.state.status === 'halted') {
      errors.push('Trading is halted due to risk violations')
      return { allowed: false, maxContracts: 0, warnings, errors }
    }

    if (!this.state.allowNewTrades) {
      errors.push('New trades not allowed - daily loss limit approached')
      return { allowed: false, maxContracts: 0, warnings, errors }
    }

    // 2. Check trading hours
    if (this.limits.tradingHoursOnly && !this.isWithinTradingHours()) {
      errors.push('Trading not allowed outside regular hours')
      return { allowed: false, maxContracts: 0, warnings, errors }
    }

    // 3. Check position size limits
    const currentExposure = this.state.exposureBySymbol.get(symbol) || 0
    const newTotalExposure = currentExposure + contracts

    if (newTotalExposure > this.limits.maxPositionSize) {
      maxContracts = Math.max(0, this.limits.maxPositionSize - currentExposure)
      if (maxContracts === 0) {
        errors.push(`Max position size reached for ${symbol}: ${this.limits.maxPositionSize} contracts`)
        allowed = false
      } else {
        warnings.push(`Position size reduced to ${maxContracts} contracts (max: ${this.limits.maxPositionSize})`)
      }
    }

    // 4. Check total exposure
    if (this.state.totalExposure + contracts > this.limits.maxTotalExposure) {
      maxContracts = Math.max(0, this.limits.maxTotalExposure - this.state.totalExposure)
      if (maxContracts === 0) {
        errors.push(`Max total exposure reached: ${this.limits.maxTotalExposure} contracts`)
        allowed = false
      } else {
        warnings.push(`Contracts reduced to ${maxContracts} due to exposure limit`)
      }
    }

    // 5. Check scaling rules
    if (this.limits.scalingEnabled) {
      const allowedByScaling = this.getScalingAllowedContracts()
      if (contracts > allowedByScaling) {
        maxContracts = Math.min(maxContracts, allowedByScaling)
        if (allowedByScaling === 0) {
          errors.push('Scaling rules do not allow additional contracts at current profit level')
          allowed = false
        } else {
          warnings.push(`Contracts limited to ${allowedByScaling} by scaling rules`)
        }
      }
    }

    // 6. Check per-trade risk
    const spec = FUTURES_SPECS[symbol]
    const riskPerContract = Math.abs(entryPrice - stopLoss) * spec.pointValue
    const totalRisk = riskPerContract * maxContracts

    if (totalRisk > this.limits.maxRiskPerTrade) {
      const adjustedContracts = Math.floor(this.limits.maxRiskPerTrade / riskPerContract)
      if (adjustedContracts < maxContracts) {
        maxContracts = adjustedContracts
        warnings.push(`Contracts reduced to ${maxContracts} to meet risk limit ($${this.limits.maxRiskPerTrade})`)
      }
    }

    // 7. Check if this trade would exceed daily loss limit
    const potentialLoss = riskPerContract * maxContracts
    if (this.state.dailyPnL - potentialLoss < -this.limits.maxDailyLoss) {
      const safeContracts = Math.floor(
        (this.limits.maxDailyLoss + this.state.dailyPnL) / riskPerContract
      )
      if (safeContracts <= 0) {
        errors.push('Trade would exceed daily loss limit if stopped out')
        allowed = false
      } else if (safeContracts < maxContracts) {
        maxContracts = safeContracts
        warnings.push(`Contracts limited to ${maxContracts} to protect daily loss limit`)
      }
    }

    // 8. Check drawdown limit
    const potentialDrawdown = this.state.currentDrawdown + potentialLoss
    if (potentialDrawdown > this.limits.maxTrailingDrawdown) {
      const safeContracts = Math.floor(
        (this.limits.maxTrailingDrawdown - this.state.currentDrawdown) / riskPerContract
      )
      if (safeContracts <= 0) {
        errors.push('Trade would risk exceeding trailing drawdown limit')
        allowed = false
      } else if (safeContracts < maxContracts) {
        maxContracts = safeContracts
        warnings.push(`Contracts limited to ${maxContracts} to protect drawdown limit`)
      }
    }

    // 9. Adjust stop loss if too wide
    const maxRiskPercent = this.limits.maxRiskPerTradePercent / 100
    const maxStopDistance = entryPrice * maxRiskPercent

    let adjustedStopLoss: number | undefined
    if (Math.abs(entryPrice - stopLoss) > maxStopDistance) {
      adjustedStopLoss = side === 'buy'
        ? entryPrice - maxStopDistance
        : entryPrice + maxStopDistance
      warnings.push(`Stop loss adjusted to ${adjustedStopLoss.toFixed(2)} to meet risk limit`)
    }

    // Final validation
    if (maxContracts === 0 && allowed) {
      allowed = false
      errors.push('Position size reduced to zero by risk limits')
    }

    return {
      allowed,
      maxContracts: Math.max(0, maxContracts),
      warnings,
      errors,
      adjustedStopLoss,
    }
  }

  // ===========================================================================
  // STATE UPDATES
  // ===========================================================================

  /**
   * Update P&L and check limits
   */
  updatePnL(realizedPnL: number, unrealizedPnL: number): void {
    const totalPnL = realizedPnL + unrealizedPnL

    this.state.dailyPnL = totalPnL
    this.state.dailyPnLPercent = (totalPnL / this.state.startingBalance) * 100

    // Update high water mark and drawdown
    const currentEquity = this.state.startingBalance + totalPnL

    if (currentEquity > this.state.highWaterMark) {
      this.state.highWaterMark = currentEquity
      this.state.isAtHighWaterMark = true
      this.state.currentDrawdown = 0
      this.state.currentDrawdownPercent = 0
    } else {
      this.state.isAtHighWaterMark = false
      this.state.currentDrawdown = this.state.highWaterMark - currentEquity
      this.state.currentDrawdownPercent = (this.state.currentDrawdown / this.state.highWaterMark) * 100
    }

    this.state.lastUpdate = Date.now()
    this.checkAllLimits()
  }

  /**
   * Update position exposure
   */
  updatePositions(positions: { symbol: string; contracts: number }[]): void {
    this.state.exposureBySymbol.clear()
    let totalExposure = 0

    for (const pos of positions) {
      const current = this.state.exposureBySymbol.get(pos.symbol) || 0
      this.state.exposureBySymbol.set(pos.symbol, current + Math.abs(pos.contracts))
      totalExposure += Math.abs(pos.contracts)
    }

    this.state.totalExposure = totalExposure
    this.state.openPositions = positions.length
    this.state.allowedContractsRemaining = Math.max(0, this.limits.maxTotalExposure - totalExposure)

    this.checkAllLimits()
  }

  /**
   * Record a closed trade
   */
  recordTrade(pnl: number): void {
    this.state.dailyPnL += pnl
    this.state.weeklyPnL += pnl
    this.state.monthlyPnL += pnl

    this.updatePnL(this.state.dailyPnL, 0)
  }

  /**
   * Reset daily stats (call at start of each trading day)
   */
  resetDaily(): void {
    this.state.dailyPnL = 0
    this.state.dailyPnLPercent = 0
    this.state.violations = this.state.violations.filter(v => v.type !== 'daily_loss')
    this.state.tradingStartTime = Date.now()

    if (this.state.status !== 'halted') {
      this.state.status = 'normal'
      this.state.allowNewTrades = true
    }

    console.log('[Risk] Daily stats reset')
  }

  /**
   * Reset weekly stats
   */
  resetWeekly(): void {
    this.state.weeklyPnL = 0
    console.log('[Risk] Weekly stats reset')
  }

  // ===========================================================================
  // LIMIT CHECKING
  // ===========================================================================

  private checkAllLimits(): void {
    this.checkDailyLossLimit()
    this.checkDrawdownLimit()
    this.checkExposureLimits()

    // Update overall status
    this.updateStatus()

    // Notify of state change
    this.onStatusChange?.(this.state)
  }

  private checkDailyLossLimit(): void {
    const warningThreshold = this.limits.maxDailyLoss * 0.8
    const criticalThreshold = this.limits.maxDailyLoss * 0.95

    if (this.state.dailyPnL <= -this.limits.maxDailyLoss) {
      this.addViolation({
        type: 'daily_loss',
        severity: 'halt',
        message: `Daily loss limit reached: $${Math.abs(this.state.dailyPnL).toFixed(2)}`,
        value: Math.abs(this.state.dailyPnL),
        limit: this.limits.maxDailyLoss,
        action: 'halt_trading',
      })
      this.state.allowNewTrades = false
    } else if (this.state.dailyPnL <= -criticalThreshold) {
      this.addViolation({
        type: 'daily_loss',
        severity: 'critical',
        message: `Approaching daily loss limit: $${Math.abs(this.state.dailyPnL).toFixed(2)} / $${this.limits.maxDailyLoss}`,
        value: Math.abs(this.state.dailyPnL),
        limit: this.limits.maxDailyLoss,
        action: 'reduce',
      })
      this.state.allowNewTrades = false
    } else if (this.state.dailyPnL <= -warningThreshold) {
      this.addViolation({
        type: 'daily_loss',
        severity: 'warning',
        message: `80% of daily loss limit used: $${Math.abs(this.state.dailyPnL).toFixed(2)}`,
        value: Math.abs(this.state.dailyPnL),
        limit: this.limits.maxDailyLoss,
        action: 'warn',
      })
    }
  }

  private checkDrawdownLimit(): void {
    const warningThreshold = this.limits.maxTrailingDrawdown * 0.7
    const criticalThreshold = this.limits.maxTrailingDrawdown * 0.9

    if (this.state.currentDrawdown >= this.limits.maxTrailingDrawdown) {
      this.addViolation({
        type: 'drawdown',
        severity: 'halt',
        message: `Trailing drawdown limit reached: $${this.state.currentDrawdown.toFixed(2)}`,
        value: this.state.currentDrawdown,
        limit: this.limits.maxTrailingDrawdown,
        action: 'close_all',
      })
      this.state.allowNewTrades = false
    } else if (this.state.currentDrawdown >= criticalThreshold) {
      this.addViolation({
        type: 'drawdown',
        severity: 'critical',
        message: `90% of drawdown limit: $${this.state.currentDrawdown.toFixed(2)} / $${this.limits.maxTrailingDrawdown}`,
        value: this.state.currentDrawdown,
        limit: this.limits.maxTrailingDrawdown,
        action: 'reduce',
      })
    } else if (this.state.currentDrawdown >= warningThreshold) {
      this.addViolation({
        type: 'drawdown',
        severity: 'warning',
        message: `70% of drawdown limit used: $${this.state.currentDrawdown.toFixed(2)}`,
        value: this.state.currentDrawdown,
        limit: this.limits.maxTrailingDrawdown,
        action: 'warn',
      })
    }
  }

  private checkExposureLimits(): void {
    if (this.state.totalExposure > this.limits.maxTotalExposure) {
      this.addViolation({
        type: 'exposure',
        severity: 'critical',
        message: `Total exposure exceeded: ${this.state.totalExposure} / ${this.limits.maxTotalExposure} contracts`,
        value: this.state.totalExposure,
        limit: this.limits.maxTotalExposure,
        action: 'reduce',
      })
    }
  }

  private addViolation(violation: Omit<RiskViolation, 'id' | 'timestamp'>): void {
    // Check if similar violation already exists
    const existing = this.state.violations.find(
      v => v.type === violation.type && v.severity === violation.severity
    )

    if (existing) {
      // Update existing violation
      existing.value = violation.value
      existing.message = violation.message
      existing.timestamp = Date.now()
    } else {
      // Add new violation
      const fullViolation: RiskViolation = {
        ...violation,
        id: `${violation.type}_${Date.now()}`,
        timestamp: Date.now(),
      }
      this.state.violations.push(fullViolation)
      this.onViolation?.(fullViolation)

      console.log(`[Risk] VIOLATION: ${violation.severity.toUpperCase()} - ${violation.message}`)
    }
  }

  private updateStatus(): void {
    const hasHalt = this.state.violations.some(v => v.severity === 'halt')
    const hasCritical = this.state.violations.some(v => v.severity === 'critical')
    const hasWarning = this.state.violations.some(v => v.severity === 'warning')

    if (hasHalt) {
      this.state.status = 'halted'
      this.state.allowNewTrades = false
    } else if (hasCritical) {
      this.state.status = 'critical'
    } else if (hasWarning) {
      this.state.status = 'warning'
    } else {
      this.state.status = 'normal'
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getScalingAllowedContracts(): number {
    if (!this.limits.scalingEnabled || !this.limits.scalingLevels.length) {
      return this.limits.maxPositionSize
    }

    const profit = this.state.dailyPnL
    let allowed = this.limits.scalingLevels[0].maxContracts

    for (const level of this.limits.scalingLevels) {
      if (profit >= level.profitLevel) {
        allowed = level.maxContracts
      }
    }

    return allowed - this.state.totalExposure
  }

  private isWithinTradingHours(): boolean {
    const now = new Date()
    const day = now.getUTCDay()

    // No weekend trading for stocks/futures
    if (day === 0 || day === 6) return false

    const hour = (now.getUTCHours() - 5 + 24) % 24  // Convert to ET
    const minute = now.getUTCMinutes()
    const time = hour + minute / 60

    // Regular hours: 9:30 AM - 4:00 PM ET
    return time >= 9.5 && time < 16
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  getState(): RiskState {
    return { ...this.state }
  }

  getLimits(): RiskLimits {
    return { ...this.limits }
  }

  isTradeAllowed(): boolean {
    return this.state.allowNewTrades && this.state.status !== 'halted'
  }

  getRemainingRisk(): number {
    return Math.max(0, this.limits.maxDailyLoss + this.state.dailyPnL)
  }

  getRemainingDrawdown(): number {
    return Math.max(0, this.limits.maxTrailingDrawdown - this.state.currentDrawdown)
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createRiskEngine(
  startingBalance: number,
  propFirmRules: PropFirmRules = APEX_RULES
): RiskEngine {
  const limits: RiskLimits = {
    maxDailyLoss: Math.abs(propFirmRules.maxDailyLoss),
    maxDailyLossPercent: 5,
    maxTrailingDrawdown: propFirmRules.maxDrawdown,
    trailingDrawdownHighWater: startingBalance,
    maxPositionSize: propFirmRules.maxPositionSize,
    maxTotalExposure: propFirmRules.maxPositionSize * 2,
    maxCorrelatedPositions: 2,
    maxRiskPerTrade: startingBalance * 0.02,  // 2% per trade
    maxRiskPerTradePercent: 2,
    tradingHoursOnly: propFirmRules.tradingHoursOnly,
    noTradingBeforeNews: true,
    noTradingLastHour: true,
    scalingEnabled: true,
    scalingLevels: propFirmRules.scalingPlan,
  }

  return new RiskEngine(limits, propFirmRules, startingBalance)
}
