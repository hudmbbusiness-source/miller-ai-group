// Market Intelligence Module - LangSearch Integration for Trading Edge
// Provides real-time news sentiment, economic event detection, and trading filters

import { searchWeb, WebSearchResponse, WebSearchResult } from '@/lib/ai/web-search'

// ============================================================================
// TYPES
// ============================================================================

export interface EconomicEvent {
  name: string
  time: string // ISO string or "TBD"
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  currency: string
  forecast?: string
  previous?: string
  actual?: string
}

export interface MarketSentiment {
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED'
  score: number // -100 to +100
  confidence: number // 0 to 100
  headlines: SentimentHeadline[]
  keyThemes: string[]
}

export interface SentimentHeadline {
  title: string
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  weight: number
  source: string
  url: string
}

export interface TradingFilter {
  shouldTrade: boolean
  reason: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
  warnings: string[]
  upcomingEvents: EconomicEvent[]
  sentiment: MarketSentiment
  newsContext: string
}

export interface MarketIntelligence {
  timestamp: string
  filter: TradingFilter
  newsResults: WebSearchResult[]
  economicCalendar: EconomicEvent[]
  marketConditions: {
    volatilityExpectation: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME'
    trendBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    keyLevels: string[]
  }
}

// ============================================================================
// HIGH-IMPACT ECONOMIC EVENTS
// ============================================================================

const HIGH_IMPACT_KEYWORDS = [
  'FOMC', 'Federal Reserve', 'Fed decision', 'interest rate decision',
  'NFP', 'Non-Farm Payrolls', 'jobs report', 'employment report',
  'CPI', 'inflation', 'Consumer Price Index',
  'GDP', 'Gross Domestic Product',
  'PCE', 'Personal Consumption Expenditures',
  'ISM', 'Manufacturing PMI', 'Services PMI',
  'retail sales',
  'Powell', 'Fed Chair', 'Fed speaks',
  'ECB', 'BOJ', 'Bank of England',
  'trade war', 'tariff',
  'geopolitical', 'war', 'conflict',
  'black swan', 'crash', 'circuit breaker'
]

const MEDIUM_IMPACT_KEYWORDS = [
  'jobless claims', 'unemployment claims',
  'housing starts', 'building permits',
  'durable goods',
  'consumer confidence',
  'producer prices', 'PPI',
  'trade balance',
  'industrial production',
  'treasury auction', 'bond auction',
  'earnings season', 'quarterly earnings'
]

const BULLISH_KEYWORDS = [
  'rally', 'surge', 'soar', 'jump', 'gain', 'bullish', 'buy signal',
  'breakout', 'new high', 'record high', 'strong', 'beat expectations',
  'dovish', 'rate cut', 'stimulus', 'optimism', 'recovery',
  'risk-on', 'upside', 'momentum', 'green'
]

const BEARISH_KEYWORDS = [
  'crash', 'plunge', 'tumble', 'drop', 'fall', 'bearish', 'sell signal',
  'breakdown', 'new low', 'weak', 'miss expectations', 'disappoint',
  'hawkish', 'rate hike', 'tightening', 'recession', 'fear',
  'risk-off', 'downside', 'selloff', 'red', 'warning'
]

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Fetch real-time market news for futures trading
 */
export async function fetchMarketNews(
  instrument: string = 'ES NQ futures'
): Promise<WebSearchResponse> {
  const query = `${instrument} market news today stock futures trading outlook`

  return searchWeb(query, {
    count: 10,
    freshness: 'oneDay',
    includeSummary: true
  })
}

/**
 * Fetch economic calendar events
 */
export async function fetchEconomicEvents(): Promise<WebSearchResponse> {
  const today = new Date().toISOString().split('T')[0]
  const query = `economic calendar ${today} FOMC NFP CPI Fed high impact events`

  return searchWeb(query, {
    count: 8,
    freshness: 'oneDay',
    includeSummary: true
  })
}

/**
 * Check for any market-moving breaking news
 */
export async function fetchBreakingNews(): Promise<WebSearchResponse> {
  const query = 'breaking market news stocks futures urgent trading halt circuit breaker'

  return searchWeb(query, {
    count: 5,
    freshness: 'oneDay',
    includeSummary: true
  })
}

/**
 * Analyze sentiment from search results
 */
