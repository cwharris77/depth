// DE/DT/LB/CB/S remain valid alongside their granular splits below: ESPN's per-athlete
// bio abbreviation (the fallback path in lib/espn/positions.ts's BIO_POSITION) carries
// no side/role info for a lineman, linebacker, or corner, so those fall back to the
// generic code; nflverse's roster CSVs also still emit some of these directly. SS/FS/
// NT/FB do have a distinguishable bio abbreviation, so those always resolve granular
// (docs: 2026-08-04-full-espn-position-taxonomy-design.md).
export type Position =
  | 'QB'
  | 'RB'
  | 'FB'
  | 'WR'
  | 'TE'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'
  | 'DE'
  | 'LDE'
  | 'RDE'
  | 'DT'
  | 'NT'
  | 'LB'
  | 'WLB'
  | 'LILB'
  | 'RILB'
  | 'SLB'
  | 'CB'
  | 'LCB'
  | 'RCB'
  | 'NB'
  | 'S'
  | 'SS'
  | 'FS'
  | 'K'
  | 'P'
  | 'LS'
  | 'KR'
  | 'PR';

// The broad depth-chart family a granular Position belongs to. nflverse's real-formation
// participation data (defense_personnel/offense_personnel counts) has no per-player
// archetype info — it can't say which linebacker is strongside vs weak, or which safety
// is strong vs free — so the count-driven formation resolvers in lib/utils/depth-chart/formations.ts match
// on this broader group instead of the exact granular Position everywhere else uses.
export type PositionGroup = 'DL' | 'LB' | 'CB' | 'S' | 'RB';

export type PlayerStatus = 'starter' | 'backup' | 'rookie' | 'injured';

export type Unit = 'offense' | 'defense' | 'special';

export type Conference = 'AFC' | 'NFC';
export type Division = 'North' | 'South' | 'East' | 'West';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  depthRank: 1 | 2 | 3;
  status: PlayerStatus;
  // Set only on players reordered by a user depth override (lib/utils/depth-chart/depth-overrides.ts):
  // a full-precision within-position rank that getPlayersByPosition prefers over the
  // jersey-number tiebreak, so a custom order is honored past the top 3. Undefined for
  // source data, which keeps the default jersey-number tiebreak.
  order?: number;
  age: number;
  college: string;
  experience: number;
  height: string;
  weight: number;
  bio: string;
  photoUrl?: string;
  stats?: Record<string, string | number>;
}

// Field coords are percentages (0–100). y=0 top, y=100 bottom. Scrimmage line at y=50.

// FormationSlot = a spot in the SHARED offense/defense layout. It resolves to a
// player by position group + depth index, so any roster fills the same formation
// with zero per-team layout work. index 0 = first at that position, 1 = second, ...
export interface FormationSlot {
  id: string;
  position: Position;
  index: number;
  // Set on slots built by lib/utils/depth-chart/formations.ts's real-formation resolvers
  // (buildDlSlots/buildLbSlots/buildDbSlots, buildRealFormation's RB slots) and on
  // OFFENSE_FORMATION's RB slot. When present, resolveUnit fills the slot via
  // resolveGroupedSlots (broad group + optional preferredPosition) instead of an exact
  // match on `position`/`index` alone — nflverse's count-only personnel data can't say
  // which specific granular position a player fills. Unset (BASE_DEFENSE and every other
  // Position on the offense side) keeps the plain exact-match behavior.
  group?: PositionGroup;
  // Only meaningful alongside `group`. When a group slot's label names a specific
  // granular position (e.g. DB_SLOTS' "SS"/"FS"/"LCB"/"RCB"/"NB"), resolveUnit tries an
  // exact match on this first — a roster's real free safety fills the FS-labeled slot
  // even though nflverse's count-only data can only say "some safety goes here" — and
  // falls back to next-best-ranked group member only when no player carries the tag
  // (DEP-148: indexing the group pool by raw depth rank ignored the label entirely,
  // so a real FS could land in the SS dot, or left/right corners could swap).
  preferredPosition?: Position;
  x: number;
  y: number;
  label: string;
  // True if this slot lines up on the line of scrimmage. Offense must have exactly 7
  // on the line (5 OL + 2 eligible). A quick-fix base look for now; real per-team
  // formations come later (see Future Ideas in the vault).
  onLine: boolean;
}

