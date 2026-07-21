import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbRosterSource, getTeamSchedule } from '@/lib/roster-source.db';
import { nflSeasonState } from '@/lib/nfl-season';
import TeamScheduleView from '@/components/TeamScheduleView';

type Params = { params: Promise<{ id: string }> };

// ISR: same rationale as app/team/[id]/stats/page.tsx — the nflverse ingest is decoupled
// from deploys (AGENTS.md invariant 7), so this bounds staleness to 6 hours after an
// ingest instead of requiring a redeploy for new scores/schedule to reach users.
export const revalidate = 21600; // 6 hours, in seconds

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
  const [teams, schedule] = await Promise.all([dbRosterSource.listTeams(), getTeamSchedule(id)]);
  const team = teams.find((t) => t.id === id);
  if (!team) {
    notFound();
  }

  // During the off-season, the schedule page shows the upcoming season's games — mark
  // it so the view can show an "Upcoming" badge (Stats & Analytics P2).
  const { isOffseason, upcomingSeason } = nflSeasonState();
  const isUpcoming = isOffseason && schedule !== null && schedule.season === upcomingSeason;

  return (
    <TeamScheduleView
      team={team}
      teams={teams}
      schedule={schedule}
      isUpcoming={isUpcoming}
    />
  );
}
