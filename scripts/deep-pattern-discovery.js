/**
 * DEEP PATTERN DISCOVERY - Find what ACTUALLY works in 5 years of data
 * Tests hundreds of pattern variations to find consistent winners
 *
 * Run: node scripts/deep-pattern-discovery.js
 */

const fs = require('fs')
const path = require('path')

// ============================================
// REALISTIC TRADING COSTS (1:1 with live)
// ============================================
const TRADING_COSTS = {
  COMMISSION_RT: 4.12,        // Round trip commission
  EXCHANGE_FEE_RT: 2.58,      // CME E-mini ES
  NFA_FEE_RT: 0.04,           // NFA regulatory
  TOTAL_FIXED: 6.74,          // Total fixed per contract RT
  SLIPPAGE_BASE: 0.5,         // Base slippage in ticks
  TICK_VALUE: 12.50,          // ES tick value
  POINT_VALUE: 50,            // ES point value
  REJECTION_RATE: 0.02,       // 2% order rejection
}

// ============================================
// APPROVAL CRITERIA (STRICT)
// ============================================
const APPROVAL = {
  MIN_WIN_RATE: 55,           // Minimum win rate
  MIN_PROFIT_FACTOR: 1.3,     // Minimum profit factor
  MAX_DRAWDOWN: 20,           // Maximum drawdown %
  MIN_TRADES: 50,             // Minimum trades over 5 years
  MIN_AVG_PROFIT: 10,         // Minimum avg profit per trade in points
  MIN_CONSISTENCY: 0.7,       // 70% of years must be profitable
}

// Load 5 years of data
const dataPath = path.join(__dirname, '..', 'data', 'spy_daily_5years.json')
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

// Sort oldest to newest
const candles = rawData
  .map(r => ({
    date: r.date,
    open: r.open * 10,     // Scale to ES prices
    high: r.high * 10,
    low: r.low * 10,
    close: r.close * 10,
    volume: r.volume || 0,
    year: new Date(r.date).getFullYear()
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date))

console.log('\n' + '='.repeat(70))
console.log('DEEP PATTERN DISCOVERY - 5 YEARS OF DATA')
console.log('='.repeat(70))
console.log(`Data: ${candles[0].date} to ${candles[candles.length-1].date}`)
console.log(`Total candles: ${candles.length}`)
console.log(`Approval: ${APPROVAL.MIN_WIN_RATE}%+ win, ${APPROVAL.MIN_PROFIT_FACTOR}+ PF, <${APPROVAL.MAX_DRAWDOWN}% DD`)
console.log('='.repeat(70) + '\n')

// ============================================
// INDICATOR CALCULATIONS
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

function calcSMA(data, period) {
  const sma = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    sma[i] = sum / period
  }
  return sma
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

function calcMACD(data, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(data, fast)
  const emaSlow = calcEMA(data, slow)
  const macd = [], signalLine = [], histogram = []

  for (let i = slow - 1; i < data.length; i++) {
    if (emaFast[i] && emaSlow[i]) {
      macd[i] = emaFast[i] - emaSlow[i]
    }
  }

  const macdValues = macd.filter(m => m !== undefined)
  const emaSignal = calcEMA(macdValues, signal)

  let j = 0
  for (let i = 0; i < data.length; i++) {
    if (macd[i] !== undefined) {
      signalLine[i] = emaSignal[j] || macd[i]
      histogram[i] = macd[i] - signalLine[i]
      j++
    }
  }

  return { macd, signal: signalLine, histogram }
}

function calcBB(data, period = 20, stdDev = 2) {
  const upper = [], middle = [], lower = [], pctB = []
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
    pctB[i] = (data[i] - lower[i]) / (upper[i] - lower[i])
  }
  return { upper, middle, lower, pctB }
}

