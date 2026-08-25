import { describe, expect, it } from 'vitest';
import { TEAM_FEATURE_NAMES } from './contracts';
import type { RawForecastExample, RawTeamFeatureValue } from './dataset';
import {
  fitLogisticRegression,
  predictProbability,
  selectRegularization,
  type LogisticConfig,
} from './logistic';
import { fitPreprocessor, transformExamples, type ModelExample } from './preprocessing';

const SELECTED_TEAM_FEATURE = 'offense_epa_per_opportunity_rolling4' as const;

function logisticConfig(l2: number): LogisticConfig {
  return {
    l2,
    maxIterations: 100,
    tolerance: 1e-10,
    probabilityEpsilon: 1e-12,
  };
}

function modelExample(label: 0 | 1, featureValues: number[], gameId = 'game'): ModelExample {
  return {
    gameId,
    season: 2012,
    week: 1,
    label,
    marketHomeProbability: 0.5,
    featureValues,
  };
}

function rawValue(value: number): RawTeamFeatureValue {
  return { value, source: 'current', gameIds: [], latestKickoffKey: null };
}

function unavailableRawValue(): RawTeamFeatureValue {
  return { value: null, source: 'unavailable', gameIds: [], latestKickoffKey: null };
}

function rawExample(
  season: number,
  suffix: string,
  label: 0 | 1,
  restDifferential: number
): RawForecastExample {
  return {
    gameId: `${season}-${suffix}`,
    season,
    week: suffix === 'win' ? 1 : 2,
    kickoffKey: `${season}-09-${suffix === 'win' ? '01' : '08'}T13:00`,
    label,
    marketHomeProbability: 0.5,
    neutralSite: false,
    restDifferential,
    postseason: false,
    teamFeatures: Object.fromEntries(
      TEAM_FEATURE_NAMES.map((name) => [
        name,
        {
          home: rawValue(name === SELECTED_TEAM_FEATURE ? 0 : 1),
          away: rawValue(name === SELECTED_TEAM_FEATURE ? 0 : 1),
        },
      ])
    ) as RawForecastExample['teamFeatures'],
    latestSourceKickoffKey: null,
  };
}

function rollingRows(withValidationSentinel = false): RawForecastExample[] {
  const rows = Array.from({ length: 11 }, (_, index) => 2012 + index).flatMap((season) => {
    const magnitude = withValidationSentinel && season === 2016 ? 1_000_000 : season - 2010;
    return [rawExample(season, 'win', 1, magnitude), rawExample(season, 'loss', 0, -magnitude)];
  });
  if (!withValidationSentinel) return rows;

  return rows.map((row) => {
    const unavailable = unavailableRawValue();
    let selectedSides = { home: unavailable, away: unavailable };
    if (row.gameId === '2012-win') {
      selectedSides = { home: unavailable, away: rawValue(-4) };
    } else if (row.gameId === '2012-loss') {
      selectedSides = { home: rawValue(-4), away: unavailable };
    } else if (row.gameId === '2016-win') {
      selectedSides = { home: rawValue(1_000_000), away: rawValue(1_000_000) };
    }
    return {
      ...row,
      teamFeatures: { ...row.teamFeatures, [SELECTED_TEAM_FEATURE]: selectedSides },
    };
  });
}

function averageLogLoss(model: ReturnType<typeof fitLogisticRegression>, rows: ModelExample[]) {
  const loss = rows.reduce((sum, row) => {
    const probability = predictProbability(model, row.featureValues);
    const clipped = Math.min(
      1 - model.config.probabilityEpsilon,
      Math.max(model.config.probabilityEpsilon, probability)
    );
    return sum - (row.label === 1 ? Math.log(clipped) : Math.log(1 - clipped));
  }, 0);
  return loss / rows.length;
}

