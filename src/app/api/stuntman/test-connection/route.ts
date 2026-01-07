/**
 * TEST PICKMYTRADE CONNECTION
 *
 * This endpoint sends a REAL test to PickMyTrade to verify connection
 * GET - Check connection status
 * POST - Send a test trade (qty=0 so it won't execute on Apex)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const connectionName = process.env.PICKMYTRADE_CONNECTION_NAME?.trim();
  const accountId = process.env.APEX_ACCOUNT_ID?.trim();
  // Also check old token in case user hasn't updated yet
  const oldToken = process.env.PICKMYTRADE_TOKEN?.trim();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: 'Connection Test Endpoint',

    envVars: {
      PICKMYTRADE_CONNECTION_NAME: connectionName ? `SET (${connectionName.length} chars)` : 'NOT SET',
      APEX_ACCOUNT_ID: accountId ? `SET (***${accountId.slice(-4)})` : 'NOT SET',
      PICKMYTRADE_TOKEN_OLD: oldToken ? `SET (${oldToken.length} chars) - DEPRECATED, use CONNECTION_NAME` : 'NOT SET'
    },

    isConfigured: !!(connectionName && accountId),

    instructions: !connectionName ? [
      '1. Go to https://pickmytrade.trade and log in',
      '2. Find your Apex connection name in the dashboard',
      '3. In Vercel, add: PICKMYTRADE_CONNECTION_NAME = (your connection name)',
      '4. Make sure APEX_ACCOUNT_ID is also set'
    ] : [
      'Connection appears configured. POST to this endpoint to send a test trade.'
    ],

    apiUrl: 'https://api.pickmytrade.io/v2/add-trade-data',
    docs: 'https://docs.pickmytrade.trade/docs/'
  });
}

export async function POST(request: NextRequest) {
  const connectionName = process.env.PICKMYTRADE_CONNECTION_NAME?.trim();
  const accountId = process.env.APEX_ACCOUNT_ID?.trim();

  if (!connectionName || !accountId) {
    return NextResponse.json({
      success: false,
      error: 'Missing configuration',
      needed: {
        PICKMYTRADE_CONNECTION_NAME: !connectionName,
        APEX_ACCOUNT_ID: !accountId
      },
      instructions: 'Set these in Vercel environment variables'
    }, { status: 400 });
  }

  // Send test trade with quantity 0 (won't execute but tests connection)
  const payload = {
    connection_name: connectionName,
    account_id: accountId,
    data: 'buy',  // Test buy
    symbol: 'ES',
    quantity: 0,  // ZERO quantity = test only, won't execute
    order_type: 'MKT'
  };

  console.log('[TestConnection] Sending test payload:', JSON.stringify(payload));

  try {
    // CRITICAL: Use .io for Rithmic/Apex, NOT .trade (which is for Tradovate)
    const response = await fetch('https://api.pickmytrade.io/v2/add-trade-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    console.log('[TestConnection] Response:', response.status, responseText);

    return NextResponse.json({
      success: response.ok,
      timestamp: new Date().toISOString(),

      request: {
        url: 'https://api.pickmytrade.io/v2/add-trade-data',
        method: 'POST',
        payload
      },

      response: {
        status: response.status,
        statusText: response.statusText,
        body: responseJson
      },

      interpretation: response.ok
        ? '✅ PickMyTrade accepted the request! Connection is working.'
        : response.status === 400
          ? '⚠️ Bad request - check connection_name and account_id match your PickMyTrade dashboard'
          : response.status === 401
            ? '❌ Unauthorized - connection_name or credentials are wrong'
            : response.status === 404
              ? '⚠️ Connection not found - verify connection_name in PickMyTrade dashboard'
              : `❌ Error ${response.status} - see response body for details`,

      nextSteps: response.ok
        ? ['Connection verified!', 'The system will now auto-execute real trades when signals trigger.']
        : ['Check your connection_name in PickMyTrade dashboard', 'Make sure it matches exactly (case-sensitive)']
    });

  } catch (e: any) {
    console.error('[TestConnection] Error:', e.message);
    return NextResponse.json({
      success: false,
      error: e.message,
      interpretation: '❌ Failed to reach PickMyTrade API - network error'
    }, { status: 500 });
  }
}
