/**
 * StuntMan Auto-Trading API - FULLY INTEGRATED WORLD-CLASS EDITION
 *
 * ALL MODULES WORKING TOGETHER:
 * 1. ML Signal Engine - Neural network + ensemble models
 * 2. Order Flow Analysis - VPIN, delta, footprint, iceberg detection
 * 3. Advanced Risk Analytics - VaR, Monte Carlo, Apex safety
 * 4. Smart Execution - TWAP, VWAP, adaptive algorithms
 * 5. Traditional Signal Engine - EMA, RSI, MACD, VWAP strategies
 *
 * POST /api/stuntman/auto-trade - Start/stop auto-trading
 * GET /api/stuntman/auto-trade - Get status and stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateSignal,
  calculateOptimalSize,
  getCurrentSession,
  Candle,
  Signal,
} from '@/lib/stuntman/signal-engine'
import {
  generateMLSignal,
  detectMarketRegime,
  MLSignal,
  MarketRegime,
} from '@/lib/stuntman/ml-signal-engine'
import {
  OrderFlowEngine,
  VPINCalculator,
  DeltaAnalyzer,
  VPINResult,
  DeltaAnalysis,
  OrderFlowSignal,
  detectLargeOrders,
} from '@/lib/stuntman/order-flow-analysis'
import {
  checkApexRiskStatus,
  calculateSafePositionSize,
  DEFAULT_APEX_SAFETY,
  ApexRiskStatus,
  calculateVaR,
  runStressTests,
} from '@/lib/stuntman/risk-analytics'
import {
  SmartExecutionEngine,
  ExecutionAlgorithm,
  MarketConditions,
  ExecutionPlan,
} from '@/lib/stuntman/smart-execution'
import {
  PickMyTradeClient,
  getCurrentContractSymbol,
  ES_POINT_VALUE,
  NQ_POINT_VALUE,
} from '@/lib/stuntman/pickmytrade-client'
import { Trade as OrderFlowTrade, OrderBookData } from '@/lib/stuntman/types'
import {
  generateAdaptiveSignal,
  extractFeatures,
  ensureLearningStateLoaded,
  getAdaptiveStats,
  AdaptiveSignal,
} from '@/lib/stuntman/adaptive-ml'
import {
  classifyMarketRegime,
  calculatePropFirmRisk,
  generateAllWorldClassSignals,
  StrategySignal,
} from '@/lib/stuntman/world-class-strategies'

// =============================================================================
// DYNAMIC REGIME-ADAPTIVE STRATEGY SYSTEM (from paper trading)
// =============================================================================

const DYNAMIC_STRATEGY_SYSTEM = {
  enabled: true,

  // REGIME -> STRATEGY MAPPING (matching MarketRegimeType from world-class-strategies)
  regimeStrategies: {
    'TREND_STRONG_UP': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT'],
    'TREND_WEAK_UP': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT', 'VWAP_DEVIATION'],
    'TREND_STRONG_DOWN': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT'],
    'TREND_WEAK_DOWN': ['BOS_CONTINUATION', 'TREND_PULLBACK', 'ORB_BREAKOUT', 'VWAP_DEVIATION'],
    'RANGE_TIGHT': ['VWAP_DEVIATION', 'RANGE_FADE', 'SESSION_REVERSION'],
    'RANGE_WIDE': ['VWAP_DEVIATION', 'RANGE_FADE', 'SESSION_REVERSION', 'LIQUIDITY_SWEEP'],
    'HIGH_VOLATILITY': ['VOLATILITY_BREAKOUT', 'FAILED_BREAKOUT', 'KILLZONE_REVERSAL'],
    'LOW_VOLATILITY': ['RANGE_FADE', 'VWAP_DEVIATION'],
    'NEWS_DRIVEN': ['VOLATILITY_BREAKOUT', 'FAILED_BREAKOUT'],  // Be cautious
    'ILLIQUID': [],  // Don't trade in illiquid markets
  } as Record<string, string[]>,

  // SESSION BOOSTS
  sessionBoosts: {
    'RTH_OPEN': { boost: ['ORB_BREAKOUT', 'VOLATILITY_BREAKOUT', 'LIQUIDITY_SWEEP'], multiplier: 1.5 },
    'RTH_MID': { boost: ['VWAP_DEVIATION', 'RANGE_FADE', 'VP_VAH_REVERSAL'], multiplier: 1.3 },
    'RTH_AFTERNOON': { boost: ['BOS_CONTINUATION', 'TREND_PULLBACK', 'OB_FVG_CONFLUENCE'], multiplier: 1.4 },
    'RTH_CLOSE': { boost: ['BOS_CONTINUATION', 'VOLATILITY_BREAKOUT'], multiplier: 1.2 },
  } as Record<string, { boost: string[]; multiplier: number }>,

  // CONFLUENCE REQUIREMENTS
  confluence: {
    minStrategiesAgreeing: 2,
    minConfidenceAverage: 70,
  },

  // APEX 150K SETTINGS
  apex150k: {
    dailyTarget: 1285,
    dailyMaxLoss: 600,
    minRiskReward: 2.0,
    minWinProbability: 0.50,
    maxTradesPerDay: 6,
  },
}

// PROFIT CONFIG - Strict requirements for live trading
const LIVE_PROFIT_CONFIG = {
  dailyMaxLoss: 800,
  maxLossPerTrade: 300,
  maxLossPerTradePoints: 6,
  maxConsecutiveLosses: 2,
  minConfluenceScore: 70,  // Higher for live trading
  minConfidence: 80,
  minRiskReward: 2.5,
  maxTradesPerDay: 5,
  minTimeBetweenTrades: 20,
}

// Track consecutive losses for live trading
let liveConsecutiveLosses = 0
let liveDailyPnL = 0
let liveDailyTradeCount = 0
let liveLastTradeTime = 0

// =============================================================================
// ADVANCED POSITION MANAGEMENT SYSTEM
// =============================================================================
// This system provides:
// 1. Dynamic multi-contract scaling based on regime/confluence/volatility
// 2. Partial take profits with ATR-based trailing stops
// 3. Adaptive confluence thresholds based on market conditions

// -------------------------------------------------------------------------
// 1. MULTI-CONTRACT SCALING CONFIGURATION
// -------------------------------------------------------------------------
interface ContractScalingConfig {
  // Base contracts by account size
  baseContracts: number

  // Regime multipliers (how many contracts for each regime)
  regimeMultipliers: Record<string, number>

  // Confluence bonuses (extra contracts for high confluence)
  confluenceBonus: {
    threshold: number  // Confluence score threshold
    bonus: number      // Extra contracts if exceeded
  }[]

  // Win streak bonus (scale up after winning)
  winStreakBonus: {
    requiredWins: number  // Consecutive wins needed
    maxBonus: number      // Max extra contracts
  }

  // Drawdown protection (scale down after losses)
  drawdownProtection: {
    thresholds: { drawdownPercent: number; multiplier: number }[]
  }

  // Volatility adjustment (scale based on ATR)
  volatilityAdjustment: {
    lowVolATRThreshold: number   // Below this = low vol
    highVolATRThreshold: number  // Above this = high vol
    lowVolMultiplier: number     // Scale up in low vol (safer)
    highVolMultiplier: number    // Scale down in high vol (riskier)
  }

  // Hard limits
  minContracts: number
  maxContracts: number
}

const CONTRACT_SCALING: ContractScalingConfig = {
  baseContracts: 1,

  // REGIME MULTIPLIERS - Aggressive in trends, conservative in chop
  regimeMultipliers: {
    'TREND_STRONG_UP': 3,     // MAX aggression in strong trends
    'TREND_STRONG_DOWN': 3,
    'TREND_WEAK_UP': 2,       // Moderate in weak trends
    'TREND_WEAK_DOWN': 2,
    'RANGE_TIGHT': 1,         // Conservative in tight range (chop)
    'RANGE_WIDE': 1,          // Conservative in wide range
    'HIGH_VOLATILITY': 2,     // Can profit but risky
    'LOW_VOLATILITY': 1,      // No edge, stay small
    'NEWS_DRIVEN': 1,         // DANGER - stay small
    'ILLIQUID': 0,            // NO TRADE
  },

  // CONFLUENCE BONUSES - Reward high-quality setups
  confluenceBonus: [
    { threshold: 90, bonus: 2 },  // 90+ confluence = +2 contracts
    { threshold: 80, bonus: 1 },  // 80+ confluence = +1 contract
    { threshold: 70, bonus: 0 },  // 70+ = base
  ],

  // WIN STREAK BONUS - Compound winners
  winStreakBonus: {
    requiredWins: 3,  // After 3 consecutive wins
    maxBonus: 2,      // Add up to 2 extra contracts
  },

  // DRAWDOWN PROTECTION - Scale down when losing
  drawdownProtection: {
    thresholds: [
      { drawdownPercent: 50, multiplier: 0.25 },  // 50% of max DD = 25% size
      { drawdownPercent: 40, multiplier: 0.50 },  // 40% of max DD = 50% size
      { drawdownPercent: 30, multiplier: 0.75 },  // 30% of max DD = 75% size
      { drawdownPercent: 20, multiplier: 1.00 },  // Below 20% = full size
    ]
  },

  // VOLATILITY ADJUSTMENT
  volatilityAdjustment: {
    lowVolATRThreshold: 3,    // ATR < 3 points = low vol
    highVolATRThreshold: 8,   // ATR > 8 points = high vol
    lowVolMultiplier: 1.5,    // Can trade slightly larger in calm
    highVolMultiplier: 0.5,   // Cut size in volatility
  },

  // HARD LIMITS (Apex 150K = max 17 contracts)
  minContracts: 1,
  maxContracts: 5,  // Start conservative, can increase after validation
}

// -------------------------------------------------------------------------
// 2. PARTIAL TAKE PROFIT & TRAILING STOP CONFIGURATION
// -------------------------------------------------------------------------
interface PartialTakeProfitConfig {
  // Scale out levels (as ratio of full target distance)
  scaleOutLevels: {
    targetRatio: number      // e.g., 0.5 = 50% of target (1:1 R:R)
    exitPercent: number      // e.g., 0.5 = exit 50% of position
    moveStopTo: 'breakeven' | 'entry' | 'trail' | 'none'
  }[]

  // Trailing stop configuration
  trailingStop: {
    enabled: boolean
    activationMultiple: number   // Activate after X * ATR profit
    trailDistance: number        // Trail by this many ATR
    trailStep: number            // Update trail every X ATR move
    useATR: boolean              // Use ATR or fixed points
    fixedPoints: number          // If not using ATR
  }

  // Dynamic target extension
  targetExtension: {
    enabled: boolean
    regimeMultipliers: Record<string, number>  // Extend targets in trends
    minExtension: number
    maxExtension: number
  }
}

const PARTIAL_TP_CONFIG: PartialTakeProfitConfig = {
  // SCALE OUT LEVELS - Lock in profits while letting winners run
  scaleOutLevels: [
    {
      targetRatio: 0.5,        // At 50% of target (1:1 R:R)
      exitPercent: 0.5,        // Exit 50% of position
      moveStopTo: 'breakeven', // Move stop to breakeven
    },
    {
      targetRatio: 0.75,       // At 75% of target
      exitPercent: 0.25,       // Exit another 25%
      moveStopTo: 'trail',     // Start trailing
    },
    // Remaining 25% rides with trailing stop to full target or beyond
  ],

  // TRAILING STOP - Let winners run
  trailingStop: {
    enabled: true,
    activationMultiple: 1.0,  // Activate after 1 ATR profit
    trailDistance: 1.5,       // Trail 1.5 ATR behind
    trailStep: 0.25,          // Update every 0.25 ATR move
    useATR: true,
    fixedPoints: 4,           // If ATR disabled, use 4 points
  },

  // TARGET EXTENSION - Extend targets in trending markets
  targetExtension: {
    enabled: true,
    regimeMultipliers: {
      'TREND_STRONG_UP': 1.5,    // Extend target 50% in strong trends
      'TREND_STRONG_DOWN': 1.5,
      'TREND_WEAK_UP': 1.25,     // Extend 25% in weak trends
      'TREND_WEAK_DOWN': 1.25,
      'RANGE_TIGHT': 0.8,        // REDUCE target in chop (take what you can)
      'RANGE_WIDE': 0.9,
      'HIGH_VOLATILITY': 1.2,    // Slight extension possible
      'LOW_VOLATILITY': 1.0,     // Standard targets
      'NEWS_DRIVEN': 0.75,       // Quick exits in news
      'ILLIQUID': 0.5,           // GET OUT FAST
    },
    minExtension: 0.5,
    maxExtension: 2.0,
  }
}

// -------------------------------------------------------------------------
// 3. ADAPTIVE CONFLUENCE THRESHOLDS
// -------------------------------------------------------------------------
interface AdaptiveConfluenceConfig {
  // Base thresholds
  baseConfluence: number
  baseConfidence: number
  baseRiskReward: number

  // Regime adjustments (lower in trends, higher in chop)
  regimeAdjustments: Record<string, {
    confluenceAdjust: number   // Add/subtract from base
    confidenceAdjust: number
    riskRewardAdjust: number
  }>

  // Session adjustments (more aggressive in optimal sessions)
  sessionAdjustments: Record<string, {
    confluenceAdjust: number
    confidenceAdjust: number
  }>

  // Performance-based adjustments
  performanceAdjustments: {
    // After wins, can be slightly more aggressive
    afterWinStreak: { wins: number; confluenceAdjust: number; confidenceAdjust: number }[]
    // After losses, must be more selective
    afterLossStreak: { losses: number; confluenceAdjust: number; confidenceAdjust: number }[]
  }

  // Time-of-day adjustments
  timeAdjustments: {
    openingHour: { confluenceAdjust: number; confidenceAdjust: number }   // 9:30-10:30
    midDay: { confluenceAdjust: number; confidenceAdjust: number }        // 10:30-2:00
    afternoonPush: { confluenceAdjust: number; confidenceAdjust: number } // 2:00-3:00
    powerHour: { confluenceAdjust: number; confidenceAdjust: number }     // 3:00-4:00
  }

  // Hard limits
  minConfluence: number
  maxConfluence: number
  minConfidence: number
  maxConfidence: number
}

const ADAPTIVE_CONFLUENCE: AdaptiveConfluenceConfig = {
  baseConfluence: 60,     // Base required confluence
  baseConfidence: 70,     // Base required confidence
  baseRiskReward: 2.0,    // Base required R:R

  // REGIME ADJUSTMENTS - This is the KEY differentiator
  regimeAdjustments: {
    'TREND_STRONG_UP': { confluenceAdjust: -20, confidenceAdjust: -15, riskRewardAdjust: -0.5 },
    'TREND_STRONG_DOWN': { confluenceAdjust: -20, confidenceAdjust: -15, riskRewardAdjust: -0.5 },
    // In STRONG TRENDS: Confluence 40, Confidence 55%, R:R 1.5 - BE AGGRESSIVE!

    'TREND_WEAK_UP': { confluenceAdjust: -10, confidenceAdjust: -10, riskRewardAdjust: -0.25 },
    'TREND_WEAK_DOWN': { confluenceAdjust: -10, confidenceAdjust: -10, riskRewardAdjust: -0.25 },
    // In WEAK TRENDS: Confluence 50, Confidence 60%, R:R 1.75

    'RANGE_TIGHT': { confluenceAdjust: +15, confidenceAdjust: +15, riskRewardAdjust: +0.5 },
    // In TIGHT RANGE (CHOP): Confluence 75, Confidence 85%, R:R 2.5 - BE VERY SELECTIVE!

    'RANGE_WIDE': { confluenceAdjust: +10, confidenceAdjust: +10, riskRewardAdjust: +0.25 },
    // In WIDE RANGE: Confluence 70, Confidence 80%, R:R 2.25

    'HIGH_VOLATILITY': { confluenceAdjust: +5, confidenceAdjust: +5, riskRewardAdjust: +0.5 },
    // In HIGH VOL: Confluence 65, Confidence 75%, R:R 2.5 - Need better R:R for risk

    'LOW_VOLATILITY': { confluenceAdjust: +10, confidenceAdjust: +10, riskRewardAdjust: +0.25 },
    // In LOW VOL: Confluence 70, Confidence 80%, R:R 2.25 - Hard to profit, be selective

    'NEWS_DRIVEN': { confluenceAdjust: +25, confidenceAdjust: +20, riskRewardAdjust: +1.0 },
    // In NEWS: Confluence 85, Confidence 90%, R:R 3.0 - VERY selective or no trade

    'ILLIQUID': { confluenceAdjust: +50, confidenceAdjust: +50, riskRewardAdjust: +2.0 },
    // ILLIQUID: Effectively NO TRADE (impossible thresholds)
  },

  // SESSION ADJUSTMENTS - Optimal trading windows
  sessionAdjustments: {
    'RTH_OPEN': { confluenceAdjust: -10, confidenceAdjust: -5 },    // Opening range = good setups
    'RTH_MID': { confluenceAdjust: +15, confidenceAdjust: +10 },    // Lunch = avoid
    'RTH_AFTERNOON': { confluenceAdjust: -5, confidenceAdjust: -5 }, // Good momentum
    'RTH_CLOSE': { confluenceAdjust: -10, confidenceAdjust: -5 },   // Power hour = good
    'PRE': { confluenceAdjust: +20, confidenceAdjust: +15 },        // Pre-market = selective
    'POST': { confluenceAdjust: +25, confidenceAdjust: +20 },       // After hours = very selective
    'CLOSED': { confluenceAdjust: +100, confidenceAdjust: +100 },   // No trade
  },

  // PERFORMANCE ADJUSTMENTS
  performanceAdjustments: {
    afterWinStreak: [
      { wins: 5, confluenceAdjust: -10, confidenceAdjust: -5 },  // 5+ wins = slightly aggressive
      { wins: 3, confluenceAdjust: -5, confidenceAdjust: -3 },   // 3+ wins = tiny boost
    ],
    afterLossStreak: [
      { losses: 3, confluenceAdjust: +20, confidenceAdjust: +15 }, // 3+ losses = very selective
      { losses: 2, confluenceAdjust: +10, confidenceAdjust: +10 }, // 2 losses = more selective
      { losses: 1, confluenceAdjust: +5, confidenceAdjust: +5 },   // 1 loss = slightly more careful
    ],
  },

  // TIME ADJUSTMENTS
  timeAdjustments: {
    openingHour: { confluenceAdjust: -10, confidenceAdjust: -5 },    // 9:30-10:30 = good volatility
    midDay: { confluenceAdjust: +20, confidenceAdjust: +15 },        // 10:30-2:00 = AVOID
    afternoonPush: { confluenceAdjust: -5, confidenceAdjust: -3 },   // 2:00-3:00 = momentum builds
    powerHour: { confluenceAdjust: -15, confidenceAdjust: -10 },     // 3:00-4:00 = BEST hour
  },

  // HARD LIMITS
  minConfluence: 30,   // Never go below 30 confluence
  maxConfluence: 95,   // Never require more than 95
  minConfidence: 50,   // Never accept below 50% confidence
  maxConfidence: 95,   // Never require more than 95%
}

// -------------------------------------------------------------------------
// ADVANCED POSITION STATE - Tracks partial exits and trailing
// -------------------------------------------------------------------------
interface AdvancedPositionState {
  // Original entry details
  originalContracts: number
  remainingContracts: number

  // Partial exit tracking
  partialExits: {
    contracts: number
    exitPrice: number
    exitTime: number
    pnl: number
    reason: string
  }[]

  // Trailing stop state
  trailingStopActive: boolean
  trailingStopPrice: number | null
  highestPriceSinceEntry: number  // For long
  lowestPriceSinceEntry: number   // For short
  lastTrailUpdate: number

  // Scale out tracking
  scaleOutLevelsHit: number[]  // Which levels have been hit
  stopMovedToBreakeven: boolean

  // ATR at entry (for trailing calculations)
  entryATR: number

  // Current R multiple (how many R's in profit)
  currentRMultiple: number
}

let advancedPositionState: AdvancedPositionState | null = null

// -------------------------------------------------------------------------
// PERFORMANCE TRACKING - For adaptive adjustments
// -------------------------------------------------------------------------
interface PerformanceTracker {
  consecutiveWins: number
  consecutiveLosses: number
  recentTrades: { pnl: number; regime: string; session: string; time: number }[]
  winRateByRegime: Record<string, { wins: number; losses: number }>
  winRateBySession: Record<string, { wins: number; losses: number }>
  dailyPnL: number
  currentDrawdownPercent: number
}

let performanceTracker: PerformanceTracker = {
  consecutiveWins: 0,
  consecutiveLosses: 0,
  recentTrades: [],
  winRateByRegime: {},
  winRateBySession: {},
  dailyPnL: 0,
  currentDrawdownPercent: 0,
}

// =============================================================================
// TYPES
// =============================================================================

interface Position {
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  contracts: number
  stopLoss: number
  takeProfit: number
  entryTime: number
  signal: Signal
  executionPlan?: ExecutionPlan
}

interface Trade {
  id: string
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  contracts: number
  pnl: number
  entryTime: number
  exitTime: number
  reason: string
  // Advanced metrics
  slippage?: number
  executionAlgo?: ExecutionAlgorithm
  confluenceScore?: number
}

interface AutoTraderState {
  enabled: boolean
  paperMode: boolean  // Paper trading - simulate without real execution
  instrument: 'ES' | 'NQ'
  position: Position | null
  // APEX Evaluation tracking
  evaluationStartDate: string | null  // When user started evaluation
  targetDays: number | null           // User's personal goal (optional)
  // Signal data
  lastSignal: Signal | null
  lastMLSignal: MLSignal | null
  lastOrderFlow: OrderFlowSignal | null
  lastRiskStatus: ApexRiskStatus | null
  marketRegime: MarketRegime | null
  // Order flow
  vpin: VPINResult | null
  delta: DeltaAnalysis | null
  largeOrderDetected: boolean
  largeOrderSide: 'BUY' | 'SELL' | null
  // Execution
  executionAlgorithm: ExecutionAlgorithm
  marketConditions: MarketConditions | null
  // Confluence
  signalConfluence: number
  confluenceFactors: string[]
  // Timing
  lastCheck: number
  // Performance
  todayTrades: Trade[]
  todayPnL: number
  totalTrades: number
  wins: number
  losses: number
  startBalance: number
  currentBalance: number
  highWaterMark: number
  tradingDays: number
  // Risk
  dailyVaR: number
  stressTestsPassed: number
}

// =============================================================================
// STATE
// =============================================================================

let state: AutoTraderState = {
  enabled: false,
  paperMode: true,  // Default to paper trading for safety
  instrument: 'ES',
  position: null,
  // APEX: No deadline by default - user can set personal goal
  evaluationStartDate: null,
  targetDays: null,
  lastSignal: null,
  lastMLSignal: null,
  lastOrderFlow: null,
  lastRiskStatus: null,
  marketRegime: null,
  vpin: null,
  delta: null,
  largeOrderDetected: false,
  largeOrderSide: null,
  executionAlgorithm: 'ADAPTIVE',
  marketConditions: null,
  signalConfluence: 0,
  confluenceFactors: [],
  lastCheck: 0,
  todayTrades: [],
  todayPnL: 0,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  startBalance: 150000,
  currentBalance: 150000,
  highWaterMark: 150000,
  tradingDays: 0,
  dailyVaR: 0,
  stressTestsPassed: 0,
}

// =============================================================================
// ADVANCED POSITION MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Calculate dynamic contract size based on all factors
 */
