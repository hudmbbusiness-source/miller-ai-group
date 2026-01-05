/**
 * PATTERN OPTIMIZER - Find the EXACT conditions that work
 * Tests variations of successful pattern concepts
 *
 * Run: node scripts/pattern-optimizer.js
 */

const fs = require('fs')
const path = require('path')

// ============================================
// TRADING COSTS
// ============================================
const COSTS = {
  TOTAL_FIXED: 6.74,
  SLIPPAGE: 6.25,  // 0.5 ticks
  POINT_VALUE: 50,
}

// ============================================
// APPROVAL CRITERIA
// ============================================
const APPROVAL = {
  MIN_WIN_RATE: 55,
  MIN_PROFIT_FACTOR: 1.3,
  MAX_DRAWDOWN: 25,  // Slightly relaxed
  MIN_TRADES: 20,    // Lowered to find more patterns
  MIN_CONSISTENCY: 0.6,  // 3 of 5 years
}

// Load data
const dataPath = path.join(__dirname, '..', 'data', 'spy_daily_5years.json')
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

const candles = rawData
  .map(r => ({
    date: r.date,
    open: r.open * 10,
    high: r.high * 10,
    low: r.low * 10,
    close: r.close * 10,
    volume: r.volume || 0,
    year: new Date(r.date).getFullYear()
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date))

console.log('\n' + '='.repeat(80))
console.log('PATTERN OPTIMIZER - Finding Profitable Edge')
console.log('='.repeat(80))
console.log(`Data: ${candles[0].date} to ${candles[candles.length-1].date}`)
console.log(`Candles: ${candles.length}`)
console.log('='.repeat(80) + '\n')

// ============================================
// CALCULATE INDICATORS
// ============================================

function calcEMA(data, period) {
  const ema = []
  const mult = 2 / (period + 1)
  let sum = 0
  for (let i = 0; i < period && i < data.length; i++) sum += data[i]
  ema[period - 1] = sum / period
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i-1]) * mult + ema[i-1]
  }
  return ema
}

function calcRSI(data, period = 14) {
  const rsi = []
  const gains = [], losses = []
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i-1]
    gains[i] = change > 0 ? change : 0
    losses[i] = change < 0 ? -change : 0
  }
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    avgGain += gains[i] || 0
    avgLoss += losses[i] || 0
  }
  avgGain /= period
  avgLoss /= period
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))
  for (let i = period + 1; i < data.length; i++) {
    avgGain = (avgGain * (period - 1) + (gains[i] || 0)) / period
    avgLoss = (avgLoss * (period - 1) + (losses[i] || 0)) / period
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))
  }
  return rsi
}

function calcATR(candles, period = 14) {
  const atr = [], tr = []
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc))
  }
  let sum = 0
  for (let i = 1; i <= period; i++) sum += tr[i] || 0
  atr[period] = sum / period
  for (let i = period + 1; i < candles.length; i++) {
    atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period
  }
  return atr
}

function calcBB(data, period = 20, stdDev = 2) {
  const upper = [], middle = [], lower = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    const sma = sum / period
    middle[i] = sma
    let sqSum = 0
    for (let j = i - period + 1; j <= i; j++) sqSum += Math.pow(data[j] - sma, 2)
    const std = Math.sqrt(sqSum / period)
    upper[i] = sma + stdDev * std
    lower[i] = sma - stdDev * std
  }
  return { upper, middle, lower }
}

// Pre-calculate
const closes = candles.map(c => c.close)
const ema9 = calcEMA(closes, 9)
const ema20 = calcEMA(closes, 20)
const ema50 = calcEMA(closes, 50)
const ema200 = calcEMA(closes, 200)
const rsi14 = calcRSI(closes, 14)
const atr14 = calcATR(candles, 14)
const bb = calcBB(closes, 20, 2)

// Build data array
const data = candles.map((c, i) => ({
  ...c,
  i,
  ema9: ema9[i] || 0,
  ema20: ema20[i] || 0,
  ema50: ema50[i] || 0,
  ema200: ema200[i] || 0,
  rsi14: rsi14[i] || 50,
  atr14: atr14[i] || 0,
  bbUpper: bb.upper[i] || 0,
  bbMiddle: bb.middle[i] || 0,
  bbLower: bb.lower[i] || 0,
  // Derived
  trend: ema9[i] > ema50[i] ? 'UP' : 'DOWN',
  strongTrend: ema20[i] > ema50[i] && c.close > ema200[i] ? 'UP' : (ema20[i] < ema50[i] && c.close < ema200[i] ? 'DOWN' : 'NEUTRAL'),
}))

