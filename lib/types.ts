export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'
  | 'DE'
  | 'DT'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K'
  | 'P'
  | 'LS'
  | 'KR'
  | 'PR';

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
  // Set only on players reordered by a user depth override (lib/depth-overrides.ts):
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
