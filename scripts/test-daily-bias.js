/**
 * Test the Daily Bias Strategy patterns on 5 years of data
 * Run: node scripts/test-daily-bias.js
 */

const fs = require('fs')
const path = require('path')

// Load data
const dataPath = path.join(__dirname, '..', 'data', 'spy_daily_5years.json')
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

// Sort oldest to newest
const candles = rawData
  .map(r => ({
    date: r.date,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume || 0
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date))

console.log(`\n========================================`)
console.log(`DAILY BIAS STRATEGY - 5 YEAR BACKTEST`)
console.log(`========================================`)
console.log(`Data: ${candles[0].date} to ${candles[candles.length-1].date}`)
console.log(`Total candles: ${candles.length}`)
console.log(`----------------------------------------\n`)

// Calculate EMA
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

// Calculate RSI
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

// Calculate ATR
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

// Calculate Bollinger Bands
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

// Calculate all indicators
const closes = candles.map(c => c.close)
const ema9 = calcEMA(closes, 9)
const ema21 = calcEMA(closes, 21)
const ema50 = calcEMA(closes, 50)
const rsi14 = calcRSI(closes, 14)
const atr14 = calcATR(candles, 14)
const bb = calcBB(closes, 20, 2)

// Build indicator array
const indicators = candles.map((_, i) => ({
  ema9: ema9[i] || 0,
  ema21: ema21[i] || 0,
  ema50: ema50[i] || 0,
  rsi14: rsi14[i] || 50,
  atr14: atr14[i] || 1,
  bbUpper: bb.upper[i] || 0,
  bbMiddle: bb.middle[i] || 0,
  bbLower: bb.lower[i] || 0
}))

// Pattern detection functions
const patterns = {
  // Pattern 1: EMA Pullback in Uptrend
  'EMA_PULLBACK_LONG': (i) => {
    if (i < 5) return null
    const ind = indicators[i], c = candles[i]
    if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
      if (c.low <= ind.ema21 * 1.005 && c.close > ind.ema21 && c.close > c.open) {
        return { direction: 'LONG', sl: ind.ema50 - ind.atr14 * 0.5, tp: c.close + ind.atr14 * 2.5 }
      }
    }
    return null
  },

  // Pattern 2: EMA Pullback in Downtrend
  'EMA_PULLBACK_SHORT': (i) => {
    if (i < 5) return null
    const ind = indicators[i], c = candles[i]
    if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
      if (c.high >= ind.ema21 * 0.995 && c.close < ind.ema21 && c.close < c.open) {
        return { direction: 'SHORT', sl: ind.ema50 + ind.atr14 * 0.5, tp: c.close - ind.atr14 * 2.5 }
      }
    }
    return null
  },

  // Pattern 3: RSI Oversold Bounce
  'RSI_OVERSOLD_BOUNCE': (i) => {
    if (i < 3) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i]
    if (prevInd.rsi14 < 30 && ind.rsi14 > prevInd.rsi14 && c.close > c.open) {
      return { direction: 'LONG', sl: c.low - ind.atr14, tp: c.close + ind.atr14 * 2 }
    }
    return null
  },

  // Pattern 4: RSI Overbought Rejection
  'RSI_OVERBOUGHT_REJECT': (i) => {
    if (i < 3) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i]
    if (prevInd.rsi14 > 70 && ind.rsi14 < prevInd.rsi14 && c.close < c.open) {
      return { direction: 'SHORT', sl: c.high + ind.atr14, tp: c.close - ind.atr14 * 2 }
    }
    return null
  },

  // Pattern 5: Bollinger Lower Band Bounce
  'BB_LOWER_BOUNCE': (i) => {
    if (i < 2) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i], pc = candles[i-1]
    if (pc.low <= prevInd.bbLower && c.close > c.open && ind.rsi14 < 40) {
      return { direction: 'LONG', sl: Math.min(pc.low, c.low) - ind.atr14 * 0.5, tp: ind.bbMiddle }
    }
    return null
  },

  // Pattern 6: Bollinger Upper Band Rejection
  'BB_UPPER_REJECT': (i) => {
    if (i < 2) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i], pc = candles[i-1]
    if (pc.high >= prevInd.bbUpper && c.close < c.open && ind.rsi14 > 60) {
      return { direction: 'SHORT', sl: Math.max(pc.high, c.high) + ind.atr14 * 0.5, tp: ind.bbMiddle }
    }
    return null
  },

  // Pattern 7: EMA9/21 Golden Cross (with trend filter)
  'GOLDEN_CROSS': (i) => {
    if (i < 2) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i]
    if (prevInd.ema9 < prevInd.ema21 && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
      return { direction: 'LONG', sl: c.close - ind.atr14 * 2, tp: c.close + ind.atr14 * 3 }
    }
    return null
  },

  // Pattern 8: EMA9/21 Death Cross (with trend filter)
  'DEATH_CROSS': (i) => {
    if (i < 2) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i]
    if (prevInd.ema9 > prevInd.ema21 && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
      return { direction: 'SHORT', sl: c.close + ind.atr14 * 2, tp: c.close - ind.atr14 * 3 }
    }
    return null
  },

  // Pattern 9: Inside Day Breakout Long
  'INSIDE_DAY_BREAKOUT_LONG': (i) => {
    if (i < 3) return null
    const ind = indicators[i], c = candles[i], pc = candles[i-1], ppc = candles[i-2]
    const wasInside = pc.high < ppc.high && pc.low > ppc.low
    if (wasInside && c.close > ppc.high && c.close > c.open && ind.ema21 > ind.ema50) {
      return { direction: 'LONG', sl: pc.low - ind.atr14 * 0.3, tp: c.close + (c.close - pc.low) * 1.5 }
    }
    return null
  },

  // Pattern 10: Inside Day Breakout Short
  'INSIDE_DAY_BREAKOUT_SHORT': (i) => {
    if (i < 3) return null
    const ind = indicators[i], c = candles[i], pc = candles[i-1], ppc = candles[i-2]
    const wasInside = pc.high < ppc.high && pc.low > ppc.low
    if (wasInside && c.close < ppc.low && c.close < c.open && ind.ema21 < ind.ema50) {
      return { direction: 'SHORT', sl: pc.high + ind.atr14 * 0.3, tp: c.close - (pc.high - c.close) * 1.5 }
    }
    return null
  }
}

