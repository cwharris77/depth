// Guards the two facts about Los Angeles that nothing else can catch: the shell mark and the leg
// bolt are unions with no fill rule (an evenodd rule would hollow out the gold body inside its own
// keyline), and the pant options enumerated from the GUD 2025 composite, of which only the canonical
// entry compiles — so a wrong list is invisible in every raster.
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
      // The logo is one connected shape, so each element is a single subpath.
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
    it(`bolts the ${name} leg with a keyline and a body, both readable on it`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'chargers-leg-keyline-left',
        'chargers-leg-keyline-right',
        'chargers-leg-bolt-left',
        'chargers-leg-bolt-right',
      ]);
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, , body] = fills;
      // Three colors, three roles: neither mark color may be the leg it sits on, and the body has
      // to read against its own keyline or the bolt collapses into one flat shape.
      expect(keyline).not.toBe(part.base);
      expect(body).not.toBe(part.base);
      expect(keyline).not.toBe(body);
    });
  }
});
