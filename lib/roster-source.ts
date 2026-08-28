import type {
  Conference,
  Division,
  RecentParticipation,
  Team,
  TeamColors,
  TeamRoster,
  TeamStats,
  UniformKind,
} from '@/lib/types';

// The single seam between the app and where roster data comes from. Routes and
// components depend on this interface, never on a registry directly. The only
// implementation is the Postgres-backed source (lib/roster-source.db.ts) — the app
// reads everything live from the DB, populated by scripts/ingest-espn.mts.

// Lightweight team metadata for listings (e.g. the team switcher) — no player data.
export type TeamMeta = Team;

// One team's league position (1 = best) per metric, for the season this record is keyed
// by. A rank is absent whenever the team's own source value is missing, so the Stats
// page renders the value with no rank caption rather than implying a last-place finish.
// The nflverse-sourced entries below `rushingYards` back the Stats page's Offense,
// Defense, and Special Teams sections: on a single-team page the league rank is what
// replaces Compare's second team column.
export interface TeamStatsRanks {
  winPercent?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  pointDifferential?: number;
  passingYards?: number;
  rushingYards?: number;
  // Team-level (rendered in the record breakdown, beside DIFF)
  turnoverMargin?: number;
  // Offense
  offensiveEpaPerPlay?: number;
  sackRate?: number;
  passingEpa?: number;
  rushingEpa?: number;
  passingInterceptions?: number;
  fumblesLost?: number;
  // Defense
  defensiveSacks?: number;
  quarterbackHitsPerGame?: number;
  defensiveTakeaways?: number;
  defensiveInterceptions?: number;
  // Special teams
  fieldGoalPercentage?: number;
  netPuntYardsPerAttempt?: number;
  puntReturnYardsPerAttempt?: number;
  kickoffReturnYardsPerAttempt?: number;
}

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
  yearStart: number;
  yearEnd: number | null;
  isCurrent: boolean;
  imagePath?: string;
}

// Everything the team stats page needs, composed in one read: team identity (for the
// header/theming) and one TeamStats row per ingested season (current + up to two prior
// — ../obsidian/Projects/depth/specs/2026-07-14-multi-season-team-stats-design.md), newest first.
// Each season's coach lives on that `TeamStats` entry (../obsidian/Projects/depth/specs/2026-07-14-
// season-scoped-head-coach-design.md) rather than here, since the coach who led a team
// in 2023 is not the coach who leads it in 2025. `seasons` is always an array, empty
// rather than undefined when no season has a complete entry, so callers don't need an
// extra undefined check before rendering the "no stats" fallback. `incomingCoach` is a
// distinct, separately-sourced signal: ESPN's live `teams.coach_name` reporting
// `coach_experience: 0` for a team that just hired a new HC before that person has
// coached a single game for them — the team_coach_seasons curated table has no row for
// this person yet (there's no season for it to belong to), so without this field
// they'd either be silently missing or wrongly attached to the latest played season.
// Independent of `seasons` being empty or not.
//
// `upcomingSeason` is set for ALL teams during the NFL off-season (roughly Mar–Aug),
// not just teams with a coaching change. It lets the stats page's season switcher show
// an upcoming-season chip for every team. `incomingCoach` continues to be the separate
// ESPN signal for brand-new HCs who haven't coached a game — it coexists with the
// general upcoming-season chip (a team can have both).
export interface TeamStatsPage {
  team: TeamMeta;
  seasons: TeamStats[];
  leagueRanksBySeason: Record<number, TeamStatsRanks>;
  incomingCoach?: { name: string };
  upcomingSeason?: number;
  // The current NFL season year. A season is "completed" (all games played, playoff
  // outcomes known) when its year is less than this. Used by TeamStatsView to suppress
  // the playoff-status line ("SEED N" / "MISSED PLAYOFFS") for seasons that haven't
  // finished yet — see ../obsidian/Projects/depth/specs/2026-07-14-multi-season-team-stats-design.md.
  currentSeason: number;
}

export interface RosterSource {
  // All teams' metadata, for switchers and link generation. Stable order.
  listTeams(): Promise<TeamMeta[]>;
  // Full roster for one team, or undefined for an unknown id.
  getTeam(id: string): Promise<TeamRoster | undefined>;
  // Coach + season record for one team, or undefined for an unknown id.
  getTeamStats(id: string): Promise<TeamStatsPage | undefined>;
  // Latest complete recent-snap window for one team, or undefined when unavailable.
  recentParticipation(id: string): Promise<RecentParticipation | undefined>;
  // Every kit for every team (home + curated), flattened with team identity, for the
  // uniform archive. No player data. Dangling team refs are skipped.
  listUniforms(): Promise<UniformListing[]>;
}
