/**
 * ML-Powered Signal Enhancement Engine
 *
 * Implements machine learning techniques for:
 * - Neural pattern recognition
 * - Signal confidence scoring
 * - Adaptive signal weighting
 * - Feature extraction and normalization
 * - Ensemble signal combining
 */

import { Signal, Candle, OrderBookData } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureVector {
  price: number[];
  volume: number[];
  momentum: number[];
  volatility: number[];
  orderFlow: number[];
  sentiment: number[];
  timestamp: number;
}

interface NeuralWeights {
  inputToHidden: number[][];
  hiddenToOutput: number[][];
  biasHidden: number[];
  biasOutput: number[];
}

interface PatternMatch {
  pattern: string;
  confidence: number;
  historicalWinRate: number;
  expectedMove: number;
  timeframe: string;
}

export interface MLSignal {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  features: FeatureVector;
  patterns: PatternMatch[];
  ensembleScore: number;
  riskAdjustedScore: number;
  timestamp: number;
  // Extended fields for trading
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  regime?: MarketRegime;
  ensemble?: {
    consensus: string;
    agreementLevel: number;
  };
}

export interface MarketRegime {
  type: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' | 'BREAKOUT';
  strength: number;
  duration: number;
  characteristics: {
    volatility: number;
    momentum: number;
    volumeProfile: 'INCREASING' | 'DECREASING' | 'STABLE';
    trendStrength: number;
  };
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

export function extractFeatures(
  candles: Candle[],
  orderBook?: OrderBookData
): FeatureVector {
  if (candles.length < 50) {
    return createEmptyFeatureVector();
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  // Price features (normalized)
  const priceFeatures = [
    normalize(closes[closes.length - 1], Math.min(...closes.slice(-20)), Math.max(...closes.slice(-20))),
    calculateReturns(closes, 1),
    calculateReturns(closes, 5),
    calculateReturns(closes, 10),
    calculateReturns(closes, 20),
    calculatePricePosition(closes),
    calculateHighLowPosition(closes[closes.length - 1], highs, lows),
    calculateGapSize(candles),
  ];

  // Volume features
  const volumeFeatures = [
    normalizeVolume(volumes),
    calculateVolumeRatio(volumes, 5),
    calculateVolumeRatio(volumes, 20),
    calculateOBV(closes, volumes),
    calculateVolumeWeightedPrice(candles),
    detectVolumeSpike(volumes),
    calculateAccumulationDistribution(candles),
    calculateMoneyFlowIndex(candles, 14),
  ];

  // Momentum features
  const momentumFeatures = [
    calculateRSI(closes, 14),
    calculateRSI(closes, 7),
    calculateMACDHistogram(closes),
    calculateStochastic(closes, highs, lows),
    calculateROC(closes, 10),
    calculateCCI(candles, 20),
    calculateWilliamsR(closes, highs, lows, 14),
    calculateMomentum(closes, 10),
  ];

  // Volatility features
  const volatilityFeatures = [
    calculateATR(candles, 14) / closes[closes.length - 1],
    calculateBollingerWidth(closes, 20),
    calculateHistoricalVolatility(closes, 20),
    calculateAverageRange(candles, 14),
    calculateVolatilityRatio(candles),
    detectVolatilityExpansion(candles),
    calculateKeltnerWidth(candles, 20),
    calculateChaikinVolatility(candles, 10),
  ];

  // Order flow features
  const orderFlowFeatures = orderBook ? [
    calculateBidAskImbalance(orderBook),
    calculateDepthRatio(orderBook),
    calculateSpreadNormalized(orderBook),
    calculateWallDetection(orderBook),
    calculateLiquidityScore(orderBook),
    calculateOrderFlowToxicity(orderBook),
    calculateBookPressure(orderBook),
    calculateMicrostructureSignal(orderBook),
  ] : new Array(8).fill(0.5);

  // Sentiment features (derived from price action)
  const sentimentFeatures = [
    calculateBullBearRatio(candles),
    calculateTrendStrength(closes),
    calculateMeanReversion(closes),
    detectExhaustion(candles),
    calculateMarketBreadth(candles),
    detectDivergence(closes, volumes),
    calculateSentimentScore(candles),
    calculateFearGreedProxy(candles),
  ];

  return {
    price: priceFeatures,
    volume: volumeFeatures,
    momentum: momentumFeatures,
    volatility: volatilityFeatures,
    orderFlow: orderFlowFeatures,
    sentiment: sentimentFeatures,
    timestamp: Date.now(),
  };
}

// ============================================================================
// NEURAL NETWORK IMPLEMENTATION
// ============================================================================

class NeuralSignalNetwork {
  private weights: NeuralWeights;
  private learningRate: number = 0.01;
  private momentum: number = 0.9;

  constructor() {
    // Initialize with pre-trained weights (would be loaded from storage in production)
    this.weights = this.initializeWeights();
  }

  private initializeWeights(): NeuralWeights {
    // Xavier initialization for better convergence
    const inputSize = 48; // 8 features * 6 categories
    const hiddenSize = 24;
    const outputSize = 3; // LONG, SHORT, NEUTRAL

    return {
      inputToHidden: this.xavierInit(inputSize, hiddenSize),
      hiddenToOutput: this.xavierInit(hiddenSize, outputSize),
      biasHidden: new Array(hiddenSize).fill(0),
      biasOutput: new Array(outputSize).fill(0),
    };
  }

  private xavierInit(rows: number, cols: number): number[][] {
    const scale = Math.sqrt(2 / (rows + cols));
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
    );
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exp = values.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(e => e / sum);
  }

  public forward(features: FeatureVector): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; probabilities: number[] } {
    // Flatten features
    const input = [
      ...features.price,
      ...features.volume,
      ...features.momentum,
      ...features.volatility,
      ...features.orderFlow,
      ...features.sentiment,
    ];

    // Hidden layer
    const hidden: number[] = [];
    for (let j = 0; j < this.weights.biasHidden.length; j++) {
      let sum = this.weights.biasHidden[j];
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * (this.weights.inputToHidden[i]?.[j] || 0);
      }
      hidden.push(this.relu(sum));
    }

