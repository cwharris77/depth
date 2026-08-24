// Builds the bounded nflverse evidence contract consumed by Compare (DEP-312). The
// helper keeps raw numerators and denominators beside derived rates, and refuses to
// turn missing source values into zero, so partial seasons degrade honestly.
import type { TeamMatchupMetrics } from '@/lib/types';

export interface TeamMatchupMetricsRow {
  season: number;
  updated_at: string;
  games: number | null;
  attempts: number | null;
  carries: number | null;
  sacks_suffered: number | null;
  passing_epa: number | null;
  rushing_epa: number | null;
  passing_interceptions: number | null;
  fumbles_lost_total: number | null;
  def_sacks: number | null;
  def_qb_hits: number | null;
  def_interceptions: number | null;
  def_fumbles: number | null;
  def_fumbles_forced: number | null;
  fg_made: number | null;
  fg_att: number | null;
  pt_att: number | null;
  pt_net_yards: number | null;
  punt_returns: number | null;
  punt_return_yards: number | null;
  kickoff_returns: number | null;
  kickoff_return_yards: number | null;
  special_teams_tds: number | null;
}

function present(value: number | null): number | undefined {
  return value ?? undefined;
}

function sum(values: Array<number | null>): number | undefined {
  return values.every((value): value is number => value !== null)
    ? values.reduce((total, value) => total + value, 0)
    : undefined;
}

function ratio(numerator: number | undefined, denominator: number | undefined) {
  return numerator === undefined || denominator === undefined || denominator <= 0
    ? undefined
    : numerator / denominator;
}

export function buildMatchupMetrics(
  row: TeamMatchupMetricsRow | undefined
): TeamMatchupMetrics | undefined {
  if (!row) return undefined;

  const offensiveEpa = sum([row.passing_epa, row.rushing_epa]);
  const offensivePlays = sum([row.attempts, row.carries, row.sacks_suffered]);
  const giveaways = sum([row.passing_interceptions, row.fumbles_lost_total]);
  const defensiveTakeaways = sum([row.def_interceptions, row.def_fumbles]);
  const games = present(row.games);
  const quarterbackHits = present(row.def_qb_hits);
  const fieldGoalsMade = present(row.fg_made);
  const fieldGoalsAttempted = present(row.fg_att);
  const puntAttempts = present(row.pt_att);
  const netPuntYards = present(row.pt_net_yards);
  const puntReturns = present(row.punt_returns);
  const puntReturnYards = present(row.punt_return_yards);
  const kickoffReturns = present(row.kickoff_returns);
  const kickoffReturnYards = present(row.kickoff_return_yards);

  return {
    source: 'nflverse',
    season: row.season,
    updatedAt: row.updated_at,
    games,
    passingEpa: present(row.passing_epa),
    rushingEpa: present(row.rushing_epa),
    passAttempts: present(row.attempts),
    rushAttempts: present(row.carries),
    sacksSuffered: present(row.sacks_suffered),
    offensiveEpa,
    offensivePlays,
    offensiveEpaPerPlay: ratio(offensiveEpa, offensivePlays),
    passingInterceptions: present(row.passing_interceptions),
    fumblesLost: present(row.fumbles_lost_total),
    giveaways,
    defensiveSacks: present(row.def_sacks),
    quarterbackHits,
    quarterbackHitsPerGame: ratio(quarterbackHits, games),
    defensiveInterceptions: present(row.def_interceptions),
    defensiveFumbleRecoveries: present(row.def_fumbles),
    defensiveFumblesForced: present(row.def_fumbles_forced),
    defensiveTakeaways,
    defensiveTakeawaysPerGame: ratio(defensiveTakeaways, games),
    fieldGoalsMade,
    fieldGoalsAttempted,
    fieldGoalPercentage: ratio(fieldGoalsMade, fieldGoalsAttempted),
    puntAttempts,
    netPuntYards,
    netPuntYardsPerAttempt: ratio(netPuntYards, puntAttempts),
    puntReturns,
    puntReturnYards,
    puntReturnYardsPerAttempt: ratio(puntReturnYards, puntReturns),
    kickoffReturns,
    kickoffReturnYards,
    kickoffReturnYardsPerAttempt: ratio(kickoffReturnYards, kickoffReturns),
    specialTeamsTouchdowns: present(row.special_teams_tds),
  };
}

// Produces the lens headline without deciding which metrics matter. Callers supply the
// fan-facing team labels and direction; missing either side stays unavailable rather
// than turning a partial comparison into a claim.
export function matchupLeaderLabel(
  teamALabel: string,
  valueA: number | undefined,
  teamBLabel: string,
  valueB: number | undefined,
  metricLabel: string,
  direction: 'higher' | 'lower' = 'higher'
): string | undefined {
  if (valueA === undefined || valueB === undefined) return undefined;
  if (valueA === valueB) return `Even in ${metricLabel}`;

  const aLeads = direction === 'higher' ? valueA > valueB : valueA < valueB;
  return `${aLeads ? teamALabel : teamBLabel} leads in ${metricLabel}`;
}

export interface MatchupMetricComparison {
  teamAValue: number | undefined;
  teamBValue: number | undefined;
  leaderLabel: string | undefined;
}

export function compareMatchupMetric(
  teamALabel: string,
  valueA: number | undefined,
  teamBLabel: string,
  valueB: number | undefined,
  metricLabel: string,
  direction: 'higher' | 'lower' = 'higher'
): MatchupMetricComparison {
  return {
    teamAValue: valueA,
    teamBValue: valueB,
    leaderLabel: matchupLeaderLabel(teamALabel, valueA, teamBLabel, valueB, metricLabel, direction),
  };
}
