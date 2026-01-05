// @ts-nocheck
// BUILD: 2026-01-04-dual-mode
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
  Radio,
  History,
  Database,
  Save,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

type PaperMode = 'LIVE' | 'HISTORICAL'

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

// Live trading data structure
interface LiveData {
  success: boolean
  enabled: boolean
  timestamp: string
  currentPrice: number
  position: {
    direction: 'LONG' | 'SHORT' | null
    entryPrice: number
    contracts: number
    unrealizedPnL: number
  } | null
  todayStats: {
    trades: number
    wins: number
    losses: number
    winRate: string
    netPnL: number
    grossPnL: number
  }
  signal: {
    direction: 'LONG' | 'SHORT' | 'FLAT'
    confidence: number
    pattern: string
    regime: string
  } | null
  recentTrades: Array<{
    timestamp: string
    direction: string
    entryPrice: number
    exitPrice: number
    netPnL: number
    exitReason: string
  }>
  marketStatus: string
  dataLogged?: number
}

// =============================================================================
// SIMULATION CHART (lightweight-charts v5 API)
// =============================================================================

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
          <div className="text-xs text-amber-400 mb-0.5 font-medium">ES FUTURES (HISTORICAL)</div>
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
  // Mode selection
  const [mode, setMode] = useState<PaperMode>('LIVE')

  // Historical mode state
  const [histLoading, setHistLoading] = useState(true)
  const [histData, setHistData] = useState<BacktestData | null>(null)
  const [histActionLoading, setHistActionLoading] = useState(false)
  const [speed, setSpeed] = useState<1 | 5 | 10 | 50 | 100 | 'MAX'>(1)
  const [inverseMode, setInverseMode] = useState(false)
  const [autoInverse, setAutoInverse] = useState(false)

  // Live mode state
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveData, setLiveData] = useState<LiveData | null>(null)
  const [liveEnabled, setLiveEnabled] = useState(false)
  const [dataLogging, setDataLogging] = useState(true)
  const [candlesLogged, setCandlesLogged] = useState(0)

  // ===========================================================================
  // HISTORICAL MODE - FETCH DATA
  // ===========================================================================

  const fetchHistData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/backtest-engine')
      const result = await res.json()
      if (result.success) {
        setHistData(result)
        if (result.config) {
          setSpeed(result.config.speed || 1)
          setInverseMode(result.config.inverseMode || false)
          setAutoInverse(result.config.autoInverse || false)
        }
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setHistLoading(false)
    }
  }, [])

  // ===========================================================================
  // LIVE MODE - FETCH DATA
  // ===========================================================================

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/live-adaptive')
      const result = await res.json()
      if (result.success !== false) {
        setLiveData(result)
        setLiveEnabled(result.enabled || false)
      }
    } catch (e) {
      console.error('Live fetch error:', e)
    } finally {
      setLiveLoading(false)
    }
  }, [])

  // ===========================================================================
  // DATA LOGGING - Log candles to Supabase for future backtesting
  // ===========================================================================

  const logCandles = useCallback(async (candles: any[]) => {
    if (!dataLogging || !candles || candles.length === 0) return

    try {
      const res = await fetch('/api/stuntman/data-logger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'candles', data: candles }),
      })
      const result = await res.json()
      if (result.success) {
        setCandlesLogged(prev => prev + result.saved)
      }
    } catch (e) {
      console.error('Data logging error:', e)
    }
  }, [dataLogging])

  // ===========================================================================
  // INITIAL FETCH & POLLING
  // ===========================================================================

  // Initial fetch based on mode
  useEffect(() => {
    if (mode === 'LIVE') {
      fetchLiveData()
    } else {
      fetchHistData()
    }
  }, [mode])

  // Polling for LIVE mode
  useEffect(() => {
    if (mode !== 'LIVE') return

    const poll = setInterval(() => {
      fetchLiveData()
    }, 3000) // Poll every 3 seconds for live data

    return () => clearInterval(poll)
  }, [mode, fetchLiveData])

  // Polling for HISTORICAL mode
  useEffect(() => {
    if (mode !== 'HISTORICAL') return

    const pollInterval = histData?.status?.running ? 400 : 2000
    const poll = setInterval(fetchHistData, pollInterval)
    return () => clearInterval(poll)
  }, [mode, fetchHistData, histData?.status?.running])

  // ===========================================================================
  // HISTORICAL MODE ACTIONS
  // ===========================================================================

  const handleHistAction = async (action: 'start' | 'stop' | 'reset') => {
    setHistActionLoading(true)
    try {
      await fetch('/api/stuntman/backtest-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, days: 7 }),
      })
      await fetchHistData()
    } catch (e) {
      console.error('Action error:', e)
    }
    setHistActionLoading(false)
  }

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
  // LIVE MODE ACTIONS
  // ===========================================================================

  const handleLiveToggle = async () => {
    try {
      const res = await fetch('/api/stuntman/live-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: liveEnabled ? 'stop' : 'start' }),
      })
      const result = await res.json()
      if (result.success !== false) {
        setLiveEnabled(!liveEnabled)
        await fetchLiveData()
      }
    } catch (e) {
      console.error('Live toggle error:', e)
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

  // ===========================================================================
  // LOADING
  // ===========================================================================

  const isLoading = mode === 'LIVE' ? liveLoading : histLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading {mode} Paper Trading...</p>
        </div>
      </div>
    )
  }

  // Extract data based on mode
  const perf = histData?.performance
  const costs = histData?.tradingCosts
  const ml = histData?.mlAccuracy
  const latency = histData?.latencyStats
  const status = histData?.status
  const strategies = histData?.strategies || []
  const histTrades = histData?.recentTrades || []
  const isHistRunning = status?.running || false

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
            </div>
          </div>

          {/* Center - MODE SELECTOR */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setMode('LIVE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                mode === 'LIVE'
                  ? 'bg-emerald-500 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-4 h-4" />
              LIVE PAPER
              {mode === 'LIVE' && liveEnabled && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setMode('HISTORICAL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                mode === 'HISTORICAL'
                  ? 'bg-amber-500 text-black'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4" />
              HISTORICAL PAPER
              {mode === 'HISTORICAL' && isHistRunning && (
                <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              )}
            </button>
          </div>

          {/* Right - Data Logging Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">
                {candlesLogged.toLocaleString()} candles logged
              </span>
            </div>
            <button
              onClick={() => setDataLogging(!dataLogging)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                dataLogging
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border border-white/10 text-white/40'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {dataLogging ? 'LOGGING ON' : 'LOGGING OFF'}
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MODE-SPECIFIC CONTENT */}
      {/* ===================================================================== */}

      {mode === 'LIVE' ? (
        /* ================================================================= */
        /* LIVE PAPER MODE */
        /* ================================================================= */
        <div>
          {/* Live Control Bar */}
          <div className="border-b border-white/5 bg-emerald-500/5 backdrop-blur">
            <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  liveEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${liveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                  <span className="text-sm font-bold">{liveEnabled ? 'LIVE TRADING ACTIVE' : 'PAUSED'}</span>
                </div>

                <div className="text-xs text-white/40">
                  Market: <span className={`font-medium ${
                    liveData?.marketStatus === 'OPEN' ? 'text-emerald-400' : 'text-red-400'
                  }`}>{liveData?.marketStatus || 'CHECKING...'}</span>
                </div>

                {liveData?.currentPrice && (
                  <div className="text-xs text-white/40">
                    ES Price: <span className="text-white font-bold">{fmtPrice(liveData.currentPrice)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleLiveToggle}
                className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  liveEnabled
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                }`}
              >
                {liveEnabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {liveEnabled ? 'STOP LIVE' : 'START LIVE'}
              </button>
            </div>
          </div>

          {/* Live Stats */}
          <main className="max-w-[1920px] mx-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
              <StatCard
                icon={Wallet}
                label="Today's P&L"
                value={`${(liveData?.todayStats?.netPnL || 0) >= 0 ? '+' : ''}${fmt(liveData?.todayStats?.netPnL || 0)}`}
                subValue={`${liveData?.todayStats?.trades || 0} trades today`}
                color={(liveData?.todayStats?.netPnL || 0) >= 0 ? 'green' : 'red'}
                trend={(liveData?.todayStats?.netPnL || 0) >= 0 ? 'up' : 'down'}
              />
              <StatCard
                icon={BarChart2}
                label="Win Rate"
                value={liveData?.todayStats?.winRate || '0%'}
                subValue={`${liveData?.todayStats?.wins || 0}W / ${liveData?.todayStats?.losses || 0}L`}
                color="amber"
              />
              <StatCard
                icon={Activity}
                label="Current Position"
                value={liveData?.position?.direction || 'FLAT'}
                subValue={liveData?.position ? `Entry: ${fmtPrice(liveData.position.entryPrice)}` : 'No position'}
                color={liveData?.position?.direction === 'LONG' ? 'green' : liveData?.position?.direction === 'SHORT' ? 'red' : 'white'}
              />
              <StatCard
                icon={Target}
                label="Signal"
                value={liveData?.signal?.direction || 'SCANNING...'}
                subValue={liveData?.signal?.pattern || 'Analyzing market'}
                color={liveData?.signal?.direction === 'LONG' ? 'green' : liveData?.signal?.direction === 'SHORT' ? 'red' : 'amber'}
              />
              <StatCard
                icon={Brain}
                label="Confidence"
                value={liveData?.signal?.confidence ? `${(liveData.signal.confidence * 100).toFixed(0)}%` : 'N/A'}
                subValue={liveData?.signal?.regime || 'Unknown regime'}
                color="blue"
              />
              <StatCard
                icon={DollarSign}
                label="Unrealized P&L"
                value={liveData?.position?.unrealizedPnL ? fmtDecimal(liveData.position.unrealizedPnL) : '$0.00'}
                subValue={liveData?.position ? `${liveData.position.contracts} contracts` : 'No open position'}
                color={(liveData?.position?.unrealizedPnL || 0) >= 0 ? 'green' : 'red'}
              />
            </div>

            {/* Live Trading Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* TradingView Chart */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-emerald-500/30 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${liveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                    <span className="text-sm font-bold text-emerald-400">LIVE MARKET DATA</span>
                    <span className="text-xs text-white/40">ES Futures</span>
                  </div>
                  <span className="text-xs text-white/40">
                    Last update: {liveData?.timestamp ? new Date(liveData.timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="h-[500px]">
                  {/* TradingView Widget for Live */}
                  <iframe
                    src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_live&symbol=CME_MINI%3AES1%21&interval=5&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=000000&studies=[]&theme=dark&style=1&timezone=America%2FNew_York"
                    style={{ width: '100%', height: '100%' }}
                    frameBorder="0"
                    allowTransparency
                    scrolling="no"
                  />
                </div>
              </div>

              {/* Live Trades & Info */}
              <div className="space-y-4">
                {/* Recent Live Trades */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-emerald-400" />
                    Today's Trades
                  </h3>
                  {(liveData?.recentTrades?.length || 0) === 0 ? (
                    <div className="text-center text-white/30 py-8">
                      No trades yet today
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {liveData?.recentTrades?.map((t, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/30 hover:bg-black/50 transition">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {t.direction}
                              </span>
                            </div>
                            <span className={`font-bold text-sm ${t.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.netPnL >= 0 ? '+' : ''}{fmtDecimal(t.netPnL)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/40">
                            <span>{fmtPrice(t.entryPrice)} → {fmtPrice(t.exitPrice)}</span>
                            <span>{t.exitReason}</span>
                          </div>
                          <div className="text-[10px] text-white/30 mt-1">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Status */}
                <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Live System Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded bg-black/30">
                      <span className="text-sm text-white/60">Strategy</span>
                      <span className="font-medium text-emerald-400">STUNTMAN OG</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-black/30">
                      <span className="text-sm text-white/60">Mode</span>
                      <span className="font-medium text-amber-400">PAPER (NO REAL TRADES)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-black/30">
                      <span className="text-sm text-white/60">Data Logging</span>
                      <span className={`font-medium ${dataLogging ? 'text-emerald-400' : 'text-white/40'}`}>
                        {dataLogging ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-xs text-emerald-400 font-medium mb-1">💡 Live Paper Mode</div>
                    <div className="text-[10px] text-white/50">
                      Testing STUNTMAN OG with REAL market data. No actual trades executed.
                      All candles and signals are being saved for future backtesting.
                    </div>
                  </div>
                </div>

                {/* Navigation to Live Trading */}
                <Link
                  href="/stuntman"
                  className="block p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-emerald-400">Ready for Live?</div>
                      <div className="text-xs text-white/40">Go to Real Live Trading</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-400" />
                  </div>
                </Link>
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* ================================================================= */
        /* HISTORICAL PAPER MODE */
        /* ================================================================= */
        <div>
          {/* Historical Control Bar */}
          <div className="border-b border-white/5 bg-amber-500/5 backdrop-blur">
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

              {/* Status & Controls */}
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isHistRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isHistRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                  <span className="text-xs font-medium">{isHistRunning ? 'RUNNING' : 'STOPPED'}</span>
                </div>
                {isHistRunning && (
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleHistAction('reset')}
                  disabled={histActionLoading}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${histActionLoading ? 'animate-spin' : ''}`} />
                  Reset
                </button>
                <button
                  onClick={() => handleHistAction(isHistRunning ? 'stop' : 'start')}
                  disabled={histActionLoading}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition ${
                    isHistRunning
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  {isHistRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isHistRunning ? 'STOP' : 'START'}
                </button>
              </div>
            </div>
          </div>

          {/* Historical Stats & Content */}
          <main className="max-w-[1920px] mx-auto p-4">
            {/* Top Stats Row */}
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
                value={`${(perf?.netPnL || 0) >= 0 ? '+' : ''}${fmt(perf?.netPnL || 0)}`}
                subValue={perf?.netPnLPercent || '0%'}
                color={(perf?.netPnL || 0) >= 0 ? 'green' : 'red'}
                trend={(perf?.netPnL || 0) >= 0 ? 'up' : 'down'}
              />
              <StatCard
                icon={TrendUp}
                label="Gross P&L"
                value={`${(perf?.grossPnL || 0) >= 0 ? '+' : ''}${fmt(perf?.grossPnL || 0)}`}
                subValue={perf?.grossPnLPercent || '0%'}
                color={(perf?.grossPnL || 0) >= 0 ? 'green' : 'red'}
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

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Simulation Chart (3 cols) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white/[0.02] border border-amber-500/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between bg-amber-500/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isHistRunning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                      <span className="text-sm font-bold text-amber-400">HISTORICAL SIMULATION</span>
                      <span className="text-xs text-white/40">|</span>
                      <span className="text-xs text-white/50">Past Market Data → ES Prices</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-white/40">
                        Candle {histData?.chartData?.currentIndex?.toLocaleString() || 0} / {histData?.status?.totalCandles?.toLocaleString() || 0}
                      </span>
                      <span className={`text-xs font-medium ${isHistRunning ? 'text-amber-400' : 'text-white/40'}`}>
                        {isHistRunning ? 'RUNNING' : 'STOPPED'}
                      </span>
                    </div>
                  </div>
                  <div className="h-[500px]">
                    <HistoricalChart chartData={histData?.chartData} isRunning={isHistRunning} />
                  </div>
                </div>

                {/* Strategy & Trade History */}
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
                      <span className="text-xs text-white/40">{histTrades.length} trades</span>
                    </div>
                    {histTrades.length === 0 ? (
                      <div className="text-center text-white/30 py-8">
                        No trades yet - start backtesting
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {histTrades.map((t, i) => (
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

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Trading Costs */}
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

                {/* ML Accuracy */}
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
                        <span className="text-sm text-white/60">High (&gt;80%)</span>
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
                      <span>Data Source</span>
                      <span className="text-white">{histData?.dataSource?.provider || 'Yahoo Finance'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30 text-center">
                    STUNTMAN OG • 60.3% Win Rate<br/>
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
      )}
    </div>
  )
}
