// =============================================================================
// STUNTMAN AI - SIGNALS API
// =============================================================================
// Trading signal generation and management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignalGenerator } from '@/lib/stuntman/signal-generator'
import { CRYPTO_COM_API, SIGNAL_THRESHOLDS } from '@/lib/stuntman/constants'
import type { OHLCV, Signal, Timeframe } from '@/lib/stuntman/types'

// Type alias for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any

// =============================================================================
// HELPERS
// =============================================================================

interface RawCandlestick {
  o: string
  h: string
  l: string
  c: string
  v: string
  t: number
}

async function fetchCandles(instrument: string, timeframe: Timeframe, limit: number = 100): Promise<OHLCV[]> {
  try {
    const timeframeMap: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1D',
      '1w': '1W',
    }

    const response = await fetch(
      `${CRYPTO_COM_API.PUBLIC_API_URL}/get-candlestick?instrument_name=${instrument}&timeframe=${timeframeMap[timeframe]}&count=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    if (data.code !== 0 || !data.result?.data) return []

    return (data.result.data as RawCandlestick[]).map((c) => ({
      openTime: c.t,
      closeTime: c.t + 60000,
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.v),
      quoteVolume: 0,
      tradeCount: 0,
    }))
  } catch (error) {
    console.error('Failed to fetch candles:', error)
    return []
  }
}

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

        // Fetch market data
        const candles = await fetchCandles(instrument, timeframe as Timeframe, 200)

        if (candles.length < 50) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient market data',
          }, { status: 400 })
        }

        // Generate signal
        const generator = getSignalGenerator()
        const signal = generator.generateSignal(instrument, candles, strategyConfig)

        if (!signal) {
          return NextResponse.json({
            success: true,
            signal: null,
            message: 'No signal generated (conditions not met)',
          })
        }

        // Save signal to database
        const signalData = {
          id: signal.id,
          account_id,
          strategy_id: strategy_id || null,
          instrument_name: instrument,
          timeframe,
          side: signal.side,
          strength: signal.strength,
          confidence: signal.confidence,
          source: signal.source,
          indicators: signal.indicators,
          patterns: signal.patterns,
          valid_until: new Date(signal.validUntil).toISOString(),
          acted_on: false,
          created_at: new Date(signal.timestamp).toISOString(),
        }

        const { error: insertError } = await (supabase
          .from('stuntman_signals') as SupabaseAny)
          .insert(signalData)

        if (insertError) {
          console.error('Signal save error:', insertError)
          // Return signal anyway, just don't persist
        }

        return NextResponse.json({
          success: true,
          signal: {
            ...signalData,
            indicators: signal.indicators,
            patterns: signal.patterns,
          },
          message: `${signal.side.toUpperCase()} signal generated with ${(signal.confidence * 100).toFixed(0)}% confidence`,
        })
      }

      // ==========================================================================
      // SCAN - Scan multiple instruments for signals
      // ==========================================================================
      case 'scan': {
        const { account_id, instruments, timeframe = '15m', strategy_id } = body

        if (!account_id || !instruments || !Array.isArray(instruments)) {
          return NextResponse.json({
            success: false,
            error: 'account_id and instruments array required',
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

        const generator = getSignalGenerator()
        const signals: Signal[] = []
        const errors: string[] = []

        // Scan each instrument (limited to 10)
        const instrumentsToScan = instruments.slice(0, 10)

        for (const instrument of instrumentsToScan) {
          try {
            const candles = await fetchCandles(instrument, timeframe as Timeframe, 200)

            if (candles.length >= 50) {
              const signal = generator.generateSignal(instrument, candles, strategyConfig)
              if (signal) {
                signals.push(signal)

                // Save to database
                await (supabase
                  .from('stuntman_signals') as SupabaseAny)
                  .insert({
                    id: signal.id,
                    account_id,
                    strategy_id: strategy_id || null,
                    instrument_name: instrument,
                    timeframe,
                    side: signal.side,
                    strength: signal.strength,
                    confidence: signal.confidence,
                    source: signal.source,
                    indicators: signal.indicators,
                    patterns: signal.patterns,
                    valid_until: new Date(signal.validUntil).toISOString(),
                    acted_on: false,
                    created_at: new Date(signal.timestamp).toISOString(),
                  })
              }
            }
          } catch (err) {
            errors.push(`${instrument}: ${err instanceof Error ? err.message : 'Failed'}`)
          }
        }

        return NextResponse.json({
          success: true,
          signals,
          scanned: instrumentsToScan.length,
          generated: signals.length,
          errors: errors.length > 0 ? errors : undefined,
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
