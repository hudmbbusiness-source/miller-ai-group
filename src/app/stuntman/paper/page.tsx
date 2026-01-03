// @ts-nocheck
// v5 API fix - deployed 2026-01-02
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  Pause,
  Square,
  DollarSign,
  Target,
  BarChart2,
  Activity,
  Zap,
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Layers,
  Cpu,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Timer,
  Wallet,
  TrendingUp as TrendUp,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface BacktestPerformance {
  startBalance: number
  currentBalance: number
  grossPnL: number
  grossPnLPercent: string
  totalCosts: number
  netPnL: number
  netPnLPercent: string
  trades: number
  wins: number
  losses: number
  winRate: string
  maxDrawdown: number
  maxDrawdownPercent: string
  profitFactor: string
}

interface TradingCosts {
  total: string
  breakdown: {
    commissions: string
    exchangeFees: string
    slippage: string
  }
  avgCostPerTrade: string
  costAsPercentOfGross: string
}

interface MLAccuracy {
  overall: string
  totalPredictions: number
  correctPredictions: number
  byConfidence: {
    high: string
    medium: string
    low: string
  }
}

interface LatencyStats {
  avgLatencyMs: string
  maxLatencyMs: string
  minLatencyMs: string
}

interface Strategy {
  name: string
  trades: number
  wins: number
  pnl: number
  winRate: number
  avgPnL: number
}

interface BacktestTrade {
  id: string
  timestamp: number
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  rawEntryPrice: number
  rawExitPrice: number
  contracts: number
  grossPnL: number
  costs: {
    commission: number
    exchangeFees: number
    slippage: number
    totalCosts: number
  }
  netPnL: number
  pnlPercent: number
  holdingTime: number
  latencyMs: number
  entryReason: string
  exitReason: string
  confluenceScore: number
  mlConfidence: number
  vpinAtEntry: number
}

interface BacktestStatus {
  running: boolean
  startTime: number | null
  candlesProcessed: number
  totalCandles: number
  progress: string
  processingSpeed: string
}

interface BacktestData {
  success: boolean
  status: BacktestStatus
  performance: BacktestPerformance
  tradingCosts: TradingCosts
  latencyStats: LatencyStats
  mlAccuracy: MLAccuracy
  strategies: Strategy[]
  recentTrades: BacktestTrade[]
  position: any
  config?: {
    speed: number | 'MAX'
    inverseMode: boolean
    autoInverse: boolean
    currentlyInversed: boolean
  }
  dataSource?: {
    provider: string
    candlesLoaded: {
      '1m': number
      '5m': number
      '15m': number
    }
  }
  chartData?: ChartData
}

// =============================================================================
// SIMULATION CHART (lightweight-charts v5 API)
// =============================================================================

interface ChartData {
  candles: Array<{
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  trades: Array<{
    time: number
    position: string
    color: string
    shape: string
    text: string
  }>
  currentPosition: {
    entryTime: number
    entryPrice: number
    direction: 'LONG' | 'SHORT'
    stopLoss: number
    takeProfit: number
  } | null
  currentIndex: number
  currentPrice: number
  currentTime: number
}

function HistoricalChart({ chartData, isRunning }: { chartData: ChartData | undefined, isRunning: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)

  // Initialize chart with lightweight-charts v5 API
  useEffect(() => {
    if (!containerRef.current) return

    // Dynamically import lightweight-charts v5
    import('lightweight-charts').then((LightweightCharts) => {
      if (!containerRef.current || chartRef.current) return

      const { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } = LightweightCharts

      const containerHeight = containerRef.current.clientHeight || 500
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerHeight,
        layout: {
          background: { color: '#000000' },
          textColor: '#999999',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
      })

      // v5 API: use addSeries with series type
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      })

      // Volume series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      })

      chartRef.current = chart
      candleSeriesRef.current = candleSeries
      volumeSeriesRef.current = volumeSeries

      // Handle resize
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
    }).catch(err => {
      console.error('Failed to load chart:', err)
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        candleSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
  }, [])

