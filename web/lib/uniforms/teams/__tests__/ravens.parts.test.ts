// Guards the facts about Baltimore that no raster check catches: every jersey draws a grey-keylined
// collar, and the one shell, one pant and the catalog's kits stay as authored.
import { describe, expect, it } from 'vitest';
import { RAVENS_PARTS } from '../ravens';
import { RAVENS_CATALOG } from '../ravens/catalog';

describe('Ravens jersey parts', () => {
  // One `it` per jersey so a failure names the offending kit.
  for (const [name, part] of Object.entries(RAVENS_PARTS.jerseys)) {
    it(`draws the ${name} collar and both shoulder bars and sleeve bands`, () => {
      const ids = part.layers.map((layer) => layer.id);
      expect(ids.some((id) => id.includes('collar'))).toBe(true);
      for (const side of ['left', 'right']) {
        expect(ids).toContain(`ravens-shoulder-outer-${side}`);
        expect(ids).toContain(`ravens-shoulder-inner-${side}`);
        expect(ids).toContain(`ravens-sleeve-band-${side}`);
      }
    });
  }
});

describe('Ravens catalog', () => {
  it('wears the one black shell and purple pants on every design', () => {
    for (const design of RAVENS_CATALOG.designs) {
      expect(design.combinations.map((c) => [c.helmet, c.pants])).toEqual([['black', 'purple']]);
    }
  });
});
