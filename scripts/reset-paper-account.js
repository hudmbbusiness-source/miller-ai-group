// Reset Paper Trading Account
require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function resetAccount() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     RESETTING PAPER TRADING ACCOUNT                    ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')

  const client = new Client({
    connectionString: 'postgresql://postgres:4w3DgAfGFWclOqDV@db.mrmynzeymwgzevxyxnln.supabase.co:5432/postgres'
  })

  try {
    await client.connect()

    const accountId = '4f06d092-1015-4da2-81e8-392d66dfc8b4'

    // Reset account balance and stats
    await client.query(`
      UPDATE stuntman_accounts
      SET current_balance = 1000.00,
          initial_balance = 1000.00,
          reserved_balance = 0,
          is_active = true,
          updated_at = NOW()
      WHERE id = $1
    `, [accountId])

    console.log('✓ Reset balance to $1,000.00')
    console.log('✓ Activated account')

    // Close any open positions
    const posResult = await client.query(`
      UPDATE stuntman_positions
      SET status = 'closed',
          closed_at = NOW()
      WHERE account_id = $1 AND status = 'open'
      RETURNING id
    `, [accountId])

    console.log(`✓ Closed ${posResult.rowCount} open position(s)`)

    // Cancel pending orders
    const orderResult = await client.query(`
      UPDATE stuntman_orders
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE account_id = $1 AND status = 'pending'
      RETURNING id
    `, [accountId])

    console.log(`✓ Cancelled ${orderResult.rowCount} pending order(s)`)

    // Verify the reset
    const verifyResult = await client.query(`
      SELECT name, current_balance, initial_balance, is_active
      FROM stuntman_accounts
      WHERE id = $1
    `, [accountId])

    const acc = verifyResult.rows[0]
    console.log('')
    console.log('═'.repeat(60))
    console.log('ACCOUNT STATUS')
    console.log('═'.repeat(60))
    console.log(`  Name: ${acc.name}`)
    console.log(`  Balance: $${parseFloat(acc.current_balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`)
    console.log(`  Status: ${acc.is_active ? '🟢 Active' : '🔴 Inactive'}`)
    console.log('')
    console.log('✓ Paper account reset complete!')
    console.log('═'.repeat(60))

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

resetAccount().catch(console.error)