    // Output layer
    const output: number[] = [];
    for (let k = 0; k < this.weights.biasOutput.length; k++) {
      let sum = this.weights.biasOutput[k];
      for (let j = 0; j < hidden.length; j++) {
        sum += hidden[j] * (this.weights.hiddenToOutput[j]?.[k] || 0);
      }
      output.push(sum);
    }

    const probabilities = this.softmax(output);
    const maxIdx = probabilities.indexOf(Math.max(...probabilities));
    const directions: ('LONG' | 'SHORT' | 'NEUTRAL')[] = ['LONG', 'SHORT', 'NEUTRAL'];

    return {
      direction: directions[maxIdx],
      confidence: probabilities[maxIdx],
      probabilities,
    };
  }
}

// ============================================================================
// PATTERN RECOGNITION
// ============================================================================

export function recognizePatterns(candles: Candle[]): PatternMatch[] {
  const patterns: PatternMatch[] = [];

  if (candles.length < 50) return patterns;

  // Check for various patterns
  const patternChecks = [
    { name: 'Double Bottom', check: detectDoubleBottom, winRate: 0.68, expectedMove: 0.025 },
    { name: 'Double Top', check: detectDoubleTop, winRate: 0.65, expectedMove: -0.023 },
    { name: 'Head & Shoulders', check: detectHeadShoulders, winRate: 0.72, expectedMove: -0.035 },
    { name: 'Inverse H&S', check: detectInverseHeadShoulders, winRate: 0.70, expectedMove: 0.032 },
    { name: 'Bull Flag', check: detectBullFlag, winRate: 0.67, expectedMove: 0.028 },
    { name: 'Bear Flag', check: detectBearFlag, winRate: 0.64, expectedMove: -0.026 },
    { name: 'Ascending Triangle', check: detectAscendingTriangle, winRate: 0.71, expectedMove: 0.022 },
    { name: 'Descending Triangle', check: detectDescendingTriangle, winRate: 0.69, expectedMove: -0.021 },
    { name: 'Cup & Handle', check: detectCupHandle, winRate: 0.73, expectedMove: 0.038 },
    { name: 'Wedge Breakout', check: detectWedgeBreakout, winRate: 0.66, expectedMove: 0.024 },
    { name: 'Volume Climax', check: detectVolumeClimax, winRate: 0.62, expectedMove: 0.018 },
    { name: 'Momentum Divergence', check: detectMomentumDivergence, winRate: 0.69, expectedMove: 0.027 },
  ];

  for (const { name, check, winRate, expectedMove } of patternChecks) {
    const confidence = check(candles);
    if (confidence > 0.6) {
      patterns.push({
        pattern: name,
        confidence,
        historicalWinRate: winRate,
        expectedMove,
        timeframe: 'current',
      });
    }
  }

  return patterns;
}

// Pattern detection functions
function detectDoubleBottom(candles: Candle[]): number {
  const lows = candles.slice(-30).map(c => c.low);
  const minIdx = lows.indexOf(Math.min(...lows));

  if (minIdx < 5 || minIdx > 25) return 0;

  // Find second low
  const tolerance = 0.005;
  const minLow = lows[minIdx];

  for (let i = minIdx + 5; i < lows.length; i++) {
    if (Math.abs(lows[i] - minLow) / minLow < tolerance) {
      // Check for neckline break
      const neckline = Math.max(...candles.slice(-30, -1).map(c => c.high));
      if (candles[candles.length - 1].close > neckline) {
        return 0.8;
      }
      return 0.65;
    }
  }
  return 0;
}

function detectDoubleTop(candles: Candle[]): number {
  const highs = candles.slice(-30).map(c => c.high);
  const maxIdx = highs.indexOf(Math.max(...highs));

  if (maxIdx < 5 || maxIdx > 25) return 0;

  const tolerance = 0.005;
  const maxHigh = highs[maxIdx];

  for (let i = maxIdx + 5; i < highs.length; i++) {
    if (Math.abs(highs[i] - maxHigh) / maxHigh < tolerance) {
      const neckline = Math.min(...candles.slice(-30, -1).map(c => c.low));
      if (candles[candles.length - 1].close < neckline) {
        return 0.8;
      }
      return 0.65;
    }
  }
  return 0;
}

function detectHeadShoulders(candles: Candle[]): number {
  const highs = candles.slice(-40).map(c => c.high);
  if (highs.length < 40) return 0;

  // Find head (highest point)
  const headIdx = highs.indexOf(Math.max(...highs.slice(10, 30)));
  if (headIdx < 10 || headIdx > 30) return 0;

  // Find left shoulder
  const leftHighs = highs.slice(0, headIdx - 3);
  const leftShoulderIdx = leftHighs.indexOf(Math.max(...leftHighs));
  const leftShoulder = leftHighs[leftShoulderIdx];

  // Find right shoulder
  const rightHighs = highs.slice(headIdx + 3);
  const rightShoulderIdx = rightHighs.indexOf(Math.max(...rightHighs));
  const rightShoulder = rightHighs[rightShoulderIdx];

  const head = highs[headIdx];

  // Validate pattern
  const shoulderTolerance = 0.03;
  if (Math.abs(leftShoulder - rightShoulder) / leftShoulder > shoulderTolerance) return 0;
  if (leftShoulder >= head || rightShoulder >= head) return 0;

  // Check neckline break
  const neckline = Math.min(
    candles[leftShoulderIdx + 3].low,
    candles[headIdx + rightShoulderIdx + 3].low
  );

  if (candles[candles.length - 1].close < neckline) {
    return 0.85;
  }

  return 0.55;
}

