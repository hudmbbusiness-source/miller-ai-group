import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'

/**
 * Get real Crypto.com Exchange balance
 * GET /api/stuntman/balance
 * REQUIRES AUTHENTICATION
 */
export async function GET() {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Login required',
        balances: [],
        totalUSD: 0,
      }, { status: 401 })
    }

    const client = createCryptoComClient()

    if (!client.canAuthenticate()) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
        balances: [],
        totalUSD: 0,
      })
    }

    const balances = await client.getAccountBalance()

    // Parse the balance data
    interface PositionBalance {
      instrument_name: string
      quantity: string
      market_value: string
      collateral_amount: string
    }

    interface BalanceData {
      position_balances?: PositionBalance[]
      total_available_balance?: string
      total_margin_balance?: string
    }

    // The API returns nested data structure
    const balanceData = balances[0] as unknown as BalanceData
    const positionBalances = balanceData?.position_balances || []

    // Format balances for display
    const formattedBalances = positionBalances.map((b: PositionBalance) => ({
      currency: b.instrument_name,
      quantity: parseFloat(b.quantity),
      valueUSD: parseFloat(b.market_value),
    })).filter((b: { quantity: number }) => b.quantity > 0)

    // Calculate total
    const totalUSD = formattedBalances.reduce((sum: number, b: { valueUSD: number }) => sum + b.valueUSD, 0)

    return NextResponse.json({
      success: true,
      balances: formattedBalances,
      totalUSD,
      totalAvailable: parseFloat(balanceData?.total_available_balance || '0'),
      totalMargin: parseFloat(balanceData?.total_margin_balance || '0'),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      balances: [],
      totalUSD: 0,
    }, { status: 500 })
  }
}