function calculateDynamicContractSize(
  regime: string,
  confluenceScore: number,
  currentATR: number,
  session: string
): { contracts: number; factors: string[] } {
  const factors: string[] = []
  let contracts = CONTRACT_SCALING.baseContracts

  // 1. REGIME MULTIPLIER
  const regimeMultiplier = CONTRACT_SCALING.regimeMultipliers[regime] ?? 1
  if (regimeMultiplier === 0) {
    return { contracts: 0, factors: ['BLOCKED: Illiquid market - no trading'] }
  }
  contracts = Math.floor(contracts * regimeMultiplier)
  factors.push(`Regime ${regime}: ${regimeMultiplier}x`)

  // 2. CONFLUENCE BONUS
  for (const bonus of CONTRACT_SCALING.confluenceBonus) {
    if (confluenceScore >= bonus.threshold) {
      contracts += bonus.bonus
      if (bonus.bonus > 0) {
        factors.push(`Confluence ${confluenceScore}+: +${bonus.bonus} contracts`)
      }
      break // Only apply highest matching bonus
    }
  }

  // 3. WIN STREAK BONUS
  if (performanceTracker.consecutiveWins >= CONTRACT_SCALING.winStreakBonus.requiredWins) {
    const streakBonus = Math.min(
      CONTRACT_SCALING.winStreakBonus.maxBonus,
      Math.floor((performanceTracker.consecutiveWins - CONTRACT_SCALING.winStreakBonus.requiredWins + 1) / 2) + 1
    )
    contracts += streakBonus
    factors.push(`Win streak (${performanceTracker.consecutiveWins}): +${streakBonus} contracts`)
  }

  // 4. DRAWDOWN PROTECTION
  for (const threshold of CONTRACT_SCALING.drawdownProtection.thresholds) {
    if (performanceTracker.currentDrawdownPercent >= threshold.drawdownPercent) {
      const oldContracts = contracts
      contracts = Math.floor(contracts * threshold.multiplier)
      factors.push(`Drawdown ${performanceTracker.currentDrawdownPercent.toFixed(0)}%: ${threshold.multiplier}x (${oldContracts} -> ${contracts})`)
      break
    }
  }

  // 5. VOLATILITY ADJUSTMENT
  if (currentATR < CONTRACT_SCALING.volatilityAdjustment.lowVolATRThreshold) {
    const oldContracts = contracts
    contracts = Math.floor(contracts * CONTRACT_SCALING.volatilityAdjustment.lowVolMultiplier)
    factors.push(`Low volatility (ATR ${currentATR.toFixed(1)}): ${CONTRACT_SCALING.volatilityAdjustment.lowVolMultiplier}x`)
  } else if (currentATR > CONTRACT_SCALING.volatilityAdjustment.highVolATRThreshold) {
    const oldContracts = contracts
    contracts = Math.floor(contracts * CONTRACT_SCALING.volatilityAdjustment.highVolMultiplier)
    factors.push(`High volatility (ATR ${currentATR.toFixed(1)}): ${CONTRACT_SCALING.volatilityAdjustment.highVolMultiplier}x`)
  }

  // 6. CONSECUTIVE LOSS REDUCTION
  if (performanceTracker.consecutiveLosses > 0) {
    const lossReduction = Math.max(0.5, 1 - (performanceTracker.consecutiveLosses * 0.25))
    const oldContracts = contracts
    contracts = Math.max(1, Math.floor(contracts * lossReduction))
    factors.push(`Consecutive losses (${performanceTracker.consecutiveLosses}): ${lossReduction.toFixed(2)}x`)
  }

  // 7. ENFORCE HARD LIMITS
  contracts = Math.max(CONTRACT_SCALING.minContracts, Math.min(CONTRACT_SCALING.maxContracts, contracts))
  factors.push(`Final: ${contracts} contracts (limits: ${CONTRACT_SCALING.minContracts}-${CONTRACT_SCALING.maxContracts})`)

  return { contracts, factors }
}

/**
 * Calculate adaptive confluence thresholds based on all factors
 */
