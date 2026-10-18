import { describe, expect, it } from 'vitest';
import { NINERS_CATALOG } from '../49ers/catalog';
import { NINERS_PARTS } from '../49ers';
import { catalogKits } from '../core/catalog';

describe('49ers modern uniforms', () => {
  it('registers the worn white-sock away combination and separate modern throwbacks', () => {
    const kits = catalogKits(NINERS_CATALOG);
    expect(kits['away--white-socks']).toMatchObject({ jersey: 'white', socks: 'white' });
    expect(kits['white-throwback']).toMatchObject({ jersey: 'throwback-white', pants: 'white' });
    expect(kits['red-throwback']).toMatchObject({ jersey: 'throwback-red', pants: 'white' });
  });

  it('uses distinct crown stripe art for the gold and black helmets', () => {
    expect(NINERS_PARTS.helmets.gold.layers).not.toEqual(NINERS_PARTS.helmets.black.layers);
  });

  it('includes primary chest marks and the Rivalries chest and shoulder details', () => {
    for (const jersey of ['red', 'white', 'black']) {
      expect(
        NINERS_PARTS.jerseys[jersey].layers.some((layer) => layer.id.includes('chest-wordmark'))
      ).toBe(true);
    }
    expect(
      NINERS_PARTS.jerseys.black.layers.some((layer) =>
        layer.id.includes('shoulder-number-outline')
      )
    ).toBe(true);
    expect(
      NINERS_CATALOG.designs.find((design) => design.slug === 'rivalries-2025')?.sleeveNike
    ).toBe('gold');
    expect(NINERS_PARTS.jerseys.black.number?.texture).toBe('plain');
  });
});
