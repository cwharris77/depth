import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import UniformFigure from '@/components/UniformFigure';
import type { TeamColors } from '@/lib/types';
import { renderUniformThumbSVG } from '@/lib/uniforms/art';
import { variantSpec } from '@/lib/uniforms/figure';
import { HELMET_ART } from '@/lib/uniforms/helmet-art';
import { shadeFor } from '@/lib/uniforms/helmet-shading';
import { resolveUniformModel } from '@/lib/uniforms/model';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';

const colors: TeamColors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#000000',
};

const customLayerIds = [
  'test-helmet-fill',
  'test-sleeve-left',
  'test-sleeve-right',
  'test-jersey-fill',
  'test-collar',
  'test-number-mark',
  'test-pants-fill',
  'test-leg-left',
  'test-leg-right',
];

const definition: TeamUniformDefinition = {
  teamId: 'test',
  defaults: {
    removeLayerIds: [
      'generic-helmet-stripe',
      'generic-sleeve-yoke-left',
      'generic-sleeve-yoke-right',
      'generic-collar',
    ],
    layers: [
      {
        id: 'test-helmet-fill',
        surface: 'helmet',
        d: 'M101,102 L103,104 Z',
        clip: true,
        kind: 'fill',
        fill: 'accent',
      },
      {
        id: 'test-sleeve-left',
        surface: 'sleeve-left',
        d: 'M201,202 L203,204 Z',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
      {
        id: 'test-sleeve-right',
        surface: 'sleeve-right',
        d: 'M301,302 L303,304 Z',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
      {
        id: 'test-collar',
        surface: 'collar',
        d: 'M401,402 L403,404 Z',
        clip: true,
        kind: 'stroke',
        stroke: 'accent',
        strokeWidth: 7,
      },
      {
        id: 'test-jersey-fill',
        surface: 'jersey',
        d: 'M351,352 L353,354 Z',
        clip: true,
        kind: 'fill',
        fill: 'primary',
      },
      {
        id: 'test-number-mark',
        surface: 'number',
        d: 'M451,452 L453,454 Z',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
      {
        id: 'test-pants-fill',
        surface: 'pants',
        d: 'M601,602 L603,604 Z',
        clip: true,
        kind: 'fill',
        fill: 'primary',
      },
      {
        id: 'test-leg-left',
        surface: 'leg-left',
        d: 'M701,702 L703,704 Z',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
      {
        id: 'test-leg-right',
        surface: 'leg-right',
        d: 'M801,802 L803,804 Z',
        clip: true,
        kind: 'fill',
        fill: 'secondary',
      },
    ],
    number: {
      fill: 'readable-on-body',
      outline: 'secondary',
      outlineWidth: 12,
      glyphPath: 'M501,502 L503,504 Z',
    },
  },
  kits: {
    home: {},
  },
};

function renderFigure(options?: { definition?: TeamUniformDefinition; kitId?: string }) {
  return renderToStaticMarkup(
    <UniformFigure
      colors={colors}
      variant="full"
      kitId={options?.kitId ?? 'test-home'}
      definition={options?.definition}
    />
  );
}

// The art group paints HELMET_ART in order, so the nth fill in the group belongs to the nth
// entry. Reading fills back out of the markup — rather than recomputing them — is what makes
// these assertions cover the renderer's wiring and not just shadeFor's math.
function helmetArtFills(markup: string): string[] {
  const group = markup.slice(markup.indexOf('data-helmet-art="base"'));
  return [...group.matchAll(/<path\b[^>]*?\sfill="([^"]+)"/g)]
    .slice(0, HELMET_ART.length)
    .map((match) => match[1]);
}

describe('variantSpec', () => {
  it('jersey crops to the torso region', () => {
    expect(variantSpec('jersey')).toEqual({
      parts: ['jersey'],
      viewBox: '20 372 560 452',
    });
  });
  it('full shows the whole body', () => {
    const spec = variantSpec('full');
    expect(spec.parts).toEqual(['helmet', 'jersey', 'pants']);
    expect(spec.viewBox).toBe('20 45 560 1535');
  });
  it('helmet renders only the helmet part', () => {
    expect(variantSpec('helmet').parts).toEqual(['helmet']);
  });
  it('an unknown variant falls back to the jersey spec (defensive)', () => {
    // @ts-expect-error exercising the runtime fallback
    expect(variantSpec('bogus')).toEqual(variantSpec('jersey'));
  });
});

describe('UniformFigure', () => {
  it('omits team-authored layers from the generic render', () => {
    const markup = renderFigure();

    for (const layerId of customLayerIds) {
      expect(markup).not.toContain(`data-layer-id="${layerId}"`);
    }
  });

  it('renders every team-authored layer with its stable ID', () => {
    const markup = renderFigure({ definition });

    for (const layerId of customLayerIds) {
      expect(markup).toContain(`data-layer-id="${layerId}"`);
    }
  });

  it.each([
    ['test-helmet-fill', 'helmet'],
    ['test-sleeve-left', 'jersey'],
    ['test-sleeve-right', 'jersey'],
    ['test-jersey-fill', 'jersey'],
    ['test-collar', 'jersey'],
    ['test-number-mark', 'jersey'],
    ['test-pants-fill', 'pants'],
    ['test-leg-left', 'legL'],
    ['test-leg-right', 'legR'],
  ])('clips %s to the %s surface geometry', (layerId, clipId) => {
    const markup = renderFigure({ definition });

    expect(markup).toMatch(
      new RegExp(
        `<path[^>]*data-layer-id="${layerId}"[^>]*clip-path="url\\(#[^"]+-${clipId}\\)"[^>]*>`
      )
    );
  });

  it.each([
    ['test-leg-right', 'fill="#ffffff"'],
    ['test-pants-fill', 'test-jersey-fill'],
    ['test-sleeve-right', 'test-collar'],
    ['test-jersey-fill', 'test-collar'],
    ['test-collar', 'test-number-mark'],
    ['test-number-mark', 'test-helmet-fill'],
  ])('paints %s before %s', (earlier, later) => {
    const markup = renderFigure({ definition });

    expect(markup.indexOf(earlier)).toBeLessThan(markup.indexOf(later));
  });

  it('leaves the open facemask cage transparent', async () => {
    const svg = renderUniformThumbSVG(colors, 'test-home', definition, 'full');
    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const sightOpeningPixel = (170 * info.width + 400) * 4;
    const frontShellRimPixel = (140 * info.width + 420) * 4;
    const lowerCagePixel = (260 * info.width + 400) * 4;

    expect([...data.subarray(sightOpeningPixel, sightOpeningPixel + 4)]).toEqual([0, 0, 0, 0]);
    expect(data[frontShellRimPixel + 3]).toBe(255);
    expect([...data.subarray(lowerCagePixel, lowerCagePixel + 4)]).toEqual([0, 0, 0, 0]);

    // Narrow gaps used to inherit the solid cage's paint. These exercise the generated
    // TypeScript cutters through the renderer, independently of the standalone base SVG.
    for (const [x, y] of [
      [389, 217],
      [349, 229],
      [362, 228],
    ]) {
      expect(data[(y * info.width + x) * 4 + 3], `cage gap at ${x},${y}`).toBe(0);
    }
  });

  it('keeps the complete helmet inside the helmet-only crop', async () => {
    const svg = renderToStaticMarkup(<UniformFigure colors={colors} variant="helmet" size={560} />);
    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    let frontCagePixels = 0;
    for (let y = 0; y < info.height; y++) {
      expect(alpha(0, y), `left edge at ${y}`).toBe(0);
      expect(alpha(info.width - 1, y), `right edge at ${y}`).toBe(0);
      for (let x = info.width - 40; x < info.width; x++) {
        if (alpha(x, y) > 0) frontCagePixels++;
      }
    }
    for (let x = 0; x < info.width; x++) {
      expect(alpha(x, 0), `top edge at ${x}`).toBe(0);
      expect(alpha(x, info.height - 1), `bottom edge at ${x}`).toBe(0);
    }
    expect(frontCagePixels).toBeGreaterThan(0);
  });

  it('leaves the former shell outline outside the facemask transparent', async () => {
    const svg = renderUniformThumbSVG(colors, 'test-home', definition, 'full');
    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(data[(209 * info.width + 460) * 4 + 3]).toBe(0);
    expect(data[(302 * info.width + 420) * 4 + 3]).toBe(0);
  });

  it('paints generated helmet art beneath team-authored helmet layers', () => {
    const markup = renderFigure({ definition });
    const helmetArt = 'data-helmet-art="base"';
    const teamLayer = 'data-layer-id="test-helmet-fill"';

    expect(markup).not.toContain('data-detail-id=');
    expect(markup).toContain(helmetArt);
    expect(markup.indexOf(helmetArt)).toBeLessThan(markup.indexOf(teamLayer));
  });

  // Acceptance criteria 2 and 3 of the helmet art migration spec
  // (../obsidian/Projects/depth/specs/2026-09-05-helmet-art-migration-design.md). The art is
  // worth using only because it shades; a renderer that flattens it, or that paints the cage
  // from the shell color, produces the same flat silhouette the hand-authored GEO helmet drew.
  describe('helmet art shading', () => {
    it('paints the shell in at least 20 distinct shades of the helmet color', () => {
      const fills = helmetArtFills(renderFigure({ definition }));
      const shellFills = fills.filter((_, index) => HELMET_ART[index].role === 'shell');

      expect(new Set(shellFills).size).toBeGreaterThanOrEqual(20);
    });

    it.each(['shell', 'facemask'] as const)(
      'derives every %s fill from that surface own color, never an invented hex',
      (role) => {
        const model = resolveUniformModel(definition, 'home', colors);
        const base = role === 'shell' ? model.helmetColor : model.facemaskColor;
        const fills = helmetArtFills(renderFigure({ definition }));

        for (const [index, path] of HELMET_ART.entries()) {
          if (path.role !== role) continue;
          expect(fills[index]).toBe(shadeFor(base, path.dl ?? 0));
        }
      }
    );

    it('repaints the cage without touching the shell when only the facemask color changes', () => {
      const recased: TeamUniformDefinition = {
        ...definition,
        defaults: { ...definition.defaults, facemaskColor: '#C60C30' },
      };
      const before = helmetArtFills(renderFigure({ definition }));
      const after = helmetArtFills(renderFigure({ definition: recased }));

      const shellIndexes = HELMET_ART.flatMap((path, index) =>
        path.role === 'shell' ? [index] : []
      );
      const facemaskIndexes = HELMET_ART.flatMap((path, index) =>
        path.role === 'facemask' ? [index] : []
      );

      expect(shellIndexes.map((index) => after[index])).toEqual(
        shellIndexes.map((index) => before[index])
      );
      expect(facemaskIndexes.map((index) => after[index])).not.toEqual(
        facemaskIndexes.map((index) => before[index])
      );
    });

    // The Bears run a navy cage on a navy shell (depth#709) and the Rams a royal cage on a
    // royal shell (depth#708) — the case that has to keep reading as a cage on shading alone,
    // because the two surfaces resolve to the same base color.
    it.each([
      ['bears', 'home'],
      ['rams', 'home'],
    ])('renders %s %s as a same-color cage that still shades apart from the shell', (team, kit) => {
      const teamDefinition = getTeamUniformDefinition(team);
      const model = resolveUniformModel(teamDefinition, kit, colors);

      expect(model.facemaskColor).toBe(model.helmetColor);

      const fills = helmetArtFills(
        renderFigure({ definition: teamDefinition, kitId: `${team}-${kit}` })
      );
      const shellShades = new Set(fills.filter((_, index) => HELMET_ART[index].role === 'shell'));
      const facemaskShades = new Set(
        fills.filter((_, index) => HELMET_ART[index].role === 'facemask')
      );

      expect(facemaskShades.size).toBeGreaterThanOrEqual(20);
      expect([...facemaskShades].some((shade) => !shellShades.has(shade))).toBe(true);
    });
  });

  it('renders an authored number glyph instead of the fallback text', () => {
    const markup = renderFigure({ definition });

    expect(markup).toContain('d="M501,502 L503,504 Z"');
    expect(markup).not.toContain('>1</text>');
  });

  it('clips both authored number glyph paths to the jersey geometry', () => {
    const markup = renderFigure({ definition });
    const glyphPaths = markup.match(/<path[^>]*d="M501,502 L503,504 Z"[^>]*>/g);

    expect(glyphPaths).toHaveLength(2);
    for (const glyphPath of glyphPaths ?? []) {
      expect(glyphPath).toMatch(/clip-path="url\(#[^"]+-jersey\)"/);
    }
  });

  it('uses team defaults when the kit is unknown', () => {
    expect(() => renderFigure({ definition, kitId: 'test-unknown' })).not.toThrow();
    expect(renderFigure({ definition, kitId: 'test-unknown' })).toContain(
      'data-layer-id="test-helmet-fill"'
    );
  });

  it('preserves a hyphenated team prefix and Rivalries kit slug', () => {
    const hyphenatedDefinition: TeamUniformDefinition = {
      teamId: 'team-with-hyphen',
      kits: {
        'rivalries-2025': {
          layers: [
            {
              id: 'hyphenated-rivalries-layer',
              surface: 'jersey',
              d: 'M901,902 L903,904 Z',
              clip: true,
              kind: 'fill',
              fill: 'accent',
            },
          ],
        },
      },
    };

    expect(
      renderFigure({
        definition: hyphenatedDefinition,
        kitId: 'team-with-hyphen-rivalries-2025',
      })
    ).toContain('data-layer-id="hyphenated-rivalries-layer"');

    expect(
      renderFigure({
        definition: hyphenatedDefinition,
        kitId: 'team-with-hyphen-rivalries-2025-2025',
      })
    ).toContain('data-layer-id="hyphenated-rivalries-layer"');
  });
});
