import { describe, it, expect } from 'vitest';
import {
  extractPlayerIds,
  buildPlayerStatsSeedSql,
  buildTeamSeasonStatsSeedSql,
  buildSchedulesAndGamesSeedSql,
  buildTeamFormationsSeedSql,
  buildRosterHistorySeedSql,
  type UnitFormationTally,
} from './seed-sql';
import type { PlayerStatsInsert } from './transform';
import type { TeamSeasonStatsInsert } from './team-stats';
import type { ScheduleInsert, GameInsert } from './games';
import type { RosterHistoryInsert } from './roster-history';

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

function teamStatsRow(over: Partial<TeamSeasonStatsInsert> = {}): TeamSeasonStatsInsert {
  return {
    team_id: 'sea',
    season: 2025,
    games: 17,
    completions: null,
    attempts: null,
    passing_yards: 4183,
    passing_tds: null,
    passing_interceptions: null,
    carries: null,
    rushing_yards: null,
    rushing_tds: null,
    receptions: null,
    targets: null,
    receiving_yards: null,
    receiving_tds: null,
    ...over,
  };
}

describe('buildTeamSeasonStatsSeedSql', () => {
  it('emits a team_season_stats insert keyed on team_id,season', () => {
    const sql = buildTeamSeasonStatsSeedSql([teamStatsRow()]);
    expect(sql).toContain('insert into team_season_stats');
    expect(sql).toContain('on conflict (team_id,season) do nothing;');
    expect(sql).toContain("'sea', 2025, 17");
    expect(sql).toContain('4183');
  });

  it('returns empty string for no rows', () => {
    expect(buildTeamSeasonStatsSeedSql([])).toBe('');
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
