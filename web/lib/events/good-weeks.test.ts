import { describe, expect, it } from 'vitest';
import { goodWeekEvents } from './good-weeks';
import type { RecordGameRow } from '@/lib/stat-files/records';
const base = {
  currentSeason: 2026,
  historicMoments: [],
  playerNames: new Map([['1', 'Player One']]),
  now: '2026-10-10T15:00Z',
};
const game: RecordGameRow = {
  player_id: '1',
  team: 'seahawks',
  season: 2026,
  week: 5,
  game_id: 'g1',
  stats: { rushing_yards: 100 },
};
describe('good non-historic weeks', () => {
  it.each(
    Object.entries({
      passing_tds: 3,
      passing_yards: 300,
      rushing_tds: 2,
      rushing_yards: 100,
      receiving_tds: 2,
      receiving_yards: 100,
    })
  )('includes %s at the cutoff but not below', (stat, value) => {
    expect(
      goodWeekEvents({ ...base, currentRows: [{ ...game, stats: { [stat]: value } }] })
    ).toHaveLength(1);
    expect(
      goodWeekEvents({ ...base, currentRows: [{ ...game, stats: { [stat]: value - 1 } }] })
    ).toEqual([]);
  });
  it.each([NaN, Infinity, -100, undefined])('ignores invalid stat %s', (value) => {
    expect(
      goodWeekEvents({ ...base, currentRows: [{ ...game, stats: { rushing_yards: value } }] })
    ).toEqual([]);
  });
  it('emits one fixed-order fact line for all qualifying stats and preserves game team', () => {
    const e = goodWeekEvents({
      ...base,
      currentRows: [{ ...game, stats: { rushing_yards: 100, passing_tds: 3 } }],
    });
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({
      type: 'good_week',
      tier: 'everything',
      teamId: 'seahawks',
      dedupeKey: 'good_week:2026:5:seahawks:1',
      headline: 'Player One had 3 passing touchdowns and 100 rushing yards in Week 5',
      payload: { game_id: 'g1' },
    });
  });
  it('suppresses the entire game when any stat is historic', () => {
    expect(
      goodWeekEvents({
        ...base,
        currentRows: [game],
        historicMoments: [
          {
            kind: 'historic_week',
            stat: 'passing_tds',
            playerId: '1',
            teamId: 'seahawks',
            season: 2026,
            week: 5,
            value: 7,
            fromSeason: 1999,
            rank: 1,
          },
        ],
      })
    ).toEqual([]);
  });
  it('only considers latest week of the current season', () => {
    expect(
      goodWeekEvents({
        ...base,
        currentRows: [
          { ...game, season: 2025, week: 18 },
          { ...game, week: 4 },
          { ...game, stats: {} },
        ],
      })
    ).toEqual([]);
  });
  it('keeps identity across corrections and rejects duplicated game rows', () => {
    expect(
      goodWeekEvents({ ...base, currentRows: [{ ...game, stats: { rushing_yards: 101 } }] })[0]
        .dedupeKey
    ).toBe('good_week:2026:5:seahawks:1');
    expect(() => goodWeekEvents({ ...base, currentRows: [game, game] })).toThrow('Duplicate');
  });
  it('never guesses a player name or a team', () => {
    expect(goodWeekEvents({ ...base, playerNames: new Map(), currentRows: [game] })).toEqual([]);
    expect(goodWeekEvents({ ...base, currentRows: [{ ...game, team: null }] })).toEqual([]);
  });
});
