// Guards the Vikings helmet decal's two-color paint order and shell-specific color mapping. The
// same path geometry is shared across all three helmets, so a mapping regression affects every kit.
import { describe, expect, it } from 'vitest';
import { VIKINGS_PARTS } from './vikings.parts';

describe('Vikings helmet parts', () => {
  it('paints the horn before the gold crescent on every shell', () => {
    for (const helmet of Object.values(VIKINGS_PARTS.helmets)) {
      expect(helmet.layers.map((layer) => layer.id)).toEqual([
        'vikings-decal-horn',
        'vikings-decal-crescent',
      ]);
    }
  });

  it('uses white horns on purple shells and a purple horn on the white shell', () => {
    for (const helmet of [VIKINGS_PARTS.helmets.purple, VIKINGS_PARTS.helmets.classic]) {
      expect(
        helmet.layers.map((layer) => (layer.kind === 'fill' ? layer.fill : undefined))
      ).toEqual(['white', 'gold']);
    }
    expect(
      VIKINGS_PARTS.helmets.white.layers.map((layer) =>
        layer.kind === 'fill' ? layer.fill : undefined
      )
    ).toEqual(['purple', 'gold']);
  });
});
