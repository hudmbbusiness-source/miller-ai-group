/**
 * ADAPTIVE LEARNING TRADING SYSTEM
 *
 * This system:
 * 1. Uses ALL 11 world-class strategies with dynamic weighting
 * 2. Only trades when market conditions MATCH strategy requirements
 * 3. Learns from each trade and adjusts weights automatically
 * 4. Persists state to Supabase for continuous learning
 *
 * CRITICAL: This learns and adapts - NOT static
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================
interface Candle {
  timestamp: number;
  date: string;
  hour: number;
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicators {
  ema20: number;
  ema50: number;
  rsi: number;
  atr: number;
  atrAvg: number;
  vwap: number;
  vwapUpper: number;
  vwapLower: number;
  bollingerUpper: number;
  bollingerLower: number;
}

interface Signal {
  strategy: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  regime: string;
  weight: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
}

interface Trade {
  id: string;
  timestamp: Date;
  strategy: string;
  regime: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit?: number;
  pnl?: number;
  exitType?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MAX_HOLD' | 'MANUAL';
  isSimulation: boolean;
}

interface LearningState {
  version: number;
  lastUpdated: string;
  // ACTIVE weights used in live trading (only changed after validation)
  strategyWeights: Record<string, number>;
  // PENDING weights suggested by learning (needs validation before applying)
  pendingWeights: Record<string, number>;
  regimePerformance: Record<string, Record<string, {
    trades: number;
    wins: number;
    totalPnl: number;
  }>>;
  recentTrades: Trade[];
  dailyStats: Record<string, { trades: number; pnl: number }>;
  learningRate: number;
  minTradesForAdjustment: number;
  // Flag indicating pending weights need validation
  pendingValidation: boolean;
  // Last time weights were validated via Monte Carlo
  lastValidationTime: string | null;
}

type MarketRegime =
  | 'TREND_STRONG_UP' | 'TREND_STRONG_DOWN'
  | 'TREND_WEAK_UP' | 'TREND_WEAK_DOWN'
  | 'RANGE_WIDE' | 'RANGE_TIGHT'
  | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';

// ============================================================================
// STRATEGY DEFINITIONS
// ============================================================================
const STRATEGY_CONFIG: Record<string, {
  name: string;
  regimes: MarketRegime[];
  minConfidence: number;
  description: string;
}> = {
  BOS_CONTINUATION: {
    name: 'Break of Structure Continuation',
    regimes: ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    minConfidence: 0.65,
    description: 'Trade with trend after structure break'
  },
  CHOCH_REVERSAL: {
    name: 'Change of Character Reversal',
    regimes: ['TREND_WEAK_UP', 'TREND_WEAK_DOWN', 'RANGE_WIDE'],
    minConfidence: 0.60,
    description: 'Trade reversal at trend exhaustion'
  },
  FAILED_BREAKOUT: {
    name: 'Failed Breakout Fade',
    regimes: ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY'],
    minConfidence: 0.65,
    description: 'Fade false breakouts'
  },
  LIQUIDITY_SWEEP: {
    name: 'Liquidity Sweep Reversal',
    regimes: ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    minConfidence: 0.70,
    description: 'Trade after stop hunts'
  },
  SESSION_REVERSION: {
    name: 'Session Mean Reversion',
    regimes: ['RANGE_WIDE', 'RANGE_TIGHT'],
    minConfidence: 0.60,
    description: 'Revert to session VWAP'
  },
  TREND_PULLBACK: {
    name: 'Trend Pullback Entry',
    regimes: ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    minConfidence: 0.65,
    description: 'Enter on pullback in trend'
  },
  VOLATILITY_BREAKOUT: {
    name: 'Volatility Contraction Breakout',
    regimes: ['LOW_VOLATILITY'],
    minConfidence: 0.65,
    description: 'Trade breakout from squeeze'
  },
  VWAP_DEVIATION: {
    name: 'VWAP Standard Deviation',
    regimes: ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY'],
    minConfidence: 0.60,
    description: 'Bounce off VWAP bands'
  },
  RANGE_FADE: {
    name: 'Range High/Low Fade',
    regimes: ['RANGE_WIDE', 'RANGE_TIGHT'],
    minConfidence: 0.60,
    description: 'Fade range extremes'
  },
  ORB_BREAKOUT: {
    name: 'Opening Range Breakout',
    regimes: ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'HIGH_VOLATILITY'],
    minConfidence: 0.65,
    description: 'Breakout of first 30-min range'
  },
  KILLZONE_REVERSAL: {
    name: 'Killzone Session Reversal',
    regimes: ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
    minConfidence: 0.65,
    description: 'Reversal at session killzones'
  }
};

// ============================================================================
// ADAPTIVE LEARNING SYSTEM CLASS
// ============================================================================
export class AdaptiveLearningSystem {
  private supabase;
  private state: LearningState;
  private stateLoaded: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.state = this.getDefaultState();
  }

  private getDefaultState(): LearningState {
    // VALIDATED weights from 100-SCENARIO Monte Carlo testing (Jan 7, 2026)
    const validatedWeights = {
      // WINNERS - Tested across 100 scenarios
      RANGE_FADE: 1.0,         // 51.8% WR, +$1.3M across 100 scenarios - BEST
      FAILED_BREAKOUT: 1.0,    // 44.1% WR, +$257K across 100 scenarios - GOOD

      // REDUCED - Not fully tested or inconsistent
      ORB_BREAKOUT: 0.5,
      CHOCH_REVERSAL: 0.5,
      KILLZONE_REVERSAL: 0.5,
      VOLATILITY_BREAKOUT: 0.5,
      VWAP_DEVIATION: 0.3,     // Inconsistent

      // DISABLED - Failed 100-scenario testing
      LIQUIDITY_SWEEP: 0.0,    // 25.8% WR, -$188K - DISABLED!
      TREND_PULLBACK: 0.0,     // Poor performer - DISABLED
      BOS_CONTINUATION: 0.0,   // 0% WR - DISABLED
      SESSION_REVERSION: 0.0   // 18.2% WR - DISABLED
    };

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      strategyWeights: validatedWeights,
      pendingWeights: { ...validatedWeights }, // Start same as active
      regimePerformance: {},
      recentTrades: [],
      dailyStats: {},
      learningRate: 0.1,
      minTradesForAdjustment: 5,
      pendingValidation: false,
      lastValidationTime: null
    };
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  async loadState(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('stuntman_ml_state')
        .select('state')
        .eq('key', 'adaptive_learning_state')
        .single();

      if (data?.state) {
        this.state = { ...this.getDefaultState(), ...data.state };
        this.stateLoaded = true;
        console.log('[Adaptive] State loaded from Supabase');
      }
    } catch (e) {
      console.error('[Adaptive] Error loading state:', e);
    }
  }

  async saveState(): Promise<void> {
    try {
      this.state.lastUpdated = new Date().toISOString();
      await this.supabase
        .from('stuntman_ml_state')
        .upsert({
          key: 'adaptive_learning_state',
          state: this.state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    } catch (e) {
      console.error('[Adaptive] Error saving state:', e);
    }
  }

  // ============================================================================
  // INDICATOR CALCULATIONS
  // ============================================================================
  calculateIndicators(candles: Candle[], idx: number): Indicators {
    if (idx < 55) {
      return {
        ema20: candles[idx].close, ema50: candles[idx].close, rsi: 50, atr: 1,
        atrAvg: 1, vwap: candles[idx].close, vwapUpper: candles[idx].close * 1.01,
        vwapLower: candles[idx].close * 0.99, bollingerUpper: candles[idx].close * 1.02,
        bollingerLower: candles[idx].close * 0.98
      };
    }

    const slice = candles.slice(0, idx + 1);
    const closes = slice.map(c => c.close);

    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const rsi = this.calculateRSI(closes, 14);
    const atr = this.calculateATR(slice, 14);
    const atrAvg = this.calculateATR(slice, 50);

    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const std20 = Math.sqrt(closes.slice(-20).map(c => Math.pow(c - sma20, 2)).reduce((a, b) => a + b, 0) / 20);
    const bollingerUpper = sma20 + 2 * std20;
    const bollingerLower = sma20 - 2 * std20;

    const currentDate = candles[idx].date;
    const dayCandles = slice.filter(c => c.date === currentDate);
    const vwap = dayCandles.length > 0
      ? dayCandles.reduce((sum, c) => sum + c.close * c.volume, 0) / dayCandles.reduce((sum, c) => sum + c.volume, 0)
      : closes[closes.length - 1];
    const vwapStd = dayCandles.length > 1
      ? Math.sqrt(dayCandles.map(c => Math.pow(c.close - vwap, 2)).reduce((a, b) => a + b, 0) / dayCandles.length)
      : atr;
    const vwapUpper = vwap + 2 * vwapStd;
    const vwapLower = vwap - 2 * vwapStd;

    return { ema20, ema50, rsi, atr, atrAvg, vwap, vwapUpper, vwapLower, bollingerUpper, bollingerLower };
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateRSI(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateATR(candles: Candle[], period = 14): number {
    if (candles.length < period + 1) return 1;
    let tr_sum = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const tr = Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
      tr_sum += tr;
    }
    return tr_sum / period;
  }

  // ============================================================================
  // MARKET REGIME DETECTION
  // ============================================================================
  detectRegime(candles: Candle[], idx: number, ind: Indicators): MarketRegime {
    const { ema20, ema50, atr, atrAvg, bollingerUpper, bollingerLower } = ind;
    const c = candles[idx];

    const trendStrength = Math.abs(ema20 - ema50) / c.close;
    const volatility = atr / atrAvg;
    const bbWidth = (bollingerUpper - bollingerLower) / c.close;

    if (trendStrength > 0.008) {
      return ema20 > ema50 ? 'TREND_STRONG_UP' : 'TREND_STRONG_DOWN';
    }
    if (trendStrength > 0.003) {
      return ema20 > ema50 ? 'TREND_WEAK_UP' : 'TREND_WEAK_DOWN';
    }
    if (volatility > 1.5) return 'HIGH_VOLATILITY';
    if (volatility < 0.6) return 'LOW_VOLATILITY';
    if (bbWidth > 0.025) return 'RANGE_WIDE';
    return 'RANGE_TIGHT';
  }

  // ============================================================================
  // STRATEGY DETECTION
  // ============================================================================
  private detectSignals(candles: Candle[], idx: number, ind: Indicators, regime: MarketRegime, hour: number): Signal[] {
    const signals: Signal[] = [];
    const c = candles[idx];
    const prev = idx > 0 ? candles[idx - 1] : c;

    // Only check strategies valid for current regime
    for (const [stratName, config] of Object.entries(STRATEGY_CONFIG)) {
      // Skip if strategy is disabled (weight = 0)
      const weight = this.state.strategyWeights[stratName] ?? 0;
      if (weight === 0) continue;

      // Skip if regime doesn't match
      if (!config.regimes.includes(regime)) continue;

      const signal = this.checkStrategy(stratName, candles, idx, ind, hour, c, prev);
      if (signal && signal.confidence && signal.direction && signal.strategy && signal.confidence >= config.minConfidence) {
        signals.push({
          strategy: signal.strategy,
          direction: signal.direction,
          confidence: signal.confidence,
          reason: signal.reason || '',
          weight,
          regime,
          entry: c.close,
          stopLoss: signal.direction === 'LONG' ? c.close - ind.atr * 1.5 : c.close + ind.atr * 1.5,
          takeProfit: signal.direction === 'LONG' ? c.close + ind.atr * 2.5 : c.close - ind.atr * 2.5
        });
      }
    }

    // Sort by weighted confidence
    return signals.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
  }

  private checkStrategy(
    strategy: string,
    candles: Candle[],
    idx: number,
    ind: Indicators,
    hour: number,
    c: Candle,
    prev: Candle
  ): Partial<Signal> | null {
    const { ema20, ema50, rsi, atr, atrAvg, vwap, vwapUpper, vwapLower, bollingerUpper, bollingerLower } = ind;

    switch (strategy) {
      case 'FAILED_BREAKOUT': {
        // Loosened: Don't require prev candle to close outside BB, just touch it
        if (prev.high > bollingerUpper) {
          if (c.close < bollingerUpper && c.close < c.open && rsi > 50) {
            return { strategy, direction: 'SHORT', confidence: 0.70, reason: 'Failed BB breakout above' };
          }
        }
        if (prev.low < bollingerLower) {
          if (c.close > bollingerLower && c.close > c.open && rsi < 50) {
            return { strategy, direction: 'LONG', confidence: 0.70, reason: 'Failed BB breakout below' };
          }
        }
        break;
      }

      case 'RANGE_FADE': {
        if (idx < 35) return null;
        const rangeHigh = Math.max(...candles.slice(idx - 25, idx).map(x => x.high));
        const rangeLow = Math.min(...candles.slice(idx - 25, idx).map(x => x.low));
        const rangeSize = rangeHigh - rangeLow;

        // Loosened conditions: 5% from extremes, RSI 55/45 instead of 62/38
        if (c.high >= rangeHigh - rangeSize * 0.05 && c.close < c.open && rsi > 55) {
          return { strategy, direction: 'SHORT', confidence: 0.64, reason: 'At range high with rejection' };
        }
        if (c.low <= rangeLow + rangeSize * 0.05 && c.close > c.open && rsi < 45) {
          return { strategy, direction: 'LONG', confidence: 0.64, reason: 'At range low with rejection' };
        }
        break;
      }

      case 'LIQUIDITY_SWEEP': {
        const recentLow = Math.min(...candles.slice(idx - 12, idx).map(x => x.low));
        const recentHigh = Math.max(...candles.slice(idx - 12, idx).map(x => x.high));
        const lowerWick = Math.min(c.open, c.close) - c.low;
        const upperWick = c.high - Math.max(c.open, c.close);
        const body = Math.abs(c.close - c.open);

        if (c.low < recentLow && lowerWick > body && lowerWick > atr * 0.4 && c.close > c.open) {
          return { strategy, direction: 'LONG', confidence: 0.72, reason: 'Liquidity sweep below with rejection' };
        }
        if (c.high > recentHigh && upperWick > body && upperWick > atr * 0.4 && c.close < c.open) {
          return { strategy, direction: 'SHORT', confidence: 0.72, reason: 'Liquidity sweep above with rejection' };
        }
        break;
      }

      case 'VWAP_DEVIATION': {
        // Loosened: RSI 48/52 instead of 42/58, touch tolerance 0.2% instead of 0.1%
        if (c.low <= vwapLower * 1.002 && c.close > vwapLower && c.close > c.open && rsi < 48) {
          return { strategy, direction: 'LONG', confidence: 0.63, reason: 'Bounce off lower VWAP band' };
        }
        if (c.high >= vwapUpper * 0.998 && c.close < vwapUpper && c.close < c.open && rsi > 52) {
          return { strategy, direction: 'SHORT', confidence: 0.63, reason: 'Rejection at upper VWAP band' };
        }
        break;
      }

      case 'CHOCH_REVERSAL': {
        const bodySize = Math.abs(c.close - c.open);
        if (rsi > 78 && bodySize > atr * 0.7 && c.close < c.open && prev.close > prev.open) {
          return { strategy, direction: 'SHORT', confidence: 0.62, reason: 'RSI exhaustion with reversal candle' };
        }
        if (rsi < 22 && bodySize > atr * 0.7 && c.close > c.open && prev.close < prev.open) {
          return { strategy, direction: 'LONG', confidence: 0.62, reason: 'RSI exhaustion with reversal candle' };
        }
        break;
      }

      case 'ORB_BREAKOUT': {
        if (hour < 10 || hour > 11) return null;
        const orbCandles = candles.slice(Math.max(0, idx - 8), idx);
        if (orbCandles.length < 4) return null;
        const orbHigh = Math.max(...orbCandles.map(x => x.high));
        const orbLow = Math.min(...orbCandles.map(x => x.low));
        const orbSize = orbHigh - orbLow;
        if (orbSize < atr * 0.4) return null;

        if (c.close > orbHigh + atr * 0.15 && c.close > c.open) {
          return { strategy, direction: 'LONG', confidence: 0.68, reason: 'ORB breakout above' };
        }
        if (c.close < orbLow - atr * 0.15 && c.close < c.open) {
          return { strategy, direction: 'SHORT', confidence: 0.68, reason: 'ORB breakout below' };
        }
        break;
      }

      case 'KILLZONE_REVERSAL': {
        const isKillzone = (hour >= 9 && hour <= 10) || (hour >= 14 && hour <= 15);
        if (!isKillzone) return null;
        const bodySize = Math.abs(c.close - c.open);
        if (rsi > 80 && c.close < c.open && bodySize > atr * 0.5) {
          return { strategy, direction: 'SHORT', confidence: 0.68, reason: 'Killzone RSI extreme reversal' };
        }
        if (rsi < 20 && c.close > c.open && bodySize > atr * 0.5) {
          return { strategy, direction: 'LONG', confidence: 0.68, reason: 'Killzone RSI extreme reversal' };
        }
        break;
      }

      case 'VOLATILITY_BREAKOUT': {
        if (atr >= atrAvg * 0.65) return null;
        const bodySize = Math.abs(c.close - c.open);
        if (c.close > bollingerUpper && bodySize > atr * 0.6 && c.close > c.open) {
          return { strategy, direction: 'LONG', confidence: 0.68, reason: 'Volatility squeeze breakout up' };
        }
        if (c.close < bollingerLower && bodySize > atr * 0.6 && c.close < c.open) {
          return { strategy, direction: 'SHORT', confidence: 0.68, reason: 'Volatility squeeze breakout down' };
        }
        break;
      }

      case 'TREND_PULLBACK': {
        const trendStrength = Math.abs(ema20 - ema50) / c.close;
        if (trendStrength < 0.002) return null;
        if (ema20 > ema50 && c.low <= ema20 * 1.002 && c.close > ema20 && c.close > c.open && rsi > 38 && rsi < 62) {
          return { strategy, direction: 'LONG', confidence: 0.68, reason: 'Pullback to EMA20 in uptrend' };
        }
        if (ema20 < ema50 && c.high >= ema20 * 0.998 && c.close < ema20 && c.close < c.open && rsi < 62 && rsi > 38) {
          return { strategy, direction: 'SHORT', confidence: 0.68, reason: 'Pullback to EMA20 in downtrend' };
        }
        break;
      }

      case 'BOS_CONTINUATION': {
        const trendStrength = Math.abs(ema20 - ema50) / c.close;
        if (trendStrength < 0.003) return null;
        const trend = ema20 > ema50 ? 'UP' : 'DOWN';
        const recentHigh = Math.max(...candles.slice(idx - 10, idx).map(x => x.high));
        const recentLow = Math.min(...candles.slice(idx - 10, idx).map(x => x.low));

        if (trend === 'UP' && c.high > recentHigh && c.close > c.open && rsi > 50 && rsi < 75) {
          return { strategy, direction: 'LONG', confidence: 0.68, reason: 'Break of structure continuation up' };
        }
        if (trend === 'DOWN' && c.low < recentLow && c.close < c.open && rsi < 50 && rsi > 25) {
          return { strategy, direction: 'SHORT', confidence: 0.68, reason: 'Break of structure continuation down' };
        }
        break;
      }

      case 'SESSION_REVERSION': {
        const distFromVwap = (c.close - vwap) / atr;
        if (distFromVwap > 3 && rsi > 72 && c.close < c.open) {
          return { strategy, direction: 'SHORT', confidence: 0.63, reason: 'Extreme VWAP deviation short' };
        }
        if (distFromVwap < -3 && rsi < 28 && c.close > c.open) {
          return { strategy, direction: 'LONG', confidence: 0.63, reason: 'Extreme VWAP deviation long' };
        }
        break;
      }
    }

    return null;
  }

  // ============================================================================
  // MAIN SIGNAL GENERATION
  // ============================================================================
  async generateSignal(candles: Candle[]): Promise<{
    signal: Signal | null;
    regime: MarketRegime;
    indicators: Indicators;
    allSignals: Signal[];
    state: LearningState;
  }> {
    if (!this.stateLoaded) {
      await this.loadState();
    }

    const idx = candles.length - 1;
    const ind = this.calculateIndicators(candles, idx);
    const regime = this.detectRegime(candles, idx, ind);
    const hour = candles[idx].hour;

    // Generate all signals
    const allSignals = this.detectSignals(candles, idx, ind, regime, hour);

    // Pick the best signal (highest weighted confidence)
    const signal = allSignals.length > 0 ? allSignals[0] : null;

    return {
      signal,
      regime,
      indicators: ind,
      allSignals,
      state: this.state
    };
  }

  // ============================================================================
  // LEARNING: Record trade outcome and adjust weights
  // ============================================================================
  async recordTradeOutcome(trade: Trade): Promise<void> {
    if (!this.stateLoaded) {
      await this.loadState();
    }

    // Add to recent trades
    this.state.recentTrades.unshift(trade);
    if (this.state.recentTrades.length > 100) {
      this.state.recentTrades = this.state.recentTrades.slice(0, 100);
    }

    // Update regime-specific performance
    if (!this.state.regimePerformance[trade.regime]) {
      this.state.regimePerformance[trade.regime] = {};
    }
    if (!this.state.regimePerformance[trade.regime][trade.strategy]) {
      this.state.regimePerformance[trade.regime][trade.strategy] = { trades: 0, wins: 0, totalPnl: 0 };
    }

    const perf = this.state.regimePerformance[trade.regime][trade.strategy];
    perf.trades++;
    if (trade.pnl && trade.pnl > 0) perf.wins++;
    perf.totalPnl += trade.pnl || 0;

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (!this.state.dailyStats[today]) {
      this.state.dailyStats[today] = { trades: 0, pnl: 0 };
    }
    this.state.dailyStats[today].trades++;
    this.state.dailyStats[today].pnl += trade.pnl || 0;

    // ADAPTIVE LEARNING: Calculate SUGGESTED weight based on performance
    // IMPORTANT: This updates PENDING weights only - NOT active weights
    // Active weights are ONLY changed after Monte Carlo validation
    if (perf.trades >= this.state.minTradesForAdjustment) {
      const winRate = perf.wins / perf.trades;
      const currentPendingWeight = this.state.pendingWeights[trade.strategy] || 0.5;

      // Target weight based on win rate
      let targetWeight: number;
      if (winRate >= 0.55) targetWeight = 1.0;
      else if (winRate >= 0.50) targetWeight = 0.8;
      else if (winRate >= 0.45) targetWeight = 0.5;
      else if (winRate >= 0.40) targetWeight = 0.3;
      else targetWeight = 0.0;  // Disable if <40%

      // Gradual adjustment to PENDING weights only
      const newPendingWeight = currentPendingWeight + this.state.learningRate * (targetWeight - currentPendingWeight);
      this.state.pendingWeights[trade.strategy] = Math.max(0, Math.min(1, newPendingWeight));

      // Check if pending differs from active (needs validation)
      const activeWeight = this.state.strategyWeights[trade.strategy] || 0.5;
      if (Math.abs(newPendingWeight - activeWeight) > 0.1) {
        this.state.pendingValidation = true;
        console.log(`[Adaptive] ${trade.strategy}: Live performance WR=${(winRate * 100).toFixed(1)}%`);
        console.log(`[Adaptive] PENDING weight: ${(newPendingWeight * 100).toFixed(0)}% (active: ${(activeWeight * 100).toFixed(0)}%)`);
        console.log(`[Adaptive] ⚠️ REQUIRES MONTE CARLO VALIDATION before applying to live trading`);
      }
    }

    // Save state
    await this.saveState();
  }

  // ============================================================================
  // VALIDATION: Apply pending weights ONLY after Monte Carlo testing passes
  // ============================================================================
  async applyValidatedWeights(validationResults: {
    strategy: string;
    passedValidation: boolean;
    testResults: {
      winRate: number;
      profitFactor: number;
      consistency: number;
      totalPnL: number;
    };
  }[]): Promise<{
    applied: string[];
    rejected: string[];
    message: string;
  }> {
    if (!this.stateLoaded) {
      await this.loadState();
    }

    const applied: string[] = [];
    const rejected: string[] = [];

    for (const result of validationResults) {
      const { strategy, passedValidation, testResults } = result;

      if (passedValidation) {
        // Apply the pending weight to active weights
        const pendingWeight = this.state.pendingWeights[strategy] || 0.5;
        this.state.strategyWeights[strategy] = pendingWeight;
        applied.push(`${strategy}: ${(pendingWeight * 100).toFixed(0)}% (WR: ${(testResults.winRate * 100).toFixed(1)}%, PF: ${testResults.profitFactor.toFixed(2)})`);
        console.log(`[Adaptive] ✅ VALIDATED: ${strategy} weight updated to ${(pendingWeight * 100).toFixed(0)}%`);
      } else {
        // Revert pending to active (don't apply the change)
        this.state.pendingWeights[strategy] = this.state.strategyWeights[strategy] || 0.5;
        rejected.push(`${strategy}: Failed validation (WR: ${(testResults.winRate * 100).toFixed(1)}%, Consistency: ${(testResults.consistency * 100).toFixed(0)}%)`);
        console.log(`[Adaptive] ❌ REJECTED: ${strategy} - failed Monte Carlo validation`);
      }
    }

    // Update validation status
    this.state.pendingValidation = false;
    this.state.lastValidationTime = new Date().toISOString();

    await this.saveState();

    return {
      applied,
      rejected,
      message: `Applied ${applied.length} changes, rejected ${rejected.length}`
    };
  }

  // Get pending changes that need validation
  getPendingChanges(): {
    hasPending: boolean;
    changes: Array<{ strategy: string; activeWeight: number; pendingWeight: number; difference: number }>;
  } {
    const changes: Array<{ strategy: string; activeWeight: number; pendingWeight: number; difference: number }> = [];

    for (const [strategy, pendingWeight] of Object.entries(this.state.pendingWeights)) {
      const activeWeight = this.state.strategyWeights[strategy] || 0.5;
      const difference = pendingWeight - activeWeight;

      if (Math.abs(difference) > 0.05) {  // More than 5% difference
        changes.push({
          strategy,
          activeWeight,
          pendingWeight,
          difference
        });
      }
    }

    return {
      hasPending: changes.length > 0,
      changes: changes.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    };
  }

  // ============================================================================
  // GET STATUS
  // ============================================================================
  getStatus(): {
    weights: Record<string, number>;
    pendingWeights: Record<string, number>;
    recentPerformance: { trades: number; wins: number; pnl: number };
    activeStrategies: string[];
    disabledStrategies: string[];
    pendingValidation: boolean;
    lastValidationTime: string | null;
    pendingChanges: Array<{ strategy: string; activeWeight: number; pendingWeight: number; difference: number }>;
  } {
    const activeStrategies = Object.entries(this.state.strategyWeights)
      .filter(([_, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const disabledStrategies = Object.entries(this.state.strategyWeights)
      .filter(([_, w]) => w === 0)
      .map(([name]) => name);

    const recentTrades = this.state.recentTrades.slice(0, 20);
    const recentPerformance = {
      trades: recentTrades.length,
      wins: recentTrades.filter(t => t.pnl && t.pnl > 0).length,
      pnl: recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    };

    const pendingChanges = this.getPendingChanges();

    return {
      weights: this.state.strategyWeights,
      pendingWeights: this.state.pendingWeights,
      recentPerformance,
      activeStrategies,
      disabledStrategies,
      pendingValidation: this.state.pendingValidation,
      lastValidationTime: this.state.lastValidationTime,
      pendingChanges: pendingChanges.changes
    };
  }
}

// Export singleton instance
export const adaptiveLearningSystem = new AdaptiveLearningSystem();
