import { describe, it, expect } from 'vitest';
import {
  extractPlayerIds,
  buildPlayerStatsSeedSql,
  buildSchedulesAndGamesSeedSql,
  buildTeamFormationsSeedSql,
  buildRosterHistorySeedSql,
  buildTeamStatsSeedSql,
  buildRecentSnapSummariesSeedSql,
  type UnitFormationTally,
} from './seed-sql';
import type { PlayerStatsInsert } from './transform';
import type { ScheduleInsert, GameInsert } from './games';
import type { RosterHistoryInsert } from './roster-history';
import type { TeamStatsInsert } from './team-stats';
import type { RecentSnapSummaryInsert } from './snap-counts';

function recentSnapRow(): RecentSnapSummaryInsert {
  return {
    team_id: 'sea',
    season: 2025,
    player_id: 'p1',
    window_start_week: 15,
    window_end_week: 17,
    window_game_ids: ['2025_15_SEA_LA', '2025_16_SEA_CHI', '2025_17_SEA_SF'],
    games: 3,
    offense_snaps: 180,
    offense_pct: 0.9,
    defense_snaps: 0,
    defense_pct: 0,
    special_teams_snaps: 5,
    special_teams_pct: 0.08,
    source: 'nflverse-pfr',
  };
}

describe('buildRecentSnapSummariesSeedSql', () => {
  it('emits deterministic rows without an ingestion timestamp', () => {
    const sql = buildRecentSnapSummariesSeedSql([recentSnapRow()]);
    expect(sql).toContain('insert into player_recent_snaps');
    expect(sql).toContain('on conflict (team_id,season,player_id) do nothing;');
    expect(sql).not.toContain('updated_at');
    expect(buildRecentSnapSummariesSeedSql([recentSnapRow()])).toBe(sql);
  });

  it('returns empty SQL for no rows', () => {
    expect(buildRecentSnapSummariesSeedSql([])).toBe('');
  });

  it('serializes adversarial game ids as escaped text-array elements', () => {
    const row = recentSnapRow();
    row.window_game_ids = [
      "game'quote",
      'game,comma',
      'game{brace}',
      String.raw`game\slash`,
      "game'); drop table teams; --",
    ];

    const sql = buildRecentSnapSummariesSeedSql([row]);

    expect(sql).toContain(
      String.raw`array[E'game''quote', E'game,comma', E'game{brace}', E'game\\slash', E'game''); drop table teams; --']::text[]`
    );
  });
});

describe('extractPlayerIds', () => {
  it('pulls ids out of a real insertStatement-shaped players block', () => {
    const sql = [
      "insert into teams (id, name) values\n  ('sea', 'Seahawks')\non conflict (id) do update set name = excluded.name;",
      '',
      "insert into players (id, team_id, name) values\n  ('4684527', 'bills', 'T.J. Sanders'),\n  ('4241468', 'bills', 'Phidarian Mathis')\non conflict (id) do nothing;",
      '',
      "insert into team_stats (team_id, season) values\n  ('bills', 2025)\non conflict (team_id,season) do nothing;",
    ].join('\n');
    expect(extractPlayerIds(sql)).toEqual(new Set(['4684527', '4241468']));
  });

  it('unescapes doubled single quotes in ids', () => {
    const sql =
      "insert into players (id, name) values\n  ('o''brien-1', 'X')\non conflict (id) do nothing;";
    expect(extractPlayerIds(sql)).toEqual(new Set(["o'brien-1"]));
  });

  it('returns an empty set when the players block is missing (never throws)', () => {
    expect(extractPlayerIds('-- no players insert here\n')).toEqual(new Set());
  });

  it('returns an empty set for an empty string', () => {
    expect(extractPlayerIds('')).toEqual(new Set());
  });
});

function statsRow(over: Partial<PlayerStatsInsert> = {}): PlayerStatsInsert {
  return {
    player_id: 'p1',
    season: 2025,
    season_type: 'REG',
    team_id: null,
    games: 10,
    completions: null,
    attempts: null,
    passing_yards: null,
    passing_tds: null,
    passing_interceptions: null,
    carries: 100,
    rushing_yards: 450,
    rushing_tds: 4,
    receptions: null,
    targets: null,
    receiving_yards: null,
    receiving_tds: null,
    def_tackles_solo: null,
    def_sacks: null,
    def_interceptions: null,
    fg_made: null,
    fg_att: null,
    ...over,
  };
}

