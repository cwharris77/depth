import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandHelmet } from './teams/core/helmet-spec';
import { expandJersey } from './teams/core/jersey-spec';
import { expandPants, expandSocks } from './teams/core/pants-spec';
import { expandTeamSpec, findCoordinateLiterals, type TeamSpec } from './teams/core/team-spec';

const SPEC: TeamSpec = {
  helmets: { navy: { shell: 'navy', facemask: 'grey', decal: 'none', number: 'none' } },
  jerseys: {
    navy: {
      body: 'navy',
      collar: {
        style: 'shallow-v',
        color: 'white',
        trim: 'none',
        inside: 'body',
        lining: 'none',
        backBar: 'none',
        outline: false,
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
        collar: { style: 'shallow-v', color: 'white', outline: false },
        number: { fill: 'white', outline: 'grey', outlineWeight: 'thin' },
      })
    );
    expect(parts.pants.white).toEqual(expandPants('fixture-pants-white', { body: 'white' }));
    expect(parts.socks?.navy).toEqual(expandSocks('fixture-socks-navy', { color: 'navy' }));
  });
});

describe('findCoordinateLiterals', () => {
  it('flags path literals outside marks/ and ignores marks/ and tests', () => {
    const dir = mkdtempSync(join(tmpdir(), 'team-'));
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
