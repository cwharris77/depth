import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/lib/nflverse/csv';
import { auditForecastSources, parseForecastGames, parseWeeklyTeamStats } from './source-records';

const GAME_HEADER = [
  'game_id',
  'season',
  'week',
  'game_type',
  'gameday',
  'gametime',
  'home_team',
  'away_team',
  'home_score',
  'away_score',
  'home_rest',
  'away_rest',
  'location',
  'home_moneyline',
  'away_moneyline',
].join(',');

const WEEKLY_HEADER = [
  'season',
  'week',
  'team',
  'season_type',
  'game_id',
  'opponent_team',
  'attempts',
  'sacks_suffered',
  'passing_epa',
  'passing_interceptions',
  'passing_20',
  'carries',
  'rushing_epa',
  'rushing_20',
  'def_sacks',
  'def_interceptions',
  'fumble_recovery_opp',
  'fumbles_lost_total',
].join(',');

function gameRows(lines: string[]) {
  return parseCsv([GAME_HEADER, ...lines].join('\n'));
}

function weeklyRows(lines: string[], header = WEEKLY_HEADER) {
  return parseCsv([header, ...lines].join('\n'));
}

const gameLine = (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    game_id: '2012_01_STL_SEA',
    season: '2012',
    week: '1',
    game_type: 'REG',
    gameday: '2012-09-09',
    gametime: '13:00',
    home_team: 'SEA',
    away_team: 'STL',
    home_score: '10',
    away_score: '10',
    home_rest: '7',
    away_rest: '6',
    location: 'Home',
    home_moneyline: '-110',
    away_moneyline: '-110',
    ...overrides,
  };
  return GAME_HEADER.split(',')
    .map((field) => values[field])
    .join(',');
};

const weeklyLine = (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    season: '2012',
    week: '1',
    team: 'SEA',
    season_type: 'REG',
    game_id: '2012_01_STL_SEA',
    opponent_team: 'STL',
    attempts: '30',
    sacks_suffered: '2',
    passing_epa: '1.5',
    passing_interceptions: '0',
    passing_20: '3',
    carries: '25',
    rushing_epa: '-0.5',
    rushing_20: '2',
    def_sacks: '4',
    def_interceptions: '1',
    fumble_recovery_opp: '1',
    fumbles_lost_total: '0',
    ...overrides,
  };
  return WEEKLY_HEADER.split(',')
    .map((field) => values[field])
    .join(',');
};

describe('parseForecastGames', () => {
  it('normalizes historic teams while retaining source kickoff order, ties, and complete markets', () => {
    const parsed = parseForecastGames(
      gameRows([
        gameLine({ game_id: 'later', gameday: '2012-09-09', gametime: '16:25' }),
        gameLine({ game_id: 'earlier', gameday: '2012-09-09', gametime: '13:00' }),
      ])
    );

    expect(parsed.malformedGames).toBe(0);
    expect(parsed.games.map((game) => game.gameId)).toEqual(['earlier', 'later']);
    expect(parsed.games[0]).toMatchObject({
      kickoffKey: '2012-09-09T13:00',
      homeTeamId: 'seahawks',
      awayTeamId: 'rams',
      homeScore: 10,
      awayScore: 10,
      neutralSite: false,
      marketHomeProbability: 0.5,
    });
  });

  it('retains incomplete context as null and recognizes neutral games', () => {
    const parsed = parseForecastGames(
      gameRows([
        gameLine({
          home_score: '',
          away_score: '',
          home_rest: '',
          away_rest: '',
          home_moneyline: '',
          away_moneyline: '',
          location: 'Neutral',
        }),
        gameLine({ game_id: 'one-sided-market', away_moneyline: '' }),
      ])
    );

    expect(parsed.malformedGames).toBe(0);
    expect(parsed.games[0]).toMatchObject({
      homeScore: null,
      awayScore: null,
      homeRest: null,
      awayRest: null,
      homeMoneyline: null,
      awayMoneyline: null,
      marketHomeProbability: null,
      neutralSite: true,
    });
    expect(parsed.games[1]?.marketHomeProbability).toBeNull();
  });

  it('counts unknown teams and malformed required game fields without guessing', () => {
    const parsed = parseForecastGames(
      gameRows([
        gameLine({ game_id: 'known' }),
        gameLine({ game_id: 'unknown-team', home_team: 'XXX' }),
        gameLine({ game_id: 'bad-week', week: 'one' }),
        gameLine({ game_id: 'bad-location', location: 'Away' }),
      ])
    );

    expect(parsed.games.map((game) => game.gameId)).toEqual(['known']);
    expect(parsed.malformedGames).toBe(3);
  });

  it('ignores otherwise valid games outside the forecast source window', () => {
    const parsed = parseForecastGames(
      gameRows([
        gameLine({ game_id: 'pre-window', season: '2010' }),
        gameLine({ game_id: 'in-window' }),
      ])
    );

    expect(parsed).toMatchObject({ malformedGames: 0, games: [{ gameId: 'in-window' }] });
  });
});

