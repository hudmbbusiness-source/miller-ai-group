/**
 * Trade Journal with Psychology Tracking
 *
 * Comprehensive journaling system for:
 * - Trade documentation and analysis
 * - Emotional state tracking
 * - Pattern recognition in trading behavior
 * - Performance attribution
 * - Learning and improvement tracking
 */

// ============================================================================
// TYPES
// ============================================================================

export interface JournalEntry {
  id: string;
  timestamp: number;
  type: 'TRADE' | 'NOTE' | 'REVIEW' | 'LESSON';

  // Trade details (if type === 'TRADE')
  trade?: TradeDetails;

  // Psychology tracking
  psychology: PsychologyState;

  // Analysis
  analysis?: TradeAnalysis;

  // Tags and categorization
  tags: string[];
  mistakes: TradingMistake[];
  lessons: string[];

  // Media
  screenshots?: string[];
  notes: string;
}

export interface TradeDetails {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;

  // Context
  setup: TradingSetup;
  timeframe: string;
  marketCondition: string;
  newsEvents?: string[];

  // Execution quality
  entryQuality: 1 | 2 | 3 | 4 | 5;
  exitQuality: 1 | 2 | 3 | 4 | 5;
  planAdherence: 1 | 2 | 3 | 4 | 5;
}

export interface PsychologyState {
  // Pre-trade state
  preTradeConfidence: number;      // 1-10
  preTradeAnxiety: number;         // 1-10
  preTradeFocus: number;           // 1-10

  // During trade
  duringTradeEmotions: EmotionalState[];
  stressLevel: number;             // 1-10
  impulsiveActions: boolean;

  // Post-trade state
  postTradeFeeling: 'satisfied' | 'frustrated' | 'neutral' | 'regretful' | 'relieved';
  wouldTakeAgain: boolean;

  // External factors
  sleepQuality: number;            // 1-10
  physicalState: 'good' | 'tired' | 'sick' | 'energized';
  distractions: string[];
  tradingEnvironment: 'optimal' | 'suboptimal' | 'poor';
}

export type EmotionalState =
  | 'calm'
  | 'excited'
  | 'anxious'
  | 'fearful'
  | 'greedy'
  | 'frustrated'
  | 'confident'
  | 'doubtful'
  | 'impatient'
  | 'disciplined'
  | 'FOMO'
  | 'revenge';

export type TradingSetup =
  | 'TREND_CONTINUATION'
  | 'TREND_REVERSAL'
  | 'BREAKOUT'
  | 'BREAKDOWN'
  | 'RANGE_BOUNCE'
  | 'PULLBACK'
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'NEWS_PLAY'
  | 'SCALP'
  | 'SWING'
  | 'OTHER';

export type TradingMistake =
  | 'MOVED_STOP'
  | 'NO_STOP'
  | 'OVERSIZE'
  | 'UNDERSIZE'
  | 'EARLY_EXIT'
  | 'LATE_EXIT'
  | 'EARLY_ENTRY'
  | 'LATE_ENTRY'
  | 'CHASING'
  | 'REVENGE_TRADE'
  | 'FOMO_ENTRY'
  | 'IGNORED_PLAN'
  | 'OVERTRADING'
  | 'AVERAGING_DOWN'
  | 'NO_EDGE'
  | 'WRONG_SIZE'
  | 'EMOTIONAL_EXIT';

export interface TradeAnalysis {
  // What went right
  positives: string[];

  // What went wrong
  negatives: string[];

  // Key takeaways
  improvements: string[];

  // Pattern recognition
  similarTrades: string[];         // IDs of similar past trades
  patternScore: number;            // How well pattern played out

  // Performance attribution
  skillVsLuck: 'skill' | 'luck' | 'mixed';
  marketContribution: number;      // % of P&L from market movement
  alphaGenerated: number;          // Excess return vs benchmark
}

export interface JournalStats {
  totalEntries: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;

  // Psychology stats
  avgPreTradeConfidence: number;
  avgStressLevel: number;
  mostCommonEmotions: { emotion: EmotionalState; count: number }[];
  wouldTakeAgainRate: number;

  // Mistake analysis
  topMistakes: { mistake: TradingMistake; count: number; costPnL: number }[];
  mistakeFrequency: number;        // Mistakes per trade

