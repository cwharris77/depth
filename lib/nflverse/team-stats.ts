// Turns nflverse's stats_team_reg_<season>.csv rows into team_season_stats upsert rows.
// Pure: no fetch, no DB. Resolves each row's `team` column to a known team id via
// resolveTeamCode (with historic relocation codes), and drops -- with a count, never a
// guess -- rows that don't resolve to a known team.
//
// Fetch/parse are separate steps (invariant): a fetch failure throws before parse runs,
// a parse failure never corrupts the DB write. This module is the pure parse step.

import { resolveTeamCode } from './team-codes';

export interface TeamSeasonStatsInsert {
  team_id: string;
  season: number;
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
}

// '' -> null (nflverse's empty-cell convention for "not applicable to this team"),
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
] as const;

export function toTeamStatsRows(
  statsCsvRows: Record<string, string>[]
): { rows: TeamSeasonStatsInsert[]; skipped: number } {
  const rows: TeamSeasonStatsInsert[] = [];
  let skipped = 0;

  for (const row of statsCsvRows) {
    const teamCode = row.team?.trim();
    const teamId = teamCode ? resolveTeamCode(teamCode) : null;
    if (!teamId) {
      skipped++;
      continue;
    }

    const season = Number(row.season);
    if (Number.isNaN(season)) {
      skipped++;
      continue;
    }

    // Only regular season rows are ingested (POST rows exist but we don't write them).
    const seasonType = row.season_type?.trim();
    if (seasonType !== 'REG') {
      skipped++;
      continue;
    }

    const numeric = Object.fromEntries(
      NUMERIC_COLUMNS.map((col) => [col, toNullableNumber(row[col])])
    ) as Record<(typeof NUMERIC_COLUMNS)[number], number | null>;

    rows.push({
      team_id: teamId,
      season,
      ...numeric,
    });
  }

  return { rows, skipped };
}