  // Update chart data
  useEffect(() => {
    if (!chartData?.candles || !candleSeriesRef.current) return

    // Update candlestick data
    const candleData = chartData.candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candleSeriesRef.current.setData(candleData)

    // Update volume data
    if (volumeSeriesRef.current) {
      const volumeData = chartData.candles.map(c => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }))
      volumeSeriesRef.current.setData(volumeData)
    }

    // Note: Markers and price lines removed due to v5 API incompatibility
    // Trades are shown in the trade history panel instead

    // Auto-scroll to latest candle if running
    if (isRunning && chartRef.current) {
      chartRef.current.timeScale().scrollToRealTime()
    }
  }, [chartData, isRunning])

  return (
    <div className="relative h-full">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {/* Overlay for current price */}
      {chartData?.currentPrice ? (
        <div className="absolute top-2 right-2 bg-black/80 px-3 py-1.5 rounded-lg border border-amber-500/30">
          <div className="text-xs text-amber-400 mb-0.5 font-medium">ES FUTURES (REAL)</div>
          <div className="text-lg font-bold text-white">
            {chartData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-white/50">
            Candle {chartData.currentIndex?.toLocaleString()} • {isRunning ? 'Processing...' : 'Paused'}
          </div>
        </div>
      ) : (
        <div className="absolute top-2 right-2 bg-black/80 px-3 py-1.5 rounded-lg border border-white/10">
          <div className="text-xs text-white/40">Click START to begin simulation</div>
        </div>
      )}
      {/* Status indicator */}
      <div className={`absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isRunning ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
        <span className={`text-xs font-medium ${isRunning ? 'text-amber-400' : 'text-white/50'}`}>
          {isRunning ? 'SIMULATING' : 'PAUSED'}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'white',
  trend
}: {
  icon: any
  label: string
  value: string | number
  subValue?: string
  color?: 'white' | 'green' | 'red' | 'amber' | 'blue'
  trend?: 'up' | 'down'
}) {
  const colorClasses = {
    white: 'text-white',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  }

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        {trend && (
          <div className={trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      {subValue && <div className="text-[10px] text-white/30 mt-1">{subValue}</div>}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PaperTradingPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BacktestData | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [instrument] = useState<'ES' | 'NQ'>('ES')

  // Speed & Inverse controls
  const [speed, setSpeed] = useState<1 | 5 | 10 | 50 | 100 | 'MAX'>(1)
  const [inverseMode, setInverseMode] = useState(false)
  const [autoInverse, setAutoInverse] = useState(false)

  // ===========================================================================
  // FETCH DATA
  // ===========================================================================

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/backtest-engine')
      const result = await res.json()
      if (result.success) {
        setData(result)
        // Sync config state
        if (result.config) {
          setSpeed(result.config.speed || 1)
          setInverseMode(result.config.inverseMode || false)
          setAutoInverse(result.config.autoInverse || false)
        }
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [])

  // Dynamic polling - faster when simulation is running
  useEffect(() => {
    const pollInterval = data?.status?.running ? 400 : 2000  // 400ms when running for smooth updates
    const poll = setInterval(fetchData, pollInterval)
    return () => clearInterval(poll)
  }, [fetchData, data?.status?.running])

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  const handleAction = async (action: 'start' | 'stop' | 'reset') => {
    setActionLoading(true)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, days: 7 }),
      })
      await fetchData()
    } catch (e) {
      console.error('Action error:', e)
    }
    setActionLoading(false)
  }

  // Set speed
  const handleSpeed = async (newSpeed: 1 | 5 | 10 | 50 | 100 | 'MAX') => {
    setSpeed(newSpeed)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'speed', speed: newSpeed }),
      })
    } catch (e) {
      console.error('Speed error:', e)
    }
  }

  // Toggle inverse mode
  const handleInverse = async () => {
    const newValue = !inverseMode
    setInverseMode(newValue)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inverse', enabled: newValue }),
      })
    } catch (e) {
      console.error('Inverse error:', e)
    }
  }

  // Toggle auto-inverse
  const handleAutoInverse = async () => {
    const newValue = !autoInverse
    setAutoInverse(newValue)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-inverse', enabled: newValue }),
      })
    } catch (e) {
      console.error('Auto-inverse error:', e)
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const fmt = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)

  const fmtDecimal = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n)

  const fmtPrice = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  // ===========================================================================
  // LOADING
  // ===========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading Paper Trading System...</p>
        </div>
      </div>
    )
  }

  const perf = data?.performance
  const costs = data?.tradingCosts
  const ml = data?.mlAccuracy
  const latency = data?.latencyStats
  const status = data?.status
  const strategies = data?.strategies || []
  const trades = data?.recentTrades || []

  const isRunning = status?.running || false
  const netPnL = perf?.netPnL || 0
  const grossPnL = perf?.grossPnL || 0

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===================================================================== */}
      {/* HEADER */}
      {/* ===================================================================== */}
      <header className="border-b border-white/5 bg-black sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/stuntman" className="text-white/40 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Live Trading</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-amber-400" />
              <span className="font-bold text-lg">Paper Trading</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SIMULATION
              </span>
            </div>
          </div>

          {/* Center - Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
              <span className="text-xs font-medium">{isRunning ? 'RUNNING' : 'STOPPED'}</span>
            </div>
            {isRunning && (
              <>
                <div className="text-xs text-white/40">
                  Progress: <span className="text-white font-medium">{status?.progress || '0%'}</span>
                </div>
                <div className="text-xs text-white/40">
                  Speed: <span className="text-white font-medium">{status?.processingSpeed || '0/sec'}</span>
                </div>
              </>
            )}
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('reset')}
              disabled={actionLoading}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              Reset
            </button>
            <button
              onClick={() => handleAction(isRunning ? 'stop' : 'start')}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
              }`}
            >
              {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'STOP' : 'START'}
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* CONTROL BAR - Speed & Inverse Controls */}
      {/* ===================================================================== */}
      <div className="border-b border-white/5 bg-black/50 backdrop-blur">
        <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 mr-2">SPEED:</span>
            {([1, 5, 10, 50, 100, 'MAX'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  speed === s
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s === 'MAX' ? '🚀 MAX' : `${s}x`}
              </button>
            ))}
          </div>

          {/* Inverse Controls */}
          <div className="flex items-center gap-4">
            {/* Manual Inverse Toggle */}
            <button
              onClick={handleInverse}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                inverseMode
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">🔄</span>
              INVERSE {inverseMode ? 'ON' : 'OFF'}
            </button>

            {/* Auto-Inverse Toggle */}
            <button
              onClick={handleAutoInverse}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                autoInverse
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <Brain className="w-4 h-4" />
              AUTO-INVERSE {autoInverse ? 'ON' : 'OFF'}
            </button>

            {/* Currently Inversed Indicator */}
            {data?.config?.currentlyInversed && (
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-bold animate-pulse">
                ⚡ SIGNALS INVERSED
              </div>
            )}
          </div>

          {/* Data Source */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span>Data:</span>
            <span className="text-white/50">{data?.dataSource?.provider || 'Loading...'}</span>
            <span className="text-white/20">|</span>
            <span className="text-amber-400">{data?.dataSource?.candlesLoaded?.['1m'] || 0} candles</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN CONTENT */}
      {/* ===================================================================== */}
      <main className="max-w-[1920px] mx-auto p-4">
        {/* =================================================================== */}
        {/* TOP STATS ROW */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          <StatCard
            icon={Wallet}
            label="Balance"
            value={fmt(perf?.currentBalance || 150000)}
            subValue={`Started: ${fmt(perf?.startBalance || 150000)}`}
            color="white"
          />
          <StatCard
            icon={DollarSign}
            label="Net P&L"
            value={`${netPnL >= 0 ? '+' : ''}${fmt(netPnL)}`}
            subValue={perf?.netPnLPercent || '0%'}
            color={netPnL >= 0 ? 'green' : 'red'}
            trend={netPnL >= 0 ? 'up' : 'down'}
          />
          <StatCard
            icon={TrendUp}
            label="Gross P&L"
            value={`${grossPnL >= 0 ? '+' : ''}${fmt(grossPnL)}`}
            subValue={perf?.grossPnLPercent || '0%'}
            color={grossPnL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            icon={AlertTriangle}
            label="Total Costs"
            value={`-$${costs?.total || '0.00'}`}
            subValue={`${costs?.costAsPercentOfGross || '0%'} of gross`}
            color="red"
          />
          <StatCard
            icon={BarChart2}
            label="Win Rate"
            value={perf?.winRate || '0%'}
            subValue={`${perf?.wins || 0}W / ${perf?.losses || 0}L`}
            color={(parseFloat(perf?.winRate || '0') >= 50) ? 'green' : 'amber'}
          />
          <StatCard
            icon={Target}
            label="Profit Factor"
            value={perf?.profitFactor || 'N/A'}
            subValue={`${perf?.trades || 0} trades`}
          />
          <StatCard
            icon={TrendingDown}
            label="Max Drawdown"
            value={fmt(perf?.maxDrawdown || 0)}
            subValue={perf?.maxDrawdownPercent || '0%'}
            color="red"
          />
          <StatCard
            icon={Brain}
            label="ML Accuracy"
            value={ml?.overall || '0%'}
            subValue={`${ml?.correctPredictions || 0}/${ml?.totalPredictions || 0}`}
            color="blue"
          />
        </div>

        {/* =================================================================== */}
        {/* MAIN GRID */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ================================================================= */}
          {/* SIMULATION CHART (3 cols) - PAPER MODE ONLY */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 space-y-4">
            {/* Full Width Simulation Chart */}
            <div className="bg-white/[0.02] border border-amber-500/30 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                  <span className="text-sm font-bold text-amber-400">PAPER TRADING SIMULATION</span>
                  <span className="text-xs text-white/40">|</span>
                  <span className="text-xs text-white/50">Historical SPY Data → ES Prices</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/40">
                    Candle {data?.chartData?.currentIndex?.toLocaleString() || 0} / {data?.status?.totalCandles?.toLocaleString() || 0}
                  </span>
                  <span className={`text-xs font-medium ${isRunning ? 'text-amber-400' : 'text-white/40'}`}>
                    {isRunning ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>
              </div>
              <div className="h-[500px]">
                <HistoricalChart chartData={data?.chartData} isRunning={isRunning} />
              </div>
            </div>

            {/* Bottom Row - Strategies & Trade History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Strategy Performance */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Strategy Performance
                  </h3>
                  <span className="text-xs text-white/40">{strategies.length} strategies</span>
                </div>
                {strategies.length === 0 ? (
                  <div className="text-center text-white/30 py-8">
                    Start backtesting to see strategy performance
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {strategies.map((s, i) => (
                      <div key={i} className="p-3 rounded-lg bg-black/30 hover:bg-black/50 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className={`font-bold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {s.pnl >= 0 ? '+' : ''}{fmt(s.pnl)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{s.trades} trades</span>
                          <span>{s.winRate?.toFixed(0)}% win rate</span>
                          <span>Avg: {fmtDecimal(s.avgPnL || 0)}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${s.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, s.winRate || 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trade History */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-amber-400" />
                    Recent Trades
                  </h3>
                  <span className="text-xs text-white/40">{trades.length} trades</span>
                </div>
                {trades.length === 0 ? (
                  <div className="text-center text-white/30 py-8">
                    No trades yet - start backtesting
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {trades.map((t, i) => (
                      <div key={i} className="p-3 rounded-lg bg-black/30 hover:bg-black/50 transition">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {t.direction}
                            </span>
                            <span className="text-xs text-white/60">{t.contracts}x</span>
                          </div>
                          <span className={`font-bold text-sm ${t.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.netPnL >= 0 ? '+' : ''}{fmtDecimal(t.netPnL)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/40">
                          <span>{fmtPrice(t.entryPrice)} → {fmtPrice(t.exitPrice)}</span>
                          <span>{t.exitReason}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/30 mt-1">
                          <span>Gross: {fmtDecimal(t.grossPnL)} | Costs: -{fmtDecimal(t.costs?.totalCosts || 0)}</span>
                          <span>{t.latencyMs?.toFixed(0)}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT SIDEBAR */}
          {/* ================================================================= */}
          <div className="space-y-4">
            {/* Trading Costs Breakdown */}
            <div className="bg-white/[0.02] border border-red-500/20 rounded-xl p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-400" />
                Trading Costs (Realistic)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                  <span className="text-sm text-white/60">Commissions</span>
                  <span className="font-medium text-red-400">-${costs?.breakdown?.commissions || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                  <span className="text-sm text-white/60">Exchange Fees</span>
                  <span className="font-medium text-red-400">-${costs?.breakdown?.exchangeFees || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30">
                  <span className="text-sm text-white/60">Slippage</span>
                  <span className="font-medium text-red-400">-${costs?.breakdown?.slippage || '0.00'}</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Costs</span>
                    <span className="font-bold text-lg text-red-400">-${costs?.total || '0.00'}</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">
                    Avg per trade: ${costs?.avgCostPerTrade || '0.00'}
                  </div>
                </div>
              </div>
            </div>

            {/* ML Accuracy Breakdown */}
            <div className="bg-white/[0.02] border border-blue-500/20 rounded-xl p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                ML Signal Accuracy
              </h3>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-blue-400">{ml?.overall || '0%'}</div>
                <div className="text-xs text-white/40">Overall Accuracy</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-black/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-white/60">High Confidence (&gt;80%)</span>
                  </div>
                  <span className="font-medium text-emerald-400">{ml?.byConfidence?.high || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-white/60">Medium (60-80%)</span>
                  </div>
                  <span className="font-medium text-amber-400">{ml?.byConfidence?.medium || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-black/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-white/60">Low (&lt;60%)</span>
                  </div>
                  <span className="font-medium text-red-400">{ml?.byConfidence?.low || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Latency Simulation */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                Latency Simulation
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 rounded-lg bg-black/30">
                  <div className="text-lg font-bold text-white">{latency?.avgLatencyMs || 'N/A'}</div>
                  <div className="text-[10px] text-white/40">Average</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-black/30">
                  <div className="text-lg font-bold text-amber-400">{latency?.maxLatencyMs || 'N/A'}</div>
                  <div className="text-[10px] text-white/40">Max</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-black/30">
                  <div className="text-lg font-bold text-emerald-400">{latency?.minLatencyMs || 'N/A'}</div>
                  <div className="text-[10px] text-white/40">Min</div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-white/40" />
                Simulation Engine
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-white/40">
                  <span>Candles Processed</span>
                  <span className="text-white">{status?.candlesProcessed?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between text-white/40">
                  <span>Total Available</span>
                  <span className="text-white">{status?.totalCandles?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between text-white/40">
                  <span>Processing Speed</span>
                  <span className="text-white">{status?.processingSpeed || '0/sec'}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30 text-center">
                Matches live trading 1:1<br/>
                Real fees • Real slippage • Real latency
              </div>
            </div>

            {/* Navigation */}
            <Link
              href="/stuntman"
              className="block p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-emerald-400">Ready for Live?</div>
                  <div className="text-xs text-white/40">Go to Live Trading Dashboard</div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400" />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
