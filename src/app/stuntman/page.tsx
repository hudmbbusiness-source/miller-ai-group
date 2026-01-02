// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart } from 'lightweight-charts'
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
  ChevronDown,
  Play,
  Pause,
  Circle,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  LineChart,
  CandlestickChart,
  Layers,
  Bot,
  Cpu,
  Brain,
  Eye,
  EyeOff,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface RealBalance {
  currency: string
  quantity: number
  valueUSD: number
}

interface Signal {
  instrument: string
  action: string
  confidence: number
  risk_score: number
  stop_loss: number
  take_profit: number
  sources: Array<{ name: string; signal: string; strength: number }>
}

interface Trade {
  id: string
  instrument: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  timestamp: number
  pnl?: number
  status: 'pending' | 'filled' | 'cancelled'
}

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
}

// =============================================================================
// PROFESSIONAL TRADING TERMINAL
// =============================================================================

export default function StuntManTerminal() {
  // State
  const [selectedPair, setSelectedPair] = useState('BTC_USDT')
  const [realBalances, setRealBalances] = useState<RealBalance[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [connected, setConnected] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange24h, setPriceChange24h] = useState(0)
  const [high24h, setHigh24h] = useState(0)
  const [low24h, setLow24h] = useState(0)
  const [volume24h, setVolume24h] = useState(0)
  const [signals, setSignals] = useState<Signal[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [bids, setBids] = useState<OrderBookLevel[]>([])
  const [asks, setAsks] = useState<OrderBookLevel[]>([])
  const [autoTrading, setAutoTrading] = useState(false)
  const [botStatus, setBotStatus] = useState<'idle' | 'scanning' | 'trading'>('idle')
  const [lastScan, setLastScan] = useState<string>('')
  const [timeframe, setTimeframe] = useState('15m')
  const [showIndicators, setShowIndicators] = useState(true)

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const ema9Ref = useRef<any>(null)
  const ema21Ref = useRef<any>(null)

  // Trading pairs
  const pairs = [
    { symbol: 'BTC_USDT', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH_USDT', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'SOL_USDT', name: 'Solana', icon: '◎' },
    { symbol: 'BNB_USDT', name: 'BNB', icon: '⬡' },
    { symbol: 'XRP_USDT', name: 'Ripple', icon: '✕' },
    { symbol: 'DOGE_USDT', name: 'Dogecoin', icon: 'Ð' },
  ]

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  // Fetch real balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/stuntman/balance')
        const data = await res.json()
        if (data.success) {
          setRealBalances(data.balances || [])
          setTotalBalance(data.totalUSD || 0)
          setConnected(true)
        }
      } catch (e) {
        console.error('Balance fetch error:', e)
      }
    }
    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch ticker data
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch(`https://api.crypto.com/exchange/v1/public/get-ticker?instrument_name=${selectedPair}`)
        const data = await res.json()
        if (data.code === 0 && data.result?.data?.[0]) {
          const t = data.result.data[0]
          setCurrentPrice(parseFloat(t.a))
          setPriceChange24h(parseFloat(t.c) * 100)
          setHigh24h(parseFloat(t.h))
          setLow24h(parseFloat(t.l))
          setVolume24h(parseFloat(t.v) * parseFloat(t.a))
        }
      } catch (e) {
        console.error('Ticker error:', e)
      }
    }
    fetchTicker()
    const interval = setInterval(fetchTicker, 2000) // Fast updates
    return () => clearInterval(interval)
  }, [selectedPair])

  // Fetch order book
  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const res = await fetch(`https://api.crypto.com/exchange/v1/public/get-book?instrument_name=${selectedPair}&depth=15`)
        const data = await res.json()
        if (data.code === 0 && data.result?.data?.[0]) {
          const book = data.result.data[0]

          let bidTotal = 0
          const parsedBids = (book.bids || []).slice(0, 10).map((b: any) => {
            bidTotal += parseFloat(b[1])
            return { price: parseFloat(b[0]), quantity: parseFloat(b[1]), total: bidTotal }
          })

          let askTotal = 0
          const parsedAsks = (book.asks || []).slice(0, 10).map((a: any) => {
            askTotal += parseFloat(a[1])
            return { price: parseFloat(a[0]), quantity: parseFloat(a[1]), total: askTotal }
          })

          setBids(parsedBids)
          setAsks(parsedAsks.reverse())
        }
      } catch (e) {
        console.error('Order book error:', e)
      }
    }
    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 1000)
    return () => clearInterval(interval)
  }, [selectedPair])

  // =============================================================================
  // CANDLESTICK CHART
  // =============================================================================

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#525252', style: 2 },
        horzLine: { color: '#525252', style: 2 },
      },
      rightPriceScale: {
        borderColor: '#262626',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#262626',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
    })

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    // Volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    // EMA 9
    const ema9 = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    // EMA 21
    const ema21 = chart.addLineSeries({
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
              color: c.close >= c.open ? '#22c55e40' : '#ef444440',
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
  }, [selectedPair, timeframe, showIndicators])

  // EMA calculation
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
  // TRADING BOT
  // =============================================================================

  const runBot = async (mode: 'analyze' | 'trade') => {
    setBotStatus('scanning')
    try {
      const res = await fetch('/api/stuntman/live-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode }),
      })
      const data = await res.json()

      if (data.success) {
        setSignals(data.signals || [])
        setLastScan(new Date().toLocaleTimeString())

        if (mode === 'trade' && data.trades?.length > 0) {
          setTrades(prev => [...data.trades, ...prev].slice(0, 50))
          setBotStatus('trading')
        } else {
          setBotStatus('idle')
        }
      }
    } catch (e) {
      console.error('Bot error:', e)
      setBotStatus('idle')
    }
  }

  // Auto-trading loop
  useEffect(() => {
    if (!autoTrading) return

    runBot('trade')
    const interval = setInterval(() => runBot('trade'), 120000)
    return () => clearInterval(interval)
  }, [autoTrading])

  // =============================================================================
  // RENDER
  // =============================================================================

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (price >= 1) return price.toFixed(4)
    return price.toFixed(6)
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`
    return `$${vol.toFixed(2)}`
  }

  const maxBidTotal = bids.length > 0 ? Math.max(...bids.map(b => b.total)) : 1
  const maxAskTotal = asks.length > 0 ? Math.max(...asks.map(a => a.total)) : 1

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">StuntMan</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">PRO</span>
          </div>

          {/* Pair Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-emerald-500"
            >
              {pairs.map(p => (
                <option key={p.symbol} value={p.symbol}>{p.icon} {p.symbol.replace('_', '/')}</option>
              ))}
            </select>
          </div>

          {/* Price Display */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-2xl font-bold font-mono">${formatPrice(currentPrice)}</span>
              <span className={`ml-2 text-sm font-medium ${priceChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div>H: <span className="text-zinc-300">${formatPrice(high24h)}</span></div>
              <div>L: <span className="text-zinc-300">${formatPrice(low24h)}</span></div>
            </div>
            <div className="text-xs text-zinc-500">
              <div>Vol: <span className="text-zinc-300">{formatVolume(volume24h)}</span></div>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-xs text-zinc-400">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-1.5">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="font-mono font-medium">${totalBalance.toFixed(2)}</span>
          </div>

          {/* Bot Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            autoTrading ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-400'
          }`}>
            {botStatus === 'scanning' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {botStatus === 'trading' && <Activity className="w-4 h-4" />}
            {botStatus === 'idle' && <Circle className="w-4 h-4" />}
            <span className="text-xs font-medium uppercase">{botStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left Sidebar - Watchlist & Positions */}
        <div className="w-64 border-r border-zinc-800 flex flex-col">
          {/* Portfolio */}
          <div className="p-4 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 mb-2">PORTFOLIO</div>
            <div className="space-y-2">
              {realBalances.map(bal => (
                <div key={bal.currency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                      {bal.currency.slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium">{bal.currency}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{bal.quantity < 0.001 ? bal.quantity.toFixed(8) : bal.quantity.toFixed(4)}</div>
                    <div className="text-xs text-zinc-500">${bal.valueUSD.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signals */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-zinc-500">AI SIGNALS</div>
              {lastScan && <div className="text-xs text-zinc-600">{lastScan}</div>}
            </div>
            <div className="space-y-2">
              {signals.length === 0 ? (
                <div className="text-xs text-zinc-600 text-center py-4">Click Scan to analyze markets</div>
              ) : (
                signals.map((sig, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    sig.action.includes('BUY') ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{sig.instrument.replace('_', '/')}</span>
                      <span className={`text-xs font-bold ${sig.action.includes('BUY') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sig.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{sig.confidence}% conf</span>
                      <span>•</span>
                      <span>Risk: {sig.risk_score}/10</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        SL: {sig.stop_loss.toFixed(1)}%
                      </div>
                      <div className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        TP: {sig.take_profit.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bot Controls */}
          <div className="p-4 border-t border-zinc-800 space-y-2">
            <button
              onClick={() => runBot('analyze')}
              disabled={botStatus === 'scanning'}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              Scan Markets
            </button>
            <button
              onClick={() => setAutoTrading(!autoTrading)}
              className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                autoTrading
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {autoTrading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {autoTrading ? 'Stop Bot' : 'Start Bot'}
            </button>
          </div>
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col">
          {/* Chart Controls */}
          <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4">
            <div className="flex items-center gap-1">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    timeframe === tf ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIndicators(!showIndicators)}
                className={`p-1.5 rounded ${showIndicators ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                title="Toggle Indicators"
              >
                <LineChart className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <div className="w-3 h-0.5 bg-amber-500 rounded" /> EMA 9
                <div className="w-3 h-0.5 bg-violet-500 rounded ml-2" /> EMA 21
              </div>
            </div>
          </div>

          {/* Chart */}
          <div ref={chartContainerRef} className="flex-1" />

          {/* Trade History */}
          <div className="h-48 border-t border-zinc-800 overflow-auto">
            <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 sticky top-0 bg-[#0a0a0a]">
              TRADE HISTORY
            </div>
            <div className="divide-y divide-zinc-800/50">
              {trades.length === 0 ? (
                <div className="text-xs text-zinc-600 text-center py-8">No trades yet</div>
              ) : (
                trades.map((trade, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        trade.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side === 'BUY' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{trade.instrument.replace('_', '/')}</div>
                        <div className="text-xs text-zinc-500">{trade.quantity.toFixed(6)} @ ${trade.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">${trade.value.toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">{trade.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Order Book */}
        <div className="w-72 border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
            ORDER BOOK
          </div>

          {/* Headers */}
          <div className="flex items-center justify-between px-4 py-1 text-xs text-zinc-600">
            <span>Price (USDT)</span>
            <span>Amount</span>
            <span>Total</span>
          </div>

          {/* Asks */}
          <div className="flex-1 overflow-hidden">
            <div className="h-1/2 flex flex-col-reverse overflow-hidden">
              {asks.map((ask, i) => (
                <div key={i} className="relative flex items-center justify-between px-4 py-0.5 text-xs">
                  <div
                    className="absolute inset-0 bg-red-500/10"
                    style={{ width: `${(ask.total / maxAskTotal) * 100}%`, right: 0, left: 'auto' }}
                  />
                  <span className="text-red-400 font-mono relative z-10">{formatPrice(ask.price)}</span>
                  <span className="text-zinc-400 font-mono relative z-10">{ask.quantity.toFixed(4)}</span>
                  <span className="text-zinc-500 font-mono relative z-10">{ask.total.toFixed(4)}</span>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className="flex items-center justify-center py-2 border-y border-zinc-800 bg-zinc-900/50">
              <span className="text-lg font-bold font-mono">${formatPrice(currentPrice)}</span>
            </div>

            {/* Bids */}
            <div className="h-1/2 overflow-hidden">
              {bids.map((bid, i) => (
                <div key={i} className="relative flex items-center justify-between px-4 py-0.5 text-xs">
                  <div
                    className="absolute inset-0 bg-emerald-500/10"
                    style={{ width: `${(bid.total / maxBidTotal) * 100}%`, right: 0, left: 'auto' }}
                  />
                  <span className="text-emerald-400 font-mono relative z-10">{formatPrice(bid.price)}</span>
                  <span className="text-zinc-400 font-mono relative z-10">{bid.quantity.toFixed(4)}</span>
                  <span className="text-zinc-500 font-mono relative z-10">{bid.total.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Trade */}
          <div className="p-4 border-t border-zinc-800 space-y-3">
            <div className="text-xs text-zinc-500 mb-2">QUICK TRADE</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                onClick={() => alert('Manual trading coming soon')}
              >
                <ArrowUpRight className="w-4 h-4" /> BUY
              </button>
              <button
                className="py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                onClick={() => alert('Manual trading coming soon')}
              >
                <ArrowDownRight className="w-4 h-4" /> SELL
              </button>
            </div>
            <div className="text-xs text-zinc-600 text-center">
              Use AI Bot for automated trading
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
