import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG, uniformArtURL, uniformArtFullURL } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { compileParts } from '@/lib/uniforms/teams/core/parts';
import { buildRowsFromCatalog } from '../../scripts/gen-uniform-thumbs.mts';
import type { TeamColors } from '@/lib/types';

// The artifact pipeline's pure half. These tests lock the two contracts the
// generator script and the seed generator both depend on: the deterministic URL a kit's
// WebP lives at, and the deterministic jersey-crop SVG string that becomes the raster.

const seahawksRivalries: TeamColors = {
  primary: '#AFB3B5',
  secondary: '#002244',
  accent: '#29594C',
  uiAccent: '#AFB3B5',
  onAccent: '#0a0e1a',
};

const eaglesKelly: TeamColors = {
  primary: '#046A38',
  secondary: '#A5ACAF',
  accent: '#FFFFFF',
  uiAccent: '#046A38',
  onAccent: '#0a0e1a',
};

describe('uniformArtURL', () => {
  it('derives a kit URL from its stable id', () => {
    expect(uniformArtURL('bengals-color-rush')).toBe('/uniforms/bengals-color-rush.webp');
  });

  it('is origin-relative so web art resolves against the current request origin', () => {
    expect(uniformArtURL('bengals-color-rush')).toMatch(/^\/uniforms\//);
    expect(uniformArtURL('bengals-color-rush')).not.toMatch(/^https?:\/\//);
  });

  it('carries the manifest revision as a cache-busting query while staying origin-relative', () => {
    const url = uniformArtURL('bengals-color-rush', '0123456789abcdef');
    expect(url).toBe('/uniforms/bengals-color-rush.webp?rev=0123456789abcdef');
    expect(url).toMatch(/^\/uniforms\//);
    expect(url).not.toMatch(/^https?:\/\//);
  });
});

describe('uniform thumbnail catalog rows', () => {
  it('projects the committed catalog into stable raster inputs', () => {
    expect(buildRowsFromCatalog()).toEqual(
      UNIFORMS.map((uniform) => ({
        id: `${uniform.teamId}-${uniform.slug}-${uniform.yearStart}`,
        teamId: uniform.teamId,
        slug: uniform.slug,
        constructionKey: uniform.constructionKey,
        colors: uniform.colors,
      })).sort((left, right) => left.id.localeCompare(right.id))
    );
  });
});

describe('renderUniformThumbSVG', () => {
  it('renders the picker jersey crop', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    expect(svg).toContain('viewBox="20 372 560 452"');
  });

  it('paints the kit colors resolved through the team definition', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    expect(svg).toContain('fill="#AFB3B5"');
  });

  it('renders the approved Rivalries soundwaves, collar, cuffs, and outlined wordmark', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    for (const id of [
      'seahawks-rivalries-soundwave-0',
      'seahawks-rivalries-soundwave-1',
      'seahawks-rivalries-soundwave-2',
      'seahawks-rivalries-cuffs',
      'seahawks-rivalries-wordmark',
      'seahawks-jersey-rivalries-silver-neck-opening',
      'seahawks-jersey-rivalries-silver-collar-placket',
    ]) {
      expect(svg).toContain(`data-layer-id="${id}"`);
    }
    expect(svg).not.toContain('data-layer-id="seahawks-rivalries-dash-field"');
    expect(svg).not.toContain('data-layer-id="generic-sleeve-stripe-left"');
  });

  it('uses vector numerals without a rasterizer font dependency', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    expect(svg).not.toContain('var(--font-anton)');
    expect(svg).not.toContain('<text');
    expect(svg).toContain('data-number="3"');
  });

  it('is deterministic across runs', () => {
    const a = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    const b = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    expect(a).toBe(b);
  });

  it('uses an explicit construction key instead of deriving Eagles Kelly Green from its id', () => {
    const definition = getTeamUniformDefinition('eagles');
    const original = renderUniformThumbSVG(
      eaglesKelly,
      'eagles-kelly-green-1987',
      definition,
      'jersey',
      'kelly-green-original'
    );
    const modern = renderUniformThumbSVG(
      eaglesKelly,
      'eagles-kelly-green-modern-2023',
      definition,
      'jersey',
      'kelly-green-modern'
    );

    expect(original).not.toBe(modern);
  });

  it('keeps the existing Eagles Kelly Green archive id on the original construction fallback', () => {
    const definition = getTeamUniformDefinition('eagles');
    const fallback = renderUniformThumbSVG(eaglesKelly, 'eagles-kelly-green-1987', definition);
    const original = renderUniformThumbSVG(
      eaglesKelly,
      'eagles-kelly-green-1987',
      definition,
      'jersey',
      'kelly-green-original'
    );

    expect(fallback).toBe(original);
  });

  it('renders a generic kit when the team has no definition', () => {
    const svg = renderUniformThumbSVG(seahawksRivalries, 'seahawks-rivalries-2025');
    expect(svg).toContain('viewBox="20 372 560 452"');
    expect(svg).toContain('fill="#AFB3B5"');
  });
});

