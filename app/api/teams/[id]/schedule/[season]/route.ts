import { NextResponse } from 'next/server';
import { getTeamSchedule } from '@/lib/roster-source.db';
import { SEASONS_MIN } from '@/lib/nflverse/roster-history';

// Backs the schedule page's SeasonSheet past-season view (docs/superpowers/specs/
// 2026-08-10-past-season-schedule-view-design.md). 404s for an unknown team, a
// malformed/out-of-range season, or a season with no ingested games (never a guess,
// AGENTS.md invariant 6).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; season: string }> }
) {
  const { id, season: seasonParam } = await params;
  const season = Number(seasonParam);
  if (!Number.isInteger(season) || season < SEASONS_MIN) {
    return NextResponse.json({ error: 'invalid season' }, { status: 404 });
  }

  const schedule = await getTeamSchedule(id, season);
  if (!schedule) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ schedule });
}
