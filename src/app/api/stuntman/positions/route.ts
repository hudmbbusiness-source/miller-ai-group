// @ts-nocheck
// =============================================================================
// STUNTMAN AI - POSITIONS API
// =============================================================================
// Position management, P&L tracking, and risk controls
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FEES, INSTRUMENT_PRECISION, ERROR_MESSAGES } from '@/lib/stuntman/constants'
import type { Position } from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// HELPERS
// =============================================================================

function getPrecision(instrument: string): { price: number; quantity: number } {
  return INSTRUMENT_PRECISION[instrument] || { price: 8, quantity: 8 }
}

function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function calculateUnrealizedPnl(position: Position, currentPrice: number): number {
  if (position.side === 'long') {
    return (currentPrice - position.entryPrice) * position.quantity
  } else {
    return (position.entryPrice - currentPrice) * position.quantity
  }
}

function calculatePnlPercent(position: Position, currentPrice: number): number {
  const pnl = calculateUnrealizedPnl(position, currentPrice)
  const costBasis = position.entryPrice * position.quantity
  return costBasis > 0 ? (pnl / costBasis) * 100 : 0
}

// =============================================================================
// GET - Fetch positions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const positionId = searchParams.get('id')
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status') || 'open' // open, closed, all
    const instrument = searchParams.get('instrument')

    // Fetch specific position
    if (positionId) {
      const { data: position, error } = await (supabase
        .from('stuntman_positions') as SupabaseAny)
        .select(`
          *,
          account:stuntman_accounts!inner(user_id, name)
        `)
        .eq('id', positionId)
        .eq('account.user_id', user.id)
        .single()

      if (error || !position) {
        return NextResponse.json({
          success: false,
          error: ERROR_MESSAGES.POSITION_NOT_FOUND,
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, position })
    }

    // Build query
    let query = (supabase
      .from('stuntman_positions') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, name, is_paper)
      `)
      .eq('account.user_id', user.id)
      .order('created_at', { ascending: false })

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (instrument) {
      query = query.eq('instrument_name', instrument)
    }

    const { data: positions, error } = await query

    if (error) {
      console.error('Positions fetch error:', error)
      return NextResponse.json({ success: true, positions: [] })
    }

    // Calculate summary stats
    const openPositions = (positions || []).filter((p: Position) => p.status === 'open')
    const totalUnrealizedPnl = openPositions.reduce(
      (sum: number, p: { unrealized_pnl: number }) => sum + (p.unrealized_pnl || 0),
      0
    )
    const totalCostBasis = openPositions.reduce(
      (sum: number, p: { cost_basis: number }) => sum + (p.cost_basis || 0),
      0
    )
    const winningPositions = openPositions.filter(
      (p: { unrealized_pnl: number }) => (p.unrealized_pnl || 0) > 0
    ).length
    const losingPositions = openPositions.filter(
      (p: { unrealized_pnl: number }) => (p.unrealized_pnl || 0) < 0
    ).length

    return NextResponse.json({
      success: true,
      positions: positions || [],
      summary: {
        total_positions: openPositions.length,
        total_unrealized_pnl: totalUnrealizedPnl,
        total_cost_basis: totalCostBasis,
        winning_positions: winningPositions,
        losing_positions: losingPositions,
        overall_pnl_percent: totalCostBasis > 0
          ? (totalUnrealizedPnl / totalCostBasis) * 100
          : 0,
      },
    })
  } catch (error) {
    console.error('Positions API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Update position price and check stops/targets
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      // ==========================================================================
      // UPDATE PRICES - Batch update all positions with current prices
      // ==========================================================================
      case 'update_prices': {
        const { prices } = body // { BTC_USDT: 50000, ETH_USDT: 3000, ... }

        if (!prices || typeof prices !== 'object') {
          return NextResponse.json({
            success: false,
            error: 'Prices object required',
          }, { status: 400 })
        }

        // Get all open positions for user
        const { data: positions } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select(`
            *,
            account:stuntman_accounts!inner(user_id, id, balance, realized_pnl, win_count, loss_count)
          `)
          .eq('account.user_id', user.id)
          .eq('status', 'open')

        if (!positions || positions.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No open positions to update',
            triggered: [],
          })
        }

        const triggered: { id: string; type: string; price: number }[] = []
        const now = new Date().toISOString()

        for (const position of positions) {
          const currentPrice = prices[position.instrument_name]
          if (!currentPrice) continue

          const precision = getPrecision(position.instrument_name)
          const newPrice = roundToDecimal(parseFloat(currentPrice), precision.price)
          const unrealizedPnl = position.side === 'long'
            ? (newPrice - position.entry_price) * position.quantity
            : (position.entry_price - newPrice) * position.quantity
          const pnlPercent = (unrealizedPnl / (position.entry_price * position.quantity)) * 100

          // Check stop loss
          let shouldClose = false
          let closeReason = ''

          if (position.stop_loss) {
            if (position.side === 'long' && newPrice <= position.stop_loss) {
              shouldClose = true
              closeReason = 'stop_loss'
              triggered.push({ id: position.id, type: 'stop_loss', price: newPrice })
            } else if (position.side === 'short' && newPrice >= position.stop_loss) {
              shouldClose = true
              closeReason = 'stop_loss'
              triggered.push({ id: position.id, type: 'stop_loss', price: newPrice })
            }
          }

          // Check take profit
          if (!shouldClose && position.take_profit) {
            if (position.side === 'long' && newPrice >= position.take_profit) {
              shouldClose = true
              closeReason = 'take_profit'
              triggered.push({ id: position.id, type: 'take_profit', price: newPrice })
            } else if (position.side === 'short' && newPrice <= position.take_profit) {
              shouldClose = true
              closeReason = 'take_profit'
              triggered.push({ id: position.id, type: 'take_profit', price: newPrice })
            }
          }

          // Check trailing stop
          if (!shouldClose && position.trailing_stop) {
            const trailingDistance = position.entry_price * (position.trailing_stop / 100)
            const trailingStopPrice = position.side === 'long'
              ? position.highest_price - trailingDistance
              : position.lowest_price + trailingDistance

            if (position.side === 'long' && newPrice <= trailingStopPrice) {
              shouldClose = true
              closeReason = 'trailing_stop'
              triggered.push({ id: position.id, type: 'trailing_stop', price: newPrice })
            } else if (position.side === 'short' && newPrice >= trailingStopPrice) {
              shouldClose = true
              closeReason = 'trailing_stop'
              triggered.push({ id: position.id, type: 'trailing_stop', price: newPrice })
            }
          }

          if (shouldClose) {
            // Close position
            const fees = position.quantity * newPrice * FEES.taker
            const realizedPnl = unrealizedPnl - fees
            const isWin = realizedPnl > 0

            await (supabase
              .from('stuntman_positions') as SupabaseAny)
              .update({
                current_price: newPrice,
                unrealized_pnl: 0,
                realized_pnl: position.realized_pnl + realizedPnl,
                status: 'closed',
                closed_at: now,
                close_reason: closeReason,
                updated_at: now,
              })
              .eq('id', position.id)

            // Create trade record
            await (supabase
              .from('stuntman_trades') as SupabaseAny)
              .insert({
                id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                account_id: position.account_id,
                instrument_name: position.instrument_name,
                side: position.side === 'long' ? 'sell' : 'buy',
                quantity: position.quantity,
                price: newPrice,
                fees,
                realized_pnl: realizedPnl,
                created_at: now,
              })

            // Update account
            const proceeds = position.quantity * newPrice - fees
            await (supabase
              .from('stuntman_accounts') as SupabaseAny)
              .update({
                balance: position.account.balance + proceeds,
                realized_pnl: position.account.realized_pnl + realizedPnl,
                win_count: isWin ? position.account.win_count + 1 : position.account.win_count,
                loss_count: !isWin ? position.account.loss_count + 1 : position.account.loss_count,
                updated_at: now,
              })
              .eq('id', position.account.id)
          } else {
            // Update position with new price
            const updateData: Record<string, unknown> = {
              current_price: newPrice,
              unrealized_pnl: unrealizedPnl,
              unrealized_pnl_percent: pnlPercent,
              updated_at: now,
            }

            // Track highest/lowest for trailing stops
            if (position.side === 'long' && (!position.highest_price || newPrice > position.highest_price)) {
              updateData.highest_price = newPrice
            }
            if (position.side === 'short' && (!position.lowest_price || newPrice < position.lowest_price)) {
              updateData.lowest_price = newPrice
            }

            await (supabase
              .from('stuntman_positions') as SupabaseAny)
              .update(updateData)
              .eq('id', position.id)
          }
        }

        return NextResponse.json({
          success: true,
          updated: positions.length,
          triggered,
        })
      }

      // ==========================================================================
      // CLOSE POSITION - Close a position at market price
      // ==========================================================================
      case 'close': {
        const { position_id, current_price, quantity: closeQuantity } = body

        if (!position_id || !current_price) {
          return NextResponse.json({
            success: false,
            error: 'position_id and current_price required',
          }, { status: 400 })
        }

        // Get position with account
        const { data: position, error: posError } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select(`
            *,
            account:stuntman_accounts!inner(user_id, id, balance, realized_pnl, win_count, loss_count, total_trades)
          `)
          .eq('id', position_id)
          .eq('account.user_id', user.id)
          .eq('status', 'open')
          .single()

        if (posError || !position) {
          return NextResponse.json({
            success: false,
            error: ERROR_MESSAGES.POSITION_NOT_FOUND,
          }, { status: 404 })
        }

        const precision = getPrecision(position.instrument_name)
        const exitPrice = roundToDecimal(parseFloat(current_price), precision.price)
        const quantityToClose = closeQuantity
          ? Math.min(roundToDecimal(parseFloat(closeQuantity), precision.quantity), position.quantity)
          : position.quantity
        const isFullClose = quantityToClose >= position.quantity

        const fees = quantityToClose * exitPrice * FEES.taker
        const unrealizedPnl = position.side === 'long'
          ? (exitPrice - position.entry_price) * quantityToClose
          : (position.entry_price - exitPrice) * quantityToClose
        const realizedPnl = unrealizedPnl - fees
        const isWin = realizedPnl > 0

        const now = new Date().toISOString()

        if (isFullClose) {
          // Close entire position
          await (supabase
            .from('stuntman_positions') as SupabaseAny)
            .update({
              quantity: 0,
              current_price: exitPrice,
              unrealized_pnl: 0,
              realized_pnl: position.realized_pnl + realizedPnl,
              status: 'closed',
              closed_at: now,
              close_reason: 'manual',
              updated_at: now,
            })
            .eq('id', position_id)
        } else {
          // Partial close
          const remainingQuantity = position.quantity - quantityToClose
          const remainingUnrealizedPnl = position.side === 'long'
            ? (exitPrice - position.entry_price) * remainingQuantity
            : (position.entry_price - exitPrice) * remainingQuantity

          await (supabase
            .from('stuntman_positions') as SupabaseAny)
            .update({
              quantity: remainingQuantity,
              current_price: exitPrice,
              unrealized_pnl: remainingUnrealizedPnl,
              realized_pnl: position.realized_pnl + realizedPnl,
              updated_at: now,
            })
            .eq('id', position_id)
        }

        // Create trade record
        await (supabase
          .from('stuntman_trades') as SupabaseAny)
          .insert({
            id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            account_id: position.account_id,
            instrument_name: position.instrument_name,
            side: position.side === 'long' ? 'sell' : 'buy',
            quantity: quantityToClose,
            price: exitPrice,
            fees,
            realized_pnl: realizedPnl,
            created_at: now,
          })

        // Update account
        const proceeds = quantityToClose * exitPrice - fees
        await (supabase
          .from('stuntman_accounts') as SupabaseAny)
          .update({
            balance: position.account.balance + proceeds,
            realized_pnl: position.account.realized_pnl + realizedPnl,
            total_trades: position.account.total_trades + 1,
            win_count: isWin ? position.account.win_count + 1 : position.account.win_count,
            loss_count: !isWin ? position.account.loss_count + 1 : position.account.loss_count,
            updated_at: now,
          })
          .eq('id', position.account.id)

        return NextResponse.json({
          success: true,
          position_id,
          closed_quantity: quantityToClose,
          exit_price: exitPrice,
          realized_pnl: realizedPnl,
          fees,
          is_win: isWin,
          message: isFullClose
            ? `Position closed at $${exitPrice.toFixed(precision.price)}`
            : `Closed ${quantityToClose} units at $${exitPrice.toFixed(precision.price)}`,
        })
      }

      // ==========================================================================
      // CLOSE ALL - Close all positions for an account
      // ==========================================================================
      case 'close_all': {
        const { account_id, prices } = body

        if (!account_id || !prices) {
          return NextResponse.json({
            success: false,
            error: 'account_id and prices required',
          }, { status: 400 })
        }

        // Verify account ownership
        const { data: account, error: accError } = await (supabase
          .from('stuntman_accounts') as SupabaseAny)
          .select('*')
          .eq('id', account_id)
          .eq('user_id', user.id)
          .single()

        if (accError || !account) {
          return NextResponse.json({
            success: false,
            error: 'Account not found',
          }, { status: 404 })
        }

        // Get all open positions
        const { data: positions } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select('*')
          .eq('account_id', account_id)
          .eq('status', 'open')

        if (!positions || positions.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No open positions to close',
            closed: 0,
          })
        }

        const now = new Date().toISOString()
        let totalRealizedPnl = 0
        let wins = 0
        let losses = 0
        let totalProceeds = 0

        for (const position of positions) {
          const currentPrice = prices[position.instrument_name]
          if (!currentPrice) continue

          const precision = getPrecision(position.instrument_name)
          const exitPrice = roundToDecimal(parseFloat(currentPrice), precision.price)
          const fees = position.quantity * exitPrice * FEES.taker
          const unrealizedPnl = position.side === 'long'
            ? (exitPrice - position.entry_price) * position.quantity
            : (position.entry_price - exitPrice) * position.quantity
          const realizedPnl = unrealizedPnl - fees
          const isWin = realizedPnl > 0

          totalRealizedPnl += realizedPnl
          totalProceeds += position.quantity * exitPrice - fees
          if (isWin) wins++
          else losses++

          // Close position
          await (supabase
            .from('stuntman_positions') as SupabaseAny)
            .update({
              quantity: 0,
              current_price: exitPrice,
              unrealized_pnl: 0,
              realized_pnl: position.realized_pnl + realizedPnl,
              status: 'closed',
              closed_at: now,
              close_reason: 'close_all',
              updated_at: now,
            })
            .eq('id', position.id)

          // Create trade record
          await (supabase
            .from('stuntman_trades') as SupabaseAny)
            .insert({
              id: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              account_id,
              instrument_name: position.instrument_name,
              side: position.side === 'long' ? 'sell' : 'buy',
              quantity: position.quantity,
              price: exitPrice,
              fees,
              realized_pnl: realizedPnl,
              created_at: now,
            })
        }

        // Update account
        await (supabase
          .from('stuntman_accounts') as SupabaseAny)
          .update({
            balance: account.balance + totalProceeds,
            realized_pnl: account.realized_pnl + totalRealizedPnl,
            total_trades: account.total_trades + positions.length,
            win_count: account.win_count + wins,
            loss_count: account.loss_count + losses,
            updated_at: now,
          })
          .eq('id', account_id)

        return NextResponse.json({
          success: true,
          closed: positions.length,
          total_realized_pnl: totalRealizedPnl,
          wins,
          losses,
          message: `Closed ${positions.length} positions`,
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Positions POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update position settings (stop loss, take profit, etc.)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, stop_loss, take_profit, trailing_stop, notes } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Position ID required',
      }, { status: 400 })
    }

    // Verify ownership
    const { data: position, error: fetchError } = await (supabase
      .from('stuntman_positions') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id)
      `)
      .eq('id', id)
      .eq('account.user_id', user.id)
      .eq('status', 'open')
      .single()

    if (fetchError || !position) {
      return NextResponse.json({
        success: false,
        error: ERROR_MESSAGES.POSITION_NOT_FOUND,
      }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (stop_loss !== undefined) {
      const precision = getPrecision(position.instrument_name)
      updateData.stop_loss = stop_loss
        ? roundToDecimal(parseFloat(stop_loss), precision.price)
        : null
    }

    if (take_profit !== undefined) {
      const precision = getPrecision(position.instrument_name)
      updateData.take_profit = take_profit
        ? roundToDecimal(parseFloat(take_profit), precision.price)
        : null
    }

    if (trailing_stop !== undefined) {
      updateData.trailing_stop = trailing_stop ? parseFloat(trailing_stop) : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: updatedPosition, error: updateError } = await (supabase
      .from('stuntman_positions') as SupabaseAny)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update position',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      position: updatedPosition,
      message: 'Position updated successfully',
    })
  } catch (error) {
    console.error('Positions PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
