import { describe, it, expect } from 'vitest';
import { parseCompareParams, COMPARE_POSITIONS } from '../compare';

const TEAM_IDS = ['seahawks', 'niners'];

describe('parseCompareParams', () => {
  it('resolves a valid pair of team ids and position', () => {
    expect(parseCompareParams({ a: 'seahawks', b: 'niners', pos: 'WR' }, TEAM_IDS)).toEqual({
      a: 'seahawks',
      b: 'niners',
      pos: 'WR',
    });
  });

  it('treats an unknown team id as unpicked rather than an error', () => {
    expect(parseCompareParams({ a: 'not-a-team', b: 'niners' }, TEAM_IDS)).toEqual({
      a: undefined,
      b: 'niners',
      pos: 'QB',
    });
  });

  it('defaults an invalid position to QB', () => {
    expect(parseCompareParams({ a: 'seahawks', b: 'niners', pos: 'XX' }, TEAM_IDS).pos).toBe('QB');
  });

  it('rejects a returner/long-snapper position not in the compare chip row', () => {
    expect(parseCompareParams({ pos: 'KR' }, TEAM_IDS).pos).toBe('QB');
  });

  it('defaults everything when params are missing', () => {
    expect(parseCompareParams({}, TEAM_IDS)).toEqual({ a: undefined, b: undefined, pos: 'QB' });
  });
});

describe('COMPARE_POSITIONS', () => {
  it('excludes returner and long-snapper slots', () => {
    expect(COMPARE_POSITIONS).not.toContain('KR');
    expect(COMPARE_POSITIONS).not.toContain('PR');
    expect(COMPARE_POSITIONS).not.toContain('LS');
  });
});
