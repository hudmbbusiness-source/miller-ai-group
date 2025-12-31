// =============================================================================
// STUNTMAN AI - MAIN DASHBOARD
// =============================================================================
// Modern, clean design inspired by Robinhood/Coinbase
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// =============================================================================
// TYPES
// =============================================================================

interface Ticker {
  instrumentName: string
  lastPrice: number
  priceChange24h: number
  priceChangePercent24h: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
}

interface Account {
  id: string
  name: string
  is_paper: boolean
  balance: number
  initial_balance: number
  realized_pnl: number
  unrealized_pnl?: number
  total_equity?: number
  win_count: number
  loss_count: number
  total_trades: number
}

interface Position {
  id: string
  instrument_name: string
  side: string
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
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
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (num >= 1) {
    return num.toFixed(4)
  }
  return num.toFixed(6)
}

function formatPercent(value: number | undefined | null): string {
  const num = value ?? 0
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StuntManDashboard() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC_USDT')

  // Fetch market data
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/stuntman/market?action=tickers')
        const data = await res.json()
        if (data.success && data.tickers) {
          setTickers(data.tickers.slice(0, 10))
        }
      } catch (err) {
        console.error('Failed to fetch tickers:', err)
      }
    }

    fetchTickers()
    const interval = setInterval(fetchTickers, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts')
        const data = await res.json()
        if (data.success && data.accounts) {
          setAccounts(data.accounts)
          if (data.accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(data.accounts[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Fetch positions
  useEffect(() => {
    if (!selectedAccount) return

    const fetchPositions = async () => {
      try {
        const res = await fetch(`/api/stuntman/positions?accountId=${selectedAccount}&status=open`)
        const data = await res.json()
        if (data.success && data.positions) {
          setPositions(data.positions)
        }
      } catch (err) {
        console.error('Failed to fetch positions:', err)
      }
    }

    fetchPositions()
    const interval = setInterval(fetchPositions, 10000)
    return () => clearInterval(interval)
  }, [selectedAccount])

  const currentAccount = accounts.find((a) => a.id === selectedAccount)
  const selectedTicker = tickers.find(t => t?.instrumentName === selectedCrypto) || tickers[0]
  const totalEquity = currentAccount?.total_equity ?? currentAccount?.balance ?? 0
  const totalPnL = (currentAccount?.realized_pnl ?? 0) + (currentAccount?.unrealized_pnl ?? 0)
  const pnlPercent = currentAccount?.initial_balance
    ? ((totalEquity - currentAccount.initial_balance) / currentAccount.initial_balance) * 100
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-6 text-zinc-400 text-lg">Loading StuntMan...</p>
        </motion.div>
      </div>
    )
  }

  // No accounts - onboarding
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">📈</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to StuntMan</h1>
          <p className="text-zinc-400 text-lg mb-8">
            Start paper trading with $1,000 in virtual funds. Learn to trade crypto risk-free.
          </p>
          <CreateAccountButton onCreated={(acc) => {
            setAccounts([acc])
            setSelectedAccount(acc.id)
          }} />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Portfolio Value - Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-6 pt-8 pb-6"
      >
        <div className="max-w-2xl mx-auto">
          {/* Account Switcher */}
          {accounts.length > 1 && (
            <div className="flex gap-2 mb-6">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedAccount === acc.id
                      ? 'bg-white text-black'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          )}

          {/* Total Value */}
          <div className="mb-2">
            <span className="text-zinc-500 text-sm">Total Portfolio Value</span>
          </div>
          <motion.div
            key={totalEquity}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-5xl font-bold tracking-tight mb-3"
          >
            {formatCurrency(totalEquity)}
          </motion.div>

          {/* P&L */}
          <div className={`flex items-center gap-2 text-lg ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}</span>
            <span className="text-zinc-600">•</span>
            <span>{formatPercent(pnlPercent)}</span>
            <span className="text-zinc-500 text-sm">All time</span>
          </div>

          {/* Paper Trading Badge */}
          {currentAccount?.is_paper && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-500 text-sm font-medium">Paper Trading</span>
            </div>
          )}
        </div>
      </motion.section>

      {/* Quick Stats */}
      <section className="px-6 py-4 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-zinc-500 text-sm mb-1">Win Rate</div>
            <div className="text-xl font-semibold">
              {(currentAccount?.total_trades ?? 0) > 0
                ? `${(((currentAccount?.win_count ?? 0) / (currentAccount?.total_trades ?? 1)) * 100).toFixed(0)}%`
                : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500 text-sm mb-1">Trades</div>
            <div className="text-xl font-semibold">{currentAccount?.total_trades ?? 0}</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-500 text-sm mb-1">Open</div>
            <div className="text-xl font-semibold">{positions.length}</div>
          </div>
        </div>
      </section>

      {/* Trade Button */}
      <section className="px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/stuntman/trade">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg transition-colors"
            >
              Start Trading
            </motion.button>
          </Link>
        </div>
      </section>

      {/* Watchlist */}
      <section className="px-6 py-6 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Watchlist</h2>
          <div className="space-y-1">
            {tickers.filter(t => t && t.instrumentName).map((ticker) => (
              <Link
                key={ticker.instrumentName}
                href={`/stuntman/trade?instrument=${ticker.instrumentName}`}
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="flex items-center justify-between py-4 px-4 -mx-4 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="font-bold text-sm">
                        {(ticker.instrumentName || '').split('_')[0]?.slice(0, 3)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold">{(ticker.instrumentName || '').replace('_', '/')}</div>
                      <div className="text-sm text-zinc-500">
                        {(ticker.instrumentName || '').split('_')[0]}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold font-mono">
                      ${formatPrice(ticker.lastPrice)}
                    </div>
                    <div className={`text-sm ${(ticker.priceChangePercent24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPercent(ticker.priceChangePercent24h)}
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      {positions.length > 0 && (
        <section className="px-6 py-6 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Open Positions</h2>
              <Link href="/stuntman/history" className="text-emerald-400 text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {positions.map((pos) => (
                <motion.div
                  key={pos.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {pos.instrument_name.split('_')[0]?.slice(0, 3)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{pos.instrument_name.replace('_', '/')}</div>
                        <div className={`text-sm ${pos.side === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pos.side.toUpperCase()} • {pos.quantity.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${(pos.unrealized_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}{formatCurrency(pos.unrealized_pnl)}
                      </div>
                      <div className="text-sm text-zinc-500">
                        Entry: ${formatPrice(pos.entry_price)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="px-6 py-8 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4">
          <Link href="/stuntman/strategies">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-zinc-900/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-medium text-sm">Strategies</div>
            </motion.div>
          </Link>
          <Link href="/stuntman/backtest">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-zinc-900/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-sm">Backtest</div>
            </motion.div>
          </Link>
          <Link href="/stuntman/history">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-zinc-900/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-zinc-900 transition-colors"
            >
              <div className="text-2xl mb-2">📜</div>
              <div className="font-medium text-sm">History</div>
            </motion.div>
          </Link>
        </div>
      </section>
    </div>
  )
}

// =============================================================================
// CREATE ACCOUNT BUTTON
// =============================================================================

function CreateAccountButton({ onCreated }: { onCreated: (account: Account) => void }) {
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/stuntman/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Paper Trading',
          is_paper: true,
          initial_balance: 1000,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onCreated(data.account)
      }
    } catch (err) {
      console.error('Failed to create account:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCreate}
      disabled={creating}
      className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg transition-colors disabled:opacity-50"
    >
      {creating ? 'Creating Account...' : 'Get Started with $1,000'}
    </motion.button>
  )
}