// Run backtest for each pattern
console.log('PATTERN PERFORMANCE (5 Years, Max 10 Day Hold):\n')
console.log('Pattern                      | Trades | Wins | W.Rate | PF    | Total $  | Avg $')
console.log('-'.repeat(90))

const results = []

for (const [name, detector] of Object.entries(patterns)) {
  const trades = []
  let position = null

  // Start from index 50 to ensure indicators are ready
  for (let i = 50; i < candles.length; i++) {
    const c = candles[i]

    // Check exit
    if (position) {
      const holdDays = i - position.entryIdx
      let exit = null

      if (position.direction === 'LONG') {
        if (c.low <= position.sl) exit = { price: position.sl, reason: 'SL' }
        else if (c.high >= position.tp) exit = { price: position.tp, reason: 'TP' }
        else if (holdDays >= 10) exit = { price: c.close, reason: 'TIME' }
      } else {
        if (c.high >= position.sl) exit = { price: position.sl, reason: 'SL' }
        else if (c.low <= position.tp) exit = { price: position.tp, reason: 'TP' }
        else if (holdDays >= 10) exit = { price: c.close, reason: 'TIME' }
      }

      if (exit) {
        const pnl = position.direction === 'LONG'
          ? exit.price - position.entry
          : position.entry - exit.price
        trades.push({ pnl, direction: position.direction, reason: exit.reason })
        position = null
      }
    }

    // Check entry
    if (!position) {
      const signal = detector(i)
      if (signal) {
        position = {
          direction: signal.direction,
          entry: candles[i].close,
          sl: signal.sl,
          tp: signal.tp,
          entryIdx: i
        }
      }
    }
  }

  // Calculate stats
  const wins = trades.filter(t => t.pnl > 0).length
  const losses = trades.filter(t => t.pnl <= 0).length
  const winRate = trades.length > 0 ? (wins / trades.length * 100) : 0
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0)
  const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0)

  results.push({ name, trades: trades.length, wins, winRate, pf, totalPnL, avgPnL })

  console.log(
    `${name.padEnd(28)} | ${String(trades.length).padStart(6)} | ${String(wins).padStart(4)} | ${winRate.toFixed(1).padStart(5)}% | ${pf.toFixed(2).padStart(5)} | ${totalPnL.toFixed(2).padStart(8)} | ${avgPnL.toFixed(2).padStart(6)}`
  )
}

// Sort by profit factor
results.sort((a, b) => b.pf - a.pf)

console.log('\n========================================')
console.log('TOP PATTERNS BY PROFIT FACTOR:')
console.log('========================================\n')

const profitable = results.filter(r => r.pf > 1 && r.trades >= 10)
profitable.forEach((r, i) => {
  console.log(`${i+1}. ${r.name}`)
  console.log(`   Trades: ${r.trades} | Win Rate: ${r.winRate.toFixed(1)}% | PF: ${r.pf.toFixed(2)} | Total: $${r.totalPnL.toFixed(2)}\n`)
})

// Show best patterns for integration with STUNTMAN OG
console.log('\n========================================')
console.log('RECOMMENDED FOR STUNTMAN OG INTEGRATION:')
console.log('========================================\n')

const bestLongs = results.filter(r => r.name.includes('LONG') || r.name.includes('BOUNCE') || r.name.includes('GOLDEN')).filter(r => r.pf > 1)
const bestShorts = results.filter(r => r.name.includes('SHORT') || r.name.includes('REJECT') || r.name.includes('DEATH')).filter(r => r.pf > 1)

console.log('LONG BIAS CONFIRMATION:')
bestLongs.forEach(r => console.log(`  ✅ ${r.name} - ${r.winRate.toFixed(1)}% win rate, PF ${r.pf.toFixed(2)}`))

console.log('\nSHORT BIAS CONFIRMATION:')
bestShorts.forEach(r => console.log(`  ✅ ${r.name} - ${r.winRate.toFixed(1)}% win rate, PF ${r.pf.toFixed(2)}`))

console.log('\n========================================')
console.log('INTEGRATION STRATEGY:')
console.log('========================================')
console.log(`
When DAILY BIAS shows BULLISH (based on these patterns):
  → STUNTMAN OG only takes LONG trades

When DAILY BIAS shows BEARISH (based on these patterns):
  → STUNTMAN OG only takes SHORT trades

When DAILY BIAS shows NEUTRAL:
  → STUNTMAN OG skips trading that day
`)
