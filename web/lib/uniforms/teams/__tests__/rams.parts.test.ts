// Guards the facts about Los Angeles that no raster check catches: the horn is one layer with no
// fill rule (its two subpaths are a union, and an evenodd rule would punch the crescent hollow),
// and the pant and sock pairings each kit is worn with.
import { describe, expect, it } from 'vitest';
import { RAMS_PARTS, RAMS_UNIFORMS_FROM_PARTS } from '../rams';
import { JERSEY_NUMBER_THREE } from '../../jersey-art';
import { RAMS_NUMBER_THREE } from '../rams/marks/numbers';
import { boundsOf } from '../core/marks';
import { RAMS_CATALOG } from '../rams/catalog';
import {
  RAMS_JERSEY_CLASSIC_SOL,
  RAMS_JERSEY_FEARSOME_WHITE,
} from '../rams/jerseys/alternates-2026';

describe('Rams helmet parts', () => {
  // One `it` per shell so a failure names the offending helmet.
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

  it('paints the cage the shell colour on both shells', () => {
    expect(RAMS_PARTS.helmets['royal-horn'].facemask).toBe('royal');
    expect(RAMS_PARTS.helmets['navy-horn'].facemask).toBe('navy');
  });
});

describe('Rams catalog', () => {
  it('lists the pants and socks each design is worn with, canonical first', () => {
    const pairs = Object.fromEntries(
      RAMS_CATALOG.designs.map((d) => [d.slug, d.combinations.map((c) => [c.pants, c.socks])])
    );
    expect(pairs).toEqual({
      home: [
        ['gold', 'royal'],
        ['bone', 'royal'],
      ],
      away: [
        ['royal', 'royal'],
        ['gold', 'royal'],
      ],
      'rivalries-2025': [['navy', 'navy']],
      bone: [['bone', 'bone']],
      'home-2026': [['sol-2026', 'royal']],
      'away-2026': [['white-2026', 'white']],
      'classic-sol': [['classic-sol', 'white']],
      'fearsome-white': [['fearsome-white', 'white']],
    });
  });
});

describe('Rams pants parts', () => {
  // One `it` per leg so a failure names the offending pant. Classic Sol's triple stripe is its own
  // construction, checked below.
  for (const [name, part] of Object.entries(RAMS_PARTS.pants)) {
    if (name === 'classic-sol') continue;
    it(`stripes the ${name} leg with a keyline and a band`, () => {
      expect(part.layers.map((layer) => layer.id)).toEqual([
        'rams-stripe-keyline-left',
        'rams-stripe-keyline-right',
        'rams-stripe-band-left',
        'rams-stripe-band-right',
      ]);
      const fills = part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke));
      const [keyline, , band] = fills;
      // The stripe has to read against the leg it sits on. Royal legs carry one white stripe, so
      // the keyline and the band are the same colour there.
      expect(keyline).not.toBe(part.base);
      expect(band).not.toBe(part.base);
      if (name !== 'royal') expect(keyline).not.toBe(band);
    });
  }

  it('stripes the classic-sol leg royal, Sol, royal from the outer edge in', () => {
    const part = RAMS_PARTS.pants['classic-sol'];
    expect(part.base).toBe('white');
    expect(part.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : layer.stroke))).toEqual(
      ['royal', 'royal', 'yellow', 'yellow', 'royal', 'royal']
    );
  });
});

