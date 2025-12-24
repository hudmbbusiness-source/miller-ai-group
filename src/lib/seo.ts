import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kachow.app'

/**
 * Base SEO configuration
 */
export const baseSeo: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Miller AI Group | Hudson Barnes',
    template: '%s | Miller AI Group',
  },
  description: 'Entrepreneurial hub for Hudson Barnes\' technology ventures. Exploring the intersection of AI, innovation, and entrepreneurship.',
  keywords: ['Hudson Barnes', 'Miller AI Group', 'AI', 'Technology', 'Entrepreneurship', 'Startups'],
  authors: [{ name: 'Hudson Barnes' }],
  creator: 'Hudson Barnes',
  publisher: 'Miller AI Group',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Miller AI Group',
    title: 'Miller AI Group | Hudson Barnes',
    description: 'Entrepreneurial hub for Hudson Barnes\' technology ventures.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miller AI Group | Hudson Barnes',
    description: 'Entrepreneurial hub for Hudson Barnes\' technology ventures.',
  },
  verification: {
    // Add verification codes when available
    // google: 'google-verification-code',
  },
}

/**
 * Generate metadata for specific pages
 */
export function generatePageMetadata(options: {
  title: string
  description: string
  path?: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const url = options.path ? `${siteUrl}${options.path}` : siteUrl

  return {
    title: options.title,
    description: options.description,
    robots: options.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      images: options.image ? [{ url: options.image }] : undefined,
    },
    twitter: {
      title: options.title,
      description: options.description,
      images: options.image ? [options.image] : undefined,
    },
  }
}

/**
 * Page-specific metadata configurations
 */
export const pageMetadata = {
  home: generatePageMetadata({
    title: 'Miller AI Group',
    description: 'Entrepreneurial hub for Hudson Barnes\' technology ventures. Exploring the intersection of AI, innovation, and entrepreneurship.',
    path: '/',
  }),
  resume: generatePageMetadata({
    title: 'Resume',
    description: 'View Hudson Barnes\' professional resume, education, and accomplishments.',
    path: '/resume',
  }),
  projects: generatePageMetadata({
    title: 'Projects',
    description: 'Explore Hudson Barnes\' portfolio of technology ventures and startups.',
    path: '/projects',
  }),
  intro: generatePageMetadata({
    title: 'Welcome',
    description: 'Welcome to Miller AI Group - The entrepreneurial hub of Hudson Barnes.',
    path: '/intro',
    noIndex: true,
  }),
  login: generatePageMetadata({
    title: 'Login',
    description: 'Sign in to the Miller AI Group hub.',
    path: '/login',
    noIndex: true,
  }),
}