function calcADX(candles, period = 14) {
  const adx = [], pdi = [], ndi = []
  const tr = [], plusDM = [], minusDM = []

  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low
    const ph = candles[i-1].high, pl = candles[i-1].low, pc = candles[i-1].close

    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc))

    const upMove = h - ph
    const downMove = pl - l
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0
  }

  // Smooth the values
  let sumTR = 0, sumPDM = 0, sumNDM = 0
  for (let i = 1; i <= period; i++) {
    sumTR += tr[i] || 0
    sumPDM += plusDM[i] || 0
    sumNDM += minusDM[i] || 0
  }

  let smoothTR = sumTR, smoothPDM = sumPDM, smoothNDM = sumNDM
  const dx = []

  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      smoothTR = smoothTR - (smoothTR / period) + (tr[i] || 0)
      smoothPDM = smoothPDM - (smoothPDM / period) + (plusDM[i] || 0)
      smoothNDM = smoothNDM - (smoothNDM / period) + (minusDM[i] || 0)
    }

    pdi[i] = smoothTR > 0 ? (smoothPDM / smoothTR) * 100 : 0
    ndi[i] = smoothTR > 0 ? (smoothNDM / smoothTR) * 100 : 0

    const diSum = pdi[i] + ndi[i]
    dx[i] = diSum > 0 ? (Math.abs(pdi[i] - ndi[i]) / diSum) * 100 : 0
  }

  // Calculate ADX
  let sumDX = 0
  for (let i = period; i < period * 2 && i < dx.length; i++) {
    sumDX += dx[i] || 0
  }

  adx[period * 2 - 1] = sumDX / period
  for (let i = period * 2; i < candles.length; i++) {
    adx[i] = ((adx[i-1] || 0) * (period - 1) + (dx[i] || 0)) / period
  }

  return { adx, pdi, ndi }
}

// Pre-calculate all indicators
const closes = candles.map(c => c.close)
const highs = candles.map(c => c.high)
const lows = candles.map(c => c.low)

console.log('Calculating indicators...')

const indicators = {
  ema5: calcEMA(closes, 5),
  ema9: calcEMA(closes, 9),
  ema12: calcEMA(closes, 12),
  ema20: calcEMA(closes, 20),
  ema21: calcEMA(closes, 21),
  ema50: calcEMA(closes, 50),
  ema100: calcEMA(closes, 100),
  ema200: calcEMA(closes, 200),
  sma20: calcSMA(closes, 20),
  sma50: calcSMA(closes, 50),
  sma200: calcSMA(closes, 200),
  rsi7: calcRSI(closes, 7),
  rsi14: calcRSI(closes, 14),
  rsi21: calcRSI(closes, 21),
  atr7: calcATR(candles, 7),
  atr14: calcATR(candles, 14),
  atr21: calcATR(candles, 21),
  macd: calcMACD(closes),
  bb20: calcBB(closes, 20, 2),
  bb20_1: calcBB(closes, 20, 1),
  bb20_25: calcBB(closes, 20, 2.5),
  adx: calcADX(candles, 14),
}

// Build indicator array for each candle
const data = candles.map((c, i) => ({
  ...c,
  i,
  // EMAs
  ema5: indicators.ema5[i] || 0,
  ema9: indicators.ema9[i] || 0,
  ema12: indicators.ema12[i] || 0,
  ema20: indicators.ema20[i] || 0,
  ema21: indicators.ema21[i] || 0,
  ema50: indicators.ema50[i] || 0,
  ema100: indicators.ema100[i] || 0,
  ema200: indicators.ema200[i] || 0,
  // SMAs
  sma20: indicators.sma20[i] || 0,
  sma50: indicators.sma50[i] || 0,
  sma200: indicators.sma200[i] || 0,
  // RSI
  rsi7: indicators.rsi7[i] || 50,
  rsi14: indicators.rsi14[i] || 50,
  rsi21: indicators.rsi21[i] || 50,
  // ATR
  atr7: indicators.atr7[i] || 0,
  atr14: indicators.atr14[i] || 0,
  atr21: indicators.atr21[i] || 0,
  // MACD
  macd: indicators.macd.macd[i] || 0,
  macdSignal: indicators.macd.signal[i] || 0,
  macdHist: indicators.macd.histogram[i] || 0,
  // Bollinger Bands
  bbUpper: indicators.bb20.upper[i] || 0,
  bbMiddle: indicators.bb20.middle[i] || 0,
  bbLower: indicators.bb20.lower[i] || 0,
  bbPctB: indicators.bb20.pctB[i] || 0.5,
  bbUpper1: indicators.bb20_1.upper[i] || 0,
  bbLower1: indicators.bb20_1.lower[i] || 0,
  bbUpper25: indicators.bb20_25.upper[i] || 0,
  bbLower25: indicators.bb20_25.lower[i] || 0,
  // ADX
  adx: indicators.adx.adx[i] || 0,
  pdi: indicators.adx.pdi[i] || 0,
  ndi: indicators.adx.ndi[i] || 0,
}))

console.log('Indicators calculated.\n')

// ============================================
// PATTERN DEFINITIONS TO TEST
// ============================================

