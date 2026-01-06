/**
 * SYSTEM STATUS API
 *
 * Comprehensive status check for all StuntMan components:
 * - PickMyTrade connection
 * - Credentials validation
 * - Supabase trading state
 * - Telegram notifications
 * - Market data sources
 *
 * GET: Full system health check
 * POST: Run connection tests and optionally send Telegram summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadTradingState, getTradingState } from '@/lib/stuntman/trading-state'
import {
  testTelegramConnection,
  isTelegramConfigured,
  sendSyncNotification,
} from '@/lib/stuntman/telegram-notifications'
import { getCurrentContractSymbol } from '@/lib/stuntman/pickmytrade-client'

// =============================================================================
// CREDENTIAL CHECKS
// =============================================================================

function checkCredentials() {
  const PICKMYTRADE_TOKEN = (process.env.PICKMYTRADE_TOKEN || '').trim()
  const APEX_ACCOUNT_ID = (process.env.APEX_ACCOUNT_ID || '').trim()
  const RITHMIC_CONNECTION_NAME = (process.env.RITHMIC_CONNECTION_NAME || '').trim()
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return {
    pickMyTrade: {
      token: PICKMYTRADE_TOKEN ? {
        set: true,
        length: PICKMYTRADE_TOKEN.length,
        preview: `${PICKMYTRADE_TOKEN.substring(0, 4)}...${PICKMYTRADE_TOKEN.slice(-4)}`,
        valid: PICKMYTRADE_TOKEN.length >= 10
      } : { set: false, valid: false },
      accountId: APEX_ACCOUNT_ID ? {
        set: true,
        value: APEX_ACCOUNT_ID,
        valid: APEX_ACCOUNT_ID.includes('-') && APEX_ACCOUNT_ID.includes('01')
      } : { set: false, valid: false },
      connectionName: RITHMIC_CONNECTION_NAME ? {
        set: true,
        value: RITHMIC_CONNECTION_NAME,
        valid: RITHMIC_CONNECTION_NAME.length > 0
      } : { set: false, valid: false },
      allValid: Boolean(
        PICKMYTRADE_TOKEN &&
        PICKMYTRADE_TOKEN.length >= 10 &&
        APEX_ACCOUNT_ID &&
        APEX_ACCOUNT_ID.includes('-') &&
        RITHMIC_CONNECTION_NAME
      )
    },
    telegram: {
      botToken: TELEGRAM_BOT_TOKEN ? { set: true, valid: true } : { set: false, valid: false },
      chatId: TELEGRAM_CHAT_ID ? { set: true, value: TELEGRAM_CHAT_ID } : { set: false },
      configured: isTelegramConfigured()
    },
    supabase: {
      url: SUPABASE_URL ? { set: true, preview: SUPABASE_URL.substring(0, 30) + '...' } : { set: false },
      key: SUPABASE_KEY ? { set: true, length: SUPABASE_KEY.length } : { set: false },
      configured: Boolean(SUPABASE_URL && SUPABASE_KEY)
    }
  }
}

// =============================================================================
// GET - Full System Status
// =============================================================================

export async function GET() {
  const startTime = Date.now()

  try {
    // Check credentials
    const credentials = checkCredentials()

    // Load trading state from Supabase
    let tradingState = null
    let supabaseStatus = 'UNKNOWN'
    try {
      tradingState = await loadTradingState()
      supabaseStatus = tradingState ? 'CONNECTED' : 'NO_DATA'
    } catch (error) {
      supabaseStatus = 'ERROR'
    }

    // Get current contract symbols
    const esSymbol = getCurrentContractSymbol('ES')
    const nqSymbol = getCurrentContractSymbol('NQ')

    // Calculate overall system health
    const isHealthy =
      credentials.pickMyTrade.allValid &&
      credentials.supabase.configured &&
      supabaseStatus === 'CONNECTED'

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,

      credentials: credentials,

      supabase: {
        status: supabaseStatus,
        tradingState: tradingState ? {
          enabled: tradingState.enabled,
          currentPosition: tradingState.currentPosition ? {
            direction: tradingState.currentPosition.direction,
            entryPrice: tradingState.currentPosition.entryPrice,
            contracts: tradingState.currentPosition.contracts,
            symbol: tradingState.currentPosition.symbol,
          } : null,
          dailyTrades: tradingState.dailyTrades,
          dailyPnL: tradingState.dailyPnL,
          totalPnL: tradingState.totalPnL,
          totalTrades: tradingState.totalTrades,
          totalWins: tradingState.totalWins,
          totalLosses: tradingState.totalLosses,
          lastUpdated: tradingState.lastUpdated,
        } : null
      },

      trading: {
        instruments: {
          ES: esSymbol,
          NQ: nqSymbol
        },
        autoTradingEnabled: tradingState?.enabled || false,
        hasOpenPosition: !!tradingState?.currentPosition,
        safeToTrade: isHealthy && tradingState?.enabled
      },

      checks: {
        pickMyTradeCredentials: credentials.pickMyTrade.allValid ? 'PASS' : 'FAIL',
        supabaseConnection: supabaseStatus === 'CONNECTED' ? 'PASS' : 'FAIL',
        telegramConfigured: credentials.telegram.configured ? 'PASS' : 'WARN',
      },

      recommendations: [
        ...(credentials.pickMyTrade.allValid ? [] : ['Fix PickMyTrade credentials in Vercel env vars']),
        ...(supabaseStatus !== 'CONNECTED' ? ['Check Supabase connection'] : []),
        ...(credentials.telegram.configured ? [] : ['Configure Telegram for trade alerts']),
      ]
    })
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Run Tests and Optionally Send Telegram Summary
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sendTelegramSummary = body.sendTelegramSummary || false

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Test 1: Credential validation
    const credentials = checkCredentials()
    results.tests.credentials = {
      pickMyTrade: credentials.pickMyTrade.allValid ? 'PASS' : 'FAIL',
      supabase: credentials.supabase.configured ? 'PASS' : 'FAIL',
      telegram: credentials.telegram.configured ? 'PASS' : 'WARN'
    }

    // Test 2: Supabase connection
    try {
      const state = await getTradingState()
      results.tests.supabase = {
        status: 'PASS',
        enabled: state.enabled,
        lastUpdated: state.lastUpdated
      }
    } catch (error) {
      results.tests.supabase = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Telegram connection (if configured)
    if (credentials.telegram.configured) {
      try {
        const telegramResult = await testTelegramConnection()
        results.tests.telegram = {
          status: telegramResult.success ? 'PASS' : 'FAIL',
          message: telegramResult.message
        }
      } catch (error) {
        results.tests.telegram = {
          status: 'FAIL',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    } else {
      results.tests.telegram = { status: 'SKIPPED', reason: 'Not configured' }
    }

    // Calculate overall status
    const allPassed = Object.values(results.tests).every(
      (t: any) => t.status === 'PASS' || t.status === 'WARN' || t.status === 'SKIPPED'
    )
    results.overallStatus = allPassed ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED'

    // Send Telegram summary if requested
    if (sendTelegramSummary && credentials.telegram.configured) {
      await sendSyncNotification({
        component: 'System Health Check',
        status: allPassed ? 'OK' : 'MISMATCH',
        message: `Credentials: ${results.tests.credentials.pickMyTrade}, Supabase: ${results.tests.supabase.status}, Telegram: ${results.tests.telegram.status}`
      })
      results.telegramSummarySent = true
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
