# Matchup Forecast Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, cutoff-safe TypeScript training pipeline that decides whether the first Depth matchup forecast beats the approved nflverse market baseline.

**Architecture:** This plan implements only the evaluation half of DEP-316. Repository-owned source, dataset, preprocessing, logistic-regression, and metric modules produce a deterministic report and model card; a promoted JSON artifact is written only when every locked gate passes and the command includes `--promote`. Database, ingestion, web repository, and iOS work are deliberately deferred to a second plan after a passing result.

**Tech Stack:** TypeScript 5, Node.js 22, Vitest 4, `tsx`, nflverse CSV releases, SHA-256 source manifests

**Spec:** [`Projects/depth/specs/2026-08-24-matchup-forecast-model-design.md`](../../../../obsidian/Projects/depth/specs/2026-08-24-matchup-forecast-model-design.md)

## Global Constraints

- Training examples cover 2012–2025; load 2011 weekly team stats only for early-2012 prior-season fallback.
- Development is 2012–2022. Do not read 2023–2025 labels or metrics while selecting features, preprocessing, optimizer settings, or L2 strength.
- The final holdout is 2023, 2024, and 2025. Never retune after viewing it.
- The primary baseline is raw two-sided vig-free nflverse home-win probability on the exact games scored by the candidate.
- Promotion requires at least 1% lower pooled log loss, a paired 95% week-block bootstrap interval entirely below zero, pooled Brier and ten-bin ECE no worse than market, and lower log loss in at least two holdout seasons.
- The qualifying candidate is L2-regularized logistic regression anchored by market log odds. The market-only recalibration is diagnostic and cannot qualify.
- Exclude ties, incomplete two-sided moneylines, malformed source rows, and rows missing required kickoff/rest context; count every exclusion by reason.
- Build every target feature from source games strictly earlier than the target kickoff. Target scores are labels only.
- Use no injury, roster, participation, full-season aggregate, Python, external ML runtime, remote model service, generated explanation, or arbitrary 0–100 score.
- Identical source bytes, code, and configuration must produce byte-identical evaluation JSON, model card, and—when promoted—model artifact. Exclude wall-clock timestamps.
- This phase must not create or alter Supabase migrations, database types, `games`, `teams`, existing repository payloads, Swift files, or native caches.
- If the candidate fails, commit the pipeline, tests, evaluation model card, and no `models/matchup-forecast-v1.json`.
- If the candidate passes, a later promotion plan must apply an additive `game_forecasts` migration before forecast-aware clients, verify the released iOS build against the migrated production schema, and map missing-table/no-row reads to `unavailable` rather than failing Compare.
- Follow TDD. Use single quotes, 100-character width, trailing commas, and no new runtime dependency.

---

### Task 1: Deterministic source manifest and cache

**Files:**

- Modify: `.gitignore`
- Create: `lib/forecast/contracts.ts`
- Create: `lib/forecast/source.ts`
- Create: `lib/forecast/source.test.ts`

**Interfaces:**

- Consumes: `assetUrl(tag: string, file: string): string`
- Produces: `forecastSourceSpecs(): ForecastSourceSpec[]`
- Produces: `loadForecastSources(options: LoadForecastSourcesOptions): Promise<ForecastSourceBundle>`
- Produces: locked season constants and the ordered candidate feature-name contract used by later tasks

- [ ] **Step 1: Write failing manifest and cache tests**

Add tests proving the manifest contains one `games` source plus `stats_team_week_2011.csv` through
`stats_team_week_2025.csv`, all team files use the current `stats_team` release tag, cached bytes
win unless `refresh: true`, HTTP/non-empty validation occurs before a cache write, and SHA-256 is
computed from exact bytes.

Use a temporary directory and this core assertion:

```ts
const bundle = await loadForecastSources({
  cacheDir,
  fetchImpl: async (input) =>
    new Response(String(input).includes('games.csv') ? 'games-bytes' : 'team-bytes'),
});

expect(bundle.sources[0]).toMatchObject({
  key: 'games',
  sha256: '2281bc87990df06784cc37642691023234dc12af27efb39253c943d4ec848d10',
});
expect(forecastSourceSpecs().at(-1)?.url).toBe(
  'https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2025.csv'
);
```

