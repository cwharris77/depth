import { describe, expect, it } from 'vitest';
import { HELMET_ART } from '@/lib/uniforms/helmet-art';
import { shadeFor } from '@/lib/uniforms/helmet-shading';

describe('shadeFor', () => {
  it('clamps lightness below black', () => {
    expect(shadeFor('#123456', -1)).toBe('#000000');
  });

  it('clamps lightness above white', () => {
    expect(shadeFor('#ABCDEF', 1)).toBe('#FFFFFF');
  });

  it('matches the Python neutralize math for a known base and delta', () => {
    expect(shadeFor('#002244', 0.1)).toBe('#003B77');
  });

  it('returns the same memoized shade for repeated input', () => {
    expect(shadeFor('#575757', 0.241176)).toBe(shadeFor('#575757', 0.241176));
  });

  it('leaves malformed colors unchanged', () => {
    expect(shadeFor('not-a-color', 0.1)).toBe('not-a-color');
  });

  it('leaves a color unchanged for a non-finite delta', () => {
    expect(shadeFor('#123456', Number.NaN)).toBe('#123456');
  });
});

describe('helmet art integrity', () => {
  it('contains the complete role inventory', () => {
    expect(HELMET_ART).toHaveLength(302);
    expect(
      HELMET_ART.reduce<Record<string, number>>((counts, path) => {
        counts[path.role] = (counts[path.role] ?? 0) + 1;
        return counts;
      }, {})
    ).toEqual({ shell: 122, facemask: 156, hardware: 24 });
  });

  for (const [index, path] of HELMET_ART.entries()) {
    it(`path ${index} (${path.role}) carries exactly its role data`, () => {
      if (path.role === 'hardware') {
        expect(path.fill).toMatch(/^#[0-9A-F]{6}$/);
        expect(path.dl).toBeUndefined();
      } else {
        expect(path.fill).toBeUndefined();
        expect(path.dl).toEqual(expect.any(Number));
      }
    });
  }
});
