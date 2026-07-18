import { describe, expect, it } from 'vitest';
import { NFLVERSE_TEAM_CODES, resolveTeamCode } from './team-codes';

describe('resolveTeamCode', () => {
  it('resolves a current nflverse code to our team id', () => {
    expect(resolveTeamCode('SEA')).toBe('seahawks');
    expect(resolveTeamCode('KC')).toBe('chiefs');
    expect(resolveTeamCode('NYG')).toBe('giants');
    expect(resolveTeamCode('NYJ')).toBe('jets');
  });

  it('resolves the Rams to `LA` (nflverse), not our `LAR` abbrev', () => {
    expect(resolveTeamCode('LA')).toBe('rams');
    // nflverse's games.csv uses `LA`; the ESPN abbrev is `LAR`, which must NOT be the join key.
    expect(NFLVERSE_TEAM_CODES.LAR).toBe('rams'); // safety alias, both map to the franchise
  });

  it('maps historic relocation codes to the current franchise', () => {
    expect(resolveTeamCode('OAK')).toBe('raiders'); // Oakland -> Las Vegas
    expect(resolveTeamCode('SD')).toBe('chargers'); // San Diego -> LA
    expect(resolveTeamCode('STL')).toBe('rams'); // St. Louis -> LA
  });

  it('returns null for an unknown code rather than guessing', () => {
    expect(resolveTeamCode('XXX')).toBeNull();
    expect(resolveTeamCode('')).toBeNull();
  });

  it('covers all 32 current teams', () => {
    const currentCodes = [
      'ARI',
      'ATL',
      'BAL',
      'BUF',
      'CAR',
      'CHI',
      'CIN',
      'CLE',
      'DAL',
      'DEN',
      'DET',
      'GB',
      'HOU',
      'IND',
      'JAX',
      'KC',
      'LA',
      'LAC',
      'LV',
      'MIA',
      'MIN',
      'NE',
      'NO',
      'NYG',
      'NYJ',
      'PHI',
      'PIT',
      'SEA',
      'SF',
      'TB',
      'TEN',
      'WAS',
    ];
    const ids = new Set(currentCodes.map((c) => resolveTeamCode(c)));
    expect(ids.has(null)).toBe(false);
    expect(ids.size).toBe(32); // 32 distinct franchises
  });
});
