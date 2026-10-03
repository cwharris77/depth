// Guards the facts about New England that no raster check catches: the shoulder band paint order
// and the pairings taken from the 2025 composite, canonical first.
import { describe, expect, it } from 'vitest';
import { PATRIOTS_PARTS } from '../patriots';
import { PATRIOTS_CATALOG } from '../patriots/catalog';

describe('Patriots jerseys', () => {
  const bandFills = (jersey: keyof typeof PATRIOTS_PARTS.jerseys) =>
    PATRIOTS_PARTS.jerseys[jersey].layers
      .filter((l) => l.id === 'patriots-band-0-left' || l.id === 'patriots-band-1-left')
      .map((l) => (l.kind === 'fill' ? l.fill : undefined));

  it('colours the middle band with the inner colour', () => {
    expect(bandFills('navy')).toEqual(['red', 'white']);
    expect(bandFills('white')).toEqual(['red', 'navy']);
    expect(bandFills('pat')).toEqual(['white', 'rivalNavy']);
    expect(bandFills('rivalries')).toEqual(['white', 'navy']);
  });

  it('draws three bands on each shoulder', () => {
    for (const jersey of Object.values(PATRIOTS_PARTS.jerseys)) {
      expect(jersey.layers.filter((l) => l.id.startsWith('patriots-band-')).length).toBe(6);
    }
  });
});

describe('Patriots catalog', () => {
  it('pairs each design with the pants the composite shows, canonical first', () => {
    const pairs = Object.fromEntries(
      PATRIOTS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => c.pants)])
    );
    expect(pairs).toEqual({
      home: ['navy', 'silver'],
      away: ['white', 'navy'],
      'rivalries-2025': ['white'],
      'pat-patriot': ['white'],
    });
  });
});
