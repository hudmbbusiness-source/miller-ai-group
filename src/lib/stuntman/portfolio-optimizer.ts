/**
 * Portfolio Optimizer with Correlation Analysis & Anomaly Detection
 *
 * Features:
 * - Real-time correlation heatmap
 * - Mean-variance optimization
 * - Risk parity allocation
 * - Anomaly/regime change detection
 * - Dynamic hedging suggestions
 */

import { Candle, Position } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface Asset {
  symbol: string;
  returns: number[];
  volatility: number;
  sharpeRatio: number;
  currentWeight: number;
  optimalWeight: number;
}

export interface CorrelationHeatmap {
  assets: string[];
  matrix: number[][];
  clusters: AssetCluster[];
  diversificationScore: number;
  timestamp: number;
}

export interface AssetCluster {
  id: number;
  assets: string[];
  avgCorrelation: number;
  color: string;
}

export interface PortfolioOptimization {
  currentWeights: Record<string, number>;
  optimalWeights: Record<string, number>;
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  action: 'INCREASE' | 'DECREASE' | 'HEDGE' | 'CLOSE';
  asset: string;
  currentWeight: number;
  targetWeight: number;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AnomalyDetection {
  detected: boolean;
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedAssets: string[];
  recommendations: string[];
  timestamp: number;
}

export type AnomalyType =
  | 'CORRELATION_BREAKDOWN'
  | 'VOLATILITY_SPIKE'
  | 'REGIME_CHANGE'
  | 'LIQUIDITY_CRISIS'
  | 'FLASH_CRASH'
  | 'MOMENTUM_REVERSAL'
  | 'UNUSUAL_VOLUME'
  | 'DIVERGENCE';

export interface RegimeState {
  current: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'CRISIS' | 'RECOVERY';
  confidence: number;
  duration: number;
  previousRegime: string;
  changeDetected: boolean;
  indicators: RegimeIndicator[];
}

export interface RegimeIndicator {
  name: string;
  value: number;
  threshold: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

export class CorrelationAnalyzer {
  private historicalCorrelations: Map<string, number[]> = new Map();

  /**
   * Calculate correlation matrix from price data
   */
  calculateCorrelationMatrix(
    assetData: Map<string, Candle[]>,
    lookback: number = 60
  ): CorrelationHeatmap {
    const assets = Array.from(assetData.keys());
    const n = assets.length;

    if (n < 2) {
      return {
        assets,
        matrix: [[1]],
        clusters: [],
        diversificationScore: 1,
        timestamp: Date.now(),
      };
    }

    // Calculate returns for each asset
    const returns = new Map<string, number[]>();
    for (const [symbol, candles] of assetData) {
      const assetReturns: number[] = [];
      const recentCandles = candles.slice(-lookback - 1);

      for (let i = 1; i < recentCandles.length; i++) {
        const ret = (recentCandles[i].close - recentCandles[i - 1].close) /
          recentCandles[i - 1].close;
        assetReturns.push(ret);
      }
      returns.set(symbol, assetReturns);
    }

    // Build correlation matrix
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const corr = this.calculateCorrelation(
            returns.get(assets[i])!,
            returns.get(assets[j])!
          );
          matrix[i][j] = corr;

          // Track historical correlations for anomaly detection
          const key = `${assets[i]}_${assets[j]}`;
          if (!this.historicalCorrelations.has(key)) {
            this.historicalCorrelations.set(key, []);
          }
          const history = this.historicalCorrelations.get(key)!;
          history.push(corr);
          if (history.length > 100) history.shift();
        }
      }
    }

    // Identify clusters using hierarchical clustering
    const clusters = this.identifyClusters(assets, matrix);

    // Calculate diversification score
    const diversificationScore = this.calculateDiversificationScore(matrix);