- [ ] **Step 2: Run the source test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/source.test.ts`

Expected: FAIL because `contracts.ts` and `source.ts` do not exist.

- [ ] **Step 3: Define the locked constants and source types**

Create `contracts.ts` with these exports:

```ts
export const SOURCE_SEASONS = Object.freeze(
  Array.from({ length: 15 }, (_, index) => 2011 + index)
);
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
```

- [ ] **Step 4: Implement source loading and exact hashes**

Use these public types and behavior in `source.ts`:

```ts
export interface ForecastSourceSpec {
  key: 'games' | `team-week-${number}`;
  season: number | null;
  url: string;
  cacheFile: string;
}

export interface ForecastSourceFile extends ForecastSourceSpec {
  text: string;
  sha256: string;
}

export interface LoadForecastSourcesOptions {
  cacheDir: string;
  refresh?: boolean;
  fetchImpl?: typeof fetch;
}

export interface ForecastSourceBundle {
  sources: ForecastSourceFile[];
  games: ForecastSourceFile;
  teamWeeks: ForecastSourceFile[];
}
```

`forecastSourceSpecs()` returns the games URL
`https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv`, then team seasons in
ascending order. `loadForecastSources` creates `cacheDir`, reads an existing cache unless refresh
is set, fetches missing files, rejects non-2xx and empty bodies, writes exact UTF-8 bytes, and uses
`createHash('sha256').update(text, 'utf8').digest('hex')`. Preserve manifest order.

- [ ] **Step 5: Ignore only the forecast cache and verify the source layer**

Add `/.cache/matchup-forecast/` to `.gitignore`, then run:

```bash
npx vitest run lib/forecast/source.test.ts
npx tsc --noEmit
npx prettier --check .gitignore lib/forecast/contracts.ts lib/forecast/source.ts lib/forecast/source.test.ts
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the source layer**

```bash
git add .gitignore lib/forecast/contracts.ts lib/forecast/source.ts lib/forecast/source.test.ts
git commit -m "feat(forecast): load deterministic nflverse sources"
```

---

### Task 2: Forecast-only source parsing and schema audit

**Files:**

- Create: `lib/forecast/source-records.ts`
- Create: `lib/forecast/source-records.test.ts`

**Interfaces:**

- Consumes: `parseCsv(text: string): Record<string, string>[]`
- Consumes: `resolveTeamCode(code: string): string | null`
- Consumes: `vigFreeImpliedProbability(home, away): number | null`
- Produces: `parseForecastGames(rows): ParsedForecastGames`
- Produces: `parseWeeklyTeamStats(rows, expectedSeason): ParsedWeeklyTeamStats`
- Produces: `auditForecastSources(gamesRows, teamRowsBySeason): SourceAudit`

- [ ] **Step 1: Write failing game and weekly-stat parser tests**

Define inline rows and prove:

- historic relocation codes resolve through `resolveTeamCode`
- `kickoffKey` preserves source Eastern ordering as `YYYY-MM-DDTHH:mm`
- both moneylines are required for `marketHomeProbability`
- `Home` and `Neutral` map to `neutralSite: false/true`
- blank scores remain null and equal played scores are retained as a tie diagnostic
- `season_type`, `game_id`, and `opponent_team` are required on weekly rows
- a non-blank non-finite count, a season mismatch, an unknown team, and a missing required header
  are counted and never guessed
- blank selected metrics remain null so feature-level fallback can operate without discarding the
  rest of a valid team/game row
- all feature-source columns present in both 2012-style and 2025-style headers pass the audit

Use these exact selected weekly fields:

```ts
const REQUIRED_WEEKLY_FIELDS = [
  'season',
  'week',
  'team',
  'season_type',
  'game_id',
  'opponent_team',
  'attempts',
  'sacks_suffered',
  'passing_epa',
  'passing_interceptions',
  'passing_20',
  'carries',
  'rushing_epa',
  'rushing_20',
  'def_sacks',
  'def_interceptions',
  'fumble_recovery_opp',
  'fumbles_lost_total',
] as const;
```

- [ ] **Step 2: Run the parser test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/source-records.test.ts`

Expected: FAIL because `source-records.ts` does not exist.

- [ ] **Step 3: Implement the exact parsed contracts**

Export:

```ts
export interface ForecastGame {
  gameId: string;
  season: number;
  week: number;
  seasonType: 'REG' | 'POST';
  kickoffKey: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeRest: number | null;
  awayRest: number | null;
  neutralSite: boolean;
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  marketHomeProbability: number | null;
}