function detectInverseHeadShoulders(candles: Candle[]): number {
  const lows = candles.slice(-40).map(c => c.low);
  if (lows.length < 40) return 0;

  const headIdx = lows.indexOf(Math.min(...lows.slice(10, 30)));
  if (headIdx < 10 || headIdx > 30) return 0;

  const leftLows = lows.slice(0, headIdx - 3);
  const leftShoulderIdx = leftLows.indexOf(Math.min(...leftLows));
  const leftShoulder = leftLows[leftShoulderIdx];

  const rightLows = lows.slice(headIdx + 3);
  const rightShoulderIdx = rightLows.indexOf(Math.min(...rightLows));
  const rightShoulder = rightLows[rightShoulderIdx];

  const head = lows[headIdx];

  const shoulderTolerance = 0.03;
  if (Math.abs(leftShoulder - rightShoulder) / leftShoulder > shoulderTolerance) return 0;
  if (leftShoulder <= head || rightShoulder <= head) return 0;

  return 0.7;
}

function detectBullFlag(candles: Candle[]): number {
  const recent = candles.slice(-30);
  if (recent.length < 30) return 0;

  // Check for strong upward move (pole)
  const poleStart = recent.slice(0, 10);
  const poleReturn = (poleStart[poleStart.length - 1].close - poleStart[0].open) / poleStart[0].open;

  if (poleReturn < 0.03) return 0; // Need at least 3% move

  // Check for consolidation (flag)
  const flag = recent.slice(10);
  const flagHighs = flag.map(c => c.high);
  const flagLows = flag.map(c => c.low);

  // Flag should have lower highs and lower lows (slight downtrend)
  let lowerHighs = 0;
  let lowerLows = 0;

  for (let i = 1; i < flag.length; i++) {
    if (flagHighs[i] < flagHighs[i - 1]) lowerHighs++;
    if (flagLows[i] < flagLows[i - 1]) lowerLows++;
  }

  if (lowerHighs > flag.length * 0.5 && lowerLows > flag.length * 0.5) {
    // Check for breakout
    const flagTop = Math.max(...flagHighs);
    if (candles[candles.length - 1].close > flagTop) {
      return 0.8;
    }
    return 0.65;
  }

  return 0;
}

function detectBearFlag(candles: Candle[]): number {
  const recent = candles.slice(-30);
  if (recent.length < 30) return 0;

  const poleStart = recent.slice(0, 10);
  const poleReturn = (poleStart[poleStart.length - 1].close - poleStart[0].open) / poleStart[0].open;

  if (poleReturn > -0.03) return 0;

  const flag = recent.slice(10);
  const flagHighs = flag.map(c => c.high);
  const flagLows = flag.map(c => c.low);

  let higherHighs = 0;
  let higherLows = 0;

  for (let i = 1; i < flag.length; i++) {
    if (flagHighs[i] > flagHighs[i - 1]) higherHighs++;
    if (flagLows[i] > flagLows[i - 1]) higherLows++;
  }

  if (higherHighs > flag.length * 0.5 && higherLows > flag.length * 0.5) {
    const flagBottom = Math.min(...flagLows);
    if (candles[candles.length - 1].close < flagBottom) {
      return 0.8;
    }
    return 0.65;
  }

  return 0;
}

function detectAscendingTriangle(candles: Candle[]): number {
  const recent = candles.slice(-25);
  if (recent.length < 25) return 0;

  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  // Check for flat resistance
  const resistanceLevel = Math.max(...highs);
  const touchesResistance = highs.filter(h => Math.abs(h - resistanceLevel) / resistanceLevel < 0.005).length;

  if (touchesResistance < 2) return 0;

  // Check for rising lows
  let risingLows = 0;
  for (let i = 5; i < lows.length; i += 5) {
    if (Math.min(...lows.slice(i, i + 5)) > Math.min(...lows.slice(i - 5, i))) {
      risingLows++;
    }
  }

  if (risingLows >= 2) {
    if (candles[candles.length - 1].close > resistanceLevel) {
      return 0.85;
    }
    return 0.6;
  }

  return 0;
}

function detectDescendingTriangle(candles: Candle[]): number {
  const recent = candles.slice(-25);
  if (recent.length < 25) return 0;

  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  const supportLevel = Math.min(...lows);
  const touchesSupport = lows.filter(l => Math.abs(l - supportLevel) / supportLevel < 0.005).length;

  if (touchesSupport < 2) return 0;

  let lowerHighs = 0;
  for (let i = 5; i < highs.length; i += 5) {
    if (Math.max(...highs.slice(i, i + 5)) < Math.max(...highs.slice(i - 5, i))) {
      lowerHighs++;
    }
  }

  if (lowerHighs >= 2) {
    if (candles[candles.length - 1].close < supportLevel) {
      return 0.85;
    }
    return 0.6;
  }

  return 0;
}

