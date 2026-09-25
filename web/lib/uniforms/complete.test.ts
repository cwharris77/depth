import { describe, expect, it } from 'vitest';
import {
  findMissing,
  jerseySpecOf,
  pantsSpecOf,
  QUESTIONS,
  socksSpecOf,
  type CompleteJerseySpec,
} from './teams/core/complete';

const JERSEY: CompleteJerseySpec = {
  body: 'navy',
  collar: {
    style: 'inset-v',
    color: 'navy',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
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
      collar: { ...JERSEY.collar, trim: 'white', inside: 'black', lining: 'gold', backBar: 'gold' },
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
    const { cuff: _cuff, collar, ...rest } = JERSEY;
    const { lining: _lining, ...partialCollar } = collar;
    expect(findMissing('jersey', { ...rest, collar: partialCollar })).toEqual([
      'collar.lining',
      'cuff',
    ]);
    expect(findMissing('socks', { color: 'navy' })).toEqual(['stripes']);
    expect(findMissing('pants', null)).toEqual(['body', 'stripes']);
  });
});
