import { describe, expect, it } from 'vitest';
import type { PlayerSeasonRow } from './player-seasons';
import {
  checkSeasonShrink,
  checkTeamSeasonShrink,
  fieldCounts,
  SHRINK_THRESHOLDS,
} from './shrink-guard';
import type { TeamGameRow } from './team-seasons';

function rows(count: number, withPfr = count): PlayerSeasonRow[] {
  return Array.from({ length: count }, (_, i) => ({
    player_id: `p${i}`,
    season: 2024,
    season_type: 'REG' as const,
    team: 'bills',
    box: { passing_yards: 100 },
    ...(i < withPfr ? { pfr: { carries: 5 } } : {}),
  }));
}

const guard = (previous: PlayerSeasonRow[] | null, next: PlayerSeasonRow[], inProgress = false) =>
  checkSeasonShrink({ season: 2024, previous, next, inProgress });

describe('checkSeasonShrink', () => {
  it('passes a first build with no previous checkpoint', () => {
    expect(guard(null, rows(10))).toEqual([]);
  });

  it('allows a completed season to lose up to the player-row threshold', () => {
    expect(guard(rows(100), rows(98))).toEqual([]);
  });

  it('trips past the player-row threshold', () => {
    const violations = guard(rows(100), rows(97));
    expect(violations.map((v) => v.subject)).toContain('player_rows');
    expect(SHRINK_THRESHOLDS.playerRows).toBe(0.02);
  });

  it('trips when a field loses more than the non-null threshold', () => {
    // 100 rows, same count, but pfr present on only 85 of the previous 100.
    const violations = guard(rows(100), rows(100, 85));
    expect(violations.map((v) => v.subject)).toEqual(['pfr.carries']);
    expect(violations[0]).toMatchObject({ before: 100, after: 85 });
  });

  it('allows a field to lose exactly up to the threshold', () => {
    expect(guard(rows(100), rows(100, 90))).toEqual([]);
  });

  it('trips when a field disappears entirely', () => {
    const [violation] = guard(rows(100), rows(100, 0));
    expect(violation).toMatchObject({ subject: 'pfr.carries', after: 0 });
  });

  it('lets an in-progress season only grow', () => {
    expect(guard(rows(100), rows(100), true)).toEqual([]);
    expect(guard(rows(100), rows(120), true)).toEqual([]);
    expect(guard(rows(100), rows(99), true).map((v) => v.subject)).toContain('player_rows');
    expect(guard(rows(100), rows(100, 99), true).map((v) => v.subject)).toEqual(['pfr.carries']);
  });
});

describe('fieldCounts', () => {
  it('counts rows per section.field', () => {
    expect(Object.fromEntries(fieldCounts(rows(4, 1)))).toEqual({
      'box.passing_yards': 4,
      'pfr.carries': 1,
    });
  });
});

describe('checkTeamSeasonShrink', () => {
  const teamRows = (count: number, withAllowed = count): TeamGameRow[] =>
    Array.from({ length: count }, (_, i) => ({
      team: 'bills',
      season: 2024,
      season_type: 'REG' as const,
      week: i + 1,
      game_id: `g${i}`,
      opponent: 'jets',
      offense: { passing_yards: 200 },
      ...(i < withAllowed ? { allowed: { passing_yards: 150 } } : {}),
    }));
  const guard = (previous: TeamGameRow[] | null, next: TeamGameRow[], inProgress = false) =>
    checkTeamSeasonShrink({ season: 2024, previous, next, inProgress });

  it('passes a first build', () => {
    expect(guard(null, teamRows(10))).toEqual([]);
  });

  it('trips when team-games drop past the threshold', () => {
    expect(guard(teamRows(100), teamRows(97)).map((v) => v.subject)).toEqual(['team_games']);
    expect(guard(teamRows(100), teamRows(98))).toEqual([]);
  });

  it('trips when the allowed line disappears from too many games', () => {
    const [violation] = guard(teamRows(100), teamRows(100, 80));
    expect(violation).toMatchObject({ subject: 'allowed.passing_yards', before: 100, after: 80 });
  });

  it('lets an in-progress season only grow', () => {
    expect(guard(teamRows(10), teamRows(9), true)).not.toEqual([]);
    expect(guard(teamRows(10), teamRows(12), true)).toEqual([]);
  });
});