export interface WeeklyTeamStat {
  gameId: string;
  season: number;
  week: number;
  seasonType: 'REG' | 'POST';
  teamId: string;
  opponentTeamId: string;
  attempts: number | null;
  sacksSuffered: number | null;
  passingEpa: number | null;
  passingInterceptions: number | null;
  passing20: number | null;
  carries: number | null;
  rushingEpa: number | null;
  rushing20: number | null;
  defensiveSacks: number | null;
  defensiveInterceptions: number | null;
  opponentFumbleRecoveries: number | null;
  fumblesLost: number | null;
}
```

`parseForecastGames` accepts 2011–2025 source rows so fallback history can be built, but later
dataset code emits targets only for 2012–2025. Require finite integer season/week, known teams,
`REG`/`POST`, non-empty `gameday` and `gametime`, and location `Home` or `Neutral`. Keep a row with
missing score/rest/market so the dataset layer can count the precise exclusion reason. Sort by
`kickoffKey`, then `gameId`.

`parseWeeklyTeamStats` requires an exact `expectedSeason`. Parse blank selected metrics as null;
reject non-blank non-finite values. Sort by season, week, game ID, and team ID. Duplicate
`(gameId, teamId)` rows are malformed and all copies of that key are excluded.

- [ ] **Step 4: Implement a pre-holdout schema audit**

`auditForecastSources` returns:

```ts
export interface SourceAudit {
  ok: boolean;
  gameCountBySeason: Record<string, number>;
  teamRowCountBySeason: Record<string, number>;
  missingGameFields: string[];
  missingWeeklyFieldsBySeason: Record<string, string[]>;
  malformedGames: number;
  malformedTeamRowsBySeason: Record<string, number>;
}
```

Fail `ok` if any required field is absent, any requested season has zero valid games/team rows, or
weekly source pairs do not use matching `game_id`/opponent identities. The audit may inspect schema
and identity coverage across all seasons; it must not calculate 2023–2025 outcomes or metrics.

- [ ] **Step 5: Verify and commit source parsing**

```bash
npx vitest run lib/forecast/source-records.test.ts lib/nflverse/csv.test.ts lib/utils/compare/market-lines.test.ts
npx tsc --noEmit
npx prettier --check lib/forecast/source-records.ts lib/forecast/source-records.test.ts
git add lib/forecast/source-records.ts lib/forecast/source-records.test.ts
git commit -m "feat(forecast): parse cutoff-safe source records"
```

Expected: tests, typecheck, and formatting PASS; commit succeeds.

---

### Task 3: Chronological feature dataset and leakage guards

**Files:**

- Create: `lib/forecast/dataset.ts`
- Create: `lib/forecast/dataset.test.ts`

**Interfaces:**

- Consumes: sorted `ForecastGame[]` and `WeeklyTeamStat[]`
- Produces: `buildRawForecastDataset(games, weeklyRows): RawDatasetResult`
- Produces: raw home/away feature values plus provenance for preprocessing

- [ ] **Step 1: Write failing chronological dataset tests**

Build a compact two-season schedule and assert:

- a target's own weekly rows never enter its features
- a later same-week game never enters an earlier kickoff's features
- mutating target scores changes only `label`, never any feature or provenance field
- rolling-four drops the fifth-oldest prior game while season-to-date retains it
- season windows reset; early-season targets use prior-season final `REG` aggregates
- postseason targets may use earlier postseason games, but prior-season fallback remains REG-only
- an early-2012 target can use 2011 fallback without emitting a 2011 training example
- ties, missing market, missing rest, and unplayed games receive distinct target-exclusion counts
- a completed game missing one weekly team row is counted as unavailable history and cannot enter
  future features, but its own pregame example is not retroactively removed
- all market/baseline/candidate consumers receive the same included game IDs
- reversing input arrays yields identical sorted examples and diagnostics

The leakage assertion must be explicit:

```ts
const before = buildRawForecastDataset(games, weeklyRows);
const mutated = buildRawForecastDataset(
  games.map((game) =>
    game.gameId === targetId ? { ...game, homeScore: 99, awayScore: 0 } : game
  ),
  weeklyRows
);

expect(mutated.examples[0].teamFeatures).toEqual(before.examples[0].teamFeatures);
expect(mutated.examples[0].latestSourceKickoffKey).toBe(before.examples[0].latestSourceKickoffKey);
```

- [ ] **Step 2: Run the dataset test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/dataset.test.ts`