// SpecialSlot = a special-teams spot. Returners (KR/PR) are editorial cross-position
// picks that can't be derived from a Position, so special teams carries explicit
// player references in the roster data (source-provided). playerId null → empty slot.
export interface SpecialSlot {
  id: string;
  playerId: string | null;
  x: number;
  y: number;
  label: string;
}

// What the field renderer needs for one dot, after resolution.
export interface RenderSlot {
  key: string;
  x: number;
  y: number;
  label: string;
  player?: Player;
  // On the line of scrimmage. The renderer nudges these dots fully onto their own
  // side so the circle sits behind the line instead of straddling it.
  onLine?: boolean;
}

export interface TeamColors {
  // Brand-true colors. Safe for large, controlled-contrast areas (field tint, header).
  primary: string;
  secondary: string;
  accent: string;
  // uiAccent is curated to read on the dark app background (#0a0e1a). It drives text,
  // player dots, selection rings, and stat accents. onAccent is the text color used on
  // top of uiAccent. These guarantee legibility across all 32 teams.
  uiAccent: string;
  onAccent: string;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbrev: string;
  conference: Conference;
  division: Division;
  colors: TeamColors;
  logo?: string;
  logoDark?: string;
}

// Season record + standings detail (Phase E stats page,
// docs/superpowers/specs/2026-07-12-team-stats-page-design.md). Sourced from the same
// ESPN standings fetch already used for conference/division (lib/espn/standings.ts
// parseTeamStats) -- one call, more of the payload read. A team missing from the
// standings response (bye-week gap, mid-season expansion) has no TeamStats rather than
// a partially-filled one (invariant 6). `coach` is independently optional and
// hand-curated (docs/superpowers/specs/2026-07-14-season-scoped-head-coach-design.md,
// `team_coach_seasons` table) -- unlike every other field here it did not come from
// ESPN, since ESPN's roster endpoint doesn't vary `coach` by season.
export interface TeamStats {
  season: number;
  coach?: { name: string; experience: number };
  overallWins: number;
  overallLosses: number;
  overallTies: number;
  winPercent: number;
  homeWins: number;
  homeLosses: number;
  roadWins: number;
  roadLosses: number;
  divisionWins: number;
  divisionLosses: number;
  conferenceWins: number;
  conferenceLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  streak: string;
  playoffSeed: number;
  // nflverse-sourced fields (team_season_stats table), optional: nflverse backfill may
  // lag behind ESPN team_stats, so a season can lack passing/rushing values.
  passingYards?: number;
  rushingYards?: number;
}

// A kit's category. `home` rows are ESPN-owned (machine-managed); every other kind is
// hand-curated in lib/uniforms/data.ts. Not a required set per team — only `home` is
// guaranteed; a team has whatever kits it actually wears.
export type UniformKind = 'home' | 'away' | 'throwback' | 'color-rush' | 'alternate';

// A named kit in a team's uniform archive (roadmap Phase 7). Every kit is a stored row now,
// including the current home (kind='home', backfilled from team.colors). yearEnd null →
// still in the active rotation. isCurrent marks active kits apart from retired throwbacks.
export interface Uniform {
  id: string;
  teamId: string;
  kind: UniformKind;
  name: string;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  colors: TeamColors;
  // Path to a committed jersey image (public/uniforms/…). Undefined → the UI draws a
  // jersey silhouette from `colors` instead (PR2).
  imagePath?: string;
}

export interface TeamRoster {
  team: Team;
  players: Player[];
  // Offense/defense come from the shared formation (lib/formations). Special teams is
  // per-team and editorial, so it lives here.
  specialTeams: SpecialSlot[];
  // The team's kits: synthesized Home first (from team.colors), then hand-curated
  // alternates/throwbacks. Default rendered kit is uniforms[0].
  uniforms: Uniform[];
}

// The bundled registry (lib/teams) is a build-time seed for the ESPN ingestion, not the
// app's source of truth. It omits conference/division because those come from ESPN's
// standings at ingest time (see lib/espn/standings.ts), not hand-curated.
export type TeamSeed = Omit<Team, 'conference' | 'division'>;
export interface TeamRosterSeed {
  team: TeamSeed;
  players: Player[];
  specialTeams: SpecialSlot[];
}

