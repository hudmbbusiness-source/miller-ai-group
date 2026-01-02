/**
 * StuntMan Trade Execution API
 *
 * Executes trades via PickMyTrade webhook to Apex/Rithmic.
 * This is the bridge between StuntMan signals and live execution.
 *
 * POST /api/stuntman/execute - Execute a trade signal
 * GET /api/stuntman/execute - Get execution status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  PickMyTradeClient,
  PickMyTradeConfig,
  TradeSignal,
  getCurrentContractSymbol,
  calculatePositionSize,
  ES_POINT_VALUE,
  NQ_POINT_VALUE,
} from '@/lib/stuntman/pickmytrade-client';
import { checkApexRiskStatus, DEFAULT_APEX_SAFETY } from '@/lib/stuntman/risk-analytics';

// =============================================================================
// SINGLETON CLIENT
// =============================================================================

let pickMyTradeClient: PickMyTradeClient | null = null;

function getClient(): PickMyTradeClient | null {
  if (!pickMyTradeClient && process.env.PICKMYTRADE_TOKEN) {
    const config: PickMyTradeConfig = {
      token: process.env.PICKMYTRADE_TOKEN,
      accountId: process.env.APEX_ACCOUNT_ID || 'APEX-456334',
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 5, // Conservative default
      enabled: process.env.TRADING_ENABLED === 'true',
    };
    pickMyTradeClient = new PickMyTradeClient(config);
  }
  return pickMyTradeClient;
}

// =============================================================================
// TYPES
// =============================================================================

interface ExecuteRequest {
  action: 'BUY' | 'SELL' | 'FLAT';
  instrument: 'ES' | 'NQ';
  contracts?: number;
  stopLossPoints?: number;
  takeProfitPoints?: number;
  reason?: string;
  // Risk parameters
  riskPercent?: number;
  accountBalance?: number;
}

// =============================================================================
// POST - Execute Trade
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExecuteRequest = await request.json();

    // Validate request
    if (!body.action || !body.instrument) {
      return NextResponse.json(
        { error: 'action and instrument are required' },
        { status: 400 }
      );
    }

    // Check if PickMyTrade is configured
    const client = getClient();
    if (!client) {
      return NextResponse.json({
        error: 'PickMyTrade not configured',
        message: 'Set PICKMYTRADE_TOKEN in environment variables',
        configured: false,
      }, { status: 503 });
    }

    // Check if trading is enabled
    if (!client.isEnabled) {
      return NextResponse.json({
        error: 'Trading is disabled',
        message: 'Enable trading in the dashboard first',
      }, { status: 403 });
    }

    // Get current contract symbol
    const symbol = getCurrentContractSymbol(body.instrument);

    // Calculate position size if not specified
    let contracts = body.contracts || 1;
    if (body.riskPercent && body.accountBalance && body.stopLossPoints) {
      contracts = calculatePositionSize(
        body.accountBalance,
        body.riskPercent,
        body.stopLossPoints,
        body.instrument,
        5 // Max 5 contracts for safety
      );
    }

    // Check Apex risk status before trading
    const accountBalance = body.accountBalance || 150000;
    const riskStatus = checkApexRiskStatus(
      150000,           // Account size
      accountBalance,   // Current balance
      0,                // Daily P&L (would need real data)
      accountBalance,   // High water mark
      0,                // Trading days
      DEFAULT_APEX_SAFETY,
      6                 // Days remaining
    );

    if (!riskStatus.canTrade) {
      return NextResponse.json({
        error: 'Trading blocked by risk management',
        riskStatus: riskStatus.riskStatus,
        warnings: riskStatus.warnings,
        recommendations: riskStatus.recommendations,
      }, { status: 403 });
    }

    // Apply position size recommendation from risk status
    const adjustedContracts = Math.max(
      1,
      Math.floor(contracts * riskStatus.recommendedPositionSize)
    );

    // Calculate stop loss and take profit prices
    const pointValue = body.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE;
    const dollarStopLoss = body.stopLossPoints
      ? body.stopLossPoints * pointValue * adjustedContracts
      : undefined;
    const dollarTakeProfit = body.takeProfitPoints
      ? body.takeProfitPoints * pointValue * adjustedContracts
      : undefined;

    // Build signal
    const signal: TradeSignal = {
      action: body.action,
      symbol,
      quantity: adjustedContracts,
      orderType: 'MKT',
      dollarStopLoss,
      dollarTakeProfit,
      reason: body.reason || `Manual ${body.action} signal`,
    };

    // Execute
    const result = await client.executeSignal(signal);

    return NextResponse.json({
      success: result.success,
      orderId: result.orderId,
      message: result.message,
      signal: {
        action: body.action,
        symbol,
        contracts: adjustedContracts,
        originalContracts: contracts,
        positionSizeAdjusted: adjustedContracts !== contracts,
      },
      riskStatus: {
        status: riskStatus.riskStatus,
        recommendedSize: riskStatus.recommendedPositionSize,
        safetyBuffer: riskStatus.safetyBuffer,
        maxAllowedLossToday: riskStatus.maxAllowedLossToday,
      },
      timestamp: result.timestamp,
    });

  } catch (error) {
    console.error('Execute error:', error);
    return NextResponse.json({
      error: 'Execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// =============================================================================
// GET - Status and History
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getClient();

    if (!client) {
      return NextResponse.json({
        configured: false,
        message: 'PickMyTrade not configured. Set PICKMYTRADE_TOKEN in environment.',
        setupInstructions: [
          '1. Create account at pickmytrade.io',
          '2. Connect your Apex/Rithmic account',
          '3. Get your API token from the dashboard',
          '4. Add PICKMYTRADE_TOKEN to environment variables',
        ],
      });
    }

    return NextResponse.json({
      configured: true,
      enabled: client.isEnabled,
      todaysTrades: client.todaysTrades,
      recentTrades: client.trades.slice(-20),
      currentContract: {
        ES: getCurrentContractSymbol('ES'),
        NQ: getCurrentContractSymbol('NQ'),
      },
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({
      error: 'Failed to get status',
    }, { status: 500 });
  }
}

// =============================================================================
// PUT - Enable/Disable Trading
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const client = getClient();

    if (!client) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    if (body.action === 'enable') {
      client.enable();
      return NextResponse.json({ enabled: true, message: 'Trading enabled' });
    } else if (body.action === 'disable') {
      client.disable();
      return NextResponse.json({ enabled: false, message: 'Trading disabled' });
    } else if (body.action === 'emergency_stop') {
      await client.emergencyStop();
      return NextResponse.json({ enabled: false, message: 'Emergency stop activated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Control error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
