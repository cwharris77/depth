// GENERATED — do not edit by hand. Run `npm run gen:nflverse-raw-tables`.
export type RawColumnType = 'text' | 'numeric' | 'boolean';
export interface RawColumn {
  name: string;
  type: RawColumnType;
}
export interface PlayerRawSpec {
  table: string;
  source: string;
  grain: 'season' | 'week';
  idColumn: string;
  idKind: 'gsis' | 'pfr' | 'espn';
  weekColumn?: string;
  partition?: string;
  seasonType?: string;
  columns: RawColumn[];
}
export interface PlayRawSpec {
  table: string;
  source: string;
  grain: 'play';
  keyColumns: string[];
  columns: RawColumn[];
}

export const playerRawTables: PlayerRawSpec[] = [
  {
    table: 'nflverse_player_season',
    source: 'nflverse-player-season',
    grain: 'season',
    idColumn: 'player_id',
    idKind: 'gsis',
    seasonType: 'REG+POST',
    columns: [
      {
        name: 'player_name',
        type: 'text',
      },
      {
        name: 'player_display_name',
        type: 'text',
      },
      {
        name: 'position',
        type: 'text',
      },
      {
        name: 'position_group',
        type: 'text',
      },
      {
        name: 'headshot_url',
        type: 'text',
      },
      {
        name: 'recent_team',
        type: 'text',
      },
      {
        name: 'games',
        type: 'numeric',
      },
      {
        name: 'completions',
        type: 'numeric',
      },
      {
        name: 'attempts',
        type: 'numeric',
      },
      {
        name: 'passing_yards',
        type: 'numeric',
      },
      {
        name: 'passing_tds',
        type: 'numeric',
      },
      {
        name: 'passing_interceptions',
        type: 'numeric',
      },
      {
        name: 'sacks_suffered',
        type: 'numeric',
      },
      {
        name: 'sack_yards_lost',
        type: 'numeric',
      },
      {
        name: 'sack_fumbles',
        type: 'numeric',
      },
      {
        name: 'sack_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'passing_air_yards',
        type: 'numeric',
      },
      {
        name: 'passing_yards_after_catch',
        type: 'numeric',
      },
      {
        name: 'passing_first_downs',
        type: 'numeric',
      },
      {
        name: 'passing_epa',
        type: 'numeric',
      },
      {
        name: 'passing_cpoe',
        type: 'numeric',
      },
      {
        name: 'passing_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'pacr',
        type: 'numeric',
      },
      {
        name: 'passing_10',
        type: 'numeric',
      },
      {
        name: 'passing_16',
        type: 'numeric',
      },
      {
        name: 'passing_20',
        type: 'numeric',
      },
      {
        name: 'passing_40',
        type: 'numeric',
      },
      {
        name: 'carries',
        type: 'numeric',
      },
      {
        name: 'rushing_yards',
        type: 'numeric',
      },
      {
        name: 'rushing_tds',
        type: 'numeric',
      },
      {
        name: 'rushing_fumbles',
        type: 'numeric',
      },
      {
        name: 'rushing_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'rushing_first_downs',
        type: 'numeric',
      },
      {
        name: 'rushing_epa',
        type: 'numeric',
      },
      {
        name: 'rushing_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'rushing_10',
        type: 'numeric',
      },
      {
        name: 'rushing_12',
        type: 'numeric',
      },
      {
        name: 'rushing_20',
        type: 'numeric',
      },
      {
        name: 'rushing_40',
        type: 'numeric',
      },
      {
        name: 'receptions',
        type: 'numeric',
      },
      {
        name: 'targets',
        type: 'numeric',
      },
      {
        name: 'receiving_yards',
        type: 'numeric',
      },
      {
        name: 'receiving_tds',
        type: 'numeric',
      },
      {
        name: 'receiving_fumbles',
        type: 'numeric',
      },
      {
        name: 'receiving_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'receiving_air_yards',
        type: 'numeric',
      },
      {
        name: 'receiving_yards_after_catch',
        type: 'numeric',
      },
      {
        name: 'receiving_first_downs',
        type: 'numeric',
      },
      {
        name: 'receiving_epa',
        type: 'numeric',
      },
      {
        name: 'receiving_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'receiving_10',
        type: 'numeric',
      },
      {
        name: 'receiving_16',
        type: 'numeric',
      },
      {
        name: 'receiving_20',
        type: 'numeric',
      },
      {
        name: 'receiving_40',
        type: 'numeric',
      },
      {
        name: 'racr',
        type: 'numeric',
      },
      {
        name: 'target_share',
        type: 'numeric',
      },
      {
        name: 'air_yards_share',
        type: 'numeric',
      },
      {
        name: 'wopr',
        type: 'numeric',
      },
      {
        name: 'special_teams_tds',
        type: 'numeric',
      },
      {
        name: 'def_tackles_solo',
        type: 'numeric',
      },
      {
        name: 'def_tackles_with_assist',
        type: 'numeric',
      },
      {
        name: 'def_tackle_assists',
        type: 'numeric',
      },
      {
        name: 'def_tackles_for_loss',
        type: 'numeric',
      },
      {
        name: 'def_tackles_for_loss_yards',
        type: 'numeric',
      },
      {
        name: 'def_fumbles_forced',
        type: 'numeric',
      },
      {
        name: 'def_sacks',
        type: 'numeric',
      },
      {
        name: 'def_sack_yards',
        type: 'numeric',
      },
      {
        name: 'def_qb_hits',
        type: 'numeric',
      },
      {
        name: 'def_interceptions',
        type: 'numeric',
      },
      {
        name: 'def_interception_yards',
        type: 'numeric',
      },
      {
        name: 'def_pass_defended',
        type: 'numeric',
      },
      {
        name: 'def_tds',
        type: 'numeric',
      },
      {
        name: 'def_fumbles',
        type: 'numeric',
      },
      {
        name: 'def_safeties',
        type: 'numeric',
      },
      {
        name: 'def_punt_blocks',
        type: 'numeric',
      },
      {
        name: 'def_pat_blocks',
        type: 'numeric',
      },
      {
        name: 'def_fg_blocks',
        type: 'numeric',
      },
      {
        name: 'def_2pt_atts',
        type: 'numeric',
      },
      {
        name: 'def_2pt_made',
        type: 'numeric',
      },
      {
        name: 'misc_yards',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_own',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_yards_own',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_opp',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_yards_opp',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_tds',
        type: 'numeric',
      },
      {
        name: 'penalties',
        type: 'numeric',
      },
      {
        name: 'penalty_yards',
        type: 'numeric',
      },
      {
        name: 'fumbles_forced_by_opp',
        type: 'numeric',
      },
      {
        name: 'fumbles_not_forced',
        type: 'numeric',
      },
      {
        name: 'fumbles_out_of_bounds',
        type: 'numeric',
      },
      {
        name: 'fumbles_total',
        type: 'numeric',
      },
      {
        name: 'fumbles_lost_total',
        type: 'numeric',
      },
      {
        name: 'punt_returns',
        type: 'numeric',
      },
      {
        name: 'punt_return_yards',
        type: 'numeric',
      },
      {
        name: 'kickoff_returns',
        type: 'numeric',
      },
      {
        name: 'kickoff_return_yards',
        type: 'numeric',
      },
      {
        name: 'fg_made',
        type: 'numeric',
      },
      {
        name: 'fg_att',
        type: 'numeric',
      },
      {
        name: 'fg_missed',
        type: 'numeric',
      },
      {
        name: 'fg_blocked',
        type: 'numeric',
      },
      {
        name: 'fg_long',
        type: 'numeric',
      },
      {
        name: 'fg_pct',
        type: 'numeric',
      },
      {
        name: 'fg_made_0_19',
        type: 'numeric',
      },
      {
        name: 'fg_made_20_29',
        type: 'numeric',
      },
      {
        name: 'fg_made_30_39',
        type: 'numeric',
      },
      {
        name: 'fg_made_40_49',
        type: 'numeric',
      },
      {
        name: 'fg_made_50_59',
        type: 'numeric',
      },
      {
        name: 'fg_made_60_',
        type: 'numeric',
      },
      {
        name: 'fg_missed_0_19',
        type: 'numeric',
      },
      {
        name: 'fg_missed_20_29',
        type: 'numeric',
      },
      {
        name: 'fg_missed_30_39',
        type: 'numeric',
      },
      {
        name: 'fg_missed_40_49',
        type: 'numeric',
      },
      {
        name: 'fg_missed_50_59',
        type: 'numeric',
      },
      {
        name: 'fg_missed_60_',
        type: 'numeric',
      },
      {
        name: 'fg_made_list',
        type: 'text',
      },
      {
        name: 'fg_missed_list',
        type: 'text',
      },
      {
        name: 'fg_blocked_list',
        type: 'text',
      },
      {
        name: 'fg_made_distance',
        type: 'text',
      },
      {
        name: 'fg_missed_distance',
        type: 'text',
      },
      {
        name: 'fg_blocked_distance',
        type: 'text',
      },
      {
        name: 'pat_made',
        type: 'numeric',
      },
      {
        name: 'pat_att',
        type: 'numeric',
      },
      {
        name: 'pat_missed',
        type: 'numeric',
      },
      {
        name: 'pat_blocked',
        type: 'numeric',
      },
      {
        name: 'pat_pct',
        type: 'numeric',
      },
      {
        name: 'gwfg_made',
        type: 'numeric',
      },
      {
        name: 'gwfg_att',
        type: 'numeric',
      },
      {
        name: 'gwfg_missed',
        type: 'numeric',
      },
      {
        name: 'gwfg_blocked',
        type: 'numeric',
      },
      {
        name: 'gwfg_distance_list',
        type: 'text',
      },
      {
        name: 'pt_att',
        type: 'numeric',
      },
      {
        name: 'pt_blocked',
        type: 'numeric',
      },
      {
        name: 'pt_long',
        type: 'numeric',
      },
      {
        name: 'pt_yards',
        type: 'numeric',
      },
      {
        name: 'pt_inside_20',
        type: 'numeric',
      },
      {
        name: 'pt_out_of_bounds',
        type: 'numeric',
      },
      {
        name: 'pt_downed',
        type: 'numeric',
      },
      {
        name: 'pt_touchback',
        type: 'numeric',
      },
      {
        name: 'pt_fair_caught',
        type: 'numeric',
      },
      {
        name: 'pt_returned',
        type: 'numeric',
      },
      {
        name: 'pt_return_yards',
        type: 'numeric',
      },
      {
        name: 'pt_return_tds',
        type: 'numeric',
      },
      {
        name: 'pt_net_yards',
        type: 'numeric',
      },
      {
        name: 'fantasy_points',
        type: 'numeric',
      },
      {
        name: 'fantasy_points_ppr',
        type: 'numeric',
      },
    ],
  },
  {
    table: 'nflverse_player_week',
    source: 'nflverse-player-week',
    grain: 'week',
    idColumn: 'player_id',
    idKind: 'gsis',
    columns: [
      {
        name: 'player_name',
        type: 'text',
      },
      {
        name: 'player_display_name',
        type: 'text',
      },
      {
        name: 'position',
        type: 'text',
      },
      {
        name: 'position_group',
        type: 'text',
      },
      {
        name: 'headshot_url',
        type: 'text',
      },
      {
        name: 'game_id',
        type: 'text',
      },
      {
        name: 'team',
        type: 'text',
      },
      {
        name: 'opponent_team',
        type: 'text',
      },
      {
        name: 'completions',
        type: 'numeric',
      },
      {
        name: 'attempts',
        type: 'numeric',
      },
      {
        name: 'passing_yards',
        type: 'numeric',
      },
      {
        name: 'passing_tds',
        type: 'numeric',
      },
      {
        name: 'passing_interceptions',
        type: 'numeric',
      },
      {
        name: 'sacks_suffered',
        type: 'numeric',
      },
      {
        name: 'sack_yards_lost',
        type: 'numeric',
      },
      {
        name: 'sack_fumbles',
        type: 'numeric',
      },
      {
        name: 'sack_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'passing_air_yards',
        type: 'numeric',
      },
      {
        name: 'passing_yards_after_catch',
        type: 'numeric',
      },
      {
        name: 'passing_first_downs',
        type: 'numeric',
      },
      {
        name: 'passing_epa',
        type: 'numeric',
      },
      {
        name: 'passing_cpoe',
        type: 'numeric',
      },
      {
        name: 'passing_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'pacr',
        type: 'numeric',
      },
      {
        name: 'passing_10',
        type: 'numeric',
      },
      {
        name: 'passing_16',
        type: 'numeric',
      },
      {
        name: 'passing_20',
        type: 'numeric',
      },
      {
        name: 'passing_40',
        type: 'numeric',
      },
      {
        name: 'carries',
        type: 'numeric',
      },
      {
        name: 'rushing_yards',
        type: 'numeric',
      },
      {
        name: 'rushing_tds',
        type: 'numeric',
      },
      {
        name: 'rushing_fumbles',
        type: 'numeric',
      },
      {
        name: 'rushing_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'rushing_first_downs',
        type: 'numeric',
      },
      {
        name: 'rushing_epa',
        type: 'numeric',
      },
      {
        name: 'rushing_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'rushing_10',
        type: 'numeric',
      },
      {
        name: 'rushing_12',
        type: 'numeric',
      },
      {
        name: 'rushing_20',
        type: 'numeric',
      },
      {
        name: 'rushing_40',
        type: 'numeric',
      },
      {
        name: 'receptions',
        type: 'numeric',
      },
      {
        name: 'targets',
        type: 'numeric',
      },
      {
        name: 'receiving_yards',
        type: 'numeric',
      },
      {
        name: 'receiving_tds',
        type: 'numeric',
      },
      {
        name: 'receiving_fumbles',
        type: 'numeric',
      },
      {
        name: 'receiving_fumbles_lost',
        type: 'numeric',
      },
      {
        name: 'receiving_air_yards',
        type: 'numeric',
      },
      {
        name: 'receiving_yards_after_catch',
        type: 'numeric',
      },
      {
        name: 'receiving_first_downs',
        type: 'numeric',
      },
      {
        name: 'receiving_epa',
        type: 'numeric',
      },
      {
        name: 'receiving_2pt_conversions',
        type: 'numeric',
      },
      {
        name: 'receiving_10',
        type: 'numeric',
      },
      {
        name: 'receiving_16',
        type: 'numeric',
      },
      {
        name: 'receiving_20',
        type: 'numeric',
      },
      {
        name: 'receiving_40',
        type: 'numeric',
      },
      {
        name: 'racr',
        type: 'numeric',
      },
      {
        name: 'target_share',
        type: 'numeric',
      },
      {
        name: 'air_yards_share',
        type: 'numeric',
      },
      {
        name: 'wopr',
        type: 'numeric',
      },
      {
        name: 'special_teams_tds',
        type: 'numeric',
      },
      {
        name: 'def_tackles_solo',
        type: 'numeric',
      },
      {
        name: 'def_tackles_with_assist',
        type: 'numeric',
      },
      {
        name: 'def_tackle_assists',
        type: 'numeric',
      },
      {
        name: 'def_tackles_for_loss',
        type: 'numeric',
      },
      {
        name: 'def_tackles_for_loss_yards',
        type: 'numeric',
      },
      {
        name: 'def_fumbles_forced',
        type: 'numeric',
      },
      {
        name: 'def_sacks',
        type: 'numeric',
      },
      {
        name: 'def_sack_yards',
        type: 'numeric',
      },
      {
        name: 'def_qb_hits',
        type: 'numeric',
      },
      {
        name: 'def_interceptions',
        type: 'numeric',
      },
      {
        name: 'def_interception_yards',
        type: 'numeric',
      },
      {
        name: 'def_pass_defended',
        type: 'numeric',
      },
      {
        name: 'def_tds',
        type: 'numeric',
      },
      {
        name: 'def_fumbles',
        type: 'numeric',
      },
      {
        name: 'def_safeties',
        type: 'numeric',
      },
      {
        name: 'def_punt_blocks',
        type: 'numeric',
      },
      {
        name: 'def_pat_blocks',
        type: 'numeric',
      },
      {
        name: 'def_fg_blocks',
        type: 'numeric',
      },
      {
        name: 'def_2pt_atts',
        type: 'numeric',
      },
      {
        name: 'def_2pt_made',
        type: 'numeric',
      },
      {
        name: 'misc_yards',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_own',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_yards_own',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_opp',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_yards_opp',
        type: 'numeric',
      },
      {
        name: 'fumble_recovery_tds',
        type: 'numeric',
      },
      {
        name: 'penalties',
        type: 'numeric',
      },
      {
        name: 'penalty_yards',
        type: 'numeric',
      },
      {
        name: 'fumbles_forced_by_opp',
        type: 'numeric',
      },
      {
        name: 'fumbles_not_forced',
        type: 'numeric',
      },
      {
        name: 'fumbles_out_of_bounds',
        type: 'numeric',
      },
      {
        name: 'fumbles_total',
        type: 'numeric',
      },
      {
        name: 'fumbles_lost_total',
        type: 'numeric',
      },
      {
        name: 'punt_returns',
        type: 'numeric',
      },
      {
        name: 'punt_return_yards',
        type: 'numeric',
      },
      {
        name: 'kickoff_returns',
        type: 'numeric',
      },
      {
        name: 'kickoff_return_yards',
        type: 'numeric',
      },
      {
        name: 'fg_made',
        type: 'numeric',
      },
      {
        name: 'fg_att',
        type: 'numeric',
      },
      {
        name: 'fg_missed',
        type: 'numeric',
      },
      {
        name: 'fg_blocked',
        type: 'numeric',
      },
      {
        name: 'fg_long',
        type: 'numeric',
      },
      {
        name: 'fg_pct',
        type: 'numeric',
      },
      {
        name: 'fg_made_0_19',
        type: 'numeric',
      },
      {
        name: 'fg_made_20_29',
        type: 'numeric',
      },
      {
        name: 'fg_made_30_39',
        type: 'numeric',
      },
      {
        name: 'fg_made_40_49',
        type: 'numeric',
      },
      {
        name: 'fg_made_50_59',
        type: 'numeric',
      },
      {
        name: 'fg_made_60_',
        type: 'numeric',
      },
      {
        name: 'fg_missed_0_19',
        type: 'numeric',
      },
      {
        name: 'fg_missed_20_29',
        type: 'numeric',
      },
      {
        name: 'fg_missed_30_39',
        type: 'numeric',
      },
      {
        name: 'fg_missed_40_49',
        type: 'numeric',
      },
      {
        name: 'fg_missed_50_59',
        type: 'numeric',
      },
      {
        name: 'fg_missed_60_',
        type: 'numeric',
      },
      {
        name: 'fg_made_list',
        type: 'text',
      },
      {
        name: 'fg_missed_list',
        type: 'text',
      },
      {
        name: 'fg_blocked_list',
        type: 'text',
      },
      {
        name: 'fg_made_distance',
        type: 'text',
      },
      {
        name: 'fg_missed_distance',
        type: 'text',
      },
      {
        name: 'fg_blocked_distance',
        type: 'text',
      },
      {
        name: 'pat_made',
        type: 'numeric',
      },
      {
        name: 'pat_att',
        type: 'numeric',
      },
      {
        name: 'pat_missed',
        type: 'numeric',
      },
      {
        name: 'pat_blocked',
        type: 'numeric',
      },
      {
        name: 'pat_pct',
        type: 'numeric',
      },
      {
        name: 'gwfg_made',
        type: 'numeric',
      },
      {
        name: 'gwfg_att',
        type: 'numeric',
      },
      {
        name: 'gwfg_missed',
        type: 'numeric',
      },
      {
        name: 'gwfg_blocked',
        type: 'numeric',
      },
      {
        name: 'gwfg_distance',
        type: 'text',
      },
      {
        name: 'pt_att',
        type: 'numeric',
      },
      {
        name: 'pt_blocked',
        type: 'numeric',
      },
      {
        name: 'pt_long',
        type: 'numeric',
      },
      {
        name: 'pt_yards',
        type: 'numeric',
      },
      {
        name: 'pt_inside_20',
        type: 'numeric',
      },
      {
        name: 'pt_out_of_bounds',
        type: 'numeric',
      },
      {
        name: 'pt_downed',
        type: 'numeric',
      },
      {
        name: 'pt_touchback',
        type: 'numeric',
      },
      {
        name: 'pt_fair_caught',
        type: 'numeric',
      },
      {
        name: 'pt_returned',
        type: 'numeric',
      },
      {
        name: 'pt_return_yards',
        type: 'numeric',
      },
      {
        name: 'pt_return_tds',
        type: 'numeric',
      },
      {
        name: 'pt_net_yards',
        type: 'numeric',
      },
      {
        name: 'fantasy_points',
        type: 'numeric',
      },
      {
        name: 'fantasy_points_ppr',
        type: 'numeric',
      },
    ],
  },
  {
    table: 'pfr_player_week',
    source: 'pfr-player-week',
    grain: 'week',
    idColumn: 'pfr_player_id',
    idKind: 'pfr',
    partition: 'stat_category',
    columns: [
      {
        name: 'game_id',
        type: 'text',
      },
      {
        name: 'pfr_game_id',
        type: 'text',
      },
      {
        name: 'game_type',
        type: 'numeric',
      },
      {
        name: 'team',
        type: 'text',
      },
      {
        name: 'opponent',
        type: 'text',
      },
      {
        name: 'pfr_player_name',
        type: 'numeric',
      },
      {
        name: 'passing_drops',
        type: 'numeric',
      },
      {
        name: 'passing_drop_pct',
        type: 'numeric',
      },
      {
        name: 'receiving_drop',
        type: 'numeric',
      },
      {
        name: 'receiving_drop_pct',
        type: 'numeric',
      },
      {
        name: 'passing_bad_throws',
        type: 'numeric',
      },
      {
        name: 'passing_bad_throw_pct',
        type: 'numeric',
      },
      {
        name: 'times_sacked',
        type: 'numeric',
      },
      {
        name: 'times_blitzed',
        type: 'numeric',
      },
      {
        name: 'times_hurried',
        type: 'numeric',
      },
      {
        name: 'times_hit',
        type: 'numeric',
      },
      {
        name: 'times_pressured',
        type: 'numeric',
      },
      {
        name: 'times_pressured_pct',
        type: 'numeric',
      },
      {
        name: 'def_times_blitzed',
        type: 'numeric',
      },
      {
        name: 'def_times_hurried',
        type: 'numeric',
      },
      {
        name: 'def_times_hitqb',
        type: 'numeric',
      },
      {
        name: 'def_ints',
        type: 'numeric',
      },
      {
        name: 'def_targets',
        type: 'numeric',
      },
      {
        name: 'def_completions_allowed',
        type: 'numeric',
      },
      {
        name: 'def_completion_pct',
        type: 'numeric',
      },
      {
        name: 'def_yards_allowed',
        type: 'numeric',
      },
      {
        name: 'def_yards_allowed_per_cmp',
        type: 'numeric',
      },
      {
        name: 'def_yards_allowed_per_tgt',
        type: 'numeric',
      },
      {
        name: 'def_receiving_td_allowed',
        type: 'numeric',
      },
      {
        name: 'def_passer_rating_allowed',
        type: 'numeric',
      },
      {
        name: 'def_adot',
        type: 'numeric',
      },
      {
        name: 'def_air_yards_completed',
        type: 'numeric',
      },
      {
        name: 'def_yards_after_catch',
        type: 'numeric',
      },
      {
        name: 'def_sacks',
        type: 'numeric',
      },
      {
        name: 'def_pressures',
        type: 'numeric',
      },
      {
        name: 'def_tackles_combined',
        type: 'numeric',
      },
      {
        name: 'def_missed_tackles',
        type: 'numeric',
      },
      {
        name: 'def_missed_tackle_pct',
        type: 'numeric',
      },
      {
        name: 'carries',
        type: 'numeric',
      },
      {
        name: 'rushing_yards_before_contact',
        type: 'numeric',
      },
      {
        name: 'rushing_yards_before_contact_avg',
        type: 'numeric',
      },
      {
        name: 'rushing_yards_after_contact',
        type: 'numeric',
      },
      {
        name: 'rushing_yards_after_contact_avg',
        type: 'numeric',
      },
      {
        name: 'rushing_broken_tackles',
        type: 'numeric',
      },
      {
        name: 'receiving_broken_tackles',
        type: 'numeric',
      },
      {
        name: 'receiving_int',
        type: 'numeric',
      },
      {
        name: 'receiving_rat',
        type: 'numeric',
      },
    ],
  },
  {
    table: 'ngs_player_week',
    source: 'ngs-player-week',
    grain: 'week',
    idColumn: 'player_gsis_id',
    idKind: 'gsis',
    partition: 'stat_category',
    columns: [
      {
        name: 'player_display_name',
        type: 'text',
      },
      {
        name: 'player_position',
        type: 'text',
      },
      {
        name: 'team_abbr',
        type: 'text',
      },
      {
        name: 'avg_time_to_throw',
        type: 'numeric',
      },
      {
        name: 'avg_completed_air_yards',
        type: 'numeric',
      },
      {
        name: 'avg_intended_air_yards',
        type: 'numeric',
      },
      {
        name: 'avg_air_yards_differential',
        type: 'numeric',
      },
      {
        name: 'aggressiveness',
        type: 'numeric',
      },
      {
        name: 'max_completed_air_distance',
        type: 'text',
      },
      {
        name: 'avg_air_yards_to_sticks',
        type: 'numeric',
      },
      {
        name: 'attempts',
        type: 'numeric',
      },
      {
        name: 'pass_yards',
        type: 'numeric',
      },
      {
        name: 'pass_touchdowns',
        type: 'numeric',
      },
      {
        name: 'interceptions',
        type: 'numeric',
      },
      {
        name: 'passer_rating',
        type: 'numeric',
      },
      {
        name: 'completions',
        type: 'numeric',
      },
      {
        name: 'completion_percentage',
        type: 'numeric',
      },
      {
        name: 'expected_completion_percentage',
        type: 'numeric',
      },
      {
        name: 'completion_percentage_above_expectation',
        type: 'numeric',
      },
      {
        name: 'avg_air_distance',
        type: 'text',
      },
      {
        name: 'max_air_distance',
        type: 'text',
      },
      {
        name: 'player_first_name',
        type: 'text',
      },
      {
        name: 'player_last_name',
        type: 'text',
      },
      {
        name: 'player_jersey_number',
        type: 'numeric',
      },
      {
        name: 'player_short_name',
        type: 'text',
      },
      {
        name: 'efficiency',
        type: 'numeric',
      },
      {
        name: 'percent_attempts_gte_eight_defenders',
        type: 'numeric',
      },
      {
        name: 'avg_time_to_los',
        type: 'numeric',
      },
      {
        name: 'rush_attempts',
        type: 'numeric',
      },
      {
        name: 'rush_yards',
        type: 'numeric',
      },
      {
        name: 'expected_rush_yards',
        type: 'numeric',
      },
      {
        name: 'rush_yards_over_expected',
        type: 'numeric',
      },
      {
        name: 'avg_rush_yards',
        type: 'numeric',
      },
      {
        name: 'rush_yards_over_expected_per_att',
        type: 'numeric',
      },
      {
        name: 'rush_pct_over_expected',
        type: 'numeric',
      },
      {
        name: 'rush_touchdowns',
        type: 'numeric',
      },
      {
        name: 'avg_cushion',
        type: 'numeric',
      },
      {
        name: 'avg_separation',
        type: 'numeric',
      },
      {
        name: 'percent_share_of_intended_air_yards',
        type: 'numeric',
      },
      {
        name: 'receptions',
        type: 'numeric',
      },
      {
        name: 'targets',
        type: 'numeric',
      },
      {
        name: 'catch_percentage',
        type: 'numeric',
      },
      {
        name: 'yards',
        type: 'numeric',
      },
      {
        name: 'rec_touchdowns',
        type: 'numeric',
      },
      {
        name: 'avg_yac',
        type: 'numeric',
      },
      {
        name: 'avg_expected_yac',
        type: 'numeric',
      },
      {
        name: 'avg_yac_above_expectation',
        type: 'numeric',
      },
    ],
  },
  {
    table: 'espn_qbr_week',
    source: 'espn-qbr-week',
    grain: 'week',
    idColumn: 'player_id',
    idKind: 'espn',
    weekColumn: 'game_week',
    columns: [
      {
        name: 'game_id',
        type: 'text',
      },
      {
        name: 'game_week',
        type: 'numeric',
      },
      {
        name: 'week_text',
        type: 'text',
      },
      {
        name: 'team_abb',
        type: 'text',
      },
      {
        name: 'name_short',
        type: 'text',
      },
      {
        name: 'rank',
        type: 'numeric',
      },
      {
        name: 'qbr_total',
        type: 'numeric',
      },
      {
        name: 'pts_added',
        type: 'numeric',
      },
      {
        name: 'qb_plays',
        type: 'numeric',
      },
      {
        name: 'epa_total',
        type: 'numeric',
      },
      {
        name: 'pass',
        type: 'numeric',
      },
      {
        name: 'run',
        type: 'numeric',
      },
      {
        name: 'exp_sack',
        type: 'numeric',
      },
      {
        name: 'penalty',
        type: 'numeric',
      },
      {
        name: 'qbr_raw',
        type: 'numeric',
      },
      {
        name: 'sack',
        type: 'numeric',
      },
      {
        name: 'name_first',
        type: 'text',
      },
      {
        name: 'name_last',
        type: 'text',
      },
      {
        name: 'name_display',
        type: 'text',
      },
      {
        name: 'headshot_href',
        type: 'text',
      },
      {
        name: 'team',
        type: 'text',
      },
      {
        name: 'opp_id',
        type: 'text',
      },
      {
        name: 'opp_abb',
        type: 'text',
      },
      {
        name: 'opp_team',
        type: 'text',
      },
      {
        name: 'opp_name',
        type: 'text',
      },
      {
        name: 'week_num',
        type: 'numeric',
      },
      {
        name: 'qualified',
        type: 'boolean',
      },
    ],
  },
  {
    table: 'espn_qbr_season',
    source: 'espn-qbr-season',
    grain: 'season',
    idColumn: 'player_id',
    idKind: 'espn',
    columns: [
      {
        name: 'game_week',
        type: 'numeric',
      },
      {
        name: 'team_abb',
        type: 'text',
      },
      {
        name: 'name_short',
        type: 'text',
      },
      {
        name: 'rank',
        type: 'numeric',
      },
      {
        name: 'qbr_total',
        type: 'numeric',
      },
      {
        name: 'pts_added',
        type: 'numeric',
      },
      {
        name: 'qb_plays',
        type: 'numeric',
      },
      {
        name: 'epa_total',
        type: 'numeric',
      },
      {
        name: 'pass',
        type: 'numeric',
      },
      {
        name: 'run',
        type: 'numeric',
      },
      {
        name: 'exp_sack',
        type: 'numeric',
      },
      {
        name: 'penalty',
        type: 'numeric',
      },
      {
        name: 'qbr_raw',
        type: 'numeric',
      },
      {
        name: 'sack',
        type: 'numeric',
      },
      {
        name: 'name_first',
        type: 'text',
      },
      {
        name: 'name_last',
        type: 'text',
      },
      {
        name: 'name_display',
        type: 'text',
      },
      {
        name: 'headshot_href',
        type: 'text',
      },
      {
        name: 'team',
        type: 'text',
      },
      {
        name: 'qualified',
        type: 'boolean',
      },
    ],
  },
];

