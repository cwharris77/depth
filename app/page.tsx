import DepthChartField from '@/components/DepthChartField';
import { resolveStartupTeam } from '@/lib/home-team';
import { dbRosterSource, getPlayerStatsForRoster, getTeamFormations } from '@/lib/roster-source.db';
import { getServerClient, requireUser } from '@/lib/supabase/server';
import { getNflSeasonState } from '@/lib/nfl-season';
import { DEFAULT_TEAM_ID } from '@/lib/teams';
import { notFound, redirect } from 'next/navigation';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';

// The home route. Signed-in visitors resolve to their startup team (favorite ->
// last-viewed -> default) server-side and are redirected to /team/<id>, so the app opens
// where they left off across devices (Phase C, auth pass 1). Signed-out visitors — the
// common case, and the only ones we store nothing about — get the DEFAULT team's chart
// rendered directly here, statically-shaped like every /team/[id] page, with no
// download-hydrate-redirect hop (backlog: "Home-load feels slow", 2026-07-08).
export default async function Home() {
  const [user, { isOffseason, upcomingSeason }] = await Promise.all([
    requireUser(),
    getNflSeasonState(),
  ]);
  // Same "which season is live right now" definition as /team/[id] (Phase D1's
  // SeasonSheet roster row).
  const currentSeason = isOffseason ? upcomingSeason : upcomingSeason - 1;

  if (user) {
    const supabase = await getServerClient();
    const [{ data: settings }, teams] = await Promise.all([
      supabase
        .from('user_settings')
        .select('favorite_team_id, last_team_id, start_on_favorite')
        .eq('user_id', user.id)
        .maybeSingle(),
      dbRosterSource.listTeams(),
    ]);
    const target = resolveStartupTeam(
      settings
        ? {
            favoriteTeamId: settings.favorite_team_id,
            lastTeamId: settings.last_team_id,
            startOnFavorite: settings.start_on_favorite,
          }
        : null,
      teams.map((t) => t.id),
      DEFAULT_TEAM_ID
    );
    if (target !== DEFAULT_TEAM_ID) redirect(`/team/${target}`);

    // Default-team favorite: render right here rather than redirecting to
    // /team/<DEFAULT_TEAM_ID> (same page either way). Reuse `teams` from above instead
    // of a second listTeams() call — this is the one signed-in path that falls through
    // to a full render instead of redirecting.
    const roster = await dbRosterSource.getTeam(DEFAULT_TEAM_ID);
    if (!roster) {
      notFound();
    }
    const [playerStatsMap, formations] = await Promise.all([
      getPlayerStatsForRoster(roster.players.map((p) => p.id)),
      getTeamFormations(DEFAULT_TEAM_ID),
    ]);
    return (
      <DepthChartField
        roster={roster}
        teams={teams}
        playerStatsMap={playerStatsMap}
        formations={formations}
        currentSeason={currentSeason}
        uniformDefinition={getTeamUniformDefinition(roster.team.id)}
      />
    );
  }

  const [roster, teams] = await Promise.all([
    dbRosterSource.getTeam(DEFAULT_TEAM_ID),
    dbRosterSource.listTeams(),
  ]);
  if (!roster) {
    notFound();
  }
  const [playerStatsMap, formations] = await Promise.all([
    getPlayerStatsForRoster(roster.players.map((p) => p.id)),
    getTeamFormations(DEFAULT_TEAM_ID),
  ]);
  return (
    <DepthChartField
      roster={roster}
      teams={teams}
      playerStatsMap={playerStatsMap}
      formations={formations}
      currentSeason={currentSeason}
      uniformDefinition={getTeamUniformDefinition(roster.team.id)}
    />
  );
}
