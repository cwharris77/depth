// Turns nflverse's stats_player_reg_<season>.csv rows into player_stats upsert rows.
// Pure: no fetch, no DB. Joins each row's gsis_id (nflverse's key) to our players.id
// (ESPN athlete id) via the crosswalk built in crosswalk.ts, and drops -- with a
// count, never a guess -- rows that don't resolve to a known player (locked decision,
// docs/superpowers/specs/2026-07-07-nflverse-ingestion-and-player-stats-design.md).

export interface PlayerStatsInsert {
  player_id: string;
  season: number;
  season_type: string;
  games: number | null;
  completions: number | null;
  attempts: number | null;
  passing_yards: number | null;
  passing_tds: number | null;
  passing_interceptions: number | null;
  carries: number | null;
  rushing_yards: number | null;
  rushing_tds: number | null;
  receptions: number | null;
  targets: number | null;
  receiving_yards: number | null;
  receiving_tds: number | null;
  def_tackles_solo: number | null;
  def_sacks: number | null;
  def_interceptions: number | null;
  fg_made: number | null;
  fg_att: number | null;
}

// '' -> null (nflverse's empty-cell convention for "not applicable to this position"),
// else Number(...); a malformed cell (NaN) also degrades to null rather than throwing.
function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const NUMERIC_COLUMNS = [
  'games',
  'completions',
  'attempts',
  'passing_yards',
  'passing_tds',
  'passing_interceptions',
  'carries',
  'rushing_yards',
  'rushing_tds',
  'receptions',
  'targets',
  'receiving_yards',
  'receiving_tds',
  'def_tackles_solo',
  'def_sacks',
  'def_interceptions',
  'fg_made',
  'fg_att',
] as const;

export function toPlayerStatsRows(
  statsCsvRows: Record<string, string>[],
  crosswalk: Map<string, string>,
  knownPlayerIds: Set<string>
): { rows: PlayerStatsInsert[]; skipped: number } {
  const rows: PlayerStatsInsert[] = [];
  let skipped = 0;

  for (const row of statsCsvRows) {
    const gsisId = row.player_id?.trim();
    const espnId = gsisId ? crosswalk.get(gsisId) : undefined;
    if (!espnId || !knownPlayerIds.has(espnId)) {
      skipped++;
      continue;
    }
    const season = Number(row.season);
    if (Number.isNaN(season)) {
      skipped++;
      continue;
    }

    const numeric = Object.fromEntries(
      NUMERIC_COLUMNS.map((col) => [col, toNullableNumber(row[col])])
    ) as Record<(typeof NUMERIC_COLUMNS)[number], number | null>;

    rows.push({
      player_id: espnId,
      season,
      season_type: row.season_type?.trim() || 'REG',
      ...numeric,
    });
  }

  return { rows, skipped };
}
