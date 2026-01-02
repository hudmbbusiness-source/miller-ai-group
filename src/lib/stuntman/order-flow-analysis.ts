/**
 * Advanced Order Flow Analysis Engine
 *
 * Implements institutional-grade order flow analysis:
 * - VPIN (Volume-Synchronized Probability of Informed Trading)
 * - Market Microstructure Analysis
 * - Liquidity Detection & Sweep Analysis
 * - Delta Analysis (Buying vs Selling Pressure)
 * - Footprint Chart Data
 * - Cumulative Volume Delta
 * - Large Order Detection (Iceberg/Hidden)
 */

import { Trade, OrderBookData, Candle } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface VPINResult {
  vpin: number;                    // 0-1, probability of informed trading
  toxicity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  buyVolume: number;
  sellVolume: number;
  bucketSize: number;
  bucketsUsed: number;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  signal: 'SAFE' | 'CAUTION' | 'DANGER';
}

export interface DeltaAnalysis {
  cumulativeDelta: number;         // Running total of buy - sell volume
  deltaDivergence: boolean;        // Price/delta divergence detected
  deltaAcceleration: number;       // Rate of change of delta
  absorption: boolean;             // Large orders being absorbed
  exhaustion: boolean;             // Delta exhaustion signal
  imbalanceRatio: number;          // Buy/sell imbalance
}

export interface FootprintData {
  price: number;
  bidVolume: number;
  askVolume: number;
  delta: number;
  trades: number;
  poc: boolean;                    // Point of Control
  valueArea: 'HIGH' | 'LOW' | 'NONE';
}

export interface LiquidityAnalysis {
  bidLiquidity: LiquidityLevel[];
  askLiquidity: LiquidityLevel[];
  liquidityVoid: PriceRange[];     // Areas with no liquidity
  sweepTargets: number[];          // Likely sweep targets
  stackedBids: number[];           // Stacked bid walls
  stackedAsks: number[];           // Stacked ask walls
  hiddenLiquidity: number;         // Estimated hidden orders
}

export interface LiquidityLevel {
  price: number;
  size: number;
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'WALL';
  refreshing: boolean;             // Order is being refreshed (iceberg)
}

export interface PriceRange {
  high: number;
  low: number;
  size: number;
}

export interface OrderFlowSignal {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  strength: number;                // 0-100
  confidence: number;              // 0-100
  reasons: string[];
  vpin: VPINResult;
  delta: DeltaAnalysis;
  liquidity: LiquidityAnalysis;
  timestamp: number;
}

export interface LargeOrderDetection {
  detected: boolean;
  side: 'BUY' | 'SELL';
  estimatedSize: number;
  averagePrice: number;
  isIceberg: boolean;
  aggressiveness: number;          // How aggressive the execution is
  impact: number;                  // Price impact percentage
}

// ============================================================================
// VPIN CALCULATION
// ============================================================================

export class VPINCalculator {
  private buckets: { buyVolume: number; sellVolume: number }[] = [];
  private bucketSize: number;
  private numBuckets: number;
  private currentBucket: { buyVolume: number; sellVolume: number };
  private vpinHistory: number[] = [];

  constructor(bucketSize: number = 50000, numBuckets: number = 50) {
    this.bucketSize = bucketSize;
    this.numBuckets = numBuckets;
    this.currentBucket = { buyVolume: 0, sellVolume: 0 };
  }

  /**
   * Classify trade as buy or sell using tick rule
   */
  private classifyTrade(trade: Trade, prevPrice: number): 'BUY' | 'SELL' {
    if (trade.price > prevPrice) return 'BUY';
    if (trade.price < prevPrice) return 'SELL';
    // If price unchanged, use trade side if available
    return trade.side === 'buy' ? 'BUY' : 'SELL';
  }

