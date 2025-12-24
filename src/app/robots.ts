import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kachow.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',      // Private hub
          '/auth/',     // Auth routes
          '/api/',      // API routes
          '/login',     // Login page
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