function calculateAdaptiveThresholds(
  regime: string,
  session: string
): {
  requiredConfluence: number
  requiredConfidence: number
  requiredRiskReward: number
  factors: string[]
} {
  const factors: string[] = []

  let confluence = ADAPTIVE_CONFLUENCE.baseConfluence
  let confidence = ADAPTIVE_CONFLUENCE.baseConfidence
  let riskReward = ADAPTIVE_CONFLUENCE.baseRiskReward

  factors.push(`Base: Confluence ${confluence}, Confidence ${confidence}%, R:R ${riskReward}`)

  // 1. REGIME ADJUSTMENT (MOST IMPORTANT)
  const regimeAdj = ADAPTIVE_CONFLUENCE.regimeAdjustments[regime]
  if (regimeAdj) {
    confluence += regimeAdj.confluenceAdjust
    confidence += regimeAdj.confidenceAdjust
    riskReward += regimeAdj.riskRewardAdjust
    factors.push(`Regime ${regime}: Confluence ${regimeAdj.confluenceAdjust > 0 ? '+' : ''}${regimeAdj.confluenceAdjust}, Confidence ${regimeAdj.confidenceAdjust > 0 ? '+' : ''}${regimeAdj.confidenceAdjust}%`)
  }

  // 2. SESSION ADJUSTMENT
  const sessionAdj = ADAPTIVE_CONFLUENCE.sessionAdjustments[session]
  if (sessionAdj) {
    confluence += sessionAdj.confluenceAdjust
    confidence += sessionAdj.confidenceAdjust
    factors.push(`Session ${session}: Confluence ${sessionAdj.confluenceAdjust > 0 ? '+' : ''}${sessionAdj.confluenceAdjust}`)
  }

  // 3. TIME-OF-DAY ADJUSTMENT
  const now = new Date()
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etTime.getHours()
  const minute = etTime.getMinutes()
  const timeMinutes = hour * 60 + minute

  let timeAdj: { confluenceAdjust: number; confidenceAdjust: number } | null = null
  let timePeriod = ''

  if (timeMinutes >= 9 * 60 + 30 && timeMinutes < 10 * 60 + 30) {
    timeAdj = ADAPTIVE_CONFLUENCE.timeAdjustments.openingHour
    timePeriod = 'Opening Hour'
  } else if (timeMinutes >= 10 * 60 + 30 && timeMinutes < 14 * 60) {
    timeAdj = ADAPTIVE_CONFLUENCE.timeAdjustments.midDay
    timePeriod = 'Mid-Day'
  } else if (timeMinutes >= 14 * 60 && timeMinutes < 15 * 60) {
    timeAdj = ADAPTIVE_CONFLUENCE.timeAdjustments.afternoonPush
    timePeriod = 'Afternoon Push'
  } else if (timeMinutes >= 15 * 60 && timeMinutes < 16 * 60) {
    timeAdj = ADAPTIVE_CONFLUENCE.timeAdjustments.powerHour
    timePeriod = 'Power Hour'
  }

  if (timeAdj) {
    confluence += timeAdj.confluenceAdjust
    confidence += timeAdj.confidenceAdjust
    factors.push(`${timePeriod}: Confluence ${timeAdj.confluenceAdjust > 0 ? '+' : ''}${timeAdj.confluenceAdjust}`)
  }

  // 4. PERFORMANCE ADJUSTMENT
  // Check win streak
  for (const winAdj of ADAPTIVE_CONFLUENCE.performanceAdjustments.afterWinStreak) {
    if (performanceTracker.consecutiveWins >= winAdj.wins) {
      confluence += winAdj.confluenceAdjust
      confidence += winAdj.confidenceAdjust
      factors.push(`Win streak (${performanceTracker.consecutiveWins}): Confluence ${winAdj.confluenceAdjust}`)
      break
    }
  }

  // Check loss streak
  for (const lossAdj of ADAPTIVE_CONFLUENCE.performanceAdjustments.afterLossStreak) {
    if (performanceTracker.consecutiveLosses >= lossAdj.losses) {
      confluence += lossAdj.confluenceAdjust
      confidence += lossAdj.confidenceAdjust
      factors.push(`Loss streak (${performanceTracker.consecutiveLosses}): Confluence +${lossAdj.confluenceAdjust}`)
      break
    }
  }

  // 5. ENFORCE HARD LIMITS
  confluence = Math.max(ADAPTIVE_CONFLUENCE.minConfluence, Math.min(ADAPTIVE_CONFLUENCE.maxConfluence, confluence))
  confidence = Math.max(ADAPTIVE_CONFLUENCE.minConfidence, Math.min(ADAPTIVE_CONFLUENCE.maxConfidence, confidence))
  riskReward = Math.max(1.0, Math.min(5.0, riskReward))

  factors.push(`FINAL: Confluence ${confluence}, Confidence ${confidence}%, R:R ${riskReward.toFixed(2)}`)

  return {
    requiredConfluence: confluence,
    requiredConfidence: confidence,
    requiredRiskReward: riskReward,
    factors
  }
}

/**
 * Calculate adjusted take profit target based on regime
 */
function calculateAdjustedTarget(
  entryPrice: number,
  originalTarget: number,
  stopLoss: number,
  regime: string,
  direction: 'LONG' | 'SHORT'
): { adjustedTarget: number; extension: number; reason: string } {
  if (!PARTIAL_TP_CONFIG.targetExtension.enabled) {
    return { adjustedTarget: originalTarget, extension: 1.0, reason: 'Target extension disabled' }
  }

  const multiplier = PARTIAL_TP_CONFIG.targetExtension.regimeMultipliers[regime] ?? 1.0
  const clampedMultiplier = Math.max(
    PARTIAL_TP_CONFIG.targetExtension.minExtension,
    Math.min(PARTIAL_TP_CONFIG.targetExtension.maxExtension, multiplier)
  )

  const originalDistance = Math.abs(originalTarget - entryPrice)
  const adjustedDistance = originalDistance * clampedMultiplier

  let adjustedTarget: number
  if (direction === 'LONG') {
    adjustedTarget = entryPrice + adjustedDistance
  } else {
    adjustedTarget = entryPrice - adjustedDistance
  }

  const reason = clampedMultiplier > 1
    ? `Extended ${((clampedMultiplier - 1) * 100).toFixed(0)}% for ${regime}`
    : clampedMultiplier < 1
      ? `Reduced ${((1 - clampedMultiplier) * 100).toFixed(0)}% for ${regime}`
      : `Standard target for ${regime}`

  return { adjustedTarget, extension: clampedMultiplier, reason }
}

/**
 * Initialize advanced position state when entering a trade
 */
function initializeAdvancedPosition(
  contracts: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  currentATR: number,
  direction: 'LONG' | 'SHORT'
): void {
  advancedPositionState = {
    originalContracts: contracts,
    remainingContracts: contracts,
    partialExits: [],
    trailingStopActive: false,
    trailingStopPrice: null,
    highestPriceSinceEntry: entryPrice,
    lowestPriceSinceEntry: entryPrice,
    lastTrailUpdate: Date.now(),
    scaleOutLevelsHit: [],
    stopMovedToBreakeven: false,
    entryATR: currentATR,
    currentRMultiple: 0,
  }

  console.log(`[ADVANCED] Position initialized: ${contracts} contracts, ATR: ${currentATR.toFixed(2)}`)
}

/**
 * Check and execute partial take profits and trailing stop updates
 * Returns: { action: 'none' | 'partial_exit' | 'full_exit' | 'update_stop', details: ... }
 */
function checkAdvancedExitConditions(
  currentPrice: number,
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  originalStop: number,
  originalTarget: number
): {
  action: 'none' | 'partial_exit' | 'full_exit' | 'update_stop'
  contractsToExit?: number
  newStopLoss?: number
  reason?: string
  pnlPoints?: number
} {
  if (!advancedPositionState || advancedPositionState.remainingContracts <= 0) {
    return { action: 'none' }
  }

  const pos = advancedPositionState
  const stopDistance = Math.abs(entryPrice - originalStop)
  const targetDistance = Math.abs(originalTarget - entryPrice)

  // Calculate current profit in points
  let currentProfitPoints: number
  if (direction === 'LONG') {
    currentProfitPoints = currentPrice - entryPrice
    pos.highestPriceSinceEntry = Math.max(pos.highestPriceSinceEntry, currentPrice)
  } else {
    currentProfitPoints = entryPrice - currentPrice
    pos.lowestPriceSinceEntry = Math.min(pos.lowestPriceSinceEntry, currentPrice)
  }

  // Calculate R multiple
  pos.currentRMultiple = currentProfitPoints / stopDistance

  // =========================================================================
  // CHECK SCALE OUT LEVELS
  // =========================================================================
  for (let i = 0; i < PARTIAL_TP_CONFIG.scaleOutLevels.length; i++) {
    if (pos.scaleOutLevelsHit.includes(i)) continue // Already hit this level

    const level = PARTIAL_TP_CONFIG.scaleOutLevels[i]
    const targetAtLevel = targetDistance * level.targetRatio

    if (currentProfitPoints >= targetAtLevel) {
      // Hit this scale out level!
      const contractsToExit = Math.floor(pos.originalContracts * level.exitPercent)

      if (contractsToExit > 0 && contractsToExit <= pos.remainingContracts) {
        pos.scaleOutLevelsHit.push(i)

        // Determine new stop based on moveStopTo
        let newStop = originalStop
        if (level.moveStopTo === 'breakeven') {
          newStop = entryPrice
          pos.stopMovedToBreakeven = true
        } else if (level.moveStopTo === 'entry') {
          newStop = entryPrice
        } else if (level.moveStopTo === 'trail') {
          pos.trailingStopActive = true
          // Calculate initial trail position
          const trailDistance = PARTIAL_TP_CONFIG.trailingStop.useATR
            ? pos.entryATR * PARTIAL_TP_CONFIG.trailingStop.trailDistance
            : PARTIAL_TP_CONFIG.trailingStop.fixedPoints

          if (direction === 'LONG') {
            newStop = currentPrice - trailDistance
          } else {
            newStop = currentPrice + trailDistance
          }
          pos.trailingStopPrice = newStop
        }

        return {
          action: 'partial_exit',
          contractsToExit,
          newStopLoss: newStop,
          reason: `Scale out level ${i + 1}: ${(level.targetRatio * 100).toFixed(0)}% of target (${level.exitPercent * 100}% position)`,
          pnlPoints: currentProfitPoints,
        }
      }
    }
  }

  // =========================================================================
  // CHECK TRAILING STOP
  // =========================================================================
  if (pos.trailingStopActive && PARTIAL_TP_CONFIG.trailingStop.enabled) {
    const trailDistance = PARTIAL_TP_CONFIG.trailingStop.useATR
      ? pos.entryATR * PARTIAL_TP_CONFIG.trailingStop.trailDistance
      : PARTIAL_TP_CONFIG.trailingStop.fixedPoints

    const trailStep = PARTIAL_TP_CONFIG.trailingStop.useATR
      ? pos.entryATR * PARTIAL_TP_CONFIG.trailingStop.trailStep
      : 1

    let newTrailStop: number
    if (direction === 'LONG') {
      newTrailStop = pos.highestPriceSinceEntry - trailDistance
      // Only update if moved up by at least trailStep
      if (pos.trailingStopPrice && newTrailStop > pos.trailingStopPrice + trailStep) {
        pos.trailingStopPrice = newTrailStop
        pos.lastTrailUpdate = Date.now()
        return {
          action: 'update_stop',
          newStopLoss: newTrailStop,
          reason: `Trailing stop updated: ${newTrailStop.toFixed(2)} (${trailDistance.toFixed(1)} points behind high)`,
        }
      }
    } else {
      newTrailStop = pos.lowestPriceSinceEntry + trailDistance
      // Only update if moved down by at least trailStep
      if (pos.trailingStopPrice && newTrailStop < pos.trailingStopPrice - trailStep) {
        pos.trailingStopPrice = newTrailStop
        pos.lastTrailUpdate = Date.now()
        return {
          action: 'update_stop',
          newStopLoss: newTrailStop,
          reason: `Trailing stop updated: ${newTrailStop.toFixed(2)} (${trailDistance.toFixed(1)} points behind low)`,
        }
      }
    }

    // Check if trailing stop hit
    if (pos.trailingStopPrice) {
      const trailHit = direction === 'LONG'
        ? currentPrice <= pos.trailingStopPrice
        : currentPrice >= pos.trailingStopPrice

      if (trailHit) {
        return {
          action: 'full_exit',
          contractsToExit: pos.remainingContracts,
          reason: `Trailing stop hit at ${pos.trailingStopPrice.toFixed(2)}`,
          pnlPoints: currentProfitPoints,
        }
      }
    }
  }

  // =========================================================================
  // CHECK IF PROFIT > ACTIVATION THRESHOLD FOR TRAILING
  // =========================================================================
  if (!pos.trailingStopActive && PARTIAL_TP_CONFIG.trailingStop.enabled) {
    const activationDistance = pos.entryATR * PARTIAL_TP_CONFIG.trailingStop.activationMultiple

    if (currentProfitPoints >= activationDistance) {
      pos.trailingStopActive = true
      const trailDistance = PARTIAL_TP_CONFIG.trailingStop.useATR
        ? pos.entryATR * PARTIAL_TP_CONFIG.trailingStop.trailDistance
        : PARTIAL_TP_CONFIG.trailingStop.fixedPoints

      if (direction === 'LONG') {
        pos.trailingStopPrice = currentPrice - trailDistance
      } else {
        pos.trailingStopPrice = currentPrice + trailDistance
      }

      console.log(`[TRAIL] Trailing stop activated at ${pos.trailingStopPrice?.toFixed(2)} (${currentProfitPoints.toFixed(1)} points profit)`)
    }
  }

  return { action: 'none' }
}

