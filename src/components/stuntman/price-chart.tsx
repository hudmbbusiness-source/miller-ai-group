// =============================================================================
// STUNTMAN - PROFESSIONAL PRICE CHART
// =============================================================================
// Real-time price chart using TradingView's lightweight-charts
// =============================================================================

'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'

interface PriceChartProps {
  instrument: string
  height?: number
  className?: string
}

interface HistoricalPrice {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export function PriceChart({ instrument, height = 400, className = '' }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W' | '1M'>('1D')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.1)', width: 1, style: 2 },
        horzLine: { color: 'rgba(255, 255, 255, 0.1)', width: 1, style: 2 },
      },
      handleScroll: { vertTouchDrag: false },
    })

    const areaSeries = chart.addAreaSeries({
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.3)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    })

    chartRef.current = chart
    seriesRef.current = areaSeries

    // Handle resize
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
  }, [height])

  // Fetch and update data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Get historical data from our API
        const res = await fetch(`/api/stuntman/market?action=history&instrument=${instrument}&timeframe=${timeRange}`)
        const data = await res.json()

        if (data.success && data.history && seriesRef.current) {
          const chartData: LineData[] = data.history.map((item: HistoricalPrice) => ({
            time: item.time as Time,
            value: item.close,
          }))

          seriesRef.current.setData(chartData)

          // Calculate price change
          if (chartData.length > 0) {
            const firstPrice = chartData[0].value as number
            const lastPrice = chartData[chartData.length - 1].value as number
            setCurrentPrice(lastPrice)
            setPriceChange(((lastPrice - firstPrice) / firstPrice) * 100)

            // Update line color based on performance
            const isPositive = lastPrice >= firstPrice
            seriesRef.current.applyOptions({
              lineColor: isPositive ? '#10b981' : '#ef4444',
              topColor: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              bottomColor: isPositive ? 'rgba(16, 185, 129, 0.0)' : 'rgba(239, 68, 68, 0.0)',
            })
          }

          chartRef.current?.timeScale().fitContent()
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [instrument, timeRange])

  // Real-time price updates
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const res = await fetch(`/api/stuntman/market?action=ticker&instrument=${instrument}`)
        const data = await res.json()
        if (data.success && data.ticker) {
          setCurrentPrice(data.ticker.lastPrice)
        }
      } catch (err) {
        console.error('Failed to fetch current price:', err)
      }
    }

    const interval = setInterval(fetchCurrentPrice, 2000)
    return () => clearInterval(interval)
  }, [instrument])

  return (
    <div className={className}>
      {/* Time Range Selector */}
      <div className="flex items-center gap-1 mb-4">
        {(['1H', '1D', '1W', '1M'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              timeRange === range
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>
    </div>
  )
}

// Simple sparkline for lists
export function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 60
      const y = 20 - ((value - min) / range) * 16
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width="60" height="24" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