describe('uniformArtFullURL', () => {
  it('derives the full-mannequin URL from a kit id, distinct from the jersey crop', () => {
    expect(uniformArtFullURL('bengals-color-rush')).toBe('/uniforms/bengals-color-rush-full.webp');
    expect(uniformArtFullURL('bengals-color-rush')).not.toBe(uniformArtURL('bengals-color-rush'));
  });

  it('carries the revision on the full-mannequin URL too', () => {
    expect(uniformArtFullURL('bengals-color-rush', '0123456789abcdef')).toBe(
      '/uniforms/bengals-color-rush-full.webp?rev=0123456789abcdef'
    );
  });
});

describe('renderUniformThumbSVG full variant', () => {
  it('renders the full mannequin (helmet + jersey + pants) via viewBox', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks'),
      'full'
    );
    expect(svg).toContain('viewBox="20 45 560 1535"');
  });

  it('keeps the full variant independent of installed fonts', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks'),
      'full'
    );
    expect(svg).not.toContain('var(--font-anton)');
    expect(svg).not.toContain('<text');
    expect(svg).toContain('data-number="3"');
  });

  it('paints the shins in the sock colour and clips sock layers to the shins', () => {
    // Each shin path also appears unfilled inside the leg clip path; read the painted one.
    const paintedShin = (svg: string, pathPrefix: string) =>
      [...svg.matchAll(/<path[^>]*>/g)]
        .map((m) => m[0])
        .find((tag) => tag.includes(pathPrefix) && tag.includes('fill='));
    const LEFT_SHIN = 'M118,1197 228,1197';
    const RIGHT_SHIN = 'M360,1197 470,1197';
    const plain = {
      teamId: 'test',
      palette: { navy: '#001122', white: '#FFFFFF', red: '#CC0000' },
      helmets: { h: { base: 'navy', layers: [] } },
      jerseys: {
        j: {
          base: 'white',
          layers: [],
          number: { fill: 'navy', outline: 'white', outlineWidth: 26 },
        },
      },
      pants: { p: { base: 'navy', layers: [] } },
      socks: {
        s: {
          base: 'red',
          layers: [
            {
              id: 'hoop-left',
              surface: 'sock-left' as const,
              d: 'M100,1300 H240 V1316 H100 Z',
              clip: true,
              kind: 'fill' as const,
              fill: 'white',
            },
            {
              id: 'hoop-right',
              surface: 'sock-right' as const,
              d: 'M348,1300 H488 V1316 H348 Z',
              clip: true,
              kind: 'fill' as const,
              fill: 'white',
            },
          ],
        },
      },
      kits: {
        bare: { helmet: 'h', jersey: 'j', pants: 'p' },
        socked: { helmet: 'h', jersey: 'j', pants: 'p', socks: 's' },
      },
    };
    const def = compileParts(plain);
    const bare = renderUniformThumbSVG(seahawksRivalries, 'test-bare', def, 'full');
    expect(paintedShin(bare, LEFT_SHIN)).toContain('fill="#001122"');
    expect(paintedShin(bare, RIGHT_SHIN)).toContain('fill="#001122"');
    expect(bare).not.toContain('sockL');

    const socked = renderUniformThumbSVG(seahawksRivalries, 'test-socked', def, 'full');
    expect(paintedShin(socked, LEFT_SHIN)).toContain('fill="#CC0000"');
    expect(paintedShin(socked, RIGHT_SHIN)).toContain('fill="#CC0000"');
    expect(socked).toMatch(/clip-path="url\(#[^)]*-sockL\)"/);
    expect(socked).toMatch(/clip-path="url\(#[^)]*-sockR\)"/);
  });
});
