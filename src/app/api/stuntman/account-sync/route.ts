/**
 * Account Sync API for Apex/Rithmic Data
 *
 * Endpoints:
 * GET  - Retrieve current account data
 * POST - Sync manual account data from Apex dashboard
 * PUT  - Process webhook updates from PickMyTrade
 */

import { NextRequest, NextResponse } from 'next/server';
import { rithmicClient, APEX_ACCOUNT_CONFIGS } from '@/lib/stuntman/rithmic-client';
import { checkApexRiskStatus } from '@/lib/stuntman/risk-analytics';

// ============================================================================
// GET - Retrieve Account Data
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const accountData = rithmicClient.getAccountData();
    const positions = rithmicClient.getPositions();
    const trades = rithmicClient.getTrades(50);
    const lastSync = rithmicClient.getLastSyncTime();
    const dataSource = rithmicClient.getDataSource();

    // If no data, return default Apex 150K config with proper safety metrics
    if (!accountData) {
      const defaultConfig = APEX_ACCOUNT_CONFIGS['150K'];

      // Get days remaining from query params or default to 6
      const searchParams = request.nextUrl.searchParams;
      const daysRemaining = parseInt(searchParams.get('daysRemaining') || '6');

      // Calculate risk status even for estimated data
      const estimatedRiskStatus = checkApexRiskStatus(
        defaultConfig.startingBalance,
        defaultConfig.startingBalance, // Assume at starting balance
        0, // No daily P&L
        defaultConfig.startingBalance, // High water mark = starting
        0, // No trading days yet
        undefined, // Use default safety config
        daysRemaining
      );

      return NextResponse.json({
        success: true,
        dataSource: 'estimated',
        lastSync: 0,
        syncAge: null,
        account: {
          accountId: 'APEX-456334',
          accountName: defaultConfig.name,
          accountType: 'EVAL',
          balance: {
            cashBalance: defaultConfig.startingBalance,
            openPnL: 0,
            closedPnL: 0,
            totalPnL: 0,
            netLiquidation: defaultConfig.startingBalance,
          },
          limits: {
            maxPositionSize: defaultConfig.maxContracts,
            maxDailyLoss: defaultConfig.maxDailyLoss,
            trailingDrawdown: defaultConfig.trailingDrawdown,
            profitTarget: defaultConfig.profitTarget,
          },
          status: 'ACTIVE',
        },
        positions: [],
        trades: [],
        riskStatus: {
          riskStatus: estimatedRiskStatus.riskStatus,
          canTrade: estimatedRiskStatus.canTrade,
          warnings: [
            '⚠️ Account data is estimated - sync for real values',
            ...estimatedRiskStatus.warnings.filter(w => !w.includes('estimated'))
          ],
          recommendations: [
            'Manually sync data from Apex dashboard',
            ...estimatedRiskStatus.recommendations
          ],
          // Safety metrics
          safetyBuffer: estimatedRiskStatus.safetyBuffer,
          maxAllowedLossToday: estimatedRiskStatus.maxAllowedLossToday,
          recommendedPositionSize: estimatedRiskStatus.recommendedPositionSize,
          stopTradingThreshold: estimatedRiskStatus.stopTradingThreshold,
          daysRemaining: estimatedRiskStatus.daysRemaining,
          requiredDailyProfit: estimatedRiskStatus.requiredDailyProfit,
          trailingDrawdown: estimatedRiskStatus.trailingDrawdown,
          drawdownRemaining: estimatedRiskStatus.maxTrailingDrawdown - estimatedRiskStatus.trailingDrawdown,
          profitProgress: 0,
        },
        message: 'Using estimated data. Sync from Apex dashboard for real values.',
      });
    }

    // Calculate risk status with safety features
    const config = APEX_ACCOUNT_CONFIGS['150K'];
    const currentDrawdown = config.startingBalance - accountData.balance.netLiquidation;
    const highWaterMark = Math.max(
      config.startingBalance,
      accountData.balance.netLiquidation + currentDrawdown
    );

    // Get days remaining from query params or default to 6
    const searchParams = request.nextUrl.searchParams;
    const daysRemaining = parseInt(searchParams.get('daysRemaining') || '6');

    const riskStatus = checkApexRiskStatus(
      config.startingBalance,
      accountData.balance.netLiquidation,
      accountData.balance.closedPnL, // Daily P&L
      highWaterMark,
      0, // Trading days - would need to track separately
      undefined, // Use default safety config
      daysRemaining // Pass evaluation deadline
    );

    // Calculate sync age
    const syncAge = lastSync > 0 ? Math.floor((Date.now() - lastSync) / 1000 / 60) : null;

    return NextResponse.json({
      success: true,
      dataSource,
      lastSync,
      syncAge: syncAge !== null ? `${syncAge} minutes ago` : null,
      account: accountData,
      positions,
      trades,
      riskStatus: {
        riskStatus: riskStatus.riskStatus,
        canTrade: riskStatus.canTrade,
        trailingDrawdown: riskStatus.trailingDrawdown,
        drawdownRemaining: riskStatus.maxTrailingDrawdown - riskStatus.trailingDrawdown,
        profitProgress: (accountData.balance.totalPnL / config.profitTarget) * 100,
        warnings: riskStatus.warnings,
        recommendations: riskStatus.recommendations,
        // NEW safety metrics
        safetyBuffer: riskStatus.safetyBuffer,
        maxAllowedLossToday: riskStatus.maxAllowedLossToday,
        recommendedPositionSize: riskStatus.recommendedPositionSize,
        stopTradingThreshold: riskStatus.stopTradingThreshold,
        daysRemaining: riskStatus.daysRemaining,
        requiredDailyProfit: riskStatus.requiredDailyProfit,
      },
    });
  } catch (error) {
    console.error('Account sync GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve account data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Manual Sync from Apex Dashboard
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      accountId,
      balance,
      openPnL,
      closedPnL,
      trailingDrawdown,
      tradingDays,
      positions,
    } = body;

    // Validate required fields
    if (balance === undefined) {
      return NextResponse.json(
        { success: false, error: 'Balance is required' },
        { status: 400 }
      );
    }

    // Sync the data
    const accountData = rithmicClient.syncManualData({
      accountId: accountId || 'APEX-456334',
      balance: parseFloat(balance),
      openPnL: parseFloat(openPnL || 0),
      closedPnL: parseFloat(closedPnL || 0),
      trailingDrawdown: parseFloat(trailingDrawdown || 0),
      tradingDays: parseInt(tradingDays || 0),
      positions: positions?.map((p: any) => ({
        symbol: p.symbol,
        quantity: parseInt(p.quantity),
        avgPrice: parseFloat(p.avgPrice),
        currentPrice: parseFloat(p.currentPrice || p.avgPrice),
      })),
    });

    // Calculate risk status with safety features
    const config = APEX_ACCOUNT_CONFIGS['150K'];
    const highWaterMark = Math.max(
      config.startingBalance,
      accountData.balance.netLiquidation
    );

    // Get days remaining from body or default to 6
    const daysRemaining = parseInt(body.daysRemaining || '6');

    const riskStatus = checkApexRiskStatus(
      config.startingBalance,
      accountData.balance.netLiquidation,
      accountData.balance.closedPnL,
      highWaterMark,
      parseInt(tradingDays || 0),
      undefined, // Use default safety config
      daysRemaining // Pass evaluation deadline
    );

    return NextResponse.json({
      success: true,
      message: 'Account data synced successfully',
      account: accountData,
      positions: rithmicClient.getPositions(),
      riskStatus: {
        riskStatus: riskStatus.riskStatus,
        canTrade: riskStatus.canTrade,
        warnings: riskStatus.warnings,
        recommendations: riskStatus.recommendations,
        // NEW safety metrics
        safetyBuffer: riskStatus.safetyBuffer,
        maxAllowedLossToday: riskStatus.maxAllowedLossToday,
        recommendedPositionSize: riskStatus.recommendedPositionSize,
        stopTradingThreshold: riskStatus.stopTradingThreshold,
        daysRemaining: riskStatus.daysRemaining,
        requiredDailyProfit: riskStatus.requiredDailyProfit,
      },
    });
  } catch (error) {
    console.error('Account sync POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync account data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Process Webhook Updates from PickMyTrade
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      action,
      orderId,
      symbol,
      side,
      quantity,
      price,
      timestamp,
    } = body;

    // Validate required fields
    if (!action || !symbol || !side || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required webhook fields' },
        { status: 400 }
      );
    }

    // Process the webhook update
    rithmicClient.processWebhookUpdate({
      action,
      orderId: orderId || `WH${Date.now()}`,
      symbol,
      side: side.toUpperCase(),
      quantity: parseInt(quantity),
      price: parseFloat(price),
      timestamp: timestamp || Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      positions: rithmicClient.getPositions(),
      trades: rithmicClient.getTrades(10),
    });
  } catch (error) {
    console.error('Account sync PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Clear Stored Data
// ============================================================================

export async function DELETE() {
  try {
    rithmicClient.clearData();

    return NextResponse.json({
      success: true,
      message: 'Account data cleared',
    });
  } catch (error) {
    console.error('Account sync DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
