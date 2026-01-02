// =============================================================================
// STUNTMAN TRADING SYSTEM - MAIN EXPORTS
// =============================================================================
// Institutional-grade algorithmic trading system
// Supports Crypto (Crypto.com) and Futures (Rithmic/Apex)
// =============================================================================

// Core types - explicit exports to avoid conflicts
export type {
  TradingMode,
  RiskLevel,
  OHLCV,
  Signal,
  Position,
  Order,
  StrategyConfig,
} from './types'

// Signal generation
export {
  generateAdvancedSignal,
  getBestOpportunities,
  type AdvancedSignal,
} from './signal-generator'

// Futures signal generation
export {
  FuturesSignalGenerator,
  createFuturesSignalGenerator,
  type FuturesSignal,
  type ChartTimeframe,
} from './futures-signal-generator'

// Execution
export { MultiMarketCoordinator } from './multi-market-coordinator'
export { WebhookExecutor, type WebhookConfig } from './webhook-executor'

// Risk management
export { RiskEngine } from './risk-engine'
export { PaperTradingEngine } from './paper-trading'

// Backtesting
export { BacktestEngine } from './backtest-engine'

// Analytics
export { PerformanceAnalytics } from './performance-analytics'

// Alerting
export { AlertSystem } from './alert-system'

// Technical indicators
export * from './indicators'
export * from './patterns'