Expected: FAIL because `dataset.ts` does not exist.

- [ ] **Step 3: Define accumulators, provenance, and diagnostics**

Export:

```ts
export interface TeamGameEvidence {
  gameId: string;
  kickoffKey: string;
  seasonType: 'REG' | 'POST';
  offenseEpa: number | null;
  offensiveOpportunities: number | null;
  defenseEpaAllowed: number | null;
  opponentOffensiveOpportunities: number | null;
  explosivePlays: number | null;
  sacksCreated: number | null;
  opponentDropbacks: number | null;
  sacksSuffered: number | null;
  ownDropbacks: number | null;
  takeaways: number | null;
  giveaways: number | null;
  scoringMargin: number;
}

export interface RawTeamFeatureValue {
  value: number | null;
  source: 'current' | 'prior-season' | 'unavailable';
  gameIds: string[];
  latestKickoffKey: string | null;
}

export interface RawForecastExample {
  gameId: string;
  season: number;
  week: number;
  kickoffKey: string;
  label: 0 | 1;
  marketHomeProbability: number;
  neutralSite: boolean;
  restDifferential: number;
  postseason: boolean;
  teamFeatures: Record<
    TeamFeatureName,
    { home: RawTeamFeatureValue; away: RawTeamFeatureValue }
  >;
  latestSourceKickoffKey: string | null;
}

export interface DatasetDiagnostics {
  sourceGames: number;
  emittedExamples: number;
  excludedBeforeTargetWindow: number;
  excludedUnplayed: number;
  excludedTies: number;
  excludedNoMarket: number;
  excludedMissingContext: number;
  historyGamesMissingWeeklyPair: number;
}
```

- [ ] **Step 4: Implement paired-game evidence and rate aggregation**

For each completed game with both team rows, construct one `TeamGameEvidence` per team. Use:

```ts
function sumOrNull(values: Array<number | null>): number | null {
  return values.every((value) => value !== null)
    ? values.reduce((sum, value) => sum + (value ?? 0), 0)
    : null;
}

offenseEpa = sumOrNull([passingEpa, rushingEpa]);
offensiveOpportunities = sumOrNull([attempts, sacksSuffered, carries]);
defenseEpaAllowed = sumOrNull([opponent.passingEpa, opponent.rushingEpa]);
opponentOffensiveOpportunities = sumOrNull([
  opponent.attempts,
  opponent.sacksSuffered,
  opponent.carries,
]);
explosivePlays = sumOrNull([passing20, rushing20]);
sacksCreated = defensiveSacks;
opponentDropbacks = sumOrNull([opponent.attempts, opponent.sacksSuffered]);
ownDropbacks = sumOrNull([attempts, sacksSuffered]);
takeaways = sumOrNull([defensiveInterceptions, opponentFumbleRecoveries]);
giveaways = sumOrNull([passingInterceptions, fumblesLost]);
scoringMargin = teamScore - opponentScore;
```

Aggregate numerators and denominators before division. Define `pressureBalance` as
`sacksCreated / opponentDropbacks - sacksSuffered / ownDropbacks`. Define turnover and scoring
margin per game. When any required weekly input is null, mark only the affected derived metric
null; keep the remaining evidence. Aggregate each feature over its own valid evidence games.
Reject a derived value when its denominator is zero; do not coerce it to zero.

- [ ] **Step 5: Implement chronological target creation**

Iterate games in `(kickoffKey, gameId)` order. For a target, derive current-season rolling-four
and season-to-date values from history whose `kickoffKey < target.kickoffKey`. If a team has no
valid current-season value, use its previous season's final REG aggregate. Record exact source game
IDs and latest kickoff. Only after creating or excluding the target may its completed paired
evidence enter history.

Hard-fail if provenance contains the target ID, a source kickoff at/after target kickoff, or a
source season/week later than the target. Emit targets only for 2012–2025.

- [ ] **Step 6: Verify and commit the raw dataset**

```bash
npx vitest run lib/forecast/dataset.test.ts lib/forecast/source-records.test.ts
npx tsc --noEmit
npx prettier --check lib/forecast/dataset.ts lib/forecast/dataset.test.ts
git add lib/forecast/dataset.ts lib/forecast/dataset.test.ts
git commit -m "feat(forecast): build leakage-safe historical dataset"
```

Expected: all commands PASS.

---

### Task 4: Development-only fallback and scaling

**Files:**

