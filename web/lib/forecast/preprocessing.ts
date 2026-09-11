// Freezes the development-only fallback and scaling contract so every evaluation fold and promoted
// artifact materializes the same ordered model vector without admitting holdout information.

import {
  DEVELOPMENT_SEASONS,
  TEAM_FEATURE_NAMES,
  type FallbackKind,
  type TeamFeatureName,
} from './contracts';
import type { RawForecastExample, RawTeamFeatureValue } from './dataset';

export const CONTEXT_FEATURE_NAMES = Object.freeze([
  'market_logit',
  'neutral_site',
  'rest_differential',
  'postseason',
] as const);

export const MODEL_FEATURE_NAMES = Object.freeze([
  ...CONTEXT_FEATURE_NAMES,
  ...TEAM_FEATURE_NAMES.flatMap((name) => [
    `${name}_differential`,
    `${name}_home_fallback`,
    `${name}_away_fallback`,
  ]),
]);

export interface ForecastPreprocessor {
  featureNames: readonly string[];
  developmentSeasons: readonly number[];
  teamFeatureMedians: Record<TeamFeatureName, number>;
  means: Record<string, number>;
  standardDeviations: Record<string, number>;
}

export interface ModelExample {
  gameId: string;
  season: number;
  week: number;
  label: 0 | 1;
  marketHomeProbability: number;
  featureValues: number[];
}

interface MaterializedFeatures {
  values: Record<string, number>;
}

interface ResolvedTeamValue {
  value: number;
  source: FallbackKind;
}

const DEVELOPMENT_SEASON_SET = new Set<number>(DEVELOPMENT_SEASONS);
const CONTINUOUS_FEATURE_NAMES = new Set<string>([
  'market_logit',
  'rest_differential',
  ...TEAM_FEATURE_NAMES.map((name) => `${name}_differential`),
]);
const MARKET_EPSILON = 1e-6;

function assertFinite(value: number, description: string): void {
  if (!Number.isFinite(value)) throw new Error(`Non-finite ${description}`);
}

function median(values: number[]): number {
  if (values.length === 0) throw new Error('Cannot fit a development median without values');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function marketLogit(probability: number): number {
  assertFinite(probability, 'market probability');
  const clipped = Math.min(1 - MARKET_EPSILON, Math.max(MARKET_EPSILON, probability));
  return Math.log(clipped / (1 - clipped));
}

function resolveTeamValue(
  rawValue: RawTeamFeatureValue,
  featureName: TeamFeatureName,
  side: 'home' | 'away',
  developmentMedian: number
): ResolvedTeamValue {
  if (rawValue.source === 'unavailable') {
    return { value: developmentMedian, source: 'development-median' };
  }
  if (rawValue.source !== 'current' && rawValue.source !== 'prior-season') {
    throw new Error(`Unknown ${side} feature provenance for ${featureName}`);
  }
  if (rawValue.value === null) {
    throw new Error(`Non-finite ${side} feature value for ${featureName}`);
  }
  assertFinite(rawValue.value, `${side} feature value for ${featureName}`);
  return { value: rawValue.value, source: rawValue.source };
}

function materializeFeatures(
  row: RawForecastExample,
  teamFeatureMedians: Record<TeamFeatureName, number>
): MaterializedFeatures {
  const values: Record<string, number> = {
    market_logit: marketLogit(row.marketHomeProbability),
    neutral_site: row.neutralSite ? 1 : 0,
    rest_differential: row.restDifferential,
    postseason: row.postseason ? 1 : 0,
  };
  assertFinite(values.rest_differential, 'rest differential');

  for (const name of TEAM_FEATURE_NAMES) {
    const medianValue = teamFeatureMedians[name];
    assertFinite(medianValue, `development median for ${name}`);
    const feature = row.teamFeatures[name];
    const home = resolveTeamValue(feature.home, name, 'home', medianValue);
    const away = resolveTeamValue(feature.away, name, 'away', medianValue);
    values[`${name}_differential`] = home.value - away.value;
    values[`${name}_home_fallback`] = home.source === 'current' ? 0 : 1;
    values[`${name}_away_fallback`] = away.source === 'current' ? 0 : 1;
  }

  for (const name of MODEL_FEATURE_NAMES) assertFinite(values[name], `transformed feature ${name}`);
  return { values };
}

function fitTeamFeatureMedians(
  developmentRows: RawForecastExample[]
): Record<TeamFeatureName, number> {
  return Object.fromEntries(
    TEAM_FEATURE_NAMES.map((name) => {
      const availableValues = developmentRows.flatMap((row) => {
        const sides = [row.teamFeatures[name].home, row.teamFeatures[name].away];
        return sides.flatMap((side) => {
          if (side.source === 'unavailable') return [];
          if (side.source !== 'current' && side.source !== 'prior-season') {
            throw new Error(`Unknown feature provenance for ${name}`);
          }
          if (side.value === null) throw new Error(`Non-finite feature value for ${name}`);
          assertFinite(side.value, `feature value for ${name}`);
          return [side.value];
        });
      });
      return [name, median(availableValues)];
    })
  ) as Record<TeamFeatureName, number>;
}

function assertPreprocessor(preprocessor: ForecastPreprocessor): void {
  if (
    preprocessor.featureNames.length !== MODEL_FEATURE_NAMES.length ||
    preprocessor.featureNames.some((name, index) => name !== MODEL_FEATURE_NAMES[index])
  ) {
    throw new Error('Preprocessor feature names do not match the frozen model order');
  }
}

export function fitPreprocessor(developmentRows: RawForecastExample[]): ForecastPreprocessor {
  if (developmentRows.length === 0)
    throw new Error('Cannot fit preprocessing without development rows');
  for (const row of developmentRows) {
    if (!DEVELOPMENT_SEASON_SET.has(row.season)) {
      throw new Error(`Season ${row.season} is outside the development window`);
    }
  }

  const teamFeatureMedians = fitTeamFeatureMedians(developmentRows);
  const materializedRows = developmentRows.map((row) =>
    materializeFeatures(row, teamFeatureMedians)
  );
  const means: Record<string, number> = {};
  const standardDeviations: Record<string, number> = {};

  for (const name of MODEL_FEATURE_NAMES) {
    if (!CONTINUOUS_FEATURE_NAMES.has(name)) {
      means[name] = 0;
      standardDeviations[name] = 1;
      continue;
    }
    const values = materializedRows.map((row) => row.values[name]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    means[name] = mean;
    standardDeviations[name] = standardDeviation === 0 ? 1 : standardDeviation;
  }

  return {
    featureNames: MODEL_FEATURE_NAMES,
    developmentSeasons: [...new Set(developmentRows.map((row) => row.season))].sort(
      (a, b) => a - b
    ),
    teamFeatureMedians,
    means,
    standardDeviations,
  };
}

export function transformExamples(
  rows: RawForecastExample[],
  preprocessor: ForecastPreprocessor
): ModelExample[] {
  assertPreprocessor(preprocessor);
  return rows.map((row) => {
    const materialized = materializeFeatures(row, preprocessor.teamFeatureMedians);
    const featureValues = MODEL_FEATURE_NAMES.map((name) => {
      const value = CONTINUOUS_FEATURE_NAMES.has(name)
        ? (materialized.values[name] - preprocessor.means[name]) /
          preprocessor.standardDeviations[name]
        : materialized.values[name];
      assertFinite(value, `transformed feature ${name}`);
      return value;
    });
    return {
      gameId: row.gameId,
      season: row.season,
      week: row.week,
      label: row.label,
      marketHomeProbability: row.marketHomeProbability,
      featureValues,
    };
  });
}
