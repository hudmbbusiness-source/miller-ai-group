// @ts-nocheck
// =============================================================================
// STUNTMAN AI - AUTOMATED TRADING BOT
// =============================================================================
// Runs proven strategies automatically and executes trades
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INSTRUMENTS } from '@/lib/stuntman/constants'

// =============================================================================
// PROVEN TRADING STRATEGIES
// =============================================================================

// RSI (Relative Strength Index) - Overbought/Oversold
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// MACD (Moving Average Convergence Divergence)
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0
  const k = 2 / (period + 1)
  let ema = prices[0]
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 }

  const ema12 = calculateEMA(prices.slice(-12), 12)
  const ema26 = calculateEMA(prices.slice(-26), 26)
  const macd = ema12 - ema26

  // Signal line is 9-period EMA of MACD
  const signal = macd * 0.2 // Simplified
  const histogram = macd - signal

  return { macd, signal, histogram }
}

// Bollinger Bands
function calculateBollingerBands(prices: number[], period = 20): {
  upper: number
  middle: number
  lower: number
  percentB: number
} {
  if (prices.length < period) {
    const last = prices[prices.length - 1] || 0
    return { upper: last, middle: last, lower: last, percentB: 0.5 }
  }

  const slice = prices.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period
  const stdDev = Math.sqrt(variance)

  const upper = middle + 2 * stdDev
  const lower = middle - 2 * stdDev
  const currentPrice = prices[prices.length - 1]
  const percentB = (currentPrice - lower) / (upper - lower)

  return { upper, middle, lower, percentB }
}

// Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

// =============================================================================
// STRATEGY SIGNALS
// =============================================================================

interface StrategySignal {
  strategy: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reason: string
}

function analyzeWithRSI(prices: number[]): StrategySignal {
  const rsi = calculateRSI(prices)

  if (rsi <= 30) {
    return {
      strategy: 'RSI',
      action: 'BUY',
      confidence: Math.min((30 - rsi) / 30, 1),
      reason: `RSI at ${rsi.toFixed(1)} - Oversold`,
    }
  } else if (rsi >= 70) {
    return {
      strategy: 'RSI',
      action: 'SELL',
      confidence: Math.min((rsi - 70) / 30, 1),
      reason: `RSI at ${rsi.toFixed(1)} - Overbought`,
    }
  }

  return {
    strategy: 'RSI',
    action: 'HOLD',
    confidence: 0,
    reason: `RSI at ${rsi.toFixed(1)} - Neutral`,
  }
}

function analyzeWithMACD(prices: number[]): StrategySignal {
  const { macd, signal, histogram } = calculateMACD(prices)

  if (histogram > 0 && macd > 0) {
    return {
      strategy: 'MACD',
      action: 'BUY',
      confidence: Math.min(Math.abs(histogram) * 100, 1),
      reason: 'MACD bullish crossover',
    }
  } else if (histogram < 0 && macd < 0) {
    return {
      strategy: 'MACD',
      action: 'SELL',
      confidence: Math.min(Math.abs(histogram) * 100, 1),
      reason: 'MACD bearish crossover',
    }
  }

  return {
    strategy: 'MACD',
    action: 'HOLD',
    confidence: 0,
    reason: 'MACD neutral',
  }
}

function analyzeWithBollingerBands(prices: number[]): StrategySignal {
  const bb = calculateBollingerBands(prices)

  if (bb.percentB <= 0) {
    return {
      strategy: 'Bollinger Bands',
      action: 'BUY',
      confidence: Math.min(Math.abs(bb.percentB), 1),
      reason: 'Price below lower band - potential bounce',
    }
  } else if (bb.percentB >= 1) {
    return {
      strategy: 'Bollinger Bands',
      action: 'SELL',
      confidence: Math.min(bb.percentB - 1, 1),
      reason: 'Price above upper band - potential reversal',
    }
  }

  return {
    strategy: 'Bollinger Bands',
    action: 'HOLD',
    confidence: 0,
    reason: 'Price within bands',
  }
}

