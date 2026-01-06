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
