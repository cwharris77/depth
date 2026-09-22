// The per-source header contract for every nflverse CSV the ingest fetches (DEP-579).
// nflverse has changed its shape twice already — the `player_stats` release tag became
// `stats_player`, and `stats_team_reg` publishes `fg_made_50_59` where the table reads
// `fg_made_50_` — and both failures are silent: a renamed/removed column reads as `''`
// → `null` through the transforms, and every fetch treats a 404 as "this source doesn't
// publish that season". This module makes a *shape* change loud: the ingest checks the
// header before transforming, so a renamed column records a failure naming the column
// and writes none of that source-season's rows (the all-or-nothing posture DEP-544 and
// DEP-577 rely on for the R2 stat files).
//
// `columns` is the required set; `optionalColumns` are legitimately absent (each needs a
// stated reason); `columnAliases` maps a deliberate upstream rename
// (`newName -> contractName`) in one line. Raw Layer-1 sources derive their contract
// from `raw-tables.generated.ts`, so the required list is exactly the stored schema and
// can't drift from the transform. `knownColumns` (raw sources only) is the full set the
// source is known to publish, so an upstream *addition* is reportable once per run.

import {
  playerRawTables,
  playRawTables,
  type PlayerRawSpec,
  type PlayRawSpec,
} from './raw-tables.generated';
import { NUMERIC_COLUMNS as PLAYER_STATS_NUMERIC_COLUMNS } from './transform';
import { PBP_REQUIRED_COLUMNS, PBP_CHARTED_COLUMNS } from './line-metrics';
import {
  NUMERIC_COLUMNS as TEAM_STATS_NUMERIC_COLUMNS,
  DISTANCE_LIST_COLUMNS as TEAM_STATS_DISTANCE_LIST_COLUMNS,
  teamStatsSourceColumn,
} from './team-stats';

export interface SourceContract {
  /** Stable identifier for failure messages and the once-per-run new-column log. */
  id: string;
  /** Columns the transform reads by name. Each must be present unless in optionalColumns. */
  columns: readonly string[];
  /** Columns that may legitimately be absent. Every entry needs a stated reason. */
  optionalColumns?: readonly string[];
  /** Deliberate upstream renames: header name -> contract column name. */
  columnAliases?: Readonly<Record<string, string>>;
  /**
   * The full set of columns this source is known to publish, when we have it (raw
   * sources carry it from the generated spec). Used only to make the new-column log
   * meaningful; when absent the check reports nothing new.
   */
  knownColumns?: readonly string[];
}

export type HeaderCheck = { ok: true } | { ok: false; missing: string[] };

/**
 * Every contract column is required unless it is listed in `optionalColumns` or a header
 * column aliases it. Extra header columns are ignored (nflverse adds columns over time).
 */