export const playRawTables: PlayRawSpec[] = [
  {
    table: 'ftn_play',
    source: 'ftn-play',
    grain: 'play',
    keyColumns: ['ftn_game_id', 'ftn_play_id'],
    columns: [
      {
        name: 'ftn_game_id',
        type: 'text',
      },
      {
        name: 'nflverse_game_id',
        type: 'text',
      },
      {
        name: 'season',
        type: 'numeric',
      },
      {
        name: 'week',
        type: 'numeric',
      },
      {
        name: 'ftn_play_id',
        type: 'numeric',
      },
      {
        name: 'nflverse_play_id',
        type: 'text',
      },
      {
        name: 'starting_hash',
        type: 'text',
      },
      {
        name: 'qb_location',
        type: 'text',
      },
      {
        name: 'n_offense_backfield',
        type: 'numeric',
      },
      {
        name: 'n_defense_box',
        type: 'numeric',
      },
      {
        name: 'is_no_huddle',
        type: 'boolean',
      },
      {
        name: 'is_motion',
        type: 'boolean',
      },
      {
        name: 'is_play_action',
        type: 'boolean',
      },
      {
        name: 'is_screen_pass',
        type: 'boolean',
      },
      {
        name: 'is_rpo',
        type: 'boolean',
      },
      {
        name: 'is_trick_play',
        type: 'boolean',
      },
      {
        name: 'is_qb_out_of_pocket',
        type: 'boolean',
      },
      {
        name: 'is_interception_worthy',
        type: 'boolean',
      },
      {
        name: 'is_throw_away',
        type: 'boolean',
      },
      {
        name: 'read_thrown',
        type: 'boolean',
      },
      {
        name: 'is_catchable_ball',
        type: 'boolean',
      },
      {
        name: 'is_contested_ball',
        type: 'boolean',
      },
      {
        name: 'is_created_reception',
        type: 'boolean',
      },
      {
        name: 'is_drop',
        type: 'boolean',
      },
      {
        name: 'is_qb_sneak',
        type: 'boolean',
      },
      {
        name: 'n_blitzers',
        type: 'numeric',
      },
      {
        name: 'n_pass_rushers',
        type: 'numeric',
      },
      {
        name: 'is_qb_fault_sack',
        type: 'boolean',
      },
      {
        name: 'date_pulled',
        type: 'text',
      },
    ],
  },
];
