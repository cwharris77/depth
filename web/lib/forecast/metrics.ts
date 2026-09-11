// Computes every holdout baseline and promotion statistic from one aligned row stream. The
// candidate and market therefore share game identity, labels, and week blocks by construction,
// while the calibrated-market diagnostic remains explicitly ineligible for promotion.

import { DEVELOPMENT_SEASONS, HOLDOUT_SEASONS } from './contracts';

export type EvaluatedModelName = 'naive' | 'market' | 'calibratedMarket' | 'candidate';

export interface PredictionRow {
  gameId: string;
  season: number;
  week: number;
  label: 0 | 1;
  neutralSite: boolean;
  probabilities: Record<EvaluatedModelName, number>;
}

export interface MetricSet {
  games: number;
  logLoss: number;
  brier: number;
  calibrationError: number;
}

export interface EvaluationMetrics {
  bySeason: Record<string, Record<EvaluatedModelName, MetricSet>>;
  pooled: Record<EvaluatedModelName, MetricSet>;
}

export interface NaiveBaselineRow {
  gameId: string;
  season: number;
  label: 0 | 1;
  neutralSite: boolean;
}

export interface NaiveBaseline {
  neutralHomeWinRate: number;
  nonNeutralHomeWinRate: number;
}

export interface PairedWeekBootstrapOptions {
  replicates?: number;
  seed?: number;
}

export interface BootstrapInterval {
  lower: number;
  upper: number;
  replicates: number;
  seed: number;
}

export interface PromotionGateInput {
  metrics: EvaluationMetrics;
  bootstrap: BootstrapInterval;
  model?: 'candidate' | 'calibratedMarket';
}

export interface PromotionDecision {
  promoted: boolean;
  relativeLogLossImprovement: number;
  seasonLogLossWins: number;
  checks: {
    relativeLogLoss: boolean;
    bootstrap: boolean;
    brier: boolean;
    calibration: boolean;
    seasons: boolean;
  };
}

const MODEL_NAMES = Object.freeze<EvaluatedModelName[]>([
  'naive',
  'market',
  'calibratedMarket',
  'candidate',
]);
const DEVELOPMENT_SEASON_SET = new Set<number>(DEVELOPMENT_SEASONS);
const LOG_LOSS_EPSILON = 1e-12;
const COMPARISON_TOLERANCE = 1e-12;
const DEFAULT_BOOTSTRAP_REPLICATES = 10_000;
const DEFAULT_BOOTSTRAP_SEED = 3_162_025;

function assertFinite(value: number, description: string): void {
  if (!Number.isFinite(value)) throw new Error(`Non-finite ${description}`);
}

function assertLabel(label: number, gameId: string): asserts label is 0 | 1 {
  if (label !== 0 && label !== 1) throw new Error(`Invalid label for game ${gameId}`);
}

function assertUniqueGameIds(rows: Array<{ gameId: string }>): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.gameId.length === 0) throw new Error('Game ID cannot be empty');
    if (seen.has(row.gameId)) {
      throw new Error(`Prediction rows must have aligned, unique game IDs: ${row.gameId}`);
    }
    seen.add(row.gameId);
  }
}

function validatePredictionRows(rows: PredictionRow[]): void {
  if (rows.length === 0) throw new Error('Cannot evaluate an empty prediction set');
  assertUniqueGameIds(rows);

  for (const row of rows) {
    assertLabel(row.label, row.gameId);
    if (!Number.isInteger(row.season)) throw new Error(`Invalid season for game ${row.gameId}`);
    if (!Number.isInteger(row.week)) throw new Error(`Invalid week for game ${row.gameId}`);

    for (const model of MODEL_NAMES) {
      if (!Object.prototype.hasOwnProperty.call(row.probabilities, model)) {
        throw new Error(`Prediction rows are not aligned: missing ${model} for ${row.gameId}`);
      }
      const probability = row.probabilities[model];
      assertFinite(probability, `${model} probability for game ${row.gameId}`);
      if (probability < 0 || probability > 1) {
        throw new Error(`${model} probability must be between zero and one for ${row.gameId}`);
      }
    }
  }
}