export function checkHeader(
  contract: SourceContract,
  headerColumns: readonly string[]
): HeaderCheck {
  const present = new Set(headerColumns);
  for (const [upstream, contractName] of Object.entries(contract.columnAliases ?? {})) {
    if (present.has(upstream)) present.add(contractName);
  }
  const optional = new Set(contract.optionalColumns ?? []);
  const missing = contract.columns.filter(
    (column) => !present.has(column) && !optional.has(column)
  );
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/**
 * `checkHeader` as a throw, so a failed check aborts before any row is transformed.
 * `loggedNewColumns`, when passed, reports an upstream addition once per process for a
 * source fetched across several seasons/files (the source contract knows its full
 * column set).
 */
export function assertHeader(
  contract: SourceContract,
  headerColumns: readonly string[],
  loggedNewColumns?: Set<string>
): void {
  const result = checkHeader(contract, headerColumns);
  if (!result.ok) {
    throw new Error(
      `${contract.id}: nflverse source header changed — missing column(s): ` +
        result.missing.join(', ') +
        ' (renamed or dropped upstream; none of this source-season was written)'
    );
  }
  if (loggedNewColumns && !loggedNewColumns.has(contract.id)) {
    const extra = unexpectedColumns(contract, headerColumns);
    if (extra.length) {
      loggedNewColumns.add(contract.id);
      console.log(
        `${contract.id}: nflverse added source column(s) not in the contract: ${extra.join(', ')}`
      );
    }
  }
}

/**
 * Header columns the contract does not know about — an upstream *addition*. Only
 * meaningful for a contract that carries `knownColumns` (the raw Layer-1 sources, which
 * persist every column, so an addition is a regeneration candidate); a curated source
 * ignores unread columns by design and returns `[]`.
 */
export function unexpectedColumns(
  contract: SourceContract,
  headerColumns: readonly string[]
): string[] {
  if (!contract.knownColumns) return [];
  const known = new Set<string>([...contract.columns, ...(contract.optionalColumns ?? [])]);
  for (const column of contract.knownColumns) known.add(column);
  for (const upstream of Object.keys(contract.columnAliases ?? {})) known.add(upstream);
  return headerColumns.filter((column) => !known.has(column));
}

// --- Raw Layer-1 sources -------------------------------------------------------------
// Derived from the generated schema so the required set is exactly the stored columns.

function findPlayerSpec(table: string): PlayerRawSpec {
  const spec = playerRawTables.find((raw) => raw.table === table);
  if (!spec) throw new Error(`missing generated player raw-table spec: ${table}`);
  return spec;
}

function findPlaySpec(table: string): PlayRawSpec {
  const spec = playRawTables.find((raw) => raw.table === table);
  if (!spec) throw new Error(`missing generated play raw-table spec: ${table}`);
  return spec;
}

function playerRawContract(id: string, table: string): SourceContract {
  const spec = findPlayerSpec(table);
  const structural = [spec.idColumn, 'season'];
  if (spec.grain === 'week') structural.push(spec.weekColumn ?? 'week');
  // `season_type` lives in the source's identity block (the generated spec excludes it),
  // so it isn't required — the transform reads it only as a REG fallback.
  const columns = [...new Set([...structural, ...spec.columns.map((column) => column.name)])];
  return { id, columns, optionalColumns: ['season_type'], knownColumns: columns };
}

function playRawContract(id: string, table: string): SourceContract {
  const spec = findPlaySpec(table);
  const columns = [...new Set([...spec.keyColumns, ...spec.columns.map((column) => column.name)])];
  return { id, columns, knownColumns: columns };
}

/**
 * The contract per ingest source id. Partitioned raw sources (pfr_advstats,
 * nextgen_stats) split one table across several family files; the ingest checks the
 * union of the family headers against the table's (union) contract, so a renamed
 * family-specific column is still caught.
 */
export const SOURCE_CONTRACTS = {
  players: {
    id: 'players',
    // players.csv — the GSIS/PFR -> ESPN identity crosswalk.
    columns: ['gsis_id', 'pfr_id', 'espn_id'],
  } satisfies SourceContract,
  games: {
    id: 'games',
    // nfldata/games.csv — schedules + games.
    columns: [
      'game_id',
      'season',
      'game_type',
      'week',
      'gameday',
      'gametime',
      'home_team',
      'away_team',
      'home_score',
      'away_score',
      'location',
      'away_moneyline',
      'home_moneyline',
      'spread_line',
      'away_spread_odds',
      'home_spread_odds',
      'total_line',
      'under_odds',
      'over_odds',
    ],
  } satisfies SourceContract,
  stats_player_reg: {
    id: 'stats_player_reg',
    // stats_player_reg_<season>.csv — the canonical player_stats box score.
    columns: ['player_id', 'season', 'season_type', 'recent_team', ...PLAYER_STATS_NUMERIC_COLUMNS],
  } satisfies SourceContract,
  stats_team: {
    id: 'stats_team',
    // stats_team_reg_<season>.csv — team_season_stats. The source column names are used
    // (teamStatsSourceColumn), not the table's, so a source rename is caught here rather
    // than silently landing a null (the fg_made_50_59 case).
    columns: [
      'team',
      'season',
      'season_type',
      ...TEAM_STATS_NUMERIC_COLUMNS.map(teamStatsSourceColumn),
      ...TEAM_STATS_DISTANCE_LIST_COLUMNS.map(teamStatsSourceColumn),
    ],
  } satisfies SourceContract,
  snap_counts: {
    id: 'snap_counts',
    // snap_counts_<season>.csv — recent snap summaries + season snap totals.
    columns: [
      'game_id',
      'pfr_player_id',
      'season',
      'week',
      'team',
      'game_type',
      'offense_snaps',
      'offense_pct',
      'defense_snaps',
      'defense_pct',
      'st_snaps',
      'st_pct',
    ],
  } satisfies SourceContract,
  pbp_participation: {
    id: 'pbp_participation',
    // pbp_participation_<season>.csv — the streamed formation fold.
    columns: [
      'nflverse_game_id',
      'possession_team',
      'offense_formation',
      'offense_personnel',
      'defense_personnel',
    ],
  } satisfies SourceContract,
  pbp: {
    id: 'pbp',
    // play_by_play_<season>.csv — the streamed offensive-line fold (line-metrics.ts).
    // The three pressure columns are FTN-charted and legitimately absent outside the
    // charted era; their absence degrades the pressure metrics to null, never zero.
    columns: [...PBP_REQUIRED_COLUMNS],
    optionalColumns: [...PBP_CHARTED_COLUMNS],
  } satisfies SourceContract,
  stats_player_regpost: playerRawContract('stats_player_regpost', 'nflverse_player_season'),
  stats_player_week: playerRawContract('stats_player_week', 'nflverse_player_week'),
  pfr_advstats: playerRawContract('pfr_advstats', 'pfr_player_week'),
  nextgen_stats: playerRawContract('nextgen_stats', 'ngs_player_week'),
  ftn_charting: playRawContract('ftn_charting', 'ftn_play'),
  espn_qbr_week: playerRawContract('espn_qbr_week', 'espn_qbr_week'),
  espn_qbr_season: playerRawContract('espn_qbr_season', 'espn_qbr_season'),
} satisfies Record<string, SourceContract>;

export type SourceId = keyof typeof SOURCE_CONTRACTS;

export function sourceContract(id: SourceId): SourceContract {
  return SOURCE_CONTRACTS[id];
}
