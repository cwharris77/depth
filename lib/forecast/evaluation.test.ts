import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTrainArguments } from '../../scripts/train-matchup-forecast.mts';
import { DEVELOPMENT_SEASONS, HOLDOUT_SEASONS, SOURCE_SEASONS } from './contracts';
import { MODEL_FEATURE_NAMES } from './preprocessing';
import type { ForecastSourceBundle, ForecastSourceFile } from './source';
import { renderModelCard, runForecastEvaluation, stableJson } from './evaluation';

const GAME_HEADERS = [
  'game_id',
  'season',
  'week',
  'game_type',
  'gameday',
  'gametime',
  'home_team',
  'away_team',
  'home_score',
  'away_score',
  'home_rest',
  'away_rest',
  'location',
  'home_moneyline',
  'away_moneyline',
];

const WEEKLY_HEADERS = [
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
];

const MATCHUPS = [
  { home: 'ARI', away: 'ATL', week: 1, time: '13:00', market: ['-150', '130'] },
  { home: 'BAL', away: 'BUF', week: 1, time: '16:00', market: ['120', '-140'] },
  { home: 'ATL', away: 'ARI', week: 2, time: '13:00', market: ['-110', '-110'] },
  { home: 'BUF', away: 'BAL', week: 2, time: '16:00', market: ['135', '-155'] },
] as const;

function sourceFile(
  key: ForecastSourceFile['key'],
  season: number | null,
  text: string,
  hashCharacter: string
): ForecastSourceFile {
  const cacheFile = season === null ? 'games.csv' : `stats_team_week_${season}.csv`;
  return {
    key,
    season,
    cacheFile,
    text,
    sha256: hashCharacter.repeat(64),
    url: `https://example.test/nflverse/${cacheFile}`,
  };
}

function weeklyRow(
  season: number,
  gameId: string,
  matchupIndex: number,
  side: 'home' | 'away'
): string[] {
  const matchup = MATCHUPS[matchupIndex];
  const team = side === 'home' ? matchup.home : matchup.away;
  const opponent = side === 'home' ? matchup.away : matchup.home;
  const sideOffset = side === 'home' ? 2 : -1;
  const seasonOffset = (season - 2011) % 5;
  return [
    String(season),
    String(matchup.week),
    team,
    'REG',
    gameId,
    opponent,
    String(29 + matchupIndex + sideOffset),
    String(2 + ((season + matchupIndex + sideOffset) % 3)),
    String(1.5 + seasonOffset * 0.2 + matchupIndex * 0.1 + sideOffset * 0.05),
    String((season + matchupIndex + sideOffset) % 2),
    String(2 + ((season + matchupIndex) % 3)),
    String(21 + matchupIndex - sideOffset),
    String(0.8 + seasonOffset * 0.1 - matchupIndex * 0.05 + sideOffset * 0.03),
    String(1 + ((season + matchupIndex + sideOffset) % 2)),
    String(2 + ((season + matchupIndex - sideOffset) % 4)),
    String((season + matchupIndex + sideOffset) % 2),
    String((season + matchupIndex - sideOffset) % 2),
    String((season + matchupIndex + sideOffset + 1) % 2),
  ];
}

function syntheticBundle(flipHoldoutLabels = false): ForecastSourceBundle {
  const gameRows: string[][] = [];
  const teamWeeks: ForecastSourceFile[] = [];

  for (const season of SOURCE_SEASONS) {
    const weeklyRows: string[][] = [];
    MATCHUPS.forEach((matchup, matchupIndex) => {
      const gameId = `${season}-${matchupIndex + 1}`;
      const originalHomeWin = (season + matchupIndex) % 2 === 0;
      const homeWin =
        flipHoldoutLabels && HOLDOUT_SEASONS.includes(season) ? !originalHomeWin : originalHomeWin;
      gameRows.push([
        gameId,
        String(season),
        String(matchup.week),
        'REG',
        `${season}-09-0${matchup.week}`,
        matchup.time,
        matchup.home,
        matchup.away,
        homeWin ? '24' : '17',
        homeWin ? '17' : '24',
        String(7 + (matchupIndex % 2)),
        String(6 + ((matchupIndex + 1) % 2)),
        matchupIndex === 1 ? 'Neutral' : 'Home',
        matchup.market[0],
        matchup.market[1],
      ]);
      weeklyRows.push(weeklyRow(season, gameId, matchupIndex, 'home'));
      weeklyRows.push(weeklyRow(season, gameId, matchupIndex, 'away'));
    });

    teamWeeks.push(
      sourceFile(
        `team-week-${season}`,
        season,
        [WEEKLY_HEADERS, ...weeklyRows].map((row) => row.join(',')).join('\n'),
        String.fromCharCode(98 + ((season - 2011) % 20))
      )
    );
  }

  const games = sourceFile(
    'games',
    null,
    [GAME_HEADERS, ...gameRows].map((row) => row.join(',')).join('\n'),
    'a'
  );
  return { sources: [games, ...teamWeeks], games, teamWeeks };
}

