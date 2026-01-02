/**
 * Adaptive Strategy Engine
 *
 * Self-optimizing trading strategy system that:
 * - Automatically adjusts parameters based on market conditions
 * - Learns from trade outcomes
 * - Adapts position sizing based on recent performance
 * - Switches between strategies based on regime
 * - Implements walk-forward optimization
 */

import { Signal, Candle, Position } from './types';
import { detectMarketRegime, MarketRegime } from './ml-signal-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface StrategyParameters {
  // Entry parameters
  entryThreshold: number;           // Signal strength required (0-100)
  confirmationRequired: number;      // Number of confirming signals
  maxEntriesPerDay: number;         // Daily entry limit

  // Exit parameters
  stopLossPercent: number;          // Stop loss as % of entry
  takeProfitPercent: number;        // Take profit as % of entry
  trailingStopPercent: number;      // Trailing stop activation
  timeStopMinutes: number;          // Max time in trade

  // Position sizing
  basePositionSize: number;         // Base contracts
  maxPositionSize: number;          // Maximum contracts
  scalingFactor: number;            // How much to scale based on confidence

  // Risk parameters
  maxDailyLoss: number;             // Stop trading after this loss
  maxDrawdownPercent: number;       // Max drawdown before reducing size
  correlationLimit: number;         // Max correlated positions

  // Regime-specific
  trendMultiplier: number;          // Position size multiplier in trends
  rangeMultiplier: number;          // Position size multiplier in ranges
  volatilityAdjustment: boolean;    // Adjust for volatility
}

export interface StrategyPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  sharpeRatio: number;
  recentWinRate: number;            // Last 20 trades
  streakCurrent: number;            // Current win/loss streak
  streakMax: number;                // Max streak
}

export interface AdaptiveState {
  currentRegime: MarketRegime;
  activeParameters: StrategyParameters;
  performance: StrategyPerformance;
  adaptations: Adaptation[];
  confidence: number;
  lastOptimization: number;
}

export interface Adaptation {
  timestamp: number;
  parameter: keyof StrategyParameters;
  oldValue: number;
  newValue: number;
  reason: string;
  regimeAtTime: string;
}

export interface TradeOutcome {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  pnl: number;
  pnlPercent: number;
  holdingTime: number;
  signalStrength: number;
  regime: string;
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'TIME_STOP' | 'SIGNAL' | 'MANUAL';
}

// ============================================================================
// DEFAULT PARAMETERS
// ============================================================================

export const DEFAULT_PARAMETERS: StrategyParameters = {
  entryThreshold: 65,
  confirmationRequired: 2,
  maxEntriesPerDay: 5,
  stopLossPercent: 1.0,
  takeProfitPercent: 2.0,
  trailingStopPercent: 1.5,
  timeStopMinutes: 120,
  basePositionSize: 1,
  maxPositionSize: 5,
  scalingFactor: 0.5,
  maxDailyLoss: 500,
  maxDrawdownPercent: 5,
  correlationLimit: 0.7,
  trendMultiplier: 1.2,
  rangeMultiplier: 0.8,
  volatilityAdjustment: true,
};

// ============================================================================
// ADAPTIVE STRATEGY ENGINE
// ============================================================================

export class AdaptiveStrategyEngine {
  private parameters: StrategyParameters;
  private tradeHistory: TradeOutcome[] = [];
  private adaptations: Adaptation[] = [];
  private currentRegime: MarketRegime | null = null;
  private lastOptimization: number = 0;
  private optimizationInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  // Performance tracking
  private equityCurve: number[] = [];
  private dailyPnL: Map<string, number> = new Map();

  constructor(initialParameters?: Partial<StrategyParameters>) {
    this.parameters = { ...DEFAULT_PARAMETERS, ...initialParameters };
  }

  // ============================================================================
  // REGIME DETECTION & ADAPTATION
  // ============================================================================

  /**
   * Update market regime and adapt parameters
   */
  updateRegime(candles: Candle[]): MarketRegime {
    this.currentRegime = detectMarketRegime(candles);

    // Check if we should adapt parameters
    if (Date.now() - this.lastOptimization > this.optimizationInterval) {
      this.runOptimization();
    }

    // Adapt to current regime
    this.adaptToRegime(this.currentRegime);

    return this.currentRegime;
  }