  /**
   * Add trades to VPIN calculation
   */
  addTrades(trades: Trade[]): VPINResult {
    let prevPrice = trades[0]?.price || 0;

    for (const trade of trades) {
      const side = this.classifyTrade(trade, prevPrice);
      const volume = trade.quantity * trade.price;

      if (side === 'BUY') {
        this.currentBucket.buyVolume += volume;
      } else {
        this.currentBucket.sellVolume += volume;
      }

      // Check if bucket is full
      const bucketTotal = this.currentBucket.buyVolume + this.currentBucket.sellVolume;
      if (bucketTotal >= this.bucketSize) {
        this.buckets.push({ ...this.currentBucket });
        this.currentBucket = { buyVolume: 0, sellVolume: 0 };

        // Keep only numBuckets
        if (this.buckets.length > this.numBuckets) {
          this.buckets.shift();
        }
      }

      prevPrice = trade.price;
    }

    return this.calculate();
  }

  /**
   * Calculate VPIN from trade data
   */
  calculateFromTrades(trades: Trade[]): VPINResult {
    // Reset and calculate fresh
    this.buckets = [];
    this.currentBucket = { buyVolume: 0, sellVolume: 0 };
    return this.addTrades(trades);
  }

  /**
   * Calculate current VPIN
   */
  calculate(): VPINResult {
    if (this.buckets.length < 10) {
      return {
        vpin: 0,
        toxicity: 'LOW',
        buyVolume: 0,
        sellVolume: 0,
        bucketSize: this.bucketSize,
        bucketsUsed: this.buckets.length,
        trend: 'STABLE',
        signal: 'SAFE',
      };
    }

    let totalImbalance = 0;
    let totalVolume = 0;
    let totalBuy = 0;
    let totalSell = 0;

    for (const bucket of this.buckets) {
      const imbalance = Math.abs(bucket.buyVolume - bucket.sellVolume);
      totalImbalance += imbalance;
      totalVolume += bucket.buyVolume + bucket.sellVolume;
      totalBuy += bucket.buyVolume;
      totalSell += bucket.sellVolume;
    }

    const vpin = totalVolume > 0 ? totalImbalance / totalVolume : 0;

    // Track VPIN history for trend
    this.vpinHistory.push(vpin);
    if (this.vpinHistory.length > 20) {
      this.vpinHistory.shift();
    }

    // Determine trend
    let trend: VPINResult['trend'] = 'STABLE';
    if (this.vpinHistory.length >= 5) {
      const recent = this.vpinHistory.slice(-5);
      const older = this.vpinHistory.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0
        ? older.reduce((a, b) => a + b, 0) / older.length
        : recentAvg;

      if (recentAvg > olderAvg * 1.1) trend = 'RISING';
      else if (recentAvg < olderAvg * 0.9) trend = 'FALLING';
    }

    // Determine toxicity level
    let toxicity: VPINResult['toxicity'];
    let signal: VPINResult['signal'];

    if (vpin < 0.3) {
      toxicity = 'LOW';
      signal = 'SAFE';
    } else if (vpin < 0.5) {
      toxicity = 'MEDIUM';
      signal = 'SAFE';
    } else if (vpin < 0.7) {
      toxicity = 'HIGH';
      signal = 'CAUTION';
    } else {
      toxicity = 'EXTREME';
      signal = 'DANGER';
    }

    // Rising VPIN increases danger
    if (trend === 'RISING' && toxicity !== 'LOW') {
      signal = signal === 'SAFE' ? 'CAUTION' : 'DANGER';
    }

    return {
      vpin,
      toxicity,
      buyVolume: totalBuy,
      sellVolume: totalSell,
      bucketSize: this.bucketSize,
      bucketsUsed: this.buckets.length,
      trend,
      signal,
    };
  }
}

// ============================================================================
// DELTA ANALYSIS
// ============================================================================

export class DeltaAnalyzer {
  private deltaHistory: number[] = [];
  private priceHistory: number[] = [];

