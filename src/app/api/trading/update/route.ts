// ============================================================================
// KACHOW - TRADING API
// Receives updates from Apex trading system + handles commands
// ALL DATA IS REAL - Commands control actual Tradovate actions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// Valid API keys (set in Vercel environment variables)
const VALID_API_KEYS = [
  process.env.TRADING_API_KEY || ''
].filter(Boolean);

// In-memory store for trading state and commands
let tradingState: any = null;
let pendingCommand: { command: string; timestamp: string; acknowledged: boolean } | null = null;
let systemStatus: 'stopped' | 'running' | 'starting' | 'stopping' = 'stopped';

// =============================================================================
// POST - Receive trading updates OR commands
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    const origin = request.headers.get('origin') || '';
    const isFromDashboard = origin.includes('kachow.app') || origin.includes('localhost');

    const payload = await request.json();

    // Handle COMMANDS from dashboard (Start/Stop/Flatten)
    if (payload.type === 'command') {
      if (!isFromDashboard) {
        return NextResponse.json(
          { success: false, error: 'Commands only allowed from dashboard' },
          { status: 403 }
        );
      }

      const validCommands = ['START', 'STOP', 'FLATTEN'];
      if (!validCommands.includes(payload.command)) {
        return NextResponse.json(
          { success: false, error: 'Invalid command' },
          { status: 400 }
        );
      }

      pendingCommand = {
        command: payload.command,
        timestamp: new Date().toISOString(),
        acknowledged: false
      };

      if (payload.command === 'START') systemStatus = 'starting';
      if (payload.command === 'STOP') systemStatus = 'stopping';
      if (payload.command === 'FLATTEN') systemStatus = 'stopping';

      console.log(`[Trading] Command received: ${payload.command}`);

      return NextResponse.json({
        success: true,
        message: `Command ${payload.command} queued`,
        command: pendingCommand
      });
    }

    // Handle UPDATES from local trading system - requires API key
    if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.commandAck && pendingCommand && !pendingCommand.acknowledged) {
      pendingCommand.acknowledged = true;
    }

    if (payload.systemStatus) {
      systemStatus = payload.systemStatus;
    }

    tradingState = {
      ...payload,
      systemStatus,
      connected: true,
      receivedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Trading state updated',
      timestamp: new Date().toISOString(),
      pendingCommand: pendingCommand && !pendingCommand.acknowledged ? pendingCommand : null
    });

  } catch (error) {
    console.error('[Trading API] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

// =============================================================================
// GET - Retrieve current trading state + pending commands
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    const origin = request.headers.get('origin') || '';
    const isLocalRequest = origin.includes('kachow.app') || origin.includes('localhost');

    if (!isLocalRequest && (!apiKey || !VALID_API_KEYS.includes(apiKey))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // NO FAKE DATA - if not connected, show that clearly
    if (!tradingState) {
      return NextResponse.json({
        success: true,
        data: {
          account: { name: 'Not connected', balance: 0, profit: 0, threshold: 292500, buffer: 0 },
          performance: { trades: 0, wins: 0, win_rate: 0, total_pnl: 0 },
          strategy: { name: 'EMA21 Dip Buying', entry: 'EMA21 < -0.5%', stop: '2.0 ATR', target: '1.5 ATR' },
          position: null,
          trade_history: [],
          systemStatus: 'stopped',
          connected: false,
          timestamp: new Date().toISOString()
        },
        pendingCommand: pendingCommand && !pendingCommand.acknowledged ? pendingCommand : null
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...tradingState, connected: true, systemStatus },
      pendingCommand: pendingCommand && !pendingCommand.acknowledged ? pendingCommand : null
    });

  } catch (error) {
    console.error('[Trading API] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get trading state' }, { status: 500 });
  }
}
