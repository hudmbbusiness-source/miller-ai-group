// Market Intelligence API - Real-time news, sentiment, and trading filters
// Uses LangSearch to provide institutional-grade market awareness

import { NextRequest, NextResponse } from 'next/server'
import {
  getMarketIntelligence,
  quickTradingCheck,
  formatMarketIntelligence,
  MarketIntelligence
} from '@/lib/stuntman/market-intelligence'

// GET - Fetch market intelligence
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'full' // 'full' | 'quick'
    const instrument = searchParams.get('instrument') || 'ES NQ S&P 500 Nasdaq futures'

    if (mode === 'quick') {
      // Quick trading check - faster, less data
      const check = await quickTradingCheck()
      return NextResponse.json({
        success: true,
        mode: 'quick',
        canTrade: check.canTrade,
        riskLevel: check.riskLevel,
        reason: check.reason,
        timestamp: new Date().toISOString()
      })
    }

    // Full market intelligence
    const intel = await getMarketIntelligence(instrument)

    // Log the formatted report
    console.log(formatMarketIntelligence(intel))

    return NextResponse.json({
      success: true,
      mode: 'full',
      data: intel
    })
  } catch (error) {
    console.error('Market intelligence error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market intelligence'
      },
      { status: 500 }
    )
  }
}

// POST - Analyze specific market query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, instrument = 'ES NQ futures' } = body

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    // Get intelligence with custom query focus
    const intel = await getMarketIntelligence(`${instrument} ${query}`)

    return NextResponse.json({
      success: true,
      query,
      data: intel
    })
  } catch (error) {
    console.error('Market intelligence POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      { status: 500 }
    )
  }
}
