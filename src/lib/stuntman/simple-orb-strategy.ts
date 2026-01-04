/**
 * SIMPLE Opening Range Breakout (ORB) Strategy
 *
 * PROVEN RESULTS (from Trade That Swing backtests):
 * - 74.56% win rate
 * - 2.512 profit factor
 * - 114 trades tested
 *
 * RULES (mechanical, no discretion):
 * 1. Opening Range = High/Low of first 15 minutes (9:30-9:45 AM EST)
 * 2. LONG: 5-min candle CLOSES above OR high
 * 3. SHORT: 5-min candle CLOSES below OR low
 * 4. Stop Loss: Other side of opening range (capped at 6 points ES)
 * 5. Take Profit: 50% of opening range size
 * 6. ONE trade per day maximum
 * 7. No trades after 3:00 PM EST
 */

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OpeningRange {
  high: number
  low: number
  rangeSize: number
  formed: boolean
  formationTime: number
}

export interface ORBSignal {
  direction: 'LONG' | 'SHORT' | 'NONE'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  riskReward: number
  confidence: number
  reason: string
}

export interface DayState {
  date: string
  openingRange: OpeningRange | null
  tradeTakenToday: boolean
  tradeDirection: 'LONG' | 'SHORT' | null
  breakoutOccurred: boolean
}

// Configuration
const ORB_CONFIG = {
  // Timing (EST hours as decimals)
  orbStartHour: 9.5,          // 9:30 AM EST
  orbEndHour: 9.75,           // 9:45 AM EST (15 min range)
  tradingEndHour: 15.0,       // 3:00 PM EST - no new trades after

  // Risk Management
  maxStopPoints: 6,           // Max 6 points stop ($300 per contract)
  takeProfitRatio: 0.5,       // Take profit at 50% of OR size
  minRangePoints: 2,          // Min 2 point range (avoid tiny ranges)
  maxRangePoints: 20,         // Max 20 point range (avoid huge risk)

  // Filters
  onlyOneTrade: true,         // Only one trade per day
  requireCloseAbove: true,    // Must CLOSE above/below, not just wick
}

// Track state per day
let currentDayState: DayState = {
  date: '',
  openingRange: null,
  tradeTakenToday: false,
  tradeDirection: null,
  breakoutOccurred: false,
}

/**
 * Get EST hour from timestamp
 */
function getESTHour(timestamp: number): number {
  const date = new Date(timestamp)
  // Convert to EST (UTC-5)
  const utcHour = date.getUTCHours()
  const utcMinute = date.getUTCMinutes()
  let estHour = utcHour - 5 + (utcMinute / 60)
  if (estHour < 0) estHour += 24
  return estHour
}

/**
 * Get date string from timestamp (for day tracking)
 */
function getDateString(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
}

/**
 * Reset day state for new trading day
 */
export function resetDayState(): void {
  currentDayState = {
    date: '',
    openingRange: null,
    tradeTakenToday: false,
    tradeDirection: null,
    breakoutOccurred: false,
  }
}

/**
 * Calculate Opening Range from candles
 */
export function calculateOpeningRange(candles: Candle[]): OpeningRange | null {
  // Find candles in the 9:30-9:45 AM EST window
  const orbCandles = candles.filter(c => {
    const hour = getESTHour(c.time)
    return hour >= ORB_CONFIG.orbStartHour && hour < ORB_CONFIG.orbEndHour
  })

  if (orbCandles.length === 0) {
    return null
  }

  const high = Math.max(...orbCandles.map(c => c.high))
  const low = Math.min(...orbCandles.map(c => c.low))
  const rangeSize = high - low

  // Check if range is valid
  if (rangeSize < ORB_CONFIG.minRangePoints) {
    return null // Range too small
  }

  if (rangeSize > ORB_CONFIG.maxRangePoints) {
    return null // Range too large (too risky)
  }

  return {
    high,
    low,
    rangeSize,
    formed: true,
    formationTime: orbCandles[orbCandles.length - 1].time,
  }
}

/**
 * Generate ORB Signal - The core strategy
 */
