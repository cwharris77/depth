import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { expandHelmet } from './teams/core/helmet-spec';
import { expandJersey } from './teams/core/jersey-spec';
import { expandPants, expandSocks } from './teams/core/pants-spec';
import type { UniformPart } from './teams/core/parts';
import {
  expandTeamSpec,
  findCoordinateLiterals,
  findUnresolvedColors,
  type TeamSpec,
} from './teams/core/team-spec';

const SPEC: TeamSpec = {
  helmets: { navy: { shell: 'navy', facemask: 'grey', decal: 'none', number: 'none' } },
  jerseys: {
    navy: {
      body: 'navy',
      collar: {
        style: 'shallow-v',
        color: 'white',
        trim: 'none',
      },
      shoulderPanel: 'none',
      shoulderStripes: 'none',
      shoulderNumber: 'none',
      sleeveStripes: 'none',
      cuff: 'none',
      sleeveNumber: 'none',
      number: { fill: 'white', outline: 'grey', outlineWeight: 'thin' },
      marks: [],
    },
  },
  pants: { white: { body: 'white', stripes: 'none' } },
  socks: { navy: { color: 'navy', stripes: 'none' } },
};

describe('expandTeamSpec', () => {
  it('expands every part with a <team>-<surface>-<key> prefix', () => {
    const parts = expandTeamSpec('fixture', SPEC);
    expect(parts.helmets.navy).toEqual(expandHelmet('fixture-helmet-navy', SPEC.helmets.navy));
    expect(parts.jerseys.navy).toEqual(
      expandJersey('fixture-jersey-navy', {
        body: 'navy',
        collar: { style: 'shallow-v', color: 'white' },
        number: { fill: 'white', outline: 'grey', outlineWeight: 'thin' },
      })
    );
    expect(parts.pants.white).toEqual(expandPants('fixture-pants-white', { body: 'white' }));
    expect(parts.socks?.navy).toEqual(expandSocks('fixture-socks-navy', { color: 'navy' }));
  });
});

describe('findCoordinateLiterals', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('flags path literals outside marks/ and ignores marks/ and tests', () => {
    dir = mkdtempSync(join(tmpdir(), 'team-'));
    mkdirSync(join(dir, 'marks'));
    mkdirSync(join(dir, 'jerseys'));
    writeFileSync(join(dir, 'marks', 'logo.ts'), "export const d = 'M1,2 L3,4 Z';\n");
    writeFileSync(join(dir, 'jerseys', 'navy.ts'), "export const d = 'M10.5,20 L3,4 Z';\n");
    writeFileSync(
      join(dir, 'index.ts'),
      "export const label = 'Mint';\nexport const rifle = 'M1 Garand';\nconst c = `M4 carbine`;\n"
    );
    writeFileSync(
      join(dir, 'parts.ts'),
      'const a = 1;\nexport const d = `M${x},${y} L${a},${b} Z`;\nexport const e = "m 2 3 z";\n'
    );
    writeFileSync(join(dir, 'x.test.ts'), "const d = 'M1,2 Z';\n");
    expect(findCoordinateLiterals(dir)).toEqual(['jerseys/navy.ts:1', 'parts.ts:2', 'parts.ts:3']);
  });
});

describe('findUnresolvedColors', () => {
  const palette = { navy: '#002244', white: '#FFFFFF' };

  it('passes when every ref resolves', () => {
    const parts = {
      helmets: { h: { base: 'navy', layers: [] } as UniformPart },
      jerseys: {
        j: {
          base: 'navy',
          layers: [
            { id: 'l', surface: 'collar', clip: true, kind: 'fill', fill: 'white' } as const,
          ],
        } as UniformPart,
      },
      pants: { p: { base: 'white', layers: [] } as UniformPart },
      socks: undefined,
    };
    expect(findUnresolvedColors(parts, palette)).toEqual([]);
  });

  it('names the group, key and typo in a bad palette ref', () => {
    const parts = {
      helmets: { h: { base: 'nayv', layers: [] } as UniformPart },
      jerseys: {},
      pants: {},
      socks: undefined,
    };
    expect(findUnresolvedColors(parts, palette)).toEqual(['helmets.h: "nayv"']);
  });

  it('accepts readable-on-body, outline and pattern: refs without a palette entry', () => {
    const parts = {
      helmets: {},
      jerseys: {
        j: {
          base: 'readable-on-body',
          layers: [
            {
              id: 'a',
              surface: 'collar',
              clip: true,
              kind: 'stroke',
              stroke: 'outline',
              strokeWidth: 1,
            } as const,
            {
              id: 'b',
              surface: 'collar',
              clip: true,
              kind: 'fill',
              fill: 'pattern:stripes',
            } as const,
          ],
        } as UniformPart,
      },
      pants: {},
      socks: undefined,
    };
    expect(findUnresolvedColors(parts, palette)).toEqual([]);
  });
});