  /**
   * Calculate cumulative delta from trades
   */
  calculateDelta(trades: Trade[]): DeltaAnalysis {
    let cumulativeDelta = 0;
    let prevPrice = trades[0]?.price || 0;

    for (const trade of trades) {
      const delta = trade.side === 'buy'
        ? trade.quantity
        : -trade.quantity;
      cumulativeDelta += delta;
      prevPrice = trade.price;
    }

    // Update history
    this.deltaHistory.push(cumulativeDelta);
    this.priceHistory.push(prevPrice);

    if (this.deltaHistory.length > 100) {
      this.deltaHistory.shift();
      this.priceHistory.shift();
    }

    // Calculate delta acceleration
    const deltaAcceleration = this.deltaHistory.length >= 3
      ? (this.deltaHistory[this.deltaHistory.length - 1] -
         this.deltaHistory[this.deltaHistory.length - 3]) / 3
      : 0;

    // Detect divergence (price going one way, delta going other)
    const deltaDivergence = this.detectDivergence();

    // Detect absorption (large volume but no price movement)
    const absorption = this.detectAbsorption(trades);

    // Detect exhaustion (delta slowing while price extends)
    const exhaustion = this.detectExhaustion();

    // Calculate imbalance ratio
    const buyVolume = trades.filter(t => t.side === 'buy')
      .reduce((sum, t) => sum + t.quantity, 0);
    const sellVolume = trades.filter(t => t.side === 'sell')
      .reduce((sum, t) => sum + t.quantity, 0);
    const totalVolume = buyVolume + sellVolume;
    const imbalanceRatio = totalVolume > 0
      ? (buyVolume - sellVolume) / totalVolume
      : 0;

    return {
      cumulativeDelta,
      deltaDivergence,
      deltaAcceleration,
      absorption,
      exhaustion,
      imbalanceRatio,
    };
  }

  private detectDivergence(): boolean {
    if (this.deltaHistory.length < 10 || this.priceHistory.length < 10) {
      return false;
    }

    const recentDelta = this.deltaHistory.slice(-5);
    const olderDelta = this.deltaHistory.slice(-10, -5);
    const recentPrice = this.priceHistory.slice(-5);
    const olderPrice = this.priceHistory.slice(-10, -5);

    const deltaChange = recentDelta[recentDelta.length - 1] - olderDelta[0];
    const priceChange = recentPrice[recentPrice.length - 1] - olderPrice[0];

    // Divergence: delta and price moving in opposite directions
    return (deltaChange > 0 && priceChange < 0) ||
           (deltaChange < 0 && priceChange > 0);
  }

  private detectAbsorption(trades: Trade[]): boolean {
    if (trades.length < 20) return false;

    // High volume but small price range = absorption
    const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
    const prices = trades.map(t => t.price);
    const priceRange = Math.max(...prices) - Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceRangePercent = priceRange / avgPrice;

    // High volume (above average) but tight range (< 0.1%)
    const avgTradeSize = totalVolume / trades.length;
    return avgTradeSize > 1 && priceRangePercent < 0.001;
  }

  private detectExhaustion(): boolean {
    if (this.deltaHistory.length < 10 || this.priceHistory.length < 10) {
      return false;
    }

    // Delta slowing (acceleration near zero) while price still moving
    const recentDelta = this.deltaHistory.slice(-5);
    const deltaChange = Math.abs(recentDelta[recentDelta.length - 1] - recentDelta[0]);

    const recentPrice = this.priceHistory.slice(-5);
    const priceChange = Math.abs(recentPrice[recentPrice.length - 1] - recentPrice[0]);
    const avgPrice = recentPrice.reduce((a, b) => a + b, 0) / recentPrice.length;
    const priceChangePercent = priceChange / avgPrice;

    // Price still moving (> 0.2%) but delta slowing
    return priceChangePercent > 0.002 && deltaChange < 10;
  }
}

// ============================================================================
// FOOTPRINT CHART DATA
// ============================================================================

