/**
 * ROLLING WALK-FORWARD VALIDATION
 *
 * Tests strategies across MULTIPLE periods to find what ACTUALLY works consistently.
 * Not just one 80/20 split, but rolling windows across the entire dataset.
 *
 * A strategy PASSES only if it's profitable in MOST test windows.
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

// Fetch REAL data from Yahoo Finance
async function fetchRealData(days: number = 60): Promise<Candle[]> {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (days * 24 * 60 * 60);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startTime}&period2=${endTime}&interval=5m`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result || !result.timestamp) {
    throw new Error('Failed to fetch Yahoo data');
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
      candles.push({
        time: timestamps[i] * 1000,
        open: quotes.open[i] * 10,
        high: quotes.high[i] * 10,
        low: quotes.low[i] * 10,
        close: quotes.close[i] * 10,
        volume: quotes.volume[i] || 1000
      });
    }
  }

  return candles;
}

// ============ INDICATORS ============

function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(prices: number[], period: number): number {
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - (100 / (1 + rs));
}

function calculateATR(candles: Candle[], period: number): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateIndicators(candles: Candle[]) {
  if (candles.length < 50) return null;

  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(candles, 14);

  return { ema20, ema50, rsi, atr, close: closes[closes.length - 1] };
}

// ============ SIMPLIFIED STRATEGIES ============
// Each strategy has EXACTLY 2 conditions - nothing more

interface Signal {
  direction: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

// Strategy 1: SIMPLE TREND
// Long when price > EMA50 and RSI crosses above 50
// Short when price < EMA50 and RSI crosses below 50
function checkSimpleTrend(candles: Candle[], prevRsi: number): Signal | null {
  const ind = calculateIndicators(candles);
  if (!ind) return null;

  const c = candles[candles.length - 1];

  // LONG: Price above EMA50, RSI crossed above 50
  if (ind.close > ind.ema50 && ind.rsi > 50 && prevRsi <= 50) {
    return {
      direction: 'LONG',
      entry: c.close,
      stopLoss: c.close - ind.atr * 2,
      takeProfit: c.close + ind.atr * 3
    };
  }

  // SHORT: Price below EMA50, RSI crossed below 50
  if (ind.close < ind.ema50 && ind.rsi < 50 && prevRsi >= 50) {
    return {
      direction: 'SHORT',
      entry: c.close,
      stopLoss: c.close + ind.atr * 2,
      takeProfit: c.close - ind.atr * 3
    };
  }

  return null;
}

// Strategy 2: RSI EXTREME
// Long when RSI < 25 and candle is green
// Short when RSI > 75 and candle is red
function checkRsiExtreme(candles: Candle[]): Signal | null {
  const ind = calculateIndicators(candles);
  if (!ind) return null;

  const c = candles[candles.length - 1];

  // LONG: RSI oversold + bullish candle
  if (ind.rsi < 25 && c.close > c.open) {
    return {
      direction: 'LONG',
      entry: c.close,
      stopLoss: c.close - ind.atr * 2.5,
      takeProfit: c.close + ind.atr * 2
    };
  }

  // SHORT: RSI overbought + bearish candle
  if (ind.rsi > 75 && c.close < c.open) {
    return {
      direction: 'SHORT',
      entry: c.close,
      stopLoss: c.close + ind.atr * 2.5,
      takeProfit: c.close - ind.atr * 2
    };
  }

  return null;
}

// Strategy 3: EMA CROSS
// Long when EMA20 crosses above EMA50
// Short when EMA20 crosses below EMA50
function checkEmaCross(candles: Candle[], prevEma20: number, prevEma50: number): Signal | null {
  const ind = calculateIndicators(candles);
  if (!ind) return null;

  const c = candles[candles.length - 1];

  // LONG: EMA20 crossed above EMA50
  if (ind.ema20 > ind.ema50 && prevEma20 <= prevEma50) {
    return {
      direction: 'LONG',
      entry: c.close,
      stopLoss: c.close - ind.atr * 2,
      takeProfit: c.close + ind.atr * 4
    };
  }

  // SHORT: EMA20 crossed below EMA50
  if (ind.ema20 < ind.ema50 && prevEma20 >= prevEma50) {
    return {
      direction: 'SHORT',
      entry: c.close,
      stopLoss: c.close + ind.atr * 2,
      takeProfit: c.close - ind.atr * 4
    };
  }

  return null;
}

// Strategy 4: BREAKOUT
// Long on new 20-bar high with volume
// Short on new 20-bar low with volume
function checkBreakout(candles: Candle[]): Signal | null {
  const ind = calculateIndicators(candles);
  if (!ind) return null;

  const c = candles[candles.length - 1];
  const recent = candles.slice(-21, -1); // Last 20 candles excluding current

  const highestHigh = Math.max(...recent.map(x => x.high));
  const lowestLow = Math.min(...recent.map(x => x.low));

  const avgVolume = recent.reduce((sum, x) => sum + x.volume, 0) / 20;
  const highVolume = c.volume > avgVolume * 1.3;

  // LONG: Break above 20-bar high with volume
  if (c.close > highestHigh && highVolume) {
    return {
      direction: 'LONG',
      entry: c.close,
      stopLoss: c.close - ind.atr * 2,
      takeProfit: c.close + ind.atr * 3
    };
  }

  // SHORT: Break below 20-bar low with volume
  if (c.close < lowestLow && highVolume) {
    return {
      direction: 'SHORT',
      entry: c.close,
      stopLoss: c.close + ind.atr * 2,
      takeProfit: c.close - ind.atr * 3
    };
  }

  return null;
}

// Run backtest for a strategy
function runBacktest(
  candles: Candle[],
  strategyFn: (candles: Candle[], ...args: number[]) => Signal | null
): { pnl: number; trades: number; wins: number } {
  let pnl = 0;
  let trades = 0;
  let wins = 0;

  let position: { direction: 'LONG' | 'SHORT'; entry: number; stopLoss: number; takeProfit: number } | null = null;
  let prevRsi = 50;
  let prevEma20 = 0;
  let prevEma50 = 0;

  const COMMISSION = 4.12;
  const SLIPPAGE = 12.50;

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];
    const ind = calculateIndicators(slice);

    // Check for exit
    if (position) {
      let exitPrice: number | null = null;

      if (position.direction === 'LONG') {
        if (c.low <= position.stopLoss) exitPrice = position.stopLoss;
        else if (c.high >= position.takeProfit) exitPrice = position.takeProfit;
      } else {
        if (c.high >= position.stopLoss) exitPrice = position.stopLoss;
        else if (c.low <= position.takeProfit) exitPrice = position.takeProfit;
      }

      if (exitPrice !== null) {
        const tradePnl = position.direction === 'LONG'
          ? (exitPrice - position.entry) * 50
          : (position.entry - exitPrice) * 50;

        const netPnl = tradePnl - COMMISSION - SLIPPAGE;
        pnl += netPnl;
        trades++;
        if (netPnl > 0) wins++;
        position = null;
      }
    }

    // Check for entry
    if (!position && ind) {
      // Try each strategy based on function name
      const fnName = strategyFn.name;
      let signal: Signal | null = null;

      if (fnName === 'checkSimpleTrend') {
        signal = checkSimpleTrend(slice, prevRsi);
      } else if (fnName === 'checkRsiExtreme') {
        signal = checkRsiExtreme(slice);
      } else if (fnName === 'checkEmaCross') {
        signal = checkEmaCross(slice, prevEma20, prevEma50);
      } else if (fnName === 'checkBreakout') {
        signal = checkBreakout(slice);
      }

      if (signal) {
        position = signal;
      }

      // Update previous values
      prevRsi = ind.rsi;
      prevEma20 = ind.ema20;
      prevEma50 = ind.ema50;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

// Run rolling walk-forward test
function rollingWalkForward(
  candles: Candle[],
  strategyName: string,
  windowSize: number = 500, // ~4 days of 5-min candles
  stepSize: number = 200    // Step forward by ~1.5 days
): { windowResults: { start: string; end: string; pnl: number; trades: number; winRate: number }[]; totalPnl: number; profitableWindows: number; totalWindows: number } {

  const results: { start: string; end: string; pnl: number; trades: number; winRate: number }[] = [];
  let totalPnl = 0;
  let profitableWindows = 0;

  for (let start = 0; start + windowSize <= candles.length; start += stepSize) {
    const windowCandles = candles.slice(start, start + windowSize);

    let result: { pnl: number; trades: number; wins: number };

    switch (strategyName) {
      case 'SIMPLE_TREND':
        result = runBacktestSimpleTrend(windowCandles);
        break;
      case 'RSI_EXTREME':
        result = runBacktestRsiExtreme(windowCandles);
        break;
      case 'EMA_CROSS':
        result = runBacktestEmaCross(windowCandles);
        break;
      case 'BREAKOUT':
        result = runBacktestBreakout(windowCandles);
        break;
      default:
        result = { pnl: 0, trades: 0, wins: 0 };
    }

    const winRate = result.trades > 0 ? (result.wins / result.trades) * 100 : 0;

    results.push({
      start: new Date(windowCandles[0].time).toISOString().split('T')[0],
      end: new Date(windowCandles[windowCandles.length - 1].time).toISOString().split('T')[0],
      pnl: result.pnl,
      trades: result.trades,
      winRate: Math.round(winRate * 10) / 10
    });

    totalPnl += result.pnl;
    if (result.pnl > 0) profitableWindows++;
  }

  return {
    windowResults: results,
    totalPnl: Math.round(totalPnl * 100) / 100,
    profitableWindows,
    totalWindows: results.length
  };
}

// Individual backtest functions
function runBacktestSimpleTrend(candles: Candle[]): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;
  let prevRsi = 50;

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];
    const ind = calculateIndicators(slice);

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

    if (!position && ind) {
      const signal = checkSimpleTrend(slice, prevRsi);
      if (signal) position = signal;
      prevRsi = ind.rsi;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

function runBacktestRsiExtreme(candles: Candle[]): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;

  for (let i = 50; i < candles.length; i++) {
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
      const signal = checkRsiExtreme(slice);
      if (signal) position = signal;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

function runBacktestEmaCross(candles: Candle[]): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;
  let prevEma20 = 0, prevEma50 = 0;

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const c = candles[i];
    const ind = calculateIndicators(slice);

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

    if (!position && ind) {
      const signal = checkEmaCross(slice, prevEma20, prevEma50);
      if (signal) position = signal;
      prevEma20 = ind.ema20;
      prevEma50 = ind.ema50;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

function runBacktestBreakout(candles: Candle[]): { pnl: number; trades: number; wins: number } {
  let pnl = 0, trades = 0, wins = 0;
  let position: Signal | null = null;

  for (let i = 50; i < candles.length; i++) {
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
      const signal = checkBreakout(slice);
      if (signal) position = signal;
    }
  }

  return { pnl: Math.round(pnl * 100) / 100, trades, wins };
}

export async function GET() {
  try {
    console.log('[RollingWalkforward] Fetching 60 days of REAL Yahoo Finance data...');

    const candles = await fetchRealData(60);
    console.log(`[RollingWalkforward] Got ${candles.length} candles`);

    const strategies = ['SIMPLE_TREND', 'RSI_EXTREME', 'EMA_CROSS', 'BREAKOUT'];

    const results: {
      strategy: string;
      totalPnl: number;
      profitableWindows: number;
      totalWindows: number;
      consistencyScore: number;
      verdict: 'CONSISTENT' | 'INCONSISTENT' | 'AVOID';
      windowDetails: { start: string; end: string; pnl: number; trades: number; winRate: number }[];
    }[] = [];

    for (const strategy of strategies) {
      console.log(`[RollingWalkforward] Testing ${strategy}...`);

      const { windowResults, totalPnl, profitableWindows, totalWindows } = rollingWalkForward(candles, strategy);

      // Consistency score: % of windows that were profitable
      const consistencyScore = (profitableWindows / totalWindows) * 100;

      // Verdict
      let verdict: 'CONSISTENT' | 'INCONSISTENT' | 'AVOID';
      if (consistencyScore >= 60 && totalPnl > 0) {
        verdict = 'CONSISTENT';
      } else if (consistencyScore >= 40 || totalPnl > 0) {
        verdict = 'INCONSISTENT';
      } else {
        verdict = 'AVOID';
      }

      results.push({
        strategy,
        totalPnl,
        profitableWindows,
        totalWindows,
        consistencyScore: Math.round(consistencyScore * 10) / 10,
        verdict,
        windowDetails: windowResults
      });
    }

    // Sort by consistency score
    results.sort((a, b) => b.consistencyScore - a.consistencyScore);

    const consistentStrategies = results.filter(r => r.verdict === 'CONSISTENT');
    const inconsistentStrategies = results.filter(r => r.verdict === 'INCONSISTENT');

    return NextResponse.json({
      success: true,
      dataSource: 'Yahoo Finance SPY (scaled to ES)',
      totalCandles: candles.length,
      dateRange: {
        start: new Date(candles[0].time).toISOString().split('T')[0],
        end: new Date(candles[candles.length - 1].time).toISOString().split('T')[0]
      },
      results,
      summary: {
        consistentStrategies: consistentStrategies.map(s => ({
          name: s.strategy,
          consistencyScore: s.consistencyScore,
          totalPnl: s.totalPnl
        })),
        inconsistentStrategies: inconsistentStrategies.map(s => ({
          name: s.strategy,
          consistencyScore: s.consistencyScore,
          totalPnl: s.totalPnl
        })),
        recommendation: consistentStrategies.length > 0
          ? `Use: ${consistentStrategies[0].strategy} (${consistentStrategies[0].consistencyScore}% consistency, $${consistentStrategies[0].totalPnl} total)`
          : 'No consistently profitable strategy found - market may be ranging'
      }
    });
  } catch (error) {
    console.error('[RollingWalkforward] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
