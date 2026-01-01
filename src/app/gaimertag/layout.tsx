import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'gAImertag | Kids Game Platform',
  description: 'Play awesome games, unlock characters, complete quests, and level up! A world-class gaming platform designed for kids.',
  keywords: ['games', 'kids games', 'endless runner', 'arcade games', 'mobile games', 'free games'],
  authors: [{ name: 'Kachow' }],
  creator: 'Kachow',
  publisher: 'Kachow',
  robots: 'index, follow',
  openGraph: {
    title: 'gAImertag | Kids Game Platform',
    description: 'Play awesome games, unlock characters, complete quests, and level up!',
    url: 'https://kachow.app/gaimertag',
    siteName: 'gAImertag',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'gAImertag | Kids Game Platform',
    description: 'Play awesome games, unlock characters, complete quests, and level up!',
  },
  manifest: '/gaimertag/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'gAImertag',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0f1a',
}

export default function GaimertagLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
