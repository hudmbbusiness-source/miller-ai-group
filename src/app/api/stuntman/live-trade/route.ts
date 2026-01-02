// @ts-nocheck
// =============================================================================
// STUNTMAN AI - LIVE TRADING ENGINE
// =============================================================================
// Real automated trading on Crypto.com Exchange
// Uses advanced signal generator for trade decisions
// REQUIRES AUTHENTICATION - Protected endpoint
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'
import {
  generateAdvancedSignal,
  getBestOpportunities,
  type AdvancedSignal
} from '@/lib/stuntman/signal-generator'

// =============================================================================
// TYPES
// =============================================================================

interface TradeResult {
  success: boolean
  orderId?: string
  instrument: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  message: string
  signal?: AdvancedSignal
}

interface PositionInfo {
  currency: string
  quantity: number
  valueUSD: number
}

// =============================================================================
// MINIMUM ORDER SIZES (Crypto.com requirements)
// =============================================================================

const MIN_ORDER_SIZES: Record<string, number> = {
  BTC: 0.0001,
  ETH: 0.001,
  SOL: 0.01,
  BNB: 0.01,
  XRP: 1,
  DOGE: 10,
  ADA: 1,
  AVAX: 0.1,
  DOT: 0.1,
  MATIC: 1,
  CRO: 1,
}

const MIN_NOTIONAL_VALUE = 1 // $1 minimum order value

// =============================================================================
// HELPER FUNCTIONS
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

function getMinOrderSize(currency: string): number {
  return MIN_ORDER_SIZES[currency.toUpperCase()] || 0.001
}

// =============================================================================
// EXECUTE REAL TRADE
// =============================================================================

async function executeRealTrade(
  client: ReturnType<typeof createCryptoComClient>,
  signal: AdvancedSignal,
  availableBalance: number,
  currentPrice: number
): Promise<TradeResult> {
  const instrument = signal.instrument
  const baseCurrency = instrument.split('_')[0]
  const side = signal.action.includes('BUY') ? 'BUY' : 'SELL'

  // Calculate position size based on signal
  const positionPercent = signal.position_size / 100
  const positionValue = availableBalance * positionPercent

  // Check minimum order value
  if (positionValue < MIN_NOTIONAL_VALUE) {
    return {
      success: false,
      instrument,
      side,
      quantity: 0,
      price: currentPrice,
      value: positionValue,
      message: `Order value $${positionValue.toFixed(2)} below minimum $${MIN_NOTIONAL_VALUE}`,
      signal,
    }
  }

  // Calculate quantity
  let quantity = positionValue / currentPrice
  const minQty = getMinOrderSize(baseCurrency)

  // Round to appropriate precision
  const precision = baseCurrency === 'BTC' ? 6 : baseCurrency === 'ETH' ? 5 : 4
  quantity = Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision)

  if (quantity < minQty) {
    return {
      success: false,
      instrument,
      side,
      quantity,
      price: currentPrice,
      value: positionValue,
      message: `Quantity ${quantity} below minimum ${minQty} for ${baseCurrency}`,
      signal,
    }
  }

  try {
    // Execute the order
    const order = await client.createOrder({
      instrument_name: instrument,
      side,
      type: 'MARKET',
      quantity: quantity.toString(),
    })

    return {
      success: true,
      orderId: order.order_id,
      instrument,
      side,
      quantity,
      price: parseFloat(order.avg_price) || currentPrice,
      value: quantity * currentPrice,
      message: `${side} ${quantity} ${baseCurrency} @ $${currentPrice.toFixed(2)}`,
      signal,
    }
  } catch (error) {
    return {
      success: false,
      instrument,
      side,
      quantity,
      price: currentPrice,
      value: positionValue,
      message: error instanceof Error ? error.message : 'Order failed',
      signal,
    }
  }
}

// =============================================================================
// GET ACCOUNT BALANCE
// =============================================================================

