import { describe, it, expect } from 'vitest';
import { resolveBoard, type SharedBoard } from '../shared-board';

const board: SharedBoard = { teamId: 'seahawks', ownerName: 'cooper', override: { QB: ['a'] } };

describe('resolveBoard', () => {
  it('does nothing without a slug', () => {
    expect(resolveBoard(null, null, 'seahawks')).toBe('none');
  });

  it('strips a slug that did not resolve (unknown/deleted/malformed)', () => {
    expect(resolveBoard('abc', null, 'seahawks')).toBe('strip');
  });

  it('redirects when the board is for a different team', () => {
    expect(resolveBoard('abc', board, 'eagles')).toBe('redirect');
  });

  it('previews when the board is for the current team', () => {
    expect(resolveBoard('abc', board, 'seahawks')).toBe('preview');
  });

  it('previews an empty override (owner cleared edits) on the right team', () => {
    expect(resolveBoard('abc', { ...board, override: {} }, 'seahawks')).toBe('preview');
  });
});
