// Guards the two facts about Los Angeles that nothing else can catch: the shell mark is a union with
// no fill rule (an evenodd rule would hollow out the gold body inside its own keyline), and the pant
// options enumerated from the 2025 composite, of which only the canonical entry compiles — so a
// wrong list is invisible in every raster. The legs stay plain: the real pant's bolt is on the side
// seam, which a front-on figure cannot show.
import { describe, expect, it } from 'vitest';
import { CHARGERS_PARTS } from '../chargers';

describe('Chargers helmet parts', () => {
  // One `it` per shell so a failure names the offending helmet, per the data-integrity convention.
  for (const [name, part] of Object.entries(CHARGERS_PARTS.helmets)) {
    it(`paints the ${name} shell's bolt as a keyline under a body, with no fill rule`, () => {
      expect(part.layers.slice(0, 2).map((layer) => layer.id)).toEqual([
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

    it(`pairs the ${name} shell with its facemask`, () => {
      expect(part.facemask).toBe(name === 'navy' ? 'navy' : 'gold');
    });
  }

  it('paints the player numeral below the bolt on both shells', () => {
    expect(CHARGERS_PARTS.helmets.navy.layers.at(-1)).toMatchObject({
      id: 'chargers-navy-helmet-number',
      surface: 'helmet',
      fill: 'white',
    });
    expect(CHARGERS_PARTS.helmets.white.layers.at(-1)).toMatchObject({
      id: 'chargers-white-helmet-number',
      surface: 'helmet',
      fill: 'powderBlue',
    });
    expect(CHARGERS_PARTS.helmets.white.layers.at(-1)?.d).toBe(
      CHARGERS_PARTS.helmets.navy.layers.at(-1)?.d
    );
  });
});

describe('Charger Power jersey', () => {
  it('uses a white bolt within a powder-blue keyline on the gold body', () => {
    const jersey = CHARGERS_PARTS.jerseys.gold;
    expect(jersey.base).toBe('gold');
    expect(
      jersey.layers.slice(0, 4).map((layer) => (layer.kind === 'fill' ? layer.fill : null))
    ).toEqual(['powderBlue', 'powderBlue', 'white', 'white']);
    expect(CHARGERS_PARTS.kits['charger-power'].helmet).toBe('white');
  });
});

describe('Chargers pants parts', () => {
  it('offers the pant colors each kit is worn with, canonical first', () => {
    expect(CHARGERS_PARTS.kits.home.pants).toEqual(['gold', 'white', 'powder']);
    expect(CHARGERS_PARTS.kits.away.pants).toEqual(['gold', 'white', 'powder']);
    expect(CHARGERS_PARTS.kits['powder-blue'].pants).toEqual(['gold', 'white', 'powder']);
    expect(CHARGERS_PARTS.kits['charger-power'].pants).toEqual(['gold', 'white']);
  });

  it('reserves navy pants for the navy alternate', () => {
    expect(CHARGERS_PARTS.pants.navy).toBeDefined();
    for (const [name, ref] of Object.entries(CHARGERS_PARTS.kits)) {
      if (name === 'super-chargers') continue;
      expect(ref.pants).not.toContain('navy');
    }
    expect(CHARGERS_PARTS.kits['super-chargers']).toEqual({
      helmet: 'navy',
      jersey: 'navy',
      pants: 'navy',
    });
  });

  it('keeps each flat definition paired with its canonical pants', () => {
    const canonical = Object.fromEntries(
      Object.entries(CHARGERS_PARTS.kits).map(([kit, ref]) => [
        kit,
        Array.isArray(ref.pants) ? ref.pants[0] : ref.pants,
      ])
    );
    expect(canonical).toEqual({
      home: 'gold',
      away: 'gold',
      'powder-blue': 'gold',
      'charger-power': 'gold',
      'super-chargers': 'navy',
    });
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(CHARGERS_PARTS.pants)) {
    it(`leaves the ${name} leg plain — its bolt is on the side seam, invisible head-on`, () => {
      expect(part.layers).toEqual([]);
    });
  }
});
