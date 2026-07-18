import DepthChartField from '@/components/DepthChartField';
import { resolveStartupTeam } from '@/lib/home-team';
import { dbRosterSource } from '@/lib/roster-source.db';
import { getServerClient } from '@/lib/supabase/server';
import { DEFAULT_TEAM_ID } from '@/lib/teams';
import { notFound, redirect } from 'next/navigation';

// The home route. Signed-in visitors resolve to their startup team (favorite ->
// last-viewed -> default) server-side and are redirected to /team/<id>, so the app opens
// where they left off across devices (Phase C, auth pass 1). Signed-out visitors — the
// common case, and the only ones we store nothing about — get the DEFAULT team's chart
// rendered directly here, statically-shaped like every /team/[id] page, with no
// download-hydrate-redirect hop (backlog: "Home-load feels slow", 2026-07-08).
export default async function Home() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
  }

  const [roster, teams] = await Promise.all([
    dbRosterSource.getTeam(DEFAULT_TEAM_ID),
    dbRosterSource.listTeams(),
  ]);
  if (!roster) {
    notFound();
  }
  return <DepthChartField roster={roster} teams={teams} />;
}
