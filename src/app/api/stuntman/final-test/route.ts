/**
 * FINAL STRATEGY TEST
 *
 * Testing:
 * 1. INVERSE strategies (fade common signals)
 * 2. SCALP strategies (tight targets, high win rate)
 * 3. WAIT strategy (only trade perfect setups)
 */

import { NextResponse } from 'next/server';

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }

async function fetchData(): Promise<Candle[]> {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (60 * 24 * 60 * 60);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startTime}&period2=${endTime}&interval=5m`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await response.json();
  const result = data.chart?.result?.[0];
  if (!result?.timestamp) throw new Error('No data');

  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const q = result.indicators.quote[0];
    if (q.open[i] && q.high[i] && q.low[i] && q.close[i]) {
      candles.push({ time: result.timestamp[i] * 1000, open: q.open[i] * 10, high: q.high[i] * 10, low: q.low[i] * 10, close: q.close[i] * 10, volume: q.volume[i] || 1000 });
    }
  }
  return candles;
}

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
    if (change > 0) gains += change; else losses -= change;
  }
  return losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
}

function atr(candles: Candle[], period: number): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

interface Signal { direction: 'LONG' | 'SHORT'; entry: number; stopLoss: number; takeProfit: number; }

// INVERSE RSI - Fade RSI extremes (when everyone is bullish, go short)
function strategy_InverseRSI(candles: Candle[]): Signal | null {
  if (candles.length < 30) return null;
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const r = rsi(closes, 14);
  const a = atr(candles, 14);

  // SHORT when RSI is high (everyone bullish - fade it)
  if (r > 65) {
    return { direction: 'SHORT', entry: c.close, stopLoss: c.close + a * 1, takeProfit: c.close - a * 0.8 };
  }
  // LONG when RSI is low (everyone bearish - fade it)
  if (r < 35) {
    return { direction: 'LONG', entry: c.close, stopLoss: c.close - a * 1, takeProfit: c.close + a * 0.8 };
  }
  return null;
}

// SCALP - Very tight targets, trade with micro-momentum
function strategy_Scalp(candles: Candle[]): Signal | null {
  if (candles.length < 10) return null;
  const c = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const a = atr(candles, 14);

  // LONG: Two consecutive green candles
  if (c.close > c.open && prev.close > prev.open && c.close > prev.close) {
    return { direction: 'LONG', entry: c.close, stopLoss: c.close - a * 0.5, takeProfit: c.close + a * 0.4 };
  }
  // SHORT: Two consecutive red candles
  if (c.close < c.open && prev.close < prev.open && c.close < prev.close) {
    return { direction: 'SHORT', entry: c.close, stopLoss: c.close + a * 0.5, takeProfit: c.close - a * 0.4 };
  }
  return null;
}

// WAIT - Only trade when EVERYTHING aligns perfectly
function strategy_Wait(candles: Candle[]): Signal | null {
  if (candles.length < 60) return null;
  const closes = candles.map(c => c.close);
  const c = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(candles, 14);

  const avgVol = candles.slice(-21, -1).reduce((sum, x) => sum + x.volume, 0) / 20;
  const highVol = c.volume > avgVol * 1.3;

  // Perfect LONG: Uptrend + pullback + bounce + volume + RSI confirms
  if (ema20 > ema50 && prev.low <= ema20 * 1.005 && c.close > ema20 && c.close > c.open && r > 45 && r < 65 && highVol) {
    return { direction: 'LONG', entry: c.close, stopLoss: prev.low - a * 0.3, takeProfit: c.close + a * 1.5 };
  }

  // Perfect SHORT: Downtrend + pullback + rejection + volume + RSI confirms
  if (ema20 < ema50 && prev.high >= ema20 * 0.995 && c.close < ema20 && c.close < c.open && r > 35 && r < 55 && highVol) {
    return { direction: 'SHORT', entry: c.close, stopLoss: prev.high + a * 0.3, takeProfit: c.close - a * 1.5 };
  }

  return null;
}

// MEAN REVERT - Trade back to VWAP
function strategy_MeanRevert(candles: Candle[]): Signal | null {
  if (candles.length < 80) return null;
  const c = candles[candles.length - 1];
  const a = atr(candles, 14);

  // Calculate VWAP
  let tpv = 0, vol = 0;
  for (const x of candles.slice(-78)) {
    const tp = (x.high + x.low + x.close) / 3;
    tpv += tp * x.volume;
    vol += x.volume;
  }
  const vwap = vol > 0 ? tpv / vol : c.close;

  // LONG: Price significantly below VWAP, reversal candle
  const distFromVwap = (c.close - vwap) / vwap * 100;
  if (distFromVwap < -0.3 && c.close > c.open) {
    return { direction: 'LONG', entry: c.close, stopLoss: c.close - a * 0.8, takeProfit: vwap };
  }
  // SHORT: Price significantly above VWAP, reversal candle
  if (distFromVwap > 0.3 && c.close < c.open) {
    return { direction: 'SHORT', entry: c.close, stopLoss: c.close + a * 0.8, takeProfit: vwap };
  }
  return null;
}

// MOMENTUM CONTINUATION - Trade strong moves
function strategy_MomentumCont(candles: Candle[]): Signal | null {
  if (candles.length < 30) return null;
  const c = candles[candles.length - 1];
  const closes = candles.map(x => x.close);
  const a = atr(candles, 14);
  const ema9 = ema(closes, 9);
  const ema20 = ema(closes, 20);

  // Strong momentum: EMA9 > EMA20 by significant margin
  const emaDiff = (ema9 - ema20) / ema20 * 100;

  if (emaDiff > 0.15 && c.close > ema9) {
    return { direction: 'LONG', entry: c.close, stopLoss: ema20, takeProfit: c.close + a * 1.5 };
  }
  if (emaDiff < -0.15 && c.close < ema9) {
    return { direction: 'SHORT', entry: c.close, stopLoss: ema20, takeProfit: c.close - a * 1.5 };
  }
  return null;
}

function backtest(candles: Candle[], strategyFn: (c: Candle[]) => Signal | null): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;

  for (let i = 80; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];

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
        const tradePnl = (position.direction === 'LONG' ? exit - position.entry : position.entry - exit) * 50 - 16.62;
        pnl += tradePnl;
        trades++;
        if (tradePnl > 0) wins++;
        position = null;
      }
    }

    if (!position) {
      const signal = strategyFn(slice);
      if (signal) position = signal;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

function rollingTest(candles: Candle[], strategyFn: (c: Candle[]) => Signal | null): { totalPnl: number; consistency: number; profitableWindows: number; totalWindows: number } {
  const windowSize = 500;
  const stepSize = 200;
  let totalPnl = 0, profitableWindows = 0, totalWindows = 0;

  for (let start = 0; start + windowSize <= candles.length; start += stepSize) {
    const result = backtest(candles.slice(start, start + windowSize), strategyFn);
    totalPnl += result.pnl;
    totalWindows++;
    if (result.pnl > 0) profitableWindows++;
  }

  return {
    totalPnl: Math.round(totalPnl * 100) / 100,
    consistency: Math.round((profitableWindows / totalWindows) * 1000) / 10,
    profitableWindows,
    totalWindows
  };
}

export async function GET() {
  try {
    console.log('[FinalTest] Fetching data...');
    const candles = await fetchData();
    console.log(`[FinalTest] Got ${candles.length} candles`);

    const strategies: { name: string; fn: (c: Candle[]) => Signal | null }[] = [
      { name: 'INVERSE_RSI', fn: strategy_InverseRSI },
      { name: 'SCALP', fn: strategy_Scalp },
      { name: 'WAIT', fn: strategy_Wait },
      { name: 'MEAN_REVERT', fn: strategy_MeanRevert },
      { name: 'MOMENTUM_CONT', fn: strategy_MomentumCont }
    ];

    const results: { name: string; totalPnl: number; consistency: number; profitableWindows: number; totalWindows: number; verdict: string; fullBacktest: { trades: number; wins: number; winRate: number; pnl: number } }[] = [];

    for (const { name, fn } of strategies) {
      console.log(`[FinalTest] Testing ${name}...`);
      const rolling = rollingTest(candles, fn);
      const full = backtest(candles, fn);

      let verdict = 'AVOID';
      if (rolling.consistency >= 55 && rolling.totalPnl > 0) verdict = 'CONSISTENT';
      else if (rolling.consistency >= 45 || rolling.totalPnl > 0) verdict = 'MARGINAL';

      results.push({
        name,
        ...rolling,
        verdict,
        fullBacktest: { trades: full.trades, wins: full.wins, winRate: full.trades > 0 ? Math.round((full.wins / full.trades) * 1000) / 10 : 0, pnl: full.pnl }
      });
    }

    results.sort((a, b) => b.consistency - a.consistency);

    const consistent = results.filter(r => r.verdict === 'CONSISTENT');
    const marginal = results.filter(r => r.verdict === 'MARGINAL');

    return NextResponse.json({
      success: true,
      totalCandles: candles.length,
      results,
      summary: {
        consistentStrategies: consistent.map(s => ({ name: s.name, consistency: s.consistency, pnl: s.totalPnl })),
        marginalStrategies: marginal.map(s => ({ name: s.name, consistency: s.consistency, pnl: s.totalPnl })),
        bestOption: results[0],
        recommendation: consistent.length > 0
          ? `USE: ${consistent.map(s => s.name).join(', ')}`
          : marginal.length > 0
          ? `CONSIDER WITH CAUTION: ${marginal[0].name} (${marginal[0].consistency}% consistency)`
          : 'Market conditions unfavorable for systematic trading'
      }
    });
  } catch (error) {
    console.error('[FinalTest] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