    return {
      assets,
      matrix,
      clusters,
      diversificationScore,
      timestamp: Date.now(),
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
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

  private identifyClusters(assets: string[], matrix: number[][]): AssetCluster[] {
    const n = assets.length;
    const clusters: AssetCluster[] = [];
    const assigned = new Set<string>();

    // Simple clustering: group assets with correlation > 0.7
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (assigned.has(assets[i])) continue;

      const clusterAssets = [assets[i]];
      assigned.add(assets[i]);

      for (let j = i + 1; j < n; j++) {
        if (!assigned.has(assets[j]) && matrix[i][j] > 0.7) {
          clusterAssets.push(assets[j]);
          assigned.add(assets[j]);
        }
      }

      // Calculate average correlation within cluster
      let totalCorr = 0;
      let pairs = 0;
      for (let a = 0; a < clusterAssets.length; a++) {
        for (let b = a + 1; b < clusterAssets.length; b++) {
          const ai = assets.indexOf(clusterAssets[a]);
          const bi = assets.indexOf(clusterAssets[b]);
          totalCorr += matrix[ai][bi];
          pairs++;
        }
      }

      clusters.push({
        id: clusterId++,
        assets: clusterAssets,
        avgCorrelation: pairs > 0 ? totalCorr / pairs : 1,
        color: colors[clusterId % colors.length],
      });
    }

    return clusters;
  }

  private calculateDiversificationScore(matrix: number[][]): number {
    const n = matrix.length;
    if (n < 2) return 1;

    // Average absolute correlation (lower is better)
    let totalCorr = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalCorr += Math.abs(matrix[i][j]);
        count++;
      }
    }

    const avgCorr = count > 0 ? totalCorr / count : 0;

    // Convert to score (0-100, higher is better)
    return Math.round((1 - avgCorr) * 100);
  }

  /**
   * Detect correlation breakdown anomaly
   */
  detectCorrelationAnomaly(
    currentMatrix: number[][],
    assets: string[]
  ): AnomalyDetection | null {
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const key = `${assets[i]}_${assets[j]}`;
        const history = this.historicalCorrelations.get(key);

        if (!history || history.length < 30) continue;

        const currentCorr = currentMatrix[i][j];
        const historicalAvg = history.slice(0, -1).reduce((a, b) => a + b, 0) / (history.length - 1);
        const historicalStd = Math.sqrt(
          history.slice(0, -1).reduce((sum, c) => sum + Math.pow(c - historicalAvg, 2), 0) / (history.length - 1)
        );

        // Check for significant deviation (> 2 std)
        const zScore = historicalStd > 0 ? (currentCorr - historicalAvg) / historicalStd : 0;

        if (Math.abs(zScore) > 2.5) {
          return {
            detected: true,
            type: 'CORRELATION_BREAKDOWN',
            severity: Math.abs(zScore) > 3.5 ? 'CRITICAL' : Math.abs(zScore) > 3 ? 'HIGH' : 'MEDIUM',
            description: `Correlation between ${assets[i]} and ${assets[j]} has ${zScore > 0 ? 'spiked' : 'collapsed'} from ${historicalAvg.toFixed(2)} to ${currentCorr.toFixed(2)}`,
            affectedAssets: [assets[i], assets[j]],
            recommendations: [
              'Review positions in correlated assets',
              'Consider reducing exposure until correlation stabilizes',
              zScore > 0 ? 'Diversification benefits may be compromised' : 'Potential hedging opportunity',
            ],
            timestamp: Date.now(),
          };
        }
      }
    }

    return null;
  }
}

// ============================================================================
// PORTFOLIO OPTIMIZATION
// ============================================================================