describe('buildPlayerStatsSeedSql', () => {
  it('emits a player_stats insert keyed on player_id,season,season_type', () => {
    const sql = buildPlayerStatsSeedSql([statsRow()]);
    expect(sql).toContain('insert into player_stats');
    expect(sql).toContain('on conflict (player_id,season,season_type) do nothing;');
    expect(sql).toContain("'p1', 2025, 'REG'");
  });

  it('returns empty string for no rows', () => {
    expect(buildPlayerStatsSeedSql([])).toBe('');
  });
});

describe('buildSchedulesAndGamesSeedSql', () => {
  it('emits schedules before games (FK order)', () => {
    const schedules: ScheduleInsert[] = [{ team_id: 'sea', season: 2025 }];
    const games: GameInsert[] = [
      {
        game_id: '2025_01_SEA_SF',
        season: 2025,
        game_type: 'REG',
        week: 1,
        gameday: '2025-09-07',
        gametime: '13:00',
        home_team_id: 'sf',
        away_team_id: 'sea',
        home_score: 20,
        away_score: 17,
      },
    ];
    const sql = buildSchedulesAndGamesSeedSql(schedules, games);
    expect(sql.indexOf('insert into schedules')).toBeLessThan(sql.indexOf('insert into games'));
    expect(sql).toContain("'2025_01_SEA_SF'");
  });

  it('omits either insert when its rows are empty', () => {
    expect(buildSchedulesAndGamesSeedSql([], [])).toBe('');
  });
});

describe('buildTeamFormationsSeedSql', () => {
  it('emits offense and defense rows with the unit column, keyed on team_id,season,unit,rank', () => {
    const tallies: UnitFormationTally[] = [
      {
        team_id: 'sea',
        season: 2025,
        rank: 1,
        alignment: 'SHOTGUN',
        personnel: '11',
        pct: 56,
        unit: 'offense',
      },
      {
        team_id: 'sea',
        season: 2025,
        rank: 1,
        alignment: 'Nickel',
        personnel: '2-4-5',
        pct: 58,
        unit: 'defense',
      },
    ];
    const sql = buildTeamFormationsSeedSql(tallies);
    expect(sql).toContain('on conflict (team_id,season,unit,rank) do nothing;');
    expect(sql).toContain("'sea', 2025, 'offense', 1, 'SHOTGUN', '11', 56");
    expect(sql).toContain("'sea', 2025, 'defense', 1, 'Nickel', '2-4-5', 58");
  });

  it('returns empty string for no rows', () => {
    expect(buildTeamFormationsSeedSql([])).toBe('');
  });
});

describe('buildRosterHistorySeedSql', () => {
  it('emits a roster_history insert keyed on season,team_id,gsis_id, no players FK', () => {
    const rows: RosterHistoryInsert[] = [
      {
        season: 2025,
        team_id: 'sea',
        gsis_id: '00-0012345',
        espn_id: '4684527',
        name: "Bob O'Brien",
        number: 12,
        position: 'QB',
        college: 'State',
        height: '6\'2"',
        weight: 220,
        headshot_url: null,
        depth_rank: 1,
        player_order: 1,
      },
    ];
    const sql = buildRosterHistorySeedSql(rows);
    expect(sql).toContain('on conflict (season,team_id,gsis_id) do nothing;');
    expect(sql).toContain("'Bob O''Brien'");
  });

  it('returns empty string for no rows', () => {
    expect(buildRosterHistorySeedSql([])).toBe('');
  });
});

