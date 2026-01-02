/**
 * Smart Execution Algorithms
 *
 * Institutional-grade execution algorithms:
 * - TWAP (Time-Weighted Average Price)
 * - VWAP (Volume-Weighted Average Price)
 * - Iceberg Orders (Hidden Liquidity)
 * - Implementation Shortfall Minimization
 * - Adaptive Execution
 * - Sniper Mode (Liquidity Detection)
 */

import { OrderBookData, Trade, Candle } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  totalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  algorithm: ExecutionAlgorithm;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startTime: number;
  endTime?: number;
  avgFillPrice: number;
  targetPrice: number;           // Benchmark price at start
  slippage: number;              // Actual vs target
  fills: ExecutionFill[];
  parameters: AlgorithmParameters;
}

export interface ExecutionFill {
  timestamp: number;
  quantity: number;
  price: number;
  slippage: number;
}

export type ExecutionAlgorithm =
  | 'TWAP'                       // Time-weighted
  | 'VWAP'                       // Volume-weighted
  | 'ICEBERG'                    // Hidden size
  | 'SNIPER'                     // Liquidity hunter
  | 'ADAPTIVE'                   // ML-based
  | 'POV'                        // Percentage of volume
  | 'IS'                         // Implementation shortfall
  | 'MARKET';                    // Immediate

export interface AlgorithmParameters {
  // TWAP parameters
  duration?: number;             // Total execution time (ms)
  interval?: number;             // Time between slices

  // VWAP parameters
  volumeProfile?: number[];      // Expected volume curve
  participationRate?: number;    // Max % of volume

  // Iceberg parameters
  displaySize?: number;          // Visible quantity
  variance?: number;             // Size randomization

  // Sniper parameters
  priceLimit?: number;           // Max adverse price
  liquidityThreshold?: number;   // Min liquidity to hit

  // Adaptive parameters
  urgency?: number;              // 0-1, affects aggression
  riskAversion?: number;         // 0-1, affects patience

  // General
  maxSlippage?: number;          // Max acceptable slippage
  startDelay?: number;           // Delay before starting
}

export interface ExecutionPlan {
  slices: ExecutionSlice[];
  estimatedDuration: number;
  estimatedSlippage: number;
  estimatedCost: number;
  risks: string[];
}

export interface ExecutionSlice {
  scheduledTime: number;
  quantity: number;
  priceLimit?: number;
  urgency: number;
}

export interface MarketConditions {
  spread: number;
  spreadPercent: number;
  bidDepth: number;
  askDepth: number;
  imbalance: number;
  volatility: number;
  recentVolume: number;
  avgVolume: number;
  toxicity: number;              // Informed flow indicator
}

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

export class SmartExecutionEngine {
  private activeOrders: Map<string, ExecutionOrder> = new Map();
  private executionHistory: ExecutionOrder[] = [];

  // ============================================================================
  // ORDER CREATION
  // ============================================================================

