/**
 * Advanced Portfolio Risk Analytics
 *
 * Institutional-grade risk analysis including:
 * - Value at Risk (VaR) - Parametric, Historical, Monte Carlo
 * - Expected Shortfall (CVaR)
 * - Monte Carlo Simulation
 * - Stress Testing & Scenario Analysis
 * - Greeks-style Risk Sensitivities
 * - Correlation Risk Analysis
 * - Tail Risk Metrics
 */

import { Position, Candle } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface VaRResult {
  parametric: number;           // Parametric VaR
  historical: number;           // Historical VaR
  monteCarlo: number;           // Monte Carlo VaR
  confidenceLevel: number;      // e.g., 0.95 or 0.99
  timeHorizon: number;          // Days
  portfolioValue: number;
  interpretation: string;
}

export interface CVaRResult {
  cvar: number;                 // Conditional VaR (Expected Shortfall)
  tailRisk: number;             // Average loss beyond VaR
  worstCase: number;            // Worst historical loss
  interpretation: string;
}

export interface MonteCarloResult {
  simulations: number;
  meanReturn: number;
  medianReturn: number;
  stdDev: number;
  var95: number;
  var99: number;
  maxDrawdown: number;
  probabilityOfProfit: number;
  percentiles: { [key: number]: number };
  distribution: number[];
}

export interface StressTestResult {
  scenario: string;
  description: string;
  portfolioImpact: number;
  percentageImpact: number;
  survivable: boolean;
  recommendations: string[];
}

export interface RiskSensitivity {
  deltaExposure: number;        // Price sensitivity
  gammaExposure: number;        // Convexity
  vegaExposure: number;         // Volatility sensitivity
  thetaExposure: number;        // Time decay (for options-like positions)
  correlationRisk: number;      // Correlation breakdown risk
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  eigenvalues: number[];
  principalComponents: number;
  diversificationRatio: number;
}

export interface TailRiskMetrics {
  skewness: number;
  kurtosis: number;
  tailIndex: number;
  maxDrawdown: number;
  avgDrawdown: number;
  recoveryTime: number;         // Average days to recover
  underwaterPeriod: number;     // Current days underwater
}

export interface RiskReport {
  timestamp: number;
  portfolioValue: number;
  var: VaRResult;
  cvar: CVaRResult;
  monteCarlo: MonteCarloResult;
  stressTests: StressTestResult[];
  sensitivity: RiskSensitivity;
  tailRisk: TailRiskMetrics;
  overallRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  recommendations: string[];
}

// ============================================================================
// VALUE AT RISK (VaR)
// ============================================================================

export function calculateVaR(
  returns: number[],
  portfolioValue: number,
  confidenceLevel: number = 0.95,
  timeHorizon: number = 1
): VaRResult {
  if (returns.length < 30) {
    return {
      parametric: 0,
      historical: 0,
      monteCarlo: 0,
      confidenceLevel,
      timeHorizon,
      portfolioValue,
      interpretation: 'Insufficient data for VaR calculation',
    };
  }

  // Parametric VaR (assumes normal distribution)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for confidence level
  const zScore = confidenceLevel === 0.99 ? 2.326 :
                 confidenceLevel === 0.95 ? 1.645 :
                 confidenceLevel === 0.90 ? 1.282 : 1.645;

  const parametricVaR = portfolioValue * (mean - zScore * stdDev) * Math.sqrt(timeHorizon);

  // Historical VaR
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const historicalIndex = Math.floor(returns.length * (1 - confidenceLevel));
  const historicalVaR = portfolioValue * Math.abs(sortedReturns[historicalIndex]) * Math.sqrt(timeHorizon);

  // Monte Carlo VaR
  const monteCarloReturns = runMonteCarloSimulation(returns, 10000, timeHorizon);
  const sortedMC = [...monteCarloReturns].sort((a, b) => a - b);
  const mcIndex = Math.floor(monteCarloReturns.length * (1 - confidenceLevel));
  const monteCarloVaR = portfolioValue * Math.abs(sortedMC[mcIndex]);

  const avgVaR = (Math.abs(parametricVaR) + historicalVaR + monteCarloVaR) / 3;

  return {
    parametric: Math.abs(parametricVaR),
    historical: historicalVaR,
    monteCarlo: monteCarloVaR,
    confidenceLevel,
    timeHorizon,
    portfolioValue,
    interpretation: `With ${confidenceLevel * 100}% confidence, the maximum expected loss over ${timeHorizon} day(s) is $${avgVaR.toFixed(2)}`,
  };
}

