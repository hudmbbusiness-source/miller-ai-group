// @ts-nocheck
// =============================================================================
// STUNTMAN AI - SIGNALS API
// =============================================================================
// Trading signal generation and management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateAdvancedSignal,
  generateAllSignals,
  getBestOpportunities,
} from '@/lib/stuntman/signal-generator'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// HELPERS
// =============================================================================

// (Advanced signal generator handles all data fetching internally)

// =============================================================================
// GET - Fetch signals
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const signalId = searchParams.get('id')
    const accountId = searchParams.get('accountId')
    const strategyId = searchParams.get('strategyId')
    const instrument = searchParams.get('instrument')
    const status = searchParams.get('status') // active, expired, acted_on, all
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch specific signal
    if (signalId) {
      const { data: signal, error } = await (supabase
        .from('stuntman_signals') as SupabaseAny)
        .select(`
          *,
          account:stuntman_accounts!inner(user_id, name),
          strategy:stuntman_strategies(name)
        `)
        .eq('id', signalId)
        .eq('account.user_id', user.id)
        .single()

      if (error || !signal) {
        return NextResponse.json({
          success: false,
          error: 'Signal not found',
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, signal })
    }

    // Build query
    let query = (supabase
      .from('stuntman_signals') as SupabaseAny)
      .select(`
        *,
        account:stuntman_accounts!inner(user_id, name),
        strategy:stuntman_strategies(name)
      `)
      .eq('account.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (strategyId) {
      query = query.eq('strategy_id', strategyId)
    }

    if (instrument) {
      query = query.eq('instrument_name', instrument)
    }

    if (status && status !== 'all') {
      const now = new Date().toISOString()
      switch (status) {
        case 'active':
          query = query.gt('valid_until', now).eq('acted_on', false)
          break
        case 'expired':
          query = query.lte('valid_until', now)
          break
        case 'acted_on':
          query = query.eq('acted_on', true)
          break
      }
    }

    const { data: signals, error } = await query

    if (error) {
      console.error('Signals fetch error:', error)
      return NextResponse.json({ success: true, signals: [] })
    }

    return NextResponse.json({
      success: true,
      signals: signals || [],
    })
  } catch (error) {
    console.error('Signals API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// POST - Generate new signal or act on existing signal
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
      // GENERATE SIGNAL - Generate a new trading signal
      // ==========================================================================
      case 'generate': {
        const { account_id, strategy_id, instrument, timeframe = '15m' } = body

        if (!account_id || !instrument) {
          return NextResponse.json({
            success: false,
            error: 'account_id and instrument required',
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

        // Get strategy config if provided
        let strategyConfig = null
        if (strategy_id) {
          const { data: strategy } = await (supabase
            .from('stuntman_strategies') as SupabaseAny)
            .select('*')
            .eq('id', strategy_id)
            .eq('account_id', account_id)
            .single()
          strategyConfig = strategy
        }

        // Generate advanced signal using new system
        const advancedSignal = await generateAdvancedSignal(instrument)

        if (!advancedSignal || advancedSignal.action === 'HOLD') {
          return NextResponse.json({
            success: true,
            signal: null,
            message: 'No signal generated (conditions not met)',
          })
        }

        // Map advanced signal to database format
        const side = advancedSignal.action.includes('BUY') ? 'buy' : 'sell'
        const signalId = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        // Save signal to database
        const signalData = {
          id: signalId,
          account_id,
          strategy_id: strategy_id || null,
          instrument_name: instrument,
          timeframe,
          side,
          strength: advancedSignal.confidence / 100,
          confidence: advancedSignal.confidence / 100,
          source: advancedSignal.sources.map(s => s.name).join(', '),
          indicators: advancedSignal.sources,
          valid_until: new Date(Date.now() + 3600000).toISOString(), // 1 hour validity
          acted_on: false,
          created_at: new Date().toISOString(),
        }

        const { error: insertError } = await (supabase
          .from('stuntman_signals') as SupabaseAny)
          .insert(signalData)

        if (insertError) {
          console.error('Signal save error:', insertError)
        }

        return NextResponse.json({
          success: true,
          signal: {
            ...signalData,
            action: advancedSignal.action,
            risk_score: advancedSignal.risk_score,
            stop_loss: advancedSignal.stop_loss,
            take_profit: advancedSignal.take_profit,
            position_size: advancedSignal.position_size,
            sources: advancedSignal.sources,
          },
          message: `${advancedSignal.action} signal generated with ${advancedSignal.confidence}% confidence`,
        })
      }

      // ==========================================================================
      // SCAN - Scan multiple instruments for signals (uses advanced system)
      // ==========================================================================
      case 'scan': {
        const { account_id, minConfidence = 50 } = body

        if (!account_id) {
          return NextResponse.json({
            success: false,
            error: 'account_id required',
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

        // Use advanced signal generator to scan all instruments
        const allSignals = await generateAllSignals()
        const opportunities = await getBestOpportunities(minConfidence)

        // Save opportunities to database
        for (const signal of opportunities) {
          const side = signal.action.includes('BUY') ? 'buy' : 'sell'
          const signalId = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

          await (supabase
            .from('stuntman_signals') as SupabaseAny)
            .insert({
              id: signalId,
              account_id,
              instrument_name: signal.instrument,
              timeframe: signal.timeframe,
              side,
              strength: signal.confidence / 100,
              confidence: signal.confidence / 100,
              source: signal.sources.map(s => s.name).join(', '),
              indicators: signal.sources,
              valid_until: new Date(Date.now() + 3600000).toISOString(),
              acted_on: false,
              created_at: new Date().toISOString(),
            })
        }

        return NextResponse.json({
          success: true,
          allSignals,
          opportunities,
          strongBuy: allSignals.filter(s => s.action === 'STRONG_BUY'),
          buy: allSignals.filter(s => s.action === 'BUY'),
          sell: allSignals.filter(s => s.action === 'SELL'),
          strongSell: allSignals.filter(s => s.action === 'STRONG_SELL'),
          hold: allSignals.filter(s => s.action === 'HOLD'),
          scanned: allSignals.length,
          generated: opportunities.length,
        })
      }

      // ==========================================================================
      // ACT ON SIGNAL - Mark signal as acted upon
      // ==========================================================================
      case 'act': {
        const { signal_id, order_id, pnl } = body

        if (!signal_id) {
          return NextResponse.json({
            success: false,
            error: 'signal_id required',
          }, { status: 400 })
        }

        // Verify ownership
        const { data: signal, error: fetchError } = await (supabase
          .from('stuntman_signals') as SupabaseAny)
          .select(`
            *,
            account:stuntman_accounts!inner(user_id)
          `)
          .eq('id', signal_id)
          .eq('account.user_id', user.id)
          .single()

        if (fetchError || !signal) {
          return NextResponse.json({
            success: false,
            error: 'Signal not found',
          }, { status: 404 })
        }

        // Update signal
        const { error: updateError } = await (supabase
          .from('stuntman_signals') as SupabaseAny)
          .update({
            acted_on: true,
            order_id: order_id || null,
            pnl: pnl || null,
            acted_at: new Date().toISOString(),
          })
          .eq('id', signal_id)

        if (updateError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to update signal',
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Signal marked as acted upon',
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Signals POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete expired signals
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const deleteExpired = searchParams.get('expired') === 'true'

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'accountId required',
      }, { status: 400 })
    }

    // Verify account ownership
    const { data: account, error: accError } = await (supabase
      .from('stuntman_accounts') as SupabaseAny)
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accError || !account) {
      return NextResponse.json({
        success: false,
        error: 'Account not found',
      }, { status: 404 })
    }

    let query = (supabase
      .from('stuntman_signals') as SupabaseAny)
      .delete()
      .eq('account_id', accountId)

    if (deleteExpired) {
      query = query.lte('valid_until', new Date().toISOString())
    }

    const { error: deleteError, count } = await query

    if (deleteError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete signals',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: deleteExpired ? 'Expired signals deleted' : 'Signals deleted',
    })
  } catch (error) {
    console.error('Signals DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