// One of every real formation a team ran that season, per unit (Phase E, nflverse
// participation ingestion, docs/superpowers/specs/2026-07-07-phase-e-real-formations-
// design.md; defense added, top-N cap lifted, DEP-141). For `unit: 'offense'`,
// `alignment` is FTN's charted offense_formation ('SHOTGUN' | 'UNDER CENTER' | 'PISTOL')
// and `personnel` the standard shorthand ({RB count}{TE count}, e.g. '11'), feeding
// lib/utils/depth-chart/formations.ts's buildRealFormation. For `unit: 'defense'`, `alignment` is the
// derived front label ('Base' | 'Nickel' | 'Dime' | 'Quarter' | 'Goal Line',
// lib/nflverse/defense-personnel.ts's defenseAlignmentLabel) and `personnel` the
// "{DL}-{LB}-{DB}" shorthand, feeding buildRealDefenseFormation. `pct` is an integer
// share of the team's charted plays that season. A team with insufficient participation
// coverage has zero rows for that unit, not a sparse-sample one (see
// lib/nflverse/participation.ts).
export interface TeamFormation {
  season: number;
  rank: number;
  unit: 'offense' | 'defense';
  alignment: string;
  personnel: string;
  pct: number;
}

// One player's season stat line (nflverse ingestion, docs/superpowers/specs/2026-07-07-
// nflverse-ingestion-and-player-stats-design.md). All stat columns nullable: the
// display set is a subset of nflverse's full frame, and most columns don't apply to
// every position (a WR row's passing_* fields are null). def_sacks is a fraction
// (half-sacks are real), everything else is a whole count.
export interface PlayerSeasonStats {
  season: number;
  seasonType: 'REG' | 'POST';
  // The team that season/season_type is attributed to (nflverse's `recent_team`, DEP-202).
  // One team per row -- a mid-season trade isn't split; null when the source code didn't
  // resolve to a team, or on old rows written before this column existed.
  teamAbbrev: string | null;
  games: number | null;
  completions: number | null;
  attempts: number | null;
  passingYards: number | null;
  passingTds: number | null;
  passingInterceptions: number | null;
  carries: number | null;
  rushingYards: number | null;
  rushingTds: number | null;
  receptions: number | null;
  targets: number | null;
  receivingYards: number | null;
  receivingTds: number | null;
  defTacklesSolo: number | null;
  defSacks: number | null;
  defInterceptions: number | null;
  fgMade: number | null;
  fgAtt: number | null;
}

// One game as stored/read from the `games` table (nflverse schedule ingestion,
// docs/superpowers/specs/2026-07-17-team-schedule-design.md). A game is shared between
// two teams — one row, both ids. Scores are null until the game is played (which is how
// the read layer detects an upcoming game). Camel-cased mirror of the DB row.
export interface Game {
  gameId: string;
  season: number;
  gameType: string;
  week: number | null;
  gameday: string | null;
  gametime: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}

// The opponent identity a schedule/next-game card renders (colored code chip). Resolved
// server-side from the opposing team's metadata; the client never imports all-32 data.
export interface ScheduleOpponent {
  id: string;
  abbrev: string;
  colors: TeamColors;
}

// One week on a team's schedule, from that team's perspective (design spec 5a's weekly
// card grid). A bye week is `isBye: true` with a null opponent — the absence of a game
// that week, derived, since nflverse has no bye row. `result` is null for an upcoming
// (unplayed) game or a bye.
export interface TeamScheduleGame {
  week: number;
  gameType: string;
  isBye: boolean;
  date: string | null;
  isHome: boolean;
  opponent: ScheduleOpponent | null;
  teamScore: number | null;
  oppScore: number | null;
  result: 'W' | 'L' | 'T' | null;
}

export interface TeamSchedule {
  season: number;
  games: TeamScheduleGame[];
}

// Team production leaders for one season, shown on the stats page (design spec 5a).
// A single leader per category (passing/rushing/receiving); `line` is the preformatted
// summary the UI renders verbatim (see lib/utils/roster/roster-leaders.ts). Any category can be null
// — a team with no positive yardage in it (e.g. a defense-heavy sample) shows nothing,
// not a zero-filled row (the repo's "show nothing, not zeros" posture).
export interface Leader {
  playerId: string;
  name: string;
  line: string;
}

export interface RosterLeaders {
  season: number;
  passing: Leader | null;
  rushing: Leader | null;
  receiving: Leader | null;
}