export function analyzeSentiment(results: WebSearchResult[]): MarketSentiment {
  const headlines: SentimentHeadline[] = []
  let bullishScore = 0
  let bearishScore = 0
  const themes = new Set<string>()

  for (const result of results) {
    const text = `${result.title} ${result.snippet || ''} ${result.summary || ''}`.toLowerCase()

    // Count bullish/bearish keywords
    let headlineBullish = 0
    let headlineBearish = 0

    for (const keyword of BULLISH_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        headlineBullish++
        bullishScore += 10
      }
    }

    for (const keyword of BEARISH_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        headlineBearish++
        bearishScore += 10
      }
    }

    // Detect themes
    for (const keyword of HIGH_IMPACT_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        themes.add(keyword)
      }
    }

    // Determine headline sentiment
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (headlineBullish > headlineBearish + 1) sentiment = 'BULLISH'
    else if (headlineBearish > headlineBullish + 1) sentiment = 'BEARISH'

    headlines.push({
      title: result.title,
      sentiment,
      weight: headlineBullish + headlineBearish,
      source: result.siteName || 'Unknown',
      url: result.url
    })
  }

  // Calculate overall sentiment
  const netScore = bullishScore - bearishScore
  const totalScore = bullishScore + bearishScore

  let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED' = 'NEUTRAL'
  if (totalScore > 30) {
    if (netScore > 30) overall = 'BULLISH'
    else if (netScore < -30) overall = 'BEARISH'
    else if (Math.abs(netScore) < 10 && totalScore > 50) overall = 'MIXED'
  }

  // Normalize score to -100 to +100
  const normalizedScore = Math.max(-100, Math.min(100, netScore))

  // Confidence based on total data
  const confidence = Math.min(100, totalScore * 2)

  return {
    overall,
    score: normalizedScore,
    confidence,
    headlines: headlines.sort((a, b) => b.weight - a.weight).slice(0, 10),
    keyThemes: Array.from(themes)
  }
}

/**
 * Detect high-impact economic events from search results
 */
export function detectEconomicEvents(results: WebSearchResult[]): EconomicEvent[] {
  const events: EconomicEvent[] = []
  const detectedEvents = new Set<string>()

  for (const result of results) {
    const text = `${result.title} ${result.snippet || ''} ${result.summary || ''}`.toLowerCase()

    // Check for high-impact events
    for (const keyword of HIGH_IMPACT_KEYWORDS) {
      if (text.includes(keyword.toLowerCase()) && !detectedEvents.has(keyword)) {
        detectedEvents.add(keyword)
        events.push({
          name: keyword,
          time: 'Today',
          impact: 'HIGH',
          currency: 'USD'
        })
      }
    }

    // Check for medium-impact events
    for (const keyword of MEDIUM_IMPACT_KEYWORDS) {
      if (text.includes(keyword.toLowerCase()) && !detectedEvents.has(keyword)) {
        detectedEvents.add(keyword)
        events.push({
          name: keyword,
          time: 'Today',
          impact: 'MEDIUM',
          currency: 'USD'
        })
      }
    }
  }

  return events.sort((a, b) => {
    const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return impactOrder[a.impact] - impactOrder[b.impact]
  })
}

// ============================================================================
// TRADING FILTER CONFIGURATION
// Adjust these thresholds to control how strict the filter is
// ============================================================================

export interface TradingFilterConfig {
  // If true, FOMC/NFP days only WARN but still allow trading with reduced size
  allowTradingOnEventDays: boolean
  // Minimum number of emergency keywords needed to block trading
  emergencyKeywordThreshold: number
  // Only block if breaking news is from last N hours
  breakingNewsMaxAge: number
  // Position size multipliers for different risk levels
  positionSizeMultipliers: {
    LOW: number
    MEDIUM: number
    HIGH: number
    EXTREME: number
  }
}

// DEFAULT CONFIG - More permissive for active trading
export const DEFAULT_FILTER_CONFIG: TradingFilterConfig = {
  allowTradingOnEventDays: true, // Allow trading, just reduce size
  emergencyKeywordThreshold: 2, // Need 2+ emergency keywords to block
  breakingNewsMaxAge: 2, // Only consider news from last 2 hours
  positionSizeMultipliers: {
    LOW: 1.0,      // Full size
    MEDIUM: 0.75,  // 75% size
    HIGH: 0.5,     // 50% size
    EXTREME: 0.25  // 25% size (but still trade!)
  }
}

/**
 * Generate trading filter based on market intelligence
 *
 * UPDATED: Less strict filtering - prefers warnings over blocking
 * Only blocks trading for REAL emergencies (circuit breakers, halts)
 */
