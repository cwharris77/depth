import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG, uniformArtURL, uniformArtFullURL } from '@/lib/uniforms/art';
import { UNIFORMS } from '@/lib/uniforms/data';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
import { buildRowsFromCatalog } from '../../scripts/gen-uniform-thumbs.mts';
import type { TeamColors } from '@/lib/types';

// DEP-220: the artifact pipeline's pure half. These tests lock the two contracts the
// generator script and the seed generator both depend on: the deterministic URL a kit's
// WebP lives at, and the deterministic jersey-crop SVG string that becomes the raster.

const seahawksRivalries: TeamColors = {
  primary: '#C6D3DC',
  secondary: '#002244',
  accent: '#29594C',
  uiAccent: '#C6D3DC',
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
    for (const detail of [
      'soundwave-0',
      'soundwave-1',
      'soundwave-2',
      'cuffs',
      'wordmark',
      'neck-opening',
      'collar-placket',
    ]) {
      expect(svg).toContain(`data-layer-id="seahawks-rivalries-${detail}"`);
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
    expect(svg).toContain('fill="#C6D3DC"');
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
});