  /**
   * Create a new execution order
   */
  createOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    algorithm: ExecutionAlgorithm,
    currentPrice: number,
    parameters?: Partial<AlgorithmParameters>
  ): ExecutionOrder {
    const id = `EXE${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    const defaultParams = this.getDefaultParameters(algorithm, quantity);
    const mergedParams = { ...defaultParams, ...parameters };

    const order: ExecutionOrder = {
      id,
      symbol,
      side,
      totalQuantity: quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      algorithm,
      status: 'PENDING',
      startTime: Date.now() + (mergedParams.startDelay || 0),
      avgFillPrice: 0,
      targetPrice: currentPrice,
      slippage: 0,
      fills: [],
      parameters: mergedParams,
    };

    this.activeOrders.set(id, order);
    return order;
  }

  /**
   * Get default parameters for each algorithm
   */
  private getDefaultParameters(algorithm: ExecutionAlgorithm, quantity: number): AlgorithmParameters {
    switch (algorithm) {
      case 'TWAP':
        return {
          duration: 30 * 60 * 1000,      // 30 minutes
          interval: 60 * 1000,            // 1 minute slices
          maxSlippage: 0.002,             // 0.2%
        };

      case 'VWAP':
        return {
          duration: 60 * 60 * 1000,      // 1 hour
          participationRate: 0.1,         // 10% of volume
          maxSlippage: 0.003,
        };

      case 'ICEBERG':
        return {
          displaySize: Math.max(1, Math.floor(quantity / 5)),
          variance: 0.2,                  // 20% size variation
          maxSlippage: 0.001,
        };

      case 'SNIPER':
        return {
          liquidityThreshold: quantity * 2,
          priceLimit: 0.001,              // 0.1% adverse
          maxSlippage: 0.0005,
        };

      case 'ADAPTIVE':
        return {
          urgency: 0.5,
          riskAversion: 0.5,
          duration: 15 * 60 * 1000,
          maxSlippage: 0.002,
        };

      case 'POV':
        return {
          participationRate: 0.15,        // 15% of volume
          duration: 60 * 60 * 1000,
          maxSlippage: 0.003,
        };

      case 'IS':
        return {
          urgency: 0.7,
          riskAversion: 0.3,
          maxSlippage: 0.002,
        };

      case 'MARKET':
      default:
        return {
          maxSlippage: 0.005,
        };
    }
  }

  // ============================================================================
  // EXECUTION PLANNING
  // ============================================================================

  /**
   * Generate execution plan based on algorithm
   */
  generatePlan(
    order: ExecutionOrder,
    marketConditions: MarketConditions
  ): ExecutionPlan {
    switch (order.algorithm) {
      case 'TWAP':
        return this.planTWAP(order, marketConditions);
      case 'VWAP':
        return this.planVWAP(order, marketConditions);
      case 'ICEBERG':
        return this.planIceberg(order, marketConditions);
      case 'SNIPER':
        return this.planSniper(order, marketConditions);
      case 'ADAPTIVE':
        return this.planAdaptive(order, marketConditions);
      case 'POV':
        return this.planPOV(order, marketConditions);
      case 'IS':
        return this.planIS(order, marketConditions);
      default:
        return this.planMarket(order, marketConditions);
    }
  }

  /**
   * TWAP: Equal time slices
   */
  private planTWAP(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { duration, interval } = order.parameters;
    const numSlices = Math.ceil((duration || 1800000) / (interval || 60000));
    const sliceQuantity = Math.ceil(order.remainingQuantity / numSlices);

    const slices: ExecutionSlice[] = [];
    let scheduled = order.startTime;

    for (let i = 0; i < numSlices && slices.length * sliceQuantity < order.remainingQuantity; i++) {
      const remaining = order.remainingQuantity - (slices.length * sliceQuantity);
      slices.push({
        scheduledTime: scheduled,
        quantity: Math.min(sliceQuantity, remaining),
        urgency: 0.5,
      });
      scheduled += interval || 60000;
    }

    const estimatedSlippage = conditions.spreadPercent * 0.5;

    return {
      slices,
      estimatedDuration: duration || 1800000,
      estimatedSlippage,
      estimatedCost: order.targetPrice * order.totalQuantity * estimatedSlippage,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * VWAP: Volume-weighted slices
   */
  private planVWAP(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { duration, volumeProfile, participationRate } = order.parameters;

    // Default volume profile (U-shaped - higher at open/close)
    const profile = volumeProfile || [
      0.12, 0.08, 0.06, 0.05, 0.05, 0.05, 0.05, 0.06, 0.08, 0.10, 0.12, 0.18
    ];

    const slices: ExecutionSlice[] = [];
    const sliceDuration = (duration || 3600000) / profile.length;
    let scheduled = order.startTime;

    for (let i = 0; i < profile.length; i++) {
      const volumeWeight = profile[i];
      const expectedVolume = conditions.avgVolume * volumeWeight;
      const maxQuantity = expectedVolume * (participationRate || 0.1);
      const quantity = Math.min(
        Math.ceil(order.remainingQuantity * volumeWeight),
        maxQuantity
      );

      if (quantity > 0) {
        slices.push({
          scheduledTime: scheduled,
          quantity,
          urgency: volumeWeight > 0.1 ? 0.7 : 0.4,
        });
      }
      scheduled += sliceDuration;
    }

    const estimatedSlippage = conditions.spreadPercent * 0.3;

    return {
      slices,
      estimatedDuration: duration || 3600000,
      estimatedSlippage,
      estimatedCost: order.targetPrice * order.totalQuantity * estimatedSlippage,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * Iceberg: Hidden display size
   */
  private planIceberg(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { displaySize, variance } = order.parameters;
    const baseSize = displaySize || Math.ceil(order.totalQuantity / 5);

    const slices: ExecutionSlice[] = [];
    let remaining = order.remainingQuantity;
    let scheduled = order.startTime;

    while (remaining > 0) {
      // Randomize size to avoid detection
      const randomFactor = 1 + (Math.random() - 0.5) * (variance || 0.2) * 2;
      const quantity = Math.min(Math.ceil(baseSize * randomFactor), remaining);

      slices.push({
        scheduledTime: scheduled,
        quantity,
        urgency: 0.3,
      });

      remaining -= quantity;
      // Random delay between 5-30 seconds
      scheduled += 5000 + Math.random() * 25000;
    }

    return {
      slices,
      estimatedDuration: slices.length * 15000,
      estimatedSlippage: conditions.spreadPercent * 0.4,
      estimatedCost: order.targetPrice * order.totalQuantity * conditions.spreadPercent * 0.4,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * Sniper: Wait for liquidity
   */
  private planSniper(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { liquidityThreshold, priceLimit } = order.parameters;

    // Sniper waits for favorable conditions
    const targetLiquidity = liquidityThreshold || order.totalQuantity * 2;
    const currentLiquidity = order.side === 'BUY' ? conditions.askDepth : conditions.bidDepth;

    const slices: ExecutionSlice[] = [];

    if (currentLiquidity >= targetLiquidity) {
      // Sufficient liquidity - execute immediately
      slices.push({
        scheduledTime: order.startTime,
        quantity: order.remainingQuantity,
        priceLimit: order.targetPrice * (1 + (priceLimit || 0.001) * (order.side === 'BUY' ? 1 : -1)),
        urgency: 0.9,
      });
    } else {
      // Split into chunks, waiting for liquidity
      const chunks = Math.ceil(order.remainingQuantity / 3);
      for (let i = 0; i < 3; i++) {
        slices.push({
          scheduledTime: order.startTime + i * 60000, // 1 minute apart
          quantity: Math.min(chunks, order.remainingQuantity - i * chunks),
          priceLimit: order.targetPrice * (1 + (priceLimit || 0.001) * (order.side === 'BUY' ? 1 : -1)),
          urgency: 0.8,
        });
      }
    }

    return {
      slices,
      estimatedDuration: slices.length * 60000,
      estimatedSlippage: conditions.spreadPercent * 0.2,
      estimatedCost: order.targetPrice * order.totalQuantity * conditions.spreadPercent * 0.2,
      risks: ['Execution may be delayed waiting for liquidity', ...this.assessRisks(order, conditions)],
    };
  }

  /**
   * Adaptive: ML-based dynamic execution
   */
  private planAdaptive(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { urgency, riskAversion, duration } = order.parameters;

    // Adjust strategy based on market conditions
    let baseInterval: number;
    let aggression: number;

    if (conditions.toxicity > 0.6) {
      // High toxicity - be more passive
      baseInterval = 120000;
      aggression = 0.3;
    } else if (conditions.imbalance > 0.3) {
      // Favorable imbalance - be aggressive
      baseInterval = 30000;
      aggression = 0.8;
    } else {
      // Normal conditions - balanced
      baseInterval = 60000;
      aggression = urgency || 0.5;
    }

    // Risk aversion adjusts timing
    const adjustedInterval = baseInterval * (1 + (riskAversion || 0.5));

    const numSlices = Math.ceil((duration || 900000) / adjustedInterval);
    const slices: ExecutionSlice[] = [];
    let scheduled = order.startTime;

    for (let i = 0; i < numSlices; i++) {
      const remaining = order.remainingQuantity - slices.reduce((sum, s) => sum + s.quantity, 0);
      if (remaining <= 0) break;

      // Vary slice size based on conditions
      const volatilityFactor = conditions.volatility > 0.02 ? 0.7 : 1.2;
      const sliceSize = Math.ceil((order.remainingQuantity / numSlices) * volatilityFactor);

      slices.push({
        scheduledTime: scheduled,
        quantity: Math.min(sliceSize, remaining),
        urgency: aggression,
      });

      scheduled += adjustedInterval;
    }

    return {
      slices,
      estimatedDuration: duration || 900000,
      estimatedSlippage: conditions.spreadPercent * (1 - aggression * 0.5),
      estimatedCost: order.targetPrice * order.totalQuantity * conditions.spreadPercent * 0.5,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * POV: Percentage of Volume
   */
  private planPOV(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { participationRate, duration } = order.parameters;
    const maxParticipation = participationRate || 0.15;

    // Estimate total volume over duration
    const estimatedVolume = conditions.avgVolume * ((duration || 3600000) / 3600000);
    const targetVolume = estimatedVolume * maxParticipation;

    const numSlices = Math.ceil(targetVolume / (order.totalQuantity / 10));
    const sliceDuration = (duration || 3600000) / numSlices;

    const slices: ExecutionSlice[] = [];
    let scheduled = order.startTime;
    let remaining = order.remainingQuantity;

    for (let i = 0; i < numSlices && remaining > 0; i++) {
      const sliceVolume = (conditions.avgVolume / numSlices) * maxParticipation;
      const quantity = Math.min(Math.ceil(sliceVolume), remaining);

      slices.push({
        scheduledTime: scheduled,
        quantity,
        urgency: 0.5,
      });

      remaining -= quantity;
      scheduled += sliceDuration;
    }

    return {
      slices,
      estimatedDuration: duration || 3600000,
      estimatedSlippage: conditions.spreadPercent * 0.35,
      estimatedCost: order.targetPrice * order.totalQuantity * conditions.spreadPercent * 0.35,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * IS: Implementation Shortfall minimization
   */
  private planIS(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    const { urgency, riskAversion } = order.parameters;

    // IS balances market impact vs timing risk
    // High urgency = faster execution, accept more impact
    // High risk aversion = slower, minimize impact

    const impactCost = this.estimateMarketImpact(order, conditions);
    const timingRisk = conditions.volatility * order.totalQuantity * order.targetPrice;

    // Optimal trade rate balances these costs
    const optimalRate = Math.sqrt(timingRisk / impactCost);
    const adjustedRate = optimalRate * ((urgency || 0.7) / (riskAversion || 0.3));

    const executionTime = (order.totalQuantity / adjustedRate) * 60000;
    const numSlices = Math.max(3, Math.ceil(executionTime / 60000));

    const slices: ExecutionSlice[] = [];
    let scheduled = order.startTime;

    // Front-load execution slightly to reduce timing risk
    for (let i = 0; i < numSlices; i++) {
      const weight = 1 - (i / numSlices) * 0.3; // Decreasing weights
      const quantity = Math.ceil((order.remainingQuantity / numSlices) * weight);

      slices.push({
        scheduledTime: scheduled,
        quantity: Math.min(quantity, order.remainingQuantity - slices.reduce((s, sl) => s + sl.quantity, 0)),
        urgency: 0.7 - (i / numSlices) * 0.3,
      });

      scheduled += 60000;
    }

    return {
      slices,
      estimatedDuration: executionTime,
      estimatedSlippage: impactCost / (order.totalQuantity * order.targetPrice),
      estimatedCost: impactCost,
      risks: this.assessRisks(order, conditions),
    };
  }

  /**
   * Market: Immediate execution
   */
  private planMarket(order: ExecutionOrder, conditions: MarketConditions): ExecutionPlan {
    return {
      slices: [{
        scheduledTime: order.startTime,
        quantity: order.remainingQuantity,
        urgency: 1.0,
      }],
      estimatedDuration: 0,
      estimatedSlippage: conditions.spreadPercent,
      estimatedCost: order.targetPrice * order.totalQuantity * conditions.spreadPercent,
      risks: ['Full market impact', ...this.assessRisks(order, conditions)],
    };
  }

  // ============================================================================
  // MARKET ANALYSIS
  // ============================================================================

  /**
   * Analyze current market conditions
   */
  analyzeMarket(orderBook: OrderBookData, recentTrades: Trade[], candles: Candle[]): MarketConditions {
    // Spread analysis
    const bestBid = orderBook.bids[0]?.[0] || 0;
    const bestAsk = orderBook.asks[0]?.[0] || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? spread / midPrice : 0;

    // Depth analysis
    const bidDepth = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    const askDepth = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
    const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth);

    // Volume analysis
    const recentVolume = recentTrades.reduce((sum, t) => sum + t.quantity, 0);
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;

    // Volatility
    const returns = candles.slice(-20).map((c, i, arr) =>
      i > 0 ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0
    ).slice(1);
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );

    // Toxicity (informed flow indicator)
    const buyVolume = recentTrades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.quantity, 0);
    const sellVolume = recentTrades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.quantity, 0);
    const totalVolume = buyVolume + sellVolume;
    const toxicity = totalVolume > 0 ? Math.abs(buyVolume - sellVolume) / totalVolume : 0;

    return {
      spread,
      spreadPercent,
      bidDepth,
      askDepth,
      imbalance,
      volatility,
      recentVolume,
      avgVolume,
      toxicity,
    };
  }

  /**
   * Estimate market impact
   */
  private estimateMarketImpact(order: ExecutionOrder, conditions: MarketConditions): number {
    // Square root market impact model
    const depth = order.side === 'BUY' ? conditions.askDepth : conditions.bidDepth;
    const relativeSize = order.totalQuantity / depth;

    // Impact = sigma * sqrt(Q/V) * price
    const impact = conditions.volatility *
      Math.sqrt(relativeSize) *
      order.targetPrice *
      order.totalQuantity;

    return impact;
  }

  /**
   * Assess execution risks
   */
  private assessRisks(order: ExecutionOrder, conditions: MarketConditions): string[] {
    const risks: string[] = [];

    if (conditions.spreadPercent > 0.005) {
      risks.push('Wide spread may increase execution cost');
    }

    if (conditions.toxicity > 0.5) {
      risks.push('High informed flow detected - adverse selection risk');
    }

    if (conditions.volatility > 0.03) {
      risks.push('High volatility - timing risk elevated');
    }

    const depth = order.side === 'BUY' ? conditions.askDepth : conditions.bidDepth;
    if (order.totalQuantity > depth * 0.5) {
      risks.push('Order size exceeds 50% of visible depth');
    }

    if (conditions.imbalance * (order.side === 'BUY' ? -1 : 1) > 0.3) {
      risks.push('Order flow against current imbalance');
    }

    return risks;
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  /**
   * Process a fill
   */
  recordFill(orderId: string, quantity: number, price: number): void {
    const order = this.activeOrders.get(orderId);
    if (!order) return;

    const slippage = (price - order.targetPrice) / order.targetPrice *
      (order.side === 'BUY' ? 1 : -1);

    order.fills.push({
      timestamp: Date.now(),
      quantity,
      price,
      slippage,
    });

    order.filledQuantity += quantity;
    order.remainingQuantity -= quantity;

    // Update average fill price
    const totalCost = order.fills.reduce((sum, f) => sum + f.quantity * f.price, 0);
    order.avgFillPrice = totalCost / order.filledQuantity;

    // Update total slippage
    order.slippage = (order.avgFillPrice - order.targetPrice) / order.targetPrice *
      (order.side === 'BUY' ? 1 : -1);

    // Check completion
    if (order.remainingQuantity <= 0) {
      order.status = 'COMPLETED';
      order.endTime = Date.now();
      this.executionHistory.push(order);
      this.activeOrders.delete(orderId);
    }
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;

    order.status = 'CANCELLED';
    order.endTime = Date.now();
    this.executionHistory.push(order);
    this.activeOrders.delete(orderId);

    return true;
  }

  /**
   * Pause an order
   */
  pauseOrder(orderId: string): boolean {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;

    order.status = 'PAUSED';
    return true;
  }

  /**
   * Resume an order
   */
  resumeOrder(orderId: string): boolean {
    const order = this.activeOrders.get(orderId);
    if (!order || order.status !== 'PAUSED') return false;

    order.status = 'ACTIVE';
    return true;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getOrder(orderId: string): ExecutionOrder | undefined {
    return this.activeOrders.get(orderId);
  }

  getActiveOrders(): ExecutionOrder[] {
    return Array.from(this.activeOrders.values());
  }

  getExecutionHistory(): ExecutionOrder[] {
    return [...this.executionHistory];
  }

  /**
   * Get execution statistics
   */
  getStatistics(): {
    totalOrders: number;
    completedOrders: number;
    avgSlippage: number;
    avgExecutionTime: number;
    totalVolume: number;
    bestAlgorithm: string;
  } {
    const completed = this.executionHistory.filter(o => o.status === 'COMPLETED');

    const avgSlippage = completed.length > 0
      ? completed.reduce((sum, o) => sum + o.slippage, 0) / completed.length
      : 0;

    const avgExecutionTime = completed.length > 0
      ? completed.reduce((sum, o) => sum + ((o.endTime || 0) - o.startTime), 0) / completed.length
      : 0;

    const totalVolume = completed.reduce((sum, o) => sum + o.filledQuantity, 0);

    // Find best performing algorithm
    const algPerformance = new Map<string, number[]>();
    for (const order of completed) {
      if (!algPerformance.has(order.algorithm)) {
        algPerformance.set(order.algorithm, []);
      }
      algPerformance.get(order.algorithm)!.push(order.slippage);
    }

    let bestAlgorithm = 'TWAP';
    let bestAvgSlippage = Infinity;
    for (const [alg, slippages] of algPerformance) {
      const avg = slippages.reduce((a, b) => a + b, 0) / slippages.length;
      if (avg < bestAvgSlippage) {
        bestAvgSlippage = avg;
        bestAlgorithm = alg;
      }
    }

    return {
      totalOrders: this.executionHistory.length,
      completedOrders: completed.length,
      avgSlippage,
      avgExecutionTime,
      totalVolume,
      bestAlgorithm,
    };
  }
}

// Export singleton
export const smartExecution = new SmartExecutionEngine();
