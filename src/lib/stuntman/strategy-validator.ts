/**
 * STRATEGY VALIDATION FRAMEWORK
 *
 * Tracks paper trading results and determines when a strategy
 * is PROVEN and ready for live trading.
 *
 * CRITICAL: Only strategies that pass ALL validation criteria
 * should be used with real money.
 */

export interface ValidationCriteria {
  minTrades: number;           // Minimum number of trades
  minWinRate: number;          // Minimum win rate (0-1)
  minProfitFactor: number;     // Min profit factor (gross profit / gross loss)
  maxDrawdown: number;         // Max acceptable drawdown ($)
  minDaysTraded: number;       // Min trading days
  maxAvgSlippage: number;      // Max average slippage (points)
  minConsistency: number;      // Min % of profitable days
}

export interface StrategyStats {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  avgSlippage: number;
  avgLatency: number;
  daysTraded: number;
  profitableDays: number;
  consistencyScore: number;
  validationStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  failureReasons: string[];
  lastUpdated: string;
}

export interface DailyPerformance {
  date: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  maxDrawdown: number;
}

export interface ValidationReport {
  strategy: string;
  status: 'VALIDATED' | 'FAILED' | 'PENDING';
  criteria: ValidationCriteria;
  stats: StrategyStats;
  dailyPerformance: DailyPerformance[];
  recommendation: string;
  generatedAt: string;
}

// Default validation criteria (conservative)
export const DEFAULT_CRITERIA: ValidationCriteria = {
  minTrades: 20,           // At least 20 trades
  minWinRate: 0.45,        // At least 45% win rate
  minProfitFactor: 1.2,    // Gross profit > gross loss by 20%
  maxDrawdown: 500,        // Max $500 drawdown
  minDaysTraded: 5,        // At least 5 trading days
  maxAvgSlippage: 1.0,     // Max 1 point average slippage
  minConsistency: 0.5,     // At least 50% of days profitable
};

// Strict criteria for live trading with larger accounts
export const STRICT_CRITERIA: ValidationCriteria = {
  minTrades: 50,
  minWinRate: 0.50,
  minProfitFactor: 1.5,
  maxDrawdown: 300,
  minDaysTraded: 10,
  maxAvgSlippage: 0.5,
  minConsistency: 0.6,
};

