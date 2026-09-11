import { describe, expect, it } from 'vitest';
import { TEAM_FEATURE_NAMES, type TeamFeatureName } from './contracts';
import type { RawForecastExample, RawTeamFeatureValue } from './dataset';
import {
  CONTEXT_FEATURE_NAMES,
  MODEL_FEATURE_NAMES,
  fitPreprocessor,
  transformExamples,
  type ForecastPreprocessor,
} from './preprocessing';

function value(
  input: number | null,
  source: RawTeamFeatureValue['source'] = 'current'
): RawTeamFeatureValue {
  return { value: input, source, gameIds: [], latestKickoffKey: null };
}

function teamFeatures(
  build: (
    name: TeamFeatureName,
    index: number
  ) => RawForecastExample['teamFeatures'][TeamFeatureName]
): RawForecastExample['teamFeatures'] {
  return Object.fromEntries(
    TEAM_FEATURE_NAMES.map((name, index) => [name, build(name, index)])
  ) as RawForecastExample['teamFeatures'];
}

function example(overrides: Partial<RawForecastExample> = {}): RawForecastExample {
  return {
    gameId: 'game',
    season: 2012,
    week: 1,
    kickoffKey: '2012-09-09T13:00',
    label: 1,
    marketHomeProbability: 0.5,
    neutralSite: false,
    restDifferential: 0,
    postseason: false,
    teamFeatures: teamFeatures(() => ({ home: value(10), away: value(5) })),
    latestSourceKickoffKey: null,
    ...overrides,
  };
}

function preprocessor(overrides: Partial<ForecastPreprocessor> = {}): ForecastPreprocessor {
  return {
    featureNames: MODEL_FEATURE_NAMES,
    developmentSeasons: [2012],
    teamFeatureMedians: Object.fromEntries(TEAM_FEATURE_NAMES.map((name) => [name, 5])) as Record<
      TeamFeatureName,
      number
    >,
    means: Object.fromEntries(MODEL_FEATURE_NAMES.map((name) => [name, 0])),
    standardDeviations: Object.fromEntries(MODEL_FEATURE_NAMES.map((name) => [name, 1])),
    ...overrides,
  };
}

function valuesByName(row: ReturnType<typeof transformExamples>[number]): Record<string, number> {
  return Object.fromEntries(
    MODEL_FEATURE_NAMES.map((name, index) => [name, row.featureValues[index]])
  );
}