export function generateORBSignal(
  candles: Candle[],
  currentCandle: Candle
): ORBSignal {
  const noSignal: ORBSignal = {
    direction: 'NONE',
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    riskReward: 0,
    confidence: 0,
    reason: '',
  }

  const currentDate = getDateString(currentCandle.time)
  const currentHour = getESTHour(currentCandle.time)

  // Check if new day - reset state
  if (currentDate !== currentDayState.date) {
    currentDayState = {
      date: currentDate,
      openingRange: null,
      tradeTakenToday: false,
      tradeDirection: null,
      breakoutOccurred: false,
    }
  }

  // Rule: No trades after 3:00 PM EST
  if (currentHour >= ORB_CONFIG.tradingEndHour) {
    return { ...noSignal, reason: 'After trading hours (3 PM EST)' }
  }

  // Rule: Only one trade per day
  if (ORB_CONFIG.onlyOneTrade && currentDayState.tradeTakenToday) {
    return { ...noSignal, reason: 'Trade already taken today' }
  }

  // Rule: Wait for opening range to form (after 9:45 AM)
  if (currentHour < ORB_CONFIG.orbEndHour) {
    return { ...noSignal, reason: 'Opening range still forming' }
  }

  // Calculate opening range if not done yet
  if (!currentDayState.openingRange) {
    currentDayState.openingRange = calculateOpeningRange(candles)
    if (!currentDayState.openingRange) {
      return { ...noSignal, reason: 'Invalid opening range (too small/large)' }
    }
  }

  const or = currentDayState.openingRange
  const price = currentCandle.close

  // LONG SIGNAL: Candle CLOSES above OR high
  if (price > or.high && !currentDayState.breakoutOccurred) {
    currentDayState.breakoutOccurred = true
    currentDayState.tradeTakenToday = true
    currentDayState.tradeDirection = 'LONG'

    const entryPrice = price
    const stopLoss = Math.max(or.low, entryPrice - ORB_CONFIG.maxStopPoints)
    const risk = entryPrice - stopLoss
    const takeProfit = entryPrice + (or.rangeSize * ORB_CONFIG.takeProfitRatio)
    const reward = takeProfit - entryPrice

    return {
      direction: 'LONG',
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward: reward / risk,
      confidence: 85, // High confidence - proven strategy
      reason: `ORB Breakout LONG: Close ${price.toFixed(2)} > OR High ${or.high.toFixed(2)}`,
    }
  }

  // SHORT SIGNAL: Candle CLOSES below OR low
  if (price < or.low && !currentDayState.breakoutOccurred) {
    currentDayState.breakoutOccurred = true
    currentDayState.tradeTakenToday = true
    currentDayState.tradeDirection = 'SHORT'

    const entryPrice = price
    const stopLoss = Math.min(or.high, entryPrice + ORB_CONFIG.maxStopPoints)
    const risk = stopLoss - entryPrice
    const takeProfit = entryPrice - (or.rangeSize * ORB_CONFIG.takeProfitRatio)
    const reward = entryPrice - takeProfit

    return {
      direction: 'SHORT',
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward: reward / risk,
      confidence: 85, // High confidence - proven strategy
      reason: `ORB Breakout SHORT: Close ${price.toFixed(2)} < OR Low ${or.low.toFixed(2)}`,
    }
  }

  // No breakout yet
  return { ...noSignal, reason: 'Waiting for breakout' }
}

/**
 * Get current day state (for debugging/display)
 */
export function getDayState(): DayState {
  return { ...currentDayState }
}

/**
 * Check if we should be trading right now
 */
export function isTradingWindow(timestamp: number): boolean {
  const hour = getESTHour(timestamp)
  return hour >= ORB_CONFIG.orbEndHour && hour < ORB_CONFIG.tradingEndHour
}

/**
 * Get opening range status
 */
export function getORBStatus(candles: Candle[], currentTime: number): {
  phase: 'PRE_MARKET' | 'FORMING' | 'READY' | 'CLOSED'
  openingRange: OpeningRange | null
  message: string
} {
  const hour = getESTHour(currentTime)

  if (hour < ORB_CONFIG.orbStartHour) {
    return { phase: 'PRE_MARKET', openingRange: null, message: 'Waiting for market open (9:30 AM EST)' }
  }

  if (hour < ORB_CONFIG.orbEndHour) {
    return { phase: 'FORMING', openingRange: null, message: 'Opening range forming (9:30-9:45 AM EST)' }
  }

  if (hour >= ORB_CONFIG.tradingEndHour) {
    return { phase: 'CLOSED', openingRange: currentDayState.openingRange, message: 'Trading day ended (after 3 PM EST)' }
  }

  const or = currentDayState.openingRange || calculateOpeningRange(candles)
  if (or) {
    return {
      phase: 'READY',
      openingRange: or,
      message: `OR: High ${or.high.toFixed(2)}, Low ${or.low.toFixed(2)}, Range ${or.rangeSize.toFixed(1)} pts`
    }
  }

  return { phase: 'READY', openingRange: null, message: 'Invalid opening range today' }
}
