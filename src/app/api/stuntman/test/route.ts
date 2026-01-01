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

    // Debug: Try multiple signature variations
    let rawTestResult: { success: boolean; response?: unknown; error?: string; debug?: unknown; variations?: unknown[] } = { success: false }
    if (hasApiKey && hasApiSecret) {
      const apiKey = process.env.STUNTMAN_CRYPTO_API_KEY!.trim()
      const apiSecret = process.env.STUNTMAN_CRYPTO_SECRET!.trim()
      const method = 'private/user-balance'
      const url = `https://api.crypto.com/exchange/v1/${method}`

      const variations: unknown[] = []

      // Try variation 1: Standard format (current)
      try {
        const requestId = Date.now()
        const nonce = requestId
        const sigPayload = `${method}${requestId}${apiKey}${nonce}`
        const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex')

        const body = { id: requestId, method, api_key: apiKey, params: {}, sig: signature, nonce }
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await response.json()
        variations.push({ name: 'standard', code: data.code, message: data.message, sigPayload: sigPayload.substring(0, 60) + '...' })
        if (data.code === 0) {
          rawTestResult = { success: true, response: data }
        }
      } catch (e) {
        variations.push({ name: 'standard', error: e instanceof Error ? e.message : 'unknown' })
      }

      // Try variation 2: Without params in body
      try {
        const requestId = Date.now() + 1
        const nonce = requestId
        const sigPayload = `${method}${requestId}${apiKey}${nonce}`
        const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex')

        const body = { id: requestId, method, api_key: apiKey, sig: signature, nonce }
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await response.json()
        variations.push({ name: 'no_params', code: data.code, message: data.message })
        if (data.code === 0) {
          rawTestResult = { success: true, response: data }
        }
      } catch (e) {
        variations.push({ name: 'no_params', error: e instanceof Error ? e.message : 'unknown' })
      }

      // Try variation 3: Different nonce (separate from id)
      try {
        const requestId = Date.now() + 2
        const nonce = Date.now() + 2
        const sigPayload = `${method}${requestId}${apiKey}${nonce}`
        const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex')

        const body = { id: requestId, method, api_key: apiKey, params: {}, sig: signature, nonce }
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await response.json()
        variations.push({ name: 'separate_nonce', code: data.code, message: data.message })
        if (data.code === 0) {
          rawTestResult = { success: true, response: data }
        }
      } catch (e) {
        variations.push({ name: 'separate_nonce', error: e instanceof Error ? e.message : 'unknown' })
      }

      // Try variation 4: Try get-account-summary (old method name)
      try {
        const altMethod = 'private/get-account-summary'
        const altUrl = `https://api.crypto.com/exchange/v1/${altMethod}`
        const requestId = Date.now() + 3
        const nonce = requestId
        const sigPayload = `${altMethod}${requestId}${apiKey}${nonce}`
        const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex')

        const body = { id: requestId, method: altMethod, api_key: apiKey, params: {}, sig: signature, nonce }
        const response = await fetch(altUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await response.json()
        variations.push({ name: 'alt_method', code: data.code, message: data.message })
        if (data.code === 0) {
          rawTestResult = { success: true, response: data }
        }
      } catch (e) {
        variations.push({ name: 'alt_method', error: e instanceof Error ? e.message : 'unknown' })
      }

      rawTestResult.variations = variations
      rawTestResult.debug = {
        apiKeyLength: apiKey.length,
        apiKeyFirst10: apiKey.substring(0, 10),
        apiKeyLast5: apiKey.substring(apiKey.length - 5),
        apiSecretLength: apiSecret.length,
        apiSecretFirst5: apiSecret.substring(0, 5),
        apiSecretLast3: apiSecret.substring(apiSecret.length - 3),
        apiKeyCharCodes: apiKey.split('').slice(0, 5).map(c => c.charCodeAt(0)),
        apiSecretCharCodes: apiSecret.split('').slice(0, 5).map(c => c.charCodeAt(0)),
        note: 'Typical Exchange API secrets are 64+ chars. Current secret is only 22 chars.'
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
        endpoint: 'https://api.crypto.com/exchange/v1/private/user-balance',
        method: 'private/user-balance',
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
