// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'

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
  stop_loss?: number
  take_profit?: number
}

interface AdvancedSignal {
  instrument: string
  action: string
  confidence: number
  risk_score: number
  stop_loss: number
  take_profit: number
  position_size: number
  sources: Array<{ name: string; signal: string; strength: number }>
  currentPrice: number
  trade?: { success: boolean; message: string }
}

// =============================================================================
// PRICE CHART - Using Line Series (v5 compatible)
// =============================================================================

function PriceChart({ instrument, isPositive }: { instrument: string; isPositive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<any>(null)
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>('1D')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stuntman/market?action=history&instrument=${instrument}&timeframe=${timeframe}`)
      const data = await res.json()

      if (data.success && data.history && seriesRef.current) {
        const chartData = data.history.map((h: any) => ({
          time: h.time,
          value: h.close,
        }))
        seriesRef.current.setData(chartData)
        chartRef.current?.timeScale().fitContent()
      }
    } catch (e) {
      console.error('Chart error:', e)
    }
  }, [instrument, timeframe])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: containerRef.current.clientWidth,
      height: 200,
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    })

    // Use LineSeries for v5 compatibility
    const series = chart.addSeries(LineSeries, {
      color: isPositive ? '#10b981' : '#ef4444',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [isPositive])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <div className="flex gap-1 mt-4">
        {(['1D', '1W', '1M'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              timeframe === tf
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tf}
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
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedInstrument, setSelectedInstrument] = useState('BTC_USDT')
  const [loading, setLoading] = useState(true)
  const [botRunning, setBotRunning] = useState(false)
  const [opportunities, setOpportunities] = useState<AdvancedSignal[]>([])
  const [lastScan, setLastScan] = useState<string | null>(null)

  // Fetch market data
  useEffect(() => {
    const fetchData = async () => {
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
          if (accountsData.accounts?.length && !selectedAccount) {
            setSelectedAccount(accountsData.accounts[0].id)
          }
        }
      } catch (e) {
        console.error('Fetch error:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // Fetch positions
  useEffect(() => {
    if (!selectedAccount) return

    const fetchPositions = async () => {
      try {
        const res = await fetch(`/api/stuntman/positions?accountId=${selectedAccount}&status=open`)
        const data = await res.json()
        if (data.success) setPositions(data.positions || [])
      } catch (e) {
        console.error('Position error:', e)
      }
    }

    fetchPositions()
    const interval = setInterval(fetchPositions, 5000)
    return () => clearInterval(interval)
  }, [selectedAccount])

  // Run advanced bot
  const runBot = async (mode: 'analyze' | 'run') => {
    if (!selectedAccount || botRunning) return
    setBotRunning(true)

    try {
      const res = await fetch('/api/stuntman/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, accountId: selectedAccount }),
      })
      const data = await res.json()

      if (data.success && data.results) {
        setOpportunities(data.results)
        setLastScan(new Date().toLocaleTimeString())
      }
    } catch (e) {
      console.error('Bot error:', e)
    } finally {
      setBotRunning(false)
    }
  }

  const currentAccount = accounts.find(a => a.id === selectedAccount)
  const totalValue = (currentAccount?.balance ?? 0) + positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
  const totalPnL = totalValue - (currentAccount?.initial_balance ?? 1000)
  const pnlPercent = ((totalPnL / (currentAccount?.initial_balance ?? 1000)) * 100)
  const selectedTicker = tickers.find(t => t.instrumentName === selectedInstrument)
  const isPositive = (selectedTicker?.priceChangePercent24h ?? 0) >= 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Onboarding
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl font-bold tracking-tight mb-2">StuntMan</div>
          <p className="text-zinc-500 text-sm mb-8">
            AI-powered crypto trading with smart money detection, whale tracking, and advanced market analysis.
          </p>
          <button
            onClick={async () => {
              const res = await fetch('/api/stuntman/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Paper Trading', is_paper: true, initial_balance: 1000 }),
              })
              const data = await res.json()
              if (data.success) {
                setAccounts([data.account])
                setSelectedAccount(data.account.id)
              }
            }}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Start with $1,000
          </button>
          <p className="text-zinc-600 text-xs mt-4">Paper trading only. No real funds.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Portfolio Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <div className="text-zinc-500 text-sm">Portfolio Value</div>
            {currentAccount?.is_paper && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">PAPER</span>
            )}
          </div>
          <div className="text-4xl font-bold tracking-tight">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm font-medium ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% ({totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)})
          </div>
        </div>

        {/* Chart + Asset Info */}
        <div className="bg-zinc-900/40 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">
                {selectedInstrument.split('_')[0].slice(0, 3)}
              </div>
              <div>
                <div className="font-semibold">{selectedInstrument.replace('_', '/')}</div>
                <div className="text-xs text-zinc-500">{selectedInstrument.split('_')[0]}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono">
                ${(selectedTicker?.lastPrice ?? 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: (selectedTicker?.lastPrice ?? 0) < 1 ? 6 : 2,
                })}
              </div>
              <div className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{(selectedTicker?.priceChangePercent24h ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>

          <PriceChart instrument={selectedInstrument} isPositive={isPositive} />

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800/50">
            <div>
              <div className="text-xs text-zinc-500 mb-1">24h High</div>
              <div className="font-mono text-sm">${(selectedTicker?.highPrice ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">24h Low</div>
              <div className="font-mono text-sm">${(selectedTicker?.lowPrice ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Volume</div>
              <div className="font-mono text-sm">${((selectedTicker?.volume ?? 0) / 1e6).toFixed(1)}M</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => runBot('analyze')}
            disabled={botRunning}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {botRunning ? 'Scanning...' : 'Scan Markets'}
          </button>
          <button
            onClick={() => runBot('run')}
            disabled={botRunning}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {botRunning ? 'Running...' : 'Auto Trade'}
          </button>
        </div>

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="bg-zinc-900/40 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Trading Opportunities</div>
              {lastScan && <div className="text-xs text-zinc-500">Last scan: {lastScan}</div>}
            </div>
            <div className="space-y-2">
              {opportunities.filter(o => o.action !== 'HOLD').slice(0, 5).map((opp, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      opp.action.includes('BUY') ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{opp.instrument.replace('_', '/')}</div>
                      <div className="text-xs text-zinc-500">
                        {opp.sources.slice(0, 2).map(s => s.name).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${
                      opp.action.includes('BUY') ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {opp.action.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-zinc-500">{opp.confidence}% conf</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Markets */}
        <div className="bg-zinc-900/40 rounded-2xl p-4 mb-6">
          <div className="text-sm font-semibold mb-4">Markets</div>
          <div className="space-y-1">
            {tickers.filter(t => t?.instrumentName).slice(0, 10).map(ticker => (
              <button
                key={ticker.instrumentName}
                onClick={() => setSelectedInstrument(ticker.instrumentName)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedInstrument === ticker.instrumentName
                    ? 'bg-zinc-800'
                    : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
                    {ticker.instrumentName.split('_')[0].slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{ticker.instrumentName.split('_')[0]}</div>
                    <div className="text-xs text-zinc-500">{ticker.instrumentName.replace('_', '/')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    ${ticker.lastPrice >= 1000
                      ? Math.round(ticker.lastPrice).toLocaleString()
                      : ticker.lastPrice.toFixed(2)}
                  </div>
                  <div className={`text-xs font-medium ${
                    (ticker.priceChangePercent24h ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
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
          <div className="bg-zinc-900/40 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">Open Positions</div>
              <Link href="/stuntman/history" className="text-xs text-zinc-500 hover:text-white">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {positions.map(pos => (
                <div key={pos.id} className="p-3 bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        pos.side === 'long' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {pos.side.toUpperCase()}
                      </span>
                      <span className="font-medium text-sm">{pos.instrument_name.replace('_', '/')}</span>
                    </div>
                    <span className={`font-mono font-semibold ${
                      (pos.unrealized_pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${(pos.unrealized_pnl ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{pos.quantity.toFixed(6)} @ ${pos.entry_price.toFixed(2)}</span>
                    <span>Now: ${pos.current_price.toFixed(2)}</span>
                  </div>
                  {(pos.stop_loss || pos.take_profit) && (
                    <div className="flex gap-4 mt-2 text-xs">
                      {pos.stop_loss && <span className="text-red-400">SL: ${pos.stop_loss.toFixed(2)}</span>}
                      {pos.take_profit && <span className="text-emerald-400">TP: ${pos.take_profit.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
