import type { MetadataRoute } from 'next';
import { colors } from '@/components/ui/tokens';

// Web app manifest for the mobile-first app: when added to a home screen it launches
// standalone (no browser chrome) with the dark brand colors, matching the theme-color
// set in the root layout's viewport. Icon reuses the SVG served from app/icon.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Depth · NFL Depth Charts',
    short_name: 'Depth',
    description:
      'Interactive, mobile-first NFL depth charts. Pick a team and explore the roster on the field.',
    start_url: '/',
    display: 'standalone',
    background_color: colors.bg,
    theme_color: colors.bg,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
