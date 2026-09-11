// Builds one canonical, chronologically ordered forecast dataset while preserving exact
// feature provenance. A game's completed evidence is admitted only after its pregame target is
// handled, making future model and baseline evaluation share the same leakage-safe game set.

import { TEAM_FEATURE_NAMES, type TeamFeatureName } from './contracts';
import type { ForecastGame, WeeklyTeamStat } from './source-records';

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
  teamFeatures: Record<TeamFeatureName, { home: RawTeamFeatureValue; away: RawTeamFeatureValue }>;
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

export interface RawDatasetResult {
  examples: RawForecastExample[];
  diagnostics: DatasetDiagnostics;
}

interface HistoricalEvidence extends TeamGameEvidence {
  season: number;
  week: number;
  teamId: string;
}

interface AggregatedFeature {
  value: number | null;
  evidence: HistoricalEvidence[];
}

function sumOrNull(values: Array<number | null>): number | null {
  return values.every((value) => value !== null)
    ? values.reduce((sum, value) => sum + (value ?? 0), 0)
    : null;
}

function completed(game: ForecastGame): game is ForecastGame & {
  homeScore: number;
  awayScore: number;
} {
  return game.homeScore !== null && game.awayScore !== null;
}

function validWeeklyPair(game: ForecastGame, rows: WeeklyTeamStat[]): boolean {
  if (rows.length !== 2) return false;
  const home = rows.find((row) => row.teamId === game.homeTeamId);
  const away = rows.find((row) => row.teamId === game.awayTeamId);
  return (
    home !== undefined &&
    away !== undefined &&
    home.opponentTeamId === away.teamId &&
    away.opponentTeamId === home.teamId &&
    home.season === game.season &&
    away.season === game.season &&
    home.week === game.week &&
    away.week === game.week &&
    home.seasonType === game.seasonType &&
    away.seasonType === game.seasonType
  );
}

function buildTeamEvidence(
  game: ForecastGame & { homeScore: number; awayScore: number },
  team: WeeklyTeamStat,
  opponent: WeeklyTeamStat,
  teamScore: number,
  opponentScore: number
): HistoricalEvidence {
  return {
    gameId: game.gameId,
    kickoffKey: game.kickoffKey,
    season: game.season,
    week: game.week,
    seasonType: game.seasonType,
    teamId: team.teamId,
    offenseEpa: sumOrNull([team.passingEpa, team.rushingEpa]),
    offensiveOpportunities: sumOrNull([team.attempts, team.sacksSuffered, team.carries]),
    defenseEpaAllowed: sumOrNull([opponent.passingEpa, opponent.rushingEpa]),
    opponentOffensiveOpportunities: sumOrNull([
      opponent.attempts,
      opponent.sacksSuffered,
      opponent.carries,
    ]),
    explosivePlays: sumOrNull([team.passing20, team.rushing20]),
    sacksCreated: team.defensiveSacks,
    opponentDropbacks: sumOrNull([opponent.attempts, opponent.sacksSuffered]),
    sacksSuffered: team.sacksSuffered,
    ownDropbacks: sumOrNull([team.attempts, team.sacksSuffered]),
    takeaways: sumOrNull([team.defensiveInterceptions, team.opponentFumbleRecoveries]),
    giveaways: sumOrNull([team.passingInterceptions, team.fumblesLost]),
    scoringMargin: teamScore - opponentScore,
  };
}

function aggregateRate(
  evidence: HistoricalEvidence[],
  numerator: keyof TeamGameEvidence,
  denominator: keyof TeamGameEvidence
): AggregatedFeature {
  const valid = evidence.filter(
    (row) => typeof row[numerator] === 'number' && typeof row[denominator] === 'number'
  );
  const denominatorSum = valid.reduce((sum, row) => sum + (row[denominator] as number), 0);
  if (valid.length === 0 || denominatorSum === 0) return { value: null, evidence: [] };
  const numeratorSum = valid.reduce((sum, row) => sum + (row[numerator] as number), 0);
  return { value: numeratorSum / denominatorSum, evidence: valid };
}

function aggregatePressure(evidence: HistoricalEvidence[]): AggregatedFeature {
  const valid = evidence.filter(
    (row) =>
      row.sacksCreated !== null &&
      row.opponentDropbacks !== null &&
      row.sacksSuffered !== null &&
      row.ownDropbacks !== null
  );
  const opponentDropbacks = valid.reduce((sum, row) => sum + (row.opponentDropbacks ?? 0), 0);
  const ownDropbacks = valid.reduce((sum, row) => sum + (row.ownDropbacks ?? 0), 0);
  if (valid.length === 0 || opponentDropbacks === 0 || ownDropbacks === 0) {
    return { value: null, evidence: [] };
  }
  const sacksCreated = valid.reduce((sum, row) => sum + (row.sacksCreated ?? 0), 0);
  const sacksSuffered = valid.reduce((sum, row) => sum + (row.sacksSuffered ?? 0), 0);
  return {
    value: sacksCreated / opponentDropbacks - sacksSuffered / ownDropbacks,
    evidence: valid,
  };
}

