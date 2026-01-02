// @ts-nocheck
// =============================================================================
// BACKTEST ENGINE - PRODUCTION GRADE
// =============================================================================
// Historical backtesting with realistic simulation
// Includes slippage, fees, and position sizing
// Uses Rithmic data for accurate historical simulation
// =============================================================================

import { FUTURES_SPECS, FuturesSymbol } from '@/lib/rithmic'
import { OHLCV } from './futures-signal-generator'

// =============================================================================
// TYPES
// =============================================================================

export interface BacktestConfig {
  symbol: FuturesSymbol
  startDate: Date
  endDate: Date
  initialCapital: number
  positionSizing: 'fixed' | 'percent' | 'kelly'
  fixedContracts?: number
  riskPercent?: number
  maxContracts: number
  commissionPerContract: number   // Round-trip commission
  slippagePoints: number          // Slippage in points per trade
  enablePyramiding: boolean
  maxPyramidEntries: number
}

export interface BacktestTrade {
  id: number
  entryTime: Date
  exitTime: Date
  side: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  contracts: number
  grossPnL: number
  commission: number
  slippage: number
  netPnL: number
  pnlPercent: number
  holdingPeriodMinutes: number
  maxFavorableExcursion: number   // MFE - best unrealized profit
  maxAdverseExcursion: number     // MAE - worst unrealized loss
  exitReason: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'signal' | 'end_of_test'
  signalConfidence: number
}

export interface BacktestResult {
  // Configuration
  config: BacktestConfig

  // Summary
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number

  // P&L
  grossProfit: number
  grossLoss: number
  netProfit: number
  netProfitPercent: number
  profitFactor: number            // Gross profit / Gross loss

  // Per trade
  avgWin: number
  avgLoss: number
  avgTrade: number
  largestWin: number
  largestLoss: number

  // Risk metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  maxDrawdownDuration: number     // In minutes
  recoveryFactor: number          // Net profit / Max drawdown
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number             // Annual return / Max drawdown

  // Consistency
  expectancy: number              // Average expected profit per trade
  payoffRatio: number             // Avg win / Avg loss
  consecutiveWins: number
  consecutiveLosses: number

  // Time analysis
  avgHoldingPeriod: number        // In minutes
  bestTradingHour: number
  worstTradingHour: number
  profitByDayOfWeek: Record<string, number>

  // Equity curve
  equityCurve: { timestamp: number; equity: number; drawdown: number }[]

  // Trade list
  trades: BacktestTrade[]

  // Monthly breakdown
  monthlyReturns: { month: string; return: number; trades: number }[]
}

export interface SignalForBacktest {
  timestamp: number
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  contracts?: number
}

// =============================================================================
// BACKTEST ENGINE CLASS
// =============================================================================

export class BacktestEngine {
  private config: BacktestConfig
  private historicalData: OHLCV[] = []
  private signals: SignalForBacktest[] = []

  // State during backtest
  private currentPosition: {
    side: 'long' | 'short' | null
    entryPrice: number
    contracts: number
    stopLoss: number
    takeProfit: number
    entryTime: Date
    maxPrice: number
    minPrice: number
    signalConfidence: number
  } = {
    side: null,
    entryPrice: 0,
    contracts: 0,
    stopLoss: 0,
    takeProfit: 0,
    entryTime: new Date(),
    maxPrice: 0,
    minPrice: Infinity,
    signalConfidence: 0,
  }

  private equity: number = 0
  private peakEquity: number = 0
  private trades: BacktestTrade[] = []
  private equityCurve: { timestamp: number; equity: number; drawdown: number }[] = []

  constructor(config: BacktestConfig) {
    this.config = config
    this.equity = config.initialCapital
    this.peakEquity = config.initialCapital
  }

  // ===========================================================================
  // MAIN BACKTEST
  // ===========================================================================