export function generateFootprintData(
  trades: Trade[],
  candles: Candle[],
  priceIncrement: number = 0.25
): FootprintData[] {
  if (trades.length === 0) return [];

  // Group trades by price level
  const levels = new Map<number, FootprintData>();

  for (const trade of trades) {
    // Round to price increment
    const level = Math.round(trade.price / priceIncrement) * priceIncrement;

    if (!levels.has(level)) {
      levels.set(level, {
        price: level,
        bidVolume: 0,
        askVolume: 0,
        delta: 0,
        trades: 0,
        poc: false,
        valueArea: 'NONE',
      });
    }

    const data = levels.get(level)!;
    data.trades++;

    if (trade.side === 'buy') {
      data.askVolume += trade.quantity;
      data.delta += trade.quantity;
    } else {
      data.bidVolume += trade.quantity;
      data.delta -= trade.quantity;
    }
  }

  // Convert to array and sort by price
  const footprint = Array.from(levels.values()).sort((a, b) => b.price - a.price);

  // Calculate POC (Point of Control) - highest volume level
  const totalVolumes = footprint.map(f => f.bidVolume + f.askVolume);
  const maxVolume = Math.max(...totalVolumes);
  const pocIndex = totalVolumes.indexOf(maxVolume);
  if (pocIndex >= 0) {
    footprint[pocIndex].poc = true;
  }

  // Calculate Value Area (70% of volume)
  const totalVolume = totalVolumes.reduce((a, b) => a + b, 0);
  const valueAreaTarget = totalVolume * 0.7;

  // Start from POC and expand
  let valueAreaVolume = totalVolumes[pocIndex] || 0;
  let upper = pocIndex - 1;
  let lower = pocIndex + 1;

  while (valueAreaVolume < valueAreaTarget && (upper >= 0 || lower < footprint.length)) {
    const upperVol = upper >= 0 ? totalVolumes[upper] : 0;
    const lowerVol = lower < footprint.length ? totalVolumes[lower] : 0;

    if (upperVol >= lowerVol && upper >= 0) {
      footprint[upper].valueArea = 'HIGH';
      valueAreaVolume += upperVol;
      upper--;
    } else if (lower < footprint.length) {
      footprint[lower].valueArea = 'LOW';
      valueAreaVolume += lowerVol;
      lower++;
    }
  }

  return footprint;
}

// ============================================================================
// LIQUIDITY ANALYSIS
// ============================================================================

export function analyzeLiquidity(
  orderBook: OrderBookData,
  recentTrades: Trade[]
): LiquidityAnalysis {
  const bidLiquidity: LiquidityLevel[] = [];
  const askLiquidity: LiquidityLevel[] = [];

  // Calculate average size for significance
  const allSizes = [
    ...orderBook.bids.map(([, size]) => size),
    ...orderBook.asks.map(([, size]) => size),
  ];
  const avgSize = allSizes.length > 0
    ? allSizes.reduce((a, b) => a + b, 0) / allSizes.length
    : 1;

  // Analyze bids
  for (const [price, size] of orderBook.bids) {
    const significance = getSignificance(size, avgSize);
    const refreshing = detectRefreshing(price, recentTrades, 'bid');

    bidLiquidity.push({ price, size, significance, refreshing });
  }

  // Analyze asks
  for (const [price, size] of orderBook.asks) {
    const significance = getSignificance(size, avgSize);
    const refreshing = detectRefreshing(price, recentTrades, 'ask');

    askLiquidity.push({ price, size, significance, refreshing });
  }

  // Find liquidity voids (gaps in orderbook)
  const liquidityVoid = findLiquidityVoids(orderBook);

  // Find sweep targets (clustered stops/liquidity)
  const sweepTargets = findSweepTargets(orderBook, recentTrades);

  // Find stacked walls
  const stackedBids = findStackedLevels(orderBook.bids, avgSize);
  const stackedAsks = findStackedLevels(orderBook.asks, avgSize);

  // Estimate hidden liquidity
  const hiddenLiquidity = estimateHiddenLiquidity(recentTrades, orderBook);

  return {
    bidLiquidity,
    askLiquidity,
    liquidityVoid,
    sweepTargets,
    stackedBids,
    stackedAsks,
    hiddenLiquidity,
  };
}

