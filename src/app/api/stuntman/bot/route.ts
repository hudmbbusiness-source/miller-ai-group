// @ts-nocheck
// =============================================================================
// STUNTMAN AI - ADVANCED TRADING BOT
// =============================================================================
// Uses smart money concepts, whale tracking, and multi-source signals
// NOT basic RSI/MACD - this is the real deal
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INSTRUMENTS } from '@/lib/stuntman/constants'
import {
  generateAdvancedSignal,
  generateAllSignals,
  getBestOpportunities,
  type AdvancedSignal
} from '@/lib/stuntman/signal-generator'

// =============================================================================
// POSITION SIZING - KELLY CRITERION BASED
// =============================================================================

function calculatePositionSize(
  signal: AdvancedSignal,
  balance: number,
  openPositions: number
): number {
  // Kelly Criterion: f* = (bp - q) / b
  // where b = odds, p = win probability, q = 1-p

  const winProb = signal.confidence / 100
  const riskRewardRatio = signal.take_profit / signal.stop_loss

  // Simplified Kelly
  const kelly = (winProb * riskRewardRatio - (1 - winProb)) / riskRewardRatio

  // Use fractional Kelly (25%) to be conservative
  const kellyFraction = Math.max(0, kelly * 0.25)

  // Apply constraints
  const maxPositionPercent = 0.15 // Max 15% per trade
  const minPositionPercent = 0.02 // Min 2% per trade
  const maxOpenPositions = 5

  // Reduce size based on open positions
  const positionMultiplier = Math.max(0.2, 1 - (openPositions / maxOpenPositions))

  let positionPercent = Math.min(kellyFraction, maxPositionPercent) * positionMultiplier
  positionPercent = Math.max(positionPercent, minPositionPercent)

  // Minimum trade value $10
  const positionValue = balance * positionPercent
  if (positionValue < 10) return 0

  return positionValue
}

// =============================================================================
// EXECUTE TRADE
// =============================================================================

async function executeTrade(
  supabase: any,
  accountId: string,
  signal: AdvancedSignal,
  currentPrice: number,
  positionValue: number
): Promise<{ success: boolean; message: string; orderId?: string }> {
  const quantity = positionValue / currentPrice
  const side = signal.action.includes('BUY') ? 'buy' : 'sell'

  // Calculate fees (0.1% taker)
  const fee = positionValue * 0.001

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('stuntman_orders')
    .insert({
      account_id: accountId,
      instrument_name: signal.instrument,
      side,
      type: 'market',
      quantity,
      price: currentPrice,
      filled_quantity: quantity,
      filled_price: currentPrice,
      fee,
      status: 'filled',
      source: 'advanced_bot',
    })
    .select()
    .single()

  if (orderError) {
    return { success: false, message: orderError.message }
  }

  // Get current balance
  const { data: account } = await supabase
    .from('stuntman_accounts')
    .select('balance')
    .eq('id', accountId)
    .single()

  // Update balance
  const newBalance = side === 'buy'
    ? account.balance - positionValue - fee
    : account.balance + positionValue - fee

  await supabase
    .from('stuntman_accounts')
    .update({ balance: newBalance })
    .eq('id', accountId)

  // Create position (for buy) with stop loss and take profit
  if (side === 'buy') {
    const stopLossPrice = currentPrice * (1 - signal.stop_loss / 100)
    const takeProfitPrice = currentPrice * (1 + signal.take_profit / 100)

    await supabase.from('stuntman_positions').insert({
      account_id: accountId,
      instrument_name: signal.instrument,
      side: 'long',
      quantity,
      entry_price: currentPrice,
      current_price: currentPrice,
      unrealized_pnl: 0,
      stop_loss: stopLossPrice,
      take_profit: takeProfitPrice,
      status: 'open',
    })
  }

  // Log trade
  await supabase.from('stuntman_trades').insert({
    account_id: accountId,
    order_id: order.id,
    instrument_name: signal.instrument,
    side,
    price: currentPrice,
    quantity,
    fee,
    pnl: 0,
    source: 'advanced_bot',
  })

  // Save signal
  await supabase.from('stuntman_signals').insert({
    account_id: accountId,
    instrument_name: signal.instrument,
    side,
    strength: signal.confidence / 100,
    confidence: signal.confidence / 100,
    source: signal.sources.map(s => s.name).join(', '),
    indicators: signal.sources,
    status: 'executed',
  })

  return {
    success: true,
    message: `${side.toUpperCase()} ${quantity.toFixed(6)} ${signal.instrument} @ $${currentPrice.toFixed(2)} | SL: ${signal.stop_loss}% | TP: ${signal.take_profit}%`,
    orderId: order.id,
  }
}

// =============================================================================
// FETCH CURRENT PRICE
// =============================================================================

