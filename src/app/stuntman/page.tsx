// =============================================================================
// STUNTMAN AI - MAIN DASHBOARD
// =============================================================================
// Overview of trading performance, positions, and market data
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { INSTRUMENTS } from '@/lib/stuntman/constants'

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
  win_count: number
  loss_count: number
  total_trades: number
  is_active: boolean
  open_positions?: number
  unrealized_pnl?: number
  total_equity?: number
}

interface Position {
  id: string
  instrument_name: string
  side: string
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_percent?: number
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
  const [error, setError] = useState<string | null>(null)

  // Fetch market data
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/stuntman/market?action=tickers')
        const data = await res.json()
        if (data.success) {
          setTickers(data.tickers.slice(0, 8))
        }
      } catch (err) {
        console.error('Failed to fetch tickers:', err)
      }
    }

    fetchTickers()
    const interval = setInterval(fetchTickers, 5000) // Update every 5s
    return () => clearInterval(interval)
  }, [])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts')
        const data = await res.json()
        if (data.success) {
          setAccounts(data.accounts)
          if (data.accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(data.accounts[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
        setError('Failed to load accounts')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Fetch positions when account changes
  useEffect(() => {
    if (!selectedAccount) return

    const fetchPositions = async () => {
      try {
        const res = await fetch(`/api/stuntman/positions?accountId=${selectedAccount}&status=open`)
        const data = await res.json()
        if (data.success) {
          setPositions(data.positions)
        }
      } catch (err) {
        console.error('Failed to fetch positions:', err)
      }
    }

    fetchPositions()
    const interval = setInterval(fetchPositions, 10000) // Update every 10s
    return () => clearInterval(interval)
  }, [selectedAccount])

  const currentAccount = accounts.find((a) => a.id === selectedAccount)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-zinc-400">Loading StuntMan AI...</p>
        </div>
      </div>
    )
  }

  // No accounts - show create account prompt
  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-black text-3xl">SM</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to StuntMan AI</h1>
          <p className="text-zinc-400 mb-6">
            Create your first trading account to start paper trading with real market data.
          </p>
          <CreateAccountButton onCreated={(acc) => {
            setAccounts([acc])
            setSelectedAccount(acc.id)
          }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1920px] mx-auto p-4 space-y-6">
      {/* Account Selector & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Account Selector */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Accounts</h2>
              <CreateAccountButton compact onCreated={(acc) => {
                setAccounts([...accounts, acc])
                setSelectedAccount(acc.id)
              }} />
            </div>
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedAccount === account.id
                      ? 'bg-orange-500/20 border border-orange-500/50'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-zinc-400">
                        {account.is_paper ? 'Paper' : 'Live'} Trading
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        ${(account.total_equity || account.balance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div
                        className={`text-xs ${
                          account.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {account.realized_pnl >= 0 ? '+' : ''}
                        ${account.realized_pnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="lg:col-span-3">
          {currentAccount && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Balance"
                value={`$${currentAccount.balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                subtitle={currentAccount.is_paper ? 'Paper Trading' : 'Live Trading'}
                color="blue"
              />
              <StatCard
                title="Unrealized P&L"
                value={`${(currentAccount.unrealized_pnl || 0) >= 0 ? '+' : ''}$${(
                  currentAccount.unrealized_pnl || 0
                ).toFixed(2)}`}
                subtitle={`${positions.length} open positions`}
                color={(currentAccount.unrealized_pnl || 0) >= 0 ? 'green' : 'red'}
              />
              <StatCard
                title="Realized P&L"
                value={`${currentAccount.realized_pnl >= 0 ? '+' : ''}$${currentAccount.realized_pnl.toFixed(
                  2
                )}`}
                subtitle={`${currentAccount.total_trades} total trades`}
                color={currentAccount.realized_pnl >= 0 ? 'green' : 'red'}
              />
              <StatCard
                title="Win Rate"
                value={
                  currentAccount.total_trades > 0
                    ? `${(
                        (currentAccount.win_count / currentAccount.total_trades) *
                        100
                      ).toFixed(1)}%`
                    : 'N/A'
                }
                subtitle={`${currentAccount.win_count}W / ${currentAccount.loss_count}L`}
                color="orange"
              />
            </div>
          )}
        </div>
      </div>

      {/* Market Tickers */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Market Overview</h2>
          <Link
            href="/stuntman/trade"
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {tickers.map((ticker) => (
            <Link
              key={ticker.instrumentName}
              href={`/stuntman/trade?instrument=${ticker.instrumentName}`}
              className="p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <div className="text-xs text-zinc-400 mb-1">
                {ticker.instrumentName.replace('_', '/')}
              </div>
              <div className="font-mono font-medium">
                ${ticker.lastPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: ticker.lastPrice < 1 ? 6 : 2,
                })}
              </div>
              <div
                className={`text-xs ${
                  ticker.priceChangePercent24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {ticker.priceChangePercent24h >= 0 ? '+' : ''}
                {ticker.priceChangePercent24h.toFixed(2)}%
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Open Positions</h2>
          {positions.length > 0 && (
            <Link
              href="/stuntman/history"
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              View History →
            </Link>
          )}
        </div>
        {positions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-500 mb-4">No open positions</div>
            <Link
              href="/stuntman/trade"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
            >
              Start Trading
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase">
                  <th className="text-left py-2 px-3">Instrument</th>
                  <th className="text-left py-2 px-3">Side</th>
                  <th className="text-right py-2 px-3">Quantity</th>
                  <th className="text-right py-2 px-3">Entry</th>
                  <th className="text-right py-2 px-3">Current</th>
                  <th className="text-right py-2 px-3">P&L</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const pnlPercent =
                    ((pos.current_price - pos.entry_price) / pos.entry_price) *
                    100 *
                    (pos.side === 'long' ? 1 : -1)

                  return (
                    <tr key={pos.id} className="border-t border-zinc-800">
                      <td className="py-3 px-3 font-medium">
                        {pos.instrument_name.replace('_', '/')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            pos.side === 'long'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {pos.quantity.toFixed(6)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-400">
                        ${pos.entry_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ${pos.current_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div
                          className={`font-mono ${
                            pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {pos.unrealized_pnl >= 0 ? '+' : ''}
                          ${pos.unrealized_pnl.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs ${
                            pnlPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                          }`}
                        >
                          {pnlPercent >= 0 ? '+' : ''}
                          {pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs transition-colors"
                          onClick={() => {
                            // TODO: Implement close position
                          }}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Paper Trade"
          description="Practice trading with virtual funds"
          icon="📊"
          href="/stuntman/trade"
          color="orange"
        />
        <QuickActionCard
          title="Create Strategy"
          description="Build automated trading strategies"
          icon="⚙️"
          href="/stuntman/strategies"
          color="blue"
        />
        <QuickActionCard
          title="Backtest"
          description="Test strategies on historical data"
          icon="📈"
          href="/stuntman/backtest"
          color="purple"
        />
      </div>
    </div>
  )
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string
  value: string
  subtitle: string
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple'
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  }

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border backdrop-blur-sm`}
    >
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </div>
  )
}

// =============================================================================
// QUICK ACTION CARD COMPONENT
// =============================================================================

function QuickActionCard({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string
  description: string
  icon: string
  href: string
  color: 'orange' | 'blue' | 'purple'
}) {
  const colors = {
    orange: 'from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20',
    blue: 'from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20',
    purple: 'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20',
  }

  return (
    <Link
      href={href}
      className={`block p-6 rounded-xl bg-gradient-to-br ${colors[color]} border border-zinc-800 hover:border-zinc-700 transition-all`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </Link>
  )
}

// =============================================================================
// CREATE ACCOUNT BUTTON
// =============================================================================

function CreateAccountButton({
  compact = false,
  onCreated,
}: {
  compact?: boolean
  onCreated: (account: Account) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('1000')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/stuntman/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          is_paper: true,
          initial_balance: parseFloat(balance) || 1000,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onCreated(data.account)
        setIsOpen(false)
        setName('')
        setBalance('1000')
      }
    } catch (err) {
      console.error('Failed to create account:', err)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={
          compact
            ? 'p-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 transition-colors'
            : 'px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold transition-all'
        }
      >
        {compact ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          'Create Trading Account'
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Create Paper Trading Account</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Trading Account"
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Starting Balance (USDT)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