- Create: `lib/forecast/preprocessing.ts`
- Create: `lib/forecast/preprocessing.test.ts`

**Interfaces:**

- Consumes: `RawForecastExample[]`
- Produces: `fitPreprocessor(developmentRows): ForecastPreprocessor`
- Produces: `transformExamples(rows, preprocessor): ModelExample[]`
- Produces: one frozen ordered `MODEL_FEATURE_NAMES` array shared with the artifact

- [ ] **Step 1: Write failing preprocessing tests**

Prove that:

- medians, means, and standard deviations ignore all 2023–2025 values
- current values beat prior-season values, which beat the development median
- each home/away prior-season or median substitution sets its exact fallback indicator to one
- an all-constant continuous feature receives scale `1`, never division by zero
- market probabilities are clipped to `[1e-6, 1 - 1e-6]` before log odds
- transform preserves the frozen feature order regardless of object insertion order
- non-finite transformed values throw before fitting

Use a holdout sentinel of `999_999` and assert it never appears in serialized preprocessing.

- [ ] **Step 2: Run the preprocessing test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/preprocessing.test.ts`

Expected: FAIL because `preprocessing.ts` does not exist.

- [ ] **Step 3: Define exact model and preprocessing contracts**

Export:

```ts
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
```

- [ ] **Step 4: Implement fit then transform without holdout leakage**

`fitPreprocessor` must reject any input season outside `DEVELOPMENT_SEASONS`. Fit each team-feature
median from available current/prior values in development rows. Materialize development vectors,
then fit mean/population-standard-deviation only for continuous features: market logit,
rest differential, and team-feature differentials. Leave binary neutral/postseason/fallback
indicators as 0/1 with mean `0` and scale `1` in the artifact.

`transformExamples` uses stored values only. A median substitution uses
`source: 'development-median'` internally and sets that side's fallback indicator. Prior-season
also sets the indicator; current does not. Standardize continuous features and preserve indicators.

- [ ] **Step 5: Verify and commit preprocessing**

```bash
npx vitest run lib/forecast/preprocessing.test.ts lib/forecast/dataset.test.ts
npx tsc --noEmit
npx prettier --check lib/forecast/preprocessing.ts lib/forecast/preprocessing.test.ts
git add lib/forecast/preprocessing.ts lib/forecast/preprocessing.test.ts
git commit -m "feat(forecast): fit development-only preprocessing"
```

Expected: all commands PASS.

---

### Task 5: Deterministic logistic fitting and rolling-origin model selection

**Files:**

- Create: `lib/forecast/logistic.ts`
- Create: `lib/forecast/logistic.test.ts`

**Interfaces:**

- Consumes: `ModelExample[]` for fitting and `RawForecastExample[]` for rolling-origin selection
- Produces: `fitLogisticRegression(examples, config): LogisticModel`
- Produces: `predictProbability(model, featureValues): number`
- Produces: `selectRegularization(rawDevelopmentExamples): RegularizationSelection`

- [ ] **Step 1: Write failing optimizer and selection tests**

Add deterministic fixtures proving:

- zero features fit the observed intercept-only event rate
- a separable one-feature fixture assigns the expected coefficient sign and bounded probabilities
- L2 excludes the intercept and shrinks non-intercept coefficients
- singular/constant columns remain finite through ridge regularization
- identical rows/config produce byte-identical coefficients
- rolling-origin selection trains only on seasons earlier than each validation season
- each rolling-origin fold fits medians/scaling on that fold's training seasons only; a validation
  sentinel never enters fold preprocessing
- tied validation loss chooses the stronger L2 value deterministically

Assert exact repeatability and tolerance-based correctness separately:

```ts
const first = fitLogisticRegression(examples, config);
const second = fitLogisticRegression(examples, config);
expect(second).toEqual(first);
expect(predictProbability(first, [1])).toBeGreaterThan(0.5);
```

- [ ] **Step 2: Run the optimizer test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/logistic.test.ts`

Expected: FAIL because `logistic.ts` does not exist.

- [ ] **Step 3: Implement deterministic IRLS logistic regression**

Use these contracts:

```ts
export interface LogisticConfig {
  l2: number;
  maxIterations: 100;
  tolerance: 1e-10;
  probabilityEpsilon: 1e-12;
}

export interface LogisticModel {
  intercept: number;
  coefficients: number[];
  config: LogisticConfig;
  iterations: number;
  converged: boolean;
}
```