function binaryLogLoss(label: 0 | 1, probability: number): number {
  const observedClassProbability = label === 1 ? probability : 1 - probability;
  const clipped = Math.min(
    1 - LOG_LOSS_EPSILON,
    Math.max(LOG_LOSS_EPSILON, observedClassProbability)
  );
  return -Math.log(clipped);
}

function metricSet(rows: PredictionRow[], model: EvaluatedModelName): MetricSet {
  const bins = Array.from({ length: 10 }, () => ({ games: 0, probability: 0, labels: 0 }));
  let logLoss = 0;
  let brier = 0;

  for (const row of rows) {
    const probability = row.probabilities[model];
    logLoss += binaryLogLoss(row.label, probability);
    brier += (probability - row.label) ** 2;

    // Math.min assigns the closed endpoint 1 to bin 9; every other boundary starts a new bin.
    const bin = bins[Math.min(9, Math.floor(probability * 10))];
    bin.games += 1;
    bin.probability += probability;
    bin.labels += row.label;
  }

  const calibrationError = bins.reduce((sum, bin) => {
    if (bin.games === 0) return sum;
    const averageProbability = bin.probability / bin.games;
    const observedRate = bin.labels / bin.games;
    return sum + (bin.games / rows.length) * Math.abs(averageProbability - observedRate);
  }, 0);

  return {
    games: rows.length,
    logLoss: logLoss / rows.length,
    brier: brier / rows.length,
    calibrationError,
  };
}

function evaluateRows(rows: PredictionRow[]): Record<EvaluatedModelName, MetricSet> {
  return Object.fromEntries(MODEL_NAMES.map((model) => [model, metricSet(rows, model)])) as Record<
    EvaluatedModelName,
    MetricSet
  >;
}

export function fitNaiveBaseline(developmentRows: NaiveBaselineRow[]): NaiveBaseline {
  if (developmentRows.length === 0) {
    throw new Error('Cannot fit a naive baseline without development rows');
  }
  assertUniqueGameIds(developmentRows);

  for (const row of developmentRows) {
    assertLabel(row.label, row.gameId);
    if (!DEVELOPMENT_SEASON_SET.has(row.season)) {
      throw new Error(`Season ${row.season} is outside the development window`);
    }
  }

  const neutralRows = developmentRows.filter((row) => row.neutralSite);
  const nonNeutralRows = developmentRows.filter((row) => !row.neutralSite);
  if (neutralRows.length === 0 || nonNeutralRows.length === 0) {
    throw new Error('Naive baseline requires both neutral and non-neutral development games');
  }

  return {
    neutralHomeWinRate: neutralRows.reduce((wins, row) => wins + row.label, 0) / neutralRows.length,
    nonNeutralHomeWinRate:
      nonNeutralRows.reduce((wins, row) => wins + row.label, 0) / nonNeutralRows.length,
  };
}

