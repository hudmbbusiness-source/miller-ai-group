// =============================================================================
// STUNTMAN AI TRADING SYSTEM - CONSTANTS
// =============================================================================

import type { FeeStructure, Timeframe, IndicatorConfig, RiskConfig } from './types'

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const CRYPTO_COM_API = {
  // REST API
  PUBLIC_API_URL: 'https://api.crypto.com/v2/public',
  EXCHANGE_API_URL: 'https://api.crypto.com/exchange/v1',

  // WebSocket
  WS_MARKET_URL: 'wss://stream.crypto.com/exchange/v1/market',
  WS_USER_URL: 'wss://stream.crypto.com/exchange/v1/user',

  // Rate limits
  RATE_LIMIT_PUBLIC: 100, // requests per second
  RATE_LIMIT_PRIVATE: 3, // requests per 100ms

  // Timeouts
  REQUEST_TIMEOUT: 10000, // 10 seconds
  WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  WS_RECONNECT_DELAY: 1000, // Initial 1 second, exponential backoff
  WS_MAX_RECONNECT_ATTEMPTS: 10,
} as const

// =============================================================================
// TRADING CONFIGURATION
// =============================================================================

export const TRADING_CONFIG = {
  // Paper trading
  DEFAULT_PAPER_BALANCE: 1000,
  MIN_PAPER_BALANCE: 100,
  MAX_PAPER_BALANCE: 1000000,

  // Order limits
  MIN_ORDER_VALUE: 1, // $1 minimum
  MAX_ORDER_VALUE: 100000, // $100k maximum per order
  MIN_QUANTITY_PRECISION: 8,
  MIN_PRICE_PRECISION: 8,

  // Position limits
  MAX_POSITIONS_PER_ACCOUNT: 20,
  MAX_LEVERAGE: 1, // No leverage for now (spot only)

  // Risk defaults
  DEFAULT_STOP_LOSS_PERCENT: 2,
  DEFAULT_TAKE_PROFIT_PERCENT: 4,
  DEFAULT_MAX_DAILY_LOSS: 100,
  DEFAULT_MAX_POSITION_SIZE: 500,

  // Slippage simulation for paper trading
  MARKET_ORDER_SLIPPAGE_MIN: 0.0001, // 0.01%
  MARKET_ORDER_SLIPPAGE_MAX: 0.0005, // 0.05%

  // Order fill simulation delays (ms)
  MARKET_ORDER_FILL_DELAY: 50,
  LIMIT_ORDER_CHECK_INTERVAL: 1000,
} as const

// =============================================================================
// FEE STRUCTURE
// =============================================================================

export const FEES: FeeStructure = {
  maker: 0.0004, // 0.04%
  taker: 0.0010, // 0.10%
  withdraw: {
    BTC: 0.0004,
    ETH: 0.005,
    USDT: 1,
    USDC: 1,
    SOL: 0.01,
    BNB: 0.001,
    XRP: 0.25,
    DOGE: 5,
    ADA: 1,
    AVAX: 0.01,
    DOT: 0.1,
    MATIC: 0.1,
    LINK: 0.3,
    LTC: 0.001,
    ATOM: 0.005,
    UNI: 0.5,
    NEAR: 0.01,
  },
}

// =============================================================================
// SUPPORTED INSTRUMENTS
// =============================================================================

export const INSTRUMENTS = {
  primary: ['BTC_USDT', 'ETH_USDT', 'SOL_USDT'],
  secondary: ['BNB_USDT', 'XRP_USDT', 'DOGE_USDT', 'ADA_USDT'],
  all: [
    'BTC_USDT',
    'ETH_USDT',
    'SOL_USDT',
    'BNB_USDT',
    'XRP_USDT',
    'DOGE_USDT',
    'ADA_USDT',
    'AVAX_USDT',
    'DOT_USDT',
    'MATIC_USDT',
    'LINK_USDT',
    'LTC_USDT',
    'ATOM_USDT',
    'UNI_USDT',
    'NEAR_USDT',
  ],
} as const

