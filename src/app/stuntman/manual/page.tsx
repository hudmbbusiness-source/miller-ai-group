// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Target,
  AlertTriangle,
  Zap,
  Clock,
  X,
  Check,
} from 'lucide-react'

interface Suggestion {
  direction: 'LONG' | 'SHORT' | 'WAIT'
  confidence: number
  entry: number
  stopLoss: number
  takeProfit: number
  riskReward: number
  reasons: string[]
  strategy: string
}

interface MarketData {
  price: number
  time: string
  estHour: string
  withinTradingHours: boolean
}

interface Position {
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  quantity: number
  entryTime: string
}

export default function ManualTradingPage() {
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [market, setMarket] = useState<MarketData | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)

  // Calculate live P&L
  const calculatePnL = useCallback(() => {
    if (!position || !market) return 0
    const pointValue = 50 // ES = $50 per point
    const diff = position.direction === 'LONG'
      ? market.price - position.entryPrice
      : position.entryPrice - market.price
    return diff * pointValue * position.quantity
  }, [position, market])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/stuntman/manual-trade')
      const data = await res.json()

      if (data.success) {
        setMarket(data.market)
        setSuggestion(data.suggestion)
        setConfigured(data.config?.pickMyTradeConfigured || false)
        setLastUpdate(new Date().toLocaleTimeString())
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll every 2 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Execute trade
  const executeTrade = async (action: 'BUY' | 'SELL') => {
    if (executing) return

    setExecuting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/stuntman/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, quantity: 1 }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage(`✓ ${action} order sent!`)
        // Set position locally
        setPosition({
          direction: action === 'BUY' ? 'LONG' : 'SHORT',
          entryPrice: market?.price || 0,
          quantity: 1,
          entryTime: new Date().toISOString(),
        })
      } else {
        setMessage(`✗ Error: ${data.error || data.message}`)
      }
    } catch (err) {
      setMessage(`✗ Error: ${String(err)}`)
    } finally {
      setExecuting(false)
    }
  }

  // Close position
  const closePosition = async () => {
    if (!position || executing) return

    setExecuting(true)
    const action = position.direction === 'LONG' ? 'SELL' : 'BUY'

    try {
      const res = await fetch('/api/stuntman/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, quantity: position.quantity }),
      })

      const data = await res.json()

      if (data.success) {
        const pnl = calculatePnL()
        setMessage(`✓ Position closed! P&L: $${pnl.toFixed(2)}`)
        setPosition(null)
      } else {
        setMessage(`✗ Error: ${data.error || data.message}`)
      }
    } catch (err) {
      setMessage(`✗ Error: ${String(err)}`)
    } finally {
      setExecuting(false)
    }
  }

  const pnl = calculatePnL()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/stuntman" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">MANUAL TRADING</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>Updated: {lastUpdate}</span>
          <button onClick={fetchData} className="p-2 hover:bg-gray-800 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error/Message Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.startsWith('✓') ? 'bg-green-900/50 border border-green-500 text-green-200' : 'bg-red-900/50 border border-red-500 text-red-200'}`}>
          {message}
        </div>
      )}

      {/* Not Configured Warning */}
      {!configured && (
        <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-200 font-bold">
            <AlertTriangle className="w-5 h-5" />
            PickMyTrade Not Configured
          </div>
          <p className="text-yellow-200/80 text-sm mt-1">
            Set PICKMYTRADE_TOKEN and APEX_ACCOUNT_ID in .env.local to execute trades.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Current Price & Position */}
        <div className="space-y-6">
          {/* Price Display */}
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-400 text-sm">ES FUTURES</div>
              <div className={`px-3 py-1 rounded text-sm ${market?.withinTradingHours ? 'bg-green-600' : 'bg-red-600'}`}>
                {market?.withinTradingHours ? 'MARKET OPEN' : 'MARKET CLOSED'}
              </div>
            </div>
            <div className="text-5xl font-bold font-mono">
              ${market?.price?.toFixed(2) || '---'}
            </div>
            <div className="text-gray-400 text-sm mt-2">
              <Clock className="w-4 h-4 inline mr-1" />
              EST: {market?.estHour}
            </div>
          </div>

          {/* Current Position */}
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              CURRENT POSITION
            </h2>

            {position ? (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 text-2xl font-bold ${position.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                  {position.direction === 'LONG' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                  {position.direction} @ ${position.entryPrice.toFixed(2)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Entry</div>
                    <div className="text-xl font-mono">${position.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Current</div>
                    <div className="text-xl font-mono">${market?.price?.toFixed(2)}</div>
                  </div>
                </div>

                {/* LIVE P&L */}
                <div className={`p-4 rounded-lg ${pnl >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                  <div className="text-gray-400 text-sm">LIVE P&L</div>
                  <div className={`text-4xl font-bold font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={closePosition}
                  disabled={executing}
                  className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 rounded-xl text-xl font-bold flex items-center justify-center gap-2"
                >
                  <X className="w-6 h-6" />
                  CLOSE POSITION
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No open position
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Suggestion & Execute */}
        <div className="space-y-6">
          {/* AI Suggestion */}
          <div className={`rounded-xl p-6 ${
            suggestion?.direction === 'LONG' ? 'bg-green-900/30 border-2 border-green-500' :
            suggestion?.direction === 'SHORT' ? 'bg-red-900/30 border-2 border-red-500' :
            'bg-gray-900 border-2 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                AI SUGGESTION
              </h2>
              {suggestion?.confidence > 0 && (
                <div className="text-sm bg-gray-800 px-3 py-1 rounded">
                  {suggestion.confidence}% confidence
                </div>
              )}
            </div>

            {suggestion?.direction !== 'WAIT' ? (
              <div className="space-y-4">
                <div className={`text-3xl font-bold flex items-center gap-3 ${
                  suggestion?.direction === 'LONG' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {suggestion?.direction === 'LONG' ? <TrendingUp className="w-10 h-10" /> : <TrendingDown className="w-10 h-10" />}
                  {suggestion?.direction}
                </div>

                <div className="text-sm text-gray-400">
                  Strategy: {suggestion?.strategy}
                </div>

                {/* Pre-filled Levels */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">ENTRY</div>
                    <div className="text-lg font-mono">${suggestion?.entry?.toFixed(2)}</div>
                  </div>
                  <div className="bg-red-900/50 p-3 rounded-lg">
                    <div className="text-red-400 text-xs">STOP LOSS</div>
                    <div className="text-lg font-mono">${suggestion?.stopLoss?.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-900/50 p-3 rounded-lg">
                    <div className="text-green-400 text-xs">TARGET</div>
                    <div className="text-lg font-mono">${suggestion?.takeProfit?.toFixed(2)}</div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  Risk/Reward: {suggestion?.riskReward?.toFixed(2)}:1
                </div>

                {/* Reasons */}
                <div className="bg-gray-800/50 p-4 rounded-lg max-h-40 overflow-y-auto">
                  <div className="text-xs text-gray-400 mb-2">ANALYSIS:</div>
                  {suggestion?.reasons?.map((reason, i) => (
                    <div key={i} className="text-sm text-gray-300 py-1">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-2xl font-bold text-gray-400 mb-2">WAIT</div>
                <div className="text-gray-500">No clear setup - be patient</div>
                {suggestion?.reasons?.map((reason, i) => (
                  <div key={i} className="text-sm text-gray-500 mt-2">{reason}</div>
                ))}
              </div>
            )}
          </div>

          {/* Execute Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => executeTrade('BUY')}
              disabled={executing || !!position || !market?.withinTradingHours}
              className="py-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition"
            >
              <TrendingUp className="w-8 h-8" />
              BUY
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={executing || !!position || !market?.withinTradingHours}
              className="py-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition"
            >
              <TrendingDown className="w-8 h-8" />
              SELL
            </button>
          </div>

          {/* Warnings */}
          {!market?.withinTradingHours && (
            <div className="text-center text-yellow-400 text-sm">
              ⚠ Trading disabled outside market hours (9:30 AM - 4:00 PM EST)
            </div>
          )}
          {position && (
            <div className="text-center text-yellow-400 text-sm">
              ⚠ Close current position before opening a new one
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">POINT VALUE</div>
          <div className="text-lg font-bold">$50</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">TICK SIZE</div>
          <div className="text-lg font-bold">0.25</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">TICK VALUE</div>
          <div className="text-lg font-bold">$12.50</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-gray-400 text-xs">CONTRACTS</div>
          <div className="text-lg font-bold">1</div>
        </div>
      </div>
    </div>
  )
}
