// =============================================================================
// TRADOVATE API TYPES - PRODUCTION GRADE
// =============================================================================
// Complete type definitions for Tradovate API integration
// Used with Apex Trader Funding and other prop firms
// =============================================================================

// =============================================================================
// AUTHENTICATION
// =============================================================================

export interface TradovateCredentials {
  username: string
  password: string
  appId: string
  appVersion: string
  clientId: string       // CID from Tradovate
  clientSecret: string   // Secret from Tradovate
  deviceId: string       // Unique device identifier
}

export interface AccessTokenRequest {
  name: string
  password: string
  appId: string
  appVersion: string
  cid: string
  sec: string
  deviceId?: string
}

export interface AccessTokenResponse {
  accessToken: string
  expirationTime: string   // ISO timestamp
  userId: number
  userStatus: 'Active' | 'Inactive' | 'Locked'
  name: string
  hasLive: boolean
  errorText?: string
  passwordExpirationTime?: string
  mdAccessToken?: string   // Market data access token
}

export interface TokenRenewalResponse {
  accessToken: string
  expirationTime: string
  mdAccessToken?: string
}

// =============================================================================
// ACCOUNT & USER
// =============================================================================

export interface TradovateAccount {
  id: number
  name: string
  userId: number
  accountType: 'Customer' | 'Demo' | 'Sim'
  active: boolean
  clearingHouseId: number
  riskCategoryId: number
  autoLiqProfileId: number
  marginAccountType: 'Spec' | 'Hedge'
  legalStatus: 'Individual' | 'Entity'
  archived: boolean
  timestamp: string
}

export interface AccountBalance {
  accountId: number
  realizedPnL: number
  openPnL: number
  totalUsedMargin: number
  totalCashValue: number
  netLiq: number
}

export interface CashBalance {
  id: number
  accountId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  currencyId: number
  amount: number
  realizedPnL: number
  weekRealizedPnL: number
}

export interface MarginSnapshot {
  id: number
  accountId: number
  timestamp: string
  initialMargin: number
  maintenanceMargin: number
  netLiq: number
  autoLiqLevel: number
  cashValue: number
}

// =============================================================================
// CONTRACTS & PRODUCTS
// =============================================================================

export interface Contract {
  id: number
  name: string                    // e.g., "ESH5" (ES March 2025)
  contractMaturityId: number
  status: 'Inactive' | 'Active' | 'Expired'
  providerTickSize: number
}

export interface ContractMaturity {
  id: number
  productId: number
  expirationDate: string
  expirationMonth: number
  expirationYear: number
  isFront: boolean
}

export interface Product {
  id: number
  name: string                    // e.g., "ES", "NQ", "MES", "MNQ"
  currencyId: number
  productType: 'Futures' | 'Options' | 'Spread'
  description: string
  exchangeId: number
  tickSize: number                // Minimum price increment
  pointValue: number              // Dollar value per point
  status: 'Active' | 'Inactive'
  priceFormat: string
  priceFormatType: 'Decimal' | 'Fractional'
}

// Common futures contracts we'll trade
export type FuturesSymbol =
  | 'ES'    // E-mini S&P 500 ($50/point)
  | 'NQ'    // E-mini NASDAQ 100 ($20/point)
  | 'MES'   // Micro E-mini S&P 500 ($5/point)
  | 'MNQ'   // Micro E-mini NASDAQ 100 ($2/point)
  | 'RTY'   // E-mini Russell 2000 ($50/point)
  | 'YM'    // E-mini Dow ($5/point)
  | 'CL'    // Crude Oil ($1000/point)
  | 'GC'    // Gold ($100/point)
  | 'NQ'    // NASDAQ
  | 'ZB'    // 30-Year T-Bond

export interface FuturesContractSpec {
  symbol: FuturesSymbol
  name: string
  exchange: string
  tickSize: number
  pointValue: number
  marginInitial: number
  marginMaintenance: number
  tradingHours: string
  contractMonths: string[]
}

