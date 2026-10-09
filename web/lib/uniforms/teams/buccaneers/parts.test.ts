import { describe, expect, it } from 'vitest';
import { BUCCANEERS_PARTS } from './index';

describe('Buccaneers shared jersey details', () => {
  it.each(['red', 'white'])('%s carries the ship on both sleeves', (jersey) => {
    const layers = BUCCANEERS_PARTS.jerseys[jersey].layers ?? [];
    for (const side of ['left', 'right']) {
      const ship = layers.filter(
        (layer) => layer.id.includes('ship') && layer.surface === `sleeve-${side}`
      );
      expect(ship.length).toBeGreaterThan(0);
      expect(ship.every((layer) => layer.clip)).toBe(true);
    }
    expect(
      BUCCANEERS_PARTS.jerseys.creamsicle.layers?.some((layer) => layer.id.includes('ship'))
    ).toBe(false);
  });
  it.each(['red', 'white', 'creamsicle'])(
    '%s includes a shared collar shield and sleeve swooshes',
    (jersey) => {
      const layers = BUCCANEERS_PARTS.jerseys[jersey].layers ?? [];
      expect(
        layers.some((layer) => layer.surface === 'collar' && layer.id.includes('shield'))
      ).toBe(true);
      for (const side of ['left', 'right']) {
        expect(
          layers.some((layer) => layer.surface === `sleeve-${side}` && layer.id.includes('swoosh'))
        ).toBe(true);
      }
    }
  );
});
