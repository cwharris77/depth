import { describe, it, expect } from 'vitest';
import { scheduleSummary } from '../schedule-summary';
import type { TeamScheduleGame } from '../types';

// Minimal game builder — only the fields scheduleSummary reads vary per test.
function game(overrides: Partial<TeamScheduleGame> = {}): TeamScheduleGame {
  return {
    week: 1,
    gameType: 'REG',
    isBye: false,
    date: '2025-09-07',
    isHome: true,
    opponent: {
      id: 'rams',
      abbrev: 'LAR',
      colors: {
        primary: '#003594',
        secondary: '#ffa300',
        accent: '#ffa300',
        uiAccent: '#ffa300',
        onAccent: '#0a0e1a',
      },
    },
    teamScore: 24,
    oppScore: 17,
    result: 'W',
    ...overrides,
  };
}

describe('scheduleSummary', () => {
  it('degrades on an empty schedule: 0-0 everywhere, no streak, no next game', () => {
    expect(scheduleSummary([])).toEqual({
      record: '0-0',
      homeRecord: '0-0',
      roadRecord: '0-0',
      streak: null,
      recentForm: [],
      nextGame: null,
    });
  });

  it('splits the record by home/road and skips byes and unplayed games', () => {
    const s = scheduleSummary([
      game({ week: 1, isHome: true, result: 'W' }),
      game({ week: 2, isHome: false, result: 'L' }),
      game({ week: 3, isBye: true, opponent: null, result: null, teamScore: null, oppScore: null }),
      game({ week: 4, isHome: false, result: 'W' }),
      game({ week: 5, result: null, teamScore: null, oppScore: null }),
    ]);
    expect(s.record).toBe('2-1');
    expect(s.homeRecord).toBe('1-0');
    expect(s.roadRecord).toBe('1-1');
  });

  it('adds the ties suffix only when a tie exists', () => {
    const s = scheduleSummary([
      game({ week: 1, result: 'W' }),
      game({ week: 2, result: 'T', teamScore: 20, oppScore: 20 }),
    ]);
    expect(s.record).toBe('1-0-1');
  });

  it('reports the current streak from the tail of the played games', () => {
    const s = scheduleSummary([
      game({ week: 1, result: 'L' }),
      game({ week: 2, result: 'W' }),
      game({ week: 3, result: 'W' }),
      game({ week: 4, result: 'W' }),
    ]);
    expect(s.streak).toBe('W3');
  });

  it('caps recent form at the last five results, oldest first', () => {
    const results: ('W' | 'L')[] = ['W', 'W', 'L', 'W', 'L', 'L', 'W'];
    const s = scheduleSummary(results.map((result, i) => game({ week: i + 1, result })));
    expect(s.recentForm).toEqual(['L', 'W', 'L', 'L', 'W']);
  });

  it('picks the first unplayed non-bye game as next, skipping dangling opponents', () => {
    const dangling = game({ week: 3, result: null, teamScore: null, oppScore: null });
    dangling.opponent = null;
    const upNext = game({ week: 4, result: null, teamScore: null, oppScore: null });
    const s = scheduleSummary([
      game({ week: 1, result: 'W' }),
      game({ week: 2, isBye: true, opponent: null, result: null, teamScore: null, oppScore: null }),
      dangling,
      upNext,
    ]);
    expect(s.nextGame?.week).toBe(4);
  });

  it('has no next game once every game is played', () => {
    const s = scheduleSummary([game({ week: 1 }), game({ week: 2, result: 'L' })]);
    expect(s.nextGame).toBeNull();
  });
});
