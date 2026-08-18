import { describe, expect, it } from 'vitest';
import {
  renderUniformThumbSVG,
  uniformArtURL,
  uniformArtFullURL,
  UNIFORM_ART_BASE_URL,
} from '@/lib/uniforms/art';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';
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

describe('uniformArtURL', () => {
  it('derives a kit URL from its stable id', () => {
    expect(uniformArtURL('bengals-color-rush')).toBe(
      'https://depth-ashen.vercel.app/uniforms/bengals-color-rush.webp'
    );
  });

  it('is anchored to the shared base URL', () => {
    expect(UNIFORM_ART_BASE_URL).toBe('https://depth-ashen.vercel.app/uniforms');
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
    expect(svg).toContain('fill="#C6D3DC"');
  });

  it('swaps the web-only Anton font stack for a rasterizer-safe one', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks')
    );
    expect(svg).not.toContain('var(--font-anton)');
    expect(svg).toContain('font-family:Helvetica, sans-serif');
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

  it('renders a generic kit when the team has no definition', () => {
    const svg = renderUniformThumbSVG(seahawksRivalries, 'seahawks-rivalries-2025');
    expect(svg).toContain('viewBox="20 372 560 452"');
    expect(svg).toContain('fill="#C6D3DC"');
  });
});

describe('uniformArtFullURL', () => {
  it('derives the full-mannequin URL from a kit id, distinct from the jersey crop', () => {
    expect(uniformArtFullURL('bengals-color-rush')).toBe(
      'https://depth-ashen.vercel.app/uniforms/bengals-color-rush-full.webp'
    );
    expect(uniformArtFullURL('bengals-color-rush')).not.toBe(uniformArtURL('bengals-color-rush'));
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

  it('still swaps the web-only font stack in the full variant', () => {
    const svg = renderUniformThumbSVG(
      seahawksRivalries,
      'seahawks-rivalries-2025',
      getTeamUniformDefinition('seahawks'),
      'full'
    );
    expect(svg).not.toContain('var(--font-anton)');
    expect(svg).toContain('font-family:Helvetica, sans-serif');
  });
});