function aggregatePerGame(
  evidence: HistoricalEvidence[],
  fields: ['takeaways', 'giveaways'] | ['scoringMargin']
): AggregatedFeature {
  const valid = evidence.filter((row) => fields.every((field) => row[field] !== null));
  if (valid.length === 0) return { value: null, evidence: [] };
  const total = valid.reduce(
    (sum, row) =>
      sum +
      (fields.length === 1
        ? row.scoringMargin
        : (row.takeaways as number) - (row.giveaways as number)),
    0
  );
  return { value: total / valid.length, evidence: valid };
}

function aggregateFeature(
  name: TeamFeatureName,
  evidence: HistoricalEvidence[]
): AggregatedFeature {
  if (name.startsWith('offense_epa')) {
    return aggregateRate(evidence, 'offenseEpa', 'offensiveOpportunities');
  }
  if (name.startsWith('defense_epa')) {
    return aggregateRate(evidence, 'defenseEpaAllowed', 'opponentOffensiveOpportunities');
  }
  if (name.startsWith('explosive_play')) {
    return aggregateRate(evidence, 'explosivePlays', 'offensiveOpportunities');
  }
  if (name.startsWith('pressure_balance')) return aggregatePressure(evidence);
  if (name.startsWith('turnover_margin')) {
    return aggregatePerGame(evidence, ['takeaways', 'giveaways']);
  }
  return aggregatePerGame(evidence, ['scoringMargin']);
}

function validFeatureEvidence(
  name: TeamFeatureName,
  evidence: HistoricalEvidence[]
): HistoricalEvidence[] {
  if (name.startsWith('offense_epa')) {
    return evidence.filter((row) => row.offenseEpa !== null && row.offensiveOpportunities !== null);
  }
  if (name.startsWith('defense_epa')) {
    return evidence.filter(
      (row) => row.defenseEpaAllowed !== null && row.opponentOffensiveOpportunities !== null
    );
  }
  if (name.startsWith('explosive_play')) {
    return evidence.filter(
      (row) => row.explosivePlays !== null && row.offensiveOpportunities !== null
    );
  }
  if (name.startsWith('pressure_balance')) {
    return evidence.filter(
      (row) =>
        row.sacksCreated !== null &&
        row.opponentDropbacks !== null &&
        row.sacksSuffered !== null &&
        row.ownDropbacks !== null
    );
  }
  if (name.startsWith('turnover_margin')) {
    return evidence.filter((row) => row.takeaways !== null && row.giveaways !== null);
  }
  return evidence;
}

function materializeFeature(
  current: HistoricalEvidence[],
  priorSeason: HistoricalEvidence[],
  name: TeamFeatureName
): RawTeamFeatureValue {
  const validCurrent = validFeatureEvidence(name, current);
  const currentWindow = name.endsWith('_rolling4') ? validCurrent.slice(-4) : validCurrent;
  const currentValue = aggregateFeature(name, currentWindow);
  const selected =
    currentValue.value !== null
      ? currentValue
      : aggregateFeature(name, validFeatureEvidence(name, priorSeason));
  const source =
    currentValue.value !== null
      ? 'current'
      : selected.value !== null
        ? 'prior-season'
        : 'unavailable';
  return {
    value: selected.value,
    source,
    gameIds: selected.evidence.map((row) => row.gameId),
    latestKickoffKey: selected.evidence.at(-1)?.kickoffKey ?? null,
  };
}

function buildTeamFeatures(
  target: ForecastGame,
  history: Map<string, HistoricalEvidence[]>
): RawForecastExample['teamFeatures'] {
  const homeHistory = history.get(target.homeTeamId) ?? [];
  const awayHistory = history.get(target.awayTeamId) ?? [];
  const histories = [homeHistory, awayHistory].map((rows) => ({
    current: rows.filter(
      (row) => row.season === target.season && row.kickoffKey < target.kickoffKey
    ),
    prior: rows.filter((row) => row.season === target.season - 1 && row.seasonType === 'REG'),
  }));

  return Object.fromEntries(
    TEAM_FEATURE_NAMES.map((name) => [
      name,
      {
        home: materializeFeature(histories[0].current, histories[0].prior, name),
        away: materializeFeature(histories[1].current, histories[1].prior, name),
      },
    ])
  ) as RawForecastExample['teamFeatures'];
}

