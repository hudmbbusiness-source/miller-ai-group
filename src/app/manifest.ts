import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Miller AI Group',
    short_name: 'Miller AI',
    description: 'Your personal hub for career planning, notes, goals, and more.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f59e0b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['productivity', 'business', 'lifestyle'],
    screenshots: [],
    shortcuts: [
      {
        name: 'Notes',
        short_name: 'Notes',
        url: '/app/notes',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Goals',
        short_name: 'Goals',
        url: '/app/goals',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