function getSignificance(size: number, avgSize: number): LiquidityLevel['significance'] {
  if (size > avgSize * 10) return 'WALL';
  if (size > avgSize * 5) return 'HIGH';
  if (size > avgSize * 2) return 'MEDIUM';
  return 'LOW';
}

function detectRefreshing(price: number, trades: Trade[], side: 'bid' | 'ask'): boolean {
  // Iceberg detection: multiple trades at same price with volume > visible
  const tradesAtPrice = trades.filter(t =>
    Math.abs(t.price - price) < 0.01 &&
    (side === 'bid' ? t.side === 'sell' : t.side === 'buy')
  );

  // If many trades at same price, likely iceberg
  return tradesAtPrice.length > 5;
}

function findLiquidityVoids(orderBook: OrderBookData): PriceRange[] {
  const voids: PriceRange[] = [];

  // Check bid side
  for (let i = 1; i < orderBook.bids.length; i++) {
    const gap = orderBook.bids[i - 1][0] - orderBook.bids[i][0];
    const avgGap = (orderBook.bids[0][0] - orderBook.bids[Math.min(10, orderBook.bids.length - 1)][0]) / 10;

    if (gap > avgGap * 3) {
      voids.push({
        high: orderBook.bids[i - 1][0],
        low: orderBook.bids[i][0],
        size: gap,
      });
    }
  }

  // Check ask side
  for (let i = 1; i < orderBook.asks.length; i++) {
    const gap = orderBook.asks[i][0] - orderBook.asks[i - 1][0];
    const avgGap = (orderBook.asks[Math.min(10, orderBook.asks.length - 1)][0] - orderBook.asks[0][0]) / 10;

    if (gap > avgGap * 3) {
      voids.push({
        high: orderBook.asks[i][0],
        low: orderBook.asks[i - 1][0],
        size: gap,
      });
    }
  }

  return voids;
}

function findSweepTargets(orderBook: OrderBookData, trades: Trade[]): number[] {
  const targets: number[] = [];

  // Find price levels with high concentration of stops (usually round numbers or recent highs/lows)
  const prices = trades.map(t => t.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);

  // Round number targets
  const priceRange = high - low;
  const increment = priceRange > 100 ? 10 : priceRange > 10 ? 1 : 0.1;

  for (let p = Math.floor(low / increment) * increment; p <= Math.ceil(high / increment) * increment; p += increment) {
    // Check if there's significant liquidity just beyond
    const nearbyBids = orderBook.bids.filter(([price]) => Math.abs(price - p) < increment);
    const nearbyAsks = orderBook.asks.filter(([price]) => Math.abs(price - p) < increment);

    const bidVolume = nearbyBids.reduce((sum, [, size]) => sum + size, 0);
    const askVolume = nearbyAsks.reduce((sum, [, size]) => sum + size, 0);

    if (bidVolume > 0 || askVolume > 0) {
      targets.push(p);
    }
  }

  return targets;
}

function findStackedLevels(levels: [number, number][], avgSize: number): number[] {
  const stacked: number[] = [];

  // Find consecutive large orders
  for (let i = 0; i < levels.length - 2; i++) {
    if (levels[i][1] > avgSize * 2 &&
        levels[i + 1][1] > avgSize * 2 &&
        levels[i + 2][1] > avgSize * 2) {
      stacked.push(levels[i][0], levels[i + 1][0], levels[i + 2][0]);
      i += 2; // Skip processed levels
    }
  }

  return [...new Set(stacked)];
}

