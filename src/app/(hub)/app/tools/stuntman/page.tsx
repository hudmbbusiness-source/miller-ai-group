'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  BarChart3,
  Cpu,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Ticker {
  instrument_name: string
  last_traded_price: string
  bid_price: string
  ask_price: string
  high_price: string
  low_price: string
  volume: string
  price_change_24h: string
  price_change_percentage_24h: string
}

interface MarketData {
  ticker: Ticker | null
  orderbook: {
    bids: Array<{ price: string; quantity: string }>
    asks: Array<{ price: string; quantity: string }>
  } | null
  recentTrades: Array<{
    price: string
    quantity: string
    side: 'BUY' | 'SELL'
    timestamp: number
  }>
}

interface DashboardData {
  primaryInstrument: string
  marketData: MarketData
  tickers: Ticker[]
  tradingPairs: string[]
}

const features = [
  {
    icon: Cpu,
    title: 'Advanced AI Analytics',
    description: 'Machine learning models trained on historical crypto market data for pattern recognition',
  },
  {
    icon: Zap,
    title: 'Micro-Scalping Trades',
    description: 'High-frequency execution designed to capture small, consistent profits across many trades',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analysis',
    description: 'Live market data processing with sub-second decision making capabilities',
  },
  {
    icon: Shield,
    title: 'Risk Management',
    description: 'Built-in position limits, stop-losses, and portfolio protection mechanisms',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

function formatPrice(price: string | number | undefined | null): string {
  if (price === undefined || price === null) return '--'
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num)) return '--'
  if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (num >= 1) return num.toFixed(4)
  return num.toFixed(6)
}

function formatVolume(volume: string | number | undefined | null): string {
  if (volume === undefined || volume === null) return '--'
  const num = typeof volume === 'string' ? parseFloat(volume) : volume
  if (isNaN(num)) return '--'
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
  return num.toFixed(2)
}

