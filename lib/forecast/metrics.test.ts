import { describe, expect, it } from 'vitest';
import {
  evaluatePredictions,
  evaluatePromotionGate,
  fitNaiveBaseline,
  pairedWeekBootstrap,
  type BootstrapInterval,
  type EvaluatedModelName,
  type EvaluationMetrics,
  type MetricSet,
  type PredictionRow,
} from './metrics';

const MODEL_NAMES: EvaluatedModelName[] = ['naive', 'market', 'calibratedMarket', 'candidate'];

function predictionRow(
  gameId: string,
  label: 0 | 1,
  probabilities: Partial<Record<EvaluatedModelName, number>> = {},
  season = 2023,
  week = 1
): PredictionRow {
  return {
    gameId,
    season,
    week,
    label,
    neutralSite: false,
    probabilities: {
      naive: 0.5,
      market: 0.5,
      calibratedMarket: 0.5,
      candidate: 0.5,
      ...probabilities,
    },
  };
}

function metricSet(logLoss: number, brier = 0.2, calibrationError = 0.1): MetricSet {
  return { games: 1, logLoss, brier, calibrationError };
}

interface GateMetricOptions {
  marketPooledLogLoss?: number;
  candidatePooledLogLoss?: number;
  candidateBrier?: number;
  candidateCalibrationError?: number;
  candidateSeasonLosses?: [number, number, number];
}

function gateMetrics(options: GateMetricOptions = {}): EvaluationMetrics {
  const marketPooledLogLoss = options.marketPooledLogLoss ?? 0.5;
  const candidatePooledLogLoss = options.candidatePooledLogLoss ?? 0.49;
  const candidateSeasonLosses = options.candidateSeasonLosses ?? [0.49, 0.49, 0.49];
  const bySeason = Object.fromEntries(
    [2023, 2024, 2025].map((season, index) => [
      String(season),
      {
        naive: metricSet(0.7),
        market: metricSet(0.5),
        calibratedMarket: metricSet(candidateSeasonLosses[index]),
        candidate: metricSet(
          candidateSeasonLosses[index],
          options.candidateBrier ?? 0.2,
          options.candidateCalibrationError ?? 0.1
        ),
      },
    ])
  );

  return {
    bySeason,
    pooled: {
      naive: metricSet(0.7),
      market: metricSet(marketPooledLogLoss),
      calibratedMarket: metricSet(candidatePooledLogLoss),
      candidate: metricSet(
        candidatePooledLogLoss,
        options.candidateBrier ?? 0.2,
        options.candidateCalibrationError ?? 0.1
      ),
    },
  };
}

const PASSING_BOOTSTRAP: BootstrapInterval = {
  lower: -0.02,
  upper: -0.001,
  replicates: 10_000,
  seed: 3_162_025,
};

describe('naive baseline', () => {
  it('fits separate neutral and non-neutral development home-win rates', () => {
    const developmentRows = [
      { gameId: 'neutral-win-a', season: 2022, label: 1 as const, neutralSite: true },
      { gameId: 'neutral-loss', season: 2022, label: 0 as const, neutralSite: true },
      { gameId: 'neutral-win-b', season: 2022, label: 1 as const, neutralSite: true },
      { gameId: 'home-win', season: 2022, label: 1 as const, neutralSite: false },
      { gameId: 'home-loss-a', season: 2022, label: 0 as const, neutralSite: false },
      { gameId: 'home-loss-b', season: 2022, label: 0 as const, neutralSite: false },
      { gameId: 'home-loss-c', season: 2022, label: 0 as const, neutralSite: false },
    ];

    expect(fitNaiveBaseline(developmentRows)).toEqual({
      neutralHomeWinRate: 2 / 3,
      nonNeutralHomeWinRate: 1 / 4,
    });
  });

  it('rejects holdout labels and an absent venue group', () => {
    expect(() =>
      fitNaiveBaseline([
        { gameId: 'holdout', season: 2023, label: 1, neutralSite: true },
        { gameId: 'development', season: 2022, label: 0, neutralSite: false },
      ])
    ).toThrow(/development/i);
    expect(() =>
      fitNaiveBaseline([
        { gameId: 'home-win', season: 2022, label: 1, neutralSite: false },
        { gameId: 'home-loss', season: 2022, label: 0, neutralSite: false },
      ])
    ).toThrow(/neutral/i);
  });
});

