// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Pause,
  Circle,
  DollarSign,
  Bot,
  Brain,
  Trophy,
  Calendar,
  Layers,
  Lock,
  Unlock,
  Wallet,
  RefreshCw,
  AlertTriangle,
  Settings,
  BarChart3,
  Newspaper,
  Globe,
  Zap,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Radio,
  Upload,
  Download,
  Clock,
  Target,
  Shield,
  Gauge,
  LineChart,
  X,
} from 'lucide-react'

// Types
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

interface PropFirmStatus {
  accountId: string
  firm: string
  accountSize: number
  currentBalance: number
  totalPnL: number
  drawdownUsed: number
  drawdownLimit: number
  profitTarget: number
  tradingDays: number
  minTradingDays: number
  maxContracts: number
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical'
  isTradingAllowed: boolean
}

interface MarketIntelligence {
  canTrade: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  reason: string
  warnings: string[]
  sentiment: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED'
    score: number
    confidence: number
  }
  keyThemes: string[]
  economicEvents: Array<{ name: string; impact: string }>
  topHeadlines: Array<{ title: string; sentiment: string; source: string }>
  volatilityExpectation: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
  trendBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

export default function StuntManTerminal() {
  const [activeMarket, setActiveMarket] = useState<'crypto' | 'futures'>('futures')
  const [selectedPair, setSelectedPair] = useState('ES')
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [signals, setSignals] = useState<Signal[]>([])
  const [autoTrading, setAutoTrading] = useState(false)
  const [botStatus, setBotStatus] = useState<'idle' | 'scanning' | 'trading'>('idle')
  const [lastScan, setLastScan] = useState<string>('')
  const [timeframe, setTimeframe] = useState('15m')
  const [cryptoBalance, setCryptoBalance] = useState(0)
  const [isConnected, setIsConnected] = useState(true)

  const [propFirmStatus, setPropFirmStatus] = useState<PropFirmStatus>({
    accountId: 'APEX-456334',
    firm: 'Apex Trader Funding',
    accountSize: 150000,
    currentBalance: 150000,
    totalPnL: 0,
    drawdownUsed: 0,
    drawdownLimit: 5000,
    profitTarget: 9000,
    tradingDays: 0,
    minTradingDays: 7,
    maxContracts: 17,
    riskLevel: 'safe',
    isTradingAllowed: true,
  })

  const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null)
  const [intelLoading, setIntelLoading] = useState(false)

  // Account sync state
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncData, setSyncData] = useState({
    balance: '150000',
    openPnL: '0',
    closedPnL: '0',
    trailingDrawdown: '0',
    tradingDays: '0',
  })
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'estimated' | 'manual' | 'webhook'>('estimated')
  const [riskStatus, setRiskStatus] = useState<{
    status: string
    canTrade: boolean
    warnings: string[]
    recommendations: string[]
  } | null>(null)

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const ema9Ref = useRef<any>(null)
  const ema21Ref = useRef<any>(null)

  const futuresContracts = [
    { symbol: 'ES', name: 'E-mini S&P 500' },
    { symbol: 'NQ', name: 'E-mini Nasdaq' },
    { symbol: 'MES', name: 'Micro E-mini S&P' },
    { symbol: 'MNQ', name: 'Micro E-mini Nasdaq' },
    { symbol: 'CL', name: 'Crude Oil' },
    { symbol: 'GC', name: 'Gold' },
  ]

  const cryptoPairs = [
    { symbol: 'BTC_USDT', name: 'Bitcoin' },
    { symbol: 'ETH_USDT', name: 'Ethereum' },
    { symbol: 'SOL_USDT', name: 'Solana' },
  ]

  // Fetch price data
  useEffect(() => {
    const fetchPrice = async () => {
      if (activeMarket === 'crypto') {
        try {
          const res = await fetch(`/api/stuntman?action=ticker&instrument=${selectedPair}`)
          const data = await res.json()
          if (data.ticker) {
            setCurrentPrice(parseFloat(data.ticker.last_traded_price || '0'))
            setPriceChange(parseFloat(data.ticker.price_change_percentage_24h || '0'))
            setIsConnected(true)
          }
        } catch (e) {
          setIsConnected(false)
        }
      } else {
        // Simulated futures price for demo
        const basePrices: Record<string, number> = {
          ES: 5982, NQ: 21450, MES: 5982, MNQ: 21450, CL: 72.5, GC: 2650
        }
        setCurrentPrice(basePrices[selectedPair] || 0)
        setPriceChange(0.83)
        setIsConnected(true)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 5000)
    return () => clearInterval(interval)
  }, [activeMarket, selectedPair])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: '#09090b' }, textColor: '#71717a' },
      grid: { vertLines: { color: '#27272a33' }, horzLines: { color: '#27272a33' } },
      crosshair: { mode: 1, vertLine: { color: '#525252' }, horzLine: { color: '#525252' } },
      rightPriceScale: { borderColor: 'transparent' },
      timeScale: { borderColor: 'transparent', timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f680', priceFormat: { type: 'volume' }, priceScaleId: '',
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })

    const ema9 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    const ema21 = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    ema9Ref.current = ema9
    ema21Ref.current = ema21

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); chart.remove() }
  }, [])

  // Fetch candle data
  useEffect(() => {
    const fetchCandles = async () => {
      if (!candleSeriesRef.current) return
      try {
        if (activeMarket === 'crypto') {
          const res = await fetch(`/api/stuntman?action=candles&instrument=${selectedPair}&timeframe=${timeframe}`)
          const data = await res.json()
          if (data.candles?.length > 0) {
            candleSeriesRef.current.setData(data.candles)
            volumeSeriesRef.current?.setData(data.candles.map((c: any) => ({
              time: c.time, value: c.volume || 0, color: c.close >= c.open ? '#10b98140' : '#ef444440'
            })))
            chartRef.current?.timeScale().fitContent()
          }
        } else {
          // Demo candle data for futures
          const now = Math.floor(Date.now() / 1000)
          const basePrice = { ES: 5982, NQ: 21450, MES: 5982, MNQ: 21450, CL: 72.5, GC: 2650 }[selectedPair] || 5000
          const candles = []
          for (let i = 100; i >= 0; i--) {
            const time = now - i * 900
            const volatility = basePrice * 0.002
            const open = basePrice + (Math.random() - 0.5) * volatility
            const close = open + (Math.random() - 0.5) * volatility
            candles.push({
              time, open, high: Math.max(open, close) + Math.random() * volatility * 0.5,
              low: Math.min(open, close) - Math.random() * volatility * 0.5, close
            })
          }
          candleSeriesRef.current.setData(candles)
          chartRef.current?.timeScale().fitContent()
        }
      } catch (e) { console.error('Candle fetch error:', e) }
    }
    fetchCandles()
    const interval = setInterval(fetchCandles, 30000)
    return () => clearInterval(interval)
  }, [selectedPair, timeframe, activeMarket])

  const runBot = async (mode: 'analyze' | 'trade') => {
    setBotStatus('scanning')
    setIntelLoading(true)
    try {
      const res = await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, market: activeMarket }),
      })
      const data = await res.json()
      if (data.success || data.blocked) {
        setSignals(data.signals || [])
        setLastScan(new Date().toLocaleTimeString())
        // Capture market intelligence
        if (data.marketIntelligence) {
          setMarketIntel(data.marketIntelligence)
        }
      }
      setBotStatus('idle')
      setIntelLoading(false)
    } catch (e) {
      console.error('Bot error:', e)
      setBotStatus('idle')
      setIntelLoading(false)
    }
  }

  // Fetch market intel independently
  const fetchMarketIntel = async () => {
    setIntelLoading(true)
    try {
      const res = await fetch('/api/stuntman/market-intel?mode=full')
      const data = await res.json()
      if (data.success && data.data) {
        const intel = data.data
        setMarketIntel({
          canTrade: intel.filter.shouldTrade,
          riskLevel: intel.filter.riskLevel,
          reason: intel.filter.reason,
          warnings: intel.filter.warnings,
          sentiment: {
            overall: intel.filter.sentiment.overall,
            score: intel.filter.sentiment.score,
            confidence: intel.filter.sentiment.confidence,
          },
          keyThemes: intel.filter.sentiment.keyThemes,
          economicEvents: intel.economicCalendar,
          topHeadlines: intel.filter.sentiment.headlines.slice(0, 5).map((h: any) => ({
            title: h.title,
            sentiment: h.sentiment,
            source: h.source,
          })),
          volatilityExpectation: intel.marketConditions.volatilityExpectation,
          trendBias: intel.marketConditions.trendBias,
        })
      }
    } catch (e) {
      console.error('Market intel error:', e)
    }
    setIntelLoading(false)
  }

  // Fetch account data on load
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const res = await fetch('/api/stuntman/account-sync')
        const data = await res.json()
        if (data.success) {
          setDataSource(data.dataSource)
          setLastSyncTime(data.syncAge)
          if (data.account) {
            setPropFirmStatus(prev => ({
              ...prev,
              currentBalance: data.account.balance?.netLiquidation || prev.currentBalance,
              totalPnL: data.account.balance?.totalPnL || 0,
              drawdownUsed: data.riskStatus?.trailingDrawdown || 0,
              tradingDays: data.account.tradingDays || 0,
            }))
          }
          if (data.riskStatus) {
            setRiskStatus({
              status: data.riskStatus.riskStatus,
              canTrade: data.riskStatus.canTrade,
              warnings: data.riskStatus.warnings || [],
              recommendations: data.riskStatus.recommendations || [],
            })
          }
        }
      } catch (e) {
        console.error('Failed to fetch account data:', e)
      }
    }
    fetchAccountData()
  }, [])

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      const res = await fetch('/api/stuntman/account-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: propFirmStatus.accountId,
          balance: syncData.balance,
          openPnL: syncData.openPnL,
          closedPnL: syncData.closedPnL,
          trailingDrawdown: syncData.trailingDrawdown,
          tradingDays: syncData.tradingDays,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDataSource('manual')
        setLastSyncTime('just now')
        setPropFirmStatus(prev => ({
          ...prev,
          currentBalance: data.account.balance.netLiquidation,
          totalPnL: data.account.balance.totalPnL,
          drawdownUsed: parseFloat(syncData.trailingDrawdown),
          tradingDays: parseInt(syncData.tradingDays),
        }))
        if (data.riskStatus) {
          setRiskStatus({
            status: data.riskStatus.riskStatus,
            canTrade: data.riskStatus.canTrade,
            warnings: data.riskStatus.warnings || [],
            recommendations: data.riskStatus.recommendations || [],
          })
        }
        setShowSyncModal(false)
      }
    } catch (e) {
      console.error('Sync failed:', e)
    }
  }

  const executeTrade = async (side: 'buy' | 'sell') => {
    try {
      await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: side, market: activeMarket, instrument: selectedPair,
          quantity: activeMarket === 'futures' ? 1 : undefined,
          amount: activeMarket === 'crypto' ? 100 : undefined,
        }),
      })
    } catch (e) { console.error('Trade error:', e) }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  const formatPrice = (price: number) => price >= 1000 ? price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : price.toFixed(4)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">StuntMan Trading</h1>
          <p className="text-sm text-zinc-500">Algorithmic Trading System</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Market Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => { setActiveMarket('futures'); setSelectedPair('ES') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeMarket === 'futures' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Futures
            </button>
            <button
              onClick={() => { setActiveMarket('crypto'); setSelectedPair('BTC_USDT') }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeMarket === 'crypto' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Crypto
            </button>
          </div>
          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Account */}
        <div className="space-y-6">
          {/* Account Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Account Overview</h3>
              {activeMarket === 'futures' && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    dataSource === 'estimated'
                      ? 'text-amber-400 bg-amber-500/10'
                      : dataSource === 'manual'
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {dataSource === 'estimated' ? '⚠️ Estimated' : dataSource === 'manual' ? '📋 Manual Sync' : '🔗 Live'}
                  </span>
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition"
                    title="Sync Account Data"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {activeMarket === 'futures' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Apex 150K</p>
                    <p className="text-xs text-zinc-500">{propFirmStatus.accountId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatCurrency(propFirmStatus.currentBalance)}</p>
                    <p className={`text-xs ${propFirmStatus.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {propFirmStatus.totalPnL >= 0 ? '+' : ''}{formatCurrency(propFirmStatus.totalPnL)}
                    </p>
                  </div>
                </div>

                {/* Drawdown */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Drawdown</span>
                    <span className="text-zinc-400">{formatCurrency(propFirmStatus.drawdownUsed)} / {formatCurrency(propFirmStatus.drawdownLimit)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(propFirmStatus.drawdownUsed / propFirmStatus.drawdownLimit) * 100}%` }} />
                  </div>
                </div>

                {/* Profit Target */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Profit Target</span>
                    <span className="text-zinc-400">{formatCurrency(propFirmStatus.totalPnL)} / {formatCurrency(propFirmStatus.profitTarget)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.max(0, (propFirmStatus.totalPnL / propFirmStatus.profitTarget) * 100)}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Trading Days</p>
                    <p className="font-bold text-white">{propFirmStatus.tradingDays} / {propFirmStatus.minTradingDays}</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 mb-1">Max Contracts</p>
                    <p className="font-bold text-white">{propFirmStatus.maxContracts}</p>
                  </div>
                </div>

                {/* Risk Status or Warning */}
                {riskStatus ? (
                  <div className={`p-3 rounded-lg border ${
                    riskStatus.status === 'SAFE' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    riskStatus.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20' :
                    riskStatus.status === 'DANGER' ? 'bg-orange-500/10 border-orange-500/20' :
                    'bg-red-500/10 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {riskStatus.canTrade ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-xs font-bold ${
                        riskStatus.status === 'SAFE' ? 'text-emerald-400' :
                        riskStatus.status === 'WARNING' ? 'text-amber-400' :
                        riskStatus.status === 'DANGER' ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {riskStatus.status} - {riskStatus.canTrade ? 'Trading Allowed' : 'Trading Blocked'}
                      </span>
                    </div>
                    {riskStatus.warnings.length > 0 && (
                      <div className="space-y-1">
                        {riskStatus.warnings.slice(0, 2).map((w, i) => (
                          <p key={i} className="text-xs text-zinc-400">{w}</p>
                        ))}
                      </div>
                    )}
                    {lastSyncTime && (
                      <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Synced {lastSyncTime}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-400">Account data is estimated.</p>
                      <button
                        onClick={() => setShowSyncModal(true)}
                        className="text-xs text-amber-300 underline hover:text-amber-200 mt-1"
                      >
                        Click to sync from Apex dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">Crypto.com</p>
                  <p className="text-xs text-zinc-500">Live connection</p>
                </div>
              </div>
            )}
          </div>

          {/* Bot Controls */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-3">
            <h3 className="font-semibold text-white mb-3">Bot Controls</h3>
            <button
              onClick={() => runBot('analyze')}
              disabled={botStatus === 'scanning'}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              {botStatus === 'scanning' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Scan Markets
            </button>
            <button
              onClick={fetchMarketIntel}
              disabled={intelLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              {intelLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Fetch News Intel
            </button>
            <button
              onClick={() => setAutoTrading(!autoTrading)}
              className={`w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
                autoTrading ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {autoTrading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {autoTrading ? 'Stop Bot' : 'Start Bot'}
            </button>
          </div>

          {/* Market Intelligence Panel */}
          {marketIntel && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-400" />
                  Market Intel
                </h3>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  marketIntel.canTrade
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {marketIntel.canTrade ? 'SAFE TO TRADE' : 'TRADING BLOCKED'}
                </span>
              </div>

              {/* Risk Level */}
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-3 ${
                marketIntel.riskLevel === 'EXTREME' ? 'bg-red-500/10 border border-red-500/20' :
                marketIntel.riskLevel === 'HIGH' ? 'bg-orange-500/10 border border-orange-500/20' :
                marketIntel.riskLevel === 'MEDIUM' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                'bg-emerald-500/10 border border-emerald-500/20'
              }`}>
                <ShieldAlert className={`w-4 h-4 ${
                  marketIntel.riskLevel === 'EXTREME' ? 'text-red-400' :
                  marketIntel.riskLevel === 'HIGH' ? 'text-orange-400' :
                  marketIntel.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                  'text-emerald-400'
                }`} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">Risk: {marketIntel.riskLevel}</p>
                  <p className="text-xs text-zinc-400">{marketIntel.reason}</p>
                </div>
              </div>

              {/* Sentiment */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">Sentiment</p>
                  <p className={`text-sm font-bold ${
                    marketIntel.sentiment.overall === 'BULLISH' ? 'text-emerald-400' :
                    marketIntel.sentiment.overall === 'BEARISH' ? 'text-red-400' :
                    'text-zinc-400'
                  }`}>
                    {marketIntel.sentiment.overall}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">Score</p>
                  <p className={`text-sm font-bold ${
                    marketIntel.sentiment.score > 0 ? 'text-emerald-400' :
                    marketIntel.sentiment.score < 0 ? 'text-red-400' :
                    'text-zinc-400'
                  }`}>
                    {marketIntel.sentiment.score > 0 ? '+' : ''}{marketIntel.sentiment.score}
                  </p>
                </div>
              </div>

              {/* Volatility & Trend */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">Volatility</p>
                  <p className={`text-xs font-bold ${
                    marketIntel.volatilityExpectation === 'EXTREME' ? 'text-red-400' :
                    marketIntel.volatilityExpectation === 'HIGH' ? 'text-orange-400' :
                    'text-zinc-300'
                  }`}>
                    {marketIntel.volatilityExpectation}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">Trend Bias</p>
                  <p className={`text-xs font-bold ${
                    marketIntel.trendBias === 'BULLISH' ? 'text-emerald-400' :
                    marketIntel.trendBias === 'BEARISH' ? 'text-red-400' :
                    'text-zinc-300'
                  }`}>
                    {marketIntel.trendBias}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {marketIntel.warnings.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 mb-2">Warnings</p>
                  <div className="space-y-1">
                    {marketIntel.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Economic Events */}
              {marketIntel.economicEvents.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 mb-2">Economic Events</p>
                  <div className="space-y-1">
                    {marketIntel.economicEvents.slice(0, 3).map((event, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300">{event.name}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          event.impact === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          event.impact === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-zinc-700 text-zinc-400'
                        }`}>
                          {event.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Headlines */}
              {marketIntel.topHeadlines.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                    <Newspaper className="w-3 h-3" />
                    Top Headlines
                  </p>
                  <div className="space-y-2 max-h-32 overflow-auto">
                    {marketIntel.topHeadlines.slice(0, 3).map((headline, i) => (
                      <div key={i} className="text-xs p-2 bg-zinc-800/50 rounded">
                        <p className="text-zinc-300 line-clamp-2">{headline.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-zinc-500">{headline.source}</span>
                          <span className={`${
                            headline.sentiment === 'BULLISH' ? 'text-emerald-400' :
                            headline.sentiment === 'BEARISH' ? 'text-red-400' :
                            'text-zinc-500'
                          }`}>
                            {headline.sentiment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">AI Signals</h3>
              {lastScan && <span className="text-xs text-zinc-500">{lastScan}</span>}
            </div>
            {signals.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">Click "Scan Markets" to analyze</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {signals.map((sig, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${sig.action === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/20' : sig.action === 'SELL' ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-800/50 border-zinc-700'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{sig.instrument}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${sig.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : sig.action === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {sig.action}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{sig.confidence}% confidence</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center & Right - Chart & Trading */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instrument & Price */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {activeMarket === 'futures'
                    ? futuresContracts.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>)
                    : cryptoPairs.map(c => <option key={c.symbol} value={c.symbol}>{c.name}</option>)
                  }
                </select>
                <div>
                  <p className="text-2xl font-bold text-white">${formatPrice(currentPrice)}</p>
                  <p className={`text-sm ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                </div>
              </div>
              {/* Timeframe */}
              <div className="flex gap-1">
                {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${timeframe === tf ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div ref={chartContainerRef} className="w-full" />
          </div>

          {/* Trade Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => executeTrade('buy')}
              className="py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              <TrendingUp className="w-5 h-5" />
              BUY {activeMarket === 'futures' ? '1 Contract' : '$100'}
            </button>
            <button
              onClick={() => executeTrade('sell')}
              className="py-4 bg-red-500 hover:bg-red-600 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
            >
              <TrendingDown className="w-5 h-5" />
              SELL {activeMarket === 'futures' ? '1 Contract' : '$100'}
            </button>
          </div>

          {/* Webhook Status */}
          {activeMarket === 'futures' && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h3 className="font-semibold text-white mb-3">Webhook Execution Status</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Webhook URL Not Configured</p>
                  <p className="text-xs text-amber-400/70 mt-1">
                    Set FUTURES_WEBHOOK_URL in Vercel env to execute real trades via PickMyTrade.
                    Without it, trades are logged but not sent to your Apex account.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Sync Apex Account Data
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-zinc-400">
                Copy values from your Apex Trader Funding dashboard to get accurate account data.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Current Balance ($)</label>
                  <input
                    type="number"
                    value={syncData.balance}
                    onChange={(e) => setSyncData({ ...syncData, balance: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="150000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Open P&L ($)</label>
                    <input
                      type="number"
                      value={syncData.openPnL}
                      onChange={(e) => setSyncData({ ...syncData, openPnL: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Closed P&L ($)</label>
                    <input
                      type="number"
                      value={syncData.closedPnL}
                      onChange={(e) => setSyncData({ ...syncData, closedPnL: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Trailing Drawdown ($)</label>
                    <input
                      type="number"
                      value={syncData.trailingDrawdown}
                      onChange={(e) => setSyncData({ ...syncData, trailingDrawdown: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Trading Days</label>
                    <input
                      type="number"
                      value={syncData.tradingDays}
                      onChange={(e) => setSyncData({ ...syncData, tradingDays: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">Tip:</strong> Open your Apex dashboard, go to Account Overview, and copy the values shown there. The trailing drawdown is the amount used from your $5,000 limit.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowSyncModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSync}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Sync Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
