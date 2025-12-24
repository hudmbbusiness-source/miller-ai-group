import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kachow.app'),
  title: 'Miller AI Group | Hudson Barnes',
  description: 'An entrepreneurial landing pad and hub for innovative technology ventures by Hudson Barnes.',
  keywords: ['AI', 'technology', 'automation', 'Hudson Barnes', 'Miller AI Group'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/logos/miller-ai-group.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Miller AI',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Miller AI Group | Hudson Barnes',
    description: 'An entrepreneurial landing pad and hub for innovative technology ventures by Hudson Barnes.',
    url: 'https://miller-ai-group.vercel.app',
    siteName: 'Miller AI Group',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Miller AI Group',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miller AI Group | Hudson Barnes',
    description: 'An entrepreneurial landing pad and hub for innovative technology ventures by Hudson Barnes.',
    images: ['/og-image.png'],
  },
}

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Miller AI Group',
  url: 'https://kachow.app',
  logo: 'https://kachow.app/logos/miller-ai-group.png',
  founder: {
    '@type': 'Person',
    name: 'Hudson Barnes',
    jobTitle: 'Founder & AI Engineer',
  },
  description: 'An entrepreneurial landing pad and hub for innovative technology ventures by Hudson Barnes.',
  sameAs: [
    'https://github.com/hudsonmp',
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Miller AI Group',
  url: 'https://kachow.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://kachow.app/projects?search={search_term_string}',
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
        <meta name="apple-mobile-web-app-title" content="Miller AI" />
        {/* Use PNG for iOS - SVG not supported for apple-touch-icon */}
        <link rel="apple-touch-icon" href="/logos/miller-ai-group.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/miller-ai-group.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logos/miller-ai-group.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/logos/miller-ai-group.png" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Splash screens for iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