// Contract specifications for common futures
export const FUTURES_SPECS: Record<FuturesSymbol, FuturesContractSpec> = {
  ES: {
    symbol: 'ES',
    name: 'E-mini S&P 500',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 50,
    marginInitial: 12650,
    marginMaintenance: 11500,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']  // Mar, Jun, Sep, Dec
  },
  NQ: {
    symbol: 'NQ',
    name: 'E-mini NASDAQ 100',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 20,
    marginInitial: 17600,
    marginMaintenance: 16000,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  },
  MES: {
    symbol: 'MES',
    name: 'Micro E-mini S&P 500',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 5,
    marginInitial: 1265,
    marginMaintenance: 1150,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  },
  MNQ: {
    symbol: 'MNQ',
    name: 'Micro E-mini NASDAQ 100',
    exchange: 'CME',
    tickSize: 0.25,
    pointValue: 2,
    marginInitial: 1760,
    marginMaintenance: 1600,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  },
  RTY: {
    symbol: 'RTY',
    name: 'E-mini Russell 2000',
    exchange: 'CME',
    tickSize: 0.10,
    pointValue: 50,
    marginInitial: 6820,
    marginMaintenance: 6200,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  },
  YM: {
    symbol: 'YM',
    name: 'E-mini Dow',
    exchange: 'CBOT',
    tickSize: 1,
    pointValue: 5,
    marginInitial: 9350,
    marginMaintenance: 8500,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  },
  CL: {
    symbol: 'CL',
    name: 'Crude Oil',
    exchange: 'NYMEX',
    tickSize: 0.01,
    pointValue: 1000,
    marginInitial: 6600,
    marginMaintenance: 6000,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z']
  },
  GC: {
    symbol: 'GC',
    name: 'Gold',
    exchange: 'COMEX',
    tickSize: 0.10,
    pointValue: 100,
    marginInitial: 9900,
    marginMaintenance: 9000,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['G', 'J', 'M', 'Q', 'V', 'Z']
  },
  ZB: {
    symbol: 'ZB',
    name: '30-Year T-Bond',
    exchange: 'CBOT',
    tickSize: 0.03125,  // 1/32
    pointValue: 1000,
    marginInitial: 4400,
    marginMaintenance: 4000,
    tradingHours: 'Sun 6pm - Fri 5pm ET (23h)',
    contractMonths: ['H', 'M', 'U', 'Z']
  }
}

// =============================================================================
// ORDERS
// =============================================================================

export type OrderAction = 'Buy' | 'Sell'
export type OrderType = 'Market' | 'Limit' | 'Stop' | 'StopLimit' | 'TrailingStop' | 'TrailingStopLimit'
export type OrderStatus = 'PendingSubmit' | 'PendingCancel' | 'Submitted' | 'Working' | 'Filled' | 'Cancelled' | 'Expired' | 'Rejected'
export type TimeInForce = 'Day' | 'GTC' | 'IOC' | 'FOK' | 'GTD' | 'OPG'

export interface PlaceOrderRequest {
  accountSpec: string          // Username
  accountId: number            // Account ID
  action: OrderAction
  symbol: string               // Contract symbol (e.g., "MESH5")
  orderQty: number
  orderType: OrderType
  price?: number               // Required for Limit orders
  stopPrice?: number           // Required for Stop orders
  timeInForce?: TimeInForce    // Default: Day
  isAutomated: boolean         // Must be true for API orders
  customTag50?: string         // Custom order tag
  activationTime?: string      // For scheduled orders
  text?: string                // Order notes
}

export interface PlaceOCORequest {
  accountSpec: string
  accountId: number
  clOrdLinkId: string          // Client order link ID
  action: OrderAction
  symbol: string
  orderQty: number
  orderType: OrderType
  price?: number
  stopPrice?: number
  other: {
    action: OrderAction
    clOrdLinkId: string
    orderType: OrderType
    price?: number
    stopPrice?: number
  }
}

export interface PlaceBracketRequest {
  accountSpec: string
  accountId: number
  action: OrderAction
  symbol: string
  orderQty: number
  orderType: OrderType
  price?: number
  stopPrice?: number
  bracket1: {
    action: OrderAction
    orderType: OrderType
    price?: number
    stopPrice?: number
  }
  bracket2: {
    action: OrderAction
    orderType: OrderType
    price?: number
    stopPrice?: number
  }
}

export interface Order {
  id: number
  accountId: number
  contractId: number
  timestamp: string
  action: OrderAction
  ordStatus: OrderStatus
  execType: string
  ordType: OrderType
  price?: number
  stopPrice?: number
  orderQty: number
  filledQty: number
  remainingQty: number
  avgPx?: number              // Average fill price
  text?: string
  isAutomated: boolean
}

export interface OrderVersion {
  id: number
  orderId: number
  orderQty: number
  orderType: OrderType
  price?: number
  stopPrice?: number
  maxShow?: number
  pegDifference?: number
  timeInForce: TimeInForce
  expireTime?: string
  text?: string
}

export interface Execution {
  id: number
  orderId: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  action: OrderAction
  cumQty: number
  avgPx: number
  lastQty: number
  lastPx: number
}

export interface Fill {
  id: number
  orderId: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  action: OrderAction
  qty: number
  price: number
  active: boolean
  finallyPaired: number
}

// =============================================================================
// POSITIONS
// =============================================================================

