import { NextRequest, NextResponse } from 'next/server';
import { searchAllPlayers } from '@/lib/roster-source.db';

// Backs the nav's player-search mode: searches every ingested team's players, not
// just the one roster the client already has (dbRosterSource only ever ships one
// team to the browser, by design — see app/team/[id]/page.tsx).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const results = await searchAllPlayers(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