export class PortfolioOptimizer {
  /**
   * Run mean-variance optimization
   */
  optimize(
    positions: Position[],
    assetData: Map<string, Candle[]>,
    riskFreeRate: number = 0.04,
    targetVolatility?: number
  ): PortfolioOptimization {
    const assets: Asset[] = [];
    let totalValue = 0;

    // Calculate metrics for each asset
    for (const position of positions) {
      const candles = assetData.get(position.symbol);
      if (!candles || candles.length < 30) continue;

      const returns = this.calculateReturns(candles);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length * 252; // Annualized
      const volatility = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 252, 2), 0) / returns.length
      ) * Math.sqrt(252);

      const positionValue = position.quantity * position.entryPrice;
      totalValue += positionValue;

      assets.push({
        symbol: position.symbol,
        returns,
        volatility,
        sharpeRatio: volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0,
        currentWeight: positionValue, // Will normalize later
        optimalWeight: 0,
      });
    }

    // Normalize current weights
    for (const asset of assets) {
      asset.currentWeight = totalValue > 0 ? asset.currentWeight / totalValue : 0;
    }

    // Simple optimization: weight by Sharpe ratio
    const totalSharpe = assets.reduce((sum, a) => sum + Math.max(0, a.sharpeRatio), 0);
    for (const asset of assets) {
      asset.optimalWeight = totalSharpe > 0
        ? Math.max(0, asset.sharpeRatio) / totalSharpe
        : 1 / assets.length;
    }

    // Apply risk parity adjustment if target volatility specified
    if (targetVolatility) {
      this.applyRiskParity(assets, targetVolatility);
    }

    // Calculate portfolio metrics
    const expectedReturn = assets.reduce((sum, a) => sum + a.optimalWeight * a.sharpeRatio * a.volatility + riskFreeRate, 0);
    const expectedVolatility = Math.sqrt(
      assets.reduce((sum, a) => sum + Math.pow(a.optimalWeight * a.volatility, 2), 0)
    );
    const portfolioSharpe = expectedVolatility > 0
      ? (expectedReturn - riskFreeRate) / expectedVolatility
      : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(assets);

    const currentWeights: Record<string, number> = {};
    const optimalWeights: Record<string, number> = {};

    for (const asset of assets) {
      currentWeights[asset.symbol] = asset.currentWeight;
      optimalWeights[asset.symbol] = asset.optimalWeight;
    }

    return {
      currentWeights,
      optimalWeights,
      expectedReturn,
      expectedVolatility,
      sharpeRatio: portfolioSharpe,
      maxDrawdown: expectedVolatility * 2.5, // Approximate
      recommendations,
    };
  }

  private calculateReturns(candles: Candle[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }
    return returns;
  }

  private applyRiskParity(assets: Asset[], targetVolatility: number): void {
    // Equal risk contribution
    const totalInverseVol = assets.reduce((sum, a) =>
      sum + (a.volatility > 0 ? 1 / a.volatility : 0), 0
    );

    for (const asset of assets) {
      if (totalInverseVol > 0 && asset.volatility > 0) {
        asset.optimalWeight = (1 / asset.volatility) / totalInverseVol;
      }
    }

    // Scale to target volatility
    const currentVol = Math.sqrt(
      assets.reduce((sum, a) => sum + Math.pow(a.optimalWeight * a.volatility, 2), 0)
    );

    if (currentVol > 0) {
      const scale = targetVolatility / currentVol;
      for (const asset of assets) {
        asset.optimalWeight *= scale;
      }
    }
  }

  private generateRecommendations(assets: Asset[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const asset of assets) {
      const weightDiff = asset.optimalWeight - asset.currentWeight;

      if (Math.abs(weightDiff) < 0.05) continue; // Skip small differences

      let action: OptimizationRecommendation['action'];
      let reason: string;
      let urgency: OptimizationRecommendation['urgency'];

      if (weightDiff > 0.2) {
        action = 'INCREASE';
        reason = `Underweight by ${(weightDiff * 100).toFixed(1)}%. Strong risk-adjusted returns.`;
        urgency = weightDiff > 0.3 ? 'HIGH' : 'MEDIUM';
      } else if (weightDiff > 0) {
        action = 'INCREASE';
        reason = `Slightly underweight. Consider adding on pullbacks.`;
        urgency = 'LOW';
      } else if (weightDiff < -0.2) {
        action = 'DECREASE';
        reason = `Overweight by ${(Math.abs(weightDiff) * 100).toFixed(1)}%. Reduce concentration risk.`;
        urgency = weightDiff < -0.3 ? 'HIGH' : 'MEDIUM';
      } else {
        action = 'DECREASE';
        reason = `Slightly overweight. Consider trimming.`;
        urgency = 'LOW';
      }

      // Special cases
      if (asset.sharpeRatio < 0) {
        action = 'CLOSE';
        reason = 'Negative risk-adjusted returns. Consider closing position.';
        urgency = 'HIGH';
      } else if (asset.volatility > 0.5) {
        action = 'HEDGE';
        reason = 'High volatility asset. Consider hedging or reducing.';
        urgency = 'MEDIUM';
      }

      recommendations.push({
        action,
        asset: asset.symbol,
        currentWeight: asset.currentWeight,
        targetWeight: asset.optimalWeight,
        reason,
        urgency,
      });
    }

    return recommendations.sort((a, b) => {
      const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export class AnomalyDetector {
  private priceHistory: Map<string, number[]> = new Map();
  private volumeHistory: Map<string, number[]> = new Map();
  private volatilityHistory: number[] = [];

  /**
   * Update detector with new data
   */
  update(symbol: string, candle: Candle): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
      this.volumeHistory.set(symbol, []);
    }

    this.priceHistory.get(symbol)!.push(candle.close);
    this.volumeHistory.get(symbol)!.push(candle.volume);

    // Keep last 200 data points
    if (this.priceHistory.get(symbol)!.length > 200) {
      this.priceHistory.get(symbol)!.shift();
      this.volumeHistory.get(symbol)!.shift();
    }
  }

  /**
   * Detect anomalies across all monitored assets
   */
  detectAnomalies(assetData: Map<string, Candle[]>): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    for (const [symbol, candles] of assetData) {
      if (candles.length < 50) continue;

      // Update history
      const latestCandle = candles[candles.length - 1];
      this.update(symbol, latestCandle);

      // Check for various anomalies
      const volSpike = this.detectVolatilitySpike(symbol, candles);
      if (volSpike) anomalies.push(volSpike);

      const flashCrash = this.detectFlashCrash(symbol, candles);
      if (flashCrash) anomalies.push(flashCrash);

      const volumeAnomaly = this.detectVolumeAnomaly(symbol, candles);
      if (volumeAnomaly) anomalies.push(volumeAnomaly);

      const momentumReversal = this.detectMomentumReversal(symbol, candles);
      if (momentumReversal) anomalies.push(momentumReversal);
    }

    // Check for regime change across market
    const regimeChange = this.detectRegimeChange(assetData);
    if (regimeChange) anomalies.push(regimeChange);

    return anomalies;
  }

  private detectVolatilitySpike(symbol: string, candles: Candle[]): AnomalyDetection | null {
    const recent = candles.slice(-5);
    const historical = candles.slice(-50, -5);

    // Calculate recent volatility
    const recentReturns = recent.map((c, i, arr) =>
      i > 0 ? Math.abs((c.close - arr[i - 1].close) / arr[i - 1].close) : 0
    ).slice(1);
    const recentVol = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;

    // Calculate historical volatility
    const historicalReturns = historical.map((c, i, arr) =>
      i > 0 ? Math.abs((c.close - arr[i - 1].close) / arr[i - 1].close) : 0
    ).slice(1);
    const historicalVol = historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length;
    const historicalStd = Math.sqrt(
      historicalReturns.reduce((sum, r) => sum + Math.pow(r - historicalVol, 2), 0) / historicalReturns.length
    );

    const zScore = historicalStd > 0 ? (recentVol - historicalVol) / historicalStd : 0;

    if (zScore > 3) {
      return {
        detected: true,
        type: 'VOLATILITY_SPIKE',
        severity: zScore > 5 ? 'CRITICAL' : zScore > 4 ? 'HIGH' : 'MEDIUM',
        description: `${symbol} volatility is ${zScore.toFixed(1)} standard deviations above normal`,
        affectedAssets: [symbol],
        recommendations: [
          'Reduce position size immediately',
          'Widen stops to avoid premature exit',
          'Consider hedging with options or inverse positions',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private detectFlashCrash(symbol: string, candles: Candle[]): AnomalyDetection | null {
    const recent = candles.slice(-10);

    // Check for rapid price decline
    const maxHigh = Math.max(...recent.map(c => c.high));
    const minLow = Math.min(...recent.map(c => c.low));
    const dropPercent = (maxHigh - minLow) / maxHigh;

    // Check for V-shape recovery
    const lastPrice = recent[recent.length - 1].close;
    const recoveryPercent = (lastPrice - minLow) / (maxHigh - minLow);

    if (dropPercent > 0.05 && recoveryPercent > 0.5) {
      return {
        detected: true,
        type: 'FLASH_CRASH',
        severity: dropPercent > 0.1 ? 'CRITICAL' : 'HIGH',
        description: `${symbol} experienced a ${(dropPercent * 100).toFixed(1)}% flash crash with ${(recoveryPercent * 100).toFixed(0)}% recovery`,
        affectedAssets: [symbol],
        recommendations: [
          'Check for news or technical issues',
          'Review stop placement - may have been triggered',
          'Wait for market to stabilize before new entries',
          'Consider this as potential accumulation opportunity if fundamentals unchanged',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private detectVolumeAnomaly(symbol: string, candles: Candle[]): AnomalyDetection | null {
    const recent = candles.slice(-5);
    const historical = candles.slice(-50, -5);

    const recentAvgVol = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const historicalAvgVol = historical.reduce((sum, c) => sum + c.volume, 0) / historical.length;

    const volumeRatio = recentAvgVol / historicalAvgVol;

    if (volumeRatio > 3) {
      const priceChange = (recent[recent.length - 1].close - recent[0].open) / recent[0].open;

      return {
        detected: true,
        type: 'UNUSUAL_VOLUME',
        severity: volumeRatio > 5 ? 'HIGH' : 'MEDIUM',
        description: `${symbol} volume is ${volumeRatio.toFixed(1)}x normal with ${(priceChange * 100).toFixed(2)}% price change`,
        affectedAssets: [symbol],
        recommendations: [
          'Investigate cause of volume spike',
          priceChange > 0 ? 'Could indicate accumulation' : 'Could indicate distribution',
          'Monitor for continuation or reversal',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private detectMomentumReversal(symbol: string, candles: Candle[]): AnomalyDetection | null {
    if (candles.length < 30) return null;

    // Calculate short and long momentum
    const shortMomentum = (candles[candles.length - 1].close - candles[candles.length - 5].close) /
      candles[candles.length - 5].close;
    const longMomentum = (candles[candles.length - 5].close - candles[candles.length - 20].close) /
      candles[candles.length - 20].close;

    // Detect divergence
    if ((longMomentum > 0.05 && shortMomentum < -0.03) ||
        (longMomentum < -0.05 && shortMomentum > 0.03)) {
      return {
        detected: true,
        type: 'MOMENTUM_REVERSAL',
        severity: 'MEDIUM',
        description: `${symbol} showing momentum reversal: long-term ${longMomentum > 0 ? 'bullish' : 'bearish'} but short-term ${shortMomentum > 0 ? 'bullish' : 'bearish'}`,
        affectedAssets: [symbol],
        recommendations: [
          'Potential trend change developing',
          'Tighten stops on existing positions',
          'Wait for confirmation before new entries',
        ],
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private detectRegimeChange(assetData: Map<string, Candle[]>): AnomalyDetection | null {
    // Check if multiple assets are showing similar anomalies
    let bearishCount = 0;
    let bullishCount = 0;
    let totalAssets = 0;

    for (const [symbol, candles] of assetData) {
      if (candles.length < 20) continue;
      totalAssets++;

      const returns5d = (candles[candles.length - 1].close - candles[candles.length - 5].close) /
        candles[candles.length - 5].close;

      if (returns5d < -0.05) bearishCount++;
      if (returns5d > 0.05) bullishCount++;
    }

    if (totalAssets >= 3) {
      if (bearishCount >= totalAssets * 0.7) {
        return {
          detected: true,
          type: 'REGIME_CHANGE',
          severity: 'HIGH',
          description: `Market regime shift detected: ${bearishCount}/${totalAssets} assets in bearish mode`,
          affectedAssets: Array.from(assetData.keys()),
          recommendations: [
            'Consider defensive positioning',
            'Reduce overall exposure',
            'Increase cash allocation',
            'Review stop losses on all positions',
          ],
          timestamp: Date.now(),
        };
      }

      if (bullishCount >= totalAssets * 0.7) {
        return {
          detected: true,
          type: 'REGIME_CHANGE',
          severity: 'MEDIUM',
          description: `Market regime shift detected: ${bullishCount}/${totalAssets} assets in bullish mode`,
          affectedAssets: Array.from(assetData.keys()),
          recommendations: [
            'Consider increasing exposure',
            'Look for pullback entries',
            'Trail stops to lock in gains',
          ],
          timestamp: Date.now(),
        };
      }
    }

    return null;
  }

  /**
   * Get current regime state
   */
  getRegimeState(assetData: Map<string, Candle[]>): RegimeState {
    const indicators: RegimeIndicator[] = [];

    // Aggregate momentum across assets
    let totalMomentum = 0;
    let totalVolatility = 0;
    let assetCount = 0;

    for (const [symbol, candles] of assetData) {
      if (candles.length < 50) continue;
      assetCount++;

      // 20-day momentum
      const momentum20 = (candles[candles.length - 1].close - candles[candles.length - 20].close) /
        candles[candles.length - 20].close;
      totalMomentum += momentum20;

      // Volatility
      const returns = candles.slice(-20).map((c, i, arr) =>
        i > 0 ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0
      ).slice(1);
      const vol = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252);
      totalVolatility += vol;
    }

    const avgMomentum = assetCount > 0 ? totalMomentum / assetCount : 0;
    const avgVolatility = assetCount > 0 ? totalVolatility / assetCount : 0;

    indicators.push({
      name: 'Average Momentum',
      value: avgMomentum,
      threshold: 0.05,
      signal: avgMomentum > 0.05 ? 'BULLISH' : avgMomentum < -0.05 ? 'BEARISH' : 'NEUTRAL',
    });

    indicators.push({
      name: 'Average Volatility',
      value: avgVolatility,
      threshold: 0.3,
      signal: avgVolatility > 0.4 ? 'BEARISH' : avgVolatility < 0.2 ? 'BULLISH' : 'NEUTRAL',
    });

    // Determine regime
    let regime: RegimeState['current'];
    let confidence: number;

    if (avgMomentum > 0.08 && avgVolatility < 0.3) {
      regime = 'BULL';
      confidence = 0.8;
    } else if (avgMomentum < -0.08 && avgVolatility > 0.3) {
      regime = 'BEAR';
      confidence = 0.8;
    } else if (avgMomentum < -0.15 && avgVolatility > 0.5) {
      regime = 'CRISIS';
      confidence = 0.9;
    } else if (avgMomentum > 0.05 && this.volatilityHistory.length > 0 &&
               avgVolatility < this.volatilityHistory[this.volatilityHistory.length - 1]) {
      regime = 'RECOVERY';
      confidence = 0.6;
    } else {
      regime = 'SIDEWAYS';
      confidence = 0.5;
    }

    this.volatilityHistory.push(avgVolatility);
    if (this.volatilityHistory.length > 50) this.volatilityHistory.shift();

    return {
      current: regime,
      confidence,
      duration: 1, // Would track actual duration
      previousRegime: 'SIDEWAYS',
      changeDetected: false,
      indicators,
    };
  }
}

// Export singletons
export const correlationAnalyzer = new CorrelationAnalyzer();
export const portfolioOptimizer = new PortfolioOptimizer();
export const anomalyDetector = new AnomalyDetector();
