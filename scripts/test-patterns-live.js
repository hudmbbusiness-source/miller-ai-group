/**
 * TEST DAILY BIAS PATTERNS WITH LIVE MARKET DATA
 *
 * Fetches current SPY data and tests all 12 approved patterns
 * to determine today's trading bias
 *
 * Run: node scripts/test-patterns-live.js
 */

const https = require('https')

// Fetch live data from Yahoo Finance
async function fetchLiveData() {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=60d`

    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const result = json.chart.result[0]
          const timestamps = result.timestamp
          const quotes = result.indicators.quote[0]

          const candles = timestamps.map((t, i) => ({
            date: new Date(t * 1000).toISOString().split('T')[0],
            open: quotes.open[i] * 10,  // Scale to ES
            high: quotes.high[i] * 10,
            low: quotes.low[i] * 10,
            close: quotes.close[i] * 10,
            volume: quotes.volume[i],
            dayOfWeek: new Date(t * 1000).getDay(),
          })).filter(c => c.open && c.close)

          resolve(candles)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

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

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('LIVE MARKET TEST - DAILY BIAS PATTERNS')
  console.log('='.repeat(70))
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('='.repeat(70) + '\n')

  // Fetch data
  console.log('Fetching live market data from Yahoo Finance...')
  const candles = await fetchLiveData()

  const latest = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  const prev2 = candles[candles.length - 3]

  console.log(`\nLatest candle: ${latest.date}`)
  console.log(`  Open: $${latest.open.toFixed(2)} | High: $${latest.high.toFixed(2)}`)
  console.log(`  Low: $${latest.low.toFixed(2)} | Close: $${latest.close.toFixed(2)}`)
  console.log(`  Day: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][latest.dayOfWeek]}`)

  // Calculate indicators
  const closes = candles.map(c => c.close)
  const ema9 = calcEMA(closes, 9)
  const ema20 = calcEMA(closes, 20)
  const ema50 = calcEMA(closes, 50)
  const ema200 = calcEMA(closes, 200)
  const rsi = calcRSI(closes, 14)
  const atr = calcATR(candles, 14)

  const i = candles.length - 1
  const d = {
    ...latest,
    ema9: ema9[i],
    ema20: ema20[i],
    ema50: ema50[i],
    ema200: ema200[i],
    rsi: rsi[i],
    atr: atr[i],
    bullish: latest.close > latest.open,
    bearish: latest.close < latest.open,
    uptrend: ema20[i] > ema50[i],
    downtrend: ema20[i] < ema50[i],
    strongUptrend: ema9[i] > ema20[i] && ema20[i] > ema50[i],
    strongDowntrend: ema9[i] < ema20[i] && ema20[i] < ema50[i],
  }

  const pd = {
    ...prev,
    ema9: ema9[i-1],
    ema20: ema20[i-1],
    ema50: ema50[i-1],
    rsi: rsi[i-1],
    bullish: prev.close > prev.open,
    bearish: prev.close < prev.open,
    uptrend: ema20[i-1] > ema50[i-1],
    downtrend: ema20[i-1] < ema50[i-1],
  }

  const ppd = prev2 ? {
    ...prev2,
    high: prev2.high,
    low: prev2.low,
  } : null

  console.log('\n' + '-'.repeat(50))
  console.log('CURRENT MARKET CONDITIONS')
  console.log('-'.repeat(50))
  console.log(`  Price: $${d.close.toFixed(2)}`)
  console.log(`  EMA9: $${d.ema9?.toFixed(2) || 'N/A'} | EMA20: $${d.ema20?.toFixed(2) || 'N/A'} | EMA50: $${d.ema50?.toFixed(2) || 'N/A'}`)
  console.log(`  EMA200: $${d.ema200?.toFixed(2) || 'N/A (need more data)'}`)
  console.log(`  RSI: ${d.rsi?.toFixed(1) || 'N/A'}`)
  console.log(`  ATR: ${d.atr?.toFixed(2) || 'N/A'} points`)
  console.log(`  Trend: ${d.strongUptrend ? 'STRONG UPTREND ↑↑' : d.uptrend ? 'UPTREND ↑' : d.strongDowntrend ? 'STRONG DOWNTREND ↓↓' : d.downtrend ? 'DOWNTREND ↓' : 'SIDEWAYS →'}`)
  console.log(`  Today's candle: ${d.bullish ? '🟢 BULLISH' : '🔴 BEARISH'}`)

  // Gap calculation
  const gap = ((latest.open - prev.close) / prev.close * 100)
  console.log(`  Gap: ${gap > 0 ? '+' : ''}${gap.toFixed(2)}%`)

  // Test all 12 approved patterns
  console.log('\n' + '='.repeat(70))
  console.log('TESTING 12 APPROVED PATTERNS')
  console.log('='.repeat(70))

  const signals = []

  // 1. GAP_DOWN_1pct_hold1 (SHORT)
  if (gap < -1 && d.bearish && d.downtrend) {
    signals.push({ name: 'GAP_DOWN_1pct', dir: 'SHORT', pf: 3.89, wr: 61.1, reason: `Gap down ${gap.toFixed(2)}%` })
  }

  // 2. PULLBACK_EMA50_UP_tol0.5_hold3 (LONG)
  if (d.uptrend && d.low <= d.ema50 * 1.005 && d.close > d.ema50 && d.bullish) {
    signals.push({ name: 'PULLBACK_EMA50_UP', dir: 'LONG', pf: 3.16, wr: 66.7, reason: 'Pullback to EMA50 in uptrend' })
  }

  // 3. EMA_9_20_CROSS_UP_hold5 (LONG)
  if (pd.ema9 < pd.ema20 && d.ema9 > d.ema20) {
    signals.push({ name: 'EMA_9_20_CROSS_UP', dir: 'LONG', pf: 2.56, wr: 76.5, reason: 'EMA9 crossed above EMA20' })
  }

  // 4. EMA_9_20_CROSS_UP_hold10 (LONG) - same trigger
  // Skip duplicate

  // 5. PULLBACK_EMA50_UP_tol0.5_hold5 (LONG) - same as #2
  // Skip duplicate

  // 6. EMA200_BOUNCE_DOWN_tol0.5_hold7 (SHORT)
  if (d.close < d.ema200 && d.high >= d.ema200 * 0.995 && d.bearish) {
    signals.push({ name: 'EMA200_BOUNCE_DOWN', dir: 'SHORT', pf: 1.63, wr: 57.9, reason: 'Rejected from EMA200 resistance' })
  }

  // 7. EMA_9_20_CROSS_UP_hold7 (LONG) - same as #3
  // Skip duplicate

  // 8. EMA200_BOUNCE_DOWN_tol1_hold7 (SHORT) - same as #6
  // Skip duplicate

  // 9. Thu_BULLISH_hold3 (LONG)
  if (d.dayOfWeek === 4 && d.bullish && d.uptrend) {
    signals.push({ name: 'Thu_BULLISH', dir: 'LONG', pf: 1.41, wr: 58.1, reason: 'Thursday bullish in uptrend' })
  }

  // 10. GAP_UP_0.5pct_hold5 (LONG)
  if (gap > 0.5 && d.bullish && d.uptrend) {
    signals.push({ name: 'GAP_UP_0.5pct', dir: 'LONG', pf: 1.39, wr: 63.6, reason: `Gap up ${gap.toFixed(2)}%` })
  }

  // 11. TREND_ALL_UP_hold10 (LONG)
  if (d.close > d.ema9 && d.close > d.ema20 && d.close > d.ema50 && d.bullish) {
    signals.push({ name: 'TREND_ALL_UP', dir: 'LONG', pf: 1.38, wr: 61.8, reason: 'Price above all EMAs, bullish' })
  }

  // 12. Mon_BULLISH_hold3 (LONG)
  if (d.dayOfWeek === 1 && d.bullish && d.uptrend) {
    signals.push({ name: 'Mon_BULLISH', dir: 'LONG', pf: 1.31, wr: 58.0, reason: 'Monday bullish in uptrend' })
  }

  // Additional patterns from backtests
  // STRONG_TREND_CONT_UP
  if (d.strongUptrend && d.rsi > 50 && d.rsi < 70 && d.bullish) {
    signals.push({ name: 'STRONG_TREND_CONT_UP', dir: 'LONG', pf: 1.28, wr: 60.3, reason: 'Strong uptrend continuation' })
  }

  // PULLBACK_EMA20_UP
  if (d.uptrend && d.low <= d.ema20 * 1.005 && d.close > d.ema20 && d.bullish) {
    signals.push({ name: 'PULLBACK_EMA20_UP', dir: 'LONG', pf: 1.45, wr: 57.7, reason: 'Pullback to EMA20 in uptrend' })
  }

  // RSI_OVERBOUGHT (SHORT)
  if (pd.rsi > 70 && d.rsi < pd.rsi && d.bearish) {
    signals.push({ name: 'RSI_OVERBOUGHT_70', dir: 'SHORT', pf: 1.42, wr: 52.6, reason: 'RSI turning down from overbought' })
  }

  // EMA_9_20_CROSS_DOWN (SHORT)
  if (pd.ema9 > pd.ema20 && d.ema9 < d.ema20) {
    signals.push({ name: 'EMA_9_20_CROSS_DOWN', dir: 'SHORT', pf: 1.28, wr: 52.9, reason: 'EMA9 crossed below EMA20' })
  }

  // Inside bar detection
  if (ppd) {
    const wasInside = prev.high < ppd.high && prev.low > ppd.low
    if (wasInside && d.close > ppd.high && d.bullish && d.uptrend) {
      signals.push({ name: 'INSIDE_BREAKOUT_UP', dir: 'LONG', pf: 1.25, wr: 55.0, reason: 'Inside bar breakout up' })
    }
    if (wasInside && d.close < ppd.low && d.bearish && d.downtrend) {
      signals.push({ name: 'INSIDE_BREAKOUT_DOWN', dir: 'SHORT', pf: 1.25, wr: 55.0, reason: 'Inside bar breakout down' })
    }
  }

  // Display signals
  if (signals.length === 0) {
    console.log('\n❌ NO PATTERNS TRIGGERED TODAY')
    console.log('\nMarket conditions do not match any approved pattern.')
  } else {
    console.log(`\n✅ ${signals.length} PATTERN(S) TRIGGERED:\n`)

    // Sort by profit factor
    signals.sort((a, b) => b.pf - a.pf)

    for (const s of signals) {
      const emoji = s.dir === 'LONG' ? '🟢' : '🔴'
      console.log(`${emoji} ${s.name}`)
      console.log(`   Direction: ${s.dir} | Win Rate: ${s.wr}% | PF: ${s.pf}`)
      console.log(`   Reason: ${s.reason}\n`)
    }

    // Calculate consensus
    const longCount = signals.filter(s => s.dir === 'LONG').length
    const shortCount = signals.filter(s => s.dir === 'SHORT').length
    const avgLongPF = signals.filter(s => s.dir === 'LONG').reduce((sum, s) => sum + s.pf, 0) / (longCount || 1)
    const avgShortPF = signals.filter(s => s.dir === 'SHORT').reduce((sum, s) => sum + s.pf, 0) / (shortCount || 1)

    console.log('='.repeat(70))
    console.log('DAILY BIAS CONSENSUS')
    console.log('='.repeat(70))
    console.log(`LONG signals: ${longCount} (avg PF: ${avgLongPF.toFixed(2)})`)
    console.log(`SHORT signals: ${shortCount} (avg PF: ${avgShortPF.toFixed(2)})`)

    let bias, confidence
    if (longCount > shortCount) {
      bias = 'LONG'
      confidence = longCount / signals.length * 100
    } else if (shortCount > longCount) {
      bias = 'SHORT'
      confidence = shortCount / signals.length * 100
    } else {
      bias = 'NEUTRAL'
      confidence = 50
    }

    console.log('\n' + '='.repeat(70))
    if (bias === 'LONG') {
      console.log(`🟢🟢🟢 TODAY'S BIAS: LONG 🟢🟢🟢`)
    } else if (bias === 'SHORT') {
      console.log(`🔴🔴🔴 TODAY'S BIAS: SHORT 🔴🔴🔴`)
    } else {
      console.log(`⚪⚪⚪ TODAY'S BIAS: NEUTRAL ⚪⚪⚪`)
    }
    console.log(`Confidence: ${confidence.toFixed(0)}%`)
    console.log('='.repeat(70))
  }

  // Tomorrow prediction (based on day of week)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDOW = tomorrow.getDay()
  const tomorrowName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][tomorrowDOW]

  console.log(`\n📅 Tomorrow is ${tomorrowName}day`)
  if (tomorrowDOW === 1 && d.uptrend) {
    console.log('   → Mon_BULLISH pattern may trigger if market opens bullish')
  }
  if (tomorrowDOW === 4 && d.uptrend) {
    console.log('   → Thu_BULLISH pattern may trigger if market opens bullish')
  }
  if (d.strongUptrend) {
    console.log('   → STRONG_TREND_CONT_UP likely if RSI stays 50-70')
  }
  if (d.uptrend && d.close > d.ema50) {
    console.log('   → Watch for PULLBACK_EMA50_UP if price dips to EMA50')
  }
}

main().catch(console.error)
