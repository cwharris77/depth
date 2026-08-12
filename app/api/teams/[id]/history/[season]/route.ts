import { NextResponse } from 'next/server';
import { getTeamSeason } from '@/lib/roster-source.db';
import { SEASONS_MIN } from '@/lib/nflverse/roster-history';

// Backs SeasonSheet's read-only past-season view (Phase D1, docs/superpowers/specs/
// 2026-07-07-phase-d-history-and-boards-design.md). 404s for an unknown team, a
// malformed/out-of-range season, or a season with no ingested roster (never a guess,
// AGENTS.md invariant 6).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; season: string }> }
) {
  const { id, season: seasonParam } = await params;
  const season = Number(seasonParam);
  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'invalid team' }, { status: 404 });
  }
  if (!Number.isInteger(season) || season < SEASONS_MIN) {
    return NextResponse.json({ error: 'invalid season' }, { status: 404 });
  }

  let roster;
  try {
    roster = await getTeamSeason(id, season);
  } catch {
    return NextResponse.json({ error: 'read failed' }, { status: 500 });
  }
  if (!roster) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ roster });
}
