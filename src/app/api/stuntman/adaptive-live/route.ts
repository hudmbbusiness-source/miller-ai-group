/**
 * ADAPTIVE LIVE TRADING ENDPOINT
 *
 * This endpoint:
 * 1. Uses the adaptive learning system with ALL 11 strategies
 * 2. Only trades when market conditions MATCH strategy requirements
 * 3. Learns from each trade and adjusts weights automatically
 * 4. Executes via PickMyTrade to Apex/Rithmic
 *
 * GET - Fetch current status, signals, market data
 * POST - Execute actions (enable, disable, execute trade, record outcome)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { adaptiveLearningSystem } from '@/lib/stuntman/adaptive-learning-system';

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

interface TradingState {
  enabled: boolean;
  currentPosition: {
    direction: 'LONG' | 'SHORT';
    entry: number;
    stopLoss: number;
    takeProfit: number;
    strategy: string;
    timestamp: string;
  } | null;
  dailyTrades: number;
  dailyPnL: number;
  totalPnL: number;
  totalTrades: number;
  totalWins: number;
  lastTradeTime: string | null;
  lastUpdated: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// FETCH MARKET DATA
// ============================================================================
async function fetchMarketData(): Promise<Candle[]> {
  const symbol = 'SPY';
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 5 * 24 * 60 * 60; // 5 days of data

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=5m`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });
    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      throw new Error('No data received');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
        const date = new Date(timestamps[i] * 1000);
        candles.push({
          timestamp: timestamps[i] * 1000,
          date: date.toISOString().split('T')[0],
          hour: date.getHours(),
          minute: date.getMinutes(),
          open: quotes.open[i] * 10, // Scale to ES
          high: quotes.high[i] * 10,
          low: quotes.low[i] * 10,
          close: quotes.close[i] * 10,
          volume: quotes.volume[i] || 1000000
        });
      }
    }

    return candles;
  } catch (e) {
    console.error('Error fetching market data:', e);
    return [];
  }
}

// ============================================================================
// TRADING STATE MANAGEMENT
// ============================================================================
async function getTradingState(): Promise<TradingState> {
  try {
    const { data } = await supabase
      .from('stuntman_trading_state')
      .select('state')
      .eq('key', 'adaptive_live_trading_state')
      .single();

    if (data?.state) {
      return data.state as TradingState;
    }
  } catch (e) {
    // Ignore error, return default
  }

  // Default state
  return {
    enabled: false,
    currentPosition: null,
    dailyTrades: 0,
    dailyPnL: 0,
    totalPnL: 0,
    totalTrades: 0,
    totalWins: 0,
    lastTradeTime: null,
    lastUpdated: new Date().toISOString()
  };
}

async function saveTradingState(state: TradingState): Promise<void> {
  state.lastUpdated = new Date().toISOString();
  await supabase
    .from('stuntman_trading_state')
    .upsert({
      key: 'adaptive_live_trading_state',
      state,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
}

// ============================================================================
// PICKMYTRADE EXECUTION
// URL: https://api.pickmytrade.trade/v2/add-trade-data (for Tradovate/Apex)
// Docs: https://docs.pickmytrade.trade/docs/
// ============================================================================
async function executePickMyTrade(
  direction: 'BUY' | 'SELL',
  contracts: number = 1
): Promise<{ success: boolean; message: string; orderId?: string; details?: any }> {
  const connectionName = process.env.PICKMYTRADE_CONNECTION_NAME?.trim();
  const accountId = process.env.APEX_ACCOUNT_ID?.trim();

  if (!connectionName || !accountId) {
    return {
      success: false,
      message: 'PickMyTrade not configured. Need PICKMYTRADE_CONNECTION_NAME and APEX_ACCOUNT_ID'
    };
  }

  const payload = {
    connection_name: connectionName,
    account_id: accountId,
    data: direction.toLowerCase(),
    symbol: 'ES',  // MUST be ES not NQ - we only trade ES
    quantity: contracts,
    order_type: 'MKT'
  };

  console.log('[PickMyTrade] Sending order:', JSON.stringify(payload));

  try {
    // CRITICAL: Use .io for Rithmic/Apex, NOT .trade (which is for Tradovate)
    const response = await fetch('https://api.pickmytrade.io/v2/add-trade-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('[PickMyTrade] Response:', response.status, JSON.stringify(result));

    // CRITICAL: Check for ACTUAL success - must have order_id or no error message
    const hasError = result.error ||
                     result.message?.includes('NO PERMISSION') ||
                     result.message?.includes('REJECTED') ||
                     result.message?.includes('FAILED') ||
                     result.message?.includes('Not Found') ||
                     result.message?.includes('Invalid');

    const hasOrderId = result.order_id || result.orderId || result.id;

    // Only consider successful if NO errors AND either has order_id or HTTP 200 with success message
    const isReallySuccessful = !hasError && response.ok && (hasOrderId || result.status === 'success' || result.message?.includes('success'));

    return {
      success: isReallySuccessful,
      message: hasError ? (result.error || result.message || 'Trade failed') : (result.message || 'Trade sent'),
      orderId: hasOrderId ? (result.order_id || result.orderId || result.id) : undefined,
      details: result
    };
  } catch (e: any) {
    console.error('[PickMyTrade] Error:', e.message);
    return { success: false, message: e.message };
  }
}

// ============================================================================
// CHECK TRADING HOURS
// ============================================================================
function isWithinTradingHours(): boolean {
  const now = new Date();
  const estOffset = -5; // EST offset
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + 3600000 * estOffset);

  const hour = est.getHours();
  const minute = est.getMinutes();
  const day = est.getDay();

  // Skip weekends
  if (day === 0 || day === 6) return false;

  // Trading hours: 9:35 AM - 4:59 PM EST
  // Apex allows last trade at 4:59 PM
  const timeInMinutes = hour * 60 + minute;
  return timeInMinutes >= 9 * 60 + 35 && timeInMinutes <= 16 * 60 + 59;
}

// ============================================================================
// GET HANDLER
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const estOffset = -5;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const est = new Date(utc + 3600000 * estOffset);

    // Fetch market data
    const candles = await fetchMarketData();
    if (candles.length < 60) {
      return NextResponse.json({
        error: 'Insufficient market data',
        candles: candles.length
      }, { status: 500 });
    }

    // Get current state
    const tradingState = await getTradingState();

    // Generate signal using adaptive system
    const { signal, regime, indicators, allSignals, state: learningState } = await adaptiveLearningSystem.generateSignal(candles);
    const status = adaptiveLearningSystem.getStatus();

    const currentCandle = candles[candles.length - 1];
    const withinTradingHours = isWithinTradingHours();

    // APEX ACCOUNT LIMITS
    const APEX_MAX_DRAWDOWN = 5000; // $5,000 max drawdown or eval fails
    const STARTING_BALANCE = 150000;

    // Calculate current drawdown
    const currentBalance = STARTING_BALANCE + tradingState.totalPnL;
    const drawdown = STARTING_BALANCE - currentBalance;
    const drawdownExceeded = drawdown >= APEX_MAX_DRAWDOWN;

    // Check if can trade - NO minimum time between trades (that's not an Apex rule)
    const canTrade = withinTradingHours &&
                     tradingState.enabled &&
                     !tradingState.currentPosition &&
                     !drawdownExceeded; // CRITICAL: Stop trading if drawdown exceeded

    // ========================================================================
    // AUTO-CLOSE: Check if current position hit SL/TP
    // ========================================================================
    let autoCloseResult = null;
    const currentPrice = currentCandle.close;

    if (tradingState.currentPosition && tradingState.enabled) {
      const pos = tradingState.currentPosition;
      let shouldClose = false;
      let exitType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MAX_HOLD' | 'MANUAL' = 'STOP_LOSS';
      let pnl = 0;

      if (pos.direction === 'LONG') {
        // Long position: close if price <= stopLoss OR price >= takeProfit
        if (currentPrice <= pos.stopLoss) {
          shouldClose = true;
          exitType = 'STOP_LOSS';
          pnl = (pos.stopLoss - pos.entry) * 50 - 6.84; // ES = $50/point
        } else if (currentPrice >= pos.takeProfit) {
          shouldClose = true;
          exitType = 'TAKE_PROFIT';
          pnl = (pos.takeProfit - pos.entry) * 50 - 6.84;
        }
      } else {
        // Short position: close if price >= stopLoss OR price <= takeProfit
        if (currentPrice >= pos.stopLoss) {
          shouldClose = true;
          exitType = 'STOP_LOSS';
          pnl = (pos.entry - pos.stopLoss) * 50 - 6.84;
        } else if (currentPrice <= pos.takeProfit) {
          shouldClose = true;
          exitType = 'TAKE_PROFIT';
          pnl = (pos.entry - pos.takeProfit) * 50 - 6.84;
        }
      }

      if (shouldClose) {
        const exitDirection = pos.direction === 'LONG' ? 'SELL' : 'BUY';
        const closeResult = await executePickMyTrade(exitDirection, 1);

        // CRITICAL: Only record close if CONFIRMED by PickMyTrade
        if (closeResult.success && !closeResult.message?.includes('NO PERMISSION')) {
          // Record trade outcome for learning
          await adaptiveLearningSystem.recordTradeOutcome({
            id: `trade_${Date.now()}`,
            timestamp: new Date(),
            strategy: pos.strategy,
            regime: regime,
            direction: pos.direction,
            entry: pos.entry,
            exit: exitType === 'STOP_LOSS' ? pos.stopLoss : pos.takeProfit,
            pnl,
            exitType,
            isSimulation: false
          });

          // Update state
          tradingState.dailyPnL += pnl;
          tradingState.totalPnL += pnl;
          if (pnl > 0) tradingState.totalWins++;
          tradingState.currentPosition = null;
          await saveTradingState(tradingState);

          autoCloseResult = {
            closed: true,
            orderId: closeResult.orderId,
            exitType,
            pnl: pnl.toFixed(2),
            message: `CONFIRMED CLOSE: ${exitType} at $${pnl.toFixed(2)}${closeResult.orderId ? ` (ID: ${closeResult.orderId})` : ''}`
          };
        } else {
          // Close FAILED - position still open
          autoCloseResult = {
            closed: false,
            error: closeResult.message,
            message: `CLOSE REJECTED: ${closeResult.message} - Position still open`
          };
        }
      }
    }

    // ========================================================================
    // AUTO-EXECUTION: Automatically execute trades when conditions are met
    // ========================================================================
    let autoExecutionResult = null;

    // Recalculate canTrade after potential auto-close
    const canTradeNow = withinTradingHours &&
                        tradingState.enabled &&
                        !tradingState.currentPosition &&
                        !drawdownExceeded;

    if (canTradeNow && signal && tradingState.enabled) {
      // AUTO-EXECUTE THE TRADE
      const direction = signal.direction === 'LONG' ? 'BUY' : 'SELL';
      const execResult = await executePickMyTrade(direction, 1);

      // CRITICAL: Only record trade if CONFIRMED by PickMyTrade
      // execResult.success is only true if no errors AND confirmed
      if (execResult.success && !execResult.message?.includes('NO PERMISSION')) {
        // Update state with new position
        tradingState.currentPosition = {
          direction: signal.direction,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          strategy: signal.strategy,
          timestamp: new Date().toISOString()
        };
        tradingState.dailyTrades++;
        tradingState.totalTrades++;
        tradingState.lastTradeTime = new Date().toISOString();
        await saveTradingState(tradingState);

        autoExecutionResult = {
          executed: true,
          orderId: execResult.orderId,  // Include order ID for verification
          strategy: signal.strategy,
          direction: signal.direction,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          message: `CONFIRMED: ${signal.direction} via ${signal.strategy}${execResult.orderId ? ` (ID: ${execResult.orderId})` : ''}`
        };
      } else {
        // TRADE FAILED - Do NOT record it
        autoExecutionResult = {
          executed: false,
          error: execResult.message,
          details: execResult.details,
          message: `REJECTED: ${execResult.message}`
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      estTime: est.toISOString(),
      estHour: est.getHours(),

      // Market status
      marketStatus: {
        withinTradingHours,
        price: currentCandle.close,
        regime,
        indicators: {
          ema20: indicators.ema20.toFixed(2),
          ema50: indicators.ema50.toFixed(2),
          rsi: indicators.rsi.toFixed(1),
          atr: indicators.atr.toFixed(2),
          vwap: indicators.vwap.toFixed(2),
          distanceToVwap: ((currentCandle.close - indicators.vwap) / indicators.atr).toFixed(2),
          distanceToEma20: ((currentCandle.close - indicators.ema20) / indicators.atr).toFixed(2)
        }
      },

      // Trading state
      tradingState: {
        enabled: tradingState.enabled,
        currentPosition: tradingState.currentPosition,
        canTrade,
        dailyTrades: tradingState.dailyTrades,
        dailyPnL: tradingState.dailyPnL.toFixed(2),
        totalPnL: tradingState.totalPnL.toFixed(2),
        totalTrades: tradingState.totalTrades,
        totalWins: tradingState.totalWins,
        winRate: tradingState.totalTrades > 0
          ? ((tradingState.totalWins / tradingState.totalTrades) * 100).toFixed(1) + '%'
          : 'N/A'
      },

      // APEX ACCOUNT STATUS
      apexStatus: {
        startingBalance: STARTING_BALANCE,
        currentBalance: currentBalance.toFixed(2),
        drawdown: drawdown.toFixed(2),
        maxDrawdown: APEX_MAX_DRAWDOWN,
        drawdownPercent: ((drawdown / APEX_MAX_DRAWDOWN) * 100).toFixed(1) + '%',
        drawdownExceeded,
        remainingBuffer: (APEX_MAX_DRAWDOWN - drawdown).toFixed(2),
        status: drawdownExceeded ? 'EVAL FAILED - STOP TRADING' :
                drawdown > 4000 ? 'DANGER - Near limit' :
                drawdown > 3000 ? 'WARNING - Reduce size' : 'SAFE'
      },

      // Signal
      signal: signal ? {
        strategy: signal.strategy,
        direction: signal.direction,
        confidence: (signal.confidence * 100).toFixed(1) + '%',
        weight: (signal.weight * 100).toFixed(0) + '%',
        reason: signal.reason,
        entry: signal.entry.toFixed(2),
        stopLoss: signal.stopLoss.toFixed(2),
        takeProfit: signal.takeProfit.toFixed(2)
      } : null,

      // All potential signals
      allSignals: allSignals.slice(0, 5).map(s => ({
        strategy: s.strategy,
        direction: s.direction,
        confidence: (s.confidence * 100).toFixed(1) + '%',
        weight: (s.weight * 100).toFixed(0) + '%'
      })),

      // Adaptive system status
      adaptiveStatus: {
        activeStrategies: status.activeStrategies,
        disabledStrategies: status.disabledStrategies,
        recentPerformance: {
          trades: status.recentPerformance.trades,
          wins: status.recentPerformance.wins,
          pnl: status.recentPerformance.pnl.toFixed(2)
        },
        strategyWeights: Object.fromEntries(
          Object.entries(status.weights)
            .sort((a, b) => b[1] - a[1])
            .map(([name, weight]) => [name, (weight * 100).toFixed(0) + '%'])
        ),
        // SAFETY: Pending changes require Monte Carlo validation
        pendingValidation: status.pendingValidation,
        lastValidationTime: status.lastValidationTime,
        pendingChanges: status.pendingChanges.length > 0 ? status.pendingChanges.map(c => ({
          strategy: c.strategy,
          currentWeight: (c.activeWeight * 100).toFixed(0) + '%',
          suggestedWeight: (c.pendingWeight * 100).toFixed(0) + '%',
          needsValidation: true
        })) : [],
        safetyMessage: status.pendingValidation
          ? '⚠️ PENDING CHANGES require Monte Carlo validation before applying to live trading'
          : '✅ All active weights are validated'
      },

      // PickMyTrade status
      pickMyTradeConnected: !!(process.env.PICKMYTRADE_CONNECTION_NAME && process.env.APEX_ACCOUNT_ID),
      pickMyTradeConnectionName: process.env.PICKMYTRADE_CONNECTION_NAME ? '***' + process.env.PICKMYTRADE_CONNECTION_NAME.slice(-4) : null,
      apexAccountId: process.env.APEX_ACCOUNT_ID ? '***' + process.env.APEX_ACCOUNT_ID.slice(-4) : null,

      // Auto-execution result (if trade was auto-executed this poll)
      autoExecution: autoExecutionResult,

      // Auto-close result (if position was auto-closed this poll)
      autoClose: autoCloseResult
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const tradingState = await getTradingState();

    switch (action) {
      case 'enable': {
        tradingState.enabled = true;
        await saveTradingState(tradingState);
        return NextResponse.json({ success: true, message: 'Adaptive trading ENABLED' });
      }

      case 'disable': {
        tradingState.enabled = false;
        await saveTradingState(tradingState);
        return NextResponse.json({ success: true, message: 'Adaptive trading DISABLED' });
      }

      case 'execute': {
        // Get current signal
        const candles = await fetchMarketData();
        const { signal, regime } = await adaptiveLearningSystem.generateSignal(candles);

        if (!signal) {
          return NextResponse.json({
            success: false,
            message: 'No valid signal to execute'
          });
        }

        if (tradingState.currentPosition) {
          return NextResponse.json({
            success: false,
            message: 'Already in a position'
          });
        }

        // Execute trade via PickMyTrade
        const direction = signal.direction === 'LONG' ? 'BUY' : 'SELL';
        const result = await executePickMyTrade(direction, 1);

        if (result.success) {
          tradingState.currentPosition = {
            direction: signal.direction,
            entry: signal.entry,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            strategy: signal.strategy,
            timestamp: new Date().toISOString()
          };
          tradingState.dailyTrades++;
          tradingState.totalTrades++;
          tradingState.lastTradeTime = new Date().toISOString();
          await saveTradingState(tradingState);
        }

        return NextResponse.json({
          success: result.success,
          message: result.message,
          trade: result.success ? {
            strategy: signal.strategy,
            direction: signal.direction,
            entry: signal.entry,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit
          } : null
        });
      }

      case 'close': {
        if (!tradingState.currentPosition) {
          return NextResponse.json({
            success: false,
            message: 'No position to close'
          });
        }

        const exitDirection = tradingState.currentPosition.direction === 'LONG' ? 'SELL' : 'BUY';
        const result = await executePickMyTrade(exitDirection, 1);

        if (result.success) {
          // Record trade outcome
          const candles = await fetchMarketData();
          const currentPrice = candles[candles.length - 1].close;
          const pnl = tradingState.currentPosition.direction === 'LONG'
            ? (currentPrice - tradingState.currentPosition.entry) * 50 - 6.84
            : (tradingState.currentPosition.entry - currentPrice) * 50 - 6.84;

          // Record for learning
          await adaptiveLearningSystem.recordTradeOutcome({
            id: `trade_${Date.now()}`,
            timestamp: new Date(),
            strategy: tradingState.currentPosition.strategy,
            regime: 'RANGE_TIGHT', // Would get from current regime
            direction: tradingState.currentPosition.direction,
            entry: tradingState.currentPosition.entry,
            exit: currentPrice,
            pnl,
            exitType: 'MANUAL',
            isSimulation: false
          });

          // Update state
          tradingState.dailyPnL += pnl;
          tradingState.totalPnL += pnl;
          if (pnl > 0) tradingState.totalWins++;
          tradingState.currentPosition = null;
          await saveTradingState(tradingState);

          return NextResponse.json({
            success: true,
            message: `Position closed. P&L: $${pnl.toFixed(2)}`,
            pnl
          });
        }

        return NextResponse.json({
          success: false,
          message: result.message
        });
      }

      case 'record_outcome': {
        // For recording paper/simulation trade outcomes
        const { strategy, regime, direction, entry, exit, pnl, exitType, isSimulation = true } = body;

        await adaptiveLearningSystem.recordTradeOutcome({
          id: `trade_${Date.now()}`,
          timestamp: new Date(),
          strategy,
          regime,
          direction,
          entry,
          exit,
          pnl,
          exitType,
          isSimulation
        });

        return NextResponse.json({
          success: true,
          message: 'Trade outcome recorded for learning'
        });
      }

      case 'reset_daily': {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = tradingState.lastUpdated?.split('T')[0];

        if (today !== lastDate) {
          tradingState.dailyTrades = 0;
          tradingState.dailyPnL = 0;
          await saveTradingState(tradingState);
        }

        return NextResponse.json({
          success: true,
          message: 'Daily stats reset'
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
