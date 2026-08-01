import { describe, it, expect } from 'vitest';
import { buildTeamSelectionUrl, isUnit } from '../team-selection';

describe('isUnit', () => {
  it('accepts the three known units', () => {
    expect(isUnit('offense')).toBe(true);
    expect(isUnit('defense')).toBe(true);
    expect(isUnit('special')).toBe(true);
  });

  it('rejects anything else, including null/undefined/empty string', () => {
    expect(isUnit('special-teams')).toBe(false);
    expect(isUnit('')).toBe(false);
    expect(isUnit(null)).toBe(false);
    expect(isUnit(undefined)).toBe(false);
  });
});

describe('buildTeamSelectionUrl', () => {
  it('is the bare pathname when nothing is selected and unit is the default', () => {
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'offense', playerId: null })).toBe(
      '/team/seahawks'
    );
  });

  it('carries the player param when a player is selected', () => {
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'offense', playerId: 'abc' })).toBe(
      '/team/seahawks?player=abc'
    );
  });

  it('carries the unit param when it is not the default, even with no player', () => {
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'defense', playerId: null })).toBe(
      '/team/seahawks?unit=defense'
    );
  });

  it('carries both params together', () => {
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'special', playerId: 'abc' })).toBe(
      '/team/seahawks?unit=special&player=abc'
    );
  });

  it('url-encodes the player id', () => {
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'offense', playerId: 'x&y=z' })).toBe(
      '/team/seahawks?player=x%26y%3Dz'
    );
  });

  it('carries season alongside unit/player when set', () => {
    expect(
      buildTeamSelectionUrl('/team/seahawks', { unit: 'defense', playerId: 'abc', season: 2013 })
    ).toBe('/team/seahawks?unit=defense&player=abc&season=2013');
  });

  it('omits season when null/undefined, same as no selection at all', () => {
    expect(
      buildTeamSelectionUrl('/team/seahawks', { unit: 'offense', playerId: null, season: null })
    ).toBe('/team/seahawks');
    expect(buildTeamSelectionUrl('/team/seahawks', { unit: 'offense', playerId: null })).toBe(
      '/team/seahawks'
    );
  });
});
