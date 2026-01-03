// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
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
  CheckCircle,
  Clock,
  Target,
  DollarSign,
  Activity,
  BarChart2,
  Settings,
  Brain,
  Zap,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface AccountData {
  balance: number
  pnl: number
  drawdownUsed: number
  drawdownLimit: number
  profitTarget: number
  daysRemaining: number
}

interface RiskStatus {
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'VIOLATED'
  canTrade: boolean
  safetyBuffer: number
  maxDailyLoss: number
  requiredDailyProfit: number
  positionSize: number
}

interface ExecutionStatus {
  configured: boolean
  enabled: boolean
}

// =============================================================================
// TRADINGVIEW WIDGET
// =============================================================================

function Chart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '15',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(255, 255, 255, 0.03)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container__widget'
    container.style.height = '100%'
    container.style.width = '100%'

    ref.current.appendChild(container)
    ref.current.appendChild(script)

    return () => { if (ref.current) ref.current.innerHTML = '' }
  }, [symbol])

  return <div ref={ref} style={{ height: '100%', width: '100%' }} />
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StuntMan() {
  const [loading, setLoading] = useState(true)
  const [instrument, setInstrument] = useState<'ES' | 'NQ'>('ES')
  const [showInstrumentMenu, setShowInstrumentMenu] = useState(false)

  // Data
  const [account, setAccount] = useState<AccountData>({
    balance: 150000,
    pnl: 0,
    drawdownUsed: 0,
    drawdownLimit: 5000,
    profitTarget: 9000,
    daysRemaining: 6,
  })
  const [risk, setRisk] = useState<RiskStatus>({
    status: 'SAFE',
    canTrade: true,
    safetyBuffer: 4000,
    maxDailyLoss: 1500,
    requiredDailyProfit: 1500,
    positionSize: 1,
  })
  const [execution, setExecution] = useState<ExecutionStatus>({
    configured: false,
    enabled: false,
  })
  const [dataSource, setDataSource] = useState<'estimated' | 'synced'>('estimated')
  const [tradingOn, setTradingOn] = useState(false)
  const [toggling, setToggling] = useState(false)

  // TradingView symbol
  const tvSymbol = instrument === 'ES' ? 'CME_MINI:ES1!' : 'CME_MINI:NQ1!'

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, execRes] = await Promise.all([
          fetch('/api/stuntman/account-sync?daysRemaining=6'),
          fetch('/api/stuntman/execute'),
        ])

        const accData = await accRes.json()
        const execData = await execRes.json()

        if (accData.success) {
          setDataSource(accData.dataSource || 'estimated')
          setAccount({
            balance: accData.account?.balance?.netLiquidation || 150000,
            pnl: accData.account?.balance?.totalPnL || 0,
            drawdownUsed: accData.riskStatus?.trailingDrawdown || 0,
            drawdownLimit: 5000,
            profitTarget: 9000,
            daysRemaining: accData.riskStatus?.daysRemaining || 6,
          })
          if (accData.riskStatus) {
            setRisk({
              status: accData.riskStatus.riskStatus || 'SAFE',
              canTrade: accData.riskStatus.canTrade ?? true,
              safetyBuffer: accData.riskStatus.safetyBuffer || 4000,
              maxDailyLoss: accData.riskStatus.maxAllowedLossToday || 1500,
              requiredDailyProfit: accData.riskStatus.requiredDailyProfit || 1500,
              positionSize: accData.riskStatus.recommendedPositionSize || 1,
            })
          }
        }

        setExecution({
          configured: execData.configured || false,
          enabled: execData.enabled || false,
        })
        setTradingOn(execData.enabled || false)
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Toggle trading
  const toggleTrading = async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/stuntman/execute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: tradingOn ? 'disable' : 'enable' }),
      })
      const data = await res.json()
      setTradingOn(data.enabled)
    } catch (e) {
      console.error('Toggle failed:', e)
    }
    setToggling(false)
  }

  // Helpers
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const pct = (n: number, total: number) => Math.min(100, Math.max(0, (n / total) * 100))

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2 text-white/50 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Exit</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-sm">
                S
              </div>
              <span className="font-semibold">StuntMan</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {/* Data Source */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs ${
              dataSource === 'synced' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {dataSource === 'estimated' && <AlertTriangle className="w-3 h-3" />}
              {dataSource === 'estimated' ? 'Estimated' : 'Synced'}
            </div>

            {/* Trading Toggle */}
            {execution.configured && (
              <button
                onClick={toggleTrading}
                disabled={toggling}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tradingOn
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {toggling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                {tradingOn ? 'Trading ON' : 'Trading OFF'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Top Section: Account Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Account Card */}
          <div className="lg:col-span-2 bg-white/[0.02] rounded-2xl border border-white/5 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-white/40 text-sm mb-1">Apex 150K Evaluation</p>
                <h2 className="text-4xl font-bold tracking-tight">{fmt(account.balance)}</h2>
                <p className={`text-lg mt-1 ${account.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {account.pnl >= 0 ? '+' : ''}{fmt(account.pnl)}
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  risk.status === 'SAFE' ? 'bg-emerald-500/10 text-emerald-400' :
                  risk.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  <Shield className="w-4 h-4" />
                  {risk.status}
                </div>
                <p className="text-white/40 text-xs mt-2">{account.daysRemaining} days left</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/40">Profit Target</span>
                  <span>{fmt(Math.max(0, account.pnl))} / {fmt(account.profitTarget)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${pct(Math.max(0, account.pnl), account.profitTarget)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/40">Drawdown</span>
                  <span className={account.drawdownUsed > 3000 ? 'text-red-400' : ''}>
                    {fmt(account.drawdownUsed)} / {fmt(account.drawdownLimit)}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      account.drawdownUsed > 4000 ? 'bg-red-500' :
                      account.drawdownUsed > 3000 ? 'bg-amber-500' :
                      'bg-white/20'
                    }`}
                    style={{ width: `${pct(account.drawdownUsed, account.drawdownLimit)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Safety Metrics */}
          <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6">
            <h3 className="text-white/40 text-sm mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Safety Limits
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-sm">Daily Target</span>
                  <span className="text-emerald-400 font-medium">{fmt(risk.requiredDailyProfit)}</span>
                </div>
                <p className="text-white/30 text-xs">Required profit per day</p>
              </div>
              <div className="h-px bg-white/5" />
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-sm">Max Loss Today</span>
                  <span className="text-red-400 font-medium">{fmt(risk.maxDailyLoss)}</span>
                </div>
                <p className="text-white/30 text-xs">Stop trading if reached</p>
              </div>
              <div className="h-px bg-white/5" />
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-sm">Position Size</span>
                  <span className="font-medium">{risk.positionSize} contracts</span>
                </div>
                <p className="text-white/30 text-xs">Recommended size</p>
              </div>
              <div className="h-px bg-white/5" />
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-sm">Safety Buffer</span>
                  <span className="font-medium">{fmt(risk.safetyBuffer)}</span>
                </div>
                <p className="text-white/30 text-xs">Cushion before limits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden mb-6">
          {/* Chart Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="relative">
              <button
                onClick={() => setShowInstrumentMenu(!showInstrumentMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                <span className="font-medium">{instrument === 'ES' ? 'E-mini S&P 500' : 'E-mini Nasdaq'}</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
              {showInstrumentMenu && (
                <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden z-10">
                  <button
                    onClick={() => { setInstrument('ES'); setShowInstrumentMenu(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 ${instrument === 'ES' ? 'bg-white/5' : ''}`}
                  >
                    ES - E-mini S&P 500
                  </button>
                  <button
                    onClick={() => { setInstrument('NQ'); setShowInstrumentMenu(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 ${instrument === 'NQ' ? 'bg-white/5' : ''}`}
                  >
                    NQ - E-mini Nasdaq
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live
            </div>
          </div>

          {/* Chart */}
          <div className="h-[500px]">
            <Chart symbol={tvSymbol} />
          </div>
        </div>

        {/* Trading Controls */}
        {execution.configured && (
          <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Quick Trade
              </h3>
              <div className="text-sm text-white/40">
                {instrument} • {risk.positionSize} contract{risk.positionSize > 1 ? 's' : ''}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={!tradingOn}
                className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/20 text-black font-bold text-lg transition flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                BUY
              </button>
              <button
                disabled={!tradingOn}
                className="py-4 rounded-xl bg-red-500 hover:bg-red-400 disabled:bg-white/5 disabled:text-white/20 text-white font-bold text-lg transition flex items-center justify-center gap-2"
              >
                <TrendingDown className="w-5 h-5" />
                SELL
              </button>
            </div>

            {!tradingOn && (
              <p className="text-center text-white/30 text-sm mt-4">
                Enable trading above to place orders
              </p>
            )}
          </div>
        )}

        {/* Not Configured State */}
        {!execution.configured && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="font-medium text-lg mb-2">PickMyTrade Not Connected</h3>
            <p className="text-white/50 text-sm mb-4 max-w-md mx-auto">
              Connect PickMyTrade to enable automated trade execution on your Apex account.
            </p>
            <a
              href="https://pickmytrade.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition"
            >
              Setup PickMyTrade
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
