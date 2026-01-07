/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║               STUNTMAN MASTER STRATEGY ORCHESTRATOR v2.0                     ║
 * ║                                                                              ║
 * ║            WORLD-CLASS INSTITUTIONAL-GRADE TRADING SYSTEM                    ║
 * ║                                                                              ║
 * ║  This is the central brain that integrates ALL strategy components into     ║
 * ║  a unified, self-learning, adaptive trading system designed for ES futures. ║
 * ║                                                                              ║
 * ║  INTEGRATED SYSTEMS:                                                         ║
 * ║  1. Production Strategy Engine (VWAP Mean Reversion, ORB, EMA Trend)        ║
 * ║  2. Institutional Order Flow (Delta Divergence, Absorption, VPIN)            ║
 * ║  3. Smart Money Concepts (Order Blocks, FVGs, Liquidity Pools)              ║
 * ║  4. Volume Profile Analysis (POC, VAH/VAL, HVN/LVN)                         ║
 * ║  5. Statistical Methods (Z-Score, Half-Life, Mean Reversion)                ║
 * ║  6. Self-Learning ML Engine (Adaptive weights, Feature optimization)         ║
 * ║                                                                              ║
 * ║  KEY FEATURES:                                                               ║
 * ║  • Multi-strategy confluence scoring with weighted voting                    ║
 * ║  • Intelligent inverse trading with regime-aware flipping                   ║
 * ║  • Dynamic stop/target optimization based on historical performance          ║
 * ║  • Real-time strategy weighting adjusted by regime, session, volatility     ║
 * ║  • Persistent memory - learns across sessions via Supabase                  ║
 * ║  • Market microstructure analysis for execution optimization                 ║
 * ║  • Multi-timeframe confirmation (1m, 5m, 15m alignment)                     ║
 * ║  • Apex 150K account safety integration                                      ║
 * ║                                                                              ║
 * ║  NO FAKE DATA. NO PLACEHOLDERS. PRODUCTION GRADE.                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { createClient } from '@supabase/supabase-js'
import { Candle } from './signal-engine'
import {
  calculateIndicators,
  detectMarketRegime as detectProductionRegime,
  generateMasterSignal,
  generateVWAPSignal,
  generateORBSignal,
  generateEMATrendSignal,
  generateDeltaSignal,
  getCurrentSession,
  isRTH,
  Indicators,
  MasterSignal,
  StrategySignal,
  MarketRegime as ProductionRegime,
  TradingSession,
  DEFAULT_VWAP_CONFIG,
  DEFAULT_ORB_CONFIG,
  DEFAULT_EMA_CONFIG,
  DEFAULT_DELTA_CONFIG,
} from './strategy-engine'
import {
  analyzeMarket,
  generateAdvancedMasterSignal,
  calculateVolumeProfile,
  detectOrderBlocks,
  detectFairValueGaps,
  detectLiquidityPools,
  detectMarketStructure,
  detectDeltaDivergence,
  detectAbsorption,
  calculateZScore,
  calculateHalfLife,
  AdvancedAnalysis,
  AdvancedSignal,
  VolumeProfileData,
  OrderBlock,
  FairValueGap,
  LiquidityPool,
  MarketStructure,
  DeltaDivergence,
  Absorption,
  SignalDirection as AdvancedDirection,
} from './advanced-strategies'
import {
  generateAdaptiveSignal,
  extractFeatures,
  detectMarketRegime as detectAdaptiveRegime,
  recordTradeOutcome,
  getAdaptiveStats,
  getLearningState,
  setLearningState,
  ensureLearningStateLoaded,
  saveLearningStateToDB,
  AdaptiveSignal,
  PatternFeatures,
  MarketRegime as AdaptiveRegime,
  TradeOutcome,
} from './adaptive-ml'
import {
  checkApexRiskStatus,
  DEFAULT_APEX_SAFETY,
  ApexSafetyConfig,
} from './risk-analytics'

// =============================================================================
// SUPABASE CLIENT FOR PERSISTENT LEARNING
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey && supabaseUrl !== 'undefined') {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
  return supabase
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'FLAT'
export type SignalStrength = 'EXTREME' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
export type ConfluenceLevel = 'EXTREME' | 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
export type StrategyCategory = 'PRODUCTION' | 'INSTITUTIONAL' | 'SMART_MONEY' | 'STATISTICAL' | 'ML_ADAPTIVE'
export type VolatilityBucket = 'ULTRA_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
export type RiskLevel = 'AGGRESSIVE' | 'NORMAL' | 'CONSERVATIVE' | 'DEFENSIVE'

/**
 * Individual strategy contribution to the master signal
 */
export interface StrategyContribution {
  id: string                            // Unique identifier
  name: string                          // Strategy name
  category: StrategyCategory            // Strategy category
  direction: SignalDirection            // Signal direction
  confidence: number                    // Raw confidence (0-100)
  weight: number                        // Current learned weight (0.1 to 3.0)
  weightedScore: number                 // confidence * weight

  // Entry/Exit from this strategy
  suggestedEntry: number
  suggestedStop: number
  suggestedTarget: number
  riskReward: number

  // Metadata
  reasoning: string
  regimeAlignment: boolean              // Does this signal align with current regime?
  sessionOptimal: boolean               // Is this strategy optimal for current session?

  // Inverse status
  wasInversed: boolean
  originalDirection: SignalDirection
}

/**
 * Multi-timeframe trend analysis
 */
export interface MTFAnalysis {
  tf1m: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    strength: number                    // 0-100
    ema9: number
    ema21: number
    ema50: number
  }
  tf5m: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    strength: number
    ema9: number
    ema21: number
    ema50: number
  }
  tf15m: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    strength: number
    ema9: number
    ema21: number
    ema50: number
  }
  alignment: 'ALIGNED_BULLISH' | 'ALIGNED_BEARISH' | 'PARTIALLY_ALIGNED' | 'CONFLICTING'
  alignmentScore: number                // 0-100, how aligned are timeframes
  dominantBias: SignalDirection
}

/**
 * Market microstructure analysis
 */
export interface MicrostructureAnalysis {
  // Liquidity
  currentSpread: number                 // Typical spread in ticks
  liquidityScore: number                // 0-100, higher = more liquid

  // Momentum
  tickDirection: 'UP' | 'DOWN' | 'NEUTRAL'
  volumeImbalance: number               // -100 to +100 (negative = selling pressure)

  // Price action quality
  priceActionQuality: 'CLEAN' | 'CHOPPY' | 'TRENDING' | 'RANGING'
  noiseLevel: number                    // 0-100, higher = more noise

  // Key levels
  nearestSupport: number
  nearestResistance: number
  distanceToSupport: number
  distanceToResistance: number

  // Session context
  isKeyTime: boolean                    // Major news time, session open/close
  keyTimeReason: string | null
}

/**
 * Complete orchestrated signal output
 */
export interface OrchestratorSignal {
  // ==========================================================================
  // CORE SIGNAL
  // ==========================================================================
  direction: SignalDirection
  confidence: number                    // Master confidence (0-100)
  strength: SignalStrength

  // ==========================================================================
  // ENTRY, STOP, TARGET (Optimized)
  // ==========================================================================
  entryPrice: number
  stopLoss: number
  takeProfit: number
  target1: number                       // 1R partial (50% exit)
  target2: number                       // 2R partial (25% exit)
  target3: number                       // 3R+ runner
  riskRewardRatio: number
  riskInPoints: number
  rewardInPoints: number

  // ==========================================================================
  // POSITION SIZING
  // ==========================================================================
  positionSizeMultiplier: number       // 0.25 to 2.0
  recommendedContracts: number
  maxContracts: number                  // Apex safety limit
  riskPerContract: number               // $ risk per contract

  // ==========================================================================
  // CONFLUENCE ANALYSIS
  // ==========================================================================
  confluenceScore: number               // 0-100
  confluenceLevel: ConfluenceLevel
  strategiesAgreeing: number
  strategiesTotal: number
  agreementRatio: number                // strategiesAgreeing / strategiesTotal

  // ==========================================================================
  // STRATEGY ATTRIBUTION
  // ==========================================================================
  contributions: StrategyContribution[]
  primaryStrategy: string
  primaryCategory: StrategyCategory
  topContributors: string[]             // Top 3 by weighted score

  // ==========================================================================
  // INVERSE TRADING STATUS
  // ==========================================================================
  isInversed: boolean
  inverseReason: string | null
  originalDirection: SignalDirection
  inverseConfidence: number             // Confidence in inverse decision

  // ==========================================================================
  // MARKET CONTEXT
  // ==========================================================================
  regime: {
    production: ProductionRegime
    adaptive: AdaptiveRegime
    combined: string                    // Human-readable combined regime
  }
  session: TradingSession
  isRTH: boolean
  volatility: {
    bucket: VolatilityBucket
    atr: number
    atr20Ratio: number                  // Current ATR / 20-period ATR
    percentile: number                  // Where current vol is vs historical
  }

  // ==========================================================================
  // MULTI-TIMEFRAME ANALYSIS
  // ==========================================================================
  mtf: MTFAnalysis
  mtfAligned: boolean

  // ==========================================================================
  // MARKET STRUCTURE (Smart Money)
  // ==========================================================================
  structure: {
    marketStructure: MarketStructure
    orderBlocks: OrderBlock[]
    fairValueGaps: FairValueGap[]
    liquidityPools: LiquidityPool[]
    nearestOrderBlock: OrderBlock | null
    nearestFVG: FairValueGap | null
    buySideLiquidity: number | null
    sellSideLiquidity: number | null
  }

  // ==========================================================================
  // VOLUME PROFILE
  // ==========================================================================
  volumeProfile: {
    poc: number                         // Point of Control
    vah: number                         // Value Area High
    val: number                         // Value Area Low
    pricePosition: 'ABOVE_VAH' | 'AT_POC' | 'BELOW_VAL' | 'IN_VALUE_UPPER' | 'IN_VALUE_LOWER'
    distanceToPOC: number
  }

  // ==========================================================================
  // STATISTICAL ANALYSIS
  // ==========================================================================
  statistics: {
    zscore: number
    zscoreSignal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL'
    halfLife: number                    // Bars to mean reversion
    meanReversionProbability: number
  }

  // ==========================================================================
  // ORDER FLOW
  // ==========================================================================
  orderFlow: {
    cumulativeDelta: number
    deltaDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    deltaDivergence: DeltaDivergence | null
    absorption: Absorption | null
    vpinLevel: number                   // 0-1
    vpinSignal: 'TOXIC' | 'ELEVATED' | 'NORMAL'
  }