/**
 * Record a partial exit
 */
function recordPartialExit(
  contracts: number,
  exitPrice: number,
  pnl: number,
  reason: string
): void {
  if (!advancedPositionState) return

  advancedPositionState.partialExits.push({
    contracts,
    exitPrice,
    exitTime: Date.now(),
    pnl,
    reason,
  })

  advancedPositionState.remainingContracts -= contracts

  console.log(`[PARTIAL] Exited ${contracts} contracts @ ${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)} | Remaining: ${advancedPositionState.remainingContracts}`)
}

/**
 * Update performance tracker after a trade
 */
function updatePerformanceTracker(
  pnl: number,
  regime: string,
  session: string
): void {
  // Update consecutive wins/losses
  if (pnl > 0) {
    performanceTracker.consecutiveWins++
    performanceTracker.consecutiveLosses = 0
  } else {
    performanceTracker.consecutiveLosses++
    performanceTracker.consecutiveWins = 0
  }

  // Update daily P&L
  performanceTracker.dailyPnL += pnl

  // Update drawdown
  if (performanceTracker.dailyPnL < 0) {
    performanceTracker.currentDrawdownPercent = Math.abs(performanceTracker.dailyPnL) / APEX_RULES.maxTrailingDrawdown * 100
  } else {
    performanceTracker.currentDrawdownPercent = 0
  }

  // Track by regime
  if (!performanceTracker.winRateByRegime[regime]) {
    performanceTracker.winRateByRegime[regime] = { wins: 0, losses: 0 }
  }
  if (pnl > 0) {
    performanceTracker.winRateByRegime[regime].wins++
  } else {
    performanceTracker.winRateByRegime[regime].losses++
  }

  // Track by session
  if (!performanceTracker.winRateBySession[session]) {
    performanceTracker.winRateBySession[session] = { wins: 0, losses: 0 }
  }
  if (pnl > 0) {
    performanceTracker.winRateBySession[session].wins++
  } else {
    performanceTracker.winRateBySession[session].losses++
  }

  // Add to recent trades (keep last 20)
  performanceTracker.recentTrades.push({ pnl, regime, session, time: Date.now() })
  if (performanceTracker.recentTrades.length > 20) {
    performanceTracker.recentTrades.shift()
  }

  console.log(`[PERF] Wins: ${performanceTracker.consecutiveWins} | Losses: ${performanceTracker.consecutiveLosses} | Daily P&L: $${performanceTracker.dailyPnL.toFixed(2)} | DD: ${performanceTracker.currentDrawdownPercent.toFixed(1)}%`)
}

/**
 * Reset daily performance tracking (call at start of each day)
 */
function resetDailyPerformance(): void {
  performanceTracker.dailyPnL = 0
  performanceTracker.currentDrawdownPercent = 0
  console.log('[PERF] Daily performance reset')
}

/**
 * Calculate ATR from candles
 */
function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 5 // Default ATR if not enough data

  const trs: number[] = []
  for (let i = 1; i < candles.length && trs.length < period; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trs.push(tr)
  }

  return trs.reduce((sum, tr) => sum + tr, 0) / trs.length
}

// =============================================================================
// APEX TRADING RULES
// =============================================================================

interface ApexTradingRules {
  // Trading hours (ET timezone)
  marketOpen: { hour: 18, minute: 0 }   // 6:00 PM ET (Sunday)
  marketClose: { hour: 16, minute: 59 } // 4:59 PM ET (Mon-Fri)
  // Requirements
  minTradingDays: 7        // Minimum 7 trading days to qualify
  profitTarget: 9000       // $9,000 profit target
  maxTrailingDrawdown: 5000 // $5,000 trailing drawdown
  maxContracts: 17         // Max 17 contracts for 150K account
}

const APEX_RULES: ApexTradingRules = {
  marketOpen: { hour: 18, minute: 0 },
  marketClose: { hour: 16, minute: 59 },
  minTradingDays: 7,
  profitTarget: 9000,
  maxTrailingDrawdown: 5000,
  maxContracts: 17,
}

// Track unique trading days
let tradingDayHistory: Set<string> = new Set()

/**
 * Check if market is open for trading
 * Apex rules: 6:00 PM ET Sunday - 4:59 PM ET Friday
 * Must close all trades by 4:59 PM ET each day
 */
function isMarketOpen(): { open: boolean; reason: string; minutesUntilClose?: number } {
  const now = new Date()

  // Convert to ET timezone
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etTime.getHours()
  const minute = etTime.getMinutes()
  const day = etTime.getDay() // 0 = Sunday, 6 = Saturday

  // Saturday - market closed
  if (day === 6) {
    return { open: false, reason: 'Market closed (Saturday)' }
  }

  // Sunday before 6 PM - market closed
  if (day === 0 && hour < 18) {
    const minutesUntilOpen = (18 - hour) * 60 - minute
    return { open: false, reason: `Market opens in ${minutesUntilOpen} minutes (6:00 PM ET)` }
  }

  // Friday after 4:59 PM - market closed
  if (day === 5 && (hour > 16 || (hour === 16 && minute >= 59))) {
    return { open: false, reason: 'Market closed (Friday after 4:59 PM ET)' }
  }

  // Mon-Fri: Check if before 4:59 PM
  if (day >= 1 && day <= 5) {
    // Check close time (4:59 PM)
    if (hour > 16 || (hour === 16 && minute >= 59)) {
      return { open: false, reason: 'Market closed (after 4:59 PM ET)' }
    }

    // Calculate minutes until 4:59 PM close
    const minutesUntilClose = ((16 * 60 + 59) - (hour * 60 + minute))

    // Warning if less than 15 minutes to close
    if (minutesUntilClose <= 15) {
      return {
        open: true,
        reason: `⚠️ CLOSE POSITIONS NOW - Only ${minutesUntilClose} min until 4:59 PM close!`,
        minutesUntilClose
      }
    }

    return { open: true, reason: 'Market open', minutesUntilClose }
  }

  // Sunday after 6 PM - market open
  if (day === 0 && hour >= 18) {
    return { open: true, reason: 'Market open (Sunday session)', minutesUntilClose: 60 * 22 + 59 }
  }

  return { open: true, reason: 'Market open' }
}

/**
 * Check if we need to auto-close position (4:45 PM safety margin)
 */
function shouldAutoClose(): { close: boolean; reason: string } {
  const now = new Date()
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = etTime.getHours()
  const minute = etTime.getMinutes()
  const day = etTime.getDay()

  // Mon-Fri: Auto-close at 4:45 PM (14 min before deadline)
  if (day >= 1 && day <= 5) {
    if (hour === 16 && minute >= 45) {
      return { close: true, reason: `AUTO-CLOSE: ${16 * 60 + 59 - (hour * 60 + minute)} min until 4:59 PM deadline` }
    }
    // Friday special: Close at 4:30 PM for safety
    if (day === 5 && hour === 16 && minute >= 30) {
      return { close: true, reason: 'AUTO-CLOSE: Friday early close for safety' }
    }
  }

  return { close: false, reason: '' }
}

/**
 * Record a trading day (for 7-day minimum tracking)
 */
function recordTradingDay(): number {
  const now = new Date()
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const dateStr = etTime.toISOString().split('T')[0] // YYYY-MM-DD

  tradingDayHistory.add(dateStr)
  return tradingDayHistory.size
}

/**
 * Get trading days count
 */
function getTradingDaysCount(): number {
  return tradingDayHistory.size
}

// =============================================================================
// ENGINES - ALL INITIALIZED
// =============================================================================

const orderFlowEngine = new OrderFlowEngine(50000, 50)
const vpinCalculator = new VPINCalculator(50000, 50)
const deltaAnalyzer = new DeltaAnalyzer()
const executionEngine = new SmartExecutionEngine()

// PickMyTrade client
let client: PickMyTradeClient | null = null

function getClient(): PickMyTradeClient | null {
  if (!client && process.env.PICKMYTRADE_TOKEN) {
    client = new PickMyTradeClient({
      token: process.env.PICKMYTRADE_TOKEN,
      accountId: process.env.APEX_ACCOUNT_ID || 'APEX-456334',
      platform: 'RITHMIC',
      defaultSymbol: getCurrentContractSymbol('ES'),
      maxContracts: 17,
      enabled: true,
    })
  }
  return client
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchCandles(
  instrument: 'ES' | 'NQ',
  timeframe: '1' | '5' | '15',
  count: number = 100
): Promise<Candle[]> {
  try {
    const symbol = instrument === 'ES' ? 'BTC_USDT' : 'ETH_USDT'
    const res = await fetch(
      `https://api.crypto.com/exchange/v1/public/get-candlestick?instrument_name=${symbol}&timeframe=${timeframe}m&count=${count}`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) throw new Error('Failed to fetch candles')

    const data = await res.json()

    if (data.result?.data) {
      // Scale to ES/NQ price range
      const basePrice = instrument === 'ES' ? 5900 : 20500
      const firstPrice = data.result.data[0]?.c || 1
      const scale = basePrice / firstPrice

      return data.result.data.map((c: any) => ({
        time: c.t,
        open: c.o * scale,
        high: c.h * scale,
        low: c.l * scale,
        close: c.c * scale,
        volume: c.v,
      }))
    }

    return []
  } catch (e) {
    console.error('Failed to fetch candles:', e)
    return []
  }
}

// =============================================================================
// SIMULATE TRADE DATA FROM CANDLES (For Order Flow Analysis)
// =============================================================================

function simulateTradesFromCandles(candles: Candle[]): OrderFlowTrade[] {
  const trades: OrderFlowTrade[] = []

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]
    const prevCandle = candles[i - 1]

    // Simulate trades based on candle characteristics
    const isBullish = candle.close > candle.open
    const range = candle.high - candle.low
    const body = Math.abs(candle.close - candle.open)
    const volumePerTrade = candle.volume / 10 // Split into ~10 trades

    // Generate multiple trades per candle
    for (let j = 0; j < 10; j++) {
      const priceVariation = (Math.random() - 0.5) * range
      const price = (candle.open + candle.close) / 2 + priceVariation

      // Determine side based on price action
      let side: 'buy' | 'sell'
      if (isBullish) {
        side = Math.random() > 0.35 ? 'buy' : 'sell' // 65% buys in bullish
      } else {
        side = Math.random() > 0.35 ? 'sell' : 'buy' // 65% sells in bearish
      }

      trades.push({
        id: `T${candle.time}-${j}`,
        instrumentName: 'ES', // Futures contract
        price,
        quantity: volumePerTrade * (0.5 + Math.random()),
        side,
        timestamp: candle.time + j * 6000,
        isMaker: Math.random() > 0.4, // 60% are maker trades
      })
    }
  }

  return trades
}

// =============================================================================
// SIMULATE ORDER BOOK FROM CANDLES
// =============================================================================

function simulateOrderBook(candles: Candle[]): OrderBookData {
  const lastCandle = candles[candles.length - 1]
  const currentPrice = lastCandle.close
  const spread = (lastCandle.high - lastCandle.low) * 0.01 // 1% of range

  const bids: [number, number][] = []
  const asks: [number, number][] = []

  // Generate 20 levels each side
  for (let i = 0; i < 20; i++) {
    const bidPrice = currentPrice - spread * (i + 1)
    const askPrice = currentPrice + spread * (i + 1)

    // Size decreases as we move away from price
    const bidSize = lastCandle.volume * (0.1 - i * 0.004) * (0.8 + Math.random() * 0.4)
    const askSize = lastCandle.volume * (0.1 - i * 0.004) * (0.8 + Math.random() * 0.4)

    bids.push([bidPrice, Math.max(1, bidSize)])
    asks.push([askPrice, Math.max(1, askSize)])
  }

  return {
    bids,
    asks,
    timestamp: Date.now(),
  }
}

// =============================================================================
// CALCULATE MARKET CONDITIONS
// =============================================================================

function calculateMarketConditions(
  candles: Candle[],
  orderBook: OrderBookData,
  trades: OrderFlowTrade[]
): MarketConditions {
  const lastCandle = candles[candles.length - 1]

  // Spread
  const bestBid = orderBook.bids[0]?.[0] || lastCandle.close
  const bestAsk = orderBook.asks[0]?.[0] || lastCandle.close
  const midPrice = (bestBid + bestAsk) / 2
  const spread = bestAsk - bestBid
  const spreadPercent = midPrice > 0 ? spread / midPrice : 0

  // Depth
  const bidDepth = orderBook.bids.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0)
  const askDepth = orderBook.asks.slice(0, 10).reduce((sum, [, qty]) => sum + qty, 0)
  const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth)

  // Volume
  const recentVolume = trades.reduce((sum, t) => sum + t.quantity, 0)
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20

  // Volatility
  const returns = candles.slice(-20).map((c, i, arr) =>
    i > 0 ? (c.close - arr[i - 1].close) / arr[i - 1].close : 0
  ).slice(1)
  const volatility = Math.sqrt(
    returns.reduce((sum, r) => sum + r * r, 0) / returns.length
  )

  // Toxicity (informed flow indicator)
  const buyVolume = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.quantity, 0)
  const sellVolume = trades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.quantity, 0)
  const totalVolume = buyVolume + sellVolume
  const toxicity = totalVolume > 0 ? Math.abs(buyVolume - sellVolume) / totalVolume : 0

  return {
    spread,
    spreadPercent,
    bidDepth,
    askDepth,
    imbalance,
    volatility,
    recentVolume,
    avgVolume,
    toxicity,
  }
}

// =============================================================================
// SELECT OPTIMAL EXECUTION ALGORITHM
// =============================================================================

