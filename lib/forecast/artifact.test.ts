import fs from 'node:fs';
import {
  link as createHardLink,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEVELOPMENT_SEASONS, HOLDOUT_SEASONS, TEAM_FEATURE_NAMES } from './contracts';
import { MODEL_FEATURE_NAMES } from './preprocessing';
import type { ForecastEvaluationReport } from './evaluation';
import { stableJson } from './evaluation';

const competingCreate = {
  armed: false,
  artifactPath: '',
  bytes: '',
};
const originalWriteFileSync = fs.writeFileSync;

function interceptCompetingCreate(): void {
  fs.writeFileSync = ((path, data, options) => {
    if (
      competingCreate.armed &&
      String(path) === competingCreate.artifactPath &&
      typeof options === 'object' &&
      options?.flag === 'wx'
    ) {
      competingCreate.armed = false;
      originalWriteFileSync(path, competingCreate.bytes, 'utf8');
    }
    return originalWriteFileSync(path, data, options);
  }) as typeof fs.writeFileSync;
  syncBuiltinESMExports();
}

import { writeEvaluationOutputs } from './artifact';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  fs.writeFileSync = originalWriteFileSync;
  syncBuiltinESMExports();
  competingCreate.armed = false;
  competingCreate.artifactPath = '';
  competingCreate.bytes = '';
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

function normalizedAlias(path: string): string {
  return `${dirname(path)}/alias-segment/../${basename(path)}`;
}

async function canonicalTemporaryArtifactPath(path: string): Promise<string> {
  const outputDirectory = dirname(path);
  const temporaryRoot = dirname(outputDirectory);
  return join(await realpath(temporaryRoot), basename(outputDirectory), basename(path));
}

