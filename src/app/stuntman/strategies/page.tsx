// =============================================================================
// STUNTMAN AI - STRATEGIES PAGE
// =============================================================================
// Create and manage automated trading strategies
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DEFAULT_INDICATOR_CONFIG } from '@/lib/stuntman/constants'

// =============================================================================
// TYPES
// =============================================================================

interface Strategy {
  id: string
  name: string
  description: string | null
  type: string
  instruments: string[]
  timeframes: string[]
  is_active: boolean
  created_at: string
  stats?: {
    total_signals: number
    acted_signals: number
    win_rate: number
    total_pnl: number
  }
}

interface Account {
  id: string
  name: string
  is_paper: boolean
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Create strategy form state
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    type: 'technical',
    instruments: ['BTC_USDT', 'ETH_USDT', 'SOL_USDT'],
    timeframes: ['15m', '1h'],
  })

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts')
        const data = await res.json()
        if (data.success && data.accounts.length > 0) {
          setAccounts(data.accounts)
          setSelectedAccount(data.accounts[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
      }
    }
    fetchAccounts()
  }, [])

  // Fetch strategies
  useEffect(() => {
    if (!selectedAccount) return

    const fetchStrategies = async () => {
      try {
        const res = await fetch(`/api/stuntman/strategies?accountId=${selectedAccount}`)
        const data = await res.json()
        if (data.success) {
          setStrategies(data.strategies)
        }
      } catch (err) {
        console.error('Failed to fetch strategies:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStrategies()
  }, [selectedAccount])

  // Create strategy
  const handleCreateStrategy = async () => {
    if (!selectedAccount || !newStrategy.name) return

    try {
      const res = await fetch('/api/stuntman/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ...newStrategy,
          indicators: DEFAULT_INDICATOR_CONFIG,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setStrategies([data.strategy, ...strategies])
        setIsCreating(false)
        setNewStrategy({
          name: '',
          description: '',
          type: 'technical',
          instruments: ['BTC_USDT', 'ETH_USDT', 'SOL_USDT'],
          timeframes: ['15m', '1h'],
        })
      }
    } catch (err) {
      console.error('Failed to create strategy:', err)
    }
  }

  // Toggle strategy active state
  const handleToggleStrategy = async (strategyId: string) => {
    try {
      const res = await fetch('/api/stuntman/strategies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: strategyId,
          action: 'toggle',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setStrategies(
          strategies.map((s) =>
            s.id === strategyId ? { ...s, is_active: data.strategy.is_active } : s
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle strategy:', err)
    }
  }

  // Delete strategy
  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return

    try {
      const res = await fetch(`/api/stuntman/strategies?id=${strategyId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        setStrategies(strategies.filter((s) => s.id !== strategyId))
      }
    } catch (err) {
      console.error('Failed to delete strategy:', err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Trading Strategies</h1>
          <p className="text-zinc-400 mt-1">
            Create and manage automated trading strategies
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedAccount || ''}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-medium transition-colors"
          >
            Create Strategy
          </button>
        </div>
      </div>

      {/* Strategy Types */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            type: 'technical',
            name: 'Technical Analysis',
            desc: 'RSI, MACD, Moving Averages',
            icon: '📊',
          },
          {
            type: 'momentum',
            name: 'Momentum Trading',
            desc: 'Order flow, volume analysis',
            icon: '⚡',
          },
          {
            type: 'ml_pattern',
            name: 'Pattern Recognition',
            desc: 'Candlestick & chart patterns',
            icon: '🧠',
          },
          {
            type: 'hybrid',
            name: 'Hybrid Strategy',
            desc: 'Combined signals',
            icon: '🔄',
          },
        ].map((item) => (
          <div
            key={item.type}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-zinc-500">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Strategies List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold">Your Strategies</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading strategies...</div>
        ) : strategies.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-zinc-500 mb-4">No strategies yet</div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
            >
              Create Your First Strategy
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="p-4 flex items-center justify-between hover:bg-zinc-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        strategy.is_active ? 'bg-green-500' : 'bg-zinc-600'
                      }`}
                    />
                    <div className="font-medium">{strategy.name}</div>
                    <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                      {strategy.type}
                    </span>
                  </div>
                  {strategy.description && (
                    <div className="text-sm text-zinc-500 mt-1 ml-5">
                      {strategy.description}
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 ml-5 text-xs text-zinc-500">
                    <span>{strategy.instruments.length} instruments</span>
                    <span>{strategy.timeframes.join(', ')}</span>
                    {strategy.stats && (
                      <>
                        <span>{strategy.stats.total_signals} signals</span>
                        <span
                          className={
                            strategy.stats.total_pnl >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          ${strategy.stats.total_pnl.toFixed(2)} P&L
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStrategy(strategy.id)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      strategy.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    {strategy.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strategy.id)}
                    className="p-2 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Strategy Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Create New Strategy</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={newStrategy.name}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, name: e.target.value })
                  }
                  placeholder="My Trading Strategy"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newStrategy.description}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, description: e.target.value })
                  }
                  placeholder="Describe your strategy..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Strategy Type
                </label>
                <select
                  value={newStrategy.type}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, type: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                >
                  <option value="technical">Technical Analysis</option>
                  <option value="momentum">Momentum Trading</option>
                  <option value="ml_pattern">Pattern Recognition</option>
                  <option value="hybrid">Hybrid Strategy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Timeframes
                </label>
                <div className="flex flex-wrap gap-2">
                  {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => {
                        const timeframes = newStrategy.timeframes.includes(tf)
                          ? newStrategy.timeframes.filter((t) => t !== tf)
                          : [...newStrategy.timeframes, tf]
                        setNewStrategy({ ...newStrategy, timeframes })
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        newStrategy.timeframes.includes(tf)
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStrategy}
                disabled={!newStrategy.name}
                className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
              >
                Create Strategy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
