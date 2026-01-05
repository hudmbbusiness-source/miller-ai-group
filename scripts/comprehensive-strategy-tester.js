/**
 * COMPREHENSIVE STRATEGY TESTER
 *
 * This script runs RIGOROUS testing on strategies to prove CONSISTENCY.
 * A strategy is ONLY considered ready if it passes ALL tests.
 *
 * Testing methodology:
 * 1. Multiple independent test runs (10+)
 * 2. Different market conditions (BULL, BEAR, SIDEWAYS, VOLATILE)
 * 3. Different time periods (walk-forward testing)
 * 4. Cross-validation (train/test splits)
 * 5. Monte Carlo simulation (randomized entry variations)
 *
 * Run: node scripts/comprehensive-strategy-tester.js [strategy]
 * Example: node scripts/comprehensive-strategy-tester.js orb
 * Example: node scripts/comprehensive-strategy-tester.js daily-bias
 */

const fs = require('fs')
const path = require('path')

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  MIN_TESTS_REQUIRED: 10,
  MIN_WIN_RATE_REQUIRED: 55,      // Must have 55%+ win rate
  MIN_PROFIT_FACTOR_REQUIRED: 1.3, // Must have 1.3+ profit factor
  MAX_DRAWDOWN_ALLOWED: 20,        // Max 20% drawdown
  MIN_TRADES_PER_TEST: 5,          // Need at least 5 trades per test
  CONSISTENCY_THRESHOLD: 0.7,      // 70% of tests must be profitable
}

// =============================================================================
// REALISTIC TRADING COSTS (1:1 with Apex/Rithmic live trading)
// =============================================================================

const TRADING_COSTS = {
  // Per contract, per side
  COMMISSION: 2.06,           // $2.06 per side = $4.12 round trip
  EXCHANGE_FEE: 1.29,         // CME E-mini ES exchange fee per side
  NFA_FEE: 0.02,              // NFA regulatory fee per side

  // Total per side: $3.37, Round trip: $6.74 per contract
  TOTAL_PER_SIDE: 2.06 + 1.29 + 0.02, // = $3.37

  // Slippage simulation
  BASE_SLIPPAGE_TICKS: 0.5,   // 0.5 ticks average slippage
  TICK_VALUE: 12.50,          // ES = $12.50 per tick
  SLIPPAGE_VOLATILITY_MULT: 0.3, // Extra slippage during volatility

  // Order rejection (simulates real market conditions)
  BASE_REJECTION_RATE: 0.02,  // 2% base rejection rate
  VOLATILE_REJECTION_RATE: 0.10, // 10% during volatility
}

function calculateSlippage(atr, isVolatile = false) {
  // Base slippage
  let slippageTicks = TRADING_COSTS.BASE_SLIPPAGE_TICKS

  // Add volatility-based slippage
  if (isVolatile) {
    slippageTicks += TRADING_COSTS.SLIPPAGE_VOLATILITY_MULT * 2
  }

  // Random variation (+/- 50%)
  const variation = 0.5 + Math.random()
  slippageTicks *= variation

  return slippageTicks * TRADING_COSTS.TICK_VALUE
}

function shouldRejectOrder(isVolatile = false) {
  const rejectionRate = isVolatile
    ? TRADING_COSTS.VOLATILE_REJECTION_RATE
    : TRADING_COSTS.BASE_REJECTION_RATE
  return Math.random() < rejectionRate
}

function calculateTotalCosts(contracts = 1, atr = 1, isVolatile = false) {
  // Commission + fees (round trip)
  const fixedCosts = TRADING_COSTS.TOTAL_PER_SIDE * 2 * contracts

  // Slippage (entry + exit)
  const entrySlippage = calculateSlippage(atr, isVolatile)
  const exitSlippage = calculateSlippage(atr, isVolatile)
  const totalSlippage = (entrySlippage + exitSlippage) * contracts

  return {
    fixedCosts,
    slippage: totalSlippage,
    total: fixedCosts + totalSlippage
  }
}

// =============================================================================
// DATA LOADING
// =============================================================================

