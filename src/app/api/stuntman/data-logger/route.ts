/**
 * DATA LOGGER - Saves market data and trades for future backtesting
 *
 * This endpoint collects and stores:
 * - Intraday candle data (5-minute bars)
 * - Signals generated
 * - Trades executed
 *
 * After collecting data, we can test strategies on it later.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  hour: number
  dateStr: string
}

interface TradeLog {
  timestamp: string
  patternId: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  exitPrice?: number
  exitReason?: string
  pnl?: number
  regime: string
}

// POST: Log data (candles, signals, trades)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === 'candles') {
      // Save candle data for future backtesting (using simple table)
      const { error } = await supabase
        .from('stuntman_market_data_simple')
        .upsert(
          data.map((c: CandleData) => ({
            timestamp: new Date(c.time).toISOString(),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            hour: c.hour,
            date_str: c.dateStr,
          })),
          { onConflict: 'timestamp' }
        )

      if (error) throw error
      return NextResponse.json({ success: true, saved: data.length })
    }

    if (type === 'signal') {
      // Log signal generated (using simple table)
      const { error } = await supabase
        .from('stuntman_signals_simple')
        .insert({
          timestamp: new Date().toISOString(),
          pattern_id: data.patternId,
          direction: data.direction,
          entry_price: data.entryPrice,
          stop_loss: data.stopLoss,
          take_profit: data.takeProfit,
          confidence: data.confidence,
          reason: data.reason,
          regime: data.regime,
        })

      if (error) throw error
      return NextResponse.json({ success: true, logged: 'signal' })
    }

    if (type === 'trade') {
      // Log trade executed (using simple table)
      const { error } = await supabase
        .from('stuntman_trades_simple')
        .insert({
          timestamp: new Date().toISOString(),
          pattern_id: data.patternId,
          direction: data.direction,
          entry_price: data.entryPrice,
          stop_loss: data.stopLoss,
          take_profit: data.takeProfit,
          exit_price: data.exitPrice,
          exit_reason: data.exitReason,
          pnl: data.pnl,
          regime: data.regime,
        })

      if (error) throw error
      return NextResponse.json({ success: true, logged: 'trade' })
    }

    return NextResponse.json({ success: false, error: 'Unknown type' })
  } catch (error) {
    console.error('Data logger error:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}

// GET: Retrieve logged data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'summary'
    const days = parseInt(searchParams.get('days') || '7')

    const since = new Date()
    since.setDate(since.getDate() - days)

    if (type === 'candles') {
      const { data, error } = await supabase
        .from('stuntman_market_data_simple')
        .select('*')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true })

      if (error) throw error
      return NextResponse.json({ success: true, candles: data, count: data?.length || 0 })
    }

    if (type === 'signals') {
      const { data, error } = await supabase
        .from('stuntman_signals_simple')
        .select('*')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, signals: data, count: data?.length || 0 })
    }

    if (type === 'trades') {
      const { data, error } = await supabase
        .from('stuntman_trades_simple')
        .select('*')
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, trades: data, count: data?.length || 0 })
    }

    // Summary
    const [candles, signals, trades] = await Promise.all([
      supabase.from('stuntman_market_data_simple').select('*', { count: 'exact', head: true }).gte('timestamp', since.toISOString()),
      supabase.from('stuntman_signals_simple').select('*', { count: 'exact', head: true }).gte('timestamp', since.toISOString()),
      supabase.from('stuntman_trades_simple').select('*').gte('timestamp', since.toISOString()),
    ])

    const tradeData = trades.data || []
    const wins = tradeData.filter(t => (t.pnl || 0) > 0).length
    const totalPnL = tradeData.reduce((sum, t) => sum + (t.pnl || 0), 0)

    return NextResponse.json({
      success: true,
      summary: {
        days,
        candlesLogged: candles.count || 0,
        signalsGenerated: signals.count || 0,
        tradesExecuted: tradeData.length,
        wins,
        losses: tradeData.length - wins,
        winRate: tradeData.length > 0 ? ((wins / tradeData.length) * 100).toFixed(1) + '%' : 'N/A',
        totalPnL: '$' + totalPnL.toFixed(2),
      }
    })
  } catch (error) {
    console.error('Data logger error:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}
