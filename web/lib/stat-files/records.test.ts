import { describe, expect, it } from 'vitest';
import type { PlayerWeekRow } from './player-seasons';
import {
  buildRecordFiles,
  RECORD_STATS,
  RECORD_TOP_RANK,
  toRecordRows,
  type RecordGameRow,
} from './records';

function weekRow(
  playerId: string,
  week: number,
  stats: Record<string, string>,
  over: Partial<PlayerWeekRow> = {}
): PlayerWeekRow {
  return { playerId, season: 2024, seasonType: 'REG', week, team: 'bills', stats, ...over };
}

describe('toRecordRows', () => {
  const index = new Map([
    ['2024\u00001\u0000bills', { game_id: '2024_01_BUF_NYJ', opponent: 'jets' }],
  ]);

  it('keeps regular-season games with a positive stat and joins the schedule', () => {
    const rows = toRecordRows(
      2024,
      [
        weekRow('a', 1, { rushing_yards: '120', rushing_tds: '2', passing_yards: '' }),
        weekRow('b', 1, { rushing_yards: '0' }),
        weekRow('c', 1, { rushing_yards: '-3' }),
        weekRow('d', 1, { rushing_yards: '200' }, { seasonType: 'POST' }),
        weekRow('e', 1, { rushing_yards: '99' }, { season: 2023 }),
      ],
      index
    );
    expect(rows).toEqual([
      {
        player_id: 'a',
        season: 2024,
        week: 1,
        team: 'bills',
        game_id: '2024_01_BUF_NYJ',
        opponent: 'jets',
        stats: { rushing_tds: 2, rushing_yards: 120 },
      },
    ]);
  });

  it('sums a player-team-week split and omits the join when the schedule has no match', () => {
    const rows = toRecordRows(
      2024,
      [weekRow('a', 2, { rushing_yards: '40' }), weekRow('a', 2, { rushing_yards: '25' })],
      index
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].stats.rushing_yards).toBe(65);
    expect(rows[0].game_id).toBeUndefined();
    expect(rows[0].opponent).toBeUndefined();
  });

  it('never fabricates a stat the source left blank', () => {
    const rows = toRecordRows(2024, [weekRow('a', 1, { rushing_yards: '10' })], null);
    expect(Object.keys(rows[0].stats)).toEqual(['rushing_yards']);
  });
});

function game(
  player: string,
  season: number,
  week: number,
  team: string,
  yards: number
): RecordGameRow {
  return {
    player_id: player,
    season,
    week,
    team,
    game_id: `${season}_${week}`,
    stats: { rushing_yards: yards },
  };
}