export function evaluatePredictions(rows: PredictionRow[]): EvaluationMetrics {
  validatePredictionRows(rows);
  const seasons = [...new Set(rows.map((row) => row.season))].sort((a, b) => a - b);
  const bySeason = Object.fromEntries(
    seasons.map((season) => [
      String(season),
      evaluateRows(rows.filter((row) => row.season === season)),
    ])
  );

  return { bySeason, pooled: evaluateRows(rows) };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function percentile(sorted: number[], probability: number): number {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

export function pairedWeekBootstrap(
  rows: PredictionRow[],
  options: PairedWeekBootstrapOptions = {}
): BootstrapInterval {
  validatePredictionRows(rows);
  const replicates = options.replicates ?? DEFAULT_BOOTSTRAP_REPLICATES;
  const seed = options.seed ?? DEFAULT_BOOTSTRAP_SEED;
  if (!Number.isInteger(replicates) || replicates <= 0) {
    throw new Error('Bootstrap replicates must be a positive integer');
  }
  if (!Number.isSafeInteger(seed)) throw new Error('Bootstrap seed must be an integer');

  const seasons = new Map<number, Map<number, PredictionRow[]>>();
  for (const row of rows) {
    const weeks = seasons.get(row.season) ?? new Map<number, PredictionRow[]>();
    const block = weeks.get(row.week) ?? [];
    block.push(row);
    weeks.set(row.week, block);
    seasons.set(row.season, weeks);
  }

  const random = mulberry32(seed);
  const replicateMeans: number[] = [];
  for (let replicate = 0; replicate < replicates; replicate += 1) {
    const sampledLossDifferences: number[] = [];
    for (const weeks of seasons.values()) {
      const blocks = [...weeks.values()];
      for (let sample = 0; sample < blocks.length; sample += 1) {
        const block = blocks[Math.floor(random() * blocks.length)];
        for (const row of block) {
          const candidateLoss = binaryLogLoss(row.label, row.probabilities.candidate);
          const marketLoss = binaryLogLoss(row.label, row.probabilities.market);
          sampledLossDifferences.push(candidateLoss - marketLoss);
        }
      }
    }
    replicateMeans.push(
      sampledLossDifferences.reduce((sum, difference) => sum + difference, 0) /
        sampledLossDifferences.length
    );
  }

  replicateMeans.sort((left, right) => left - right);
  return {
    lower: percentile(replicateMeans, 0.025),
    upper: percentile(replicateMeans, 0.975),
    replicates,
    seed,
  };
}

function assertMetricSet(metrics: MetricSet, description: string): void {
  if (!Number.isInteger(metrics.games) || metrics.games <= 0) {
    throw new Error(`${description} games must be a positive integer`);
  }
  assertFinite(metrics.logLoss, `${description} log loss`);
  assertFinite(metrics.brier, `${description} Brier score`);
  assertFinite(metrics.calibrationError, `${description} calibration error`);
}

export function evaluatePromotionGate(input: PromotionGateInput): PromotionDecision {
  const model = input.model ?? 'candidate';
  const market = input.metrics.pooled.market;
  const evaluated = input.metrics.pooled[model];
  assertMetricSet(market, 'Pooled market');
  assertMetricSet(evaluated, `Pooled ${model}`);
  if (market.logLoss <= 0) throw new Error('Pooled market log loss must be positive');
  assertFinite(input.bootstrap.lower, 'bootstrap lower bound');
  assertFinite(input.bootstrap.upper, 'bootstrap upper bound');
  if (input.bootstrap.lower > input.bootstrap.upper) {
    throw new Error('Bootstrap lower bound cannot exceed its upper bound');
  }

  const relativeLogLossImprovement = (market.logLoss - evaluated.logLoss) / market.logLoss;
  let seasonLogLossWins = 0;
  for (const season of HOLDOUT_SEASONS) {
    const metrics = input.metrics.bySeason[String(season)];
    if (!metrics) throw new Error(`Missing holdout metrics for season ${season}`);
    assertMetricSet(metrics.market, `${season} market`);
    assertMetricSet(metrics[model], `${season} ${model}`);
    if (metrics[model].logLoss < metrics.market.logLoss) seasonLogLossWins += 1;
  }

  const checks = {
    relativeLogLoss: relativeLogLossImprovement + COMPARISON_TOLERANCE >= 0.01,
    bootstrap: input.bootstrap.upper < 0,
    brier: evaluated.brier <= market.brier + COMPARISON_TOLERANCE,
    calibration: evaluated.calibrationError <= market.calibrationError + COMPARISON_TOLERANCE,
    seasons: seasonLogLossWins >= 2,
  };

  return {
    promoted: model === 'candidate' && Object.values(checks).every(Boolean),
    relativeLogLossImprovement,
    seasonLogLossWins,
    checks,
  };
}