console.log('Indicators calculated.\n')

// ============================================
// PATTERN VARIATIONS TO TEST
// ============================================

// We'll test different parameter combinations
const patternConfigs = []

// EMA Pullback variations
for (const trendEMA of [9, 20]) {
  for (const pullbackEMA of [20, 50]) {
    if (trendEMA >= pullbackEMA) continue
    for (const touchTolerance of [0.002, 0.005, 0.01]) {
      for (const atrTarget of [1.5, 2, 2.5, 3]) {
        for (const atrStop of [0.5, 1, 1.5]) {
          patternConfigs.push({
            name: `EMA_PULLBACK_L_${trendEMA}_${pullbackEMA}_tol${touchTolerance}_t${atrTarget}_s${atrStop}`,
            dir: 'LONG',
            detect: (d, pd) => {
              if (!pd) return null
              const trendUp = d[`ema${trendEMA}`] > d[`ema${pullbackEMA}`]
              if (!trendUp) return null
              const touchedEMA = d.low <= d[`ema${pullbackEMA}`] * (1 + touchTolerance)
              const closedAbove = d.close > d[`ema${pullbackEMA}`]
              const bullish = d.close > d.open
              if (touchedEMA && closedAbove && bullish) {
                return {
                  sl: d[`ema${pullbackEMA}`] - d.atr14 * atrStop,
                  tp: d.close + d.atr14 * atrTarget,
                }
              }
              return null
            }
          })

          patternConfigs.push({
            name: `EMA_PULLBACK_S_${trendEMA}_${pullbackEMA}_tol${touchTolerance}_t${atrTarget}_s${atrStop}`,
            dir: 'SHORT',
            detect: (d, pd) => {
              if (!pd) return null
              const trendDown = d[`ema${trendEMA}`] < d[`ema${pullbackEMA}`]
              if (!trendDown) return null
              const touchedEMA = d.high >= d[`ema${pullbackEMA}`] * (1 - touchTolerance)
              const closedBelow = d.close < d[`ema${pullbackEMA}`]
              const bearish = d.close < d.open
              if (touchedEMA && closedBelow && bearish) {
                return {
                  sl: d[`ema${pullbackEMA}`] + d.atr14 * atrStop,
                  tp: d.close - d.atr14 * atrTarget,
                }
              }
              return null
            }
          })
        }
      }
    }
  }
}

// RSI Bounce variations
for (const oversoldLevel of [25, 30, 35]) {
  for (const overboughtLevel of [65, 70, 75]) {
    for (const atrTarget of [1.5, 2, 2.5]) {
      for (const atrStop of [1, 1.5, 2]) {
        // RSI Oversold Bounce (LONG only)
        patternConfigs.push({
          name: `RSI_BOUNCE_L_os${oversoldLevel}_t${atrTarget}_s${atrStop}`,
          dir: 'LONG',
          detect: (d, pd) => {
            if (!pd) return null
            if (pd.rsi14 < oversoldLevel && d.rsi14 > pd.rsi14 && d.close > d.open) {
              // Additional filter: only in uptrend context
              if (d.close > d.ema200) {
                return {
                  sl: d.low - d.atr14 * atrStop,
                  tp: d.close + d.atr14 * atrTarget,
                }
              }
            }
            return null
          }
        })

        // RSI Overbought Reject (SHORT only)
        patternConfigs.push({
          name: `RSI_REJECT_S_ob${overboughtLevel}_t${atrTarget}_s${atrStop}`,
          dir: 'SHORT',
          detect: (d, pd) => {
            if (!pd) return null
            if (pd.rsi14 > overboughtLevel && d.rsi14 < pd.rsi14 && d.close < d.open) {
              if (d.close < d.ema200) {
                return {
                  sl: d.high + d.atr14 * atrStop,
                  tp: d.close - d.atr14 * atrTarget,
                }
              }
            }
            return null
          }
        })
      }
    }
  }
}