function assertLeakageSafe(
  target: ForecastGame,
  teamFeatures: RawForecastExample['teamFeatures'],
  gamesById: Map<string, ForecastGame>
): void {
  for (const name of TEAM_FEATURE_NAMES) {
    for (const value of [teamFeatures[name].home, teamFeatures[name].away]) {
      for (const gameId of value.gameIds) {
        const source = gamesById.get(gameId);
        if (!source) throw new Error(`Unknown provenance game ${gameId}`);
        if (
          gameId === target.gameId ||
          source.kickoffKey >= target.kickoffKey ||
          source.season > target.season ||
          (source.season === target.season && source.week > target.week)
        ) {
          throw new Error(`Leaking provenance ${gameId} for target ${target.gameId}`);
        }
      }
    }
  }
}

function exclusionReason(
  game: ForecastGame
):
  | keyof Omit<
      DatasetDiagnostics,
      'sourceGames' | 'emittedExamples' | 'historyGamesMissingWeeklyPair'
    >
  | null {
  if (game.season < 2012 || game.season > 2025) return 'excludedBeforeTargetWindow';
  if (!completed(game)) return 'excludedUnplayed';
  if (game.homeScore === game.awayScore) return 'excludedTies';
  if (game.marketHomeProbability === null) return 'excludedNoMarket';
  if (game.homeRest === null || game.awayRest === null) return 'excludedMissingContext';
  return null;
}

export function buildRawForecastDataset(
  games: ForecastGame[],
  weeklyRows: WeeklyTeamStat[]
): RawDatasetResult {
  const sortedGames = [...games].sort(
    (a, b) => a.kickoffKey.localeCompare(b.kickoffKey) || a.gameId.localeCompare(b.gameId)
  );
  const gamesById = new Map(sortedGames.map((game) => [game.gameId, game]));
  const weeklyByGame = new Map<string, WeeklyTeamStat[]>();
  for (const row of weeklyRows) {
    const rows = weeklyByGame.get(row.gameId) ?? [];
    rows.push(row);
    weeklyByGame.set(row.gameId, rows);
  }

  const diagnostics: DatasetDiagnostics = {
    sourceGames: games.length,
    emittedExamples: 0,
    excludedBeforeTargetWindow: 0,
    excludedUnplayed: 0,
    excludedTies: 0,
    excludedNoMarket: 0,
    excludedMissingContext: 0,
    historyGamesMissingWeeklyPair: 0,
  };
  const history = new Map<string, HistoricalEvidence[]>();
  const examples: RawForecastExample[] = [];

  for (const game of sortedGames) {
    const reason = exclusionReason(game);
    if (reason) {
      diagnostics[reason]++;
    } else if (completed(game)) {
      const teamFeatures = buildTeamFeatures(game, history);
      assertLeakageSafe(game, teamFeatures, gamesById);
      const latestSourceKickoffKey =
        TEAM_FEATURE_NAMES.flatMap((name) => [
          teamFeatures[name].home.latestKickoffKey,
          teamFeatures[name].away.latestKickoffKey,
        ])
          .filter((key): key is string => key !== null)
          .sort()
          .at(-1) ?? null;
      examples.push({
        gameId: game.gameId,
        season: game.season,
        week: game.week,
        kickoffKey: game.kickoffKey,
        label: game.homeScore > game.awayScore ? 1 : 0,
        marketHomeProbability: game.marketHomeProbability as number,
        neutralSite: game.neutralSite,
        restDifferential: (game.homeRest as number) - (game.awayRest as number),
        postseason: game.seasonType === 'POST',
        teamFeatures,
        latestSourceKickoffKey,
      });
      diagnostics.emittedExamples++;
    }

    // Target inclusion is independent of whether its weekly pair is usable as future evidence.
    if (!completed(game)) continue;
    const pair = weeklyByGame.get(game.gameId) ?? [];
    if (!validWeeklyPair(game, pair)) {
      diagnostics.historyGamesMissingWeeklyPair++;
      continue;
    }
    const home = pair.find((row) => row.teamId === game.homeTeamId) as WeeklyTeamStat;
    const away = pair.find((row) => row.teamId === game.awayTeamId) as WeeklyTeamStat;
    const evidence = [
      buildTeamEvidence(game, home, away, game.homeScore, game.awayScore),
      buildTeamEvidence(game, away, home, game.awayScore, game.homeScore),
    ];
    for (const row of evidence) {
      const teamHistory = history.get(row.teamId) ?? [];
      teamHistory.push(row);
      history.set(row.teamId, teamHistory);
    }
  }

  return { examples, diagnostics };
}