describe('buildRecordFiles', () => {
  const history = new Map<number, RecordGameRow[]>([
    [2001, [game('a', 2001, 1, 'bills', 150), game('a', 2001, 2, 'bills', 90)]],
    [2002, [game('b', 2002, 1, 'bills', 200), game('c', 2002, 1, 'jets', 200)]],
    [2003, [game('a', 2003, 1, 'jets', 120), game('b', 2003, 5, 'bills', 100)]],
  ]);
  const { records, highlights } = buildRecordFiles(history, 1);

  it('writes one file per stat carrying scope, source and coverage', () => {
    expect([...records.keys()]).toEqual([...RECORD_STATS]);
    const file = records.get('rushing_yards');
    expect(file).toMatchObject({
      coverage: { from_season: 2001, to_season: 2003 },
      scope: 'REG',
      source: 'stats_player_week',
      stat: 'rushing_yards',
    });
  });

  it('ranks single games best first and lets ties share a rank', () => {
    const top = records.get('rushing_yards')!.single_game.top;
    expect(top.map((entry) => [entry.player_id, entry.value, entry.rank])).toEqual([
      ['b', 200, 1],
      ['c', 200, 1],
      ['a', 150, 3],
      ['a', 120, 4],
      ['b', 100, 5],
      ['a', 90, 6],
    ]);
    expect(top[0]).toMatchObject({ game_id: '2002_1', season: 2002, week: 1, team: 'bills' });
  });

  it('counts distinct players at each milestone', () => {
    const thresholds = records.get('rushing_yards')!.single_game.thresholds;
    expect(thresholds.find((t) => t.value === 100)).toEqual({
      performances: 5,
      players: 3,
      value: 100,
    });
    expect(thresholds.find((t) => t.value === 200)).toEqual({
      performances: 2,
      players: 2,
      value: 200,
    });
    expect(thresholds.find((t) => t.value === 250)).toEqual({
      performances: 0,
      players: 0,
      value: 250,
    });
  });

  it('totals a season per player and team, never across teams', () => {
    const top = records.get('rushing_yards')!.single_season.top;
    expect(top.map((e) => [e.player_id, e.team, e.season, e.value, e.rank])).toEqual([
      ['a', 'bills', 2001, 240, 1],
      ['b', 'bills', 2002, 200, 2],
      ['c', 'jets', 2002, 200, 2],
      ['a', 'jets', 2003, 120, 4],
      ['b', 'bills', 2003, 100, 5],
    ]);
    expect(top.every((entry) => entry.week === undefined)).toBe(true);
  });

  it('writes a player highlight with all-time and team ranks', () => {
    const a = highlights.get('a')!.highlights.rushing_yards!;
    expect(a.single_game).toMatchObject({
      value: 150,
      season: 2001,
      week: 1,
      team: 'bills',
      all_time_rank: 3,
      players_at_or_above: 3,
      team_rank: 2,
      team_players_at_or_above: 2,
    });
    expect(a.single_season).toMatchObject({ value: 240, season: 2001, all_time_rank: 1 });
    expect(highlights.get('a')).toMatchObject({
      coverage: { from_season: 2001, to_season: 2003 },
      scope: 'REG',
    });
  });

  it('ranks a player within a team using only that team', () => {
    // c's 200-yard game is the jets' best, so rank 1 among jets players despite sharing the
    // league-wide top with b.
    const c = highlights.get('c')!.highlights.rushing_yards!.single_game!;
    expect(c).toMatchObject({ all_time_rank: 1, team_rank: 1, team_players_at_or_above: 1 });
  });

  it('omits stats a player never recorded, rather than writing zero', () => {
    expect(highlights.get('a')!.highlights.passing_yards).toBeUndefined();
    expect(highlights.has('nobody')).toBe(false);
  });

  it('is independent of the order seasons are supplied in', () => {
    const reversed = buildRecordFiles(new Map([...history].reverse()), 1);
    expect(JSON.stringify(reversed.records.get('rushing_yards'))).toBe(
      JSON.stringify(records.get('rushing_yards'))
    );
    expect(JSON.stringify(reversed.highlights.get('a'))).toBe(JSON.stringify(highlights.get('a')));
  });

  it('writes keys in sorted order', () => {
    const keys = (value: object) => Object.keys(value);
    const file = records.get('rushing_yards')!;
    expect(keys(file)).toEqual([...keys(file)].sort());
    expect(keys(highlights.get('a')!.highlights.rushing_yards!.single_game!)).toEqual(
      [...keys(highlights.get('a')!.highlights.rushing_yards!.single_game!)].sort()
    );
  });

  it('caps a record list at the top ranks', () => {
    const many = new Map([
      [2010, Array.from({ length: 60 }, (_, i) => game(`p${i}`, 2010, 1, 'bills', 300 - i))],
    ]);
    const top = buildRecordFiles(many, 1).records.get('rushing_yards')!.single_game.top;
    expect(top).toHaveLength(RECORD_TOP_RANK);
    expect(top[top.length - 1].rank).toBe(RECORD_TOP_RANK);
  });

  it('returns nothing for an empty history', () => {
    const empty = buildRecordFiles(new Map(), 1);
    expect(empty.records.size).toBe(0);
    expect(empty.highlights.size).toBe(0);
  });
});