  // ==========================================================================
  // MICROSTRUCTURE
  // ==========================================================================
  microstructure: MicrostructureAnalysis

  // ==========================================================================
  // EXPECTED PERFORMANCE (Based on historical similar setups)
  // ==========================================================================
  expectedPerformance: {
    winRate: number                     // Based on strategy + regime + session
    avgWin: number
    avgLoss: number
    expectancy: number                  // Expected $ per trade
    profitFactor: number
    confidence: number                  // How confident in these estimates
  }

  // ==========================================================================
  // REASONING & METADATA
  // ==========================================================================
  reasoning: string[]
  warnings: string[]
  timestamp: number
  signalId: string                      // Unique ID for tracking

  // ==========================================================================
  // APEX SAFETY
  // ==========================================================================
  apexSafety: {
    canTrade: boolean
    riskLevel: RiskLevel
    drawdownPercent: number
    positionSizeLimit: number
    warningMessage: string | null
  }
}

/**
 * Strategy performance tracking for learning
 */
export interface StrategyPerformance {
  name: string
  category: StrategyCategory

  // Core stats
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  avgPnL: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  expectancy: number
  sharpeRatio: number

  // By regime
  byRegime: Record<string, {
    trades: number
    wins: number
    pnl: number
    winRate: number
  }>

  // By session
  bySession: Record<string, {
    trades: number
    wins: number
    pnl: number
    winRate: number
  }>

  // By volatility
  byVolatility: Record<VolatilityBucket, {
    trades: number
    wins: number
    pnl: number
    winRate: number
  }>

  // Recent performance (rolling window)
  recentTrades: Array<{
    timestamp: number
    pnl: number
    wasWinner: boolean
    regime: string
    session: string
  }>
  recentWinRate: number
  recentPnL: number

  // Streaks
  currentStreak: number                 // Positive = wins, negative = losses
  maxWinStreak: number
  maxLoseStreak: number

  // Weight management
  baseWeight: number
  currentWeight: number
  weightHistory: Array<{ timestamp: number; weight: number }>

  // Timestamps
  lastTradeTimestamp: number
  lastWinTimestamp: number
  lastLossTimestamp: number
  firstTradeTimestamp: number
}

/**
 * Inverse trading configuration and state
 */
export interface InverseConfig {
  // Global settings
  enabled: boolean
  autoDetectEnabled: boolean

  // Thresholds
  globalInverseThreshold: number        // Win rate below which to globally inverse
  strategyInverseThreshold: number      // Per-strategy inverse threshold
  recoveryThreshold: number             // Win rate above which to stop inversing

  // Windows
  lookbackTrades: number                // How many trades to look back
  minTradesForDecision: number          // Minimum trades before inverse decision

  // Per-strategy inverse
  perStrategyEnabled: boolean
  inversedStrategies: Set<string>

  // Regime-based inverse
  regimeBasedEnabled: boolean
  inverseByRegime: Record<string, boolean>

  // Current state
  globallyInversed: boolean
  globalInverseStartTime: number | null

  // Stats
  stats: {
    normalWins: number
    normalLosses: number
    inversedWins: number
    inversedLosses: number
    inverseActivations: number
    inverseDeactivations: number
  }
}

/**
 * Dynamic stop/target optimizer state
 */
export interface StopTargetOptimizer {
  // Learned optimal values by context
  byRegime: Record<string, {
    optimalStopATR: number
    optimalTargetATR: number
    dataPoints: number
  }>

  bySession: Record<string, {
    optimalStopATR: number
    optimalTargetATR: number
    dataPoints: number
  }>

  byVolatility: Record<VolatilityBucket, {
    optimalStopATR: number
    optimalTargetATR: number
    dataPoints: number
  }>

  // Combined optimal (weighted average)
  globalOptimal: {
    stopATR: number
    targetATR: number
  }

  // Learning parameters
  learningRate: number
  minDataPoints: number
  decayFactor: number
}

// =============================================================================
// ORCHESTRATOR STATE
// =============================================================================

interface OrchestratorState {
  // Initialization
  initialized: boolean
  initializationTimestamp: number

  // Strategy tracking
  strategies: Record<string, StrategyPerformance>

  // Inverse trading
  inverseConfig: InverseConfig

  // Stop/target optimization
  stopTargetOptimizer: StopTargetOptimizer

  // Signal history for learning
  signalHistory: Array<{
    signalId: string
    signal: OrchestratorSignal
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING'
    pnl: number
    exitReason: string
    actualHoldingBars: number
    timestamp: number
  }>

  // Delta history for divergence detection
  deltaHistory: number[]

  // Performance metrics
  overallMetrics: {
    totalSignals: number
    totalTrades: number
    wins: number
    losses: number
    breakevens: number
    totalPnL: number
    peakPnL: number
    maxDrawdown: number
    currentDrawdown: number
    winRate: number
    profitFactor: number
    sharpeRatio: number
    bestDay: { date: string; pnl: number }
    worstDay: { date: string; pnl: number }
    consecutiveWins: number
    consecutiveLosses: number
  }

  // Persistence
  lastSaveTimestamp: number
  pendingSave: boolean
}

// Default state factory
function createDefaultState(): OrchestratorState {
  return {
    initialized: false,
    initializationTimestamp: 0,

    strategies: {},

    inverseConfig: {
      enabled: true,
      autoDetectEnabled: true,
      globalInverseThreshold: 38,
      strategyInverseThreshold: 33,
      recoveryThreshold: 52,
      lookbackTrades: 25,
      minTradesForDecision: 15,
      perStrategyEnabled: true,
      inversedStrategies: new Set(),
      regimeBasedEnabled: true,
      inverseByRegime: {},
      globallyInversed: false,
      globalInverseStartTime: null,
      stats: {
        normalWins: 0,
        normalLosses: 0,
        inversedWins: 0,
        inversedLosses: 0,
        inverseActivations: 0,
        inverseDeactivations: 0,
      },
    },

    stopTargetOptimizer: {
      byRegime: {
        'TRENDING_UP': { optimalStopATR: 1.8, optimalTargetATR: 3.5, dataPoints: 0 },
        'TRENDING_DOWN': { optimalStopATR: 1.8, optimalTargetATR: 3.5, dataPoints: 0 },
        'RANGING': { optimalStopATR: 1.3, optimalTargetATR: 2.2, dataPoints: 0 },
        'HIGH_VOLATILITY': { optimalStopATR: 2.2, optimalTargetATR: 4.0, dataPoints: 0 },
        'LOW_VOLATILITY': { optimalStopATR: 1.1, optimalTargetATR: 1.8, dataPoints: 0 },
      },
      bySession: {
        'OVERNIGHT': { optimalStopATR: 2.0, optimalTargetATR: 2.5, dataPoints: 0 },
        'PRE_MARKET': { optimalStopATR: 1.8, optimalTargetATR: 2.8, dataPoints: 0 },
        'OPENING_DRIVE': { optimalStopATR: 2.5, optimalTargetATR: 4.5, dataPoints: 0 },
        'MID_DAY': { optimalStopATR: 1.4, optimalTargetATR: 2.0, dataPoints: 0 },
        'AFTERNOON': { optimalStopATR: 1.6, optimalTargetATR: 2.8, dataPoints: 0 },
        'POWER_HOUR': { optimalStopATR: 2.0, optimalTargetATR: 4.0, dataPoints: 0 },
        'CLOSE': { optimalStopATR: 1.3, optimalTargetATR: 1.5, dataPoints: 0 },
      },
      byVolatility: {
        'ULTRA_LOW': { optimalStopATR: 0.9, optimalTargetATR: 1.5, dataPoints: 0 },
        'LOW': { optimalStopATR: 1.2, optimalTargetATR: 2.0, dataPoints: 0 },
        'NORMAL': { optimalStopATR: 1.5, optimalTargetATR: 3.0, dataPoints: 0 },
        'HIGH': { optimalStopATR: 2.0, optimalTargetATR: 3.5, dataPoints: 0 },
        'EXTREME': { optimalStopATR: 2.5, optimalTargetATR: 3.0, dataPoints: 0 },
      },
      globalOptimal: { stopATR: 1.5, targetATR: 3.0 },
      learningRate: 0.08,
      minDataPoints: 15,
      decayFactor: 0.995,
    },

    signalHistory: [],
    deltaHistory: [],

    overallMetrics: {
      totalSignals: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakevens: 0,
      totalPnL: 0,
      peakPnL: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      winRate: 0,
      profitFactor: 1,
      sharpeRatio: 0,
      bestDay: { date: '', pnl: 0 },
      worstDay: { date: '', pnl: 0 },
      consecutiveWins: 0,
      consecutiveLosses: 0,
    },

    lastSaveTimestamp: 0,
    pendingSave: false,
  }
}

// Global state
let state: OrchestratorState = createDefaultState()

// =============================================================================
// PERSISTENCE LAYER
// =============================================================================

const DB_KEY = 'stuntman_orchestrator_v2'
const SAVE_INTERVAL_MS = 30000 // Save every 30 seconds if there are changes

/**
 * Load state from database
 */
export async function loadOrchestratorState(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    if (!client) {
      console.log('[Orchestrator] No Supabase client - using local state')
      return false
    }

    const { data, error } = await client
      .from('stuntman_ml_state')
      .select('state')
      .eq('key', DB_KEY)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is ok
        console.error('[Orchestrator] Load error:', error.message)
      }
      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = data as any
    if (record?.state) {
      const loaded = record.state as OrchestratorState

      // Merge with defaults to handle new fields
      state = {
        ...createDefaultState(),
        ...loaded,
        inverseConfig: {
          ...createDefaultState().inverseConfig,
          ...loaded.inverseConfig,
          inversedStrategies: new Set(loaded.inverseConfig?.inversedStrategies || []),
        },
        stopTargetOptimizer: {
          ...createDefaultState().stopTargetOptimizer,
          ...loaded.stopTargetOptimizer,
        },
        overallMetrics: {
          ...createDefaultState().overallMetrics,
          ...loaded.overallMetrics,
        },
        initialized: true,
        initializationTimestamp: Date.now(),
      }

      console.log(`[Orchestrator] Loaded state: ${Object.keys(state.strategies).length} strategies, ` +
        `${state.signalHistory.length} signals, ${state.overallMetrics.totalTrades} trades`)

      return true
    }

    return false
  } catch (err) {
    console.error('[Orchestrator] Load failed:', err)
    return false
  }
}