describe('guarded evaluation outputs', () => {
  it.each([
    {
      name: 'report and artifact',
      alias(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return { ...paths, reportPath: normalizedAlias(paths.artifactPath) };
      },
      sharedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.artifactPath;
      },
      untouchedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.modelCardPath;
      },
    },
    {
      name: 'model card and artifact',
      alias(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return { ...paths, modelCardPath: normalizedAlias(paths.artifactPath) };
      },
      sharedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.artifactPath;
      },
      untouchedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.reportPath;
      },
    },
    {
      name: 'report and model card',
      alias(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return { ...paths, modelCardPath: normalizedAlias(paths.reportPath) };
      },
      sharedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.reportPath;
      },
      untouchedPath(paths: Awaited<ReturnType<typeof outputPaths>>) {
        return paths.artifactPath;
      },
    },
  ])('rejects canonical $name aliases before writing anything', async (testCase) => {
    const paths = await outputPaths();
    const sharedPath = testCase.sharedPath(paths);
    await mkdir(dirname(sharedPath), { recursive: true });
    await writeFile(sharedPath, 'sentinel');

    expect(() =>
      writeEvaluationOutputs(evaluationReport(false), {
        ...testCase.alias(paths),
        promote: false,
      })
    ).toThrow(/pairwise distinct/i);
    expect(await readFile(sharedPath, 'utf8')).toBe('sentinel');
    expect(await missing(testCase.untouchedPath(paths))).toBe(true);
  });

  it('rejects a report path through a symlinked artifact ancestor before writing', async () => {
    const paths = await outputPaths();
    const directory = dirname(dirname(paths.artifactPath));
    const realDirectory = join(directory, 'real-output');
    const linkedDirectory = join(directory, 'linked-output');
    const artifactPath = join(realDirectory, 'model.json');
    const reportPath = join(linkedDirectory, 'model.json');
    await mkdir(realDirectory, { recursive: true });
    await symlink(realDirectory, linkedDirectory, 'dir');
    await writeFile(artifactPath, 'sentinel');

    expect(() =>
      writeEvaluationOutputs(evaluationReport(false), {
        reportPath,
        modelCardPath: paths.modelCardPath,
        artifactPath,
        promote: false,
      })
    ).toThrow(/pairwise distinct/i);
    expect(await readFile(artifactPath, 'utf8')).toBe('sentinel');
    expect(await missing(paths.modelCardPath)).toBe(true);
  });

  it('rejects a model-card path through a symlinked artifact ancestor before writing', async () => {
    const paths = await outputPaths();
    const directory = dirname(dirname(paths.artifactPath));
    const realDirectory = join(directory, 'real-output');
    const linkedDirectory = join(directory, 'linked-output');
    const artifactPath = join(realDirectory, 'model.json');
    const modelCardPath = join(linkedDirectory, 'model.json');
    await mkdir(realDirectory, { recursive: true });
    await symlink(realDirectory, linkedDirectory, 'dir');
    await writeFile(artifactPath, 'sentinel');

    expect(() =>
      writeEvaluationOutputs(evaluationReport(true), {
        reportPath: paths.reportPath,
        modelCardPath,
        artifactPath,
        promote: false,
      })
    ).toThrow(/pairwise distinct/i);
    expect(await readFile(artifactPath, 'utf8')).toBe('sentinel');
    expect(await missing(paths.reportPath)).toBe(true);
  });

  it('rejects nonexistent suffixes beneath symlinked ancestors before creating them', async () => {
    const paths = await outputPaths();
    const directory = dirname(dirname(paths.artifactPath));
    const realDirectory = join(directory, 'real-output');
    const linkedDirectory = join(directory, 'linked-output');
    const artifactPath = join(realDirectory, 'future', 'nested', 'model.json');
    const reportPath = join(linkedDirectory, 'future', 'nested', 'model.json');
    await mkdir(realDirectory, { recursive: true });
    await symlink(realDirectory, linkedDirectory, 'dir');

    expect(() =>
      writeEvaluationOutputs(evaluationReport(false), {
        reportPath,
        modelCardPath: paths.modelCardPath,
        artifactPath,
        promote: false,
      })
    ).toThrow(/pairwise distinct/i);
    expect(await missing(join(realDirectory, 'future'))).toBe(true);
    expect(await missing(paths.modelCardPath)).toBe(true);
  });

  it('rejects existing hard-linked output files before writing', async ({ skip }) => {
    const paths = await outputPaths();
    await mkdir(dirname(paths.reportPath), { recursive: true });
    await mkdir(dirname(paths.artifactPath), { recursive: true });
    await writeFile(paths.artifactPath, 'sentinel');
    try {
      await createHardLink(paths.artifactPath, paths.reportPath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'ENOTSUP') skip();
      throw error;
    }

    expect(() =>
      writeEvaluationOutputs(evaluationReport(false), { ...paths, promote: false })
    ).toThrow(/pairwise distinct/i);
    expect(await readFile(paths.artifactPath, 'utf8')).toBe('sentinel');
    expect(await readFile(paths.reportPath, 'utf8')).toBe('sentinel');
    expect(await missing(paths.modelCardPath)).toBe(true);
  });

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

  it('preserves different artifact bytes created by a competing writer', async () => {
    const paths = await outputPaths();
    competingCreate.armed = true;
    competingCreate.artifactPath = await canonicalTemporaryArtifactPath(paths.artifactPath);
    competingCreate.bytes = 'competing artifact bytes';
    interceptCompetingCreate();

    expect(() =>
      writeEvaluationOutputs(evaluationReport(true), { ...paths, promote: true })
    ).toThrow(/refusing to overwrite/i);
    expect(await readFile(paths.artifactPath, 'utf8')).toBe('competing artifact bytes');
  });

  it('accepts identical artifact bytes created by a competing writer', async () => {
    const seedPaths = await outputPaths();
    const report = evaluationReport(true);
    writeEvaluationOutputs(report, { ...seedPaths, promote: true });
    const expectedBytes = await readFile(seedPaths.artifactPath, 'utf8');
    const competingPaths = await outputPaths();
    competingCreate.armed = true;
    competingCreate.artifactPath = await canonicalTemporaryArtifactPath(
      competingPaths.artifactPath
    );
    competingCreate.bytes = expectedBytes;
    interceptCompetingCreate();

    const result = writeEvaluationOutputs(report, { ...competingPaths, promote: true });

    expect(result.artifactWritten).toBe(false);
    expect(await readFile(competingPaths.artifactPath, 'utf8')).toBe(expectedBytes);
  });
});