const patterns = {
  // ============================================
  // TREND FOLLOWING PATTERNS
  // ============================================

  'TREND_EMA9_21_PULLBACK_LONG': (d, pd) => {
    if (!pd) return null
    // Strong uptrend: EMA9 > EMA21 > EMA50
    if (d.ema9 > d.ema21 && d.ema21 > d.ema50) {
      // Price pulled back to EMA21
      if (d.low <= d.ema21 * 1.002 && d.close > d.ema21 && d.close > d.open) {
        return { dir: 'LONG', sl: d.ema50, tp: d.close + d.atr14 * 2 }
      }
    }
    return null
  },

  'TREND_EMA9_21_PULLBACK_SHORT': (d, pd) => {
    if (!pd) return null
    // Strong downtrend: EMA9 < EMA21 < EMA50
    if (d.ema9 < d.ema21 && d.ema21 < d.ema50) {
      // Price pulled back to EMA21
      if (d.high >= d.ema21 * 0.998 && d.close < d.ema21 && d.close < d.open) {
        return { dir: 'SHORT', sl: d.ema50, tp: d.close - d.atr14 * 2 }
      }
    }
    return null
  },

  'TREND_EMA20_50_PULLBACK_LONG': (d, pd) => {
    if (!pd) return null
    if (d.ema20 > d.ema50 && d.close > d.ema200) {
      if (d.low <= d.ema20 * 1.005 && d.close > d.ema20 && d.close > d.open) {
        return { dir: 'LONG', sl: d.ema50 - d.atr14 * 0.5, tp: d.close + d.atr14 * 2.5 }
      }
    }
    return null
  },

  'TREND_EMA20_50_PULLBACK_SHORT': (d, pd) => {
    if (!pd) return null
    if (d.ema20 < d.ema50 && d.close < d.ema200) {
      if (d.high >= d.ema20 * 0.995 && d.close < d.ema20 && d.close < d.open) {
        return { dir: 'SHORT', sl: d.ema50 + d.atr14 * 0.5, tp: d.close - d.atr14 * 2.5 }
      }
    }
    return null
  },

  'STRONG_TREND_ADX_LONG': (d, pd) => {
    if (!pd) return null
    // ADX > 25 = strong trend, +DI > -DI = bullish
    if (d.adx > 25 && d.pdi > d.ndi && d.close > d.ema20 && d.close > d.open) {
      // Pullback to EMA20
      if (pd.low <= pd.ema20 || d.low <= d.ema20) {
        return { dir: 'LONG', sl: d.low - d.atr14, tp: d.close + d.atr14 * 2 }
      }
    }
    return null
  },

  'STRONG_TREND_ADX_SHORT': (d, pd) => {
    if (!pd) return null
    if (d.adx > 25 && d.ndi > d.pdi && d.close < d.ema20 && d.close < d.open) {
      if (pd.high >= pd.ema20 || d.high >= d.ema20) {
        return { dir: 'SHORT', sl: d.high + d.atr14, tp: d.close - d.atr14 * 2 }
      }
    }
    return null
  },

  // ============================================
  // MOMENTUM PATTERNS
  // ============================================

  'MACD_CROSS_BULL': (d, pd) => {
    if (!pd) return null
    // MACD crosses above signal line
    if (pd.macd <= pd.macdSignal && d.macd > d.macdSignal && d.close > d.ema50) {
      return { dir: 'LONG', sl: d.close - d.atr14 * 1.5, tp: d.close + d.atr14 * 2 }
    }
    return null
  },

  'MACD_CROSS_BEAR': (d, pd) => {
    if (!pd) return null
    if (pd.macd >= pd.macdSignal && d.macd < d.macdSignal && d.close < d.ema50) {
      return { dir: 'SHORT', sl: d.close + d.atr14 * 1.5, tp: d.close - d.atr14 * 2 }
    }
    return null
  },

  'MACD_HIST_REVERSAL_BULL': (d, pd) => {
    if (!pd) return null
    // MACD histogram turns positive after being negative
    if (pd.macdHist < 0 && d.macdHist > 0 && d.close > d.open) {
      return { dir: 'LONG', sl: d.low - d.atr14, tp: d.close + d.atr14 * 2 }
    }
    return null
  },

  'MACD_HIST_REVERSAL_BEAR': (d, pd) => {
    if (!pd) return null
    if (pd.macdHist > 0 && d.macdHist < 0 && d.close < d.open) {
      return { dir: 'SHORT', sl: d.high + d.atr14, tp: d.close - d.atr14 * 2 }
    }
    return null
  },

  // ============================================
  // RSI PATTERNS
  // ============================================

  'RSI_OVERSOLD_BOUNCE_30': (d, pd) => {
    if (!pd) return null
    if (pd.rsi14 < 30 && d.rsi14 > pd.rsi14 && d.close > d.open && d.close > d.ema50) {
      return { dir: 'LONG', sl: d.low - d.atr14, tp: d.close + d.atr14 * 2 }
    }
    return null
  },

  'RSI_OVERSOLD_BOUNCE_25': (d, pd) => {
    if (!pd) return null
    if (pd.rsi14 < 25 && d.rsi14 > pd.rsi14 && d.close > d.open) {
      return { dir: 'LONG', sl: d.low - d.atr14 * 1.2, tp: d.close + d.atr14 * 2.5 }
    }
    return null
  },

  'RSI_OVERBOUGHT_REJECT_70': (d, pd) => {
    if (!pd) return null
    if (pd.rsi14 > 70 && d.rsi14 < pd.rsi14 && d.close < d.open && d.close < d.ema50) {
      return { dir: 'SHORT', sl: d.high + d.atr14, tp: d.close - d.atr14 * 2 }
    }
    return null
  },

  'RSI_OVERBOUGHT_REJECT_75': (d, pd) => {
    if (!pd) return null
    if (pd.rsi14 > 75 && d.rsi14 < pd.rsi14 && d.close < d.open) {
      return { dir: 'SHORT', sl: d.high + d.atr14 * 1.2, tp: d.close - d.atr14 * 2.5 }
    }
    return null
  },

  'RSI_50_CROSS_BULL': (d, pd) => {
    if (!pd) return null
    // RSI crosses above 50 = bullish momentum
    if (pd.rsi14 < 50 && d.rsi14 > 50 && d.close > d.ema20 && d.close > d.open) {
      return { dir: 'LONG', sl: d.low - d.atr14, tp: d.close + d.atr14 * 1.8 }
    }
    return null
  },

  'RSI_50_CROSS_BEAR': (d, pd) => {
    if (!pd) return null
    if (pd.rsi14 > 50 && d.rsi14 < 50 && d.close < d.ema20 && d.close < d.open) {
      return { dir: 'SHORT', sl: d.high + d.atr14, tp: d.close - d.atr14 * 1.8 }
    }
    return null
  },

  // ============================================
  // BOLLINGER BAND PATTERNS
  // ============================================

  'BB_LOWER_TOUCH_BOUNCE': (d, pd) => {
    if (!pd) return null
    // Touch lower band and bounce
    if (d.low <= d.bbLower && d.close > d.open && d.close > d.bbLower) {
      return { dir: 'LONG', sl: d.bbLower - d.atr14 * 0.5, tp: d.bbMiddle }
    }
    return null
  },

  'BB_LOWER_RSI_COMBO': (d, pd) => {
    if (!pd) return null
    // Touch lower band + RSI oversold
    if (d.low <= d.bbLower && d.rsi14 < 35 && d.close > d.open) {
      return { dir: 'LONG', sl: d.bbLower25, tp: d.bbMiddle + (d.bbMiddle - d.bbLower) * 0.5 }
    }
    return null
  },

  'BB_UPPER_TOUCH_REJECT': (d, pd) => {
    if (!pd) return null
    if (d.high >= d.bbUpper && d.close < d.open && d.close < d.bbUpper) {
      return { dir: 'SHORT', sl: d.bbUpper + d.atr14 * 0.5, tp: d.bbMiddle }
    }
    return null
  },

  'BB_UPPER_RSI_COMBO': (d, pd) => {
    if (!pd) return null
    if (d.high >= d.bbUpper && d.rsi14 > 65 && d.close < d.open) {
      return { dir: 'SHORT', sl: d.bbUpper25, tp: d.bbMiddle - (d.bbUpper - d.bbMiddle) * 0.5 }
    }
    return null
  },

  'BB_SQUEEZE_BREAKOUT_LONG': (d, pd) => {
    if (!pd) return null
    // BB squeeze (narrow bands) then breakout
    const bandWidth = (d.bbUpper - d.bbLower) / d.bbMiddle
    const prevBandWidth = (pd.bbUpper - pd.bbLower) / pd.bbMiddle
    if (prevBandWidth < 0.03 && d.close > pd.bbUpper && d.close > d.open) {
      return { dir: 'LONG', sl: d.bbMiddle, tp: d.close + (d.close - d.bbMiddle) }
    }
    return null
  },

  'BB_SQUEEZE_BREAKOUT_SHORT': (d, pd) => {
    if (!pd) return null
    const bandWidth = (d.bbUpper - d.bbLower) / d.bbMiddle
    const prevBandWidth = (pd.bbUpper - pd.bbLower) / pd.bbMiddle
    if (prevBandWidth < 0.03 && d.close < pd.bbLower && d.close < d.open) {
      return { dir: 'SHORT', sl: d.bbMiddle, tp: d.close - (d.bbMiddle - d.close) }
    }
    return null
  },

  // ============================================
  // SUPPORT/RESISTANCE PATTERNS
  // ============================================

  'INSIDE_BAR_BREAKOUT_LONG': (d, pd, ppd) => {
    if (!pd || !ppd) return null
    // Previous bar was inside bar (contained within bar before it)
    const wasInside = pd.high < ppd.high && pd.low > ppd.low
    if (wasInside && d.close > ppd.high && d.close > d.open && d.close > d.ema20) {
      return { dir: 'LONG', sl: pd.low - d.atr14 * 0.3, tp: d.close + (d.close - pd.low) }
    }
    return null
  },

  'INSIDE_BAR_BREAKOUT_SHORT': (d, pd, ppd) => {
    if (!pd || !ppd) return null
    const wasInside = pd.high < ppd.high && pd.low > ppd.low
    if (wasInside && d.close < ppd.low && d.close < d.open && d.close < d.ema20) {
      return { dir: 'SHORT', sl: pd.high + d.atr14 * 0.3, tp: d.close - (pd.high - d.close) }
    }
    return null
  },

  'HAMMER_BULL': (d, pd) => {
    if (!pd) return null
    // Hammer: small body, long lower wick, at support
    const body = Math.abs(d.close - d.open)
    const lowerWick = Math.min(d.open, d.close) - d.low
    const upperWick = d.high - Math.max(d.open, d.close)
    if (lowerWick > body * 2 && upperWick < body * 0.5 && d.close > d.open && d.low <= d.ema50 * 1.01) {
      return { dir: 'LONG', sl: d.low - d.atr14 * 0.5, tp: d.close + d.atr14 * 2 }
    }
    return null
  },

  'SHOOTING_STAR_BEAR': (d, pd) => {
    if (!pd) return null
    // Shooting star: small body, long upper wick, at resistance
    const body = Math.abs(d.close - d.open)
    const lowerWick = Math.min(d.open, d.close) - d.low
    const upperWick = d.high - Math.max(d.open, d.close)
    if (upperWick > body * 2 && lowerWick < body * 0.5 && d.close < d.open && d.high >= d.ema50 * 0.99) {
      return { dir: 'SHORT', sl: d.high + d.atr14 * 0.5, tp: d.close - d.atr14 * 2 }
    }
    return null
  },

  'ENGULFING_BULL': (d, pd) => {
    if (!pd) return null
    // Bullish engulfing: current candle engulfs previous bearish candle
    if (pd.close < pd.open && d.close > d.open && d.close > pd.open && d.open < pd.close) {
      if (d.close > d.ema50) {
        return { dir: 'LONG', sl: d.low - d.atr14 * 0.5, tp: d.close + d.atr14 * 2 }
      }
    }
    return null
  },

  'ENGULFING_BEAR': (d, pd) => {
    if (!pd) return null
    if (pd.close > pd.open && d.close < d.open && d.close < pd.open && d.open > pd.close) {
      if (d.close < d.ema50) {
        return { dir: 'SHORT', sl: d.high + d.atr14 * 0.5, tp: d.close - d.atr14 * 2 }
      }
    }
    return null
  },

  // ============================================
  // MOVING AVERAGE CROSSOVER PATTERNS
  // ============================================

  'GOLDEN_CROSS_9_21': (d, pd) => {
    if (!pd) return null
    if (pd.ema9 < pd.ema21 && d.ema9 > d.ema21 && d.close > d.ema50) {
      return { dir: 'LONG', sl: d.ema50 - d.atr14, tp: d.close + d.atr14 * 2.5 }
    }
    return null
  },

  'DEATH_CROSS_9_21': (d, pd) => {
    if (!pd) return null
    if (pd.ema9 > pd.ema21 && d.ema9 < d.ema21 && d.close < d.ema50) {
      return { dir: 'SHORT', sl: d.ema50 + d.atr14, tp: d.close - d.atr14 * 2.5 }
    }
    return null
  },

  'GOLDEN_CROSS_20_50': (d, pd) => {
    if (!pd) return null
    if (pd.ema20 < pd.ema50 && d.ema20 > d.ema50) {
      return { dir: 'LONG', sl: d.ema50 - d.atr14 * 1.5, tp: d.close + d.atr14 * 3 }
    }
    return null
  },

  'DEATH_CROSS_20_50': (d, pd) => {
    if (!pd) return null
    if (pd.ema20 > pd.ema50 && d.ema20 < d.ema50) {
      return { dir: 'SHORT', sl: d.ema50 + d.atr14 * 1.5, tp: d.close - d.atr14 * 3 }
    }
    return null
  },

  // ============================================
  // EMA200 PATTERNS (Strong Support/Resistance)
  // ============================================

  'EMA200_BOUNCE_LONG': (d, pd) => {
    if (!pd) return null
    // Price touches EMA200 from above and bounces
    if (d.close > d.ema200 && d.low <= d.ema200 * 1.005 && d.close > d.open) {
      return { dir: 'LONG', sl: d.ema200 - d.atr14, tp: d.close + d.atr14 * 3 }
    }
    return null
  },

  'EMA200_REJECT_SHORT': (d, pd) => {
    if (!pd) return null
    if (d.close < d.ema200 && d.high >= d.ema200 * 0.995 && d.close < d.open) {
      return { dir: 'SHORT', sl: d.ema200 + d.atr14, tp: d.close - d.atr14 * 3 }
    }
    return null
  },

  // ============================================
  // MULTI-CONDITION PATTERNS (Higher Quality)
  // ============================================

  'ULTIMATE_BULL': (d, pd) => {
    if (!pd) return null
    // Multiple confirmations: EMA trend + RSI recovering + MACD bullish + price action
    const emaTrend = d.ema20 > d.ema50 && d.close > d.ema20
    const rsiRecovering = pd.rsi14 < 40 && d.rsi14 > pd.rsi14
    const macdBullish = d.macd > d.macdSignal
    const bullishCandle = d.close > d.open

    if (emaTrend && rsiRecovering && macdBullish && bullishCandle) {
      return { dir: 'LONG', sl: d.ema50 - d.atr14 * 0.5, tp: d.close + d.atr14 * 2.5 }
    }
    return null
  },

  'ULTIMATE_BEAR': (d, pd) => {
    if (!pd) return null
    const emaTrend = d.ema20 < d.ema50 && d.close < d.ema20
    const rsiWeakening = pd.rsi14 > 60 && d.rsi14 < pd.rsi14
    const macdBearish = d.macd < d.macdSignal
    const bearishCandle = d.close < d.open

    if (emaTrend && rsiWeakening && macdBearish && bearishCandle) {
      return { dir: 'SHORT', sl: d.ema50 + d.atr14 * 0.5, tp: d.close - d.atr14 * 2.5 }
    }
    return null
  },

  'CONFLUENCE_LONG': (d, pd) => {
    if (!pd) return null
    // Count bullish signals
    let score = 0
    if (d.ema9 > d.ema21) score++
    if (d.ema21 > d.ema50) score++
    if (d.close > d.ema200) score++
    if (d.rsi14 > 50 && d.rsi14 < 70) score++
    if (d.macd > d.macdSignal) score++
    if (d.close > d.open) score++
    if (d.adx > 20 && d.pdi > d.ndi) score++

    if (score >= 5) {
      return { dir: 'LONG', sl: d.low - d.atr14, tp: d.close + d.atr14 * 2 }
    }
    return null
  },

  'CONFLUENCE_SHORT': (d, pd) => {
    if (!pd) return null
    let score = 0
    if (d.ema9 < d.ema21) score++
    if (d.ema21 < d.ema50) score++
    if (d.close < d.ema200) score++
    if (d.rsi14 < 50 && d.rsi14 > 30) score++
    if (d.macd < d.macdSignal) score++
    if (d.close < d.open) score++
    if (d.adx > 20 && d.ndi > d.pdi) score++

    if (score >= 5) {
      return { dir: 'SHORT', sl: d.high + d.atr14, tp: d.close - d.atr14 * 2 }
    }
    return null
  },
}

