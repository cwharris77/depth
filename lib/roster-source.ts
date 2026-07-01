import type { Team, TeamRoster } from "./types";
import { TEAMS } from "./teams";

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on a registry directly, so the
// Postgres-backed source (lib/roster-source.db.ts) drops in with minimal UI changes.
//
// Both methods are async: the DB source is inherently async (network round-trip), and
// the static source's methods are trivially wrapped in Promise.resolve so callers don't
// need to branch on which source they're using.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): Promise<TeamMeta[]>;
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): Promise<TeamRoster | undefined>;
}

// Static source backed by the bundled TEAMS registry.
export const staticRosterSource: RosterSource = {
  async listTeams() {
    return Object.values(TEAMS)
      .map((roster) => roster.team)
      .sort((a, b) => a.id.localeCompare(b.id));
  },
  async getTeam(id) {
    return TEAMS[id];
  },
};