describe('buildTeamStatsSeedSql', () => {
  it('emits a team_season_stats insert keyed on team_id,season with distance-list arrays', () => {
    const rows: TeamStatsInsert[] = [
      {
        team_id: 'chiefs',
        season: 2024,
        season_type: 'REG',
        games: 17,
        completions: 392,
        attempts: 597,
        passing_yards: 4183,
        passing_tds: 26,
        passing_interceptions: 11,
        sacks_suffered: null,
        sack_yards_lost: null,
        sack_fumbles: null,
        sack_fumbles_lost: null,
        passing_air_yards: null,
        passing_yards_after_catch: null,
        passing_first_downs: null,
        passing_epa: null,
        passing_cpoe: null,
        passing_2pt_conversions: null,
        passing_10: null,
        passing_16: null,
        passing_20: null,
        passing_40: null,
        carries: null,
        rushing_yards: null,
        rushing_tds: null,
        rushing_fumbles: null,
        rushing_fumbles_lost: null,
        rushing_first_downs: null,
        rushing_epa: null,
        rushing_2pt_conversions: null,
        rushing_10: null,
        rushing_12: null,
        rushing_20: null,
        rushing_40: null,
        receptions: null,
        targets: null,
        receiving_yards: null,
        receiving_tds: null,
        receiving_fumbles: null,
        receiving_fumbles_lost: null,
        receiving_air_yards: null,
        receiving_yards_after_catch: null,
        receiving_first_downs: null,
        receiving_epa: null,
        receiving_2pt_conversions: null,
        receiving_10: null,
        receiving_16: null,
        receiving_20: null,
        receiving_40: null,
        special_teams_tds: null,
        def_tackles_solo: null,
        def_tackles_with_assist: null,
        def_tackle_assists: null,
        def_tackles_for_loss: null,
        def_tackles_for_loss_yards: null,
        def_fumbles_forced: null,
        def_sacks: null,
        def_sack_yards: null,
        def_qb_hits: null,
        def_interceptions: null,
        def_interception_yards: null,
        def_pass_defended: null,
        def_tds: null,
        def_fumbles: null,
        def_safeties: null,
        misc_yards: null,
        fumble_recovery_own: null,
        fumble_recovery_yards_own: null,
        fumble_recovery_opp: null,
        fumble_recovery_yards_opp: null,
        fumble_recovery_tds: null,
        penalties: null,
        penalty_yards: null,
        timeouts: null,
        fumbles_forced_by_opp: null,
        fumbles_not_forced: null,
        fumbles_out_of_bounds: null,
        fumbles_total: null,
        fumbles_lost_total: null,
        punt_returns: null,
        punt_return_yards: null,
        kickoff_returns: null,
        kickoff_return_yards: null,
        fg_made: null,
        fg_att: null,
        fg_missed: null,
        fg_blocked: null,
        fg_long: null,
        fg_pct: null,
        fg_made_0_19: null,
        fg_made_20_29: null,
        fg_made_30_39: null,
        fg_made_40_49: null,
        fg_made_50_: null,
        fg_missed_0_19: null,
        fg_missed_20_29: null,
        fg_missed_30_39: null,
        fg_missed_40_49: null,
        fg_missed_50_: null,
        pat_made: null,
        pat_att: null,
        pat_missed: null,
        pat_blocked: null,
        pat_pct: null,
        gwfg_made: null,
        gwfg_att: null,
        gwfg_missed: null,
        gwfg_blocked: null,
        pt_att: null,
        pt_blocked: null,
        pt_long: null,
        pt_yards: null,
        pt_inside_20: null,
        pt_out_of_bounds: null,
        pt_downed: null,
        pt_touchback: null,
        pt_fair_caught: null,
        pt_returned: null,
        pt_return_yards: null,
        pt_return_tds: null,
        pt_net_yards: null,
        fg_made_list: [42, 50, 29, 47],
        fg_missed_list: [44, 51],
        fg_blocked_list: [],
        fg_made_distance: [],
        fg_missed_distance: [],
        fg_blocked_distance: [],
        gwfg_distance_list: [57],
      },
    ];
    const sql = buildTeamStatsSeedSql(rows);
    expect(sql).toContain('insert into team_season_stats');
    expect(sql).toContain('on conflict (team_id,season) do nothing;');
    expect(sql).toContain("'chiefs', 2024, 'REG'");
    expect(sql).toContain("'{42,50,29,47}'");
    expect(sql).toContain("'{44,51}'");
    expect(sql).toContain("'{}'");
    expect(sql).toContain("'{57}'");
  });

  it('returns empty string for no rows', () => {
    expect(buildTeamStatsSeedSql([])).toBe('');
  });
});