  /**
   * Run backtest with provided signals
   */
  run(historicalData: OHLCV[], signals: SignalForBacktest[]): BacktestResult {
    console.log(`[Backtest] Starting backtest for ${this.config.symbol}`)
    console.log(`  Period: ${this.config.startDate.toISOString()} to ${this.config.endDate.toISOString()}`)
    console.log(`  Capital: $${this.config.initialCapital.toLocaleString()}`)
    console.log(`  Data points: ${historicalData.length}`)
    console.log(`  Signals: ${signals.length}`)

    this.historicalData = historicalData
    this.signals = signals
    this.reset()

    // Main backtest loop
    for (let i = 0; i < historicalData.length; i++) {
      const bar = historicalData[i]
      const barTime = new Date(bar.timestamp)

      // Skip if outside backtest range
      if (barTime < this.config.startDate || barTime > this.config.endDate) {
        continue
      }

      // Update position tracking (MFE/MAE)
      this.updatePositionExtremes(bar)

      // Check for stop loss / take profit
      if (this.currentPosition.side) {
        const exitReason = this.checkExits(bar)
        if (exitReason) {
          this.closePosition(bar, exitReason)
        }
      }

      // Check for new signals
      const signal = this.findSignalForBar(bar)
      if (signal && signal.action !== 'HOLD') {
        this.processSignal(signal, bar)
      }

      // Record equity curve
      this.recordEquity(bar)
    }

    // Close any remaining position at end
    if (this.currentPosition.side) {
      const lastBar = historicalData[historicalData.length - 1]
      this.closePosition(lastBar, 'end_of_test')
    }

    // Calculate results
    return this.calculateResults()
  }

  // ===========================================================================
  // POSITION MANAGEMENT
  // ===========================================================================

  private processSignal(signal: SignalForBacktest, bar: OHLCV): void {
    const action = signal.action

    // If no position, open new one
    if (!this.currentPosition.side) {
      if (action === 'BUY') {
        this.openPosition('long', signal, bar)
      } else if (action === 'SELL') {
        this.openPosition('short', signal, bar)
      }
      return
    }

    // If position exists, check for reversal or close
    if (this.currentPosition.side === 'long' && action === 'SELL') {
      this.closePosition(bar, 'signal')
      this.openPosition('short', signal, bar)
    } else if (this.currentPosition.side === 'short' && action === 'BUY') {
      this.closePosition(bar, 'signal')
      this.openPosition('long', signal, bar)
    }
  }

  private openPosition(side: 'long' | 'short', signal: SignalForBacktest, bar: OHLCV): void {
    const contracts = this.calculatePositionSize(signal)
    if (contracts === 0) return

    // Apply slippage to entry
    const slippageAmount = this.config.slippagePoints * FUTURES_SPECS[this.config.symbol].tickSize
    const entryPrice = side === 'long'
      ? signal.entryPrice + slippageAmount
      : signal.entryPrice - slippageAmount

    this.currentPosition = {
      side,
      entryPrice,
      contracts,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      entryTime: new Date(bar.timestamp),
      maxPrice: bar.high,
      minPrice: bar.low,
      signalConfidence: signal.confidence,
    }

    console.log(`[Backtest] OPEN ${side.toUpperCase()} ${contracts} @ ${entryPrice.toFixed(2)}`)
  }

