/**
 * REAL DATA BACKTESTER
 *
 * Tests strategies on ACTUAL Yahoo Finance historical data
 * NO synthetic data, NO fake scenarios
 *
 * GET - Run backtest on real market data
 */

import { NextRequest, NextResponse } from 'next/server';

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

interface Trade {
  strategy: string;
  direction: 'LONG' | 'SHORT';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  exitType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIME_EXIT';
  pnl: number;
  holdBars: number;
}

interface StrategyResult {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: string;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: string;
  maxDrawdown: number;
  recommendation: 'KEEP' | 'DISABLE' | 'REDUCE';
}

// ============================================================================
// FETCH REAL YAHOO DATA - 60 DAYS
// ============================================================================
async function fetchRealHistoricalData(): Promise<Candle[]> {
  const symbol = 'SPY';
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 60 * 24 * 60 * 60; // 60 days

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=5m`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      throw new Error('No data received from Yahoo');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
        const date = new Date(timestamps[i] * 1000);
        const hour = date.getHours();

        // Only include regular trading hours (9:30 AM - 4:00 PM)
        if (hour >= 9 && hour < 16) {
          candles.push({
            timestamp: timestamps[i] * 1000,
            date: date.toISOString().split('T')[0],
            hour: hour,
            minute: date.getMinutes(),
            open: quotes.open[i] * 10, // Scale to ES prices
            high: quotes.high[i] * 10,
            low: quotes.low[i] * 10,
            close: quotes.close[i] * 10,
            volume: quotes.volume[i] || 1000000
          });
        }
      }
    }

    return candles;
  } catch (e) {
    console.error('Error fetching Yahoo data:', e);
    return [];
  }
}

// ============================================================================
// INDICATOR CALCULATIONS
// ============================================================================
function calculateEMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(closes: number[], period = 14): number {
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

function calculateATR(candles: Candle[], period = 14): number {
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

function calculateIndicators(candles: Candle[], idx: number) {
  if (idx < 55) return null;

  const slice = candles.slice(0, idx + 1);
  const closes = slice.map(c => c.close);

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(slice, 14);

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

  return {
    ema20, ema50, rsi, atr,
    bollingerUpper, bollingerLower,
    vwap,
    vwapUpper: vwap + 2 * vwapStd,
    vwapLower: vwap - 2 * vwapStd
  };
}

// ============================================================================
// STRATEGY SIGNAL DETECTION - EXACT SAME LOGIC AS LIVE
// ============================================================================
function checkStrategy(
  strategy: string,
  candles: Candle[],
  idx: number,
  ind: ReturnType<typeof calculateIndicators>
): { direction: 'LONG' | 'SHORT'; confidence: number; stopLoss: number; takeProfit: number } | null {
  if (!ind) return null;

  const c = candles[idx];
  const prev = candles[idx - 1];
  const { ema20, rsi, atr, bollingerUpper, bollingerLower, vwap, vwapUpper, vwapLower } = ind;

  switch (strategy) {
    case 'RANGE_FADE': {
      if (idx < 35) return null;
      const rangeHigh = Math.max(...candles.slice(idx - 25, idx).map(x => x.high));
      const rangeLow = Math.min(...candles.slice(idx - 25, idx).map(x => x.low));
      const rangeSize = rangeHigh - rangeLow;

      if (c.high >= rangeHigh - rangeSize * 0.05 && c.close < c.open && rsi > 55) {
        return {
          direction: 'SHORT',
          confidence: 0.64,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      if (c.low <= rangeLow + rangeSize * 0.05 && c.close > c.open && rsi < 45) {
        return {
          direction: 'LONG',
          confidence: 0.64,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      break;
    }

    case 'FAILED_BREAKOUT': {
      if (prev.high > bollingerUpper) {
        if (c.close < bollingerUpper && c.close < c.open && rsi > 50) {
          return {
            direction: 'SHORT',
            confidence: 0.70,
            stopLoss: c.close + atr * 1.5,
            takeProfit: c.close - atr * 2.5
          };
        }
      }
      if (prev.low < bollingerLower) {
        if (c.close > bollingerLower && c.close > c.open && rsi < 50) {
          return {
            direction: 'LONG',
            confidence: 0.70,
            stopLoss: c.close - atr * 1.5,
            takeProfit: c.close + atr * 2.5
          };
        }
      }
      break;
    }

    case 'VWAP_DEVIATION': {
      if (c.low <= vwapLower * 1.002 && c.close > vwapLower && c.close > c.open && rsi < 48) {
        return {
          direction: 'LONG',
          confidence: 0.63,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      if (c.high >= vwapUpper * 0.998 && c.close < vwapUpper && c.close < c.open && rsi > 52) {
        return {
          direction: 'SHORT',
          confidence: 0.63,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      break;
    }

    case 'ORB_BREAKOUT': {
      const hour = c.hour;
      if (hour < 10 || hour > 11) return null;
      const orbCandles = candles.slice(Math.max(0, idx - 8), idx);
      if (orbCandles.length < 4) return null;
      const orbHigh = Math.max(...orbCandles.map(x => x.high));
      const orbLow = Math.min(...orbCandles.map(x => x.low));
      const orbSize = orbHigh - orbLow;
      if (orbSize < atr * 0.4) return null;

      if (c.close > orbHigh + atr * 0.15 && c.close > c.open) {
        return {
          direction: 'LONG',
          confidence: 0.68,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      if (c.close < orbLow - atr * 0.15 && c.close < c.open) {
        return {
          direction: 'SHORT',
          confidence: 0.68,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      break;
    }

    case 'CHOCH_REVERSAL': {
      const bodySize = Math.abs(c.close - c.open);
      if (rsi > 78 && bodySize > atr * 0.7 && c.close < c.open && prev.close > prev.open) {
        return {
          direction: 'SHORT',
          confidence: 0.62,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      if (rsi < 22 && bodySize > atr * 0.7 && c.close > c.open && prev.close < prev.open) {
        return {
          direction: 'LONG',
          confidence: 0.62,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      break;
    }

    case 'KILLZONE_REVERSAL': {
      const hour = c.hour;
      const isKillzone = (hour >= 9 && hour <= 10) || (hour >= 14 && hour <= 15);
      if (!isKillzone) return null;

      const bodySize = Math.abs(c.close - c.open);
      if (rsi > 72 && bodySize > atr * 0.6 && c.close < c.open) {
        return {
          direction: 'SHORT',
          confidence: 0.65,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      if (rsi < 28 && bodySize > atr * 0.6 && c.close > c.open) {
        return {
          direction: 'LONG',
          confidence: 0.65,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      break;
    }

    case 'VOLATILITY_BREAKOUT': {
      const bbWidth = (bollingerUpper - bollingerLower) / c.close;
      if (bbWidth > 0.015) return null; // Only trade in low volatility squeeze

      if (c.close > bollingerUpper && c.close > c.open) {
        return {
          direction: 'LONG',
          confidence: 0.65,
          stopLoss: c.close - atr * 1.5,
          takeProfit: c.close + atr * 2.5
        };
      }
      if (c.close < bollingerLower && c.close < c.open) {
        return {
          direction: 'SHORT',
          confidence: 0.65,
          stopLoss: c.close + atr * 1.5,
          takeProfit: c.close - atr * 2.5
        };
      }
      break;
    }
  }

  return null;
}

// ============================================================================
// RUN BACKTEST
// ============================================================================
function runBacktest(candles: Candle[], strategy: string): { trades: Trade[]; maxDrawdown: number } {
  const trades: Trade[] = [];
  let position: {
    direction: 'LONG' | 'SHORT';
    entry: number;
    entryTime: string;
    stopLoss: number;
    takeProfit: number;
    entryIdx: number;
  } | null = null;

  let equity = 0;
  let peakEquity = 0;
  let maxDrawdown = 0;

  const MAX_HOLD_BARS = 20;
  const MIN_BARS_BETWEEN = 6;
  let lastTradeIdx = -MIN_BARS_BETWEEN;

  for (let i = 60; i < candles.length; i++) {
    const c = candles[i];
    const ind = calculateIndicators(candles, i);

    // Check exit if in position
    if (position) {
      let shouldExit = false;
      let exitType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIME_EXIT' = 'TIME_EXIT';
      let exitPrice = c.close;

      const holdBars = i - position.entryIdx;

      if (position.direction === 'LONG') {
        if (c.low <= position.stopLoss) {
          shouldExit = true;
          exitType = 'STOP_LOSS';
          exitPrice = position.stopLoss;
        } else if (c.high >= position.takeProfit) {
          shouldExit = true;
          exitType = 'TAKE_PROFIT';
          exitPrice = position.takeProfit;
        } else if (holdBars >= MAX_HOLD_BARS) {
          shouldExit = true;
          exitType = 'TIME_EXIT';
        }
      } else {
        if (c.high >= position.stopLoss) {
          shouldExit = true;
          exitType = 'STOP_LOSS';
          exitPrice = position.stopLoss;
        } else if (c.low <= position.takeProfit) {
          shouldExit = true;
          exitType = 'TAKE_PROFIT';
          exitPrice = position.takeProfit;
        } else if (holdBars >= MAX_HOLD_BARS) {
          shouldExit = true;
          exitType = 'TIME_EXIT';
        }
      }

      if (shouldExit) {
        const pnl = position.direction === 'LONG'
          ? (exitPrice - position.entry) * 50 - 6.84
          : (position.entry - exitPrice) * 50 - 6.84;

        trades.push({
          strategy,
          direction: position.direction,
          entryTime: position.entryTime,
          entryPrice: position.entry,
          exitTime: new Date(c.timestamp).toISOString(),
          exitPrice,
          exitType,
          pnl,
          holdBars
        });

        equity += pnl;
        peakEquity = Math.max(peakEquity, equity);
        maxDrawdown = Math.max(maxDrawdown, peakEquity - equity);

        position = null;
        lastTradeIdx = i;
      }
    }

    // Check entry if not in position
    if (!position && i - lastTradeIdx >= MIN_BARS_BETWEEN) {
      const signal = checkStrategy(strategy, candles, i, ind);
      if (signal) {
        position = {
          direction: signal.direction,
          entry: c.close,
          entryTime: new Date(c.timestamp).toISOString(),
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          entryIdx: i
        };
      }
    }
  }

  return { trades, maxDrawdown };
}

// ============================================================================
// GET HANDLER
// ============================================================================
export async function GET(request: NextRequest) {
  console.log('[RealBacktest] Starting backtest on REAL Yahoo Finance data...');

  const candles = await fetchRealHistoricalData();
  if (candles.length < 100) {
    return NextResponse.json({
      error: 'Insufficient historical data',
      candles: candles.length
    }, { status: 500 });
  }

  const strategies = [
    'RANGE_FADE',
    'FAILED_BREAKOUT',
    'VWAP_DEVIATION',
    'ORB_BREAKOUT',
    'CHOCH_REVERSAL',
    'KILLZONE_REVERSAL',
    'VOLATILITY_BREAKOUT'
  ];

  const results: StrategyResult[] = [];
  const allTrades: Trade[] = [];

  for (const strategy of strategies) {
    const { trades, maxDrawdown } = runBacktest(candles, strategy);
    allTrades.push(...trades);

    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl <= 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 1;

    const grossProfit = winningTrades.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? 999 : 0;

    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

    // Determine recommendation
    let recommendation: 'KEEP' | 'DISABLE' | 'REDUCE' = 'DISABLE';
    if (trades.length >= 5 && winRate >= 50 && profitFactor >= 1.2 && totalPnl > 0) {
      recommendation = 'KEEP';
    } else if (trades.length >= 5 && (winRate >= 45 || profitFactor >= 1.0)) {
      recommendation = 'REDUCE';
    }

    results.push({
      strategy,
      trades: trades.length,
      wins,
      losses,
      winRate: winRate.toFixed(1) + '%',
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor: profitFactor.toFixed(2),
      maxDrawdown,
      recommendation
    });
  }

  // Sort by total P&L
  results.sort((a, b) => b.totalPnl - a.totalPnl);

  const totalTrades = allTrades.length;
  const totalWins = allTrades.filter(t => t.pnl > 0).length;
  const totalPnl = allTrades.reduce((s, t) => s + t.pnl, 0);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    dataSource: 'Yahoo Finance - REAL MARKET DATA',
    candlesAnalyzed: candles.length,
    dateRange: {
      start: candles[0]?.date,
      end: candles[candles.length - 1]?.date
    },

    summary: {
      totalTrades,
      totalWins,
      totalLosses: totalTrades - totalWins,
      overallWinRate: totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) + '%' : 'N/A',
      totalPnl: totalPnl.toFixed(2),
      avgPnlPerTrade: totalTrades > 0 ? (totalPnl / totalTrades).toFixed(2) : '0'
    },

    strategyResults: results,

    recommendations: {
      KEEP: results.filter(r => r.recommendation === 'KEEP').map(r => r.strategy),
      REDUCE: results.filter(r => r.recommendation === 'REDUCE').map(r => r.strategy),
      DISABLE: results.filter(r => r.recommendation === 'DISABLE').map(r => r.strategy)
    },

    recentTrades: allTrades.slice(-20).map(t => ({
      strategy: t.strategy,
      direction: t.direction,
      entry: t.entryPrice.toFixed(2),
      exit: t.exitPrice.toFixed(2),
      pnl: t.pnl.toFixed(2),
      exitType: t.exitType
    }))
  });
}
