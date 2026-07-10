import { describe, it, expect } from 'vitest';
import { resolveStartupTeam } from '../home-team';

const VALID = ['seahawks', 'eagles', '49ers'];

describe('resolveStartupTeam', () => {
  it('prefers a valid favorite over last-viewed when start-on-favorite is on', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: 'eagles', lastTeamId: '49ers', startOnFavorite: true },
        VALID,
        'seahawks'
      )
    ).toBe('eagles');
  });

  it('ignores the favorite and uses last-viewed when start-on-favorite is off', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: 'eagles', lastTeamId: '49ers', startOnFavorite: false },
        VALID,
        'seahawks'
      )
    ).toBe('49ers');
  });

  it('falls back to last-viewed when no favorite is set', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: null, lastTeamId: '49ers', startOnFavorite: true },
        VALID,
        'seahawks'
      )
    ).toBe('49ers');
  });

  it('falls back to the default when neither is set', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: null, lastTeamId: null, startOnFavorite: true },
        VALID,
        'seahawks'
      )
    ).toBe('seahawks');
  });

  it('returns the default when there are no settings at all (signed out)', () => {
    expect(resolveStartupTeam(null, VALID, 'seahawks')).toBe('seahawks');
  });

  it('skips a stale favorite id and uses last-viewed', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: 'oilers', lastTeamId: 'eagles', startOnFavorite: true },
        VALID,
        'seahawks'
      )
    ).toBe('eagles');
  });

  it('skips a stale favorite and a stale last-viewed, landing on the default', () => {
    expect(
      resolveStartupTeam(
        { favoriteTeamId: 'oilers', lastTeamId: 'rams', startOnFavorite: true },
        VALID,
        'seahawks'
      )
    ).toBe('seahawks');
  });
});
