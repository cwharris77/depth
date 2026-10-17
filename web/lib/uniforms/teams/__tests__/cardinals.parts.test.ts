import { describe, expect, it } from 'vitest';
import { CARDINALS_PARTS } from '../cardinals';
import { boundsOf } from '../core/marks';

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
    expect(CARDINALS_PARTS.helmets.cream.facemask).toBe('rivalRed');
  });
});

describe('Cardinals jersey and pants rendering', () => {
  it('places the away and black sleeve lettering at the outer edges', () => {
    const layers = CARDINALS_PARTS.jerseys.white.layers;
    const left = layers.find((layer) => layer.id === 'cardinals-sleeve-wordmark-left');
    const right = layers.find((layer) => layer.id === 'cardinals-sleeve-wordmark-right');
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(right!.d).toBe(
      CARDINALS_PARTS.jerseys.black.layers.find(
        (layer) => layer.id === 'cardinals-sleeve-wordmark-right'
      )!.d
    );
    expect(boundsOf(right!.d)[0]).toBeGreaterThan(525);
  });

  it('crops both Rivalries patches at the outer sleeve edges', () => {
    const layers = CARDINALS_PARTS.jerseys.rivalries.layers;
    const left = layers.find((layer) => layer.id === 'cardinals-patch-border-left')!;
    const right = layers.find((layer) => layer.id === 'cardinals-patch-border-right')!;
    expect(boundsOf(left.d)[0]).toBeLessThan(25);
    expect(boundsOf(right.d)[2]).toBeGreaterThan(562);
  });

  it('uses the shared inset collar on each current jersey', () => {
    for (const jersey of ['red', 'white', 'black', 'rivalries'] as const) {
      const ids = CARDINALS_PARTS.jerseys[jersey].layers.map((layer) => layer.id);
      expect(ids).toContain(`cardinals-jersey-${jersey}-collar-placket`);
    }
  });

  it('renders the Rivalries chest number without mesh and carries speckles on the pants', () => {
    expect(CARDINALS_PARTS.jerseys.rivalries.number?.texture).toBe('plain');
    expect(
      CARDINALS_PARTS.pants.cream.layers.some((layer) => layer.id === 'cardinals-pants-speckles')
    ).toBe(true);
  });
});
