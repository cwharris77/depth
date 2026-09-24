import { describe, expect, it } from 'vitest';
import { expandHelmet, isExpandedHelmet } from '@/lib/uniforms/teams/core/helmet-spec';
import { placed } from '@/lib/uniforms/teams/core/marks';
import { HELMET_NUMBER_PATH } from '@/lib/uniforms/teams/core/shared';
import type { PartLayer } from '@/lib/uniforms/teams/core/parts';

const decalLayers: PartLayer[] = [
  {
    id: 'a',
    surface: 'helmet',
    d: 'M1,1 C2,2 3,3 4,4 Z',
    clip: true,
    kind: 'fill',
    fill: 'navy',
    fillRule: 'evenodd',
  },
  {
    id: 'b',
    surface: 'helmet',
    d: 'M5,5 L6,6',
    clip: false,
    kind: 'stroke',
    stroke: 'white',
    strokeWidth: 3,
    lineCap: 'round',
  },
];

describe('expandHelmet', () => {
  it('passes a placed decal through untouched, in order', () => {
    const part = expandHelmet('t-helmet', {
      shell: 'navy',
      facemask: 'white',
      decal: placed(decalLayers),
      number: 'none',
    });
    expect(part).toEqual({ base: 'navy', facemask: 'white', layers: decalLayers });
    expect(part.layers[0]).not.toBe(decalLayers[0]);
  });

  it('leaves the facemask unset on the neutral cage', () => {
    const part = expandHelmet('t-helmet', {
      shell: 'navy',
      facemask: 'neutral',
      decal: 'none',
      number: 'none',
    });
    expect(part).toEqual({ base: 'navy', layers: [] });
    expect(part).not.toHaveProperty('facemask');
  });

  it('paints the shared numeral after the decal', () => {
    const part = expandHelmet('t-white-helmet', {
      shell: 'white',
      facemask: 'gold',
      decal: placed(decalLayers),
      number: { fill: 'powderBlue' },
    });
    expect(part.layers.map((l) => l.id)).toEqual(['a', 'b', 't-white-helmet-number']);
    expect(part.layers.at(-1)).toEqual({
      id: 't-white-helmet-number',
      surface: 'helmet',
      d: HELMET_NUMBER_PATH,
      clip: true,
      kind: 'fill',
      fill: 'powderBlue',
    });
  });

  it('marks expanded helmets and nothing else', () => {
    const part = expandHelmet('t', {
      shell: 'navy',
      facemask: 'neutral',
      decal: 'none',
      number: 'none',
    });
    expect(isExpandedHelmet(part)).toBe(true);
    expect(isExpandedHelmet({ base: 'navy', layers: [] })).toBe(false);
  });
});