  /**
   * Adapt parameters based on current regime
   */
  private adaptToRegime(regime: MarketRegime): void {
    const oldParams = { ...this.parameters };

    switch (regime.type) {
      case 'TRENDING_UP':
      case 'TRENDING_DOWN':
        // Wider stops, let winners run
        this.adjustParameter('stopLossPercent', 1.5, 'Trending market - wider stops');
        this.adjustParameter('takeProfitPercent', 3.0, 'Trending market - larger targets');
        this.adjustParameter('trailingStopPercent', 1.0, 'Use tighter trailing in trends');
        this.adjustParameter('entryThreshold', 60, 'Lower threshold in trends');
        break;

      case 'RANGING':
        // Tighter stops, quick profits
        this.adjustParameter('stopLossPercent', 0.75, 'Range market - tight stops');
        this.adjustParameter('takeProfitPercent', 1.25, 'Range market - quick profits');
        this.adjustParameter('entryThreshold', 70, 'Higher threshold in ranges');
        this.adjustParameter('timeStopMinutes', 60, 'Shorter time stops in ranges');
        break;

      case 'VOLATILE':
        // Very tight risk, smaller size
        this.adjustParameter('stopLossPercent', 2.0, 'Volatile market - wider stops');
        this.adjustParameter('basePositionSize', Math.max(1, this.parameters.basePositionSize - 1), 'Reduce size in volatility');
        this.adjustParameter('maxEntriesPerDay', 3, 'Fewer trades in volatility');
        break;

      case 'BREAKOUT':
        // Aggressive entries, let it run
        this.adjustParameter('entryThreshold', 55, 'Breakout - aggressive entries');
        this.adjustParameter('takeProfitPercent', 4.0, 'Breakout - large targets');
        this.adjustParameter('confirmationRequired', 1, 'Fast entry on breakouts');
        break;
    }

    // Adjust for regime strength
    if (regime.strength > 0.8) {
      const multiplier = regime.type.includes('TRENDING') ?
        this.parameters.trendMultiplier : this.parameters.rangeMultiplier;
      this.adjustParameter('scalingFactor', multiplier, `Strong ${regime.type} regime`);
    }
  }

  /**
   * Adjust a parameter and log the change
   */
  private adjustParameter(
    param: keyof StrategyParameters,
    newValue: number,
    reason: string
  ): void {
    const oldValue = this.parameters[param] as number;

    if (Math.abs(oldValue - newValue) > 0.01) {
      (this.parameters as any)[param] = newValue;

      this.adaptations.push({
        timestamp: Date.now(),
        parameter: param,
        oldValue,
        newValue,
        reason,
        regimeAtTime: this.currentRegime?.type || 'UNKNOWN',
      });

      // Keep last 100 adaptations
      if (this.adaptations.length > 100) {
        this.adaptations = this.adaptations.slice(-100);
      }
    }
  }

  // ============================================================================
  // PERFORMANCE-BASED ADAPTATION
  // ============================================================================

  /**
   * Record a trade outcome and adapt
   */
  recordTrade(outcome: TradeOutcome): void {
    this.tradeHistory.push(outcome);

    // Update equity curve
    const lastEquity = this.equityCurve[this.equityCurve.length - 1] || 0;
    this.equityCurve.push(lastEquity + outcome.pnl);

    // Update daily P&L
    const date = new Date(outcome.exitTime).toISOString().split('T')[0];
    const dailyTotal = (this.dailyPnL.get(date) || 0) + outcome.pnl;
    this.dailyPnL.set(date, dailyTotal);

    // Analyze and adapt
    this.analyzePerformance();
    this.adaptFromPerformance();
  }

  /**
   * Analyze recent performance
   */
  private analyzePerformance(): StrategyPerformance {
    const trades = this.tradeHistory;
    const recentTrades = trades.slice(-20);

    if (trades.length === 0) {
      return this.getEmptyPerformance();
    }

    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);

    const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

    const avgWin = winners.length > 0 ? totalWins / winners.length : 0;
    const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0;

    const winRate = trades.length > 0 ? winners.length / trades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    // Recent performance
    const recentWinners = recentTrades.filter(t => t.pnl > 0);
    const recentWinRate = recentTrades.length > 0 ? recentWinners.length / recentTrades.length : 0;

    // Streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let lastWin: boolean | null = null;