export function generateTradingFilter(
  sentiment: MarketSentiment,
  events: EconomicEvent[],
  breakingNews: WebSearchResult[],
  config: TradingFilterConfig = DEFAULT_FILTER_CONFIG
): TradingFilter {
  const warnings: string[] = []
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW'
  let shouldTrade = true
  let reason = 'Market conditions appear normal for trading'

  // Check for high-impact events - WARN but don't block
  const highImpactEvents = events.filter(e => e.impact === 'HIGH')
  if (highImpactEvents.length > 0) {
    riskLevel = 'MEDIUM' // Changed from HIGH - events are normal
    warnings.push(`Economic event(s) today: ${highImpactEvents.map(e => e.name).join(', ')} - consider smaller positions`)

    // Check for FOMC specifically - WARN but allow trading
    const fomcEvent = highImpactEvents.find(e =>
      e.name.toLowerCase().includes('fomc') ||
      e.name.toLowerCase().includes('fed decision')
    )
    if (fomcEvent) {
      riskLevel = 'HIGH'
      if (!config.allowTradingOnEventDays) {
        shouldTrade = false
        reason = 'FOMC meeting/decision day - trading disabled by config'
      } else {
        warnings.push('⚠️ FOMC day - use 50% position size, avoid trading 30min before/after announcement')
        reason = 'FOMC day - reduced position sizing recommended'
      }
    }

    // Check for NFP - WARN but allow trading
    const nfpEvent = highImpactEvents.find(e =>
      e.name.toLowerCase().includes('nfp') ||
      e.name.toLowerCase().includes('non-farm') ||
      e.name.toLowerCase().includes('jobs report')
    )
    if (nfpEvent) {
      riskLevel = 'HIGH'
      if (!config.allowTradingOnEventDays) {
        shouldTrade = false
        reason = 'NFP/Jobs Report day - trading disabled by config'
      } else {
        warnings.push('⚠️ NFP day - use 50% position size, avoid trading during 8:30 AM release')
        reason = 'NFP day - reduced position sizing recommended'
      }
    }
  }

  // Check for REAL emergencies only - need multiple indicators
  // Single keyword mentions are NOT emergencies (news often mentions past crashes)
  const realEmergencyKeywords = ['circuit breaker activated', 'trading halted', 'market closed', 'flash crash happening']
  let emergencyCount = 0

  for (const news of breakingNews) {
    const text = `${news.title} ${news.snippet || ''}`.toLowerCase()

    // Check for REAL emergency phrases (not just keyword mentions)
    for (const phrase of realEmergencyKeywords) {
      if (text.includes(phrase)) {
        emergencyCount += 2 // Real emergencies count more
        warnings.push(`🚨 ALERT: ${news.title}`)
      }
    }

    // Check for concerning keywords (but don't immediately block)
    const concerningKeywords = ['crash', 'plunge', 'collapse']
    for (const keyword of concerningKeywords) {
      // Only count if it's current/happening, not historical reference
      if (text.includes(keyword) && (text.includes('today') || text.includes('now') || text.includes('breaking'))) {
        emergencyCount++
      }
    }
  }

  // Only block if multiple real emergency indicators
  if (emergencyCount >= config.emergencyKeywordThreshold) {
    riskLevel = 'EXTREME'
    shouldTrade = false
    reason = 'Multiple market disruption indicators detected - trading paused for safety'
  }

  // Check sentiment extremes - informational only
  if (sentiment.overall === 'MIXED' && sentiment.confidence > 70) {
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM'
    warnings.push('Mixed market sentiment - conflicting signals in news')
  }

  // Very bearish sentiment is a warning, not a block
  if (sentiment.score < -50) {
    warnings.push('Strongly bearish news sentiment - consider short bias or wait for confirmation')
  }

  // Very bullish sentiment
  if (sentiment.score > 50) {
    warnings.push('Strongly bullish news sentiment - consider long bias')
  }

  // Generate news context summary
  const newsContext = sentiment.headlines.length > 0
    ? `Top headlines: ${sentiment.headlines.slice(0, 3).map(h => h.title).join('; ')}`
    : 'No significant news detected'

  // Add position size recommendation
  const recommendedSize = config.positionSizeMultipliers[riskLevel]
  if (recommendedSize < 1.0) {
    warnings.push(`Recommended position size: ${(recommendedSize * 100).toFixed(0)}% of normal`)
  }

  return {
    shouldTrade,
    reason,
    riskLevel,
    warnings,
    upcomingEvents: events,
    sentiment,
    newsContext
  }
}

/**
 * Main function: Get complete market intelligence for trading decisions
 */
