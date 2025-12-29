import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// DedSec / Watch Dogs hacker aesthetic prompts - NO SPACE/COSMIC THEMES
const CINEMATIC_PROMPTS = {
  intro: `First-person POV hacking breach sequence. Camera moves through layers of encrypted network infrastructure.

Visual elements in sequence:
- Dark terminal screens with scrolling green code and system logs
- Network topology maps with glowing node connections and packet traces
- Firewall breach visualization with intrusion alerts flashing red
- Data streams of encrypted blocks being decrypted in real-time
- Process trees and system monitors with realistic timestamps
- Multi-layer HUD overlays with security status panels
- Neon wireframe grids dissolving into holographic interfaces
- Glitch distortion effects and chromatic aberration
- Final reveal: stylized skull logo (DedSec-inspired) constructed from code fragments

Style: DedSec/Watch Dogs hacker aesthetic. Dark background with neon cyan, orange, red accents.
NO space, planets, stars, cosmic, or sci-fi alien themes. NO cartoon elements.
Professional cinematic quality. High-end movie production. Multi-plane parallax layering.`,

  breach: `Network intrusion visualization. First-person camera breaching through firewalls and security layers.
Encrypted data packets flowing through network nodes. System logs scrolling with timestamps.
Intrusion detection alerts flashing. Security protocols being bypassed one by one.
DedSec hacker aesthetic with neon wireframes and glitch effects.
Dark background, cyan and orange neon accents. NO space or cosmic themes.
Professional cybersecurity thriller cinematography.`,

  dedsec: `DedSec-style hacker operating system boot sequence.
Terminal initialization with scrolling system logs and process trees.
Network graph visualization with glowing connections and packet traces.
Multi-layer HUD overlays with security status panels.
Stylized skull logo constructed from code fragments and data streams.
Dark, technical, professional. Neon cyan and orange accents.
NO space, planets, cosmic, or cartoon elements. Grounded hacker aesthetic only.`
}

export async function POST(request: NextRequest) {
  try {
    const { promptType = 'intro', customPrompt } = await request.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API not configured' },
        { status: 500 }
      )
    }

    const prompt = customPrompt || CINEMATIC_PROMPTS[promptType as keyof typeof CINEMATIC_PROMPTS] || CINEMATIC_PROMPTS.intro

    console.log('[Video Generation] Starting with prompt:', prompt.substring(0, 100) + '...')

    // Use minimax/video-01 for high-quality cinematic output
    const output = await replicate.run(
      'minimax/video-01',
      {
        input: {
          prompt,
          prompt_optimizer: true, // Let AI optimize the prompt for better results
        }
      }
    )

    console.log('[Video Generation] Complete:', output)

    return NextResponse.json({
      success: true,
      videoUrl: output,
      prompt: prompt.substring(0, 200) + '...'
    })

  } catch (error) {
    console.error('[Video Generation] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Video generation failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check status or get pre-generated video
export async function GET() {
  return NextResponse.json({
    available: !!process.env.REPLICATE_API_TOKEN,
    prompts: Object.keys(CINEMATIC_PROMPTS),
    model: 'minimax/video-01',
    costPerVideo: '$0.50'
  })
}