function selectExecutionAlgorithm(
  direction: 'LONG' | 'SHORT',
  contracts: number,
  conditions: MarketConditions,
  urgency: number
): ExecutionAlgorithm {
  // High toxicity = use ADAPTIVE to avoid adverse selection
  if (conditions.toxicity > 0.6) {
    return 'ADAPTIVE'
  }

  // Favorable imbalance = use SNIPER for best fills
  if ((direction === 'LONG' && conditions.imbalance > 0.3) ||
      (direction === 'SHORT' && conditions.imbalance < -0.3)) {
    return 'SNIPER'
  }

  // Large order relative to liquidity = use ICEBERG
  const depth = direction === 'LONG' ? conditions.askDepth : conditions.bidDepth
  if (contracts > depth * 0.3) {
    return 'ICEBERG'
  }

  // High volatility = use TWAP to average out
  if (conditions.volatility > 0.02) {
    return 'TWAP'
  }

  // Normal conditions with urgency = VWAP
  if (urgency > 0.7) {
    return 'VWAP'
  }

  // Default to ADAPTIVE
  return 'ADAPTIVE'
}

// =============================================================================
// FULLY INTEGRATED AUTO-TRADING LOOP
// =============================================================================

async function runAutoTrader(): Promise<void> {
  if (!state.enabled) return

  state.lastCheck = Date.now()

  // ==========================================================================
  // APEX RULE: Check Market Hours (6 PM ET - 4:59 PM ET)
  // ==========================================================================
  const marketStatus = isMarketOpen()
  console.log(`[MARKET] ${marketStatus.reason}`)

  if (!marketStatus.open) {
    console.log('[AutoTrade] Market closed - no trading allowed')
    return
  }

  // ==========================================================================
  // APEX RULE: Auto-close at 4:45 PM (14 min before 4:59 deadline)
  // ==========================================================================
  const autoCloseCheck = shouldAutoClose()
  if (autoCloseCheck.close && state.position) {
    console.log(`[APEX RULE] ${autoCloseCheck.reason}`)
    const candles = await fetchCandles(state.instrument, '1', 1)
    const currentPrice = candles[0]?.close || state.position.entryPrice
    const conditions = state.marketConditions || {
      spread: 0.25, spreadPercent: 0.00005, bidDepth: 1000, askDepth: 1000,
      imbalance: 0, volatility: 0.01, recentVolume: 10000, avgVolume: 10000, toxicity: 0.3
    }
    await executeExitAdvanced('APEX 4:59 PM Rule - Auto Close', currentPrice, conditions)
    return
  }

  // Warn if less than 30 minutes to close
  if (marketStatus.minutesUntilClose && marketStatus.minutesUntilClose < 30) {
    console.log(`⚠️ WARNING: Only ${marketStatus.minutesUntilClose} min until market close - NO NEW ENTRIES`)
    if (state.position) {
      console.log('[CLOSE WARNING] Consider closing position soon!')
    }
    // Don't enter new trades within 30 min of close
    return
  }

  console.log('\n========== AUTO-TRADER CYCLE ==========')

  // ==========================================================================
  // STEP 1: RISK CHECK (Apex Safety)
  // ==========================================================================
  console.log('[STEP 1] Checking risk status...')

  // APEX: No time limit - you can take as long as you need
  // Only pass targetDays if user sets a personal goal
  const targetDays = state.targetDays || 30 // Default: relaxed 30-day personal goal
  const riskStatus = checkApexRiskStatus(
    state.startBalance,
    state.currentBalance,
    state.todayPnL,
    state.highWaterMark,
    state.tradingDays,
    DEFAULT_APEX_SAFETY,
    targetDays
  )
  state.lastRiskStatus = riskStatus

  if (!riskStatus.canTrade) {
    console.log('[RISK] BLOCKED:', riskStatus.warnings.join(', '))
    return
  }
  console.log(`[RISK] Status: ${riskStatus.riskStatus} | Buffer: $${riskStatus.safetyBuffer.toFixed(0)}`)

  // ==========================================================================
  // STEP 2: FETCH MULTI-TIMEFRAME DATA
  // ==========================================================================
  console.log('[STEP 2] Fetching market data...')

  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchCandles(state.instrument, '1', 100),
    fetchCandles(state.instrument, '5', 100),
    fetchCandles(state.instrument, '15', 100),
  ])

  if (candles1m.length < 50 || candles5m.length < 50 || candles15m.length < 50) {
    console.log('[DATA] Insufficient candle data')
    return
  }

  const currentPrice = candles1m[candles1m.length - 1].close
  console.log(`[DATA] Current price: ${currentPrice.toFixed(2)}`)

  // ==========================================================================
  // STEP 3: ORDER FLOW ANALYSIS
  // ==========================================================================
  console.log('[STEP 3] Analyzing order flow...')

  const simulatedTrades = simulateTradesFromCandles(candles1m.slice(-20))
  const orderBook = simulateOrderBook(candles1m)

  // Feed trades to order flow engine
  orderFlowEngine.addTrades(simulatedTrades)

  // Calculate VPIN
  const vpin = vpinCalculator.addTrades(simulatedTrades)
  state.vpin = vpin
  console.log(`[VPIN] ${(vpin.vpin * 100).toFixed(1)}% | Toxicity: ${vpin.toxicity}`)

  // Calculate Delta
  const delta = deltaAnalyzer.calculateDelta(simulatedTrades)
  state.delta = delta
  console.log(`[DELTA] Imbalance: ${(delta.imbalanceRatio * 100).toFixed(1)}% | Divergence: ${delta.deltaDivergence}`)

  // Detect large orders
  const largeOrder = detectLargeOrders(simulatedTrades, orderBook)
  state.largeOrderDetected = largeOrder.detected
  state.largeOrderSide = largeOrder.detected ? largeOrder.side : null
  if (largeOrder.detected) {
    console.log(`[FLOW] Large ${largeOrder.side} detected: ${largeOrder.estimatedSize.toFixed(0)} | Iceberg: ${largeOrder.isIceberg}`)
  }

  // Generate order flow signal
  const orderFlowSignal = orderFlowEngine.generateSignal(orderBook, candles5m)
  state.lastOrderFlow = orderFlowSignal
  console.log(`[FLOW] Signal: ${orderFlowSignal.direction} | Strength: ${orderFlowSignal.strength.toFixed(0)}`)

  // ==========================================================================
  // STEP 4: ML SIGNAL ENGINE (Neural Network Ensemble)
  // ==========================================================================
  console.log('[STEP 4] Generating ML signal...')

  const mlSignal = generateMLSignal(candles5m)
  state.lastMLSignal = mlSignal
  state.marketRegime = mlSignal.regime || null
  console.log(`[ML] Direction: ${mlSignal.direction} | Confidence: ${(mlSignal.confidence * 100).toFixed(0)}%`)
  console.log(`[ML] Regime: ${mlSignal.regime?.type || 'Unknown'} | Patterns: ${mlSignal.patterns.length}`)

  // ==========================================================================
  // STEP 5: TRADITIONAL SIGNAL ENGINE
  // ==========================================================================
  console.log('[STEP 5] Generating traditional signal...')

  const traditionalSignal = generateSignal(candles1m, candles5m, candles15m, state.instrument)
  state.lastSignal = traditionalSignal
  console.log(`[TRAD] Direction: ${traditionalSignal.direction} | Confidence: ${traditionalSignal.confidence.toFixed(0)}%`)

  // ==========================================================================
  // STEP 6: CALCULATE MARKET CONDITIONS
  // ==========================================================================
  console.log('[STEP 6] Analyzing market conditions...')

  const conditions = calculateMarketConditions(candles1m, orderBook, simulatedTrades)
  state.marketConditions = conditions
  console.log(`[MKT] Spread: ${(conditions.spreadPercent * 100).toFixed(3)}% | Imbalance: ${(conditions.imbalance * 100).toFixed(1)}%`)
  console.log(`[MKT] Volatility: ${(conditions.volatility * 100).toFixed(2)}% | Toxicity: ${(conditions.toxicity * 100).toFixed(1)}%`)

  // ==========================================================================
  // STEP 7: WORLD-CLASS REGIME DETECTION (from paper trading system)
  // ==========================================================================
  console.log('[STEP 7] Detecting market regime...')

  const regimeAnalysis = classifyMarketRegime(candles1m, 100)
  const currentRegime = regimeAnalysis.current
  const regimeTrend = regimeAnalysis.trendStrength

  console.log(`[REGIME] ${currentRegime} | Trend: ${regimeTrend.toFixed(0)}% | Volatility: ${regimeAnalysis.volatilityPercentile.toFixed(0)}%`)

  // Get optimal strategies for current regime
  const optimalStrategies = DYNAMIC_STRATEGY_SYSTEM.regimeStrategies[currentRegime] ||
                            DYNAMIC_STRATEGY_SYSTEM.regimeStrategies['UNKNOWN']
  console.log(`[REGIME] Optimal strategies: ${optimalStrategies.slice(0, 3).join(', ')}`)

  // ==========================================================================
  // STEP 7.5: WORLD-CLASS STRATEGIES (11 strategies from paper trading)
  // ==========================================================================
  console.log('[STEP 7.5] Generating world-class strategy signals...')

  // Use existing currentPrice from above (line ~1598)
  // Calculate VWAP and stdDev for world-class strategies
  const vwapPrices = candles1m.slice(-50).map(c => c.close)
  const vwapAvg = vwapPrices.reduce((s, p) => s + p, 0) / vwapPrices.length
  const vwapStdDev = Math.sqrt(
    vwapPrices.reduce((sum, p) => sum + Math.pow(p - vwapAvg, 2), 0) / vwapPrices.length
  ) || 10

  // Calculate session data from recent candles
  const last100 = candles1m.slice(-100)
  const sessionHigh = Math.max(...last100.map(c => c.high))
  const sessionLow = Math.min(...last100.map(c => c.low))

  // Get prop firm risk status for world-class strategies
  // Signature: (balance, startingBalance, maxDrawdown, dailyPnL, consecutiveLosses, dailyTrades)
  const propFirmRisk = calculatePropFirmRisk(
    150000 + state.todayPnL,   // Current balance
    150000,                     // Starting balance
    6000,                       // Max drawdown
    state.todayPnL,             // Daily P&L
    0,                          // Consecutive losses handled separately
    state.todayTrades.length    // Daily trade count
  )

  // Generate ALL world-class signals (same as paper trading)
  const worldClassResult = generateAllWorldClassSignals(
    candles1m,
    candles5m.slice(-50),
    candles15m.slice(-30),
    { high: sessionHigh, low: sessionLow, formed: true },
    {
      asia: { high: currentPrice, low: currentPrice },
      london: { high: currentPrice, low: currentPrice },
      ny: { high: sessionHigh, low: sessionLow },
    },
    { vwap: vwapAvg, stdDev: vwapStdDev },
    propFirmRisk
  )

  console.log(`[WCS] ${worldClassResult.signals.length} signals from 11 strategies | ${worldClassResult.reason}`)

  // Get best world-class signal
  const bestWorldClassSignal = worldClassResult.signals[0]?.signal || null
  if (bestWorldClassSignal) {
    console.log(`[WCS] Best: ${bestWorldClassSignal.type} ${bestWorldClassSignal.direction} | Quality: ${bestWorldClassSignal.qualityScore}`)
  }

  // ==========================================================================
  // STEP 8: ENHANCED CONFLUENCE SCORING (7-factor system from paper trading)
  // ==========================================================================
  console.log('[STEP 8] Calculating enhanced confluence...')

  const factors: string[] = []
  const mlDir = mlSignal.direction === 'NEUTRAL' ? 'FLAT' : mlSignal.direction

  // Calculate RSI for momentum check (approximation from candles)
  const closes = candles1m.slice(-14).map(c => c.close)
  const gains = closes.slice(1).map((c, i) => Math.max(0, c - closes[i]))
  const losses = closes.slice(1).map((c, i) => Math.max(0, closes[i] - c))
  const avgGain = gains.reduce((s, g) => s + g, 0) / 14
  const avgLoss = losses.reduce((s, l) => s + l, 0) / 14
  const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))

  // Calculate enhanced confluence score (100 points max)
  let signalCount = 0
  let totalConfidence = 0

  // Count agreeing signals
  if (mlDir !== 'FLAT') signalCount++
  if (traditionalSignal.direction === mlDir && traditionalSignal.direction !== 'FLAT') signalCount++
  if (orderFlowSignal.direction === mlDir) signalCount++
  if ((mlDir === 'LONG' && delta.imbalanceRatio > 0.1) || (mlDir === 'SHORT' && delta.imbalanceRatio < -0.1)) signalCount++

  // 1. SIGNAL COUNT SCORE (20 points max)
  const signalCountScore = Math.min(20, signalCount * 5 + 5)
  factors.push(`Signals: ${signalCount} (${signalCountScore}pts)`)

  // 2. CONFIDENCE SCORE (25 points max)
  totalConfidence = (mlSignal.confidence * 100 + traditionalSignal.confidence) / 2
  const confidenceScore = (totalConfidence / 100) * 25
  factors.push(`Confidence: ${totalConfidence.toFixed(0)}% (${confidenceScore.toFixed(0)}pts)`)

  // 3. REGIME ALIGNMENT SCORE (15 points max)
  let regimeScore = 0
  if (currentRegime.includes('TREND') && mlDir !== 'FLAT') {
    if ((currentRegime.includes('UP') && mlDir === 'LONG') ||
        (currentRegime.includes('DOWN') && mlDir === 'SHORT')) {
      regimeScore = 15
      factors.push(`Regime aligned: ${currentRegime} (15pts)`)
    }
  } else if (currentRegime === 'RANGE_TIGHT' || currentRegime === 'RANGE_WIDE') {
    regimeScore = 10 // Mean reversion still works
    factors.push(`Range regime (10pts)`)
  }

  // 4. SESSION ALIGNMENT SCORE (10 points max)
  const session = getCurrentSession()
  let sessionScore = 5 // Base score
  const sessionBoost = DYNAMIC_STRATEGY_SYSTEM.sessionBoosts[session]
  if (sessionBoost) {
    sessionScore = 10
    factors.push(`Session boost: ${session} (10pts)`)
  }

  // 5. MOMENTUM CONFIRMATION (15 points max)
  let momentumScore = 0
  if (mlDir === 'LONG') {
    if (rsi > 40 && rsi < 70) momentumScore += 8
    if (delta.imbalanceRatio > 0) momentumScore += 7
  } else if (mlDir === 'SHORT') {
    if (rsi < 60 && rsi > 30) momentumScore += 8
    if (delta.imbalanceRatio < 0) momentumScore += 7
  }
  if (momentumScore > 0) factors.push(`Momentum: RSI=${rsi.toFixed(0)} (${momentumScore}pts)`)

  // 6. ORDER FLOW SCORE (10 points max)
  let orderFlowScore = 0
  if (vpin.signal === 'SAFE') {
    orderFlowScore += 5
    factors.push('VPIN safe (5pts)')
  } else if (vpin.signal === 'DANGER') {
    orderFlowScore -= 10
    factors.push('VPIN DANGER (-10pts)')
  }
  if (largeOrder.detected) {
    if ((largeOrder.side === 'BUY' && mlDir === 'LONG') || (largeOrder.side === 'SELL' && mlDir === 'SHORT')) {
      orderFlowScore += 5
      factors.push(`Large ${largeOrder.side} supports (5pts)`)
    }
  }

  // 7. PATTERN QUALITY SCORE (5 points max)
  const patterns = mlSignal.patterns.length
  const patternScore = Math.min(5, patterns * 2)
  if (patterns > 0) factors.push(`Patterns: ${patterns} (${patternScore}pts)`)

  // 8. WORLD-CLASS STRATEGY SCORE (20 points max) - CRITICAL FOR PAPER/LIVE CONSISTENCY
  let worldClassScore = 0
  if (worldClassResult.signals.length > 0) {
    // Add points for each agreeing world-class signal
    const agreeing = worldClassResult.signals.filter(s =>
      (s.signal.direction === 'LONG' && mlDir === 'LONG') ||
      (s.signal.direction === 'SHORT' && mlDir === 'SHORT')
    )
    worldClassScore = Math.min(20, agreeing.length * 7 + (bestWorldClassSignal?.qualityScore || 0) / 5)

    if (agreeing.length > 0) {
      // Add to signal count for confluence
      signalCount += agreeing.length
      factors.push(`WCS: ${agreeing.length}/${worldClassResult.signals.length} agree (${worldClassScore.toFixed(0)}pts)`)
    }
  }

  // TOTAL CONFLUENCE SCORE (now includes world-class strategies)
  let confluenceScore = signalCountScore + confidenceScore + regimeScore + sessionScore + momentumScore + orderFlowScore + patternScore + worldClassScore

  // ==========================================================================
  // ADAPTIVE THRESHOLDS - Dynamic based on regime, session, and performance
  // ==========================================================================
  const adaptiveThresholds = calculateAdaptiveThresholds(currentRegime, session)

  console.log('[ADAPTIVE] Calculating dynamic thresholds...')
  adaptiveThresholds.factors.forEach(f => console.log(`  - ${f}`))

  const requiredConfluence = adaptiveThresholds.requiredConfluence
  const requiredConfidence = adaptiveThresholds.requiredConfidence
  const requiredRiskReward = adaptiveThresholds.requiredRiskReward

  // TIME BETWEEN TRADES CHECK
  const minutesSinceLastTrade = (Date.now() - liveLastTradeTime) / 60000
  const canTradeTime = minutesSinceLastTrade >= LIVE_PROFIT_CONFIG.minTimeBetweenTrades ||
                       liveLastTradeTime === 0

  // DAILY TRADE COUNT CHECK
  const canTradeDailyLimit = liveDailyTradeCount < LIVE_PROFIT_CONFIG.maxTradesPerDay

  // ==========================================================================
  // DYNAMIC CONTRACT SIZING - Based on regime, confluence, volatility
  // ==========================================================================
  const currentATR = calculateATR(candles1m, 14)
  const dynamicSize = calculateDynamicContractSize(currentRegime, confluenceScore, currentATR, session)

  console.log('[SIZING] Dynamic contract calculation:')
  dynamicSize.factors.forEach(f => console.log(`  - ${f}`))

  state.signalConfluence = confluenceScore
  state.confluenceFactors = factors

  console.log(`[CONFLUENCE] Score: ${confluenceScore.toFixed(0)} / 100 (need ${requiredConfluence} for ${currentRegime})`)
  console.log(`[ADAPTIVE] Confidence need: ${requiredConfidence}% | R:R need: ${requiredRiskReward.toFixed(2)}`)
  console.log(`[SIZING] Contracts: ${dynamicSize.contracts} | ATR: ${currentATR.toFixed(2)}`)
  console.log(`[RISK] Consecutive losses: ${liveConsecutiveLosses} | Daily trades: ${liveDailyTradeCount}/${LIVE_PROFIT_CONFIG.maxTradesPerDay}`)
  console.log(`[TIME] Minutes since last trade: ${minutesSinceLastTrade.toFixed(0)} (need ${LIVE_PROFIT_CONFIG.minTimeBetweenTrades})`)
  factors.forEach(f => console.log(`  - ${f}`))

  // ==========================================================================
  // STEP 9: DETERMINE FINAL DIRECTION (with strict live trading requirements)
  // ==========================================================================
  console.log('[STEP 9] Determining final direction...')

  let finalDirection: 'LONG' | 'SHORT' | 'FLAT' = 'FLAT'
  let finalConfidence = 0

  // LIVE TRADING GATE: All conditions must pass (NOW USING ADAPTIVE THRESHOLDS)
  const passesConfluence = confluenceScore >= requiredConfluence
  const passesSignalCount = signalCount >= DYNAMIC_STRATEGY_SYSTEM.confluence.minStrategiesAgreeing
  const passesMomentum = momentumScore >= 5
  const passesRiskCheck = canTradeDailyLimit && canTradeTime
  const passesContractSize = dynamicSize.contracts > 0  // Illiquid markets will have 0 contracts

  // Adaptive confidence check - use dynamic threshold instead of fixed 70%
  const mlConfidencePercent = mlSignal.confidence * 100
  const tradConfidence = traditionalSignal.confidence
  const passesConfidenceML = mlConfidencePercent >= requiredConfidence && mlSignal.direction !== 'NEUTRAL'
  const passesConfidenceTrad = tradConfidence >= requiredConfidence && traditionalSignal.direction !== 'FLAT'

  if (passesConfluence && passesSignalCount && passesMomentum && passesRiskCheck && passesContractSize) {
    if (passesConfidenceML) {
      finalDirection = mlSignal.direction as 'LONG' | 'SHORT'
      finalConfidence = Math.min(95, (mlConfidencePercent + confluenceScore) / 2)
    } else if (passesConfidenceTrad) {
      finalDirection = traditionalSignal.direction as 'LONG' | 'SHORT'
      finalConfidence = Math.min(90, (tradConfidence + confluenceScore) / 2)
    }
  } else {
    // Log why we're not trading
    if (!passesConfluence) console.log(`[BLOCKED] Confluence ${confluenceScore.toFixed(0)} < ${requiredConfluence} (adaptive for ${currentRegime})`)
    if (!passesSignalCount) console.log(`[BLOCKED] Signal count ${signalCount} < 2`)
    if (!passesMomentum) console.log(`[BLOCKED] Momentum ${momentumScore} < 5`)
    if (!canTradeDailyLimit) console.log(`[BLOCKED] Daily limit reached`)
    if (!canTradeTime) console.log(`[BLOCKED] Need ${(LIVE_PROFIT_CONFIG.minTimeBetweenTrades - minutesSinceLastTrade).toFixed(0)} more minutes`)
    if (!passesContractSize) console.log(`[BLOCKED] Contract size is 0 - market conditions unfavorable`)
    if (!passesConfidenceML && !passesConfidenceTrad) console.log(`[BLOCKED] Confidence below adaptive threshold ${requiredConfidence}%`)
  }

  console.log(`[FINAL] Direction: ${finalDirection} | Confidence: ${finalConfidence.toFixed(0)}% | Regime: ${currentRegime} | Contracts: ${dynamicSize.contracts}`)

  // ==========================================================================
  // STEP 10: ADVANCED POSITION MANAGEMENT WITH PARTIAL EXITS & TRAILING
  // ==========================================================================
  console.log('[STEP 10] Advanced position management...')

  if (state.position) {
    // ========================================================================
    // CHECK ADVANCED EXIT CONDITIONS (Partial profits, trailing stops)
    // ========================================================================
    const advancedExit = checkAdvancedExitConditions(
      currentPrice,
      state.position.direction,
      state.position.entryPrice,
      state.position.stopLoss,
      state.position.takeProfit
    )

    if (advancedExit.action === 'partial_exit' && advancedExit.contractsToExit) {
      console.log(`[PARTIAL EXIT] ${advancedExit.reason}`)

      // Calculate P&L for partial exit
      const pointValue = state.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE
      const pnlPoints = advancedExit.pnlPoints || 0
      const partialPnL = pnlPoints * pointValue * advancedExit.contractsToExit

      // Record partial exit
      recordPartialExit(advancedExit.contractsToExit, currentPrice, partialPnL, advancedExit.reason || '')

      // Update stop loss if specified
      if (advancedExit.newStopLoss) {
        state.position.stopLoss = advancedExit.newStopLoss
        console.log(`[STOP MOVED] New stop: ${advancedExit.newStopLoss.toFixed(2)}`)
      }

      // Update position contracts
      state.position.contracts = advancedPositionState?.remainingContracts || state.position.contracts - advancedExit.contractsToExit

      // Update balance with partial profit
      state.currentBalance += partialPnL
      state.todayPnL += partialPnL

      // If no contracts remaining, close position fully
      if (state.position.contracts <= 0) {
        console.log('[FULL EXIT] All contracts exited via partial exits')
        updatePerformanceTracker(partialPnL, currentRegime, session)
        state.position = null
        advancedPositionState = null
        return
      }
    } else if (advancedExit.action === 'update_stop' && advancedExit.newStopLoss) {
      console.log(`[TRAIL UPDATE] ${advancedExit.reason}`)
      state.position.stopLoss = advancedExit.newStopLoss
    } else if (advancedExit.action === 'full_exit') {
      console.log(`[TRAIL EXIT] ${advancedExit.reason}`)
      await executeExitAdvanced(advancedExit.reason || 'Trailing Stop', currentPrice, conditions)
      return
    }

    // ========================================================================
    // STANDARD STOP LOSS CHECK (after any trailing stop updates)
    // ========================================================================
    const effectiveStop = advancedPositionState?.trailingStopPrice || state.position.stopLoss

    if (state.position.direction === 'LONG' && currentPrice <= effectiveStop) {
      console.log(`[EXIT] Stop loss hit at ${effectiveStop.toFixed(2)}`)
      await executeExitAdvanced('Stop Loss Hit', currentPrice, conditions)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice >= effectiveStop) {
      console.log(`[EXIT] Stop loss hit at ${effectiveStop.toFixed(2)}`)
      await executeExitAdvanced('Stop Loss Hit', currentPrice, conditions)
      return
    }

    // ========================================================================
    // FULL TAKE PROFIT CHECK (for remaining contracts)
    // ========================================================================
    if (state.position.direction === 'LONG' && currentPrice >= state.position.takeProfit) {
      console.log('[EXIT] Full take profit hit')
      await executeExitAdvanced('Take Profit Hit', currentPrice, conditions)
      return
    }
    if (state.position.direction === 'SHORT' && currentPrice <= state.position.takeProfit) {
      console.log('[EXIT] Full take profit hit')
      await executeExitAdvanced('Take Profit Hit', currentPrice, conditions)
      return
    }

    // ========================================================================
    // REVERSAL CHECK (only for high confluence reversals)
    // ========================================================================
    if (finalDirection !== 'FLAT' &&
        finalDirection !== state.position.direction &&
        finalConfidence > 75 &&
        confluenceScore >= requiredConfluence + 10) {  // Need EXTRA confluence for reversal
      console.log('[REVERSAL] High confluence reversal signal detected')
      await executeExitAdvanced('Reversal Signal', currentPrice, conditions)
      await executeEntryAdvancedWithDynamicSize(finalDirection, finalConfidence, mlSignal, traditionalSignal, conditions, dynamicSize.contracts, currentATR, currentRegime)
    }
  } else {
    // ========================================================================
    // NO POSITION - LOOK FOR ENTRY WITH DYNAMIC SIZING
    // ========================================================================
    if (finalDirection !== 'FLAT' && passesConfluence && (passesConfidenceML || passesConfidenceTrad)) {
      console.log(`[ENTRY] Adaptive entry - ${currentRegime} regime with ${dynamicSize.contracts} contracts`)
      await executeEntryAdvancedWithDynamicSize(finalDirection, finalConfidence, mlSignal, traditionalSignal, conditions, dynamicSize.contracts, currentATR, currentRegime)
    } else {
      console.log('[WAIT] No valid entry signal (adaptive thresholds not met)')
    }
  }

  console.log('========================================\n')
}