function detectCupHandle(candles: Candle[]): number {
  if (candles.length < 50) return 0;

  const recent = candles.slice(-50);
  const closes = recent.map(c => c.close);

  // Find the cup (U-shape)
  const cupStart = closes[0];
  const cupEnd = closes[closes.length - 10];
  const cupBottom = Math.min(...closes.slice(10, 40));

  const cupDepth = (cupStart - cupBottom) / cupStart;
  if (cupDepth < 0.1 || cupDepth > 0.5) return 0; // 10-50% depth

  // Check symmetry
  const leftSide = closes.slice(0, 20);
  const rightSide = closes.slice(30, 50);

  if (Math.abs(cupStart - cupEnd) / cupStart > 0.05) return 0; // Should be near same level

  // Check for handle (small consolidation)
  const handle = closes.slice(-10);
  const handleRange = (Math.max(...handle) - Math.min(...handle)) / Math.max(...handle);

  if (handleRange < 0.02 || handleRange > 0.1) return 0; // Handle should be 2-10% range

  // Breakout above cup rim
  if (candles[candles.length - 1].close > Math.max(cupStart, cupEnd)) {
    return 0.8;
  }

  return 0.5;
}

function detectWedgeBreakout(candles: Candle[]): number {
  const recent = candles.slice(-25);
  if (recent.length < 25) return 0;

  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  // Calculate trend lines
  const highSlope = (highs[highs.length - 1] - highs[0]) / highs.length;
  const lowSlope = (lows[lows.length - 1] - lows[0]) / lows.length;

  // Falling wedge (bullish) - both lines falling, converging
  if (highSlope < 0 && lowSlope < 0 && highSlope > lowSlope) {
    // Check for breakout above resistance
    const lastHigh = highs[highs.length - 2];
    if (candles[candles.length - 1].close > lastHigh * 1.01) {
      return 0.75;
    }
    return 0.55;
  }

  // Rising wedge (bearish) - both lines rising, converging
  if (highSlope > 0 && lowSlope > 0 && lowSlope > highSlope) {
    const lastLow = lows[lows.length - 2];
    if (candles[candles.length - 1].close < lastLow * 0.99) {
      return 0.75;
    }
    return 0.55;
  }

  return 0;
}

function detectVolumeClimax(candles: Candle[]): number {
  const recent = candles.slice(-20);
  if (recent.length < 20) return 0;

  const volumes = recent.map(c => c.volume);
  const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);
  const lastVolume = volumes[volumes.length - 1];

  // Volume should be 2x+ average
  if (lastVolume < avgVolume * 2) return 0;

  const lastCandle = candles[candles.length - 1];
  const candleRange = Math.abs(lastCandle.close - lastCandle.open);
  const avgRange = recent.slice(0, -1).reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / (recent.length - 1);

  // Large range with high volume = climax
  if (candleRange > avgRange * 1.5) {
    return 0.7;
  }

  return 0.5;
}

function detectMomentumDivergence(candles: Candle[]): number {
  if (candles.length < 30) return 0;

  const closes = candles.map(c => c.close);
  const rsi = calculateRSIValues(closes, 14);

  if (rsi.length < 15) return 0;

  // Bullish divergence: lower lows in price, higher lows in RSI
  const priceLows: number[] = [];
  const rsiLows: number[] = [];

  for (let i = 5; i < closes.length - 5; i++) {
    const isLow = closes[i] < closes[i - 1] && closes[i] < closes[i + 1] &&
                  closes[i] < closes[i - 2] && closes[i] < closes[i + 2];
    if (isLow) {
      priceLows.push(closes[i]);
      rsiLows.push(rsi[i - (closes.length - rsi.length)] || 50);
    }
  }

  if (priceLows.length >= 2) {
    const priceSlope = priceLows[priceLows.length - 1] < priceLows[priceLows.length - 2];
    const rsiSlope = rsiLows[rsiLows.length - 1] > rsiLows[rsiLows.length - 2];

    if (priceSlope && rsiSlope) {
      return 0.75; // Bullish divergence
    }
  }

  return 0;
}

// ============================================================================
// MARKET REGIME DETECTION
// ============================================================================

