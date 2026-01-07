/**
 * STRATEGY FINDER
 *
 * Tests MANY different strategy variations to find ones that pass
 * rolling walk-forward validation. We need MULTIPLE consistent strategies.
 */

import { NextResponse } from 'next/server';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch data
async function fetchRealData(days: number = 60): Promise<Candle[]> {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (days * 24 * 60 * 60);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startTime}&period2=${endTime}&interval=5m`;

  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result || !result.timestamp) throw new Error('Failed to fetch data');

  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const q = result.indicators.quote[0];
    if (q.open[i] && q.high[i] && q.low[i] && q.close[i]) {
      candles.push({
        time: result.timestamp[i] * 1000,
        open: q.open[i] * 10,
        high: q.high[i] * 10,
        low: q.low[i] * 10,
        close: q.close[i] * 10,
        volume: q.volume[i] || 1000
      });
    }
  }
  return candles;
}

// Indicators
function ema(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let e = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) e = prices[i] * k + e * (1 - k);
  return e;
}

function rsi(prices: number[], period: number): number {
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - (100 / (1 + rs));
}

function atr(candles: Candle[], period: number): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function bollinger(prices: number[], period: number = 20, mult: number = 2) {
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.map(v => Math.pow(v - middle, 2)).reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: middle + stdDev * mult, middle, lower: middle - stdDev * mult };
}

// Strategy definitions - each returns { signal: 'LONG'|'SHORT'|null, sl, tp }
interface Signal { direction: 'LONG' | 'SHORT'; stopLoss: number; takeProfit: number; entry: number; }

// STRATEGY 1: SIMPLE_TREND (already proven 69.2% consistent)
function strategy_SimpleTrend(candles: Candle[], prevRsi: number): { signal: Signal | null; newRsi: number } {
  if (candles.length < 60) return { signal: null, newRsi: prevRsi };
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const ema50 = ema(closes, 50);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  if (c.close > ema50 && currentRsi > 50 && prevRsi <= 50) {
    return { signal: { direction: 'LONG', entry: c.close, stopLoss: c.close - currentAtr * 2, takeProfit: c.close + currentAtr * 3 }, newRsi: currentRsi };
  }
  if (c.close < ema50 && currentRsi < 50 && prevRsi >= 50) {
    return { signal: { direction: 'SHORT', entry: c.close, stopLoss: c.close + currentAtr * 2, takeProfit: c.close - currentAtr * 3 }, newRsi: currentRsi };
  }
  return { signal: null, newRsi: currentRsi };
}

// STRATEGY 2: MOMENTUM_RSI - Enter on RSI momentum shift with trend filter
function strategy_MomentumRsi(candles: Candle[], prevRsi: number): { signal: Signal | null; newRsi: number } {
  if (candles.length < 60) return { signal: null, newRsi: prevRsi };
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const ema20 = ema(closes, 20);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  // LONG: Price > EMA20, RSI was below 40, now above 45 (momentum building)
  if (c.close > ema20 && prevRsi < 40 && currentRsi > 45) {
    return { signal: { direction: 'LONG', entry: c.close, stopLoss: c.close - currentAtr * 1.5, takeProfit: c.close + currentAtr * 2.5 }, newRsi: currentRsi };
  }
  // SHORT: Price < EMA20, RSI was above 60, now below 55
  if (c.close < ema20 && prevRsi > 60 && currentRsi < 55) {
    return { signal: { direction: 'SHORT', entry: c.close, stopLoss: c.close + currentAtr * 1.5, takeProfit: c.close - currentAtr * 2.5 }, newRsi: currentRsi };
  }
  return { signal: null, newRsi: currentRsi };
}

// STRATEGY 3: PULLBACK_EMA - Trade pullbacks to EMA in trending market
function strategy_PullbackEma(candles: Candle[]): Signal | null {
  if (candles.length < 60) return null;
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const ema9 = ema(closes, 9);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  // Uptrend: EMA9 > EMA20 > EMA50
  if (ema9 > ema20 && ema20 > ema50) {
    // Pullback: Previous low touched EMA20, now bouncing
    if (prev.low <= ema20 * 1.003 && c.close > ema20 && c.close > c.open && currentRsi > 40) {
      return { direction: 'LONG', entry: c.close, stopLoss: prev.low - currentAtr * 0.5, takeProfit: c.close + currentAtr * 2 };
    }
  }

  // Downtrend: EMA9 < EMA20 < EMA50
  if (ema9 < ema20 && ema20 < ema50) {
    // Pullback: Previous high touched EMA20, now rejecting
    if (prev.high >= ema20 * 0.997 && c.close < ema20 && c.close < c.open && currentRsi < 60) {
      return { direction: 'SHORT', entry: c.close, stopLoss: prev.high + currentAtr * 0.5, takeProfit: c.close - currentAtr * 2 };
    }
  }

  return null;
}

// STRATEGY 4: BOLLINGER_MEAN_REVERSION - Trade bounces off Bollinger bands
function strategy_BollingerReversion(candles: Candle[]): Signal | null {
  if (candles.length < 30) return null;
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const bb = bollinger(closes, 20, 2);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  // LONG: Price touched lower band, now bouncing, RSI oversold
  if (c.low <= bb.lower && c.close > bb.lower && c.close > c.open && currentRsi < 35) {
    return { direction: 'LONG', entry: c.close, stopLoss: bb.lower - currentAtr * 0.5, takeProfit: bb.middle };
  }

  // SHORT: Price touched upper band, now rejecting, RSI overbought
  if (c.high >= bb.upper && c.close < bb.upper && c.close < c.open && currentRsi > 65) {
    return { direction: 'SHORT', entry: c.close, stopLoss: bb.upper + currentAtr * 0.5, takeProfit: bb.middle };
  }

  return null;
}

// STRATEGY 5: DOUBLE_EMA - Trade when short EMA crosses above/below long EMA with momentum
function strategy_DoubleEma(candles: Candle[], prevEma9: number, prevEma21: number): { signal: Signal | null; newEma9: number; newEma21: number } {
  if (candles.length < 30) return { signal: null, newEma9: 0, newEma21: 0 };
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const currentEma9 = ema(closes, 9);
  const currentEma21 = ema(closes, 21);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  // LONG: EMA9 crossed above EMA21, RSI confirms
  if (currentEma9 > currentEma21 && prevEma9 <= prevEma21 && currentRsi > 50) {
    return { signal: { direction: 'LONG', entry: c.close, stopLoss: c.close - currentAtr * 2, takeProfit: c.close + currentAtr * 3 }, newEma9: currentEma9, newEma21: currentEma21 };
  }

  // SHORT: EMA9 crossed below EMA21, RSI confirms
  if (currentEma9 < currentEma21 && prevEma9 >= prevEma21 && currentRsi < 50) {
    return { signal: { direction: 'SHORT', entry: c.close, stopLoss: c.close + currentAtr * 2, takeProfit: c.close - currentAtr * 3 }, newEma9: currentEma9, newEma21: currentEma21 };
  }

  return { signal: null, newEma9: currentEma9, newEma21: currentEma21 };
}

// STRATEGY 6: RANGE_BREAK - Trade breakouts from consolidation
function strategy_RangeBreak(candles: Candle[]): Signal | null {
  if (candles.length < 30) return null;
  const c = candles[candles.length - 1];
  const recent = candles.slice(-21, -1);
  const rangeHigh = Math.max(...recent.map(x => x.high));
  const rangeLow = Math.min(...recent.map(x => x.low));
  const range = rangeHigh - rangeLow;
  const currentAtr = atr(candles, 14);

  // Only trade if range is tight (consolidation)
  if (range > currentAtr * 4) return null;

  const avgVolume = recent.reduce((sum, x) => sum + x.volume, 0) / 20;

  // LONG: Break above range with volume
  if (c.close > rangeHigh && c.volume > avgVolume * 1.5) {
    return { direction: 'LONG', entry: c.close, stopLoss: rangeLow, takeProfit: c.close + range };
  }

  // SHORT: Break below range with volume
  if (c.close < rangeLow && c.volume > avgVolume * 1.5) {
    return { direction: 'SHORT', entry: c.close, stopLoss: rangeHigh, takeProfit: c.close - range };
  }

  return null;
}

// STRATEGY 7: TREND_STRENGTH - Only trade when trend is very strong (ADX-like logic)
function strategy_TrendStrength(candles: Candle[]): Signal | null {
  if (candles.length < 60) return null;
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const ema10 = ema(closes, 10);
  const ema30 = ema(closes, 30);
  const ema50 = ema(closes, 50);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);

  // Calculate trend strength: how aligned are the EMAs?
  const emaDiff = Math.abs((ema10 - ema30) / ema30 * 100);

  // Only trade strong trends (EMAs well separated)
  if (emaDiff < 0.3) return null;

  // Strong uptrend
  if (ema10 > ema30 && ema30 > ema50 && c.close > ema10 && currentRsi > 55) {
    return { direction: 'LONG', entry: c.close, stopLoss: ema30, takeProfit: c.close + currentAtr * 2.5 };
  }

  // Strong downtrend
  if (ema10 < ema30 && ema30 < ema50 && c.close < ema10 && currentRsi < 45) {
    return { direction: 'SHORT', entry: c.close, stopLoss: ema30, takeProfit: c.close - currentAtr * 2.5 };
  }

  return null;
}

// STRATEGY 8: MORNING_MOMENTUM - Trade first hour momentum
function strategy_MorningMomentum(candles: Candle[]): Signal | null {
  if (candles.length < 30) return null;
  const c = candles[candles.length - 1];
  const candleTime = new Date(c.time);
  const hour = candleTime.getUTCHours() - 5; // EST

  // Only trade between 9:30-10:30 EST
  if (hour !== 9 && hour !== 10) return null;
  if (hour === 10 && candleTime.getUTCMinutes() > 30) return null;

  const closes = candles.map(x => x.close);
  const currentRsi = rsi(closes, 14);
  const currentAtr = atr(candles, 14);
  const ema20 = ema(closes, 20);

  // Morning bullish momentum
  if (c.close > ema20 && currentRsi > 55 && c.close > c.open) {
    return { direction: 'LONG', entry: c.close, stopLoss: c.close - currentAtr * 1.5, takeProfit: c.close + currentAtr * 2 };
  }

  // Morning bearish momentum
  if (c.close < ema20 && currentRsi < 45 && c.close < c.open) {
    return { direction: 'SHORT', entry: c.close, stopLoss: c.close + currentAtr * 1.5, takeProfit: c.close - currentAtr * 2 };
  }

  return null;
}

// Backtest a strategy on a window of candles
function backtest(
  candles: Candle[],
  strategyName: string,
  state: { prevRsi: number; prevEma9: number; prevEma21: number }
): { pnl: number; trades: number; wins: number; newState: typeof state } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;
  const COST = 16.62; // Commission + slippage

  let { prevRsi, prevEma9, prevEma21 } = state;

  for (let i = 60; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];

    // Check exit
    if (position) {
      let exit: number | null = null;
      if (position.direction === 'LONG') {
        if (c.low <= position.stopLoss) exit = position.stopLoss;
        else if (c.high >= position.takeProfit) exit = position.takeProfit;
      } else {
        if (c.high >= position.stopLoss) exit = position.stopLoss;
        else if (c.low <= position.takeProfit) exit = position.takeProfit;
      }

      if (exit !== null) {
        const tradePnl = (position.direction === 'LONG' ? exit - position.entry : position.entry - exit) * 50 - COST;
        pnl += tradePnl;
        trades++;
        if (tradePnl > 0) wins++;
        position = null;
      }
    }

    // Check entry
    if (!position) {
      let signal: Signal | null = null;

      switch (strategyName) {
        case 'SIMPLE_TREND': {
          const result = strategy_SimpleTrend(slice, prevRsi);
          signal = result.signal;
          prevRsi = result.newRsi;
          break;
        }
        case 'MOMENTUM_RSI': {
          const result = strategy_MomentumRsi(slice, prevRsi);
          signal = result.signal;
          prevRsi = result.newRsi;
          break;
        }
        case 'PULLBACK_EMA':
          signal = strategy_PullbackEma(slice);
          break;
        case 'BOLLINGER_REVERSION':
          signal = strategy_BollingerReversion(slice);
          break;
        case 'DOUBLE_EMA': {
          const result = strategy_DoubleEma(slice, prevEma9, prevEma21);
          signal = result.signal;
          prevEma9 = result.newEma9;
          prevEma21 = result.newEma21;
          break;
        }
        case 'RANGE_BREAK':
          signal = strategy_RangeBreak(slice);
          break;
        case 'TREND_STRENGTH':
          signal = strategy_TrendStrength(slice);
          break;
        case 'MORNING_MOMENTUM':
          signal = strategy_MorningMomentum(slice);
          break;
      }

      if (signal) position = signal;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins, newState: { prevRsi, prevEma9, prevEma21 } };
}

// Rolling walk-forward test
function rollingWalkForward(candles: Candle[], strategyName: string): {
  totalPnl: number;
  profitableWindows: number;
  totalWindows: number;
  consistency: number;
} {
  const windowSize = 500;
  const stepSize = 200;

  let totalPnl = 0;
  let profitableWindows = 0;
  let totalWindows = 0;

  for (let start = 0; start + windowSize <= candles.length; start += stepSize) {
    const windowCandles = candles.slice(start, start + windowSize);
    const result = backtest(windowCandles, strategyName, { prevRsi: 50, prevEma9: 0, prevEma21: 0 });

    totalPnl += result.pnl;
    totalWindows++;
    if (result.pnl > 0) profitableWindows++;
  }

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    profitableWindows,
    totalWindows,
    consistency: Math.round((profitableWindows / totalWindows) * 1000) / 10
  };
}

export async function GET() {
  try {
    console.log('[FindConsistent] Fetching 60 days of REAL data...');
    const candles = await fetchRealData(60);
    console.log(`[FindConsistent] Got ${candles.length} candles`);

    const strategies = [
      'SIMPLE_TREND',
      'MOMENTUM_RSI',
      'PULLBACK_EMA',
      'BOLLINGER_REVERSION',
      'DOUBLE_EMA',
      'RANGE_BREAK',
      'TREND_STRENGTH',
      'MORNING_MOMENTUM'
    ];

    const results: {
      strategy: string;
      totalPnl: number;
      profitableWindows: number;
      totalWindows: number;
      consistency: number;
      verdict: 'CONSISTENT' | 'MARGINAL' | 'AVOID';
    }[] = [];

    for (const strategy of strategies) {
      console.log(`[FindConsistent] Testing ${strategy}...`);
      const { totalPnl, profitableWindows, totalWindows, consistency } = rollingWalkForward(candles, strategy);

      let verdict: 'CONSISTENT' | 'MARGINAL' | 'AVOID';
      if (consistency >= 55 && totalPnl > 0) {
        verdict = 'CONSISTENT';
      } else if (consistency >= 40 || totalPnl > 0) {
        verdict = 'MARGINAL';
      } else {
        verdict = 'AVOID';
      }

      results.push({ strategy, totalPnl, profitableWindows, totalWindows, consistency, verdict });
    }

    // Sort by consistency
    results.sort((a, b) => b.consistency - a.consistency);

    const consistent = results.filter(r => r.verdict === 'CONSISTENT');
    const marginal = results.filter(r => r.verdict === 'MARGINAL');

    return NextResponse.json({
      success: true,
      dataSource: 'Yahoo Finance SPY (60 days)',
      totalCandles: candles.length,
      results,
      summary: {
        consistentStrategies: consistent.map(s => ({ name: s.strategy, consistency: s.consistency, pnl: s.totalPnl })),
        marginalStrategies: marginal.map(s => ({ name: s.strategy, consistency: s.consistency, pnl: s.totalPnl })),
        recommendation: consistent.length >= 2
          ? `USE THESE STRATEGIES: ${consistent.map(s => s.strategy).join(', ')}`
          : consistent.length === 1
          ? `Only ${consistent[0].strategy} is consistent. Consider marginal: ${marginal.slice(0, 2).map(s => s.strategy).join(', ')}`
          : 'No consistently profitable strategies found'
      }
    });
  } catch (error) {
    console.error('[FindConsistent] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