function estimateHiddenLiquidity(trades: Trade[], orderBook: OrderBookData): number {
  // Compare trade volume to visible book depth
  const tradedVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  const visibleBidVolume = orderBook.bids.slice(0, 10).reduce((sum, [, size]) => sum + size, 0);
  const visibleAskVolume = orderBook.asks.slice(0, 10).reduce((sum, [, size]) => sum + size, 0);
  const visibleVolume = visibleBidVolume + visibleAskVolume;

  // If traded volume > visible, there's hidden liquidity
  return Math.max(0, tradedVolume - visibleVolume);
}

// ============================================================================
// LARGE ORDER DETECTION
// ============================================================================

export function detectLargeOrders(
  trades: Trade[],
  orderBook: OrderBookData
): LargeOrderDetection {
  if (trades.length < 10) {
    return {
      detected: false,
      side: 'BUY',
      estimatedSize: 0,
      averagePrice: 0,
      isIceberg: false,
      aggressiveness: 0,
      impact: 0,
    };
  }

  // Calculate baseline metrics
  const avgTradeSize = trades.reduce((sum, t) => sum + t.quantity, 0) / trades.length;
  const prices = trades.map(t => t.price);
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];

  // Detect large order activity
  const largeTrades = trades.filter(t => t.quantity > avgTradeSize * 3);

  if (largeTrades.length < 3) {
    return {
      detected: false,
      side: 'BUY',
      estimatedSize: 0,
      averagePrice: 0,
      isIceberg: false,
      aggressiveness: 0,
      impact: 0,
    };
  }

  // Determine dominant side
  const buyVolume = largeTrades.filter(t => t.side === 'buy')
    .reduce((sum, t) => sum + t.quantity, 0);
  const sellVolume = largeTrades.filter(t => t.side === 'sell')
    .reduce((sum, t) => sum + t.quantity, 0);
  const side: 'BUY' | 'SELL' = buyVolume > sellVolume ? 'BUY' : 'SELL';

  const dominantTrades = largeTrades.filter(t =>
    (side === 'BUY' && t.side === 'buy') ||
    (side === 'SELL' && t.side === 'sell')
  );

  // Calculate metrics
  const estimatedSize = dominantTrades.reduce((sum, t) => sum + t.quantity, 0);
  const averagePrice = dominantTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / estimatedSize;

  // Iceberg detection: consistent size trades at similar prices
  const sizes = dominantTrades.map(t => t.quantity);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
  const isIceberg = sizeVariance < avgSize * 0.5; // Low variance = likely iceberg

  // Aggressiveness: how much price moved per unit volume
  const priceMove = Math.abs(endPrice - startPrice);
  const totalVolume = trades.reduce((sum, t) => sum + t.quantity, 0);
  const aggressiveness = totalVolume > 0 ? (priceMove / startPrice) / totalVolume * 10000 : 0;

  // Price impact
  const impact = (priceMove / startPrice) * 100;

  return {
    detected: true,
    side,
    estimatedSize,
    averagePrice,
    isIceberg,
    aggressiveness: Math.min(aggressiveness, 1),
    impact,
  };
}

// ============================================================================
// MAIN ORDER FLOW ENGINE
// ============================================================================

export class OrderFlowEngine {
  private vpinCalculator: VPINCalculator;
  private deltaAnalyzer: DeltaAnalyzer;
  private tradeBuffer: Trade[] = [];
  private maxBufferSize = 1000;

  constructor(vpinBucketSize: number = 50000, vpinBuckets: number = 50) {
    this.vpinCalculator = new VPINCalculator(vpinBucketSize, vpinBuckets);
    this.deltaAnalyzer = new DeltaAnalyzer();
  }