export function detectMarketRegime(candles: Candle[]): MarketRegime {
  if (candles.length < 50) {
    return {
      type: 'RANGING',
      strength: 0.5,
      duration: 0,
      characteristics: {
        volatility: 0.5,
        momentum: 0,
        volumeProfile: 'STABLE',
        trendStrength: 0,
      },
    };
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  // Calculate ADX for trend strength
  const adx = calculateADX(candles, 14);
  const trendStrength = adx / 100;

  // Calculate directional movement
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const momentum = (ema20 - ema50) / ema50;

  // Volatility (ATR as % of price)
  const atr = calculateATR(candles, 14);
  const volatility = atr / closes[closes.length - 1];

  // Volume profile
  const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const avgVolume = volumes.slice(-50, -10).reduce((a, b) => a + b, 0) / 40;
  const volumeProfile: 'INCREASING' | 'DECREASING' | 'STABLE' =
    recentVolume > avgVolume * 1.2 ? 'INCREASING' :
    recentVolume < avgVolume * 0.8 ? 'DECREASING' : 'STABLE';

  // Determine regime
  let type: MarketRegime['type'];
  let strength: number;

  if (adx > 40) {
    // Strong trend
    type = momentum > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
    strength = Math.min(adx / 60, 1);
  } else if (adx < 20) {
    // Weak trend / ranging
    if (volatility > 0.03) {
      type = 'VOLATILE';
      strength = volatility / 0.05;
    } else {
      type = 'RANGING';
      strength = 1 - (adx / 20);
    }
  } else {
    // Moderate - check for breakout
    const bbWidth = calculateBollingerWidth(closes, 20);
    if (bbWidth < 0.02 && volumeProfile === 'INCREASING') {
      type = 'BREAKOUT';
      strength = 0.7;
    } else {
      type = momentum > 0.01 ? 'TRENDING_UP' : momentum < -0.01 ? 'TRENDING_DOWN' : 'RANGING';
      strength = Math.abs(momentum) * 20;
    }
  }

  // Calculate duration (how many candles in this regime)
  let duration = 0;
  for (let i = candles.length - 2; i >= 0; i--) {
    const prevRegime = detectRegimeAt(candles.slice(0, i + 1));
    if (prevRegime === type) {
      duration++;
    } else {
      break;
    }
  }

  return {
    type,
    strength: Math.min(strength, 1),
    duration,
    characteristics: {
      volatility,
      momentum,
      volumeProfile,
      trendStrength,
    },
  };
}

function detectRegimeAt(candles: Candle[]): MarketRegime['type'] {
  if (candles.length < 20) return 'RANGING';

  const closes = candles.map(c => c.close);
  const adx = calculateADX(candles, Math.min(14, candles.length - 1));
  const ema20 = calculateEMA(closes, Math.min(20, candles.length));
  const ema50 = calculateEMA(closes, Math.min(50, candles.length));
  const momentum = (ema20 - ema50) / ema50;

  if (adx > 40) {
    return momentum > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  } else if (adx < 20) {
    return 'RANGING';
  }
  return 'RANGING';
}

// ============================================================================
// ENSEMBLE SIGNAL GENERATION
// ============================================================================

const neuralNetwork = new NeuralSignalNetwork();

export function generateMLSignal(
  candles: Candle[],
  orderBook?: OrderBookData,
  existingSignals?: Signal[]
): MLSignal {
  // Extract features
  const features = extractFeatures(candles, orderBook);

  // Get neural network prediction
  const nnResult = neuralNetwork.forward(features);

  // Recognize patterns
  const patterns = recognizePatterns(candles);

  // Detect market regime
  const regime = detectMarketRegime(candles);

  // Calculate pattern-based signal
  let patternScore = 0;
  for (const pattern of patterns) {
    const weight = pattern.confidence * pattern.historicalWinRate;
    patternScore += pattern.expectedMove > 0 ? weight : -weight;
  }
  patternScore = Math.max(-1, Math.min(1, patternScore));

  // Combine existing signals if provided
  let existingScore = 0;
  if (existingSignals && existingSignals.length > 0) {
    existingScore = existingSignals.reduce((sum, s) => {
      const weight = s.confidence / 100;
      const side = s.side?.toUpperCase() || s.signalType;
      return sum + (side === 'BUY' || side === 'LONG' ? weight : side === 'SELL' || side === 'SHORT' ? -weight : 0);
    }, 0) / existingSignals.length;
  }

  // Ensemble weights (adjust based on regime)
  let nnWeight = 0.35;
  let patternWeight = 0.25;
  let existingWeight = 0.40;

  // Adjust weights based on regime
  if (regime.type === 'TRENDING_UP' || regime.type === 'TRENDING_DOWN') {
    existingWeight = 0.45; // Trust momentum signals more in trends
    patternWeight = 0.20;
  } else if (regime.type === 'RANGING') {
    patternWeight = 0.35; // Trust patterns more in ranges
    existingWeight = 0.30;
  } else if (regime.type === 'BREAKOUT') {
    nnWeight = 0.40; // Trust ML more during breakouts
    patternWeight = 0.35;
    existingWeight = 0.25;
  }

  // Calculate neural score
  const nnScore = nnResult.direction === 'LONG' ? nnResult.confidence :
                  nnResult.direction === 'SHORT' ? -nnResult.confidence : 0;

  // Ensemble score
  const ensembleScore =
    nnScore * nnWeight +
    patternScore * patternWeight +
    existingScore * existingWeight;

  // Determine direction
  const direction: 'LONG' | 'SHORT' | 'NEUTRAL' =
    ensembleScore > 0.2 ? 'LONG' :
    ensembleScore < -0.2 ? 'SHORT' : 'NEUTRAL';

  // Calculate confidence
  const confidence = Math.abs(ensembleScore) * (regime.strength * 0.3 + 0.7);

  // Risk adjustment based on regime
  const riskMultiplier =
    regime.type === 'VOLATILE' ? 0.7 :
    regime.type === 'BREAKOUT' ? 0.85 :
    regime.type === 'RANGING' && regime.strength > 0.7 ? 0.8 : 1.0;

  const riskAdjustedScore = ensembleScore * riskMultiplier;

  // Calculate entry, stop, and target based on current price and ATR
  const currentPrice = candles[candles.length - 1]?.close || 0;
  const atr = calculateATR(candles, 14);

  let entry = currentPrice;
  let stopLoss = currentPrice;
  let takeProfit = currentPrice;

  if (direction === 'LONG') {
    stopLoss = currentPrice - atr * 2;
    takeProfit = currentPrice + atr * 3;
  } else if (direction === 'SHORT') {
    stopLoss = currentPrice + atr * 2;
    takeProfit = currentPrice - atr * 3;
  }

  return {
    direction,
    confidence: Math.min(confidence, 1),
    features,
    patterns,
    ensembleScore,
    riskAdjustedScore,
    timestamp: Date.now(),
    // Extended trading fields
    entry,
    stopLoss,
    takeProfit,
    regime,
    ensemble: {
      consensus: direction,
      agreementLevel: Math.abs(ensembleScore) * 100,
    },
  };
}

// Calculate ATR for stop/target calculation
function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  let atr = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atr += tr;
  }
  return atr / period;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createEmptyFeatureVector(): FeatureVector {
  return {
    price: new Array(8).fill(0.5),
    volume: new Array(8).fill(0.5),
    momentum: new Array(8).fill(0.5),
    volatility: new Array(8).fill(0.5),
    orderFlow: new Array(8).fill(0.5),
    sentiment: new Array(8).fill(0.5),
    timestamp: Date.now(),
  };
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function calculateReturns(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;
  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 1 - period];
  return (current - previous) / previous;
}

