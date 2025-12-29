#!/usr/bin/env node

/**
 * Pre-generate the cinematic intro video using Replicate
 * Run: node scripts/generate-cinematic.js
 * Cost: ~$0.50 per video
 */

const Replicate = require('replicate')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// DEDSEC HACKER OS STYLE - NO TEXT (text added via code overlay)
const CINEMATIC_PROMPT = `Cinematic hacker-style intro video background. DedSec-inspired aesthetic.

NO TEXT OR LOGOS IN THE VIDEO. This is a background animation only.

VISUALS:
- Dark, neon-edged, technical hacker aesthetic
- Modern cyberpunk hacker OS boot sequence
- Vertical neon data streams in cyan and magenta
- Encrypted packet visualizations
- Network graph animations forming in layers
- HUD overlays sliding into frame
- Glitch effects and digital distortion
- Multi-layer holographic UI elements
- Terminal feeds with scrolling code
- Intrusion alert visualizations
- Packet trace animations
- Process tree diagrams
- Encryption HUD displays
- Camera pushes through layers of data
- Depth-of-field and parallax motion
- Glitch particle explosions

STYLE: Watch Dogs / Mr Robot aesthetic. Dark neon. Cyan and magenta accents on black. Professional VFX quality. Cinematic camera movement. NOT sci-fi space. NOT cartoonish. NOT childish. Serious hacker atmosphere. High-budget movie quality.

FORBIDDEN: No space, planets, stars, galaxies, aliens. No cartoons. No text or logos. No bright cheerful colors.`

async function generateVideo() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Error: REPLICATE_API_TOKEN not found in .env.local')
    process.exit(1)
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  })

  console.log('🎬 Starting cinematic video generation...')
  console.log('📝 Prompt:', CINEMATIC_PROMPT.substring(0, 100) + '...')
  console.log('💰 Estimated cost: ~$1-2 (using Minimax)')
  console.log('')
  console.log('⏳ This may take 2-5 minutes...')
  console.log('')

  const startTime = Date.now()

  try {
    // Create a prediction using Minimax video-01 (best quality)
    let prediction = await replicate.predictions.create({
      model: 'minimax/video-01',
      input: {
        prompt: CINEMATIC_PROMPT,
        prompt_optimizer: true,
      }
    })

    console.log('📡 Prediction created:', prediction.id)
    console.log('⏳ Waiting for video to generate...')

    // Poll for completion
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      prediction = await replicate.predictions.get(prediction.id)
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      console.log(`   Status: ${prediction.status} (${elapsed}s elapsed)`)
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Video generation failed')
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.log('')
    console.log(`✅ Video generated in ${elapsed} seconds!`)
    console.log('')

    // The output should be a URL
    const videoUrl = prediction.output
    console.log('🎥 Video URL:')
    console.log(videoUrl)
    console.log('')

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.log('Raw output:', JSON.stringify(prediction.output, null, 2))
      throw new Error('Invalid video URL returned')
    }

    // Save to a config file
    const configPath = path.join(__dirname, '..', 'public', 'cinematic-config.json')
    const config = {
      videoUrl: videoUrl,
      generatedAt: new Date().toISOString(),
      predictionId: prediction.id,
      prompt: CINEMATIC_PROMPT,
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('📁 Config saved to: public/cinematic-config.json')
    console.log('')
    console.log('🚀 The cinematic intro will now use this pre-generated video!')

  } catch (error) {
    console.error('')
    console.error('❌ Error generating video:', error.message)
    console.error('')
    console.error('Full error:', error)
    process.exit(1)
  }
}

generateVideo()
