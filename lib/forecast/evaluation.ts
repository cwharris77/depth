// Orchestrates the immutable forecast evaluation in one direction from cached source bytes to a
// promotion decision. No holdout row is passed to a fitting API; holdout probabilities are
// materialized only after preprocessing, regularization, and all development fits are frozen.

import { parseCsv } from '@/lib/nflverse/csv';
import { DEVELOPMENT_SEASONS, HOLDOUT_SEASONS, MODEL_VERSION, SOURCE_SEASONS } from './contracts';
import { buildRawForecastDataset, type DatasetDiagnostics } from './dataset';
import {
  fitLogisticRegression,
  predictProbability,
  selectRegularization,
  type LogisticConfig,
  type LogisticModel,
  type RegularizationSelection,
} from './logistic';
import {
  evaluatePredictions,
  evaluatePromotionGate,
  fitNaiveBaseline,
  pairedWeekBootstrap,
  type BootstrapInterval,
  type EvaluationMetrics,
  type PredictionRow,
  type PromotionDecision,
} from './metrics';
import {
  fitPreprocessor,
  MODEL_FEATURE_NAMES,
  transformExamples,
  type ForecastPreprocessor,
  type ModelExample,
} from './preprocessing';
import type { ForecastSourceBundle } from './source';
import {
  auditForecastSources,
  parseForecastGames,
  parseWeeklyTeamStats,
  type SourceAudit,
} from './source-records';

export interface ForecastEvaluationReport {
  schemaVersion: 1;
  modelVersion: 'depth-logit-v1-2025';
  target: 'home_win';
  perspective: 'home';
  developmentSeasons: readonly number[];
  holdoutSeasons: readonly number[];
  sources: Array<{ key: string; url: string; sha256: string }>;
  sourceAudit: SourceAudit;
  datasetDiagnostics: DatasetDiagnostics;
  featureNames: readonly string[];
  preprocessor: ForecastPreprocessor;
  regularization: RegularizationSelection;
  models: {
    calibratedMarket: LogisticModel;
    candidate: LogisticModel;
  };
  metrics: EvaluationMetrics;
  bootstrap: BootstrapInterval;
  decision: PromotionDecision;
}

const DEVELOPMENT_SEASON_SET = new Set<number>(DEVELOPMENT_SEASONS);
const HOLDOUT_SEASON_SET = new Set<number>(HOLDOUT_SEASONS);
const MARKET_EPSILON = 1e-6;

function logisticConfig(l2: number): LogisticConfig {
  return {
    l2,
    maxIterations: 100,
    tolerance: 1e-10,
    probabilityEpsilon: 1e-12,
  };
}

function rawMarketLogit(probability: number): number {
  const clipped = Math.min(1 - MARKET_EPSILON, Math.max(MARKET_EPSILON, probability));
  return Math.log(clipped / (1 - clipped));
}

function marketExamples(examples: ModelExample[]): ModelExample[] {
  return examples.map((example) => ({
    ...example,
    featureValues: [rawMarketLogit(example.marketHomeProbability)],
  }));
}

function sortedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJsonValue);
  if (value === null || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, sortedJsonValue(record[key])])
  );
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortedJsonValue(value), null, 2)}\n`;
}

export function runForecastEvaluation(bundle: ForecastSourceBundle): ForecastEvaluationReport {
  const gamesRows = parseCsv(bundle.games.text);
  const teamRowsBySeason: Record<string, Record<string, string>[]> = {};
  for (const source of bundle.teamWeeks) {
    if (source.season === null || !SOURCE_SEASONS.includes(source.season)) {
      throw new Error(`Unexpected forecast team-week season ${String(source.season)}`);
    }
    const key = String(source.season);
    if (teamRowsBySeason[key]) throw new Error(`Duplicate forecast team-week season ${key}`);
    teamRowsBySeason[key] = parseCsv(source.text);
  }
  for (const season of SOURCE_SEASONS) {
    if (!teamRowsBySeason[String(season)]) {
      throw new Error(`Missing forecast team-week season ${season}`);
    }
  }

  // The audit may inspect holdout schemas and identities, but it computes no holdout outcomes.
  const sourceAudit = auditForecastSources(gamesRows, teamRowsBySeason);
  if (!sourceAudit.ok) throw new Error('Forecast source audit failed');

  const games = parseForecastGames(gamesRows).games;
  const weeklyRows = SOURCE_SEASONS.flatMap(
    (season) => parseWeeklyTeamStats(teamRowsBySeason[String(season)], season).teamStats
  );
  const dataset = buildRawForecastDataset(games, weeklyRows);

  // Split raw examples before the first fitting call. Downstream fit functions independently
  // reject non-development seasons, making this boundary executable rather than conventional.
  const rawDevelopment = dataset.examples.filter((example) =>
    DEVELOPMENT_SEASON_SET.has(example.season)
  );
  const rawHoldout = dataset.examples.filter((example) => HOLDOUT_SEASON_SET.has(example.season));
  const regularization = selectRegularization(rawDevelopment);
  const preprocessor = fitPreprocessor(rawDevelopment);
  const development = transformExamples(rawDevelopment, preprocessor);
  const holdout = transformExamples(rawHoldout, preprocessor);

  const naive = fitNaiveBaseline(rawDevelopment);
  const calibratedMarket = fitLogisticRegression(marketExamples(development), logisticConfig(0));
  const candidate = fitLogisticRegression(development, logisticConfig(regularization.selectedL2));

  // Holdout probabilities are materialized exactly once, then shared by metrics and bootstrap.
  const predictionRows: PredictionRow[] = holdout.map((example, index) => {
    const raw = rawHoldout[index];
    if (raw.gameId !== example.gameId) throw new Error('Holdout transformation changed row order');
    return {
      gameId: example.gameId,
      season: example.season,
      week: example.week,
      label: example.label,
      neutralSite: raw.neutralSite,
      probabilities: {
        naive: raw.neutralSite ? naive.neutralHomeWinRate : naive.nonNeutralHomeWinRate,
        market: example.marketHomeProbability,
        calibratedMarket: predictProbability(calibratedMarket, [
          rawMarketLogit(example.marketHomeProbability),
        ]),
        candidate: predictProbability(candidate, example.featureValues),
      },
    };
  });

  const metrics = evaluatePredictions(predictionRows);
  const bootstrap = pairedWeekBootstrap(predictionRows);
  const decision = evaluatePromotionGate({ metrics, bootstrap });

  return {
    schemaVersion: 1,
    modelVersion: MODEL_VERSION,
    target: 'home_win',
    perspective: 'home',
    developmentSeasons: DEVELOPMENT_SEASONS,
    holdoutSeasons: HOLDOUT_SEASONS,
    sources: bundle.sources.map(({ key, url, sha256 }) => ({ key, url, sha256 })),
    sourceAudit,
    datasetDiagnostics: dataset.diagnostics,
    featureNames: MODEL_FEATURE_NAMES,
    preprocessor,
    regularization,
    models: { calibratedMarket, candidate },
    metrics,
    bootstrap,
    decision,
  };
}

function metric(value: number): string {
  return value.toFixed(6);
}

function metricTable(report: ForecastEvaluationReport): string[] {
  const rows = [
    '| Scope | Model | Games | Log loss | Brier | 10-bin ECE |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
  ];
  for (const [model, values] of Object.entries(report.metrics.pooled)) {
    rows.push(
      `| Pooled | ${model} | ${values.games} | ${metric(values.logLoss)} | ${metric(values.brier)} | ${metric(values.calibrationError)} |`
    );
  }
  for (const season of report.holdoutSeasons) {
    for (const [model, values] of Object.entries(report.metrics.bySeason[String(season)])) {
      rows.push(
        `| ${season} | ${model} | ${values.games} | ${metric(values.logLoss)} | ${metric(values.brier)} | ${metric(values.calibrationError)} |`
      );
    }
  }
  return rows;
}

export function renderModelCard(report: ForecastEvaluationReport): string {
  const status = report.decision.promoted ? 'PROMOTED' : 'DECLINED';
  const sourceLines = report.sources.map(
    (source) => `- [${source.key}](${source.url}) — SHA-256 \`${source.sha256}\``
  );
  const featureLines = report.featureNames.map((name, index) => `${index + 1}. \`${name}\``);
  const gateLines = Object.entries(report.decision.checks).map(
    ([name, passed]) => `- ${name}: ${passed ? 'PASS' : 'FAIL'}`
  );

  return [
    '# Depth matchup forecast model card',
    '',
    `Model version: \`${report.modelVersion}\`  `,
    `Evaluation decision: **${status}**`,
    '',
    '## Intended use',
    '',
    'This model estimates the probability of a home-team win for a scheduled NFL matchup.',
    'For informational and entertainment purposes. Depth does not accept wagers or provide betting',
    'services.',
    '',
    '## Data and attribution',
    '',
    'Game results, weekly team statistics, and market moneylines come from nflverse data released',
    'under CC BY 4.0. Source files used for this evaluation are pinned below:',
    '',
    ...sourceLines,
    '',
    'The nflverse games source exposes a final market snapshot, not timestamped line history. This',
    'evaluation therefore cannot reconstruct the exact market information available at every',
    'historical kickoff and must not be described as a point-in-time odds backtest.',
    '',
    '## Evaluation window and update timing',
    '',
    `Preprocessing, L2 selection, and model fitting use ${report.developmentSeasons[0]}–${report.developmentSeasons.at(-1)} only.`,
    `The untouched holdout is ${report.holdoutSeasons[0]}–${report.holdoutSeasons.at(-1)}. A future`,
    'forecast refresh must run only after the nflverse source cache is refreshed; probabilities are',
    'pregame snapshots and do not update live during a game.',
    '',
    '## Pooled holdout metrics',
    '',
    ...metricTable(report),
    '',
    `Paired week-block bootstrap (candidate log loss minus market): ${metric(report.bootstrap.lower)} to ${metric(report.bootstrap.upper)} (${report.bootstrap.replicates} replicates, seed ${report.bootstrap.seed}).`,
    '',
    '## Promotion gates',
    '',
    ...gateLines,
    '',
    `Relative pooled log-loss improvement: ${metric(report.decision.relativeLogLossImprovement)}`,
    `Holdout seasons with lower candidate log loss: ${report.decision.seasonLogLossWins}`,
    '',
    '## Feature and fallback contract',
    '',
    'The ordered inference vector is fixed. Team statistics enter as home-minus-away differentials;',
    'each side also has a fallback indicator. Missing current-season evidence falls back first to a',
    'prior regular-season aggregate and then to a development-only median. Scaling and medians are',
    'stored in the promoted artifact. The market anchor is the clipped raw `market_logit`.',
    '',
    ...featureLines,
    '',
  ].join('\n');
}
