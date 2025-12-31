// @ts-nocheck
// =============================================================================
// STUNTMAN AI - PAPER TRADING ENGINE
// =============================================================================
// Simulates real trading with exact Crypto.com fee structure
// Matches live trading 1:1 for accurate backtesting and strategy validation
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/lib/supabase/server'
import { FEES, TRADING_CONFIG, INSTRUMENT_PRECISION } from './constants'
import type {
  TradingAccount,
  Position,
  Order,
  ExecutedTrade,
  CreateOrderRequest,
  TradingSide,
  OrderType,
  PositionSide,
} from './types'

// =============================================================================
// FEE CALCULATOR
// =============================================================================

export function calculateFee(value: number, isMaker: boolean): number {
  const rate = isMaker ? FEES.maker : FEES.taker
  return value * rate
}

export function calculateSlippage(price: number, side: TradingSide): number {
  // Simulate market impact - buy orders push price up, sell orders push price down
  const slippagePercent =
    TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MIN +
    Math.random() * (TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MAX - TRADING_CONFIG.MARKET_ORDER_SLIPPAGE_MIN)

  const direction = side === 'BUY' ? 1 : -1
  return price * (1 + direction * slippagePercent)
}

export function roundPrice(price: number, instrument: string): number {
  const precision = INSTRUMENT_PRECISION[instrument]?.price || 8
  return Number(price.toFixed(precision))
}

export function roundQuantity(quantity: number, instrument: string): number {
  const precision = INSTRUMENT_PRECISION[instrument]?.quantity || 8
  return Number(quantity.toFixed(precision))
}

// =============================================================================
// PAPER TRADING ENGINE
// =============================================================================

export class PaperTradingEngine {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null

  async initialize(): Promise<void> {
    this.supabase = await createClient()
  }

