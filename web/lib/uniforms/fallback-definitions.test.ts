import { describe, expect, it } from 'vitest';
import { getFallbackUniformDefinitions } from '@/lib/uniforms/fallback-definitions';
import { getTeamUniformDefinition } from '@/lib/uniforms/teams';

describe('getFallbackUniformDefinitions', () => {
  it('omits teams whose kits all have a committed image', () => {
    expect(
      getFallbackUniformDefinitions([
        { teamId: 'bears', imagePath: '/uniforms/bears-home.webp' },
        { teamId: 'colts', imagePath: '/uniforms/colts-home.webp' },
      ])
    ).toEqual({});
  });

  it('keeps the definition of a team with a kit that has no image', () => {
    const definitions = getFallbackUniformDefinitions([
      { teamId: 'bears', imagePath: '/uniforms/bears-home.webp' },
      { teamId: 'colts' },
    ]);
    expect(Object.keys(definitions)).toEqual(['colts']);
    expect(definitions.colts).toBe(getTeamUniformDefinition('colts'));
  });

  it('skips a team with no definition', () => {
    expect(getFallbackUniformDefinitions([{ teamId: 'constructor' }])).toEqual({});
  });
});