describe('deterministic logistic regression', () => {
  it('fits an intercept-only event rate without regularizing the intercept', () => {
    const examples = [
      modelExample(1, [], 'win-a'),
      modelExample(1, [], 'win-b'),
      modelExample(1, [], 'win-c'),
      modelExample(0, [], 'loss'),
    ];

    const weak = fitLogisticRegression(examples, logisticConfig(0.0001));
    const strong = fitLogisticRegression(examples, logisticConfig(1));

    expect(weak.intercept).toBeCloseTo(Math.log(3), 10);
    expect(strong.intercept).toBeCloseTo(Math.log(3), 10);
    expect(strong.intercept).toBeCloseTo(weak.intercept, 12);
    expect(weak.coefficients).toEqual([]);
    expect(predictProbability(weak, [])).toBeCloseTo(0.75, 12);
  });

  it('assigns a positive coefficient to a separable feature with bounded probabilities', () => {
    const examples = [
      modelExample(0, [-2], 'loss-two'),
      modelExample(0, [-1], 'loss-one'),
      modelExample(1, [1], 'win-one'),
      modelExample(1, [2], 'win-two'),
    ];

    const first = fitLogisticRegression(examples, logisticConfig(0.1));
    const second = fitLogisticRegression(examples, logisticConfig(0.1));
    const low = predictProbability(first, [-1]);
    const high = predictProbability(first, [1]);

    expect(second).toEqual(first);
    expect(first.coefficients[0]).toBeGreaterThan(0);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(0.5);
    expect(high).toBeGreaterThan(0.5);
    expect(high).toBeLessThan(1);
  });

  it('shrinks non-intercept coefficients as L2 increases', () => {
    const examples = [
      modelExample(0, [-2], 'loss-two'),
      modelExample(0, [-1], 'loss-one'),
      modelExample(1, [1], 'win-one'),
      modelExample(1, [2], 'win-two'),
    ];

    const weak = fitLogisticRegression(examples, logisticConfig(0.0001));
    const strong = fitLogisticRegression(examples, logisticConfig(1));

    expect(Math.abs(strong.coefficients[0])).toBeLessThan(Math.abs(weak.coefficients[0]));
    expect(weak.intercept).toBeCloseTo(0, 12);
    expect(strong.intercept).toBeCloseTo(0, 12);
  });

  it('keeps a constant column finite when ridge regularization resolves the singularity', () => {
    const examples = [
      modelExample(0, [1], 'loss-a'),
      modelExample(1, [1], 'win-a'),
      modelExample(0, [1], 'loss-b'),
      modelExample(1, [1], 'win-b'),
    ];

    const model = fitLogisticRegression(examples, logisticConfig(0.1));

    expect(Number.isFinite(model.intercept)).toBe(true);
    expect(model.coefficients.every(Number.isFinite)).toBe(true);
    expect(predictProbability(model, [1])).toBeCloseTo(0.5, 12);
  });

  it('rejects empty, inconsistent, non-finite, singular, and non-convergent fits', () => {
    expect(() => fitLogisticRegression([], logisticConfig(0.1))).toThrow(/empty|without/i);
    expect(() =>
      fitLogisticRegression(
        [modelExample(0, [0], 'one'), modelExample(1, [0, 1], 'two')],
        logisticConfig(0.1)
      )
    ).toThrow(/length/i);
    expect(() =>
      fitLogisticRegression([modelExample(0, [Number.NaN])], logisticConfig(0.1))
    ).toThrow(/non-finite/i);
    expect(() =>
      fitLogisticRegression(
        [modelExample(0, [1], 'loss'), modelExample(1, [1], 'win')],
        logisticConfig(0)
      )
    ).toThrow(/singular/i);
    expect(() =>
      fitLogisticRegression([modelExample(0, [-1], 'loss'), modelExample(1, [1], 'win')], {
        ...logisticConfig(0.1),
        maxIterations: 1,
      } as unknown as LogisticConfig)
    ).toThrow(/converge/i);
  });

  it('rejects invalid prediction vectors', () => {
    const model = fitLogisticRegression(
      [modelExample(0, [-1], 'loss'), modelExample(1, [1], 'win')],
      logisticConfig(0.1)
    );

    expect(() => predictProbability(model, [])).toThrow(/length/i);
    expect(() => predictProbability(model, [Number.POSITIVE_INFINITY])).toThrow(/non-finite/i);
  });
});

describe('rolling-origin regularization selection', () => {
  it('fits every validation fold from only its earlier raw seasons', () => {
    const rawRows = rollingRows();
    const selection = selectRegularization(rawRows);
    const candidate = selection.candidates.find(({ l2 }) => l2 === 0.1);

    expect(
      candidate?.folds.map(({ validationSeason, games }) => [validationSeason, games])
    ).toEqual(Array.from({ length: 7 }, (_, index) => [2016 + index, 2]));
    for (const fold of candidate?.folds ?? []) {
      const trainingRows = rawRows.filter(
        (row) => row.season >= 2012 && row.season < fold.validationSeason
      );
      const validationRows = rawRows.filter((row) => row.season === fold.validationSeason);
      const preprocessor = fitPreprocessor(trainingRows);
      const model = fitLogisticRegression(transformExamples(trainingRows, preprocessor), {
        ...logisticConfig(0.1),
      });
      const expectedLoss = averageLogLoss(model, transformExamples(validationRows, preprocessor));

      expect(fold.logLoss).toBeCloseTo(expectedLoss, 12);
    }
  });

  it('keeps a validation sentinel out of fold medians and scaling', () => {
    const rawRows = rollingRows(true);
    const selection = selectRegularization(rawRows);
    const actual = selection.candidates
      .find(({ l2 }) => l2 === 0.1)
      ?.folds.find(({ validationSeason }) => validationSeason === 2016)?.logLoss;
    const trainingRows = rawRows.filter((row) => row.season >= 2012 && row.season < 2016);
    const validationRows = rawRows.filter((row) => row.season === 2016);
    const foldPreprocessor = fitPreprocessor(trainingRows);
    const foldModel = fitLogisticRegression(
      transformExamples(trainingRows, foldPreprocessor),
      logisticConfig(0.1)
    );
    const expectedFoldLoss = averageLogLoss(
      foldModel,
      transformExamples(validationRows, foldPreprocessor)
    );
    const leakedPreprocessor = fitPreprocessor(rawRows);
    const leakedModel = fitLogisticRegression(
      transformExamples(trainingRows, leakedPreprocessor),
      logisticConfig(0.1)
    );
    const leakedLoss = averageLogLoss(
      leakedModel,
      transformExamples(validationRows, leakedPreprocessor)
    );

    expect(foldPreprocessor.teamFeatureMedians[SELECTED_TEAM_FEATURE]).toBe(-4);
    expect(leakedPreprocessor.teamFeatureMedians[SELECTED_TEAM_FEATURE]).toBe(499_998);
    expect(actual).toBeCloseTo(expectedFoldLoss, 12);
    expect(Math.abs(expectedFoldLoss - leakedLoss)).toBeGreaterThan(0.01);
  });

  it('chooses the stronger L2 value when every validation loss ties exactly', () => {
    const rawRows = rollingRows().map((row) => ({ ...row, restDifferential: 0 }));

    const selection = selectRegularization(rawRows);

    expect(selection.candidates.map(({ l2 }) => l2)).toEqual([0.0001, 0.001, 0.01, 0.1, 1]);
    expect(new Set(selection.candidates.map(({ pooledLogLoss }) => pooledLogLoss)).size).toBe(1);
    expect(selection.candidates[0].pooledLogLoss).toBeCloseTo(Math.log(2), 12);
    expect(selection.selectedL2).toBe(1);
  });
});