// Calculate strategy statistics from trade history
export function calculateStrategyStats(
  strategyName: string,
  trades: {
    pnl: number;
    entryTime: string;
    exitTime: string;
    slippage: number;
    latencyMs: number;
    strategy: string;
  }[]
): StrategyStats {
  // Filter trades for this strategy
  const strategyTrades = trades.filter(t => t.strategy === strategyName);

  if (strategyTrades.length === 0) {
    return {
      name: strategyName,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnL: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      avgSlippage: 0,
      avgLatency: 0,
      daysTraded: 0,
      profitableDays: 0,
      consistencyScore: 0,
      validationStatus: 'PENDING',
      failureReasons: ['No trades recorded'],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Basic stats
  const wins = strategyTrades.filter(t => t.pnl > 0);
  const losses = strategyTrades.filter(t => t.pnl <= 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const netPnL = grossProfit - grossLoss;

  // Win rate
  const winRate = strategyTrades.length > 0 ? wins.length / strategyTrades.length : 0;

  // Profit factor
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Average win/loss
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  // Expectancy (expected value per trade)
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  // Calculate max drawdown
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const trade of strategyTrades) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Average slippage and latency
  const avgSlippage = strategyTrades.reduce((sum, t) => sum + t.slippage, 0) / strategyTrades.length;
  const avgLatency = strategyTrades.reduce((sum, t) => sum + t.latencyMs, 0) / strategyTrades.length;

  // Days traded and consistency
  const dayMap = new Map<string, { pnl: number; trades: number }>();
  for (const trade of strategyTrades) {
    const day = trade.exitTime.split('T')[0];
    if (!dayMap.has(day)) {
      dayMap.set(day, { pnl: 0, trades: 0 });
    }
    const dayStats = dayMap.get(day)!;
    dayStats.pnl += trade.pnl;
    dayStats.trades++;
  }

  const daysTraded = dayMap.size;
  const profitableDays = Array.from(dayMap.values()).filter(d => d.pnl > 0).length;
  const consistencyScore = daysTraded > 0 ? profitableDays / daysTraded : 0;

  return {
    name: strategyName,
    trades: strategyTrades.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    grossProfit,
    grossLoss,
    netPnL,
    profitFactor,
    maxDrawdown,
    avgWin,
    avgLoss,
    expectancy,
    avgSlippage,
    avgLatency,
    daysTraded,
    profitableDays,
    consistencyScore,
    validationStatus: 'PENDING',
    failureReasons: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Validate a strategy against criteria
export function validateStrategy(
  stats: StrategyStats,
  criteria: ValidationCriteria = DEFAULT_CRITERIA
): StrategyStats {
  const failures: string[] = [];

  // Check each criterion
  if (stats.trades < criteria.minTrades) {
    failures.push(`Insufficient trades: ${stats.trades}/${criteria.minTrades} required`);
  }

  if (stats.winRate < criteria.minWinRate) {
    failures.push(`Win rate too low: ${(stats.winRate * 100).toFixed(1)}%/${(criteria.minWinRate * 100)}% required`);
  }

  if (stats.profitFactor < criteria.minProfitFactor) {
    failures.push(`Profit factor too low: ${stats.profitFactor.toFixed(2)}/${criteria.minProfitFactor} required`);
  }

  if (stats.maxDrawdown > criteria.maxDrawdown) {
    failures.push(`Drawdown too high: $${stats.maxDrawdown.toFixed(2)}/$${criteria.maxDrawdown} max`);
  }

  if (stats.daysTraded < criteria.minDaysTraded) {
    failures.push(`Insufficient trading days: ${stats.daysTraded}/${criteria.minDaysTraded} required`);
  }

  if (stats.avgSlippage > criteria.maxAvgSlippage) {
    failures.push(`Slippage too high: ${stats.avgSlippage.toFixed(2)} points/${criteria.maxAvgSlippage} max`);
  }

  if (stats.consistencyScore < criteria.minConsistency) {
    failures.push(`Consistency too low: ${(stats.consistencyScore * 100).toFixed(1)}%/${(criteria.minConsistency * 100)}% required`);
  }

  // Determine status
  if (stats.trades < criteria.minTrades) {
    stats.validationStatus = 'PENDING';
  } else if (failures.length === 0) {
    stats.validationStatus = 'VALIDATED';
  } else {
    stats.validationStatus = 'FAILED';
  }

  stats.failureReasons = failures;
  return stats;
}

// Generate validation report
export function generateValidationReport(
  strategyName: string,
  trades: {
    pnl: number;
    entryTime: string;
    exitTime: string;
    slippage: number;
    latencyMs: number;
    strategy: string;
  }[],
  criteria: ValidationCriteria = DEFAULT_CRITERIA
): ValidationReport {
  // Calculate stats
  let stats = calculateStrategyStats(strategyName, trades);
  stats = validateStrategy(stats, criteria);

  // Calculate daily performance
  const strategyTrades = trades.filter(t => t.strategy === strategyName);
  const dayMap = new Map<string, DailyPerformance>();

  for (const trade of strategyTrades) {
    const day = trade.exitTime.split('T')[0];
    if (!dayMap.has(day)) {
      dayMap.set(day, {
        date: day,
        trades: 0,
        pnl: 0,
        wins: 0,
        losses: 0,
        maxDrawdown: 0,
      });
    }
    const dayStats = dayMap.get(day)!;
    dayStats.trades++;
    dayStats.pnl += trade.pnl;
    if (trade.pnl > 0) dayStats.wins++;
    else dayStats.losses++;
  }

  const dailyPerformance = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Generate recommendation
  let recommendation: string;
  if (stats.validationStatus === 'VALIDATED') {
    recommendation = `READY FOR LIVE: ${strategyName} has passed all validation criteria. Consider starting with small position sizes (1 MES) for the first week of live trading.`;
  } else if (stats.validationStatus === 'PENDING') {
    const tradesNeeded = criteria.minTrades - stats.trades;
    recommendation = `CONTINUE PAPER TRADING: ${tradesNeeded} more trades needed before validation. Current win rate: ${(stats.winRate * 100).toFixed(1)}%`;
  } else {
    recommendation = `NOT READY: Strategy failed validation. Issues: ${stats.failureReasons.join('; ')}. Consider adjusting parameters or trying a different approach.`;
  }

  return {
    strategy: strategyName,
    status: stats.validationStatus,
    criteria,
    stats,
    dailyPerformance,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}

// Check if ANY strategy is ready for live trading
export function getReadyStrategies(
  allTrades: {
    pnl: number;
    entryTime: string;
    exitTime: string;
    slippage: number;
    latencyMs: number;
    strategy: string;
  }[],
  criteria: ValidationCriteria = DEFAULT_CRITERIA
): string[] {
  // Get unique strategy names
  const strategies = [...new Set(allTrades.map(t => t.strategy))];

  // Check each strategy
  const ready: string[] = [];
  for (const strategy of strategies) {
    let stats = calculateStrategyStats(strategy, allTrades);
    stats = validateStrategy(stats, criteria);
    if (stats.validationStatus === 'VALIDATED') {
      ready.push(strategy);
    }
  }

  return ready;
}

// Get strategies ranked by performance
export function rankStrategies(
  allTrades: {
    pnl: number;
    entryTime: string;
    exitTime: string;
    slippage: number;
    latencyMs: number;
    strategy: string;
  }[]
): StrategyStats[] {
  const strategies = [...new Set(allTrades.map(t => t.strategy))];
  const stats: StrategyStats[] = [];

  for (const strategy of strategies) {
    let stratStats = calculateStrategyStats(strategy, allTrades);
    stratStats = validateStrategy(stratStats);
    stats.push(stratStats);
  }

  // Sort by expectancy (expected profit per trade)
  return stats.sort((a, b) => b.expectancy - a.expectancy);
}
