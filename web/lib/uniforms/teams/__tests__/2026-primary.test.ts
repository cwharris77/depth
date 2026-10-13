import { describe, expect, it } from 'vitest';
import { UNIFORMS } from '../../data';
import { getTeamUniformDefinition } from '../index';
import { getTeamCatalog } from '../catalogs';
import { renderUniformThumbSVG } from '../../art';
import { RAVENS_2026_SHIELDS } from '../ravens/marks/primary-2026';

const replacements = [
  ['falcons', 'home-2026', 2026, 'red'],
  ['falcons', 'away-2026', 2026, 'white'],
  ['ravens', 'home-2026', 2026, 'purple'],
  ['ravens', 'away-2026', 2026, 'white'],
  ['commanders', 'home-2026', 2026, 'burgundy'],
  ['commanders', 'super-bowl-away', 2025, 'white'],
  ['rams', 'home-2026', 2026, 'royal'],
  ['rams', 'away-2026', 2026, 'white'],
] as const;

describe('worn replacement primary designs', () => {
  it('keeps Ravens shield lettering upright on both sleeves', () => {
    const letters = RAVENS_2026_SHIELDS.layers.filter((layer) => layer.id.includes('-red'));
    const left = letters.find((layer) => layer.surface === 'sleeve-left');
    const right = letters.find((layer) => layer.surface === 'sleeve-right');
    expect(left?.d).toBe(
      right?.d.replace(/(-?\d+\.\d+),/g, (_, x) => `${(Number(x) - 466).toFixed(1)},`)
    );
  });
  for (const [teamId, slug, from, paint] of replacements) {
    it(`${teamId}/${slug}: has actual debut dates and distinct artwork`, () => {
      const design = getTeamCatalog(teamId)?.designs.find((entry) => entry.slug === slug);
      expect(design).toBeDefined();
      expect(design?.periods.at(-1)?.from).toBe(from);
      expect(design?.periods.at(-1)?.to).toBeUndefined();
      const row = UNIFORMS.find((entry) => entry.teamId === teamId && entry.slug === slug);
      expect(row?.isCurrent).toBe(true);
      if (!row || !design) throw new Error(`Missing ${teamId}/${slug}`);
      expect(getTeamUniformDefinition(teamId)?.kits[row.constructionKey]).toBeDefined();
      expect(design.jersey).toContain(paint);
      expect(row.constructionKey).toBe(slug);
      const svg = renderUniformThumbSVG(
        row.colors,
        row.id,
        getTeamUniformDefinition(teamId),
        'full',
        row.constructionKey
      );
      expect(svg).toContain(`${teamId}-2026`);
    });
  }

  it('keeps the Falcons retired red alternate separate from the new primary', () => {
    const catalog = getTeamCatalog('falcons');
    expect(catalog?.designs.find((entry) => entry.slug === 'red-alt')?.periods.at(-1)?.to).toBe(
      2022
    );
    expect(catalog?.designs.find((entry) => entry.slug === 'home-2026')?.jersey).not.toBe('red');
  });

  it('replaces Ravens shoulder bars with collar wings and shield sleeves', () => {
    const row = UNIFORMS.find((entry) => entry.teamId === 'ravens' && entry.slug === 'home-2026');
    expect(row).toBeDefined();
    if (!row) throw new Error('Missing Ravens replacement');
    const svg = renderUniformThumbSVG(
      row.colors,
      row.id,
      getTeamUniformDefinition('ravens'),
      'jersey',
      row.constructionKey
    );
    expect(svg).toContain('ravens-2026-wing');
    expect(svg).toContain('ravens-2026-shield');
    expect(svg).not.toContain('ravens-shoulder-outer');
  });
});