// =============================================================================
// ADVANCED ENTRY WITH SMART EXECUTION
// =============================================================================

async function executeEntryAdvanced(
  direction: 'LONG' | 'SHORT',
  confidence: number,
  mlSignal: MLSignal,
  tradSignal: Signal,
  conditions: MarketConditions
): Promise<boolean> {
  const riskStatus = state.lastRiskStatus
  if (!riskStatus || !riskStatus.canTrade) {
    console.log('[EXEC] Risk status blocking trade')
    return false
  }

  // Get risk-adjusted position size
  const positionRec = calculateSafePositionSize(
    riskStatus,
    state.instrument === 'ES' ? 12.50 : 5.00,
    8,
    state.instrument === 'ES' ? 17 : 10
  )

  if (positionRec.recommendedContracts === 0) {
    console.log('[EXEC] Position size recommendation is 0')
    return false
  }

  // Select optimal execution algorithm
  const algorithm = selectExecutionAlgorithm(direction, positionRec.recommendedContracts, conditions, confidence / 100)
  state.executionAlgorithm = algorithm
  console.log(`[EXEC] Using ${algorithm} algorithm`)

  const symbol = getCurrentContractSymbol(state.instrument)
  const pointValue = state.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE

  // Use ML signal levels
  const entry = mlSignal.entry || tradSignal.entry
  const stopLoss = mlSignal.stopLoss || tradSignal.stopLoss
  const takeProfit = mlSignal.takeProfit || tradSignal.takeProfit

  const stopDistance = Math.abs(entry - stopLoss)
  const targetDistance = Math.abs(takeProfit - entry)

  // Scale contracts based on confidence
  const confidenceMultiplier = Math.min(1, confidence / 80)
  const contracts = Math.max(1, Math.floor(positionRec.recommendedContracts * confidenceMultiplier))

  const dollarStop = stopDistance * pointValue * contracts
  const dollarTarget = targetDistance * pointValue * contracts

  // Create execution plan
  const order = executionEngine.createOrder(
    symbol,
    direction === 'LONG' ? 'BUY' : 'SELL',
    contracts,
    algorithm,
    entry,
    { urgency: confidence / 100, maxSlippage: 0.002 }
  )

  const executionPlan = executionEngine.generatePlan(order, conditions)

  console.log(`[EXEC] Entry: ${entry.toFixed(2)} | Stop: ${stopLoss.toFixed(2)} | Target: ${takeProfit.toFixed(2)}`)
  console.log(`[EXEC] Contracts: ${contracts} | Stop$: ${dollarStop.toFixed(0)} | Target$: ${dollarTarget.toFixed(0)}`)
  console.log(`[EXEC] Est. Slippage: ${(executionPlan.estimatedSlippage * 100).toFixed(3)}% | Est. Cost: $${executionPlan.estimatedCost.toFixed(2)}`)

  // PAPER MODE: Simulate trade without real execution
  if (state.paperMode) {
    console.log(`[PAPER] SIMULATED ${direction} ${contracts}x ${symbol} @ ${entry.toFixed(2)}`)
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    return true
  }

  // LIVE MODE: Execute via PickMyTrade
  const pmt = getClient()
  if (!pmt || !pmt.isEnabled) {
    console.log('[EXEC] PickMyTrade not available - enable live trading first')
    return false
  }

  const result = await pmt.executeSignal({
    action: direction === 'LONG' ? 'BUY' : 'SELL',
    symbol,
    quantity: contracts,
    orderType: 'MKT',
    dollarStopLoss: dollarStop,
    dollarTakeProfit: dollarTarget,
    reason: `${algorithm}|Conf:${confidence.toFixed(0)}%|Score:${state.signalConfluence}`,
  })

  if (result.success) {
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    console.log(`[EXEC] SUCCESS: Opened ${direction} ${contracts}x ${symbol}`)
    return true
  }

  console.error('[EXEC] FAILED:', result.message)
  return false
}

