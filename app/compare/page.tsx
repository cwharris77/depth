import CompareTable from '@/components/CompareTable';
import TeamCompareTable from '@/components/TeamCompareTable';
import { parseCompareParams } from '@/lib/compare';
import { getPlayersByPosition } from '@/lib/roster';
import { dbRosterSource } from '@/lib/roster-source.db';
import type { Metadata } from 'next';

type Params = {
  searchParams: Promise<{ a?: string; b?: string; pos?: string }>;
};

// Bookmarkable/shareable comparisons via query params rather than a dynamic route
// segment (32x32x19 combinations is silly to prerender) — Decisions table "Route".
// Params drive all the content, so this page is never statically generated. Under
// Cache Components (next.config.ts), reading `searchParams` below already makes this a
// dynamic hole with no segment config needed — `force-dynamic` is a build error here.
export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const teams = await dbRosterSource.listTeams();
  const raw = await searchParams;
  const { a, b, pos } = parseCompareParams(
    raw,
    teams.map((t) => t.id)
  );
  const teamA = teams.find((t) => t.id === a);
  const teamB = teams.find((t) => t.id === b);
  if (!teamA || !teamB) {
    return { title: 'Compare teams · Depth' };
  }
  return {
    title: raw.pos
      ? `${teamA.abbrev} vs ${teamB.abbrev} — ${pos} depth · Depth`
      : `${teamA.abbrev} vs ${teamB.abbrev} matchup · Depth`,
    description: raw.pos
      ? `Side-by-side ${pos} depth chart comparison: ${teamA.city} ${teamA.name} vs ${teamB.city} ${teamB.name}.`
      : `Team matchup comparison: ${teamA.city} ${teamA.name} vs ${teamB.city} ${teamB.name}.`,
    alternates: { canonical: '/compare' },
  };
}

// Server component: resolves both full rosters (same "server resolves, client
// receives" rule as /team/[id]) but hands the client only the two position groups +
// team metas, never a whole roster — Decisions table "Rendering".
export default async function ComparePage({ searchParams }: Params) {
  const teams = await dbRosterSource.listTeams();
  const raw = await searchParams;
  const { a, b, pos } = parseCompareParams(
    raw,
    teams.map((t) => t.id)
  );

  if (!raw.pos) {
    const [statsA, statsB] = await Promise.all([
      a ? dbRosterSource.getTeamStats(a) : Promise.resolve(undefined),
      b ? dbRosterSource.getTeamStats(b) : Promise.resolve(undefined),
    ]);
    return (
      <TeamCompareTable
        teams={teams}
        a={statsA ? { team: statsA.team, stats: statsA.seasons[0] } : undefined}
        b={statsB ? { team: statsB.team, stats: statsB.seasons[0] } : undefined}
      />
    );
  }

  const [rosterA, rosterB] = await Promise.all([
    a ? dbRosterSource.getTeam(a) : Promise.resolve(undefined),
    b ? dbRosterSource.getTeam(b) : Promise.resolve(undefined),
  ]);

  const sideA = rosterA
    ? { team: rosterA.team, players: getPlayersByPosition(rosterA, pos) }
    : undefined;
  const sideB = rosterB
    ? { team: rosterB.team, players: getPlayersByPosition(rosterB, pos) }
    : undefined;

  return <CompareTable teams={teams} a={sideA} b={sideB} position={pos} />;
}
