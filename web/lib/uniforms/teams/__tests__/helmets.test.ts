/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { isExpandedHelmet } from '../core/helmet-spec';
import type { TeamPartsDefinition } from '../core/parts';

// Every team's helmets must come from expandHelmet(), so a helmet's number and facemask are always
// stated rather than silently omitted.
const modules = import.meta.glob('../*/index.ts', { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

function partsDefinitions(): [string, TeamPartsDefinition][] {
  return Object.entries(modules).flatMap(([path, mod]) =>
    Object.values(mod)
      .filter(
        (value): value is TeamPartsDefinition =>
          typeof value === 'object' &&
          value !== null &&
          'helmets' in value &&
          'palette' in value &&
          'kits' in value
      )
      .map((def) => [path, def] as [string, TeamPartsDefinition])
  );
}

describe('team helmets', () => {
  const defs = partsDefinitions();

  it('finds a parts definition for every team module', () => {
    const teams = new Set(defs.map(([path]) => path));
    expect(teams.size).toBe(Object.keys(modules).length);
  });

  for (const [path, def] of defs) {
    for (const [key, helmet] of Object.entries(def.helmets)) {
      it(`${def.teamId} helmet "${key}" comes from the helmet spec (${path})`, () => {
        expect(isExpandedHelmet(helmet)).toBe(true);
      });
    }
  }
});