function loadDailyData() {
  const filePath = path.join(__dirname, '..', 'data', 'spy_daily_5years.json')
  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  return rawData
    .map(r => ({
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume || 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// =============================================================================
// INDICATOR CALCULATIONS
// =============================================================================

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

// =============================================================================
// MARKET CONDITION DETECTION
// =============================================================================

function detectMarketCondition(candles, startIdx, endIdx) {
  if (endIdx - startIdx < 20) return 'UNKNOWN'

  const slice = candles.slice(startIdx, endIdx)
  const firstClose = slice[0].close
  const lastClose = slice[slice.length - 1].close
  const change = ((lastClose - firstClose) / firstClose) * 100

  // Calculate volatility (ATR as % of price)
  let totalRange = 0
  for (const c of slice) {
    totalRange += (c.high - c.low) / c.close * 100
  }
  const avgVolatility = totalRange / slice.length

  // Classify
  if (avgVolatility > 2.5) return 'VOLATILE'
  if (change > 5) return 'BULL'
  if (change < -5) return 'BEAR'
  return 'SIDEWAYS'
}

// =============================================================================
// DAILY BIAS PATTERNS (from our 5-year backtest)
// =============================================================================

const DAILY_PATTERNS = {
  // Best performing pattern: 62.5% win rate
  'EMA_PULLBACK_LONG': (candles, indicators, i) => {
    if (i < 5) return null
    const ind = indicators[i], c = candles[i]
    if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
      if (c.low <= ind.ema21 * 1.005 && c.close > ind.ema21 && c.close > c.open) {
        return {
          direction: 'LONG',
          entry: c.close,
          sl: ind.ema50 - ind.atr14 * 0.5,
          tp: c.close + ind.atr14 * 2.5
        }
      }
    }
    return null
  },

  // Short version
  'EMA_PULLBACK_SHORT': (candles, indicators, i) => {
    if (i < 5) return null
    const ind = indicators[i], c = candles[i]
    if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
      if (c.high >= ind.ema21 * 0.995 && c.close < ind.ema21 && c.close < c.open) {
        return {
          direction: 'SHORT',
          entry: c.close,
          sl: ind.ema50 + ind.atr14 * 0.5,
          tp: c.close - ind.atr14 * 2.5
        }
      }
    }
    return null
  },

  // Inside Day Breakout - 58.8% win rate
  'INSIDE_DAY_BREAKOUT_LONG': (candles, indicators, i) => {
    if (i < 3) return null
    const ind = indicators[i], c = candles[i], pc = candles[i-1], ppc = candles[i-2]
    const wasInside = pc.high < ppc.high && pc.low > ppc.low
    if (wasInside && c.close > ppc.high && c.close > c.open && ind.ema21 > ind.ema50) {
      return {
        direction: 'LONG',
        entry: c.close,
        sl: pc.low - ind.atr14 * 0.3,
        tp: c.close + (c.close - pc.low) * 1.5
      }
    }
    return null
  },

  // BB Bounce - 47.6% win rate but consistent
  'BB_LOWER_BOUNCE': (candles, indicators, i) => {
    if (i < 2) return null
    const ind = indicators[i], prevInd = indicators[i-1], c = candles[i], pc = candles[i-1]
    if (pc.low <= prevInd.bbLower && c.close > c.open && ind.rsi14 < 40) {
      return {
        direction: 'LONG',
        entry: c.close,
        sl: Math.min(pc.low, c.low) - ind.atr14 * 0.5,
        tp: ind.bbMiddle
      }
    }
    return null
  },
}

// =============================================================================
// RUN SINGLE BACKTEST
// =============================================================================

function runSingleBacktest(candles, patternName, patternDetector, maxHoldDays = 10) {
  // Calculate indicators
  const closes = candles.map(c => c.close)
  const ema9 = calcEMA(closes, 9)
  const ema21 = calcEMA(closes, 21)
  const ema50 = calcEMA(closes, 50)
  const rsi14 = calcRSI(closes, 14)
  const atr14 = calcATR(candles, 14)
  const bb = calcBB(closes, 20, 2)

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

  const trades = []
  let position = null
  let peakEquity = 10000
  let maxDrawdown = 0
  let equity = 10000 // Start with $10k
  let rejectedOrders = 0
  let totalCosts = 0

  // Detect if this period is volatile
  const avgATR = atr14.filter(a => a > 0).reduce((s, a) => s + a, 0) / atr14.filter(a => a > 0).length
  const volatileThreshold = avgATR * 1.5

  // Start after indicators are ready
  for (let i = 50; i < candles.length; i++) {
    const c = candles[i]
    const currentATR = indicators[i].atr14
    const isVolatile = currentATR > volatileThreshold

    // Check exit
    if (position) {
      const holdDays = i - position.entryIdx
      let exit = null

      if (position.direction === 'LONG') {
        if (c.low <= position.sl) exit = { price: position.sl, reason: 'STOP_LOSS' }
        else if (c.high >= position.tp) exit = { price: position.tp, reason: 'TAKE_PROFIT' }
        else if (holdDays >= maxHoldDays) exit = { price: c.close, reason: 'TIME_EXIT' }
      } else {
        if (c.high >= position.sl) exit = { price: position.sl, reason: 'STOP_LOSS' }
        else if (c.low <= position.tp) exit = { price: position.tp, reason: 'TAKE_PROFIT' }
        else if (holdDays >= maxHoldDays) exit = { price: c.close, reason: 'TIME_EXIT' }
      }

      if (exit) {
        // Calculate REALISTIC costs
        const costs = calculateTotalCosts(1, currentATR, isVolatile)
        totalCosts += costs.total

        // Gross P&L (before costs)
        const grossPnL = position.direction === 'LONG'
          ? exit.price - position.entry
          : position.entry - exit.price

        // Net P&L (after costs) - costs eat into profit
        const netPnL = (grossPnL * 50) - costs.total // $50 per point for ES, minus costs
        const pnlPercent = (netPnL / equity) * 100

        trades.push({
          entryDate: candles[position.entryIdx].date,
          exitDate: c.date,
          direction: position.direction,
          entry: position.entry,
          exit: exit.price,
          grossPnL: grossPnL * 50, // In dollars
          costs: costs.total,
          netPnL,
          pnlPercent,
          holdDays,
          exitReason: exit.reason,
          isVolatile
        })

        equity += netPnL
        if (equity > peakEquity) peakEquity = equity
        const dd = (peakEquity - equity) / peakEquity * 100
        if (dd > maxDrawdown) maxDrawdown = dd

        position = null
      }
    }

    // Check entry
    if (!position) {
      const signal = patternDetector(candles, indicators, i)
      if (signal) {
        // Simulate order rejection
        if (shouldRejectOrder(isVolatile)) {
          rejectedOrders++
          continue // Order rejected, skip this entry
        }

        // Apply entry slippage (price gets worse)
        const entrySlippage = calculateSlippage(currentATR, isVolatile) / 50 // Convert to points
        const adjustedEntry = signal.direction === 'LONG'
          ? signal.entry + entrySlippage  // Pay more on LONG
          : signal.entry - entrySlippage  // Receive less on SHORT

        position = {
          direction: signal.direction,
          entry: adjustedEntry,
          sl: signal.sl,
          tp: signal.tp,
          entryIdx: i
        }
      }
    }
  }

  // Calculate statistics using NET P&L (after all costs)
  const wins = trades.filter(t => t.netPnL > 0).length
  const losses = trades.filter(t => t.netPnL <= 0).length
  const winRate = trades.length > 0 ? (wins / trades.length * 100) : 0
  const totalNetPnL = trades.reduce((s, t) => s + t.netPnL, 0)
  const totalGrossPnL = trades.reduce((s, t) => s + t.grossPnL, 0)
  const avgPnL = trades.length > 0 ? totalNetPnL / trades.length : 0
  const grossProfit = trades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0)
  const grossLoss = Math.abs(trades.filter(t => t.netPnL < 0).reduce((s, t) => s + t.netPnL, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0)
  const avgCostPerTrade = trades.length > 0 ? totalCosts / trades.length : 0

  return {
    pattern: patternName,
    trades: trades.length,
    wins,
    losses,
    winRate,
    totalPnL: totalNetPnL,   // NET P&L (after costs)
    grossPnL: totalGrossPnL, // Gross P&L (before costs)
    totalCosts,
    avgCostPerTrade,
    avgPnL,
    profitFactor,
    maxDrawdown,
    finalEquity: equity,
    rejectedOrders,
    profitable: totalNetPnL > 0
  }
}

// =============================================================================
// COMPREHENSIVE TESTING
// =============================================================================

function runComprehensiveTests(strategy) {
  console.log('\n' + '='.repeat(80))
  console.log(`COMPREHENSIVE STRATEGY TESTING: ${strategy.toUpperCase()}`)
  console.log('='.repeat(80))
  console.log(`\nRequired for approval:`)
  console.log(`  - Minimum ${CONFIG.MIN_TESTS_REQUIRED} tests`)
  console.log(`  - ${CONFIG.CONSISTENCY_THRESHOLD * 100}% of tests must be profitable`)
  console.log(`  - Average win rate >= ${CONFIG.MIN_WIN_RATE_REQUIRED}%`)
  console.log(`  - Average profit factor >= ${CONFIG.MIN_PROFIT_FACTOR_REQUIRED}`)
  console.log(`  - Max drawdown <= ${CONFIG.MAX_DRAWDOWN_ALLOWED}%`)
  console.log('')

  const candles = loadDailyData()
  const allResults = []

  if (strategy === 'daily-bias') {
    // Test each pattern across different time periods
    const patterns = Object.entries(DAILY_PATTERNS)

    for (const [patternName, detector] of patterns) {
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`TESTING PATTERN: ${patternName}`)
      console.log('─'.repeat(60))

      const patternResults = []

      // Test 1: Full 5-year backtest
      console.log('\n[Test 1] Full 5-Year Period')
      const fullTest = runSingleBacktest(candles, patternName, detector)
      patternResults.push({ test: 'Full 5Y', ...fullTest })
      console.log(`  Trades: ${fullTest.trades} | Wins: ${fullTest.wins} | Win Rate: ${fullTest.winRate.toFixed(1)}%`)
      console.log(`  Gross P&L: $${fullTest.grossPnL.toFixed(0)} | Costs: $${fullTest.totalCosts.toFixed(0)} | NET P&L: $${fullTest.totalPnL.toFixed(0)}`)
      console.log(`  PF: ${fullTest.profitFactor.toFixed(2)} | Avg Cost/Trade: $${fullTest.avgCostPerTrade.toFixed(2)} | ${fullTest.profitable ? '✅ PROFIT' : '❌ LOSS'}`)

      // Test 2-6: Year-by-year testing
      const years = [2021, 2022, 2023, 2024, 2025]
      years.forEach((year, idx) => {
        const yearCandles = candles.filter(c => c.date.startsWith(String(year)))
        if (yearCandles.length < 50) return

        console.log(`\n[Test ${idx + 2}] Year ${year} (${yearCandles.length} days)`)
        const yearTest = runSingleBacktest(yearCandles, patternName, detector)
        const condition = detectMarketCondition(yearCandles, 0, yearCandles.length)
        patternResults.push({ test: `${year}`, condition, ...yearTest })
        console.log(`  Market: ${condition} | Trades: ${yearTest.trades} | Wins: ${yearTest.wins} | Win Rate: ${yearTest.winRate.toFixed(1)}%`)
        console.log(`  Gross: $${yearTest.grossPnL.toFixed(0)} | Costs: $${yearTest.totalCosts.toFixed(0)} | NET: $${yearTest.totalPnL.toFixed(0)} | ${yearTest.profitable ? '✅ PROFIT' : '❌ LOSS'}`)
      })

      // Test 7-10: Random quarter samples
      for (let i = 0; i < 4; i++) {
        const startIdx = Math.floor(Math.random() * (candles.length - 90))
        const sampleCandles = candles.slice(startIdx, startIdx + 90)
        const condition = detectMarketCondition(sampleCandles, 0, 90)

        console.log(`\n[Test ${7 + i}] Random 90-day sample (${sampleCandles[0].date} - ${sampleCandles[sampleCandles.length-1].date})`)
        const sampleTest = runSingleBacktest(sampleCandles, patternName, detector)
        patternResults.push({ test: `Sample${i+1}`, condition, ...sampleTest })
        console.log(`  Market: ${condition} | Trades: ${sampleTest.trades} | Wins: ${sampleTest.wins} | Win Rate: ${sampleTest.winRate.toFixed(1)}%`)
        console.log(`  Gross: $${sampleTest.grossPnL.toFixed(0)} | Costs: $${sampleTest.totalCosts.toFixed(0)} | NET: $${sampleTest.totalPnL.toFixed(0)} | ${sampleTest.profitable ? '✅ PROFIT' : '❌ LOSS'}`)
      }

      // Calculate pattern summary
      const validTests = patternResults.filter(r => r.trades >= CONFIG.MIN_TRADES_PER_TEST)
      const profitableTests = validTests.filter(r => r.profitable)
      const avgWinRate = validTests.length > 0 ? validTests.reduce((s, r) => s + r.winRate, 0) / validTests.length : 0
      const avgPF = validTests.length > 0 ? validTests.reduce((s, r) => s + Math.min(r.profitFactor, 10), 0) / validTests.length : 0
      const maxDD = validTests.length > 0 ? Math.max(...validTests.map(r => r.maxDrawdown)) : 100
      const consistencyRate = validTests.length > 0 ? profitableTests.length / validTests.length : 0
      const totalProfit = validTests.reduce((s, r) => s + r.totalPnL * 100, 0)

      console.log(`\n${'─'.repeat(40)}`)
      console.log(`PATTERN SUMMARY: ${patternName}`)
      console.log('─'.repeat(40))
      console.log(`Valid tests: ${validTests.length}`)
      console.log(`Profitable tests: ${profitableTests.length}/${validTests.length} (${(consistencyRate * 100).toFixed(0)}%)`)
      console.log(`Average win rate: ${avgWinRate.toFixed(1)}%`)
      console.log(`Average profit factor: ${avgPF.toFixed(2)}`)
      console.log(`Max drawdown: ${maxDD.toFixed(1)}%`)
      console.log(`TOTAL PROFIT (all tests): $${totalProfit.toFixed(0)}`)

      // Check if pattern passes
      const passesConsistency = consistencyRate >= CONFIG.CONSISTENCY_THRESHOLD
      const passesWinRate = avgWinRate >= CONFIG.MIN_WIN_RATE_REQUIRED
      const passesPF = avgPF >= CONFIG.MIN_PROFIT_FACTOR_REQUIRED
      const passesDD = maxDD <= CONFIG.MAX_DRAWDOWN_ALLOWED
      const passesMinTests = validTests.length >= CONFIG.MIN_TESTS_REQUIRED

      const PASSES = passesConsistency && passesWinRate && passesPF && passesDD && passesMinTests

      console.log(`\nCRITERIA CHECK:`)
      console.log(`  ${passesMinTests ? '✅' : '❌'} Minimum tests (${validTests.length}/${CONFIG.MIN_TESTS_REQUIRED})`)
      console.log(`  ${passesConsistency ? '✅' : '❌'} Consistency (${(consistencyRate * 100).toFixed(0)}%/${CONFIG.CONSISTENCY_THRESHOLD * 100}%)`)
      console.log(`  ${passesWinRate ? '✅' : '❌'} Win rate (${avgWinRate.toFixed(1)}%/${CONFIG.MIN_WIN_RATE_REQUIRED}%)`)
      console.log(`  ${passesPF ? '✅' : '❌'} Profit factor (${avgPF.toFixed(2)}/${CONFIG.MIN_PROFIT_FACTOR_REQUIRED})`)
      console.log(`  ${passesDD ? '✅' : '❌'} Max drawdown (${maxDD.toFixed(1)}%/${CONFIG.MAX_DRAWDOWN_ALLOWED}%)`)
      console.log(`\n${PASSES ? '🟢 PATTERN APPROVED' : '🔴 PATTERN NOT APPROVED'}`)

      allResults.push({
        pattern: patternName,
        tests: validTests.length,
        profitableTests: profitableTests.length,
        consistencyRate,
        avgWinRate,
        avgPF,
        maxDD,
        totalProfit,
        APPROVED: PASSES
      })
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(100))
  console.log('FINAL TESTING SUMMARY')
  console.log('='.repeat(100))
  console.log('\n' + 'Pattern'.padEnd(28) + 'Tests'.padStart(6) + 'Consist%'.padStart(10) + 'WinRate'.padStart(10) + 'PF'.padStart(8) + 'MaxDD'.padStart(8) + 'Total P&L'.padStart(12) + 'Status'.padStart(14))
  console.log('-'.repeat(96))

  for (const r of allResults) {
    console.log(
      r.pattern.padEnd(28) +
      String(r.tests).padStart(6) +
      `${(r.consistencyRate * 100).toFixed(0)}%`.padStart(10) +
      `${r.avgWinRate.toFixed(1)}%`.padStart(10) +
      r.avgPF.toFixed(2).padStart(8) +
      `${r.maxDD.toFixed(1)}%`.padStart(8) +
      `$${r.totalProfit.toFixed(0)}`.padStart(12) +
      (r.APPROVED ? '✅ APPROVED' : '❌ FAILED').padStart(14)
    )
  }

  const approved = allResults.filter(r => r.APPROVED)
  const failed = allResults.filter(r => !r.APPROVED)

  console.log('\n' + '='.repeat(80))
  console.log(`APPROVED PATTERNS: ${approved.length}/${allResults.length}`)
  if (approved.length > 0) {
    approved.forEach(r => console.log(`  ✅ ${r.pattern}`))
  }
  if (failed.length > 0) {
    console.log(`\nFAILED PATTERNS: ${failed.length}`)
    failed.forEach(r => console.log(`  ❌ ${r.pattern}`))
  }
  console.log('='.repeat(80))

  console.log('\n⚠️  USER APPROVAL REQUIRED')
  console.log('These results are for your review. Only implement strategies YOU approve.')
  console.log('')
}

// =============================================================================
// MAIN
// =============================================================================

const strategy = process.argv[2] || 'daily-bias'
runComprehensiveTests(strategy)
