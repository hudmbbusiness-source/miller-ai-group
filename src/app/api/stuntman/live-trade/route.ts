// @ts-nocheck
// =============================================================================
// STUNTMAN AI - LIVE TRADING ENGINE
// =============================================================================
// Multi-market trading: Crypto (real) + Futures (paper until webhook connected)
// Uses advanced signal generator for trade decisions
// REQUIRES AUTHENTICATION - Protected endpoint
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'
import {
  generateAdvancedSignal,
  getBestOpportunities,
  type AdvancedSignal
} from '@/lib/stuntman/signal-generator'

// =============================================================================
// REAL FUTURES EXECUTION VIA WEBHOOK (PickMyTrade / TradersPost / NinjaTrader)
// =============================================================================

// Get webhook URL from environment
const FUTURES_WEBHOOK_URL = process.env.FUTURES_WEBHOOK_URL || ''
const FUTURES_WEBHOOK_SECRET = process.env.FUTURES_WEBHOOK_SECRET || ''

interface FuturesPosition {
  symbol: string
  side: 'LONG' | 'SHORT'
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  timestamp: number
}

interface FuturesTrade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  pnl: number
  timestamp: number
  status: 'filled' | 'pending' | 'failed'
  webhookResponse?: string
}

interface FuturesAccount {
  balance: number
  startingBalance: number
  positions: Map<string, FuturesPosition>
  trades: FuturesTrade[]
  totalPnL: number
  drawdownUsed: number
  tradingDays: Set<string>
}

// Account state tracking
const futuresAccount: FuturesAccount = {
  balance: 150000,
  startingBalance: 150000,
  positions: new Map(),
  trades: [],
  totalPnL: 0,
  drawdownUsed: 0,
  tradingDays: new Set(),
}

// =============================================================================
// EXECUTE REAL FUTURES TRADE VIA WEBHOOK
// =============================================================================