export async function getMarketIntelligence(
  instrument: string = 'ES NQ S&P 500 Nasdaq futures'
): Promise<MarketIntelligence> {
  // Fetch all data in parallel
  const [newsResponse, eventsResponse, breakingResponse] = await Promise.all([
    fetchMarketNews(instrument),
    fetchEconomicEvents(),
    fetchBreakingNews()
  ])

  // Process results
  const allNews = [
    ...newsResponse.results,
    ...eventsResponse.results,
    ...breakingResponse.results
  ]

  const sentiment = analyzeSentiment(newsResponse.results)
  const economicCalendar = detectEconomicEvents(eventsResponse.results)
  const filter = generateTradingFilter(sentiment, economicCalendar, breakingResponse.results)

  // Determine volatility expectation
  let volatilityExpectation: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL'
  if (filter.riskLevel === 'EXTREME') volatilityExpectation = 'EXTREME'
  else if (filter.riskLevel === 'HIGH') volatilityExpectation = 'HIGH'
  else if (economicCalendar.length === 0 && sentiment.confidence < 30) volatilityExpectation = 'LOW'

  // Determine trend bias from sentiment
  let trendBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (sentiment.score > 30) trendBias = 'BULLISH'
  else if (sentiment.score < -30) trendBias = 'BEARISH'

  return {
    timestamp: new Date().toISOString(),
    filter,
    newsResults: allNews.slice(0, 15),
    economicCalendar,
    marketConditions: {
      volatilityExpectation,
      trendBias,
      keyLevels: [] // Can be populated from technical analysis
    }
  }
}

/**
 * Quick check if it's safe to trade (lightweight version)
 */
export async function quickTradingCheck(): Promise<{
  canTrade: boolean
  riskLevel: string
  reason: string
}> {
  try {
    const intel = await getMarketIntelligence()
    return {
      canTrade: intel.filter.shouldTrade,
      riskLevel: intel.filter.riskLevel,
      reason: intel.filter.reason
    }
  } catch (error) {
    console.error('Quick trading check failed:', error)
    // Default to cautious behavior if check fails
    return {
      canTrade: true,
      riskLevel: 'MEDIUM',
      reason: 'Market intelligence check failed - proceeding with caution'
    }
  }
}

/**
 * Get sentiment-adjusted position sizing multiplier
 * Returns 0.5 to 1.5 based on sentiment alignment with trade direction
 */
export function getSentimentPositionMultiplier(
  sentiment: MarketSentiment,
  tradeDirection: 'LONG' | 'SHORT'
): number {
  if (sentiment.confidence < 30) return 1.0 // Not enough data

  if (tradeDirection === 'LONG') {
    if (sentiment.overall === 'BULLISH') return 1.2 // Increase size
    if (sentiment.overall === 'BEARISH') return 0.7 // Reduce size
    if (sentiment.overall === 'MIXED') return 0.8 // Slightly reduce
    return 1.0
  } else {
    if (sentiment.overall === 'BEARISH') return 1.2 // Increase size
    if (sentiment.overall === 'BULLISH') return 0.7 // Reduce size
    if (sentiment.overall === 'MIXED') return 0.8 // Slightly reduce
    return 1.0
  }
}

/**
 * Format market intelligence for logging/display
 */
export function formatMarketIntelligence(intel: MarketIntelligence): string {
  const lines = [
    '=== MARKET INTELLIGENCE REPORT ===',
    `Timestamp: ${intel.timestamp}`,
    '',
    '--- TRADING FILTER ---',
    `Can Trade: ${intel.filter.shouldTrade ? 'YES' : 'NO'}`,
    `Risk Level: ${intel.filter.riskLevel}`,
    `Reason: ${intel.filter.reason}`,
    '',
    '--- SENTIMENT ---',
    `Overall: ${intel.filter.sentiment.overall}`,
    `Score: ${intel.filter.sentiment.score > 0 ? '+' : ''}${intel.filter.sentiment.score}`,
    `Confidence: ${intel.filter.sentiment.confidence}%`,
    '',
    '--- KEY THEMES ---',
    intel.filter.sentiment.keyThemes.length > 0
      ? intel.filter.sentiment.keyThemes.join(', ')
      : 'No major themes detected',
    '',
    '--- ECONOMIC EVENTS ---',
  ]

  if (intel.economicCalendar.length > 0) {
    for (const event of intel.economicCalendar) {
      lines.push(`  [${event.impact}] ${event.name}`)
    }
  } else {
    lines.push('  No significant events')
  }

  if (intel.filter.warnings.length > 0) {
    lines.push('')
    lines.push('--- WARNINGS ---')
    for (const warning of intel.filter.warnings) {
      lines.push(`  ! ${warning}`)
    }
  }

  lines.push('')
  lines.push('================================')

  return lines.join('\n')
}