function analyzeWithMovingAverages(prices: number[]): StrategySignal {
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, 50)
  const currentPrice = prices[prices.length - 1]

  if (sma20 > sma50 && currentPrice > sma20) {
    return {
      strategy: 'Moving Averages',
      action: 'BUY',
      confidence: 0.7,
      reason: 'Golden cross - SMA20 above SMA50, price above SMA20',
    }
  } else if (sma20 < sma50 && currentPrice < sma20) {
    return {
      strategy: 'Moving Averages',
      action: 'SELL',
      confidence: 0.7,
      reason: 'Death cross - SMA20 below SMA50, price below SMA20',
    }
  }

  return {
    strategy: 'Moving Averages',
    action: 'HOLD',
    confidence: 0,
    reason: 'No clear trend',
  }
}

// =============================================================================
// COMBINED STRATEGY DECISION
// =============================================================================

interface TradeDecision {
  instrument: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  strategies: StrategySignal[]
  reason: string
}

function makeTradeDecision(instrument: string, prices: number[]): TradeDecision {
  const strategies = [
    analyzeWithRSI(prices),
    analyzeWithMACD(prices),
    analyzeWithBollingerBands(prices),
    analyzeWithMovingAverages(prices),
  ]

  // Count votes
  let buyVotes = 0
  let sellVotes = 0
  let totalConfidence = 0

  strategies.forEach((s) => {
    if (s.action === 'BUY') {
      buyVotes++
      totalConfidence += s.confidence
    } else if (s.action === 'SELL') {
      sellVotes++
      totalConfidence += s.confidence
    }
  })

  // Need at least 2 strategies to agree with decent confidence
  const minVotes = 2
  const minConfidence = 0.5

  if (buyVotes >= minVotes && totalConfidence / buyVotes >= minConfidence) {
    return {
      instrument,
      action: 'BUY',
      confidence: totalConfidence / buyVotes,
      strategies,
      reason: `${buyVotes} strategies signal BUY`,
    }
  } else if (sellVotes >= minVotes && totalConfidence / sellVotes >= minConfidence) {
    return {
      instrument,
      action: 'SELL',
      confidence: totalConfidence / sellVotes,
      strategies,
      reason: `${sellVotes} strategies signal SELL`,
    }
  }

  return {
    instrument,
    action: 'HOLD',
    confidence: 0,
    strategies,
    reason: 'No consensus among strategies',
  }
}

// =============================================================================
// FETCH MARKET DATA
// =============================================================================

async function fetchPriceHistory(instrument: string): Promise<number[]> {
  try {
    const response = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${instrument}&timeframe=15m&count=100`
    )
    const data = await response.json()

    if (data.code === 0 && data.result?.data) {
      return data.result.data.map((c: { c: string }) => parseFloat(c.c))
    }
  } catch (error) {
    console.error(`Failed to fetch prices for ${instrument}:`, error)
  }
  return []
}

async function getCurrentPrice(instrument: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${instrument}`
    )
    const data = await response.json()

    if (data.code === 0 && data.result?.data?.[0]) {
      return parseFloat(data.result.data[0].a)
    }
  } catch (error) {
    console.error(`Failed to fetch current price for ${instrument}:`, error)
  }
  return 0
}

// =============================================================================
// EXECUTE TRADE (Paper Trading)
// =============================================================================

async function executeTrade(
  supabase: any,
  accountId: string,
  decision: TradeDecision,
  currentPrice: number,
  balance: number
): Promise<{ success: boolean; message: string; orderId?: string }> {
  // Position sizing: Use 10% of balance per trade max
  const maxPositionSize = balance * 0.1
  const quantity = maxPositionSize / currentPrice

  if (quantity <= 0 || maxPositionSize < 10) {
    return { success: false, message: 'Insufficient balance for trade' }
  }

  // Calculate fees (0.1% taker fee)
  const orderValue = quantity * currentPrice
  const fee = orderValue * 0.001

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('stuntman_orders')
    .insert({
      account_id: accountId,
      instrument_name: decision.instrument,
      side: decision.action.toLowerCase(),
      type: 'market',
      quantity,
      price: currentPrice,
      filled_quantity: quantity,
      filled_price: currentPrice,
      fee,
      status: 'filled',
      source: 'bot',
    })
    .select()
    .single()

  if (orderError) {
    return { success: false, message: orderError.message }
  }

  // Update account balance
  const newBalance = decision.action === 'BUY'
    ? balance - orderValue - fee
    : balance + orderValue - fee

  await supabase
    .from('stuntman_accounts')
    .update({ balance: newBalance })
    .eq('id', accountId)

  // Create position (for BUY) or close position (for SELL)
  if (decision.action === 'BUY') {
    await supabase.from('stuntman_positions').insert({
      account_id: accountId,
      instrument_name: decision.instrument,
      side: 'long',
      quantity,
      entry_price: currentPrice,
      current_price: currentPrice,
      unrealized_pnl: 0,
      status: 'open',
    })
  }

  // Log the trade
  await supabase.from('stuntman_trades').insert({
    account_id: accountId,
    order_id: order.id,
    instrument_name: decision.instrument,
    side: decision.action.toLowerCase(),
    price: currentPrice,
    quantity,
    fee,
    pnl: 0,
    source: 'bot',
  })

  // Save signal
  await supabase.from('stuntman_signals').insert({
    account_id: accountId,
    instrument_name: decision.instrument,
    strategy_id: null,
    side: decision.action.toLowerCase(),
    strength: decision.confidence,
    confidence: decision.confidence,
    source: decision.strategies.map(s => s.strategy).join(', '),
    indicators: decision.strategies,
    status: 'executed',
  })

  return {
    success: true,
    message: `${decision.action} ${quantity.toFixed(6)} ${decision.instrument} @ $${currentPrice.toFixed(2)}`,
    orderId: order.id,
  }
}

