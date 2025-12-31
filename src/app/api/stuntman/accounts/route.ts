// =============================================================================
// STUNTMAN AI - ACCOUNTS API
// =============================================================================
// Manages paper and live trading accounts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TRADING_CONFIG, DEFAULT_RISK_CONFIG, DEFAULT_INDICATOR_CONFIG } from '@/lib/stuntman/constants'
import type { TradingAccount, AccountSettings, PositionSizing } from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// GET - Fetch user's trading accounts
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')
    const accountType = searchParams.get('type') // 'paper' | 'live'

    // Fetch specific account
    if (accountId) {
      const { data: account, error } = await (supabase
        .from('stuntman_accounts') as SupabaseAny)
        .select(`
          *,
          positions:stuntman_positions(count),
          settings:stuntman_settings(*)
        `)
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Account fetch error:', error)
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      // Calculate total equity (balance + unrealized P&L)
      const { data: positions } = await (supabase
        .from('stuntman_positions') as SupabaseAny)
        .select('unrealized_pnl')
        .eq('account_id', accountId)
        .eq('status', 'open')

      const unrealizedPnl = positions?.reduce(
        (sum: number, p: { unrealized_pnl: number }) => sum + (p.unrealized_pnl || 0),
        0
      ) || 0

      return NextResponse.json({
        success: true,
        account: {
          ...account,
          unrealized_pnl: unrealizedPnl,
          total_equity: account.balance + unrealizedPnl,
        },
      })
    }

    // Fetch all accounts for user
    let query = (supabase.from('stuntman_accounts') as SupabaseAny)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (accountType) {
      query = query.eq('is_paper', accountType === 'paper')
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Accounts fetch error:', error)
      return NextResponse.json({ accounts: [] })
    }

    // Get position counts for each account
    const accountsWithStats = await Promise.all(
      (accounts || []).map(async (account: TradingAccount) => {
        const { data: positions } = await (supabase
          .from('stuntman_positions') as SupabaseAny)
          .select('unrealized_pnl')
          .eq('account_id', account.id)
          .eq('status', 'open')

        const unrealizedPnl = positions?.reduce(
          (sum: number, p: { unrealized_pnl: number }) => sum + (p.unrealized_pnl || 0),
          0
        ) || 0

        return {
          ...account,
          open_positions: positions?.length || 0,
          unrealized_pnl: unrealizedPnl,
          total_equity: account.balance + unrealizedPnl,
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts: accountsWithStats,
    })
  } catch (error) {
    console.error('Accounts API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Create a new trading account
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
      name,
      is_paper = true,
      initial_balance,
      description,
    } = body

    // Validate inputs
    if (!name || typeof name !== 'string' || name.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Account name is required',
      }, { status: 400 })
    }

    // Validate balance
    const balance = is_paper
      ? (initial_balance || TRADING_CONFIG.DEFAULT_PAPER_BALANCE)
      : 0

    if (is_paper) {
      if (balance < TRADING_CONFIG.MIN_PAPER_BALANCE || balance > TRADING_CONFIG.MAX_PAPER_BALANCE) {
        return NextResponse.json({
          success: false,
          error: `Paper balance must be between $${TRADING_CONFIG.MIN_PAPER_BALANCE} and $${TRADING_CONFIG.MAX_PAPER_BALANCE}`,
        }, { status: 400 })
      }
    }

    // Check if user already has max accounts
    const { data: existingAccounts, error: countError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('id')
      .eq('user_id', user.id)

    if (countError) {
      console.error('Account count error:', countError)
    }

    if ((existingAccounts?.length || 0) >= 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum of 10 accounts allowed per user',
      }, { status: 400 })
    }

    // Create the account
    const accountData = {
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      is_paper,
      balance,
      initial_balance: balance,
      realized_pnl: 0,
      win_count: 0,
      loss_count: 0,
      total_trades: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: account, error: insertError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .insert(accountData)
      .select()
      .single()

    if (insertError) {
      console.error('Account creation error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create account',
      }, { status: 500 })
    }

    // Create default settings for the account
    const settingsData: Partial<AccountSettings> = {
      user_id: user.id,
      account_id: account.id,
      default_instrument: 'BTC_USDT',
      default_timeframe: '15m',
      default_order_type: 'market',
      risk_per_trade: 2,
      max_daily_loss: DEFAULT_RISK_CONFIG.maxDailyLoss,
      max_position_size: DEFAULT_RISK_CONFIG.maxPositionSize,
      auto_stop_loss: true,
      default_stop_loss_percent: TRADING_CONFIG.DEFAULT_STOP_LOSS_PERCENT,
      auto_take_profit: true,
      default_take_profit_percent: TRADING_CONFIG.DEFAULT_TAKE_PROFIT_PERCENT,
      show_confirmations: true,
      sound_alerts: true,
      theme: 'dark',
      chart_indicators: ['ema', 'bollinger', 'volume'],
      position_sizing: 'percent' as PositionSizing,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await (supabase
      .from('stuntman_settings') as SupabaseAny)
      .insert(settingsData)

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        open_positions: 0,
        unrealized_pnl: 0,
        total_equity: balance,
      },
      message: `${is_paper ? 'Paper' : 'Live'} trading account created successfully`,
    })
  } catch (error) {
    console.error('Accounts POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update account settings or reset balance
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Account ID required',
      }, { status: 400 })
    }

    // Verify ownership
    const { data: account, error: fetchError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 })
    }

    // Handle special actions
    if (action === 'reset') {
      // Reset paper trading account
      if (!account.is_paper) {
        return NextResponse.json({
          success: false,
          error: 'Can only reset paper trading accounts',
        }, { status: 400 })
      }

      // Close all positions
      await (supabase
        .from('stuntman_positions') as SupabaseAny)
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('account_id', id)
        .eq('status', 'open')

      // Cancel all pending orders
      await (supabase
        .from('stuntman_orders') as SupabaseAny)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('account_id', id)
        .eq('status', 'pending')

      // Reset account stats
      const resetBalance = updates.balance || account.initial_balance || TRADING_CONFIG.DEFAULT_PAPER_BALANCE

      const { data: resetAccount, error: resetError } = await (supabase
        .from('stuntman_accounts') as SupabaseAny)
        .update({
          balance: resetBalance,
          initial_balance: resetBalance,
          realized_pnl: 0,
          win_count: 0,
          loss_count: 0,
          total_trades: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (resetError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to reset account',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        account: resetAccount,
        message: 'Account reset successfully',
      })
    }

    if (action === 'toggle_active') {
      const { data: toggledAccount, error: toggleError } = await (supabase
        .from('stuntman_accounts') as SupabaseAny)
        .update({
          is_active: !account.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (toggleError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update account',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        account: toggledAccount,
        message: `Account ${toggledAccount.is_active ? 'activated' : 'deactivated'}`,
      })
    }

    // Standard update
    const allowedFields = ['name', 'description']
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    }

    const { data: updatedAccount, error: updateError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update account',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      account: updatedAccount,
    })
  } catch (error) {
    console.error('Accounts PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete a trading account
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
        error: 'Account ID required',
      }, { status: 400 })
    }

    // Verify ownership and check for open positions
    const { data: account, error: fetchError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('*, positions:stuntman_positions(count)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 })
    }

    // Check for open positions
    const { data: openPositions } = await (supabase
      .from('stuntman_positions') as SupabaseAny)
      .select('id')
      .eq('account_id', id)
      .eq('status', 'open')

    if (openPositions && openPositions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete account with open positions. Close all positions first.',
      }, { status: 400 })
    }

    // Delete related data in order
    // 1. Delete settings
    await (supabase
      .from('stuntman_settings') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 2. Delete signals
    await (supabase
      .from('stuntman_signals') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 3. Delete P&L snapshots
    await (supabase
      .from('stuntman_pnl_snapshots') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 4. Delete trades
    await (supabase
      .from('stuntman_trades') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 5. Delete orders
    await (supabase
      .from('stuntman_orders') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 6. Delete positions
    await (supabase
      .from('stuntman_positions') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 7. Delete strategies
    await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .delete()
      .eq('account_id', id)

    // 8. Finally delete the account
    const { error: deleteError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Account deletion error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete account',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Accounts DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
