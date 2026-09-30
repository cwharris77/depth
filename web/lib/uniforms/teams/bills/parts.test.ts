import { describe, expect, it } from 'vitest';
import { BILLS_UNIFORMS_FROM_PARTS } from './index';

describe('Bills pants and socks', () => {
  it('keeps the pants stripe above the hem and gives the home kit solid royal socks', () => {
    const home = BILLS_UNIFORMS_FROM_PARTS.kits.home;

    expect(home.socksColor).toBe('#00338D');
    expect(home.layers?.filter((layer) => layer.surface.startsWith('leg-'))).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ d: expect.stringContaining('V1462') })])
    );
    expect(home.layers?.filter((layer) => layer.surface.startsWith('sock-'))).toEqual([]);
  });
});
