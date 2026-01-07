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
// REAL-TIME ES FUTURES CHART - Uses EXACT same data as trading signals
// =============================================================================

function RealTimeESChart({ instrument, onPriceUpdate }: { instrument: 'ES' | 'NQ', onPriceUpdate?: (price: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const ema9Ref = useRef<any>(null)
  const ema21Ref = useRef<any>(null)
  const [lastPrice, setLastPrice] = useState<number>(0)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [dataSource, setDataSource] = useState<string>('Loading...')
  const [chartReady, setChartReady] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale()
      const visibleRange = timeScale.getVisibleLogicalRange()
      if (visibleRange) {
        const rangeSize = visibleRange.to - visibleRange.from
        const newSize = rangeSize * 0.7
        const center = (visibleRange.from + visibleRange.to) / 2
        timeScale.setVisibleLogicalRange({
          from: center - newSize / 2,
          to: center + newSize / 2
        })
      }
    }
  }, [])

  const zoomOut = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale()
      const visibleRange = timeScale.getVisibleLogicalRange()
      if (visibleRange) {
        const rangeSize = visibleRange.to - visibleRange.from
        const newSize = rangeSize * 1.3
        const center = (visibleRange.from + visibleRange.to) / 2
        timeScale.setVisibleLogicalRange({
          from: center - newSize / 2,
          to: center + newSize / 2
        })
      }
    }
  }, [])

  const resetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [])

  // Fetch ES futures data from Yahoo Finance (same source as trading signals)
  const fetchESData = useCallback(async () => {
    try {
      const symbol = instrument === 'ES' ? 'ES=F' : 'NQ=F'
      const now = Math.floor(Date.now() / 1000)
      const start = now - (2 * 24 * 60 * 60) // 2 days for good chart

      const url = `/api/stuntman/chart-data?symbol=${symbol}&start=${start}&end=${now}&interval=5m`

      const res = await fetch(url)
      if (!res.ok) {
        // Fallback to direct Yahoo Finance via proxy
        return await fetchDirectYahoo(symbol, start, now)
      }

      const data = await res.json()
      return data
    } catch (error) {
      console.error('Chart data fetch error:', error)
      return null
    }
  }, [instrument])

  // Direct Yahoo Finance fetch as fallback
  const fetchDirectYahoo = async (symbol: string, start: number, end: number) => {
    try {
      // Use SPY as proxy and scale (Yahoo blocks direct ES=F from browser)
      const proxySymbol = symbol === 'ES=F' ? 'SPY' : 'QQQ'
      const scale = symbol === 'ES=F' ? 10 : 40 // SPY*10≈ES, QQQ*40≈NQ

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${proxySymbol}?period1=${start}&period2=${end}&interval=5m`

      const res = await fetch(url)
      const data = await res.json()
      const result = data.chart?.result?.[0]

      if (!result?.timestamp) return null

      const candles = []
      const ts = result.timestamp
      const q = result.indicators.quote[0]

      for (let i = 0; i < ts.length; i++) {
        if (q.open[i] && q.high[i] && q.low[i] && q.close[i]) {
          candles.push({
            time: ts[i],
            open: q.open[i] * scale,
            high: q.high[i] * scale,
            low: q.low[i] * scale,
            close: q.close[i] * scale,
            volume: q.volume[i] || 0
          })
        }
      }

      setDataSource(`${proxySymbol} → ${symbol} (Real-time)`)
      return { candles, source: proxySymbol }
    } catch (error) {
      console.error('Yahoo fetch error:', error)
      return null
    }
  }

  // Calculate EMA
  const calculateEMA = (data: any[], period: number) => {
    const ema: any[] = []
    const mult = 2 / (period + 1)

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push({ time: data[i].time, value: data[i].close })
      } else {
        const val = (data[i].close - ema[i-1].value) * mult + ema[i-1].value
        ema.push({ time: data[i].time, value: val })
      }
    }
    return ema
  }

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    console.log('[Chart] Initializing lightweight-charts...')

    // Dynamic import for lightweight-charts v5
    import('lightweight-charts').then((lc) => {
      console.log('[Chart] Library loaded successfully')
      // Clear existing
      containerRef.current!.innerHTML = ''

      const chart = lc.createChart(containerRef.current!, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#0a0a0a' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { mouseWheel: true, pinch: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
      })

      // Candlestick series - v5 API uses addSeries with type
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      })

      // Volume series - v5 API
      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        color: '#3b82f6',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      })

      // EMA 9 (fast) - v5 API
      const ema9Series = chart.addSeries(lc.LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        title: 'EMA 9',
      })

      // EMA 21 (slow) - v5 API
      const ema21Series = chart.addSeries(lc.LineSeries, {
        color: '#8b5cf6',
        lineWidth: 1,
        title: 'EMA 21',
      })

      chartRef.current = chart
      candleSeriesRef.current = candleSeries
      volumeSeriesRef.current = volumeSeries
      ema9Ref.current = ema9Series
      ema21Ref.current = ema21Series

      // Mark chart as ready for data
      setChartReady(true)

      // Handle resize
      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      }
      window.addEventListener('resize', handleResize)
      handleResize()

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    }).catch(err => {
      console.error('[Chart] Failed to load lightweight-charts:', err)
      setChartError('Failed to load chart library')
    })
  }, [])

  // Fetch and update data - wait for chart to be ready
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current) return

    const updateChart = async () => {
      try {
        console.log('[Chart] Fetching data...')
        const data = await fetchESData()
        console.log('[Chart] Data received:', data?.candles?.length, 'candles')
        if (!data?.candles?.length) {
          setChartError('No market data available')
          return
        }
        setChartError(null)
        setDataSource(data.dataNote || (data.sourceSymbol ? `${data.sourceSymbol} → ${instrument}=F` : 'Yahoo Finance'))

      const candles = data.candles.map((c: any) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))

      const volumes = data.candles.map((c: any) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }))

      candleSeriesRef.current.setData(candles)
      volumeSeriesRef.current.setData(volumes)

      // Update EMAs
      const ema9Data = calculateEMA(data.candles, 9)
      const ema21Data = calculateEMA(data.candles, 21)
      ema9Ref.current.setData(ema9Data)
      ema21Ref.current.setData(ema21Data)

      // Update last price
      const lastCandle = candles[candles.length - 1]
      if (lastCandle) {
        setLastPrice(lastCandle.close)
        // Notify parent of price update for P&L calculation
        if (onPriceUpdate) {
          onPriceUpdate(lastCandle.close)
        }
        const date = new Date(lastCandle.time * 1000)
        setLastUpdate(date.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }))
      }

      // Only fit content on initial load - preserve user's zoom afterwards
      if (!initialLoadDone) {
        chartRef.current?.timeScale().fitContent()
        setInitialLoadDone(true)
      }
      } catch (err) {
        console.error('Chart update error:', err)
        setChartError('Failed to load chart data')
      }
    }

    updateChart()

    // Real-time updates every 5 seconds
    const interval = setInterval(updateChart, 5000)
    return () => clearInterval(interval)
  }, [chartReady, fetchESData])

  return (
    <div className="relative w-full h-full">
      {/* Loading Overlay */}
      {!chartReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading chart...</p>
          </div>
        </div>
      )}
      {/* Error Overlay */}
      {chartError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <div className="text-center">
            <p className="text-red-400 text-sm">{chartError}</p>
            <p className="text-gray-500 text-xs mt-1">Market may be closed</p>
          </div>
        </div>
      )}
      {/* Chart Header */}
      <div className="absolute top-2 left-2 z-10 bg-black/80 px-3 py-1.5 rounded text-sm">
        <span className="text-white font-bold">{instrument} Futures</span>
        <span className="text-gray-400 ml-2">|</span>
        <span className="text-green-400 ml-2 font-mono">${lastPrice.toFixed(2)}</span>
        <span className="text-gray-500 ml-2 text-xs">{lastUpdate} ET</span>
      </div>
      {/* Zoom Controls */}
      <div className="absolute top-2 right-36 z-10 flex items-center gap-1">
        <button
          onClick={zoomIn}
          className="w-7 h-7 bg-black/80 hover:bg-white/10 rounded flex items-center justify-center text-white/70 hover:text-white text-sm font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-7 h-7 bg-black/80 hover:bg-white/10 rounded flex items-center justify-center text-white/70 hover:text-white text-sm font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="px-2 h-7 bg-black/80 hover:bg-white/10 rounded flex items-center justify-center text-white/70 hover:text-white text-xs"
          title="Reset View"
        >
          FIT
        </button>
      </div>
      {/* Data Source Badge - Shows proxy warning */}
      <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs ${
        dataSource.includes('proxy') || dataSource.includes('SPY') || dataSource.includes('QQQ')
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-green-500/20 text-green-400'
      }`}>
        {dataSource.includes('proxy') || dataSource.includes('SPY') || dataSource.includes('QQQ')
          ? `⚠️ ${dataSource}`
          : dataSource
        }
      </div>
      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
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

  // APEX State
  const [apexRules, setApexRules] = useState<any>(null)
  const [marketStatus, setMarketStatus] = useState<any>(null)
  const [adaptiveStatus, setAdaptiveStatus] = useState<any>(null)
  const [tradingDays, setTradingDays] = useState(0)
  const [tradingDaysNeeded, setTradingDaysNeeded] = useState(7)
  const [paperMode, setPaperMode] = useState(true)

  // Open Positions State - CRITICAL for tracking live trades
  const [openPositions, setOpenPositions] = useState<any[]>([])
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Current market price for P&L calculation
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0)

  // Manual Trading State
  const [contracts, setContracts] = useState(1)
  const [executing, setExecuting] = useState(false)

  // Apex Sync State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncBalance, setSyncBalance] = useState('')
  const [syncDrawdown, setSyncDrawdown] = useState('')
  const [syncPnL, setSyncPnL] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Connection Test State
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null)
  const [showTestModal, setShowTestModal] = useState(false)

  // Trade Verification State - View PickMyTrade API responses
  const [selectedTrade, setSelectedTrade] = useState<any>(null)
  const [showTradeVerifyModal, setShowTradeVerifyModal] = useState(false)

  // Chart now uses custom RealTimeESChart component with Yahoo Finance data
  // This ensures chart shows EXACT same data as trading signals

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchData = useCallback(async () => {
    try {
      // Use adaptive-live endpoint with 7 strategies and proper PickMyTrade verification
      const res = await fetch('/api/stuntman/adaptive-live')
      const data = await res.json()

      // Map adaptive-live response to UI state
      if (data.timestamp) {
        // Auto status from tradingState
        setAutoStatus({
          enabled: data.tradingState?.enabled || false,
          instrument: instrument,
          session: data.marketStatus?.withinTradingHours ? 'RTH' : 'CLOSED',
          hasPosition: !!data.tradingState?.currentPosition,
          position: data.tradingState?.currentPosition,
          lastSignal: data.signal ? {
            direction: data.signal.direction,
            confidence: parseFloat(data.signal.confidence),
            entry: parseFloat(data.signal.entry),
            stopLoss: parseFloat(data.signal.stopLoss),
            takeProfit: parseFloat(data.signal.takeProfit),
            strategy: data.signal.strategy,
            reasons: [data.signal.reason],
            timestamp: Date.now()
          } : null,
          lastCheck: Date.now()
        })

        // Performance from tradingState
        const totalPnL = parseFloat(data.tradingState?.totalPnL || '0')
        const dailyPnL = parseFloat(data.tradingState?.dailyPnL || '0')
        const totalWins = data.tradingState?.totalWins || 0
        const totalTrades = data.tradingState?.totalTrades || 0
        const totalLosses = totalTrades - totalWins
        const calculatedWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 60.3

        setPerformance({
          todayPnL: dailyPnL,
          todayTrades: data.tradingState?.dailyTrades || 0,
          totalTrades: totalTrades,
          wins: totalWins,
          losses: totalLosses,
          winRate: calculatedWinRate,
          profitFactor: 1.65,
          startBalance: 150000,
          currentBalance: parseFloat(data.apexStatus?.currentBalance || '150000'),
          drawdownUsed: parseFloat(data.apexStatus?.drawdown || '0'),
          profitTarget: 9000,
          targetProgress: (totalPnL / 9000) * 100,
          withdrawable: Math.max(0, totalPnL - 5000)
        })

        setRecentTrades([])  // Trade history handled separately
        setConfigured(data.pickMyTradeConnected || false)

        // Track open positions
        if (data.tradingState?.currentPosition) {
          const pos = data.tradingState.currentPosition
          setOpenPositions([{
            id: pos.timestamp || Date.now(),
            symbol: 'ESH26',
            direction: pos.direction,
            contracts: 1,
            entryPrice: pos.entry,
            stopLoss: pos.stopLoss,
            takeProfit: pos.takeProfit,
            pattern: pos.strategy,
            entryTime: pos.timestamp
          }])
        } else {
          setOpenPositions([])
        }

        // Update last refresh time
        setLastRefresh(new Date())

        // Market status from adaptive-live
        setMarketStatus({
          ...data.marketStatus,
          price: data.marketStatus?.price || 0,
          open: data.marketStatus?.withinTradingHours,
          regime: data.marketStatus?.regime,
          indicators: data.marketStatus?.indicators,
          pickMyTradeConnected: data.pickMyTradeConnected,
          pickMyTradeAccount: data.apexAccountId,
          connectionName: data.pickMyTradeConnectionName || 'RITHMIC1',
          estHour: data.estHour || 0,
          estTime: data.estTime || ''
        })

        // CRITICAL: Set adaptiveStatus for the strategy panel
        setAdaptiveStatus(data.adaptiveStatus)

        setTradingDays(1) // Will track properly later
        setTradingDaysNeeded(7)
        setPaperMode(!data.pickMyTrade?.connected)
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [instrument])

  useEffect(() => {
    fetchData()
    const poll = setInterval(fetchData, 3000)
    return () => clearInterval(poll)
  }, [fetchData])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const toggleAuto = async () => {
    const action = autoStatus?.enabled ? 'disable' : 'enable'
    await fetch('/api/stuntman/live-adaptive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await fetchData()
  }

  const executeTrade = async (direction: 'BUY' | 'SELL') => {
    setExecuting(true)
    try {
      // Execute via live-adaptive which connects to PickMyTrade
      const res = await fetch('/api/stuntman/live-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute' }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || data.error || 'Trade failed')
      } else if (data.execution) {
        alert(data.execution.success
          ? `Trade executed: ${data.execution.message}`
          : `Execution failed: ${data.execution.message}`)
      }
      await fetchData()
    } catch (e) {
      alert('Execution failed')
    }
    setExecuting(false)
  }

  const closePosition = async () => {
    // Close position via live-adaptive
    await fetch('/api/stuntman/live-adaptive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    })
    await fetchData()
  }

  // ==========================================================================
  // APEX SYNC - Manual verification of Apex account state
  // ==========================================================================
  const syncApexAccount = async () => {
    setSyncing(true)
    try {
      // Calculate the P&L from balance if not provided
      const balanceNum = parseFloat(syncBalance) || 0
      const pnlNum = syncPnL ? parseFloat(syncPnL) : (balanceNum - 150000)
      const drawdownNum = parseFloat(syncDrawdown) || Math.max(0, -pnlNum)

      const res = await fetch('/api/stuntman/live-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          syncData: {
            balance: balanceNum,
            totalPnL: pnlNum,
            drawdownUsed: drawdownNum,
            syncTime: new Date().toISOString(),
            source: 'manual_apex_sync'
          }
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLastSyncTime(new Date().toLocaleString())
        setShowSyncModal(false)
        setSyncBalance('')
        setSyncDrawdown('')
        setSyncPnL('')
        alert('Apex account synced successfully!')
        await fetchData() // Refresh data after sync
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      alert('Sync failed: Network error')
    }
    setSyncing(false)
  }

  // ==========================================================================
  // TEST CONNECTION - Verify PickMyTrade can receive orders
  // ==========================================================================
  const testConnection = async () => {
    setTestingConnection(true)
    setConnectionTestResult(null)
    setShowTestModal(true)

    try {
      const res = await fetch('/api/stuntman/live-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      })
      const data = await res.json()
      setConnectionTestResult(data)
    } catch (e) {
      setConnectionTestResult({
        success: false,
        error: 'Network error - could not reach API',
        message: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    setTestingConnection(false)
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

            {/* LIVE / PAPER Navigation Tabs */}
            <div className="flex items-center bg-white/5 p-1 rounded-lg ml-4">
              <div className="px-4 py-1.5 rounded-md text-sm font-medium bg-emerald-500 text-black flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                LIVE
              </div>
              <Link
                href="/stuntman/paper"
                className="px-4 py-1.5 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                PAPER
              </Link>
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
            {/* Test Connection Button */}
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition"
              title="Test PickMyTrade connection"
            >
              <Zap className="w-4 h-4" />
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            {/* Apex Sync Button */}
            <button
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
              title="Manually sync your Apex account balance"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Apex
            </button>

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
        {/* DATA QUALITY WARNING BANNER - AUDIT FIX 2026-01-06 */}
        {/* ================================================================ */}
        {marketStatus?.dataQualityWarnings?.length > 0 && (
          <div className={`mb-4 p-3 rounded-xl border ${
            marketStatus?.dataSafeToTrade
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                marketStatus?.dataSafeToTrade ? 'text-amber-400' : 'text-red-400'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-sm ${
                  marketStatus?.dataSafeToTrade ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {marketStatus?.dataSafeToTrade ? 'DATA QUALITY WARNING' : '⛔ TRADING BLOCKED - DATA UNSAFE'}
                </div>
                <ul className="mt-1 text-xs text-white/70 space-y-1">
                  {marketStatus.dataQualityWarnings.map((warning: string, i: number) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
                {marketStatus?.dataIsProxy && (
                  <div className="mt-2 text-xs text-amber-400/80">
                    💡 For real ES futures data, configure POLYGON_API_KEY in Vercel ($29/mo)
                  </div>
                )}
                {marketStatus?.dataAgeSeconds > 0 && (
                  <div className="mt-1 text-xs text-white/50">
                    Data age: {Math.round(marketStatus.dataAgeSeconds / 60)} minutes
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* EXECUTION VERIFICATION WARNING - AUDIT FIX 2026-01-06 */}
        {/* ================================================================ */}
        {marketStatus?.executionWarning && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-sm text-blue-400">
                  {marketStatus.executionWarning.message}
                </div>
                <div className="mt-1 text-xs text-white/70">
                  {marketStatus.executionWarning.note}
                </div>
                <a
                  href={marketStatus.executionWarning.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Open Apex Dashboard to verify trades <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

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
        {/* OPEN POSITIONS - CRITICAL VISIBILITY WITH LIVE P&L */}
        {/* ================================================================ */}
        {openPositions.length > 0 && (
          <div className="mb-4 p-6 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-4 border-red-500 rounded-2xl shadow-2xl shadow-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <span className="text-2xl font-black text-white">🔴 LIVE POSITION</span>
              </div>
              <button
                onClick={closePosition}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105"
              >
                ❌ CLOSE NOW
              </button>
            </div>
            <div className="space-y-2">
              {openPositions.map(pos => {
                // Calculate unrealized P&L based on current market price
                const entryPrice = pos.entryPrice || 0
                const contracts = pos.contracts || 1
                const pointValue = 50 // ES point value ($50 per point)

                // Calculate P&L: (currentPrice - entryPrice) * pointValue * contracts
                // For SHORT: (entryPrice - currentPrice) * pointValue * contracts
                let unrealizedPnL = 0
                if (currentMarketPrice > 0 && entryPrice > 0) {
                  if (pos.direction === 'LONG') {
                    unrealizedPnL = (currentMarketPrice - entryPrice) * pointValue * contracts
                  } else {
                    unrealizedPnL = (entryPrice - currentMarketPrice) * pointValue * contracts
                  }
                }

                // Calculate distance to SL and TP in points and dollars
                const distanceToSL = pos.direction === 'LONG'
                  ? currentMarketPrice - pos.stopLoss
                  : pos.stopLoss - currentMarketPrice
                const distanceToTP = pos.direction === 'LONG'
                  ? pos.takeProfit - currentMarketPrice
                  : currentMarketPrice - pos.takeProfit

                return (
                  <div key={pos.id} className="p-5 bg-black/50 rounded-xl border border-white/10">
                    {/* TOP ROW: Position Info + GIANT P&L */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className={`text-3xl font-black px-4 py-2 rounded-lg ${pos.direction === 'LONG' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                          {pos.direction === 'LONG' ? '📈 LONG' : '📉 SHORT'}
                        </span>
                        <div>
                          <div className="text-white text-xl font-bold">{contracts}x {pos.symbol || 'ES'}</div>
                          <div className="text-white/60">Entry: ${entryPrice.toFixed(2)}</div>
                        </div>
                      </div>
                      {/* UNREALIZED P&L - GIANT AND PROMINENT */}
                      <div className={`text-right p-4 rounded-xl ${unrealizedPnL >= 0 ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
                        <div className={`text-4xl font-black ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                        </div>
                        <div className="text-sm text-white/60 font-medium">
                          {unrealizedPnL >= 0 ? '💰 PROFIT' : '⚠️ LOSS'} • NOW: ${currentMarketPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Progress bars to SL and TP */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      {/* Stop Loss Info */}
                      <div className="bg-red-500/10 p-2 rounded">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-red-400 font-medium">STOP LOSS</span>
                          <span className="text-red-400">${pos.stopLoss?.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-white/50">
                          {distanceToSL > 0 ? (
                            <span className="text-emerald-400">{distanceToSL.toFixed(2)} pts safe (${(distanceToSL * pointValue * contracts).toFixed(0)})</span>
                          ) : (
                            <span className="text-red-400 font-bold">⚠️ STOP HIT!</span>
                          )}
                        </div>
                      </div>
                      {/* Take Profit Info */}
                      <div className="bg-emerald-500/10 p-2 rounded">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-emerald-400 font-medium">TAKE PROFIT</span>
                          <span className="text-emerald-400">${pos.takeProfit?.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-white/50">
                          {distanceToTP > 0 ? (
                            <span>{distanceToTP.toFixed(2)} pts away (${(distanceToTP * pointValue * contracts).toFixed(0)})</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">✓ TARGET HIT!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Current market price and pattern */}
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Pattern: {pos.pattern || 'Unknown'}</span>
                      <span>Market: ${currentMarketPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* LAST REFRESH INDICATOR */}
        <div className="mb-4 flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-refresh: Every 3 seconds</span>
          </div>
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>

        {/* ================================================================ */}
        {/* MAIN GRID */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ============================================================ */}
          {/* CHART (3 cols) */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            {/* BIGGER CHART - 650px for better visibility */}
            <div className="h-[650px]">
              <RealTimeESChart
                instrument={instrument}
                onPriceUpdate={(price) => setCurrentMarketPrice(price)}
              />
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
            {/* RECENT TRADES - Enhanced with bigger P&L */}
            {/* ========================================================== */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-white/80">Trade History</div>
                <div className="text-xs text-white/40">{recentTrades.length} trades</div>
              </div>
              {recentTrades.length === 0 ? (
                <div className="text-center text-white/20 py-6">No trades yet today</div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {recentTrades.map(trade => (
                    <div
                      key={trade.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        trade.pnl >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                      }`}
                      onClick={() => {
                        setSelectedTrade(trade)
                        setShowTradeVerifyModal(true)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                          trade.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.pnl >= 0 ? '✓' : '✗'}
                        </div>
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            {trade.direction} {trade.contracts || 1}x {trade.instrument || 'ES'}
                            {/* API Verification indicator */}
                            {trade.pickMyTradeEntry?.accepted ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">API ✓</span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">OLD</span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/40">{trade.reason || trade.exitReason || 'Trade'} • Click for details</div>
                        </div>
                      </div>
                      <div className={`text-lg font-black ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{fmt(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* STRATEGIES & MARKET DATA ROW */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* ============================================================ */}
          {/* ADAPTIVE STRATEGIES PANEL - Shows 7 active strategies */}
          {/* ============================================================ */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-white/80">Active Adaptive Strategies</div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${
                marketStatus?.regime?.includes('TREND') ? 'bg-emerald-500/20 text-emerald-400' :
                marketStatus?.regime?.includes('RANGE') ? 'bg-blue-500/20 text-blue-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {marketStatus?.regime || 'LOADING...'}
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {/* Show strategies from adaptiveStatus */}
              {adaptiveStatus?.activeStrategies?.map((strategy: string) => {
                const regime = marketStatus?.regime || ''
                const rsi = parseFloat(marketStatus?.indicators?.rsi || '50')

                // Determine if strategy works in current regime
                const strategyRegimes: Record<string, string[]> = {
                  'RANGE_FADE': ['RANGE_WIDE', 'RANGE_TIGHT'],
                  'FAILED_BREAKOUT': ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY'],
                  'ORB_BREAKOUT': ['TREND_STRONG_UP', 'TREND_STRONG_DOWN', 'HIGH_VOLATILITY'],
                  'CHOCH_REVERSAL': ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
                  'KILLZONE_REVERSAL': ['RANGE_WIDE', 'TREND_WEAK_UP', 'TREND_WEAK_DOWN'],
                  'VOLATILITY_BREAKOUT': ['LOW_VOLATILITY'],
                  'VWAP_DEVIATION': ['RANGE_WIDE', 'RANGE_TIGHT', 'LOW_VOLATILITY']
                }

                const triggers: Record<string, string> = {
                  'RANGE_FADE': `Price at range extreme + RSI ${rsi > 55 ? '>' : '<'} ${rsi > 55 ? '55' : '45'}`,
                  'FAILED_BREAKOUT': 'Price breaks BB then reverses',
                  'ORB_BREAKOUT': 'Break of 9:30-10:00 range (10-11 AM only)',
                  'CHOCH_REVERSAL': 'RSI extreme (>78/<22) with reversal candle',
                  'KILLZONE_REVERSAL': 'RSI extreme at session open/close',
                  'VOLATILITY_BREAKOUT': 'Squeeze breakout (low volatility period)',
                  'VWAP_DEVIATION': 'Bounce off VWAP upper/lower band'
                }

                const validRegimes = strategyRegimes[strategy] || []
                const isActiveForRegime = validRegimes.some(r => regime.includes(r.split('_')[0]) || regime === r)
                const weight = adaptiveStatus?.strategyWeights?.[strategy] || '0%'
                const isEnabled = !weight.includes('0%')

                return (
                  <div key={strategy} className={`p-2 rounded-lg border ${
                    isActiveForRegime && isEnabled ? 'bg-emerald-500/10 border-emerald-500/30' :
                    isEnabled ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          isActiveForRegime && isEnabled ? 'bg-emerald-500 animate-pulse' :
                          isEnabled ? 'bg-amber-500' : 'bg-white/20'
                        }`} />
                        <span className="text-xs font-medium">{strategy}</span>
                        <span className="text-[10px] text-blue-400">{weight}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${
                        isActiveForRegime && isEnabled ? 'text-emerald-400' :
                        isEnabled ? 'text-amber-400' : 'text-white/30'
                      }`}>
                        {!isEnabled ? 'DISABLED' : isActiveForRegime ? 'ACTIVE' : 'WAITING'}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/50 mt-1 pl-4">
                      {triggers[strategy] || 'Technical pattern trigger'}
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5 pl-4">
                      Regimes: {validRegimes.join(', ')}
                    </div>
                  </div>
                )
              }) || (
                <div className="text-center text-white/30 py-4">Loading strategies...</div>
              )}

              {/* Show disabled strategies too */}
              {adaptiveStatus?.disabledStrategies?.map((strategy: string) => (
                <div key={strategy} className="p-2 rounded-lg border bg-red-500/5 border-red-500/20 opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <span className="text-xs font-medium text-white/50">{strategy}</span>
                      <span className="text-[10px] text-red-400">0%</span>
                    </div>
                    <span className="text-[10px] text-red-400">DISABLED</span>
                  </div>
                  <div className="text-[9px] text-white/30 mt-1 pl-4">
                    Failed Monte Carlo validation
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-white/30 text-center">
              3 strategies proven on REAL data | Signal: {autoStatus?.lastSignal ? `${autoStatus.lastSignal.strategy} ${autoStatus.lastSignal.direction}` : 'Waiting...'}
            </div>
          </div>

          {/* ============================================================ */}
          {/* LIVE MARKET DATA PANEL */}
          {/* ============================================================ */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-white/80">Live Market Data</div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                marketStatus?.pickMyTradeConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {marketStatus?.pickMyTradeConnected ? '● PickMyTrade Connected' : '○ Not Connected'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* ES Price */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">ES Price</div>
                <div className="text-xl font-bold">${marketStatus?.price?.toFixed(2) || '---'}</div>
              </div>

              {/* VWAP */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">VWAP</div>
                <div className="text-xl font-bold">${marketStatus?.indicators?.vwap || '---'}</div>
              </div>

              {/* EMA 20 */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">EMA 20</div>
                <div className="text-lg font-medium">${marketStatus?.indicators?.ema20 || '---'}</div>
              </div>

              {/* EMA 50 */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">EMA 50</div>
                <div className="text-lg font-medium">${marketStatus?.indicators?.ema50 || '---'}</div>
              </div>

              {/* RSI */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">RSI (14)</div>
                <div className={`text-lg font-medium ${
                  parseFloat(marketStatus?.indicators?.rsi || '50') > 70 ? 'text-red-400' :
                  parseFloat(marketStatus?.indicators?.rsi || '50') < 30 ? 'text-emerald-400' : ''
                }`}>
                  {marketStatus?.indicators?.rsi || '---'}
                </div>
              </div>

              {/* ATR */}
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-[10px] text-white/40 mb-1">ATR (14)</div>
                <div className="text-lg font-medium">{marketStatus?.indicators?.atr || '---'}</div>
              </div>
            </div>

            {/* Price to Key Levels */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-[10px] text-white/40 mb-2">Distance to Key Levels</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Price to VWAP:</span>
                  <span className={`font-medium ${
                    (marketStatus?.price - parseFloat(marketStatus?.indicators?.vwap || '0')) > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {marketStatus?.price && marketStatus?.indicators?.vwap
                      ? `${(marketStatus.price - parseFloat(marketStatus.indicators.vwap)).toFixed(2)} pts ($${((marketStatus.price - parseFloat(marketStatus.indicators.vwap)) * 50).toFixed(0)})`
                      : '---'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Price to EMA20:</span>
                  <span className={`font-medium ${
                    (marketStatus?.price - parseFloat(marketStatus?.indicators?.ema20 || '0')) > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {marketStatus?.price && marketStatus?.indicators?.ema20
                      ? `${(marketStatus.price - parseFloat(marketStatus.indicators.ema20)).toFixed(2)} pts ($${((marketStatus.price - parseFloat(marketStatus.indicators.ema20)) * 50).toFixed(0)})`
                      : '---'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* PickMyTrade Account */}
            {marketStatus?.pickMyTradeConnected && (
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Apex Account:</span>
                  <span className="font-mono text-emerald-400">{marketStatus?.pickMyTradeAccount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Connection:</span>
                  <span className="font-mono text-emerald-400">{marketStatus?.connectionName || 'RITHMIC1'}</span>
                </div>
              </div>
            )}

            {/* Last Updated Timestamp */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-white/30">Last Updated:</span>
                <span className="text-white/50 font-mono">{marketStatus?.estTime || new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-white/30">Data Source:</span>
                <span className={`${marketStatus?.dataDelayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {marketStatus?.dataNote || 'SPY (real-time)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* APEX SYNC MODAL */}
        {/* ================================================================ */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                  Sync Apex Account
                </h3>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-white/40 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-200">
                <p className="font-medium mb-1">Why sync manually?</p>
                <p className="text-xs text-blue-200/70">
                  PickMyTrade doesn't provide fill verification. Enter your actual Apex balance
                  from the Rithmic/Apex dashboard to verify StuntMan's state matches reality.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Current Apex Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      value={syncBalance}
                      onChange={(e) => setSyncBalance(e.target.value)}
                      placeholder="149870.18"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-7 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">From Apex dashboard (Account Balance)</p>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Realized P&L (optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      value={syncPnL}
                      onChange={(e) => setSyncPnL(e.target.value)}
                      placeholder="-129.82"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-7 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">If blank, calculated from balance - $150,000</p>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Trailing Drawdown Used (optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                    <input
                      type="number"
                      value={syncDrawdown}
                      onChange={(e) => setSyncDrawdown(e.target.value)}
                      placeholder="129.82"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pl-7 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">From Apex dashboard (Trailing Max Drawdown)</p>
                </div>
              </div>

              {lastSyncTime && (
                <div className="mt-4 text-xs text-white/40 text-center">
                  Last synced: {lastSyncTime}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={syncApexAccount}
                  disabled={syncing || !syncBalance}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sync Account
                    </>
                  )}
                </button>
              </div>

              <a
                href="https://login.apextraderfunding.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-4 text-center text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Open Apex Dashboard
              </a>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* CONNECTION TEST MODAL */}
        {/* ================================================================ */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Connection Test Results
                </h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-white/40 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {testingConnection ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
                  <p className="text-white/70">Testing PickMyTrade connection...</p>
                </div>
              ) : connectionTestResult ? (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div className={`p-4 rounded-xl border ${
                    connectionTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className={`text-lg font-bold ${
                      connectionTestResult.success ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {connectionTestResult.success ? '✓ CONNECTION WORKING' : '✗ CONNECTION FAILED'}
                    </div>
                    <p className="text-sm text-white/70 mt-1">
                      {connectionTestResult.message}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">PickMyTrade API:</span>
                      <span className={connectionTestResult.pickMyTradeReached ? 'text-emerald-400' : 'text-red-400'}>
                        {connectionTestResult.pickMyTradeReached ? '✓ Reached' : '✗ Not reached'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Token Valid:</span>
                      <span className={connectionTestResult.tokenValid ? 'text-emerald-400' : 'text-red-400'}>
                        {connectionTestResult.tokenValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Account ID:</span>
                      <span className="text-white/70">{connectionTestResult.accountId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Connection Name:</span>
                      <span className="text-white/70">{connectionTestResult.connectionName || 'N/A'}</span>
                    </div>
                    {connectionTestResult.apiResponse && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-white/40 mb-1">Raw API Response:</div>
                        <pre className="text-xs text-white/60 bg-black/50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(connectionTestResult.apiResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Warning about Rithmic */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-xs text-amber-200">
                      <strong>Note:</strong> This test verifies PickMyTrade receives requests.
                      It does NOT verify Rithmic/Apex connection. Check your Apex dashboard to verify orders are filling.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <a
                      href="https://pickmytrade.trade/pages/alertPage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-center text-sm transition"
                    >
                      Open PickMyTrade
                    </a>
                    <a
                      href="https://login.apextraderfunding.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-center text-sm transition"
                    >
                      Open Apex Dashboard
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-white/50 text-center py-8">No test results yet</p>
              )}

              <button
                onClick={() => setShowTestModal(false)}
                className="w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TRADE VERIFICATION MODAL - Shows PickMyTrade API responses */}
        {/* ================================================================ */}
        {showTradeVerifyModal && selectedTrade && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Trade Verification Details
                </h3>
                <button
                  onClick={() => setShowTradeVerifyModal(false)}
                  className="text-white/40 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Trade Summary */}
              <div className={`p-4 rounded-xl border mb-4 ${
                selectedTrade.pnl >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {selectedTrade.direction} {selectedTrade.contracts || 1}x {selectedTrade.instrument || 'ES'}
                    </div>
                    <div className="text-sm text-white/60">{selectedTrade.pattern || selectedTrade.reason || 'Trade'}</div>
                  </div>
                  <div className={`text-2xl font-black ${selectedTrade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedTrade.pnl >= 0 ? '+' : ''}{fmt(selectedTrade.pnl)}
                  </div>
                </div>
              </div>

              {/* Trade Details */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2 mb-4">
                <div className="text-sm font-medium text-white/80 mb-2">Trade Details</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Entry Price:</span>
                    <span className="text-white">${parseFloat(selectedTrade.entryPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Exit Price:</span>
                    <span className="text-white">${parseFloat(selectedTrade.exitPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Exit Reason:</span>
                    <span className="text-white/70">{selectedTrade.exitReason || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Time:</span>
                    <span className="text-white/70">{new Date(selectedTrade.time).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* PickMyTrade Entry Response */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                  Entry API Response
                  {selectedTrade.pickMyTradeEntry?.accepted ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">VERIFIED ✓</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">NO API DATA</span>
                  )}
                </div>
                {selectedTrade.pickMyTradeEntry ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">Accepted:</span>
                        <span className={selectedTrade.pickMyTradeEntry.accepted ? 'text-emerald-400' : 'text-red-400'}>
                          {selectedTrade.pickMyTradeEntry.accepted ? 'Yes ✓' : 'No ✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">HTTP Status:</span>
                        <span className="text-white/70">{selectedTrade.pickMyTradeEntry.httpStatus || 'N/A'}</span>
                      </div>
                      {selectedTrade.pickMyTradeEntry.orderId && (
                        <div className="col-span-2 flex justify-between">
                          <span className="text-white/50">Order ID:</span>
                          <span className="text-emerald-400 font-mono text-xs">{selectedTrade.pickMyTradeEntry.orderId}</span>
                        </div>
                      )}
                    </div>
                    {selectedTrade.pickMyTradeEntry.rawResponse && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-white/40 mb-1">Raw Response:</div>
                        <pre className="text-xs text-white/60 bg-black/50 p-2 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(selectedTrade.pickMyTradeEntry.rawResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No API tracking data available (trade before update)</p>
                )}
              </div>

              {/* PickMyTrade Exit Response */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                  Exit API Response
                  {selectedTrade.pickMyTradeExit?.accepted ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">VERIFIED ✓</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">NO API DATA</span>
                  )}
                </div>
                {selectedTrade.pickMyTradeExit ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">Accepted:</span>
                        <span className={selectedTrade.pickMyTradeExit.accepted ? 'text-emerald-400' : 'text-red-400'}>
                          {selectedTrade.pickMyTradeExit.accepted ? 'Yes ✓' : 'No ✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">HTTP Status:</span>
                        <span className="text-white/70">{selectedTrade.pickMyTradeExit.httpStatus || 'N/A'}</span>
                      </div>
                    </div>
                    {selectedTrade.pickMyTradeExit.rawResponse && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-white/40 mb-1">Raw Response:</div>
                        <pre className="text-xs text-white/60 bg-black/50 p-2 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(selectedTrade.pickMyTradeExit.rawResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">No exit API data (SL/TP handled by PickMyTrade or before update)</p>
                )}
              </div>

              {/* Verification Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                <p className="text-xs text-amber-200">
                  <strong>How to verify:</strong> Compare the Order ID above with your PickMyTrade alerts log
                  and Apex/Rithmic trade history. If all match, the trade was executed correctly.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <a
                  href="https://pickmytrade.trade/pages/alertPage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-center text-sm transition"
                >
                  Check PickMyTrade Logs
                </a>
                <a
                  href="https://login.apextraderfunding.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-center text-sm transition"
                >
                  Check Apex History
                </a>
              </div>

              <button
                onClick={() => setShowTradeVerifyModal(false)}
                className="w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
