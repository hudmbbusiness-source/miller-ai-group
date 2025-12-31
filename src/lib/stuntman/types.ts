// =============================================================================
// STUNTMAN AI TRADING SYSTEM - TYPE DEFINITIONS
// =============================================================================
// Version: 1.0.0
// Description: Comprehensive type system for advanced crypto trading
// =============================================================================

// =============================================================================
// CORE TRADING TYPES
// =============================================================================

export type TradingSide = 'BUY' | 'SELL' | 'buy' | 'sell'
export type PositionSide = 'LONG' | 'SHORT' | 'long' | 'short'
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'STOP_LIMIT' | 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK'
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired'
export type PositionStatus = 'open' | 'closing' | 'closed'
export type AccountType = 'paper' | 'live'
export type TradingMode = 'paper' | 'live'
export type RiskLevel = 'low' | 'medium' | 'high'
export type StrategyType = 'technical' | 'momentum' | 'pattern' | 'hybrid'
export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'CLOSE'
export type BacktestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'

// =============================================================================
// MARKET DATA TYPES
// =============================================================================

export interface Ticker {
  instrumentName: string
  lastPrice: number
  bidPrice: number
  askPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  priceChange24h: number
  priceChangePercent24h: number
  openPrice: number
  timestamp: number
}

export interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  percentage: number
}

export interface OrderBook {
  instrumentName: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  spreadPercent: number
  midPrice: number
  imbalance: number // Positive = more bids, Negative = more asks
  timestamp: number
}

export interface Trade {
  id: string
  instrumentName: string
  price: number
  quantity: number
  side: TradingSide
  timestamp: number
  isMaker: boolean
}

export interface OHLCV {
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  quoteVolume: number
  tradeCount: number
}

export interface MarketData {
  ticker: Ticker | null
  orderBook: OrderBook | null
  recentTrades: Trade[]
  candles: OHLCV[]
}

// =============================================================================
// ACCOUNT & POSITION TYPES
// =============================================================================

