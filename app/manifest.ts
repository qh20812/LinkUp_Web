import type { MetadataRoute } from 'next'

// Served automatically as /manifest.webmanifest. Covers the Chromium
// installability checklist: name, icons (192 + 512), theme/background
// colors, start_url, display mode. See DESIGN.md (brand tokens).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LinkUp',
    short_name: 'LinkUp',
    description: 'Ứng dụng kết nối và trò chuyện trực tuyến',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#12A5A1',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
