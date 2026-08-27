import { describe, it, expect } from 'vitest';
import { buildLeagueRanks, type TeamSeasonStatsRankRow } from '@/lib/roster-source.db';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type TeamStatsRankRow = Pick<
  Tables['team_stats']['Row'],
  'team_id' | 'season' | 'win_percent' | 'points_for' | 'points_against' | 'point_differential'
>;

const espn = (teamId: string, pointsFor: number | null): TeamStatsRankRow => ({
  team_id: teamId,
  season: 2024,
  win_percent: 0.5,
  points_for: pointsFor,
  points_against: 300,
  point_differential: 0,
});

// Every metric column defaults to null, so a test names only the columns its metric
// reads and every other rank in the result is legitimately undefined.
const nflRow = (
  teamId: string,
  overrides: Partial<TeamSeasonStatsRankRow> = {}
): TeamSeasonStatsRankRow => ({
  team_id: teamId,
  season: 2024,
  passing_yards: null,
  rushing_yards: null,
  games: null,
  attempts: null,
  carries: null,
  sacks_suffered: null,
  passing_epa: null,
  rushing_epa: null,
  passing_interceptions: null,
  fumbles_lost_total: null,
  def_sacks: null,
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

const nfl = (
  teamId: string,
  passingYards: number | null,
  rushingYards: number | null
): TeamSeasonStatsRankRow =>
  nflRow(teamId, { passing_yards: passingYards, rushing_yards: rushingYards });

describe('buildLeagueRanks (nflverse passing/rushing)', () => {
  it('ranks passing yards most-first across teams with data', () => {
    const ranks = buildLeagueRanks(
      'kc',
      [espn('kc', 300), espn('buf', 320), espn('sf', 280)],
      [nfl('kc', 4100, 1800), nfl('buf', 4300, 1900), nfl('sf', 3900, 2400)]
    );
    expect(ranks[2024]?.passingYards).toBe(2);
    expect(ranks[2024]?.rushingYards).toBe(3);
  });

  it('excludes a team with null nflverse values from that rank (no fabricated position)', () => {
    const ranks = buildLeagueRanks(
      'kc',
      [espn('kc', 300), espn('buf', 320)],
      [nfl('kc', null, null), nfl('buf', 4300, 1900)]
    );
    expect(ranks[2024]?.passingYards).toBeUndefined();
    expect(ranks[2024]?.rushingYards).toBeUndefined();
  });

  it('keeps ESPN standings ranks when no nflverse rows exist', () => {
    const ranks = buildLeagueRanks('kc', [espn('kc', 300), espn('buf', 320)], undefined);
    expect(ranks[2024]?.pointsFor).toBe(2);
    expect(ranks[2024]?.passingYards).toBeUndefined();
    expect(ranks[2024]?.rushingYards).toBeUndefined();
  });

  it('returns no nflverse rank when the team has no nflverse row', () => {
    const ranks = buildLeagueRanks(
      'kc',
      [espn('kc', 300), espn('buf', 320)],
      [nfl('buf', 4300, 1900)]
    );
    expect(ranks[2024]?.passingYards).toBeUndefined();
    expect(ranks[2024]?.rushingYards).toBeUndefined();
  });
});

// The Stats page's Offense/Defense/Special Teams sections. On a single-team page the
// league rank is what replaces Compare's second column, so every one of these must rank
// in the right direction and must stay absent rather than guess.
describe('buildLeagueRanks (Stats page team metrics)', () => {
  const espnRows = [espn('kc', 300), espn('buf', 320), espn('sf', 280)];
  const ranksFor = (rows: TeamSeasonStatsRankRow[]) => buildLeagueRanks('kc', espnRows, rows)[2024];

  // [metric, the columns that produce it, kc's expected rank among the three teams]
  const cases: {
    metric: keyof NonNullable<ReturnType<typeof ranksFor>>;
    rows: TeamSeasonStatsRankRow[];
    expected: number;
    why: string;
  }[] = [
    {
      metric: 'offensiveEpaPerPlay',
      why: 'higher EPA per play ranks first',
      // kc 40/1000 = 0.040, buf 60/1000 = 0.060, sf 20/1000 = 0.020
      rows: [
        nflRow('kc', {
          passing_epa: 30,
          rushing_epa: 10,
          attempts: 600,
          carries: 380,
          sacks_suffered: 20,
        }),
        nflRow('buf', {
          passing_epa: 45,
          rushing_epa: 15,
          attempts: 600,
          carries: 380,
          sacks_suffered: 20,
        }),
        nflRow('sf', {
          passing_epa: 15,
          rushing_epa: 5,
          attempts: 600,
          carries: 380,
          sacks_suffered: 20,
        }),
      ],
      expected: 2,
    },
    {
      metric: 'sackRate',
      why: 'a LOWER sack rate ranks first',
      // kc 30/630, buf 20/620, sf 50/650
      rows: [
        nflRow('kc', { sacks_suffered: 30, attempts: 600 }),
        nflRow('buf', { sacks_suffered: 20, attempts: 600 }),
        nflRow('sf', { sacks_suffered: 50, attempts: 600 }),
      ],
      expected: 2,
    },
    {
      metric: 'passingEpa',
      why: 'higher passing EPA ranks first',
      rows: [
        nflRow('kc', { passing_epa: 30 }),
        nflRow('buf', { passing_epa: 45 }),
        nflRow('sf', { passing_epa: 15 }),
      ],
      expected: 2,
    },
    {
      metric: 'rushingEpa',
      why: 'higher rushing EPA ranks first',
      rows: [
        nflRow('kc', { rushing_epa: 10 }),
        nflRow('buf', { rushing_epa: 5 }),
        nflRow('sf', { rushing_epa: 1 }),
      ],
      expected: 1,
    },
    {
      metric: 'passingInterceptions',
      why: 'FEWER interceptions thrown ranks first',
      rows: [
        nflRow('kc', { passing_interceptions: 9 }),
        nflRow('buf', { passing_interceptions: 6 }),
        nflRow('sf', { passing_interceptions: 15 }),
      ],
      expected: 2,
    },
    {
      metric: 'fumblesLost',
      why: 'FEWER fumbles lost ranks first',
      rows: [
        nflRow('kc', { fumbles_lost_total: 5 }),
        nflRow('buf', { fumbles_lost_total: 9 }),
        nflRow('sf', { fumbles_lost_total: 12 }),
      ],
      expected: 1,
    },
    {
      metric: 'turnoverMargin',
      why: 'takeaways minus giveaways, higher first',
      // kc (12+8)-(9+5)=+6, buf (10+4)-(6+9)=-1, sf (20+6)-(15+12)=-1
      rows: [
        nflRow('kc', {
          def_interceptions: 12,
          def_fumbles: 8,
          passing_interceptions: 9,
          fumbles_lost_total: 5,
        }),
        nflRow('buf', {
          def_interceptions: 10,
          def_fumbles: 4,
          passing_interceptions: 6,
          fumbles_lost_total: 9,
        }),
        nflRow('sf', {
          def_interceptions: 20,
          def_fumbles: 6,
          passing_interceptions: 15,
          fumbles_lost_total: 12,
        }),
      ],
      expected: 1,
    },
    {
      metric: 'defensiveSacks',
      why: 'more sacks ranks first',
      rows: [
        nflRow('kc', { def_sacks: 44 }),
        nflRow('buf', { def_sacks: 50 }),
        nflRow('sf', { def_sacks: 30 }),
      ],
      expected: 2,
    },
    {
      metric: 'quarterbackHitsPerGame',
      why: 'more QB hits per game ranks first',
      // kc 102/17=6.0, buf 68/17=4.0, sf 136/17=8.0
      rows: [
        nflRow('kc', { def_qb_hits: 102, games: 17 }),
        nflRow('buf', { def_qb_hits: 68, games: 17 }),
        nflRow('sf', { def_qb_hits: 136, games: 17 }),
      ],
      expected: 2,
    },
    {
      metric: 'defensiveTakeaways',
      why: 'interceptions plus fumble recoveries, higher first',
      rows: [
        nflRow('kc', { def_interceptions: 12, def_fumbles: 8 }),
        nflRow('buf', { def_interceptions: 10, def_fumbles: 4 }),
        nflRow('sf', { def_interceptions: 5, def_fumbles: 3 }),
      ],
      expected: 1,
    },
    {
      metric: 'defensiveInterceptions',
      why: 'more interceptions ranks first',
      rows: [
        nflRow('kc', { def_interceptions: 12 }),
        nflRow('buf', { def_interceptions: 18 }),
        nflRow('sf', { def_interceptions: 5 }),
      ],
      expected: 2,
    },
    {
      metric: 'fieldGoalPercentage',
      why: 'a higher make rate ranks first',
      // kc 28/32, buf 30/32, sf 20/32
      rows: [
        nflRow('kc', { fg_made: 28, fg_att: 32 }),
        nflRow('buf', { fg_made: 30, fg_att: 32 }),
        nflRow('sf', { fg_made: 20, fg_att: 32 }),
      ],
      expected: 2,
    },
    {
      metric: 'netPuntYardsPerAttempt',
      why: 'more net punt yards per attempt ranks first',
      rows: [
        nflRow('kc', { pt_net_yards: 2090, pt_att: 50 }),
        nflRow('buf', { pt_net_yards: 1900, pt_att: 50 }),
        nflRow('sf', { pt_net_yards: 2200, pt_att: 50 }),
      ],
      expected: 2,
    },
    {
      metric: 'puntReturnYardsPerAttempt',
      why: 'a higher punt return average ranks first',
      rows: [
        nflRow('kc', { punt_return_yards: 282, punt_returns: 30 }),
        nflRow('buf', { punt_return_yards: 200, punt_returns: 30 }),
        nflRow('sf', { punt_return_yards: 150, punt_returns: 30 }),
      ],
      expected: 1,
    },
    {
      metric: 'kickoffReturnYardsPerAttempt',
      why: 'a higher kick return average ranks first',
      rows: [
        nflRow('kc', { kickoff_return_yards: 578, kickoff_returns: 24 }),
        nflRow('buf', { kickoff_return_yards: 700, kickoff_returns: 24 }),
        nflRow('sf', { kickoff_return_yards: 400, kickoff_returns: 24 }),
      ],
      expected: 2,
    },
  ];

  for (const { metric, rows, expected, why } of cases) {
    it(`ranks ${metric} — ${why}`, () => {
      expect(ranksFor(rows)[metric]).toBe(expected);
    });
  }

  it('gives tied teams the same rank', () => {
    const ranks = ranksFor([
      nflRow('kc', { def_sacks: 44 }),
      nflRow('buf', { def_sacks: 44 }),
      nflRow('sf', { def_sacks: 30 }),
    ]);
    expect(ranks.defensiveSacks).toBe(1);
  });

  it('omits a rank when the team is missing a column the metric needs', () => {
    // kc has attempts but no sacks_suffered, so its sack rate is unknown — not 0%,
    // which would rank it first in the league.
    const ranks = ranksFor([
      nflRow('kc', { attempts: 600 }),
      nflRow('buf', { sacks_suffered: 20, attempts: 600 }),
      nflRow('sf', { sacks_suffered: 50, attempts: 600 }),
    ]);
    expect(ranks.sackRate).toBeUndefined();
  });

  it('omits a rank on a zero denominator rather than ranking Infinity or NaN', () => {
    const ranks = ranksFor([
      nflRow('kc', { fg_made: 0, fg_att: 0, punt_return_yards: 0, punt_returns: 0 }),
      nflRow('buf', { fg_made: 30, fg_att: 32, punt_return_yards: 200, punt_returns: 30 }),
      nflRow('sf', { fg_made: 20, fg_att: 32, punt_return_yards: 150, punt_returns: 30 }),
    ]);
    expect(ranks.fieldGoalPercentage).toBeUndefined();
    expect(ranks.puntReturnYardsPerAttempt).toBeUndefined();
  });

  it('omits turnover margin when only one half of it is known', () => {
    // Takeaways known, giveaways not: the margin is unknown, not equal to the takeaways.
    const ranks = ranksFor([
      nflRow('kc', { def_interceptions: 12, def_fumbles: 8 }),
      nflRow('buf', {
        def_interceptions: 10,
        def_fumbles: 4,
        passing_interceptions: 6,
        fumbles_lost_total: 9,
      }),
    ]);
    expect(ranks.turnoverMargin).toBeUndefined();
  });
});