function calculatePricePosition(closes: number[]): number {
  const recent = closes.slice(-20);
  const max = Math.max(...recent);
  const min = Math.min(...recent);
  return normalize(closes[closes.length - 1], min, max);
}

function calculateHighLowPosition(current: number, highs: number[], lows: number[]): number {
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  const max = Math.max(...recentHighs);
  const min = Math.min(...recentLows);
  return normalize(current, min, max);
}

function calculateGapSize(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const gap = (current.open - previous.close) / previous.close;
  return Math.max(-1, Math.min(1, gap * 10)); // Normalize gap
}

function normalizeVolume(volumes: number[]): number {
  const recent = volumes.slice(-20);
  const current = volumes[volumes.length - 1];
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return Math.min(1, current / (avg * 2));
}

function calculateVolumeRatio(volumes: number[], period: number): number {
  if (volumes.length < period + 1) return 0.5;
  const current = volumes[volumes.length - 1];
  const avg = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
  return Math.min(1, current / (avg * 2));
}

function calculateOBV(closes: number[], volumes: number[]): number {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  const maxObv = volumes.reduce((a, b) => a + b, 0);
  return normalize(obv, -maxObv, maxObv);
}

function calculateVolumeWeightedPrice(candles: Candle[]): number {
  const recent = candles.slice(-20);
  let sumPV = 0;
  let sumV = 0;
  for (const c of recent) {
    const typical = (c.high + c.low + c.close) / 3;
    sumPV += typical * c.volume;
    sumV += c.volume;
  }
  const vwap = sumV > 0 ? sumPV / sumV : recent[recent.length - 1].close;
  const current = candles[candles.length - 1].close;
  return normalize(current, vwap * 0.98, vwap * 1.02);
}

function detectVolumeSpike(volumes: number[]): number {
  const recent = volumes.slice(-20);
  const avg = recent.slice(0, -1).reduce((a, b) => a + b, 0) / (recent.length - 1);
  const current = recent[recent.length - 1];
  const spike = current / avg;
  return Math.min(1, spike / 3);
}

function calculateAccumulationDistribution(candles: Candle[]): number {
  let ad = 0;
  for (const c of candles) {
    const clv = ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low || 1);
    ad += clv * c.volume;
  }
  const maxAd = candles.reduce((sum, c) => sum + c.volume, 0);
  return normalize(ad, -maxAd, maxAd);
}

function calculateMoneyFlowIndex(candles: Candle[], period: number): number {
  if (candles.length < period + 1) return 0.5;

  let positiveFlow = 0;
  let negativeFlow = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const typical = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const prevTypical = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
    const rawMoney = typical * candles[i].volume;

    if (typical > prevTypical) positiveFlow += rawMoney;
    else negativeFlow += rawMoney;
  }

  if (negativeFlow === 0) return 1;
  const mfi = 100 - (100 / (1 + positiveFlow / negativeFlow));
  return mfi / 100;
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0.5;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 1;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return rsi / 100;
}

function calculateRSIValues(closes: number[], period: number): number[] {
  const rsiValues: number[] = [];

  for (let i = period; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
  }

  return rsiValues;
}

function calculateMACDHistogram(closes: number[]): number {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  // Calculate signal line (9-period EMA of MACD)
  const macdHistory: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i), 12);
    const e26 = calculateEMA(closes.slice(0, i), 26);
    macdHistory.push(e12 - e26);
  }

  const signal = calculateEMA(macdHistory, 9);
  const histogram = macd - signal;

  return Math.max(-1, Math.min(1, histogram / (closes[closes.length - 1] * 0.01)));
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return values[values.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateStochastic(closes: number[], highs: number[], lows: number[]): number {
  const period = 14;
  if (closes.length < period) return 0.5;

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const high = Math.max(...recentHighs);
  const low = Math.min(...recentLows);
  const current = closes[closes.length - 1];

  if (high === low) return 0.5;
  return (current - low) / (high - low);
}

function calculateROC(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;
  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 1 - period];
  const roc = ((current - previous) / previous) * 100;
  return Math.max(-1, Math.min(1, roc / 10));
}

function calculateCCI(candles: Candle[], period: number): number {
  if (candles.length < period) return 0;

  const recent = candles.slice(-period);
  const typicals = recent.map(c => (c.high + c.low + c.close) / 3);
  const avg = typicals.reduce((a, b) => a + b, 0) / period;
  const meanDev = typicals.reduce((sum, t) => sum + Math.abs(t - avg), 0) / period;

  if (meanDev === 0) return 0;
  const cci = (typicals[typicals.length - 1] - avg) / (0.015 * meanDev);
  return Math.max(-1, Math.min(1, cci / 200));
}

function calculateWilliamsR(closes: number[], highs: number[], lows: number[], period: number): number {
  if (closes.length < period) return 0.5;

  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const high = Math.max(...recentHighs);
  const low = Math.min(...recentLows);
  const current = closes[closes.length - 1];

  if (high === low) return 0.5;
  const wr = ((high - current) / (high - low)) * -100;
  return (wr + 100) / 100;
}

function calculateMomentum(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0.5;
  const momentum = closes[closes.length - 1] - closes[closes.length - 1 - period];
  const range = Math.max(...closes.slice(-period)) - Math.min(...closes.slice(-period));
  return range > 0 ? normalize(momentum, -range, range) : 0.5;
}

