import { NextResponse } from 'next/server'
import { createCryptoComClient } from '@/lib/crypto/crypto-com'
import crypto from 'crypto'

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

    let privateApiResult: { success: boolean; balances?: unknown[]; error?: string; rawResponse?: unknown } = {
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

    // Debug: Make a raw request to see exactly what's happening
    let rawTestResult: { success: boolean; response?: unknown; error?: string } = { success: false }
    if (hasApiKey && hasApiSecret) {
      try {
        const apiKey = process.env.STUNTMAN_CRYPTO_API_KEY!
        const apiSecret = process.env.STUNTMAN_CRYPTO_SECRET!
        const method = 'private/get-account-summary'
        const requestId = Date.now()
        const nonce = Date.now()
        const params = {}

        // Build signature exactly as Crypto.com expects
        const sigPayload = `${method}${requestId}${apiKey}${nonce}`
        const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex')

        const body = {
          id: requestId,
          method,
          api_key: apiKey,
          params,
          sig: signature,
          nonce,
        }

        const response = await fetch('https://api.crypto.com/exchange/v1/private', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        const data = await response.json()
        rawTestResult = {
          success: data.code === 0,
          response: data
        }
      } catch (error) {
        rawTestResult = {
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
      rawTest: rawTestResult,
      debug: {
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
