/**
 * ENSEMBLE STRATEGY TESTER
 *
 * Only trades when MULTIPLE independent signals agree.
 * This filters out noise and only takes high-conviction trades.
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

async function fetchRealData(): Promise<Candle[]> {
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
      candles.push({
        time: result.timestamp[i] * 1000,
        open: q.open[i] * 10, high: q.high[i] * 10, low: q.low[i] * 10, close: q.close[i] * 10, volume: q.volume[i] || 1000
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

function bollinger(prices: number[], period: number = 20) {
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(slice.map(v => Math.pow(v - middle, 2)).reduce((a, b) => a + b, 0) / period);
  return { upper: middle + stdDev * 2, middle, lower: middle - stdDev * 2 };
}

// Individual signal checkers - return 1 for LONG, -1 for SHORT, 0 for neutral
function signal_Trend(candles: Candle[]): number {
  const closes = candles.map(c => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const c = closes[closes.length - 1];
  if (c > ema20 && ema20 > ema50) return 1;
  if (c < ema20 && ema20 < ema50) return -1;
  return 0;
}

function signal_RSI(candles: Candle[]): number {
  const closes = candles.map(c => c.close);
  const r = rsi(closes, 14);
  if (r > 50 && r < 70) return 1;
  if (r < 50 && r > 30) return -1;
  return 0;
}

function signal_Momentum(candles: Candle[]): number {
  const c = candles[candles.length - 1];
  const prev5 = candles.slice(-6, -1);
  const avgClose = prev5.reduce((sum, x) => sum + x.close, 0) / 5;
  if (c.close > avgClose * 1.002) return 1;
  if (c.close < avgClose * 0.998) return -1;
  return 0;
}

function signal_Candle(candles: Candle[]): number {
  const c = candles[candles.length - 1];
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  if (range === 0) return 0;
  const bodyRatio = body / range;
  if (c.close > c.open && bodyRatio > 0.6) return 1;
  if (c.close < c.open && bodyRatio > 0.6) return -1;
  return 0;
}

function signal_Volume(candles: Candle[]): number {
  const c = candles[candles.length - 1];
  const avgVol = candles.slice(-21, -1).reduce((sum, x) => sum + x.volume, 0) / 20;
  if (c.volume > avgVol * 1.3) {
    return c.close > c.open ? 1 : c.close < c.open ? -1 : 0;
  }
  return 0;
}

function signal_BB(candles: Candle[]): number {
  const closes = candles.map(c => c.close);
  const bb = bollinger(closes, 20);
  const c = closes[closes.length - 1];
  if (c < bb.lower * 1.01) return 1;
  if (c > bb.upper * 0.99) return -1;
  return 0;
}

// Get ensemble signal - only trade when N+ signals agree
function getEnsembleSignal(candles: Candle[], minAgreement: number): { direction: 'LONG' | 'SHORT' | null; score: number } {
  const signals = [
    signal_Trend(candles),
    signal_RSI(candles),
    signal_Momentum(candles),
    signal_Candle(candles),
    signal_Volume(candles),
    signal_BB(candles)
  ];

  const longVotes = signals.filter(s => s === 1).length;
  const shortVotes = signals.filter(s => s === -1).length;

  if (longVotes >= minAgreement && longVotes > shortVotes) {
    return { direction: 'LONG', score: longVotes };
  }
  if (shortVotes >= minAgreement && shortVotes > longVotes) {
    return { direction: 'SHORT', score: shortVotes };
  }
  return { direction: null, score: 0 };
}

// Backtest ensemble with different agreement thresholds
function backtestEnsemble(candles: Candle[], minAgreement: number): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: { direction: 'LONG' | 'SHORT'; entry: number; stopLoss: number; takeProfit: number } | null = null;

  for (let i = 60; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];
    const currentAtr = atr(slice, 14);

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
        const tradePnl = (position.direction === 'LONG' ? exit - position.entry : position.entry - exit) * 50 - 16.62;
        pnl += tradePnl;
        trades++;
        if (tradePnl > 0) wins++;
        position = null;
      }
    }

    // Check entry
    if (!position) {
      const { direction } = getEnsembleSignal(slice, minAgreement);
      if (direction) {
        position = {
          direction,
          entry: c.close,
          stopLoss: direction === 'LONG' ? c.close - currentAtr * 1.5 : c.close + currentAtr * 1.5,
          takeProfit: direction === 'LONG' ? c.close + currentAtr * 2 : c.close - currentAtr * 2
        };
      }
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

// Rolling validation
function rollingValidation(candles: Candle[], minAgreement: number): { totalPnl: number; consistency: number; profitableWindows: number; totalWindows: number } {
  const windowSize = 500;
  const stepSize = 200;
  let totalPnl = 0, profitableWindows = 0, totalWindows = 0;

  for (let start = 0; start + windowSize <= candles.length; start += stepSize) {
    const result = backtestEnsemble(candles.slice(start, start + windowSize), minAgreement);
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
    console.log('[EnsembleTest] Fetching data...');
    const candles = await fetchRealData();
    console.log(`[EnsembleTest] Got ${candles.length} candles`);

    // Test different agreement thresholds
    const results: { minAgreement: number; totalPnl: number; consistency: number; profitableWindows: number; totalWindows: number; verdict: string }[] = [];

    for (const minAgreement of [2, 3, 4, 5]) {
      console.log(`[EnsembleTest] Testing ${minAgreement}+ signal agreement...`);
      const { totalPnl, consistency, profitableWindows, totalWindows } = rollingValidation(candles, minAgreement);

      let verdict = 'AVOID';
      if (consistency >= 55 && totalPnl > 0) verdict = 'CONSISTENT';
      else if (consistency >= 40 || totalPnl > 0) verdict = 'MARGINAL';

      results.push({ minAgreement, totalPnl, consistency, profitableWindows, totalWindows, verdict });
    }

    // Find best
    const consistent = results.filter(r => r.verdict === 'CONSISTENT');
    const best = results.sort((a, b) => b.consistency - a.consistency)[0];

    // Also run a full backtest to show trade details
    const fullBacktest = backtestEnsemble(candles, best.minAgreement);
    const winRate = fullBacktest.trades > 0 ? Math.round((fullBacktest.wins / fullBacktest.trades) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      dataSource: 'Yahoo Finance SPY (60 days)',
      totalCandles: candles.length,
      results,
      bestConfiguration: {
        minAgreement: best.minAgreement,
        consistency: best.consistency,
        totalPnl: best.totalPnl,
        fullBacktest: {
          trades: fullBacktest.trades,
          wins: fullBacktest.wins,
          losses: fullBacktest.trades - fullBacktest.wins,
          winRate,
          pnl: fullBacktest.pnl
        }
      },
      recommendation: consistent.length > 0
        ? `USE ENSEMBLE with ${consistent[0].minAgreement}+ signals (${consistent[0].consistency}% consistency, $${consistent[0].totalPnl})`
        : `Best option: ${best.minAgreement}+ signals (${best.consistency}% consistency) - but not fully consistent`
    });
  } catch (error) {
    console.error('[EnsembleTest] Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
