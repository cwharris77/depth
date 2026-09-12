// GENERATED — do not edit by hand. Source: nflverse release headers (see scripts/).
export type RawColumnType = 'text' | 'numeric';
export interface RawColumn {
  name: string;
  type: RawColumnType;
}
export interface RawTableSpec {
  table: string;
  source: string;
  grain: 'season' | 'week';
  columns: RawColumn[];
}

export const nflverseRawTables: RawTableSpec[] = [
  {
    table: 'nflverse_player_season',
    source: 'nflverse-player-season',
    grain: 'season',
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
];
