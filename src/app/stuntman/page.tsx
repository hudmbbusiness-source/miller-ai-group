// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  Target,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Bell,
  Play,
  Pause,
  Circle,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  LineChart,
  Bot,
  Brain,
  Layers,
  ChevronRight,
  ExternalLink,
  Gauge,
  FlameKindling,
  Trophy,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Signal {
  instrument: string
  market: 'crypto' | 'futures'
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  riskScore: number
  stopLoss: number
  takeProfit: number
  reasoning: string
  timestamp: number
}

interface Trade {
  id: string
  instrument: string
  market: 'crypto' | 'futures'
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  timestamp: number
  pnl?: number
  status: 'pending' | 'filled' | 'cancelled'
}

interface PropFirmStatus {
  accountId: string
  firm: string
  accountSize: number
  currentBalance: number
  totalPnL: number
  drawdownUsed: number
  drawdownLimit: number
  profitTarget: number
  profitProgress: number
  tradingDays: number
  minTradingDays: number
  maxContracts: number
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical'
  isTradingAllowed: boolean
  violations: string[]
}

// =============================================================================
// STUNTMAN TRADING TERMINAL v2
// =============================================================================

export default function StuntManTerminal() {
  // State
  const [activeMarket, setActiveMarket] = useState<'crypto' | 'futures'>('futures')
  const [selectedPair, setSelectedPair] = useState('ES')
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [signals, setSignals] = useState<Signal[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [autoTrading, setAutoTrading] = useState(false)
  const [botStatus, setBotStatus] = useState<'idle' | 'scanning' | 'trading'>('idle')
  const [lastScan, setLastScan] = useState<string>('')
  const [timeframe, setTimeframe] = useState('15m')
  const [showIndicators, setShowIndicators] = useState(true)
  const [cryptoBalance, setCryptoBalance] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  // Prop firm status
  const [propFirmStatus, setPropFirmStatus] = useState<PropFirmStatus>({
    accountId: 'APEX-456334',
    firm: 'Apex Trader Funding',
    accountSize: 150000,
    currentBalance: 150000,
    totalPnL: 0,
    drawdownUsed: 0,
    drawdownLimit: 5000,
    profitTarget: 9000,
    profitProgress: 0,
    tradingDays: 0,
    minTradingDays: 7,
    maxContracts: 17,
    riskLevel: 'safe',
    isTradingAllowed: true,
    violations: [],
  })

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const ema9Ref = useRef<any>(null)
  const ema21Ref = useRef<any>(null)

  // Instruments
  const cryptoPairs = [
    { symbol: 'BTC_USDT', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH_USDT', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'SOL_USDT', name: 'Solana', icon: '◎' },
  ]

  const futuresContracts = [
    { symbol: 'ES', name: 'E-mini S&P 500', tickSize: 0.25, pointValue: 50 },
    { symbol: 'NQ', name: 'E-mini Nasdaq', tickSize: 0.25, pointValue: 20 },
    { symbol: 'MES', name: 'Micro E-mini S&P', tickSize: 0.25, pointValue: 5 },
    { symbol: 'MNQ', name: 'Micro E-mini Nasdaq', tickSize: 0.25, pointValue: 2 },
    { symbol: 'RTY', name: 'E-mini Russell', tickSize: 0.1, pointValue: 50 },
    { symbol: 'CL', name: 'Crude Oil', tickSize: 0.01, pointValue: 1000 },
    { symbol: 'GC', name: 'Gold', tickSize: 0.1, pointValue: 100 },
  ]

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  // Fetch crypto balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/stuntman/balance')
        const data = await res.json()
        if (data.success) {
          setCryptoBalance(data.totalUSD || 0)
          setIsConnected(true)
        }
      } catch (e) {
        console.error('Balance fetch error:', e)
      }
    }
    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch price data
  useEffect(() => {
    if (activeMarket === 'crypto') {
      // Crypto price from Crypto.com
      const fetchTicker = async () => {
        try {
          const res = await fetch(`https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${selectedPair}`)
          const data = await res.json()
          if (data.code === 0 && data.result?.data?.[0]) {
            const t = data.result.data[0]
            setCurrentPrice(parseFloat(t.a))
            setPriceChange(parseFloat(t.c) * 100)
          }
        } catch (e) {
          console.error('Ticker error:', e)
        }
      }
      fetchTicker()
      const interval = setInterval(fetchTicker, 2000)
      return () => clearInterval(interval)
    } else {
      // Futures - use simulated data until real connection
      // In production, this would come from NinjaTrader or webhook data
      const simulateFuturesPrice = () => {
        const basePrice = selectedPair === 'ES' ? 5980 :
                         selectedPair === 'NQ' ? 21200 :
                         selectedPair === 'MES' ? 5980 :
                         selectedPair === 'MNQ' ? 21200 :
                         selectedPair === 'RTY' ? 2050 :
                         selectedPair === 'CL' ? 72.50 :
                         selectedPair === 'GC' ? 2650 : 5000

        const variation = (Math.random() - 0.5) * basePrice * 0.001
        setCurrentPrice(prev => prev === 0 ? basePrice : prev + variation)
        setPriceChange((Math.random() - 0.5) * 2)
      }
      simulateFuturesPrice()
      const interval = setInterval(simulateFuturesPrice, 1000)
      return () => clearInterval(interval)
    }
  }, [activeMarket, selectedPair])

  // =============================================================================
  // CHART
  // =============================================================================

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#525252', style: 2, labelBackgroundColor: '#18181b' },
        horzLine: { color: '#525252', style: 2, labelBackgroundColor: '#18181b' },
      },
      rightPriceScale: {
        borderColor: 'transparent',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'transparent',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    const ema9 = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const ema21 = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    ema9Ref.current = ema9
    ema21Ref.current = ema21

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

  // Fetch candle data
  useEffect(() => {
    if (activeMarket !== 'crypto') return

    const fetchCandles = async () => {
      try {
        const res = await fetch(
          `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${selectedPair}&timeframe=${timeframe}&count=200`
        )
        const data = await res.json()

        if (data.code === 0 && data.result?.data) {
          const candles = data.result.data
            .sort((a: any, b: any) => a.t - b.t)
            .map((c: any) => ({
              time: Math.floor(c.t / 1000),
              open: parseFloat(c.o),
              high: parseFloat(c.h),
              low: parseFloat(c.l),
              close: parseFloat(c.c),
              volume: parseFloat(c.v),
            }))

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(candles.map((c: any) => ({
              time: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            })))
          }

          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(candles.map((c: any) => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
            })))
          }

          // Calculate EMAs
          if (showIndicators && ema9Ref.current && ema21Ref.current) {
            const closes = candles.map((c: any) => c.close)
            const ema9Data = calculateEMA(closes, 9).map((val, i) => ({
              time: candles[i].time,
              value: val,
            })).filter(d => d.value !== null)

            const ema21Data = calculateEMA(closes, 21).map((val, i) => ({
              time: candles[i].time,
              value: val,
            })).filter(d => d.value !== null)

            ema9Ref.current.setData(ema9Data)
            ema21Ref.current.setData(ema21Data)
          }

          chartRef.current?.timeScale().fitContent()
        }
      } catch (e) {
        console.error('Candle fetch error:', e)
      }
    }

    fetchCandles()
    const interval = setInterval(fetchCandles, 15000)
    return () => clearInterval(interval)
  }, [selectedPair, timeframe, showIndicators, activeMarket])

  function calculateEMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = []
    const multiplier = 2 / (period + 1)
    let ema: number | null = null

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null)
      } else if (i === period - 1) {
        ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
        result.push(ema)
      } else {
        ema = (data[i] - ema!) * multiplier + ema!
        result.push(ema)
      }
    }
    return result
  }

  // =============================================================================
  // FETCH FUTURES ACCOUNT STATUS
  // =============================================================================

  useEffect(() => {
    if (activeMarket !== 'futures') return

    const fetchAccountStatus = async () => {
      try {
        const res = await fetch('/api/stuntman/live-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', market: 'futures' }),
        })
        const data = await res.json()
        if (data.success && data.account) {
          setPropFirmStatus(prev => ({
            ...prev,
            ...data.account,
          }))
        }
      } catch (e) {
        console.error('Account status error:', e)
      }
    }

    fetchAccountStatus()
    const interval = setInterval(fetchAccountStatus, 5000)
    return () => clearInterval(interval)
  }, [activeMarket])

  // =============================================================================
  // TRADING BOT
  // =============================================================================

  const runBot = async (mode: 'analyze' | 'trade') => {
    setBotStatus('scanning')
    try {
      const res = await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, market: activeMarket }),
      })
      const data = await res.json()

      if (data.success) {
        setSignals(data.signals || [])
        setLastScan(new Date().toLocaleTimeString())

        // Update account status if returned
        if (data.account) {
          setPropFirmStatus(prev => ({
            ...prev,
            ...data.account,
          }))
        }

        if (mode === 'trade' && data.trades?.length > 0) {
          setTrades(prev => [...data.trades, ...prev].slice(0, 50))
          setBotStatus('trading')
          setTimeout(() => setBotStatus('idle'), 2000)
        } else {
          setBotStatus('idle')
        }
      } else {
        setBotStatus('idle')
      }
    } catch (e) {
      console.error('Bot error:', e)
      setBotStatus('idle')
    }
  }

  // Manual trade execution
  const executeTrade = async (side: 'buy' | 'sell') => {
    try {
      const res = await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: side,
          market: activeMarket,
          instrument: selectedPair,
          quantity: activeMarket === 'futures' ? 1 : undefined,
          amount: activeMarket === 'crypto' ? 100 : undefined, // $100 default for crypto
        }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.trade) {
          setTrades(prev => [data.trade, ...prev].slice(0, 50))
        }
        if (data.account) {
          setPropFirmStatus(prev => ({
            ...prev,
            ...data.account,
          }))
        }
      }
    } catch (e) {
      console.error('Trade error:', e)
    }
  }

  useEffect(() => {
    if (!autoTrading) return
    runBot('trade')
    const interval = setInterval(() => runBot('trade'), 60000) // Every minute when auto-trading
    return () => clearInterval(interval)
  }, [autoTrading, activeMarket])

  // =============================================================================
  // HELPERS
  // =============================================================================

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(6)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-emerald-400'
      case 'caution': return 'text-yellow-400'
      case 'warning': return 'text-orange-400'
      case 'danger': return 'text-red-400'
      case 'critical': return 'text-red-500'
      default: return 'text-zinc-400'
    }
  }

  const getRiskLevelBg = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-emerald-500/10 border-emerald-500/30'
      case 'caution': return 'bg-yellow-500/10 border-yellow-500/30'
      case 'warning': return 'bg-orange-500/10 border-orange-500/30'
      case 'danger': return 'bg-red-500/10 border-red-500/30'
      case 'critical': return 'bg-red-500/20 border-red-500/50'
      default: return 'bg-zinc-500/10 border-zinc-500/30'
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 backdrop-blur-xl bg-zinc-900/30 sticky top-0 z-50">
        <div className="h-full max-w-[1920px] mx-auto px-6 flex items-center justify-between">
          {/* Logo & Market Toggle */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">StuntMan</h1>
                <p className="text-[10px] text-zinc-500 -mt-0.5">Algorithmic Trading System</p>
              </div>
            </div>

            {/* Market Toggle */}
            <div className="flex items-center bg-zinc-800/50 rounded-xl p-1">
              <button
                onClick={() => { setActiveMarket('futures'); setSelectedPair('ES') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMarket === 'futures'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Futures
                </span>
              </button>
              <button
                onClick={() => { setActiveMarket('crypto'); setSelectedPair('BTC_USDT') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMarket === 'crypto'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Crypto
                </span>
              </button>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-zinc-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Bot Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              autoTrading ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 text-zinc-400'
            }`}>
              {botStatus === 'scanning' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {botStatus === 'trading' && <Activity className="w-4 h-4" />}
              {botStatus === 'idle' && <Circle className="w-4 h-4" />}
              <span className="text-xs font-medium uppercase">{botStatus}</span>
            </div>

            {/* Settings */}
            <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Account Status */}
          <div className="col-span-3 space-y-6">
            {/* Account Overview */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-zinc-300">Account Overview</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRiskLevelBg(propFirmStatus.riskLevel)} ${getRiskLevelColor(propFirmStatus.riskLevel)}`}>
                    {propFirmStatus.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {activeMarket === 'futures' ? (
                  <>
                    {/* Apex Account Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Apex 150K</p>
                          <p className="text-xs text-zinc-500">{propFirmStatus.accountId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(propFirmStatus.currentBalance)}</p>
                        <p className={`text-xs ${propFirmStatus.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {propFirmStatus.totalPnL >= 0 ? '+' : ''}{formatCurrency(propFirmStatus.totalPnL)}
                        </p>
                      </div>
                    </div>

                    {/* Drawdown Meter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Drawdown Used</span>
                        <span className={getRiskLevelColor(propFirmStatus.riskLevel)}>
                          {formatCurrency(propFirmStatus.drawdownUsed)} / {formatCurrency(propFirmStatus.drawdownLimit)}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            propFirmStatus.drawdownUsed / propFirmStatus.drawdownLimit > 0.8 ? 'bg-red-500' :
                            propFirmStatus.drawdownUsed / propFirmStatus.drawdownLimit > 0.6 ? 'bg-orange-500' :
                            propFirmStatus.drawdownUsed / propFirmStatus.drawdownLimit > 0.4 ? 'bg-yellow-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${(propFirmStatus.drawdownUsed / propFirmStatus.drawdownLimit) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600">
                        ${(propFirmStatus.drawdownLimit - propFirmStatus.drawdownUsed).toFixed(0)} remaining before breach
                      </p>
                    </div>

                    {/* Profit Target */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Profit Target</span>
                        <span className="text-emerald-400">
                          {formatCurrency(propFirmStatus.totalPnL)} / {formatCurrency(propFirmStatus.profitTarget)}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, (propFirmStatus.totalPnL / propFirmStatus.profitTarget) * 100))}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600">
                        {((propFirmStatus.totalPnL / propFirmStatus.profitTarget) * 100).toFixed(1)}% to funded account
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-800/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                          <Calendar className="w-3 h-3" />
                          Trading Days
                        </div>
                        <p className="text-lg font-bold">{propFirmStatus.tradingDays} / {propFirmStatus.minTradingDays}</p>
                      </div>
                      <div className="bg-zinc-800/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                          <Layers className="w-3 h-3" />
                          Max Contracts
                        </div>
                        <p className="text-lg font-bold">{propFirmStatus.maxContracts}</p>
                      </div>
                    </div>

                    {/* Trading Status */}
                    <div className={`flex items-center gap-2 p-3 rounded-xl ${propFirmStatus.isTradingAllowed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {propFirmStatus.isTradingAllowed ? (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-400">Trading Enabled</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-400">Trading Disabled</span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Crypto Balance */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Crypto Portfolio</p>
                          <p className="text-xs text-zinc-500">Crypto.com</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(cryptoBalance)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI Signals */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
              <div className="p-4 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-zinc-300">AI Signals</h2>
                  {lastScan && <span className="text-xs text-zinc-500">{lastScan}</span>}
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-80 overflow-auto">
                {signals.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">Click "Scan Markets" to analyze</p>
                ) : (
                  signals.map((sig, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${
                      sig.action === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/20' :
                      sig.action === 'SELL' ? 'bg-red-500/5 border-red-500/20' :
                      'bg-zinc-500/5 border-zinc-500/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{sig.instrument}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          sig.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                          sig.action === 'SELL' ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {sig.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{sig.confidence}% confidence</span>
                        <span>•</span>
                        <span>Risk: {sig.riskScore}/10</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-lg">
                          SL: {sig.stopLoss.toFixed(1)}%
                        </span>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg">
                          TP: {sig.takeProfit.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bot Controls */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4 space-y-3">
              <button
                onClick={() => runBot('analyze')}
                disabled={botStatus === 'scanning'}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Brain className="w-4 h-4" />
                Scan Markets
              </button>
              <button
                onClick={() => setAutoTrading(!autoTrading)}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  autoTrading
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/20'
                }`}
              >
                {autoTrading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoTrading ? 'Stop Bot' : 'Start Bot'}
              </button>
            </div>
          </div>

          {/* Center Column - Chart & Trading */}
          <div className="col-span-6 space-y-6">
            {/* Instrument Selector & Price */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <select
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {activeMarket === 'futures' ? (
                      futuresContracts.map(c => (
                        <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>
                      ))
                    ) : (
                      cryptoPairs.map(p => (
                        <option key={p.symbol} value={p.symbol}>{p.icon} {p.symbol.replace('_', '/')}</option>
                      ))
                    )}
                  </select>

                  <div>
                    <span className="text-3xl font-bold font-mono">{formatPrice(currentPrice)}</span>
                    <span className={`ml-3 text-sm font-medium ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center gap-1 bg-zinc-800/50 rounded-xl p-1">
                  {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        timeframe === tf ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIndicators(!showIndicators)}
                    className={`p-2 rounded-lg transition-colors ${showIndicators ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <LineChart className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-amber-500 rounded" /> EMA 9</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-violet-500 rounded" /> EMA 21</span>
                  </div>
                </div>
              </div>
              <div ref={chartContainerRef} className="rounded-xl overflow-hidden" />
            </div>

            {/* Quick Trade Panel */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => executeTrade('buy')}
                  className="py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <ArrowUpRight className="w-5 h-5" /> BUY / LONG
                </button>
                <button
                  onClick={() => executeTrade('sell')}
                  className="py-4 bg-red-500 hover:bg-red-600 rounded-xl text-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                >
                  <ArrowDownRight className="w-5 h-5" /> SELL / SHORT
                </button>
              </div>
              <p className="text-xs text-zinc-600 text-center mt-3">
                {activeMarket === 'futures' ? 'Paper Trading Mode - 1 contract per trade' : 'Live Trading - $100 per trade'}
              </p>
            </div>
          </div>

          {/* Right Column - Trade History */}
          <div className="col-span-3 space-y-6">
            {/* Recent Trades */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden h-[calc(100vh-200px)]">
              <div className="p-4 border-b border-zinc-800/50">
                <h2 className="font-semibold text-sm text-zinc-300">Trade History</h2>
              </div>
              <div className="overflow-auto h-full">
                {trades.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">No trades yet</p>
                ) : (
                  <div className="divide-y divide-zinc-800/30">
                    {trades.map((trade, i) => (
                      <div key={i} className="p-4 hover:bg-zinc-800/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              trade.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.side === 'BUY' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{trade.instrument}</p>
                              <p className="text-xs text-zinc-500">{trade.quantity} @ {formatPrice(trade.price)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm">{formatCurrency(trade.value)}</p>
                            <p className={`text-xs ${trade.pnl && trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}${formatCurrency(trade.pnl)}` : trade.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
