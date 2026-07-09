import type { Conference, Division, Team, TeamColors, TeamRoster, UniformKind } from './types';

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on a registry directly. The only
// implementation is the Postgres-backed source (lib/roster-source.db.ts) — the app
// reads everything live from the DB, populated by scripts/ingest-espn.mts.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

// A single kit flattened with its team's identity, for the archive listing (Phase 7
// archive page). Lightweight — no player data — so shipping all of them to the archive
// route does not violate the "one team's roster per page" invariant (this is kit
// metadata, not rosters).
export interface UniformListing {
  teamId: string;
  teamName: string;
  conference: Conference;
  division: Division;
  id: string;
  kind: UniformKind;
  name: string;
  colors: TeamColors;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  imagePath?: string;
}

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): Promise<TeamMeta[]>;
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): Promise<TeamRoster | undefined>;
  // Every kit for every team (home + curated), flattened with team identity, for the
  // uniform archive. No player data. Dangling team refs are skipped.
  listUniforms(): Promise<UniformListing[]>;
}