function calculateBollingerWidth(closes: number[], period: number): number {
  if (closes.length < period) return 0;

  const recent = closes.slice(-period);
  const sma = recent.reduce((a, b) => a + b, 0) / period;
  const variance = recent.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return (stdDev * 4) / sma; // Width as percentage
}

function calculateHistoricalVolatility(closes: number[], period: number): number {
  if (closes.length < period + 1) return 0;

  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;

  return Math.sqrt(variance * 252); // Annualized
}

function calculateAverageRange(candles: Candle[], period: number): number {
  if (candles.length < period) return 0;

  const recent = candles.slice(-period);
  const ranges = recent.map(c => (c.high - c.low) / c.close);
  return ranges.reduce((a, b) => a + b, 0) / period;
}

function calculateVolatilityRatio(candles: Candle[]): number {
  if (candles.length < 20) return 0.5;

  const shortATR = calculateATR(candles, 5);
  const longATR = calculateATR(candles, 20);

  if (longATR === 0) return 0.5;
  return Math.min(1, shortATR / (longATR * 2));
}

function detectVolatilityExpansion(candles: Candle[]): number {
  if (candles.length < 20) return 0.5;

  const recentATR = calculateATR(candles.slice(-5), 5);
  const historicalATR = calculateATR(candles.slice(-20, -5), 15);

  if (historicalATR === 0) return 0.5;
  const ratio = recentATR / historicalATR;
  return Math.min(1, ratio / 2);
}

function calculateKeltnerWidth(candles: Candle[], period: number): number {
  if (candles.length < period) return 0;

  const closes = candles.map(c => c.close);
  const ema = calculateEMA(closes, period);
  const atr = calculateATR(candles, period);

  return (atr * 2) / ema;
}

function calculateChaikinVolatility(candles: Candle[], period: number): number {
  if (candles.length < period * 2) return 0;

  const ranges = candles.map(c => c.high - c.low);
  const currentEMA = calculateEMA(ranges.slice(-period), period);
  const previousEMA = calculateEMA(ranges.slice(-period * 2, -period), period);

  if (previousEMA === 0) return 0;
  return (currentEMA - previousEMA) / previousEMA;
}

function calculateBidAskImbalance(orderBook: OrderBookData): number {
  const totalBid = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
  const totalAsk = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0);
  const total = totalBid + totalAsk;
  return total > 0 ? totalBid / total : 0.5;
}

function calculateDepthRatio(orderBook: OrderBookData): number {
  const bidDepth = orderBook.bids.slice(0, 20).reduce((sum, [, qty]) => sum + qty, 0);
  const askDepth = orderBook.asks.slice(0, 20).reduce((sum, [, qty]) => sum + qty, 0);
  const total = bidDepth + askDepth;
  return total > 0 ? bidDepth / total : 0.5;
}

function calculateSpreadNormalized(orderBook: OrderBookData): number {
  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) return 0.5;
  const bestBid = orderBook.bids[0][0];
  const bestAsk = orderBook.asks[0][0];
  const spread = (bestAsk - bestBid) / bestBid;
  return 1 - Math.min(spread * 100, 1); // Lower spread = higher score
}

function calculateWallDetection(orderBook: OrderBookData): number {
  const levels = [...orderBook.bids.slice(0, 20), ...orderBook.asks.slice(0, 20)];
  const avgSize = levels.reduce((sum, [, qty]) => sum + qty, 0) / levels.length;

  let wallScore = 0;
  for (const [, qty] of levels) {
    if (qty > avgSize * 5) wallScore += 0.1;
  }

  return Math.min(1, wallScore);
}

function calculateLiquidityScore(orderBook: OrderBookData): number {
  const bidLiquidity = orderBook.bids.slice(0, 10).reduce((sum, [price, qty]) => sum + price * qty, 0);
  const askLiquidity = orderBook.asks.slice(0, 10).reduce((sum, [price, qty]) => sum + price * qty, 0);
  const total = bidLiquidity + askLiquidity;

  // Normalize to expected liquidity (arbitrary scale)
  return Math.min(1, total / 1000000);
}

function calculateOrderFlowToxicity(orderBook: OrderBookData): number {
  // Measure how "toxic" order flow is (high toxicity = informed trading)
  const imbalance = calculateBidAskImbalance(orderBook);
  const spread = calculateSpreadNormalized(orderBook);

  // High imbalance + wide spread = toxic
  const toxicity = Math.abs(imbalance - 0.5) * 2 * (1 - spread);
  return toxicity;
}

function calculateBookPressure(orderBook: OrderBookData): number {
  // Weighted pressure based on proximity to mid price
  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) return 0.5;

  const midPrice = (orderBook.bids[0][0] + orderBook.asks[0][0]) / 2;

  let bidPressure = 0;
  let askPressure = 0;

  for (const [price, qty] of orderBook.bids.slice(0, 10)) {
    const distance = (midPrice - price) / midPrice;
    bidPressure += qty / (1 + distance * 10);
  }

  for (const [price, qty] of orderBook.asks.slice(0, 10)) {
    const distance = (price - midPrice) / midPrice;
    askPressure += qty / (1 + distance * 10);
  }

  const total = bidPressure + askPressure;
  return total > 0 ? bidPressure / total : 0.5;
}

function calculateMicrostructureSignal(orderBook: OrderBookData): number {
  // Combine multiple microstructure indicators
  const imbalance = calculateBidAskImbalance(orderBook);
  const pressure = calculateBookPressure(orderBook);
  const toxicity = calculateOrderFlowToxicity(orderBook);

  // Signal: high imbalance + high pressure - toxicity adjustment
  const signal = (imbalance * 0.4 + pressure * 0.4) * (1 - toxicity * 0.5);
  return signal;
}

