import type { Team, TeamRoster } from "./types";
import { TEAMS } from "./teams";

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on the TEAMS registry directly, so a
// future ApiRosterSource (live data) drops in with zero UI changes.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): TeamMeta[];
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): TeamRoster | undefined;
}

// Static source backed by the bundled TEAMS registry.
export const staticRosterSource: RosterSource = {
  listTeams() {
    return Object.values(TEAMS)
      .map((roster) => roster.team)
      .sort((a, b) => a.id.localeCompare(b.id));
  },
  getTeam(id) {
    return TEAMS[id];
  },
};
