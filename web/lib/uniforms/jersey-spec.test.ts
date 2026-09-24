import { describe, expect, it } from 'vitest';
import { expandJersey } from '@/lib/uniforms/teams/core/jersey-spec';
import { compileParts } from '@/lib/uniforms/teams/core/parts';
import { FIGURE_OUTLINE } from '@/lib/uniforms/teams/core/shared';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('expandJersey', () => {
  it('maps the body and numeral weights onto the part', () => {
    const part = expandJersey('t', {
      body: 'orange',
      collar: { style: 'none' },
      number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
    });
    expect(part.base).toBe('orange');
    expect(part.number).toEqual({ fill: 'white', outline: 'navy', outlineWidth: 8 });
    expect(part.layers).toEqual([]);
  });

  it('draws every sleeve primitive on both sleeves with unique ids', () => {
    const part = expandJersey('t', {
      body: 'white',
      collar: { style: 'shallow-v', color: 'navy', trim: 'orange' },
      shoulderPanel: {
        bands: [
          { color: 'orange', size: 'l' },
          { color: 'navy', size: 'm' },
        ],
      },
      sleeveStripes: { bands: [{ color: 'navy', size: 's' }], gap: 'narrow' },
      cuff: { color: 'navy', size: 'm' },
      number: { fill: 'navy', outline: 'orange', outlineWeight: 'regular' },
    });
    const sleeves = part.layers.filter((l) => l.surface.startsWith('sleeve-'));
    expect(sleeves.filter((l) => l.surface === 'sleeve-left')).toHaveLength(4);
    expect(sleeves.filter((l) => l.surface === 'sleeve-right')).toHaveLength(4);
    const ids = part.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('slopes shoulder bands down toward the body on both sleeves', () => {
    const part = expandJersey('t', {
      body: 'orange',
      collar: { style: 'none' },
      shoulderPanel: {
        bands: [
          { color: 'white', size: 'l' },
          { color: 'navy', size: 'm' },
        ],
      },
      number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
    });
    for (const suffix of ['left', 'right']) {
      const band = part.layers.find((l) => l.id === `t-shoulder-1-${suffix}`);
      // M outerX,outerY L innerX,innerY ...
      const [, outerY, , innerY] = numbers(band?.d ?? '');
      expect(innerY).toBeGreaterThan(outerY);
    }
  });

  it('draws canted shoulder stripes only when asked, leaning toward the body', () => {
    const layers = (withStripes: boolean) =>
      expandJersey('t', {
        body: 'navy',
        collar: { style: 'none' },
        ...(withStripes && {
          shoulderStripes: {
            bands: [
              { color: 'white', size: 'l' },
              { color: 'orange', size: 'm' },
            ],
            gap: 'broad' as const,
          },
        }),
        number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
      }).layers;
    expect(layers(false)).toEqual([]);
    const stripes = layers(true);
    expect(stripes.map((l) => [l.id, l.surface, l.kind === 'fill' && l.fill])).toEqual([
      ['t-shoulder-stripe-0-left', 'sleeve-left', 'white'],
      ['t-shoulder-stripe-0-right', 'sleeve-right', 'white'],
      ['t-shoulder-stripe-1-left', 'sleeve-left', 'orange'],
      ['t-shoulder-stripe-1-right', 'sleeve-right', 'orange'],
    ]);
    // M outerTopX,topY L innerTopX,topY L innerBottomX,bottomY L outerBottomX,bottomY Z
    const corners = (id: string) => numbers(stripes.find((l) => l.id === id)?.d ?? '');
    const [ltx0, , ltx1, , lbx1] = corners('t-shoulder-stripe-0-left');
    const [rtx0, , rtx1, , rbx1] = corners('t-shoulder-stripe-0-right');
    expect(ltx1 - ltx0).toBe(28);
    expect(lbx1).toBeGreaterThan(ltx1);
    expect(rbx1).toBeLessThan(rtx1);
    expect(rtx0 + ltx0).toBe(588);
    // The second stripe sits one broad gap outboard of the first.
    const [, , ltx1b] = corners('t-shoulder-stripe-1-left');
    expect(ltx0 - ltx1b).toBe(18);
  });

  it('fills the inset-V neck opening with the inside color when given', () => {
    const layers = (inside?: string) =>
      expandJersey('t', {
        body: 'orange',
        collar: { style: 'inset-v', color: 'navy', inside },
        number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
      }).layers;
    const opening = (ls: ReturnType<typeof layers>) => ls.find((l) => l.id === 't-neck-opening');
    expect(opening(layers())).toMatchObject({ fill: 'orange' });
    expect(opening(layers('orangeNeck'))).toMatchObject({ fill: 'orangeNeck' });
  });

  it('adds lining, back bar and outline layers to the shared collar only when asked', () => {
    const ids = (extra: { lining?: string; backBar?: string; outline?: boolean } = {}) =>
      expandJersey('t', {
        body: 'orange',
        collar: { style: 'inset-v', color: 'orange', ...extra },
        number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
      }).layers.map((l) => l.id);
    expect(ids()).toEqual([
      't-neck-opening',
      't-collar-edge',
      't-collar-inset',
      't-collar-placket',
    ]);
    expect(ids({ lining: 'navy', backBar: 'navy', outline: true }).slice(4)).toEqual([
      't-collar-back',
      't-collar-lining-left',
      't-collar-lining-right',
      't-collar-outline-outer',
      't-collar-outline-inner',
    ]);
  });

  it('resolves the collar outline to the shared figure grey', () => {
    const def = compileParts({
      teamId: 't',
      palette: { orange: '#FB4F14', white: '#FFFFFF', navy: '#002244' },
      helmets: { h: { base: 'navy', layers: [] } },
      jerseys: {
        j: expandJersey('t', {
          body: 'orange',
          collar: { style: 'inset-v', color: 'orange', outline: true },
          number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
        }),
      },
      pants: { p: { base: 'white', layers: [] } },
      kits: { home: { helmet: 'h', jersey: 'j', pants: 'p' } },
    });
    expect(JSON.stringify(def)).toContain(FIGURE_OUTLINE);
  });

  it('draws no collar layers for style none', () => {
    const part = expandJersey('t', {
      body: 'orange',
      collar: { style: 'none', color: 'navy' },
      number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
    });
    expect(part.layers.filter((l) => l.surface === 'collar')).toEqual([]);
  });
});