  /**
   * Add new trades to the engine
   */
  addTrades(trades: Trade[]): void {
    this.tradeBuffer.push(...trades);
    if (this.tradeBuffer.length > this.maxBufferSize) {
      this.tradeBuffer = this.tradeBuffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Generate comprehensive order flow signal
   */
  generateSignal(orderBook: OrderBookData, candles: Candle[]): OrderFlowSignal {
    const vpin = this.vpinCalculator.addTrades(this.tradeBuffer);
    const delta = this.deltaAnalyzer.calculateDelta(this.tradeBuffer);
    const liquidity = analyzeLiquidity(orderBook, this.tradeBuffer);
    const largeOrder = detectLargeOrders(this.tradeBuffer, orderBook);

    // Calculate direction and strength
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 50;
    const reasons: string[] = [];

    // VPIN analysis
    if (vpin.signal === 'DANGER') {
      strength -= 20;
      reasons.push('High VPIN indicates informed trading');
    }

    // Delta analysis
    if (delta.imbalanceRatio > 0.3) {
      direction = 'LONG';
      strength += delta.imbalanceRatio * 30;
      reasons.push('Strong buying pressure detected');
    } else if (delta.imbalanceRatio < -0.3) {
      direction = 'SHORT';
      strength += Math.abs(delta.imbalanceRatio) * 30;
      reasons.push('Strong selling pressure detected');
    }

    // Divergence
    if (delta.deltaDivergence) {
      strength -= 15;
      reasons.push('Price/delta divergence - potential reversal');
    }

    // Absorption
    if (delta.absorption) {
      reasons.push('Large orders being absorbed - potential reversal');
      // Flip direction expectation
      if (direction === 'LONG') {
        strength -= 20;
      } else if (direction === 'SHORT') {
        strength -= 20;
      }
    }

    // Exhaustion
    if (delta.exhaustion) {
      strength -= 10;
      reasons.push('Delta exhaustion detected');
    }

    // Large order detection
    if (largeOrder.detected) {
      if (largeOrder.side === 'BUY') {
        if (direction !== 'SHORT') direction = 'LONG';
        strength += 15;
        reasons.push(`Large buyer detected (${largeOrder.estimatedSize.toFixed(2)} size)`);
      } else {
        if (direction !== 'LONG') direction = 'SHORT';
        strength += 15;
        reasons.push(`Large seller detected (${largeOrder.estimatedSize.toFixed(2)} size)`);
      }

      if (largeOrder.isIceberg) {
        reasons.push('Iceberg order pattern detected');
        strength += 10;
      }
    }

    // Liquidity imbalance
    const bidLiqTotal = liquidity.bidLiquidity.reduce((sum, l) => sum + l.size, 0);
    const askLiqTotal = liquidity.askLiquidity.reduce((sum, l) => sum + l.size, 0);
    const liqImbalance = (bidLiqTotal - askLiqTotal) / (bidLiqTotal + askLiqTotal);

    if (Math.abs(liqImbalance) > 0.3) {
      if (liqImbalance > 0) {
        reasons.push('Heavy bid-side liquidity');
      } else {
        reasons.push('Heavy ask-side liquidity');
      }
    }

    // Calculate confidence
    const confidence = Math.min(100, Math.max(0,
      50 +
      (reasons.length * 5) +
      (vpin.bucketsUsed > 30 ? 10 : 0) +
      (this.tradeBuffer.length > 500 ? 10 : 0)
    ));

    return {
      direction,
      strength: Math.min(100, Math.max(0, strength)),
      confidence,
      reasons,
      vpin,
      delta,
      liquidity,
      timestamp: Date.now(),
    };
  }

  /**
   * Get footprint data for visualization
   */
  getFootprint(candles: Candle[], priceIncrement: number = 0.25): FootprintData[] {
    return generateFootprintData(this.tradeBuffer, candles, priceIncrement);
  }

  /**
   * Clear trade buffer
   */
  clearBuffer(): void {
    this.tradeBuffer = [];
  }

  /**
   * Get current VPIN
   */
  getVPIN(): VPINResult {
    return this.vpinCalculator.calculate();
  }

  /**
   * Get trade buffer size
   */
  getBufferSize(): number {
    return this.tradeBuffer.length;
  }
}

// Export singleton instance
export const orderFlowEngine = new OrderFlowEngine();
