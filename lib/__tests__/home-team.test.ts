import { describe, it, expect } from 'vitest';
import { resolveStartupTeam } from '../home-team';

const VALID = ['seahawks', 'eagles', '49ers'];

describe('resolveStartupTeam', () => {
  it('prefers a valid favorite over last-viewed', () => {
    expect(
      resolveStartupTeam({ favoriteTeamId: 'eagles', lastTeamId: '49ers' }, VALID, 'seahawks')
    ).toBe('eagles');
  });

  it('falls back to last-viewed when no favorite is set', () => {
    expect(
      resolveStartupTeam({ favoriteTeamId: null, lastTeamId: '49ers' }, VALID, 'seahawks')
    ).toBe('49ers');
  });

  it('falls back to the default when neither is set', () => {
    expect(resolveStartupTeam({ favoriteTeamId: null, lastTeamId: null }, VALID, 'seahawks')).toBe(
      'seahawks'
    );
  });

  it('returns the default when there are no settings at all (signed out)', () => {
    expect(resolveStartupTeam(null, VALID, 'seahawks')).toBe('seahawks');
  });

  it('skips a stale favorite id and uses last-viewed', () => {
    expect(
      resolveStartupTeam({ favoriteTeamId: 'oilers', lastTeamId: 'eagles' }, VALID, 'seahawks')
    ).toBe('eagles');
  });

  it('skips a stale favorite and a stale last-viewed, landing on the default', () => {
    expect(
      resolveStartupTeam({ favoriteTeamId: 'oilers', lastTeamId: 'rams' }, VALID, 'seahawks')
    ).toBe('seahawks');
  });
});
