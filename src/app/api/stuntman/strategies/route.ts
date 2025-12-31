// =============================================================================
// STUNTMAN AI - STRATEGIES API
// =============================================================================
// Trading strategy configuration and management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_INDICATOR_CONFIG,
  DEFAULT_RISK_CONFIG,
  INSTRUMENTS,
} from '@/lib/stuntman/constants'
import type {
  StrategyConfig,
  Timeframe,
  IndicatorConfig,
  PatternConfig,
  RiskConfig,
} from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// DEFAULT PATTERN CONFIG
// =============================================================================

const DEFAULT_PATTERN_CONFIG: PatternConfig = {
  candlestick: {
    enabled: true,
    patterns: [
      'doji',
      'hammer',
      'inverted_hammer',
      'hanging_man',
      'shooting_star',
      'bullish_engulfing',
      'bearish_engulfing',
      'morning_star',
      'evening_star',
      'three_white_soldiers',
      'three_black_crows',
    ],
  },
  chart: {
    enabled: true,
    patterns: [
      'head_and_shoulders',
      'inverse_head_and_shoulders',
      'double_top',
      'double_bottom',
      'ascending_triangle',
      'descending_triangle',
      'symmetrical_triangle',
      'bull_flag',
      'bear_flag',
      'rising_wedge',
      'falling_wedge',
    ],
  },
  supportResistance: {
    enabled: true,
    lookbackPeriod: 100,
    minTouches: 2,
    priceZonePercent: 0.5,
  },
  trend: {
    enabled: true,
    minSwings: 2,
    swingStrength: 5,
    adxThreshold: 25,
  },
}

