// Guards the two facts about Los Angeles that nothing else can catch: the shell mark is a union with
// no fill rule (an evenodd rule would hollow out the gold body inside its own keyline), and the pant
// options enumerated from the GUD 2025 composite, of which only the canonical entry compiles — so a
// wrong list is invisible in every raster. The legs stay plain: the real pant's bolt is on the side
// seam, which a front-on figure cannot show.
import { describe, expect, it } from 'vitest';
import { CHARGERS_PARTS } from './chargers.parts';

describe('Chargers helmet parts', () => {
  // One `it` per shell so a failure names the offending helmet, per the data-integrity convention.
  for (const [name, part] of Object.entries(CHARGERS_PARTS.helmets)) {
    it(`paints the ${name} shell's bolt as a keyline under a body, with no fill rule`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'chargers-decal-keyline',
        'chargers-decal-bolt',
      ]);
      for (const layer of part.layers) {
        expect(layer).toMatchObject({ surface: 'helmet', kind: 'fill', clip: true });
        expect(layer).not.toHaveProperty('fillRule');
      }
      // Keyline and body are each one connected region, so each is a single subpath.
      for (const layer of part.layers) expect(layer.d?.match(/Z/g)).toHaveLength(1);
    });

    it(`paints the ${name} shell's cage gold, as every figure on the composite draws it`, () => {
      expect(part.facemask).toBe('gold');
    });
  }
});

describe('Chargers pants parts', () => {
  it('offers the pant colors each kit is worn with, canonical first', () => {
    expect(CHARGERS_PARTS.kits.home.pants).toEqual(['gold', 'white', 'powder']);
    expect(CHARGERS_PARTS.kits.away.pants).toEqual(['gold', 'white', 'powder']);
    expect(CHARGERS_PARTS.kits['powder-blue'].pants).toEqual(['gold', 'white', 'powder']);
  });

  it('keeps navy off every kit, since it is worn only with the navy alternate top', () => {
    expect(CHARGERS_PARTS.pants.navy).toBeDefined();
    for (const ref of Object.values(CHARGERS_PARTS.kits)) {
      expect(ref.pants).not.toContain('navy');
    }
  });

  it('keeps the flat definition pairing canonical so the committed rasters are unchanged', () => {
    const canonical = Object.fromEntries(
      Object.entries(CHARGERS_PARTS.kits).map(([kit, ref]) => [
        kit,
        Array.isArray(ref.pants) ? ref.pants[0] : ref.pants,
      ])
    );
    expect(canonical).toEqual({ home: 'gold', away: 'gold', 'powder-blue': 'gold' });
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(CHARGERS_PARTS.pants)) {
    it(`leaves the ${name} leg plain — its bolt is on the side seam, invisible head-on`, () => {
      expect(part.layers).toEqual([]);
    });
  }
});
