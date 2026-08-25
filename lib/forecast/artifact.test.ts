import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEVELOPMENT_SEASONS, HOLDOUT_SEASONS, TEAM_FEATURE_NAMES } from './contracts';
import { MODEL_FEATURE_NAMES } from './preprocessing';
import type { ForecastEvaluationReport } from './evaluation';
import { stableJson } from './evaluation';
import { writeEvaluationOutputs } from './artifact';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

function metricSet(logLoss: number) {
  return { games: 3, logLoss, brier: 0.2, calibrationError: 0.1 };
}

function evaluationReport(promoted: boolean): ForecastEvaluationReport {
  const modelMetrics = {
    naive: metricSet(0.7),
    market: metricSet(0.5),
    calibratedMarket: metricSet(0.49),
    candidate: metricSet(0.48),
  };
  const means = Object.fromEntries(MODEL_FEATURE_NAMES.map((name) => [name, 0]));
  const standardDeviations = Object.fromEntries(MODEL_FEATURE_NAMES.map((name) => [name, 1]));
  const teamFeatureMedians = Object.fromEntries(
    TEAM_FEATURE_NAMES.map((name) => [name, 0])
  ) as Record<(typeof TEAM_FEATURE_NAMES)[number], number>;
  const config = {
    l2: 0.1,
    maxIterations: 100 as const,
    tolerance: 1e-10 as const,
    probabilityEpsilon: 1e-12 as const,
  };

  return {
    schemaVersion: 1,
    modelVersion: 'depth-logit-v1-2025',
    target: 'home_win',
    perspective: 'home',
    developmentSeasons: DEVELOPMENT_SEASONS,
    holdoutSeasons: HOLDOUT_SEASONS,
    sources: [{ key: 'games', url: 'https://example.test/games.csv', sha256: 'a'.repeat(64) }],
    sourceAudit: {
      ok: true,
      gameCountBySeason: { '2025': 3 },
      teamRowCountBySeason: { '2025': 6 },
      missingGameFields: [],
      missingWeeklyFieldsBySeason: { '2025': [] },
      malformedGames: 0,
      malformedTeamRowsBySeason: { '2025': 0 },
    },
    datasetDiagnostics: {
      sourceGames: 60,
      emittedExamples: 56,
      excludedBeforeTargetWindow: 4,
      excludedUnplayed: 0,
      excludedTies: 0,
      excludedNoMarket: 0,
      excludedMissingContext: 0,
      historyGamesMissingWeeklyPair: 0,
    },
    featureNames: MODEL_FEATURE_NAMES,
    preprocessor: {
      featureNames: MODEL_FEATURE_NAMES,
      developmentSeasons: DEVELOPMENT_SEASONS,
      teamFeatureMedians,
      means,
      standardDeviations,
    },
    regularization: {
      selectedL2: 0.1,
      candidates: [
        {
          l2: 0.1,
          pooledLogLoss: 0.48,
          folds: [{ validationSeason: 2022, games: 3, logLoss: 0.48 }],
        },
      ],
    },
    models: {
      calibratedMarket: {
        intercept: 0,
        coefficients: [1],
        config: { ...config, l2: 0 },
        iterations: 3,
        converged: true,
      },
      candidate: {
        intercept: 0.2,
        coefficients: MODEL_FEATURE_NAMES.map((_, index) => index / 100),
        config,
        iterations: 4,
        converged: true,
      },
    },
    metrics: {
      bySeason: {
        '2023': modelMetrics,
        '2024': modelMetrics,
        '2025': modelMetrics,
      },
      pooled: modelMetrics,
    },
    bootstrap: { lower: -0.04, upper: -0.01, replicates: 10_000, seed: 3_162_025 },
    decision: {
      promoted,
      relativeLogLossImprovement: 0.04,
      seasonLogLossWins: 3,
      checks: {
        relativeLogLoss: promoted,
        bootstrap: promoted,
        brier: promoted,
        calibration: promoted,
        seasons: promoted,
      },
    },
  };
}

