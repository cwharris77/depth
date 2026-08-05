import { describe, expect, it } from 'vitest';
import { gameResultColor } from '../colors';

describe('gameResultColor', () => {
  it('returns a distinct color for each result', () => {
    const w = gameResultColor('W');
    const l = gameResultColor('L');
    const t = gameResultColor('T');
    expect(new Set([w, l, t]).size).toBe(3);
  });
});