// =============================================================================
// ADVANCED ENTRY WITH DYNAMIC SIZING, PARTIAL TP, AND TRAILING STOPS
// =============================================================================

async function executeEntryAdvancedWithDynamicSize(
  direction: 'LONG' | 'SHORT',
  confidence: number,
  mlSignal: MLSignal,
  tradSignal: Signal,
  conditions: MarketConditions,
  dynamicContracts: number,
  currentATR: number,
  currentRegime: string
): Promise<boolean> {
  const riskStatus = state.lastRiskStatus
  if (!riskStatus || !riskStatus.canTrade) {
    console.log('[EXEC] Risk status blocking trade')
    return false
  }

  if (dynamicContracts <= 0) {
    console.log('[EXEC] Dynamic contract size is 0 - no trade')
    return false
  }

  // Select optimal execution algorithm
  const algorithm = selectExecutionAlgorithm(direction, dynamicContracts, conditions, confidence / 100)
  state.executionAlgorithm = algorithm
  console.log(`[EXEC] Using ${algorithm} algorithm with ${dynamicContracts} contracts`)

  const symbol = getCurrentContractSymbol(state.instrument)
  const pointValue = state.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE

  // Use ML signal levels
  const entry = mlSignal.entry || tradSignal.entry
  let stopLoss = mlSignal.stopLoss || tradSignal.stopLoss
  let takeProfit = mlSignal.takeProfit || tradSignal.takeProfit

  // ==========================================================================
  // ADJUST TARGET BASED ON REGIME (Extend in trends, reduce in chop)
  // ==========================================================================
  const targetAdjustment = calculateAdjustedTarget(entry, takeProfit, stopLoss, currentRegime, direction)
  takeProfit = targetAdjustment.adjustedTarget
  console.log(`[TARGET] ${targetAdjustment.reason} | New target: ${takeProfit.toFixed(2)}`)

  const stopDistance = Math.abs(entry - stopLoss)
  const targetDistance = Math.abs(takeProfit - entry)
  const riskReward = targetDistance / stopDistance

  console.log(`[R:R] ${riskReward.toFixed(2)} (Stop: ${stopDistance.toFixed(2)} pts, Target: ${targetDistance.toFixed(2)} pts)`)

  // Calculate dollar amounts
  const dollarStop = stopDistance * pointValue * dynamicContracts
  const dollarTarget = targetDistance * pointValue * dynamicContracts

  // Create execution plan
  const order = executionEngine.createOrder(
    symbol,
    direction === 'LONG' ? 'BUY' : 'SELL',
    dynamicContracts,
    algorithm,
    entry,
    { urgency: confidence / 100, maxSlippage: 0.002 }
  )

  const executionPlan = executionEngine.generatePlan(order, conditions)

  console.log(`[EXEC] Entry: ${entry.toFixed(2)} | Stop: ${stopLoss.toFixed(2)} | Target: ${takeProfit.toFixed(2)}`)
  console.log(`[EXEC] Contracts: ${dynamicContracts} | Stop$: $${dollarStop.toFixed(0)} | Target$: $${dollarTarget.toFixed(0)}`)
  console.log(`[EXEC] Est. Slippage: ${(executionPlan.estimatedSlippage * 100).toFixed(3)}% | Est. Cost: $${executionPlan.estimatedCost.toFixed(2)}`)

  // ==========================================================================
  // INITIALIZE ADVANCED POSITION STATE FOR PARTIAL EXITS
  // ==========================================================================
  initializeAdvancedPosition(dynamicContracts, entry, stopLoss, takeProfit, currentATR, direction)

  // Log scale out levels
  console.log('[SCALE OUT] Levels configured:')
  PARTIAL_TP_CONFIG.scaleOutLevels.forEach((level, i) => {
    const levelPrice = direction === 'LONG'
      ? entry + (targetDistance * level.targetRatio)
      : entry - (targetDistance * level.targetRatio)
    const contractsToExit = Math.floor(dynamicContracts * level.exitPercent)
    console.log(`  Level ${i + 1}: ${levelPrice.toFixed(2)} (${(level.targetRatio * 100).toFixed(0)}% target) -> Exit ${contractsToExit} contracts, ${level.moveStopTo}`)
  })

  // ==========================================================================
  // PAPER MODE: Simulate trade without real execution
  // ==========================================================================
  if (state.paperMode) {
    console.log(`[PAPER] SIMULATED ${direction} ${dynamicContracts}x ${symbol} @ ${entry.toFixed(2)}`)
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts: dynamicContracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    return true
  }

  // ==========================================================================
  // LIVE MODE: Execute via PickMyTrade
  // ==========================================================================
  const pmt = getClient()
  if (!pmt || !pmt.isEnabled) {
    console.log('[EXEC] PickMyTrade not available - enable live trading first')
    return false
  }

  const result = await pmt.executeSignal({
    action: direction === 'LONG' ? 'BUY' : 'SELL',
    symbol,
    quantity: dynamicContracts,
    orderType: 'MKT',
    dollarStopLoss: dollarStop,
    dollarTakeProfit: dollarTarget,
    reason: `${algorithm}|${currentRegime}|${dynamicContracts}x|Conf:${confidence.toFixed(0)}%|Score:${state.signalConfluence}`,
  })

  if (result.success) {
    state.position = {
      instrument: state.instrument,
      direction,
      entryPrice: entry,
      contracts: dynamicContracts,
      stopLoss,
      takeProfit,
      entryTime: Date.now(),
      signal: tradSignal,
      executionPlan,
    }
    console.log(`[EXEC] SUCCESS: Opened ${direction} ${dynamicContracts}x ${symbol} in ${currentRegime} regime`)
    return true
  }

  console.error('[EXEC] FAILED:', result.message)
  advancedPositionState = null  // Clean up on failure
  return false
}

// =============================================================================
// ADVANCED EXIT
// =============================================================================

async function executeExitAdvanced(
  reason: string,
  exitPrice: number,
  conditions: MarketConditions
): Promise<boolean> {
  if (!state.position) return false

  const symbol = getCurrentContractSymbol(state.position.instrument)
  const pointValue = state.position.instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE
  const priceDiff = state.position.direction === 'LONG'
    ? exitPrice - state.position.entryPrice
    : state.position.entryPrice - exitPrice
  const pnl = priceDiff * pointValue * state.position.contracts

  // Estimate slippage
  const slippage = conditions.spreadPercent * exitPrice * state.position.contracts

  // PAPER MODE: Simulate exit
  if (state.paperMode) {
    console.log(`[PAPER] SIMULATED EXIT @ ${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)}`)
    recordTradeResult(exitPrice, pnl, slippage, reason)
    return true
  }

  // LIVE MODE: Close via PickMyTrade
  const pmt = getClient()
  if (!pmt) return false

  const result = await pmt.closePosition(symbol)

  if (result.success) {
    recordTradeResult(exitPrice, pnl, slippage, reason)
    return true
  }

  return false
}