// ============================================================================
// CONDITIONAL VAR (Expected Shortfall)
// ============================================================================

export function calculateCVaR(
  returns: number[],
  portfolioValue: number,
  confidenceLevel: number = 0.95
): CVaRResult {
  if (returns.length < 30) {
    return {
      cvar: 0,
      tailRisk: 0,
      worstCase: 0,
      interpretation: 'Insufficient data',
    };
  }

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor(returns.length * (1 - confidenceLevel));

  // Average of returns beyond VaR threshold
  const tailReturns = sortedReturns.slice(0, cutoffIndex);
  const cvar = tailReturns.length > 0
    ? portfolioValue * Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length)
    : 0;

  const worstCase = portfolioValue * Math.abs(sortedReturns[0]);
  const tailRisk = worstCase - cvar;

  return {
    cvar,
    tailRisk,
    worstCase,
    interpretation: `Expected loss in the worst ${(1 - confidenceLevel) * 100}% of cases is $${cvar.toFixed(2)}`,
  };
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

function runMonteCarloSimulation(
  historicalReturns: number[],
  numSimulations: number,
  timeHorizon: number
): number[] {
  const mean = historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length;
  const variance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length;
  const stdDev = Math.sqrt(variance);

  const results: number[] = [];

  for (let i = 0; i < numSimulations; i++) {
    let cumulativeReturn = 0;

    for (let day = 0; day < timeHorizon; day++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      const dailyReturn = mean + stdDev * z;
      cumulativeReturn += dailyReturn;
    }

    results.push(cumulativeReturn);
  }

  return results;
}

export function runFullMonteCarloAnalysis(
  returns: number[],
  portfolioValue: number,
  numSimulations: number = 10000,
  timeHorizon: number = 252  // 1 year
): MonteCarloResult {
  const simulations = runMonteCarloSimulation(returns, numSimulations, timeHorizon);

  // Sort for percentile calculations
  const sorted = [...simulations].sort((a, b) => a - b);

  // Calculate statistics
  const mean = simulations.reduce((a, b) => a + b, 0) / numSimulations;
  const median = sorted[Math.floor(numSimulations / 2)];

  const variance = simulations.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / numSimulations;
  const stdDev = Math.sqrt(variance);

  // VaR at different confidence levels
  const var95 = portfolioValue * Math.abs(sorted[Math.floor(numSimulations * 0.05)]);
  const var99 = portfolioValue * Math.abs(sorted[Math.floor(numSimulations * 0.01)]);

  // Max drawdown estimation
  const maxDrawdown = Math.abs(Math.min(...simulations));

  // Probability of profit
  const profitableSims = simulations.filter(r => r > 0).length;
  const probabilityOfProfit = profitableSims / numSimulations;

  // Percentiles
  const percentiles: { [key: number]: number } = {
    1: sorted[Math.floor(numSimulations * 0.01)] * portfolioValue,
    5: sorted[Math.floor(numSimulations * 0.05)] * portfolioValue,
    10: sorted[Math.floor(numSimulations * 0.10)] * portfolioValue,
    25: sorted[Math.floor(numSimulations * 0.25)] * portfolioValue,
    50: sorted[Math.floor(numSimulations * 0.50)] * portfolioValue,
    75: sorted[Math.floor(numSimulations * 0.75)] * portfolioValue,
    90: sorted[Math.floor(numSimulations * 0.90)] * portfolioValue,
    95: sorted[Math.floor(numSimulations * 0.95)] * portfolioValue,
    99: sorted[Math.floor(numSimulations * 0.99)] * portfolioValue,
  };

  // Distribution buckets for visualization
  const buckets = 50;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bucketSize = (max - min) / buckets;
  const distribution = new Array(buckets).fill(0);

  for (const sim of simulations) {
    const bucket = Math.min(Math.floor((sim - min) / bucketSize), buckets - 1);
    distribution[bucket]++;
  }

  return {
    simulations: numSimulations,
    meanReturn: mean * portfolioValue,
    medianReturn: median * portfolioValue,
    stdDev: stdDev * portfolioValue,
    var95,
    var99,
    maxDrawdown: maxDrawdown * portfolioValue,
    probabilityOfProfit,
    percentiles,
    distribution: distribution.map(d => d / numSimulations),
  };
}

