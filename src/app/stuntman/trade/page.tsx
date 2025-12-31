// =============================================================================
// STUNTMAN AI - TRADING INTERFACE
// =============================================================================
// Full trading interface with real-time data, order placement, and signals
// =============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { INSTRUMENTS, TIMEFRAMES, FEES } from '@/lib/stuntman/constants'

// =============================================================================
// TYPES
// =============================================================================

interface Ticker {
  instrumentName: string
  lastPrice: number
  bidPrice: number
  askPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  priceChange24h: number
  priceChangePercent24h: number
}

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  percentage: number
}

interface OrderBook {
  instrumentName: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  spreadPercent: number
  midPrice: number
}

interface Trade {
  id: string
  price: number
  quantity: number
  side: 'BUY' | 'SELL'
  timestamp: number
}

interface Account {
  id: string
  name: string
  is_paper: boolean
  balance: number
  total_equity?: number
}

interface Signal {
  id: string
  side: string
  strength: number
  confidence: number
  source: string
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TradingPage() {
  const searchParams = useSearchParams()
  const [selectedInstrument, setSelectedInstrument] = useState(
    searchParams.get('instrument') || 'BTC_USDT'
  )
  const [selectedTimeframe, setSelectedTimeframe] = useState<keyof typeof TIMEFRAMES>('15m')
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

  // Order form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [orderQuantity, setOrderQuantity] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)

  // Fetch ticker data
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`/api/stuntman/market?action=ticker&instrument=${selectedInstrument}`)
      const data = await res.json()
      if (data.success) {
        setTicker(data.ticker)
        setLastUpdate(Date.now())
      }
    } catch (err) {
      console.error('Failed to fetch ticker:', err)
    }
  }, [selectedInstrument])

  // Fetch order book
  const fetchOrderBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/stuntman/market?action=orderbook&instrument=${selectedInstrument}`)
      const data = await res.json()
      if (data.success) {
        setOrderBook(data.orderBook)
      }
    } catch (err) {
      console.error('Failed to fetch order book:', err)
    }
  }, [selectedInstrument])

  // Fetch recent trades
  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/stuntman/market?action=trades&instrument=${selectedInstrument}&limit=50`
      )
      const data = await res.json()
      if (data.success) {
        setTrades(data.trades)
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  }, [selectedInstrument])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts?type=paper')
        const data = await res.json()
        if (data.success && data.accounts.length > 0) {
          setAccounts(data.accounts)
          if (!selectedAccount) {
            setSelectedAccount(data.accounts[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
      }
    }
    fetchAccounts()
  }, [])

  // Fetch market data on interval
  useEffect(() => {
    fetchTicker()
    fetchOrderBook()
    fetchTrades()

    const tickerInterval = setInterval(fetchTicker, 1000) // Every 1s
    const bookInterval = setInterval(fetchOrderBook, 2000) // Every 2s
    const tradesInterval = setInterval(fetchTrades, 5000) // Every 5s

    return () => {
      clearInterval(tickerInterval)
      clearInterval(bookInterval)
      clearInterval(tradesInterval)
    }
  }, [fetchTicker, fetchOrderBook, fetchTrades])

  // Generate signal on timeframe or instrument change
  useEffect(() => {
    if (!selectedAccount) return

    const generateSignal = async () => {
      try {
        const res = await fetch('/api/stuntman/signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            account_id: selectedAccount,
            instrument: selectedInstrument,
            timeframe: selectedTimeframe,
          }),
        })
        const data = await res.json()
        if (data.success && data.signal) {
          setSignal(data.signal)
        } else {
          setSignal(null)
        }
      } catch (err) {
        console.error('Failed to generate signal:', err)
      }
    }

    generateSignal()
    const interval = setInterval(generateSignal, 60000) // Every minute
    return () => clearInterval(interval)
  }, [selectedInstrument, selectedTimeframe, selectedAccount])

  // Place order
  const handlePlaceOrder = async () => {
    if (!selectedAccount || !ticker) return

    const quantity = parseFloat(orderQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    setOrderLoading(true)
    try {
      const res = await fetch('/api/stuntman/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          instrument_name: selectedInstrument,
          side: orderSide,
          type: orderType,
          quantity,
          price: orderType === 'limit' ? parseFloat(orderPrice) : undefined,
          current_price: ticker.lastPrice,
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setOrderQuantity('')
        setOrderPrice('')
        // Refresh accounts
        const accRes = await fetch('/api/stuntman/accounts?type=paper')
        const accData = await accRes.json()
        if (accData.success) {
          setAccounts(accData.accounts)
        }
      } else {
        alert(data.error || 'Failed to place order')
      }
    } catch (err) {
      console.error('Failed to place order:', err)
      alert('Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  const currentAccount = accounts.find((a) => a.id === selectedAccount)
  const orderValue = ticker && orderQuantity
    ? parseFloat(orderQuantity) * ticker.lastPrice
    : 0
  const estimatedFees = orderValue * (orderType === 'market' ? FEES.taker : FEES.maker)

  return (
    <div className="h-[calc(100vh-57px)] overflow-hidden">
      <div className="h-full grid grid-cols-12 gap-1 p-1">
        {/* Left Panel - Instruments & Signals */}
        <div className="col-span-2 flex flex-col gap-1 overflow-hidden">
          {/* Instrument Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex-shrink-0">
            <div className="text-xs text-zinc-500 uppercase mb-2">Instruments</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {INSTRUMENTS.all.map((inst) => (
                <button
                  key={inst}
                  onClick={() => setSelectedInstrument(inst)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedInstrument === inst
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {inst.replace('_', '/')}
                </button>
              ))}
            </div>
          </div>

          {/* Account Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex-shrink-0">
            <div className="text-xs text-zinc-500 uppercase mb-2">Account</div>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - ${acc.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Signal Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex-1 overflow-hidden">
            <div className="text-xs text-zinc-500 uppercase mb-2">AI Signal</div>
            {signal ? (
              <div
                className={`p-3 rounded-lg ${
                  signal.side === 'buy'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-lg font-bold ${
                      signal.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {signal.side.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {(signal.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mb-2">{signal.source}</div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      signal.side === 'buy' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${signal.strength * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-8 text-sm">
                No signal
              </div>
            )}
          </div>
        </div>

        {/* Main Panel - Chart & Order Book */}
        <div className="col-span-7 flex flex-col gap-1">
          {/* Ticker Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xl font-bold">
                  {selectedInstrument.replace('_', '/')}
                </div>
                <div className="text-xs text-zinc-500">Crypto.com</div>
              </div>
              {ticker && (
                <>
                  <div className="text-2xl font-mono font-bold">
                    ${ticker.lastPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: ticker.lastPrice < 1 ? 6 : 2,
                    })}
                  </div>
                  <div
                    className={`text-lg ${
                      ticker.priceChangePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {ticker.priceChangePercent24h >= 0 ? '+' : ''}
                    {ticker.priceChangePercent24h.toFixed(2)}%
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              {ticker && (
                <>
                  <div>
                    <span className="text-zinc-500">24h High:</span>{' '}
                    <span className="font-mono">${ticker.highPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">24h Low:</span>{' '}
                    <span className="font-mono">${ticker.lowPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Volume:</span>{' '}
                    <span className="font-mono">
                      ${(ticker.quoteVolume / 1000000).toFixed(2)}M
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex gap-1">
            {Object.entries(TIMEFRAMES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setSelectedTimeframe(key as keyof typeof TIMEFRAMES)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTimeframe === key
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Chart Placeholder */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-zinc-500">
              <div className="text-4xl mb-2">📊</div>
              <div>TradingView Chart Integration</div>
              <div className="text-xs mt-1">Coming Soon</div>
            </div>
          </div>

          {/* Order Book & Trades */}
          <div className="grid grid-cols-2 gap-1 h-64">
            {/* Order Book */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-zinc-500 uppercase">Order Book</div>
                {orderBook && (
                  <div className="text-xs text-zinc-400">
                    Spread: {orderBook.spreadPercent.toFixed(3)}%
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 h-[calc(100%-24px)] overflow-hidden">
                {/* Bids */}
                <div className="overflow-y-auto">
                  <div className="text-xs text-zinc-500 mb-1">Bids</div>
                  {orderBook?.bids.slice(0, 10).map((bid, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5 relative">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-green-500/10"
                        style={{ width: `${bid.percentage}%` }}
                      />
                      <span className="relative font-mono text-green-400">
                        {bid.price.toFixed(2)}
                      </span>
                      <span className="relative font-mono text-zinc-400">
                        {bid.quantity.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Asks */}
                <div className="overflow-y-auto">
                  <div className="text-xs text-zinc-500 mb-1">Asks</div>
                  {orderBook?.asks.slice(0, 10).map((ask, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5 relative">
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                        style={{ width: `${ask.percentage}%` }}
                      />
                      <span className="relative font-mono text-red-400">
                        {ask.price.toFixed(2)}
                      </span>
                      <span className="relative font-mono text-zinc-400">
                        {ask.quantity.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-hidden">
              <div className="text-xs text-zinc-500 uppercase mb-2">Recent Trades</div>
              <div className="overflow-y-auto h-[calc(100%-24px)]">
                {trades.slice(0, 15).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex justify-between text-xs py-0.5 font-mono"
                  >
                    <span
                      className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}
                    >
                      {trade.price.toFixed(2)}
                    </span>
                    <span className="text-zinc-400">{trade.quantity.toFixed(4)}</span>
                    <span className="text-zinc-500">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Order Form */}
        <div className="col-span-3 flex flex-col gap-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm font-medium mb-4">Place Order</div>

            {/* Side Selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setOrderSide('buy')}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  orderSide === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  orderSide === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setOrderType('market')}
                className={`py-1.5 rounded text-sm transition-colors ${
                  orderType === 'market'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-transparent'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`py-1.5 rounded text-sm transition-colors ${
                  orderType === 'limit'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-transparent'
                }`}
              >
                Limit
              </button>
            </div>

            {/* Price (for limit orders) */}
            {orderType === 'limit' && (
              <div className="mb-3">
                <label className="text-xs text-zinc-500 mb-1 block">Price (USDT)</label>
                <input
                  type="number"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  placeholder={ticker?.lastPrice.toString() || '0'}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none font-mono"
                />
              </div>
            )}

            {/* Quantity */}
            <div className="mb-3">
              <label className="text-xs text-zinc-500 mb-1 block">
                Quantity ({selectedInstrument.split('_')[0]})
              </label>
              <input
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-1 mb-4">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    if (currentAccount && ticker) {
                      const maxQty = currentAccount.balance / ticker.lastPrice
                      setOrderQuantity((maxQty * pct).toFixed(6))
                    }
                  }}
                  className="py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                >
                  {pct * 100}%
                </button>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Order Value</span>
                <span className="font-mono">${orderValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">
                  Est. Fee ({orderType === 'market' ? '0.10%' : '0.04%'})
                </span>
                <span className="font-mono text-zinc-400">${estimatedFees.toFixed(4)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-zinc-700">
                <span>Total</span>
                <span className="font-mono">
                  ${(orderValue + (orderSide === 'buy' ? estimatedFees : -estimatedFees)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderLoading || !orderQuantity || !currentAccount}
              className={`w-full py-3 rounded-lg font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                orderSide === 'buy'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {orderLoading
                ? 'Placing Order...'
                : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedInstrument.split('_')[0]}`}
            </button>

            {/* Balance Display */}
            {currentAccount && (
              <div className="mt-4 text-center text-sm text-zinc-500">
                Available: ${currentAccount.balance.toFixed(2)} USDT
              </div>
            )}
          </div>

          {/* Position Info (if any) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex-1">
            <div className="text-sm font-medium mb-3">Current Position</div>
            <div className="text-center text-zinc-500 py-8 text-sm">
              No open position for {selectedInstrument.replace('_', '/')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
