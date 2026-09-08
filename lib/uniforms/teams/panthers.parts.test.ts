// Guards the two facts about Carolina that nothing else can catch: the helmet mark's paint order
// (reverse any pair and the linework the re-author added disappears back into the body) and the
// pant options enumerated from the GUD 2025 composite, which only the canonical entry compiles so
// a wrong list is otherwise invisible in every raster.
import { describe, expect, it } from 'vitest';
import { PANTHERS_PARTS } from './panthers.parts';

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
  it('offers the pant colors each kit is worn with, canonical first', () => {
    expect(PANTHERS_PARTS.kits.home.pants).toEqual(['black', 'blue']);
    expect(PANTHERS_PARTS.kits.away.pants).toEqual(['black', 'white', 'blue', 'silver']);
    expect(PANTHERS_PARTS.kits['black-alt'].pants).toEqual(['black', 'silver']);
  });

  it('keeps black canonical so the committed raster is unchanged by the options', () => {
    for (const kit of Object.values(PANTHERS_PARTS.kits)) {
      expect(Array.isArray(kit.pants) ? kit.pants[0] : kit.pants).toBe('black');
    }
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(PANTHERS_PARTS.pants)) {
    it(`stripes the ${name} leg with a keylined centre`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
        'panthers-stripe-center-left',
        'panthers-stripe-center-right',
      ]);
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, , center] = fills;
      // The stripe has to read against the leg it sits on and against its own keyline.
      expect(new Set([part.base, keyline, center]).size).toBe(3);
    });
  }
});
