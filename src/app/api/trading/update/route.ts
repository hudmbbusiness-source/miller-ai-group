// ============================================================================
// KACHOW - TRADING API
// Receives updates from Apex trading system
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// Valid API keys (set in Vercel environment variables)
const VALID_API_KEYS = [
  process.env.TRADING_API_KEY || ''
].filter(Boolean);

// In-memory store for trading state
// In production, consider using Redis or database
let tradingState: any = null;

// =============================================================================
// POST - Receive trading updates
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
      console.log('[Trading API] Unauthorized request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse payload
    const payload = await request.json();

    // Store state
    tradingState = {
      ...payload,
      receivedAt: new Date().toISOString()
    };

    // Log event
    console.log(`[Trading] Event: ${payload.event}, Balance: $${payload.account?.balance?.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      message: 'Trading state updated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Trading API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update trading state' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Retrieve current trading state
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    // Allow requests with valid API key OR from same origin (dashboard)
    const origin = request.headers.get('origin') || '';
    const isLocalRequest = origin.includes('kachow.app') || origin.includes('localhost');

    if (!isLocalRequest && (!apiKey || !VALID_API_KEYS.includes(apiKey))) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return current state or default
    if (!tradingState) {
      return NextResponse.json({
        success: true,
        data: {
          account: {
            name: 'Apex 300K PA',
            balance: 300000,
            profit: 0,
            threshold: 292500,
            buffer: 7500
          },
          performance: {
            trades: 0,
            wins: 0,
            win_rate: 0,
            total_pnl: 0
          },
          strategy: {
            name: 'EMA21 Dip Buying',
            entry: 'EMA21 < -0.5%',
            stop: '2.0 ATR',
            target: '1.5 ATR'
          },
          position: null,
          trade_history: [],
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: tradingState
    });

  } catch (error) {
    console.error('[Trading API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get trading state' },
      { status: 500 }
    );
  }
}
