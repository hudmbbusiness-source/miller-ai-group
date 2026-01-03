// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Shield,
  RefreshCw,
  Power,
  ChevronDown,
  AlertTriangle,
  Activity,
  Zap,
  Bot,
  Play,
  Pause,
  DollarSign,
  Target,
  Clock,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Settings,
  X,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Signal {
  direction: 'LONG' | 'SHORT' | 'FLAT'
  confidence: number
  entry: number
  stopLoss: number
  takeProfit: number
  strategy: string
  reasons: string[]
  timestamp: number
}

interface Position {
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  contracts: number
  stopLoss: number
  takeProfit: number
  entryTime: number
}

interface Trade {
  id: string
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  contracts: number
  pnl: number
  entryTime: number
  exitTime: number
  reason: string
}

interface AutoTraderStatus {
  enabled: boolean
  instrument: 'ES' | 'NQ'
  session: string
  hasPosition: boolean
  position: Position | null
  lastSignal: Signal | null
  lastCheck: number
}

interface Performance {
  todayPnL: number
  todayTrades: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  startBalance: number
  currentBalance: number
  drawdownUsed: number
  profitTarget: number
  targetProgress: number
  withdrawable: number
}

// =============================================================================
// TRADINGVIEW CHART COMPONENT
// =============================================================================

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: '5',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(255, 255, 255, 0.03)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      studies: ['MAExp@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
    })

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'

    containerRef.current.appendChild(widgetContainer)
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '100%', width: '100%' }}
    />
  )
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function StuntManDashboard() {
  // Core State
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')
  const [instrument, setInstrument] = useState<'ES' | 'NQ'>('ES')
  const [showMenu, setShowMenu] = useState(false)

  // Auto-Trader State
  const [autoStatus, setAutoStatus] = useState<AutoTraderStatus | null>(null)
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [configured, setConfigured] = useState(false)

  // Manual Trading State
  const [contracts, setContracts] = useState(1)
  const [executing, setExecuting] = useState(false)

  // TradingView Symbol
  const tvSymbol = instrument === 'ES' ? 'CME_MINI:ES1!' : 'CME_MINI:NQ1!'

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/auto-trade')
      const data = await res.json()

      if (data.success) {
        setAutoStatus(data.status)
        setPerformance(data.performance)
        setRecentTrades(data.recentTrades || [])
        setConfigured(data.configured)
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const poll = setInterval(fetchData, 3000)
    return () => clearInterval(poll)
  }, [fetchData])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const toggleAuto = async () => {
    const action = autoStatus?.enabled ? 'stop' : 'start'
    await fetch('/api/stuntman/auto-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, instrument }),
    })
    await fetchData()
  }

  const executeTrade = async (direction: 'BUY' | 'SELL') => {
    setExecuting(true)
    try {
      const res = await fetch('/api/stuntman/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: direction, instrument, contracts }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || 'Trade failed')
      }
      await fetchData()
    } catch (e) {
      alert('Execution failed')
    }
    setExecuting(false)
  }

  const closePosition = async () => {
    await fetch('/api/stuntman/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FLAT', instrument }),
    })
    await fetchData()
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const fmt = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)

  const fmtPrice = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading StuntMan...</p>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <header className="border-b border-white/5 bg-black sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/app" className="text-white/40 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" />
              <span className="font-bold">StuntMan</span>
            </div>

            {/* Instrument Selector */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm"
              >
                {instrument}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute top-full mt-1 left-0 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setInstrument('ES'); setShowMenu(false) }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                  >
                    ES - S&P 500 E-mini
                  </button>
                  <button
                    onClick={() => { setInstrument('NQ'); setShowMenu(false) }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                  >
                    NQ - Nasdaq E-mini
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Session */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              autoStatus?.session === 'RTH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {autoStatus?.session || 'CLOSED'}
            </div>

            {/* Auto Toggle */}
            {configured && (
              <button
                onClick={toggleAuto}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  autoStatus?.enabled
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {autoStatus?.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoStatus?.enabled ? 'STOP' : 'START'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================================== */}
      <main className="max-w-[1800px] mx-auto p-4">
        {/* ================================================================ */}
        {/* STATS BAR */}
        {/* ================================================================ */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {/* Balance */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Balance
            </div>
            <div className="text-xl font-bold">{fmt(performance?.currentBalance || 150000)}</div>
          </div>

          {/* Today P&L */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Today
            </div>
            <div className={`text-xl font-bold ${(performance?.todayPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(performance?.todayPnL || 0) >= 0 ? '+' : ''}{fmt(performance?.todayPnL || 0)}
            </div>
          </div>

          {/* Target */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Target
            </div>
            <div className="text-xl font-bold">{(performance?.targetProgress || 0).toFixed(0)}%</div>
            <div className="text-[10px] text-white/30">{fmt(performance?.todayPnL || 0)} / $9,000</div>
          </div>

          {/* Win Rate */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> Win Rate
            </div>
            <div className="text-xl font-bold">{(performance?.winRate || 0).toFixed(0)}%</div>
            <div className="text-[10px] text-white/30">{performance?.wins || 0}W / {performance?.losses || 0}L</div>
          </div>

          {/* Drawdown */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Drawdown
            </div>
            <div className="text-xl font-bold">{fmt(performance?.drawdownUsed || 0)}</div>
            <div className="text-[10px] text-white/30">of $5,000</div>
          </div>

          {/* Withdrawable */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Cash Out
            </div>
            <div className="text-xl font-bold text-emerald-400">{fmt(performance?.withdrawable || 0)}</div>
            <div className="text-[10px] text-white/30">90% payout</div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MAIN GRID */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ============================================================ */}
          {/* CHART (3 cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            <div className="h-[550px]">
              <TradingViewChart symbol={tvSymbol} />
            </div>
          </div>

          {/* ============================================================ */}
          {/* TRADING PANEL (1 col) */}
          {/* ============================================================ */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('auto')}
                className={`flex-1 py-2 rounded text-sm font-medium ${
                  activeTab === 'auto' ? 'bg-white/10' : 'text-white/50'
                }`}
              >
                <Bot className="w-4 h-4 inline mr-1" /> Auto
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 rounded text-sm font-medium ${
                  activeTab === 'manual' ? 'bg-white/10' : 'text-white/50'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-1" /> Manual
              </button>
            </div>

            {/* ========================================================== */}
            {/* AUTO TRADING PANEL */}
            {/* ========================================================== */}
            {activeTab === 'auto' && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                {!configured ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <p className="text-white/50 mb-4">PickMyTrade Required</p>
                    <a href="https://pickmytrade.trade" target="_blank" className="px-4 py-2 bg-amber-500 text-black rounded-lg font-medium">
                      Connect Now
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Signal Display */}
                    <div>
                      <div className="text-xs text-white/40 mb-2">Current Signal</div>
                      <div className={`p-4 rounded-lg border ${
                        autoStatus?.lastSignal?.direction === 'LONG'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : autoStatus?.lastSignal?.direction === 'SHORT'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-2xl font-bold ${
                            autoStatus?.lastSignal?.direction === 'LONG' ? 'text-emerald-400' :
                            autoStatus?.lastSignal?.direction === 'SHORT' ? 'text-red-400' :
                            'text-white/30'
                          }`}>
                            {autoStatus?.lastSignal?.direction || 'WAITING'}
                          </span>
                          {autoStatus?.lastSignal && autoStatus.lastSignal.direction !== 'FLAT' && (
                            <span className="text-lg font-medium text-white/60">
                              {autoStatus.lastSignal.confidence.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {autoStatus?.lastSignal?.strategy && (
                          <div className="text-xs text-white/40">{autoStatus.lastSignal.strategy}</div>
                        )}
                      </div>
                    </div>

                    {/* Active Position */}
                    {autoStatus?.position && (
                      <div>
                        <div className="text-xs text-white/40 mb-2">Active Position</div>
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-bold text-blue-400">
                              {autoStatus.position.direction} {autoStatus.position.contracts}x
                            </span>
                            <span className="text-white/60">
                              @ {fmtPrice(autoStatus.position.entryPrice)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-white/40">Stop: </span>
                              <span className="text-red-400">{fmtPrice(autoStatus.position.stopLoss)}</span>
                            </div>
                            <div>
                              <span className="text-white/40">Target: </span>
                              <span className="text-emerald-400">{fmtPrice(autoStatus.position.takeProfit)}</span>
                            </div>
                          </div>
                          <button
                            onClick={closePosition}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium"
                          >
                            Close Position
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className={`text-center text-sm py-2 rounded-lg ${
                      autoStatus?.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'
                    }`}>
                      {autoStatus?.enabled ? '● Auto-Trading Active' : '○ Auto-Trading Paused'}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================== */}
            {/* MANUAL TRADING PANEL */}
            {/* ========================================================== */}
            {activeTab === 'manual' && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
                {!configured ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <p className="text-white/50">Connect PickMyTrade to trade</p>
                  </div>
                ) : (
                  <>
                    {/* Contracts */}
                    <div>
                      <div className="text-xs text-white/40 mb-2">Contracts</div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setContracts(n)}
                            className={`py-2.5 rounded-lg font-bold transition ${
                              contracts === n ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trade Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => executeTrade('BUY')}
                        disabled={executing}
                        className="py-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xl flex items-center justify-center gap-2"
                      >
                        {executing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                        BUY
                      </button>
                      <button
                        onClick={() => executeTrade('SELL')}
                        disabled={executing}
                        className="py-5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold text-xl flex items-center justify-center gap-2"
                      >
                        {executing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />}
                        SELL
                      </button>
                    </div>

                    <div className="text-xs text-white/30 text-center">
                      {instrument} • {contracts} contract{contracts > 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================== */}
            {/* RECENT TRADES */}
            {/* ========================================================== */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="text-xs text-white/40 mb-3">Recent Trades</div>
              {recentTrades.length === 0 ? (
                <div className="text-center text-white/20 py-6">No trades yet today</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {recentTrades.map(trade => (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          trade.pnl >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {trade.pnl >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {trade.direction} {trade.contracts}x {trade.instrument}
                          </div>
                          <div className="text-[10px] text-white/40">{trade.reason}</div>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{fmt(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
