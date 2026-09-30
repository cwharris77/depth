import { describe, expect, it } from 'vitest';
import { BROWNS_UNIFORMS_FROM_PARTS } from './index';

describe('Browns pants and socks', () => {
  it('keeps the pants stripe above the hem and gives the home kit striped brown socks', () => {
    const home = BROWNS_UNIFORMS_FROM_PARTS.kits.home;

    expect(home.socksColor).toBe('#311D00');
    expect(home.layers?.filter((layer) => layer.surface.startsWith('leg-'))).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ d: expect.stringContaining('V1462') })])
    );
    expect(home.layers?.filter((layer) => layer.surface.startsWith('sock-'))).toHaveLength(6);
  });
});
