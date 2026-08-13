import { describe, expect, it } from 'vitest';
import { gameResultColor, withAlpha, focusRing } from '../colors';

describe('gameResultColor', () => {
  it('returns a distinct color for each result', () => {
    const w = gameResultColor('W');
    const l = gameResultColor('L');
    const t = gameResultColor('T');
    expect(new Set([w, l, t]).size).toBe(3);
  });
});

describe('withAlpha', () => {
  it('converts 6-digit hex to rgba at the given percentage', () => {
    expect(withAlpha('#69BE28', 30)).toBe('rgba(105,190,40,0.3)');
  });
  it('converts 3-digit short hex to rgba at the given percentage', () => {
    expect(withAlpha('#0a0', 50)).toBe('rgba(0,170,0,0.5)');
  });
  it('handles lowercase hex', () => {
    expect(withAlpha('#ff6b6b', 40)).toBe('rgba(255,107,107,0.4)');
  });
  it('handles uppercase hex', () => {
    expect(withAlpha('#FF6B6B', 40)).toBe('rgba(255,107,107,0.4)');
  });
  it('handles 0%', () => {
    expect(withAlpha('#69BE28', 0)).toBe('rgba(105,190,40,0)');
  });
  it('handles 100%', () => {
    expect(withAlpha('#69BE28', 100)).toBe('rgba(105,190,40,1)');
  });
});

describe('focusRing', () => {
  it('produces the standard 3px box-shadow string at 30% opacity', () => {
    expect(focusRing('#69BE28')).toBe('0 0 0 3px rgba(105,190,40,0.3)');
  });
  it('works with any hex color', () => {
    expect(focusRing('#ff0000')).toBe('0 0 0 3px rgba(255,0,0,0.3)');
  });
});
