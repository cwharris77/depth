import { describe, expect, it } from 'vitest';
import { compileParts, fromGeneric, type TeamPartsDefinition } from './parts';
import { GENERIC_UNIFORM_STYLE } from '../model';

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
