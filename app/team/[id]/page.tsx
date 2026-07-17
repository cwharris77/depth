import DepthChartField from '@/components/DepthChartField';
import RememberTeam from '@/components/RememberTeam';
import { showIsolatedSearchBarIcon } from '@/lib/flags';
import { dbRosterSource } from '@/lib/roster-source.db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };

// ISR: the weekly ESPN ingest (scripts/ingest-espn.mts, Wed 12:00 UTC) writes straight
// to Postgres and is intentionally decoupled from deploys (AGENTS.md invariant 7), so
// without a revalidate window this page would only pick up a fresh ingest on the next
// redeploy. 6 hours bounds worst-case staleness well under the weekly cadence while
// still serving the prerendered page from cache for the overwhelming majority of
// requests between ingests.
export const revalidate = 21600; // 6 hours, in seconds

// Prerender one static page per team. Unknown ids fall through to notFound() below.
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const roster = await dbRosterSource.getTeam(id);
  if (!roster) {
    return { title: 'Team not found · Depth' };
  }
  const { team } = roster;
  const fullName = `${team.city} ${team.name}`;
  return {
    title: `${fullName} Depth Chart · Depth`,
    description: `Interactive depth chart for the ${fullName} — tap any player for their bio and stats.`,
    // Cross-team player picks deep-link here as /team/[id]?player=<id> (see
    // NavSwitcher). Those are the same page, so point the canonical at the clean
    // path (resolved against the layout's metadataBase) to consolidate them.
    alternates: { canonical: `/team/${id}` },
  };
}

export default async function TeamPage({ params }: Params) {
  const { id } = await params;
  // The route resolves exactly one roster here (server-side) and passes it down,
  // so the client only ever receives the team it's viewing. Team metadata for all 32
  // (for the switcher) is lightweight — no player data — so it's safe to ship on
  // every page alongside the one full roster.
  const [roster, teams, isolatedSearchBarIcon] = await Promise.all([
    dbRosterSource.getTeam(id),
    dbRosterSource.listTeams(),
    // Launch gate, evaluated here (server) and passed down — the client component
    // never reads flags itself (lib/flags.ts).
    showIsolatedSearchBarIcon(),
  ]);
  if (!roster) {
    notFound();
  }
  // RememberTeam records this team in localStorage (5a) so the home route reopens it.
  return (
    <>
      <RememberTeam id={id} />
      <DepthChartField
        roster={roster}
        teams={teams}
        showIsolatedSearchBarIcon={isolatedSearchBarIcon}
      />
    </>
  );
}