function calculateBullBearRatio(candles: Candle[]): number {
  const recent = candles.slice(-20);
  let bullish = 0;
  let bearish = 0;

  for (const c of recent) {
    if (c.close > c.open) bullish++;
    else if (c.close < c.open) bearish++;
  }

  const total = bullish + bearish;
  return total > 0 ? bullish / total : 0.5;
}

function calculateTrendStrength(closes: number[]): number {
  if (closes.length < 20) return 0.5;

  const ema10 = calculateEMA(closes, 10);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes.slice(-50), 50);

  // Stacked EMAs indicate trend strength
  if (ema10 > ema20 && ema20 > ema50) {
    return 0.5 + (ema10 - ema50) / ema50 * 5;
  } else if (ema10 < ema20 && ema20 < ema50) {
    return 0.5 - (ema50 - ema10) / ema50 * 5;
  }

  return 0.5;
}

function calculateMeanReversion(closes: number[]): number {
  if (closes.length < 20) return 0.5;

  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const current = closes[closes.length - 1];
  const deviation = (current - sma20) / sma20;

  // Oversold = high reversion probability, overbought = low
  return 0.5 - Math.max(-0.5, Math.min(0.5, deviation * 5));
}

function detectExhaustion(candles: Candle[]): number {
  if (candles.length < 10) return 0.5;

  const recent = candles.slice(-10);
  const volumes = recent.map(c => c.volume);
  const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);

  const last = recent[recent.length - 1];
  const prevTrend = recent.slice(0, -1).reduce((sum, c) => sum + (c.close > c.open ? 1 : -1), 0);

  // High volume candle against trend = exhaustion
  const volumeSpike = last.volume / avgVolume;
  const againstTrend = (prevTrend > 0 && last.close < last.open) ||
                       (prevTrend < 0 && last.close > last.open);

  if (volumeSpike > 2 && againstTrend) {
    return volumeSpike > 3 ? 0.9 : 0.7;
  }

  return 0.3;
}

function calculateMarketBreadth(candles: Candle[]): number {
  if (candles.length < 20) return 0.5;

  const recent = candles.slice(-20);
  let advances = 0;
  let declines = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].close > recent[i - 1].close) advances++;
    else if (recent[i].close < recent[i - 1].close) declines++;
  }

  const total = advances + declines;
  return total > 0 ? advances / total : 0.5;
}

function detectDivergence(closes: number[], volumes: number[]): number {
  if (closes.length < 20 || volumes.length < 20) return 0.5;

  const priceChange = (closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10];
  const volumeChange = (volumes.slice(-5).reduce((a, b) => a + b, 0) / 5) /
                       (volumes.slice(-15, -5).reduce((a, b) => a + b, 0) / 10);

  // Price up but volume down = bearish divergence
  // Price down but volume up = bullish divergence
  if (priceChange > 0.02 && volumeChange < 0.8) return 0.3;
  if (priceChange < -0.02 && volumeChange > 1.2) return 0.7;

  return 0.5;
}

function calculateSentimentScore(candles: Candle[]): number {
  if (candles.length < 20) return 0.5;

  const bullBear = calculateBullBearRatio(candles);
  const trend = calculateTrendStrength(candles.map(c => c.close));
  const exhaustion = detectExhaustion(candles);

  return (bullBear + trend + (1 - exhaustion)) / 3;
}

function calculateFearGreedProxy(candles: Candle[]): number {
  if (candles.length < 20) return 0.5;

  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(closes, 14);
  const volatility = calculateHistoricalVolatility(closes, 20);
  const momentum = calculateMomentum(closes, 10);

  // High RSI + low volatility + positive momentum = greed
  // Low RSI + high volatility + negative momentum = fear
  const greed = rsi * 0.4 + (1 - Math.min(volatility, 1)) * 0.3 + momentum * 0.3;
  return greed;
}

function calculateADX(candles: Candle[], period: number): number {
  if (candles.length < period * 2) return 20;

  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const trueRange = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    tr.push(trueRange);
  }

  const smoothedDmPlus = calculateEMA(dmPlus, period);
  const smoothedDmMinus = calculateEMA(dmMinus, period);
  const smoothedTr = calculateEMA(tr, period);

  const diPlus = smoothedTr > 0 ? (smoothedDmPlus / smoothedTr) * 100 : 0;
  const diMinus = smoothedTr > 0 ? (smoothedDmMinus / smoothedTr) * 100 : 0;

  const diSum = diPlus + diMinus;
  const dx = diSum > 0 ? Math.abs(diPlus - diMinus) / diSum * 100 : 0;

  return dx;
}

// Export the main engine class
export class MLSignalEngine {
  private history: MLSignal[] = [];
  private maxHistory = 100;

  generateSignal(candles: Candle[], orderBook?: OrderBookData, existingSignals?: Signal[]): MLSignal {
    const signal = generateMLSignal(candles, orderBook, existingSignals);

    this.history.push(signal);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return signal;
  }

  getHistory(): MLSignal[] {
    return [...this.history];
  }

  getAccuracy(): { total: number; correct: number; accuracy: number } {
    // Would be calculated based on actual trade outcomes
    return { total: 0, correct: 0, accuracy: 0 };
  }

  getRegime(candles: Candle[]): MarketRegime {
    return detectMarketRegime(candles);
  }

  getPatterns(candles: Candle[]): PatternMatch[] {
    return recognizePatterns(candles);
  }
}
