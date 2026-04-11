import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DroneFly — Drone Weather Dashboard',
    short_name: 'DroneFly',
    description: 'Real-time GO/CAUTION/NO-GO weather assessment for drone operations',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#0a0f1a',
    orientation: 'any',
    categories: ['utilities', 'weather'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
