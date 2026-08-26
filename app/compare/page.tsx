import CompareView from '@/components/CompareView';
import {
  buildComparePath,
  buildCompareTeaser,
  COMPARE_POSITIONS,
  parseCompareParams,
} from '@/lib/utils/compare';
import { getPlayersByPosition } from '@/lib/utils/roster/roster';
import { dbRosterSource } from '@/lib/roster-source.db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Params = {
  searchParams: Promise<{
    a?: string;
    b?: string;
    pos?: string;
    from?: string;
    scheduleTeam?: string;
  }>;
};

// Bookmarkable/shareable comparisons via query params rather than a dynamic route
// segment (32x32x19 combinations is silly to prerender) — Decisions table "Route" in
// the 2026-07-07 compare-view spec. Params drive all the content, so this page is
// never statically generated. Under Cache Components (next.config.ts), reading
// `searchParams` below already makes this a dynamic hole with no segment config
// needed — `force-dynamic` is a build error here.
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
    return { title: 'Compare teams · The Sticks' };
  }
  return {
    title: raw.pos
      ? `${teamA.abbrev} vs ${teamB.abbrev} — ${pos} depth · The Sticks`
      : `${teamA.abbrev} vs ${teamB.abbrev} matchup · The Sticks`,
    description: raw.pos
      ? `Side-by-side ${pos} depth chart comparison: ${teamA.city} ${teamA.name} vs ${teamB.city} ${teamB.name}.`
      : `Team matchup comparison: ${teamA.city} ${teamA.name} vs ${teamB.city} ${teamB.name}.`,
    alternates: { canonical: '/compare' },
  };
}

// Server component: reunifies the team-matchup view (PR #221) and the position-depth
// view (PR #193) under one segmented control (2026-07-28 reunification spec). `pos`
// presence in the query string (not just its parsed value) drives which tab
// CompareView opens on. Resolves both team stats and both full rosters
// unconditionally once a/b are picked — never branched on `pos` — because the tab
// switch is now client-side and both datasets must already be on hand. Only
// per-position player arrays (never a whole roster) and a small teaser preview cross
// to the client (AGENTS.md invariant 5).
export default async function ComparePage({ searchParams }: Params) {
  const teams = await dbRosterSource.listTeams();
  const raw = await searchParams;
  const { a, b, pos } = parseCompareParams(
    raw,
    teams.map((t) => t.id)
  );
  const hasPos = Boolean(raw.pos);
  const teamA = a ? teams.find((t) => t.id === a) : undefined;
  const teamB = b ? teams.find((t) => t.id === b) : undefined;
  const scheduleTeam =
    raw.from === 'schedule' ? teams.find((team) => team.id === raw.scheduleTeam) : undefined;

  // A shared link's `pos` can be stale or garbage (?pos=FB) — parseCompareParams
  // already degrades content to the QB default, but the address bar must match what
  // actually rendered, or a re-shared/bookmarked link lies about what it shows.
  if (raw.pos && raw.pos !== pos) {
    redirect(buildComparePath(a, b, pos, scheduleTeam?.id));
  }

  const [statsA, statsB, rosterA, rosterB] = await Promise.all([
    a ? dbRosterSource.getTeamStats(a) : Promise.resolve(undefined),
    b ? dbRosterSource.getTeamStats(b) : Promise.resolve(undefined),
    a ? dbRosterSource.getTeam(a) : Promise.resolve(undefined),
    b ? dbRosterSource.getTeam(b) : Promise.resolve(undefined),
  ]);

  const groupsA = rosterA
    ? COMPARE_POSITIONS.map((p) => getPlayersByPosition(rosterA, p))
    : undefined;
  const groupsB = rosterB
    ? COMPARE_POSITIONS.map((p) => getPlayersByPosition(rosterB, p))
    : undefined;
  const teaser =
    groupsA && groupsB ? buildCompareTeaser(groupsA, groupsB, COMPARE_POSITIONS) : undefined;

  const positionIndex = COMPARE_POSITIONS.indexOf(pos);
  const positionsA = groupsA?.[positionIndex];
  const positionsB = groupsB?.[positionIndex];

  return (
    <CompareView
      teams={teams}
      teamA={teamA}
      teamB={teamB}
      statsA={statsA?.seasons[0]}
      statsB={statsB?.seasons[0]}
      positionsA={positionsA}
      positionsB={positionsB}
      position={pos}
      hasPos={hasPos}
      teaser={teaser}
      scheduleTeam={scheduleTeam}
    />
  );
}
