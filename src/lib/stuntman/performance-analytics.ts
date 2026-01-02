// =============================================================================
// PERFORMANCE ANALYTICS - INSTITUTIONAL GRADE
// =============================================================================
// Comprehensive trading performance tracking and analysis
// Calculates Sharpe, Sortino, Calmar, profit factor, and more
// =============================================================================

import { FuturesSymbol, FUTURES_SPECS } from '@/lib/rithmic'

// =============================================================================
// TYPES
// =============================================================================

export interface Trade {
  id: string
  symbol: string
  market: 'crypto' | 'futures'
  side: 'long' | 'short'
  entryTime: Date
  exitTime: Date
  entryPrice: number
  exitPrice: number
  quantity: number
  grossPnL: number
  fees: number
  netPnL: number
  holdingPeriodMs: number
  maxFavorableExcursion: number
  maxAdverseExcursion: number
  rMultiple: number  // R = risk unit
  signalConfidence: number
  strategy?: string
}

export interface DailyStats {
  date: string
  startingBalance: number
  endingBalance: number
  netPnL: number
  pnlPercent: number
  tradesCount: number
  winCount: number
  lossCount: number
  winRate: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  largestWin: number
  largestLoss: number
  avgWin: number
  avgLoss: number
  maxDrawdown: number
  maxDrawdownPercent: number
}

export interface PerformanceMetrics {
  // Period info
  periodStart: Date
  periodEnd: Date
  tradingDays: number

  // P&L metrics
  totalNetPnL: number
  totalGrossPnL: number
  totalFees: number
  totalPnLPercent: number
  avgDailyPnL: number
  avgDailyPnLPercent: number

  // Trade statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  lossRate: number

  // Win/Loss analysis
  avgWin: number
  avgLoss: number
  avgWinPercent: number
  avgLossPercent: number
  largestWin: number
  largestLoss: number
  avgWinLossRatio: number

  // Profit factor
  grossProfit: number
  grossLoss: number
  profitFactor: number

  // Expectancy
  expectancy: number       // Per trade expectancy in $
  expectancyR: number      // Per trade expectancy in R multiples

  // R-Multiple stats
  avgRMultiple: number
  maxRMultiple: number
  minRMultiple: number

  // Risk-adjusted returns
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number

  // Drawdown
  maxDrawdown: number
  maxDrawdownPercent: number
  avgDrawdown: number
  avgDrawdownPercent: number
  currentDrawdown: number
  currentDrawdownPercent: number
  maxDrawdownDuration: number  // In days
  avgDrawdownDuration: number

  // Streaks
  currentWinStreak: number
  currentLossStreak: number
  longestWinStreak: number
  longestLossStreak: number

  // Time analysis
  avgHoldingPeriodMs: number
  avgHoldingPeriodWins: number
  avgHoldingPeriodLosses: number

  // MFE/MAE analysis
  avgMFE: number
  avgMAE: number
  avgMFEPercent: number
  avgMAEPercent: number
  edgeRatio: number  // MFE / MAE

  // By market
  cryptoStats: Partial<PerformanceMetrics>
  futuresStats: Partial<PerformanceMetrics>

  // By symbol
  symbolStats: Map<string, Partial<PerformanceMetrics>>

  // By time
  hourlyStats: Map<number, { trades: number; winRate: number; avgPnL: number }>
  dayOfWeekStats: Map<string, { trades: number; winRate: number; avgPnL: number }>

  // By strategy (if tagged)
  strategyStats: Map<string, Partial<PerformanceMetrics>>
}

export interface EquityCurve {
  timestamp: Date
  equity: number
  drawdown: number
  drawdownPercent: number
  highWaterMark: number
}

export interface MonthlyReturn {
  year: number
  month: number
  startBalance: number
  endBalance: number
  netPnL: number
  returnPercent: number
  tradesCount: number
  winRate: number
}

