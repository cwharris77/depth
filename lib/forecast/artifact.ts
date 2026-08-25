// Serializes deterministic evaluation evidence and guards the only artifact promotion path. A
// declined or unrequested promotion never even opens the artifact path, preserving any prior file.

import fs from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { TEAM_FEATURE_NAMES } from './contracts';
import { renderModelCard, stableJson, type ForecastEvaluationReport } from './evaluation';
import type { ForecastPreprocessor } from './preprocessing';

export interface WriteEvaluationOutputsOptions {
  reportPath: string;
  modelCardPath: string;
  artifactPath: string;
  promote: boolean;
}

interface ForecastModelArtifact {
  schemaVersion: 1;
  modelVersion: 'depth-logit-v1-2025';
  target: 'home_win';
  perspective: 'home';
  developmentSeasons: readonly number[];
  holdoutSeasons: readonly number[];
  sources: ForecastEvaluationReport['sources'];
  featureNames: readonly string[];
  preprocessor: ForecastPreprocessor;
  candidate: ForecastEvaluationReport['models']['candidate'];
  regularization: { selectedL2: number };
  metrics: ForecastEvaluationReport['metrics'];
  bootstrap: ForecastEvaluationReport['bootstrap'];
  decision: ForecastEvaluationReport['decision'];
  datasetDiagnostics: ForecastEvaluationReport['datasetDiagnostics'];
}

function assertFinite(value: number, description: string): void {
  if (!Number.isFinite(value)) throw new Error(`Invalid artifact ${description}`);
}

function promotionPassed(report: ForecastEvaluationReport): boolean {
  return report.decision.promoted && Object.values(report.decision.checks).every(Boolean);
}

function validateArtifact(artifact: ForecastModelArtifact): void {
  if (!artifact.decision.promoted || !Object.values(artifact.decision.checks).every(Boolean)) {
    throw new Error('Cannot build an artifact unless every promotion gate passes');
  }
  if (artifact.sources.length === 0) throw new Error('Artifact requires source audit metadata');
  for (const source of artifact.sources) {
    if (!source.url || !/^[0-9a-f]{64}$/.test(source.sha256)) {
      throw new Error(`Invalid artifact source metadata for ${source.key}`);
    }
  }
  if (artifact.candidate.coefficients.length !== artifact.featureNames.length) {
    throw new Error('Artifact candidate coefficients do not match its ordered features');
  }
  if (
    artifact.preprocessor.featureNames.length !== artifact.featureNames.length ||
    artifact.preprocessor.featureNames.some((name, index) => name !== artifact.featureNames[index])
  ) {
    throw new Error('Artifact preprocessor does not match its ordered features');
  }
  if (artifact.candidate.config.l2 !== artifact.regularization.selectedL2) {
    throw new Error('Artifact candidate L2 does not match regularization selection');
  }

  assertFinite(artifact.candidate.intercept, 'candidate intercept');
  artifact.candidate.coefficients.forEach((value) => assertFinite(value, 'candidate coefficient'));
  for (const name of artifact.featureNames) {
    assertFinite(artifact.preprocessor.means[name], `mean for ${name}`);
    assertFinite(artifact.preprocessor.standardDeviations[name], `scale for ${name}`);
    if (artifact.preprocessor.standardDeviations[name] <= 0) {
      throw new Error(`Invalid artifact scale for ${name}`);
    }
  }
  for (const name of TEAM_FEATURE_NAMES) {
    assertFinite(artifact.preprocessor.teamFeatureMedians[name], `median for ${name}`);
  }
}

function modelArtifact(report: ForecastEvaluationReport): ForecastModelArtifact {
  const artifact: ForecastModelArtifact = {
    schemaVersion: report.schemaVersion,
    modelVersion: report.modelVersion,
    target: report.target,
    perspective: report.perspective,
    developmentSeasons: report.developmentSeasons,
    holdoutSeasons: report.holdoutSeasons,
    sources: report.sources,
    featureNames: report.featureNames,
    preprocessor: report.preprocessor,
    candidate: report.models.candidate,
    regularization: { selectedL2: report.regularization.selectedL2 },
    metrics: report.metrics,
    bootstrap: report.bootstrap,
    decision: report.decision,
    datasetDiagnostics: report.datasetDiagnostics,
  };
  validateArtifact(artifact);
  return artifact;
}

function writeText(path: string, bytes: string): void {
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, bytes, 'utf8');
}

function resolvedOutputPaths(options: WriteEvaluationOutputsOptions): {
  reportPath: string;
  modelCardPath: string;
  artifactPath: string;
} {
  const outputs = {
    reportPath: canonicalOutput(options.reportPath),
    modelCardPath: canonicalOutput(options.modelCardPath),
    artifactPath: canonicalOutput(options.artifactPath),
  };
  const canonicalPaths = Object.values(outputs).map((output) => output.path);
  const existingIdentities = Object.values(outputs).flatMap((output) =>
    output.identity === null ? [] : [output.identity]
  );
  if (
    new Set(canonicalPaths).size !== canonicalPaths.length ||
    new Set(existingIdentities).size !== existingIdentities.length
  ) {
    throw new Error('Forecast report, model card, and artifact paths must be pairwise distinct');
  }
  return {
    reportPath: outputs.reportPath.path,
    modelCardPath: outputs.modelCardPath.path,
    artifactPath: outputs.artifactPath.path,
  };
}

function canonicalOutput(inputPath: string): { path: string; identity: string | null } {
  const suffix: string[] = [];
  let ancestor = resolve(inputPath);
  let canonicalPath: string;

  while (true) {
    try {
      canonicalPath = resolve(fs.realpathSync.native(ancestor), ...suffix);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      suffix.unshift(basename(ancestor));
      ancestor = parent;
    }
  }

  try {
    const target = fs.statSync(canonicalPath, { bigint: true });
    return { path: canonicalPath, identity: `${target.dev}:${target.ino}` };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error;
    return { path: canonicalPath, identity: null };
  }
}

function writeArtifact(path: string, bytes: string): boolean {
  fs.mkdirSync(dirname(path), { recursive: true });
  try {
    fs.writeFileSync(path, bytes, { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (fs.readFileSync(path, 'utf8') !== bytes) {
      throw new Error(`Refusing to overwrite different forecast artifact ${path}`, {
        cause: error,
      });
    }
    return false;
  }
}

export function writeEvaluationOutputs(
  report: ForecastEvaluationReport,
  options: WriteEvaluationOutputsOptions
): { artifactWritten: boolean } {
  const paths = resolvedOutputPaths(options);
  writeText(paths.reportPath, stableJson(report));
  writeText(paths.modelCardPath, renderModelCard(report));

  if (!options.promote || !promotionPassed(report)) return { artifactWritten: false };

  const bytes = stableJson(modelArtifact(report));
  return { artifactWritten: writeArtifact(paths.artifactPath, bytes) };
}
