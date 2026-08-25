export const SOURCE_SEASONS = Object.freeze(Array.from({ length: 15 }, (_, index) => 2011 + index));
export const DEVELOPMENT_SEASONS = Object.freeze(
  Array.from({ length: 11 }, (_, index) => 2012 + index)
);
export const HOLDOUT_SEASONS = Object.freeze([2023, 2024, 2025]);
export const MODEL_VERSION = 'depth-logit-v1-2025';

export const TEAM_FEATURE_NAMES = Object.freeze([
  'offense_epa_per_opportunity_rolling4',
  'offense_epa_per_opportunity_season',
  'defense_epa_allowed_per_opportunity_rolling4',
  'defense_epa_allowed_per_opportunity_season',
  'explosive_play_rate_rolling4',
  'explosive_play_rate_season',
  'pressure_balance_rolling4',
  'pressure_balance_season',
  'turnover_margin_per_game_rolling4',
  'turnover_margin_per_game_season',
  'scoring_margin_per_game_rolling4',
  'scoring_margin_per_game_season',
] as const);

export type TeamFeatureName = (typeof TEAM_FEATURE_NAMES)[number];
export type FallbackKind = 'current' | 'prior-season' | 'development-median';