export default function StuntmanToolPage() {
  const [selectedPair, setSelectedPair] = useState('BTC_USDT')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)
  const [canTrade, setCanTrade] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/stuntman?action=dashboard&instrument=${selectedPair}`)
      const data = await response.json()

      if (data.success) {
        setDashboard(data.dashboard)
        setIsConfigured(data.isConfigured)
        setCanTrade(data.canTrade)
        setError(null)
        setLastUpdate(new Date())
      } else {
        setError(data.error || 'Failed to fetch dashboard')
        setIsConfigured(data.isConfigured ?? false)
      }
    } catch (err) {
      setError('Failed to connect to Stuntman API')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPair])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [fetchDashboard])

  const ticker = dashboard?.marketData?.ticker
  const orderbook = dashboard?.marketData?.orderbook
  const priceChange = ticker ? parseFloat(ticker.price_change_percentage_24h || '0') : 0
  const isPositive = priceChange >= 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <motion.div
          className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-8 h-8 text-white" />
        </motion.div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            StuntMan AI
          </h1>
          <p className="text-muted-foreground">High-frequency micro-scalping crypto trading system</p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              <WifiOff className="w-3 h-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Live Market Dashboard */}
      {isConfigured && (
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-emerald-500/20">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-green-500/5 border-b border-emerald-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <CardTitle>Live Market Data</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {lastUpdate && (
                    <span className="text-xs text-muted-foreground">
                      Updated {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDashboard}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading && !dashboard ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400">{error}</p>
                  <Button variant="outline" className="mt-4" onClick={fetchDashboard}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Trading Pair Selector */}
                  <div className="flex flex-wrap gap-2">
                    {dashboard?.tradingPairs.slice(0, 6).map((pair) => (
                      <Button
                        key={pair}
                        variant={selectedPair === pair ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPair(pair)}
                        className={cn(
                          selectedPair === pair
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "hover:border-emerald-500/50"
                        )}
                      >
                        {pair.replace('_', '/')}
                      </Button>
                    ))}
                  </div>

                  {/* Price Display */}
                  {ticker && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <motion.div
                        className="p-4 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <DollarSign className="w-4 h-4" />
                          Current Price
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">${formatPrice(ticker.last_traded_price)}</span>
                          <span className={cn(
                            "flex items-center text-sm font-medium",
                            isPositive ? "text-emerald-500" : "text-red-500"
                          )}>
                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {Math.abs(priceChange).toFixed(2)}%
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        className="p-4 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="text-sm text-muted-foreground mb-2">24h Range</div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">${formatPrice(ticker.low_price)}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 1 }}
                            />
                          </div>
                          <span className="text-emerald-400">${formatPrice(ticker.high_price)}</span>
                        </div>
                      </motion.div>

                      <motion.div
                        className="p-4 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="text-sm text-muted-foreground mb-2">24h Volume</div>
                        <div className="text-2xl font-bold">{formatVolume(ticker.volume)}</div>
                        <div className="text-xs text-muted-foreground">{ticker.instrument_name}</div>
                      </motion.div>
                    </div>
                  )}

                  {/* Order Book Preview */}
                  {orderbook && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Bids (Buy Orders)
                        </div>
                        <div className="space-y-1">
                          {orderbook.bids.slice(0, 5).map((bid, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs p-2 rounded bg-emerald-500/5 border border-emerald-500/10"
                            >
                              <span className="text-emerald-400">${formatPrice(bid.price)}</span>
                              <span className="text-muted-foreground">{formatVolume(bid.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-red-500 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Asks (Sell Orders)
                        </div>
                        <div className="space-y-1">
                          {orderbook.asks.slice(0, 5).map((ask, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs p-2 rounded bg-red-500/5 border border-red-500/10"
                            >
                              <span className="text-red-400">${formatPrice(ask.price)}</span>
                              <span className="text-muted-foreground">{formatVolume(ask.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Tickers */}
                  {dashboard?.tickers && dashboard.tickers.length > 1 && (
                    <div>
                      <div className="text-sm font-medium mb-3">Other Markets</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {dashboard.tickers.filter(t => t.instrument_name !== selectedPair).slice(0, 4).map((t) => {
                          const change = parseFloat(t.price_change_percentage_24h || '0')
                          const up = change >= 0
                          return (
                            <motion.button
                              key={t.instrument_name}
                              onClick={() => setSelectedPair(t.instrument_name)}
                              className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-emerald-500/30 transition-all text-left"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-xs text-muted-foreground">{t.instrument_name.replace('_', '/')}</div>
                              <div className="font-medium">${formatPrice(t.last_traded_price)}</div>
                              <div className={cn("text-xs", up ? "text-emerald-500" : "text-red-500")}>
                                {up ? '+' : ''}{change.toFixed(2)}%
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Status Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          "border-2",
          isConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-muted"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isConfigured ? "bg-emerald-500/20" : "bg-muted"
              )}>
                <Wifi className={cn("w-5 h-5", isConfigured ? "text-emerald-500" : "text-muted-foreground")} />
              </div>
              <div>
                <div className="font-medium">API Connection</div>
                <div className={cn("text-sm", isConfigured ? "text-emerald-500" : "text-muted-foreground")}>
                  {isConfigured ? "Connected to Crypto.com" : "Not Configured"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          canTrade ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                canTrade ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}>
                <Shield className={cn("w-5 h-5", canTrade ? "text-emerald-500" : "text-amber-500")} />
              </div>
              <div>
                <div className="font-medium">Trading</div>
                <div className={cn("text-sm", canTrade ? "text-emerald-500" : "text-amber-500")}>
                  {canTrade ? "Enabled" : "Read-Only Mode"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium">Exchange</div>
                <div className="text-sm text-blue-500">Crypto.com</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Features Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>About StuntMan AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              StuntMan AI is a sophisticated high-frequency trading system exclusively targeting cryptocurrency markets.
              Built with advanced AI data analysis and precision-focused analytical strategies, StuntMan aims to execute
              micro-scalping trades with maximum accuracy.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 hover:border-emerald-500/30 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 h-fit shadow-lg shadow-emerald-500/25">
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Development Status */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-green-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                </motion.div>
                <CardTitle>Active Development</CardTitle>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                Phase 1
              </Badge>
            </div>
            <CardDescription>
              StuntMan AI is connected to Crypto.com and receiving live market data. The AI trading engine
              and automated execution systems are being developed and tested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Building a crypto trading system requires rigorous testing and backtesting before deployment.
              StuntMan focuses on micro-scalping strategies that require precise execution and robust risk controls.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Open Full Trading Interface */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-orange-400">Full Trading Interface</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Access paper trading, strategies, backtesting, and more
                </p>
              </div>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25">
                <Link href="/stuntman">
                  <Zap className="w-4 h-4 mr-2" />
                  Open Trading System
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link href="/stuntman/trade">
                <TrendingUp className="w-4 h-4 mr-2" />
                Start Trading
              </Link>
            </Button>
            <Button variant="outline" asChild className="hover:border-emerald-500/50 hover:text-emerald-500">
              <Link href="/stuntman/strategies">
                <Cpu className="w-4 h-4 mr-2" />
                Manage Strategies
              </Link>
            </Button>
            <Button variant="outline" asChild className="hover:border-emerald-500/50 hover:text-emerald-500">
              <Link href="/stuntman/history">
                <BarChart3 className="w-4 h-4 mr-2" />
                Trade History
              </Link>
            </Button>
            <Button variant="outline" asChild className="hover:border-emerald-500/50 hover:text-emerald-500">
              <Link href="/app/projects/stuntman">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Project Details
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={fetchDashboard}
              disabled={isLoading}
              className="hover:border-emerald-500/50 hover:text-emerald-500"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
