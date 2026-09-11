// Guards the two facts about Los Angeles that nothing else can catch: the horn is one layer with no
// fill rule (its two subpaths are a union, and an evenodd rule would punch the crescent hollow), and
// the pant options enumerated from the GUD 2025 composite, of which only the canonical entry compiles
// so a wrong list is invisible in every raster.
import { describe, expect, it } from 'vitest';
import { RAMS_PARTS } from './rams.parts';

describe('Rams helmet parts', () => {
  // One `it` per shell so a failure names the offending helmet, per the data-integrity convention.
  for (const [name, part] of Object.entries(RAMS_PARTS.helmets)) {
    it(`paints the ${name} shell's horn as a single unfilled-rule union`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual(['rams-decal-horn']);
      const [horn] = part.layers;
      expect(horn).toMatchObject({ surface: 'helmet', kind: 'fill', clip: true });
      expect(horn).not.toHaveProperty('fillRule');
      // Two subpaths: the lower crescent and the tail the spiral's tip laps back over.
      expect(horn.d?.match(/Z/g)).toHaveLength(2);
    });
  }

  it('paints the cage the shell color on both shells', () => {
    expect(RAMS_PARTS.helmets.royal.facemask).toBe('royal');
    expect(RAMS_PARTS.helmets.rivalries.facemask).toBe('navy');
  });
});

describe('Rams pants parts', () => {
  it('offers the pant colors each kit is worn with, canonical first', () => {
    expect(RAMS_PARTS.kits.home.pants).toEqual(['gold', 'bone']);
    expect(RAMS_PARTS.kits.away.pants).toEqual(['royal', 'gold']);
    expect(RAMS_PARTS.kits.bone.pants).toEqual(['bone']);
    expect(RAMS_PARTS.kits['rivalries-2025'].pants).toEqual(['navy']);
  });

  it('keeps the flat definition pairing canonical so the committed rasters are unchanged', () => {
    const canonical = Object.fromEntries(
      Object.entries(RAMS_PARTS.kits).map(([kit, ref]) => [
        kit,
        Array.isArray(ref.pants) ? ref.pants[0] : ref.pants,
      ])
    );
    expect(canonical).toEqual({
      home: 'gold',
      away: 'royal',
      bone: 'bone',
      'rivalries-2025': 'navy',
    });
  });

  // One `it` per leg so a failure names the offending pant, per the data-integrity convention.
  for (const [name, part] of Object.entries(RAMS_PARTS.pants)) {
    it(`stripes the ${name} leg with a keyline and a band`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'generic-pants-stripe-left',
        'generic-pants-stripe-right',
        'rams-stripe-band-left',
        'rams-stripe-band-right',
      ]);
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, , band] = fills;
      // The stripe has to read against the leg it sits on. Royal legs are the documented exception:
      // their stripe is one flattened ramp, so the keyline and the band are the same white.
      expect(keyline).not.toBe(part.base);
      expect(band).not.toBe(part.base);
      if (name !== 'royal') expect(keyline).not.toBe(band);
    });
  }
});
