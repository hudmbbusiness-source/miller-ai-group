// =============================================================================
// RITHMIC API TYPES - INSTITUTIONAL GRADE
// =============================================================================
// Complete type definitions for Rithmic R|Protocol API
// Sub-millisecond execution for professional futures trading
// =============================================================================

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

export type RithmicEnvironment = 'demo' | 'live' | 'test'

export interface RithmicCredentials {
  userId: string
  password: string
  systemName: string        // Your registered system name
  appName: string
  appVersion: string
  fcmId?: string            // Futures Commission Merchant ID
  ibId?: string             // Introducing Broker ID
  userType?: string
}

export interface RithmicConfig {
  environment: RithmicEnvironment
  credentials: RithmicCredentials
  servers: {
    tickerPlant: string     // Market data
    orderPlant: string      // Order execution
    historyPlant: string    // Historical data
    pnlPlant: string        // P&L updates
  }
  heartbeatInterval: number  // ms (default: 30000)
  reconnectAttempts: number
  reconnectDelay: number     // ms
}

// Server endpoints by environment
export const RITHMIC_SERVERS = {
  demo: {
    tickerPlant: 'wss://rituz00100.rithmic.com:443',
    orderPlant: 'wss://rituz00100.rithmic.com:443',
    historyPlant: 'wss://rituz00100.rithmic.com:443',
    pnlPlant: 'wss://rituz00100.rithmic.com:443',
  },
  live: {
    tickerPlant: 'wss://chicago.rithmic.com:443',
    orderPlant: 'wss://chicago.rithmic.com:443',
    historyPlant: 'wss://chicago.rithmic.com:443',
    pnlPlant: 'wss://chicago.rithmic.com:443',
  },
  test: {
    tickerPlant: 'wss://test.rithmic.com:443',
    orderPlant: 'wss://test.rithmic.com:443',
    historyPlant: 'wss://test.rithmic.com:443',
    pnlPlant: 'wss://test.rithmic.com:443',
  },
}

// =============================================================================
// PLANT TYPES (Rithmic's 4 WebSocket endpoints)
// =============================================================================

export type PlantType = 'ticker' | 'order' | 'history' | 'pnl'

export interface PlantConnection {
  type: PlantType
  url: string
  connected: boolean
  authenticated: boolean
  lastHeartbeat: number
  latencyMs: number
  reconnectCount: number
}

// =============================================================================
// MARKET DATA TYPES
// =============================================================================

export interface RithmicTick {
  symbol: string
  exchange: string
  timestamp: number         // Microseconds precision
  lastPrice: number
  lastSize: number
  bidPrice: number
  bidSize: number
  askPrice: number
  askSize: number
  volume: number
  openInterest: number
  tradeCondition?: string
  sequenceNumber: number
}

export interface RithmicQuote {
  symbol: string
  exchange: string
  timestamp: number
  bidPrice: number
  bidSize: number
  askPrice: number
  askSize: number
  bidOrders?: number
  askOrders?: number
}

export interface RithmicDepthLevel {
  price: number
  size: number
  orders: number
  impliedSize?: number
}

export interface RithmicOrderBook {
  symbol: string
  exchange: string
  timestamp: number
  bids: RithmicDepthLevel[]  // Sorted high to low
  asks: RithmicDepthLevel[]  // Sorted low to high
}

export interface RithmicTimeBar {
  symbol: string
  exchange: string
  barType: 'second' | 'minute' | 'hour' | 'day'
  period: number            // e.g., 5 for 5-minute bars
  timestamp: number         // Bar open time
  open: number
  high: number
  low: number
  close: number
  volume: number
  numTrades: number
  openInterest?: number
}

export interface RithmicHistoricalTick {
  timestamp: number
  price: number
  size: number
  aggressor: 'buy' | 'sell' | 'unknown'
  condition?: string
}

// =============================================================================
// CONTRACT & PRODUCT TYPES
// =============================================================================

export interface RithmicExchange {
  id: string
  name: string
  description: string
  tradingEnabled: boolean
}

export interface RithmicProduct {
  productCode: string       // e.g., "ES", "NQ"
  exchange: string
  description: string
  productType: 'future' | 'option' | 'spread'
  tickSize: number
  pointValue: number
  currency: string
  tradingHours: string
}

export interface RithmicContract {
  symbol: string            // e.g., "ESH5"
  productCode: string       // e.g., "ES"
  exchange: string
  expirationDate: string
  isFrontMonth: boolean
  lastTradingDate: string
  tickSize: number
  pointValue: number
  marginInitial: number
  marginMaintenance: number
  status: 'active' | 'expired' | 'inactive'
}

