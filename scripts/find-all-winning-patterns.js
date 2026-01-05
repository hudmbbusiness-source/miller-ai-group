/**
 * FIND ALL WINNING PATTERNS - Exhaustive search with relaxed criteria
 *
 * Goal: Find ALL patterns that have an edge (PF > 1.2)
 * Then we can combine them for better consistency
 *
 * Run: node scripts/find-all-winning-patterns.js
 */

const fs = require('fs')
const path = require('path')

// Trading costs
const COSTS = { TOTAL: 6.74, SLIPPAGE: 6.25, POINT_VALUE: 50 }

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
    year: new Date(r.date).getFullYear(),
    dayOfWeek: new Date(r.date).getDay(),
    month: new Date(r.date).getMonth() + 1,
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date))

console.log('\n' + '='.repeat(80))
console.log('EXHAUSTIVE PATTERN SEARCH - 5 YEARS DATA')
console.log('='.repeat(80))
console.log(`Data: ${candles[0].date} to ${candles[candles.length-1].date}`)
console.log('='.repeat(80) + '\n')

// Calculate indicators
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

function calcSMA(data, period) {
  const sma = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    sma[i] = sum / period
  }
  return sma
}

const closes = candles.map(c => c.close)
const ema5 = calcEMA(closes, 5)
const ema9 = calcEMA(closes, 9)
const ema20 = calcEMA(closes, 20)
const ema50 = calcEMA(closes, 50)
const ema200 = calcEMA(closes, 200)
const sma20 = calcSMA(closes, 20)
const sma50 = calcSMA(closes, 50)
const rsi = calcRSI(closes, 14)
const atr = calcATR(candles, 14)

// Build data array
const data = candles.map((c, i) => ({
  ...c,
  i,
  ema5: ema5[i] || 0,
  ema9: ema9[i] || 0,
  ema20: ema20[i] || 0,
  ema50: ema50[i] || 0,
  ema200: ema200[i] || 0,
  sma20: sma20[i] || 0,
  sma50: sma50[i] || 0,
  rsi: rsi[i] || 50,
  atr: atr[i] || 0,
  // Price action
  bullish: c.close > c.open,
  bearish: c.close < c.open,
  // Change
  change: i > 0 ? (c.close - candles[i-1].close) / candles[i-1].close * 100 : 0,
  // Trend
  uptrend: ema20[i] > ema50[i],
  downtrend: ema20[i] < ema50[i],
  strongUptrend: ema9[i] > ema20[i] && ema20[i] > ema50[i],
  strongDowntrend: ema9[i] < ema20[i] && ema20[i] < ema50[i],
}))

console.log('Indicators calculated.\n')

// ============================================
// PATTERN GENERATORS
// ============================================

const patterns = []