// =============================================================================
// PERFORMANCE ANALYTICS CLASS
// =============================================================================

export class PerformanceAnalytics {
  private trades: Trade[] = []
  private equityCurve: EquityCurve[] = []
  private dailyStats: DailyStats[] = []
  private startingBalance: number
  private currentBalance: number
  private riskFreeRate: number = 0.05  // 5% annual risk-free rate

  constructor(startingBalance: number) {
    this.startingBalance = startingBalance
    this.currentBalance = startingBalance

    // Initialize equity curve
    this.equityCurve.push({
      timestamp: new Date(),
      equity: startingBalance,
      drawdown: 0,
      drawdownPercent: 0,
      highWaterMark: startingBalance,
    })
  }

  // ===========================================================================
  // TRADE RECORDING
  // ===========================================================================

  /**
   * Record a completed trade
   */
  recordTrade(trade: Trade): void {
    this.trades.push(trade)
    this.currentBalance += trade.netPnL

    // Update equity curve
    const lastEquity = this.equityCurve[this.equityCurve.length - 1]
    const highWaterMark = Math.max(lastEquity.highWaterMark, this.currentBalance)
    const drawdown = highWaterMark - this.currentBalance
    const drawdownPercent = highWaterMark > 0 ? (drawdown / highWaterMark) * 100 : 0

    this.equityCurve.push({
      timestamp: trade.exitTime,
      equity: this.currentBalance,
      drawdown,
      drawdownPercent,
      highWaterMark,
    })

    // Update daily stats
    this.updateDailyStats(trade)
  }

  /**
   * Record multiple trades at once
   */
  recordTrades(trades: Trade[]): void {
    trades.forEach(trade => this.recordTrade(trade))
  }

  /**
   * Update daily statistics
   */
  private updateDailyStats(trade: Trade): void {
    const dateStr = trade.exitTime.toISOString().split('T')[0]
    let dayStats = this.dailyStats.find(d => d.date === dateStr)

    if (!dayStats) {
      const prevDay = this.dailyStats[this.dailyStats.length - 1]
      dayStats = {
        date: dateStr,
        startingBalance: prevDay ? prevDay.endingBalance : this.startingBalance,
        endingBalance: 0,
        netPnL: 0,
        pnlPercent: 0,
        tradesCount: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        grossProfit: 0,
        grossLoss: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
      }
      this.dailyStats.push(dayStats)
    }

    // Update stats
    dayStats.tradesCount++
    dayStats.netPnL += trade.netPnL
    dayStats.endingBalance = dayStats.startingBalance + dayStats.netPnL
    dayStats.pnlPercent = (dayStats.netPnL / dayStats.startingBalance) * 100

    if (trade.netPnL > 0) {
      dayStats.winCount++
      dayStats.grossProfit += trade.netPnL
      dayStats.largestWin = Math.max(dayStats.largestWin, trade.netPnL)
    } else if (trade.netPnL < 0) {
      dayStats.lossCount++
      dayStats.grossLoss += Math.abs(trade.netPnL)
      dayStats.largestLoss = Math.min(dayStats.largestLoss, trade.netPnL)
    }

    dayStats.winRate = dayStats.tradesCount > 0
      ? (dayStats.winCount / dayStats.tradesCount) * 100
      : 0

    dayStats.profitFactor = dayStats.grossLoss > 0
      ? dayStats.grossProfit / dayStats.grossLoss
      : dayStats.grossProfit > 0 ? Infinity : 0

    dayStats.avgWin = dayStats.winCount > 0
      ? dayStats.grossProfit / dayStats.winCount
      : 0

    dayStats.avgLoss = dayStats.lossCount > 0
      ? dayStats.grossLoss / dayStats.lossCount
      : 0
  }

  // ===========================================================================
  // METRICS CALCULATION
  // ===========================================================================

