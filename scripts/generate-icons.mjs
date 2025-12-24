import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const svgPath = join(rootDir, 'public', 'logos', 'miller-ai-group.svg')
const svgBuffer = readFileSync(svgPath)

// Create icons directory if it doesn't exist
const iconsDir = join(rootDir, 'public', 'icons')
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

async function generateIcons() {
  for (const { name, size } of sizes) {
    const outputPath = join(iconsDir, name)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`Generated ${name} (${size}x${size})`)
  }

  // Also create a copy in logos directory for the apple-touch-icon reference
  const logosPngPath = join(rootDir, 'public', 'logos', 'miller-ai-group.png')
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(logosPngPath)
  console.log('Generated logos/miller-ai-group.png (180x180)')
}

generateIcons()
  .then(() => console.log('All icons generated successfully!'))
  .catch(err => console.error('Error generating icons:', err))