async function getCurrentPrice(instrument: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${instrument}`
    )
    const data = await res.json()
    if (data.code === 0 && data.result?.data?.[0]) {
      return parseFloat(data.result.data[0].a)
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${instrument}:`, error)
  }
  return 0
}

// =============================================================================
// BOT EXECUTION
// =============================================================================

async function runAdvancedBot(supabase: any, accountId: string, mode: 'full' | 'analyze' = 'full') {
  const results: any[] = []

  // Get account
  const { data: account } = await supabase
    .from('stuntman_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (!account) {
    return { error: 'Account not found' }
  }

  if (!account.is_paper && mode === 'full') {
    return { error: 'Live trading not enabled' }
  }

  // Get open positions count
  const { data: openPositions } = await supabase
    .from('stuntman_positions')
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'open')

  const openCount = openPositions?.length || 0

  // Get best opportunities (minimum 50% confidence)
  const opportunities = await getBestOpportunities(50)

  for (const signal of opportunities) {
    const currentPrice = await getCurrentPrice(signal.instrument)
    if (currentPrice <= 0) continue

    // Calculate position size
    const positionValue = calculatePositionSize(signal, account.balance, openCount)

    const result = {
      instrument: signal.instrument,
      action: signal.action,
      confidence: signal.confidence,
      risk_score: signal.risk_score,
      position_size_pct: signal.position_size,
      position_value: positionValue,
      stop_loss: signal.stop_loss,
      take_profit: signal.take_profit,
      sources: signal.sources.map(s => ({
        name: s.name,
        signal: s.signal,
        strength: s.strength
      })),
      currentPrice,
      trade: null as any
    }

    // Execute if we have sufficient position value and in full mode
    if (mode === 'full' && positionValue >= 10 && signal.confidence >= 60) {
      const tradeResult = await executeTrade(
        supabase,
        accountId,
        signal,
        currentPrice,
        positionValue
      )
      result.trade = tradeResult
    }

    results.push(result)
  }

  return {
    results,
    timestamp: Date.now(),
    balance: account.balance,
    open_positions: openCount,
    opportunities_found: opportunities.length,
    mode
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const instrument = searchParams.get('instrument')

    switch (action) {
      case 'status': {
        const { data: accounts } = await supabase
          .from('stuntman_accounts')
          .select('id, name, is_paper, balance')
          .eq('user_id', user.id)

        const { data: recentSignals } = await supabase
          .from('stuntman_signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        return NextResponse.json({
          success: true,
          accounts,
          recentSignals: recentSignals || [],
        })
      }

      case 'analyze': {
        // Analyze single instrument
        const targetInstrument = instrument || 'BTC_USDT'
        const signal = await generateAdvancedSignal(targetInstrument)

        return NextResponse.json({
          success: true,
          signal,
          explanation: {
            summary: `${signal.action} with ${signal.confidence}% confidence`,
            bullish: signal.sources.filter(s => s.signal === 'bullish'),
            bearish: signal.sources.filter(s => s.signal === 'bearish'),
            risk: `Risk score: ${signal.risk_score}/10`,
            suggestion: signal.action === 'HOLD'
              ? 'No clear signal - wait for better opportunity'
              : `${signal.action} with ${signal.position_size}% of portfolio, SL: ${signal.stop_loss}%, TP: ${signal.take_profit}%`
          }
        })
      }

      case 'opportunities': {
        const minConfidence = parseInt(searchParams.get('minConfidence') || '50')
        const opportunities = await getBestOpportunities(minConfidence)

        return NextResponse.json({
          success: true,
          opportunities,
          count: opportunities.length,
        })
      }

      case 'scan': {
        // Full market scan
        const allSignals = await generateAllSignals()

        return NextResponse.json({
          success: true,
          signals: allSignals,
          strongBuy: allSignals.filter(s => s.action === 'STRONG_BUY'),
          buy: allSignals.filter(s => s.action === 'BUY'),
          sell: allSignals.filter(s => s.action === 'SELL'),
          strongSell: allSignals.filter(s => s.action === 'STRONG_SELL'),
          hold: allSignals.filter(s => s.action === 'HOLD'),
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bot GET error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bot error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, accountId, mode = 'full' } = body

    switch (action) {
      case 'run': {
        if (!accountId) {
          return NextResponse.json({ error: 'accountId required' }, { status: 400 })
        }

        // Verify account
        const { data: account } = await supabase
          .from('stuntman_accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single()

        if (!account) {
          return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        const result = await runAdvancedBot(supabase, accountId, mode)

        return NextResponse.json({
          success: true,
          ...result,
        })
      }

      case 'analyze': {
        // Analyze without trading
        if (!accountId) {
          return NextResponse.json({ error: 'accountId required' }, { status: 400 })
        }

        const result = await runAdvancedBot(supabase, accountId, 'analyze')

        return NextResponse.json({
          success: true,
          ...result,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bot POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bot error',
    }, { status: 500 })
  }
}
