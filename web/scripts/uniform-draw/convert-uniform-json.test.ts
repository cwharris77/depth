import { describe, expect, it } from 'vitest';
import { buildParts } from './convert-uniform-json.mts';

describe('buildParts', () => {
  const baseDefinition = {
    teamId: 'test',
    palette: { navy: '#001122' },
    jerseys: {},
  };
  const jerseys = {
    j: { base: 'navy', layers: [] },
  };

  it('round-trips an authored socks group into the emitted parts', () => {
    const socks = { s: { base: 'navy', layers: [] } };
    const parts = buildParts({ ...baseDefinition, socks }, jerseys);
    expect(parts.socks).toEqual(socks);
  });

  it('emits no socks key when the input authors none', () => {
    const parts = buildParts(baseDefinition, jerseys);
    expect(parts).not.toHaveProperty('socks');
  });
});
