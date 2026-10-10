import { describe, expect, it } from 'vitest';
import { buildRecordFiles, type RecordGameRow, type RecordLine } from '@/lib/stat-files/records';
import { findStatMoments, statMomentEvents, type StatMoment } from './stat-events';

const SEASON = 2026;

function game(
  player: string,
  season: number,
  week: number,
  stats: RecordLine,
  team: string | null = 'bills'
): RecordGameRow {
  return { player_id: player, season, week, team, game_id: `${season}_${week}_${player}`, stats };
}

// Eleven past single games: 300, 290, ... 200 rushing yards, one player each.
const PAST_GAMES = Array.from({ length: 11 }, (_, i) =>
  game(`old${i}`, 2010, 1, { rushing_yards: 300 - i * 10 })
);

function moments(current: RecordGameRow[], past: RecordGameRow[] = PAST_GAMES): StatMoment[] {
  const rowsBySeason = new Map<number, RecordGameRow[]>([
    [2010, past],
    [SEASON, current],
  ]);
  return findStatMoments({
    currentSeason: SEASON,
    records: buildRecordFiles(rowsBySeason, 1).records,
    currentRows: current,
  });
}

const historic = (found: StatMoment[]) => found.filter((m) => m.kind === 'historic_week');
const chases = (found: StatMoment[]) => found.filter((m) => m.kind === 'record_chase');

describe('findStatMoments: historic week', () => {
  it('finds a game with at most ten performances at or above it', () => {
    // 300..220 is nine past games at or above 215; this one makes ten.
    expect(historic(moments([game('x', SEASON, 5, { rushing_yards: 215 })]))).toEqual([
      {
        kind: 'historic_week',
        stat: 'rushing_yards',
        playerId: 'x',
        teamId: 'bills',
        season: SEASON,
        week: 5,
        value: 215,
        rank: 10,
        fromSeason: 2010,
      },
    ]);
  });

  it('ignores the eleventh-best performance', () => {
    expect(historic(moments([game('x', SEASON, 5, { rushing_yards: 205 })]))).toEqual([]);
  });

  it('ignores a common tied line however high its shared rank', () => {
    const tied = Array.from({ length: 12 }, (_, i) => game(`t${i}`, 2010, 1, { rushing_tds: 3 }));
    expect(historic(moments([game('x', SEASON, 5, { rushing_tds: 3 })], tied))).toEqual([]);
  });

  it('only reports the latest week of the season', () => {
    const found = historic(
      moments([
        game('x', SEASON, 3, { rushing_yards: 400 }),
        game('y', SEASON, 5, { rushing_yards: 20 }),
      ])
    );
    expect(found).toEqual([]);
  });

  it('skips a game with no team', () => {
    expect(historic(moments([game('x', SEASON, 5, { rushing_yards: 400 }, null)]))).toEqual([]);
  });

  it('returns nothing before the season has a game', () => {
    expect(moments([])).toEqual([]);
  });
});

describe('findStatMoments: record chase', () => {
  // The standing single-season mark is 2,000 rushing yards.
  const past = [
    game('legend', 2010, 1, { rushing_yards: 1000 }),
    game('legend', 2010, 2, { rushing_yards: 1000 }),
  ];
  const total = (yards: number) => [
    game('x', SEASON, 1, { rushing_yards: yards - 100 }),
    game('x', SEASON, 2, { rushing_yards: 100 }),
  ];

  it('ignores a total below 90% of the mark', () => {
    expect(chases(moments(total(1799), past))).toEqual([]);
  });

  it('reports an approach at exactly 90%', () => {
    expect(chases(moments(total(1800), past))).toEqual([
      {
        kind: 'record_chase',
        stat: 'rushing_yards',
        playerId: 'x',
        teamId: 'bills',
        season: SEASON,
        value: 1800,
        record: 2000,
        broken: false,
        fromSeason: 2010,
      },
    ]);
  });

  it('treats a tie as an approach and one more as broken', () => {
    expect(chases(moments(total(2000), past))[0]).toMatchObject({ broken: false });
    expect(chases(moments(total(2001), past))[0]).toMatchObject({ broken: true, record: 2000 });
  });

  it('never adds a season across two teams', () => {
    const split = [
      game('x', SEASON, 1, { rushing_yards: 1000 }, 'bills'),
      game('x', SEASON, 2, { rushing_yards: 1000 }, 'jets'),
    ];
    expect(chases(moments(split, past))).toEqual([]);
  });

  it('reports nothing when no earlier season exists to chase', () => {
    expect(chases(moments(total(5000), []))).toEqual([]);
  });
});

describe('statMomentEvents', () => {
  const NOW = '2026-10-13T16:00:00.000Z';
  const week: StatMoment = {
    kind: 'historic_week',
    stat: 'rushing_yards',
    playerId: 'x',
    teamId: 'bills',
    season: SEASON,
    week: 5,
    value: 215,
    rank: 10,
    fromSeason: 1999,
  };
  const chase: StatMoment = {
    kind: 'record_chase',
    stat: 'rushing_yards',
    playerId: 'x',
    teamId: 'bills',
    season: SEASON,
    value: 1900,
    record: 2097,
    broken: false,
    fromSeason: 1999,
  };
  const names = new Map([['x', 'James Cook']]);

  it('renders a historic week', () => {
    expect(statMomentEvents([week], { playerNames: names, now: NOW })).toEqual([
      {
        dedupeKey: 'historic_week:rushing_yards:2026:5:x',
        type: 'historic_week',
        tier: 'big_moments',
        teamId: 'bills',
        playerId: 'x',
        headline: 'James Cook had 215 rushing yards in Week 5, the 10th-most in a game since 1999',
        detail: null,
        payload: {
          stat: 'rushing_yards',
          value: 215,
          rank: 10,
          season: SEASON,
          week: 5,
          from_season: 1999,
          player_name: 'James Cook',
        },
        source: 'nflverse_stats',
        occurredAt: NOW,
      },
    ]);
  });

  it('gives an approach and a broken mark different keys, each stable across runs', () => {
    const approach = statMomentEvents([chase], { playerNames: names, now: NOW })[0];
    const later = statMomentEvents([{ ...chase, value: 1950 }], {
      playerNames: names,
      now: '2026-10-20T16:00:00.000Z',
    })[0];
    const broken = statMomentEvents([{ ...chase, value: 2110, broken: true }], {
      playerNames: names,
      now: NOW,
    })[0];
    expect(approach.dedupeKey).toBe('record_chase:rushing_yards:2026:x:bills:approach');
    expect(later.dedupeKey).toBe(approach.dedupeKey);
    expect(broken.dedupeKey).toBe('record_chase:rushing_yards:2026:x:bills:broken');
    expect(broken.headline).toBe(
      'James Cook has 2,110 rushing yards, the most in a season since 1999'
    );
  });

  it('skips a moment whose player has no name', () => {
    expect(statMomentEvents([week], { playerNames: new Map(), now: NOW })).toEqual([]);
  });
});
