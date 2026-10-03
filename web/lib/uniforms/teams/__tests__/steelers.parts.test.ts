// Guards the facts about Pittsburgh that no raster check catches: every jersey draws a collar, the
// home and away jerseys draw both shoulder numerals, and the catalog's kits stay as authored.
import { describe, expect, it } from 'vitest';
import { STEELERS_PARTS } from '../steelers';
import { STEELERS_CATALOG } from '../steelers/catalog';

describe('Steelers jersey parts', () => {
  // One `it` per jersey so a failure names the offending kit.
  for (const [name, part] of Object.entries(STEELERS_PARTS.jerseys)) {
    it(`draws the ${name} collar`, () => {
      expect(part.layers.some((layer) => layer.id.includes('collar'))).toBe(true);
    });
  }

  for (const name of ['black', 'white']) {
    it(`draws both ${name} shoulder numerals`, () => {
      const ids = STEELERS_PARTS.jerseys[name].layers.map((layer) => layer.id);
      expect(ids.filter((id) => id.includes('shoulder-number'))).toHaveLength(2);
    });
  }
});

describe('Steelers catalog', () => {
  it('wears the black shell on home and away and the gold shell on the throwback', () => {
    const helmets = Object.fromEntries(
      STEELERS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => c.helmet)])
    );
    expect(helmets).toEqual({ home: ['black'], away: ['black'], bumblebee: ['gold'] });
  });
});