  private closePosition(bar: OHLCV, reason: BacktestTrade['exitReason']): void {
    if (!this.currentPosition.side) return

    const spec = FUTURES_SPECS[this.config.symbol]
    const { side, entryPrice, contracts, entryTime, maxPrice, minPrice, signalConfidence } = this.currentPosition

    // Determine exit price
    let exitPrice: number
    if (reason === 'stop_loss') {
      exitPrice = this.currentPosition.stopLoss
    } else if (reason === 'take_profit') {
      exitPrice = this.currentPosition.takeProfit
    } else {
      exitPrice = bar.close
    }

    // Apply slippage to exit
    const slippageAmount = this.config.slippagePoints * spec.tickSize
    exitPrice = side === 'long'
      ? exitPrice - slippageAmount
      : exitPrice + slippageAmount

    // Calculate P&L
    const pointDiff = side === 'long'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice

    const grossPnL = pointDiff * spec.pointValue * contracts
    const commission = this.config.commissionPerContract * contracts
    const slippage = slippageAmount * spec.pointValue * contracts * 2  // Entry + exit
    const netPnL = grossPnL - commission - slippage

    // Calculate MFE/MAE
    const mfe = side === 'long'
      ? (maxPrice - entryPrice) * spec.pointValue * contracts
      : (entryPrice - minPrice) * spec.pointValue * contracts

    const mae = side === 'long'
      ? (entryPrice - minPrice) * spec.pointValue * contracts
      : (maxPrice - entryPrice) * spec.pointValue * contracts

    // Record trade
    const trade: BacktestTrade = {
      id: this.trades.length + 1,
      entryTime,
      exitTime: new Date(bar.timestamp),
      side: side!,
      entryPrice,
      exitPrice,
      contracts,
      grossPnL,
      commission,
      slippage,
      netPnL,
      pnlPercent: (netPnL / this.equity) * 100,
      holdingPeriodMinutes: (new Date(bar.timestamp).getTime() - entryTime.getTime()) / 60000,
      maxFavorableExcursion: mfe,
      maxAdverseExcursion: mae,
      exitReason: reason,
      signalConfidence,
    }

    this.trades.push(trade)
    this.equity += netPnL

    // Update peak equity
    if (this.equity > this.peakEquity) {
      this.peakEquity = this.equity
    }

    console.log(`[Backtest] CLOSE ${side?.toUpperCase()} @ ${exitPrice.toFixed(2)} | P&L: $${netPnL.toFixed(2)} (${reason})`)

    // Reset position
    this.currentPosition = {
      side: null,
      entryPrice: 0,
      contracts: 0,
      stopLoss: 0,
      takeProfit: 0,
      entryTime: new Date(),
      maxPrice: 0,
      minPrice: Infinity,
      signalConfidence: 0,
    }
  }

  private updatePositionExtremes(bar: OHLCV): void {
    if (!this.currentPosition.side) return

    this.currentPosition.maxPrice = Math.max(this.currentPosition.maxPrice, bar.high)
    this.currentPosition.minPrice = Math.min(this.currentPosition.minPrice, bar.low)
  }

  private checkExits(bar: OHLCV): BacktestTrade['exitReason'] | null {
    const { side, stopLoss, takeProfit } = this.currentPosition

    if (side === 'long') {
      if (bar.low <= stopLoss) return 'stop_loss'
      if (bar.high >= takeProfit) return 'take_profit'
    } else if (side === 'short') {
      if (bar.high >= stopLoss) return 'stop_loss'
      if (bar.low <= takeProfit) return 'take_profit'
    }

    return null
  }

  // ===========================================================================
  // POSITION SIZING
  // ===========================================================================

  private calculatePositionSize(signal: SignalForBacktest): number {
    const { positionSizing, fixedContracts, riskPercent, maxContracts } = this.config
    const spec = FUTURES_SPECS[this.config.symbol]

    let contracts: number

    switch (positionSizing) {
      case 'fixed':
        contracts = fixedContracts || 1
        break

      case 'percent':
        // Risk X% of equity per trade
        const riskAmount = this.equity * ((riskPercent || 2) / 100)
        const riskPerContract = Math.abs(signal.entryPrice - signal.stopLoss) * spec.pointValue
        contracts = Math.floor(riskAmount / riskPerContract)
        break

      case 'kelly':
        // Kelly criterion based on historical win rate and payoff
        const { winRate, payoffRatio } = this.calculateKellyInputs()
        const kellyPercent = (winRate * payoffRatio - (1 - winRate)) / payoffRatio
        const kellyFraction = Math.max(0, Math.min(kellyPercent * 0.25, 0.1))  // 25% Kelly, max 10%
        const kellyRisk = this.equity * kellyFraction
        const riskPer = Math.abs(signal.entryPrice - signal.stopLoss) * spec.pointValue
        contracts = Math.floor(kellyRisk / riskPer)
        break

      default:
        contracts = 1
    }

    // Apply limits
    contracts = Math.max(1, Math.min(contracts, maxContracts))

    // Check if we have enough capital
    const marginRequired = spec.marginInitial * contracts
    if (marginRequired > this.equity * 0.5) {  // Don't use more than 50% margin
      contracts = Math.floor((this.equity * 0.5) / spec.marginInitial)
    }

    return contracts
  }

