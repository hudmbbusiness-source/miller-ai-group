/**
 * PROVEN DAILY BIAS PATTERNS
 *
 * These patterns were backtested on 5 YEARS of SPY/ES data
 * and PASSED all approval criteria:
 * - Win Rate: 55%+
 * - Profit Factor: 1.3+
 * - Consistency: 60%+ of years profitable
 *
 * DO NOT MODIFY WITHOUT RETESTING
 */

export interface ProvenPattern {
  name: string
  direction: 'LONG' | 'SHORT'
  winRate: number
  profitFactor: number
  consistency: number  // % of years profitable
  netPnL: number       // Total $ over 5 years
  trades: number       // Total trades in backtest
}

// 12 APPROVED PATTERNS FROM 5-YEAR BACKTEST
export const PROVEN_DAILY_BIAS_PATTERNS: ProvenPattern[] = [
  {
    name: 'GAP_DOWN_1pct',
    direction: 'SHORT',
    winRate: 61.1,
    profitFactor: 3.89,
    consistency: 100,
    netPnL: 28014,
    trades: 18,
  },
  {
    name: 'PULLBACK_EMA50_UP',
    direction: 'LONG',
    winRate: 66.7,
    profitFactor: 3.16,
    consistency: 60,
    netPnL: 62770,
    trades: 33,
  },
  {
    name: 'EMA_9_20_CROSS_UP',
    direction: 'LONG',
    winRate: 76.5,
    profitFactor: 2.56,
    consistency: 80,
    netPnL: 21988,
    trades: 17,
  },
  {
    name: 'EMA_9_20_CROSS_UP_hold10',
    direction: 'LONG',
    winRate: 58.8,
    profitFactor: 2.12,
    consistency: 60,
    netPnL: 37033,
    trades: 17,
  },
  {
    name: 'PULLBACK_EMA50_UP_hold5',
    direction: 'LONG',
    winRate: 65.5,
    profitFactor: 1.99,
    consistency: 60,
    netPnL: 40577,
    trades: 29,
  },
  {
    name: 'EMA200_BOUNCE_DOWN',
    direction: 'SHORT',
    winRate: 57.9,
    profitFactor: 1.63,
    consistency: 67,
    netPnL: 32874,
    trades: 19,
  },
  {
    name: 'EMA_9_20_CROSS_UP_hold7',
    direction: 'LONG',
    winRate: 64.7,
    profitFactor: 1.47,
    consistency: 60,
    netPnL: 17713,
    trades: 17,
  },
  {
    name: 'PULLBACK_EMA20_UP',
    direction: 'LONG',
    winRate: 57.7,
    profitFactor: 1.45,
    consistency: 60,
    netPnL: 50785,
    trades: 52,
  },
  {
    name: 'Thu_BULLISH',
    direction: 'LONG',
    winRate: 58.1,
    profitFactor: 1.41,
    consistency: 60,
    netPnL: 39180,
    trades: 86,
  },
  {
    name: 'GAP_UP_0.5pct',
    direction: 'LONG',
    winRate: 63.6,
    profitFactor: 1.39,
    consistency: 60,
    netPnL: 29178,
    trades: 44,
  },
  {
    name: 'TREND_ALL_UP',
    direction: 'LONG',
    winRate: 61.8,
    profitFactor: 1.38,
    consistency: 60,
    netPnL: 65133,
    trades: 76,
  },
  {
    name: 'Mon_BULLISH',
    direction: 'LONG',
    winRate: 58.0,
    profitFactor: 1.31,
    consistency: 80,
    netPnL: 28602,
    trades: 81,
  },
]

// STUNTMAN V1 PROVEN PATTERNS (from adaptive/route.ts testing)
export const PROVEN_STUNTMAN_V1_PATTERNS = {
  // These patterns achieved 60.3% win rate in 10+ consistent tests
  VWAP_PULLBACK_LONG: { winRate: 71.4, profitFactor: 1.65 },
  VWAP_PULLBACK_SHORT: { winRate: 57.1, profitFactor: 1.45 },
  ORB_BREAKOUT_SHORT: { winRate: 100, profitFactor: 3.0 },  // Small sample
  EMA20_BOUNCE_LONG: { winRate: 57.1, profitFactor: 1.35 },
}

// Combined system target metrics
export const TARGET_METRICS = {
  // Apex 150K Evaluation Requirements
  PROFIT_TARGET: 9000,      // $9,000 profit to pass
  MAX_DRAWDOWN: 6000,       // $6,000 trailing max drawdown
  MIN_TRADING_DAYS: 7,      // Minimum 7 trading days
  MAX_CONTRACTS: 17,        // Maximum 17 ES contracts

  // Our conservative targets
  DAILY_PROFIT_TARGET: 1500,   // ~$1,500/day for 7 days = $10,500
  MAX_DAILY_LOSS: 1000,        // Stop trading after $1,000 loss
  MAX_TRADES_PER_DAY: 4,       // Limit overtrading
}

// Export for use in live-adaptive
export function getDailyBiasDirection(patterns: string[]): 'LONG' | 'SHORT' | 'NEUTRAL' {
  let longScore = 0
  let shortScore = 0

  for (const patternName of patterns) {
    const pattern = PROVEN_DAILY_BIAS_PATTERNS.find(p => p.name === patternName)
    if (pattern) {
      const weight = pattern.profitFactor * (pattern.consistency / 100)
      if (pattern.direction === 'LONG') {
        longScore += weight
      } else {
        shortScore += weight
      }
    }
  }

  if (longScore > shortScore * 1.2) return 'LONG'
  if (shortScore > longScore * 1.2) return 'SHORT'
  return 'NEUTRAL'
}
