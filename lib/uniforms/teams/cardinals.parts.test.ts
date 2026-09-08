import { describe, expect, it } from 'vitest';
import { CARDINALS_PARTS } from './cardinals.parts';

describe('Cardinals helmet parts', () => {
  it('uses the eggshell decal only on the rivalries helmet', () => {
    const layerIds = (helmet: keyof typeof CARDINALS_PARTS.helmets) =>
      CARDINALS_PARTS.helmets[helmet].layers?.map((layer) => layer.id) ?? [];

    expect(layerIds('white')).toEqual([
      'cardinals-decal-keyline',
      'cardinals-decal-body',
      'cardinals-decal-beak-upper',
      'cardinals-decal-beak-lower',
      'cardinals-decal-eye',
    ]);
    expect(layerIds('black')).toEqual(layerIds('white'));
    expect(layerIds('cream')).toEqual([
      'cardinals-eggshell-decal-keyline',
      'cardinals-eggshell-decal-body',
      'cardinals-eggshell-decal-beak-upper',
      'cardinals-eggshell-decal-beak-lower',
      'cardinals-eggshell-decal-eye',
    ]);
  });

  it('preserves each helmet facemask color', () => {
    expect(CARDINALS_PARTS.helmets.white.facemask).toBe('white');
    expect(CARDINALS_PARTS.helmets.black.facemask).toBe('black');
    expect(CARDINALS_PARTS.helmets.cream.facemask).toBe('white');
  });
});
