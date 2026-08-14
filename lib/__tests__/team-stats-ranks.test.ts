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

const nfl = (
  teamId: string,
  passingYards: number | null,
  rushingYards: number | null
): TeamSeasonStatsRankRow => ({
  team_id: teamId,
  season: 2024,
  passing_yards: passingYards,
  rushing_yards: rushingYards,
});

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