Implement iteratively reweighted least squares with a deterministic Gaussian-elimination solver
using partial pivoting. Optimize average negative log likelihood plus `l2 / 2 * sum(beta^2)`;
never regularize the intercept. Clip probabilities only inside log/weight calculations. Reject
empty data, mismatched vector lengths, non-finite inputs, a singular solve after L2, or failure to
converge by `maxIterations`.

- [ ] **Step 4: Implement development-only rolling-origin L2 selection**

Use candidate values `[0.0001, 0.001, 0.01, 0.1, 1]` and validation seasons 2016–2022. Each fold
takes raw examples, fits a new preprocessor on seasons 2012 through the year before validation,
transforms that fold's train/validation rows with only those values, and fits on the transformed
training rows. Select the lowest pooled validation log loss across all validation games; an exact
tie selects the larger L2. Do not reuse the final 2012–2022 preprocessor inside folds.

Return:

```ts
export interface RegularizationSelection {
  selectedL2: number;
  candidates: Array<{
    l2: number;
    pooledLogLoss: number;
    folds: Array<{ validationSeason: number; games: number; logLoss: number }>;
  }>;
}
```

- [ ] **Step 5: Verify and commit logistic fitting**

```bash
npx vitest run lib/forecast/logistic.test.ts lib/forecast/preprocessing.test.ts
npx tsc --noEmit
npx prettier --check lib/forecast/logistic.ts lib/forecast/logistic.test.ts
git add lib/forecast/logistic.ts lib/forecast/logistic.test.ts
git commit -m "feat(forecast): fit deterministic logistic candidate"
```

Expected: all commands PASS.

---

### Task 6: Baselines, metrics, paired bootstrap, and promotion gate

**Files:**

- Create: `lib/forecast/metrics.ts`
- Create: `lib/forecast/metrics.test.ts`

**Interfaces:**

- Consumes: aligned game labels and market/candidate probabilities
- Produces: `fitNaiveBaseline(developmentRows): NaiveBaseline`
- Produces: `evaluatePredictions(rows): EvaluationMetrics`
- Produces: `pairedWeekBootstrap(rows, options): BootstrapInterval`
- Produces: `evaluatePromotionGate(input): PromotionDecision`

- [ ] **Step 1: Write failing metric and gate tests**

Use hand-calculated fixtures for log loss, Brier score, and ten equal-width ECE bins. Prove:

- probability `1`/`0` is clipped to `1e-12` only for log loss
- bin 0 is `[0, 0.1)` and bin 9 includes `1`
- metrics reject mismatched game sets and non-finite probabilities
- bootstrap resamples week blocks within each season, uses a fixed seed, and repeats identically
- a 0.99% improvement fails while a 1.00% improvement passes that sub-gate
- a CI upper bound of `0` fails; an upper bound below `0` passes
- worse Brier or ECE fails even with better log loss
- one season win fails; two season wins pass
- calibrated-market diagnostic is always marked non-qualifying

- [ ] **Step 2: Run the metrics test and verify the missing-module failure**

Run: `npx vitest run lib/forecast/metrics.test.ts`

Expected: FAIL because `metrics.ts` does not exist.

- [ ] **Step 3: Implement exact metrics and naive baseline**

Export:

```ts
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
```

Fit the naive baseline from development labels only, with separate home-win rates for neutral and
non-neutral games. `evaluatePredictions` produces candidate, market, calibrated-market, and naive
metrics for each holdout season and pooled. Verify all methods receive the identical ordered game
IDs.

- [ ] **Step 4: Implement deterministic paired week-block bootstrap**

Use 10,000 replicates and seed `3162025`. Implement a small repository-owned Mulberry32 PRNG. For
each replicate and each season, sample that season's distinct weeks with replacement until the
original week-block count is reached, append every game in each sampled block, and calculate mean
`candidateLoss - marketLoss`. Sort replicate means and report linearly interpolated 2.5th and
97.5th percentiles.

- [ ] **Step 5: Implement the locked gate**

Return each sub-gate separately:

```ts
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
```

Use `1e-12` only as a floating comparison tolerance for Brier/ECE and the 1% boundary. Require the
bootstrap upper bound to be strictly below zero without tolerance.

- [ ] **Step 6: Verify and commit evaluation math**

