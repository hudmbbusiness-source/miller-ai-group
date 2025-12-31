// =============================================================================
// STUNTMAN AI - BACKTESTING
// =============================================================================
// Test trading strategies on historical data
// =============================================================================

'use client'

import { useState } from 'react'
import { INSTRUMENTS, TIMEFRAMES } from '@/lib/stuntman/constants'

export default function BacktestPage() {
  const [instrument, setInstrument] = useState('BTC_USDT')
  const [timeframe, setTimeframe] = useState('15m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [running, setRunning] = useState(false)

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Strategy Backtesting</h1>
        <p className="text-zinc-400 mt-1">
          Test your trading strategies on historical market data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4">Backtest Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Instrument</label>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                >
                  {INSTRUMENTS.all.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst.replace('_', '/')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                >
                  {Object.entries(TIMEFRAMES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Initial Balance (USDT)
                </label>
                <input
                  type="number"
                  defaultValue="1000"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                />
              </div>

              <button
                onClick={() => setRunning(true)}
                disabled={running}
                className="w-full py-3 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
              >
                {running ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 min-h-[500px]">
            <h2 className="font-semibold mb-4">Backtest Results</h2>

            <div className="flex items-center justify-center h-96 text-center">
              <div className="text-zinc-500">
                <div className="text-5xl mb-4">📈</div>
                <div className="text-lg font-medium mb-2">No Backtest Results Yet</div>
                <div className="text-sm">
                  Configure your backtest parameters and click "Run Backtest" to see
                  results.
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { label: 'Total Return', value: '--', color: 'text-zinc-400' },
              { label: 'Win Rate', value: '--', color: 'text-zinc-400' },
              { label: 'Max Drawdown', value: '--', color: 'text-zinc-400' },
              { label: 'Sharpe Ratio', value: '--', color: 'text-zinc-400' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="p-4 rounded-lg bg-zinc-900 border border-zinc-800"
              >
                <div className="text-xs text-zinc-500 uppercase">{metric.label}</div>
                <div className={`text-xl font-bold mt-1 ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
        <div className="text-orange-400 font-medium">Backtesting Module Coming Soon</div>
        <div className="text-sm text-zinc-400 mt-1">
          Full strategy backtesting with detailed performance metrics is under development.
        </div>
      </div>
    </div>
  )
}
