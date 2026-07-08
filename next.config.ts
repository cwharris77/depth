import createWithVercelToolbar from '@vercel/toolbar/plugins/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Not every player has an NFL headshot yet (rookies/deep bench players)
        // — ESPN falls back to their college-football photo at a sibling path
        // (.../headshots/college-football/players/full/...), so this can't be
        // scoped to /headshots/nfl/ alone without crashing next/image on those
        // hits (all-players search, unlike the single-roster PlayerCard, surfaces
        // them often enough to matter).
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/i/headshots/**',
      },
    ],
  },
};

const withVercelToolbar = createWithVercelToolbar();
// Use the withVercelToolbar plugin to inject the Vercel Toolbar
export default withVercelToolbar(nextConfig);