// Instrument precision (decimal places)
export const INSTRUMENT_PRECISION: Record<string, { price: number; quantity: number }> = {
  BTC_USDT: { price: 2, quantity: 6 },
  ETH_USDT: { price: 2, quantity: 5 },
  SOL_USDT: { price: 3, quantity: 3 },
  BNB_USDT: { price: 2, quantity: 4 },
  XRP_USDT: { price: 5, quantity: 1 },
  DOGE_USDT: { price: 6, quantity: 0 },
  ADA_USDT: { price: 5, quantity: 1 },
  AVAX_USDT: { price: 3, quantity: 3 },
  DOT_USDT: { price: 3, quantity: 2 },
  MATIC_USDT: { price: 5, quantity: 1 },
  LINK_USDT: { price: 3, quantity: 2 },
  LTC_USDT: { price: 2, quantity: 4 },
  ATOM_USDT: { price: 3, quantity: 2 },
  UNI_USDT: { price: 3, quantity: 2 },
  NEAR_USDT: { price: 4, quantity: 2 },
}

// =============================================================================
// TIMEFRAMES
// =============================================================================

export const TIMEFRAMES: Record<Timeframe, { label: string; ms: number; candlesPerDay: number }> = {
  '1m': { label: '1 Minute', ms: 60 * 1000, candlesPerDay: 1440 },
  '5m': { label: '5 Minutes', ms: 5 * 60 * 1000, candlesPerDay: 288 },
  '15m': { label: '15 Minutes', ms: 15 * 60 * 1000, candlesPerDay: 96 },
  '30m': { label: '30 Minutes', ms: 30 * 60 * 1000, candlesPerDay: 48 },
  '1h': { label: '1 Hour', ms: 60 * 60 * 1000, candlesPerDay: 24 },
  '4h': { label: '4 Hours', ms: 4 * 60 * 60 * 1000, candlesPerDay: 6 },
  '1d': { label: '1 Day', ms: 24 * 60 * 60 * 1000, candlesPerDay: 1 },
  '1w': { label: '1 Week', ms: 7 * 24 * 60 * 60 * 1000, candlesPerDay: 1 / 7 },
}

// =============================================================================
// DEFAULT INDICATOR CONFIGURATION
// =============================================================================

export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  rsi: {
    enabled: true,
    period: 14,
    overbought: 70,
    oversold: 30,
    divergence: true,
  },
  macd: {
    enabled: true,
    fast: 12,
    slow: 26,
    signal: 9,
    histogram: true,
  },
  ema: {
    enabled: true,
    periods: [9, 21, 50, 200],
    crossover: true,
  },
  sma: {
    enabled: false,
    periods: [20, 50, 200],
  },
  bollinger: {
    enabled: true,
    period: 20,
    stdDev: 2,
    squeeze: true,
  },
  atr: {
    enabled: true,
    period: 14,
    multiplier: 2,
  },
  volume: {
    enabled: true,
    maPeriod: 20,
    threshold: 1.5,
  },
  stochastic: {
    enabled: false,
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
    overbought: 80,
    oversold: 20,
  },
  adx: {
    enabled: true,
    period: 14,
    threshold: 25,
  },
  obv: {
    enabled: true,
  },
  vwap: {
    enabled: true,
  },
}

// =============================================================================
// DEFAULT RISK CONFIGURATION
// =============================================================================

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxPositionSize: 500,
  maxPositionPercent: 50,
  maxDailyLoss: 100,
  maxDailyLossPercent: 10,
  maxDrawdown: 20,
  maxOpenPositions: 5,
  maxCorrelatedPositions: 2,
  maxDailyTrades: 50,
  cooldownAfterLoss: 30,
  positionSizing: 'percent',
  kellyFraction: 0.25,
  volatilityTarget: 0.02,
}

// =============================================================================
// PATTERN RECOGNITION SETTINGS
// =============================================================================