// Futures specifications (same as before, institutional-grade)
export type FuturesSymbol =
  | 'ES'    // E-mini S&P 500
  | 'NQ'    // E-mini NASDAQ 100
  | 'MES'   // Micro E-mini S&P 500
  | 'MNQ'   // Micro E-mini NASDAQ 100
  | 'RTY'   // E-mini Russell 2000
  | 'YM'    // E-mini Dow
  | 'CL'    // Crude Oil
  | 'GC'    // Gold
  | 'ZB'    // 30-Year T-Bond
  | 'ZN'    // 10-Year T-Note
  | 'ZF'    // 5-Year T-Note
  | '6E'    // Euro FX
  | '6J'    // Japanese Yen

export interface FuturesSpec {
  symbol: FuturesSymbol
  exchange: string
  name: string
  tickSize: number
  pointValue: number
  marginInitial: number
  marginMaintenance: number
  contractMonths: string[]
}

export const FUTURES_SPECS: Record<FuturesSymbol, FuturesSpec> = {
  ES: {
    symbol: 'ES',
    exchange: 'CME',
    name: 'E-mini S&P 500',
    tickSize: 0.25,
    pointValue: 50,
    marginInitial: 12650,
    marginMaintenance: 11500,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  NQ: {
    symbol: 'NQ',
    exchange: 'CME',
    name: 'E-mini NASDAQ 100',
    tickSize: 0.25,
    pointValue: 20,
    marginInitial: 17600,
    marginMaintenance: 16000,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  MES: {
    symbol: 'MES',
    exchange: 'CME',
    name: 'Micro E-mini S&P 500',
    tickSize: 0.25,
    pointValue: 5,
    marginInitial: 1265,
    marginMaintenance: 1150,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  MNQ: {
    symbol: 'MNQ',
    exchange: 'CME',
    name: 'Micro E-mini NASDAQ 100',
    tickSize: 0.25,
    pointValue: 2,
    marginInitial: 1760,
    marginMaintenance: 1600,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  RTY: {
    symbol: 'RTY',
    exchange: 'CME',
    name: 'E-mini Russell 2000',
    tickSize: 0.10,
    pointValue: 50,
    marginInitial: 6820,
    marginMaintenance: 6200,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  YM: {
    symbol: 'YM',
    exchange: 'CBOT',
    name: 'E-mini Dow',
    tickSize: 1,
    pointValue: 5,
    marginInitial: 9350,
    marginMaintenance: 8500,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  CL: {
    symbol: 'CL',
    exchange: 'NYMEX',
    name: 'Crude Oil',
    tickSize: 0.01,
    pointValue: 1000,
    marginInitial: 6600,
    marginMaintenance: 6000,
    contractMonths: ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'],
  },
  GC: {
    symbol: 'GC',
    exchange: 'COMEX',
    name: 'Gold',
    tickSize: 0.10,
    pointValue: 100,
    marginInitial: 9900,
    marginMaintenance: 9000,
    contractMonths: ['G', 'J', 'M', 'Q', 'V', 'Z'],
  },
  ZB: {
    symbol: 'ZB',
    exchange: 'CBOT',
    name: '30-Year T-Bond',
    tickSize: 0.03125,
    pointValue: 1000,
    marginInitial: 4400,
    marginMaintenance: 4000,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  ZN: {
    symbol: 'ZN',
    exchange: 'CBOT',
    name: '10-Year T-Note',
    tickSize: 0.015625,
    pointValue: 1000,
    marginInitial: 2200,
    marginMaintenance: 2000,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  ZF: {
    symbol: 'ZF',
    exchange: 'CBOT',
    name: '5-Year T-Note',
    tickSize: 0.0078125,
    pointValue: 1000,
    marginInitial: 1320,
    marginMaintenance: 1200,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  '6E': {
    symbol: '6E',
    exchange: 'CME',
    name: 'Euro FX',
    tickSize: 0.00005,
    pointValue: 125000,
    marginInitial: 2530,
    marginMaintenance: 2300,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
  '6J': {
    symbol: '6J',
    exchange: 'CME',
    name: 'Japanese Yen',
    tickSize: 0.0000005,
    pointValue: 12500000,
    marginInitial: 3300,
    marginMaintenance: 3000,
    contractMonths: ['H', 'M', 'U', 'Z'],
  },
}

// =============================================================================
// ORDER TYPES
// =============================================================================

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'mit' | 'lit'
export type OrderDuration = 'day' | 'gtc' | 'gtd' | 'ioc' | 'fok'
export type OrderStatus =
  | 'pending'
  | 'open'
  | 'partial'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'trigger_pending'

export interface RithmicOrder {
  orderId: string           // Rithmic's internal order ID
  basketId?: string         // For bracket/OCO orders
  accountId: string
  symbol: string
  exchange: string
  side: OrderSide
  orderType: OrderType
  duration: OrderDuration
  quantity: number
  filledQuantity: number
  remainingQuantity: number
  limitPrice?: number
  stopPrice?: number
  avgFillPrice?: number
  status: OrderStatus
  statusMessage?: string
  createdAt: number
  updatedAt: number
  filledAt?: number
  cancelledAt?: number
  isAutomated: boolean
  tag?: string              // Custom identifier
}

export interface OrderRequest {
  accountId: string
  symbol: string
  exchange: string
  side: OrderSide
  orderType: OrderType
  quantity: number
  limitPrice?: number
  stopPrice?: number
  duration?: OrderDuration
  tag?: string
  bracket?: {
    stopLoss: number
    takeProfit: number
  }
}

export interface OrderModifyRequest {
  orderId: string
  quantity?: number
  limitPrice?: number
  stopPrice?: number
}

export interface OrderCancelRequest {
  orderId: string
}

// =============================================================================
// POSITION TYPES
// =============================================================================

export interface RithmicPosition {
  accountId: string
  symbol: string
  exchange: string
  netPosition: number       // Positive = long, Negative = short
  buyQuantity: number
  sellQuantity: number
  avgBuyPrice: number
  avgSellPrice: number
  avgEntryPrice: number
  openPnL: number
  realizedPnL: number
  marginUsed: number
  updatedAt: number
}

export interface RithmicFill {
  fillId: string
  orderId: string
  accountId: string
  symbol: string
  exchange: string
  side: OrderSide
  quantity: number
  price: number
  timestamp: number
  isAggressor: boolean
  fee: number
  feeCurrency: string
}

// =============================================================================
// ACCOUNT & PNL TYPES
// =============================================================================

export interface RithmicAccount {
  accountId: string
  accountName: string
  fcmId: string
  ibId: string
  accountType: 'customer' | 'demo'
  currency: string
  isActive: boolean
}

export interface RithmicAccountBalance {
  accountId: string
  cashBalance: number
  openPnL: number
  closedPnL: number
  totalEquity: number
  marginUsed: number
  marginAvailable: number
  buyingPower: number
  dayTradingBuyingPower: number
  timestamp: number
}

export interface RithmicPnLUpdate {
  accountId: string
  symbol?: string           // If null, account-level update
  openPnL: number
  closedPnL: number
  totalPnL: number
  timestamp: number
}

// =============================================================================
// PROP FIRM RULES
// =============================================================================

export interface PropFirmRules {
  firmName: string
  accountSize: number
  maxDailyLoss: number
  maxTrailingDrawdown: number
  profitTarget?: number
  minTradingDays?: number
  maxPositionSize: number
  allowedInstruments: FuturesSymbol[]
  tradingHoursOnly: boolean
  newsRestriction: boolean
  scalingPlan: { profitLevel: number; maxContracts: number }[]
}

export const APEX_RULES_50K: PropFirmRules = {
  firmName: 'Apex Trader Funding',
  accountSize: 50000,
  maxDailyLoss: -1100,      // No daily limit on Apex but good practice
  maxTrailingDrawdown: 2500,
  profitTarget: 3000,
  minTradingDays: 7,
  maxPositionSize: 4,
  allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'],
  tradingHoursOnly: false,
  newsRestriction: false,
  scalingPlan: [
    { profitLevel: 0, maxContracts: 2 },
    { profitLevel: 1500, maxContracts: 3 },
    { profitLevel: 2500, maxContracts: 4 },
  ],
}

export const APEX_RULES_100K: PropFirmRules = {
  firmName: 'Apex Trader Funding',
  accountSize: 100000,
  maxDailyLoss: -2200,
  maxTrailingDrawdown: 3000,
  profitTarget: 6000,
  minTradingDays: 7,
  maxPositionSize: 8,
  allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'],
  tradingHoursOnly: false,
  newsRestriction: false,
  scalingPlan: [
    { profitLevel: 0, maxContracts: 4 },
    { profitLevel: 3000, maxContracts: 6 },
    { profitLevel: 5000, maxContracts: 8 },
  ],
}

// =============================================================================
// CONNECTION & HEALTH
// =============================================================================

export interface ConnectionHealth {
  ticker: PlantConnection
  order: PlantConnection
  history: PlantConnection
  pnl: PlantConnection
  overallStatus: 'connected' | 'partial' | 'disconnected'
  lastUpdate: number
}

// =============================================================================
// EVENTS
// =============================================================================

export type RithmicEventType =
  | 'connected'
  | 'disconnected'
  | 'authenticated'
  | 'tick'
  | 'quote'
  | 'depth'
  | 'bar'
  | 'order_update'
  | 'fill'
  | 'position_update'
  | 'pnl_update'
  | 'account_update'
  | 'error'
  | 'heartbeat'

export interface RithmicEvent {
  type: RithmicEventType
  plant: PlantType
  timestamp: number
  data: unknown
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface RithmicError {
  code: string
  message: string
  plant?: PlantType
  orderId?: string
  timestamp: number
}

export class RithmicAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public plant?: PlantType,
    public details?: unknown
  ) {
    super(message)
    this.name = 'RithmicAPIError'
  }
}