async function getAccountInfo(client: ReturnType<typeof createCryptoComClient>): Promise<{
  balances: PositionInfo[]
  totalUSD: number
  availableUSD: number
}> {
  try {
    const rawBalances = await client.getAccountBalance()

    interface PositionBalance {
      instrument_name: string
      quantity: string
      market_value: string
    }

    interface BalanceData {
      position_balances?: PositionBalance[]
      total_available_balance?: string
    }

    const balanceData = rawBalances[0] as unknown as BalanceData
    const positionBalances = balanceData?.position_balances || []

    const balances = positionBalances.map((b: PositionBalance) => ({
      currency: b.instrument_name,
      quantity: parseFloat(b.quantity),
      valueUSD: parseFloat(b.market_value),
    })).filter((b: { quantity: number }) => b.quantity > 0)

    const totalUSD = balances.reduce((sum: number, b: { valueUSD: number }) => sum + b.valueUSD, 0)
    const availableUSD = parseFloat(balanceData?.total_available_balance || '0')

    return { balances, totalUSD, availableUSD }
  } catch (error) {
    console.error('Failed to get account info:', error)
    return { balances: [], totalUSD: 0, availableUSD: 0 }
  }
}

// =============================================================================
// TRADING BOT LOGIC
// =============================================================================

async function runTradingBot(mode: 'analyze' | 'trade' = 'analyze'): Promise<{
  success: boolean
  mode: string
  account: { balances: PositionInfo[]; totalUSD: number; availableUSD: number }
  signals: AdvancedSignal[]
  trades: TradeResult[]
  timestamp: string
}> {
  const client = createCryptoComClient()

  if (!client.canAuthenticate()) {
    throw new Error('API credentials not configured')
  }

  // Get account info
  const account = await getAccountInfo(client)

  // Get best trading opportunities (minimum 55% confidence for live trading)
  const opportunities = await getBestOpportunities(55)

  const signals = opportunities.slice(0, 3) // Top 3 opportunities
  const trades: TradeResult[] = []

  if (mode === 'trade' && signals.length > 0) {
    // Execute trades for strong signals only
    for (const signal of signals) {
      // Only trade if confidence >= 60% and we have balance
      if (signal.confidence >= 60 && account.availableUSD > MIN_NOTIONAL_VALUE) {
        const currentPrice = await getCurrentPrice(signal.instrument)
        if (currentPrice <= 0) continue

        const result = await executeRealTrade(
          client,
          signal,
          account.availableUSD,
          currentPrice
        )

        trades.push(result)

        // Update available balance for next trade
        if (result.success) {
          account.availableUSD -= result.value
        }

        // Small delay between trades
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  return {
    success: true,
    mode,
    account,
    signals,
    trades,
    timestamp: new Date().toISOString(),
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status': {
        const client = createCryptoComClient()
        if (!client.canAuthenticate()) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: 'API not configured',
          })
        }

        const account = await getAccountInfo(client)
        return NextResponse.json({
          success: true,
          connected: true,
          account,
        })
      }

      case 'signals': {
        const opportunities = await getBestOpportunities(50)
        return NextResponse.json({
          success: true,
          signals: opportunities,
          count: opportunities.length,
        })
      }

      case 'analyze': {
        const instrument = searchParams.get('instrument') || 'BTC_USDT'
        const signal = await generateAdvancedSignal(instrument)
        return NextResponse.json({
          success: true,
          signal,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
    }

    const body = await request.json()
    const { action = 'analyze' } = body

    switch (action) {
      case 'analyze': {
        // Just analyze, don't trade
        const result = await runTradingBot('analyze')
        return NextResponse.json(result)
      }

      case 'trade': {
        // Execute real trades
        const result = await runTradingBot('trade')
        return NextResponse.json(result)
      }

      case 'buy': {
        // Manual buy order
        const { instrument, amount } = body
        if (!instrument || !amount) {
          return NextResponse.json({ error: 'instrument and amount required' }, { status: 400 })
        }

        const client = createCryptoComClient()
        const currentPrice = await getCurrentPrice(instrument)
        const quantity = parseFloat(amount) / currentPrice

        const order = await client.createOrder({
          instrument_name: instrument,
          side: 'BUY',
          type: 'MARKET',
          quantity: quantity.toFixed(6),
        })

        return NextResponse.json({
          success: true,
          order,
          price: currentPrice,
          quantity,
        })
      }

      case 'sell': {
        // Manual sell order
        const { instrument, quantity } = body
        if (!instrument || !quantity) {
          return NextResponse.json({ error: 'instrument and quantity required' }, { status: 400 })
        }

        const client = createCryptoComClient()
        const currentPrice = await getCurrentPrice(instrument)

        const order = await client.createOrder({
          instrument_name: instrument,
          side: 'SELL',
          type: 'MARKET',
          quantity: quantity.toString(),
        })

        return NextResponse.json({
          success: true,
          order,
          price: currentPrice,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Live trade error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Trade failed',
    }, { status: 500 })
  }
}
