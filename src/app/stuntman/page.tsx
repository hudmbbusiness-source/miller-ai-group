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
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'paper'>('auto')
  const [instrument, setInstrument] = useState<'ES' | 'NQ'>('ES')
  const [showMenu, setShowMenu] = useState(false)

  // Auto-Trader State
  const [autoStatus, setAutoStatus] = useState<AutoTraderStatus | null>(null)
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [configured, setConfigured] = useState(false)

  // APEX State
  const [apexRules, setApexRules] = useState<any>(null)
  const [marketStatus, setMarketStatus] = useState<any>(null)
  const [tradingDays, setTradingDays] = useState(0)
  const [tradingDaysNeeded, setTradingDaysNeeded] = useState(7)
  const [paperMode, setPaperMode] = useState(true)

  // Manual Trading State
  const [contracts, setContracts] = useState(1)
  const [executing, setExecuting] = useState(false)

  // Paper Trading / Backtest State
  const [backtestData, setBacktestData] = useState<any>(null)
  const [backtestRunning, setBacktestRunning] = useState(false)
  const [backtestLoading, setBacktestLoading] = useState(false)

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
        // APEX data
        setApexRules(data.apexRules)
        setMarketStatus(data.market)
        setTradingDays(data.status?.tradingDays || 0)
        setTradingDaysNeeded(data.status?.tradingDaysNeeded || 7)
        setPaperMode(data.status?.paperMode ?? true)
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

  // Fetch backtest data
  const fetchBacktest = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/backtest-engine')
      const data = await res.json()
      if (data.success) {
        setBacktestData(data)
        setBacktestRunning(data.status?.running || false)
      }
    } catch (e) {
      console.error('Backtest fetch error:', e)
    }
  }, [])

  useEffect(() => {
    fetchBacktest()
    const poll = setInterval(fetchBacktest, 2000)  // Poll every 2 seconds for backtest
    return () => clearInterval(poll)
  }, [fetchBacktest])

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

  // Backtest Controls
  const toggleBacktest = async () => {
    setBacktestLoading(true)
    try {
      const action = backtestRunning ? 'stop' : 'start'
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, days: 7 }),
      })
      await fetchBacktest()
    } catch (e) {
      console.error('Backtest toggle error:', e)
    }
    setBacktestLoading(false)
  }

  const resetBacktest = async () => {
    setBacktestLoading(true)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      await fetchBacktest()
    } catch (e) {
      console.error('Backtest reset error:', e)
    }
    setBacktestLoading(false)
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
        {/* APEX STATUS BAR */}
        {/* ================================================================ */}
        <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mode Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              paperMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {paperMode ? '📝 PAPER MODE' : '🔴 LIVE TRADING'}
            </div>

            {/* Market Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              marketStatus?.open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {marketStatus?.open ? '🟢 Market Open' : '🔴 Market Closed'}
            </div>

            {/* Time until close */}
            {marketStatus?.minutesUntilClose && marketStatus.minutesUntilClose < 60 && (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                ⏱️ {marketStatus.minutesUntilClose}min to close
              </div>
            )}
          </div>

          {/* Trading Days */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/40">Trading Days:</span>
            <span className={`font-bold ${tradingDays >= 7 ? 'text-emerald-400' : 'text-white'}`}>
              {tradingDays}/7
            </span>
            {tradingDaysNeeded > 0 && (
              <span className="text-white/40 text-xs">({tradingDaysNeeded} more needed)</span>
            )}
            {tradingDays >= 7 && (
              <span className="text-emerald-400 text-xs">✓ Complete</span>
            )}
          </div>
        </div>

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
            <div className="text-[10px] text-white/30">Started: $150,000</div>
          </div>

          {/* Total P&L */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total P&L
            </div>
            <div className={`text-xl font-bold ${((performance?.currentBalance || 150000) - 150000) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {((performance?.currentBalance || 150000) - 150000) >= 0 ? '+' : ''}{fmt((performance?.currentBalance || 150000) - 150000)}
            </div>
          </div>

          {/* Profit Target */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Target Progress
            </div>
            <div className="text-xl font-bold">{Math.max(0, (((performance?.currentBalance || 150000) - 150000) / 9000 * 100)).toFixed(0)}%</div>
            <div className="text-[10px] text-white/30">{fmt(Math.max(0, (performance?.currentBalance || 150000) - 150000))} / $9,000</div>
          </div>

          {/* Win Rate */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> Win Rate
            </div>
            <div className="text-xl font-bold">{(performance?.winRate || 0).toFixed(0)}%</div>
            <div className="text-[10px] text-white/30">{performance?.wins || 0}W / {performance?.losses || 0}L</div>
          </div>

          {/* Trailing Drawdown */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Drawdown Used
            </div>
            <div className={`text-xl font-bold ${(performance?.drawdownUsed || 0) > 3000 ? 'text-red-400' : (performance?.drawdownUsed || 0) > 2000 ? 'text-amber-400' : 'text-white'}`}>
              {fmt(performance?.drawdownUsed || 0)}
            </div>
            <div className="text-[10px] text-white/30">of $5,000 max</div>
          </div>

          {/* Remaining to qualify */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="text-white/40 text-xs mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> To Qualify
            </div>
            <div className="text-xl font-bold text-amber-400">
              {fmt(Math.max(0, 9000 - ((performance?.currentBalance || 150000) - 150000)))}
            </div>
            <div className="text-[10px] text-white/30">profit needed</div>
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
              <button
                onClick={() => setActiveTab('paper')}
                className={`flex-1 py-2 rounded text-sm font-medium ${
                  activeTab === 'paper' ? 'bg-amber-500/20 text-amber-400' : 'text-white/50'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" /> Paper
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
            {/* PAPER TRADING PANEL */}
            {/* ========================================================== */}
            {activeTab === 'paper' && (
              <div className="bg-white/[0.02] border border-amber-500/20 rounded-xl p-4 space-y-4">
                {/* Header with controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${backtestRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                    <span className="text-sm font-medium text-amber-400">Paper Trading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetBacktest}
                      disabled={backtestLoading}
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                      title="Reset"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${backtestLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={toggleBacktest}
                      disabled={backtestLoading}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                        backtestRunning
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {backtestRunning ? 'STOP' : 'START'}
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="text-xs text-white/40 flex items-center justify-between">
                  <span>{backtestData?.status?.progress || '0%'}</span>
                  <span>{backtestData?.status?.processingSpeed || '0 candles/sec'}</span>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-black/30">
                    <div className="text-[10px] text-white/40 mb-0.5">Net P&L</div>
                    <div className={`text-lg font-bold ${
                      (backtestData?.performance?.netPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {(backtestData?.performance?.netPnL || 0) >= 0 ? '+' : ''}{fmt(backtestData?.performance?.netPnL || 0)}
                    </div>
                    <div className="text-[9px] text-white/30">
                      Gross: {fmt(backtestData?.performance?.grossPnL || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/30">
                    <div className="text-[10px] text-white/40 mb-0.5">Win Rate</div>
                    <div className="text-lg font-bold">{backtestData?.performance?.winRate || '0%'}</div>
                    <div className="text-[9px] text-white/30">
                      {backtestData?.performance?.wins || 0}W / {backtestData?.performance?.losses || 0}L
                    </div>
                  </div>
                </div>

                {/* Trading Costs (Realistic) */}
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40">Trading Costs (Realistic)</span>
                    <span className="text-xs font-medium text-red-400">-${backtestData?.tradingCosts?.total || '0.00'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <div>
                      <span className="text-white/30">Comm: </span>
                      <span className="text-white/60">${backtestData?.tradingCosts?.breakdown?.commissions || '0'}</span>
                    </div>
                    <div>
                      <span className="text-white/30">Fees: </span>
                      <span className="text-white/60">${backtestData?.tradingCosts?.breakdown?.exchangeFees || '0'}</span>
                    </div>
                    <div>
                      <span className="text-white/30">Slip: </span>
                      <span className="text-white/60">${backtestData?.tradingCosts?.breakdown?.slippage || '0'}</span>
                    </div>
                  </div>
                </div>

                {/* ML Accuracy */}
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40">ML Accuracy</span>
                    <span className="text-xs font-medium text-blue-400">{backtestData?.mlAccuracy?.overall || '0%'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <div>
                      <span className="text-white/30">High: </span>
                      <span className="text-emerald-400">{backtestData?.mlAccuracy?.byConfidence?.high || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30">Med: </span>
                      <span className="text-amber-400">{backtestData?.mlAccuracy?.byConfidence?.medium || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30">Low: </span>
                      <span className="text-red-400">{backtestData?.mlAccuracy?.byConfidence?.low || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Latency Simulation */}
                <div className="flex items-center justify-between text-[10px] text-white/30 px-1">
                  <span>Avg Latency: {backtestData?.latencyStats?.avgLatencyMs || 'N/A'}</span>
                  <span>Max: {backtestData?.latencyStats?.maxLatencyMs || 'N/A'}</span>
                </div>

                {/* Top Strategies */}
                {backtestData?.strategies?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/40 mb-2">Top Strategies</div>
                    <div className="space-y-1">
                      {backtestData.strategies.slice(0, 3).map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-black/30">
                          <span className="text-white/60">{s.name}</span>
                          <div className="flex items-center gap-3">
                            <span className={s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {s.pnl >= 0 ? '+' : ''}{fmt(s.pnl)}
                            </span>
                            <span className="text-white/30">{s.winRate?.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="text-[9px] text-white/20 text-center pt-2 border-t border-white/5">
                  Runs 24/7 on historical data with realistic costs<br/>
                  Matches live trading 1:1 (fees, slippage, latency)
                </div>
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
