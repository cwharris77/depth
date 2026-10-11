const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', 'djwrecczgudktgsooxti.supabase.co']);
export const EVERYTHING_FIXTURE_TEAM = 'team-events-everything-fixture';
export function assertFixtureHost(url: string): void {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) throw new Error(`refusing to write fixture events to ${host}`);
}
export function fixtureEventKeys(
  teamId: string,
  playerId: string
): { historic: string; good: string } {
  return {
    historic: `historic_week:rushing_yards:1900:1:${playerId}`,
    good: `good_week:1900:1:${teamId}:${playerId}`,
  };
}