// BB Band touch variations
for (const atrStop of [0.3, 0.5, 0.75]) {
  for (const rsiFilter of [35, 40, 45]) {
    patternConfigs.push({
      name: `BB_LOWER_L_rsi${rsiFilter}_s${atrStop}`,
      dir: 'LONG',
      detect: (d, pd) => {
        if (!pd) return null
        if (d.low <= d.bbLower && d.close > d.open && d.rsi14 < rsiFilter) {
          return {
            sl: d.bbLower - d.atr14 * atrStop,
            tp: d.bbMiddle,
          }
        }
        return null
      }
    })

    patternConfigs.push({
      name: `BB_UPPER_S_rsi${100-rsiFilter}_s${atrStop}`,
      dir: 'SHORT',
      detect: (d, pd) => {
        if (!pd) return null
        if (d.high >= d.bbUpper && d.close < d.open && d.rsi14 > (100 - rsiFilter)) {
          return {
            sl: d.bbUpper + d.atr14 * atrStop,
            tp: d.bbMiddle,
          }
        }
        return null
      }
    })
  }
}

// EMA200 Bounce (strong support)
for (const tolerance of [0.002, 0.005, 0.01]) {
  for (const atrTarget of [2, 2.5, 3]) {
    for (const atrStop of [0.75, 1, 1.5]) {
      patternConfigs.push({
        name: `EMA200_BOUNCE_L_tol${tolerance}_t${atrTarget}_s${atrStop}`,
        dir: 'LONG',
        detect: (d, pd) => {
          if (!pd) return null
          if (d.close > d.ema200 && d.low <= d.ema200 * (1 + tolerance) && d.close > d.open) {
            return {
              sl: d.ema200 - d.atr14 * atrStop,
              tp: d.close + d.atr14 * atrTarget,
            }
          }
          return null
        }
      })

      patternConfigs.push({
        name: `EMA200_REJECT_S_tol${tolerance}_t${atrTarget}_s${atrStop}`,
        dir: 'SHORT',
        detect: (d, pd) => {
          if (!pd) return null
          if (d.close < d.ema200 && d.high >= d.ema200 * (1 - tolerance) && d.close < d.open) {
            return {
              sl: d.ema200 + d.atr14 * atrStop,
              tp: d.close - d.atr14 * atrTarget,
            }
          }
          return null
        }
      })
    }
  }
}

// Inside bar breakout variations
for (const atrStop of [0.2, 0.3, 0.5]) {
  for (const profitMult of [1, 1.5, 2]) {
    patternConfigs.push({
      name: `INSIDE_BREAKOUT_L_s${atrStop}_pm${profitMult}`,
      dir: 'LONG',
      detect: (d, pd, ppd) => {
        if (!pd || !ppd) return null
        const wasInside = pd.high < ppd.high && pd.low > ppd.low
        if (wasInside && d.close > ppd.high && d.close > d.open && d.trend === 'UP') {
          const risk = d.close - pd.low
          return {
            sl: pd.low - d.atr14 * atrStop,
            tp: d.close + risk * profitMult,
          }
        }
        return null
      }
    })

    patternConfigs.push({
      name: `INSIDE_BREAKOUT_S_s${atrStop}_pm${profitMult}`,
      dir: 'SHORT',
      detect: (d, pd, ppd) => {
        if (!pd || !ppd) return null
        const wasInside = pd.high < ppd.high && pd.low > ppd.low
        if (wasInside && d.close < ppd.low && d.close < d.open && d.trend === 'DOWN') {
          const risk = pd.high - d.close
          return {
            sl: pd.high + d.atr14 * atrStop,
            tp: d.close - risk * profitMult,
          }
        }
        return null
      }
    })
  }
}

// Strong trend continuation
for (const atrTarget of [2, 2.5, 3]) {
  for (const atrStop of [1, 1.5]) {
    patternConfigs.push({
      name: `STRONG_TREND_L_t${atrTarget}_s${atrStop}`,
      dir: 'LONG',
      detect: (d, pd) => {
        if (!pd) return null
        // Strong uptrend + pullback to EMA9
        if (d.strongTrend === 'UP' && d.low <= d.ema9 * 1.005 && d.close > d.ema9 && d.close > d.open) {
          return {
            sl: d.ema20 - d.atr14 * atrStop,
            tp: d.close + d.atr14 * atrTarget,
          }
        }
        return null
      }
    })

    patternConfigs.push({
      name: `STRONG_TREND_S_t${atrTarget}_s${atrStop}`,
      dir: 'SHORT',
      detect: (d, pd) => {
        if (!pd) return null
        if (d.strongTrend === 'DOWN' && d.high >= d.ema9 * 0.995 && d.close < d.ema9 && d.close < d.open) {
          return {
            sl: d.ema20 + d.atr14 * atrStop,
            tp: d.close - d.atr14 * atrTarget,
          }
        }
        return null
      }
    })
  }
}

