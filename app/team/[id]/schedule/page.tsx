import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbRosterSource, getTeamSchedule } from '@/lib/roster-source.db';
import { getNflSeasonState } from '@/lib/utils/team/nfl-season';
import { SEASONS_MIN } from '@/lib/nflverse/roster-history';
import TeamScheduleView from '@/components/TeamScheduleView';

type Params = { params: Promise<{ id: string }> };

// Cache Components: staleness/revalidation lives on the `'use cache'` functions in
// lib/roster-source.db.ts (cacheLife('ingest')) — see that file and next.config.ts.

// Prerender one static page per team, same shape as app/team/[id]/stats/page.tsx.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const team = (await dbRosterSource.listTeams()).find((t) => t.id === id);
  if (!team) {
    return { title: 'Team not found · Depth' };
  }
  const fullName = `${team.city} ${team.name}`;
  return {
    title: `${fullName} Schedule · Depth`,
    description: `Regular-season schedule and results for the ${fullName}.`,
    alternates: { canonical: `/team/${id}/schedule` },
  };
}

export default async function TeamSchedulePage({ params }: Params) {
  const { id } = await params;
  // Team metadata for all 32 (for the header's switcher) is lightweight — no player
  // data — same rationale as app/team/[id]/stats/page.tsx's `teams` fetch. An unknown id
  // isn't in that list → 404, matching the other team routes. `schedule` can be null even
  // for a real team (no games ingested yet); the view degrades to an empty state.
  const [teams, schedule, { isOffseason, upcomingSeason }] = await Promise.all([
    dbRosterSource.listTeams(),
    getTeamSchedule(id),
    getNflSeasonState(),
  ]);
  const team = teams.find((t) => t.id === id);
  if (!team) {
    notFound();
  }

  // During the off-season, the schedule page shows the upcoming season's games — mark
  // it so the view can show an "Upcoming" badge (Stats & Analytics P2).
  const isUpcoming = isOffseason && schedule !== null && schedule.season === upcomingSeason;

  // The season picker's "current" row — the season the default view shows (the latest
  // season present for the team; during the off-season that's the upcoming, already-
  // scheduled season, which is what schedule.season is), falling back to the league's
  // current season when there's no schedule yet. Distinct from the roster page's
  // currentSeason definition on purpose: the picker must agree with what this page
  // renders by default, not with which roster is live
  // (docs/superpowers/specs/2026-08-10-past-season-schedule-view-design.md).
  const currentSeason = schedule?.season ?? (isOffseason ? upcomingSeason : upcomingSeason - 1);

  return (
    <TeamScheduleView
      team={team}
      teams={teams}
      schedule={schedule}
      isUpcoming={isUpcoming}
      currentSeason={currentSeason}
      minSeason={SEASONS_MIN}
    />
  );
}
