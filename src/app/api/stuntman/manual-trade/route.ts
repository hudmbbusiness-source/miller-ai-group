/**
 * MANUAL TRADING API
 *
 * YOU are in control. AI suggests, YOU decide.
 * Executes via PickMyTrade → Rithmic → Apex
 */

import { NextResponse } from 'next/server';
import { getCurrentContractSymbol } from '@/lib/stuntman/pickmytrade-client';

// PickMyTrade API URL (correct one)
const PICKMYTRADE_API = 'https://api.pickmytrade.io/v2/add-trade-data';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Suggestion {
  direction: 'LONG' | 'SHORT' | 'WAIT';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  reasons: string[];
  strategy: string;
}

// Fetch current market data
async function fetchMarketData(): Promise<{ candles: Candle[]; currentPrice: number }> {
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (2 * 24 * 60 * 60);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startTime}&period2=${endTime}&interval=5m`;

  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result?.timestamp) {
    throw new Error('No market data available');
  }

  const candles: Candle[] = [];
  const q = result.indicators.quote[0];

  for (let i = 0; i < result.timestamp.length; i++) {
    if (q.open[i] && q.high[i] && q.low[i] && q.close[i]) {
      candles.push({
        time: result.timestamp[i] * 1000,
        open: q.open[i] * 10,  // Scale SPY to ES
        high: q.high[i] * 10,
        low: q.low[i] * 10,
        close: q.close[i] * 10,
        volume: q.volume[i] || 0,
      });
    }
  }

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  return { candles, currentPrice };
}

// Calculate indicators
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
  if (losses === 0) return 100;
  return 100 - (100 / (1 + gains / losses));
}

function calculateATR(candles: Candle[], period: number): number {
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

function calculateVWAP(candles: Candle[]): number {
  let tpv = 0, vol = 0;
  for (const c of candles.slice(-78)) {
    const tp = (c.high + c.low + c.close) / 3;
    tpv += tp * c.volume;
    vol += c.volume;
  }
  return vol > 0 ? tpv / vol : candles[candles.length - 1].close;
}

// Generate trading suggestion
function generateSuggestion(candles: Candle[]): Suggestion {
  if (candles.length < 50) {
    return {
      direction: 'WAIT',
      confidence: 0,
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      riskReward: 0,
      reasons: ['Insufficient data'],
      strategy: 'NONE',
    };
  }

  const closes = candles.map(c => c.close);
  const current = candles[candles.length - 1];
  const price = current.close;

  // Calculate indicators
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(candles, 14);
  const vwap = calculateVWAP(candles);

  // Analyze trend
  const trendUp = ema9 > ema21 && ema21 > ema50;
  const trendDown = ema9 < ema21 && ema21 < ema50;
  const aboveVWAP = price > vwap;
  const belowVWAP = price < vwap;

  // Recent momentum (last 5 candles)
  const recentCloses = closes.slice(-5);
  const momentum = (recentCloses[4] - recentCloses[0]) / recentCloses[0] * 100;

  // Volume analysis
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
  const highVolume = current.volume > avgVolume * 1.2;

  // Build reasons and score
  const reasons: string[] = [];
  let longScore = 0;
  let shortScore = 0;

  // Trend signals
  if (trendUp) {
    longScore += 25;
    reasons.push('✓ Uptrend (EMA9 > EMA21 > EMA50)');
  } else if (trendDown) {
    shortScore += 25;
    reasons.push('✓ Downtrend (EMA9 < EMA21 < EMA50)');
  } else {
    reasons.push('⚠ No clear trend');
  }

  // VWAP signals
  if (aboveVWAP && trendUp) {
    longScore += 15;
    reasons.push('✓ Price above VWAP (bullish)');
  } else if (belowVWAP && trendDown) {
    shortScore += 15;
    reasons.push('✓ Price below VWAP (bearish)');
  }

  // RSI signals
  if (rsi > 50 && rsi < 70) {
    longScore += 15;
    reasons.push(`✓ RSI bullish: ${rsi.toFixed(1)}`);
  } else if (rsi < 50 && rsi > 30) {
    shortScore += 15;
    reasons.push(`✓ RSI bearish: ${rsi.toFixed(1)}`);
  } else if (rsi >= 70) {
    reasons.push(`⚠ RSI overbought: ${rsi.toFixed(1)}`);
  } else if (rsi <= 30) {
    reasons.push(`⚠ RSI oversold: ${rsi.toFixed(1)}`);
  }

  // Momentum signals
  if (momentum > 0.1) {
    longScore += 15;
    reasons.push(`✓ Bullish momentum: +${momentum.toFixed(2)}%`);
  } else if (momentum < -0.1) {
    shortScore += 15;
    reasons.push(`✓ Bearish momentum: ${momentum.toFixed(2)}%`);
  }

  // Volume confirmation
  if (highVolume) {
    if (current.close > current.open) {
      longScore += 10;
      reasons.push('✓ High volume + green candle');
    } else {
      shortScore += 10;
      reasons.push('✓ High volume + red candle');
    }
  }

  // EMA proximity (pullback entry)
  const distToEma21 = Math.abs(price - ema21) / ema21 * 100;
  if (distToEma21 < 0.2 && trendUp) {
    longScore += 20;
    reasons.push('✓ Price near EMA21 - pullback entry');
  } else if (distToEma21 < 0.2 && trendDown) {
    shortScore += 20;
    reasons.push('✓ Price near EMA21 - pullback entry');
  }

  // Determine direction
  let direction: 'LONG' | 'SHORT' | 'WAIT' = 'WAIT';
  let confidence = 0;
  let strategy = 'NONE';

  if (longScore >= 50 && longScore > shortScore) {
    direction = 'LONG';
    confidence = Math.min(longScore, 95);
    strategy = trendUp && distToEma21 < 0.3 ? 'TREND_PULLBACK' : 'TREND_CONTINUATION';
  } else if (shortScore >= 50 && shortScore > longScore) {
    direction = 'SHORT';
    confidence = Math.min(shortScore, 95);
    strategy = trendDown && distToEma21 < 0.3 ? 'TREND_PULLBACK' : 'TREND_CONTINUATION';
  } else {
    reasons.push('⚠ Conflicting signals - wait for clearer setup');
  }

  // Calculate entry, stop, target
  const entry = price;
  let stopLoss: number;
  let takeProfit: number;

  if (direction === 'LONG') {
    stopLoss = Math.min(entry - atr * 1.5, ema21 - atr * 0.5);
    takeProfit = entry + atr * 2.5;
  } else if (direction === 'SHORT') {
    stopLoss = Math.max(entry + atr * 1.5, ema21 + atr * 0.5);
    takeProfit = entry - atr * 2.5;
  } else {
    stopLoss = 0;
    takeProfit = 0;
  }

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskReward = risk > 0 ? reward / risk : 0;

  return {
    direction,
    confidence,
    entry: Math.round(entry * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskReward: Math.round(riskReward * 100) / 100,
    reasons,
    strategy,
  };
}

// Execute trade via PickMyTrade - Updated 2026-01-08
async function executeTrade(
  direction: 'BUY' | 'SELL',
  quantity: number,
  token: string,
  accountId: string,
  currentPrice: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Get proper contract symbol (e.g., ESH6 for March 2026)
    const symbol = getCurrentContractSymbol('ES');

    // Build proper PickMyTrade payload
    const payload = {
      symbol: symbol,
      date: new Date().toISOString(),
      data: direction.toLowerCase(), // 'buy' or 'sell'
      quantity: quantity,
      risk_percentage: 0,
      price: currentPrice, // Required to avoid "Price Not Found" error
      tp: 0,
      percentage_tp: 0,
      dollar_tp: 0,
      sl: 0,
      dollar_sl: 0,
      percentage_sl: 0,
      order_type: 'MKT',
      update_tp: false,
      update_sl: false,
      token: token,
      duplicate_position_allow: false,
      platform: 'RITHMIC',
      connection_name: 'RITHMIC1',
      reverse_order_close: true,
      multiple_accounts: [
        {
          token: token,
          account_id: accountId,
          connection_name: 'RITHMIC1',
          quantity_multiplier: quantity,
        },
      ],
    };

    console.log('[ManualTrade] Sending to PickMyTrade:', JSON.stringify(payload, null, 2));

    const response = await fetch(PICKMYTRADE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    console.log('[ManualTrade] PickMyTrade response:', result);

    if (response.ok) {
      return { success: true, message: `${direction} ${quantity}x ${symbol} sent to PickMyTrade` };
    } else {
      return { success: false, message: `PickMyTrade error: ${result}` };
    }
  } catch (error) {
    console.error('[ManualTrade] Execution error:', error);
    return { success: false, message: String(error) };
  }
}

// GET - Fetch current suggestion and market data
export async function GET() {
  try {
    const { candles, currentPrice } = await fetchMarketData();
    const suggestion = generateSuggestion(candles);

    // Get EST time
    const now = new Date();
    const estOffset = -5;
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    let estHour = utcHours + estOffset;
    if (estHour < 0) estHour += 24;
    const withinTradingHours = estHour >= 9.5 && estHour < 16;

    // Check PickMyTrade config
    const pickMyTradeConfigured = !!(process.env.PICKMYTRADE_TOKEN && process.env.APEX_ACCOUNT_ID);

    return NextResponse.json({
      success: true,
      market: {
        price: currentPrice,
        time: now.toISOString(),
        estHour: `${Math.floor(estHour)}:${String(utcMinutes).padStart(2, '0')}`,
        withinTradingHours,
      },
      suggestion,
      config: {
        pickMyTradeConfigured,
        accountId: process.env.APEX_ACCOUNT_ID?.trim() || 'NOT SET',
      },
    });
  } catch (error) {
    console.error('[ManualTrade] GET error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST - Execute a trade
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, quantity = 1 } = body;

    if (!['BUY', 'SELL', 'CLOSE_LONG', 'CLOSE_SHORT'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const token = process.env.PICKMYTRADE_TOKEN?.trim();
    const accountId = process.env.APEX_ACCOUNT_ID?.trim();

    if (!token || !accountId) {
      return NextResponse.json({
        success: false,
        error: 'PickMyTrade not configured. Set PICKMYTRADE_TOKEN and APEX_ACCOUNT_ID in .env.local',
      }, { status: 400 });
    }

    // Get current market price for the order
    const { currentPrice } = await fetchMarketData();

    // Map action to PickMyTrade direction
    let direction: 'BUY' | 'SELL';
    if (action === 'BUY' || action === 'CLOSE_SHORT') {
      direction = 'BUY';
    } else {
      direction = 'SELL';
    }

    const result = await executeTrade(direction, quantity, token, accountId, currentPrice);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      action,
      quantity,
      price: currentPrice,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ManualTrade] POST error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
