// Guards the facts about Baltimore that no raster check catches: every jersey draws a grey-keylined
// collar, and the one shell, one pant and the catalog's kits stay as authored.
import { describe, expect, it } from 'vitest';
import { RAVENS_PARTS } from '../ravens';
import { RAVENS_CATALOG } from '../ravens/catalog';
import { RAVENS_NUMBER_THREE } from '../ravens/marks/numbers';
import { boundsOf } from '../core/marks';

describe('Ravens jersey parts', () => {
  // One `it` per jersey so a failure names the offending kit.
  for (const [name, part] of Object.entries(RAVENS_PARTS.jerseys).filter(
    ([name]) => !name.endsWith('-2026')
  )) {
    it(`draws the ${name} collar, shoulder numerals, sleeve bands and shields`, () => {
      const ids = part.layers.map((layer) => layer.id);
      expect(ids.some((id) => id.includes('collar'))).toBe(true);
      expect(ids.some((id) => id.includes('ravens-shoulder-'))).toBe(false);
      for (const side of ['left', 'right']) {
        expect(ids.some((id) => id.endsWith(`-shoulder-number-${side}`))).toBe(true);
        expect(ids).toContain(`ravens-sleeve-band-${side}`);
        expect(ids).toContain(`ravens-shield-border-${side}`);
      }
    });
  }
});

describe('Ravens numerals', () => {
  it('draws every jersey with the round 3 on the chest and both shoulders', () => {
    for (const part of Object.values(RAVENS_PARTS.jerseys)) {
      const glyph = part.number?.glyphPath ?? '';
      expect(glyph.replace(/-?\d+(?:\.\d+)?/g, '')).toBe(
        RAVENS_NUMBER_THREE.replace(/-?\d+(?:\.\d+)?/g, '')
      );
      const [x0, top, x1] = boundsOf(RAVENS_NUMBER_THREE);
      expect(boundsOf(glyph)).toEqual([x0, top, x1, top + 200]);
      const shoulder = part.layers.find((layer) => layer.id.endsWith('-shoulder-number-left'));
      // The shared block numeral has no curves.
      expect(shoulder?.d).toContain('Q');
    }
  });
});

describe('Ravens catalog', () => {
  it('wears the one black shell and purple pants on every design', () => {
    for (const design of RAVENS_CATALOG.designs.filter(
      (design) => !design.slug.endsWith('-2026')
    )) {
      expect(design.combinations.map((c) => [c.helmet, c.pants])).toEqual([['black', 'purple']]);
    }
  });
});

describe('Ravens replacement combinations', () => {
  it('pairs the new home with white pants and the new away with purple pants', () => {
    const current = RAVENS_CATALOG.designs.filter((design) => design.slug.endsWith('-2026'));
    expect(current.map((design) => design.combinations.map((c) => [c.helmet, c.pants]))).toEqual([
      [['black-2026', 'white-2026']],
      [['black-2026', 'purple-2026']],
    ]);
  });
});
