// =============================================================================
// STUNTMAN AI - TRADING INTERFACE
// =============================================================================
// Modern, mobile-first trading with real data
// =============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

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

interface Account {
  id: string
  name: string
  is_paper: boolean
  balance: number
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatCurrency(value: number | undefined | null): string {
  const num = value ?? 0
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPrice(value: number | undefined | null): string {
  const num = value ?? 0
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (num >= 1) return num.toFixed(4)
  return num.toFixed(6)
}

function formatPercent(value: number | undefined | null): string {
  const num = value ?? 0
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

// Crypto icons (using first letters as fallback)
const CRYPTO_COLORS: Record<string, string> = {
  BTC: 'from-orange-400 to-orange-600',
  ETH: 'from-purple-400 to-purple-600',
  SOL: 'from-fuchsia-400 to-purple-600',
  BNB: 'from-yellow-400 to-yellow-600',
  XRP: 'from-blue-400 to-blue-600',
  DOGE: 'from-amber-400 to-amber-600',
  ADA: 'from-blue-400 to-cyan-600',
  AVAX: 'from-red-400 to-red-600',
  DOT: 'from-pink-400 to-pink-600',
  MATIC: 'from-purple-400 to-indigo-600',
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TradingPage() {
  const searchParams = useSearchParams()
  const [selectedInstrument, setSelectedInstrument] = useState(
    searchParams.get('instrument') || 'BTC_USDT'
  )
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [allTickers, setAllTickers] = useState<Ticker[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Order form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderAmount, setOrderAmount] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)
  const [showCryptoList, setShowCryptoList] = useState(false)

  // Fetch ticker data
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(`/api/stuntman/market?action=ticker&instrument=${selectedInstrument}`)
      const data = await res.json()
      if (data.success && data.ticker) {
        setTicker(data.ticker)
      }
    } catch (err) {
      console.error('Failed to fetch ticker:', err)
    }
  }, [selectedInstrument])

