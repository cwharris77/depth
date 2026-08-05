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

const customLayerIds = ['test-helmet-fill', 'test-sleeve-left', 'test-sleeve-right', 'test-collar'];

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

  it('clips helmet layers to the helmet geometry', () => {
    const markup = renderFigure({ definition });

    expect(markup).toMatch(
      /<path[^>]*data-layer-id="test-helmet-fill"[^>]*clip-path="url\(#[^"]+-helmet\)"[^>]*>/
    );
  });

  it('renders an authored number glyph instead of the fallback text', () => {
    const markup = renderFigure({ definition });

    expect(markup).toContain('d="M501,502 L503,504 Z"');
    expect(markup).not.toContain('>1</text>');
  });

  it('uses team defaults when the kit is unknown', () => {
    expect(() => renderFigure({ definition, kitId: 'test-unknown' })).not.toThrow();
    expect(renderFigure({ definition, kitId: 'test-unknown' })).toContain(
      'data-layer-id="test-helmet-fill"'
    );
  });
});