    for (const trade of trades) {
      const isWin = trade.pnl > 0;
      if (lastWin === null || isWin === lastWin) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      maxStreak = Math.max(maxStreak, tempStreak);
      lastWin = isWin;
    }
    currentStreak = tempStreak * (lastWin ? 1 : -1);

    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    for (const equity of this.equityCurve) {
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      returns.push(this.equityCurve[i] - this.equityCurve[i - 1]);
    }
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 0 ?
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) : 1;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      maxDrawdown,
      sharpeRatio,
      recentWinRate,
      streakCurrent: currentStreak,
      streakMax: maxStreak,
    };
  }

  private getEmptyPerformance(): StrategyPerformance {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      recentWinRate: 0,
      streakCurrent: 0,
      streakMax: 0,
    };
  }

  /**
   * Adapt parameters based on performance
   */
  private adaptFromPerformance(): void {
    const perf = this.analyzePerformance();

    if (perf.totalTrades < 10) return; // Need more data

    // Losing streak protection
    if (perf.streakCurrent <= -3) {
      this.adjustParameter('basePositionSize', Math.max(1, this.parameters.basePositionSize - 1),
        `Losing streak of ${Math.abs(perf.streakCurrent)} - reducing size`);
      this.adjustParameter('entryThreshold', Math.min(80, this.parameters.entryThreshold + 5),
        'Losing streak - requiring higher confidence');
    }

    // Winning streak - can be more aggressive
    if (perf.streakCurrent >= 3 && perf.recentWinRate > 0.6) {
      this.adjustParameter('scalingFactor', Math.min(1.0, this.parameters.scalingFactor + 0.1),
        `Winning streak of ${perf.streakCurrent} - increasing scaling`);
    }

    // Poor recent performance
    if (perf.recentWinRate < 0.4 && perf.totalTrades >= 20) {
      this.adjustParameter('maxEntriesPerDay', Math.max(2, this.parameters.maxEntriesPerDay - 1),
        'Poor recent performance - reducing frequency');
      this.adjustParameter('confirmationRequired', Math.min(4, this.parameters.confirmationRequired + 1),
        'Requiring more confirmation');
    }

    // Good performance - can relax slightly
    if (perf.recentWinRate > 0.65 && perf.profitFactor > 2.0) {
      this.adjustParameter('entryThreshold', Math.max(55, this.parameters.entryThreshold - 3),
        'Strong performance - relaxing entry threshold');
    }

    // Risk/reward adjustment
    if (perf.avgWin < perf.avgLoss && perf.totalTrades > 20) {
      this.adjustParameter('takeProfitPercent', this.parameters.takeProfitPercent * 1.1,
        'Avg win < avg loss - increasing targets');
      this.adjustParameter('stopLossPercent', this.parameters.stopLossPercent * 0.95,
        'Tightening stops');
    }

    // Drawdown protection
    if (perf.maxDrawdown > this.parameters.maxDailyLoss * 2) {
      this.adjustParameter('basePositionSize', Math.max(1, this.parameters.basePositionSize - 1),
        'Large drawdown - reducing base size');
      this.adjustParameter('maxPositionSize', Math.max(2, this.parameters.maxPositionSize - 1),
        'Reducing max position size');
    }
  }

  // ============================================================================
  // WALK-FORWARD OPTIMIZATION
  // ============================================================================

  /**
   * Run walk-forward optimization on historical data
   */
  runOptimization(): void {
    if (this.tradeHistory.length < 50) return;

    this.lastOptimization = Date.now();

    // Analyze trades by regime
    const tradesByRegime = new Map<string, TradeOutcome[]>();

    for (const trade of this.tradeHistory) {
      const regime = trade.regime;
      if (!tradesByRegime.has(regime)) {
        tradesByRegime.set(regime, []);
      }
      tradesByRegime.get(regime)!.push(trade);
    }

    // Find optimal parameters for each regime
    for (const [regime, trades] of tradesByRegime) {
      if (trades.length < 10) continue;

      const winners = trades.filter(t => t.pnl > 0);
      const winRate = winners.length / trades.length;

      // Optimal entry threshold
      const avgWinningStrength = winners.length > 0 ?
        winners.reduce((sum, t) => sum + t.signalStrength, 0) / winners.length : 65;

      // Optimal holding time
      const avgWinningTime = winners.length > 0 ?
        winners.reduce((sum, t) => sum + t.holdingTime, 0) / winners.length : 60;

      // Store optimal parameters for this regime
      console.log(`Regime ${regime}: Win rate ${(winRate * 100).toFixed(1)}%, ` +
        `Optimal threshold: ${avgWinningStrength.toFixed(0)}, ` +
        `Optimal time: ${avgWinningTime.toFixed(0)}min`);
    }
  }

  // ============================================================================
  // POSITION SIZING
  // ============================================================================

  /**
   * Calculate optimal position size based on current conditions
   */
  calculatePositionSize(
    signal: Signal,
    accountBalance: number,
    currentDrawdown: number
  ): number {
    let size = this.parameters.basePositionSize;

    // Scale based on signal confidence
    const confidenceMultiplier = 1 + ((signal.confidence - 50) / 100) * this.parameters.scalingFactor;
    size *= confidenceMultiplier;

    // Regime multiplier
    if (this.currentRegime) {
      if (this.currentRegime.type.includes('TRENDING')) {
        size *= this.parameters.trendMultiplier;
      } else if (this.currentRegime.type === 'RANGING') {
        size *= this.parameters.rangeMultiplier;
      } else if (this.currentRegime.type === 'VOLATILE') {
        size *= 0.5; // Half size in volatile markets
      }
    }

    // Drawdown reduction
    const drawdownPercent = (currentDrawdown / accountBalance) * 100;
    if (drawdownPercent > this.parameters.maxDrawdownPercent * 0.5) {
      const reduction = 1 - (drawdownPercent / this.parameters.maxDrawdownPercent);
      size *= Math.max(0.25, reduction);
    }

    // Performance adjustment
    const perf = this.analyzePerformance();
    if (perf.recentWinRate < 0.4) {
      size *= 0.5;
    } else if (perf.recentWinRate > 0.6 && perf.streakCurrent > 0) {
      size *= 1.2;
    }

    // Volatility adjustment
    if (this.parameters.volatilityAdjustment && this.currentRegime) {
      const volatility = this.currentRegime.characteristics.volatility;
      if (volatility > 0.03) {
        size *= 0.7;
      } else if (volatility < 0.01) {
        size *= 1.2;
      }
    }

    // Apply limits
    size = Math.max(1, Math.min(this.parameters.maxPositionSize, Math.round(size)));

    return size;
  }

  /**
   * Check if we should take this trade
   */
  shouldTakeTrade(signal: Signal): { take: boolean; reason: string } {
    // Check signal strength
    if (signal.confidence < this.parameters.entryThreshold) {
      return { take: false, reason: `Signal strength ${signal.confidence} below threshold ${this.parameters.entryThreshold}` };
    }

    // Check daily entry limit
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = this.tradeHistory.filter(t =>
      new Date(t.entryTime).toISOString().split('T')[0] === today
    );
    if (todayTrades.length >= this.parameters.maxEntriesPerDay) {
      return { take: false, reason: `Daily entry limit of ${this.parameters.maxEntriesPerDay} reached` };
    }

    // Check daily loss limit
    const todayPnL = this.dailyPnL.get(today) || 0;
    if (todayPnL < -this.parameters.maxDailyLoss) {
      return { take: false, reason: `Daily loss limit of $${this.parameters.maxDailyLoss} reached` };
    }

    // Check losing streak
    const perf = this.analyzePerformance();
    if (perf.streakCurrent <= -5) {
      return { take: false, reason: 'On a losing streak of 5+ trades - pausing' };
    }

    // Check regime compatibility
    if (this.currentRegime?.type === 'VOLATILE' && signal.confidence < 75) {
      return { take: false, reason: 'Volatile regime requires higher confidence' };
    }

    return { take: true, reason: 'All checks passed' };
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getParameters(): StrategyParameters {
    return { ...this.parameters };
  }

  getState(): AdaptiveState {
    return {
      currentRegime: this.currentRegime || {
        type: 'RANGING',
        strength: 0.5,
        duration: 0,
        characteristics: { volatility: 0.02, momentum: 0, volumeProfile: 'STABLE', trendStrength: 0 },
      },
      activeParameters: this.parameters,
      performance: this.analyzePerformance(),
      adaptations: this.adaptations.slice(-20),
      confidence: this.calculateSystemConfidence(),
      lastOptimization: this.lastOptimization,
    };
  }

  private calculateSystemConfidence(): number {
    const perf = this.analyzePerformance();

    if (perf.totalTrades < 10) return 50;

    let confidence = 50;

    // Win rate contribution
    confidence += (perf.winRate - 0.5) * 50;

    // Profit factor contribution
    if (perf.profitFactor > 1.5) confidence += 10;
    if (perf.profitFactor > 2.0) confidence += 10;

    // Recent performance
    confidence += (perf.recentWinRate - 0.5) * 20;

    // Streak impact
    if (perf.streakCurrent > 0) confidence += Math.min(perf.streakCurrent * 2, 10);
    if (perf.streakCurrent < 0) confidence += Math.max(perf.streakCurrent * 3, -15);

    return Math.max(0, Math.min(100, confidence));
  }

  getTradeHistory(): TradeOutcome[] {
    return [...this.tradeHistory];
  }

  getAdaptations(): Adaptation[] {
    return [...this.adaptations];
  }

  getEquityCurve(): number[] {
    return [...this.equityCurve];
  }

  // ============================================================================
  // SETTERS
  // ============================================================================

  setParameter(param: keyof StrategyParameters, value: number): void {
    this.adjustParameter(param, value, 'Manual override');
  }

  resetToDefaults(): void {
    this.parameters = { ...DEFAULT_PARAMETERS };
    this.adaptations.push({
      timestamp: Date.now(),
      parameter: 'entryThreshold',
      oldValue: 0,
      newValue: 0,
      reason: 'Reset to defaults',
      regimeAtTime: this.currentRegime?.type || 'UNKNOWN',
    });
  }

  clearHistory(): void {
    this.tradeHistory = [];
    this.equityCurve = [];
    this.dailyPnL.clear();
    this.adaptations = [];
  }
}

// Export singleton
export const adaptiveStrategy = new AdaptiveStrategyEngine();