```bash
npx vitest run lib/forecast/metrics.test.ts lib/forecast/logistic.test.ts
npx tsc --noEmit
npx prettier --check lib/forecast/metrics.ts lib/forecast/metrics.test.ts
git add lib/forecast/metrics.ts lib/forecast/metrics.test.ts
git commit -m "feat(forecast): enforce matchup model evidence gate"
```

Expected: all commands PASS.

---

### Task 7: Evaluation report, model card, and guarded artifact promotion

**Files:**

- Create: `lib/forecast/evaluation.ts`
- Create: `lib/forecast/evaluation.test.ts`
- Create: `lib/forecast/artifact.ts`
- Create: `lib/forecast/artifact.test.ts`
- Create: `scripts/train-matchup-forecast.mts`
- Modify: `package.json`
- Modify: `docs/nflverse.md`
- Create at real-run time: `docs/matchup-forecast-model-card.md`
- Create only if every gate passes and `--promote` is supplied: `models/matchup-forecast-v1.json`

**Interfaces:**

- Consumes: Tasks 1–6
- Produces: `runForecastEvaluation(bundle): ForecastEvaluationReport`
- Produces: `stableJson(value): string`
- Produces: `renderModelCard(report): string`
- Produces: CLI command `npm run train:forecast`

- [ ] **Step 1: Write failing orchestration and serialization tests**

Use synthetic 2011–2025 data and prove:

- preprocessing and L2 selection receive development rows only
- the final fit uses 2012–2022 and scores 2023–2025 exactly once
- raw market, calibrated-market diagnostic, and candidate all appear in the report
- source URLs/hashes, exclusion diagnostics, coefficients, preprocessing, fold metrics, seasonal
  metrics, pooled metrics, bootstrap, and every gate check are present
- recursively sorted JSON is byte-identical across runs while ordered feature arrays stay ordered
- the model card contains nflverse attribution, CC BY 4.0, final-snapshot limitation, metrics,
  feature/fallback contract, update timing, and the informational/entertainment disclosure
- declined evaluation never writes the promoted artifact, even with `promote: true`
- passing evaluation without `promote` writes report/model card only
- passing evaluation with `promote` writes a validated artifact and refuses to overwrite a
  different existing artifact

- [ ] **Step 2: Run the orchestration tests and verify missing-module failures**

Run:

```bash
npx vitest run lib/forecast/evaluation.test.ts lib/forecast/artifact.test.ts
```

Expected: FAIL because `evaluation.ts` and `artifact.ts` do not exist.

- [ ] **Step 3: Implement one-way evaluation orchestration**

`runForecastEvaluation` must perform this exact sequence:

1. audit source headers/identity coverage
2. parse and build raw examples
3. split development/holdout before any fitting
4. select L2 on raw development rows using fold-local preprocessing
5. fit the final preprocessor on all 2012–2022 rows and transform development/holdout with it
6. fit naive, calibrated-market diagnostic, and candidate on development; calibrated market is an
   unregularized intercept plus raw clipped-market logit and receives no football/context features
7. score the untouched holdout once
8. calculate metrics/bootstrap/gates
9. return the report without reading any output artifact or mutable database state

Freeze these report identities:

```ts
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
```

- [ ] **Step 4: Implement deterministic outputs and guarded promotion**

The promoted artifact contains only inference inputs and audit metadata: ordered feature names,
candidate intercept/coefficients, preprocessing, source URLs/hashes, seasons, optimizer/L2 config,
metrics/bootstrap/decision, exclusions, model version, and schema version. Do not include a
timestamp.

Implement:

```ts
export interface WriteEvaluationOutputsOptions {
  reportPath: string;
  modelCardPath: string;
  artifactPath: string;
  promote: boolean;
}

export function writeEvaluationOutputs(
  report: ForecastEvaluationReport,
  options: WriteEvaluationOutputsOptions
): { artifactWritten: boolean };
```

Write report/model-card parent directories as needed. When promotion is not both requested and
passing, do not create, truncate, or delete the artifact path. If an artifact already exists with
different bytes, throw; identical bytes are an idempotent success.

- [ ] **Step 5: Add the CLI and documentation**

Add to `package.json`:

```json
"train:forecast": "tsx scripts/train-matchup-forecast.mts"
```

The CLI accepts only:

```text
--cache-dir <path>       default .cache/matchup-forecast/sources
--report <path>          default .cache/matchup-forecast/evaluation.json
--model-card <path>      default docs/matchup-forecast-model-card.md
--artifact <path>        default models/matchup-forecast-v1.json
--refresh                refetch source bytes
--promote                write artifact only when every gate passes
```

