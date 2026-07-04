import type { Team, TeamRoster } from "./types";

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on a registry directly. The only
// implementation is the Postgres-backed source (lib/roster-source.db.ts) — the app
// reads everything live from the DB, populated by scripts/ingest-espn.mts.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): Promise<TeamMeta[]>;
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): Promise<TeamRoster | undefined>;
}