export interface TradingAccount {
  id: string
  userId: string
  accountType: AccountType
  name: string
  initialBalance: number
  currentBalance: number
  reservedBalance: number
  availableBalance: number
  balance: number // Alias for currentBalance
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Account settings for risk management
export interface AccountSettings {
  defaultStopLossPercent: number
  defaultTakeProfitPercent: number
  maxDailyLoss: number
  maxPositionSize: number
  autoStopLoss: boolean
  autoTakeProfit: boolean
}

// Position sizing strategies
export interface PositionSizing {
  type: 'fixed' | 'percent' | 'kelly' | 'volatility'
  fixedAmount?: number
  percentOfBalance?: number
  kellyFraction?: number
  volatilityTarget?: number
}

export interface Position {
  id: string
  accountId: string
  userId: string
  strategyId: string | null
  instrumentName: string
  side: PositionSide
  quantity: number
  entryPrice: number
  currentPrice: number
  avgEntryPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  realizedPnl: number
  totalFees: number
  stopLoss: number | null
  takeProfit: number | null
  trailingStopPercent: number | null
  status: PositionStatus
  closeReason: string | null
  openedAt: Date
  closedAt: Date | null
  duration: number // milliseconds
  riskRewardRatio: number | null
}

export interface Order {
  id: string
  accountId: string
  account_id?: string // snake_case alias
  userId: string
  positionId: string | null
  strategyId: string | null
  signalId: string | null
  externalOrderId: string | null
  instrumentName: string
  instrument_name?: string // snake_case alias
  side: TradingSide
  orderType: OrderType
  order_type?: string // snake_case alias
  timeInForce: TimeInForce
  quantity: number
  filledQuantity: number
  filled_quantity?: number // snake_case alias
  remainingQuantity: number
  price: number | null
  stopPrice: number | null
  filledPrice: number | null
  avgFillPrice: number | null
  average_price?: number | null // snake_case alias
  fee: number
  fees?: number // alias
  feeCurrency: string
  status: OrderStatus
  rejectReason: string | null
  createdAt: Date
  updatedAt: Date
  filledAt: Date | null
  filled_at?: string | null // snake_case alias
  cancelledAt: Date | null
}

export interface ExecutedTrade {
  id: string
  accountId: string
  userId: string
  orderId: string | null
  positionId: string | null
  externalTradeId: string | null
  instrumentName: string
  side: TradingSide
  quantity: number
  price: number
  value: number
  fee: number
  feeCurrency: string
  feeRate: number
  pnl: number | null
  pnlPercent: number | null
  isMaker: boolean
  slippage: number
  executedAt: Date
}

// =============================================================================
// STRATEGY TYPES
// =============================================================================

export interface IndicatorConfig {
  rsi?: {
    enabled: boolean
    period: number
    overbought: number
    oversold: number
    divergence: boolean
  }
  macd?: {
    enabled: boolean
    fast: number
    slow: number
    signal: number
    histogram: boolean
  }
  ema?: {
    enabled: boolean
    periods: number[]
    crossover: boolean
  }
  sma?: {
    enabled: boolean
    periods: number[]
  }
  bollinger?: {
    enabled: boolean
    period: number
    stdDev: number
    squeeze: boolean
  }
  atr?: {
    enabled: boolean
    period: number
    multiplier: number
  }
  volume?: {
    enabled: boolean
    maPeriod: number
    threshold: number
  }
  stochastic?: {
    enabled: boolean
    kPeriod: number
    dPeriod: number
    smooth: number
    overbought: number
    oversold: number
  }
  adx?: {
    enabled: boolean
    period: number
    threshold: number
  }
  obv?: {
    enabled: boolean
  }
  vwap?: {
    enabled: boolean
  }
}

export interface PatternConfig {
  candlestick: {
    enabled: boolean
    patterns: CandlestickPattern[]
    minConfidence: number
  }
  chartPatterns: {
    enabled: boolean
    patterns: ChartPattern[]
    minConfidence: number
  }
  supportResistance: {
    enabled: boolean
    lookbackPeriod: number
    touchCount: number
    priceZonePercent: number
    minTouches?: number // Alias for touchCount
  }
  trendLines: {
    enabled: boolean
    minTouches: number
  }
  fibonacciLevels: {
    enabled: boolean
    levels: number[]
  }
}

export type CandlestickPattern =
  | 'doji'
  | 'dragonfly_doji'
  | 'gravestone_doji'
  | 'hammer'
  | 'inverted_hammer'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'morning_star'
  | 'evening_star'
  | 'three_white_soldiers'
  | 'three_black_crows'
  | 'harami'
  | 'piercing_line'
  | 'dark_cloud_cover'
  | 'shooting_star'
  | 'hanging_man'
  | 'spinning_top'
  | 'marubozu'
  | 'tweezer_top'
  | 'tweezer_bottom'

export type ChartPattern =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triple_top'
  | 'triple_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetric_triangle'
  | 'symmetrical_triangle' // Alias
  | 'bull_flag'
  | 'bear_flag'
  | 'bull_pennant'
  | 'bear_pennant'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'cup_and_handle'
  | 'rounding_bottom'

export interface EntryConditions {
  minSignalStrength: number
  requireConfirmation: boolean
  confirmationCount: number
  volumeFilter: boolean
  minVolumeMultiplier: number
  trendFilter: boolean
  trendAlignment: boolean
  volatilityFilter: boolean
  maxVolatility: number
  minVolatility: number
  spreadFilter: boolean
  maxSpreadPercent: number
  timeFilter: boolean
  tradingHours: { start: number; end: number }[]
}

export interface ExitConditions {
  stopLossType: 'fixed' | 'atr' | 'trailing' | 'chandelier'
  stopLossPercent: number
  takeProfitType: 'fixed' | 'atr' | 'resistance' | 'fibonacci'
  takeProfitPercent: number
  trailingStopActivation: number
  trailingStopDistance: number
  timeStop: boolean
  maxHoldingPeriod: number
  partialExit: boolean
  partialExitLevels: { percent: number; size: number }[]
  breakEvenStop: boolean
  breakEvenActivation: number
}

export interface RiskConfig {
  maxPositionSize: number
  maxPositionPercent: number
  maxDailyLoss: number
  maxDailyLossPercent: number
  maxDrawdown: number
  maxOpenPositions: number
  maxCorrelatedPositions: number
  maxDailyTrades: number
  cooldownAfterLoss: number // minutes
  positionSizing: 'fixed' | 'percent' | 'kelly' | 'volatility'
  kellyFraction: number
  volatilityTarget: number
}

export interface StrategyConfig {
  indicators: IndicatorConfig
  patterns: PatternConfig
  entry: EntryConditions
  exit: ExitConditions
  risk: RiskConfig
}

export interface Strategy {
  id: string
  userId: string
  accountId: string | null
  name: string
  description: string
  strategyType: StrategyType
  instruments: string[]
  isActive: boolean
  config: StrategyConfig
  totalTrades: number
  winningTrades: number
  totalPnl: number
  winRate: number
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// SIGNAL TYPES
// =============================================================================

export interface IndicatorValues {
  rsi?: number
  macd?: { macd: number; signal: number; histogram: number }
  ema?: Record<number, number>
  sma?: Record<number, number>
  bollinger?: { upper: number; middle: number; lower: number; width: number }
  bollingerBands?: { upper: number; middle: number; lower: number; width: number } // Alias
  atr?: number
  volume?: { current: number; ma: number; ratio: number }
  stochastic?: { k: number; d: number }
  adx?: { adx: number; plusDI: number; minusDI: number }
  obv?: number
  vwap?: number
}

export interface PatternDetection {
  type: 'candlestick' | 'chart' | 'support_resistance' | 'trend_line'
  name: string
  confidence: number
  direction: 'bullish' | 'bearish' | 'neutral'
  price: number
  timestamp: number
  details: Record<string, unknown>
  // Structured pattern data for signal generator
  candlestick?: Array<{ pattern: string; confidence: number; direction: string }>
  chart?: Array<{ pattern: string; confidence: number; direction: string }>
  support?: number[]
  resistance?: number[]
}

export interface Signal {
  id: string
  strategyId: string
  userId: string
  instrumentName: string
  signalType: SignalType
  side: TradingSide // Alias for signal direction
  source: string // Signal source (indicator, pattern, etc.)
  strength: number
  confidence: number
  priceAtSignal: number
  suggestedEntry: number | null
  suggestedStopLoss: number | null
  suggestedTakeProfit: number | null
  riskRewardRatio: number | null
  indicators: IndicatorValues
  patternsDetected: PatternDetection[]
  patterns: string[] // Simple pattern names list
  reasoning: string[]
  executed: boolean
  orderId: string | null
  executionPrice: number | null
  validUntil: Date | null
  expired: boolean
  timestamp: Date // When signal was generated
  createdAt: Date
}

// =============================================================================
// BACKTEST TYPES
// =============================================================================

export interface BacktestConfig {
  strategyId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  timeframe: Timeframe
  initialBalance: number
  instruments: string[]
  configSnapshot: StrategyConfig
}

export interface BacktestTrade {
  entryTime: number
  exitTime: number
  instrumentName: string
  side: PositionSide
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  fees: number
  duration: number
  maxDrawdown: number
  maxProfit: number
  exitReason: string
  signals: Signal[]
}

export interface EquityPoint {
  timestamp: number
  equity: number
  drawdown: number
  drawdownPercent: number
}

export interface BacktestResults {
  id: string
  strategyId: string
  userId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  timeframe: Timeframe
  initialBalance: number
  finalBalance: number
  instruments: string[]
  configSnapshot: StrategyConfig

