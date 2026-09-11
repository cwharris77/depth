import { describe, expect, it } from 'vitest';
import type { ForecastGame, WeeklyTeamStat } from './source-records';
import { buildRawForecastDataset } from './dataset';

const TEAMS = { home: 'alpha', away: 'bravo' } as const;

function game(overrides: Partial<ForecastGame> & Pick<ForecastGame, 'gameId'>): ForecastGame {
  return {
    season: 2012,
    week: 1,
    seasonType: 'REG',
    kickoffKey: '2012-09-09T13:00',
    homeTeamId: TEAMS.home,
    awayTeamId: TEAMS.away,
    homeScore: 21,
    awayScore: 14,
    homeRest: 7,
    awayRest: 7,
    neutralSite: false,
    homeMoneyline: -110,
    awayMoneyline: -110,
    marketHomeProbability: 0.5,
    ...overrides,
  };
}

function weeklyRow(
  sourceGame: ForecastGame,
  teamId: string,
  opponentTeamId: string,
  overrides: Partial<WeeklyTeamStat> = {}
): WeeklyTeamStat {
  return {
    gameId: sourceGame.gameId,
    season: sourceGame.season,
    week: sourceGame.week,
    seasonType: sourceGame.seasonType,
    teamId,
    opponentTeamId,
    attempts: 20,
    sacksSuffered: 2,
    passingEpa: 6,
    passingInterceptions: 1,
    passing20: 3,
    carries: 18,
    rushingEpa: 2,
    rushing20: 1,
    defensiveSacks: 3,
    defensiveInterceptions: 2,
    opponentFumbleRecoveries: 1,
    fumblesLost: 1,
    ...overrides,
  };
}

function weeklyPair(
  sourceGame: ForecastGame,
  home: Partial<WeeklyTeamStat> = {},
  away: Partial<WeeklyTeamStat> = {}
): WeeklyTeamStat[] {
  return [
    weeklyRow(sourceGame, sourceGame.homeTeamId, sourceGame.awayTeamId, home),
    weeklyRow(sourceGame, sourceGame.awayTeamId, sourceGame.homeTeamId, away),
  ];
}

function feature(result: ReturnType<typeof buildRawForecastDataset>, gameId: string, name: string) {
  const example = result.examples.find((row) => row.gameId === gameId);
  if (!example) throw new Error(`Missing example ${gameId}`);
  return example.teamFeatures[name as keyof typeof example.teamFeatures];
}

