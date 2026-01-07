// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Shield,
  RefreshCw,
  Power,
  AlertTriangle,
  Activity,
  Zap,
  Play,
  Pause,
  DollarSign,
  Target,
  Clock,
  BarChart2,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface TradovateStatus {
  configured: boolean
  authenticated: boolean
  mode: 'demo' | 'live' | null
  accountId: number | null
  balance: number | null
}

interface TradingState {
  enabled: boolean
  currentPosition: {
    symbol: string
    direction: 'LONG' | 'SHORT'
    entryPrice: number
    quantity: number
    stopLoss: number
    takeProfit: number
    entryTime: string
  } | null
  dailyTrades: number
  dailyPnL: number
  maxDailyLoss: number
  totalPnL: number
  totalTrades: number
  totalWins: number
  totalLosses: number
  winRate: number
}

interface Trade {
  id: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  entryTime: string
  exitTime: string
  strategy: string
  slippage: number
  latencyMs: number
}

interface Signal {
  direction: 'LONG' | 'SHORT'
  confidence: number
}

interface MarketStatus {
  currentPrice: number
  withinTradingHours: boolean
  estHour: number
  signal: Signal | null
}

interface StrategyPerformance {
  trades: number
  wins: number
  pnl: number
  avgSlippage: number
  avgLatency: number
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TradovatePaperTradingPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tradovate, setTradovate] = useState<TradovateStatus | null>(null)
  const [state, setState] = useState<TradingState | null>(null)
  const [market, setMarket] = useState<MarketStatus | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [strategyPerformance, setStrategyPerformance] = useState<Record<string, StrategyPerformance>>({})
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/tradovate-paper')
      const data = await res.json()

      if (data.success) {
        setTradovate(data.tradovate)
        setState(data.state)
        setMarket(data.market)
        setRecentTrades(data.recentTrades || [])
        setStrategyPerformance(data.strategyPerformance || {})
        setLastUpdate(new Date().toLocaleTimeString())
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load and polling
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  // Execute action
  const executeAction = async (action: string, params?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/stuntman/tradovate-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      })
      const data = await res.json()

      if (!data.success) {
        alert(data.error || 'Action failed')
      } else {
        fetchData() // Refresh data
      }
    } catch (err) {
      alert(String(err))
    }
  }

  // Manual trade execution
  const executeTrade = async (direction: 'LONG' | 'SHORT') => {
    await executeAction('execute', {
      direction,
      quantity: 1,
      strategy: 'MANUAL',
    })
  }

  // Close position
  const closePosition = async () => {
    await executeAction('close', { strategy: state?.currentPosition ? 'MANUAL' : undefined })
  }

  // Toggle trading
  const toggleTrading = async () => {
    if (state?.enabled) {
      await executeAction('disable')
    } else {
      await executeAction('enable')
    }
  }

  // Reset stats
  const resetStats = async () => {
    if (confirm('Reset all paper trading stats? This cannot be undone.')) {
      await executeAction('reset')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Tradovate Paper Trading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stuntman" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                Tradovate Paper Trading
              </h1>
              <p className="text-gray-400 text-sm">
                Validate strategies with real market data before risking real money
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Last update: {lastUpdate}
            </div>
            <button
              onClick={fetchData}
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tradovate Connection */}
          <div className={`p-4 rounded-xl ${tradovate?.authenticated ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
            <div className="flex items-center gap-3">
              {tradovate?.authenticated ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
              <div>
                <div className="font-bold">Tradovate {tradovate?.mode?.toUpperCase() || 'NOT CONFIGURED'}</div>
                <div className="text-sm text-gray-400">
                  {tradovate?.authenticated
                    ? `Account: ${tradovate.accountId} | Balance: $${tradovate.balance?.toLocaleString()}`
                    : tradovate?.configured
                    ? 'Configured but not authenticated'
                    : 'Add credentials to .env.local'}
                </div>
              </div>
            </div>
          </div>

          {/* Market Status */}
          <div className={`p-4 rounded-xl ${market?.withinTradingHours ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800 border border-gray-700'}`}>
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${market?.withinTradingHours ? 'text-green-500' : 'text-gray-500'}`} />
              <div>
                <div className="font-bold">
                  {market?.withinTradingHours ? 'MARKET OPEN' : 'MARKET CLOSED'}
                </div>
                <div className="text-sm text-gray-400">
                  EST Hour: {market?.estHour?.toFixed(2)} | Price: ${market?.currentPrice?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Trading Status */}
          <div className={`p-4 rounded-xl ${state?.enabled ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800 border border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Power className={`w-8 h-8 ${state?.enabled ? 'text-green-500' : 'text-gray-500'}`} />
                <div>
                  <div className="font-bold">{state?.enabled ? 'TRADING ENABLED' : 'TRADING DISABLED'}</div>
                  <div className="text-sm text-gray-400">
                    Daily Trades: {state?.dailyTrades} | Daily P&L: ${state?.dailyPnL?.toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleTrading}
                className={`px-4 py-2 rounded-lg font-bold ${state?.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {state?.enabled ? 'DISABLE' : 'ENABLE'}
              </button>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Total P&L</div>
            <div className={`text-2xl font-bold ${state?.totalPnL && state.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${state?.totalPnL?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Total Trades</div>
            <div className="text-2xl font-bold">{state?.totalTrades || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Win Rate</div>
            <div className={`text-2xl font-bold ${state?.winRate && state.winRate >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
              {state?.winRate?.toFixed(1) || 0}%
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Wins</div>
            <div className="text-2xl font-bold text-green-500">{state?.totalWins || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Losses</div>
            <div className="text-2xl font-bold text-red-500">{state?.totalLosses || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <div className="text-gray-400 text-sm">Daily P&L</div>
            <div className={`text-2xl font-bold ${state?.dailyPnL && state.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${state?.dailyPnL?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Current Position & Signal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Position */}
          <div className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Current Position
            </h3>
            {state?.currentPosition ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-xl font-bold ${state.currentPosition.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                  {state.currentPosition.direction === 'LONG' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  {state.currentPosition.direction} {state.currentPosition.quantity} @ ${state.currentPosition.entryPrice.toFixed(2)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Stop Loss:</span> ${state.currentPosition.stopLoss.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-400">Take Profit:</span> ${state.currentPosition.takeProfit.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-400">Symbol:</span> {state.currentPosition.symbol}
                  </div>
                  <div>
                    <span className="text-gray-400">Entry:</span> {new Date(state.currentPosition.entryTime).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={closePosition}
                  className="w-full mt-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold"
                >
                  CLOSE POSITION
                </button>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">No open position</div>
            )}
          </div>

          {/* Signal & Manual Trade */}
          <div className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Signal & Manual Trade
            </h3>
            {market?.signal ? (
              <div className={`p-4 rounded-lg mb-4 ${market.signal.direction === 'LONG' ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2 text-xl font-bold">
                  {market.signal.direction === 'LONG' ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
                  {market.signal.direction} Signal
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Confidence: {(market.signal.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg mb-4 bg-gray-700/50 text-center text-gray-400">
                No signal - waiting for setup
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => executeTrade('LONG')}
                disabled={!state?.enabled || !!state?.currentPosition || !market?.withinTradingHours}
                className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                BUY LONG
              </button>
              <button
                onClick={() => executeTrade('SHORT')}
                disabled={!state?.enabled || !!state?.currentPosition || !market?.withinTradingHours}
                className="py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <TrendingDown className="w-5 h-5" />
                SELL SHORT
              </button>
            </div>

            {!market?.withinTradingHours && (
              <div className="mt-4 p-2 bg-yellow-900/50 rounded-lg text-yellow-400 text-sm text-center">
                Trading disabled outside market hours (9:30 AM - 4:00 PM EST)
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-500" />
              Recent Trades
            </h3>
            <button
              onClick={resetStats}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
            >
              Reset All Stats
            </button>
          </div>
          {recentTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Direction</th>
                    <th className="pb-2">Entry</th>
                    <th className="pb-2">Exit</th>
                    <th className="pb-2">P&L</th>
                    <th className="pb-2">Strategy</th>
                    <th className="pb-2">Slippage</th>
                    <th className="pb-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-t border-gray-700">
                      <td className="py-2">{new Date(trade.exitTime).toLocaleTimeString()}</td>
                      <td className={`py-2 ${trade.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.direction}
                      </td>
                      <td className="py-2">${trade.entryPrice.toFixed(2)}</td>
                      <td className="py-2">${trade.exitPrice.toFixed(2)}</td>
                      <td className={`py-2 font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${trade.pnl.toFixed(2)}
                      </td>
                      <td className="py-2 text-gray-400">{trade.strategy}</td>
                      <td className="py-2 text-gray-400">{trade.slippage.toFixed(2)}</td>
                      <td className="py-2 text-gray-400">{trade.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No trades yet</div>
          )}
        </div>

        {/* Strategy Performance */}
        {Object.keys(strategyPerformance).length > 0 && (
          <div className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Strategy Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(strategyPerformance).map(([name, perf]) => (
                <div key={name} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="font-bold text-lg">{name}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-400">Trades:</span> {perf.trades}
                    </div>
                    <div>
                      <span className="text-gray-400">Win Rate:</span>{' '}
                      {perf.trades > 0 ? ((perf.wins / perf.trades) * 100).toFixed(1) : 0}%
                    </div>
                    <div className={perf.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                      <span className="text-gray-400">P&L:</span> ${perf.pnl.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-400">Avg Slippage:</span> {perf.avgSlippage.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {!tradovate?.configured && (
          <div className="bg-blue-900/30 border border-blue-500/50 p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
              Setup Tradovate API
            </h3>
            <div className="space-y-4 text-sm">
              <p>To use real Tradovate paper trading:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Go to <a href="https://www.tradovate.com" target="_blank" rel="noopener" className="text-blue-400 underline">tradovate.com</a></li>
                <li>Create a FREE demo account</li>
                <li>Go to Account Settings → API Access</li>
                <li>Create an API Application</li>
                <li>Add credentials to your .env.local file:</li>
              </ol>
              <pre className="bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto">
{`TRADOVATE_USERNAME=your_username
TRADOVATE_PASSWORD=your_password
TRADOVATE_APP_ID=your_app_id
TRADOVATE_APP_VERSION=1.0
TRADOVATE_CID=your_client_id
TRADOVATE_SEC=your_client_secret
TRADOVATE_MODE=demo`}
              </pre>
              <p className="text-gray-400">Until configured, paper trading will use simulated execution with Yahoo Finance data.</p>
            </div>
          </div>
        )}

        {/* Validation Status */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Validation Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Minimum Requirements for Live Trading:</div>
              <ul className="space-y-1 text-sm">
                <li className={state?.totalTrades && state.totalTrades >= 20 ? 'text-green-500' : 'text-gray-400'}>
                  {state?.totalTrades && state.totalTrades >= 20 ? '✓' : '○'} 20+ trades ({state?.totalTrades || 0}/20)
                </li>
                <li className={state?.winRate && state.winRate >= 45 ? 'text-green-500' : 'text-gray-400'}>
                  {state?.winRate && state.winRate >= 45 ? '✓' : '○'} 45%+ win rate ({state?.winRate?.toFixed(1) || 0}%)
                </li>
                <li className={state?.totalPnL && state.totalPnL > 0 ? 'text-green-500' : 'text-gray-400'}>
                  {state?.totalPnL && state.totalPnL > 0 ? '✓' : '○'} Net profitable (${state?.totalPnL?.toFixed(2) || '0.00'})
                </li>
              </ul>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg flex items-center justify-center">
              {state?.totalTrades && state.totalTrades >= 20 && state.winRate && state.winRate >= 45 && state.totalPnL && state.totalPnL > 0 ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <div className="text-green-500 font-bold text-lg">VALIDATED</div>
                  <div className="text-sm text-gray-400">Strategy ready for live trading</div>
                </div>
              ) : (
                <div className="text-center">
                  <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                  <div className="text-yellow-500 font-bold text-lg">PENDING</div>
                  <div className="text-sm text-gray-400">Continue paper trading to validate</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