describe('forecast preprocessing', () => {
  it('fits medians and scaling only from development rows', () => {
    const selected = 'offense_epa_per_opportunity_rolling4' as const;
    const developmentRows = [
      example({
        gameId: 'development-a',
        season: 2012,
        marketHomeProbability: 0.5,
        restDifferential: 2,
        teamFeatures: teamFeatures((name) => ({
          home: value(name === selected ? 8 : 4),
          away: value(2),
        })),
      }),
      example({
        gameId: 'development-b',
        season: 2022,
        marketHomeProbability: 0.75,
        restDifferential: 4,
        teamFeatures: teamFeatures((name) => ({
          home: name === selected ? value(null, 'unavailable') : value(6),
          away: value(name === selected ? 6 : 2, name === selected ? 'prior-season' : 'current'),
        })),
      }),
    ];
    const holdoutSentinel = example({
      gameId: 'holdout-sentinel',
      season: 2023,
      restDifferential: 999_999,
      teamFeatures: teamFeatures(() => ({ home: value(999_999), away: value(999_999) })),
    });

    const fitted = fitPreprocessor(developmentRows);

    expect(fitted.developmentSeasons).toEqual([2012, 2022]);
    expect(fitted.teamFeatureMedians[selected]).toBe(6);
    expect(fitted.means.market_logit).toBeCloseTo(Math.log(3) / 2);
    expect(fitted.standardDeviations.market_logit).toBeCloseTo(Math.log(3) / 2);
    expect(fitted.means.rest_differential).toBe(3);
    expect(fitted.standardDeviations.rest_differential).toBe(1);
    expect(fitted.means[`${selected}_differential`]).toBe(3);
    expect(fitted.standardDeviations[`${selected}_differential`]).toBe(3);
    expect(fitted.means.neutral_site).toBe(0);
    expect(fitted.standardDeviations[`${selected}_away_fallback`]).toBe(1);
    expect(JSON.stringify(fitted)).not.toContain('999999');
    expect(() => fitPreprocessor([...developmentRows, holdoutSentinel])).toThrow(/development/i);
  });

  it('uses current values before prior-season values before development medians with exact flags', () => {
    const fitted = preprocessor();
    const row = example({
      teamFeatures: teamFeatures((_name, index) => {
        switch (index % 4) {
          case 0:
            return { home: value(100), away: value(10) };
          case 1:
            return { home: value(40, 'prior-season'), away: value(10) };
          case 2:
            return { home: value(40), away: value(10, 'prior-season') };
          default:
            return { home: value(null, 'unavailable'), away: value(null, 'unavailable') };
        }
      }),
    });

    const transformed = valuesByName(transformExamples([row], fitted)[0]);

    for (const [index, name] of TEAM_FEATURE_NAMES.entries()) {
      const prefix = `${name}_`;
      if (index % 4 === 0) {
        expect(transformed[`${prefix}differential`]).toBe(90);
        expect(transformed[`${prefix}home_fallback`]).toBe(0);
        expect(transformed[`${prefix}away_fallback`]).toBe(0);
      } else if (index % 4 === 1) {
        expect(transformed[`${prefix}differential`]).toBe(30);
        expect(transformed[`${prefix}home_fallback`]).toBe(1);
        expect(transformed[`${prefix}away_fallback`]).toBe(0);
      } else if (index % 4 === 2) {
        expect(transformed[`${prefix}differential`]).toBe(30);
        expect(transformed[`${prefix}home_fallback`]).toBe(0);
        expect(transformed[`${prefix}away_fallback`]).toBe(1);
      } else {
        expect(transformed[`${prefix}differential`]).toBe(0);
        expect(transformed[`${prefix}home_fallback`]).toBe(1);
        expect(transformed[`${prefix}away_fallback`]).toBe(1);
      }
    }
  });

  it('uses scale one for all-constant continuous features', () => {
    const rows = [
      example({ gameId: 'constant-a' }),
      example({ gameId: 'constant-b', season: 2022 }),
    ];

    const fitted = fitPreprocessor(rows);

    expect(fitted.standardDeviations.market_logit).toBe(1);
    expect(fitted.standardDeviations.rest_differential).toBe(1);
    expect(fitted.standardDeviations.offense_epa_per_opportunity_rolling4_differential).toBe(1);
  });

  it('clips market probabilities before converting them to log odds', () => {
    const fitted = preprocessor();
    const [low, high] = transformExamples(
      [
        example({ gameId: 'low', marketHomeProbability: 0 }),
        example({ gameId: 'high', marketHomeProbability: 1 }),
      ],
      fitted
    );
    const clippedLogit = Math.log((1 - 1e-6) / 1e-6);

    expect(low.featureValues[0]).toBeCloseTo(-clippedLogit);
    expect(high.featureValues[0]).toBeCloseTo(clippedLogit);
  });

  it('uses the frozen feature order instead of team-feature object insertion order', () => {
    const reversed = [...TEAM_FEATURE_NAMES].reverse();
    const row = example({
      neutralSite: true,
      restDifferential: 4,
      postseason: true,
      teamFeatures: Object.fromEntries(
        reversed.map((name) => {
          const index = TEAM_FEATURE_NAMES.indexOf(name);
          return [name, { home: value(index + 1), away: value(0) }];
        })
      ) as RawForecastExample['teamFeatures'],
    });

    const transformed = transformExamples([row], preprocessor())[0];

    expect(CONTEXT_FEATURE_NAMES).toEqual([
      'market_logit',
      'neutral_site',
      'rest_differential',
      'postseason',
    ]);
    expect(transformed.featureValues).toEqual([
      0,
      1,
      4,
      1,
      ...TEAM_FEATURE_NAMES.flatMap((_name, index) => [index + 1, 0, 0]),
    ]);
  });

  it('rejects non-finite input before fitting', () => {
    expect(() => fitPreprocessor([example({ marketHomeProbability: Number.NaN })])).toThrow(
      /non-finite/i
    );
  });

  it('rejects held-out seasons from fitting', () => {
    expect(() => fitPreprocessor([example({ season: 2023 })])).toThrow(/development/i);
  });
});
