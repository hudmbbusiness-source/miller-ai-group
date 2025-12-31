// =============================================================================
// STUNTMAN AI - TRADE HISTORY
// =============================================================================
// View trade history and performance analytics
// =============================================================================

'use client'

import { useState, useEffect } from 'react'

interface Trade {
  id: string
  instrument_name: string
  side: string
  quantity: number
  price: number
  fees: number
  realized_pnl: number
  created_at: string
}

interface Account {
  id: string
  name: string
  is_paper: boolean
  realized_pnl: number
  total_trades: number
  win_count: number
  loss_count: number
}

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all')

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

  // Fetch trades
  useEffect(() => {
    if (!selectedAccount) return

    const fetchTrades = async () => {
      setLoading(true)
      try {
        // Fetch trades from orders that were filled
        const res = await fetch(`/api/stuntman/orders?accountId=${selectedAccount}&status=filled`)
        const data = await res.json()
        if (data.success) {
          // Map orders to trades for display
          const tradeData = data.orders.map((order: any) => ({
            id: order.id,
            instrument_name: order.instrument_name,
            side: order.side,
            quantity: order.filled_quantity,
            price: order.average_price,
            fees: order.fees,
            realized_pnl: order.realized_pnl || 0,
            created_at: order.filled_at || order.created_at,
          }))
          setTrades(tradeData)
        }
      } catch (err) {
        console.error('Failed to fetch trades:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrades()
  }, [selectedAccount])

  const currentAccount = accounts.find((a) => a.id === selectedAccount)
  const filteredTrades = trades.filter((t) => {
    if (filter === 'wins') return t.realized_pnl > 0
    if (filter === 'losses') return t.realized_pnl < 0
    return true
  })

  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.realized_pnl, 0)
  const totalFees = filteredTrades.reduce((sum, t) => sum + t.fees, 0)
  const winRate = currentAccount && currentAccount.total_trades > 0
    ? (currentAccount.win_count / currentAccount.total_trades) * 100
    : 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Trade History</h1>
          <p className="text-zinc-400 mt-1">View your trading performance</p>
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
        </div>
      </div>

      {/* Stats Cards */}
      {currentAccount && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase">Total P&L</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                currentAccount.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {currentAccount.realized_pnl >= 0 ? '+' : ''}
              ${currentAccount.realized_pnl.toFixed(2)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase">Total Trades</div>
            <div className="text-2xl font-bold mt-1">{currentAccount.total_trades}</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase">Win Rate</div>
            <div className="text-2xl font-bold mt-1">{winRate.toFixed(1)}%</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase">Wins</div>
            <div className="text-2xl font-bold mt-1 text-green-400">
              {currentAccount.win_count}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase">Losses</div>
            <div className="text-2xl font-bold mt-1 text-red-400">
              {currentAccount.loss_count}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'wins', 'losses'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Trades Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading trades...</div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No trades found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr className="text-xs text-zinc-500 uppercase">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Instrument</th>
                  <th className="text-left py-3 px-4">Side</th>
                  <th className="text-right py-3 px-4">Quantity</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-right py-3 px-4">Fees</th>
                  <th className="text-right py-3 px-4">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-zinc-800/50">
                    <td className="py-3 px-4 text-sm">
                      {new Date(trade.created_at).toLocaleDateString()}{' '}
                      <span className="text-zinc-500">
                        {new Date(trade.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {trade.instrument_name.replace('_', '/')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trade.side === 'buy'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {trade.quantity.toFixed(6)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${trade.price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-500">
                      ${trade.fees.toFixed(4)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-medium ${
                        trade.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {trade.realized_pnl >= 0 ? '+' : ''}
                      ${trade.realized_pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-800/30 border-t border-zinc-700">
                <tr className="text-sm font-medium">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    Totals:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-400">
                    ${totalFees.toFixed(4)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono ${
                      totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