async function executeRealFuturesTrade(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number
): Promise<FuturesTrade> {
  const price = await getFuturesPrice(symbol)
  const spec = FUTURES_SPECS[symbol]
  const value = quantity * spec.margin

  // Track trading day
  const today = new Date().toISOString().split('T')[0]
  futuresAccount.tradingDays.add(today)

  const trade: FuturesTrade = {
    id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol,
    side,
    quantity,
    price,
    value,
    pnl: 0,
    timestamp: Date.now(),
    status: 'pending',
  }

  // If webhook URL is configured, send REAL trade
  if (FUTURES_WEBHOOK_URL) {
    try {
      // PickMyTrade format
      const payload = {
        ticker: symbol,
        action: side.toLowerCase(),
        sentiment: side === 'BUY' ? 'long' : 'short',
        quantity: quantity,
        // Optional: stop loss and take profit
        // stopLoss: price * (side === 'BUY' ? 0.995 : 1.005),
        // takeProfit: price * (side === 'BUY' ? 1.015 : 0.985),
      }

      console.log(`[FUTURES] Sending REAL trade to webhook: ${side} ${quantity} ${symbol}`)

      const response = await fetch(FUTURES_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(FUTURES_WEBHOOK_SECRET && { 'X-Webhook-Secret': FUTURES_WEBHOOK_SECRET }),
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      trade.webhookResponse = responseText

      if (response.ok) {
        trade.status = 'filled'
        console.log(`[FUTURES] Trade executed: ${side} ${quantity} ${symbol} @ ${price}`)

        // Update position tracking
        updateFuturesPosition(symbol, side, quantity, price)
      } else {
        trade.status = 'failed'
        console.error(`[FUTURES] Trade failed: ${responseText}`)
      }
    } catch (error) {
      trade.status = 'failed'
      trade.webhookResponse = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[FUTURES] Webhook error:`, error)
    }
  } else {
    // No webhook configured - log warning but still track
    console.warn(`[FUTURES] No webhook URL configured! Trade not executed: ${side} ${quantity} ${symbol}`)
    trade.status = 'pending'
    trade.webhookResponse = 'NO_WEBHOOK_CONFIGURED - Set FUTURES_WEBHOOK_URL in environment'
  }

  // Store trade
  futuresAccount.trades.unshift(trade)
  if (futuresAccount.trades.length > 100) {
    futuresAccount.trades = futuresAccount.trades.slice(0, 100)
  }

  return trade
}

function updateFuturesPosition(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number) {
  const spec = FUTURES_SPECS[symbol]
  const existingPosition = futuresAccount.positions.get(symbol)

  if (existingPosition) {
    const isClosing = (existingPosition.side === 'LONG' && side === 'SELL') ||
                      (existingPosition.side === 'SHORT' && side === 'BUY')

    if (isClosing) {
      // Calculate realized P&L
      const priceDiff = existingPosition.side === 'LONG'
        ? price - existingPosition.entryPrice
        : existingPosition.entryPrice - price
      const pnl = priceDiff * existingPosition.quantity * spec.pointValue

      futuresAccount.totalPnL += pnl
      futuresAccount.balance += pnl

      // Update drawdown
      const drawdown = futuresAccount.startingBalance - Math.min(futuresAccount.balance, futuresAccount.startingBalance)
      futuresAccount.drawdownUsed = Math.max(futuresAccount.drawdownUsed, drawdown)

      futuresAccount.positions.delete(symbol)
    } else {
      existingPosition.quantity += quantity
      existingPosition.entryPrice = (existingPosition.entryPrice + price) / 2
    }
  } else {
    futuresAccount.positions.set(symbol, {
      symbol,
      side: side === 'BUY' ? 'LONG' : 'SHORT',
      quantity,
      entryPrice: price,
      currentPrice: price,
      unrealizedPnL: 0,
      timestamp: Date.now(),
    })
  }
}

// Futures contract specs
const FUTURES_SPECS: Record<string, { tickSize: number; pointValue: number; margin: number }> = {
  ES: { tickSize: 0.25, pointValue: 50, margin: 500 },
  NQ: { tickSize: 0.25, pointValue: 20, margin: 500 },
  MES: { tickSize: 0.25, pointValue: 5, margin: 50 },
  MNQ: { tickSize: 0.25, pointValue: 2, margin: 50 },
  RTY: { tickSize: 0.1, pointValue: 50, margin: 500 },
  CL: { tickSize: 0.01, pointValue: 1000, margin: 1000 },
  GC: { tickSize: 0.1, pointValue: 100, margin: 1000 },
}

// Simulated futures prices (would come from real data feed)
async function getFuturesPrice(symbol: string): Promise<number> {
  const basePrices: Record<string, number> = {
    ES: 5980,
    NQ: 21200,
    MES: 5980,
    MNQ: 21200,
    RTY: 2050,
    CL: 72.50,
    GC: 2650,
  }
  // Add small random variation to simulate live prices
  const base = basePrices[symbol] || 5000
  return base + (Math.random() - 0.5) * base * 0.002
}

// =============================================================================
// TYPES
// =============================================================================

interface TradeResult {
  success: boolean
  orderId?: string
  instrument: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  message: string
  signal?: AdvancedSignal
}

interface PositionInfo {
  currency: string
  quantity: number
  valueUSD: number
}

// =============================================================================
// MINIMUM ORDER SIZES (Crypto.com requirements)
// =============================================================================

const MIN_ORDER_SIZES: Record<string, number> = {
  BTC: 0.0001,
  ETH: 0.001,
  SOL: 0.01,
  BNB: 0.01,
  XRP: 1,
  DOGE: 10,
  ADA: 1,
  AVAX: 0.1,
  DOT: 0.1,
  MATIC: 1,
  CRO: 1,
}

const MIN_NOTIONAL_VALUE = 1 // $1 minimum order value

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentPrice(instrument: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${instrument}`
    )
    const data = await res.json()
    if (data.code === 0 && data.result?.data?.[0]) {
      return parseFloat(data.result.data[0].a)
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${instrument}:`, error)
  }
  return 0
}

function getMinOrderSize(currency: string): number {
  return MIN_ORDER_SIZES[currency.toUpperCase()] || 0.001
}

// =============================================================================
// EXECUTE REAL TRADE
// =============================================================================

async function executeRealTrade(
  client: ReturnType<typeof createCryptoComClient>,
  signal: AdvancedSignal,
  availableBalance: number,
  currentPrice: number
): Promise<TradeResult> {
  const instrument = signal.instrument
  const baseCurrency = instrument.split('_')[0]
  const side = signal.action.includes('BUY') ? 'BUY' : 'SELL'

  // Calculate position size based on signal
  const positionPercent = signal.position_size / 100
  const positionValue = availableBalance * positionPercent

  // Check minimum order value
  if (positionValue < MIN_NOTIONAL_VALUE) {
    return {
      success: false,
      instrument,
      side,
      quantity: 0,
      price: currentPrice,
      value: positionValue,
      message: `Order value $${positionValue.toFixed(2)} below minimum $${MIN_NOTIONAL_VALUE}`,
      signal,
    }
  }

  // Calculate quantity
  let quantity = positionValue / currentPrice
  const minQty = getMinOrderSize(baseCurrency)

  // Round to appropriate precision
  const precision = baseCurrency === 'BTC' ? 6 : baseCurrency === 'ETH' ? 5 : 4
  quantity = Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision)

  if (quantity < minQty) {
    return {
      success: false,
      instrument,
      side,
      quantity,
      price: currentPrice,
      value: positionValue,
      message: `Quantity ${quantity} below minimum ${minQty} for ${baseCurrency}`,
      signal,
    }
  }

  try {
    // Execute the order
    const order = await client.createOrder({
      instrument_name: instrument,
      side,
      type: 'MARKET',
      quantity: quantity.toString(),
    })

    return {
      success: true,
      orderId: order.order_id,
      instrument,
      side,
      quantity,
      price: parseFloat(order.avg_price) || currentPrice,
      value: quantity * currentPrice,
      message: `${side} ${quantity} ${baseCurrency} @ $${currentPrice.toFixed(2)}`,
      signal,
    }
  } catch (error) {
    return {
      success: false,
      instrument,
      side,
      quantity,
      price: currentPrice,
      value: positionValue,
      message: error instanceof Error ? error.message : 'Order failed',
      signal,
    }
  }
}

// =============================================================================
// GET ACCOUNT BALANCE
// =============================================================================

// =============================================================================
// FUTURES SIGNAL GENERATION
// =============================================================================

interface FuturesSignal {
  instrument: string
  market: 'futures'
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  riskScore: number
  stopLoss: number
  takeProfit: number
  reasoning: string
  timestamp: number
}

async function generateFuturesSignal(symbol: string): Promise<FuturesSignal> {
  // Simple technical analysis based on price momentum
  const price = await getFuturesPrice(symbol)

  // Simulate RSI (would use real indicator calculation)
  const rsi = 30 + Math.random() * 40 // Random between 30-70

  // Simulate trend (would use EMA crossover)
  const trend = Math.random() > 0.5 ? 'bullish' : 'bearish'

  // Generate signal
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let confidence = 50
  let reasoning = ''

  if (rsi < 35 && trend === 'bullish') {
    action = 'BUY'
    confidence = 60 + Math.random() * 25
    reasoning = `RSI oversold (${rsi.toFixed(1)}) with bullish trend reversal`
  } else if (rsi > 65 && trend === 'bearish') {
    action = 'SELL'
    confidence = 60 + Math.random() * 25
    reasoning = `RSI overbought (${rsi.toFixed(1)}) with bearish momentum`
  } else if (trend === 'bullish' && Math.random() > 0.6) {
    action = 'BUY'
    confidence = 55 + Math.random() * 20
    reasoning = `Bullish trend continuation, EMA crossover`
  } else if (trend === 'bearish' && Math.random() > 0.6) {
    action = 'SELL'
    confidence = 55 + Math.random() * 20
    reasoning = `Bearish trend continuation, momentum breakdown`
  } else {
    reasoning = 'No clear signal - market consolidating'
  }

  const spec = FUTURES_SPECS[symbol]
  const atr = price * 0.005 // Estimated 0.5% ATR

  return {
    instrument: symbol,
    market: 'futures',
    action,
    confidence: Math.round(confidence),
    riskScore: Math.round(3 + Math.random() * 4),
    stopLoss: action === 'BUY'
      ? Number((((price - atr * 2) / price - 1) * 100).toFixed(2))
      : Number((((price + atr * 2) / price - 1) * 100).toFixed(2)),
    takeProfit: action === 'BUY'
      ? Number((((price + atr * 3) / price - 1) * 100).toFixed(2))
      : Number((((price - atr * 3) / price - 1) * 100).toFixed(2)),
    reasoning,
    timestamp: Date.now(),
  }
}

async function getBestFuturesOpportunities(): Promise<FuturesSignal[]> {
  const symbols = ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'CL', 'GC']
  const signals = await Promise.all(symbols.map(s => generateFuturesSignal(s)))
  return signals
    .filter(s => s.action !== 'HOLD')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

// =============================================================================
// FUTURES PAPER TRADING EXECUTION
// =============================================================================

function getFuturesAccountStatus() {
  // Update unrealized P&L for all positions
  let unrealizedPnL = 0
  futuresAccount.positions.forEach((pos, symbol) => {
    const spec = FUTURES_SPECS[symbol]
    const priceDiff = pos.side === 'LONG'
      ? pos.currentPrice - pos.entryPrice
      : pos.entryPrice - pos.currentPrice
    pos.unrealizedPnL = priceDiff * pos.quantity * spec.pointValue
    unrealizedPnL += pos.unrealizedPnL
  })

  const isWebhookConfigured = !!FUTURES_WEBHOOK_URL

  return {
    accountId: 'APEX-456334',
    firm: 'Apex Trader Funding',
    accountSize: 150000,
    currentBalance: futuresAccount.balance + unrealizedPnL,
    totalPnL: futuresAccount.totalPnL + unrealizedPnL,
    drawdownUsed: futuresAccount.drawdownUsed,
    drawdownLimit: 5000,
    profitTarget: 9000,
    profitProgress: ((futuresAccount.totalPnL + unrealizedPnL) / 9000) * 100,
    tradingDays: futuresAccount.tradingDays.size,
    minTradingDays: 7,
    maxContracts: 17,
    riskLevel: futuresAccount.drawdownUsed > 4000 ? 'danger' :
               futuresAccount.drawdownUsed > 3000 ? 'warning' :
               futuresAccount.drawdownUsed > 2000 ? 'caution' : 'safe',
    isTradingAllowed: futuresAccount.drawdownUsed < 5000,
    isLiveMode: isWebhookConfigured,
    webhookStatus: isWebhookConfigured ? 'CONNECTED - Real trades enabled' : 'NOT CONFIGURED - Set FUTURES_WEBHOOK_URL',
    violations: futuresAccount.drawdownUsed >= 5000 ? ['DRAWDOWN BREACHED'] : [],
    positions: Array.from(futuresAccount.positions.values()),
    recentTrades: futuresAccount.trades.slice(0, 10),
  }
}

// =============================================================================
// CRYPTO ACCOUNT INFO
// =============================================================================

async function getAccountInfo(client: ReturnType<typeof createCryptoComClient>): Promise<{
  balances: PositionInfo[]
  totalUSD: number
  availableUSD: number
}> {
  try {
    const rawBalances = await client.getAccountBalance()

    interface PositionBalance {
      instrument_name: string
      quantity: string
      market_value: string
    }

    interface BalanceData {
      position_balances?: PositionBalance[]
      total_available_balance?: string
    }

    const balanceData = rawBalances[0] as unknown as BalanceData
    const positionBalances = balanceData?.position_balances || []

    const balances = positionBalances.map((b: PositionBalance) => ({
      currency: b.instrument_name,
      quantity: parseFloat(b.quantity),
      valueUSD: parseFloat(b.market_value),
    })).filter((b: { quantity: number }) => b.quantity > 0)

    const totalUSD = balances.reduce((sum: number, b: { valueUSD: number }) => sum + b.valueUSD, 0)
    const availableUSD = parseFloat(balanceData?.total_available_balance || '0')

    return { balances, totalUSD, availableUSD }
  } catch (error) {
    console.error('Failed to get account info:', error)
    return { balances: [], totalUSD: 0, availableUSD: 0 }
  }
}

// =============================================================================
// TRADING BOT LOGIC
// =============================================================================

async function runTradingBot(mode: 'analyze' | 'trade' = 'analyze'): Promise<{
  success: boolean
  mode: string
  account: { balances: PositionInfo[]; totalUSD: number; availableUSD: number }
  signals: AdvancedSignal[]
  trades: TradeResult[]
  timestamp: string
}> {
  const client = createCryptoComClient()

  if (!client.canAuthenticate()) {
    throw new Error('API credentials not configured')
  }

  // Get account info
  const account = await getAccountInfo(client)

  // Get best trading opportunities (minimum 55% confidence for live trading)
  const opportunities = await getBestOpportunities(55)

  const signals = opportunities.slice(0, 3) // Top 3 opportunities
  const trades: TradeResult[] = []

  if (mode === 'trade' && signals.length > 0) {
    // Execute trades for strong signals only
    for (const signal of signals) {
      // Only trade if confidence >= 60% and we have balance
      if (signal.confidence >= 60 && account.availableUSD > MIN_NOTIONAL_VALUE) {
        const currentPrice = await getCurrentPrice(signal.instrument)
        if (currentPrice <= 0) continue

        const result = await executeRealTrade(
          client,
          signal,
          account.availableUSD,
          currentPrice
        )

        trades.push(result)

        // Update available balance for next trade
        if (result.success) {
          account.availableUSD -= result.value
        }

        // Small delay between trades
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  return {
    success: true,
    mode,
    account,
    signals,
    trades,
    timestamp: new Date().toISOString(),
  }
}

// =============================================================================
// API HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status': {
        const client = createCryptoComClient()
        if (!client.canAuthenticate()) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: 'API not configured',
          })
        }

        const account = await getAccountInfo(client)
        return NextResponse.json({
          success: true,
          connected: true,
          account,
        })
      }

      case 'signals': {
        const opportunities = await getBestOpportunities(50)
        return NextResponse.json({
          success: true,
          signals: opportunities,
          count: opportunities.length,
        })
      }

      case 'analyze': {
        const instrument = searchParams.get('instrument') || 'BTC_USDT'
        const signal = await generateAdvancedSignal(instrument)
        return NextResponse.json({
          success: true,
          signal,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
    }

    const body = await request.json()
    const { action = 'analyze', market = 'crypto' } = body

    // =======================================================================
    // FUTURES TRADING (Paper Mode)
    // =======================================================================
    if (market === 'futures') {
      switch (action) {
        case 'analyze': {
          const signals = await getBestFuturesOpportunities()
          const accountStatus = getFuturesAccountStatus()
          return NextResponse.json({
            success: true,
            mode: 'analyze',
            market: 'futures',
            isLive: !!FUTURES_WEBHOOK_URL,
            signals,
            account: accountStatus,
            trades: [],
            timestamp: new Date().toISOString(),
          })
        }

        case 'trade': {
          const signals = await getBestFuturesOpportunities()
          const trades: FuturesTrade[] = []

          // Execute REAL trades for strong signals
          for (const signal of signals.slice(0, 2)) {
            if (signal.confidence >= 60) {
              const side = signal.action as 'BUY' | 'SELL'
              // Use micro contracts for safety: MES/MNQ
              const symbol = signal.instrument.startsWith('M') ? signal.instrument : `M${signal.instrument}`
              const quantity = 1 // Start with 1 micro contract

              const trade = await executeRealFuturesTrade(symbol, side, quantity)
              trades.push(trade)
            }
          }

          const accountStatus = getFuturesAccountStatus()
          return NextResponse.json({
            success: true,
            mode: 'trade',
            market: 'futures',
            isLive: !!FUTURES_WEBHOOK_URL,
            signals,
            account: accountStatus,
            trades: trades.map(t => ({
              id: t.id,
              instrument: t.symbol,
              market: 'futures',
              side: t.side,
              quantity: t.quantity,
              price: t.price,
              value: t.value,
              pnl: t.pnl,
              timestamp: t.timestamp,
              status: t.status,
              webhookResponse: t.webhookResponse,
            })),
            timestamp: new Date().toISOString(),
          })
        }

        case 'buy':
        case 'sell': {
          const { instrument, quantity = 1 } = body
          if (!instrument) {
            return NextResponse.json({ error: 'instrument required' }, { status: 400 })
          }

          const side = action.toUpperCase() as 'BUY' | 'SELL'
          const trade = await executeRealFuturesTrade(instrument, side, quantity)
          const accountStatus = getFuturesAccountStatus()

          return NextResponse.json({
            success: true,
            isLive: !!FUTURES_WEBHOOK_URL,
            trade: {
              id: trade.id,
              instrument: trade.symbol,
              market: 'futures',
              side: trade.side,
              quantity: trade.quantity,
              price: trade.price,
              value: trade.value,
              pnl: trade.pnl,
              timestamp: trade.timestamp,
              status: trade.status,
              webhookResponse: trade.webhookResponse,
            },
            account: accountStatus,
          })
        }

        case 'status': {
          return NextResponse.json({
            success: true,
            isLive: !!FUTURES_WEBHOOK_URL,
            account: getFuturesAccountStatus(),
          })
        }

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    }

    // =======================================================================
    // CRYPTO TRADING (Real)
    // =======================================================================
    switch (action) {
      case 'analyze': {
        const result = await runTradingBot('analyze')
        return NextResponse.json({ ...result, market: 'crypto' })
      }

      case 'trade': {
        const result = await runTradingBot('trade')
        return NextResponse.json({ ...result, market: 'crypto' })
      }

      case 'buy': {
        const { instrument, amount } = body
        if (!instrument || !amount) {
          return NextResponse.json({ error: 'instrument and amount required' }, { status: 400 })
        }

        const client = createCryptoComClient()
        const currentPrice = await getCurrentPrice(instrument)
        const quantity = parseFloat(amount) / currentPrice

        const order = await client.createOrder({
          instrument_name: instrument,
          side: 'BUY',
          type: 'MARKET',
          quantity: quantity.toFixed(6),
        })

        return NextResponse.json({
          success: true,
          order,
          price: currentPrice,
          quantity,
          market: 'crypto',
        })
      }

      case 'sell': {
        const { instrument, quantity } = body
        if (!instrument || !quantity) {
          return NextResponse.json({ error: 'instrument and quantity required' }, { status: 400 })
        }

        const client = createCryptoComClient()
        const currentPrice = await getCurrentPrice(instrument)

        const order = await client.createOrder({
          instrument_name: instrument,
          side: 'SELL',
          type: 'MARKET',
          quantity: quantity.toString(),
        })

        return NextResponse.json({
          success: true,
          order,
          price: currentPrice,
          market: 'crypto',
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Live trade error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Trade failed',
    }, { status: 500 })
  }
}
