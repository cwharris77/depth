import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import UniformFigure from '@/components/UniformFigure';
import type { TeamColors } from '@/lib/types';
import { variantSpec } from '@/lib/uniforms/figure';
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
    ['test-helmet-fill', 'fill="#4b5158"'],
  ])('paints %s before %s', (earlier, later) => {
    const markup = renderFigure({ definition });

    expect(markup.indexOf(earlier)).toBeLessThan(markup.indexOf(later));
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
  });
});
