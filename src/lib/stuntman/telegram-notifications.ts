/**
 * STUNTMAN TELEGRAM NOTIFICATIONS
 *
 * Sends real-time trade alerts to your phone via Telegram.
 *
 * SETUP:
 * 1. Message @BotFather on Telegram
 * 2. Send /newbot and follow prompts
 * 3. Copy the bot token
 * 4. Message your new bot (any message)
 * 5. Get your chat ID from: https://api.telegram.org/bot<TOKEN>/getUpdates
 * 6. Add to Vercel env vars:
 *    - TELEGRAM_BOT_TOKEN
 *    - TELEGRAM_CHAT_ID
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

interface TradeNotification {
  type: 'ENTRY' | 'EXIT' | 'SIGNAL' | 'ALERT' | 'STATUS'
  instrument: 'ES' | 'NQ'
  direction?: 'LONG' | 'SHORT'
  price?: number
  stopLoss?: number
  takeProfit?: number
  pattern?: string
  pnl?: number
  message?: string
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[Telegram] Not configured - skipping notification')
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      })
    })

    const result = await response.json()

    if (!result.ok) {
      console.error('[Telegram] API Error:', result.description)
      return false
    }

    console.log('[Telegram] Message sent successfully')
    return true
  } catch (error) {
    console.error('[Telegram] Failed to send:', error)
    return false
  }
}

/**
 * Format and send a trade notification
 */
export async function sendTradeNotification(notification: TradeNotification): Promise<boolean> {
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  let emoji = ''
  let title = ''
  let body = ''

  switch (notification.type) {
    case 'ENTRY':
      emoji = notification.direction === 'LONG' ? '🟢' : '🔴'
      title = `${emoji} NEW ${notification.direction} POSITION`
      body = `
<b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Instrument:</b> ${notification.instrument}
💰 <b>Entry Price:</b> $${notification.price?.toFixed(2)}
🛡 <b>Stop Loss:</b> $${notification.stopLoss?.toFixed(2)}
🎯 <b>Take Profit:</b> $${notification.takeProfit?.toFixed(2)}
📈 <b>Pattern:</b> ${notification.pattern}
🕐 <b>Time:</b> ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`
      break

    case 'EXIT':
      emoji = (notification.pnl || 0) >= 0 ? '💰' : '📉'
      const pnlSign = (notification.pnl || 0) >= 0 ? '+' : ''
      title = `${emoji} POSITION CLOSED`
      body = `
<b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Instrument:</b> ${notification.instrument}
💵 <b>Exit Price:</b> $${notification.price?.toFixed(2)}
${emoji} <b>P&L:</b> ${pnlSign}$${notification.pnl?.toFixed(2)}
📝 <b>Reason:</b> ${notification.message || 'Take Profit/Stop Loss'}
🕐 <b>Time:</b> ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`
      break

    case 'SIGNAL':
      emoji = notification.direction === 'LONG' ? '📈' : '📉'
      title = `${emoji} SIGNAL DETECTED`
      body = `
<b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Instrument:</b> ${notification.instrument}
🎯 <b>Direction:</b> ${notification.direction}
💰 <b>Entry:</b> $${notification.price?.toFixed(2)}
📈 <b>Pattern:</b> ${notification.pattern}
🕐 <b>Time:</b> ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`
      break

    case 'ALERT':
      emoji = '⚠️'
      title = `${emoji} ALERT`
      body = `
<b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
${notification.message}
🕐 <b>Time:</b> ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`
      break

    case 'STATUS':
      emoji = '📊'
      title = `${emoji} STATUS UPDATE`
      body = `
<b>${title}</b>
━━━━━━━━━━━━━━━━━━━━
${notification.message}
🕐 <b>Time:</b> ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`
      break
  }

  return sendTelegramMessage(body)
}

/**
 * Send market open notification
 */
export async function sendMarketOpenNotification(): Promise<boolean> {
  const message = `
<b>🔔 MARKET OPEN</b>
━━━━━━━━━━━━━━━━━━━━
📊 ES & NQ futures markets are now OPEN
🤖 STUNTMAN Auto-Trader is ACTIVE
🎯 Scanning for signals...
━━━━━━━━━━━━━━━━━━━━
<i>Good luck today!</i>`

  return sendTelegramMessage(message)
}

/**
 * Send daily summary notification
 */
