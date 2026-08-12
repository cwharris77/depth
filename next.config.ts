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
      {
        // Historical rosters' headshot_url (Phase D1, roster_history.headshot_url,
        // nflverse's roster_<season>.csv) — every row observed across 1999-2024 uses
        // this same host/path shape (docs/superpowers/specs/2026-07-07-phase-d-history-
        // and-boards-design.md).
        protocol: 'https',
        hostname: 'static.www.nfl.com',
        pathname: '/image/private/**',
      },
    ],
  },
};

const withVercelToolbar = createWithVercelToolbar();
// Use the withVercelToolbar plugin to inject the Vercel Toolbar
export default withVercelToolbar(nextConfig);
