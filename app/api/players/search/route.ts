import { NextRequest, NextResponse } from 'next/server';
import { createSlidingWindowLimiter } from '@/lib/rate-limit';
import { searchAllPlayers } from '@/lib/roster-source.db';
import { normalizePlayerSearchQuery } from '@/lib/search';

// Backs the nav's player-search mode: searches every ingested team's players, not
// just the one roster the client already has (dbRosterSource only ever ships one
// team to the browser, by design — see app/team/[id]/page.tsx).
//
// Server-side gate for a public, unauthenticated route: the client debounce
// (lib/use-player-search.ts) and searchAllPlayers' result cache stop repeated queries,
// but a burst of distinct queries would still reach Postgres (up to four ILIKEs each),
// and bad input must be rejected before any DB work. This route (a) caps hits per
// client IP with a sliding window and (b) normalizes + validates the query — rejecting
// empty/whitespace-only/overlong input with 400. Window is 60s at 180 hits (~3/sec
// sustained): a human typist with the 200ms client debounce never gets there, but a
// scripted burst is stopped cold.
const searchLimiter = createSlidingWindowLimiter({ windowMs: 60_000, max: 180 });

// Exported for the route test to reset the window between cases (search-route.test.ts).
export const searchRateLimiter = searchLimiter;

export async function GET(request: NextRequest) {
  // Vercel fills x-forwarded-for with the client's address; the first entry is the
  // origin, later ones are proxy hops. Absent the header every client shares the
  // 'unknown' bucket — a conservative shared cap, not an open door.
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!searchLimiter.allow(`player-search:${clientIp}`)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  const q = normalizePlayerSearchQuery(request.nextUrl.searchParams.get('q') ?? '');
  if (q === null) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  try {
    const results = await searchAllPlayers(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
