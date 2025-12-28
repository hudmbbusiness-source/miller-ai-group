import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

// Terminal/hacker font
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kachow.app'),
  title: 'Kachow AI | Free AI Assistant for Content Creators',
  description: 'Get free lifetime access to Kachow AI - the next-generation AI assistant for content creators. AI-powered scripts, captions, hashtags, and content ideas. Sign up now with early access code.',
  keywords: ['Kachow AI', 'AI assistant', 'content creator AI', 'free AI tool', 'AI content generator', 'social media AI', 'YouTube AI', 'TikTok AI', 'Instagram AI', 'AI scripts', 'AI captions', 'content ideas', 'viral content', 'AI for creators'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/logos/kachow.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/logos/kachow.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kachow AI',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Kachow AI | Free AI Assistant for Content Creators',
    description: 'Get free lifetime access to Kachow AI - the next-generation AI assistant for content creators. AI-powered scripts, captions, hashtags, and content ideas.',
    url: 'https://kachow.app',
    siteName: 'Kachow AI',
    images: [
      {
        url: '/logos/kachow.png',
        width: 512,
        height: 512,
        alt: 'Kachow AI - Free AI for Content Creators',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kachow AI | Free AI for Content Creators',
    description: 'Get free lifetime access to Kachow AI - AI-powered scripts, captions, hashtags, and content ideas for creators.',
    images: ['/logos/kachow.png'],
  },
}

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kachow AI',
  url: 'https://kachow.app',
  logo: 'https://kachow.app/logos/kachow.png',
  applicationCategory: 'Productivity',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free lifetime access for early adopters',
  },
  author: {
    '@type': 'Organization',
    name: 'Miller AI Group',
    founder: {
      '@type': 'Person',
      name: 'Hudson Barnes',
    },
  },
  description: 'Free AI assistant for content creators - generate scripts, captions, hashtags, and viral content ideas.',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '1',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Kachow AI',
  url: 'https://kachow.app',
  description: 'Free AI assistant for content creators',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://kachow.app/?search={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* PWA iOS specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kachow AI" />
        {/* Use PNG for iOS - SVG not supported for apple-touch-icon */}
        <link rel="apple-touch-icon" href="/logos/kachow.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/kachow.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logos/kachow.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/logos/kachow.png" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Splash screens for iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