  // Setup analysis
  setupPerformance: { setup: TradingSetup; trades: number; winRate: number; avgPnL: number }[];
  bestSetup: TradingSetup;
  worstSetup: TradingSetup;

  // Time analysis
  bestTradingTime: string;
  worstTradingTime: string;
  bestDayOfWeek: string;
  worstDayOfWeek: string;

  // Performance by state
  performanceByConfidence: { level: string; winRate: number; avgPnL: number }[];
  performanceBySleep: { level: string; winRate: number; avgPnL: number }[];
  performanceByStress: { level: string; winRate: number; avgPnL: number }[];
}

export interface TradingPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  isPositive: boolean;
  trades: string[];
  avgImpact: number;
  recommendation: string;
}

// ============================================================================
// TRADE JOURNAL CLASS
// ============================================================================

export class TradeJournal {
  private entries: JournalEntry[] = [];
  private patterns: TradingPattern[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // ============================================================================
  // ENTRY MANAGEMENT
  // ============================================================================

  /**
   * Add a new journal entry
   */
  addEntry(entry: Omit<JournalEntry, 'id' | 'timestamp'>): JournalEntry {
    const newEntry: JournalEntry = {
      ...entry,
      id: `J${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.entries.push(newEntry);
    this.detectPatterns();
    this.saveToStorage();

    return newEntry;
  }

  /**
   * Quick add a trade entry
   */
  addTrade(
    trade: TradeDetails,
    psychology: Partial<PsychologyState>,
    notes: string = '',
    tags: string[] = []
  ): JournalEntry {
    const fullPsychology: PsychologyState = {
      preTradeConfidence: 5,
      preTradeAnxiety: 5,
      preTradeFocus: 5,
      duringTradeEmotions: ['calm'],
      stressLevel: 5,
      impulsiveActions: false,
      postTradeFeeling: 'neutral',
      wouldTakeAgain: true,
      sleepQuality: 7,
      physicalState: 'good',
      distractions: [],
      tradingEnvironment: 'optimal',
      ...psychology,
    };

    // Auto-detect potential mistakes
    const mistakes = this.detectMistakes(trade, fullPsychology);

    return this.addEntry({
      type: 'TRADE',
      trade,
      psychology: fullPsychology,
      tags: [...tags, trade.setup, trade.pnl > 0 ? 'winner' : 'loser'],
      mistakes,
      lessons: [],
      notes,
    });
  }

  /**
   * Update an existing entry
   */
  updateEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | null {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) return null;

    this.entries[index] = { ...this.entries[index], ...updates };
    this.saveToStorage();

    return this.entries[index];
  }

  /**
   * Delete an entry
   */
  deleteEntry(id: string): boolean {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) return false;

    this.entries.splice(index, 1);
    this.saveToStorage();

    return true;
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): JournalEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Get all entries
   */
  getEntries(filters?: {
    type?: JournalEntry['type'];
    startDate?: number;
    endDate?: number;
    tags?: string[];
    setup?: TradingSetup;
    profitable?: boolean;
  }): JournalEntry[] {
    let filtered = [...this.entries];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(e => e.type === filters.type);
      }
      if (filters.startDate) {
        filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(e =>
          filters.tags!.some(t => e.tags.includes(t))
        );
      }
      if (filters.setup) {
        filtered = filtered.filter(e => e.trade?.setup === filters.setup);
      }
      if (filters.profitable !== undefined) {
        filtered = filtered.filter(e =>
          e.trade ? (e.trade.pnl > 0) === filters.profitable : true
        );
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ============================================================================
  // AUTOMATIC ANALYSIS
  // ============================================================================

  /**
   * Auto-detect potential trading mistakes
   */
  private detectMistakes(trade: TradeDetails, psychology: PsychologyState): TradingMistake[] {
    const mistakes: TradingMistake[] = [];

    // Check for emotional trading indicators
    if (psychology.duringTradeEmotions.includes('revenge')) {
      mistakes.push('REVENGE_TRADE');
    }
    if (psychology.duringTradeEmotions.includes('FOMO')) {
      mistakes.push('FOMO_ENTRY');
    }
    if (psychology.impulsiveActions) {
      mistakes.push('IGNORED_PLAN');
    }

    // Check execution quality
    if (trade.entryQuality <= 2) {
      mistakes.push(trade.pnl < 0 ? 'EARLY_ENTRY' : 'LATE_ENTRY');
    }
    if (trade.exitQuality <= 2) {
      mistakes.push(trade.pnl < 0 ? 'LATE_EXIT' : 'EARLY_EXIT');
    }
    if (trade.planAdherence <= 2) {
      mistakes.push('IGNORED_PLAN');
    }

    // Check for overtrading (would need session context)
    if (psychology.stressLevel >= 8) {
      mistakes.push('OVERTRADING');
    }

    // Check for emotional exits
    if (psychology.postTradeFeeling === 'regretful' && trade.pnl < 0) {
      mistakes.push('EMOTIONAL_EXIT');
    }

    return [...new Set(mistakes)]; // Remove duplicates
  }

  /**
   * Detect patterns in trading behavior
   */
  private detectPatterns(): void {
    const tradeEntries = this.entries.filter(e => e.type === 'TRADE' && e.trade);

    if (tradeEntries.length < 10) return;

    const patterns: TradingPattern[] = [];

    // Pattern 1: Emotional state correlation
    const emotionGroups = new Map<EmotionalState, JournalEntry[]>();
    for (const entry of tradeEntries) {
      for (const emotion of entry.psychology.duringTradeEmotions) {
        if (!emotionGroups.has(emotion)) {
          emotionGroups.set(emotion, []);
        }
        emotionGroups.get(emotion)!.push(entry);
      }
    }

    for (const [emotion, entries] of emotionGroups) {
      if (entries.length >= 5) {
        const avgPnL = entries.reduce((sum, e) => sum + (e.trade?.pnl || 0), 0) / entries.length;
        const winRate = entries.filter(e => (e.trade?.pnl || 0) > 0).length / entries.length;

        if (avgPnL < -50 || winRate < 0.3) {
          patterns.push({
            id: `PAT_EMO_${emotion}`,
            name: `${emotion} Trading Pattern`,
            description: `Trading while feeling ${emotion} tends to result in losses`,
            frequency: entries.length,
            isPositive: false,
            trades: entries.map(e => e.id),
            avgImpact: avgPnL,
            recommendation: `Avoid trading when feeling ${emotion}. Take a break and reassess.`,
          });
        } else if (avgPnL > 50 || winRate > 0.6) {
          patterns.push({
            id: `PAT_EMO_${emotion}`,
            name: `${emotion} Trading Pattern`,
            description: `Trading while ${emotion} tends to produce good results`,
            frequency: entries.length,
            isPositive: true,
            trades: entries.map(e => e.id),
            avgImpact: avgPnL,
            recommendation: `This emotional state seems to help your trading. Try to cultivate it.`,
          });
        }
      }
    }

    // Pattern 2: Time of day analysis
    const hourGroups = new Map<number, JournalEntry[]>();
    for (const entry of tradeEntries) {
      const hour = new Date(entry.trade!.entryTime).getHours();
      if (!hourGroups.has(hour)) {
        hourGroups.set(hour, []);
      }
      hourGroups.get(hour)!.push(entry);
    }

    for (const [hour, entries] of hourGroups) {
      if (entries.length >= 5) {
        const avgPnL = entries.reduce((sum, e) => sum + (e.trade?.pnl || 0), 0) / entries.length;
        const winRate = entries.filter(e => (e.trade?.pnl || 0) > 0).length / entries.length;

        if (winRate < 0.35) {
          patterns.push({
            id: `PAT_TIME_${hour}`,
            name: `Poor Performance at ${hour}:00`,
            description: `Your trades around ${hour}:00 have a ${(winRate * 100).toFixed(0)}% win rate`,
            frequency: entries.length,
            isPositive: false,
            trades: entries.map(e => e.id),
            avgImpact: avgPnL,
            recommendation: `Consider avoiding trades around ${hour}:00 or being more selective.`,
          });
        }
      }
    }

    // Pattern 3: Mistake patterns
    const mistakeGroups = new Map<TradingMistake, JournalEntry[]>();
    for (const entry of tradeEntries) {
      for (const mistake of entry.mistakes) {
        if (!mistakeGroups.has(mistake)) {
          mistakeGroups.set(mistake, []);
        }
        mistakeGroups.get(mistake)!.push(entry);
      }
    }

    for (const [mistake, entries] of mistakeGroups) {
      if (entries.length >= 3) {
        const avgPnL = entries.reduce((sum, e) => sum + (e.trade?.pnl || 0), 0) / entries.length;

        patterns.push({
          id: `PAT_MISTAKE_${mistake}`,
          name: `Recurring: ${mistake.replace(/_/g, ' ')}`,
          description: `This mistake has occurred ${entries.length} times`,
          frequency: entries.length,
          isPositive: false,
          trades: entries.map(e => e.id),
          avgImpact: avgPnL,
          recommendation: this.getMistakeRecommendation(mistake),
        });
      }
    }

    // Pattern 4: Sleep quality correlation
    const sleepGroups: { good: JournalEntry[]; poor: JournalEntry[] } = { good: [], poor: [] };
    for (const entry of tradeEntries) {
      if (entry.psychology.sleepQuality >= 7) {
        sleepGroups.good.push(entry);
      } else if (entry.psychology.sleepQuality <= 4) {
        sleepGroups.poor.push(entry);
      }
    }

    if (sleepGroups.poor.length >= 5) {
      const poorWinRate = sleepGroups.poor.filter(e => (e.trade?.pnl || 0) > 0).length / sleepGroups.poor.length;
      const goodWinRate = sleepGroups.good.length > 0
        ? sleepGroups.good.filter(e => (e.trade?.pnl || 0) > 0).length / sleepGroups.good.length
        : 0.5;

      if (poorWinRate < goodWinRate - 0.1) {
        patterns.push({
          id: 'PAT_SLEEP',
          name: 'Sleep Quality Impact',
          description: `Win rate drops from ${(goodWinRate * 100).toFixed(0)}% to ${(poorWinRate * 100).toFixed(0)}% when sleep deprived`,
          frequency: sleepGroups.poor.length,
          isPositive: false,
          trades: sleepGroups.poor.map(e => e.id),
          avgImpact: sleepGroups.poor.reduce((sum, e) => sum + (e.trade?.pnl || 0), 0) / sleepGroups.poor.length,
          recommendation: 'Prioritize sleep. Consider reducing position size on days with poor sleep.',
        });
      }
    }

    this.patterns = patterns;
  }

  private getMistakeRecommendation(mistake: TradingMistake): string {
    const recommendations: Record<TradingMistake, string> = {
      'MOVED_STOP': 'Set your stop and leave it. Consider using a platform that hides stops from you.',
      'NO_STOP': 'Always enter with a stop. No exceptions. Pre-calculate risk before entry.',
      'OVERSIZE': 'Use position sizing calculator. Never risk more than 2% per trade.',
      'UNDERSIZE': 'Trust your analysis. If the setup is good, size appropriately.',
      'EARLY_EXIT': 'Let winners run. Consider trailing stops instead of fixed exits.',
      'LATE_EXIT': 'Set clear exit rules before entry. Stick to your plan.',
      'EARLY_ENTRY': 'Wait for confirmation. Patience pays in trading.',
      'LATE_ENTRY': 'If you miss the entry, let it go. There will be other trades.',
      'CHASING': 'Never chase. If you missed it, wait for the next setup.',
      'REVENGE_TRADE': 'After a loss, take a 15-minute break. Review your rules.',
      'FOMO_ENTRY': 'Missing a trade is not a loss. Stick to your setups.',
      'IGNORED_PLAN': 'Print your rules. Read them before every trade.',
      'OVERTRADING': 'Set a daily trade limit. Quality over quantity.',
      'AVERAGING_DOWN': 'Never add to a losing position. Take the loss and move on.',
      'NO_EDGE': 'Only trade setups you have backtested. Know your edge.',
      'WRONG_SIZE': 'Always calculate position size before entry. Make it automatic.',
      'EMOTIONAL_EXIT': 'Set your exits in advance. Let the market decide, not your emotions.',
    };

    return recommendations[mistake] || 'Review this pattern and develop a specific rule to address it.';
  }

  // ============================================================================
  // STATISTICS & ANALYSIS
  // ============================================================================

  /**
   * Get comprehensive statistics
   */
  getStats(startDate?: number, endDate?: number): JournalStats {
    let tradeEntries = this.entries.filter(e => e.type === 'TRADE' && e.trade);

    if (startDate) {
      tradeEntries = tradeEntries.filter(e => e.timestamp >= startDate);
    }
    if (endDate) {
      tradeEntries = tradeEntries.filter(e => e.timestamp <= endDate);
    }

    const trades = tradeEntries.map(e => e.trade!);
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);

    // Psychology stats
    const avgConfidence = tradeEntries.length > 0
      ? tradeEntries.reduce((sum, e) => sum + e.psychology.preTradeConfidence, 0) / tradeEntries.length
      : 5;

    const avgStress = tradeEntries.length > 0
      ? tradeEntries.reduce((sum, e) => sum + e.psychology.stressLevel, 0) / tradeEntries.length
      : 5;

    // Emotion frequency
    const emotionCounts = new Map<EmotionalState, number>();
    for (const entry of tradeEntries) {
      for (const emotion of entry.psychology.duringTradeEmotions) {
        emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
      }
    }
    const mostCommonEmotions = Array.from(emotionCounts.entries())
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Would take again rate
    const wouldTakeAgainRate = tradeEntries.length > 0
      ? tradeEntries.filter(e => e.psychology.wouldTakeAgain).length / tradeEntries.length
      : 0;

    // Mistake analysis
    const mistakeCounts = new Map<TradingMistake, { count: number; pnl: number }>();
    for (const entry of tradeEntries) {
      for (const mistake of entry.mistakes) {
        const current = mistakeCounts.get(mistake) || { count: 0, pnl: 0 };
        mistakeCounts.set(mistake, {
          count: current.count + 1,
          pnl: current.pnl + (entry.trade?.pnl || 0),
        });
      }
    }
    const topMistakes = Array.from(mistakeCounts.entries())
      .map(([mistake, data]) => ({ mistake, count: data.count, costPnL: data.pnl }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Setup performance
    const setupStats = new Map<TradingSetup, { trades: number; wins: number; pnl: number }>();
    for (const trade of trades) {
      const current = setupStats.get(trade.setup) || { trades: 0, wins: 0, pnl: 0 };
      setupStats.set(trade.setup, {
        trades: current.trades + 1,
        wins: current.wins + (trade.pnl > 0 ? 1 : 0),
        pnl: current.pnl + trade.pnl,
      });
    }
    const setupPerformance = Array.from(setupStats.entries())
      .map(([setup, data]) => ({
        setup,
        trades: data.trades,
        winRate: data.trades > 0 ? data.wins / data.trades : 0,
        avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
      }))
      .sort((a, b) => b.avgPnL - a.avgPnL);

    // Time analysis
    const hourStats = new Map<number, { trades: number; wins: number }>();
    const dayStats = new Map<number, { trades: number; wins: number }>();

    for (const trade of trades) {
      const date = new Date(trade.entryTime);
      const hour = date.getHours();
      const day = date.getDay();

      const hourCurrent = hourStats.get(hour) || { trades: 0, wins: 0 };
      hourStats.set(hour, {
        trades: hourCurrent.trades + 1,
        wins: hourCurrent.wins + (trade.pnl > 0 ? 1 : 0),
      });

      const dayCurrent = dayStats.get(day) || { trades: 0, wins: 0 };
      dayStats.set(day, {
        trades: dayCurrent.trades + 1,
        wins: dayCurrent.wins + (trade.pnl > 0 ? 1 : 0),
      });
    }

    const hourPerf = Array.from(hourStats.entries())
      .map(([hour, data]) => ({ hour, winRate: data.wins / data.trades }));
    const bestHour = hourPerf.sort((a, b) => b.winRate - a.winRate)[0]?.hour || 9;
    const worstHour = hourPerf.sort((a, b) => a.winRate - b.winRate)[0]?.hour || 15;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPerf = Array.from(dayStats.entries())
      .map(([day, data]) => ({ day: days[day], winRate: data.wins / data.trades }));
    const bestDay = dayPerf.sort((a, b) => b.winRate - a.winRate)[0]?.day || 'Tuesday';
    const worstDay = dayPerf.sort((a, b) => a.winRate - b.winRate)[0]?.day || 'Monday';

    // Performance by psychological state
    const confGroups = this.groupByLevel(tradeEntries, e => e.psychology.preTradeConfidence);
    const sleepGroups = this.groupByLevel(tradeEntries, e => e.psychology.sleepQuality);
    const stressGroups = this.groupByLevel(tradeEntries, e => e.psychology.stressLevel);

    return {
      totalEntries: this.entries.length,
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: trades.length > 0 ? winners.length / trades.length : 0,
      avgPreTradeConfidence: avgConfidence,
      avgStressLevel: avgStress,
      mostCommonEmotions,
      wouldTakeAgainRate,
      topMistakes,
      mistakeFrequency: trades.length > 0
        ? tradeEntries.reduce((sum, e) => sum + e.mistakes.length, 0) / trades.length
        : 0,
      setupPerformance,
      bestSetup: setupPerformance[0]?.setup || 'TREND_CONTINUATION',
      worstSetup: setupPerformance[setupPerformance.length - 1]?.setup || 'OTHER',
      bestTradingTime: `${bestHour}:00`,
      worstTradingTime: `${worstHour}:00`,
      bestDayOfWeek: bestDay,
      worstDayOfWeek: worstDay,
      performanceByConfidence: confGroups,
      performanceBySleep: sleepGroups,
      performanceByStress: stressGroups,
    };
  }

  private groupByLevel(
    entries: JournalEntry[],
    getValue: (e: JournalEntry) => number
  ): { level: string; winRate: number; avgPnL: number }[] {
    const groups: { [key: string]: JournalEntry[] } = {
      'Low (1-3)': [],
      'Medium (4-6)': [],
      'High (7-10)': [],
    };

    for (const entry of entries) {
      const value = getValue(entry);
      if (value <= 3) groups['Low (1-3)'].push(entry);
      else if (value <= 6) groups['Medium (4-6)'].push(entry);
      else groups['High (7-10)'].push(entry);
    }

    return Object.entries(groups).map(([level, entries]) => {
      const trades = entries.filter(e => e.trade).map(e => e.trade!);
      const winners = trades.filter(t => t.pnl > 0);
      return {
        level,
        winRate: trades.length > 0 ? winners.length / trades.length : 0,
        avgPnL: trades.length > 0 ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length : 0,
      };
    });
  }

  /**
   * Get detected patterns
   */
  getPatterns(): TradingPattern[] {
    return [...this.patterns];
  }

  /**
   * Get improvement suggestions
   */
  getImprovementSuggestions(): string[] {
    const stats = this.getStats();
    const suggestions: string[] = [];

    // Based on win rate
    if (stats.winRate < 0.45) {
      suggestions.push('Your win rate is below 45%. Consider being more selective with entries.');
    }

    // Based on mistakes
    for (const mistake of stats.topMistakes.slice(0, 3)) {
      suggestions.push(`Focus on eliminating ${mistake.mistake.replace(/_/g, ' ')} - it has cost you $${Math.abs(mistake.costPnL).toFixed(2)}`);
    }

    // Based on psychology
    if (stats.avgStressLevel > 7) {
      suggestions.push('Your average stress level is high. Consider reducing position size or taking more breaks.');
    }

    // Based on time
    suggestions.push(`Your best trading time is ${stats.bestTradingTime}. Consider focusing your energy there.`);
    suggestions.push(`Avoid trading around ${stats.worstTradingTime} when possible.`);

    // Based on setup
    suggestions.push(`Your best setup is ${stats.bestSetup.replace(/_/g, ' ')}. Consider specializing.`);

    // From patterns
    for (const pattern of this.patterns.filter(p => !p.isPositive)) {
      suggestions.push(pattern.recommendation);
    }

    return suggestions.slice(0, 10);
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('trade_journal', JSON.stringify({
          entries: this.entries,
          patterns: this.patterns,
        }));
      } catch (e) {
        console.error('Failed to save journal:', e);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('trade_journal');
        if (saved) {
          const data = JSON.parse(saved);
          this.entries = data.entries || [];
          this.patterns = data.patterns || [];
        }
      } catch (e) {
        console.error('Failed to load journal:', e);
      }
    }
  }

  /**
   * Export journal to JSON
   */
  export(): string {
    return JSON.stringify({
      entries: this.entries,
      patterns: this.patterns,
      exportedAt: Date.now(),
    }, null, 2);
  }

  /**
   * Import journal from JSON
   */
  import(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.entries) {
        this.entries = data.entries;
        this.patterns = data.patterns || [];
        this.detectPatterns();
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import journal:', e);
      return false;
    }
  }

  /**
   * Clear all journal data
   */
  clear(): void {
    this.entries = [];
    this.patterns = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trade_journal');
    }
  }
}

// Export singleton
export const tradeJournal = new TradeJournal();