// ============================================================================
// STRESS TESTING
// ============================================================================

export interface StressScenario {
  name: string;
  description: string;
  priceChange: number;          // Percentage
  volatilityMultiplier: number;
  correlationShock: number;     // How much correlations increase
}

const DEFAULT_SCENARIOS: StressScenario[] = [
  {
    name: 'Flash Crash',
    description: 'Sudden 10% market drop in minutes',
    priceChange: -0.10,
    volatilityMultiplier: 5,
    correlationShock: 0.3,
  },
  {
    name: 'Black Monday',
    description: '1987-style 20% single-day crash',
    priceChange: -0.20,
    volatilityMultiplier: 8,
    correlationShock: 0.5,
  },
  {
    name: 'Liquidity Crisis',
    description: 'Spreads widen 10x, 5% adverse move',
    priceChange: -0.05,
    volatilityMultiplier: 3,
    correlationShock: 0.4,
  },
  {
    name: 'Rate Shock',
    description: 'Fed emergency rate hike, 8% drop',
    priceChange: -0.08,
    volatilityMultiplier: 4,
    correlationShock: 0.2,
  },
  {
    name: 'Crypto Contagion',
    description: 'Major exchange failure, 15% crypto crash',
    priceChange: -0.15,
    volatilityMultiplier: 6,
    correlationShock: 0.3,
  },
  {
    name: 'Bull Melt-Up',
    description: 'FOMO-driven 15% rally',
    priceChange: 0.15,
    volatilityMultiplier: 2,
    correlationShock: -0.1,
  },
  {
    name: 'Geopolitical Event',
    description: 'Major conflict, 12% drop with high vol',
    priceChange: -0.12,
    volatilityMultiplier: 7,
    correlationShock: 0.6,
  },
  {
    name: 'Currency Crisis',
    description: 'USD spike, 7% equity drop',
    priceChange: -0.07,
    volatilityMultiplier: 3,
    correlationShock: 0.25,
  },
];

export function runStressTests(
  portfolioValue: number,
  currentExposure: number,
  maxDrawdown: number,
  scenarios: StressScenario[] = DEFAULT_SCENARIOS
): StressTestResult[] {
  const results: StressTestResult[] = [];

  for (const scenario of scenarios) {
    const impact = currentExposure * scenario.priceChange;
    const percentImpact = (impact / portfolioValue) * 100;

    // Check if account would survive
    const remainingCapital = portfolioValue + impact;
    const survivable = remainingCapital > (portfolioValue - maxDrawdown);

    const recommendations: string[] = [];

    if (!survivable) {
      recommendations.push(`CRITICAL: This scenario would breach max drawdown limit`);
      recommendations.push(`Reduce position size by ${Math.ceil((Math.abs(impact) - maxDrawdown) / currentExposure * 100)}%`);
    }

    if (scenario.volatilityMultiplier > 4) {
      recommendations.push('Consider using volatility-adjusted position sizing');
    }

    if (scenario.correlationShock > 0.3) {
      recommendations.push('Diversification benefits may disappear during this event');
    }

    if (Math.abs(percentImpact) > 5) {
      recommendations.push('Consider hedging strategies for tail risk protection');
    }

    results.push({
      scenario: scenario.name,
      description: scenario.description,
      portfolioImpact: impact,
      percentageImpact: percentImpact,
      survivable,
      recommendations,
    });
  }

  return results;
}

// ============================================================================
// RISK SENSITIVITIES
// ============================================================================

export function calculateRiskSensitivities(
  positions: Position[],
  returns: number[],
  correlationMatrix?: CorrelationMatrix
): RiskSensitivity {
  // Delta exposure (total notional value)
  const deltaExposure = positions.reduce((sum, p) => {
    const direction = p.side === 'long' ? 1 : -1;
    return sum + (p.quantity * p.entryPrice * direction);
  }, 0);

  // Gamma (convexity) - how delta changes with price
  // For futures/spot, this is primarily from position sizing changes
  const gammaExposure = calculateGamma(positions, returns);

  // Vega (volatility sensitivity)
  const vegaExposure = calculateVega(positions, returns);

  // Theta (time decay) - minimal for futures, but affects funding
  const thetaExposure = calculateTheta(positions);

  // Correlation risk
  const correlationRisk = correlationMatrix
    ? 1 - correlationMatrix.diversificationRatio
    : 0.5;

  return {
    deltaExposure,
    gammaExposure,
    vegaExposure,
    thetaExposure,
    correlationRisk,
  };
}

