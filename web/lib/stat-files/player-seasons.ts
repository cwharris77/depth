// Weekly nflverse rows → one consolidated season row per (player, season, season_type,
// team). Pure: no fetch, no DB, no filesystem (the design's "one canonical point out" for
// the R2 stat files, DEP-544). The publisher (publisher.ts) and the build script are the
// only I/O in the pipeline.
//
// Rules this module owns (2026-09-16 post-season-storage design, amending the 09-11
// consolidation rules):
//   - One season definition (`season-state.ts`); a source never relabels a season.
//   - Identity is resolved through the players.csv crosswalk before a row reaches here; a
//     row with no ESPN id is dropped-and-counted by the caller (`toPlayerWeekRows` returns
//     `unresolved`), never name-matched.
//   - A traded player gets one row per team, never a combined row: team is part of the
//     grouping key. REG and POST are separate rows derived from the weekly assets.
//   - Sections are source-owned (`box`, `snaps`, `pfr`, `ngs`, `qbr`); a source with no
//     rows omits its section entirely, never zero-fills it.
//   - Counts are summed, `''`/absent stays absent (`null` is never written), and rates are
//     recomputed from summed components — never averaged. A rate whose component isn't
//     published is omitted (listed in each spec's `omit` with a reason) rather than
//     fabricated from a mean of weekly values.
//
// Field ownership is data, not scattered conditionals: each section declares exactly which
// source columns it sums, maximises, recomputes as a rate, recomputes as a weighted mean,
// concatenates (per-kick distance lists), or omits. A new upstream column is inert until
// it is named here, which is the review point for "who owns this field".

import { playerRawTables } from '@/lib/nflverse/raw-tables.generated';

export type SeasonType = 'REG' | 'POST';

export interface WeeklyCsvRow {
  [column: string]: string | undefined;
}

/** A weekly row after identity resolution, normalized to one (player, team, week). */
export interface PlayerWeekRow {
  playerId: string;
  season: number;
  seasonType: SeasonType;
  week: number;
  team: string | null;
  /** The source row's raw cells; aggregation coerces what it reads. */
  stats: Record<string, string | undefined>;
}

export interface WeekRowOptions {
  idColumn: string;
  /** gsis/pfr → ESPN. Omitted when the id column already *is* the ESPN athlete id (QBR). */
  crosswalk?: ReadonlyMap<string, string>;
  teamColumn: string;
  seasonTypeColumn: string;
  weekColumn: string;
  /** nflverse team code → our team id; an unresolved code degrades the row's team to null. */
  resolveTeam?: (code: string) => string | null;
}

export interface WeekRowResult {
  rows: PlayerWeekRow[];
  /** Rows with no usable id/season/week — dropped, never guessed. */
  skipped: number;
  /** Rows whose source id has no ESPN crosswalk match — dropped-and-counted. */
  unresolved: number;
}

/**
 * nflverse labels playoff weeks differently per source: `stats_player`/`ngs` use
 * `REG`/`POST`, PFR and snap counts use the round (`REG`/`WC`/`DIV`/`CON`/`SB`), and ESPN
 * QBR uses `Regular`/`Postseason`. One definition maps all of them; an unknown non-empty
 * label is treated as POST (a real round), an empty cell as REG.
 */
export function normalizeSeasonType(value: string | undefined): SeasonType {
  const label = value?.trim().toUpperCase() ?? '';
  if (!label || label.startsWith('REG')) return 'REG';
  return 'POST';
}