  // Fetch all tickers for list
  const fetchAllTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/market?action=tickers')
      const data = await res.json()
      if (data.success && data.tickers) {
        setAllTickers(data.tickers)
      }
    } catch (err) {
      console.error('Failed to fetch tickers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts?type=paper')
        const data = await res.json()
        if (data.success && data.accounts?.length > 0) {
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

  // Poll for data
  useEffect(() => {
    fetchTicker()
    fetchAllTickers()

    const tickerInterval = setInterval(fetchTicker, 2000)
    const listInterval = setInterval(fetchAllTickers, 10000)

    return () => {
      clearInterval(tickerInterval)
      clearInterval(listInterval)
    }
  }, [fetchTicker, fetchAllTickers])

  // Place order
  const handlePlaceOrder = async () => {
    if (!selectedAccount || !ticker) return

    const amount = parseFloat(orderAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const quantity = amount / (ticker.lastPrice ?? 1)

    setOrderLoading(true)
    try {
      const res = await fetch('/api/stuntman/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          instrument_name: selectedInstrument,
          side: orderSide,
          type: 'market',
          quantity,
          current_price: ticker.lastPrice,
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`${orderSide === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(6)} ${selectedInstrument.split('_')[0]}`)
        setOrderAmount('')
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
  const cryptoSymbol = selectedInstrument.split('_')[0]
  const cryptoColor = CRYPTO_COLORS[cryptoSymbol] || 'from-zinc-400 to-zinc-600'
  const orderValue = orderAmount ? parseFloat(orderAmount) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Crypto Selector Modal */}
      <AnimatePresence>
        {showCryptoList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg"
          >
            <div className="max-w-lg mx-auto pt-4 px-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Select Crypto</h2>
                <button
                  onClick={() => setShowCryptoList(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {allTickers.filter(t => t && t.instrumentName).map((t) => {
                  const symbol = (t.instrumentName || '').split('_')[0]
                  const color = CRYPTO_COLORS[symbol] || 'from-zinc-400 to-zinc-600'
                  return (
                    <motion.button
                      key={t.instrumentName}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedInstrument(t.instrumentName)
                        setShowCryptoList(false)
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${
                        selectedInstrument === t.instrumentName ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                          <span className="font-bold text-white">{symbol.slice(0, 2)}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{symbol}</div>
                          <div className="text-sm text-zinc-500">{(t.instrumentName || '').replace('_', '/')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">${formatPrice(t.lastPrice)}</div>
                        <div className={`text-sm ${(t.priceChangePercent24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(t.priceChangePercent24h)}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Crypto Header - Tappable to change */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCryptoList(true)}
          className="w-full flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cryptoColor} flex items-center justify-center`}>
              <span className="font-bold text-xl text-white">{cryptoSymbol.slice(0, 2)}</span>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold">{cryptoSymbol}</div>
              <div className="text-zinc-500">{selectedInstrument.replace('_', '/')}</div>
            </div>
          </div>
          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>

        {/* Price Display */}
        <div className="text-center mb-8">
          <motion.div
            key={ticker?.lastPrice}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-5xl font-bold font-mono mb-2"
          >
            ${formatPrice(ticker?.lastPrice)}
          </motion.div>
          <div className={`text-lg font-medium ${(ticker?.priceChangePercent24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(ticker?.priceChangePercent24h)}
            <span className="text-zinc-500 text-sm ml-2">24h</span>
          </div>
        </div>

        {/* 24h Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900/50 rounded-2xl p-4">
            <div className="text-zinc-500 text-sm mb-1">24h High</div>
            <div className="font-mono font-semibold">${formatPrice(ticker?.highPrice)}</div>
          </div>
          <div className="bg-zinc-900/50 rounded-2xl p-4">
            <div className="text-zinc-500 text-sm mb-1">24h Low</div>
            <div className="font-mono font-semibold">${formatPrice(ticker?.lowPrice)}</div>
          </div>
        </div>

        {/* Account Balance */}
        {currentAccount && (
          <div className="bg-zinc-900/50 rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-500 text-sm mb-1">Available Balance</div>
                <div className="text-2xl font-bold">{formatCurrency(currentAccount.balance)}</div>
              </div>
              {currentAccount.is_paper && (
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-500 text-xs font-medium">Paper</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Amount Buttons */}
        <div className="mb-4">
          <div className="text-sm text-zinc-500 mb-3">Quick Amount</div>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 100, 250].map((amt) => (
              <button
                key={amt}
                onClick={() => setOrderAmount(amt.toString())}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  orderAmount === amt.toString()
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="mb-8">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-500">$</span>
            <input
              type="number"
              value={orderAmount}
              onChange={(e) => setOrderAmount(e.target.value)}
              placeholder="0.00"
              className="w-full py-4 pl-10 pr-4 rounded-2xl bg-zinc-900 border-2 border-zinc-800 focus:border-emerald-500 text-2xl font-mono text-center outline-none transition-colors"
            />
          </div>
          {orderValue > 0 && ticker && (
            <div className="text-center text-zinc-500 mt-2">
              ≈ {(orderValue / (ticker.lastPrice ?? 1)).toFixed(6)} {cryptoSymbol}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 p-4">
        <div className="max-w-lg mx-auto">
          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4 bg-zinc-900 p-1 rounded-xl">
            <button
              onClick={() => setOrderSide('buy')}
              className={`py-3 rounded-lg font-bold transition-colors ${
                orderSide === 'buy'
                  ? 'bg-emerald-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`py-3 rounded-lg font-bold transition-colors ${
                orderSide === 'sell'
                  ? 'bg-red-500 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handlePlaceOrder}
            disabled={orderLoading || !orderAmount || !currentAccount}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              orderSide === 'buy'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
          >
            {orderLoading
              ? 'Processing...'
              : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${cryptoSymbol}`}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