  private async getSupabase() {
    if (!this.supabase) {
      await this.initialize()
    }
    return this.supabase!
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  async createAccount(userId: string, name: string, initialBalance = TRADING_CONFIG.DEFAULT_PAPER_BALANCE): Promise<TradingAccount> {
    const supabase = await this.getSupabase()

    const { data, error } = await (supabase
      .from('stuntman_accounts') as any)
      .insert({
        user_id: userId,
        account_type: 'paper',
        name,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        reserved_balance: 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create account: ${error.message}`)

    return this.mapAccount(data)
  }

  async getAccount(accountId: string): Promise<TradingAccount | null> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('stuntman_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (error) return null
    return this.mapAccount(data)
  }

  async getAccounts(userId: string): Promise<TradingAccount[]> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('stuntman_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('account_type', 'paper')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to get accounts: ${error.message}`)
    return data.map(this.mapAccount)
  }

  async updateAccountBalance(accountId: string, balanceChange: number, reservedChange = 0): Promise<void> {
    const supabase = await this.getSupabase()
    const account = await this.getAccount(accountId)

    if (!account) throw new Error('Account not found')

    const newBalance = account.currentBalance + balanceChange
    const newReserved = account.reservedBalance + reservedChange

    if (newBalance < 0) throw new Error('Insufficient balance')
    if (newReserved < 0) throw new Error('Invalid reserved balance')

    const { error } = await supabase
      .from('stuntman_accounts')
      .update({
        current_balance: newBalance,
        reserved_balance: newReserved,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)

    if (error) throw new Error(`Failed to update balance: ${error.message}`)
  }

  // ==========================================================================
  // ORDER EXECUTION
  // ==========================================================================

  async executeMarketOrder(request: CreateOrderRequest, currentPrice: number): Promise<{ order: Order; trade: ExecutedTrade; position?: Position }> {
    const supabase = await this.getSupabase()
    const account = await this.getAccount(request.accountId)

    if (!account) throw new Error('Account not found')

    // Apply slippage to simulate market order execution
    const fillPrice = calculateSlippage(currentPrice, request.side)
    const roundedPrice = roundPrice(fillPrice, request.instrumentName)
    const roundedQuantity = roundQuantity(request.quantity, request.instrumentName)
    const orderValue = roundedQuantity * roundedPrice
    const fee = calculateFee(orderValue, false) // Market orders are taker

    // Validate balance for buy orders
    if (request.side === 'BUY') {
      const totalCost = orderValue + fee
      const availableBalance = account.currentBalance - account.reservedBalance
      if (availableBalance < totalCost) {
        throw new Error(`Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`)
      }
    }

    // Create the order
    const { data: orderData, error: orderError } = await supabase
      .from('stuntman_orders')
      .insert({
        account_id: request.accountId,
        user_id: account.userId,
        instrument_name: request.instrumentName,
        side: request.side,
        order_type: 'MARKET',
        time_in_force: 'IOC',
        quantity: roundedQuantity,
        filled_quantity: roundedQuantity,
        remaining_quantity: 0,
        filled_price: roundedPrice,
        avg_fill_price: roundedPrice,
        fee,
        fee_currency: 'USDT',
        status: 'filled',
        strategy_id: request.strategyId || null,
        signal_id: request.signalId || null,
        filled_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`)

    // Create the trade record
    const slippage = Math.abs(fillPrice - currentPrice) / currentPrice
    const { data: tradeData, error: tradeError } = await supabase
      .from('stuntman_trades')
      .insert({
        account_id: request.accountId,
        user_id: account.userId,
        order_id: orderData.id,
        instrument_name: request.instrumentName,
        side: request.side,
        quantity: roundedQuantity,
        price: roundedPrice,
        value: orderValue,
        fee,
        fee_currency: 'USDT',
        fee_rate: FEES.taker,
        is_maker: false,
        slippage,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) throw new Error(`Failed to create trade: ${tradeError.message}`)

    // Update account balance
    const balanceChange = request.side === 'BUY' ? -(orderValue + fee) : orderValue - fee
    await this.updateAccountBalance(request.accountId, balanceChange)

    // Handle position
    let position: Position | undefined
    const positionSide: PositionSide = request.side === 'BUY' ? 'LONG' : 'SHORT'
    const existingPosition = await this.getOpenPosition(request.accountId, request.instrumentName)

    if (existingPosition) {
      // Update existing position or close it
      if ((existingPosition.side === 'LONG' && request.side === 'SELL') ||
          (existingPosition.side === 'SHORT' && request.side === 'BUY')) {
        // Closing or reducing position
        position = await this.closePosition(
          existingPosition.id,
          roundedQuantity,
          roundedPrice,
          fee,
          orderData.id,
          tradeData.id
        )
      } else {
        // Adding to position
        position = await this.addToPosition(
          existingPosition.id,
          roundedQuantity,
          roundedPrice,
          fee
        )
      }
    } else if (request.side === 'BUY') {
      // Open new long position
      position = await this.openPosition(
        request.accountId,
        account.userId,
        request.instrumentName,
        positionSide,
        roundedQuantity,
        roundedPrice,
        fee,
        request.stopLoss,
        request.takeProfit,
        request.strategyId
      )
    }

    // Update trade with position ID
    if (position) {
      await supabase
        .from('stuntman_trades')
        .update({ position_id: position.id })
        .eq('id', tradeData.id)

      await supabase
        .from('stuntman_orders')
        .update({ position_id: position.id })
        .eq('id', orderData.id)
    }

    return {
      order: this.mapOrder(orderData),
      trade: this.mapTrade({ ...tradeData, position_id: position?.id }),
      position,
    }
  }

  async executeLimitOrder(request: CreateOrderRequest): Promise<Order> {
    const supabase = await this.getSupabase()
    const account = await this.getAccount(request.accountId)

    if (!account) throw new Error('Account not found')
    if (!request.price) throw new Error('Limit price required')

    const roundedPrice = roundPrice(request.price, request.instrumentName)
    const roundedQuantity = roundQuantity(request.quantity, request.instrumentName)
    const orderValue = roundedQuantity * roundedPrice
    const estimatedFee = calculateFee(orderValue, true) // Limit orders are maker if they rest

    // Reserve balance for buy orders
    if (request.side === 'BUY') {
      const totalCost = orderValue + estimatedFee
      const availableBalance = account.currentBalance - account.reservedBalance
      if (availableBalance < totalCost) {
        throw new Error(`Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`)
      }
      await this.updateAccountBalance(request.accountId, 0, totalCost)
    }

    const { data, error } = await supabase
      .from('stuntman_orders')
      .insert({
        account_id: request.accountId,
        user_id: account.userId,
        instrument_name: request.instrumentName,
        side: request.side,
        order_type: 'LIMIT',
        time_in_force: request.timeInForce || 'GTC',
        quantity: roundedQuantity,
        filled_quantity: 0,
        remaining_quantity: roundedQuantity,
        price: roundedPrice,
        status: 'open',
        strategy_id: request.strategyId || null,
        signal_id: request.signalId || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create limit order: ${error.message}`)

    return this.mapOrder(data)
  }

  async checkAndFillLimitOrders(instrumentName: string, currentPrice: number): Promise<{ filled: Order[]; trades: ExecutedTrade[] }> {
    const supabase = await this.getSupabase()
    const filled: Order[] = []
    const trades: ExecutedTrade[] = []

    // Get all open limit orders for this instrument
    const { data: orders, error } = await supabase
      .from('stuntman_orders')
      .select('*')
      .eq('instrument_name', instrumentName)
      .eq('status', 'open')
      .eq('order_type', 'LIMIT')

    if (error || !orders) return { filled, trades }

    for (const order of orders) {
      const shouldFill =
        (order.side === 'BUY' && currentPrice <= order.price) ||
        (order.side === 'SELL' && currentPrice >= order.price)

      if (shouldFill) {
        try {
          const result = await this.fillLimitOrder(order, order.price)
          filled.push(result.order)
          trades.push(result.trade)
        } catch (err) {
          console.error(`Failed to fill limit order ${order.id}:`, err)
        }
      }
    }

    return { filled, trades }
  }

  private async fillLimitOrder(orderData: Record<string, unknown>, fillPrice: number): Promise<{ order: Order; trade: ExecutedTrade }> {
    const supabase = await this.getSupabase()
    const orderId = orderData.id as string
    const accountId = orderData.account_id as string
    const userId = orderData.user_id as string
    const instrumentName = orderData.instrument_name as string
    const side = orderData.side as TradingSide
    const quantity = orderData.remaining_quantity as number

    const orderValue = quantity * fillPrice
    const fee = calculateFee(orderValue, true) // Maker fee for limit orders

    // Update order to filled
    const { data: updatedOrder, error: orderError } = await supabase
      .from('stuntman_orders')
      .update({
        filled_quantity: quantity,
        remaining_quantity: 0,
        filled_price: fillPrice,
        avg_fill_price: fillPrice,
        fee,
        status: 'filled',
        filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (orderError) throw new Error(`Failed to fill order: ${orderError.message}`)

    // Create trade record
    const { data: trade, error: tradeError } = await supabase
      .from('stuntman_trades')
      .insert({
        account_id: accountId,
        user_id: userId,
        order_id: orderId,
        instrument_name: instrumentName,
        side,
        quantity,
        price: fillPrice,
        value: orderValue,
        fee,
        fee_currency: 'USDT',
        fee_rate: FEES.maker,
        is_maker: true,
        slippage: 0,
        executed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) throw new Error(`Failed to create trade: ${tradeError.message}`)

    // Update account balance
    if (side === 'BUY') {
      // Release reserved and deduct actual cost
      const reservedAmount = orderValue + calculateFee(orderValue, true)
      await this.updateAccountBalance(accountId, -fee, -reservedAmount)
    } else {
      // Add proceeds minus fee
      await this.updateAccountBalance(accountId, orderValue - fee)
    }

    return {
      order: this.mapOrder(updatedOrder),
      trade: this.mapTrade(trade),
    }
  }

  async cancelOrder(orderId: string, accountId: string): Promise<Order> {
    const supabase = await this.getSupabase()

    const { data: order, error: fetchError } = await supabase
      .from('stuntman_orders')
      .select('*')
      .eq('id', orderId)
      .eq('account_id', accountId)
      .single()

    if (fetchError || !order) throw new Error('Order not found')
    if (order.status !== 'open' && order.status !== 'partial') {
      throw new Error(`Cannot cancel order with status: ${order.status}`)
    }

    // Release reserved balance for buy orders
    if (order.side === 'BUY') {
      const reservedAmount = order.remaining_quantity * order.price + calculateFee(order.remaining_quantity * order.price, true)
      await this.updateAccountBalance(accountId, 0, -reservedAmount)
    }

    const { data: cancelled, error: updateError } = await supabase
      .from('stuntman_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to cancel order: ${updateError.message}`)

    return this.mapOrder(cancelled)
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  async openPosition(
    accountId: string,
    userId: string,
    instrumentName: string,
    side: PositionSide,
    quantity: number,
    entryPrice: number,
    fee: number,
    stopLoss?: number,
    takeProfit?: number,
    strategyId?: string
  ): Promise<Position> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('stuntman_positions')
      .insert({
        account_id: accountId,
        user_id: userId,
        instrument_name: instrumentName,
        side,
        quantity,
        entry_price: entryPrice,
        avg_entry_price: entryPrice,
        current_price: entryPrice,
        unrealized_pnl: 0,
        realized_pnl: 0,
        total_fees: fee,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: 'open',
        strategy_id: strategyId,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to open position: ${error.message}`)

    return this.mapPosition(data)
  }

  async addToPosition(positionId: string, addQuantity: number, addPrice: number, fee: number): Promise<Position> {
    const supabase = await this.getSupabase()

    const { data: position, error: fetchError } = await supabase
      .from('stuntman_positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (fetchError || !position) throw new Error('Position not found')

    // Calculate new average entry price
    const totalValue = position.quantity * position.avg_entry_price + addQuantity * addPrice
    const newQuantity = position.quantity + addQuantity
    const newAvgPrice = totalValue / newQuantity

    const { data: updated, error: updateError } = await supabase
      .from('stuntman_positions')
      .update({
        quantity: newQuantity,
        avg_entry_price: newAvgPrice,
        total_fees: position.total_fees + fee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', positionId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to add to position: ${updateError.message}`)

    return this.mapPosition(updated)
  }

  async closePosition(
    positionId: string,
    closeQuantity: number,
    closePrice: number,
    fee: number,
    orderId?: string,
    tradeId?: string
  ): Promise<Position> {
    const supabase = await this.getSupabase()

    const { data: position, error: fetchError } = await supabase
      .from('stuntman_positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (fetchError || !position) throw new Error('Position not found')

    const quantityToClose = Math.min(closeQuantity, position.quantity)
    const remainingQuantity = position.quantity - quantityToClose

    // Calculate P&L for closed portion
    const entryValue = quantityToClose * position.avg_entry_price
    const exitValue = quantityToClose * closePrice
    const pnl = position.side === 'LONG' ? exitValue - entryValue : entryValue - exitValue
    const netPnl = pnl - fee

    const isFullyClosing = remainingQuantity <= 0

    const updateData: Record<string, unknown> = {
      quantity: remainingQuantity,
      realized_pnl: position.realized_pnl + netPnl,
      total_fees: position.total_fees + fee,
      updated_at: new Date().toISOString(),
    }

    if (isFullyClosing) {
      updateData.status = 'closed'
      updateData.closed_at = new Date().toISOString()
      updateData.close_reason = 'manual'
    }

    const { data: updated, error: updateError } = await supabase
      .from('stuntman_positions')
      .update(updateData)
      .eq('id', positionId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to close position: ${updateError.message}`)

    // Update trade with P&L
    if (tradeId) {
      await supabase
        .from('stuntman_trades')
        .update({
          pnl: netPnl,
          pnl_percent: (netPnl / entryValue) * 100,
        })
        .eq('id', tradeId)
    }

    return this.mapPosition(updated)
  }

  async getOpenPosition(accountId: string, instrumentName: string): Promise<Position | null> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('stuntman_positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('instrument_name', instrumentName)
      .eq('status', 'open')
      .single()

    if (error) return null
    return this.mapPosition(data)
  }

  async getOpenPositions(accountId: string): Promise<Position[]> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('stuntman_positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })

    if (error) throw new Error(`Failed to get positions: ${error.message}`)
    return data.map(this.mapPosition)
  }

  async updatePositionPrices(accountId: string, prices: Record<string, number>): Promise<void> {
    const supabase = await this.getSupabase()
    const positions = await this.getOpenPositions(accountId)

    for (const position of positions) {
      const currentPrice = prices[position.instrumentName]
      if (!currentPrice) continue

      const entryValue = position.quantity * position.avgEntryPrice
      const currentValue = position.quantity * currentPrice
      const unrealizedPnl = position.side === 'LONG' ? currentValue - entryValue : entryValue - currentValue

      await supabase
        .from('stuntman_positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.id)
    }
  }

  // ==========================================================================
  // STOP LOSS / TAKE PROFIT CHECKS
  // ==========================================================================

  async checkStopLossAndTakeProfit(accountId: string, prices: Record<string, number>): Promise<{ closed: Position[]; orders: Order[]; trades: ExecutedTrade[] }> {
    const positions = await this.getOpenPositions(accountId)
    const closed: Position[] = []
    const orders: Order[] = []
    const trades: ExecutedTrade[] = []

    for (const position of positions) {
      const currentPrice = prices[position.instrumentName]
      if (!currentPrice) continue

      let shouldClose = false
      let closeReason = ''

      // Check stop loss
      if (position.stopLoss) {
        if (position.side === 'LONG' && currentPrice <= position.stopLoss) {
          shouldClose = true
          closeReason = 'stop_loss'
        } else if (position.side === 'SHORT' && currentPrice >= position.stopLoss) {
          shouldClose = true
          closeReason = 'stop_loss'
        }
      }

      // Check take profit
      if (position.takeProfit && !shouldClose) {
        if (position.side === 'LONG' && currentPrice >= position.takeProfit) {
          shouldClose = true
          closeReason = 'take_profit'
        } else if (position.side === 'SHORT' && currentPrice <= position.takeProfit) {
          shouldClose = true
          closeReason = 'take_profit'
        }
      }

      if (shouldClose) {
        const closeSide: TradingSide = position.side === 'LONG' ? 'SELL' : 'BUY'
        const result = await this.executeMarketOrder(
          {
            accountId: position.accountId,
            instrumentName: position.instrumentName,
            side: closeSide,
            orderType: 'MARKET',
            quantity: position.quantity,
          },
          currentPrice
        )

        if (result.position) {
          result.position.closeReason = closeReason
          closed.push(result.position)
        }
        orders.push(result.order)
        trades.push(result.trade)
      }
    }

    return { closed, orders, trades }
  }

  // ==========================================================================
  // DATA MAPPING
  // ==========================================================================

  private mapAccount(data: Record<string, unknown>): TradingAccount {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      accountType: data.account_type as 'paper' | 'live',
      name: data.name as string,
      initialBalance: Number(data.initial_balance),
      currentBalance: Number(data.current_balance),
      reservedBalance: Number(data.reserved_balance),
      availableBalance: Number(data.current_balance) - Number(data.reserved_balance),
      isActive: data.is_active as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    }
  }

  private mapPosition(data: Record<string, unknown>): Position {
    const quantity = Number(data.quantity)
    const avgEntryPrice = Number(data.avg_entry_price)
    const currentPrice = Number(data.current_price) || avgEntryPrice
    const entryValue = quantity * avgEntryPrice
    const unrealizedPnl = Number(data.unrealized_pnl) || 0

    return {
      id: data.id as string,
      accountId: data.account_id as string,
      userId: data.user_id as string,
      strategyId: data.strategy_id as string | null,
      instrumentName: data.instrument_name as string,
      side: data.side as PositionSide,
      quantity,
      entryPrice: Number(data.entry_price),
      currentPrice,
      avgEntryPrice,
      unrealizedPnl,
      unrealizedPnlPercent: entryValue > 0 ? (unrealizedPnl / entryValue) * 100 : 0,
      realizedPnl: Number(data.realized_pnl),
      totalFees: Number(data.total_fees),
      stopLoss: data.stop_loss ? Number(data.stop_loss) : null,
      takeProfit: data.take_profit ? Number(data.take_profit) : null,
      trailingStopPercent: data.trailing_stop_percent ? Number(data.trailing_stop_percent) : null,
      status: data.status as PositionStatus,
      closeReason: data.close_reason as string | null,
      openedAt: new Date(data.opened_at as string),
      closedAt: data.closed_at ? new Date(data.closed_at as string) : null,
      duration: data.closed_at
        ? new Date(data.closed_at as string).getTime() - new Date(data.opened_at as string).getTime()
        : Date.now() - new Date(data.opened_at as string).getTime(),
      riskRewardRatio: null,
    }
  }

  private mapOrder(data: Record<string, unknown>): Order {
    return {
      id: data.id as string,
      accountId: data.account_id as string,
      userId: data.user_id as string,
      positionId: data.position_id as string | null,
      strategyId: data.strategy_id as string | null,
      signalId: data.signal_id as string | null,
      externalOrderId: data.external_order_id as string | null,
      instrumentName: data.instrument_name as string,
      side: data.side as TradingSide,
      orderType: data.order_type as OrderType,
      timeInForce: (data.time_in_force || 'GTC') as 'GTC' | 'IOC' | 'FOK',
      quantity: Number(data.quantity),
      filledQuantity: Number(data.filled_quantity),
      remainingQuantity: Number(data.remaining_quantity),
      price: data.price ? Number(data.price) : null,
      stopPrice: data.stop_price ? Number(data.stop_price) : null,
      filledPrice: data.filled_price ? Number(data.filled_price) : null,
      avgFillPrice: data.avg_fill_price ? Number(data.avg_fill_price) : null,
      fee: Number(data.fee),
      feeCurrency: data.fee_currency as string,
      status: data.status as OrderStatus,
      rejectReason: data.reject_reason as string | null,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      filledAt: data.filled_at ? new Date(data.filled_at as string) : null,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at as string) : null,
    }
  }

  private mapTrade(data: Record<string, unknown>): ExecutedTrade {
    return {
      id: data.id as string,
      accountId: data.account_id as string,
      userId: data.user_id as string,
      orderId: data.order_id as string | null,
      positionId: data.position_id as string | null,
      externalTradeId: data.external_trade_id as string | null,
      instrumentName: data.instrument_name as string,
      side: data.side as TradingSide,
      quantity: Number(data.quantity),
      price: Number(data.price),
      value: Number(data.value),
      fee: Number(data.fee),
      feeCurrency: data.fee_currency as string,
      feeRate: Number(data.fee_rate),
      pnl: data.pnl ? Number(data.pnl) : null,
      pnlPercent: data.pnl_percent ? Number(data.pnl_percent) : null,
      isMaker: data.is_maker as boolean,
      slippage: Number(data.slippage),
      executedAt: new Date(data.executed_at as string),
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let engineInstance: PaperTradingEngine | null = null

export function getPaperTradingEngine(): PaperTradingEngine {
  if (!engineInstance) {
    engineInstance = new PaperTradingEngine()
  }
  return engineInstance
}