  // P&L
  totalPnl: number
  totalPnlPercent: number
  grossProfit: number
  grossLoss: number
  netProfit: number

  // Trade statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  lossRate: number

  // Averages
  avgWin: number
  avgLoss: number
  avgWinPercent: number
  avgLossPercent: number
  avgTrade: number
  avgTradePercent: number
  avgTradeDuration: number
  avgBarsInTrade: number

  // Streaks
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  currentStreak: number

  // Risk metrics
  maxDrawdown: number
  maxDrawdownPercent: number
  maxDrawdownDuration: number
  recoveryFactor: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  profitFactor: number
  payoffRatio: number
  expectancy: number
  expectedValue: number

  // Time analysis
  bestMonth: { month: string; pnl: number }
  worstMonth: { month: string; pnl: number }
  monthlyReturns: Record<string, number>
  dailyReturns: number[]

  // Detailed data
  equityCurve: EquityPoint[]
  trades: BacktestTrade[]

  // Status
  status: BacktestStatus
  errorMessage: string | null
  progress: number
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

// =============================================================================
// P&L TYPES
// =============================================================================

export interface PnLSnapshot {
  id: string
  accountId: string
  userId: string
  snapshotDate: Date
  balance: number
  equity: number
  dailyPnl: number
  dailyPnlPercent: number
  totalPnl: number
  totalPnlPercent: number
  openPositions: number
  tradesCount: number
  volume: number
  feesPaid: number
  winRate: number
  maxDrawdown: number
}

export interface PerformanceMetrics {
  totalPnl: number
  totalPnlPercent: number
  todayPnl: number
  todayPnlPercent: number
  weekPnl: number
  weekPnlPercent: number
  monthPnl: number
  monthPnlPercent: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgWin: number
  avgLoss: number
  bestTrade: number
  worstTrade: number
  avgTradeDuration: number
}

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface UserSettings {
  id: string
  userId: string
  tradingMode: TradingMode
  defaultAccountId: string | null
  riskLevel: RiskLevel
  maxDailyLoss: number
  maxPositionSize: number
  notificationsEnabled: boolean
  autoTradingEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================

export interface WebSocketMessage {
  id?: number
  method: string
  code?: number
  result?: {
    channel: string
    subscription: string
    instrument_name?: string
    data: unknown[]
  }
}

export interface WebSocketSubscription {
  channel: string
  callbacks: Set<(data: unknown) => void>
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Order request types
export interface CreateOrderRequest {
  accountId: string
  instrumentName: string
  side: TradingSide
  orderType: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  stopLoss?: number
  takeProfit?: number
  timeInForce?: TimeInForce
  strategyId?: string
  signalId?: string
}

export interface CancelOrderRequest {
  orderId: string
  accountId: string
}

export interface ModifyOrderRequest {
  orderId: string
  accountId: string
  quantity?: number
  price?: number
  stopPrice?: number
}

// Position request types
export interface ClosePositionRequest {
  positionId: string
  accountId: string
  quantity?: number // Partial close
  price?: number // Limit price
}

export interface ModifyPositionRequest {
  positionId: string
  accountId: string
  stopLoss?: number | null
  takeProfit?: number | null
  trailingStopPercent?: number | null
}

// =============================================================================
// FEE TYPES
// =============================================================================

export interface FeeStructure {
  maker: number
  taker: number
  withdraw: Record<string, number>
}

export const CRYPTO_COM_FEES: FeeStructure = {
  maker: 0.0004, // 0.04%
  taker: 0.0010, // 0.10%
  withdraw: {
    BTC: 0.0004,
    ETH: 0.005,
    USDT: 1,
    USDC: 1,
  },
}

// =============================================================================
// SUPPORTED INSTRUMENTS
// =============================================================================

export const SUPPORTED_INSTRUMENTS = [
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
] as const

export type SupportedInstrument = (typeof SUPPORTED_INSTRUMENTS)[number]

// =============================================================================
// TIMEFRAME UTILITIES
// =============================================================================

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
}

export const TIMEFRAME_CANDLES_PER_DAY: Record<Timeframe, number> = {
  '1m': 1440,
  '5m': 288,
  '15m': 96,
  '30m': 48,
  '1h': 24,
  '4h': 6,
  '1d': 1,
  '1w': 0.143,
}