describe('forecast metrics', () => {
  it('calculates hand-derived log loss, Brier score, and fixed-bin ECE', () => {
    const metrics = evaluatePredictions([
      predictionRow('win', 1, { candidate: 0.8 }),
      predictionRow('loss', 0, { candidate: 0.25 }),
    ]).pooled.candidate;

    expect(metrics.games).toBe(2);
    expect(metrics.logLoss).toBeCloseTo(0.25541281188299536, 14);
    expect(metrics.brier).toBeCloseTo(0.05125, 14);
    expect(metrics.calibrationError).toBeCloseTo(0.225, 14);
  });

  it('clips zero and one only for log loss', () => {
    const correct = evaluatePredictions([
      predictionRow('certain-loss', 0, { candidate: 0 }),
      predictionRow('certain-win', 1, { candidate: 1 }),
    ]).pooled.candidate;
    const wrong = evaluatePredictions([
      predictionRow('impossible-win', 1, { candidate: 0 }),
      predictionRow('impossible-loss', 0, { candidate: 1 }),
    ]).pooled.candidate;

    expect(correct.logLoss).toBeCloseTo(-Math.log(1 - 1e-12), 14);
    expect(correct.brier).toBe(0);
    expect(correct.calibrationError).toBe(0);
    expect(wrong.logLoss).toBeCloseTo(-Math.log(1e-12), 12);
    expect(wrong.brier).toBe(1);
    expect(wrong.calibrationError).toBe(1);
  });

  it('uses bin 0 as [0, 0.1) and includes one in bin 9', () => {
    const metrics = evaluatePredictions([
      predictionRow('bin-zero', 0, { candidate: 0.09 }),
      predictionRow('bin-one', 1, { candidate: 0.1 }),
      predictionRow('bin-nine-low', 0, { candidate: 0.9 }),
      predictionRow('bin-nine-high', 1, { candidate: 1 }),
    ]).pooled.candidate;

    expect(metrics.calibrationError).toBeCloseTo(0.4725, 14);
  });

  it('reports every model by season and pooled over the same ordered rows', () => {
    const metrics = evaluatePredictions([
      predictionRow('2023-game', 1, {}, 2023, 1),
      predictionRow('2024-game', 0, {}, 2024, 1),
    ]);

    expect(Object.keys(metrics.bySeason)).toEqual(['2023', '2024']);
    expect(Object.keys(metrics.pooled)).toEqual(MODEL_NAMES);
    expect(metrics.bySeason['2023'].candidate.games).toBe(1);
    expect(metrics.bySeason['2024'].market.games).toBe(1);
    expect(metrics.pooled.naive.games).toBe(2);
  });

  it('rejects duplicate game IDs, a missing model probability, and invalid probabilities', () => {
    expect(() =>
      evaluatePredictions([predictionRow('duplicate', 1), predictionRow('duplicate', 0)])
    ).toThrow(/game ID|aligned/i);

    const missingCandidate = predictionRow('missing-candidate', 1);
    delete (missingCandidate.probabilities as Partial<PredictionRow['probabilities']>).candidate;
    expect(() => evaluatePredictions([missingCandidate])).toThrow(/candidate|aligned/i);
    expect(() =>
      evaluatePredictions([predictionRow('not-finite', 1, { candidate: Number.NaN })])
    ).toThrow(/non-finite/i);
    expect(() => evaluatePredictions([predictionRow('out-of-range', 1, { market: 1.01 })])).toThrow(
      /between zero and one/i
    );
  });
});

describe('paired week-block bootstrap', () => {
  function rowWithLossDifference(
    gameId: string,
    season: number,
    week: number,
    candidateMinusMarketLoss: number
  ): PredictionRow {
    return predictionRow(
      gameId,
      1,
      {
        market: Math.exp(-1),
        candidate: Math.exp(-(1 + candidateMinusMarketLoss)),
      },
      season,
      week
    );
  }

  const rows = [
    rowWithLossDifference('2023-w1-a', 2023, 1, -0.4),
    rowWithLossDifference('2023-w1-b', 2023, 1, -0.4),
    rowWithLossDifference('2023-w2', 2023, 2, 0.2),
    rowWithLossDifference('2024-w1', 2024, 1, -0.1),
    rowWithLossDifference('2024-w2-a', 2024, 2, 0.3),
    rowWithLossDifference('2024-w2-b', 2024, 2, 0.3),
    rowWithLossDifference('2024-w2-c', 2024, 2, 0.3),
  ];

  it('deterministically resamples whole week blocks within each season', () => {
    const first = pairedWeekBootstrap(rows, { replicates: 12, seed: 4 });
    const second = pairedWeekBootstrap(rows, { replicates: 12, seed: 4 });

    expect(second).toEqual(first);
    expect(first).toMatchObject({ replicates: 12, seed: 4 });
    expect(first.lower).toBeCloseTo(-0.1435, 12);
    expect(first.upper).toBeCloseTo(0.254375, 12);
  });

  it('defaults to the locked replicate count and seed', () => {
    const interval = pairedWeekBootstrap(rows);

    expect(interval.replicates).toBe(10_000);
    expect(interval.seed).toBe(3_162_025);
  });
});