function calculateGamma(positions: Position[], returns: number[]): number {
  if (returns.length < 20) return 0;

  // Estimate gamma from historical return convexity
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const negativeReturns = sortedReturns.filter(r => r < 0);
  const positiveReturns = sortedReturns.filter(r => r > 0);

  const avgNegative = negativeReturns.length > 0
    ? negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length
    : 0;
  const avgPositive = positiveReturns.length > 0
    ? positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length
    : 0;

  // Gamma approximation: asymmetry in return distribution
  const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.entryPrice, 0);
  return totalExposure * (avgPositive + avgNegative) * 10;
}

function calculateVega(positions: Position[], returns: number[]): number {
  if (returns.length < 20) return 0;

  // Historical volatility
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 252);

  // Position sensitivity to vol changes
  const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.entryPrice, 0);

  // Approximate vega as exposure * volatility impact
  return totalExposure * volatility * 0.1;
}

function calculateTheta(positions: Position[]): number {
  // For futures: theta represents funding costs and roll costs
  // Approximate as small daily cost
  const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.entryPrice, 0);

  // Assume ~0.01% daily funding cost equivalent
  return -totalExposure * 0.0001;
}

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

export function calculateCorrelationMatrix(
  assetReturns: Map<string, number[]>
): CorrelationMatrix {
  const assets = Array.from(assetReturns.keys());
  const n = assets.length;

  if (n < 2) {
    return {
      assets,
      matrix: [[1]],
      eigenvalues: [1],
      principalComponents: 1,
      diversificationRatio: 1,
    };
  }

  // Build correlation matrix
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        matrix[i][j] = calculateCorrelation(
          assetReturns.get(assets[i])!,
          assetReturns.get(assets[j])!
        );
      }
    }
  }

  // Calculate eigenvalues (simplified power iteration)
  const eigenvalues = estimateEigenvalues(matrix);

  // Principal components that explain 90% of variance
  const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
  let cumulativeVariance = 0;
  let principalComponents = 0;

  for (const ev of eigenvalues.sort((a, b) => b - a)) {
    cumulativeVariance += ev;
    principalComponents++;
    if (cumulativeVariance / totalVariance >= 0.9) break;
  }

  // Diversification ratio
  const avgCorrelation = matrix.reduce((sum, row, i) =>
    sum + row.reduce((s, val, j) => i !== j ? s + val : s, 0), 0
  ) / (n * (n - 1));

  const diversificationRatio = 1 - avgCorrelation;

  return {
    assets,
    matrix,
    eigenvalues,
    principalComponents,
    diversificationRatio,
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covariance += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denominator = Math.sqrt(varX * varY);
  return denominator > 0 ? covariance / denominator : 0;
}

function estimateEigenvalues(matrix: number[][]): number[] {
  // Simplified eigenvalue estimation using trace and determinant properties
  const n = matrix.length;
  const eigenvalues: number[] = [];

  // Use diagonal dominance approximation
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) rowSum += Math.abs(matrix[i][j]);
    }
    eigenvalues.push(matrix[i][i] + rowSum * 0.5);
  }

  return eigenvalues;
}

// ============================================================================
// TAIL RISK METRICS
// ============================================================================

