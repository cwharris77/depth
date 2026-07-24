import createWithVercelToolbar from '@vercel/toolbar/plugins/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components (Next 16): per-function/component caching via `use cache` +
  // cacheLife, replacing route-segment `revalidate`/`dynamic` exports. Adopted to fix
  // /team/[id] being forced fully dynamic by generateMetadata's searchParams read (the
  // `order` param for shared-link OG previews) — under Cache Components that read no
  // longer taints the whole route, only the scope that touches it (docs/superpowers/
  // specs; see vault ticket "Depth field slow to load — general performance pass").
  cacheComponents: true,
  cacheLife: {
    // The weekly ESPN ingest (scripts/ingest-espn.mts, Wed 12:00 UTC) writes straight to
    // Postgres, decoupled from deploys (AGENTS.md invariant 7) — matches the prior
    // `revalidate = 21600` (6h) used across the team/stats/schedule pages. `expire` is
    // new: how long a cache entry survives with zero traffic before the next request
    // has to rebuild synchronously. 30 days comfortably covers an offseason lull between
    // visits to a rarely-viewed team, well past the 6h staleness bound that actually matters.
    ingest: {
      stale: 300, // 5 minutes (client-side), matches the `default` profile
      revalidate: 21600, // 6 hours
      expire: 2592000, // 30 days
    },
  },
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
