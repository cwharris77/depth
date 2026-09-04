import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resolveUniformModel } from '../model';
import { renderUniformThumbSVG } from '../art';
import { UNIFORMS } from '../data';
import type { JerseyColors } from '@/lib/types';
import type { TeamUniformDefinition } from './types';

// The migration gate, and ONLY that. A team moved onto the parts model is correct if and only if
// every one of its kits rasterizes byte-identically to the flat definition it replaces.
//
// THIS GATE IS A ONE-TIME PROOF, NOT A STANDING TEST, and the distinction is load-bearing. It
// answers exactly one question -- "is this refactor a no-op?" -- which is only meaningful while
// both forms of the same team exist. Holding a team here after its migration lands would convert
// an equivalence proof into a freeze on the artwork: every later accuracy fix (a facemask color,
// a re-authored decal) would have to be authored TWICE, once in each form, purely to keep a test
// green that has already told us everything it can. That is a real tax and it was paid once --
// Seattle's black facemask failed this gate the moment it was added, against a flat definition
// nothing else in the codebase reads.
//
// So the lifecycle is: add the team to MIGRATED in its migration PR, prove parity, and in that
// SAME PR delete the flat definition and remove the entry again. The flat definitions are
// scaffolding -- nothing but this file ever imported them. Geometry constants stay in the team
// module; only the flat `*_UNIFORMS` definition object goes.
//
// MIGRATED is therefore empty on main by design. A non-empty array here means a migration is
// in flight. Improving a migrated team's accuracy is then a single edit with deliberate raster
// changes, reviewed on the artwork itself rather than on a byte comparison.
//
// Cross-surface layer order legitimately changes -- parts emit helmet, then jersey, then pants.
// UniformFigure groups layers by surface before painting, so only WITHIN-surface order is
// load-bearing; that is asserted separately below, and it is the property that makes the
// reordering safe.
const MIGRATED: [string, TeamUniformDefinition, TeamUniformDefinition][] = [];

const raster = (svg: string) => sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer();

describe('parts migration gate', () => {
  // Keeps the suite meaningful (and `describe.each` off an empty array) when no migration is in
  // flight, which is the steady state.
  it('is armed only while a team is mid-migration', () => {
    expect(Array.isArray(MIGRATED)).toBe(true);
  });

  for (const [teamId, flat, parts] of MIGRATED) {
    describe(`${teamId}`, () => {
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
  }
});