export function calculateTailRiskMetrics(
  returns: number[],
  portfolioValue: number,
  equityCurve?: number[]
): TailRiskMetrics {
  if (returns.length < 30) {
    return {
      skewness: 0,
      kurtosis: 3,
      tailIndex: 0,
      maxDrawdown: 0,
      avgDrawdown: 0,
      recoveryTime: 0,
      underwaterPeriod: 0,
    };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Skewness
  const skewness = returns.reduce((sum, r) =>
    sum + Math.pow((r - mean) / stdDev, 3), 0
  ) / returns.length;

  // Kurtosis
  const kurtosis = returns.reduce((sum, r) =>
    sum + Math.pow((r - mean) / stdDev, 4), 0
  ) / returns.length;

  // Tail index (simplified Hill estimator)
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const tailSize = Math.floor(returns.length * 0.05);
  const tailReturns = sortedReturns.slice(0, tailSize);
  const tailIndex = tailReturns.length > 0
    ? Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length / stdDev)
    : 0;

  // Drawdown analysis
  let maxDrawdown = 0;
  let avgDrawdown = 0;
  let recoveryTime = 0;
  let underwaterPeriod = 0;
  let drawdownPeriods = 0;

  if (equityCurve && equityCurve.length > 0) {
    let peak = equityCurve[0];
    let currentDrawdownStart = -1;
    let totalDrawdown = 0;
    let totalRecoveryTime = 0;

    for (let i = 0; i < equityCurve.length; i++) {
      if (equityCurve[i] > peak) {
        if (currentDrawdownStart >= 0) {
          totalRecoveryTime += i - currentDrawdownStart;
          currentDrawdownStart = -1;
          drawdownPeriods++;
        }
        peak = equityCurve[i];
      } else {
        const drawdown = (peak - equityCurve[i]) / peak;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        totalDrawdown += drawdown;

        if (currentDrawdownStart < 0) {
          currentDrawdownStart = i;
        }
      }
    }

    // Check if currently underwater
    const lastPeak = Math.max(...equityCurve);
    const currentValue = equityCurve[equityCurve.length - 1];
    if (currentValue < lastPeak) {
      const peakIndex = equityCurve.indexOf(lastPeak);
      underwaterPeriod = equityCurve.length - 1 - peakIndex;
    }

    avgDrawdown = equityCurve.length > 0 ? totalDrawdown / equityCurve.length : 0;
    recoveryTime = drawdownPeriods > 0 ? totalRecoveryTime / drawdownPeriods : 0;
  }

  return {
    skewness,
    kurtosis,
    tailIndex,
    maxDrawdown: maxDrawdown * portfolioValue,
    avgDrawdown: avgDrawdown * portfolioValue,
    recoveryTime,
    underwaterPeriod,
  };
}

// ============================================================================
// COMPREHENSIVE RISK REPORT
// ============================================================================

export function generateRiskReport(
  positions: Position[],
  returns: number[],
  portfolioValue: number,
  maxDrawdownLimit: number,
  equityCurve?: number[]
): RiskReport {
  // Calculate total exposure
  const currentExposure = positions.reduce((sum, p) =>
    sum + p.quantity * p.entryPrice, 0
  );

  // VaR calculations
  const var95 = calculateVaR(returns, portfolioValue, 0.95, 1);
  const var99 = calculateVaR(returns, portfolioValue, 0.99, 1);

  // CVaR
  const cvar = calculateCVaR(returns, portfolioValue, 0.95);

  // Monte Carlo
  const monteCarlo = runFullMonteCarloAnalysis(returns, portfolioValue, 5000, 21);

  // Stress tests
  const stressTests = runStressTests(portfolioValue, currentExposure, maxDrawdownLimit);

  // Risk sensitivities
  const sensitivity = calculateRiskSensitivities(positions, returns);

  // Tail risk
  const tailRisk = calculateTailRiskMetrics(returns, portfolioValue, equityCurve);

  // Determine overall risk level
  let riskScore = 0;

  // VaR contribution
  if (var95.parametric > portfolioValue * 0.05) riskScore += 2;
  else if (var95.parametric > portfolioValue * 0.03) riskScore += 1;

  // Stress test contribution
  const unsurviable = stressTests.filter(s => !s.survivable).length;
  riskScore += unsurviable;

  // Tail risk contribution
  if (tailRisk.kurtosis > 5) riskScore += 1;
  if (tailRisk.skewness < -1) riskScore += 1;

  // Monte Carlo contribution
  if (monteCarlo.probabilityOfProfit < 0.5) riskScore += 1;

  let overallRiskLevel: RiskReport['overallRiskLevel'];
  if (riskScore >= 6) overallRiskLevel = 'EXTREME';
  else if (riskScore >= 4) overallRiskLevel = 'HIGH';
  else if (riskScore >= 2) overallRiskLevel = 'MODERATE';
  else overallRiskLevel = 'LOW';

  // Generate recommendations
  const recommendations: string[] = [];

  if (overallRiskLevel === 'EXTREME' || overallRiskLevel === 'HIGH') {
    recommendations.push('Consider reducing position sizes by 30-50%');
  }

  if (unsurviable > 2) {
    recommendations.push('Multiple stress scenarios would breach drawdown limits');
  }

  if (tailRisk.underwaterPeriod > 10) {
    recommendations.push(`Currently in drawdown for ${tailRisk.underwaterPeriod} periods`);
  }

  if (sensitivity.deltaExposure > portfolioValue * 2) {
    recommendations.push('Leverage exceeds 2x - consider reducing exposure');
  }

  if (var95.parametric > maxDrawdownLimit * 0.5) {
    recommendations.push('Daily VaR is over 50% of max drawdown limit');
  }

  return {
    timestamp: Date.now(),
    portfolioValue,
    var: var95,
    cvar,
    monteCarlo,
    stressTests,
    sensitivity,
    tailRisk,
    overallRiskLevel,
    recommendations,
  };
}