export const PATTERN_CONFIG = {
  candlestick: {
    minBodyRatio: 0.1, // Minimum body size relative to range
    dojiMaxBody: 0.1, // Maximum body for doji
    longWickRatio: 2, // Wick must be 2x body for hammer/shooting star
    engulfingMinRatio: 1.2, // Engulfing candle must be 20% larger
  },
  chartPatterns: {
    minPatternBars: 10, // Minimum bars to form a pattern
    maxPatternBars: 100, // Maximum bars to look back
    necklineDeviation: 0.02, // 2% deviation allowed for neckline
    breakoutConfirmation: 0.01, // 1% breakout required
  },
  supportResistance: {
    lookbackPeriod: 100,
    minTouches: 2,
    priceZonePercent: 0.5, // 0.5% zone around level
    validityPeriod: 50, // Bars before level expires
  },
  trend: {
    minSwings: 2,
    swingStrength: 5, // Bars to confirm swing
    trendStrengthThreshold: 0.6,
  },
}

// =============================================================================
// SIGNAL THRESHOLDS
// =============================================================================

export const SIGNAL_THRESHOLDS = {
  // Minimum strength to generate a signal
  minSignalStrength: 0.3,

  // Strong signal threshold
  strongSignal: 0.7,

  // Minimum confidence to execute
  minExecutionConfidence: 0.5,

  // Number of confirming indicators required
  minConfirmations: 2,

  // Signal validity duration (ms)
  signalValidityDuration: 5 * 60 * 1000, // 5 minutes

  // Cooldown between signals on same instrument (ms)
  signalCooldown: 60 * 1000, // 1 minute
}

// =============================================================================
// WEBSOCKET CHANNELS
// =============================================================================

export const WS_CHANNELS = {
  ticker: (instrument: string) => `ticker.${instrument}`,
  book: (instrument: string, depth = 10) => `book.${instrument}.${depth}`,
  trade: (instrument: string) => `trade.${instrument}`,
  candlestick: (instrument: string, timeframe: Timeframe) => `candlestick.${timeframe}.${instrument}`,
  // Authenticated channels
  userOrder: (instrument?: string) => instrument ? `user.order.${instrument}` : 'user.order',
  userTrade: (instrument?: string) => instrument ? `user.trade.${instrument}` : 'user.trade',
  userBalance: () => 'user.balance',
}

// =============================================================================
// UI CONFIGURATION
// =============================================================================

export const UI_CONFIG = {
  // Refresh rates (ms)
  tickerRefreshRate: 100, // Real-time via WebSocket
  orderBookRefreshRate: 100,
  positionsRefreshRate: 1000,
  pnlRefreshRate: 5000,

  // Chart settings
  defaultTimeframe: '15m' as Timeframe,
  chartCandleLimit: 500,
  chartIndicators: ['ema', 'bollinger', 'volume'],

  // Order book depth
  orderBookLevels: 15,

  // Recent trades limit
  recentTradesLimit: 50,

  // Animation durations (ms)
  priceFlashDuration: 500,
  transitionDuration: 200,
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'Authentication required. Please log in.',
  INVALID_API_KEY: 'Invalid API key. Please check your Crypto.com credentials.',

  // Trading
  INSUFFICIENT_BALANCE: 'Insufficient balance for this order.',
  POSITION_NOT_FOUND: 'Position not found.',
  ORDER_NOT_FOUND: 'Order not found.',
  INVALID_QUANTITY: 'Invalid quantity. Please check minimum order requirements.',
  INVALID_PRICE: 'Invalid price.',
  MAX_POSITIONS_REACHED: 'Maximum number of positions reached.',
  DAILY_LOSS_LIMIT: 'Daily loss limit reached. Trading paused.',
  MARKET_CLOSED: 'Market is currently closed.',

  // WebSocket
  WS_CONNECTION_FAILED: 'Failed to connect to market data stream.',
  WS_SUBSCRIPTION_FAILED: 'Failed to subscribe to market data.',

  // General
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  RATE_LIMITED: 'Rate limit exceeded. Please wait and try again.',
}

// =============================================================================
// RISK WARNINGS
// =============================================================================

export const RISK_WARNINGS = {
  LIVE_TRADING_ENABLED: 'WARNING: Live trading is enabled. Real funds are at risk.',
  LARGE_POSITION: 'This position size exceeds recommended limits.',
  HIGH_VOLATILITY: 'Current market volatility is elevated. Consider reducing position size.',
  LOSING_STREAK: 'You are on a losing streak. Consider taking a break.',
  APPROACHING_DAILY_LIMIT: 'Approaching daily loss limit.',
}