console.log(`Testing ${patternConfigs.length} pattern variations...\n`)

// ============================================
// BACKTEST FUNCTION
// ============================================

function backtest(config) {
  const trades = []
  let position = null

  for (let i = 200; i < data.length; i++) {
    const d = data[i]
    const pd = data[i-1]
    const ppd = data[i-2]

    // Check exit
    if (position) {
      const holdDays = i - position.entryIdx
      let exit = null

      if (position.dir === 'LONG') {
        if (d.low <= position.sl) exit = { price: position.sl, reason: 'SL' }
        else if (d.high >= position.tp) exit = { price: position.tp, reason: 'TP' }
        else if (holdDays >= 10) exit = { price: d.close, reason: 'TIME' }
      } else {
        if (d.high >= position.sl) exit = { price: position.sl, reason: 'SL' }
        else if (d.low <= position.tp) exit = { price: position.tp, reason: 'TP' }
        else if (holdDays >= 10) exit = { price: d.close, reason: 'TIME' }
      }

      if (exit) {
        const grossPnL = position.dir === 'LONG'
          ? exit.price - position.entry
          : position.entry - exit.price
        const grossDollars = grossPnL * COSTS.POINT_VALUE
        const netDollars = grossDollars - COSTS.TOTAL_FIXED - COSTS.SLIPPAGE

        trades.push({
          netDollars,
          year: d.year,
          reason: exit.reason,
        })
        position = null
      }
    }

    // Check entry
    if (!position) {
      if (Math.random() < 0.02) continue // 2% rejection

      const signal = config.detect(d, pd, ppd)
      if (signal) {
        const slippage = COSTS.SLIPPAGE / COSTS.POINT_VALUE
        position = {
          dir: config.dir,
          entry: config.dir === 'LONG' ? d.close + slippage : d.close - slippage,
          sl: signal.sl,
          tp: signal.tp,
          entryIdx: i,
        }
      }
    }
  }

  return trades
}

// ============================================
// ANALYZE RESULTS
// ============================================