  /**
   * Calculate comprehensive performance metrics
   */
  calculateMetrics(startDate?: Date, endDate?: Date): PerformanceMetrics {
    // Filter trades by date range
    let filteredTrades = this.trades
    if (startDate) {
      filteredTrades = filteredTrades.filter(t => t.exitTime >= startDate)
    }
    if (endDate) {
      filteredTrades = filteredTrades.filter(t => t.exitTime <= endDate)
    }

    if (filteredTrades.length === 0) {
      return this.getEmptyMetrics()
    }

    // Basic trade stats
    const winningTrades = filteredTrades.filter(t => t.netPnL > 0)
    const losingTrades = filteredTrades.filter(t => t.netPnL < 0)
    const breakEvenTrades = filteredTrades.filter(t => t.netPnL === 0)

    const totalNetPnL = filteredTrades.reduce((sum, t) => sum + t.netPnL, 0)
    const totalGrossPnL = filteredTrades.reduce((sum, t) => sum + t.grossPnL, 0)
    const totalFees = filteredTrades.reduce((sum, t) => sum + t.fees, 0)

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.netPnL, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnL, 0))

    // Win/Loss analysis
    const avgWin = winningTrades.length > 0
      ? grossProfit / winningTrades.length
      : 0
    const avgLoss = losingTrades.length > 0
      ? grossLoss / losingTrades.length
      : 0

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map(t => t.netPnL))
      : 0
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map(t => t.netPnL))
      : 0

    // Profit factor
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // R-Multiple stats
    const rMultiples = filteredTrades.map(t => t.rMultiple)
    const avgRMultiple = rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
    const maxRMultiple = Math.max(...rMultiples)
    const minRMultiple = Math.min(...rMultiples)

    // Expectancy
    const winRate = filteredTrades.length > 0
      ? winningTrades.length / filteredTrades.length
      : 0
    const lossRate = 1 - winRate

    const expectancy = winRate * avgWin - lossRate * avgLoss
    const expectancyR = avgRMultiple

    // Daily returns for Sharpe/Sortino
    const dailyReturns = this.calculateDailyReturns(startDate, endDate)
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns)
    const sortinoRatio = this.calculateSortinoRatio(dailyReturns)

    // Drawdown analysis
    const drawdownAnalysis = this.calculateDrawdownMetrics(startDate, endDate)

    // Calmar ratio
    const calmarRatio = drawdownAnalysis.maxDrawdownPercent > 0
      ? (totalNetPnL / this.startingBalance * 100) / drawdownAnalysis.maxDrawdownPercent
      : 0

    // Streaks
    const streaks = this.calculateStreaks(filteredTrades)

    // Time analysis
    const avgHoldingPeriodMs = filteredTrades.reduce((sum, t) => sum + t.holdingPeriodMs, 0) / filteredTrades.length
    const avgHoldingPeriodWins = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.holdingPeriodMs, 0) / winningTrades.length
      : 0
    const avgHoldingPeriodLosses = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.holdingPeriodMs, 0) / losingTrades.length
      : 0

    // MFE/MAE
    const avgMFE = filteredTrades.reduce((sum, t) => sum + t.maxFavorableExcursion, 0) / filteredTrades.length
    const avgMAE = filteredTrades.reduce((sum, t) => sum + t.maxAdverseExcursion, 0) / filteredTrades.length
    const edgeRatio = avgMAE > 0 ? avgMFE / avgMAE : avgMFE > 0 ? Infinity : 0

    // By market
    const cryptoTrades = filteredTrades.filter(t => t.market === 'crypto')
    const futuresTrades = filteredTrades.filter(t => t.market === 'futures')

    // By symbol
    const symbolStats = this.calculateBySymbol(filteredTrades)

    // By time
    const hourlyStats = this.calculateByHour(filteredTrades)
    const dayOfWeekStats = this.calculateByDayOfWeek(filteredTrades)

    // By strategy
    const strategyStats = this.calculateByStrategy(filteredTrades)

    // Period info
    const periodStart = startDate || filteredTrades[0].entryTime
    const periodEnd = endDate || filteredTrades[filteredTrades.length - 1].exitTime
    const tradingDays = this.dailyStats.filter(d => {
      const date = new Date(d.date)
      return date >= periodStart && date <= periodEnd
    }).length

    return {
      periodStart,
      periodEnd,
      tradingDays,

      totalNetPnL,
      totalGrossPnL,
      totalFees,
      totalPnLPercent: (totalNetPnL / this.startingBalance) * 100,
      avgDailyPnL: tradingDays > 0 ? totalNetPnL / tradingDays : 0,
      avgDailyPnLPercent: tradingDays > 0 ? (totalNetPnL / this.startingBalance) * 100 / tradingDays : 0,

      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      winRate: winRate * 100,
      lossRate: lossRate * 100,

      avgWin,
      avgLoss,
      avgWinPercent: this.startingBalance > 0 ? (avgWin / this.startingBalance) * 100 : 0,
      avgLossPercent: this.startingBalance > 0 ? (avgLoss / this.startingBalance) * 100 : 0,
      largestWin,
      largestLoss,
      avgWinLossRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0,

      grossProfit,
      grossLoss,
      profitFactor,

      expectancy,
      expectancyR,

      avgRMultiple,
      maxRMultiple,
      minRMultiple,

      sharpeRatio,
      sortinoRatio,
      calmarRatio,

      ...drawdownAnalysis,

      ...streaks,

      avgHoldingPeriodMs,
      avgHoldingPeriodWins,
      avgHoldingPeriodLosses,

      avgMFE,
      avgMAE,
      avgMFEPercent: avgMFE > 0 ? (avgMFE / this.startingBalance) * 100 : 0,
      avgMAEPercent: avgMAE > 0 ? (avgMAE / this.startingBalance) * 100 : 0,
      edgeRatio,

      cryptoStats: this.calculateSubMetrics(cryptoTrades),
      futuresStats: this.calculateSubMetrics(futuresTrades),

      symbolStats,
      hourlyStats,
      dayOfWeekStats,
      strategyStats,
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private calculateDailyReturns(startDate?: Date, endDate?: Date): number[] {
    const filteredDays = this.dailyStats.filter(d => {
      const date = new Date(d.date)
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })

    return filteredDays.map(d => d.pnlPercent)
  }

  private calculateSharpeRatio(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0

    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) return 0

    // Annualized: assume 252 trading days
    const dailyRiskFreeRate = this.riskFreeRate / 252
    const excessReturn = avgReturn - dailyRiskFreeRate
    const annualizedSharpe = (excessReturn / stdDev) * Math.sqrt(252)

    return annualizedSharpe
  }

  private calculateSortinoRatio(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0

    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length

    // Only consider downside volatility (negative returns)
    const negativeReturns = dailyReturns.filter(r => r < 0)
    if (negativeReturns.length === 0) return Infinity

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length
    const downsideDeviation = Math.sqrt(downsideVariance)

    if (downsideDeviation === 0) return avgReturn > 0 ? Infinity : 0

    // Annualized
    const dailyRiskFreeRate = this.riskFreeRate / 252
    const excessReturn = avgReturn - dailyRiskFreeRate
    const annualizedSortino = (excessReturn / downsideDeviation) * Math.sqrt(252)

    return annualizedSortino
  }

  private calculateDrawdownMetrics(startDate?: Date, endDate?: Date): {
    maxDrawdown: number
    maxDrawdownPercent: number
    avgDrawdown: number
    avgDrawdownPercent: number
    currentDrawdown: number
    currentDrawdownPercent: number
    maxDrawdownDuration: number
    avgDrawdownDuration: number
  } {
    const filteredCurve = this.equityCurve.filter(e => {
      if (startDate && e.timestamp < startDate) return false
      if (endDate && e.timestamp > endDate) return false
      return true
    })

    if (filteredCurve.length === 0) {
      return {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        avgDrawdown: 0,
        avgDrawdownPercent: 0,
        currentDrawdown: 0,
        currentDrawdownPercent: 0,
        maxDrawdownDuration: 0,
        avgDrawdownDuration: 0,
      }
    }

    const maxDrawdown = Math.max(...filteredCurve.map(e => e.drawdown))
    const maxDrawdownPercent = Math.max(...filteredCurve.map(e => e.drawdownPercent))

    const drawdowns = filteredCurve.filter(e => e.drawdown > 0)
    const avgDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((sum, e) => sum + e.drawdown, 0) / drawdowns.length
      : 0
    const avgDrawdownPercent = drawdowns.length > 0
      ? drawdowns.reduce((sum, e) => sum + e.drawdownPercent, 0) / drawdowns.length
      : 0

    const last = filteredCurve[filteredCurve.length - 1]

    // Calculate drawdown duration (simplified)
    let maxDrawdownDuration = 0
    let currentDuration = 0
    let totalDuration = 0
    let drawdownPeriods = 0

    for (let i = 1; i < filteredCurve.length; i++) {
      if (filteredCurve[i].drawdown > 0) {
        currentDuration++
        if (i === filteredCurve.length - 1 || filteredCurve[i + 1].drawdown === 0) {
          maxDrawdownDuration = Math.max(maxDrawdownDuration, currentDuration)
          totalDuration += currentDuration
          drawdownPeriods++
          currentDuration = 0
        }
      }
    }

    return {
      maxDrawdown,
      maxDrawdownPercent,
      avgDrawdown,
      avgDrawdownPercent,
      currentDrawdown: last.drawdown,
      currentDrawdownPercent: last.drawdownPercent,
      maxDrawdownDuration,
      avgDrawdownDuration: drawdownPeriods > 0 ? totalDuration / drawdownPeriods : 0,
    }
  }

  private calculateStreaks(trades: Trade[]): {
    currentWinStreak: number
    currentLossStreak: number
    longestWinStreak: number
    longestLossStreak: number
  } {
    let currentWinStreak = 0
    let currentLossStreak = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    let tempWinStreak = 0
    let tempLossStreak = 0

    for (const trade of trades) {
      if (trade.netPnL > 0) {
        tempWinStreak++
        tempLossStreak = 0
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak)
      } else if (trade.netPnL < 0) {
        tempLossStreak++
        tempWinStreak = 0
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak)
      }
    }

    // Current streaks
    currentWinStreak = tempWinStreak
    currentLossStreak = tempLossStreak

    return { currentWinStreak, currentLossStreak, longestWinStreak, longestLossStreak }
  }

  private calculateSubMetrics(trades: Trade[]): Partial<PerformanceMetrics> {
    if (trades.length === 0) return {}

    const winningTrades = trades.filter(t => t.netPnL > 0)
    const losingTrades = trades.filter(t => t.netPnL < 0)

    const totalNetPnL = trades.reduce((sum, t) => sum + t.netPnL, 0)
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.netPnL, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnL, 0))

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalNetPnL,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
    }
  }

  private calculateBySymbol(trades: Trade[]): Map<string, Partial<PerformanceMetrics>> {
    const symbols = new Set(trades.map(t => t.symbol))
    const result = new Map<string, Partial<PerformanceMetrics>>()

    for (const symbol of symbols) {
      const symbolTrades = trades.filter(t => t.symbol === symbol)
      result.set(symbol, this.calculateSubMetrics(symbolTrades))
    }

    return result
  }

  private calculateByHour(trades: Trade[]): Map<number, { trades: number; winRate: number; avgPnL: number }> {
    const result = new Map<number, { trades: number; winRate: number; avgPnL: number }>()

    for (let hour = 0; hour < 24; hour++) {
      const hourTrades = trades.filter(t => t.entryTime.getHours() === hour)
      if (hourTrades.length > 0) {
        const winRate = (hourTrades.filter(t => t.netPnL > 0).length / hourTrades.length) * 100
        const avgPnL = hourTrades.reduce((sum, t) => sum + t.netPnL, 0) / hourTrades.length
        result.set(hour, { trades: hourTrades.length, winRate, avgPnL })
      }
    }

    return result
  }

  private calculateByDayOfWeek(trades: Trade[]): Map<string, { trades: number; winRate: number; avgPnL: number }> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const result = new Map<string, { trades: number; winRate: number; avgPnL: number }>()

    for (let day = 0; day < 7; day++) {
      const dayTrades = trades.filter(t => t.entryTime.getDay() === day)
      if (dayTrades.length > 0) {
        const winRate = (dayTrades.filter(t => t.netPnL > 0).length / dayTrades.length) * 100
        const avgPnL = dayTrades.reduce((sum, t) => sum + t.netPnL, 0) / dayTrades.length
        result.set(days[day], { trades: dayTrades.length, winRate, avgPnL })
      }
    }

    return result
  }

  private calculateByStrategy(trades: Trade[]): Map<string, Partial<PerformanceMetrics>> {
    const strategies = new Set(trades.filter(t => t.strategy).map(t => t.strategy!))
    const result = new Map<string, Partial<PerformanceMetrics>>()

    for (const strategy of strategies) {
      const strategyTrades = trades.filter(t => t.strategy === strategy)
      result.set(strategy, this.calculateSubMetrics(strategyTrades))
    }

    return result
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      periodStart: new Date(),
      periodEnd: new Date(),
      tradingDays: 0,
      totalNetPnL: 0,
      totalGrossPnL: 0,
      totalFees: 0,
      totalPnLPercent: 0,
      avgDailyPnL: 0,
      avgDailyPnLPercent: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      lossRate: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      largestWin: 0,
      largestLoss: 0,
      avgWinLossRatio: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      expectancyR: 0,
      avgRMultiple: 0,
      maxRMultiple: 0,
      minRMultiple: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      avgDrawdown: 0,
      avgDrawdownPercent: 0,
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
      maxDrawdownDuration: 0,
      avgDrawdownDuration: 0,
      currentWinStreak: 0,
      currentLossStreak: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      avgHoldingPeriodMs: 0,
      avgHoldingPeriodWins: 0,
      avgHoldingPeriodLosses: 0,
      avgMFE: 0,
      avgMAE: 0,
      avgMFEPercent: 0,
      avgMAEPercent: 0,
      edgeRatio: 0,
      cryptoStats: {},
      futuresStats: {},
      symbolStats: new Map(),
      hourlyStats: new Map(),
      dayOfWeekStats: new Map(),
      strategyStats: new Map(),
    }
  }

  // ===========================================================================
  // REPORTS
  // ===========================================================================

  /**
   * Get monthly returns
   */
  getMonthlyReturns(): MonthlyReturn[] {
    const monthlyMap = new Map<string, DailyStats[]>()

    for (const day of this.dailyStats) {
      const date = new Date(day.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, [])
      }
      monthlyMap.get(key)!.push(day)
    }

    const monthlyReturns: MonthlyReturn[] = []

    for (const [key, days] of monthlyMap) {
      const [year, month] = key.split('-').map(Number)
      const startBalance = days[0].startingBalance
      const endBalance = days[days.length - 1].endingBalance
      const netPnL = endBalance - startBalance
      const tradesCount = days.reduce((sum, d) => sum + d.tradesCount, 0)
      const winCount = days.reduce((sum, d) => sum + d.winCount, 0)

      monthlyReturns.push({
        year,
        month,
        startBalance,
        endBalance,
        netPnL,
        returnPercent: startBalance > 0 ? (netPnL / startBalance) * 100 : 0,
        tradesCount,
        winRate: tradesCount > 0 ? (winCount / tradesCount) * 100 : 0,
      })
    }

    return monthlyReturns
  }

  /**
   * Get equity curve data
   */
  getEquityCurve(): EquityCurve[] {
    return [...this.equityCurve]
  }

  /**
   * Get daily stats
   */
  getDailyStats(): DailyStats[] {
    return [...this.dailyStats]
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return [...this.trades]
  }

  /**
   * Get current balance
   */
  getCurrentBalance(): number {
    return this.currentBalance
  }

  /**
   * Get total P&L
   */
  getTotalPnL(): number {
    return this.currentBalance - this.startingBalance
  }

  /**
   * Generate text report
   */
  generateTextReport(): string {
    const metrics = this.calculateMetrics()
    const monthlyReturns = this.getMonthlyReturns()

    let report = '═══════════════════════════════════════════════════════════════════\n'
    report += '                    PERFORMANCE REPORT\n'
    report += '═══════════════════════════════════════════════════════════════════\n\n'

    report += `Period: ${metrics.periodStart.toLocaleDateString()} - ${metrics.periodEnd.toLocaleDateString()}\n`
    report += `Trading Days: ${metrics.tradingDays}\n\n`

    report += '── P&L Summary ──────────────────────────────────────────────────\n'
    report += `Net P&L: $${metrics.totalNetPnL.toFixed(2)} (${metrics.totalPnLPercent.toFixed(2)}%)\n`
    report += `Gross P&L: $${metrics.totalGrossPnL.toFixed(2)}\n`
    report += `Total Fees: $${metrics.totalFees.toFixed(2)}\n`
    report += `Avg Daily P&L: $${metrics.avgDailyPnL.toFixed(2)}\n\n`

    report += '── Trade Statistics ─────────────────────────────────────────────\n'
    report += `Total Trades: ${metrics.totalTrades}\n`
    report += `Winning: ${metrics.winningTrades} (${metrics.winRate.toFixed(1)}%)\n`
    report += `Losing: ${metrics.losingTrades} (${metrics.lossRate.toFixed(1)}%)\n`
    report += `Profit Factor: ${metrics.profitFactor.toFixed(2)}\n`
    report += `Expectancy: $${metrics.expectancy.toFixed(2)} per trade\n\n`

    report += '── Risk Metrics ─────────────────────────────────────────────────\n'
    report += `Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}\n`
    report += `Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}\n`
    report += `Calmar Ratio: ${metrics.calmarRatio.toFixed(2)}\n`
    report += `Max Drawdown: $${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPercent.toFixed(2)}%)\n`
    report += `Avg Drawdown: $${metrics.avgDrawdown.toFixed(2)} (${metrics.avgDrawdownPercent.toFixed(2)}%)\n\n`

    report += '── Win/Loss Analysis ────────────────────────────────────────────\n'
    report += `Avg Win: $${metrics.avgWin.toFixed(2)}\n`
    report += `Avg Loss: $${metrics.avgLoss.toFixed(2)}\n`
    report += `Avg Win/Loss Ratio: ${metrics.avgWinLossRatio.toFixed(2)}\n`
    report += `Largest Win: $${metrics.largestWin.toFixed(2)}\n`
    report += `Largest Loss: $${metrics.largestLoss.toFixed(2)}\n\n`

    report += '── Monthly Returns ──────────────────────────────────────────────\n'
    for (const month of monthlyReturns.slice(-12)) {
      const monthName = new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const pnlSign = month.netPnL >= 0 ? '+' : ''
      report += `${monthName}: ${pnlSign}$${month.netPnL.toFixed(2)} (${pnlSign}${month.returnPercent.toFixed(1)}%)\n`
    }

    report += '\n═══════════════════════════════════════════════════════════════════\n'

    return report
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPerformanceAnalytics(startingBalance: number): PerformanceAnalytics {
  return new PerformanceAnalytics(startingBalance)
}
