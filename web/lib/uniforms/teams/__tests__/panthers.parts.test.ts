// Guards the two facts about Carolina that nothing else can catch: the helmet mark's paint order
// (reverse any pair and the linework disappears back into the body) and the pairings enumerated
// from the 2025 composite, which only the canonical entry renders as the row's own raster.
import { describe, expect, it } from 'vitest';
import { PANTHERS_PARTS } from '../panthers';
import { PANTHERS_CATALOG } from '../panthers/catalog';

describe('Panthers helmet parts', () => {
  const layerIds = (helmet: keyof typeof PANTHERS_PARTS.helmets) =>
    PANTHERS_PARTS.helmets[helmet].layers.map((layer) => layer.id);

  it('paints the mark silhouette, body, interior gaps, then fangs on both shells', () => {
    expect(layerIds('silver')).toEqual([
      'panthers-decal-keyline',
      'panthers-decal-body',
      'panthers-decal-detail',
      'panthers-decal-highlight',
    ]);
    expect(layerIds('black')).toEqual(layerIds('silver'));
  });

  it('takes the fang highlight from the mark, not from the kit silver', () => {
    const highlight = PANTHERS_PARTS.helmets.silver.layers.find(
      (layer) => layer.id === 'panthers-decal-highlight'
    );
    expect(highlight).toMatchObject({ kind: 'fill', fill: 'markSilver' });
    expect(PANTHERS_PARTS.palette.markSilver).not.toBe(PANTHERS_PARTS.palette.silver);
  });
});

describe('Panthers pants parts', () => {
  it('pairs each design with the pants and socks the composite shows, canonical first', () => {
    const pairs = Object.fromEntries(
      PANTHERS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => c.pants)])
    );
    expect(pairs).toEqual({
      home: ['black', 'blue'],
      away: ['black', 'white', 'white', 'blue', 'blue', 'silver'],
      'black-alt': ['black', 'black', 'silver'],
    });
  });

  it('keeps black canonical so the committed raster pairs the black leg', () => {
    for (const design of PANTHERS_CATALOG.designs) {
      expect(design.combinations[0].pants).toBe('black');
    }
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(PANTHERS_PARTS.pants)) {
    it(`stripes the ${name} leg with a keylined centre that stops at the hem`, () => {
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, center] = [fills[0], fills[2]];
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'panthers-pants-' + name + '-stripe-0-edge-left',
        'panthers-pants-' + name + '-stripe-0-edge-right',
        'panthers-pants-' + name + '-stripe-0-left',
        'panthers-pants-' + name + '-stripe-0-right',
      ]);
      // The stripe has to read against the leg it sits on and against its own keyline.
      expect(new Set([part.base, keyline, center]).size).toBe(3);
    });
  }
});
