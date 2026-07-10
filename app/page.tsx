import { notFound } from 'next/navigation';
import DepthChartField from '@/components/DepthChartField';
import HomeTeamSwap from '@/components/HomeTeamSwap';
import { dbRosterSource } from '@/lib/roster-source.db';
import { DEFAULT_TEAM_ID } from '@/lib/teams';
import { showUniformPicker } from '@/lib/flags';

// The home route server-renders the DEFAULT team's depth chart directly, statically
// prerendered like every /team/[id] page — so the common visitor sees a real chart with
// no download-hydrate-redirect-refetch hop (backlog: "Home-load feels slow", 2026-07-08).
// A visitor with a saved "my team" (roadmap 5a) that differs from the default is swapped
// client-side to /team/<saved> after hydration; default-team visitors never navigate.
export default async function Home() {
  const [roster, teams, uniformPicker] = await Promise.all([
    dbRosterSource.getTeam(DEFAULT_TEAM_ID),
    dbRosterSource.listTeams(),
    // Launch gate, evaluated here (server) and passed down — the client component never
    // reads flags itself (lib/flags.ts).
    showUniformPicker(),
  ]);
  if (!roster) {
    notFound();
  }
  const teamIds = teams.map((team) => team.id);
  return (
    <>
      {/* No RememberTeam here on purpose: the home route defaulting to Seattle is not a
          team the visitor chose, and persisting it would clobber their saved team (5a)
          before HomeTeamSwap can navigate. Only /team/[id] records "my team". */}
      <HomeTeamSwap teamIds={teamIds} defaultId={DEFAULT_TEAM_ID} />
      <DepthChartField roster={roster} teams={teams} showUniformPicker={uniformPicker} />
    </>
  );
}
