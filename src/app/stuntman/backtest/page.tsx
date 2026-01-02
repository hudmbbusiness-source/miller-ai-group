// @ts-nocheck
'use client'

import { useState } from 'react'
import { INSTRUMENTS, TIMEFRAMES } from '@/lib/stuntman/constants'
import {
  Play,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react'

interface Trade {
  id: number
  entryTime: number
  exitTime: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  reason: string
  holdingPeriod: number
}

interface BacktestResult {
  success: boolean
  config: any
  trades: Trade[]
  metrics: {
    totalReturn: number
    totalReturnPercent: number
    winRate: number
    profitFactor: number
    maxDrawdown: number
    maxDrawdownPercent: number
    sharpeRatio: number
    sortinoRatio: number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    avgWin: number
    avgLoss: number
    avgHoldingPeriod: number
    largestWin: number
    largestLoss: number
    consecutiveWins: number
    consecutiveLosses: number
    finalBalance: number
    totalFees: number
  }
  equity: { time: number; value: number }[]
  drawdown: { time: number; value: number }[]
}

export default function BacktestPage() {
  const [instrument, setInstrument] = useState('BTC_USDT')
  const [timeframe, setTimeframe] = useState('15m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialBalance, setInitialBalance] = useState(1000)
  const [strategy, setStrategy] = useState('combined')
  const [stopLoss, setStopLoss] = useState(2)
  const [takeProfit, setTakeProfit] = useState(4)
  const [positionSize, setPositionSize] = useState(50)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Set default dates (last 30 days)
  useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  })

  const runBacktest = async () => {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/stuntman/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument,
          timeframe,
          startDate,
          endDate,
          initialBalance,
          strategy,
          stopLossPercent: stopLoss,
          takeProfitPercent: takeProfit,
          positionSizePercent: positionSize,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Backtest failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            Strategy Backtesting
          </h1>
          <p className="text-zinc-400 mt-1">
            Test trading strategies on historical market data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 text-sm text-zinc-400 uppercase">Configuration</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Instrument</label>
                  <select
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                  >
                    {INSTRUMENTS.all.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst.replace('_', '/')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                  >
                    {Object.entries(TIMEFRAMES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Strategy</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                  >
                    <option value="combined">Combined (RSI + MACD + EMA)</option>
                    <option value="rsi">RSI Overbought/Oversold</option>
                    <option value="macd">MACD Crossover</option>
                    <option value="ema_cross">EMA 9/21 Cross</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Initial Balance ($)</label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Stop Loss %</label>
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Take Profit %</label>
                    <input
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                      step="0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Position Size %</label>
                  <input
                    type="range"
                    value={positionSize}
                    onChange={(e) => setPositionSize(Number(e.target.value))}
                    className="w-full"
                    min="10"
                    max="100"
                    step="10"
                  />
                  <div className="text-xs text-zinc-500 text-center">{positionSize}% of balance</div>
                </div>

                <button
                  onClick={runBacktest}
                  disabled={running || !startDate || !endDate}
                  className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {running ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Backtest
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3 space-y-4">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            {!result && !running && !error && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-lg font-medium mb-2">No Backtest Results</h3>
                <p className="text-zinc-500 text-sm">
                  Configure your parameters and click "Run Backtest" to analyze strategy performance.
                </p>
              </div>
            )}

            {running && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Running Backtest...</h3>
                <p className="text-zinc-500 text-sm">Fetching historical data and simulating trades</p>
              </div>
            )}

            {result && (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-xl border ${result.metrics.totalReturn >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="text-xs text-zinc-500 uppercase mb-1">Total Return</div>
                    <div className={`text-2xl font-bold ${result.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.metrics.totalReturn >= 0 ? '+' : ''}{formatCurrency(result.metrics.totalReturn)}
                    </div>
                    <div className={`text-sm ${result.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.metrics.totalReturnPercent >= 0 ? '+' : ''}{result.metrics.totalReturnPercent.toFixed(2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-white">{result.metrics.winRate.toFixed(1)}%</div>
                    <div className="text-sm text-zinc-400">
                      {result.metrics.winningTrades}W / {result.metrics.losingTrades}L
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase mb-1">Profit Factor</div>
                    <div className={`text-2xl font-bold ${result.metrics.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.metrics.profitFactor === Infinity ? '∞' : result.metrics.profitFactor.toFixed(2)}
                    </div>
                    <div className="text-sm text-zinc-400">Gross P / Gross L</div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500 uppercase mb-1">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-400">
                      {result.metrics.maxDrawdown.toFixed(2)}%
                    </div>
                    <div className="text-sm text-zinc-400">Peak to trough</div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Sharpe Ratio</div>
                    <div className="text-lg font-mono">{result.metrics.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Sortino Ratio</div>
                    <div className="text-lg font-mono">{result.metrics.sortinoRatio.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Avg Win</div>
                    <div className="text-lg font-mono text-emerald-400">{formatCurrency(result.metrics.avgWin)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Avg Loss</div>
                    <div className="text-lg font-mono text-red-400">{formatCurrency(result.metrics.avgLoss)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Largest Win</div>
                    <div className="text-lg font-mono text-emerald-400">{formatCurrency(result.metrics.largestWin)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Largest Loss</div>
                    <div className="text-lg font-mono text-red-400">{formatCurrency(result.metrics.largestLoss)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Final Balance</div>
                    <div className="text-lg font-mono">{formatCurrency(result.metrics.finalBalance)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-xs text-zinc-500">Total Fees</div>
                    <div className="text-lg font-mono text-zinc-400">{formatCurrency(result.metrics.totalFees)}</div>
                  </div>
                </div>

                {/* Trade History */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-semibold">Trade History</h3>
                    <span className="text-sm text-zinc-500">{result.trades.length} trades</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-800/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-zinc-500 font-medium">#</th>
                          <th className="text-left px-4 py-2 text-zinc-500 font-medium">Entry</th>
                          <th className="text-left px-4 py-2 text-zinc-500 font-medium">Exit</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Entry Price</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">Exit Price</th>
                          <th className="text-right px-4 py-2 text-zinc-500 font-medium">P&L</th>
                          <th className="text-left px-4 py-2 text-zinc-500 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {result.trades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-zinc-800/30">
                            <td className="px-4 py-2 text-zinc-400">{trade.id}</td>
                            <td className="px-4 py-2">{formatDate(trade.entryTime)}</td>
                            <td className="px-4 py-2">{formatDate(trade.exitTime)}</td>
                            <td className="px-4 py-2 text-right font-mono">${trade.entryPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">${trade.exitPrice.toFixed(2)}</td>
                            <td className={`px-4 py-2 text-right font-mono ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              <div className="flex items-center justify-end gap-1">
                                {trade.pnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                              </div>
                              <div className="text-xs opacity-70">{trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%</div>
                            </td>
                            <td className="px-4 py-2 text-zinc-400 text-xs max-w-[200px] truncate" title={trade.reason}>
                              {trade.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
