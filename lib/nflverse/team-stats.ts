// Turns nflverse's stats_team_reg_<season>.csv rows into team_season_stats upsert rows.
// Pure: no fetch, no DB. Resolves nflverse team codes to internal IDs via the
// injectable resolveTeamCode function, coerces scalar blanks to null, and parses
// the seven semicolon-delimited distance-list columns into int[].
import { resolveTeamCode } from './team-codes';

export interface TeamStatsInsert {
  team_id: string;
  season: number;
  season_type: string;
  updated_at?: string;
  games: number | null;

  completions: number | null;
  attempts: number | null;
  passing_yards: number | null;
  passing_tds: number | null;
  passing_interceptions: number | null;
  sacks_suffered: number | null;
  sack_yards_lost: number | null;
  sack_fumbles: number | null;
  sack_fumbles_lost: number | null;
  passing_air_yards: number | null;
  passing_yards_after_catch: number | null;
  passing_first_downs: number | null;
  passing_epa: number | null;
  passing_cpoe: number | null;
  passing_2pt_conversions: number | null;
  passing_10: number | null;
  passing_16: number | null;
  passing_20: number | null;
  passing_40: number | null;

  carries: number | null;
  rushing_yards: number | null;
  rushing_tds: number | null;
  rushing_fumbles: number | null;
  rushing_fumbles_lost: number | null;
  rushing_first_downs: number | null;
  rushing_epa: number | null;
  rushing_2pt_conversions: number | null;
  rushing_10: number | null;
  rushing_12: number | null;
  rushing_20: number | null;
  rushing_40: number | null;

  receptions: number | null;
  targets: number | null;
  receiving_yards: number | null;
  receiving_tds: number | null;
  receiving_fumbles: number | null;
  receiving_fumbles_lost: number | null;
  receiving_air_yards: number | null;
  receiving_yards_after_catch: number | null;
  receiving_first_downs: number | null;
  receiving_epa: number | null;
  receiving_2pt_conversions: number | null;
  receiving_10: number | null;
  receiving_16: number | null;
  receiving_20: number | null;
  receiving_40: number | null;

  special_teams_tds: number | null;

  def_tackles_solo: number | null;
  def_tackles_with_assist: number | null;
  def_tackle_assists: number | null;
  def_tackles_for_loss: number | null;
  def_tackles_for_loss_yards: number | null;
  def_fumbles_forced: number | null;
  def_sacks: number | null;
  def_sack_yards: number | null;
  def_qb_hits: number | null;
  def_interceptions: number | null;
  def_interception_yards: number | null;
  def_pass_defended: number | null;
  def_tds: number | null;
  def_fumbles: number | null;
  def_safeties: number | null;

  misc_yards: number | null;
  fumble_recovery_own: number | null;
  fumble_recovery_yards_own: number | null;
  fumble_recovery_opp: number | null;
  fumble_recovery_yards_opp: number | null;
  fumble_recovery_tds: number | null;
  penalties: number | null;
  penalty_yards: number | null;
  timeouts: number | null;
  fumbles_forced_by_opp: number | null;
  fumbles_not_forced: number | null;
  fumbles_out_of_bounds: number | null;
  fumbles_total: number | null;
  fumbles_lost_total: number | null;

  punt_returns: number | null;
  punt_return_yards: number | null;
  kickoff_returns: number | null;
  kickoff_return_yards: number | null;

  fg_made: number | null;
  fg_att: number | null;
  fg_missed: number | null;
  fg_blocked: number | null;
  fg_long: number | null;
  fg_pct: number | null;
  fg_made_0_19: number | null;
  fg_made_20_29: number | null;
  fg_made_30_39: number | null;
  fg_made_40_49: number | null;
  fg_made_50_: number | null;
  fg_missed_0_19: number | null;
  fg_missed_20_29: number | null;
  fg_missed_30_39: number | null;
  fg_missed_40_49: number | null;
  fg_missed_50_: number | null;

  pat_made: number | null;
  pat_att: number | null;
  pat_missed: number | null;
  pat_blocked: number | null;
  pat_pct: number | null;

  gwfg_made: number | null;
  gwfg_att: number | null;
  gwfg_missed: number | null;
  gwfg_blocked: number | null;

  pt_att: number | null;
  pt_blocked: number | null;
  pt_long: number | null;
  pt_yards: number | null;
  pt_inside_20: number | null;
  pt_out_of_bounds: number | null;
  pt_downed: number | null;
  pt_touchback: number | null;
  pt_fair_caught: number | null;
  pt_returned: number | null;
  pt_return_yards: number | null;
  pt_return_tds: number | null;
  pt_net_yards: number | null;

  fg_made_list: number[];
  fg_missed_list: number[];
  fg_blocked_list: number[];
  fg_made_distance: number[];
  fg_missed_distance: number[];
  fg_blocked_distance: number[];
  gwfg_distance_list: number[];
}

function toNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Semicolon-delimited distance list (e.g. "42;50;29;47") -> int[].
// '' / blank -> [].
export function parseDistanceList(raw: string | undefined): number[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

const NUMERIC_COLUMNS = [
  'games',
  'completions',
  'attempts',
  'passing_yards',
  'passing_tds',
  'passing_interceptions',
  'sacks_suffered',
  'sack_yards_lost',
  'sack_fumbles',
  'sack_fumbles_lost',
  'passing_air_yards',
  'passing_yards_after_catch',
  'passing_first_downs',
  'passing_epa',
  'passing_cpoe',
  'passing_2pt_conversions',
  'passing_10',
  'passing_16',
  'passing_20',
  'passing_40',
  'carries',
  'rushing_yards',
  'rushing_tds',
  'rushing_fumbles',
  'rushing_fumbles_lost',
  'rushing_first_downs',
  'rushing_epa',
  'rushing_2pt_conversions',
  'rushing_10',
  'rushing_12',
  'rushing_20',
  'rushing_40',
  'receptions',
  'targets',
  'receiving_yards',
  'receiving_tds',
  'receiving_fumbles',
  'receiving_fumbles_lost',
  'receiving_air_yards',
  'receiving_yards_after_catch',
  'receiving_first_downs',
  'receiving_epa',
  'receiving_2pt_conversions',
  'receiving_10',
  'receiving_16',
  'receiving_20',
  'receiving_40',
  'special_teams_tds',
  'def_tackles_solo',
  'def_tackles_with_assist',
  'def_tackle_assists',
  'def_tackles_for_loss',
  'def_tackles_for_loss_yards',
  'def_fumbles_forced',
  'def_sacks',
  'def_sack_yards',
  'def_qb_hits',
  'def_interceptions',
  'def_interception_yards',
  'def_pass_defended',
  'def_tds',
  'def_fumbles',
  'def_safeties',
  'misc_yards',
  'fumble_recovery_own',
  'fumble_recovery_yards_own',
  'fumble_recovery_opp',
  'fumble_recovery_yards_opp',
  'fumble_recovery_tds',
  'penalties',
  'penalty_yards',
  'timeouts',
  'fumbles_forced_by_opp',
  'fumbles_not_forced',
  'fumbles_out_of_bounds',
  'fumbles_total',
  'fumbles_lost_total',
  'punt_returns',
  'punt_return_yards',
  'kickoff_returns',
  'kickoff_return_yards',
  'fg_made',
  'fg_att',
  'fg_missed',
  'fg_blocked',
  'fg_long',
  'fg_pct',
  'fg_made_0_19',
  'fg_made_20_29',
  'fg_made_30_39',
  'fg_made_40_49',
  'fg_made_50_',
  'fg_missed_0_19',
  'fg_missed_20_29',
  'fg_missed_30_39',
  'fg_missed_40_49',
  'fg_missed_50_',
  'pat_made',
  'pat_att',
  'pat_missed',
  'pat_blocked',
  'pat_pct',
  'gwfg_made',
  'gwfg_att',
  'gwfg_missed',
  'gwfg_blocked',
  'pt_att',
  'pt_blocked',
  'pt_long',
  'pt_yards',
  'pt_inside_20',
  'pt_out_of_bounds',
  'pt_downed',
  'pt_touchback',
  'pt_fair_caught',
  'pt_returned',
  'pt_return_yards',
  'pt_return_tds',
  'pt_net_yards',
] as const;

const DISTANCE_LIST_COLUMNS = [
  'fg_made_list',
  'fg_missed_list',
  'fg_blocked_list',
  'fg_made_distance',
  'fg_missed_distance',
  'fg_blocked_distance',
  'gwfg_distance_list',
] as const;

export function toTeamStatsRows(
  csvRows: Record<string, string>[],
  resolveCode: (code: string) => string | null = resolveTeamCode,
  options: { updatedAt?: string } = {}
): { rows: TeamStatsInsert[]; skipped: number } {
  const rows: TeamStatsInsert[] = [];
  let skipped = 0;

  for (const row of csvRows) {
    const teamCode = row.team?.trim();
    if (!teamCode) {
      skipped++;
      continue;
    }

    const teamId = resolveCode(teamCode);
    if (!teamId) {
      skipped++;
      continue;
    }

    const season = Number(row.season);
    if (Number.isNaN(season)) {
      skipped++;
      continue;
    }

    const seasonType = (row.season_type ?? 'REG').trim();
    if (seasonType !== 'REG') {
      skipped++;
      continue;
    }

    const numeric = Object.fromEntries(
      NUMERIC_COLUMNS.map((col) => [col, toNullableNumber(row[col])])
    ) as Record<(typeof NUMERIC_COLUMNS)[number], number | null>;

    const distanceLists = Object.fromEntries(
      DISTANCE_LIST_COLUMNS.map((col) => [col, parseDistanceList(row[col])])
    ) as Record<(typeof DISTANCE_LIST_COLUMNS)[number], number[]>;

    rows.push({
      team_id: teamId,
      season,
      season_type: seasonType,
      ...(options.updatedAt ? { updated_at: options.updatedAt } : {}),
      ...numeric,
      ...distanceLists,
    });
  }

  return { rows, skipped };
}
