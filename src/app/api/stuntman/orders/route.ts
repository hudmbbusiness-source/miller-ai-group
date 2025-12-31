// =============================================================================
// STUNTMAN AI - ORDERS API
// =============================================================================
// Order execution, management, and history
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  TRADING_CONFIG,
  FEES,
  INSTRUMENT_PRECISION,
  ERROR_MESSAGES,
} from '@/lib/stuntman/constants'
import type {
  Order,
  OrderType,
  TradingSide,
  TimeInForce,
} from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// HELPERS
// =============================================================================

function generateOrderId(): string {
  return `SM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

function calculateFees(quantity: number, price: number, orderType: OrderType): number {
  const value = quantity * price
  const feeRate = orderType === 'limit' ? FEES.maker : FEES.taker
  return value * feeRate
}

function simulateSlippage(price: number, side: TradingSide): number {
  const slippagePercent =
    TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MIN +
    Math.random() * (TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MAX - TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MIN)

  // Buy orders slip up, sell orders slip down
  const direction = side === 'buy' ? 1 : -1
  return price * (1 + direction * slippagePercent)
}

function getPrecision(instrument: string): { price: number; quantity: number } {
  return INSTRUMENT_PRECISION[instrument] || { price: 8, quantity: 8 }
}

function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

// =============================================================================
// GET - Fetch orders
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status') // pending, filled, cancelled, all
    const instrument = searchParams.get('instrument')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch specific order
    if (orderId) {
      const { data: order, error } = await (supabase
        .from('stuntman_orders') as SupabaseAny)
        .select(`
          *,
          account:stuntman_accounts!inner(user_id)
        `)
        .eq('id', orderId)
        .eq('account.user_id', user.id)
        .single()

      if (error || !order) {
        return NextResponse.json({
          success: false,
          error: ERROR_MESSAGES.ORDER_NOT_FOUND,
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, order })
    }

    // Build query
    let query = (supabase
      .from('stuntman_orders') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, name)
      `)
      .eq('account.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (instrument) {
      query = query.eq('instrument_name', instrument)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Orders fetch error:', error)
      return NextResponse.json({ success: true, orders: [] })
    }

    // Get total count for pagination
    const { count } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId || '')

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (orders?.length || 0) === limit,
      },
    })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Create and execute order
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      account_id,
      instrument_name,
      side,
      type: orderType = 'market',
      quantity,
      price, // Required for limit orders
      stop_loss,
      take_profit,
      time_in_force = 'GTC',
      client_order_id,
      current_price, // Required - current market price for execution
    } = body

    // ==========================================================================
    // VALIDATION
    // ==========================================================================

    // Required fields
    if (!account_id || !instrument_name || !side || !quantity) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: account_id, instrument_name, side, quantity',
      }, { status: 400 })
    }

    // Validate side
    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid side. Must be "buy" or "sell"',
      }, { status: 400 })
    }

    // Validate order type
    if (!['market', 'limit', 'stop_loss', 'take_profit', 'stop_limit'].includes(orderType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid order type',
      }, { status: 400 })
    }

    // Limit orders require price
    if ((orderType === 'limit' || orderType === 'stop_limit') && !price) {
      return NextResponse.json({
        success: false,
        error: 'Limit orders require a price',
      }, { status: 400 })
    }

    // Market orders require current price
    if (orderType === 'market' && !current_price) {
      return NextResponse.json({
        success: false,
        error: 'Market orders require current_price',
      }, { status: 400 })
    }

    // ==========================================================================
    // ACCOUNT VERIFICATION
    // ==========================================================================

    const { data: account, error: accountError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 })
    }

    if (!account.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Account is inactive',
      }, { status: 400 })
    }

    // ==========================================================================
    // PRECISION & VALUE CALCULATIONS
    // ==========================================================================

    const precision = getPrecision(instrument_name)
    const roundedQuantity = roundToDecimal(parseFloat(String(quantity)), precision.quantity)

    // Determine execution price
    let executionPrice: number
    if (orderType === 'market') {
      // Simulate slippage for paper trading
      executionPrice = account.is_paper
        ? simulateSlippage(parseFloat(current_price), side as TradingSide)
        : parseFloat(current_price)
    } else {
      executionPrice = parseFloat(price)
    }

    executionPrice = roundToDecimal(executionPrice, precision.price)

    const orderValue = roundedQuantity * executionPrice
    const fees = calculateFees(roundedQuantity, executionPrice, orderType as OrderType)
    const totalCost = side === 'buy' ? orderValue + fees : fees

    // Validate order value
    if (orderValue < TRADING_CONFIG.MIN_ORDER_VALUE) {
      return NextResponse.json({
        success: false,
        error: `Minimum order value is $${TRADING_CONFIG.MIN_ORDER_VALUE}`,
      }, { status: 400 })
    }

    if (orderValue > TRADING_CONFIG.MAX_ORDER_VALUE) {
      return NextResponse.json({
        success: false,
        error: `Maximum order value is $${TRADING_CONFIG.MAX_ORDER_VALUE}`,
      }, { status: 400 })
    }

    // ==========================================================================
    // BALANCE CHECK
    // ==========================================================================

    if (side === 'buy' && account.balance < totalCost) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.INSUFFICIENT_BALANCE,
        details: {
          required: totalCost,
          available: account.balance,
          shortfall: totalCost - account.balance,
        },
      }, { status: 400 })
    }

    // For sell orders, check position
    if (side === 'sell') {
      const { data: position } = await (supabase
        .from('stuntman_positions') as SupabaseAny)
        .select('quantity')
        .eq('account_id', account_id)
        .eq('instrument_name', instrument_name)
        .eq('status', 'open')
        .single()

      if (!position || position.quantity < roundedQuantity) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient position to sell',
          details: {
            available: position?.quantity || 0,
            requested: roundedQuantity,
          },
        }, { status: 400 })
      }
    }

    // ==========================================================================
    // RISK CHECKS
    // ==========================================================================

    // Check daily trade limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayTradeCount } = await (supabase
      .from('stuntman_trades') as SupabaseAny)
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account_id)
      .gte('created_at', today.toISOString())

    // Get account settings for limits
    const { data: settings } = await (supabase
      .from('stuntman_settings') as SupabaseAny)
      .select('*')
      .eq('account_id', account_id)
      .single()

    if (settings?.max_daily_trades && (todayTradeCount || 0) >= settings.max_daily_trades) {
      return NextResponse.json({
        success: false,
        error: 'Daily trade limit reached',
      }, { status: 400 })
    }

    // Check max position size
    if (settings?.max_position_size && orderValue > settings.max_position_size) {
      return NextResponse.json({
        success: false,
        error: `Order exceeds maximum position size of $${settings.max_position_size}`,
      }, { status: 400 })
    }

    // ==========================================================================
    // CREATE ORDER
    // ==========================================================================

    const orderId = generateOrderId()
    const now = new Date().toISOString()

    const orderData: Partial<Order> = {
      id: orderId,
      account_id,
      instrument_name,
      side: side as TradingSide,
      type: orderType as OrderType,
      quantity: roundedQuantity,
      price: orderType === 'market' ? null : executionPrice,
      filled_quantity: 0,
      average_price: null,
      status: orderType === 'market' ? 'filled' : 'pending',
      time_in_force: time_in_force as TimeInForce,
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      client_order_id: client_order_id || orderId,
      fees: 0,
      created_at: now,
      updated_at: now,
    }

    // ==========================================================================
    // EXECUTE MARKET ORDER IMMEDIATELY
    // ==========================================================================

    if (orderType === 'market') {
      // Update order as filled
      orderData.status = 'filled'
      orderData.filled_quantity = roundedQuantity
      orderData.average_price = executionPrice
      orderData.fees = fees
      orderData.filled_at = now

      // Insert order
      const { data: order, error: orderError } = await (supabase
        .from('stuntman_orders') as SupabaseAny)
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create order',
        }, { status: 500 })
      }

      // Create trade record
      const tradeData = {
        id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        account_id,
        order_id: orderId,
        instrument_name,
        side,
        quantity: roundedQuantity,
        price: executionPrice,
        fees,
        realized_pnl: 0,
        created_at: now,
      }

      await (supabase
        .from('stuntman_trades') as SupabaseAny)
        .insert(tradeData)

      // ==========================================================================
      // UPDATE POSITION
      // ==========================================================================

      if (side === 'buy') {
        // Check for existing position
        const { data: existingPosition } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select('*')
          .eq('account_id', account_id)
          .eq('instrument_name', instrument_name)
          .eq('status', 'open')
          .single()

        if (existingPosition) {
          // Add to existing position (average in)
          const newQuantity = existingPosition.quantity + roundedQuantity
          const newAvgPrice =
            (existingPosition.quantity * existingPosition.entry_price +
              roundedQuantity * executionPrice) /
            newQuantity
          const newCostBasis = existingPosition.cost_basis + orderValue + fees

          await (supabase
            .from('stuntman_positions') as SupabaseAny)
            .update({
              quantity: newQuantity,
              entry_price: newAvgPrice,
              cost_basis: newCostBasis,
              current_price: executionPrice,
              unrealized_pnl: (executionPrice - newAvgPrice) * newQuantity,
              updated_at: now,
            })
            .eq('id', existingPosition.id)
        } else {
          // Create new position
          const positionData = {
            id: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            account_id,
            instrument_name,
            side: 'long',
            quantity: roundedQuantity,
            entry_price: executionPrice,
            current_price: executionPrice,
            cost_basis: orderValue + fees,
            unrealized_pnl: 0,
            realized_pnl: 0,
            stop_loss: stop_loss ? parseFloat(stop_loss) : null,
            take_profit: take_profit ? parseFloat(take_profit) : null,
            status: 'open',
            created_at: now,
            updated_at: now,
          }

          await (supabase
            .from('stuntman_positions') as SupabaseAny)
            .insert(positionData)
        }

        // Deduct from balance
        await (supabase
          .from('stuntman_accounts') as SupabaseAny)
          .update({
            balance: account.balance - totalCost,
            total_trades: account.total_trades + 1,
            updated_at: now,
          })
          .eq('id', account_id)
      } else {
        // SELL - Close or reduce position
        const { data: position } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select('*')
          .eq('account_id', account_id)
          .eq('instrument_name', instrument_name)
          .eq('status', 'open')
          .single()

        if (position) {
          const realizedPnl = (executionPrice - position.entry_price) * roundedQuantity - fees
          const isWin = realizedPnl > 0

          if (roundedQuantity >= position.quantity) {
            // Close entire position
            await (supabase
              .from('stuntman_positions') as SupabaseAny)
              .update({
                quantity: 0,
                current_price: executionPrice,
                unrealized_pnl: 0,
                realized_pnl: position.realized_pnl + realizedPnl,
                status: 'closed',
                closed_at: now,
                updated_at: now,
              })
              .eq('id', position.id)
          } else {
            // Partial close
            const remainingQuantity = position.quantity - roundedQuantity
            await (supabase
              .from('stuntman_positions') as SupabaseAny)
              .update({
                quantity: remainingQuantity,
                current_price: executionPrice,
                unrealized_pnl: (executionPrice - position.entry_price) * remainingQuantity,
                realized_pnl: position.realized_pnl + realizedPnl,
                updated_at: now,
              })
              .eq('id', position.id)
          }

          // Update trade with realized P&L
          await (supabase
            .from('stuntman_trades') as SupabaseAny)
            .update({ realized_pnl: realizedPnl })
            .eq('id', tradeData.id)

          // Update account
          const proceeds = orderValue - fees
          await (supabase
            .from('stuntman_accounts') as SupabaseAny)
            .update({
              balance: account.balance + proceeds,
              realized_pnl: account.realized_pnl + realizedPnl,
              total_trades: account.total_trades + 1,
              win_count: isWin ? account.win_count + 1 : account.win_count,
              loss_count: !isWin ? account.loss_count + 1 : account.loss_count,
              updated_at: now,
            })
            .eq('id', account_id)
        }
      }

      return NextResponse.json({
        success: true,
        order,
        execution: {
          type: 'immediate',
          price: executionPrice,
          quantity: roundedQuantity,
          value: orderValue,
          fees,
          slippage: orderType === 'market' ? executionPrice - parseFloat(current_price) : 0,
        },
        message: `${side.toUpperCase()} order filled at $${executionPrice.toFixed(precision.price)}`,
      })
    }

    // ==========================================================================
    // CREATE PENDING ORDER (LIMIT, STOP, etc.)
    // ==========================================================================

    const { data: order, error: orderError } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create order',
      }, { status: 500 })
    }

    // Reserve balance for buy limit orders
    if (side === 'buy') {
      await (supabase
        .from('stuntman_accounts') as SupabaseAny)
        .update({
          balance: account.balance - totalCost,
          updated_at: now,
        })
        .eq('id', account_id)
    }

    return NextResponse.json({
      success: true,
      order,
      message: `${orderType.toUpperCase()} order placed at $${executionPrice.toFixed(precision.price)}`,
    })
  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update order (modify limit price, etc.)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, price, quantity, stop_loss, take_profit } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Order ID required',
      }, { status: 400 })
    }

    // Verify ownership and order status
    const { data: order, error: fetchError } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, balance)
      `)
      .eq('id', id)
      .eq('account.user_id', user.id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.ORDER_NOT_FOUND,
      }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Can only modify pending orders',
      }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (price !== undefined) {
      const precision = getPrecision(order.instrument_name)
      updateData.price = roundToDecimal(parseFloat(price), precision.price)
    }

    if (quantity !== undefined) {
      const precision = getPrecision(order.instrument_name)
      updateData.quantity = roundToDecimal(parseFloat(quantity), precision.quantity)
    }

    if (stop_loss !== undefined) {
      updateData.stop_loss = stop_loss ? parseFloat(stop_loss) : null
    }

    if (take_profit !== undefined) {
      updateData.take_profit = take_profit ? parseFloat(take_profit) : null
    }

    const { data: updatedOrder, error: updateError } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update order',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully',
    })
  } catch (error) {
    console.error('Orders PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Cancel order
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Order ID required',
      }, { status: 400 })
    }

    // Verify ownership and order status
    const { data: order, error: fetchError } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, balance, id)
      `)
      .eq('id', id)
      .eq('account.user_id', user.id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.ORDER_NOT_FOUND,
      }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Can only cancel pending orders',
      }, { status: 400 })
    }

    // Cancel the order
    const now = new Date().toISOString()

    const { error: updateError } = await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to cancel order',
      }, { status: 500 })
    }

    // Restore reserved balance for buy orders
    if (order.side === 'buy') {
      const orderValue = order.quantity * order.price
      const fees = calculateFees(order.quantity, order.price, order.type)
      const totalCost = orderValue + fees

      await (supabase
        .from('stuntman_accounts') as SupabaseAny)
        .update({
          balance: order.account.balance + totalCost,
          updated_at: now,
        })
        .eq('id', order.account.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Orders DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