  private calculateKellyInputs(): { winRate: number; payoffRatio: number } {
    if (this.trades.length < 10) {
      return { winRate: 0.5, payoffRatio: 1.5 }  // Default assumptions
    }

    const wins = this.trades.filter(t => t.netPnL > 0)
    const losses = this.trades.filter(t => t.netPnL <= 0)

    const winRate = wins.length / this.trades.length
    const avgWin = wins.length > 0
      ? wins.reduce((sum, t) => sum + t.netPnL, 0) / wins.length
      : 0
    const avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + t.netPnL, 0) / losses.length)
      : 1
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 1

    return { winRate, payoffRatio }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private findSignalForBar(bar: OHLCV): SignalForBacktest | null {
    const barTime = new Date(bar.timestamp).getTime()

    // Find signal within 5 minutes of bar
    return this.signals.find(s =>
      Math.abs(s.timestamp - barTime) < 5 * 60 * 1000
    ) || null
  }

  private recordEquity(bar: OHLCV): void {
    const drawdown = this.peakEquity - this.equity
    const drawdownPercent = (drawdown / this.peakEquity) * 100

    this.equityCurve.push({
      timestamp: new Date(bar.timestamp).getTime(),
      equity: this.equity,
      drawdown: drawdownPercent,
    })
  }

  private reset(): void {
    this.equity = this.config.initialCapital
    this.peakEquity = this.config.initialCapital
    this.trades = []
    this.equityCurve = []
    this.currentPosition = {
      side: null,
      entryPrice: 0,
      contracts: 0,
      stopLoss: 0,
      takeProfit: 0,
      entryTime: new Date(),
      maxPrice: 0,
      minPrice: Infinity,
      signalConfidence: 0,
    }
  }

  // ===========================================================================
  // RESULTS CALCULATION
  // ===========================================================================

  private calculateResults(): BacktestResult {
    const wins = this.trades.filter(t => t.netPnL > 0)
    const losses = this.trades.filter(t => t.netPnL <= 0)

    // Basic stats
    const totalTrades = this.trades.length
    const winningTrades = wins.length
    const losingTrades = losses.length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    // P&L
    const grossProfit = wins.reduce((sum, t) => sum + t.grossPnL, 0)
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.grossPnL, 0))
    const netProfit = this.equity - this.config.initialCapital
    const netProfitPercent = (netProfit / this.config.initialCapital) * 100
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // Per trade
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.netPnL, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.netPnL, 0) / losses.length : 0
    const avgTrade = totalTrades > 0 ? netProfit / totalTrades : 0
    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.netPnL)) : 0
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.netPnL)) : 0

    // Drawdown
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    let currentDrawdownStart = 0
    let maxDrawdownDuration = 0
    let peak = this.config.initialCapital

    for (const point of this.equityCurve) {
      if (point.equity > peak) {
        peak = point.equity
        if (currentDrawdownStart > 0) {
          const duration = point.timestamp - currentDrawdownStart
          maxDrawdownDuration = Math.max(maxDrawdownDuration, duration)
        }
        currentDrawdownStart = 0
      } else {
        if (currentDrawdownStart === 0) {
          currentDrawdownStart = point.timestamp
        }
        const dd = peak - point.equity
        const ddPercent = (dd / peak) * 100
        if (dd > maxDrawdown) {
          maxDrawdown = dd
          maxDrawdownPercent = ddPercent
        }
      }
    }

    // Risk metrics
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? Infinity : 0

    // Sharpe Ratio (simplified - using daily returns)
    const dailyReturns = this.calculateDailyReturns()
    const avgReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0
    const stdDev = this.calculateStdDev(dailyReturns)
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0  // Annualized

    // Sortino Ratio (only downside deviation)
    const negativeReturns = dailyReturns.filter(r => r < 0)
    const downsideStdDev = this.calculateStdDev(negativeReturns)
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0

    // Calmar Ratio
    const annualizedReturn = netProfitPercent * (365 / this.getDaysInTest())
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0

    // Consistency
    const expectancy = avgTrade
    const payoffRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0

    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutive()

    // Time analysis
    const avgHoldingPeriod = totalTrades > 0
      ? this.trades.reduce((sum, t) => sum + t.holdingPeriodMinutes, 0) / totalTrades
      : 0

    const { bestHour, worstHour, profitByDay } = this.analyzeByTime()

    // Monthly returns
    const monthlyReturns = this.calculateMonthlyReturns()

    return {
      config: this.config,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      grossProfit,
      grossLoss,
      netProfit,
      netProfitPercent,
      profitFactor,
      avgWin,
      avgLoss,
      avgTrade,
      largestWin,
      largestLoss,
      maxDrawdown,
      maxDrawdownPercent,
      maxDrawdownDuration: maxDrawdownDuration / 60000,
      recoveryFactor,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      expectancy,
      payoffRatio,
      consecutiveWins,
      consecutiveLosses,
      avgHoldingPeriod,
      bestTradingHour: bestHour,
      worstTradingHour: worstHour,
      profitByDayOfWeek: profitByDay,
      equityCurve: this.equityCurve,
      trades: this.trades,
      monthlyReturns,
    }
  }

  private calculateDailyReturns(): number[] {
    const dailyEquity: Map<string, number> = new Map()

    for (const point of this.equityCurve) {
      const date = new Date(point.timestamp).toISOString().split('T')[0]
      dailyEquity.set(date, point.equity)
    }

    const dates = Array.from(dailyEquity.keys()).sort()
    const returns: number[] = []

    for (let i = 1; i < dates.length; i++) {
      const prev = dailyEquity.get(dates[i - 1])!
      const curr = dailyEquity.get(dates[i])!
      returns.push((curr - prev) / prev)
    }

    return returns
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  }

  private calculateConsecutive(): { consecutiveWins: number; consecutiveLosses: number } {
    let maxWins = 0
    let maxLosses = 0
    let currentWins = 0
    let currentLosses = 0

    for (const trade of this.trades) {
      if (trade.netPnL > 0) {
        currentWins++
        currentLosses = 0
        maxWins = Math.max(maxWins, currentWins)
      } else {
        currentLosses++
        currentWins = 0
        maxLosses = Math.max(maxLosses, currentLosses)
      }
    }

    return { consecutiveWins: maxWins, consecutiveLosses: maxLosses }
  }

  private analyzeByTime(): {
    bestHour: number
    worstHour: number
    profitByDay: Record<string, number>
  } {
    const profitByHour: Record<number, number> = {}
    const profitByDay: Record<string, number> = {
      Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (const trade of this.trades) {
      const hour = trade.entryTime.getHours()
      const day = days[trade.entryTime.getDay()]

      profitByHour[hour] = (profitByHour[hour] || 0) + trade.netPnL
      profitByDay[day] += trade.netPnL
    }

    let bestHour = 0
    let worstHour = 0
    let bestProfit = -Infinity
    let worstProfit = Infinity

    for (const [hour, profit] of Object.entries(profitByHour)) {
      if (profit > bestProfit) {
        bestProfit = profit
        bestHour = parseInt(hour)
      }
      if (profit < worstProfit) {
        worstProfit = profit
        worstHour = parseInt(hour)
      }
    }

    return { bestHour, worstHour, profitByDay }
  }

  private calculateMonthlyReturns(): { month: string; return: number; trades: number }[] {
    const monthlyData: Map<string, { start: number; end: number; trades: number }> = new Map()

    let prevEquity = this.config.initialCapital

    for (const point of this.equityCurve) {
      const month = new Date(point.timestamp).toISOString().slice(0, 7)

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { start: prevEquity, end: point.equity, trades: 0 })
      } else {
        monthlyData.get(month)!.end = point.equity
      }
      prevEquity = point.equity
    }

    // Count trades per month
    for (const trade of this.trades) {
      const month = trade.entryTime.toISOString().slice(0, 7)
      if (monthlyData.has(month)) {
        monthlyData.get(month)!.trades++
      }
    }

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      return: ((data.end - data.start) / data.start) * 100,
      trades: data.trades,
    }))
  }

  private getDaysInTest(): number {
    return (this.config.endDate.getTime() - this.config.startDate.getTime()) / (24 * 60 * 60 * 1000)
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createBacktestEngine(config: BacktestConfig): BacktestEngine {
  return new BacktestEngine(config)
}

// =============================================================================
// RESULT FORMATTER
// =============================================================================

export function formatBacktestResult(result: BacktestResult): string {
  const lines: string[] = []

  lines.push('═'.repeat(60))
  lines.push('BACKTEST RESULTS')
  lines.push('═'.repeat(60))
  lines.push('')
  lines.push(`Symbol: ${result.config.symbol}`)
  lines.push(`Period: ${result.config.startDate.toLocaleDateString()} - ${result.config.endDate.toLocaleDateString()}`)
  lines.push(`Initial Capital: $${result.config.initialCapital.toLocaleString()}`)
  lines.push('')
  lines.push('─'.repeat(60))
  lines.push('PERFORMANCE')
  lines.push('─'.repeat(60))
  lines.push(`Net Profit: $${result.netProfit.toFixed(2)} (${result.netProfitPercent.toFixed(2)}%)`)
  lines.push(`Profit Factor: ${result.profitFactor.toFixed(2)}`)
  lines.push(`Win Rate: ${result.winRate.toFixed(1)}%`)
  lines.push(`Total Trades: ${result.totalTrades}`)
  lines.push('')
  lines.push('─'.repeat(60))
  lines.push('RISK METRICS')
  lines.push('─'.repeat(60))
  lines.push(`Max Drawdown: $${result.maxDrawdown.toFixed(2)} (${result.maxDrawdownPercent.toFixed(2)}%)`)
  lines.push(`Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}`)
  lines.push(`Sortino Ratio: ${result.sortinoRatio.toFixed(2)}`)
  lines.push(`Calmar Ratio: ${result.calmarRatio.toFixed(2)}`)
  lines.push(`Recovery Factor: ${result.recoveryFactor.toFixed(2)}`)
  lines.push('')
  lines.push('─'.repeat(60))
  lines.push('TRADE STATISTICS')
  lines.push('─'.repeat(60))
  lines.push(`Avg Win: $${result.avgWin.toFixed(2)}`)
  lines.push(`Avg Loss: $${result.avgLoss.toFixed(2)}`)
  lines.push(`Payoff Ratio: ${result.payoffRatio.toFixed(2)}`)
  lines.push(`Expectancy: $${result.expectancy.toFixed(2)}`)
  lines.push(`Largest Win: $${result.largestWin.toFixed(2)}`)
  lines.push(`Largest Loss: $${result.largestLoss.toFixed(2)}`)
  lines.push(`Max Consecutive Wins: ${result.consecutiveWins}`)
  lines.push(`Max Consecutive Losses: ${result.consecutiveLosses}`)
  lines.push('')
  lines.push('═'.repeat(60))

  return lines.join('\n')
}
