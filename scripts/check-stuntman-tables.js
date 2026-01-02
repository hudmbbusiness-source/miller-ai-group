// Check StuntMan database tables
require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function checkTables() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     STUNTMAN DATABASE CHECK                            ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')

  const client = new Client({
    connectionString: 'postgresql://postgres:4w3DgAfGFWclOqDV@db.mrmynzeymwgzevxyxnln.supabase.co:5432/postgres'
  })

  try {
    await client.connect()
    console.log('✓ Connected to database')
    console.log('')

    // Check for stuntman tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'stuntman%'
      ORDER BY table_name
    `)

    console.log('STUNTMAN TABLES')
    console.log('─'.repeat(60))

    if (tablesResult.rows.length === 0) {
      console.log('⚠ No StuntMan tables found!')
    } else {
      for (const row of tablesResult.rows) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`)
        const count = countResult.rows[0].count
        console.log(`  ✓ ${row.table_name} (${count} rows)`)
      }
    }

    // Get column info for stuntman_accounts
    console.log('')
    console.log('ACCOUNTS TABLE COLUMNS')
    console.log('─'.repeat(60))

    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'stuntman_accounts'
      ORDER BY ordinal_position
    `)

    for (const col of columnsResult.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`)
    }

    // Get all accounts data
    console.log('')
    console.log('ACCOUNTS DATA')
    console.log('─'.repeat(60))

    const accountsResult = await client.query(`SELECT * FROM stuntman_accounts ORDER BY created_at DESC`)

    if (accountsResult.rows.length === 0) {
      console.log('No accounts created yet.')
    } else {
      for (const acc of accountsResult.rows) {
        const type = acc.account_type === 'paper' ? '📄 PAPER' : '💰 LIVE'
        const status = acc.status === 'active' ? '🟢' : '🔴'
        console.log('')
        console.log(`${status} ${type} - ${acc.name || 'Unnamed Account'}`)
        console.log(`   ID: ${acc.id}`)
        console.log(`   Balance: $${parseFloat(acc.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`)
        console.log(`   Initial: $${parseFloat(acc.initial_balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`)
        console.log(`   Realized P&L: $${parseFloat(acc.realized_pnl || 0).toFixed(2)}`)
        console.log(`   Win Rate: ${acc.win_rate || 0}%`)
        console.log(`   Total Trades: ${acc.total_trades || 0}`)
        console.log(`   Created: ${new Date(acc.created_at).toLocaleString()}`)
      }
    }

    // Check orders
    console.log('')
    console.log('ORDERS')
    console.log('─'.repeat(60))

    const ordersResult = await client.query(`SELECT * FROM stuntman_orders ORDER BY created_at DESC LIMIT 5`)

    if (ordersResult.rows.length === 0) {
      console.log('No orders yet.')
    } else {
      for (const order of ordersResult.rows) {
        const side = order.side === 'buy' ? '🟢 BUY' : '🔴 SELL'
        console.log('')
        console.log(`${side} ${order.instrument || order.symbol || 'N/A'}`)
        console.log(`   Status: ${order.status}`)
        console.log(`   Quantity: ${order.quantity}`)
        console.log(`   Price: $${parseFloat(order.price || order.filled_price || 0).toLocaleString()}`)
        console.log(`   Time: ${new Date(order.created_at).toLocaleString()}`)
      }
    }

    // Check positions
    console.log('')
    console.log('POSITIONS')
    console.log('─'.repeat(60))

    const posResult = await client.query(`SELECT * FROM stuntman_positions`)

    if (posResult.rows.length === 0) {
      console.log('No open positions.')
    } else {
      for (const pos of posResult.rows) {
        const side = pos.side === 'long' ? '🟢 LONG' : '🔴 SHORT'
        console.log('')
        console.log(`${side} ${pos.instrument || pos.symbol}`)
        console.log(`   Quantity: ${pos.quantity}`)
        console.log(`   Entry: $${parseFloat(pos.entry_price || 0).toLocaleString()}`)
        console.log(`   Unrealized P&L: $${parseFloat(pos.unrealized_pnl || 0).toFixed(2)}`)
      }
    }

    console.log('')
    console.log('═'.repeat(60))

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

checkTables().catch(console.error)
