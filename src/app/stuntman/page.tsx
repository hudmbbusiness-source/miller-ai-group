// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Pause,
  DollarSign,
  Bot,
  Brain,
  Trophy,
  Wallet,
  RefreshCw,
  AlertTriangle,
  Settings,
  Globe,
  Zap,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Radio,
  Upload,
  Clock,
  Target,
  Shield,
  X,
  ExternalLink,
  Info,
  Plug,
  AlertCircle,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface AccountData {
  accountId: string
  balance: number
  totalPnL: number
  drawdownUsed: number
  drawdownLimit: number
  profitTarget: number
  tradingDays: number
  minTradingDays: number
  maxContracts: number
}

interface RiskStatus {
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'VIOLATED'
  canTrade: boolean
  warnings: string[]
  recommendations: string[]
  safetyBuffer?: number
  maxAllowedLossToday?: number
  recommendedPositionSize?: number
  daysRemaining?: number
  requiredDailyProfit?: number
}

interface ExecutionStatus {
  configured: boolean
  enabled: boolean
  message?: string
  setupInstructions?: string[]
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
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StuntManTerminal() {
  // Core State
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'estimated' | 'manual' | 'live'>('estimated')
  const [lastSync, setLastSync] = useState<string | null>(null)

  // Account State
  const [account, setAccount] = useState<AccountData>({
    accountId: 'APEX-456334',
    balance: 150000,
    totalPnL: 0,
    drawdownUsed: 0,
    drawdownLimit: 5000,
    profitTarget: 9000,
    tradingDays: 0,
    minTradingDays: 7,
    maxContracts: 17,
  })
  const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null)

  // Execution State
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({
    configured: false,
    enabled: false,
    message: 'Checking configuration...',
  })