export interface Position {
  id: number
  accountId: number
  contractId: number
  timestamp: string
  tradeDate: { year: number; month: number; day: number }
  netPos: number              // Net position quantity (positive=long, negative=short)
  netPrice?: number           // Average entry price
  bought: number              // Total bought today
  boughtValue: number
  sold: number                // Total sold today
  soldValue: number
  prevPos: number             // Position from previous day
  prevPrice?: number
}

export interface PositionWithPnL extends Position {
  currentPrice: number
  unrealizedPnL: number
  realizedPnL: number
  totalPnL: number
  marginUsed: number
}

// =============================================================================
// MARKET DATA
// =============================================================================

export interface Quote {
  timestamp: string
  contractId: number
  entries: QuoteEntry[]
}

export interface QuoteEntry {
  price: number
  size: number
}

export interface DOM {
  contractId: number
  timestamp: string
  bids: DOMEntry[]
  offers: DOMEntry[]
}

export interface DOMEntry {
  price: number
  size: number
  orders?: number
  impliedSize?: number
}

export interface HistogramEntry {
  contractId: number
  timestamp: string
  base: number
  items: { price: number; volume: number }[]
}

export interface OHLCV {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  upVolume: number
  downVolume: number
  upTicks: number
  downTicks: number
}

export interface ChartData {
  contractId: number
  timestamp: string
  bars: OHLCV[]
}

export type ChartTimeframe =
  | '1Min' | '2Min' | '3Min' | '5Min' | '10Min' | '15Min' | '30Min'
  | '1Hour' | '2Hour' | '4Hour'
  | 'Daily' | 'Weekly' | 'Monthly'

// =============================================================================
// WEBSOCKET
// =============================================================================

export interface WebSocketMessage {
  e: string                   // Event type
  d: unknown                  // Data payload
  i?: number                  // Request ID
  s?: number                  // Status (200 = success)
}

export interface WebSocketRequest {
  op: string                  // Operation
  url: string                 // Endpoint URL
  body?: unknown              // Request body
  query?: string              // Query string
}

export type WebSocketEventType =
  | 'props'                   // Entity property changes
  | 'md/quote'                // Quote updates
  | 'md/dom'                  // DOM updates
  | 'md/histogram'            // Histogram updates
  | 'md/chart'                // Chart data
  | 'user/syncRequest'        // User sync events
  | 'order/placeOrder'        // Order placement response
  | 'position/list'           // Position updates
  | 'account/list'            // Account updates

// =============================================================================
// RISK MANAGEMENT (PROP FIRM SPECIFIC)
// =============================================================================

export interface PropFirmRules {
  firmName: 'Apex' | 'TopStep' | 'MyFundedFutures'
  maxDailyLoss: number        // Maximum daily loss before auto-liquidation
  maxDrawdown: number         // Maximum trailing drawdown
  profitTarget: number        // Profit target to pass evaluation
  minTradingDays: number      // Minimum days to trade
  maxPositionSize: number     // Maximum contracts per position
  allowedInstruments: string[]
  tradingHoursOnly: boolean   // Can only trade during regular hours?
  scalingPlan: {              // Position size increases at profit levels
    profitLevel: number
    maxContracts: number
  }[]
}

export const APEX_RULES: PropFirmRules = {
  firmName: 'Apex',
  maxDailyLoss: -1000,        // Varies by account size
  maxDrawdown: 2500,          // Trailing drawdown for 50k account
  profitTarget: 3000,         // 6% of account for eval
  minTradingDays: 7,
  maxPositionSize: 4,         // Max 4 contracts for 50k
  allowedInstruments: ['ES', 'NQ', 'MES', 'MNQ', 'RTY', 'YM', 'CL', 'GC'],
  tradingHoursOnly: false,
  scalingPlan: [
    { profitLevel: 0, maxContracts: 2 },
    { profitLevel: 1500, maxContracts: 3 },
    { profitLevel: 2500, maxContracts: 4 }
  ]
}

// =============================================================================
// API CLIENT CONFIGURATION
// =============================================================================

export interface TradovateClientConfig {
  mode: 'demo' | 'live'
  credentials: TradovateCredentials
  propFirmRules?: PropFirmRules
  enableMarketData: boolean
  autoReconnect: boolean
  heartbeatInterval: number   // ms
  maxRetries: number
  retryDelay: number          // ms
}

export interface ConnectionHealth {
  connected: boolean
  lastHeartbeat: number
  consecutiveFailures: number
  latencyMs: number
  tradingEnabled: boolean
  marketDataEnabled: boolean
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface TradovateError {
  errorText: string
  errorCode?: string
  orderId?: number
  failureReason?: string
  failureText?: string
}

export class TradovateAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'TradovateAPIError'
  }
}