describe('Rams jerseys', () => {
  it('gives Classic Sol a wider middle sleeve stripe', () => {
    expect(RAMS_JERSEY_CLASSIC_SOL.sleeveStripes).toMatchObject({
      bands: [{ size: 's' }, { size: 'm' }, { size: 's' }],
    });
  });
  it('uses the same Sol paint for the 2020 helmet, pants and white jersey sleeves', () => {
    const helmet = RAMS_UNIFORMS_FROM_PARTS.kits.away.layers?.find((l) =>
      l.id.includes('decal-horn')
    );
    const cuff = RAMS_UNIFORMS_FROM_PARTS.kits.away.layers?.find((l) => l.id.includes('cuff'));
    expect(helmet && 'fill' in helmet && helmet.fill).toBe(cuff && 'fill' in cuff && cuff.fill);
    expect(RAMS_PARTS.palette.gold).toBe(RAMS_PARTS.palette.yellow);
  });

  it('uses a white outer collar on Fearsome White', () => {
    expect(RAMS_JERSEY_FEARSOME_WHITE.collar).toMatchObject({ color: 'white' });
  });

  it('shows the chest label on each 2020-era jersey', () => {
    for (const name of ['royal', 'white', 'bone'] as const) {
      expect(
        RAMS_PARTS.jerseys[name].layers.some((layer) => layer.id.includes('chest-label'))
      ).toBe(true);
    }
  });

  it('shows the Midnight Mode inside-neck inscription', () => {
    expect(
      RAMS_PARTS.jerseys.rivalries.layers.some((layer) => layer.id.includes('neck-inscription'))
    ).toBe(true);
  });
  it('places Midnight Mode Nike marks midway down the blue sleeve panels', () => {
    const marks = RAMS_UNIFORMS_FROM_PARTS.kits['rivalries-2025'].layers?.filter((l) =>
      l.id.includes('sleeve-nike')
    );
    expect(marks).toHaveLength(2);
    for (const mark of marks ?? []) {
      const box = boundsOf(mark.d);
      expect((box[1] + box[3]) / 2).toBeCloseTo(490);
    }
  });
  it('uses the Rams numeral construction instead of the shared athletic three', () => {
    for (const name of ['royal', 'white', 'rivalries', 'bone'] as const) {
      const number = RAMS_PARTS.jerseys[name].number;
      expect(number?.glyphPath).toBeDefined();
      expect(number?.glyphPath).not.toBe(JERSEY_NUMBER_THREE);
      expect(number?.glyphPath).toBe(RAMS_NUMBER_THREE);
      expect(number?.glyphLabel).toBe('3');
    }
  });

  it('fades royal numerals from yellow to white and keeps the away cuff yellow', () => {
    expect(RAMS_UNIFORMS_FROM_PARTS.kits.home.number?.fill).toBe('pattern:rams-number-fade');
    const cuff = RAMS_UNIFORMS_FROM_PARTS.kits.away.layers?.filter((l) => l.id.includes('cuff'));
    expect(cuff?.length).toBeGreaterThan(0);
    expect(cuff?.every((l) => l.kind === 'fill' && l.fill === '#FFD100')).toBe(true);
  });

  it('draws a collar on every jersey', () => {
    for (const jersey of Object.values(RAMS_PARTS.jerseys)) {
      expect(jersey.layers.some((l) => l.id.includes('collar'))).toBe(true);
    }
  });

  it('wraps the horn from the shoulder into each horn jersey sleeve', () => {
    for (const jerseyName of ['royal', 'white', 'rivalries'] as const) {
      const hornLayers = RAMS_PARTS.jerseys[jerseyName].layers.filter((layer) =>
        layer.id.includes('horn')
      );

      expect(hornLayers).toHaveLength(jerseyName === 'white' ? 6 : 4);
      expect(hornLayers.every((layer) => layer.d?.includes('C'))).toBe(true);

      const yCoordinates = hornLayers.flatMap((layer) =>
        (layer.d?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, index) => index % 2 === 1)
      );
      expect(Math.min(...yCoordinates)).toBeLessThanOrEqual(400);
      expect(Math.max(...yCoordinates)).toBeGreaterThanOrEqual(530);
    }
  });

  it('extends the 2020 shoulder horn flush to the sleeve bottom without a taper', () => {
    for (const name of ['royal', 'white'] as const) {
      const bands = RAMS_PARTS.jerseys[name].layers.filter((l) => l.id.includes('horn-band'));
      expect(bands).toHaveLength(2);
      for (const band of bands) {
        expect(boundsOf(band.d)[3]).toBe(589);
        const hemXs = Array.from(band.d.matchAll(/(?:L|M)(\d+),589/g), (m) => Number(m[1]));
        expect(hemXs).toHaveLength(2);
        expect(Math.abs(hemXs[0] - hemXs[1])).toBeGreaterThan(40);
      }
    }
  });

  it('uses the rounded numeral on Bone sleeve TV numbers too', () => {
    const numbers = RAMS_PARTS.jerseys.bone.layers.filter((l) => l.id.includes('sleeve-number'));
    expect(numbers).toHaveLength(2);
    expect(numbers.every((l) => l.d.includes('C'))).toBe(true);
  });

  it('gives Midnight Mode a distinct front sleeve construction', () => {
    const cappedHornPaths = RAMS_PARTS.jerseys.royal.layers.map((layer) => layer.d);
    const frontHornPaths = RAMS_PARTS.jerseys.rivalries.layers.map((layer) => layer.d);

    expect(frontHornPaths).not.toEqual(cappedHornPaths);
  });

  it('keeps the hornless Bone jersey free of sleeve-horn layers', () => {
    expect(RAMS_PARTS.jerseys.bone.layers.some((layer) => layer.id.includes('horn'))).toBe(false);
  });
});
