import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resolveUniformModel } from '../model';
import { renderUniformThumbSVG } from '../art';
import { UNIFORMS } from '../data';
import { BEARS_UNIFORMS } from './bears';
import { BEARS_UNIFORMS_FROM_PARTS } from './bears.parts';
import { SEAHAWKS_UNIFORMS } from './seahawks';
import { SEAHAWKS_UNIFORMS_FROM_PARTS } from './seahawks.parts';
import type { JerseyColors } from '@/lib/types';
import type { TeamUniformDefinition } from './types';

// The migration gate. A team moved onto the parts model is correct if and only if every one of
// its kits rasterizes byte-identically to the flat definition it replaces — which is what keeps
// `image_path` artwork stable for iOS builds already on devices (they fetch rasters by URL and
// never see this geometry). One generated `it` per kit per variant so a failure names the kit.
//
// The flat definitions stay in the tree purely as this test's baseline while both forms exist;
// they are deleted with the flat authoring path once every team has migrated.
//
// Cross-surface layer order legitimately changes — parts emit helmet, then jersey, then pants.
// UniformFigure groups layers by surface before painting, so only WITHIN-surface order is
// load-bearing; that is asserted separately below, and it is the property that makes the
// reordering safe.

const MIGRATED: [string, TeamUniformDefinition, TeamUniformDefinition][] = [
  ['bears', BEARS_UNIFORMS, BEARS_UNIFORMS_FROM_PARTS],
  ['seahawks', SEAHAWKS_UNIFORMS, SEAHAWKS_UNIFORMS_FROM_PARTS],
];

const raster = (svg: string) => sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer();

describe.each(MIGRATED)('%s parts migration', (teamId, flat, parts) => {
  const rows = UNIFORMS.filter((u) => u.teamId === teamId);

  it('has kits to check', () => expect(rows.length).toBeGreaterThan(0));

  for (const row of rows) {
    const id = `${row.teamId}-${row.slug}-${row.yearStart}`;
    const colors = row.colors as JerseyColors;

    for (const variant of ['jersey', 'full'] as const) {
      it(`${row.slug} renders byte-identically (${variant})`, async () => {
        const [a, b] = await Promise.all([
          raster(renderUniformThumbSVG(colors, id, flat, variant)),
          raster(renderUniformThumbSVG(colors, id, parts, variant)),
        ]);
        expect(b.equals(a)).toBe(true);
      });
    }

    it(`${row.slug} preserves within-surface paint order`, () => {
      const bySurface = (def: TeamUniformDefinition) => {
        const out: Record<string, string[]> = {};
        for (const layer of resolveUniformModel(def, row.slug, colors).layers) {
          const paint = 'fill' in layer ? layer.fill : `${layer.stroke}/${layer.strokeWidth}`;
          (out[layer.surface] ??= []).push(`${layer.d}|${paint}`);
        }
        return out;
      };
      expect(bySurface(parts)).toEqual(bySurface(flat));
    });
  }
});
