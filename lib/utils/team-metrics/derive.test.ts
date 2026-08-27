import { describe, it, expect } from 'vitest';
import { deriveTeamMetrics, present, ratio, sum, type RawTeamMetricColumns } from './derive';
import {
  buildMatchupMetrics,
  type TeamMatchupMetricsRow,
} from '@/lib/utils/compare/matchup-metrics';

const raw = (overrides: Partial<RawTeamMetricColumns> = {}): RawTeamMetricColumns => ({
  games: null,
  attempts: null,
  carries: null,
  sacks_suffered: null,
  passing_epa: null,
  rushing_epa: null,
  passing_interceptions: null,
  fumbles_lost_total: null,
  def_qb_hits: null,
  def_interceptions: null,
  def_fumbles: null,
  fg_made: null,
  fg_att: null,
  pt_att: null,
  pt_net_yards: null,
  punt_returns: null,
  punt_return_yards: null,
  kickoff_returns: null,
  kickoff_return_yards: null,
  ...overrides,
});

describe('present / sum / ratio', () => {
  it('maps a null column to undefined, and keeps a real zero', () => {
    expect(present(null)).toBeUndefined();
    expect(present(0)).toBe(0);
  });

  it('refuses a sum when any input is missing, so a partial total never reads as real', () => {
    expect(sum([3, 4])).toBe(7);
    expect(sum([3, null])).toBeUndefined();
    expect(sum([0, 0])).toBe(0);
  });

  it('refuses a zero or negative denominator instead of returning Infinity or NaN', () => {
    expect(ratio(10, 4)).toBe(2.5);
    expect(ratio(10, 0)).toBeUndefined();
    expect(ratio(10, -1)).toBeUndefined();
    expect(ratio(undefined, 4)).toBeUndefined();
    expect(ratio(10, undefined)).toBeUndefined();
    expect(ratio(0, 4)).toBe(0);
  });
});

describe('deriveTeamMetrics', () => {
  it('computes offensive EPA per play over attempts + carries + sacks', () => {
    const d = deriveTeamMetrics(
      raw({ passing_epa: 30, rushing_epa: 10, attempts: 600, carries: 380, sacks_suffered: 20 })
    );
    expect(d.offensiveEpa).toBe(40);
    expect(d.offensivePlays).toBe(1000);
    expect(d.offensiveEpaPerPlay).toBe(0.04);
  });

  it('computes sack rate over dropbacks, not attempts', () => {
    // A sack ends a dropback without recording an attempt, so the denominator is 620.
    const d = deriveTeamMetrics(raw({ sacks_suffered: 20, attempts: 600 }));
    expect(d.sackRate).toBeCloseTo(20 / 620, 10);
  });

  it('computes turnover margin as takeaways minus giveaways', () => {
    const d = deriveTeamMetrics(
      raw({
        def_interceptions: 12,
        def_fumbles: 8,
        passing_interceptions: 9,
        fumbles_lost_total: 5,
      })
    );
    expect(d.defensiveTakeaways).toBe(20);
    expect(d.giveaways).toBe(14);
    expect(d.turnoverMargin).toBe(6);
  });

  it('leaves turnover margin undefined when only one half is known', () => {
    const takeawaysOnly = deriveTeamMetrics(raw({ def_interceptions: 12, def_fumbles: 8 }));
    expect(takeawaysOnly.defensiveTakeaways).toBe(20);
    expect(takeawaysOnly.turnoverMargin).toBeUndefined();

    const giveawaysOnly = deriveTeamMetrics(
      raw({ passing_interceptions: 9, fumbles_lost_total: 5 })
    );
    expect(giveawaysOnly.giveaways).toBe(14);
    expect(giveawaysOnly.turnoverMargin).toBeUndefined();
  });

  it('allows a real negative turnover margin (it is signed, not a magnitude)', () => {
    const d = deriveTeamMetrics(
      raw({
        def_interceptions: 4,
        def_fumbles: 2,
        passing_interceptions: 15,
        fumbles_lost_total: 6,
      })
    );
    expect(d.turnoverMargin).toBe(-15);
  });

  it('returns every metric as undefined for a wholly empty row, never zero', () => {
    const d = deriveTeamMetrics(raw());
    for (const [key, value] of Object.entries(d)) {
      expect(value, `${key} should be undefined for an empty row`).toBeUndefined();
    }
  });

  it('leaves per-game rates undefined at zero games rather than dividing by zero', () => {
    const d = deriveTeamMetrics(
      raw({ games: 0, def_qb_hits: 0, def_interceptions: 0, def_fumbles: 0 })
    );
    expect(d.quarterbackHitsPerGame).toBeUndefined();
    expect(d.defensiveTakeawaysPerGame).toBeUndefined();
  });
});

// The reason this module exists. `buildMatchupMetrics` renders the value a page shows;
// `buildLeagueRanks` ranks 32 teams on the same quantity. If the two ever computed it
// separately they could disagree while each stayed internally consistent — a page would
// print one number and rank it as though it were another, and no type check or render
// test would notice. This asserts they are literally the same computation.
describe('anti-drift: the rendered value and the ranked value are one derivation', () => {
  const columns = {
    games: 17,
    attempts: 600,
    carries: 380,
    sacks_suffered: 20,
    passing_epa: 30,
    rushing_epa: 10,
    passing_interceptions: 9,
    fumbles_lost_total: 5,
    def_qb_hits: 102,
    def_interceptions: 12,
    def_fumbles: 8,
    fg_made: 28,
    fg_att: 32,
    pt_att: 50,
    pt_net_yards: 2090,
    punt_returns: 30,
    punt_return_yards: 282,
    kickoff_returns: 24,
    kickoff_return_yards: 578,
  };

  const contract = buildMatchupMetrics({
    season: 2024,
    updated_at: '2026-08-27T00:00:00Z',
    def_sacks: 44,
    def_fumbles_forced: 11,
    special_teams_tds: 1,
    ...columns,
  } satisfies TeamMatchupMetricsRow);
  const derived = deriveTeamMetrics(raw(columns));

  const shared = [
    'offensiveEpa',
    'offensivePlays',
    'offensiveEpaPerPlay',
    'giveaways',
    'defensiveTakeaways',
    'defensiveTakeawaysPerGame',
    'quarterbackHitsPerGame',
    'fieldGoalPercentage',
    'netPuntYardsPerAttempt',
    'puntReturnYardsPerAttempt',
    'kickoffReturnYardsPerAttempt',
  ] as const;

  for (const key of shared) {
    it(`${key} matches between buildMatchupMetrics and deriveTeamMetrics`, () => {
      expect(contract?.[key]).toBe(derived[key]);
    });
  }

  it('every shared value is actually present in this fixture (a null fixture would pass vacuously)', () => {
    for (const key of shared) {
      expect(derived[key], `${key} must be defined for this test to mean anything`).toBeDefined();
    }
  });
});
