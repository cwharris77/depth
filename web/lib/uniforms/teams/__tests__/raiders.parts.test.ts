// Guards the facts about Las Vegas that no raster check catches: both kits share the silver pants
// and black socks, and each jersey draws a collar.
import { describe, expect, it } from 'vitest';
import { RAIDERS_PARTS } from '../raiders';
import { RAIDERS_CATALOG } from '../raiders/catalog';

describe('Raiders catalog', () => {
  it('pairs both jerseys with silver pants and black socks', () => {
    const pairs = Object.fromEntries(
      RAIDERS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => [c.pants, c.socks])])
    );
    expect(pairs).toEqual({ home: [['silver', 'black']], away: [['silver', 'black']] });
  });
});

describe('Raiders jerseys', () => {
  it('draws a collar on both jerseys', () => {
    for (const jersey of Object.values(RAIDERS_PARTS.jerseys)) {
      expect(jersey.layers.some((l) => l.id.includes('collar'))).toBe(true);
    }
  });
});
