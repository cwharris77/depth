import { describe, expect, it } from 'vitest';

import { buildMatchupMetrics, compareMatchupMetric, matchupLeaderLabel } from './matchup-metrics';

describe('buildMatchupMetrics', () => {
  it('derives auditable rates from complete nflverse inputs', () => {
    const metrics = buildMatchupMetrics({
      season: 2025,
      updated_at: '2026-08-23T12:00:00.000Z',
      games: 17,
      attempts: 500,
      carries: 425,
      sacks_suffered: 25,
      passing_epa: 72,
      rushing_epa: 23,
      passing_interceptions: 10,
      fumbles_lost_total: 7,
      def_sacks: 42,
      def_qb_hits: 96,
      def_interceptions: 16,
      def_fumbles: 9,
      def_fumbles_forced: 12,
      fg_made: 30,
      fg_att: 36,
      pt_att: 68,
      pt_net_yards: 2_788,
      punt_returns: 34,
      punt_return_yards: 374,
      kickoff_returns: 24,
      kickoff_return_yards: 600,
      special_teams_tds: 2,
    });

    expect(metrics).toMatchObject({
      source: 'nflverse',
      season: 2025,
      updatedAt: '2026-08-23T12:00:00.000Z',
      offensiveEpa: 95,
      offensivePlays: 950,
      offensiveEpaPerPlay: 0.1,
      giveaways: 17,
      defensiveTakeaways: 25,
      defensiveTakeawaysPerGame: 25 / 17,
      quarterbackHitsPerGame: 96 / 17,
      fieldGoalPercentage: 30 / 36,
      netPuntYardsPerAttempt: 41,
      puntReturnYardsPerAttempt: 11,
      kickoffReturnYardsPerAttempt: 25,
    });
  });

  it('keeps derived values unavailable when a required input is missing', () => {
    const metrics = buildMatchupMetrics({
      season: 2025,
      updated_at: '2026-08-23T12:00:00.000Z',
      games: 17,
      attempts: 500,
      carries: null,
      sacks_suffered: 25,
      passing_epa: 72,
      rushing_epa: null,
      passing_interceptions: 10,
      fumbles_lost_total: null,
      def_sacks: null,
      def_qb_hits: 96,
      def_interceptions: 16,
      def_fumbles: null,
      def_fumbles_forced: 12,
      fg_made: 30,
      fg_att: null,
      pt_att: 0,
      pt_net_yards: 0,
      punt_returns: null,
      punt_return_yards: null,
      kickoff_returns: null,
      kickoff_return_yards: null,
      special_teams_tds: null,
    });

    expect(metrics?.offensiveEpa).toBeUndefined();
    expect(metrics?.offensivePlays).toBeUndefined();
    expect(metrics?.offensiveEpaPerPlay).toBeUndefined();
    expect(metrics?.giveaways).toBeUndefined();
    expect(metrics?.defensiveTakeaways).toBeUndefined();
    expect(metrics?.fieldGoalPercentage).toBeUndefined();
    expect(metrics?.netPuntYardsPerAttempt).toBeUndefined();
  });

  it('returns undefined when there is no nflverse row', () => {
    expect(buildMatchupMetrics(undefined)).toBeUndefined();
  });
});

describe('matchupLeaderLabel', () => {
  it('names the team leading a higher-is-better metric', () => {
    expect(matchupLeaderLabel('Seattle', 0.08, 'San Francisco', 0.03, 'offensive EPA/play')).toBe(
      'Seattle leads in offensive EPA/play'
    );
  });

  it('names an even comparison', () => {
    expect(matchupLeaderLabel('Seattle', 41, 'San Francisco', 41, 'net punt average')).toBe(
      'Even in net punt average'
    );
  });

  it('supports lower-is-better metrics without reversing the team labels', () => {
    expect(matchupLeaderLabel('Seattle', 12, 'San Francisco', 17, 'giveaways', 'lower')).toBe(
      'Seattle leads in giveaways'
    );
  });

  it('returns undefined instead of inventing a leader from missing data', () => {
    expect(
      matchupLeaderLabel('Seattle', undefined, 'San Francisco', 0.03, 'offensive EPA/play')
    ).toBeUndefined();
  });
});

describe('compareMatchupMetric', () => {
  it('keeps both displayed values beside the leader label', () => {
    expect(compareMatchupMetric('Seattle', 12, 'San Francisco', 17, 'giveaways', 'lower')).toEqual({
      teamAValue: 12,
      teamBValue: 17,
      leaderLabel: 'Seattle leads in giveaways',
    });
  });

  it('keeps a partial comparison honest', () => {
    expect(
      compareMatchupMetric('Seattle', undefined, 'San Francisco', 0.03, 'offensive EPA/play')
    ).toEqual({
      teamAValue: undefined,
      teamBValue: 0.03,
      leaderLabel: undefined,
    });
  });
});
