import { describe, expect, it } from 'vitest';
import {
  findMissing,
  jerseySpecOf,
  pantsSpecOf,
  QUESTIONS,
  socksSpecOf,
  type CompleteCollar,
  type CompleteJerseySpec,
} from './teams/core/complete';

const INSET_COLLAR = {
  style: 'inset-v' as const,
  color: 'navy',
  trim: 'none' as const,
  inside: 'body' as const,
  lining: 'none' as const,
  backBar: 'none' as const,
  outline: true,
};

const JERSEY: CompleteJerseySpec = {
  body: 'navy',
  collar: INSET_COLLAR,
  shoulderPanel: 'none',
  shoulderStripes: 'none',
  shoulderNumber: { fill: 'white', outline: 'orange' },
  sleeveStripes: {
    bands: [{ color: 'orange', size: 's' }],
    gap: 'wide',
    edge: 'white',
  },
  cuff: 'none',
  sleeveNumber: 'none',
  number: { fill: 'white', outline: 'orange', outlineWeight: 'thin' },
  marks: [],
};

describe('complete specs convert to the expander specs', () => {
  it("drops every 'none' and the 'body' default", () => {
    expect(jerseySpecOf(JERSEY)).toEqual({
      body: 'navy',
      collar: { style: 'inset-v', color: 'navy', outline: true },
      shoulderNumber: { fill: 'white', outline: 'orange' },
      sleeveStripes: { bands: [{ color: 'orange', size: 's' }], gap: 'wide', edge: 'white' },
      number: { fill: 'white', outline: 'orange', outlineWeight: 'thin' },
    });
  });

  it('keeps stated values, including a shoulder number without an outline', () => {
    const spec = jerseySpecOf({
      ...JERSEY,
      collar: { ...INSET_COLLAR, trim: 'white', inside: 'black', lining: 'gold', backBar: 'gold' },
      shoulderNumber: { fill: 'white', outline: 'none' },
      cuff: { color: 'white', size: 'm' },
      sleeveNumber: { fill: 'white' },
      sleeveStripes: { bands: [{ color: 'orange', size: 's' }], gap: 'wide', edge: 'none' },
    });
    expect(spec.collar).toEqual({
      style: 'inset-v',
      color: 'navy',
      trim: 'white',
      inside: 'black',
      lining: 'gold',
      backBar: 'gold',
      outline: true,
    });
    expect(spec.shoulderNumber).toEqual({ fill: 'white' });
    expect(spec.cuff).toEqual({ color: 'white', size: 'm' });
    expect(spec.sleeveNumber).toEqual({ fill: 'white' });
    expect(spec.sleeveStripes).toEqual({ bands: [{ color: 'orange', size: 's' }], gap: 'wide' });
  });

  it('keeps jersey marks', () => {
    const marks = [{ paint: 'under' as const, mark: { placed: true as const, layers: [] } }];
    expect(jerseySpecOf({ ...JERSEY, marks }).marks).toEqual(marks);
  });

  it('converts a shallow-v collar with only its own fields', () => {
    const shallow: CompleteCollar = { style: 'shallow-v', color: 'white', trim: 'orange' };
    expect(jerseySpecOf({ ...JERSEY, collar: shallow }).collar).toEqual({
      style: 'shallow-v',
      color: 'white',
      trim: 'orange',
    });
  });

  it('rejects a shallow-v collar carrying an inset-v-only field', () => {
    const shallow: CompleteCollar = {
      style: 'shallow-v',
      color: 'white',
      trim: 'none',
      // @ts-expect-error -- 'inside' belongs only to the inset-v branch of CompleteCollar
      inside: 'body',
    };
    expect(shallow.style).toBe('shallow-v');
  });

  it('converts pants and socks', () => {
    expect(pantsSpecOf({ body: 'white', stripes: 'none' })).toEqual({ body: 'white' });
    expect(
      pantsSpecOf({
        body: 'white',
        stripes: {
          position: 'leg-edge',
          bands: [{ color: 'navy', size: 'l' }],
          gap: 'none',
          edge: 'none',
        },
      })
    ).toEqual({
      body: 'white',
      stripes: { position: 'leg-edge', bands: [{ color: 'navy', size: 'l' }], gap: 'none' },
    });
    expect(socksSpecOf({ color: 'navy', stripes: 'none' })).toEqual({ color: 'navy' });
  });
});

