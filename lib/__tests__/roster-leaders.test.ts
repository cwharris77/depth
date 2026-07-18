import { describe, expect, it } from 'vitest';
import { rosterLeaders, type LeaderEntry } from '../roster-leaders';
import type { PlayerSeasonStats } from '../types';

// A full-null stats row for one season; spread over with the fields a case cares about,
// so each entry only states the stats relevant to the leader it's meant to win/lose.
function stats(season: number, over: Partial<PlayerSeasonStats>): PlayerSeasonStats {
  return {
    season,
    seasonType: 'REG',
    games: 17,
    completions: null,
    attempts: null,
    passingYards: null,
    passingTds: null,
    passingInterceptions: null,
    carries: null,
    rushingYards: null,
    rushingTds: null,
    receptions: null,
    targets: null,
    receivingYards: null,
    receivingTds: null,
    defTacklesSolo: null,
    defSacks: null,
    defInterceptions: null,
    fgMade: null,
    fgAtt: null,
    ...over,
  };
}

function entry(playerId: string, name: string, s: PlayerSeasonStats): LeaderEntry {
  return { playerId, name, stats: s };
}

describe('rosterLeaders', () => {
  it('returns null when there are no stat entries', () => {
    expect(rosterLeaders([])).toBeNull();
  });

  it('picks the top passer, rusher, and receiver by yards and formats each line', () => {
    const result = rosterLeaders([
      entry(
        'qb1',
        'S. Darnold',
        stats(2026, { completions: 312, attempts: 478, passingYards: 3624, passingTds: 26 })
      ),
      entry('qb2', 'S. Howell', stats(2026, { completions: 40, attempts: 70, passingYards: 500 })),
      entry(
        'rb1',
        'K. Walker III',
        stats(2026, { carries: 223, rushingYards: 1041, rushingTds: 9 })
      ),
      entry(
        'wr1',
        'J. Smith-Njigba',
        stats(2026, { receptions: 104, receivingYards: 1382, receivingTds: 8 })
      ),
    ]);

    expect(result).toEqual({
      season: 2026,
      passing: { playerId: 'qb1', name: 'S. Darnold', line: '312/478 · 3,624 yds · 26 TD' },
      rushing: { playerId: 'rb1', name: 'K. Walker III', line: '223 car · 1,041 yds · 9 TD' },
      receiving: { playerId: 'wr1', name: 'J. Smith-Njigba', line: '104 rec · 1,382 yds · 8 TD' },
    });
  });

  it('uses only the latest season when entries span multiple seasons', () => {
    const result = rosterLeaders([
      entry('qb1', 'Old Guy', stats(2024, { completions: 400, attempts: 600, passingYards: 5000 })),
      entry(
        'qb2',
        'New Guy',
        stats(2026, { completions: 300, attempts: 450, passingYards: 3200, passingTds: 22 })
      ),
    ]);

    expect(result?.season).toBe(2026);
    expect(result?.passing).toEqual({
      playerId: 'qb2',
      name: 'New Guy',
      line: '300/450 · 3,200 yds · 22 TD',
    });
  });

  it('leaves a category null when no one has positive yards in it', () => {
    // A defense-only sample: tackles but no passing/rushing/receiving yards.
    const result = rosterLeaders([entry('lb1', 'Linebacker', stats(2026, { defTacklesSolo: 90 }))]);

    expect(result).toEqual({ season: 2026, passing: null, rushing: null, receiving: null });
  });

  it('breaks ties by keeping the first entry with the max yards', () => {
    const result = rosterLeaders([
      entry('rb1', 'First', stats(2026, { carries: 200, rushingYards: 1000, rushingTds: 8 })),
      entry('rb2', 'Second', stats(2026, { carries: 210, rushingYards: 1000, rushingTds: 10 })),
    ]);

    expect(result?.rushing?.playerId).toBe('rb1');
  });
});
