import { NextResponse } from 'next/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'

/**
 * Test endpoint to verify Crypto.com API connection
 * This bypasses Supabase auth for debugging purposes
 *
 * GET /api/stuntman/test - Test connection and fetch real balance
 */
export async function GET() {
  try {
    const client = createCryptoComClient()

    // Check if API credentials are configured
    const hasApiKey = !!process.env.STUNTMAN_CRYPTO_API_KEY
    const hasApiSecret = !!process.env.STUNTMAN_CRYPTO_SECRET
    const canAuthenticate = client.canAuthenticate()

    // Test public API first (doesn't require auth)
    const publicTest = await client.getTicker('BTC_USDT')
    const publicApiWorks = !!publicTest

    let privateApiResult: { success: boolean; balances?: unknown[]; error?: string } = {
      success: false,
      error: 'API secret not configured'
    }

    // Test private API if credentials are available
    if (canAuthenticate) {
      try {
        const balances = await client.getAccountBalance()
        privateApiResult = {
          success: true,
          balances
        }
      } catch (error) {
        privateApiResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      configuration: {
        hasApiKey,
        hasApiSecret,
        canAuthenticate,
        apiKeyPrefix: process.env.STUNTMAN_CRYPTO_API_KEY?.substring(0, 10) + '...',
      },
      publicApi: {
        success: publicApiWorks,
        btcPrice: publicTest?.last_traded_price,
      },
      privateApi: privateApiResult,
      debug: {
        // Show what signature payload would look like (without revealing secret)
        endpoint: 'https://api.crypto.com/exchange/v1/private',
        method: 'private/get-account-summary',
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