// =============================================================================
// GET - Fetch strategies
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('id')
    const accountId = searchParams.get('accountId')
    const isActive = searchParams.get('active')

    // Fetch specific strategy
    if (strategyId) {
      const { data: strategy, error } = await (supabase
        .from('stuntman_strategies') as SupabaseAny)
        .select(`
          *,
          account:stuntman_accounts!inner(user_id, name)
        `)
        .eq('id', strategyId)
        .eq('account.user_id', user.id)
        .single()

      if (error || !strategy) {
        return NextResponse.json({
          success: false,
          error: 'Strategy not found',
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, strategy })
    }

    // Build query
    let query = (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, name, is_paper)
      `)
      .eq('account.user_id', user.id)
      .order('created_at', { ascending: false })

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: strategies, error } = await query

    if (error) {
      console.error('Strategies fetch error:', error)
      return NextResponse.json({ success: true, strategies: [] })
    }

    // Get performance stats for each strategy
    const strategiesWithStats = await Promise.all(
      (strategies || []).map(async (strategy: StrategyConfig & { id: string }) => {
        const { data: signals } = await (supabase
          .from('stuntman_signals') as SupabaseAny)
          .select('id, acted_on, pnl')
          .eq('strategy_id', strategy.id)

        const totalSignals = signals?.length || 0
        const actedSignals = signals?.filter((s: { acted_on: boolean }) => s.acted_on) || []
        const profitableSignals = actedSignals.filter((s: { pnl?: number }) => (s.pnl || 0) > 0)

        return {
          ...strategy,
          stats: {
            total_signals: totalSignals,
            acted_signals: actedSignals.length,
            win_rate: actedSignals.length > 0
              ? (profitableSignals.length / actedSignals.length) * 100
              : 0,
            total_pnl: actedSignals.reduce(
              (sum: number, s: { pnl?: number }) => sum + (s.pnl || 0),
              0
            ),
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      strategies: strategiesWithStats,
    })
  } catch (error) {
    console.error('Strategies API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Create a new strategy
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
      name,
      description,
      type = 'technical',
      instruments,
      timeframes,
      indicators,
      patterns,
      entry_conditions,
      exit_conditions,
      risk,
      is_active = false,
    } = body

    // Validate required fields
    if (!account_id || !name) {
      return NextResponse.json({
        success: false,
        error: 'account_id and name are required',
      }, { status: 400 })
    }

    // Verify account ownership
    const { data: account, error: accError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('id, user_id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (accError || !account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 })
    }

    // Check strategy limit per account
    const { count: strategyCount } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account_id)

    if ((strategyCount || 0) >= 20) {
      return NextResponse.json({
        success: false,
        error: 'Maximum of 20 strategies per account',
      }, { status: 400 })
    }

    // Validate strategy type
    const validTypes = ['technical', 'momentum', 'ml_pattern', 'hybrid', 'custom']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid strategy type',
      }, { status: 400 })
    }

    // Build strategy config
    const now = new Date().toISOString()

    const strategyData = {
      account_id,
      name: name.trim(),
      description: description?.trim() || null,
      type,
      instruments: instruments || INSTRUMENTS.primary,
      timeframes: timeframes || ['15m', '1h'] as Timeframe[],
      indicators: indicators || DEFAULT_INDICATOR_CONFIG,
      patterns: patterns || DEFAULT_PATTERN_CONFIG,
      entry_conditions: entry_conditions || {
        minSignalStrength: 0.5,
        minConfirmations: 2,
        requireTrend: true,
        requireVolume: true,
        cooldownMinutes: 5,
      },
      exit_conditions: exit_conditions || {
        stopLossPercent: 2,
        takeProfitPercent: 4,
        trailingStopPercent: null,
        timeBasedExit: null,
        signalBasedExit: true,
      },
      risk: risk || DEFAULT_RISK_CONFIG,
      is_active,
      created_at: now,
      updated_at: now,
    }

    const { data: strategy, error: insertError } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .insert(strategyData)
      .select()
      .single()

    if (insertError) {
      console.error('Strategy creation error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create strategy',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      strategy,
      message: 'Strategy created successfully',
    })
  } catch (error) {
    console.error('Strategies POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// PUT - Update strategy configuration
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
        error: 'Strategy ID required',
      }, { status: 400 })
    }

    // Verify ownership
    const { data: strategy, error: fetchError } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id)
      `)
      .eq('id', id)
      .eq('account.user_id', user.id)
      .single()

    if (fetchError || !strategy) {
      return NextResponse.json({
        success: false,
        error: 'Strategy not found',
      }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Handle special actions
    if (action === 'toggle') {
      const { data: toggledStrategy, error: toggleError } = await (supabase
        .from('stuntman_strategies') as SupabaseAny)
        .update({
          is_active: !strategy.is_active,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (toggleError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to toggle strategy',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        strategy: toggledStrategy,
        message: `Strategy ${toggledStrategy.is_active ? 'activated' : 'deactivated'}`,
      })
    }

    if (action === 'duplicate') {
      const duplicateData = {
        account_id: strategy.account_id,
        name: `${strategy.name} (Copy)`,
        description: strategy.description,
        type: strategy.type,
        instruments: strategy.instruments,
        timeframes: strategy.timeframes,
        indicators: strategy.indicators,
        patterns: strategy.patterns,
        entry_conditions: strategy.entry_conditions,
        exit_conditions: strategy.exit_conditions,
        risk: strategy.risk,
        is_active: false,
        created_at: now,
        updated_at: now,
      }

      const { data: duplicatedStrategy, error: dupError } = await (supabase
        .from('stuntman_strategies') as SupabaseAny)
        .insert(duplicateData)
        .select()
        .single()

      if (dupError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to duplicate strategy',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        strategy: duplicatedStrategy,
        message: 'Strategy duplicated successfully',
      })
    }

    // Standard update
    const allowedFields = [
      'name',
      'description',
      'instruments',
      'timeframes',
      'indicators',
      'patterns',
      'entry_conditions',
      'exit_conditions',
      'risk',
      'is_active',
    ]

    const updateData: Record<string, unknown> = {
      updated_at: now,
    }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    }

    const { data: updatedStrategy, error: updateError } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update strategy',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      strategy: updatedStrategy,
      message: 'Strategy updated successfully',
    })
  } catch (error) {
    console.error('Strategies PUT error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete a strategy
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
        error: 'Strategy ID required',
      }, { status: 400 })
    }

    // Verify ownership
    const { data: strategy, error: fetchError } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .select(`
        id,
        account:stuntman_accounts!inner(user_id)
      `)
      .eq('id', id)
      .eq('account.user_id', user.id)
      .single()

    if (fetchError || !strategy) {
      return NextResponse.json({
        success: false,
        error: 'Strategy not found',
      }, { status: 404 })
    }

    // Delete related signals first
    await (supabase
      .from('stuntman_signals') as SupabaseAny)
      .delete()
      .eq('strategy_id', id)

    // Delete strategy
    const { error: deleteError } = await (supabase
      .from('stuntman_strategies') as SupabaseAny)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Strategy deletion error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete strategy',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Strategy deleted successfully',
    })
  } catch (error) {
    console.error('Strategies DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
