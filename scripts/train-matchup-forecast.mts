// Runs the repository-owned DEP-316 evaluation from immutable cached nflverse bytes. Argument
// validation completes before source loading, and artifact promotion stays delegated to the
// decision-gated writer so this command cannot publish a declined model.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeEvaluationOutputs } from '@/lib/forecast/artifact';
import { runForecastEvaluation, type ForecastEvaluationReport } from '@/lib/forecast/evaluation';
import { loadForecastSources } from '@/lib/forecast/source';

export interface TrainArguments {
  cacheDir: string;
  reportPath: string;
  modelCardPath: string;
  artifactPath: string;
  refresh: boolean;
  promote: boolean;
}

const DEFAULT_ARGUMENTS: TrainArguments = {
  cacheDir: '.cache/matchup-forecast/sources',
  reportPath: '.cache/matchup-forecast/evaluation.json',
  modelCardPath: 'docs/matchup-forecast-model-card.md',
  artifactPath: 'models/matchup-forecast-v1.json',
  refresh: false,
  promote: false,
};

function argumentValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

export function parseTrainArguments(argv: string[]): TrainArguments {
  const parsed = { ...DEFAULT_ARGUMENTS };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--cache-dir':
        parsed.cacheDir = argumentValue(argv, index, argument);
        index += 1;
        break;
      case '--report':
        parsed.reportPath = argumentValue(argv, index, argument);
        index += 1;
        break;
      case '--model-card':
        parsed.modelCardPath = argumentValue(argv, index, argument);
        index += 1;
        break;
      case '--artifact':
        parsed.artifactPath = argumentValue(argv, index, argument);
        index += 1;
        break;
      case '--refresh':
        parsed.refresh = true;
        break;
      case '--promote':
        parsed.promote = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return parsed;
}

function printMetricLine(
  scope: string,
  model: string,
  values: ForecastEvaluationReport['metrics']['pooled']['market']
): void {
  console.log(
    `${scope} ${model}: games=${values.games} log_loss=${values.logLoss.toFixed(6)} brier=${values.brier.toFixed(6)} ece=${values.calibrationError.toFixed(6)}`
  );
}

function printReport(report: ForecastEvaluationReport): void {
  console.log('Sources:');
  for (const source of report.sources) {
    console.log(`  ${source.key} sha256=${source.sha256} url=${source.url}`);
  }

  console.log('Source rows:');
  for (const season of Object.keys(report.sourceAudit.gameCountBySeason).sort()) {
    console.log(
      `  ${season}: games=${report.sourceAudit.gameCountBySeason[season]} team_rows=${report.sourceAudit.teamRowCountBySeason[season] ?? 0}`
    );
  }
  console.log('Dataset diagnostics:');
  for (const [name, count] of Object.entries(report.datasetDiagnostics)) {
    console.log(`  ${name}=${count}`);
  }

  console.log('Holdout metrics:');
  for (const season of report.holdoutSeasons) {
    for (const [model, values] of Object.entries(report.metrics.bySeason[String(season)])) {
      printMetricLine(String(season), model, values);
    }
  }
  for (const [model, values] of Object.entries(report.metrics.pooled)) {
    printMetricLine('pooled', model, values);
  }

  console.log(
    `Bootstrap candidate-minus-market: lower=${report.bootstrap.lower.toFixed(6)} upper=${report.bootstrap.upper.toFixed(6)} replicates=${report.bootstrap.replicates} seed=${report.bootstrap.seed}`
  );
  console.log('Promotion gates:');
  for (const [name, passed] of Object.entries(report.decision.checks)) {
    console.log(`  ${name}=${passed ? 'PASS' : 'FAIL'}`);
  }
  console.log(report.decision.promoted ? 'PROMOTED' : 'DECLINED');
}

async function main(argv: string[]): Promise<void> {
  // Keep this first: invalid invocations must not create cache directories or issue requests.
  const options = parseTrainArguments(argv);
  const bundle = await loadForecastSources({
    cacheDir: options.cacheDir,
    refresh: options.refresh,
  });
  const report = runForecastEvaluation(bundle);
  writeEvaluationOutputs(report, {
    reportPath: options.reportPath,
    modelCardPath: options.modelCardPath,
    artifactPath: options.artifactPath,
    promote: options.promote,
  });
  printReport(report);
}

const entryPath = process.argv[1];
if (entryPath && resolve(fileURLToPath(import.meta.url)) === resolve(entryPath)) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