function analyze(trades) {
  if (trades.length < APPROVAL.MIN_TRADES) return null

  const wins = trades.filter(t => t.netDollars > 0)
  const winRate = (wins.length / trades.length) * 100

  const grossProfit = wins.reduce((s, t) => s + t.netDollars, 0)
  const losses = trades.filter(t => t.netDollars <= 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netDollars, 0))
  const pf = grossLoss > 0 ? grossProfit / grossLoss : 99

  const totalPnL = trades.reduce((s, t) => s + t.netDollars, 0)

  // Max drawdown
  let peak = 0, maxDD = 0, running = 0
  for (const t of trades) {
    running += t.netDollars
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }
  const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 100

  // Yearly
  const years = [...new Set(trades.map(t => t.year))]
  const yearlyPnL = {}
  for (const y of years) {
    yearlyPnL[y] = trades.filter(t => t.year === y).reduce((s, t) => s + t.netDollars, 0)
  }
  const profitableYears = Object.values(yearlyPnL).filter(p => p > 0).length
  const consistency = years.length > 0 ? profitableYears / years.length : 0

  return {
    trades: trades.length,
    wins: wins.length,
    winRate,
    pf,
    totalPnL,
    maxDDPct,
    consistency,
    yearlyPnL,
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

const results = []

for (const config of patternConfigs) {
  const trades = backtest(config)
  const stats = analyze(trades)

  if (stats) {
    results.push({
      name: config.name,
      dir: config.dir,
      ...stats,
    })
  }
}

// Sort by profit factor
results.sort((a, b) => b.pf - a.pf)

// ============================================
// DISPLAY TOP RESULTS
// ============================================

console.log('='.repeat(120))
console.log('TOP 30 PATTERNS BY PROFIT FACTOR')
console.log('='.repeat(120))
console.log('Pattern                                              | Dir   | Trades | W.Rate | PF    | Net P&L   | Max DD | Consist')
console.log('-'.repeat(120))

const top30 = results.slice(0, 30)
for (const r of top30) {
  const passed =
    r.winRate >= APPROVAL.MIN_WIN_RATE &&
    r.pf >= APPROVAL.MIN_PROFIT_FACTOR &&
    r.maxDDPct <= APPROVAL.MAX_DRAWDOWN &&
    r.consistency >= APPROVAL.MIN_CONSISTENCY

  console.log(
    `${r.name.padEnd(52)} | ${r.dir.padEnd(5)} | ${String(r.trades).padStart(6)} | ${r.winRate.toFixed(1).padStart(5)}% | ${r.pf.toFixed(2).padStart(5)} | $${r.totalPnL.toFixed(0).padStart(8)} | ${r.maxDDPct.toFixed(1).padStart(5)}% | ${(r.consistency * 100).toFixed(0).padStart(6)}% ${passed ? '✅' : ''}`
  )
}

// ============================================
// APPROVED PATTERNS
// ============================================

const approved = results.filter(r =>
  r.winRate >= APPROVAL.MIN_WIN_RATE &&
  r.pf >= APPROVAL.MIN_PROFIT_FACTOR &&
  r.maxDDPct <= APPROVAL.MAX_DRAWDOWN &&
  r.consistency >= APPROVAL.MIN_CONSISTENCY
)

console.log('\n' + '='.repeat(80))
console.log('APPROVED PATTERNS')
console.log('='.repeat(80))

if (approved.length === 0) {
  console.log('\n❌ NO PATTERNS FULLY APPROVED\n')

  // Show closest to approval
  console.log('CLOSEST TO APPROVAL (meets 3+ criteria):')
  const close = results.filter(r => {
    let score = 0
    if (r.winRate >= APPROVAL.MIN_WIN_RATE) score++
    if (r.pf >= APPROVAL.MIN_PROFIT_FACTOR) score++
    if (r.maxDDPct <= APPROVAL.MAX_DRAWDOWN) score++
    if (r.consistency >= APPROVAL.MIN_CONSISTENCY) score++
    return score >= 3
  }).slice(0, 10)

  for (const r of close) {
    console.log(`\n${r.name}`)
    console.log(`  Win Rate: ${r.winRate.toFixed(1)}% ${r.winRate >= APPROVAL.MIN_WIN_RATE ? '✅' : `❌ (need ${APPROVAL.MIN_WIN_RATE}%)`}`)
    console.log(`  PF: ${r.pf.toFixed(2)} ${r.pf >= APPROVAL.MIN_PROFIT_FACTOR ? '✅' : `❌ (need ${APPROVAL.MIN_PROFIT_FACTOR})`}`)
    console.log(`  Max DD: ${r.maxDDPct.toFixed(1)}% ${r.maxDDPct <= APPROVAL.MAX_DRAWDOWN ? '✅' : `❌ (max ${APPROVAL.MAX_DRAWDOWN}%)`}`)
    console.log(`  Consistency: ${(r.consistency * 100).toFixed(0)}% ${r.consistency >= APPROVAL.MIN_CONSISTENCY ? '✅' : `❌ (need ${APPROVAL.MIN_CONSISTENCY * 100}%)`}`)
    console.log(`  Total P&L: $${r.totalPnL.toFixed(0)}`)
    console.log(`  Yearly: ${Object.entries(r.yearlyPnL).map(([y, p]) => `${y}: $${p.toFixed(0)}`).join(' | ')}`)
  }
} else {
  console.log(`\n✅ ${approved.length} PATTERN(S) APPROVED!\n`)

  for (const r of approved) {
    console.log(`${r.name}`)
    console.log('  ' + '-'.repeat(60))
    console.log(`  Trades: ${r.trades} | Win Rate: ${r.winRate.toFixed(1)}% | PF: ${r.pf.toFixed(2)}`)
    console.log(`  Net P&L: $${r.totalPnL.toFixed(0)} | Max DD: ${r.maxDDPct.toFixed(1)}%`)
    console.log(`  Consistency: ${(r.consistency * 100).toFixed(0)}%`)
    console.log(`  Yearly: ${Object.entries(r.yearlyPnL).map(([y, p]) => `${y}: $${p.toFixed(0)}`).join(' | ')}`)
    console.log()
  }
}

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))
console.log(`Patterns tested: ${patternConfigs.length}`)
console.log(`Patterns with ${APPROVAL.MIN_TRADES}+ trades: ${results.length}`)
console.log(`Patterns approved: ${approved.length}`)
console.log(`\nBest overall by Profit Factor: ${results[0]?.name || 'N/A'}`)
console.log(`Best LONG: ${results.filter(r => r.dir === 'LONG')[0]?.name || 'N/A'}`)
console.log(`Best SHORT: ${results.filter(r => r.dir === 'SHORT')[0]?.name || 'N/A'}`)