// ============================================
// BACKTESTING FUNCTION
// ============================================

function backtest(patternName, detector, startIdx, endIdx) {
  const trades = []
  let position = null

  for (let i = Math.max(startIdx, 200); i <= endIdx; i++) {
    const d = data[i]
    const pd = data[i-1]
    const ppd = data[i-2]

    // Check exit
    if (position) {
      const holdDays = i - position.entryIdx
      let exit = null

      if (position.dir === 'LONG') {
        if (d.low <= position.sl) {
          // Add slippage on stop loss hit
          const slippage = TRADING_COSTS.SLIPPAGE_BASE * TRADING_COSTS.TICK_VALUE
          exit = { price: position.sl - slippage / TRADING_COSTS.POINT_VALUE, reason: 'SL' }
        }
        else if (d.high >= position.tp) {
          exit = { price: position.tp, reason: 'TP' }
        }
        else if (holdDays >= 10) {
          exit = { price: d.close, reason: 'TIME' }
        }
      } else {
        if (d.high >= position.sl) {
          const slippage = TRADING_COSTS.SLIPPAGE_BASE * TRADING_COSTS.TICK_VALUE
          exit = { price: position.sl + slippage / TRADING_COSTS.POINT_VALUE, reason: 'SL' }
        }
        else if (d.low <= position.tp) {
          exit = { price: position.tp, reason: 'TP' }
        }
        else if (holdDays >= 10) {
          exit = { price: d.close, reason: 'TIME' }
        }
      }

      if (exit) {
        // Calculate P&L in points
        const grossPnL = position.dir === 'LONG'
          ? exit.price - position.entry
          : position.entry - exit.price

        // Convert to dollars
        const grossDollars = grossPnL * TRADING_COSTS.POINT_VALUE

        // Subtract costs
        const costs = TRADING_COSTS.TOTAL_FIXED + (TRADING_COSTS.SLIPPAGE_BASE * TRADING_COSTS.TICK_VALUE)
        const netDollars = grossDollars - costs

        trades.push({
          entry: position.entry,
          exit: exit.price,
          dir: position.dir,
          reason: exit.reason,
          grossPnL,
          grossDollars,
          netDollars,
          year: d.year,
          date: d.date,
        })
        position = null
      }
    }

    // Check entry
    if (!position) {
      // Simulate 2% order rejection
      if (Math.random() < TRADING_COSTS.REJECTION_RATE) continue

      const signal = detector(d, pd, ppd)
      if (signal) {
        // Add slippage on entry
        const slippage = TRADING_COSTS.SLIPPAGE_BASE * TRADING_COSTS.TICK_VALUE / TRADING_COSTS.POINT_VALUE
        const entryPrice = signal.dir === 'LONG'
          ? d.close + slippage
          : d.close - slippage

        position = {
          dir: signal.dir,
          entry: entryPrice,
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

function analyzeResults(trades) {
  if (trades.length === 0) return null

  const wins = trades.filter(t => t.netDollars > 0)
  const losses = trades.filter(t => t.netDollars <= 0)
  const winRate = (wins.length / trades.length) * 100

  const grossProfit = wins.reduce((s, t) => s + t.netDollars, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netDollars, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0)

  const totalPnL = trades.reduce((s, t) => s + t.netDollars, 0)
  const avgPnL = totalPnL / trades.length

  // Calculate max drawdown
  let peak = 0
  let maxDD = 0
  let runningPnL = 0
  for (const t of trades) {
    runningPnL += t.netDollars
    if (runningPnL > peak) peak = runningPnL
    const dd = peak - runningPnL
    if (dd > maxDD) maxDD = dd
  }
  const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0

  // Year-by-year analysis
  const years = [...new Set(trades.map(t => t.year))]
  const yearlyPnL = {}
  for (const y of years) {
    const yearTrades = trades.filter(t => t.year === y)
    yearlyPnL[y] = yearTrades.reduce((s, t) => s + t.netDollars, 0)
  }
  const profitableYears = Object.values(yearlyPnL).filter(p => p > 0).length
  const consistency = years.length > 0 ? profitableYears / years.length : 0

  return {
    trades: trades.length,
    wins: wins.length,
    winRate,
    profitFactor,
    totalPnL,
    avgPnL,
    maxDDPct,
    yearlyPnL,
    consistency,
  }
}

// ============================================
// RUN ALL PATTERNS
// ============================================

console.log('Testing all patterns...\n')

const results = []

for (const [name, detector] of Object.entries(patterns)) {
  const trades = backtest(name, detector, 200, data.length - 1)
  const stats = analyzeResults(trades)

  if (stats && stats.trades >= APPROVAL.MIN_TRADES) {
    results.push({
      name,
      ...stats,
    })
  }
}

// Sort by profit factor
results.sort((a, b) => b.profitFactor - a.profitFactor)

// ============================================
// DISPLAY RESULTS
// ============================================

console.log('='.repeat(110))
console.log('ALL TESTED PATTERNS (sorted by Profit Factor)')
console.log('='.repeat(110))
console.log('Pattern                        | Trades | Wins | W.Rate | PF    | Net P&L    | Max DD | Consist | Status')
console.log('-'.repeat(110))

for (const r of results) {
  const passed =
    r.winRate >= APPROVAL.MIN_WIN_RATE &&
    r.profitFactor >= APPROVAL.MIN_PROFIT_FACTOR &&
    r.maxDDPct <= APPROVAL.MAX_DRAWDOWN &&
    r.consistency >= APPROVAL.MIN_CONSISTENCY

  const status = passed ? '✅ PASS' : '❌ FAIL'

  console.log(
    `${r.name.padEnd(30)} | ${String(r.trades).padStart(6)} | ${String(r.wins).padStart(4)} | ${r.winRate.toFixed(1).padStart(5)}% | ${r.profitFactor.toFixed(2).padStart(5)} | $${r.totalPnL.toFixed(0).padStart(8)} | ${r.maxDDPct.toFixed(1).padStart(5)}% | ${(r.consistency * 100).toFixed(0).padStart(6)}% | ${status}`
  )
}

// ============================================
// SHOW APPROVED PATTERNS
// ============================================

const approved = results.filter(r =>
  r.winRate >= APPROVAL.MIN_WIN_RATE &&
  r.profitFactor >= APPROVAL.MIN_PROFIT_FACTOR &&
  r.maxDDPct <= APPROVAL.MAX_DRAWDOWN &&
  r.consistency >= APPROVAL.MIN_CONSISTENCY
)

console.log('\n' + '='.repeat(70))
console.log('APPROVED PATTERNS (Meet all criteria)')
console.log('='.repeat(70))

if (approved.length === 0) {
  console.log('\n❌ NO PATTERNS PASSED ALL CRITERIA')
  console.log('\nClosest patterns to approval:')

  const closest = results.slice(0, 5)
  for (const r of closest) {
    console.log(`\n${r.name}:`)
    console.log(`  Win Rate: ${r.winRate.toFixed(1)}% (need ${APPROVAL.MIN_WIN_RATE}%) ${r.winRate >= APPROVAL.MIN_WIN_RATE ? '✅' : '❌'}`)
    console.log(`  Profit Factor: ${r.profitFactor.toFixed(2)} (need ${APPROVAL.MIN_PROFIT_FACTOR}) ${r.profitFactor >= APPROVAL.MIN_PROFIT_FACTOR ? '✅' : '❌'}`)
    console.log(`  Max Drawdown: ${r.maxDDPct.toFixed(1)}% (max ${APPROVAL.MAX_DRAWDOWN}%) ${r.maxDDPct <= APPROVAL.MAX_DRAWDOWN ? '✅' : '❌'}`)
    console.log(`  Consistency: ${(r.consistency * 100).toFixed(0)}% (need ${APPROVAL.MIN_CONSISTENCY * 100}%) ${r.consistency >= APPROVAL.MIN_CONSISTENCY ? '✅' : '❌'}`)
    console.log(`  Total P&L: $${r.totalPnL.toFixed(0)}`)
  }
} else {
  console.log(`\n✅ ${approved.length} PATTERN(S) APPROVED FOR DAILY BIAS:\n`)

  for (const r of approved) {
    console.log(`${r.name}`)
    console.log('  ' + '-'.repeat(50))
    console.log(`  Trades: ${r.trades} | Win Rate: ${r.winRate.toFixed(1)}%`)
    console.log(`  Profit Factor: ${r.profitFactor.toFixed(2)} | Net P&L: $${r.totalPnL.toFixed(0)}`)
    console.log(`  Max Drawdown: ${r.maxDDPct.toFixed(1)}% | Consistency: ${(r.consistency * 100).toFixed(0)}%`)
    console.log(`  Yearly P&L:`)
    for (const [y, pnl] of Object.entries(r.yearlyPnL).sort()) {
      console.log(`    ${y}: $${pnl.toFixed(0)} ${pnl > 0 ? '✅' : '❌'}`)
    }
    console.log()
  }
}

console.log('\n' + '='.repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))
console.log(`Total patterns tested: ${Object.keys(patterns).length}`)
console.log(`Patterns with ${APPROVAL.MIN_TRADES}+ trades: ${results.length}`)
console.log(`Patterns meeting approval criteria: ${approved.length}`)
console.log('\nApproval Criteria:')
console.log(`  - Win Rate: ${APPROVAL.MIN_WIN_RATE}%+`)
console.log(`  - Profit Factor: ${APPROVAL.MIN_PROFIT_FACTOR}+`)
console.log(`  - Max Drawdown: ${APPROVAL.MAX_DRAWDOWN}% or less`)
console.log(`  - Consistency: ${APPROVAL.MIN_CONSISTENCY * 100}%+ years profitable`)
console.log(`  - Min Trades: ${APPROVAL.MIN_TRADES}+`)