export async function sendDailySummary(stats: {
  trades: number
  wins: number
  losses: number
  pnl: number
  winRate: number
}): Promise<boolean> {
  const emoji = stats.pnl >= 0 ? '💰' : '📉'
  const pnlSign = stats.pnl >= 0 ? '+' : ''

  const message = `
<b>📊 DAILY SUMMARY</b>
━━━━━━━━━━━━━━━━━━━━
📈 <b>Total Trades:</b> ${stats.trades}
✅ <b>Wins:</b> ${stats.wins}
❌ <b>Losses:</b> ${stats.losses}
📊 <b>Win Rate:</b> ${stats.winRate.toFixed(1)}%
${emoji} <b>P&L:</b> ${pnlSign}$${stats.pnl.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  return sendTelegramMessage(message)
}

/**
 * Test the Telegram connection
 */
export async function testTelegramConnection(): Promise<{ success: boolean; message: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, message: 'TELEGRAM_BOT_TOKEN not set' }
  }
  if (!TELEGRAM_CHAT_ID) {
    return { success: false, message: 'TELEGRAM_CHAT_ID not set' }
  }

  const testMessage = `
<b>✅ STUNTMAN Connected!</b>
━━━━━━━━━━━━━━━━━━━━
Your Telegram notifications are working.
You'll receive alerts for:
• Trade entries
• Trade exits (with P&L)
• Market open/close
• Daily summaries
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  const success = await sendTelegramMessage(testMessage)

  return {
    success,
    message: success ? 'Test message sent!' : 'Failed to send test message'
  }
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

/**
 * Send 15-minute pre-market warning
 */
export async function sendPreMarketAlert(): Promise<boolean> {
  const message = `
<b>⏰ 15 MINUTES TO MARKET OPEN</b>
━━━━━━━━━━━━━━━━━━━━
🕘 Market opens at <b>9:30 AM EST</b>
🤖 STUNTMAN is ready to trade
📊 Instruments: ES & NQ Futures
⚠️ All positions must close by 4:59 PM

<b>Apex 150K Rules Active:</b>
• Max Drawdown: $6,000 trailing
• Profit Target: $9,000
• Max Contracts: 17
━━━━━━━━━━━━━━━━━━━━
<i>Get ready!</i>`

  return sendTelegramMessage(message)
}

/**
 * Send enhanced trade entry notification with position size
 */
export async function sendTradeEntryNotification(trade: {
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  stopLoss: number
  takeProfit: number
  contracts: number
  pattern: string
  riskAmount: number
  potentialProfit: number
}): Promise<boolean> {
  const emoji = trade.direction === 'LONG' ? '🟢' : '🔴'
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const message = `
<b>${emoji} NEW ${trade.direction} - ${trade.instrument}</b>
━━━━━━━━━━━━━━━━━━━━
💰 <b>Entry:</b> $${trade.entryPrice.toFixed(2)}
📦 <b>Contracts:</b> ${trade.contracts}
🛡 <b>Stop Loss:</b> $${trade.stopLoss.toFixed(2)}
🎯 <b>Take Profit:</b> $${trade.takeProfit.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━
⚠️ <b>Risk:</b> $${trade.riskAmount.toFixed(2)}
💵 <b>Potential:</b> +$${trade.potentialProfit.toFixed(2)}
📈 <b>Pattern:</b> ${trade.pattern}
🕐 ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  return sendTelegramMessage(message)
}

/**
 * Send trade exit notification with profit/loss
 */
export async function sendTradeExitNotification(trade: {
  instrument: 'ES' | 'NQ'
  direction: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  contracts: number
  pnl: number
  exitReason: string
  holdTime: string
}): Promise<boolean> {
  const isWin = trade.pnl >= 0
  const emoji = isWin ? '💰' : '📉'
  const resultEmoji = isWin ? '✅ WIN' : '❌ LOSS'
  const pnlSign = isWin ? '+' : ''
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const message = `
<b>${emoji} TRADE CLOSED - ${resultEmoji}</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>Instrument:</b> ${trade.instrument} ${trade.direction}
📦 <b>Contracts:</b> ${trade.contracts}
━━━━━━━━━━━━━━━━━━━━
📥 <b>Entry:</b> $${trade.entryPrice.toFixed(2)}
📤 <b>Exit:</b> $${trade.exitPrice.toFixed(2)}
${emoji} <b>P&L:</b> ${pnlSign}$${trade.pnl.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━
📝 <b>Reason:</b> ${trade.exitReason}
⏱ <b>Hold Time:</b> ${trade.holdTime}
🕐 ${timestamp} EST
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  return sendTelegramMessage(message)
}

/**
 * Send weekly summary (Friday market close)
 */
export async function sendWeeklySummary(stats: {
  weekStart: string
  weekEnd: string
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  grossPnL: number
  totalCosts: number
  netPnL: number
  bestTrade: number
  worstTrade: number
  avgTradeSize: number
  apexProgress: {
    currentBalance: number
    profitTarget: number
    drawdownUsed: number
    daysTraded: number
  }
}): Promise<boolean> {
  const isProfit = stats.netPnL >= 0
  const emoji = isProfit ? '💰' : '📉'
  const pnlSign = isProfit ? '+' : ''
  const progressPercent = ((stats.apexProgress.currentBalance - 150000) / 9000 * 100).toFixed(1)

  const message = `
<b>📊 WEEKLY SUMMARY</b>
━━━━━━━━━━━━━━━━━━━━
📅 <b>Week:</b> ${stats.weekStart} - ${stats.weekEnd}
━━━━━━━━━━━━━━━━━━━━
<b>PERFORMANCE:</b>
📈 Total Trades: ${stats.totalTrades}
✅ Wins: ${stats.wins} | ❌ Losses: ${stats.losses}
📊 Win Rate: ${stats.winRate.toFixed(1)}%
━━━━━━━━━━━━━━━━━━━━
<b>PROFIT & LOSS:</b>
💵 Gross P&L: ${stats.grossPnL >= 0 ? '+' : ''}$${stats.grossPnL.toFixed(2)}
💳 Costs/Fees: -$${stats.totalCosts.toFixed(2)}
${emoji} <b>Net P&L: ${pnlSign}$${stats.netPnL.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━━━
<b>TRADE STATS:</b>
🏆 Best Trade: +$${stats.bestTrade.toFixed(2)}
😢 Worst Trade: $${stats.worstTrade.toFixed(2)}
📦 Avg Size: ${stats.avgTradeSize.toFixed(1)} contracts
━━━━━━━━━━━━━━━━━━━━
<b>APEX 150K PROGRESS:</b>
💰 Balance: $${stats.apexProgress.currentBalance.toFixed(2)}
🎯 Target: $${stats.apexProgress.profitTarget.toFixed(2)} (${progressPercent}%)
⚠️ Drawdown Used: ${stats.apexProgress.drawdownUsed.toFixed(1)}%
📅 Days Traded: ${stats.apexProgress.daysTraded}/7+
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  return sendTelegramMessage(message)
}

/**
 * Send 4:59 PM mandatory close warning
 */
export async function sendMandatoryCloseWarning(minutesRemaining: number): Promise<boolean> {
  const message = `
<b>⚠️ APEX MANDATORY CLOSE WARNING</b>
━━━━━━━━━━━━━━━━━━━━
🕔 <b>${minutesRemaining} MINUTES</b> until 4:59 PM EST

All positions MUST be closed by 4:59 PM
per Apex Trader Funding rules.

${minutesRemaining <= 5 ? '🚨 <b>CLOSING ALL POSITIONS NOW!</b>' : '⏰ Preparing to close positions...'}
━━━━━━━━━━━━━━━━━━━━
<i>STUNTMAN Auto-Trader</i>`

  return sendTelegramMessage(message)
}

/**
 * Send market close notification
 */
export async function sendMarketCloseNotification(dailyStats: {
  trades: number
  wins: number
  losses: number
  pnl: number
  winRate: number
}): Promise<boolean> {
  const isProfit = dailyStats.pnl >= 0
  const emoji = isProfit ? '💰' : '📉'
  const pnlSign = isProfit ? '+' : ''

  const message = `
<b>🔔 MARKET CLOSED</b>
━━━━━━━━━━━━━━━━━━━━
All positions closed per Apex 4:59 PM rule.

<b>TODAY'S RESULTS:</b>
📈 Trades: ${dailyStats.trades}
✅ Wins: ${dailyStats.wins} | ❌ Losses: ${dailyStats.losses}
📊 Win Rate: ${dailyStats.winRate.toFixed(1)}%
${emoji} <b>P&L: ${pnlSign}$${dailyStats.pnl.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━━━
<i>See you tomorrow!</i>`

  return sendTelegramMessage(message)
}
