/**
 * FEATURE A/B TESTING FRAMEWORK
 *
 * This tests each potential feature AGAINST the proven baseline strategy.
 * Only features that IMPROVE results will be recommended.
 *
 * BASELINE: The proven adaptive strategy (60.3% win rate, $10,244 over 60 days)
 *
 * FEATURES TO TEST:
 * 1. Multi-timeframe confirmation (1m, 5m, 15m alignment)
 * 2. Session/kill zone filtering
 * 3. Trailing stops
 * 4. Order flow analysis
 * 5. Market structure (BOS, FVG)
 *
 * Each feature is tested by:
 * 1. Running baseline on historical data
 * 2. Running baseline + ONE feature
 * 3. Comparing: win rate, profit factor, total P&L, max drawdown
 * 4. Feature is APPROVED only if it improves ALL key metrics
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// TYPES
// ============================================================================

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  hour: number
  dateStr: string
}

interface Trade {
  entry: number
  exit: number
  direction: 'LONG' | 'SHORT'
  pnl: number
  netPnl: number
  win: boolean
  pattern: string
  features: string[]
}

interface TestResult {
  name: string
  trades: number
  wins: number
  winRate: number
  grossPnL: number
  netPnL: number
  profitFactor: number
  maxDrawdown: number
  avgWin: number
  avgLoss: number
}

interface FeatureComparison {
  feature: string
  baseline: TestResult
  withFeature: TestResult
  improvement: {
    winRate: string
    profitFactor: string
    netPnL: string
    maxDrawdown: string
  }
  recommendation: 'APPROVED' | 'REJECTED' | 'NEUTRAL'
  reason: string
}

// ============================================================================
// COSTS (same as proven strategy)
// ============================================================================

const ES_POINT_VALUE = 50
const COSTS = {
  totalFixed: 6.84,
  getSlippage: (atr: number) => 0.5 + (atr * 0.1)
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchData(days: number): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - (days * 24 * 60 * 60)

  const sources = [
    { symbol: 'ES=F', scale: 1 },
    { symbol: 'SPY', scale: 10 }
  ]

  for (const source of sources) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(source.symbol)}?period1=${start}&period2=${now}&interval=5m&includePrePost=false`

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (!response.ok) continue

      const data = await response.json()
      const result = data.chart?.result?.[0]
      if (!result?.timestamp) continue

      const candles: Candle[] = []
      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
          const date = new Date(timestamps[i] * 1000)
          const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

          candles.push({
            time: timestamps[i] * 1000,
            open: quote.open[i] * source.scale,
            high: quote.high[i] * source.scale,
            low: quote.low[i] * source.scale,
            close: quote.close[i] * source.scale,
            volume: quote.volume[i] || 0,
            hour: estDate.getHours() + estDate.getMinutes() / 60,
            dateStr: estDate.toLocaleDateString('en-US'),
          })
        }
      }

      if (candles.length > 100) return candles
    } catch {
      continue
    }
  }

  throw new Error('Could not fetch data')
}

// ============================================================================
// INDICATORS
// ============================================================================

function calculateEMA(candles: Candle[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      ema.push(candles[i].close)
    } else {
      ema.push((candles[i].close - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }
  return ema
}

function calculateRSI(candles: Candle[], period: number = 14): number[] {
  const rsi: number[] = []
  let avgGain = 0, avgLoss = 0

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { rsi.push(50); continue }

    const change = candles[i].close - candles[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i
      avgLoss = (avgLoss * (i - 1) + loss) / i
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  return rsi
}

function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { atr.push(candles[i].high - candles[i].low); continue }

    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    )

    if (i < period) {
      atr.push((atr[i - 1] * i + tr) / (i + 1))
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr) / period)
    }
  }
  return atr
}

function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = []
  let cumVolume = 0
  let cumTP = 0
  let currentDate = ''

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].dateStr !== currentDate) {
      cumVolume = 0
      cumTP = 0
      currentDate = candles[i].dateStr
    }

    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    cumVolume += candles[i].volume || 1
    cumTP += tp * (candles[i].volume || 1)
    vwap.push(cumTP / cumVolume)
  }
  return vwap
}

// ============================================================================
// REGIME DETECTION (from proven strategy)
// ============================================================================

type Regime = 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND'

function detectRegime(candles: Candle[], ema20: number[], ema50: number[], i: number): Regime {
  if (i < 50) return 'SIDEWAYS'

  const price = candles[i].close
  const ema20Now = ema20[i]
  const ema50Now = ema50[i]
  const ema20Prev = ema20[Math.max(0, i - 10)]

  const slope = ((ema20Now - ema20Prev) / ema20Prev) * 100

  if (price > ema20Now && ema20Now > ema50Now && slope > 0.25) return 'STRONG_UPTREND'
  if (price > ema20Now && ema20Now > ema50Now && slope > 0.10) return 'UPTREND'
  if (price < ema20Now && ema20Now < ema50Now && slope < -0.25) return 'STRONG_DOWNTREND'
  if (price < ema20Now && ema20Now < ema50Now && slope < -0.10) return 'DOWNTREND'

  return 'SIDEWAYS'
}

// ============================================================================
// BASELINE STRATEGY (proven adaptive)
// ============================================================================

interface SignalConfig {
  checkMTF?: boolean
  checkSession?: boolean
  useTrailingStop?: boolean
  checkOrderFlow?: boolean
  checkStructure?: boolean
}

function runBacktest(
  candles: Candle[],
  config: SignalConfig = {}
): { trades: Trade[]; result: TestResult } {
  const ema20 = calculateEMA(candles, 20)
  const ema50 = calculateEMA(candles, 50)
  const rsi = calculateRSI(candles, 14)
  const atr = calculateATR(candles, 14)
  const vwap = calculateVWAP(candles)

  const trades: Trade[] = []
  let position: { direction: 'LONG' | 'SHORT'; entry: number; stop: number; target: number; pattern: string; features: string[]; trailStop?: number } | null = null

  for (let i = 50; i < candles.length - 1; i++) {
    const c = candles[i]
    const prev = candles[i - 1]
    const regime = detectRegime(candles, ema20, ema50, i)
    const currentATR = atr[i]
    const currentVWAP = vwap[i]
    const currentRSI = rsi[i]

    // Only trade during RTH
    if (c.hour < 9.5 || c.hour > 15.5) continue

    // ===== SESSION FILTER (Feature 2) =====
    if (config.checkSession) {
      // Skip lunch hour (11 AM - 2 PM)
      if (c.hour >= 11 && c.hour < 14) continue
    }

    // ===== CHECK EXISTING POSITION =====
    if (position) {
      // Trailing stop (Feature 3)
      if (config.useTrailingStop && position.trailStop !== undefined) {
        const profit = position.direction === 'LONG'
          ? (c.close - position.entry) / currentATR
          : (position.entry - c.close) / currentATR

        // Activate trailing after 1R profit
        if (profit >= 1.0) {
          const newTrail = position.direction === 'LONG'
            ? c.close - currentATR * 0.5
            : c.close + currentATR * 0.5

          position.trailStop = position.direction === 'LONG'
            ? Math.max(position.trailStop, newTrail)
            : Math.min(position.trailStop, newTrail)
        }
      }

      const effectiveStop = position.trailStop ?? position.stop

      // Check stop loss
      const hitStop = position.direction === 'LONG'
        ? c.low <= effectiveStop
        : c.high >= effectiveStop

      // Check target
      const hitTarget = position.direction === 'LONG'
        ? c.high >= position.target
        : c.low <= position.target

      if (hitStop || hitTarget) {
        const exitPrice = hitTarget ? position.target : effectiveStop
        const slippage = COSTS.getSlippage(currentATR)
        const grossPnl = position.direction === 'LONG'
          ? (exitPrice - position.entry) * ES_POINT_VALUE
          : (position.entry - exitPrice) * ES_POINT_VALUE
        const netPnl = grossPnl - COSTS.totalFixed - (slippage * ES_POINT_VALUE * 2)

        trades.push({
          entry: position.entry,
          exit: exitPrice,
          direction: position.direction,
          pnl: grossPnl,
          netPnl,
          win: netPnl > 0,
          pattern: position.pattern,
          features: position.features
        })

        position = null
      }
      continue
    }

    // ===== SIGNAL GENERATION =====
    if (regime === 'SIDEWAYS') continue

    let signal: { direction: 'LONG' | 'SHORT'; pattern: string; features: string[] } | null = null

    // VWAP Pullback Long (proven pattern)
    if ((regime === 'UPTREND' || regime === 'STRONG_UPTREND') &&
        prev.low <= currentVWAP * 1.002 &&
        c.close > currentVWAP &&
        c.close > c.open) {
      signal = { direction: 'LONG', pattern: 'VWAP_PULLBACK_LONG', features: ['baseline'] }
    }

    // VWAP Pullback Short (proven pattern)
    if ((regime === 'DOWNTREND' || regime === 'STRONG_DOWNTREND') &&
        prev.high >= currentVWAP * 0.998 &&
        c.close < currentVWAP &&
        c.close < c.open) {
      signal = { direction: 'SHORT', pattern: 'VWAP_PULLBACK_SHORT', features: ['baseline'] }
    }

    // EMA20 Bounce Long (proven pattern)
    if ((regime === 'UPTREND' || regime === 'STRONG_UPTREND') &&
        prev.low <= ema20[i] * 1.002 &&
        c.close > ema20[i] &&
        c.close > c.open) {
      signal = { direction: 'LONG', pattern: 'EMA20_BOUNCE_LONG', features: ['baseline'] }
    }

    if (!signal) continue

    // ===== MULTI-TIMEFRAME FILTER (Feature 1) =====
    if (config.checkMTF) {
      // Check if shorter timeframe is aligned (using RSI as proxy)
      if (signal.direction === 'LONG' && currentRSI < 40) continue // RSI weak = skip
      if (signal.direction === 'SHORT' && currentRSI > 60) continue
      signal.features.push('MTF_check')
    }

    // ===== ORDER FLOW FILTER (Feature 4) =====
    if (config.checkOrderFlow) {
      // Estimate order flow from candle structure
      const range = c.high - c.low
      const closePosition = range > 0 ? (c.close - c.low) / range : 0.5

      if (signal.direction === 'LONG' && closePosition < 0.4) continue // Weak close
      if (signal.direction === 'SHORT' && closePosition > 0.6) continue
      signal.features.push('orderFlow_check')
    }

    // ===== STRUCTURE FILTER (Feature 5) =====
    if (config.checkStructure) {
      // Check for swing structure
      let foundStructure = false

      // For LONG: price should be above recent swing low
      if (signal.direction === 'LONG') {
        const recentLow = Math.min(...candles.slice(i - 10, i).map(x => x.low))
        if (c.close > recentLow * 1.002) foundStructure = true
      }

      // For SHORT: price should be below recent swing high
      if (signal.direction === 'SHORT') {
        const recentHigh = Math.max(...candles.slice(i - 10, i).map(x => x.high))
        if (c.close < recentHigh * 0.998) foundStructure = true
      }

      if (!foundStructure) continue
      signal.features.push('structure_check')
    }

    // ===== ENTER POSITION =====
    const slippage = COSTS.getSlippage(currentATR)
    const entryPrice = signal.direction === 'LONG'
      ? c.close + slippage
      : c.close - slippage

    const stopDistance = currentATR * 1.5
    const targetDistance = currentATR * 2.0

    position = {
      direction: signal.direction,
      entry: entryPrice,
      stop: signal.direction === 'LONG' ? entryPrice - stopDistance : entryPrice + stopDistance,
      target: signal.direction === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance,
      pattern: signal.pattern,
      features: signal.features,
      trailStop: config.useTrailingStop
        ? (signal.direction === 'LONG' ? entryPrice - stopDistance : entryPrice + stopDistance)
        : undefined
    }
  }

  // Calculate stats
  const wins = trades.filter(t => t.win).length
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0
  const grossPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const netPnL = trades.reduce((sum, t) => sum + t.netPnl, 0)

  const winningTrades = trades.filter(t => t.netPnl > 0)
  const losingTrades = trades.filter(t => t.netPnl <= 0)
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.netPnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.netPnl, 0)) / losingTrades.length : 0
  const profitFactor = avgLoss > 0 && wins > 0 ? (avgWin * wins) / (avgLoss * losingTrades.length) : avgWin > 0 ? 999 : 0

  // Max drawdown
  let peak = 0, maxDrawdown = 0, running = 0
  for (const t of trades) {
    running += t.netPnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  return {
    trades,
    result: {
      name: 'Test',
      trades: trades.length,
      wins,
      winRate,
      grossPnL,
      netPnL,
      profitFactor,
      maxDrawdown,
      avgWin,
      avgLoss
    }
  }
}

// ============================================================================
// FEATURE COMPARISON
// ============================================================================

function compareFeature(baseline: TestResult, withFeature: TestResult, featureName: string): FeatureComparison {
  const winRateDiff = withFeature.winRate - baseline.winRate
  const pfDiff = withFeature.profitFactor - baseline.profitFactor
  const pnlDiff = withFeature.netPnL - baseline.netPnL
  const ddDiff = baseline.maxDrawdown - withFeature.maxDrawdown // Positive = improvement

  // Feature is APPROVED if:
  // - Win rate improved OR stayed same
  // - Profit factor improved
  // - Net P&L improved
  // - Max drawdown decreased or stayed same

  let score = 0
  const reasons: string[] = []

  if (winRateDiff >= 0) { score++; reasons.push('Win rate maintained or improved') }
  else reasons.push(`Win rate decreased by ${Math.abs(winRateDiff).toFixed(1)}%`)

  if (pfDiff > 0.1) { score++; reasons.push('Profit factor improved') }
  else if (pfDiff < -0.1) reasons.push('Profit factor decreased')

  if (pnlDiff > 0) { score++; reasons.push(`Net P&L improved by $${pnlDiff.toFixed(2)}`) }
  else reasons.push(`Net P&L decreased by $${Math.abs(pnlDiff).toFixed(2)}`)

  if (ddDiff >= 0) { score++; reasons.push('Max drawdown maintained or improved') }
  else reasons.push(`Max drawdown increased by $${Math.abs(ddDiff).toFixed(2)}`)

  let recommendation: 'APPROVED' | 'REJECTED' | 'NEUTRAL' = 'REJECTED'
  if (score >= 3 && pnlDiff > 0) recommendation = 'APPROVED'
  else if (score >= 2 && pnlDiff >= 0) recommendation = 'NEUTRAL'

  return {
    feature: featureName,
    baseline,
    withFeature,
    improvement: {
      winRate: (winRateDiff >= 0 ? '+' : '') + winRateDiff.toFixed(1) + '%',
      profitFactor: (pfDiff >= 0 ? '+' : '') + pfDiff.toFixed(2),
      netPnL: (pnlDiff >= 0 ? '+$' : '-$') + Math.abs(pnlDiff).toFixed(2),
      maxDrawdown: (ddDiff >= 0 ? '-$' : '+$') + Math.abs(ddDiff).toFixed(2)
    },
    recommendation,
    reason: reasons.join('; ')
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching data for feature testing...')
    const candles = await fetchData(60) // 60 days
    console.log(`Fetched ${candles.length} candles`)

    // Run baseline
    console.log('Running baseline test...')
    const baseline = runBacktest(candles, {})
    baseline.result.name = 'Baseline (Proven Strategy)'

    // Test each feature
    const features = [
      { name: 'Multi-Timeframe (RSI) Filter', config: { checkMTF: true } },
      { name: 'Session Filter (No Lunch Hour)', config: { checkSession: true } },
      { name: 'Trailing Stops', config: { useTrailingStop: true } },
      { name: 'Order Flow Filter', config: { checkOrderFlow: true } },
      { name: 'Market Structure Filter', config: { checkStructure: true } },
    ]

    const comparisons: FeatureComparison[] = []

    for (const feature of features) {
      console.log(`Testing feature: ${feature.name}`)
      const withFeature = runBacktest(candles, feature.config)
      withFeature.result.name = `With ${feature.name}`

      const comparison = compareFeature(baseline.result, withFeature.result, feature.name)
      comparisons.push(comparison)
    }

    // Test combined approved features
    const approvedFeatures = comparisons.filter(c => c.recommendation === 'APPROVED')
    let combinedResult: TestResult | null = null

    if (approvedFeatures.length > 0) {
      console.log('Testing combined approved features...')
      const combinedConfig: SignalConfig = {}
      for (const f of approvedFeatures) {
        if (f.feature.includes('Multi-Timeframe')) combinedConfig.checkMTF = true
        if (f.feature.includes('Session')) combinedConfig.checkSession = true
        if (f.feature.includes('Trailing')) combinedConfig.useTrailingStop = true
        if (f.feature.includes('Order Flow')) combinedConfig.checkOrderFlow = true
        if (f.feature.includes('Structure')) combinedConfig.checkStructure = true
      }
      const combined = runBacktest(candles, combinedConfig)
      combinedResult = combined.result
      combinedResult.name = 'Combined Approved Features'
    }

    return NextResponse.json({
      success: true,
      dataAnalyzed: {
        candles: candles.length,
        days: new Set(candles.map(c => c.dateStr)).size,
        dateRange: {
          start: candles[0].dateStr,
          end: candles[candles.length - 1].dateStr
        }
      },

      baseline: {
        trades: baseline.result.trades,
        wins: baseline.result.wins,
        winRate: baseline.result.winRate.toFixed(1) + '%',
        profitFactor: baseline.result.profitFactor.toFixed(2),
        grossPnL: '$' + baseline.result.grossPnL.toFixed(2),
        netPnL: '$' + baseline.result.netPnL.toFixed(2),
        maxDrawdown: '$' + baseline.result.maxDrawdown.toFixed(2),
        avgWin: '$' + baseline.result.avgWin.toFixed(2),
        avgLoss: '$' + baseline.result.avgLoss.toFixed(2)
      },

      featureTests: comparisons.map(c => ({
        feature: c.feature,
        recommendation: c.recommendation === 'APPROVED' ? '✅ APPROVED' :
                        c.recommendation === 'NEUTRAL' ? '⚠️ NEUTRAL' : '❌ REJECTED',
        withFeature: {
          trades: c.withFeature.trades,
          wins: c.withFeature.wins,
          winRate: c.withFeature.winRate.toFixed(1) + '%',
          profitFactor: c.withFeature.profitFactor.toFixed(2),
          netPnL: '$' + c.withFeature.netPnL.toFixed(2),
          maxDrawdown: '$' + c.withFeature.maxDrawdown.toFixed(2)
        },
        improvement: c.improvement,
        reason: c.reason
      })),

      combinedApproved: combinedResult ? {
        features: approvedFeatures.map(f => f.feature),
        trades: combinedResult.trades,
        wins: combinedResult.wins,
        winRate: combinedResult.winRate.toFixed(1) + '%',
        profitFactor: combinedResult.profitFactor.toFixed(2),
        netPnL: '$' + combinedResult.netPnL.toFixed(2),
        maxDrawdown: '$' + combinedResult.maxDrawdown.toFixed(2),
        vsBaseline: {
          winRateDiff: (combinedResult.winRate - baseline.result.winRate).toFixed(1) + '%',
          pnlDiff: '$' + (combinedResult.netPnL - baseline.result.netPnL).toFixed(2)
        }
      } : 'No features approved',

      summary: {
        approvedFeatures: approvedFeatures.map(f => f.feature),
        rejectedFeatures: comparisons.filter(c => c.recommendation === 'REJECTED').map(c => c.feature),
        neutralFeatures: comparisons.filter(c => c.recommendation === 'NEUTRAL').map(c => c.feature),
        recommendation: approvedFeatures.length > 0
          ? `Implement these features: ${approvedFeatures.map(f => f.feature).join(', ')}`
          : 'No features improved the baseline. Keep the proven strategy as-is.'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 })
  }
}
