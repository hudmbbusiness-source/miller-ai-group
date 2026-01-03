// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Pause,
  Bot,
  Brain,
  Trophy,
  RefreshCw,
  AlertTriangle,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Upload,
  Clock,
  Target,
  X,
  Power,
  Zap,
  BarChart3,
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
}

interface MarketIntelligence {
  canTrade: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  reason: string
  sentiment: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED'
    score: number
  }
  topHeadlines: Array<{ title: string; sentiment: string; source: string }>
}

// =============================================================================
// TRADINGVIEW WIDGET
// =============================================================================

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: '15',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(9, 9, 11, 1)',
      gridColor: 'rgba(39, 39, 42, 0.3)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
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
      style={{ height: '500px', width: '100%' }}
    />
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StuntManTerminal() {
  // Core State
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'estimated' | 'manual' | 'live'>('estimated')

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
  })
  const [tradingEnabled, setTradingEnabled] = useState(false)
  const [enablingTrade, setEnablingTrade] = useState(false)

  // Market State
  const [selectedInstrument, setSelectedInstrument] = useState<'ES' | 'NQ'>('ES')
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null)
  const [intelLoading, setIntelLoading] = useState(false)

  // UI State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncData, setSyncData] = useState({
    balance: '',
    openPnL: '',
    closedPnL: '',
    trailingDrawdown: '',
    tradingDays: '',
  })

  // TradingView symbol mapping
  const tvSymbol = selectedInstrument === 'ES' ? 'CME_MINI:ES1!' : 'CME_MINI:NQ1!'

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountRes, execRes] = await Promise.all([
          fetch('/api/stuntman/account-sync?daysRemaining=6'),
          fetch('/api/stuntman/execute'),
        ])

        const accountData = await accountRes.json()
        const execData = await execRes.json()

        if (accountData.success) {
          setDataSource(accountData.dataSource || 'estimated')
          if (accountData.account) {
            setAccount(prev => ({
              ...prev,
              balance: accountData.account.balance?.netLiquidation || prev.balance,
              totalPnL: accountData.account.balance?.totalPnL || 0,
              drawdownUsed: accountData.riskStatus?.trailingDrawdown || 0,
            }))
          }
          if (accountData.riskStatus) {
            setRiskStatus({
              status: accountData.riskStatus.riskStatus,
              canTrade: accountData.riskStatus.canTrade,
              warnings: accountData.riskStatus.warnings || [],
              recommendations: accountData.riskStatus.recommendations || [],
              safetyBuffer: accountData.riskStatus.safetyBuffer,
              maxAllowedLossToday: accountData.riskStatus.maxAllowedLossToday,
              recommendedPositionSize: accountData.riskStatus.recommendedPositionSize,
              daysRemaining: accountData.riskStatus.daysRemaining,
              requiredDailyProfit: accountData.riskStatus.requiredDailyProfit,
            })
          }
        }

        setExecutionStatus({
          configured: execData.configured || false,
          enabled: execData.enabled || false,
        })
        setTradingEnabled(execData.enabled || false)
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const toggleTrading = async () => {
    setEnablingTrade(true)
    try {
      const action = tradingEnabled ? 'disable' : 'enable'
      const res = await fetch('/api/stuntman/execute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setTradingEnabled(data.enabled)
    } catch (e) {
      console.error('Toggle failed:', e)
    }
    setEnablingTrade(false)
  }

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
          sentiment: {
            overall: intel.filter.sentiment?.overall || 'NEUTRAL',
            score: intel.filter.sentiment?.score || 0,
          },
          topHeadlines: (intel.filter.sentiment?.headlines || []).slice(0, 3).map((h: any) => ({
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

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-500" />
              <span className="text-lg font-bold text-white">StuntMan</span>
            </div>
            <div className="h-6 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-zinc-400">Apex 150K</span>
              <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">
                {riskStatus?.daysRemaining || 6} days left
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Data Source */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
              dataSource === 'manual' ? 'bg-blue-500/10 text-blue-400' :
              dataSource === 'live' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-amber-500/10 text-amber-400'
            }`}>
              {dataSource === 'estimated' && <AlertTriangle className="w-3 h-3" />}
              {dataSource === 'estimated' ? 'Estimated' : dataSource === 'manual' ? 'Synced' : 'Live'}
            </div>

            {/* Sync Button */}
            <button
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Sync
            </button>

            {/* Trading Toggle */}
            {executionStatus.configured && (
              <button
                onClick={toggleTrading}
                disabled={enablingTrade}
                className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition ${
                  tradingEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {enablingTrade ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : tradingEnabled ? (
                  <><Power className="w-4 h-4" /> Trading ON</>
                ) : (
                  <><Power className="w-4 h-4" /> Trading OFF</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {/* Balance */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">Balance</p>
            <p className="text-xl font-bold text-white">{formatCurrency(account.balance)}</p>
          </div>

          {/* P&L */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">P&L</p>
            <p className={`text-xl font-bold ${account.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {account.totalPnL >= 0 ? '+' : ''}{formatCurrency(account.totalPnL)}
            </p>
          </div>

          {/* Target Progress */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">Target</p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-bold text-white">
                {Math.round((Math.max(0, account.totalPnL) / account.profitTarget) * 100)}%
              </p>
              <p className="text-xs text-zinc-500">of {formatCurrency(account.profitTarget)}</p>
            </div>
          </div>

          {/* Drawdown */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">Drawdown</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(account.drawdownUsed)}
              <span className="text-xs text-zinc-500 font-normal"> / {formatCurrency(account.drawdownLimit)}</span>
            </p>
          </div>

          {/* Risk Status */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">Risk Status</p>
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${getRiskColor(riskStatus?.status || 'SAFE')}`} />
              <p className={`text-lg font-bold ${getRiskColor(riskStatus?.status || 'SAFE')}`}>
                {riskStatus?.status || 'SAFE'}
              </p>
            </div>
          </div>

          {/* Daily Target */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">Daily Target</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(riskStatus?.requiredDailyProfit || 1500)}
              <span className="text-xs text-zinc-500 font-normal">/day</span>
            </p>
          </div>
        </div>

        {/* Main Grid: Chart + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chart - Takes 3/4 */}
          <div className="lg:col-span-3 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Chart Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value as 'ES' | 'NQ')}
                  className="bg-zinc-800 border-none rounded px-3 py-1.5 text-sm text-white font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ES">ES - E-mini S&P 500</option>
                  <option value="NQ">NQ - E-mini Nasdaq 100</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
            </div>

            {/* TradingView Chart */}
            <TradingViewChart symbol={tvSymbol} />
          </div>

          {/* Right Sidebar - Takes 1/4 */}
          <div className="space-y-4">
            {/* Quick Trade Panel */}
            {executionStatus.configured && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quick Trade
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Instrument</span>
                    <span className="text-white font-medium">{selectedInstrument}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Contracts</span>
                    <span className="text-white font-medium">{riskStatus?.recommendedPositionSize || 1}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Max Loss</span>
                    <span className="text-red-400 font-medium">{formatCurrency(riskStatus?.maxAllowedLossToday || 1500)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    disabled={!tradingEnabled}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm font-bold text-white transition flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-4 h-4" />
                    BUY
                  </button>
                  <button
                    disabled={!tradingEnabled}
                    className="py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm font-bold text-white transition flex items-center justify-center gap-1"
                  >
                    <TrendingDown className="w-4 h-4" />
                    SELL
                  </button>
                </div>

                {!tradingEnabled && (
                  <p className="text-xs text-center text-zinc-500 mt-2">
                    Enable trading to place orders
                  </p>
                )}
              </div>
            )}

            {/* Market Intelligence */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Market Intel
                </h3>
                <button
                  onClick={fetchMarketIntel}
                  disabled={intelLoading}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 transition"
                >
                  {intelLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Brain className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {!marketIntel ? (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Click to analyze market sentiment
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Status */}
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    marketIntel.canTrade ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {marketIntel.canTrade ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      marketIntel.canTrade ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {marketIntel.canTrade ? 'Safe to Trade' : 'Caution'}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-800/50 rounded p-2 text-center">
                      <p className="text-[10px] text-zinc-500">Sentiment</p>
                      <p className={`text-sm font-bold ${
                        marketIntel.sentiment.overall === 'BULLISH' ? 'text-emerald-400' :
                        marketIntel.sentiment.overall === 'BEARISH' ? 'text-red-400' :
                        'text-zinc-400'
                      }`}>
                        {marketIntel.sentiment.overall}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-2 text-center">
                      <p className="text-[10px] text-zinc-500">Risk</p>
                      <p className={`text-sm font-bold ${
                        marketIntel.riskLevel === 'LOW' ? 'text-emerald-400' :
                        marketIntel.riskLevel === 'MEDIUM' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {marketIntel.riskLevel}
                      </p>
                    </div>
                  </div>

                  {/* Headlines */}
                  {marketIntel.topHeadlines.length > 0 && (
                    <div className="space-y-1.5">
                      {marketIntel.topHeadlines.map((h, i) => (
                        <div key={i} className="text-[11px] p-1.5 bg-zinc-800/30 rounded">
                          <p className="text-zinc-300 line-clamp-2">{h.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Safety Limits */}
            {riskStatus && (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Safety Limits
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Safety Buffer</span>
                    <span className="text-white font-medium">{formatCurrency(riskStatus.safetyBuffer || 4000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Daily Loss</span>
                    <span className="text-red-400 font-medium">{formatCurrency(riskStatus.maxAllowedLossToday || 1500)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Position Size</span>
                    <span className="text-white font-medium">{riskStatus.recommendedPositionSize || 1} contracts</span>
                  </div>
                </div>
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
                Enter values from your Apex dashboard.
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
    </div>
  )
}
