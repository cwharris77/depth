import { describe, expect, it } from 'vitest';
import { SEAHAWKS_PARTS } from '../seahawks';
import { SEAHAWKS_CATALOG } from '../seahawks/catalog';
import { catalogKits } from '../core/catalog';

describe('Seahawks equipment combinations', () => {
  it('uses the same fabric navy for pants and socks', () => {
    expect(SEAHAWKS_PARTS.socks?.navy.base).toBe(SEAHAWKS_PARTS.pants.navy.base);
  });
  it('registers the white and navy jerseys with each verified pants and sock pairing', () => {
    const kits = catalogKits(SEAHAWKS_CATALOG);
    expect(kits['home--grey-pants']).toMatchObject({ pants: 'grey', socks: 'navy' });
    expect(kits['away--grey-pants']).toMatchObject({ pants: 'grey', socks: 'navy' });
    expect(kits['away--navy-pants']).toMatchObject({ pants: 'navy', socks: 'navy' });
    expect(kits['away--navy-pants-white-socks']).toMatchObject({ pants: 'navy', socks: 'white' });
    expect(kits['away--white-socks']).toMatchObject({ pants: 'white-plain', socks: 'white' });
    expect(kits['color-rush--navy-pants']).toMatchObject({ pants: 'navy', socks: 'navy' });
  });

  for (const pants of ['navy', 'grey', 'white-plain', 'action-green']) {
    it(`keeps twelve feathers on each ${pants} leg above the sock hem`, () => {
      const layers = SEAHAWKS_PARTS.pants[pants]?.layers ?? [];
      for (const side of ['left', 'right']) {
        const feathers = layers.filter((l) => l.id.includes(`pants-feather-${side}-`));
        expect(feathers).toHaveLength(12);
        expect(feathers.every((l) => l.surface === `leg-${side}` && l.clip)).toBe(true);
      }
    });
  }

  for (const jersey of ['navy', 'white', 'action-green', 'throwback', 'rivalries-silver']) {
    it(`places the supplied Nike mark on both ${jersey} sleeves`, () => {
      const layers = SEAHAWKS_PARTS.jerseys[jersey].layers;
      for (const side of ['left', 'right']) {
        expect(layers.find((l) => l.id === `seahawks-sleeve-nike-${side}`)).toMatchObject({
          surface: `sleeve-${side}`,
          clip: true,
          kind: 'fill',
        });
      }
    });
  }
});