describe('buildRawForecastDataset', () => {
  it('builds target features before own or later-kickoff evidence and isolates score mutations', () => {
    const prior = game({
      gameId: '2011-prior',
      season: 2011,
      kickoffKey: '2011-12-01T13:00',
    });
    const target = game({
      gameId: '2012-target',
      homeScore: 10,
      awayScore: 17,
      kickoffKey: '2012-09-09T13:00',
    });
    const later = game({
      gameId: '2012-later',
      week: 1,
      kickoffKey: '2012-09-09T16:25',
    });
    const games = [prior, target, later];
    const weeklyRows = [...weeklyPair(prior), ...weeklyPair(target), ...weeklyPair(later)];

    const before = buildRawForecastDataset(games, weeklyRows);
    const targetId = target.gameId;
    const mutated = buildRawForecastDataset(
      games.map((sourceGame) =>
        sourceGame.gameId === targetId ? { ...sourceGame, homeScore: 99, awayScore: 0 } : sourceGame
      ),
      weeklyRows
    );

    expect(before.examples.map((row) => row.gameId)).toEqual(['2012-target', '2012-later']);
    expect(before.examples[0].label).toBe(0);
    expect(mutated.examples[0].label).toBe(1);
    expect(mutated.examples[0].teamFeatures).toEqual(before.examples[0].teamFeatures);
    expect(mutated.examples[0].latestSourceKickoffKey).toBe(
      before.examples[0].latestSourceKickoffKey
    );
    expect(before.examples[0].teamFeatures.offense_epa_per_opportunity_rolling4.home).toMatchObject(
      { source: 'prior-season', gameIds: ['2011-prior'] }
    );
    expect(JSON.stringify(before.examples[0].teamFeatures)).not.toContain('2012-target');
    expect(JSON.stringify(before.examples[0].teamFeatures)).not.toContain('2012-later');
  });

  it('uses the most recent four games for rolling values and all prior games for season values', () => {
    const priors = Array.from({ length: 5 }, (_, index) =>
      game({
        gameId: `prior-${index + 1}`,
        season: 2013,
        week: index + 1,
        kickoffKey: `2013-09-${String(index + 1).padStart(2, '0')}T13:00`,
      })
    );
    const target = game({
      gameId: 'rolling-target',
      season: 2013,
      week: 6,
      kickoffKey: '2013-09-20T13:00',
    });
    const weeklyRows = priors.flatMap((sourceGame, index) =>
      weeklyPair(sourceGame, { passingEpa: index + 1, rushingEpa: 0 })
    );

    const result = buildRawForecastDataset([...priors, target], weeklyRows);
    const rolling = feature(result, target.gameId, 'offense_epa_per_opportunity_rolling4').home;
    const season = feature(result, target.gameId, 'offense_epa_per_opportunity_season').home;

    expect(rolling.gameIds).toEqual(['prior-2', 'prior-3', 'prior-4', 'prior-5']);
    expect(rolling.value).toBe(14 / (40 * 4));
    expect(season.gameIds).toEqual(['prior-1', 'prior-2', 'prior-3', 'prior-4', 'prior-5']);
    expect(season.value).toBe(15 / (40 * 5));
  });

  it('selects rolling windows independently from each feature valid evidence stream', () => {
    const priors = Array.from({ length: 5 }, (_, index) =>
      game({
        gameId: `feature-stream-${index + 1}`,
        season: 2013,
        week: index + 1,
        kickoffKey: `2013-10-${String(index + 1).padStart(2, '0')}T13:00`,
      })
    );
    const target = game({
      gameId: 'feature-stream-target',
      season: 2013,
      week: 6,
      kickoffKey: '2013-10-10T13:00',
    });
    const weeklyRows = priors.flatMap((sourceGame, index) =>
      weeklyPair(sourceGame, index === 4 ? { passingEpa: null } : {})
    );

    const result = buildRawForecastDataset([...priors, target], weeklyRows);

    expect(
      feature(result, target.gameId, 'offense_epa_per_opportunity_rolling4').home.gameIds
    ).toEqual(['feature-stream-1', 'feature-stream-2', 'feature-stream-3', 'feature-stream-4']);
    expect(feature(result, target.gameId, 'scoring_margin_per_game_rolling4').home.gameIds).toEqual(
      ['feature-stream-2', 'feature-stream-3', 'feature-stream-4', 'feature-stream-5']
    );
  });

  it('resets season windows, limits prior fallback to REG, and admits earlier postseason history', () => {
    const priorReg = game({
      gameId: '2012-reg',
      season: 2012,
      kickoffKey: '2012-12-01T13:00',
    });
    const priorPost = game({
      gameId: '2012-post',
      season: 2012,
      week: 19,
      seasonType: 'POST',
      kickoffKey: '2013-01-05T13:00',
    });
    const early = game({
      gameId: '2013-early',
      season: 2013,
      kickoffKey: '2013-09-01T13:00',
    });
    const currentReg = game({
      gameId: '2013-reg',
      season: 2013,
      kickoffKey: '2013-12-01T13:00',
    });
    const currentPost = game({
      gameId: '2013-post-1',
      season: 2013,
      week: 19,
      seasonType: 'POST',
      kickoffKey: '2014-01-04T13:00',
    });
    const postTarget = game({
      gameId: '2013-post-target',
      season: 2013,
      week: 20,
      seasonType: 'POST',
      kickoffKey: '2014-01-11T13:00',
    });
    const games = [priorReg, priorPost, early, currentReg, currentPost, postTarget];
    const weeklyRows = games.slice(0, -1).flatMap((sourceGame) => weeklyPair(sourceGame));

    const result = buildRawForecastDataset(games, weeklyRows);
    const earlyFeature = feature(result, early.gameId, 'scoring_margin_per_game_season').home;
    const postFeature = feature(result, postTarget.gameId, 'scoring_margin_per_game_season').home;

    expect(earlyFeature).toMatchObject({ source: 'prior-season', gameIds: ['2012-reg'] });
    expect(postFeature).toMatchObject({
      source: 'current',
      gameIds: ['2013-early', '2013-reg', '2013-post-1'],
    });
  });

  it('falls back feature-by-feature and rejects zero denominators without discarding other evidence', () => {
    const prior = game({
      gameId: '2012-valid-reg',
      season: 2012,
      kickoffKey: '2012-12-01T13:00',
    });
    const current = game({
      gameId: '2013-partial',
      season: 2013,
      kickoffKey: '2013-09-01T13:00',
    });
    const target = game({
      gameId: '2013-feature-target',
      season: 2013,
      week: 2,
      kickoffKey: '2013-09-08T13:00',
    });
    const weeklyRows = [
      ...weeklyPair(prior),
      ...weeklyPair(current, {
        attempts: 0,
        sacksSuffered: 0,
        carries: 0,
        passing20: null,
      }),
    ];

    const result = buildRawForecastDataset([prior, current, target], weeklyRows);
    const offense = feature(result, target.gameId, 'offense_epa_per_opportunity_rolling4').home;
    const explosive = feature(result, target.gameId, 'explosive_play_rate_rolling4').home;
    const scoring = feature(result, target.gameId, 'scoring_margin_per_game_rolling4').home;

    expect(offense).toMatchObject({ source: 'prior-season', gameIds: ['2012-valid-reg'] });
    expect(explosive).toMatchObject({ source: 'prior-season', gameIds: ['2012-valid-reg'] });
    expect(scoring).toMatchObject({ source: 'current', gameIds: ['2013-partial'], value: 7 });
  });

  it('aggregates every feature from its prescribed numerator and denominator', () => {
    const prior = game({ gameId: 'formula-prior', kickoffKey: '2012-09-01T13:00' });
    const target = game({
      gameId: 'formula-target',
      week: 2,
      kickoffKey: '2012-09-08T13:00',
    });

    const result = buildRawForecastDataset([prior, target], weeklyPair(prior));
    const home = Object.fromEntries(
      Object.entries(result.examples[1].teamFeatures).map(([name, sides]) => [
        name,
        sides.home.value,
      ])
    );

    expect(home).toMatchObject({
      offense_epa_per_opportunity_season: 8 / 40,
      defense_epa_allowed_per_opportunity_season: 8 / 40,
      explosive_play_rate_season: 4 / 40,
      pressure_balance_season: 3 / 22 - 2 / 22,
      turnover_margin_per_game_season: 1,
      scoring_margin_per_game_season: 7,
    });
  });

  it('hard-fails when an earlier kickoff claims a later target week', () => {
    const malformedHistory = game({
      gameId: 'future-week-history',
      week: 10,
      kickoffKey: '2012-09-01T13:00',
    });
    const target = game({
      gameId: 'week-two-target',
      week: 2,
      kickoffKey: '2012-09-08T13:00',
    });

    expect(() =>
      buildRawForecastDataset([malformedHistory, target], weeklyPair(malformedHistory))
    ).toThrow('Leaking provenance future-week-history for target week-two-target');
  });

  it('diagnoses mutually exclusive target exclusions and unavailable paired history', () => {
    const preWindow = game({
      gameId: '2011-history',
      season: 2011,
      kickoffKey: '2011-12-01T13:00',
    });
    const unplayed = game({
      gameId: 'unplayed',
      kickoffKey: '2012-09-01T13:00',
      homeScore: null,
      awayScore: null,
    });
    const tie = game({
      gameId: 'tie',
      kickoffKey: '2012-09-02T13:00',
      homeScore: 17,
      awayScore: 17,
    });
    const noMarket = game({
      gameId: 'no-market',
      kickoffKey: '2012-09-03T13:00',
      marketHomeProbability: null,
    });
    const noRest = game({
      gameId: 'no-rest',
      kickoffKey: '2012-09-04T13:00',
      homeRest: null,
    });
    const missingPair = game({
      gameId: 'missing-pair',
      kickoffKey: '2012-09-05T13:00',
    });
    const future = game({
      gameId: 'future',
      week: 2,
      kickoffKey: '2012-09-12T13:00',
    });
    const games = [preWindow, unplayed, tie, noMarket, noRest, missingPair, future];
    const weeklyRows = [
      ...weeklyPair(preWindow),
      ...weeklyPair(tie),
      ...weeklyPair(noMarket),
      ...weeklyPair(noRest),
      weeklyPair(missingPair)[0],
      ...weeklyPair(future),
    ];

    const result = buildRawForecastDataset(games, weeklyRows);

    expect(result.examples.map((row) => row.gameId)).toEqual(['missing-pair', 'future']);
    expect(result.diagnostics).toEqual({
      sourceGames: 7,
      emittedExamples: 2,
      excludedBeforeTargetWindow: 1,
      excludedUnplayed: 1,
      excludedTies: 1,
      excludedNoMarket: 1,
      excludedMissingContext: 1,
      historyGamesMissingWeeklyPair: 1,
    });
    expect(
      feature(result, future.gameId, 'scoring_margin_per_game_season').home.gameIds
    ).not.toContain('missing-pair');
    expect(result.examples.find((row) => row.gameId === 'missing-pair')).toBeDefined();
  });

  it('keeps all consumer game sets aligned and is invariant to reversed inputs', () => {
    const first = game({ gameId: 'first', kickoffKey: '2012-09-01T13:00' });
    const second = game({ gameId: 'second', week: 2, kickoffKey: '2012-09-08T13:00' });
    const excluded = game({
      gameId: 'excluded',
      week: 3,
      kickoffKey: '2012-09-15T13:00',
      marketHomeProbability: null,
    });
    const games = [second, excluded, first];
    const weeklyRows = [...weeklyPair(second), ...weeklyPair(first), ...weeklyPair(excluded)];

    const forward = buildRawForecastDataset(games, weeklyRows);
    const reversed = buildRawForecastDataset([...games].reverse(), [...weeklyRows].reverse());
    const marketIds = forward.examples.map(({ gameId, marketHomeProbability }) => ({
      gameId,
      marketHomeProbability,
    }));
    const baselineIds = forward.examples.map(({ gameId, label }) => ({ gameId, label }));
    const candidateIds = forward.examples.map(({ gameId, teamFeatures }) => ({
      gameId,
      teamFeatures,
    }));

    expect(marketIds.map((row) => row.gameId)).toEqual(['first', 'second']);
    expect(baselineIds.map((row) => row.gameId)).toEqual(marketIds.map((row) => row.gameId));
    expect(candidateIds.map((row) => row.gameId)).toEqual(marketIds.map((row) => row.gameId));
    expect(reversed).toEqual(forward);
  });
});