describe('forecast evaluation orchestration', () => {
  it('keeps every fit development-only and scores each holdout game once', () => {
    const report = runForecastEvaluation(syntheticBundle());
    const flipped = runForecastEvaluation(syntheticBundle(true));

    expect(report.developmentSeasons).toEqual(DEVELOPMENT_SEASONS);
    expect(report.holdoutSeasons).toEqual(HOLDOUT_SEASONS);
    expect(report.preprocessor.developmentSeasons).toEqual(DEVELOPMENT_SEASONS);
    expect(flipped.preprocessor).toEqual(report.preprocessor);
    expect(flipped.regularization).toEqual(report.regularization);
    expect(flipped.models).toEqual(report.models);
    expect(flipped.metrics).not.toEqual(report.metrics);
    expect(
      report.regularization.candidates.flatMap((candidate) =>
        candidate.folds.map((fold) => fold.validationSeason)
      )
    ).not.toContain(2023);
    expect(Object.keys(report.metrics.bySeason)).toEqual(['2023', '2024', '2025']);
    expect(Object.values(report.metrics.bySeason).map((metrics) => metrics.market.games)).toEqual([
      4, 4, 4,
    ]);
    expect(report.metrics.pooled.market.games).toBe(12);
  });

  it('returns the complete frozen audit, model, metric, bootstrap, and gate report', () => {
    const report = runForecastEvaluation(syntheticBundle());

    expect(report).toMatchObject({
      schemaVersion: 1,
      modelVersion: 'depth-logit-v1-2025',
      target: 'home_win',
      perspective: 'home',
      sourceAudit: { ok: true },
      datasetDiagnostics: { sourceGames: 60, emittedExamples: 56 },
      featureNames: MODEL_FEATURE_NAMES,
      bootstrap: { replicates: 10_000, seed: 3_162_025 },
      decision: {
        checks: {
          relativeLogLoss: expect.any(Boolean),
          bootstrap: expect.any(Boolean),
          brier: expect.any(Boolean),
          calibration: expect.any(Boolean),
          seasons: expect.any(Boolean),
        },
      },
    });
    expect(report.sources).toHaveLength(16);
    expect(report.sources[0]).toEqual({
      key: 'games',
      url: 'https://example.test/nflverse/games.csv',
      sha256: 'a'.repeat(64),
    });
    expect(report.models.calibratedMarket.config.l2).toBe(0);
    expect(report.models.calibratedMarket.coefficients).toHaveLength(1);
    expect(report.models.candidate.coefficients).toHaveLength(MODEL_FEATURE_NAMES.length);
    expect(report.models.candidate.config.l2).toBe(report.regularization.selectedL2);
    expect(report.regularization.candidates).toHaveLength(5);
    expect(report.regularization.candidates[0].folds).toHaveLength(7);
    expect(Object.keys(report.metrics.pooled)).toEqual([
      'naive',
      'market',
      'calibratedMarket',
      'candidate',
    ]);
  });
});

describe('deterministic evaluation outputs', () => {
  it('recursively sorts object keys without sorting ordered feature arrays', () => {
    const first = stableJson({
      z: { beta: 2, alpha: 1 },
      featureNames: ['market_logit', 'neutral_site'],
      a: true,
    });
    const second = stableJson({
      a: true,
      featureNames: ['market_logit', 'neutral_site'],
      z: { alpha: 1, beta: 2 },
    });

    expect(second).toBe(first);
    expect(Object.keys(JSON.parse(first))).toEqual(['a', 'featureNames', 'z']);
    expect(JSON.parse(first).featureNames).toEqual(['market_logit', 'neutral_site']);
  });

  it('renders the attribution, limitations, evaluation, inference, and disclosure contract', () => {
    const card = renderModelCard(runForecastEvaluation(syntheticBundle()));

    expect(card).toContain('nflverse');
    expect(card).toContain('CC BY 4.0');
    expect(card).toMatch(/final[^\n]*snapshot/i);
    expect(card).toContain('Pooled holdout metrics');
    expect(card).toContain('market_logit');
    expect(card).toMatch(/fallback/i);
    expect(card).toMatch(/2012.+2022/);
    expect(card).toMatch(/2023.+2025/);
    expect(card).toMatch(/updated|refresh/i);
    expect(card.replace(/\s+/g, ' ')).toContain(
      'For informational and entertainment purposes. Depth does not accept wagers or provide betting services.'
    );
  });
});

describe('forecast training command arguments', () => {
  it('accepts only the locked options and applies deterministic defaults', () => {
    expect(parseTrainArguments([])).toEqual({
      cacheDir: '.cache/matchup-forecast/sources',
      reportPath: '.cache/matchup-forecast/evaluation.json',
      modelCardPath: 'docs/matchup-forecast-model-card.md',
      artifactPath: 'models/matchup-forecast-v1.json',
      refresh: false,
      promote: false,
    });
    expect(
      parseTrainArguments([
        '--cache-dir',
        'cache',
        '--report',
        'report.json',
        '--model-card',
        'card.md',
        '--artifact',
        'model.json',
        '--refresh',
        '--promote',
      ])
    ).toEqual({
      cacheDir: 'cache',
      reportPath: 'report.json',
      modelCardPath: 'card.md',
      artifactPath: 'model.json',
      refresh: true,
      promote: true,
    });
    expect(() => parseTrainArguments(['--report'])).toThrow(/missing value/i);
    expect(() => parseTrainArguments(['--unknown'])).toThrow(/unknown argument/i);
  });

  it('exits invalid invocations before fetching or creating the source cache', () => {
    const directory = mkdtempSync(join(tmpdir(), 'depth-forecast-cli-'));
    const cacheDir = join(directory, 'sources');
    try {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/train-matchup-forecast.mts',
          '--cache-dir',
          cacheDir,
          '--unknown',
        ],
        { cwd: process.cwd(), encoding: 'utf8' }
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/unknown argument/i);
      expect(existsSync(cacheDir)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
