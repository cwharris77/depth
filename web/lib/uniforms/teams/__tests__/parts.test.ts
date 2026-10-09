import { describe, expect, it } from 'vitest';
import { compileParts, fromGeneric, type TeamPartsDefinition } from '../core/parts';
import { boundsOf } from '../core/marks';
import { GENERIC_UNIFORM_STYLE } from '../../model';

// The authoring layer's guarantees. The palette-key throw is the important one: without it a
// typo falls through resolveColor's `return colors.primary` and paints a plausible-but-wrong
// color at render time, which no raster test would flag as wrong — only as different.

const base: TeamPartsDefinition = {
  teamId: 'test',
  palette: { navy: '#001122', white: '#FFFFFF' },
  helmets: { plain: { base: 'navy', layers: [] } },
  jerseys: {
    plain: {
      base: 'white',
      layers: [],
      number: { fill: 'navy', outline: 'white', outlineWidth: 26 },
    },
  },
  pants: { plain: { base: 'navy', layers: [] } },
  kits: { home: { helmet: 'plain', jersey: 'plain', pants: 'plain' } },
};

describe('compileParts', () => {
  it('places fixed NFL colors and a palette-colored Nike mark on branded pants only', () => {
    const def = structuredClone(base);
    def.kits.home.pantsNike = 'white';
    def.kits.archive = { helmet: 'plain', jersey: 'plain', pants: 'plain' };
    const kits = compileParts(def).kits;
    const layers = kits.home.layers ?? [];
    expect(layers.find((layer) => layer.id === 'test-pants-plain-nike')).toMatchObject({
      surface: 'pants',
      fill: '#FFFFFF',
      clip: true,
    });
    const shield = layers.filter((layer) => layer.id.includes('-pants-plain-nfl-shield-'));
    expect(shield.length).toBeGreaterThan(3);
    expect(shield.some((layer) => layer.kind === 'fill' && layer.fill === '#05366B')).toBe(true);
    const nike = layers.find((layer) => layer.id === 'test-pants-plain-nike');
    const nikeBox = boundsOf(nike?.d ?? '');
    const shieldBox = boundsOf(shield[0].d);
    expect(shieldBox[0]).toBeGreaterThan(176);
    expect(shieldBox[2]).toBeLessThan(294);
    expect(nikeBox[0]).toBeGreaterThan(294);
    expect(nikeBox[2]).toBeLessThan(412);
    for (const box of [nikeBox, shieldBox]) {
      expect(box[1]).toBeGreaterThan(807);
      expect(box[3]).toBeLessThan(909);
    }
    expect(kits.archive.layers).toEqual([]);
  });

  it('does not silently replace an invalid pants logo paint with a team color', () => {
    const def = structuredClone(base);
    def.kits.home.pantsNike = 'missing';
    expect(() => compileParts(def)).toThrow(/unknown palette color "missing"/);
  });

  it.each(['constructor', 'toString', '__proto__'])('rejects inherited paint name %s', (ref) => {
    const def = structuredClone(base);
    def.kits.home.pantsNike = ref;
    expect(() => compileParts(def)).toThrow(/unknown palette color/);
  });

  it('substitutes palette keys for literal hexes', () => {
    const kit = compileParts(base).kits.home;
    expect(kit.helmetColor).toBe('#001122');
    expect(kit.jerseyColor).toBe('#FFFFFF');
    expect(kit.pantsColor).toBe('#001122');
    expect(kit.number).toMatchObject({ fill: '#001122', outline: '#FFFFFF' });
  });

  it('strips every generic layer, because parts are total', () => {
    const removed = compileParts(base).kits.home.removeLayerIds ?? [];
    for (const layer of GENERIC_UNIFORM_STYLE.layers) expect(removed).toContain(layer.id);
  });

  it('passes readable-on-body through uncompiled, since it resolves against the body at render', () => {
    const def = structuredClone(base);
    def.jerseys.plain.number = { fill: 'readable-on-body', outline: 'navy', outlineWidth: 26 };
    expect(compileParts(def).kits.home.number).toMatchObject({ fill: 'readable-on-body' });
  });

  it('throws on an unknown palette key rather than silently painting primary', () => {
    const def = structuredClone(base);
    def.helmets.plain.base = 'navyy';
    expect(() => compileParts(def)).toThrow(/unknown palette color "navyy"/);
  });

  it('throws on a kit referencing a part that does not exist', () => {
    const def = structuredClone(base);
    def.kits.home.jersey = 'missing';
    expect(() => compileParts(def)).toThrow(/unknown jersey part "missing"/);
  });

  it('assembles layers helmet then jersey then pants', () => {
    const def = structuredClone(base);
    def.helmets.plain.layers = [
      { id: 'h', surface: 'helmet', d: 'M0,0', clip: true, kind: 'fill', fill: 'white' },
    ];
    def.jerseys.plain.layers = [
      { id: 'j', surface: 'jersey', d: 'M0,0', clip: true, kind: 'fill', fill: 'navy' },
    ];
    def.pants.plain.layers = [
      { id: 'p', surface: 'pants', d: 'M0,0', clip: true, kind: 'fill', fill: 'navy' },
    ];
    expect(compileParts(def).kits.home.layers?.map((l) => l.id)).toEqual(['h', 'j', 'p']);
  });

  it('compiles pattern shape colors without flattening the pattern reference', () => {
    const def = structuredClone(base);
    def.patterns = {
      knit: {
        width: 8,
        height: 8,
        shapes: [{ d: 'M0,0 H2 V8 H0 Z', fill: 'navy' }],
      },
    };
    def.jerseys.plain.layers = [
      {
        id: 'knit',
        surface: 'collar',
        d: 'M0,0',
        clip: true,
        kind: 'fill',
        fill: 'pattern:knit',
      },
    ];
    const compiled = compileParts(def);
    expect(compiled.patterns?.knit.shapes[0].fill).toBe('#001122');
    expect(compiled.kits.home.layers?.[0]).toMatchObject({ fill: 'pattern:knit' });
  });

  it('compiles a socks part into the sock colour and appends its layers last', () => {
    const def: TeamPartsDefinition = {
      ...base,
      socks: {
        white: {
          base: 'white',
          layers: [
            { id: 's', surface: 'sock-left', d: 'M0,0', clip: true, kind: 'fill', fill: 'navy' },
          ],
        },
      },
      kits: { home: { helmet: 'plain', jersey: 'plain', pants: 'plain', socks: 'white' } },
    };
    const kit = compileParts(def).kits.home;
    expect(kit.socksColor).toBe('#FFFFFF');
    expect(kit.layers?.at(-1)).toMatchObject({ id: 's', fill: '#001122' });
  });

  it('leaves the sock colour unset when a kit names no socks', () => {
    expect(compileParts(base).kits.home).not.toHaveProperty('socksColor');
  });

  it('throws on an unknown socks part', () => {
    const def: TeamPartsDefinition = {
      ...base,
      kits: { home: { helmet: 'plain', jersey: 'plain', pants: 'plain', socks: 'missing' } },
    };
    expect(() => compileParts(def)).toThrow('unknown socks part "missing"');
  });
});

describe('fromGeneric', () => {
  it('keeps the mannequin geometry and swaps in a palette color', () => {
    const generic = GENERIC_UNIFORM_STYLE.layers.find((l) => l.id === 'generic-pants-stripe-left')!;
    const layer = fromGeneric('generic-pants-stripe-left', 'navy');
    expect(layer.d).toBe(generic.d);
    expect(layer).toMatchObject({ kind: 'fill', fill: 'navy' });
  });

  it('swaps the stroke color on a stroke layer', () => {
    expect(fromGeneric('generic-collar', 'white')).toMatchObject({
      kind: 'stroke',
      stroke: 'white',
    });
  });

  it('throws on an unknown generic layer id', () => {
    expect(() => fromGeneric('generic-nope', 'navy')).toThrow(/unknown generic layer/);
  });
});