// Record trade result (shared by paper and live)
function recordTradeResult(exitPrice: number, pnl: number, slippage: number, reason: string) {
  if (!state.position) return

  const trade: Trade = {
    id: `T${Date.now()}`,
    instrument: state.position.instrument,
    direction: state.position.direction,
    entryPrice: state.position.entryPrice,
    exitPrice,
    contracts: state.position.contracts,
    pnl,
    entryTime: state.position.entryTime,
    exitTime: Date.now(),
    reason,
    slippage,
    executionAlgo: state.executionAlgorithm,
    confluenceScore: state.signalConfluence,
  }

  state.todayTrades.push(trade)
  state.todayPnL += pnl
  state.totalTrades++

  // CONSECUTIVE LOSS TRACKING - For dynamic risk management
  if (pnl > 0) {
    state.wins++
    liveConsecutiveLosses = 0  // Reset on win
    if (state.currentBalance + pnl > state.highWaterMark) {
      state.highWaterMark = state.currentBalance + pnl
    }
  } else {
    state.losses++
    liveConsecutiveLosses++  // Increment on loss
    console.log(`[RISK] Consecutive losses: ${liveConsecutiveLosses}/${LIVE_PROFIT_CONFIG.maxConsecutiveLosses}`)

    // If max consecutive losses hit, require cooling period
    if (liveConsecutiveLosses >= LIVE_PROFIT_CONFIG.maxConsecutiveLosses) {
      console.log(`[RISK] MAX CONSECUTIVE LOSSES HIT - Entering cooling period`)
    }
  }

  // Update live daily tracking
  liveDailyPnL += pnl
  liveDailyTradeCount++
  liveLastTradeTime = Date.now()

  state.currentBalance += pnl

  // ==========================================================================
  // UPDATE PERFORMANCE TRACKER FOR ADAPTIVE SYSTEM
  // ==========================================================================
  const currentSession = getCurrentSession()
  const currentRegime = state.marketRegime?.type || 'UNKNOWN'
  updatePerformanceTracker(pnl, currentRegime, currentSession)

  // Include partial exits P&L in total
  let totalTradePnL = pnl
  if (advancedPositionState && advancedPositionState.partialExits.length > 0) {
    const partialPnL = advancedPositionState.partialExits.reduce((sum, exit) => sum + exit.pnl, 0)
    totalTradePnL += partialPnL
    console.log(`[PARTIAL SUMMARY] ${advancedPositionState.partialExits.length} partial exits | Partial P&L: $${partialPnL.toFixed(2)} | Total: $${totalTradePnL.toFixed(2)}`)

    // Log R-multiple achieved
    if (advancedPositionState.currentRMultiple) {
      console.log(`[R-MULTIPLE] Achieved ${advancedPositionState.currentRMultiple.toFixed(2)}R`)
    }
  }

  // Clean up advanced position state
  advancedPositionState = null
  state.position = null

  // APEX RULE: Track unique trading days (need 7 minimum)
  state.tradingDays = recordTradingDay()

  console.log(`[EXIT] ${reason} | P&L: $${pnl.toFixed(2)} | Total Trade P&L: $${totalTradePnL.toFixed(2)} | Slippage: $${slippage.toFixed(2)}`)
  console.log(`[APEX] Trading days: ${state.tradingDays}/${APEX_RULES.minTradingDays} (need ${Math.max(0, APEX_RULES.minTradingDays - state.tradingDays)} more)`)
  console.log(`[PERFORMANCE] Daily P&L: $${performanceTracker.dailyPnL.toFixed(2)} | Drawdown: ${performanceTracker.currentDrawdownPercent.toFixed(1)}% | Win Streak: ${performanceTracker.consecutiveWins} | Loss Streak: ${performanceTracker.consecutiveLosses}`)
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // LOAD PERSISTED ML LEARNING STATE FROM DATABASE
    // Uses learned patterns from paper trading for live decisions
    await ensureLearningStateLoaded()

    // CRITICAL: Run auto-trader on EVERY poll when enabled
    // This makes the system fully automatic - each GET triggers the trading logic
    if (state.enabled) {
      await runAutoTrader()
    }

    const winRate = state.totalTrades > 0 ? (state.wins / state.totalTrades) * 100 : 0
    const profitFactor = state.losses > 0 && state.wins > 0
      ? state.todayTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) /
        Math.abs(state.todayTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
      : 0

    const profitAboveTarget = Math.max(0, state.todayPnL - 9000)
    const withdrawable = state.todayPnL >= 9000 ? profitAboveTarget * 0.9 : 0

    // Get market status
    const marketStatus = isMarketOpen()
    const autoCloseCheck = shouldAutoClose()

    return NextResponse.json({
      success: true,
      // APEX Rules Status
      apexRules: {
        profitTarget: APEX_RULES.profitTarget,
        maxDrawdown: APEX_RULES.maxTrailingDrawdown,
        minTradingDays: APEX_RULES.minTradingDays,
        maxContracts: APEX_RULES.maxContracts,
        closeTime: '4:59 PM ET',
        autoCloseTime: '4:45 PM ET',
      },
      // Market Status
      market: {
        open: marketStatus.open,
        status: marketStatus.reason,
        minutesUntilClose: marketStatus.minutesUntilClose,
        autoCloseTriggered: autoCloseCheck.close,
        autoCloseReason: autoCloseCheck.reason,
      },
      // Status
      status: {
        enabled: state.enabled,
        paperMode: state.paperMode,  // Paper trading = no real execution
        instrument: state.instrument,
        session: getCurrentSession(),
        hasPosition: !!state.position,
        position: state.position,
        lastCheck: state.lastCheck,
        // APEX: No deadline - these are for tracking only
        evaluationStartDate: state.evaluationStartDate,
        targetDays: state.targetDays,  // User's personal goal (optional)
        tradingDays: state.tradingDays,
        tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
        tradingDaysComplete: state.tradingDays >= APEX_RULES.minTradingDays,
      },
      // ML Signal
      mlSignal: state.lastMLSignal ? {
        direction: state.lastMLSignal.direction,
        confidence: state.lastMLSignal.confidence,
        entry: state.lastMLSignal.entry,
        stopLoss: state.lastMLSignal.stopLoss,
        takeProfit: state.lastMLSignal.takeProfit,
        ensemble: state.lastMLSignal.ensemble,
        patterns: state.lastMLSignal.patterns.length,
      } : null,
      // Traditional Signal
      traditionalSignal: state.lastSignal ? {
        direction: state.lastSignal.direction,
        confidence: state.lastSignal.confidence,
        strategy: state.lastSignal.strategy,
      } : null,
      // Order Flow
      orderFlow: {
        vpin: state.vpin ? {
          value: state.vpin.vpin,
          toxicity: state.vpin.toxicity,
          signal: state.vpin.signal,
          trend: state.vpin.trend,
        } : null,
        delta: state.delta ? {
          imbalanceRatio: state.delta.imbalanceRatio,
          divergence: state.delta.deltaDivergence,
          exhaustion: state.delta.exhaustion,
          absorption: state.delta.absorption,
        } : null,
        largeOrder: {
          detected: state.largeOrderDetected,
          side: state.largeOrderSide,
        },
        signal: state.lastOrderFlow ? {
          direction: state.lastOrderFlow.direction,
          strength: state.lastOrderFlow.strength,
          confidence: state.lastOrderFlow.confidence,
          reasons: state.lastOrderFlow.reasons,
        } : null,
      },
      // Market Regime
      regime: state.marketRegime ? {
        type: state.marketRegime.type,
        strength: state.marketRegime.strength,
        volatility: state.marketRegime.characteristics?.volatility || 0,
        momentum: state.marketRegime.characteristics?.momentum || 0,
      } : null,
      // Market Conditions
      marketConditions: state.marketConditions ? {
        spread: state.marketConditions.spreadPercent,
        imbalance: state.marketConditions.imbalance,
        volatility: state.marketConditions.volatility,
        toxicity: state.marketConditions.toxicity,
      } : null,
      // Risk Analytics
      riskStatus: state.lastRiskStatus ? {
        status: state.lastRiskStatus.riskStatus,
        canTrade: state.lastRiskStatus.canTrade,
        trailingDrawdown: state.lastRiskStatus.trailingDrawdown,
        safetyBuffer: state.lastRiskStatus.safetyBuffer,
        maxAllowedLossToday: state.lastRiskStatus.maxAllowedLossToday,
        recommendedPositionSize: state.lastRiskStatus.recommendedPositionSize,
        warnings: state.lastRiskStatus.warnings,
        recommendations: state.lastRiskStatus.recommendations,
      } : null,
      // Confluence
      confluence: {
        score: state.signalConfluence,
        level: state.signalConfluence >= 70 ? 'STRONG' :
               state.signalConfluence >= 50 ? 'MODERATE' :
               state.signalConfluence >= 30 ? 'WEAK' : 'NONE',
        factors: state.confluenceFactors,
      },
      // Execution
      execution: {
        algorithm: state.executionAlgorithm,
      },
      // Performance
      performance: {
        todayPnL: state.todayPnL,
        todayTrades: state.todayTrades.length,
        totalTrades: state.totalTrades,
        wins: state.wins,
        losses: state.losses,
        winRate,
        profitFactor,
        startBalance: state.startBalance,
        currentBalance: state.currentBalance,
        highWaterMark: state.highWaterMark,
        drawdownUsed: state.highWaterMark - state.currentBalance,
        profitTarget: 9000,
        targetProgress: (state.todayPnL / 9000) * 100,
        withdrawable,
      },
      recentTrades: state.todayTrades.slice(-10),
      configured: !!process.env.PICKMYTRADE_TOKEN,
    })
  } catch (e) {
    console.error('Auto-trade status error:', e)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (body.action === 'start') {
      // Set paper mode (default true for safety)
      state.paperMode = body.paperMode !== false

      // For live trading, require PickMyTrade token
      if (!state.paperMode && !process.env.PICKMYTRADE_TOKEN) {
        return NextResponse.json({
          error: 'PickMyTrade not configured',
          message: 'Add PICKMYTRADE_TOKEN for live trading, or use paperMode: true',
        }, { status: 503 })
      }

      state.enabled = true
      state.instrument = body.instrument || 'ES'
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        message: state.paperMode
          ? 'PAPER TRADING started - signals will simulate, no real orders'
          : 'LIVE TRADING started with FULL integration',
        paperMode: state.paperMode,
        modules: ['ML Signal Engine', 'Order Flow Analysis', 'Risk Analytics', 'Smart Execution'],
        instrument: state.instrument,
        apexRules: {
          profitTarget: APEX_RULES.profitTarget,
          maxDrawdown: APEX_RULES.maxTrailingDrawdown,
          minTradingDays: APEX_RULES.minTradingDays,
          noTimeLimit: true,  // APEX has no time limit
        },
      })
    }

    if (body.action === 'stop') {
      state.enabled = false

      if (state.position) {
        const candles = await fetchCandles(state.instrument, '1', 1)
        const currentPrice = candles[0]?.close || state.position.entryPrice
        const conditions = state.marketConditions || {
          spread: 0.25, spreadPercent: 0.00005, bidDepth: 1000, askDepth: 1000,
          imbalance: 0, volatility: 0.01, recentVolume: 10000, avgVolume: 10000, toxicity: 0.3
        }
        await executeExitAdvanced('Manual Stop', currentPrice, conditions)
      }

      return NextResponse.json({
        success: true,
        message: 'Auto-trading stopped',
      })
    }

    if (body.action === 'check') {
      await runAutoTrader()

      return NextResponse.json({
        success: true,
        confluence: state.signalConfluence,
        factors: state.confluenceFactors,
        mlSignal: state.lastMLSignal?.direction,
        orderFlow: state.lastOrderFlow?.direction,
        vpin: state.vpin?.vpin,
        position: state.position,
      })
    }

    if (body.action === 'reset') {
      state.todayTrades = []
      state.todayPnL = 0
      state.currentBalance = state.startBalance
      state.highWaterMark = state.startBalance

      return NextResponse.json({
        success: true,
        message: 'Stats reset',
      })
    }

    // CONFIGURE: Set evaluation parameters
    if (body.action === 'configure') {
      if (body.startBalance) state.startBalance = body.startBalance
      if (body.currentBalance) state.currentBalance = body.currentBalance
      if (body.evaluationStartDate) state.evaluationStartDate = body.evaluationStartDate
      if (body.targetDays) state.targetDays = body.targetDays
      if (body.tradingDays !== undefined) state.tradingDays = body.tradingDays

      return NextResponse.json({
        success: true,
        message: 'Configuration updated',
        config: {
          startBalance: state.startBalance,
          currentBalance: state.currentBalance,
          evaluationStartDate: state.evaluationStartDate,
          targetDays: state.targetDays,
          tradingDays: state.tradingDays,
          tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
        },
      })
    }

    // TEST MODE: Run full analysis once without starting auto-trader
    if (body.action === 'test') {
      state.paperMode = true  // Always paper for tests
      state.instrument = body.instrument || 'ES'

      // Run the full analysis pipeline
      await runAutoTrader()

      // Get current market status
      const testMarketStatus = isMarketOpen()

      return NextResponse.json({
        success: true,
        mode: 'TEST (paper)',
        // APEX Rules (accurate)
        apexRules: {
          profitTarget: APEX_RULES.profitTarget,
          maxDrawdown: APEX_RULES.maxTrailingDrawdown,
          minTradingDays: APEX_RULES.minTradingDays,
          maxContracts: APEX_RULES.maxContracts,
          noTimeLimit: true,
          closeTime: '4:59 PM ET',
        },
        // Market Status
        market: {
          open: testMarketStatus.open,
          status: testMarketStatus.reason,
          minutesUntilClose: testMarketStatus.minutesUntilClose,
        },
        // Progress
        progress: {
          startBalance: state.startBalance,
          currentBalance: state.currentBalance,
          profit: state.currentBalance - state.startBalance,
          profitTarget: APEX_RULES.profitTarget,
          profitProgress: ((state.currentBalance - state.startBalance) / APEX_RULES.profitTarget * 100).toFixed(1) + '%',
          tradingDays: state.tradingDays,
          tradingDaysRequired: APEX_RULES.minTradingDays,
          tradingDaysNeeded: Math.max(0, APEX_RULES.minTradingDays - state.tradingDays),
          drawdownUsed: state.highWaterMark - state.currentBalance,
          drawdownRemaining: APEX_RULES.maxTrailingDrawdown - (state.highWaterMark - state.currentBalance),
        },
        // All the analysis results
        mlSignal: state.lastMLSignal ? {
          direction: state.lastMLSignal.direction,
          confidence: (state.lastMLSignal.confidence * 100).toFixed(1) + '%',
          entry: state.lastMLSignal.entry?.toFixed(2),
          stopLoss: state.lastMLSignal.stopLoss?.toFixed(2),
          takeProfit: state.lastMLSignal.takeProfit?.toFixed(2),
          patterns: state.lastMLSignal.patterns.map(p => p.pattern),
        } : null,
        traditionalSignal: state.lastSignal ? {
          direction: state.lastSignal.direction,
          confidence: state.lastSignal.confidence.toFixed(1) + '%',
          strategy: state.lastSignal.strategy,
        } : null,
        orderFlow: {
          vpin: state.vpin ? {
            value: (state.vpin.vpin * 100).toFixed(1) + '%',
            toxicity: state.vpin.toxicity,
            signal: state.vpin.signal,
          } : null,
          delta: state.delta ? {
            imbalance: (state.delta.imbalanceRatio * 100).toFixed(1) + '%',
            divergence: state.delta.deltaDivergence,
            exhaustion: state.delta.exhaustion,
          } : null,
          largeOrders: {
            detected: state.largeOrderDetected,
            side: state.largeOrderSide,
          },
        },
        regime: state.marketRegime ? {
          type: state.marketRegime.type,
          strength: (state.marketRegime.strength * 100).toFixed(1) + '%',
        } : null,
        marketConditions: state.marketConditions ? {
          spread: (state.marketConditions.spreadPercent * 100).toFixed(4) + '%',
          volatility: (state.marketConditions.volatility * 100).toFixed(2) + '%',
          toxicity: (state.marketConditions.toxicity * 100).toFixed(1) + '%',
          imbalance: (state.marketConditions.imbalance * 100).toFixed(1) + '%',
        } : null,
        riskStatus: state.lastRiskStatus ? {
          status: state.lastRiskStatus.riskStatus,
          canTrade: state.lastRiskStatus.canTrade,
          safetyBuffer: '$' + state.lastRiskStatus.safetyBuffer?.toFixed(0),
          maxLossToday: '$' + state.lastRiskStatus.maxAllowedLossToday?.toFixed(0),
          recommendedSize: state.lastRiskStatus.recommendedPositionSize?.toFixed(2),
          warnings: state.lastRiskStatus.warnings,
        } : null,
        confluence: {
          score: state.signalConfluence,
          level: state.signalConfluence >= 65 ? 'STRONG' :
                 state.signalConfluence >= 50 ? 'MODERATE' :
                 state.signalConfluence >= 35 ? 'WEAK' : 'NONE',
          factors: state.confluenceFactors,
          requiresScore: 50,
          wouldTrade: state.signalConfluence >= 50,
        },
        executionAlgorithm: state.executionAlgorithm,
        position: state.position,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: start, stop, check, test, reset, configure' }, { status: 400 })
  } catch (e) {
    console.error('Auto-trade error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
