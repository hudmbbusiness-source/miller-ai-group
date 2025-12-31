// @ts-nocheck
// =============================================================================
// STUNTMAN AI - AUTOMATED TRADING DASHBOARD
// =============================================================================
// Professional automated trading with proven strategies
// =============================================================================

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createChart, ColorType } from 'lightweight-charts'

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
}

interface Account {
  id: string
  name: string
  is_paper: boolean
  balance: number
  initial_balance: number
  realized_pnl: number
  unrealized_pnl?: number
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

interface Signal {
  id: string
  instrument_name: string
  side: string
  strength: number
  confidence: number
  source: string
  created_at: string
}

interface BotResult {
  instrument: string
  decision: string
  confidence: number
  reason: string
  currentPrice: number
  trade?: { success: boolean; message: string }
}

// =============================================================================
// REAL PRICE CHART - Uses actual Crypto.com data
// =============================================================================

function RealPriceChart({ instrument }: { instrument: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M'>('1D')
  const [loading, setLoading] = useState(true)

  // Fetch REAL data from Crypto.com
  const fetchRealData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stuntman/market?action=history&instrument=${instrument}&timeframe=${timeRange}`)
      const data = await res.json()

      if (data.success && data.history && seriesRef.current) {
        const chartData = data.history.map((h: any) => ({
          time: h.time,
          value: h.close,
        }))

        seriesRef.current.setData(chartData)

        // Color based on performance
        if (chartData.length >= 2) {
          const first = chartData[0].value
          const last = chartData[chartData.length - 1].value
          const isPositive = last >= first

          seriesRef.current.applyOptions({
            lineColor: isPositive ? '#22c55e' : '#ef4444',
            topColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            bottomColor: 'transparent',
          })
        }

        chartRef.current?.timeScale().fitContent()
      }
    } catch (err) {
      console.error('Chart fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [instrument, timeRange])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 280,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, visible: false },
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
    })

    const series = chart.addAreaSeries({
      lineColor: '#22c55e',
      topColor: 'rgba(34, 197, 94, 0.15)',
      bottomColor: 'transparent',
      lineWidth: 2,
      priceLineVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchRealData()
    const interval = setInterval(fetchRealData, 30000)
    return () => clearInterval(interval)
  }, [fetchRealData])

  return (
    <div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>
      <div className="flex gap-2 mt-3">
        {(['1D', '1W', '1M'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${
              timeRange === range ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

export default function StuntManDashboard() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedInstrument, setSelectedInstrument] = useState('BTC_USDT')
  const [loading, setLoading] = useState(true)
  const [botRunning, setBotRunning] = useState(false)
  const [botResults, setBotResults] = useState<BotResult[]>([])

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tickersRes, accountsRes] = await Promise.all([
          fetch('/api/stuntman/market?action=tickers'),
          fetch('/api/stuntman/accounts'),
        ])

        const [tickersData, accountsData] = await Promise.all([
          tickersRes.json(),
          accountsRes.json(),
        ])

        if (tickersData.success) setTickers(tickersData.tickers || [])
        if (accountsData.success) {
          setAccounts(accountsData.accounts || [])
          if (accountsData.accounts?.length > 0 && !selectedAccount) {
            setSelectedAccount(accountsData.accounts[0].id)
          }
        }
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch positions and signals
  useEffect(() => {
    if (!selectedAccount) return

    const fetchAccountData = async () => {
      try {
        const [posRes, sigRes] = await Promise.all([
          fetch(`/api/stuntman/positions?accountId=${selectedAccount}&status=open`),
          fetch(`/api/stuntman/signals?accountId=${selectedAccount}&limit=10`),
        ])

        const [posData, sigData] = await Promise.all([posRes.json(), sigRes.json()])

        if (posData.success) setPositions(posData.positions || [])
        if (sigData.success) setSignals(sigData.signals || [])
      } catch (err) {
        console.error('Account data error:', err)
      }
    }

    fetchAccountData()
    const interval = setInterval(fetchAccountData, 5000)
    return () => clearInterval(interval)
  }, [selectedAccount])

  // Run automated bot
  const runBot = async () => {
    if (!selectedAccount || botRunning) return

    setBotRunning(true)
    try {
      const res = await fetch('/api/stuntman/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', accountId: selectedAccount }),
      })

      const data = await res.json()
      if (data.success && data.results) {
        setBotResults(data.results)
      }
    } catch (err) {
      console.error('Bot error:', err)
    } finally {
      setBotRunning(false)
    }
  }

  const currentAccount = accounts.find((a) => a.id === selectedAccount)
  const totalValue = (currentAccount?.balance ?? 0) + (currentAccount?.unrealized_pnl ?? 0)
  const totalPnL = (currentAccount?.realized_pnl ?? 0) + (currentAccount?.unrealized_pnl ?? 0)
  const selectedTicker = tickers.find((t) => t.instrumentName === selectedInstrument)

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Onboarding
  if (accounts.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-2">StuntMan</h1>
          <p className="text-zinc-500 mb-6">Automated crypto trading with proven strategies</p>
          <p className="text-zinc-400 mb-8 text-sm">
            Start with $1,000 in paper funds. The bot uses RSI, MACD, Bollinger Bands, and
            Moving Averages to trade automatically.
          </p>
          <button
            onClick={async () => {
              const res = await fetch('/api/stuntman/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Paper Account', is_paper: true, initial_balance: 1000 }),
              })
              const data = await res.json()
              if (data.success) {
                setAccounts([data.account])
                setSelectedAccount(data.account.id)
              }
            }}
            className="px-8 py-3 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors"
          >
            Start Automated Trading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio */}
            <div className="bg-zinc-900/50 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Portfolio Value</div>
                  <div className="text-4xl font-bold">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-sm mt-1 ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} all time
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentAccount?.is_paper && (
                    <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-500 rounded">PAPER</span>
                  )}
                  <button
                    onClick={runBot}
                    disabled={botRunning}
                    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                      botRunning
                        ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {botRunning ? 'Analyzing...' : 'Run Bot'}
                  </button>
                </div>
              </div>

              {/* Real Chart */}
              <RealPriceChart instrument={selectedInstrument} />
            </div>

            {/* Selected Asset */}
            <div className="bg-zinc-900/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">
                    {selectedInstrument.split('_')[0].slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold">{selectedInstrument.replace('_', '/')}</div>
                    <div className="text-xs text-zinc-500">{selectedInstrument.split('_')[0]}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono">
                    ${(selectedTicker?.lastPrice ?? 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: (selectedTicker?.lastPrice ?? 0) < 1 ? 6 : 2,
                    })}
                  </div>
                  <div className={`text-sm ${(selectedTicker?.priceChangePercent24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(selectedTicker?.priceChangePercent24h ?? 0) >= 0 ? '+' : ''}
                    {(selectedTicker?.priceChangePercent24h ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">24h High</div>
                  <div className="font-mono">${(selectedTicker?.highPrice ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">24h Low</div>
                  <div className="font-mono">${(selectedTicker?.lowPrice ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Volume</div>
                  <div className="font-mono">${((selectedTicker?.volume ?? 0) / 1e6).toFixed(1)}M</div>
                </div>
              </div>
            </div>

            {/* Bot Results */}
            {botResults.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-6">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Bot Analysis</div>
                <div className="space-y-3">
                  {botResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <div className="font-medium">{r.instrument.replace('_', '/')}</div>
                        <div className="text-xs text-zinc-500">{r.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          r.decision === 'BUY' ? 'text-green-500' : r.decision === 'SELL' ? 'text-red-500' : 'text-zinc-500'
                        }`}>
                          {r.decision}
                        </div>
                        <div className="text-xs text-zinc-500">{(r.confidence * 100).toFixed(0)}% confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Watchlist */}
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Markets</div>
              <div className="space-y-1">
                {tickers.filter((t) => t?.instrumentName).slice(0, 8).map((ticker) => (
                  <button
                    key={ticker.instrumentName}
                    onClick={() => setSelectedInstrument(ticker.instrumentName)}
                    className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                      selectedInstrument === ticker.instrumentName ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
                        {ticker.instrumentName.split('_')[0].slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium">{ticker.instrumentName.split('_')[0]}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        ${(ticker.lastPrice ?? 0) >= 1000
                          ? Math.round(ticker.lastPrice ?? 0).toLocaleString()
                          : (ticker.lastPrice ?? 0).toFixed(2)}
                      </div>
                      <div className={`text-xs ${(ticker.priceChangePercent24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(ticker.priceChangePercent24h ?? 0) >= 0 ? '+' : ''}
                        {(ticker.priceChangePercent24h ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Positions */}
            {positions.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Open Positions</div>
                  <Link href="/stuntman/history" className="text-xs text-zinc-500 hover:text-white">All</Link>
                </div>
                <div className="space-y-2">
                  {positions.slice(0, 4).map((pos) => (
                    <div key={pos.id} className="p-3 bg-zinc-800/50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{pos.instrument_name.replace('_', '/')}</span>
                        <span className={`text-sm font-mono ${(pos.unrealized_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${(pos.unrealized_pnl ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                        <span className={pos.side === 'long' ? 'text-green-500' : 'text-red-500'}>{pos.side.toUpperCase()}</span>
                        <span>{pos.quantity.toFixed(4)} @ ${pos.entry_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Signals */}
            {signals.length > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Recent Signals</div>
                <div className="space-y-2">
                  {signals.slice(0, 5).map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
                      <div>
                        <div className="text-sm font-medium">{sig.instrument_name?.replace('_', '/')}</div>
                        <div className="text-xs text-zinc-500">{sig.source}</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        sig.side === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {sig.side?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/stuntman/strategies" className="p-3 bg-zinc-900/50 rounded-xl text-center hover:bg-zinc-800/50 transition-colors">
                <div className="font-medium text-sm">Strategies</div>
              </Link>
              <Link href="/stuntman/history" className="p-3 bg-zinc-900/50 rounded-xl text-center hover:bg-zinc-800/50 transition-colors">
                <div className="font-medium text-sm">History</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
