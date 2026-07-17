import { NextResponse } from 'next/server';
import { getPlayerStats } from '@/lib/roster-source.db';

// Backs the PlayerCard's lazy "LAST SEASONS" fetch (nflverse ingestion,
// docs/superpowers/specs/2026-07-07-nflverse-ingestion-and-player-stats-design.md).
// Returns an object, not a bare array, on purpose: contracts and draft-boards specs
// later add `contract`/`draft` keys to this same payload without a breaking change.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const stats = await getPlayerStats(id);
    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ stats: [] }, { status: 500 });
  }
}