  // Market State
  const [selectedInstrument, setSelectedInstrument] = useState<'ES' | 'NQ'>('ES')
  const [timeframe, setTimeframe] = useState('15m')
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null)
  const [intelLoading, setIntelLoading] = useState(false)

  // UI State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [syncData, setSyncData] = useState({
    balance: '',
    openPnL: '',
    closedPnL: '',
    trailingDrawdown: '',
    tradingDays: '',
  })

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  // Fetch account data on mount
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const res = await fetch('/api/stuntman/account-sync?daysRemaining=6')
        const data = await res.json()

        if (data.success) {
          setDataSource(data.dataSource || 'estimated')
          setLastSync(data.syncAge)

          if (data.account) {
            setAccount(prev => ({
              ...prev,
              balance: data.account.balance?.netLiquidation || prev.balance,
              totalPnL: data.account.balance?.totalPnL || 0,
              drawdownUsed: data.riskStatus?.trailingDrawdown || 0,
            }))
          }

          if (data.riskStatus) {
            setRiskStatus({
              status: data.riskStatus.riskStatus,
              canTrade: data.riskStatus.canTrade,
              warnings: data.riskStatus.warnings || [],
              recommendations: data.riskStatus.recommendations || [],
              safetyBuffer: data.riskStatus.safetyBuffer,
              maxAllowedLossToday: data.riskStatus.maxAllowedLossToday,
              recommendedPositionSize: data.riskStatus.recommendedPositionSize,
              daysRemaining: data.riskStatus.daysRemaining,
              requiredDailyProfit: data.riskStatus.requiredDailyProfit,
            })
          }
        }
      } catch (e) {
        console.error('Failed to fetch account data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchAccountData()
  }, [])

  // Fetch execution status on mount
  useEffect(() => {
    const fetchExecutionStatus = async () => {
      try {
        const res = await fetch('/api/stuntman/execute')
        const data = await res.json()

        setExecutionStatus({
          configured: data.configured || false,
          enabled: data.enabled || false,
          message: data.message,
          setupInstructions: data.setupInstructions,
        })
      } catch (e) {
        setExecutionStatus({
          configured: false,
          enabled: false,
          message: 'Failed to check execution status',
        })
      }
    }

    fetchExecutionStatus()
  }, [])

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
      height: 400,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries

    // Show empty state message
    candleSeries.setData([])

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); chart.remove() }
  }, [])

  // =============================================================================
  // ACTIONS
  // =============================================================================

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
          warnings: intel.filter.warnings || [],
          sentiment: {
            overall: intel.filter.sentiment?.overall || 'NEUTRAL',
            score: intel.filter.sentiment?.score || 0,
            confidence: intel.filter.sentiment?.confidence || 0,
          },
          keyThemes: intel.filter.sentiment?.keyThemes || [],
          economicEvents: intel.economicCalendar || [],
          topHeadlines: (intel.filter.sentiment?.headlines || []).slice(0, 5).map((h: any) => ({
            title: h.title,
            sentiment: h.sentiment,
            source: h.source,
          })),
        })
      }
    } catch (e) {
      console.error('Market intel error:', e)
    }
    setIntelLoading(false)
  }

  const handleManualSync = async () => {
    try {
      const res = await fetch('/api/stuntman/account-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.accountId,
          balance: syncData.balance,
          openPnL: syncData.openPnL,
          closedPnL: syncData.closedPnL,
          trailingDrawdown: syncData.trailingDrawdown,
          tradingDays: syncData.tradingDays,
          daysRemaining: 6,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setDataSource('manual')
        setLastSync('just now')
        setAccount(prev => ({
          ...prev,
          balance: data.account.balance.netLiquidation,
          totalPnL: data.account.balance.totalPnL,
          drawdownUsed: parseFloat(syncData.trailingDrawdown) || 0,
          tradingDays: parseInt(syncData.tradingDays) || 0,
        }))

        if (data.riskStatus) {
          setRiskStatus({
            status: data.riskStatus.riskStatus,
            canTrade: data.riskStatus.canTrade,
            warnings: data.riskStatus.warnings || [],
            recommendations: data.riskStatus.recommendations || [],
            safetyBuffer: data.riskStatus.safetyBuffer,
            maxAllowedLossToday: data.riskStatus.maxAllowedLossToday,
            recommendedPositionSize: data.riskStatus.recommendedPositionSize,
            daysRemaining: data.riskStatus.daysRemaining,
            requiredDailyProfit: data.riskStatus.requiredDailyProfit,
          })
        }

        setShowSyncModal(false)
        setSyncData({ balance: '', openPnL: '', closedPnL: '', trailingDrawdown: '', tradingDays: '' })
      }
    } catch (e) {
      console.error('Sync failed:', e)
    }
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'SAFE': return 'text-emerald-400'
      case 'WARNING': return 'text-amber-400'
      case 'DANGER': return 'text-orange-400'
      case 'VIOLATED': return 'text-red-400'
      default: return 'text-zinc-400'
    }
  }

  const getRiskBg = (status: string) => {
    switch (status) {
      case 'SAFE': return 'bg-emerald-500/10 border-emerald-500/20'
      case 'WARNING': return 'bg-amber-500/10 border-amber-500/20'
      case 'DANGER': return 'bg-orange-500/10 border-orange-500/20'
      case 'VIOLATED': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-zinc-800 border-zinc-700'
    }
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-500" />
            StuntMan Trading
          </h1>
          <p className="text-sm text-zinc-500">Apex 150K Evaluation • 6 Days Remaining</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Data Source Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            dataSource === 'manual' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            dataSource === 'live' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {dataSource === 'estimated' && <AlertTriangle className="w-3 h-3" />}
            {dataSource === 'manual' && <CheckCircle className="w-3 h-3" />}
            {dataSource === 'live' && <Radio className="w-3 h-3" />}
            {dataSource === 'estimated' ? 'Estimated Data' : dataSource === 'manual' ? 'Manual Sync' : 'Live'}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition"
          >
            <Upload className="w-4 h-4" />
            Sync
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Account & Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* Account Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Apex 150K Evaluation</h3>
                  <p className="text-xs text-zinc-500">{account.accountId}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Balance */}
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-white">{formatCurrency(account.balance)}</p>
                <p className={`text-sm ${account.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {account.totalPnL >= 0 ? '+' : ''}{formatCurrency(account.totalPnL)} P&L
                </p>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                {/* Profit Target */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Profit Target</span>
                    <span className="text-zinc-300 font-medium">
                      {formatCurrency(Math.max(0, account.totalPnL))} / {formatCurrency(account.profitTarget)}
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (account.totalPnL / account.profitTarget) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Drawdown */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Drawdown Used</span>
                    <span className="text-zinc-300 font-medium">
                      {formatCurrency(account.drawdownUsed)} / {formatCurrency(account.drawdownLimit)}
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (account.drawdownUsed / account.drawdownLimit) > 0.8 ? 'bg-red-500' :
                        (account.drawdownUsed / account.drawdownLimit) > 0.6 ? 'bg-orange-500' :
                        (account.drawdownUsed / account.drawdownLimit) > 0.4 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${(account.drawdownUsed / account.drawdownLimit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-500">Trading Days</p>
                  <p className="text-lg font-bold text-white">{account.tradingDays}/{account.minTradingDays}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-500">Max Contracts</p>
                  <p className="text-lg font-bold text-white">{account.maxContracts}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Status Card */}
          {riskStatus && (
            <div className={`rounded-xl border p-4 ${getRiskBg(riskStatus.status)}`}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className={`w-5 h-5 ${getRiskColor(riskStatus.status)}`} />
                <span className={`font-bold ${getRiskColor(riskStatus.status)}`}>
                  {riskStatus.status}
                </span>
                <span className="text-xs text-zinc-400">
                  {riskStatus.canTrade ? '• Trading Allowed' : '• Trading Blocked'}
                </span>
              </div>

              {/* Safety Metrics */}
              {riskStatus.safetyBuffer !== undefined && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Safety Buffer</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(riskStatus.safetyBuffer)}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Max Loss Today</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(riskStatus.maxAllowedLossToday || 0)}</p>
                  </div>
                </div>
              )}

              {/* Daily Target */}
              {riskStatus.requiredDailyProfit !== undefined && riskStatus.requiredDailyProfit > 0 && (
                <div className="bg-black/20 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Required Daily Profit</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatCurrency(riskStatus.requiredDailyProfit)}/day
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {riskStatus.daysRemaining} days remaining to reach {formatCurrency(account.profitTarget)}
                  </p>
                </div>
              )}

              {/* Warnings */}
              {riskStatus.warnings.length > 0 && (
                <div className="space-y-1">
                  {riskStatus.warnings.slice(0, 3).map((w, i) => (
                    <p key={i} className="text-xs text-zinc-300">{w}</p>
                  ))}
                </div>
              )}

              {lastSync && (
                <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last synced: {lastSync}
                </p>
              )}
            </div>
          )}

          {/* Execution Status Card */}
          <div className={`rounded-xl border p-4 ${
            executionStatus.configured && executionStatus.enabled
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Plug className={`w-5 h-5 ${executionStatus.configured ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="font-semibold text-white">Trade Execution</span>
            </div>

            {!executionStatus.configured ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Not Connected</p>
                    <p className="text-xs text-amber-400/80 mt-1">
                      PickMyTrade is required to execute real trades on your Apex account.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSetupModal(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition"
                >
                  <Settings className="w-4 h-4" />
                  Setup PickMyTrade
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">PickMyTrade Connected</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {executionStatus.enabled
                    ? 'Automated trading is ENABLED'
                    : 'Automated trading is disabled'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Chart & Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Section */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value as 'ES' | 'NQ')}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="ES">ES - E-mini S&P 500</option>
                  <option value="NQ">NQ - E-mini Nasdaq</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {['5m', '15m', '1h', '4h'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      timeframe === tf
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Container */}
            <div className="relative">
              <div ref={chartContainerRef} className="w-full" />

              {/* No Data Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
                <div className="text-center p-6">
                  <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium mb-2">Live Charts Coming Soon</p>
                  <p className="text-xs text-zinc-500 max-w-xs">
                    Real-time {selectedInstrument} futures charts will be available once connected to a data provider.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Market Intelligence */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Market Intelligence
              </h3>
              <button
                onClick={fetchMarketIntel}
                disabled={intelLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition"
              >
                {intelLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                {intelLoading ? 'Analyzing...' : 'Analyze News'}
              </button>
            </div>

            {!marketIntel ? (
              <div className="text-center py-8">
                <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Click "Analyze News" to get real-time market intelligence</p>
                <p className="text-xs text-zinc-600 mt-1">Uses LangSearch to analyze news, sentiment, and economic events</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Trading Status */}
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  marketIntel.canTrade
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {marketIntel.canTrade ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className={`font-medium ${marketIntel.canTrade ? 'text-emerald-400' : 'text-red-400'}`}>
                      {marketIntel.canTrade ? 'Safe to Trade' : 'Trading Not Recommended'}
                    </p>
                    <p className="text-xs text-zinc-400">{marketIntel.reason}</p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">Sentiment</p>
                    <p className={`font-bold ${
                      marketIntel.sentiment.overall === 'BULLISH' ? 'text-emerald-400' :
                      marketIntel.sentiment.overall === 'BEARISH' ? 'text-red-400' :
                      'text-zinc-400'
                    }`}>
                      {marketIntel.sentiment.overall}
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">Risk Level</p>
                    <p className={`font-bold ${
                      marketIntel.riskLevel === 'EXTREME' ? 'text-red-400' :
                      marketIntel.riskLevel === 'HIGH' ? 'text-orange-400' :
                      marketIntel.riskLevel === 'MEDIUM' ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {marketIntel.riskLevel}
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-1">Score</p>
                    <p className={`font-bold ${
                      marketIntel.sentiment.score > 0 ? 'text-emerald-400' :
                      marketIntel.sentiment.score < 0 ? 'text-red-400' :
                      'text-zinc-400'
                    }`}>
                      {marketIntel.sentiment.score > 0 ? '+' : ''}{marketIntel.sentiment.score}
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {marketIntel.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-zinc-500 font-medium">Warnings</p>
                    {marketIntel.warnings.slice(0, 3).map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-amber-500/5 rounded border border-amber-500/10">
                        <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-amber-300">{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Headlines */}
                {marketIntel.topHeadlines.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium mb-2">Top Headlines</p>
                    <div className="space-y-2">
                      {marketIntel.topHeadlines.slice(0, 3).map((h, i) => (
                        <div key={i} className="text-xs p-2 bg-zinc-800/50 rounded-lg">
                          <p className="text-zinc-300 line-clamp-1">{h.title}</p>
                          <div className="flex justify-between mt-1 text-zinc-500">
                            <span>{h.source}</span>
                            <span className={
                              h.sentiment === 'BULLISH' ? 'text-emerald-400' :
                              h.sentiment === 'BEARISH' ? 'text-red-400' :
                              'text-zinc-500'
                            }>{h.sentiment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Sync Account Data
              </h3>
              <button onClick={() => setShowSyncModal(false)} className="p-1 hover:bg-zinc-800 rounded">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-zinc-400">
                Enter your current account values from the Apex Trader Funding dashboard.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Current Balance ($)</label>
                  <input
                    type="number"
                    value={syncData.balance}
                    onChange={(e) => setSyncData({ ...syncData, balance: e.target.value })}
                    placeholder="150000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Open P&L ($)</label>
                    <input
                      type="number"
                      value={syncData.openPnL}
                      onChange={(e) => setSyncData({ ...syncData, openPnL: e.target.value })}
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Closed P&L ($)</label>
                    <input
                      type="number"
                      value={syncData.closedPnL}
                      onChange={(e) => setSyncData({ ...syncData, closedPnL: e.target.value })}
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
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
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Trading Days</label>
                    <input
                      type="number"
                      value={syncData.tradingDays}
                      onChange={(e) => setSyncData({ ...syncData, tradingDays: e.target.value })}
                      placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowSyncModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSync}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
              >
                Sync Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Setup PickMyTrade
              </h3>
              <button onClick={() => setShowSetupModal(false)} className="p-1 hover:bg-zinc-800 rounded">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-zinc-400">
                PickMyTrade connects your trading signals to your Apex account for automated execution.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="text-sm font-medium text-white">Create PickMyTrade Account</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Sign up at pickmytrade.io (~$50/month)</p>
                    <a
                      href="https://pickmytrade.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1"
                    >
                      Visit PickMyTrade <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="text-sm font-medium text-white">Connect Rithmic Account</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Use your Apex credentials:</p>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">
                      User: {account.accountId}<br />
                      System: Apex
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="text-sm font-medium text-white">Get API Token</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Copy your token from PickMyTrade dashboard</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <p className="text-sm font-medium text-white">Add to Vercel</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Add <code className="text-emerald-400">PICKMYTRADE_TOKEN</code> to your Vercel environment variables
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400">
                  <strong>Note:</strong> Without PickMyTrade, signals are generated but trades won't execute on your Apex account.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowSetupModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
