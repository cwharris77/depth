// Guards the facts about New Orleans that no raster check catches: every jersey draws a collar and
// both shoulder numerals, and the catalog's kits stay as authored.
import { describe, expect, it } from 'vitest';
import { SAINTS_PARTS } from '../saints';
import { SAINTS_CATALOG } from '../saints/catalog';

describe('Saints jersey parts', () => {
  // One `it` per jersey so a failure names the offending kit.
  for (const [name, part] of Object.entries(SAINTS_PARTS.jerseys)) {
    it(`draws the ${name} collar and both shoulder numerals`, () => {
      const ids = part.layers.map((layer) => layer.id);
      expect(ids.some((id) => id.includes('collar'))).toBe(true);
      expect(ids.filter((id) => id.includes('shoulder-number'))).toHaveLength(2);
    });
  }
});

describe('Saints catalog', () => {
  it('wears the one gold fleur shell on every design', () => {
    for (const design of SAINTS_CATALOG.designs) {
      expect(design.combinations.map((c) => c.helmet)).toEqual(['gold-fleur']);
    }
  });
});