Unknown/missing arguments exit non-zero before fetching. A declined model is a valid command
result and exits zero after writing the report/model card. Print source hashes, row/exclusion
counts, per-season and pooled metrics, bootstrap interval, every gate check, and final
`PROMOTED`/`DECLINED`; never print a betting recommendation.

Add a “Matchup forecast evaluation” section to `docs/nflverse.md` with the two commands, cache and
source locations, deterministic outputs, development/holdout split, and the rule that no database
or client integration begins until the artifact is promoted.

- [ ] **Step 6: Verify and commit the executable pipeline**

```bash
npx vitest run lib/forecast
npx tsc --noEmit
npx prettier --check lib/forecast scripts/train-matchup-forecast.mts package.json docs/nflverse.md
git add lib/forecast scripts/train-matchup-forecast.mts package.json docs/nflverse.md
git commit -m "feat(forecast): add guarded model evaluation command"
```

Expected: all commands PASS; no model card/artifact is committed from synthetic tests.

---

### Task 8: Run the real evaluation and record the evidence-backed outcome

**Files:**

- Create: `docs/matchup-forecast-model-card.md`
- Create only on a passing gate: `models/matchup-forecast-v1.json`
- Modify only if observed source semantics require a pre-holdout feature removal:
  `lib/forecast/contracts.ts`, its tests, and the model card

**Interfaces:**

- Consumes: `npm run train:forecast`
- Produces: the final DEP-316 evaluation outcome and the sole input to the conditional promotion plan

- [ ] **Step 1: Refresh and audit official source bytes before holdout evaluation**

Run:

```bash
npm run train:forecast -- --refresh
```

Expected before metrics are accepted:

- all 2011–2025 `stats_team_week` files use the `stats_team` tag
- all required fields pass the audit
- examples span 2012–2025
- no holdout result was used for feature removal or tuning

If a required feature is absent/inconsistent, stop before reading the holdout metric section,
remove only that feature and its tests from the frozen contract, record the source-audit removal in
the model card, rerun development tests, and commit `fix(forecast): align feature contract with nflverse`.
Do not replace it with a new feature.

- [ ] **Step 2: Review the locked result and choose the already-defined branch**

Inspect `.cache/matchup-forecast/evaluation.json` and console output. Do not change features,
preprocessing, L2 candidates, optimizer settings, bootstrap seed/count, or gate thresholds.

If `decision.promoted` is false, verify `models/matchup-forecast-v1.json` does not exist and keep the
model card's status `Declined`. If true, run the same cached bytes explicitly with promotion:

```bash
npm run train:forecast -- --promote
```

Expected: only a passing report creates `models/matchup-forecast-v1.json`.

- [ ] **Step 3: Prove deterministic reruns**

Run the cached command twice and compare SHA-256 values for the report, model card, and optional
artifact:

```bash
shasum -a 256 .cache/matchup-forecast/evaluation.json docs/matchup-forecast-model-card.md
npm run train:forecast --
shasum -a 256 .cache/matchup-forecast/evaluation.json docs/matchup-forecast-model-card.md
```

When promoted, include `models/matchup-forecast-v1.json` in both `shasum` commands. Expected: hashes
match exactly.

- [ ] **Step 4: Run full repository verification and the no-iOS/no-schema guard**

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
git diff --name-only origin/main...HEAD | rg '^(supabase/migrations/|lib/database.types.ts|ios/)'
```

Expected: tests/typecheck/format PASS; lint has no new errors; the final `rg` prints nothing and
exits 1 because this evaluation phase changed no schema, generated database type, or iOS file.

- [ ] **Step 5: Commit the model card and optional passing artifact**

Declined path:

```bash
git add docs/matchup-forecast-model-card.md
git commit -m "docs(forecast): record declined matchup model"
```

Passing path:

```bash
git add docs/matchup-forecast-model-card.md models/matchup-forecast-v1.json
git commit -m "feat(forecast): promote matchup model artifact"
```

- [ ] **Step 6: Stop at the promotion boundary**

If declined, update DEP-316 and the handoff to the market-only outcome; do not create forecast
schema, repository, or iOS code. If promoted, write a second implementation plan covering the
additive `game_forecasts` migration, nflverse-ingest inference, web/native repository reads,
released-iOS compatibility smoke test, and last-good behavior. Do not begin that work inside this
evaluation plan.
