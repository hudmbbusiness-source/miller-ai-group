import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Miller AI Group'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
          }}
        />

        {/* Neural network representation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            marginBottom: 40,
            boxShadow: '0 20px 60px rgba(99, 102, 241, 0.4)',
          }}
        >
          <svg width="100" height="100" viewBox="0 0 100 100">
            {/* Center node */}
            <circle cx="50" cy="50" r="10" fill="white" />
            {/* Outer nodes */}
            <circle cx="50" cy="15" r="6" fill="white" opacity="0.9" />
            <circle cx="80" cy="32" r="6" fill="white" opacity="0.9" />
            <circle cx="80" cy="68" r="6" fill="white" opacity="0.9" />
            <circle cx="50" cy="85" r="6" fill="white" opacity="0.9" />
            <circle cx="20" cy="68" r="6" fill="white" opacity="0.9" />
            <circle cx="20" cy="32" r="6" fill="white" opacity="0.9" />
            {/* Connection lines */}
            <line x1="50" y1="40" x2="50" y2="21" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="58" y1="45" x2="74" y2="35" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="58" y1="55" x2="74" y2="65" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="50" y1="60" x2="50" y2="79" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="42" y1="55" x2="26" y2="65" stroke="white" strokeWidth="2" opacity="0.7" />
            <line x1="42" y1="45" x2="26" y2="35" stroke="white" strokeWidth="2" opacity="0.7" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Miller AI Group
          </h1>
          <p
            style={{
              fontSize: 28,
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '16px 0 0 0',
            }}
          >
            Building the Future with AI
          </p>
        </div>

        {/* Founder */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
          <p
            style={{
              fontSize: 20,
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0,
            }}
          >
            Founded by Hudson Barnes
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
