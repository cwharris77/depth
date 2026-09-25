import { describe, expect, it } from 'vitest';
import { expandJersey, type JerseySpec } from '@/lib/uniforms/teams/core/jersey-spec';
import { compileParts, type PartLayer } from '@/lib/uniforms/teams/core/parts';
import { FIGURE_OUTLINE } from '@/lib/uniforms/teams/core/shared';
import { placed, type Mark } from '@/lib/uniforms/teams/core/marks';

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

  it('lays a shoulder numeral along each shoulder only when asked', () => {
    const layers = (shoulderNumber?: { fill: string; outline?: string }) =>
      expandJersey('t', {
        body: 'navy',
        collar: { style: 'none' },
        shoulderNumber,
        number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
      }).layers;
    expect(layers()).toEqual([]);
    expect(layers({ fill: 'white' }).map((l) => [l.id, l.surface, l.kind])).toEqual([
      ['t-shoulder-number-left', 'sleeve-left', 'fill'],
      ['t-shoulder-number-right', 'sleeve-right', 'fill'],
    ]);
    const outlined = layers({ fill: 'white', outline: 'orange' });
    expect(outlined.map((l) => [l.id, l.kind])).toEqual([
      ['t-shoulder-number-outline-left', 'stroke'],
      ['t-shoulder-number-outline-right', 'stroke'],
      ['t-shoulder-number-left', 'fill'],
      ['t-shoulder-number-right', 'fill'],
    ]);
    const centre = (d: string) => {
      const n = numbers(d);
      const xs = n.filter((_, i) => i % 2 === 0);
      const ys = n.filter((_, i) => i % 2 === 1);
      return [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2,
        Math.max(...xs) - Math.min(...xs),
      ];
    };
    const [lx, ly, lw] = centre(outlined[2].d);
    const [rx, ry, rw] = centre(outlined[3].d);
    // Lying along the shoulder, and the right sleeve mirrors the left (open sides both to the back).
    expect(lw).toBeGreaterThan(25);
    expect(lx + rx).toBeCloseTo(588, 0);
    expect(ly).toBeCloseTo(ry, 0);
    expect(lw).toBeCloseTo(rw, 0);
  });

  it('pipes sleeve stripes with an edge colour only when asked', () => {
    const layers = (edge?: string) =>
      expandJersey('t', {
        body: 'navy',
        collar: { style: 'none' },
        sleeveStripes: {
          bands: [
            { color: 'orange', size: 's' },
            { color: 'orange', size: 's' },
          ],
          gap: 'wide',
          edge,
        },
        number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
      }).layers;
    const plain = layers();
    expect(plain.map((l) => l.id)).toEqual([
      't-stripe-0-left',
      't-stripe-0-right',
      't-stripe-1-left',
      't-stripe-1-right',
    ]);
    const piped = layers('white');
    expect(piped.map((l) => [l.id, l.kind === 'fill' && l.fill])).toEqual([
      ['t-stripe-0-edge-left', 'white'],
      ['t-stripe-0-edge-right', 'white'],
      ['t-stripe-0-left', 'orange'],
      ['t-stripe-0-right', 'orange'],
      ['t-stripe-1-edge-left', 'white'],
      ['t-stripe-1-edge-right', 'white'],
      ['t-stripe-1-left', 'orange'],
      ['t-stripe-1-right', 'orange'],
    ]);
    // M outer,top L inner,top L inner,bottom L outer,bottom Z
    const span = (id: string) => {
      const n = numbers(piped.find((l) => l.id === id)?.d ?? '');
      return [n[1], n[5]];
    };
    const [edgeTop, edgeBottom] = span('t-stripe-0-edge-left');
    const [coreTop, coreBottom] = span('t-stripe-0-left');
    expect(coreTop - edgeTop).toBe(3);
    expect(edgeBottom - coreBottom).toBe(3);
    // The wide gap is measured between the pipings.
    expect(span('t-stripe-1-edge-left')[0] - edgeBottom).toBe(12);
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

  it('always draws the back bar and adds lining and outline layers only when asked', () => {
    const layers = (extra: { lining?: string; backBar?: string; outline?: boolean } = {}) =>
      expandJersey('t', {
        body: 'orange',
        collar: { style: 'inset-v', color: 'orange', ...extra },
        number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
      }).layers;
    const ids = (extra?: Parameters<typeof layers>[0]) => layers(extra).map((l) => l.id);
    expect(ids()).toEqual([
      't-neck-opening',
      't-collar-edge',
      't-collar-inset',
      't-collar-placket',
      't-collar-back',
    ]);
    const back = (extra?: Parameters<typeof layers>[0]) =>
      layers(extra).find((l) => l.id === 't-collar-back');
    expect(back()).toMatchObject({ fill: 'orange' });
    expect(back({ backBar: 'navy' })).toMatchObject({ fill: 'navy' });
    expect(ids({ lining: 'navy', outline: true }).slice(5)).toEqual([
      't-collar-lining-left',
      't-collar-lining-right',
      't-collar-outline-outer',
      't-collar-outline-inner',
      't-collar-outline-back',
    ]);
  });

  it('draws an upright sleeve number on each sleeve only when asked', () => {
    const layers = (sleeveNumber?: { fill: string }) =>
      expandJersey('t', {
        body: 'navy',
        collar: { style: 'none' },
        sleeveNumber,
        number: { fill: 'white', outline: 'navy', outlineWeight: 'none' },
      }).layers;
    expect(layers()).toEqual([]);
    const [left, right] = layers({ fill: 'white' });
    expect(left).toMatchObject({
      id: 't-sleeve-number-left',
      surface: 'sleeve-left',
      fill: 'white',
    });
    expect(right).toMatchObject({ id: 't-sleeve-number-right', surface: 'sleeve-right' });
    const box = (d: string) => {
      const n = numbers(d);
      const xs = n.filter((_, i) => i % 2 === 0);
      const ys = n.filter((_, i) => i % 2 === 1);
      return { x0: Math.min(...xs), x1: Math.max(...xs), h: Math.max(...ys) - Math.min(...ys) };
    };
    const l = box(left.d);
    const r = box(right.d);
    expect(l.x0).toBeGreaterThanOrEqual(30);
    expect(l.x1).toBeLessThanOrEqual(96);
    expect(r.x0).toBeGreaterThanOrEqual(492);
    expect(r.x1).toBeLessThanOrEqual(558);
    expect(l.h).toBeCloseTo(40, 0);
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

describe('jersey marks', () => {
  const base: JerseySpec = {
    body: 'navy',
    collar: { style: 'none' },
    number: { fill: 'white', outline: 'orange', outlineWeight: 'none' },
  };
  const art = (id: string): PartLayer => ({
    id,
    surface: 'sleeve-left',
    d: 'M0,0 L1,0 L1,1 Z',
    clip: true,
    kind: 'fill',
    fill: 'white',
  });
  const TRIANGLE: Mark<'body'> = {
    box: [0, 0, 10, 10],
    paths: [{ slot: 'body', d: 'M0,0 L10,0 L10,10 Z' }],
  };

  it('paints under-marks before the construction and over-marks after it', () => {
    const plain = expandJersey('t', base).layers;
    const part = expandJersey('t', {
      ...base,
      marks: [
        { paint: 'over', mark: placed([art('over')]) },
        { paint: 'under', mark: placed([art('under')]) },
      ],
    });
    expect(part.layers.map((l) => l.id)).toEqual(['under', ...plain.map((l) => l.id), 'over']);
  });

  it('places an anchored mark on both sleeves with its slots mapped', () => {
    const part = expandJersey('t', {
      ...base,
      marks: [
        { paint: 'over', mark: TRIANGLE, anchor: 'sleeves', slots: { body: 'white' }, id: 'logo' },
      ],
    });
    const ids = part.layers.map((l) => l.id);
    expect(ids).toContain('t-logo-body-left');
    expect(ids).toContain('t-logo-body-right');
  });

  it('places a single sleeve-left anchor on only that sleeve', () => {
    const part = expandJersey('t', {
      ...base,
      marks: [
        {
          paint: 'over',
          mark: TRIANGLE,
          anchor: 'sleeve-left',
          slots: { body: 'white' },
          id: 'logo',
        },
      ],
    });
    const ids = part.layers.map((l) => l.id);
    expect(ids).toEqual(['t-logo-body-left']);
    expect(part.layers[0]).toMatchObject({ surface: 'sleeve-left' });
  });

  it('paints an anchored under-mark before the construction layers', () => {
    const part = expandJersey('t', {
      ...base,
      collar: { style: 'shallow-v', color: 'navy' },
      marks: [
        {
          paint: 'under',
          mark: TRIANGLE,
          anchor: 'sleeve-right',
          slots: { body: 'white' },
          id: 'logo',
        },
      ],
    });
    const plain = expandJersey('t', {
      ...base,
      collar: { style: 'shallow-v', color: 'navy' },
    }).layers;
    expect(part.layers.map((l) => l.id)).toEqual(['t-logo-body-right', ...plain.map((l) => l.id)]);
  });

  it('leaves a jersey without marks unchanged', () => {
    expect(expandJersey('t', { ...base, marks: [] })).toEqual(expandJersey('t', base));
  });
});