// =============================================================================
// BOT MAIN LOOP
// =============================================================================

async function runBot(supabase: any, accountId: string) {
  const results: any[] = []

  // Get account
  const { data: account } = await supabase
    .from('stuntman_accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (!account || !account.is_paper) {
    return { error: 'Invalid or non-paper account' }
  }

  // Check enabled strategies
  const { data: strategies } = await supabase
    .from('stuntman_strategies')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)

  // Get instruments to trade (from strategies or default)
  const instruments = strategies?.length > 0
    ? [...new Set(strategies.flatMap((s: any) => s.instruments || INSTRUMENTS.primary))]
    : INSTRUMENTS.primary

  // Analyze each instrument
  for (const instrument of instruments) {
    try {
      const prices = await fetchPriceHistory(instrument)
      if (prices.length < 50) continue

      const currentPrice = await getCurrentPrice(instrument)
      if (currentPrice <= 0) continue

      const decision = makeTradeDecision(instrument, prices)

      results.push({
        instrument,
        decision: decision.action,
        confidence: decision.confidence,
        reason: decision.reason,
        strategies: decision.strategies,
        currentPrice,
      })

      // Execute trade if actionable and confidence is high enough
      if (decision.action !== 'HOLD' && decision.confidence >= 0.6) {
        const tradeResult = await executeTrade(
          supabase,
          accountId,
          decision,
          currentPrice,
          account.balance
        )
        results[results.length - 1].trade = tradeResult
      }
    } catch (error) {
      console.error(`Bot error for ${instrument}:`, error)
    }
  }

  return { results, timestamp: Date.now() }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const accountId = searchParams.get('accountId')

    switch (action) {
      case 'status': {
        // Get bot status for all accounts
        const { data: accounts } = await supabase
          .from('stuntman_accounts')
          .select('id, name, is_paper, balance')
          .eq('user_id', user.id)

        // Get recent signals
        const { data: signals } = await supabase
          .from('stuntman_signals')
          .select('*')
          .eq('source', 'bot')
          .order('created_at', { ascending: false })
          .limit(20)

        return NextResponse.json({
          success: true,
          accounts,
          recentSignals: signals || [],
        })
      }

      case 'analyze': {
        // Analyze market without trading
        const instrument = searchParams.get('instrument') || 'BTC_USDT'
        const prices = await fetchPriceHistory(instrument)
        const currentPrice = await getCurrentPrice(instrument)
        const decision = makeTradeDecision(instrument, prices)

        return NextResponse.json({
          success: true,
          instrument,
          currentPrice,
          decision,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bot GET error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bot error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, accountId } = body

    switch (action) {
      case 'run': {
        // Run bot for specific account
        if (!accountId) {
          return NextResponse.json({ error: 'accountId required' }, { status: 400 })
        }

        // Verify account belongs to user
        const { data: account } = await supabase
          .from('stuntman_accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single()

        if (!account) {
          return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        const result = await runBot(supabase, accountId)

        return NextResponse.json({
          success: true,
          ...result,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bot POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bot error',
    }, { status: 500 })
  }
}
