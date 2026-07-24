import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  dbRosterSource,
  getNextGame,
  getPostseasonGames,
  getRosterLeaders,
} from '@/lib/roster-source.db';
import TeamStatsView from '@/components/TeamStatsView';

type Params = { params: Promise<{ id: string }> };

// Cache Components: staleness/revalidation lives on the `'use cache'` functions in
// lib/roster-source.db.ts (cacheLife('ingest')) — see that file and next.config.ts.

// Prerender one static page per team, same shape as app/team/[id]/page.tsx.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const page = await dbRosterSource.getTeamStats(id);
  if (!page) {
    return { title: 'Team not found · Depth' };
  }
  const fullName = `${page.team.city} ${page.team.name}`;
  return {
    title: `${fullName} Stats · Depth`,
    description: `Season record and coaching staff for the ${fullName}.`,
    alternates: { canonical: `/team/${id}/stats` },
  };
}

export default async function TeamStatsPage({ params }: Params) {
  const { id } = await params;
  // Team metadata for all 32 (for the header's switcher) is lightweight — no player
  // data — same rationale as app/team/[id]/page.tsx's `teams` fetch.
  const [page, teams, nextGame] = await Promise.all([
    dbRosterSource.getTeamStats(id),
    dbRosterSource.listTeams(),
    getNextGame(id),
  ]);
  if (!page) {
    notFound();
  }

  // One leaders fetch per season tab (seasons is small — current + up to two prior
  // years, invariant 5) so the season switcher can show each season's own leaders
  // instead of always the roster's newest.
  const leadersBySeason = await Promise.all(
    page.seasons.map((s) => getRosterLeaders(id, s.season))
  );

  // Postseason games for the most recent completed/reported season only (seasons[0] —
  // newest-first per TeamStatsPage's doc comment), not re-derived per season tab like
  // leaders — [] for a team that missed the postseason renders no section.
  const postseasonGames = page.seasons[0]
    ? await getPostseasonGames(id, page.seasons[0].season)
    : [];

  return (
    <TeamStatsView
      team={page.team}
      teams={teams}
      seasons={page.seasons}
      incomingCoach={page.incomingCoach}
      upcomingSeason={page.upcomingSeason}
      currentSeason={page.currentSeason}
      leadersBySeason={leadersBySeason}
      nextGame={nextGame}
      postseasonGames={postseasonGames}
    />
  );
}