describe('parseWeeklyTeamStats', () => {
  it('keeps valid rows with blank feature-local metrics and sorts their identities', () => {
    const parsed = parseWeeklyTeamStats(
      weeklyRows([
        weeklyLine({ game_id: 'z-game', team: 'STL', opponent_team: 'SEA', passing_epa: '' }),
        weeklyLine({ game_id: 'a-game', team: 'SEA', opponent_team: 'STL', attempts: '' }),
      ]),
      2012
    );

    expect(parsed.malformedTeamRows).toBe(0);
    expect(parsed.teamStats.map((row) => row.gameId)).toEqual(['a-game', 'z-game']);
    expect(parsed.teamStats[0]).toMatchObject({ attempts: null, teamId: 'seahawks' });
    expect(parsed.teamStats[1]).toMatchObject({ passingEpa: null, teamId: 'rams' });
  });

  it('excludes every duplicate identity and every malformed row', () => {
    const parsed = parseWeeklyTeamStats(
      weeklyRows([
        weeklyLine({ game_id: 'duplicate' }),
        weeklyLine({ game_id: 'duplicate', attempts: '31' }),
        weeklyLine({ game_id: 'non-finite', attempts: 'Infinity' }),
        weeklyLine({ game_id: 'wrong-season', season: '2013' }),
        weeklyLine({ game_id: 'unknown-team', team: 'XXX' }),
      ]),
      2012
    );

    expect(parsed.teamStats).toEqual([]);
    expect(parsed.malformedTeamRows).toBe(5);
  });

  it('counts a missing required header as malformed rather than inferring it', () => {
    const headerWithoutOpponent = WEEKLY_HEADER.replace(',opponent_team', '');
    const lines = [
      weeklyLine()
        .split(',')
        .filter((_, index) => index !== 5)
        .join(','),
    ];

    const parsed = parseWeeklyTeamStats(weeklyRows(lines, headerWithoutOpponent), 2012);

    expect(parsed.teamStats).toEqual([]);
    expect(parsed.malformedTeamRows).toBe(1);
  });
});

describe('auditForecastSources', () => {
  it('accepts feature columns from 2012- and 2025-style weekly headers and matching team pairs', () => {
    const games = gameRows([gameLine(), gameLine({ game_id: '2025_01_STL_SEA', season: '2025' })]);
    const pair = weeklyRows([weeklyLine(), weeklyLine({ team: 'STL', opponent_team: 'SEA' })]);

    const audit = auditForecastSources(games, {
      2012: pair,
      2025: pair.map((line) => ({ ...line, season: '2025', game_id: '2025_01_STL_SEA' })),
    });

    expect(audit).toMatchObject({
      ok: true,
      gameCountBySeason: { 2012: 1, 2025: 1 },
      teamRowCountBySeason: { 2012: 2, 2025: 2 },
      missingGameFields: [],
      missingWeeklyFieldsBySeason: { 2012: [], 2025: [] },
      malformedGames: 0,
      malformedTeamRowsBySeason: { 2012: 0, 2025: 0 },
    });
  });

  it('fails when weekly game identities are not reciprocal', () => {
    const audit = auditForecastSources(gameRows([gameLine()]), {
      2012: weeklyRows([weeklyLine(), weeklyLine({ team: 'STL', opponent_team: 'BAL' })]),
    });

    expect(audit.ok).toBe(false);
    expect(audit.malformedTeamRowsBySeason).toEqual({ 2012: 2 });
  });
});