// ============================================================================
// APEX PROP FIRM SPECIFIC RISK CHECKS
// ============================================================================

export interface ApexRiskStatus {
  accountSize: number;
  currentBalance: number;
  dailyPnL: number;
  trailingDrawdown: number;
  maxTrailingDrawdown: number;
  profitTarget: number;
  tradingDays: number;
  requiredTradingDays: number;
  riskStatus: 'SAFE' | 'WARNING' | 'DANGER' | 'VIOLATED';
  canTrade: boolean;
  warnings: string[];
  recommendations: string[];
}

export function checkApexRiskStatus(
  accountSize: number,
  currentBalance: number,
  dailyPnL: number,
  highWaterMark: number,
  tradingDays: number
): ApexRiskStatus {
  // Apex 150K account rules
  const maxTrailingDrawdown = 5000;  // $5,000 trailing drawdown
  const profitTarget = 9000;         // $9,000 profit target
  const requiredTradingDays = 7;     // Minimum 7 trading days

  // Calculate trailing drawdown
  const trailingDrawdown = highWaterMark - currentBalance;

  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskStatus: ApexRiskStatus['riskStatus'] = 'SAFE';

  // Check drawdown status
  const drawdownPercent = (trailingDrawdown / maxTrailingDrawdown) * 100;

  if (trailingDrawdown >= maxTrailingDrawdown) {
    riskStatus = 'VIOLATED';
    warnings.push('ACCOUNT VIOLATED: Trailing drawdown limit breached');
  } else if (drawdownPercent >= 80) {
    riskStatus = 'DANGER';
    warnings.push(`DANGER: ${drawdownPercent.toFixed(1)}% of drawdown limit used`);
    recommendations.push('Reduce position size to 25% of normal');
    recommendations.push('Consider stopping trading for the day');
  } else if (drawdownPercent >= 60) {
    riskStatus = 'WARNING';
    warnings.push(`WARNING: ${drawdownPercent.toFixed(1)}% of drawdown limit used`);
    recommendations.push('Reduce position size to 50% of normal');
  }

  // Check daily loss
  if (dailyPnL < -1000) {
    warnings.push(`Daily loss of $${Math.abs(dailyPnL).toFixed(2)} - consider stopping`);
    if (riskStatus === 'SAFE') riskStatus = 'WARNING';
  }

  // Check progress to target
  const progressToTarget = ((currentBalance - accountSize) / profitTarget) * 100;
  if (progressToTarget < 0) {
    recommendations.push('Focus on capital preservation until positive');
  } else if (progressToTarget >= 80) {
    recommendations.push('Close to profit target - consider reducing risk');
  }

  // Trading days check
  if (tradingDays < requiredTradingDays) {
    recommendations.push(`Need ${requiredTradingDays - tradingDays} more trading days`);
  }

  const canTrade = riskStatus !== 'VIOLATED' && drawdownPercent < 90;

  return {
    accountSize,
    currentBalance,
    dailyPnL,
    trailingDrawdown,
    maxTrailingDrawdown,
    profitTarget,
    tradingDays,
    requiredTradingDays,
    riskStatus,
    canTrade,
    warnings,
    recommendations,
  };
}