describe('promotion gate', () => {
  it('fails a 0.99% relative log-loss improvement', () => {
    const below = evaluatePromotionGate({
      metrics: gateMetrics({ candidatePooledLogLoss: 0.49505 }),
      bootstrap: PASSING_BOOTSTRAP,
    });

    expect(below.relativeLogLossImprovement).toBeCloseTo(0.0099, 12);
    expect(below.checks.relativeLogLoss).toBe(false);
    expect(below.promoted).toBe(false);
  });

  it('applies the 1e-12 tolerance at the relative log-loss boundary', () => {
    const withinTolerance = evaluatePromotionGate({
      metrics: gateMetrics({
        marketPooledLogLoss: 1,
        candidatePooledLogLoss: 0.9900000000005,
      }),
      bootstrap: PASSING_BOOTSTRAP,
    });
    const outsideTolerance = evaluatePromotionGate({
      metrics: gateMetrics({
        marketPooledLogLoss: 1,
        candidatePooledLogLoss: 0.9900000000015,
      }),
      bootstrap: PASSING_BOOTSTRAP,
    });

    expect(withinTolerance.relativeLogLossImprovement).toBeLessThan(0.01);
    expect(0.01 - withinTolerance.relativeLogLossImprovement).toBeLessThan(1e-12);
    expect(withinTolerance.checks.relativeLogLoss).toBe(true);
    expect(withinTolerance.promoted).toBe(true);
    expect(0.01 - outsideTolerance.relativeLogLossImprovement).toBeGreaterThan(1e-12);
    expect(outsideTolerance.checks.relativeLogLoss).toBe(false);
    expect(outsideTolerance.promoted).toBe(false);
  });

  it('requires a bootstrap upper bound strictly below zero', () => {
    const touchingZero = evaluatePromotionGate({
      metrics: gateMetrics(),
      bootstrap: { ...PASSING_BOOTSTRAP, upper: 0 },
    });
    const belowZero = evaluatePromotionGate({
      metrics: gateMetrics(),
      bootstrap: { ...PASSING_BOOTSTRAP, upper: -Number.EPSILON },
    });

    expect(touchingZero.checks.bootstrap).toBe(false);
    expect(touchingZero.promoted).toBe(false);
    expect(belowZero.checks.bootstrap).toBe(true);
    expect(belowZero.promoted).toBe(true);
  });

  it('applies the 1e-12 tolerance to Brier and ECE comparisons', () => {
    const brierWithinValue = 0.2 + 0.5e-12;
    const brierOutsideValue = 0.2 + 1.5e-12;
    const calibrationWithinValue = 0.1 + 0.5e-12;
    const calibrationOutsideValue = 0.1 + 1.5e-12;
    const brierWithin = evaluatePromotionGate({
      metrics: gateMetrics({ candidateBrier: brierWithinValue }),
      bootstrap: PASSING_BOOTSTRAP,
    });
    const brierOutside = evaluatePromotionGate({
      metrics: gateMetrics({ candidateBrier: brierOutsideValue }),
      bootstrap: PASSING_BOOTSTRAP,
    });
    const calibrationWithin = evaluatePromotionGate({
      metrics: gateMetrics({ candidateCalibrationError: calibrationWithinValue }),
      bootstrap: PASSING_BOOTSTRAP,
    });
    const calibrationOutside = evaluatePromotionGate({
      metrics: gateMetrics({ candidateCalibrationError: calibrationOutsideValue }),
      bootstrap: PASSING_BOOTSTRAP,
    });

    expect(brierWithinValue - 0.2).toBeLessThan(1e-12);
    expect(brierOutsideValue - 0.2).toBeGreaterThan(1e-12);
    expect(calibrationWithinValue - 0.1).toBeLessThan(1e-12);
    expect(calibrationOutsideValue - 0.1).toBeGreaterThan(1e-12);
    expect(brierWithin.checks.brier).toBe(true);
    expect(brierWithin.promoted).toBe(true);
    expect(brierOutside.checks.brier).toBe(false);
    expect(brierOutside.promoted).toBe(false);
    expect(calibrationWithin.checks.calibration).toBe(true);
    expect(calibrationWithin.promoted).toBe(true);
    expect(calibrationOutside.checks.calibration).toBe(false);
    expect(calibrationOutside.promoted).toBe(false);
  });

  it('fails with one season log-loss win and passes with two', () => {
    const oneWin = evaluatePromotionGate({
      metrics: gateMetrics({ candidateSeasonLosses: [0.49, 0.5, 0.51] }),
      bootstrap: PASSING_BOOTSTRAP,
    });
    const twoWins = evaluatePromotionGate({
      metrics: gateMetrics({ candidateSeasonLosses: [0.49, 0.49, 0.5] }),
      bootstrap: PASSING_BOOTSTRAP,
    });

    expect(oneWin.seasonLogLossWins).toBe(1);
    expect(oneWin.checks.seasons).toBe(false);
    expect(oneWin.promoted).toBe(false);
    expect(twoWins.seasonLogLossWins).toBe(2);
    expect(twoWins.checks.seasons).toBe(true);
    expect(twoWins.promoted).toBe(true);
  });

  it('never promotes the calibrated-market diagnostic as the Depth candidate', () => {
    const decision = evaluatePromotionGate({
      model: 'calibratedMarket',
      metrics: gateMetrics(),
      bootstrap: PASSING_BOOTSTRAP,
    });

    expect(Object.values(decision.checks).every(Boolean)).toBe(true);
    expect(decision.promoted).toBe(false);
  });
});