async function outputPaths() {
  const directory = await mkdtemp(join(tmpdir(), 'depth-forecast-artifact-'));
  temporaryDirectories.push(directory);
  return {
    reportPath: join(directory, 'reports', 'evaluation.json'),
    modelCardPath: join(directory, 'docs', 'model-card.md'),
    artifactPath: join(directory, 'models', 'model.json'),
  };
}

async function missing(path: string): Promise<boolean> {
  try {
    await stat(path);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT';
  }
}

describe('guarded evaluation outputs', () => {
  it('writes report and card but never touches a declined artifact', async () => {
    const paths = await outputPaths();
    await mkdir(dirname(paths.artifactPath), { recursive: true });
    await writeFile(paths.artifactPath, 'sentinel');

    const result = writeEvaluationOutputs(evaluationReport(false), { ...paths, promote: true });

    expect(result.artifactWritten).toBe(false);
    expect(await readFile(paths.reportPath, 'utf8')).toBe(stableJson(evaluationReport(false)));
    expect(await readFile(paths.modelCardPath, 'utf8')).toContain('DECLINED');
    expect(await readFile(paths.artifactPath, 'utf8')).toBe('sentinel');
  });

  it('does not create an artifact when passing evaluation is not promoted', async () => {
    const paths = await outputPaths();

    const result = writeEvaluationOutputs(evaluationReport(true), { ...paths, promote: false });

    expect(result.artifactWritten).toBe(false);
    expect(await missing(paths.artifactPath)).toBe(true);
    expect(await readFile(paths.reportPath, 'utf8')).toBe(stableJson(evaluationReport(true)));
    expect(await readFile(paths.modelCardPath, 'utf8')).toContain('PROMOTED');
  });

  it('does not create an artifact when any serialized gate check is false', async () => {
    const paths = await outputPaths();
    const inconsistent = evaluationReport(true);
    inconsistent.decision.checks.bootstrap = false;

    const result = writeEvaluationOutputs(inconsistent, { ...paths, promote: true });

    expect(result.artifactWritten).toBe(false);
    expect(await missing(paths.artifactPath)).toBe(true);
  });

  it('writes a validated inference-only artifact and treats identical bytes idempotently', async () => {
    const paths = await outputPaths();
    const report = evaluationReport(true);

    const first = writeEvaluationOutputs(report, { ...paths, promote: true });
    const artifactBytes = await readFile(paths.artifactPath, 'utf8');
    const artifact = JSON.parse(artifactBytes);
    const second = writeEvaluationOutputs(report, { ...paths, promote: true });

    expect(first.artifactWritten).toBe(true);
    expect(second.artifactWritten).toBe(false);
    expect(await readFile(paths.artifactPath, 'utf8')).toBe(artifactBytes);
    expect(artifact).toMatchObject({
      schemaVersion: 1,
      modelVersion: 'depth-logit-v1-2025',
      featureNames: MODEL_FEATURE_NAMES,
      candidate: {
        intercept: 0.2,
        coefficients: report.models.candidate.coefficients,
        config: report.models.candidate.config,
      },
      regularization: { selectedL2: 0.1 },
      datasetDiagnostics: report.datasetDiagnostics,
      metrics: report.metrics,
      bootstrap: report.bootstrap,
      decision: report.decision,
    });
    expect(artifact).not.toHaveProperty('timestamp');
    expect(artifact).not.toHaveProperty('models.calibratedMarket');
  });

  it('refuses to overwrite different artifact bytes', async () => {
    const paths = await outputPaths();
    const report = evaluationReport(true);
    writeEvaluationOutputs(report, { ...paths, promote: true });
    await writeFile(paths.artifactPath, 'different artifact bytes');

    expect(() => writeEvaluationOutputs(report, { ...paths, promote: true })).toThrow(
      /refusing to overwrite/i
    );
    expect(await readFile(paths.artifactPath, 'utf8')).toBe('different artifact bytes');
  });
});
