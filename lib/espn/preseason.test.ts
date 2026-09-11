import { describe, it, expect } from 'vitest';
import hallOfFame from './fixtures/scoreboard-preseason-2026-week-1.json';
import week1 from './fixtures/scoreboard-preseason-2026-week-2.json';
import cancelled2020 from './fixtures/scoreboard-preseason-2020-week-2.json';
import {
  preseasonWeeks,
  toPreseasonGameRows,
  type EspnScoreboard,
  type EspnScoreboardEvent,
  type PreseasonWeek,
} from './preseason';

// Fixtures are trimmed saves of ESPN's league scoreboard (`scoreboard?dates=YYYY&
// seasontype=1&week=N`, fetched 2026-09-10): the calendar plus the fields the transform
// reads. Never a live fetch at test time.

// ESPN team ids in the fixtures -> our slugs (the ingest builds this from ESPN's /teams).
const ESPN_TEAMS: Record<string, string> = {
  '2': 'bills',
  '13': 'raiders',
  '15': 'dolphins',
  '22': 'cardinals',
  '26': 'seahawks',
  '28': 'commanders',
  '29': 'panthers',
};
const resolveTeamId = (id: string) => ESPN_TEAMS[id] ?? null;

const HOF = hallOfFame as EspnScoreboard;
const WEEK_1 = week1 as EspnScoreboard;
const weeks2026 = preseasonWeeks(HOF);
const weekByValue = (value: string): PreseasonWeek => {
  const week = weeks2026.find((w) => w.value === value);
  if (!week) throw new Error(`fixture calendar has no week ${value}`);
  return week;
};

function withEvent(
  scoreboard: EspnScoreboard,
  edit: (event: EspnScoreboardEvent) => void
): EspnScoreboard {
  const copy = structuredClone(scoreboard);
  edit(copy.events![0]);
  return copy;
}

describe('preseasonWeeks', () => {
  it('numbers the Hall of Fame game 0 and each labelled preseason week N', () => {
    expect(weeks2026.map((w) => [w.value, w.week])).toEqual([
      ['1', 0],
      ['2', 1],
      ['3', 2],
      ['4', 3],
    ]);
  });

  it('drops a calendar entry it cannot recognise instead of numbering it by position', () => {
    const scoreboard = structuredClone(HOF);
    scoreboard.leagues![0].calendar!.find((c) => c.value === '1')!.entries![1].label =
      'Exhibition Weekend';
    expect(preseasonWeeks(scoreboard).map((w) => w.week)).toEqual([0, 2, 3]);
  });

  it('returns no weeks for a response without a calendar', () => {
    expect(preseasonWeeks({})).toEqual([]);
  });
});

describe('toPreseasonGameRows', () => {
  const { games, schedules, skipped, cancelled } = toPreseasonGameRows(
    2026,
    [
      { week: weekByValue('1'), scoreboard: HOF },
      { week: weekByValue('2'), scoreboard: WEEK_1 },
    ],
    resolveTeamId
  );

  it('writes every fixture game as a PRE row with an id nflverse cannot produce', () => {
    expect(skipped).toBe(0);
    expect(cancelled).toBe(0);
    expect(games.map((g) => g.game_id).sort()).toEqual([
      '2026_PRE_401873271',
      '2026_PRE_401873277',
      '2026_PRE_401873282',
    ]);
    expect(games.every((g) => g.game_type === 'PRE' && g.season === 2026)).toBe(true);
  });

  it('maps a final game from ESPN fields to nflverse-shaped columns', () => {
    expect(games.find((g) => g.game_id === '2026_PRE_401873282')).toEqual({
      game_id: '2026_PRE_401873282',
      season: 2026,
      game_type: 'PRE',
      week: 1,
      // 2026-08-15T17:00Z is 1pm Eastern, nflverse's gameday/gametime zone.
      gameday: '2026-08-15',
      gametime: '13:00',
      home_team_id: 'bills',
      away_team_id: 'panthers',
      home_score: 29,
      away_score: 14,
      location: 'Home',
      away_moneyline: null,
      home_moneyline: null,
      spread_line: null,
      away_spread_odds: null,
      home_spread_odds: null,
      total_line: null,
      under_odds: null,
      over_odds: null,
      market_updated_at: null,
    });
  });

  it('numbers the Hall of Fame game week 0, marks it neutral, and dates it in Eastern', () => {
    const game = games.find((g) => g.game_id === '2026_PRE_401873271')!;
    // 2026-08-07T00:00Z is 8pm on Aug 6 in Eastern time.
    expect([game.week, game.location, game.gameday, game.gametime]).toEqual([
      0,
      'Neutral',
      '2026-08-06',
      '20:00',
    ]);
  });

  it('adds one schedule row per team so the games FKs resolve', () => {
    expect(schedules.map((s) => s.team_id).sort()).toEqual([
      'bills',
      'cardinals',
      'commanders',
      'dolphins',
      'panthers',
    ]);
    expect(schedules.every((s) => s.season === 2026)).toBe(true);
  });

  it('drops cancelled games without counting them as malformed', () => {
    const weeks2020 = preseasonWeeks(cancelled2020 as EspnScoreboard);
    const result = toPreseasonGameRows(
      2020,
      [{ week: weeks2020[1], scoreboard: cancelled2020 as EspnScoreboard }],
      resolveTeamId
    );
    expect(result).toEqual({ games: [], schedules: [], skipped: 0, cancelled: 1 });
  });

  it('keeps null scores for a game that has not finished (ESPN reports "0")', () => {
    const scheduled = withEvent(WEEK_1, (event) => {
      event.competitions[0].status.type = {
        name: 'STATUS_SCHEDULED',
        state: 'pre',
        completed: false,
      };
      event.competitions[0].competitors.forEach((c) => (c.score = '0'));
    });
    const [game] = toPreseasonGameRows(
      2026,
      [{ week: weekByValue('2'), scoreboard: scheduled }],
      resolveTeamId
    ).games;
    expect([game.home_score, game.away_score]).toEqual([null, null]);
  });

  it('dedupes an event returned by two week buckets', () => {
    const result = toPreseasonGameRows(
      2026,
      [
        { week: weekByValue('2'), scoreboard: WEEK_1 },
        { week: weekByValue('2'), scoreboard: WEEK_1 },
      ],
      resolveTeamId
    );
    expect(result.games).toHaveLength(2);
    expect(result.schedules).toHaveLength(4);
  });

  const malformed: [string, (event: EspnScoreboardEvent) => void][] = [
    // ESPN's pre-2009 buckets sit outside their own calendar windows; never guess a week.
    ['kicks off outside its calendar week', (e) => (e.date = '2026-08-25T17:00Z')],
    ['belongs to another season', (e) => (e.season.year = 2025)],
    ['is not a preseason game', (e) => (e.season.type = 2)],
    ['has an unknown team', (e) => (e.competitions[0].competitors[0].team.id = '999')],
    ['has no away competitor', (e) => e.competitions[0].competitors.splice(1, 1)],
    ['has an unparseable date', (e) => (e.date = 'not-a-date')],
  ];
  for (const [label, edit] of malformed) {
    it(`skips and counts an event that ${label}`, () => {
      const result = toPreseasonGameRows(
        2026,
        [{ week: weekByValue('2'), scoreboard: withEvent(WEEK_1, edit) }],
        resolveTeamId
      );
      expect(result.skipped).toBe(1);
      expect(result.games.map((g) => g.game_id)).toEqual(['2026_PRE_401873282']);
    });
  }
});
