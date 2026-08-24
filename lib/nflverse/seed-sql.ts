// Serializes nflverse-sourced rows into committed Postgres seed scripts (supabase/seed-
// nflverse.sql, supabase/seed-roster-history.sql) so a local `supabase db reset`
// restores nflverse data without re-running the live ingest (scripts/ingest-nflverse.mts
// and scripts/ingest-nflverse-rosters.mts SEED_OUT modes call these). Column lists
// mirror the live upserts in those scripts — keep them in sync.
//
// player_stats FKs to `players` (ESPN-keyed), which SEED_OUT mode never queries (no DB
// touched, matching ingest-espn.mts's seed mode) — callers must pre-filter rows to ids
// this seed can see, via extractPlayerIds() below, parsed from the already-committed
// ESPN seed (supabase/seed.sql). roster_history has no such FK (nflverse-keyed by
// gsis_id, 20260801031305_add_roster_history.sql) and needs no filtering.
import { insertStatement } from '@/lib/utils/seed-sql';
import { tables } from '@/lib/supabase/tables';
import type { PlayerStatsInsert } from './transform';
import type { ScheduleInsert, GameInsert } from './games';
import type { RosterHistoryInsert } from './roster-history';
import type { FormationTally } from './participation';
import type { DefenseFormationTally } from './defense-participation';
import type { TeamStatsInsert } from './team-stats';
import type { TeamRecordInsert } from './records';
import type { RecentSnapSummaryInsert } from './snap-counts';

export type UnitFormationTally =
  (FormationTally & { unit: 'offense' }) | (DefenseFormationTally & { unit: 'defense' });

// Pulls every player id out of the committed ESPN seed's `insert into players (id, ...)
// values` block. Not a general SQL parser — seed.sql's players insert is always this
// module's sibling insertStatement() output (single-quoted, ''-escaped string
// literals), never arbitrary SQL, so this only has to understand that one fixed shape.
// Returns an empty set (never throws) if the block isn't found, so a caller that hasn't
// run gen:espn-seed yet gets "everything skipped" rather than a crash.
export function extractPlayerIds(seedSql: string): Set<string> {
  const block = seedSql.match(/insert into players \([^)]*\) values\n([\s\S]*?)\non conflict/);
  const ids = new Set<string>();
  if (!block) return ids;
  const rowIdRe = /^\s*\(\s*'((?:[^'\\]|'')*)'/gm;
  let m: RegExpExecArray | null;
  while ((m = rowIdRe.exec(block[1])) !== null) {
    ids.add(m[1].replace(/''/g, "'"));
  }
  return ids;
}

export function buildPlayerStatsSeedSql(rows: PlayerStatsInsert[]): string {
  return insertStatement(
    tables.playerStats,
    [
      'player_id',
      'season',
      'season_type',
      'team_id',
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
    ],
    rows,
    'player_id,season,season_type'
  );
}

export function buildRecentSnapSummariesSeedSql(rows: RecentSnapSummaryInsert[]): string {
  return insertStatement(
    tables.playerRecentSnaps,
    [
      'team_id',
      'season',
      'player_id',
      'window_start_week',
      'window_end_week',
      'window_game_ids',
      'games',
      'offense_snaps',
      'offense_pct',
      'defense_snaps',
      'defense_pct',
      'special_teams_snaps',
      'special_teams_pct',
      'source',
    ],
    rows,
    'team_id,season,player_id'
  );
}

// schedules must precede games — games' composite FKs reference schedules(team_id,
// season), same ordering the live ingest (ingestGames in ingest-nflverse.mts) enforces.
export function buildSchedulesAndGamesSeedSql(
  schedules: ScheduleInsert[],
  games: GameInsert[]
): string {
  const parts = [
    insertStatement('schedules', ['team_id', 'season'], schedules, 'team_id,season'),
    insertStatement(
      tables.games,
      [
        'game_id',
        'season',
        'game_type',
        'week',
        'gameday',
        'gametime',
        'home_team_id',
        'away_team_id',
        'home_score',
        'away_score',
      ],
      games,
      'game_id'
    ),
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildTeamFormationsSeedSql(tallies: UnitFormationTally[]): string {
  return insertStatement(
    tables.teamFormations,
    ['team_id', 'season', 'unit', 'rank', 'alignment', 'personnel', 'pct'],
    tallies,
    'team_id,season,unit,rank'
  );
}

export function buildRosterHistorySeedSql(rows: RosterHistoryInsert[]): string {
  return insertStatement(
    tables.rosterHistory,
    [
      'season',
      'team_id',
      'gsis_id',
      'espn_id',
      'name',
      'number',
      'position',
      'college',
      'height',
      'weight',
      'headshot_url',
      'depth_rank',
      'player_order',
    ],
    rows,
    'season,team_id,gsis_id'
  );
}

export function buildTeamStatsSeedSql(rows: TeamStatsInsert[]): string {
  return insertStatement(
    tables.teamSeasonStats,
    [
      'team_id',
      'season',
      'season_type',
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
      'fg_made_list',
      'fg_missed_list',
      'fg_blocked_list',
      'fg_made_distance',
      'fg_missed_distance',
      'fg_blocked_distance',
      'gwfg_distance_list',
    ],
    rows,
    'team_id,season'
  );
}

// The record half of `team_stats` (DEP-146 re-own: nflverse owns W-L, ESPN keeps only
// playoff_seed). Deliberately omits playoff_seed so this insert can't clobber the column
// the ESPN seed writes for the same row -- the seed mirrors the live path's column-scoped
// upsert. Note the division/conference splits are zeroed in seed output: SEED_OUT mode has
// no `teams` table to read alignments from (see ingestTeamRecords).
export function buildTeamRecordsSeedSql(rows: TeamRecordInsert[]): string {
  return insertStatement(
    tables.teamStats,
    [
      'team_id',
      'season',
      'overall_wins',
      'overall_losses',
      'overall_ties',
      'win_percent',
      'home_wins',
      'home_losses',
      'road_wins',
      'road_losses',
      'division_wins',
      'division_losses',
      'conference_wins',
      'conference_losses',
      'points_for',
      'points_against',
      'point_differential',
      'streak',
    ],
    rows,
    'team_id,season'
  );
}
