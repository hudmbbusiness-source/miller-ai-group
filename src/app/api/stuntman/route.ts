import { NextRequest, NextResponse } from 'next/server'
import { createCryptoComClient, STUNTMAN_TRADING_PAIRS } from '@/lib/crypto/crypto-com'
import { createClient } from '@/lib/supabase/server'

/**
 * Stuntman AI Trading Bot API
 *
 * GET: Fetch market data and system status
 * POST: Execute trading actions (when authenticated)
 */

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'dashboard'
    const instrument = searchParams.get('instrument') || 'BTC_USDT'

    // Create Crypto.com client
    let client
    try {
      client = createCryptoComClient()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Stuntman is not configured. Please add STUNTMAN_CRYPTO_API_KEY to environment.',
        isConfigured: false,
      }, { status: 500 })
    }

    switch (action) {
      case 'dashboard': {
        // Fetch market data for all trading pairs
        const tickerPromises = STUNTMAN_TRADING_PAIRS.slice(0, 5).map(pair =>
          client.getTicker(pair)
        )
        const tickers = await Promise.all(tickerPromises)

        // Get detailed data for the primary instrument
        const marketData = await client.getMarketData(instrument)

        return NextResponse.json({
          success: true,
          isConfigured: true,
          canTrade: client.canAuthenticate(),
          dashboard: {
            primaryInstrument: instrument,
            marketData,
            tickers: tickers.filter(Boolean),
            tradingPairs: STUNTMAN_TRADING_PAIRS,
          },
        })
      }

      case 'ticker': {
        const ticker = await client.getTicker(instrument)
        return NextResponse.json({
          success: true,
          ticker,
        })
      }

      case 'orderbook': {
        const orderbook = await client.getOrderBook(instrument)
        return NextResponse.json({
          success: true,
          orderbook,
        })
      }

      case 'trades': {
        const trades = await client.getRecentTrades(instrument)
        return NextResponse.json({
          success: true,
          trades,
        })
      }

      case 'balance': {
        if (!client.canAuthenticate()) {
          return NextResponse.json({
            success: false,
            error: 'API secret not configured. Add STUNTMAN_CRYPTO_SECRET for trading features.',
          }, { status: 400 })
        }

        try {
          const balances = await client.getAccountBalance()
          return NextResponse.json({
            success: true,
            balances,
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch balance',
          }, { status: 500 })
        }
      }

      case 'orders': {
        if (!client.canAuthenticate()) {
          return NextResponse.json({
            success: false,
            error: 'API secret not configured.',
          }, { status: 400 })
        }

        try {
          const openOrders = await client.getOpenOrders()
          const orderHistory = await client.getOrderHistory()
          return NextResponse.json({
            success: true,
            openOrders,
            orderHistory,
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch orders',
          }, { status: 500 })
        }
      }

      case 'status': {
        return NextResponse.json({
          success: true,
          status: {
            isConfigured: true,
            canTrade: client.canAuthenticate(),
            tradingPairs: STUNTMAN_TRADING_PAIRS,
            apiConnected: true,
          },
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Stuntman API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Create Crypto.com client
    let client
    try {
      client = createCryptoComClient()
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Stuntman is not configured.',
      }, { status: 500 })
    }

    if (!client.canAuthenticate()) {
      return NextResponse.json({
        success: false,
        error: 'Trading is not enabled. API secret is required.',
      }, { status: 400 })
    }

    switch (action) {
      case 'createOrder': {
        const { instrument_name, side, type, quantity, price } = body

        if (!instrument_name || !side || !type || !quantity) {
          return NextResponse.json({
            success: false,
            error: 'Missing required order parameters',
          }, { status: 400 })
        }

        try {
          const order = await client.createOrder({
            instrument_name,
            side,
            type,
            quantity,
            price,
          })

          return NextResponse.json({
            success: true,
            order,
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create order',
          }, { status: 500 })
        }
      }

      case 'cancelOrder': {
        const { order_id, instrument_name } = body

        if (!order_id || !instrument_name) {
          return NextResponse.json({
            success: false,
            error: 'Missing order_id or instrument_name',
          }, { status: 400 })
        }

        try {
          await client.cancelOrder(order_id, instrument_name)
          return NextResponse.json({
            success: true,
            message: 'Order cancelled successfully',
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to cancel order',
          }, { status: 500 })
        }
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Stuntman POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
