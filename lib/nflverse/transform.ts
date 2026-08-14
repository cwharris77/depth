// Turns nflverse's stats_player_reg_<season>.csv rows into player_stats upsert rows.
// Pure: no fetch, no DB. Joins each row's gsis_id (nflverse's key) to our players.id
// (ESPN athlete id) via the crosswalk built in crosswalk.ts, and drops -- with a
// count, never a guess -- rows whose gsis_id has no crosswalk match at all. With
// `requireCurrentRoster` (default true, the weekly job's behavior), a crosswalk match
// still isn't enough -- the resolved ESPN id must also be in `knownPlayerIds`
// (`players`, current-roster-scoped). A `--seasons` historic backfill passes
// `requireCurrentRoster: false` to accept any crosswalk match regardless of `players`
// membership (locked decision, vault spec
// 2026-08-13-player-stats-historic-identity-design.md).
//
// `recent_team` (nflverse's own team code for that season/season_type, e.g. `LAR`) is
// resolved to our team_id via the caller-supplied `resolveTeamCode` (same function
// ingest-nflverse.mts already passes to toScheduleAndGameRows -- lib/nflverse/team-
// codes.ts). An unresolvable or missing code degrades the row's team_id to null rather
// than dropping the whole stats row (DEP-202; AGENTS.md invariant 6) -- team is display
// context here, not row identity.

export interface PlayerStatsInsert {
  player_id: string;
  season: number;
  season_type: string;
  team_id: string | null;
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
  knownPlayerIds: Set<string>,
  resolveTeamCode: (code: string) => string | null,
  opts?: { requireCurrentRoster?: boolean }
): { rows: PlayerStatsInsert[]; skipped: number } {
  const requireCurrentRoster = opts?.requireCurrentRoster ?? true;
  const rows: PlayerStatsInsert[] = [];
  let skipped = 0;

  for (const row of statsCsvRows) {
    const gsisId = row.player_id?.trim();
    const espnId = gsisId ? crosswalk.get(gsisId) : undefined;
    if (!espnId || (requireCurrentRoster && !knownPlayerIds.has(espnId))) {
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

    const teamCode = row.recent_team?.trim();
    rows.push({
      player_id: espnId,
      season,
      season_type: row.season_type?.trim() || 'REG',
      team_id: teamCode ? resolveTeamCode(teamCode) : null,
      ...numeric,
    });
  }

  return { rows, skipped };
}