describe('question table', () => {
  it('asks one question per complete field on every surface', () => {
    expect(Object.keys(QUESTIONS.jersey).sort()).toEqual(
      [
        'body',
        'collar.style',
        'collar.color',
        'collar.trim',
        'collar.inside',
        'collar.lining',
        'collar.backBar',
        'collar.outline',
        'shoulderPanel',
        'shoulderStripes',
        'shoulderNumber',
        'sleeveStripes',
        'cuff',
        'sleeveNumber',
        'number',
        'marks',
      ].sort()
    );
    expect(Object.keys(QUESTIONS.pants).sort()).toEqual(['body', 'stripes']);
    expect(Object.keys(QUESTIONS.socks).sort()).toEqual(['color', 'stripes']);
    expect(Object.keys(QUESTIONS.helmet).sort()).toEqual(['decal', 'facemask', 'number', 'shell']);
    for (const table of Object.values(QUESTIONS)) {
      for (const question of Object.values(table)) expect(question).toMatch(/\?$/);
    }
  });
});

describe('findMissing', () => {
  it('lists every checklist path a JSON spec leaves out', () => {
    expect(findMissing('jersey', JERSEY)).toEqual([]);
    const { cuff: _cuff, ...rest } = JERSEY;
    const { lining: _lining, ...partialCollar } = INSET_COLLAR;
    expect(findMissing('jersey', { ...rest, collar: partialCollar })).toEqual([
      'collar.lining',
      'cuff',
    ]);
    expect(findMissing('socks', { color: 'navy' })).toEqual(['stripes']);
    expect(findMissing('pants', null)).toEqual(['body', 'stripes']);
  });

  it('requires only the collar fields a shallow-v jersey actually uses', () => {
    const shallow = {
      ...JERSEY,
      collar: { style: 'shallow-v', color: 'white', trim: 'none' },
    };
    expect(findMissing('jersey', shallow)).toEqual([]);
  });

  it('reports only collar.style when the style itself is unset, not the fields it would gate', () => {
    const { style: _style, ...withoutStyle } = JERSEY.collar;
    const missing = findMissing('jersey', { ...JERSEY, collar: withoutStyle });
    expect(missing).toContain('collar.style');
    expect(missing).not.toContain('collar.color');
    expect(missing).not.toContain('collar.lining');
  });

  it('reports a missing sub-key of a stated field, in question-table then sub-key order', () => {
    const noEdge = {
      ...JERSEY,
      sleeveStripes: { bands: [{ color: 'orange', size: 's' as const }], gap: 'wide' as const },
    };
    expect(findMissing('jersey', noEdge)).toEqual(['sleeveStripes.edge']);
  });

  it('treats null the same as missing', () => {
    expect(findMissing('jersey', { ...JERSEY, cuff: null })).toEqual(['cuff']);
  });

  it("requires pants stripes' position sub-key", () => {
    const noPosition = {
      body: 'white',
      stripes: {
        bands: [{ color: 'navy', size: 'm' as const }],
        gap: 'none' as const,
        edge: 'none',
      },
    };
    expect(findMissing('pants', noPosition)).toEqual(['stripes.position']);
  });

  it("needs no sub-keys for a 'none' value", () => {
    expect(findMissing('socks', { color: 'navy', stripes: 'none' })).toEqual([]);
    expect(
      findMissing('helmet', { shell: 'navy', facemask: 'grey', decal: 'none', number: 'none' })
    ).toEqual([]);
  });
});
