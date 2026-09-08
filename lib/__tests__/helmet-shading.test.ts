import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  HELMET_ART,
  HELMET_ART_CLIP,
  HELMET_ART_CUT,
  HELMET_ART_TRANSFORM,
} from '@/lib/uniforms/helmet-art';
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

  // Acceptance criterion 8 of the spec asks that helmet-art.ts be byte-identical to a fresh
  // generator run. That check cannot be automated: scripts/uniform-draw/helmet_base.py takes
  // Cooper's reference SVG as argv[1] and the reference is deliberately not committed (it
  // carries the Seahawks mark). These assertions are the achievable half of the same intent —
  // they pin the constants a hand-edit would most plausibly disturb, so the file cannot drift
  // from its generator silently even though re-running it here is impossible.
  it('keeps the generated-file header that forbids hand-editing', () => {
    const source = readFileSync(join(process.cwd(), 'lib/uniforms/helmet-art.ts'), 'utf8');

    expect(source).toContain('GENERATED FILE — DO NOT EDIT.');
    expect(source).toContain('scripts/uniform-draw/helmet_base.py');
  });

  it('pins the measured art-to-helmet-space registration transform', () => {
    // Re-derived in the spec from two bbox correspondences; x and y scale agree to 0.013%.
    // A drift here silently re-registers all 63 team decal layers at once.
    expect(HELMET_ART_TRANSFORM).toBe('translate(30.83,-7.11) scale(0.50079)');
  });

  it('carries one silhouette and five cage openings', () => {
    // Five, not four: the fifth is the opening at the top of the cage, which
    // in_facemask()'s DIMPLE_BOX carve-out used to suppress. One cutter per white
    // carve in the reference — a sixth would mean someone hand-authored a gap.
    expect(HELMET_ART_CUT).toHaveLength(5);
    for (const cutter of HELMET_ART_CUT) expect(cutter).toMatch(/^m[-\d]/i);
    expect(HELMET_ART_CLIP).toMatch(/^m[-\d]/i);
  });

  it('cuts the top cage opening and leaves every bar body solid', async () => {
    const source = readFileSync(join(process.cwd(), 'lib/uniforms/helmet-base.svg'));
    const { data, info } = await sharp(source)
      .resize(1720, 1440)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];

    // Art-space points inside source path 31, the opening the dimple carve-out hid.
    for (const [x, y] of [
      [1350, 610],
      [1360, 620],
      [1370, 635],
      [1345, 600],
    ]) {
      expect(alpha(x, y), `top opening at ${x},${y}`).toBe(0);
    }

    // The bars a hand-authored gap contour once cut through. The reference carves no
    // white here, so it is bar body — dark under a specular highlight, not negative
    // space, however much a dark-ground render suggests otherwise (Cooper, 2026-09-08).
    for (const [x, y] of [
      [1220, 990],
      [1300, 1000],
      [1250, 1018],
      [1350, 1017],
      [1090, 1065],
      [1145, 1060],
      [1300, 970],
      [1300, 1050],
      [1190, 1018],
      [1118, 1060],
    ]) {
      expect(alpha(x, y), `bar at ${x},${y}`).toBe(255);
    }
  });

  it('does not paint the old shell-coloured outline around the cage', async () => {
    const source = readFileSync(join(process.cwd(), 'lib/uniforms/helmet-base.svg'));
    const { data, info } = await sharp(source)
      .resize(1720, 1440)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // The old shell path wrapped around the brow bar, front cage, and bottom rail.
    for (const [x, y] of [
      [1470, 690],
      [1536, 985],
      [1384, 1355],
    ]) {
      expect(data[(y * info.width + x) * 4 + 3], `outside cage at ${x},${y}`).toBe(0);
    }
  });

  it('shades the shell across at least 20 distinct lightness offsets', () => {
    // The spec calls a shell that flattens a failing outcome, not a cosmetic one. This is the
    // floor at the data layer; uniform-figure.test.tsx asserts the rendered half.
    const shellOffsets = new Set(
      HELMET_ART.filter((path) => path.role === 'shell').map((path) => path.dl)
    );

    expect(shellOffsets.size).toBeGreaterThanOrEqual(20);
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
