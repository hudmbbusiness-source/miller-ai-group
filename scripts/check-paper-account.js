// Check Paper Trading Account Balance
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkAccounts() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     PAPER TRADING ACCOUNT BALANCE                      ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')

  // Get all stuntman accounts
  const response = await fetch(SUPABASE_URL + '/rest/v1/stuntman_accounts?select=*', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
    }
  })

  if (!response.ok) {
    console.log('Error fetching accounts:', response.status)
    return
  }

  const accounts = await response.json()

  if (accounts.length === 0) {
    console.log('No paper trading accounts found.')
    console.log('')
    console.log('To create one, go to StuntMan and click "Create Account"')
    return
  }

  console.log('Found ' + accounts.length + ' account(s):')
  console.log('─'.repeat(60))

  for (const acc of accounts) {
    const type = acc.is_paper ? '📄 PAPER' : '💰 LIVE'
    const status = acc.is_active ? '🟢 Active' : '🔴 Inactive'

    console.log('')
    console.log(type + ' - ' + acc.name)
    console.log('  ID: ' + acc.id)
    console.log('  Status: ' + status)
    console.log('  Balance: $' + parseFloat(acc.balance).toLocaleString('en-US', {minimumFractionDigits: 2}))
    console.log('  Initial: $' + parseFloat(acc.initial_balance).toLocaleString('en-US', {minimumFractionDigits: 2}))
    console.log('  Realized P&L: $' + parseFloat(acc.realized_pnl || 0).toLocaleString('en-US', {minimumFractionDigits: 2}))
    console.log('  Win/Loss: ' + (acc.win_count || 0) + 'W / ' + (acc.loss_count || 0) + 'L')
    console.log('  Total Trades: ' + (acc.total_trades || 0))
    console.log('  Created: ' + new Date(acc.created_at).toLocaleDateString())
  }

  // Also check for open positions
  console.log('')
  console.log('─'.repeat(60))
  console.log('OPEN POSITIONS')
  console.log('─'.repeat(60))

  const posResponse = await fetch(SUPABASE_URL + '/rest/v1/stuntman_positions?status=eq.open&select=*', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
    }
  })

  const positions = await posResponse.json()

  if (positions.length === 0) {
    console.log('No open positions.')
  } else {
    for (const pos of positions) {
      const side = pos.side === 'buy' ? '🟢 LONG' : '🔴 SHORT'
      console.log('')
      console.log(side + ' ' + pos.instrument_name)
      console.log('  Quantity: ' + pos.quantity)
      console.log('  Entry: $' + parseFloat(pos.entry_price).toLocaleString())
      console.log('  Unrealized P&L: $' + parseFloat(pos.unrealized_pnl || 0).toFixed(2))
    }
  }

  // Check recent orders
  console.log('')
  console.log('─'.repeat(60))
  console.log('RECENT ORDERS (last 5)')
  console.log('─'.repeat(60))

  const orderResponse = await fetch(SUPABASE_URL + '/rest/v1/stuntman_orders?select=*&order=created_at.desc&limit=5', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
    }
  })

  const orders = await orderResponse.json()

  if (orders.length === 0) {
    console.log('No orders found.')
  } else {
    for (const order of orders) {
      const side = order.side === 'buy' ? '🟢 BUY' : '🔴 SELL'
      const status = order.status === 'filled' ? '✓' : order.status === 'pending' ? '⏳' : '✗'
      console.log('')
      console.log(status + ' ' + side + ' ' + order.instrument_name)
      console.log('  Quantity: ' + order.quantity + ' @ $' + parseFloat(order.price || order.filled_price || 0).toLocaleString())
      console.log('  Status: ' + order.status)
      console.log('  Time: ' + new Date(order.created_at).toLocaleString())
    }
  }

  console.log('')
  console.log('═'.repeat(60))
}

checkAccounts().catch(console.error)