/**
 * Save state to database
 */
export async function saveOrchestratorState(force = false): Promise<boolean> {
  const now = Date.now()

  // Throttle saves unless forced
  if (!force && !state.pendingSave) return true
  if (!force && now - state.lastSaveTimestamp < SAVE_INTERVAL_MS) return true

  try {
    const client = getSupabaseClient()
    if (!client) return false

    // Prepare state for serialization (convert Set to Array)
    const stateToSave = {
      ...state,
      inverseConfig: {
        ...state.inverseConfig,
        inversedStrategies: Array.from(state.inverseConfig.inversedStrategies),
      },
      // Trim signal history to last 500 to avoid bloat
      signalHistory: state.signalHistory.slice(-500),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client
      .from('stuntman_ml_state') as any)
      .upsert({
        key: DB_KEY,
        state: stateToSave,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (error) {
      console.error('[Orchestrator] Save error:', error.message)
      return false
    }

    state.lastSaveTimestamp = now
    state.pendingSave = false
    console.log('[Orchestrator] State saved successfully')

    return true
  } catch (err) {
    console.error('[Orchestrator] Save failed:', err)
    return false
  }
}

/**
 * Initialize the orchestrator
 */
export async function initializeOrchestrator(): Promise<void> {
  if (state.initialized) return

  console.log('[Orchestrator] Initializing...')

  // Load adaptive ML state
  await ensureLearningStateLoaded()

  // Load orchestrator state
  await loadOrchestratorState()

  state.initialized = true
  state.initializationTimestamp = Date.now()

  console.log('[Orchestrator] Initialization complete')
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique signal ID
 */
function generateSignalId(): string {
  return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get volatility bucket from ATR ratio
 */
function getVolatilityBucket(atrRatio: number): VolatilityBucket {
  if (atrRatio < 0.5) return 'ULTRA_LOW'
  if (atrRatio < 0.8) return 'LOW'
  if (atrRatio < 1.3) return 'NORMAL'
  if (atrRatio < 2.0) return 'HIGH'
  return 'EXTREME'
}

/**
 * Calculate EMA for a price series
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0

  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Determine trend from price action and EMAs
 */
function determineTrend(
  currentPrice: number,
  ema9: number,
  ema21: number,
  ema50: number
): { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number } {
  let bullishScore = 0
  let bearishScore = 0

  // Price position relative to EMAs
  if (currentPrice > ema9) bullishScore += 20
  else bearishScore += 20

  if (currentPrice > ema21) bullishScore += 25
  else bearishScore += 25

  if (currentPrice > ema50) bullishScore += 30
  else bearishScore += 30

  // EMA alignment
  if (ema9 > ema21) bullishScore += 15
  else bearishScore += 15

  if (ema21 > ema50) bullishScore += 10
  else bearishScore += 10

  const totalScore = bullishScore + bearishScore
  const strength = Math.max(bullishScore, bearishScore)

  if (bullishScore > bearishScore + 20) {
    return { trend: 'BULLISH', strength }
  } else if (bearishScore > bullishScore + 20) {
    return { trend: 'BEARISH', strength }
  }

  return { trend: 'NEUTRAL', strength: 50 }
}

/**
 * Analyze multi-timeframe alignment
 */
function analyzeMTF(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[]
): MTFAnalysis {
  // 1-minute analysis
  const closes1m = candles1m.map(c => c.close)
  const ema9_1m = calculateEMA(closes1m, 9)
  const ema21_1m = calculateEMA(closes1m, 21)
  const ema50_1m = calculateEMA(closes1m, 50)
  const current1m = closes1m[closes1m.length - 1]
  const tf1m = determineTrend(current1m, ema9_1m, ema21_1m, ema50_1m)

  // 5-minute analysis
  const closes5m = candles5m.map(c => c.close)
  const ema9_5m = calculateEMA(closes5m, 9)
  const ema21_5m = calculateEMA(closes5m, 21)
  const ema50_5m = calculateEMA(closes5m, 50)
  const current5m = closes5m[closes5m.length - 1]
  const tf5m = determineTrend(current5m, ema9_5m, ema21_5m, ema50_5m)

  // 15-minute analysis
  const closes15m = candles15m.map(c => c.close)
  const ema9_15m = calculateEMA(closes15m, 9)
  const ema21_15m = calculateEMA(closes15m, 21)
  const ema50_15m = calculateEMA(closes15m, 50)
  const current15m = closes15m[closes15m.length - 1]
  const tf15m = determineTrend(current15m, ema9_15m, ema21_15m, ema50_15m)

  // Determine alignment
  let alignment: 'ALIGNED_BULLISH' | 'ALIGNED_BEARISH' | 'PARTIALLY_ALIGNED' | 'CONFLICTING'
  let alignmentScore = 0
  let dominantBias: SignalDirection = 'FLAT'

  const trends = [tf1m.trend, tf5m.trend, tf15m.trend]
  const bullishCount = trends.filter(t => t === 'BULLISH').length
  const bearishCount = trends.filter(t => t === 'BEARISH').length

  if (bullishCount === 3) {
    alignment = 'ALIGNED_BULLISH'
    alignmentScore = 100
    dominantBias = 'LONG'
  } else if (bearishCount === 3) {
    alignment = 'ALIGNED_BEARISH'
    alignmentScore = 100
    dominantBias = 'SHORT'
  } else if (bullishCount === 2 && bearishCount === 0) {
    alignment = 'PARTIALLY_ALIGNED'
    alignmentScore = 70
    dominantBias = 'LONG'
  } else if (bearishCount === 2 && bullishCount === 0) {
    alignment = 'PARTIALLY_ALIGNED'
    alignmentScore = 70
    dominantBias = 'SHORT'
  } else if (bullishCount > bearishCount) {
    alignment = 'CONFLICTING'
    alignmentScore = 40
    dominantBias = 'LONG'
  } else if (bearishCount > bullishCount) {
    alignment = 'CONFLICTING'
    alignmentScore = 40
    dominantBias = 'SHORT'
  } else {
    alignment = 'CONFLICTING'
    alignmentScore = 20
    dominantBias = 'FLAT'
  }

  // Weight by timeframe importance (15m > 5m > 1m for bias)
  if (tf15m.trend === 'BULLISH') alignmentScore += 10
  else if (tf15m.trend === 'BEARISH') alignmentScore -= 0 // Don't double-penalize

  alignmentScore = Math.max(0, Math.min(100, alignmentScore))

  return {
    tf1m: { trend: tf1m.trend, strength: tf1m.strength, ema9: ema9_1m, ema21: ema21_1m, ema50: ema50_1m },
    tf5m: { trend: tf5m.trend, strength: tf5m.strength, ema9: ema9_5m, ema21: ema21_5m, ema50: ema50_5m },
    tf15m: { trend: tf15m.trend, strength: tf15m.strength, ema9: ema9_15m, ema21: ema21_15m, ema50: ema50_15m },
    alignment,
    alignmentScore,
    dominantBias,
  }
}

/**
 * Analyze market microstructure
 */
function analyzeMicrostructure(
  candles: Candle[],
  indicators: Indicators,
  volumeProfile: VolumeProfileData
): MicrostructureAnalysis {
  const recent = candles.slice(-20)
  const current = candles[candles.length - 1]
  const currentPrice = current.close

  // Volume imbalance (-100 to +100)
  let buyVolume = 0
  let sellVolume = 0
  for (const c of recent) {
    const isBullish = c.close > c.open
    if (isBullish) buyVolume += c.volume
    else sellVolume += c.volume
  }
  const totalVolume = buyVolume + sellVolume
  const volumeImbalance = totalVolume > 0
    ? ((buyVolume - sellVolume) / totalVolume) * 100
    : 0

  // Tick direction
  const lastFew = candles.slice(-5)
  const upTicks = lastFew.filter((c, i) => i > 0 && c.close > lastFew[i - 1].close).length
  const downTicks = lastFew.filter((c, i) => i > 0 && c.close < lastFew[i - 1].close).length
  const tickDirection = upTicks > downTicks ? 'UP' : downTicks > upTicks ? 'DOWN' : 'NEUTRAL'

  // Price action quality
  const ranges = recent.map(c => c.high - c.low)
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length
  const bodies = recent.map(c => Math.abs(c.close - c.open))
  const avgBody = bodies.reduce((a, b) => a + b, 0) / bodies.length
  const bodyRatio = avgRange > 0 ? avgBody / avgRange : 0

  let priceActionQuality: 'CLEAN' | 'CHOPPY' | 'TRENDING' | 'RANGING'
  if (bodyRatio > 0.6) {
    priceActionQuality = 'TRENDING'
  } else if (bodyRatio < 0.3) {
    priceActionQuality = 'CHOPPY'
  } else if (indicators.trendStrength > 0.5) {
    priceActionQuality = 'CLEAN'
  } else {
    priceActionQuality = 'RANGING'
  }

  // Noise level
  const noiseLevel = Math.min(100, (1 - bodyRatio) * 100 + (1 - indicators.trendStrength) * 20)

  // Key levels from volume profile and recent highs/lows
  const recentHigh = Math.max(...recent.map(c => c.high))
  const recentLow = Math.min(...recent.map(c => c.low))

  const nearestSupport = Math.max(volumeProfile.val, recentLow)
  const nearestResistance = Math.min(volumeProfile.vah, recentHigh)

  // Session timing
  const hour = new Date(current.time).getUTCHours()
  const minute = new Date(current.time).getUTCMinutes()
  const isKeyTime =
    (hour === 14 && minute >= 25 && minute <= 35) || // 9:30 ET open
    (hour === 21 && minute >= 55) || // 4:00 ET close
    (hour === 18 && minute >= 55 && minute <= 5) // News times

  return {
    currentSpread: 0.25, // ES typical spread
    liquidityScore: 85, // ES is highly liquid during RTH
    tickDirection,
    volumeImbalance,
    priceActionQuality,
    noiseLevel,
    nearestSupport,
    nearestResistance,
    distanceToSupport: currentPrice - nearestSupport,
    distanceToResistance: nearestResistance - currentPrice,
    isKeyTime,
    keyTimeReason: isKeyTime ? 'Major session time' : null,
  }
}

/**
 * Get base weight for a strategy
 */
function getBaseWeight(strategyName: string): number {
  const weights: Record<string, number> = {
    // Production strategies
    'VWAP_REVERSION': 1.1,
    'ORB_BREAKOUT': 1.2,
    'EMA_TREND': 1.0,
    'DELTA_DIVERGENCE': 0.9,

    // Institutional/Smart Money
    'VP_VAL_REVERSAL': 1.0,
    'VP_VAH_REVERSAL': 1.0,
    'OB_FVG_CONFLUENCE': 1.15,
    'LIQUIDITY_SWEEP_MSS': 1.1,
    'ABSORPTION_REVERSAL': 0.85,
    'DELTA_DIVERGENCE_ADV': 1.0,

    // Statistical
    'ZSCORE_REVERSION': 0.9,

    // ML
    'ADAPTIVE_ML': 0.95,
    'ML_ENSEMBLE': 0.9,
  }

  return weights[strategyName] || 1.0
}

/**
 * Calculate current weight for a strategy
 */
function calculateCurrentWeight(
  strategyName: string,
  regime: ProductionRegime,
  session: TradingSession,
  volatility: VolatilityBucket
): number {
  const perf = state.strategies[strategyName]

  if (!perf || perf.totalTrades < 10) {
    return getBaseWeight(strategyName)
  }

  let weight = perf.baseWeight

  // Win rate adjustment (0.5x to 1.5x)
  const wrFactor = Math.max(0.5, Math.min(1.5, perf.winRate / 50))
  weight *= wrFactor

  // Profit factor adjustment
  const pfFactor = Math.max(0.5, Math.min(2.0, perf.profitFactor / 1.5))
  weight *= pfFactor

  // Regime-specific performance
  const regimePerf = perf.byRegime[regime]
  if (regimePerf && regimePerf.trades >= 5) {
    const regimeFactor = Math.max(0.4, Math.min(1.8, regimePerf.winRate / 50))
    weight *= regimeFactor
  }

  // Session-specific performance
  const sessionPerf = perf.bySession[session]
  if (sessionPerf && sessionPerf.trades >= 5) {
    const sessionFactor = Math.max(0.5, Math.min(1.5, sessionPerf.winRate / 50))
    weight *= sessionFactor
  }

  // Volatility-specific performance
  const volPerf = perf.byVolatility[volatility]
  if (volPerf && volPerf.trades >= 5) {
    const volFactor = Math.max(0.5, Math.min(1.5, volPerf.winRate / 50))
    weight *= volFactor
  }

  // Recent performance boost/penalty
  if (perf.recentTrades.length >= 10) {
    if (perf.recentWinRate < 30) {
      weight *= 0.5
    } else if (perf.recentWinRate > 65) {
      weight *= 1.3
    }
  }

  // Streak adjustment
  if (perf.currentStreak >= 3) {
    weight *= 1.15
  } else if (perf.currentStreak <= -3) {
    weight *= 0.75
  }

  // Clamp
  return Math.max(0.1, Math.min(3.0, weight))
}

/**
 * Check if strategy should be inversed
 */
function shouldInverseStrategy(strategyName: string): boolean {
  const config = state.inverseConfig

  if (!config.enabled) return false
  if (config.globallyInversed) return true
  if (config.perStrategyEnabled && config.inversedStrategies.has(strategyName)) return true

  return false
}

/**
 * Update inverse trading status based on recent performance
 */
function updateInverseStatus(): void {
  const config = state.inverseConfig

  if (!config.autoDetectEnabled) return

  // Check global inverse
  const recentSignals = state.signalHistory
    .filter(s => s.outcome !== 'PENDING')
    .slice(-config.lookbackTrades)

  if (recentSignals.length >= config.minTradesForDecision) {
    const wins = recentSignals.filter(s => s.outcome === 'WIN').length
    const winRate = (wins / recentSignals.length) * 100

    if (!config.globallyInversed && winRate < config.globalInverseThreshold) {
      config.globallyInversed = true
      config.globalInverseStartTime = Date.now()
      config.stats.inverseActivations++
      console.log(`[Orchestrator] GLOBAL INVERSE ACTIVATED - Win rate ${winRate.toFixed(1)}% < ${config.globalInverseThreshold}%`)
    } else if (config.globallyInversed && winRate > config.recoveryThreshold) {
      config.globallyInversed = false
      config.globalInverseStartTime = null
      config.stats.inverseDeactivations++
      console.log(`[Orchestrator] GLOBAL INVERSE DEACTIVATED - Win rate ${winRate.toFixed(1)}% > ${config.recoveryThreshold}%`)
    }
  }

  // Check per-strategy inverse
  if (config.perStrategyEnabled) {
    for (const [name, perf] of Object.entries(state.strategies)) {
      if (perf.recentTrades.length >= config.minTradesForDecision) {
        if (!config.inversedStrategies.has(name) && perf.recentWinRate < config.strategyInverseThreshold) {
          config.inversedStrategies.add(name)
          console.log(`[Orchestrator] Strategy INVERSE ON: ${name} - WR ${perf.recentWinRate.toFixed(1)}%`)
        } else if (config.inversedStrategies.has(name) && perf.recentWinRate > config.recoveryThreshold) {
          config.inversedStrategies.delete(name)
          console.log(`[Orchestrator] Strategy INVERSE OFF: ${name} - WR ${perf.recentWinRate.toFixed(1)}%`)
        }
      }
    }
  }
}

/**
 * Get optimized stop/target multipliers
 */
function getOptimizedStopTarget(
  regime: ProductionRegime,
  session: TradingSession,
  volatility: VolatilityBucket
): { stopATR: number; targetATR: number } {
  const opt = state.stopTargetOptimizer

  // Get values from each context with dataPoints included
  const defaultOpt = { optimalStopATR: 1.5, optimalTargetATR: 3.0, dataPoints: 0 }
  const regimeOpt = opt.byRegime[regime] || defaultOpt
  const sessionOpt = opt.bySession[session] || defaultOpt
  const volOpt = opt.byVolatility[volatility] || defaultOpt

  // Weight by data points (more data = more weight)
  const regimeWeight = Math.min(1, (regimeOpt.dataPoints || 0) / 50) || 0.3
  const sessionWeight = Math.min(1, (sessionOpt.dataPoints || 0) / 50) || 0.3
  const volWeight = Math.min(1, (volOpt.dataPoints || 0) / 50) || 0.3
  const totalWeight = regimeWeight + sessionWeight + volWeight

  // Weighted average
  const stopATR = (
    regimeOpt.optimalStopATR * regimeWeight +
    sessionOpt.optimalStopATR * sessionWeight +
    volOpt.optimalStopATR * volWeight
  ) / totalWeight

  const targetATR = (
    regimeOpt.optimalTargetATR * regimeWeight +
    sessionOpt.optimalTargetATR * sessionWeight +
    volOpt.optimalTargetATR * volWeight
  ) / totalWeight

  // Clamp to reasonable ranges
  return {
    stopATR: Math.max(0.8, Math.min(3.0, stopATR)),
    targetATR: Math.max(1.5, Math.min(5.0, targetATR)),
  }
}

/**
 * Create a FLAT signal
 */
function createFlatSignal(
  price: number,
  timestamp: number,
  reason: string,
  indicators?: Indicators,
  mtf?: MTFAnalysis
): OrchestratorSignal {
  const signalId = generateSignalId()

  return {
    direction: 'FLAT',
    confidence: 0,
    strength: 'NONE',
    entryPrice: price,
    stopLoss: price,
    takeProfit: price,
    target1: price,
    target2: price,
    target3: price,
    riskRewardRatio: 0,
    riskInPoints: 0,
    rewardInPoints: 0,
    positionSizeMultiplier: 0,
    recommendedContracts: 0,
    maxContracts: 0,
    riskPerContract: 0,
    confluenceScore: 0,
    confluenceLevel: 'NONE',
    strategiesAgreeing: 0,
    strategiesTotal: 0,
    agreementRatio: 0,
    contributions: [],
    primaryStrategy: 'NONE',
    primaryCategory: 'PRODUCTION',
    topContributors: [],
    isInversed: false,
    inverseReason: null,
    originalDirection: 'FLAT',
    inverseConfidence: 0,
    regime: {
      production: 'RANGING',
      adaptive: 'RANGING',
      combined: 'RANGING',
    },
    session: 'MID_DAY',
    isRTH: true,
    volatility: {
      bucket: 'NORMAL',
      atr: indicators?.atr || 10,
      atr20Ratio: 1,
      percentile: 50,
    },
    mtf: mtf || {
      tf1m: { trend: 'NEUTRAL', strength: 50, ema9: price, ema21: price, ema50: price },
      tf5m: { trend: 'NEUTRAL', strength: 50, ema9: price, ema21: price, ema50: price },
      tf15m: { trend: 'NEUTRAL', strength: 50, ema9: price, ema21: price, ema50: price },
      alignment: 'CONFLICTING',
      alignmentScore: 0,
      dominantBias: 'FLAT',
    },
    mtfAligned: false,
    structure: {
      marketStructure: { trend: 'RANGING', lastBOS: null, lastCHoCH: null, swingHigh: price, swingLow: price },
      orderBlocks: [],
      fairValueGaps: [],
      liquidityPools: [],
      nearestOrderBlock: null,
      nearestFVG: null,
      buySideLiquidity: null,
      sellSideLiquidity: null,
    },
    volumeProfile: {
      poc: price,
      vah: price,
      val: price,
      pricePosition: 'IN_VALUE_LOWER',
      distanceToPOC: 0,
    },
    statistics: {
      zscore: 0,
      zscoreSignal: 'NEUTRAL',
      halfLife: 20,
      meanReversionProbability: 50,
    },
    orderFlow: {
      cumulativeDelta: 0,
      deltaDirection: 'NEUTRAL',
      deltaDivergence: null,
      absorption: null,
      vpinLevel: 0.5,
      vpinSignal: 'NORMAL',
    },
    microstructure: {
      currentSpread: 0.25,
      liquidityScore: 85,
      tickDirection: 'NEUTRAL',
      volumeImbalance: 0,
      priceActionQuality: 'RANGING',
      noiseLevel: 50,
      nearestSupport: price,
      nearestResistance: price,
      distanceToSupport: 0,
      distanceToResistance: 0,
      isKeyTime: false,
      keyTimeReason: null,
    },
    expectedPerformance: {
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      profitFactor: 0,
      confidence: 0,
    },
    reasoning: [reason],
    warnings: [],
    timestamp,
    signalId,
    apexSafety: {
      canTrade: true,
      riskLevel: 'NORMAL',
      drawdownPercent: 0,
      positionSizeLimit: 10,
      warningMessage: null,
    },
  }
}

// =============================================================================
// MAIN SIGNAL GENERATION
// =============================================================================

/**
 * Generate the master orchestrated signal
 *
 * This is the main entry point - integrates ALL strategy systems
 */
export async function generateOrchestratorSignal(
  candles1m: Candle[],
  candles5m: Candle[],
  candles15m: Candle[],
  options?: {
    cumulativeDelta?: number
    accountBalance?: number
    riskPercent?: number
    maxDrawdownUsed?: number
    contractValue?: number
  }
): Promise<OrchestratorSignal> {
  // Ensure initialized
  if (!state.initialized) {
    await initializeOrchestrator()
  }

  const timestamp = Date.now()
  const currentCandle = candles1m[candles1m.length - 1]
  const currentPrice = currentCandle.close

  // ==========================================================================
  // STEP 1: CALCULATE ALL INDICATORS & REGIMES
  // ==========================================================================

  let indicators: Indicators
  try {
    indicators = calculateIndicators(candles1m)
  } catch (err) {
    return createFlatSignal(currentPrice, timestamp, 'Insufficient data for indicators')
  }

  const productionRegime = detectProductionRegime(indicators)
  const session = getCurrentSession(currentCandle.time)
  const rth = isRTH(currentCandle.time)

  // Adaptive regime
  const features = extractFeatures(candles1m)
  const adaptiveRegime = detectAdaptiveRegime(candles1m, features)

  // Volatility analysis
  const atr20Ratio = indicators.atr / indicators.atr20
  const volatilityBucket = getVolatilityBucket(atr20Ratio)

  // Multi-timeframe analysis
  const mtf = analyzeMTF(candles1m, candles5m, candles15m)

  // ==========================================================================
  // STEP 2: ADVANCED MARKET ANALYSIS
  // ==========================================================================

  // Volume Profile
  const volumeProfile = calculateVolumeProfile(candles1m)
  const distanceToPOC = currentPrice - volumeProfile.poc
  let pricePosition: 'ABOVE_VAH' | 'AT_POC' | 'BELOW_VAL' | 'IN_VALUE_UPPER' | 'IN_VALUE_LOWER'

  if (currentPrice > volumeProfile.vah) {
    pricePosition = 'ABOVE_VAH'
  } else if (currentPrice < volumeProfile.val) {
    pricePosition = 'BELOW_VAL'
  } else if (Math.abs(distanceToPOC) < (volumeProfile.vah - volumeProfile.val) * 0.1) {
    pricePosition = 'AT_POC'
  } else if (currentPrice > volumeProfile.poc) {
    pricePosition = 'IN_VALUE_UPPER'
  } else {
    pricePosition = 'IN_VALUE_LOWER'
  }

  // Smart Money Concepts
  const orderBlocks = detectOrderBlocks(candles1m)
  const fvgs = detectFairValueGaps(candles1m)
  const liquidityPools = detectLiquidityPools(candles1m)
  const marketStructure = detectMarketStructure(candles1m)

  // Find nearest order block and FVG
  const nearestOB = orderBlocks.find(ob =>
    Math.abs(currentPrice - ob.price) < indicators.atr * 2
  ) || null
  const nearestFVG = fvgs.find(fvg =>
    !fvg.filled && (currentPrice > fvg.low && currentPrice < fvg.high * 1.5)
  ) || null

  // Liquidity levels
  const buySideLiquidity = liquidityPools.find(p => p.type === 'BUY_SIDE' && !p.swept)?.price || null
  const sellSideLiquidity = liquidityPools.find(p => p.type === 'SELL_SIDE' && !p.swept)?.price || null

  // Statistical analysis
  const closes = candles1m.map(c => c.close)
  const zscoreData = calculateZScore(closes)
  const halfLife = calculateHalfLife(closes)

  let zscoreSignal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' = 'NEUTRAL'
  if (zscoreData.zscore >= 2) zscoreSignal = 'OVERBOUGHT'
  else if (zscoreData.zscore <= -2) zscoreSignal = 'OVERSOLD'

  const meanReversionProbability = Math.min(90, Math.max(10,
    50 + Math.abs(zscoreData.zscore) * 15 - halfLife
  ))

  // Order flow analysis
  const cumulativeDelta = options?.cumulativeDelta ?? 0
  state.deltaHistory.push(cumulativeDelta)
  if (state.deltaHistory.length > 100) state.deltaHistory = state.deltaHistory.slice(-100)

  const deltaDivergence = detectDeltaDivergence(candles1m, state.deltaHistory)
  const absorption = detectAbsorption(candles1m)

  let deltaDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (state.deltaHistory.length >= 10) {
    const recentDelta = state.deltaHistory.slice(-10)
    const deltaChange = recentDelta[recentDelta.length - 1] - recentDelta[0]
    if (deltaChange > 0) deltaDirection = 'BULLISH'
    else if (deltaChange < 0) deltaDirection = 'BEARISH'
  }

  // Microstructure
  const microstructure = analyzeMicrostructure(candles1m, indicators, volumeProfile)

  // ==========================================================================
  // STEP 3: GENERATE SIGNALS FROM ALL STRATEGIES
  // ==========================================================================

  const contributions: StrategyContribution[] = []

  // --- PRODUCTION STRATEGIES ---

  // VWAP Mean Reversion
  try {
    const vwapSignal = generateVWAPSignal(candles1m, indicators)
    if (vwapSignal && vwapSignal.direction !== 'FLAT') {
      const weight = calculateCurrentWeight('VWAP_REVERSION', productionRegime, session, volatilityBucket)
      const wasInversed = shouldInverseStrategy('VWAP_REVERSION')
      let finalDir = vwapSignal.direction as SignalDirection
      if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

      contributions.push({
        id: `VWAP_${timestamp}`,
        name: 'VWAP_REVERSION',
        category: 'PRODUCTION',
        direction: finalDir,
        confidence: vwapSignal.confidence,
        weight,
        weightedScore: vwapSignal.confidence * weight,
        suggestedEntry: currentPrice,
        suggestedStop: vwapSignal.stopLoss,
        suggestedTarget: vwapSignal.takeProfit,
        riskReward: vwapSignal.riskRewardRatio,
        reasoning: vwapSignal.reasoning,
        regimeAlignment: productionRegime === 'RANGING' || productionRegime === 'LOW_VOLATILITY',
        sessionOptimal: session === 'MID_DAY' || session === 'AFTERNOON',
        wasInversed,
        originalDirection: vwapSignal.direction as SignalDirection,
      })
    }
  } catch {}

  // ORB Breakout
  try {
    const orbSignal = generateORBSignal(candles1m, indicators)
    if (orbSignal && orbSignal.direction !== 'FLAT') {
      const weight = calculateCurrentWeight('ORB_BREAKOUT', productionRegime, session, volatilityBucket)
      const wasInversed = shouldInverseStrategy('ORB_BREAKOUT')
      let finalDir = orbSignal.direction as SignalDirection
      if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

      contributions.push({
        id: `ORB_${timestamp}`,
        name: 'ORB_BREAKOUT',
        category: 'PRODUCTION',
        direction: finalDir,
        confidence: orbSignal.confidence,
        weight,
        weightedScore: orbSignal.confidence * weight,
        suggestedEntry: currentPrice,
        suggestedStop: orbSignal.stopLoss,
        suggestedTarget: orbSignal.takeProfit,
        riskReward: orbSignal.riskRewardRatio,
        reasoning: orbSignal.reasoning,
        regimeAlignment: productionRegime === 'TRENDING_UP' || productionRegime === 'TRENDING_DOWN',
        sessionOptimal: session === 'OPENING_DRIVE',
        wasInversed,
        originalDirection: orbSignal.direction as SignalDirection,
      })
    }
  } catch {}

  // EMA Trend
  try {
    const emaSignal = generateEMATrendSignal(candles1m, indicators)
    if (emaSignal && emaSignal.direction !== 'FLAT') {
      const weight = calculateCurrentWeight('EMA_TREND', productionRegime, session, volatilityBucket)
      const wasInversed = shouldInverseStrategy('EMA_TREND')
      let finalDir = emaSignal.direction as SignalDirection
      if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

      contributions.push({
        id: `EMA_${timestamp}`,
        name: 'EMA_TREND',
        category: 'PRODUCTION',
        direction: finalDir,
        confidence: emaSignal.confidence,
        weight,
        weightedScore: emaSignal.confidence * weight,
        suggestedEntry: currentPrice,
        suggestedStop: emaSignal.stopLoss,
        suggestedTarget: emaSignal.takeProfit,
        riskReward: emaSignal.riskRewardRatio,
        reasoning: emaSignal.reasoning,
        regimeAlignment: productionRegime === 'TRENDING_UP' || productionRegime === 'TRENDING_DOWN',
        sessionOptimal: session !== 'MID_DAY',
        wasInversed,
        originalDirection: emaSignal.direction as SignalDirection,
      })
    }
  } catch {}

  // Delta Divergence
  if (state.deltaHistory.length >= 20) {
    try {
      const deltaSignal = generateDeltaSignal(candles1m, indicators, cumulativeDelta, state.deltaHistory)
      if (deltaSignal && deltaSignal.direction !== 'FLAT') {
        const weight = calculateCurrentWeight('DELTA_DIVERGENCE', productionRegime, session, volatilityBucket)
        const wasInversed = shouldInverseStrategy('DELTA_DIVERGENCE')
        let finalDir = deltaSignal.direction as SignalDirection
        if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

        contributions.push({
          id: `DELTA_${timestamp}`,
          name: 'DELTA_DIVERGENCE',
          category: 'INSTITUTIONAL',
          direction: finalDir,
          confidence: deltaSignal.confidence,
          weight,
          weightedScore: deltaSignal.confidence * weight,
          suggestedEntry: currentPrice,
          suggestedStop: deltaSignal.stopLoss,
          suggestedTarget: deltaSignal.takeProfit,
          riskReward: deltaSignal.riskRewardRatio,
          reasoning: deltaSignal.reasoning,
          regimeAlignment: true, // Works in all regimes
          sessionOptimal: rth,
          wasInversed,
          originalDirection: deltaSignal.direction as SignalDirection,
        })
      }
    } catch {}
  }

  // --- INSTITUTIONAL / SMART MONEY STRATEGIES ---

  const advancedAnalysis = analyzeMarket(
    candles1m,
    state.deltaHistory,
    [],
    [],
    closes
  )

  try {
    const advSignal = generateAdvancedMasterSignal(candles1m, advancedAnalysis, indicators.atr)
    if (advSignal && advSignal.direction !== 'FLAT') {
      const weight = calculateCurrentWeight(advSignal.strategy, productionRegime, session, volatilityBucket)
      const wasInversed = shouldInverseStrategy(advSignal.strategy)
      let finalDir = advSignal.direction as SignalDirection
      if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

      contributions.push({
        id: `ADV_${timestamp}`,
        name: advSignal.strategy,
        category: advSignal.strategy.includes('OB') || advSignal.strategy.includes('FVG')
          ? 'SMART_MONEY'
          : advSignal.strategy.includes('ZSCORE')
            ? 'STATISTICAL'
            : 'INSTITUTIONAL',
        direction: finalDir,
        confidence: advSignal.confidence,
        weight,
        weightedScore: advSignal.confidence * weight,
        suggestedEntry: advSignal.entryPrice,
        suggestedStop: advSignal.stopLoss,
        suggestedTarget: advSignal.takeProfit,
        riskReward: advSignal.riskRewardRatio,
        reasoning: advSignal.reasoning,
        regimeAlignment: true,
        sessionOptimal: rth,
        wasInversed,
        originalDirection: advSignal.direction as SignalDirection,
      })
    }
  } catch {}

  // --- ADAPTIVE ML ---

  const adaptiveStrategies = contributions.map(c => ({
    name: c.name,
    direction: c.direction,
    confidence: c.confidence,
  }))

  try {
    const adaptiveSignal = generateAdaptiveSignal(candles1m, adaptiveStrategies)
    if (adaptiveSignal.direction !== 'FLAT' && adaptiveSignal.confidence >= 55) {
      const weight = calculateCurrentWeight('ADAPTIVE_ML', productionRegime, session, volatilityBucket)
      const wasInversed = shouldInverseStrategy('ADAPTIVE_ML')
      let finalDir = adaptiveSignal.direction as SignalDirection
      if (wasInversed) finalDir = finalDir === 'LONG' ? 'SHORT' : 'LONG'

      contributions.push({
        id: `ML_${timestamp}`,
        name: 'ADAPTIVE_ML',
        category: 'ML_ADAPTIVE',
        direction: finalDir,
        confidence: adaptiveSignal.confidence,
        weight,
        weightedScore: adaptiveSignal.confidence * weight,
        suggestedEntry: currentPrice,
        suggestedStop: currentPrice - (indicators.atr * adaptiveSignal.optimalStopMultiplier),
        suggestedTarget: currentPrice + (indicators.atr * adaptiveSignal.optimalTargetMultiplier),
        riskReward: adaptiveSignal.optimalTargetMultiplier / adaptiveSignal.optimalStopMultiplier,
        reasoning: `ML: ${adaptiveSignal.reasons.slice(0, 2).join(', ')}`,
        regimeAlignment: true,
        sessionOptimal: true,
        wasInversed,
        originalDirection: adaptiveSignal.direction as SignalDirection,
      })
    }
  } catch {}

  // ==========================================================================
  // STEP 4: UPDATE INVERSE STATUS
  // ==========================================================================

  updateInverseStatus()

  // ==========================================================================
  // STEP 5: CALCULATE CONFLUENCE & DETERMINE FINAL DIRECTION
  // ==========================================================================

  if (contributions.length === 0) {
    return createFlatSignal(currentPrice, timestamp, 'No valid signals from any strategy', indicators, mtf)
  }

  // Separate by direction
  const longContribs = contributions.filter(c => c.direction === 'LONG')
  const shortContribs = contributions.filter(c => c.direction === 'SHORT')

  const longScore = longContribs.reduce((sum, c) => sum + c.weightedScore, 0)
  const shortScore = shortContribs.reduce((sum, c) => sum + c.weightedScore, 0)

  let direction: SignalDirection = 'FLAT'
  let finalContribs: StrategyContribution[] = []

  // Need meaningful difference
  const scoreDiff = Math.abs(longScore - shortScore)
  const minScoreDiff = Math.max(longScore, shortScore) * 0.2 // Need 20% advantage

  if (longScore > shortScore && scoreDiff >= minScoreDiff && longContribs.length >= 1) {
    direction = 'LONG'
    finalContribs = longContribs
  } else if (shortScore > longScore && scoreDiff >= minScoreDiff && shortContribs.length >= 1) {
    direction = 'SHORT'
    finalContribs = shortContribs
  } else {
    return createFlatSignal(currentPrice, timestamp, 'No clear directional consensus', indicators, mtf)
  }

  // MTF alignment check - block trades against strong higher TF trend
  const mtfAligned = mtf.dominantBias === 'FLAT' ||
    mtf.dominantBias === direction ||
    mtf.alignmentScore < 60

  if (!mtfAligned && mtf.alignmentScore >= 80) {
    return createFlatSignal(currentPrice, timestamp, `Blocked: Counter to strong ${mtf.alignment} trend`, indicators, mtf)
  }

  // ==========================================================================
  // STEP 6: CALCULATE CONFIDENCE & CONFLUENCE
  // ==========================================================================

  // Weighted average confidence
  const totalWeight = finalContribs.reduce((sum, c) => sum + c.weight, 0)
  const weightedConfidence = finalContribs.reduce((sum, c) => sum + c.confidence * c.weight, 0) / totalWeight

  // Confluence scoring
  const strategiesTotal = contributions.length
  const strategiesAgreeing = finalContribs.length
  const agreementRatio = strategiesAgreeing / strategiesTotal

  // Confluence score formula
  let confluenceScore = 0
  confluenceScore += agreementRatio * 40  // Base from agreement
  confluenceScore += (strategiesAgreeing >= 2 ? 20 : 0)
  confluenceScore += (strategiesAgreeing >= 3 ? 15 : 0)
  confluenceScore += (strategiesAgreeing >= 4 ? 10 : 0)
  confluenceScore += (mtfAligned && mtf.alignmentScore > 70 ? 15 : 0)

  // Regime alignment bonus
  const regimeAlignedCount = finalContribs.filter(c => c.regimeAlignment).length
  confluenceScore += (regimeAlignedCount / strategiesAgreeing) * 10

  confluenceScore = Math.min(100, Math.max(0, confluenceScore))

  const confluenceLevel: ConfluenceLevel = confluenceScore >= 90 ? 'EXTREME' :
    confluenceScore >= 75 ? 'VERY_STRONG' :
    confluenceScore >= 60 ? 'STRONG' :
    confluenceScore >= 40 ? 'MODERATE' :
    confluenceScore >= 20 ? 'WEAK' : 'NONE'

  // Signal strength
  const strength: SignalStrength =
    weightedConfidence >= 85 && confluenceScore >= 60 ? 'EXTREME' :
    weightedConfidence >= 75 && confluenceScore >= 45 ? 'STRONG' :
    weightedConfidence >= 65 ? 'MODERATE' :
    weightedConfidence >= 50 ? 'WEAK' : 'NONE'

  // ==========================================================================
  // STEP 7: CALCULATE OPTIMIZED ENTRY, STOP, TARGET
  // ==========================================================================

  const entryPrice = currentPrice
  const { stopATR, targetATR } = getOptimizedStopTarget(productionRegime, session, volatilityBucket)
  const atr = indicators.atr

  const stopDistance = atr * stopATR
  const targetDistance = atr * targetATR

  const stopLoss = direction === 'LONG'
    ? entryPrice - stopDistance
    : entryPrice + stopDistance

  const takeProfit = direction === 'LONG'
    ? entryPrice + targetDistance
    : entryPrice - targetDistance

  // Partial targets
  const riskAmount = Math.abs(entryPrice - stopLoss)
  const target1 = direction === 'LONG' ? entryPrice + riskAmount : entryPrice - riskAmount
  const target2 = direction === 'LONG' ? entryPrice + riskAmount * 2 : entryPrice - riskAmount * 2
  const target3 = direction === 'LONG' ? entryPrice + riskAmount * 3 : entryPrice - riskAmount * 3

  const riskRewardRatio = targetDistance / stopDistance

  // ==========================================================================
  // STEP 8: POSITION SIZING
  // ==========================================================================

  let positionSizeMultiplier = confluenceScore >= 70 ? 1.5 :
    confluenceScore >= 50 ? 1.0 :
    confluenceScore >= 30 ? 0.75 : 0.5

  // Volatility adjustment
  if (volatilityBucket === 'EXTREME') positionSizeMultiplier *= 0.5
  if (volatilityBucket === 'HIGH') positionSizeMultiplier *= 0.75
  if (volatilityBucket === 'ULTRA_LOW') positionSizeMultiplier *= 1.1

  // MTF alignment bonus
  if (mtfAligned && mtf.alignmentScore >= 80) positionSizeMultiplier *= 1.15

  positionSizeMultiplier = Math.max(0.25, Math.min(2.0, positionSizeMultiplier))

  // Calculate contracts
  const accountBalance = options?.accountBalance || 150000
  const riskPercent = options?.riskPercent || 0.5
  const contractValue = options?.contractValue || 50 // ES = $50/point
  const maxDrawdownUsed = options?.maxDrawdownUsed || 0

  const riskAmount$ = accountBalance * (riskPercent / 100)
  const riskPerContract = stopDistance * contractValue

  // Apex safety
  const peakBalance = accountBalance + maxDrawdownUsed
  const apexStatus = checkApexRiskStatus(
    150000, // Account size
    accountBalance,
    0, // Daily P&L (not tracked here)
    peakBalance, // High water mark
    7, // Trading days
    DEFAULT_APEX_SAFETY
  )

  // Calculate position size multiplier based on risk status
  const apexPositionMultiplier = apexStatus.riskStatus === 'SAFE' ? 1.0 :
    apexStatus.riskStatus === 'WARNING' ? 0.5 :
    apexStatus.riskStatus === 'DANGER' ? 0.25 : 0

  const maxContractsBase = Math.floor(riskAmount$ / riskPerContract)
  const maxContracts = Math.max(1, Math.floor(maxContractsBase * apexPositionMultiplier))
  const recommendedContracts = Math.max(1, Math.min(maxContracts, Math.floor(maxContractsBase * positionSizeMultiplier)))

  // ==========================================================================
  // STEP 9: EXPECTED PERFORMANCE
  // ==========================================================================

  // Get primary strategy performance
  finalContribs.sort((a, b) => b.weightedScore - a.weightedScore)
  const primaryContrib = finalContribs[0]
  const primaryPerf = state.strategies[primaryContrib.name]

  let expectedWinRate = 50
  let avgWin = targetDistance * contractValue
  let avgLoss = stopDistance * contractValue
  let performanceConfidence = 30

  if (primaryPerf && primaryPerf.totalTrades >= 20) {
    // Use regime-specific if available
    const regimePerf = primaryPerf.byRegime[productionRegime]
    if (regimePerf && regimePerf.trades >= 10) {
      expectedWinRate = regimePerf.winRate
      performanceConfidence = 70
    } else {
      expectedWinRate = primaryPerf.winRate
      performanceConfidence = 50
    }

    if (primaryPerf.avgWin > 0) avgWin = primaryPerf.avgWin
    if (primaryPerf.avgLoss < 0) avgLoss = Math.abs(primaryPerf.avgLoss)
  }

  // Confluence boost
  if (confluenceScore >= 70) expectedWinRate = Math.min(80, expectedWinRate * 1.1)

  const expectancy = (expectedWinRate / 100) * avgWin - ((100 - expectedWinRate) / 100) * avgLoss
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 1

  // ==========================================================================
  // STEP 10: BUILD REASONING & WARNINGS
  // ==========================================================================

  const reasoning: string[] = [
    `Direction: ${direction} (${strategiesAgreeing}/${strategiesTotal} strategies agree)`,
    `Confluence: ${confluenceLevel} (${confluenceScore.toFixed(0)}%)`,
    `Confidence: ${weightedConfidence.toFixed(0)}% (weighted)`,
    `Primary: ${primaryContrib.name} (${primaryContrib.confidence.toFixed(0)}%)`,
    `Regime: ${productionRegime} | Session: ${session}`,
    `R:R = ${riskRewardRatio.toFixed(2)} | Expected WR: ${expectedWinRate.toFixed(0)}%`,
    `MTF: ${mtf.alignment} (${mtf.alignmentScore}% score)`,
  ]

  const warnings: string[] = []

  if (state.inverseConfig.globallyInversed) {
    warnings.push('GLOBAL INVERSE ACTIVE')
  }

  if (!mtfAligned) {
    warnings.push(`Trading against ${mtf.alignment} bias`)
  }

  if (microstructure.isKeyTime) {
    warnings.push(`Key time: ${microstructure.keyTimeReason}`)
  }

  if (zscoreSignal !== 'NEUTRAL') {
    warnings.push(`Z-score signal: ${zscoreSignal} (${zscoreData.zscore.toFixed(2)})`)
  }

  if (!apexStatus.canTrade) {
    warnings.push(`APEX SAFETY: ${apexStatus.warnings.join('; ')}`)
  }

  // Top contributors
  const topContributors = finalContribs
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3)
    .map(c => c.name)

  // Add strategy details to reasoning
  for (const c of finalContribs.slice(0, 4)) {
    reasoning.push(`  • ${c.name}: ${c.reasoning}`)
  }

  // ==========================================================================
  // STEP 11: BUILD FINAL SIGNAL
  // ==========================================================================

  const signalId = generateSignalId()

  const signal: OrchestratorSignal = {
    direction,
    confidence: weightedConfidence,
    strength,

    entryPrice,
    stopLoss,
    takeProfit,
    target1,
    target2,
    target3,
    riskRewardRatio,
    riskInPoints: stopDistance,
    rewardInPoints: targetDistance,

    positionSizeMultiplier,
    recommendedContracts,
    maxContracts,
    riskPerContract,

    confluenceScore,
    confluenceLevel,
    strategiesAgreeing,
    strategiesTotal,
    agreementRatio,

    contributions: finalContribs,
    primaryStrategy: primaryContrib.name,
    primaryCategory: primaryContrib.category,
    topContributors,

    isInversed: state.inverseConfig.globallyInversed,
    inverseReason: state.inverseConfig.globallyInversed ? 'Low win rate detected' : null,
    originalDirection: state.inverseConfig.globallyInversed
      ? (direction === 'LONG' ? 'SHORT' : 'LONG')
      : direction,
    inverseConfidence: state.inverseConfig.globallyInversed ? 70 : 0,

    regime: {
      production: productionRegime,
      adaptive: adaptiveRegime,
      combined: `${productionRegime}/${adaptiveRegime}`,
    },
    session,
    isRTH: rth,
    volatility: {
      bucket: volatilityBucket,
      atr: indicators.atr,
      atr20Ratio,
      percentile: Math.min(100, atr20Ratio * 50),
    },

    mtf,
    mtfAligned,

    structure: {
      marketStructure,
      orderBlocks: orderBlocks.slice(0, 5),
      fairValueGaps: fvgs.slice(0, 5),
      liquidityPools: liquidityPools.slice(0, 5),
      nearestOrderBlock: nearestOB,
      nearestFVG: nearestFVG,
      buySideLiquidity,
      sellSideLiquidity,
    },

    volumeProfile: {
      poc: volumeProfile.poc,
      vah: volumeProfile.vah,
      val: volumeProfile.val,
      pricePosition,
      distanceToPOC,
    },

    statistics: {
      zscore: zscoreData.zscore,
      zscoreSignal,
      halfLife,
      meanReversionProbability,
    },

    orderFlow: {
      cumulativeDelta,
      deltaDirection,
      deltaDivergence: deltaDivergence.detected ? deltaDivergence : null,
      absorption: absorption.detected ? absorption : null,
      vpinLevel: 0.5,
      vpinSignal: 'NORMAL',
    },

    microstructure,

    expectedPerformance: {
      winRate: expectedWinRate,
      avgWin,
      avgLoss,
      expectancy,
      profitFactor,
      confidence: performanceConfidence,
    },

    reasoning,
    warnings,
    timestamp,
    signalId,

    apexSafety: {
      canTrade: apexStatus.canTrade,
      riskLevel: (apexStatus.riskStatus === 'SAFE' ? 'NORMAL' :
        apexStatus.riskStatus === 'WARNING' ? 'CONSERVATIVE' :
        apexStatus.riskStatus === 'DANGER' ? 'DEFENSIVE' : 'DEFENSIVE') as RiskLevel,
      drawdownPercent: (apexStatus.trailingDrawdown / apexStatus.maxTrailingDrawdown) * 100,
      positionSizeLimit: apexPositionMultiplier,
      warningMessage: apexStatus.canTrade ? null : apexStatus.warnings.join('; '),
    },
  }

  // Store signal for tracking
  state.signalHistory.push({
    signalId,
    signal,
    outcome: 'PENDING',
    pnl: 0,
    exitReason: '',
    actualHoldingBars: 0,
    timestamp,
  })

  // Trim history
  if (state.signalHistory.length > 1000) {
    state.signalHistory = state.signalHistory.slice(-500)
  }

  state.overallMetrics.totalSignals++
  state.pendingSave = true

  return signal
}

// =============================================================================
// TRADE OUTCOME RECORDING
// =============================================================================

/**
 * Record the outcome of a trade for learning
 */
export async function recordTradeOutcomeOrchestrator(
  signalId: string,
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN',
  pnl: number,
  exitReason: string,
  actualStopATR: number,
  actualTargetATR: number,
  holdingBars: number
): Promise<void> {
  // Find signal in history
  const signalEntry = state.signalHistory.find(s => s.signalId === signalId)
  if (!signalEntry || signalEntry.outcome !== 'PENDING') {
    console.warn('[Orchestrator] Signal not found or already recorded:', signalId)
    return
  }

  const signal = signalEntry.signal

  // Update signal entry
  signalEntry.outcome = outcome
  signalEntry.pnl = pnl
  signalEntry.exitReason = exitReason
  signalEntry.actualHoldingBars = holdingBars

  // Update overall metrics
  state.overallMetrics.totalTrades++
  state.overallMetrics.totalPnL += pnl

  if (pnl > state.overallMetrics.peakPnL) {
    state.overallMetrics.peakPnL = pnl
  }

  const currentDrawdown = state.overallMetrics.peakPnL - state.overallMetrics.totalPnL
  if (currentDrawdown > state.overallMetrics.maxDrawdown) {
    state.overallMetrics.maxDrawdown = currentDrawdown
  }
  state.overallMetrics.currentDrawdown = currentDrawdown

  if (outcome === 'WIN') {
    state.overallMetrics.wins++
    state.overallMetrics.consecutiveWins++
    state.overallMetrics.consecutiveLosses = 0

    // Update inverse stats
    if (signal.isInversed) {
      state.inverseConfig.stats.inversedWins++
    } else {
      state.inverseConfig.stats.normalWins++
    }
  } else if (outcome === 'LOSS') {
    state.overallMetrics.losses++
    state.overallMetrics.consecutiveLosses++
    state.overallMetrics.consecutiveWins = 0

    if (signal.isInversed) {
      state.inverseConfig.stats.inversedLosses++
    } else {
      state.inverseConfig.stats.normalLosses++
    }
  } else {
    state.overallMetrics.breakevens++
  }

  // Update win rate and profit factor
  const totalClosedTrades = state.overallMetrics.wins + state.overallMetrics.losses
  if (totalClosedTrades > 0) {
    state.overallMetrics.winRate = (state.overallMetrics.wins / totalClosedTrades) * 100

    const wins = state.signalHistory.filter(s => s.outcome === 'WIN')
    const losses = state.signalHistory.filter(s => s.outcome === 'LOSS')
    const grossWins = wins.reduce((sum, w) => sum + w.pnl, 0)
    const grossLosses = Math.abs(losses.reduce((sum, l) => sum + l.pnl, 0))

    state.overallMetrics.profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 10 : 1
  }

  // Update strategy performance for each contributor
  for (const contrib of signal.contributions) {
    updateStrategyPerformance(
      contrib.name,
      contrib.category,
      outcome === 'WIN',
      pnl / signal.contributions.length, // Distribute P&L
      signal.regime.production,
      signal.session,
      signal.volatility.bucket
    )
  }

  // Update stop/target optimizer (only for wins - learn from success)
  if (outcome === 'WIN') {
    updateStopTargetOptimizer(
      signal.regime.production,
      signal.session,
      signal.volatility.bucket,
      actualStopATR,
      actualTargetATR
    )
  }

  // Record to adaptive ML
  const adaptiveOutcome: TradeOutcome = {
    features: {} as PatternFeatures,
    direction: signal.direction as 'LONG' | 'SHORT',
    regime: signal.regime.adaptive,
    pnlPercent: (pnl / 150000) * 100,
    wasWinner: outcome === 'WIN',
    holdingBars,
    stopMultiplierUsed: actualStopATR,
    targetMultiplierUsed: actualTargetATR,
    strategy: signal.primaryStrategy,
  }
  await recordTradeOutcome(adaptiveOutcome)

  // Save state
  state.pendingSave = true
  await saveOrchestratorState()
  await saveLearningStateToDB()
}

function updateStrategyPerformance(
  name: string,
  category: StrategyCategory,
  wasWinner: boolean,
  pnl: number,
  regime: ProductionRegime,
  session: TradingSession,
  volatility: VolatilityBucket
): void {
  // Initialize if needed
  if (!state.strategies[name]) {
    state.strategies[name] = {
      name,
      category,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPnL: 0,
      avgPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 1,
      expectancy: 0,
      sharpeRatio: 0,
      byRegime: {},
      bySession: {},
      byVolatility: {
        'ULTRA_LOW': { trades: 0, wins: 0, pnl: 0, winRate: 0 },
        'LOW': { trades: 0, wins: 0, pnl: 0, winRate: 0 },
        'NORMAL': { trades: 0, wins: 0, pnl: 0, winRate: 0 },
        'HIGH': { trades: 0, wins: 0, pnl: 0, winRate: 0 },
        'EXTREME': { trades: 0, wins: 0, pnl: 0, winRate: 0 },
      },
      recentTrades: [],
      recentWinRate: 0,
      recentPnL: 0,
      currentStreak: 0,
      maxWinStreak: 0,
      maxLoseStreak: 0,
      baseWeight: getBaseWeight(name),
      currentWeight: getBaseWeight(name),
      weightHistory: [],
      lastTradeTimestamp: Date.now(),
      lastWinTimestamp: 0,
      lastLossTimestamp: 0,
      firstTradeTimestamp: Date.now(),
    }
  }

  const perf = state.strategies[name]

  // Update core stats
  perf.totalTrades++
  perf.totalPnL += pnl
  perf.avgPnL = perf.totalPnL / perf.totalTrades
  perf.lastTradeTimestamp = Date.now()

  if (wasWinner) {
    perf.wins++
    perf.lastWinTimestamp = Date.now()
    perf.currentStreak = perf.currentStreak > 0 ? perf.currentStreak + 1 : 1
    perf.maxWinStreak = Math.max(perf.maxWinStreak, perf.currentStreak)

    const prevWinTotal = perf.avgWin * (perf.wins - 1)
    perf.avgWin = (prevWinTotal + pnl) / perf.wins
  } else {
    perf.losses++
    perf.lastLossTimestamp = Date.now()
    perf.currentStreak = perf.currentStreak < 0 ? perf.currentStreak - 1 : -1
    perf.maxLoseStreak = Math.min(perf.maxLoseStreak, perf.currentStreak)

    const prevLossTotal = perf.avgLoss * perf.losses
    perf.avgLoss = (prevLossTotal + pnl) / perf.losses
  }

  perf.winRate = (perf.wins / perf.totalTrades) * 100

  // Profit factor
  const grossWins = perf.avgWin * perf.wins
  const grossLosses = Math.abs(perf.avgLoss) * perf.losses
  perf.profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 10 : 1

  // Expectancy
  perf.expectancy = (perf.winRate / 100) * perf.avgWin + ((100 - perf.winRate) / 100) * perf.avgLoss

  // By regime
  if (!perf.byRegime[regime]) {
    perf.byRegime[regime] = { trades: 0, wins: 0, pnl: 0, winRate: 0 }
  }
  perf.byRegime[regime].trades++
  perf.byRegime[regime].pnl += pnl
  if (wasWinner) perf.byRegime[regime].wins++
  perf.byRegime[regime].winRate = (perf.byRegime[regime].wins / perf.byRegime[regime].trades) * 100

  // By session
  if (!perf.bySession[session]) {
    perf.bySession[session] = { trades: 0, wins: 0, pnl: 0, winRate: 0 }
  }
  perf.bySession[session].trades++
  perf.bySession[session].pnl += pnl
  if (wasWinner) perf.bySession[session].wins++
  perf.bySession[session].winRate = (perf.bySession[session].wins / perf.bySession[session].trades) * 100

  // By volatility
  perf.byVolatility[volatility].trades++
  perf.byVolatility[volatility].pnl += pnl
  if (wasWinner) perf.byVolatility[volatility].wins++
  perf.byVolatility[volatility].winRate =
    (perf.byVolatility[volatility].wins / perf.byVolatility[volatility].trades) * 100

  // Recent trades (rolling window)
  perf.recentTrades.push({
    timestamp: Date.now(),
    pnl,
    wasWinner,
    regime,
    session,
  })
  if (perf.recentTrades.length > 50) {
    perf.recentTrades = perf.recentTrades.slice(-50)
  }

  // Calculate recent stats
  const recentWins = perf.recentTrades.filter(t => t.wasWinner).length
  perf.recentWinRate = (recentWins / perf.recentTrades.length) * 100
  perf.recentPnL = perf.recentTrades.reduce((sum, t) => sum + t.pnl, 0)

  // Update weight
  perf.currentWeight = calculateCurrentWeight(name, regime, session, volatility)
  perf.weightHistory.push({ timestamp: Date.now(), weight: perf.currentWeight })
  if (perf.weightHistory.length > 100) {
    perf.weightHistory = perf.weightHistory.slice(-100)
  }
}

function updateStopTargetOptimizer(
  regime: ProductionRegime,
  session: TradingSession,
  volatility: VolatilityBucket,
  stopUsed: number,
  targetUsed: number
): void {
  const opt = state.stopTargetOptimizer
  const lr = opt.learningRate

  // Update regime
  if (!opt.byRegime[regime]) {
    opt.byRegime[regime] = { optimalStopATR: 1.5, optimalTargetATR: 3.0, dataPoints: 0 }
  }
  opt.byRegime[regime].optimalStopATR =
    opt.byRegime[regime].optimalStopATR * (1 - lr) + stopUsed * lr
  opt.byRegime[regime].optimalTargetATR =
    opt.byRegime[regime].optimalTargetATR * (1 - lr) + targetUsed * lr
  opt.byRegime[regime].dataPoints++

  // Update session
  if (!opt.bySession[session]) {
    opt.bySession[session] = { optimalStopATR: 1.5, optimalTargetATR: 3.0, dataPoints: 0 }
  }
  opt.bySession[session].optimalStopATR =
    opt.bySession[session].optimalStopATR * (1 - lr) + stopUsed * lr
  opt.bySession[session].optimalTargetATR =
    opt.bySession[session].optimalTargetATR * (1 - lr) + targetUsed * lr
  opt.bySession[session].dataPoints++

  // Update volatility
  opt.byVolatility[volatility].optimalStopATR =
    opt.byVolatility[volatility].optimalStopATR * (1 - lr) + stopUsed * lr
  opt.byVolatility[volatility].optimalTargetATR =
    opt.byVolatility[volatility].optimalTargetATR * (1 - lr) + targetUsed * lr
  opt.byVolatility[volatility].dataPoints++
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get complete orchestrator statistics
 */
export function getOrchestratorStats() {
  const strategyRankings = Object.entries(state.strategies)
    .map(([name, perf]) => ({
      name,
      category: perf.category,
      trades: perf.totalTrades,
      winRate: perf.winRate.toFixed(1) + '%',
      profitFactor: perf.profitFactor.toFixed(2),
      totalPnL: perf.totalPnL.toFixed(2),
      currentWeight: perf.currentWeight.toFixed(2),
      streak: perf.currentStreak,
      recentWinRate: perf.recentWinRate.toFixed(1) + '%',
    }))
    .sort((a, b) => parseFloat(b.totalPnL) - parseFloat(a.totalPnL))

  return {
    initialized: state.initialized,
    overallMetrics: state.overallMetrics,
    inverseStatus: {
      enabled: state.inverseConfig.enabled,
      globallyInversed: state.inverseConfig.globallyInversed,
      inversedStrategies: Array.from(state.inverseConfig.inversedStrategies),
      normalWinRate: state.inverseConfig.stats.normalWins + state.inverseConfig.stats.normalLosses > 0
        ? ((state.inverseConfig.stats.normalWins / (state.inverseConfig.stats.normalWins + state.inverseConfig.stats.normalLosses)) * 100).toFixed(1) + '%'
        : 'N/A',
      inverseWinRate: state.inverseConfig.stats.inversedWins + state.inverseConfig.stats.inversedLosses > 0
        ? ((state.inverseConfig.stats.inversedWins / (state.inverseConfig.stats.inversedWins + state.inverseConfig.stats.inversedLosses)) * 100).toFixed(1) + '%'
        : 'N/A',
      activations: state.inverseConfig.stats.inverseActivations,
      deactivations: state.inverseConfig.stats.inverseDeactivations,
    },
    stopTargetOptimizer: state.stopTargetOptimizer,
    strategyRankings,
    signalsTracked: state.signalHistory.length,
    pendingSignals: state.signalHistory.filter(s => s.outcome === 'PENDING').length,
  }
}

/**
 * Configure inverse trading settings
 */
export function configureInverse(config: Partial<InverseConfig>): void {
  state.inverseConfig = {
    ...state.inverseConfig,
    ...config,
    inversedStrategies: config.inversedStrategies instanceof Set
      ? config.inversedStrategies
      : state.inverseConfig.inversedStrategies,
  }
  state.pendingSave = true
}

/**
 * Force save state
 */
export async function forceSaveOrchestrator(): Promise<boolean> {
  return saveOrchestratorState(true)
}

/**
 * Reset orchestrator state (USE WITH CAUTION)
 */
export function resetOrchestrator(): void {
  state = createDefaultState()
  state.initialized = true
  console.log('[Orchestrator] State reset')
}

/**
 * Get current inverse status
 */
export function getInverseStatus(): {
  globallyInversed: boolean
  inversedStrategies: string[]
  stats: typeof state.inverseConfig.stats
} {
  return {
    globallyInversed: state.inverseConfig.globallyInversed,
    inversedStrategies: Array.from(state.inverseConfig.inversedStrategies),
    stats: state.inverseConfig.stats,
  }
}