// 1. SIMPLE TREND FOLLOWING
for (const holdDays of [3, 5, 7, 10]) {
  // Buy when price is above all EMAs
  patterns.push({
    name: `TREND_ALL_UP_hold${holdDays}`,
    dir: 'LONG',
    detect: (d) => {
      if (d.close > d.ema9 && d.close > d.ema20 && d.close > d.ema50 && d.bullish) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })

  patterns.push({
    name: `TREND_ALL_DOWN_hold${holdDays}`,
    dir: 'SHORT',
    detect: (d) => {
      if (d.close < d.ema9 && d.close < d.ema20 && d.close < d.ema50 && d.bearish) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })
}

// 2. MOMENTUM - Buy consecutive up days
for (const consecutiveDays of [2, 3]) {
  for (const holdDays of [3, 5, 7]) {
    patterns.push({
      name: `MOMENTUM_${consecutiveDays}UP_hold${holdDays}`,
      dir: 'LONG',
      detect: (d, pd, ppd, pppd) => {
        if (!pd) return null
        const days = [d, pd, ppd, pppd].filter(x => x)
        if (days.length < consecutiveDays) return null

        let allUp = true
        for (let i = 0; i < consecutiveDays; i++) {
          if (!days[i] || !days[i].bullish) allUp = false
        }

        if (allUp && d.uptrend) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })

    patterns.push({
      name: `MOMENTUM_${consecutiveDays}DOWN_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d, pd, ppd, pppd) => {
        if (!pd) return null
        const days = [d, pd, ppd, pppd].filter(x => x)
        if (days.length < consecutiveDays) return null

        let allDown = true
        for (let i = 0; i < consecutiveDays; i++) {
          if (!days[i] || !days[i].bearish) allDown = false
        }

        if (allDown && d.downtrend) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })
  }
}

// 3. RSI STRATEGIES
for (const oversold of [25, 30, 35]) {
  for (const holdDays of [3, 5, 7]) {
    patterns.push({
      name: `RSI_OVERSOLD_${oversold}_hold${holdDays}`,
      dir: 'LONG',
      detect: (d, pd) => {
        if (!pd) return null
        if (pd.rsi < oversold && d.rsi > pd.rsi && d.bullish) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })
  }
}

for (const overbought of [65, 70, 75]) {
  for (const holdDays of [3, 5, 7]) {
    patterns.push({
      name: `RSI_OVERBOUGHT_${overbought}_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d, pd) => {
        if (!pd) return null
        if (pd.rsi > overbought && d.rsi < pd.rsi && d.bearish) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })
  }
}

// 4. EMA CROSS
for (const holdDays of [5, 7, 10]) {
  patterns.push({
    name: `EMA_9_20_CROSS_UP_hold${holdDays}`,
    dir: 'LONG',
    detect: (d, pd) => {
      if (!pd) return null
      if (pd.ema9 < pd.ema20 && d.ema9 > d.ema20) {
        return { holdDays, atrMult: 2.5 }
      }
      return null
    }
  })

  patterns.push({
    name: `EMA_9_20_CROSS_DOWN_hold${holdDays}`,
    dir: 'SHORT',
    detect: (d, pd) => {
      if (!pd) return null
      if (pd.ema9 > pd.ema20 && d.ema9 < d.ema20) {
        return { holdDays, atrMult: 2.5 }
      }
      return null
    }
  })

  patterns.push({
    name: `EMA_20_50_CROSS_UP_hold${holdDays}`,
    dir: 'LONG',
    detect: (d, pd) => {
      if (!pd) return null
      if (pd.ema20 < pd.ema50 && d.ema20 > d.ema50) {
        return { holdDays, atrMult: 3 }
      }
      return null
    }
  })

  patterns.push({
    name: `EMA_20_50_CROSS_DOWN_hold${holdDays}`,
    dir: 'SHORT',
    detect: (d, pd) => {
      if (!pd) return null
      if (pd.ema20 > pd.ema50 && d.ema20 < d.ema50) {
        return { holdDays, atrMult: 3 }
      }
      return null
    }
  })
}

// 5. PULLBACK IN TREND
for (const tolerance of [0.5, 1, 1.5]) {
  for (const holdDays of [3, 5, 7]) {
    patterns.push({
      name: `PULLBACK_EMA20_UP_tol${tolerance}_hold${holdDays}`,
      dir: 'LONG',
      detect: (d) => {
        if (d.uptrend && d.low <= d.ema20 * (1 + tolerance/100) && d.close > d.ema20 && d.bullish) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })

    patterns.push({
      name: `PULLBACK_EMA20_DOWN_tol${tolerance}_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d) => {
        if (d.downtrend && d.high >= d.ema20 * (1 - tolerance/100) && d.close < d.ema20 && d.bearish) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })

    patterns.push({
      name: `PULLBACK_EMA50_UP_tol${tolerance}_hold${holdDays}`,
      dir: 'LONG',
      detect: (d) => {
        if (d.uptrend && d.low <= d.ema50 * (1 + tolerance/100) && d.close > d.ema50 && d.bullish) {
          return { holdDays, atrMult: 2.5 }
        }
        return null
      }
    })

    patterns.push({
      name: `PULLBACK_EMA50_DOWN_tol${tolerance}_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d) => {
        if (d.downtrend && d.high >= d.ema50 * (1 - tolerance/100) && d.close < d.ema50 && d.bearish) {
          return { holdDays, atrMult: 2.5 }
        }
        return null
      }
    })
  }
}

// 6. EMA200 BOUNCE (Strong S/R)
for (const tolerance of [0.5, 1, 2]) {
  for (const holdDays of [5, 7, 10]) {
    patterns.push({
      name: `EMA200_BOUNCE_UP_tol${tolerance}_hold${holdDays}`,
      dir: 'LONG',
      detect: (d) => {
        if (d.close > d.ema200 && d.low <= d.ema200 * (1 + tolerance/100) && d.bullish) {
          return { holdDays, atrMult: 3 }
        }
        return null
      }
    })

    patterns.push({
      name: `EMA200_BOUNCE_DOWN_tol${tolerance}_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d) => {
        if (d.close < d.ema200 && d.high >= d.ema200 * (1 - tolerance/100) && d.bearish) {
          return { holdDays, atrMult: 3 }
        }
        return null
      }
    })
  }
}

// 7. DAY OF WEEK PATTERNS
for (const dow of [1, 2, 3, 4, 5]) {  // Mon-Fri
  const dayName = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dow]
  patterns.push({
    name: `${dayName}_BULLISH_hold3`,
    dir: 'LONG',
    detect: (d) => {
      if (d.dayOfWeek === dow && d.bullish && d.uptrend) {
        return { holdDays: 3, atrMult: 1.5 }
      }
      return null
    }
  })

  patterns.push({
    name: `${dayName}_BEARISH_hold3`,
    dir: 'SHORT',
    detect: (d) => {
      if (d.dayOfWeek === dow && d.bearish && d.downtrend) {
        return { holdDays: 3, atrMult: 1.5 }
      }
      return null
    }
  })
}

// 8. GAP PATTERNS
for (const gapPct of [0.5, 1, 1.5]) {
  for (const holdDays of [1, 3, 5]) {
    patterns.push({
      name: `GAP_UP_${gapPct}pct_hold${holdDays}`,
      dir: 'LONG',
      detect: (d, pd) => {
        if (!pd) return null
        const gap = (d.open - pd.close) / pd.close * 100
        if (gap > gapPct && d.bullish && d.uptrend) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })

    patterns.push({
      name: `GAP_DOWN_${gapPct}pct_hold${holdDays}`,
      dir: 'SHORT',
      detect: (d, pd) => {
        if (!pd) return null
        const gap = (pd.close - d.open) / pd.close * 100
        if (gap > gapPct && d.bearish && d.downtrend) {
          return { holdDays, atrMult: 2 }
        }
        return null
      }
    })
  }
}

// 9. STRONG TREND CONTINUATION
for (const holdDays of [3, 5, 7]) {
  patterns.push({
    name: `STRONG_TREND_CONT_UP_hold${holdDays}`,
    dir: 'LONG',
    detect: (d) => {
      if (d.strongUptrend && d.rsi > 50 && d.rsi < 70 && d.bullish) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })

  patterns.push({
    name: `STRONG_TREND_CONT_DOWN_hold${holdDays}`,
    dir: 'SHORT',
    detect: (d) => {
      if (d.strongDowntrend && d.rsi < 50 && d.rsi > 30 && d.bearish) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })
}

// 10. INSIDE BAR BREAKOUT
for (const holdDays of [3, 5, 7]) {
  patterns.push({
    name: `INSIDE_BREAKOUT_UP_hold${holdDays}`,
    dir: 'LONG',
    detect: (d, pd, ppd) => {
      if (!pd || !ppd) return null
      const wasInside = pd.high < ppd.high && pd.low > ppd.low
      if (wasInside && d.close > ppd.high && d.bullish && d.uptrend) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })

  patterns.push({
    name: `INSIDE_BREAKOUT_DOWN_hold${holdDays}`,
    dir: 'SHORT',
    detect: (d, pd, ppd) => {
      if (!pd || !ppd) return null
      const wasInside = pd.high < ppd.high && pd.low > ppd.low
      if (wasInside && d.close < ppd.low && d.bearish && d.downtrend) {
        return { holdDays, atrMult: 2 }
      }
      return null
    }
  })
}

console.log(`Testing ${patterns.length} patterns...\n`)

// ============================================
// BACKTEST
// ============================================

function backtest(pattern) {
  const trades = []
  let position = null

  for (let i = 200; i < data.length; i++) {
    const d = data[i]
    const pd = data[i-1]
    const ppd = data[i-2]
    const pppd = data[i-3]

    // Check exit (fixed hold period)
    if (position) {
      const holdDays = i - position.entryIdx
      if (holdDays >= position.maxHold) {
        const pnl = position.dir === 'LONG'
          ? d.close - position.entry
          : position.entry - d.close
        const netDollars = pnl * COSTS.POINT_VALUE - COSTS.TOTAL - COSTS.SLIPPAGE
        trades.push({ netDollars, year: d.year })
        position = null
      }
    }

    // Check entry
    if (!position) {
      const signal = pattern.detect(d, pd, ppd, pppd)
      if (signal) {
        const slippage = COSTS.SLIPPAGE / COSTS.POINT_VALUE
        position = {
          dir: pattern.dir,
          entry: pattern.dir === 'LONG' ? d.close + slippage : d.close - slippage,
          entryIdx: i,
          maxHold: signal.holdDays,
        }
      }
    }
  }

  return trades
}

// ============================================
// ANALYZE
// ============================================

function analyze(trades) {
  if (trades.length < 15) return null

  const wins = trades.filter(t => t.netDollars > 0)
  const winRate = (wins.length / trades.length) * 100

  const grossProfit = wins.reduce((s, t) => s + t.netDollars, 0)
  const losses = trades.filter(t => t.netDollars <= 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netDollars, 0))
  const pf = grossLoss > 0 ? grossProfit / grossLoss : 99

  const totalPnL = trades.reduce((s, t) => s + t.netDollars, 0)
  const avgPnL = totalPnL / trades.length

  // Yearly
  const years = [...new Set(trades.map(t => t.year))]
  const yearlyPnL = {}
  for (const y of years) {
    yearlyPnL[y] = trades.filter(t => t.year === y).reduce((s, t) => s + t.netDollars, 0)
  }
  const profitableYears = Object.values(yearlyPnL).filter(p => p > 0).length
  const consistency = years.length > 0 ? profitableYears / years.length : 0

  return { trades: trades.length, wins: wins.length, winRate, pf, totalPnL, avgPnL, consistency, yearlyPnL }
}

// ============================================
// RUN
// ============================================

const results = []

for (const pattern of patterns) {
  const trades = backtest(pattern)
  const stats = analyze(trades)

  if (stats && stats.pf > 1.2) {  // Only keep patterns with edge
    results.push({
      name: pattern.name,
      dir: pattern.dir,
      ...stats,
    })
  }
}

results.sort((a, b) => b.pf - a.pf)

// ============================================
// DISPLAY
// ============================================

console.log('='.repeat(120))
console.log('ALL PATTERNS WITH EDGE (PF > 1.2)')
console.log('='.repeat(120))
console.log('Pattern                                    | Dir   | Trades | W.Rate | PF    | Net P&L   | Consist | Years Profitable')
console.log('-'.repeat(120))

for (const r of results) {
  const yearInfo = Object.entries(r.yearlyPnL)
    .sort((a, b) => a[0] - b[0])
    .map(([y, p]) => `${y.slice(2)}:${p > 0 ? '+' : ''}${Math.round(p/1000)}k`)
    .join(' ')

  console.log(
    `${r.name.padEnd(42)} | ${r.dir.padEnd(5)} | ${String(r.trades).padStart(6)} | ${r.winRate.toFixed(1).padStart(5)}% | ${r.pf.toFixed(2).padStart(5)} | $${r.totalPnL.toFixed(0).padStart(8)} | ${(r.consistency * 100).toFixed(0).padStart(6)}% | ${yearInfo}`
  )
}

// Group by direction
const longPatterns = results.filter(r => r.dir === 'LONG')
const shortPatterns = results.filter(r => r.dir === 'SHORT')

console.log('\n' + '='.repeat(80))
console.log('SUMMARY BY DIRECTION')
console.log('='.repeat(80))
console.log(`\nLONG patterns with edge: ${longPatterns.length}`)
console.log(`SHORT patterns with edge: ${shortPatterns.length}`)

// Find best patterns for each year
console.log('\n' + '='.repeat(80))
console.log('BEST PATTERNS FOR DAILY BIAS')
console.log('='.repeat(80))

// Filter to patterns with 55%+ win rate AND PF > 1.3 AND 60%+ consistency
const approved = results.filter(r =>
  r.winRate >= 55 &&
  r.pf >= 1.3 &&
  r.consistency >= 0.6
)

console.log(`\n✅ APPROVED PATTERNS (55%+ WR, 1.3+ PF, 60%+ consistency): ${approved.length}`)

if (approved.length > 0) {
  for (const r of approved) {
    console.log(`\n  ${r.name}`)
    console.log(`    Dir: ${r.dir} | Trades: ${r.trades} | Win Rate: ${r.winRate.toFixed(1)}%`)
    console.log(`    PF: ${r.pf.toFixed(2)} | Net P&L: $${r.totalPnL.toFixed(0)} | Consistency: ${(r.consistency * 100).toFixed(0)}%`)
  }
} else {
  // Show closest
  console.log('\n  No patterns fully approved. Closest:')
  const close = results.slice(0, 10)
  for (const r of close) {
    const wr = r.winRate >= 55 ? '✅' : '❌'
    const pf = r.pf >= 1.3 ? '✅' : '❌'
    const co = r.consistency >= 0.6 ? '✅' : '❌'
    console.log(`    ${r.name}: WR ${r.winRate.toFixed(1)}%${wr} PF ${r.pf.toFixed(2)}${pf} Cons ${(r.consistency*100).toFixed(0)}%${co}`)
  }
}

console.log('\n' + '='.repeat(80))
console.log(`Total patterns tested: ${patterns.length}`)
console.log(`Patterns with edge (PF > 1.2): ${results.length}`)
console.log(`Patterns fully approved: ${approved.length}`)