function toNumber(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalizes raw CSV rows from one source file into `PlayerWeekRow`s. The caller passes the
 * source's own id/team/season-type/week column names, so the same function serves the box
 * (`team`/`season_type`), snap and PFR (`team`/`game_type`), NGS (`team_abbr`/`season_type`)
 * and QBR (`team_abb`/`season_type`) shapes without the generated raw-table specs' coercion
 * (which types PFR's `game_type` as numeric and would drop its REG/POST label).
 */
export function toPlayerWeekRows(csvRows: WeeklyCsvRow[], opts: WeekRowOptions): WeekRowResult {
  const rows: PlayerWeekRow[] = [];
  let skipped = 0;
  let unresolved = 0;

  for (const csv of csvRows) {
    const sourceId = csv[opts.idColumn]?.trim();
    const season = Number(csv.season?.trim());
    const weekRaw = csv[opts.weekColumn]?.trim();
    const week = Number(weekRaw);
    if (
      !sourceId ||
      !csv.season?.trim() ||
      !Number.isInteger(season) ||
      season < 1 ||
      !weekRaw ||
      !Number.isInteger(week)
    ) {
      skipped++;
      continue;
    }
    const playerId = opts.crosswalk ? opts.crosswalk.get(sourceId) : sourceId;
    if (!playerId) {
      unresolved++;
      continue;
    }
    const teamCode = csv[opts.teamColumn]?.trim();
    rows.push({
      playerId,
      season,
      seasonType: normalizeSeasonType(csv[opts.seasonTypeColumn]),
      week,
      team: teamCode ? (opts.resolveTeam?.(teamCode) ?? teamCode) : null,
      stats: csv,
    });
  }

  return { rows, skipped, unresolved };
}

export type StatLine = Record<string, number | string>;

/**
 * How one section turns its weekly rows into a season line. Fields not named are ignored
 * (metadata and deliberately omitted rates both land here). `rate` and `weighted` carry the
 * two component/weight column names per output field.
 */
export interface SectionSpec {
  sum: readonly string[];
  max: readonly string[];
  rate: Readonly<Record<string, readonly [numerator: string, denominator: string]>>;
  weighted: Readonly<Record<string, readonly [value: string, weight: string]>>;
  textConcat: readonly string[];
}

// --- Box score (stats_player week) ----------------------------------------------------

const BOX_META = new Set([
  'player_name',
  'player_display_name',
  'position',
  'position_group',
  'headshot_url',
  'game_id',
  'team',
  'opponent_team',
]);

// Season-long "longest" fields are maxima, not sums.
const BOX_MAX = ['fg_long', 'pt_long'];

// Rates recomputed from summed components. `target_share`/`air_yards_share`/`wopr` are
// team-relative and are omitted rather than averaged; fantasy points depend on a scoring
// formula that is a product decision, not a recomputation.
const BOX_RATE = {
  fg_pct: ['fg_made', 'fg_att'],
  pat_pct: ['pat_made', 'pat_att'],
  pacr: ['passing_yards', 'passing_air_yards'],
  racr: ['receiving_yards', 'receiving_air_yards'],
} as const;

// CPOE is a per-attempt mean, so the season value is attempts-weighted.
const BOX_WEIGHTED = {
  passing_cpoe: ['passing_cpoe', 'attempts'],
} as const;

const BOX_TEXT = [
  'fg_made_list',
  'fg_missed_list',
  'fg_blocked_list',
  'fg_made_distance',
  'fg_missed_distance',
  'fg_blocked_distance',
  'gwfg_distance',
];

const BOX_OMIT = [
  'target_share',
  'air_yards_share',
  'wopr',
  'fantasy_points',
  'fantasy_points_ppr',
];

function boxSpec(): SectionSpec {
  const spec = playerRawTables.find((table) => table.table === 'nflverse_player_week');
  if (!spec) throw new Error('missing generated nflverse_player_week spec');
  const special = new Set<string>([
    ...BOX_MAX,
    ...Object.keys(BOX_RATE),
    ...Object.keys(BOX_WEIGHTED),
    ...BOX_TEXT,
    ...BOX_OMIT,
  ]);
  const sum = spec.columns
    .map((column) => column.name)
    .filter((name) => !BOX_META.has(name) && !special.has(name));
  return { sum, max: BOX_MAX, rate: BOX_RATE, weighted: BOX_WEIGHTED, textConcat: BOX_TEXT };
}

const BOX_SPEC = boxSpec();

// --- PFR advanced stats (advstats_week {pass,def,rush,rec}) --------------------------

const PFR_SPEC: SectionSpec = {
  sum: [
    'passing_drops',
    'receiving_drop',
    'passing_bad_throws',
    'times_sacked',
    'times_blitzed',
    'times_hurried',
    'times_hit',
    'times_pressured',
    'def_times_blitzed',
    'def_times_hurried',
    'def_times_hitqb',
    'def_ints',
    'def_targets',
    'def_completions_allowed',
    'def_yards_allowed',
    'def_air_yards_completed',
    'def_yards_after_catch',
    'def_receiving_td_allowed',
    'def_sacks',
    'def_pressures',
    'def_tackles_combined',
    'def_missed_tackles',
    'carries',
    'rushing_yards_before_contact',
    'rushing_yards_after_contact',
    'rushing_broken_tackles',
    'receiving_broken_tackles',
    'receiving_int',
  ],
  max: [],
  rate: {
    def_completion_pct: ['def_completions_allowed', 'def_targets'],
    def_yards_allowed_per_cmp: ['def_yards_allowed', 'def_completions_allowed'],
    def_yards_allowed_per_tgt: ['def_yards_allowed', 'def_targets'],
    rushing_yards_before_contact_avg: ['rushing_yards_before_contact', 'carries'],
    rushing_yards_after_contact_avg: ['rushing_yards_after_contact', 'carries'],
  },
  weighted: {},
  textConcat: [],
  // Omitted: passing_drop_pct/receiving_drop_pct/passing_bad_throw_pct/times_pressured_pct
  // (no published attempt denominator in these files), def_passer_rating_allowed,
  // def_adot, def_missed_tackle_pct (PFR's denominator is combined+missed; the two summed
  // components ship instead), receiving_rat.
};

// --- Next Gen Stats (ngs_{passing,rushing,receiving}) --------------------------------

const NGS_SPEC: SectionSpec = {
  sum: [
    'attempts',
    'pass_yards',
    'pass_touchdowns',
    'interceptions',
    'completions',
    'rush_attempts',
    'rush_yards',
    'expected_rush_yards',
    'rush_yards_over_expected',
    'rush_touchdowns',
    'receptions',
    'targets',
    'yards',
    'rec_touchdowns',
  ],
  max: [],
  rate: {
    completion_percentage: ['completions', 'attempts'],
    catch_percentage: ['receptions', 'targets'],
    avg_rush_yards: ['rush_yards', 'rush_attempts'],
    rush_yards_over_expected_per_att: ['rush_yards_over_expected', 'rush_attempts'],
  },
  weighted: {
    // Per-play means are weighted by the play count they describe (attempts/completions/
    // targets/rush attempts), so a three-attempt game can't weigh as much as a 40-attempt one.
    avg_time_to_throw: ['avg_time_to_throw', 'attempts'],
    avg_completed_air_yards: ['avg_completed_air_yards', 'completions'],
    avg_intended_air_yards: ['avg_intended_air_yards', 'attempts'],
    avg_air_yards_differential: ['avg_air_yards_differential', 'attempts'],
    avg_air_yards_to_sticks: ['avg_air_yards_to_sticks', 'attempts'],
    expected_completion_percentage: ['expected_completion_percentage', 'attempts'],
    percent_attempts_gte_eight_defenders: ['percent_attempts_gte_eight_defenders', 'attempts'],
    avg_time_to_los: ['avg_time_to_los', 'rush_attempts'],
    avg_cushion: ['avg_cushion', 'targets'],
    avg_separation: ['avg_separation', 'targets'],
    avg_yac: ['avg_yac', 'receptions'],
    avg_expected_yac: ['avg_expected_yac', 'receptions'],
    avg_yac_above_expectation: ['avg_yac_above_expectation', 'receptions'],
  },
  textConcat: [],
  // Omitted: aggressiveness/rush_pct_over_expected/percent_share_of_intended_air_yards
  // (not a linear mean of a published component), passer_rating (non-linear),
  // completion_percentage_above_expectation and efficiency (derivable from shipped
  // components by the reader), avg_air_distance/max_air_distance/max_completed_air_distance
  // (distances, not season totals).
};

// --- ESPN QBR (qbr_week_level) -------------------------------------------------------

const QBR_SPEC: SectionSpec = {
  sum: ['pts_added', 'qb_plays', 'epa_total', 'pass', 'run', 'exp_sack', 'penalty', 'sack'],
  max: [],
  rate: {},
  weighted: {
    // QBR is a per-play rating; a season value is plays-weighted, never a mean of weeks.
    qbr_total: ['qbr_total', 'qb_plays'],
    qbr_raw: ['qbr_raw', 'qb_plays'],
  },
  textConcat: [],
  // Omitted: rank and qualified are weekly standings, not a season stat.
};

// --- Snap counts (snap_counts) -------------------------------------------------------
// Snaps fold through `foldSnaps` (not `foldSection`): the published pct is a per-game
// share, so the season share is recomputed as total snaps / total team plays, recovering
// team plays per game as snaps / pct.

export const SECTION_SPECS = {
  box: BOX_SPEC,
  pfr: PFR_SPEC,
  ngs: NGS_SPEC,
  qbr: QBR_SPEC,
} as const;

export type SectionName = keyof typeof SECTION_SPECS;

// --- Aggregation ---------------------------------------------------------------------

const SEASON_TYPE_ORDER: Record<SeasonType, number> = { REG: 0, POST: 1 };

function sortLine(line: StatLine): StatLine {
  return Object.fromEntries(
    Object.entries(line).sort(([left], [right]) => left.localeCompare(right))
  );
}

/**
 * Games played: distinct `game_id`s in the group. The weekly box file carries no `games`
 * column (only the season-grain file does, which this build doesn't read), so the ledger's
 * games count has to come from the weekly rows themselves. Falls back to distinct weeks
 * when a file omits `game_id`.
 */
function countGames(rows: PlayerWeekRow[]): number {
  const keys = new Set<string>();
  for (const row of rows) {
    const gameId = row.stats.game_id?.trim();
    keys.add(gameId || `${row.season}-${row.week}-${row.team ?? ''}`);
  }
  return keys.size;
}

/** Folds one section's weekly rows into a season line, omitting every absent field. */
export function foldSection(rows: PlayerWeekRow[], spec: SectionSpec): StatLine {
  const sums = new Map<string, number>();
  const maxima = new Map<string, number>();
  const rateNumerators = new Map<string, number>();
  const rateDenominators = new Map<string, number>();
  const weightedSums = new Map<string, number>();
  const weights = new Map<string, number>();
  const text = new Map<string, string[]>();

  for (const row of rows) {
    for (const field of spec.sum) {
      const value = toNumber(row.stats[field]);
      if (value !== null) sums.set(field, (sums.get(field) ?? 0) + value);
    }
    for (const field of spec.max) {
      const value = toNumber(row.stats[field]);
      if (value !== null) maxima.set(field, Math.max(maxima.get(field) ?? value, value));
    }
    for (const [out, [numerator, denominator]] of Object.entries(spec.rate)) {
      const n = toNumber(row.stats[numerator]);
      const d = toNumber(row.stats[denominator]);
      if (n === null || d === null) continue;
      rateNumerators.set(out, (rateNumerators.get(out) ?? 0) + n);
      rateDenominators.set(out, (rateDenominators.get(out) ?? 0) + d);
    }
    for (const [out, [valueField, weightField]] of Object.entries(spec.weighted)) {
      const value = toNumber(row.stats[valueField]);
      const weight = toNumber(row.stats[weightField]);
      if (value === null || weight === null) continue;
      weightedSums.set(out, (weightedSums.get(out) ?? 0) + value * weight);
      weights.set(out, (weights.get(out) ?? 0) + weight);
    }
    for (const field of spec.textConcat) {
      const value = row.stats[field]?.trim();
      if (value) text.set(field, [...(text.get(field) ?? []), value]);
    }
  }

  const line: StatLine = {};
  for (const [field, value] of sums) line[field] = value;
  for (const [field, value] of maxima) line[field] = value;
  for (const [field, denominator] of rateDenominators) {
    if (denominator > 0) line[field] = (rateNumerators.get(field) ?? 0) / denominator;
  }
  for (const [field, weight] of weights) {
    if (weight > 0) line[field] = (weightedSums.get(field) ?? 0) / weight;
  }
  for (const [field, parts] of text) line[field] = parts.join(',');

  return Object.fromEntries(
    Object.entries(line).sort(([left], [right]) => left.localeCompare(right))
  );
}

interface SnapAccumulator {
  snaps: number;
  plays: number;
  sawSnap: boolean;
}

function emptySnapAccumulator(): SnapAccumulator {
  return { snaps: 0, plays: 0, sawSnap: false };
}

/**
 * Season snap line. nflverse stores only a per-game percentage, so team plays per game are
 * recovered as snaps / pct and the season share is `sum(snaps) / sum(plays)` — the same
 * correction `lib/nflverse/season-snaps.ts` uses, but per (player, team) and for REG and
 * POST separately. A unit with no snaps is omitted, not written as 0.
 */
function foldSnaps(rows: PlayerWeekRow[]): StatLine {
  const units: Record<'offense' | 'defense' | 'specialTeams', SnapAccumulator> = {
    offense: emptySnapAccumulator(),
    defense: emptySnapAccumulator(),
    specialTeams: emptySnapAccumulator(),
  };
  const pairs = [
    ['offense', 'offense_snaps', 'offense_pct'],
    ['defense', 'defense_snaps', 'defense_pct'],
    ['specialTeams', 'st_snaps', 'st_pct'],
  ] as const;

  for (const row of rows) {
    for (const [unit, snapsField, pctField] of pairs) {
      const snaps = toNumber(row.stats[snapsField]);
      const pct = toNumber(row.stats[pctField]);
      if (snaps === null || !Number.isInteger(snaps) || snaps < 0) continue;
      const target = units[unit];
      target.snaps += snaps;
      target.sawSnap = target.sawSnap || snaps > 0;
      if (snaps > 0 && pct !== null && pct > 0 && pct <= 1) target.plays += snaps / pct;
    }
  }

  const line: StatLine = {};
  const fields: Record<string, [SnapAccumulator, string]> = {
    offense_snaps: [units.offense, 'offense'],
    offense_pct: [units.offense, 'pct'],
    defense_snaps: [units.defense, 'defense'],
    defense_pct: [units.defense, 'pct'],
    st_snaps: [units.specialTeams, 'specialTeams'],
    st_pct: [units.specialTeams, 'pct'],
  };
  for (const [out, [unit, kind]] of Object.entries(fields)) {
    if (!unit.sawSnap) continue;
    if (kind === 'pct') {
      if (unit.plays > 0) line[out] = unit.snaps / unit.plays;
    } else {
      line[out] = unit.snaps;
    }
  }
  return line;
}

export interface PlayerSeasonRow {
  player_id: string;
  season: number;
  season_type: SeasonType;
  team: string | null;
  box?: StatLine;
  snaps?: StatLine;
  pfr?: StatLine;
  ngs?: StatLine;
  qbr?: StatLine;
}

export interface SeasonSections {
  box?: PlayerWeekRow[];
  snaps?: PlayerWeekRow[];
  pfr?: PlayerWeekRow[];
  ngs?: PlayerWeekRow[];
  qbr?: PlayerWeekRow[];
}

function groupKey(row: PlayerWeekRow): string {
  return `${row.playerId}\u0000${row.seasonType}\u0000${row.team ?? ''}`;
}

interface Group {
  playerId: string;
  season: number;
  seasonType: SeasonType;
  team: string | null;
  sections: SeasonSections;
}

/**
 * One season's weekly rows (already identity-resolved) → one row per
 * (player, season_type, team). A traded player yields a row per team, never a combined one.
 */
export function consolidateSeason(season: number, sections: SeasonSections): PlayerSeasonRow[] {
  const groups = new Map<string, Group>();
  const sectionNames = Object.keys(sections) as (keyof SeasonSections)[];

  for (const name of sectionNames) {
    for (const row of sections[name] ?? []) {
      if (row.season !== season) continue;
      const key = groupKey(row);
      const group = groups.get(key) ?? {
        playerId: row.playerId,
        season,
        seasonType: row.seasonType,
        team: row.team,
        sections: {},
      };
      (group.sections[name] ??= []).push(row);
      groups.set(key, group);
    }
  }

  const out: PlayerSeasonRow[] = [];
  for (const group of groups.values()) {
    // Sort each section's rows by a stable weekly key before folding, so the sums (and the
    // float accumulation in weighted means) are identical regardless of fetch/parse order.
    for (const rows of Object.values(group.sections)) {
      rows?.sort(
        (left: PlayerWeekRow, right: PlayerWeekRow) =>
          left.week - right.week ||
          (left.stats.game_id ?? '').localeCompare(right.stats.game_id ?? '') ||
          left.playerId.localeCompare(right.playerId)
      );
    }
    const result: PlayerSeasonRow = {
      player_id: group.playerId,
      season: group.season,
      season_type: group.seasonType,
      team: group.team,
    };
    if (group.sections.box?.length) {
      const box = foldSection(group.sections.box, BOX_SPEC);
      box.games = countGames(group.sections.box);
      result.box = sortLine(box);
    }
    if (group.sections.pfr?.length) result.pfr = foldSection(group.sections.pfr, PFR_SPEC);
    if (group.sections.ngs?.length) result.ngs = foldSection(group.sections.ngs, NGS_SPEC);
    if (group.sections.qbr?.length) result.qbr = foldSection(group.sections.qbr, QBR_SPEC);
    if (group.sections.snaps?.length) {
      const snaps = foldSnaps(group.sections.snaps);
      if (Object.keys(snaps).length) result.snaps = snaps;
    }
    out.push(result);
  }

  out.sort(
    (left, right) =>
      right.season - left.season ||
      SEASON_TYPE_ORDER[left.season_type] - SEASON_TYPE_ORDER[right.season_type] ||
      (left.team ?? '').localeCompare(right.team ?? '') ||
      left.player_id.localeCompare(right.player_id)
  );
  return out;
}

export interface PlayerSeasonsFile {
  schema_version: number;
  player_id: string;
  seasons: Omit<PlayerSeasonRow, 'player_id'>[];
}

/**
 * One player's career ledger from every consolidated season row available. The build
 * assembles this from the season checkpoints on disk, so a run that rebuilds only the
 * current season still rewrites a complete career.
 */
export function buildPlayerSeasonsFile(
  playerId: string,
  rows: PlayerSeasonRow[],
  schemaVersion: number
): PlayerSeasonsFile {
  const seasons = rows
    .filter((row) => row.player_id === playerId)
    .sort(
      (left, right) =>
        right.season - left.season ||
        SEASON_TYPE_ORDER[left.season_type] - SEASON_TYPE_ORDER[right.season_type] ||
        (left.team ?? '').localeCompare(right.team ?? '')
    )
    .map(({ player_id: _playerId, ...row }) => row);
  return { schema_version: schemaVersion, player_id: playerId, seasons };
}

export interface SeasonCheckpoint {
  schema_version: number;
  season: number;
  rows: PlayerSeasonRow[];
}
