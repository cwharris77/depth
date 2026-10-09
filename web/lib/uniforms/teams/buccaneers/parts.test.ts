import { describe, expect, it } from 'vitest';
import { BUCCANEERS_PARTS, BUCCANEERS_UNIFORMS_FROM_PARTS } from './index';
import { sleeveNike } from '../core/sleeve-logos';

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
  it.each(['home', 'away', 'creamsicle'])(
    '%s includes a collar shield and one shared Nike mark on each sleeve',
    (kit) => {
      const layers = BUCCANEERS_UNIFORMS_FROM_PARTS.kits[kit].layers ?? [];
      expect(
        layers.some((layer) => layer.surface === 'collar' && layer.id.includes('shield'))
      ).toBe(true);
      const jersey = BUCCANEERS_PARTS.kits[kit].jersey;
      const expected = sleeveNike('expected', 'white');
      for (const side of ['left', 'right']) {
        const nike = layers.filter(
          (layer) => layer.surface === `sleeve-${side}` && /nike|swoosh/.test(layer.id)
        );
        expect(nike).toHaveLength(1);
        expect(nike[0].d).toBe(expected.find((layer) => layer.surface === `sleeve-${side}`)?.d);
      }
      expect(
        BUCCANEERS_PARTS.jerseys[jersey].layers.some((layer) => /nike|swoosh/.test(layer.id))
      ).toBe(false);
    }
  );
});
