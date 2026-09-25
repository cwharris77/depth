import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG } from '../../art';
import { UNIFORMS } from '../../data';
import { HAND_ACCENTS, LEGACY_ACCENTS } from '../../legacy-accents';
import { getTeamUniformDefinition } from '../index';
import { getAllTeamCatalogs, getTeamCatalog } from '../catalogs';
import {
  catalogAccents,
  catalogKits,
  catalogRows,
  combinationKitKey,
  extraCombinations,
  validateCatalog,
} from '../core/catalog';
import { expandTeamSpec, findCoordinateLiterals, findUnresolvedColors } from '../core/team-spec';

// Every team directory that owns a catalog.ts must also be registered in catalogs.ts, and
// under the key its own catalog names — a catalog file that exists but was never wired in
// (or was registered under the wrong teamId) silently keeps using the hand-written data.ts
// rows instead.
const TEAMS_DIR = join(__dirname, '..');
const catalogDirs = readdirSync(TEAMS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'core' && entry.name !== '__tests__')
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(TEAMS_DIR, name, 'catalog.ts')));

describe('every catalog.ts on disk is registered', () => {
  for (const dir of catalogDirs) {
    it(`${dir} has a registered catalog`, () => {
      expect(getTeamCatalog(dir)).toBeDefined();
    });
  }

  it('registers each catalog under a key matching its own teamId', () => {
    for (const { catalog } of getAllTeamCatalogs()) {
      expect(getTeamCatalog(catalog.teamId)).toBe(catalog);
    }
  });
});

const rowId = (row: { teamId: string; slug: string; yearStart: number }) =>
  `${row.teamId}-${row.slug}-${row.yearStart}`;
const byId = <T extends { teamId: string; slug: string; yearStart: number }>(rows: T[]) =>
  [...rows].sort((a, b) => rowId(a).localeCompare(rowId(b)));

// A converted team's accent pairs live only in its catalog. A hand-written pair left behind
// under the same id would be silently overridden by the catalog spread, so check the
// hand-written map itself rather than the merged one.
describe('no leftover hand-written accents for a converted team', () => {
  it('has no hand-written key belonging to a registered team', () => {
    const prefixes = getAllTeamCatalogs().map(({ catalog }) => `${catalog.teamId}-`);
    const leftovers = Object.keys(HAND_ACCENTS).filter((id) =>
      prefixes.some((prefix) => id.startsWith(prefix))
    );
    expect(leftovers).toEqual([]);
  });
});

describe('registered team catalogs', () => {
  const registered = getAllTeamCatalogs();

  it('includes the Seahawks, the Bears and the Broncos', () => {
    expect(getTeamCatalog('seahawks')?.teamId).toBe('seahawks');
    expect(getTeamCatalog('bears')?.teamId).toBe('bears');
    expect(getTeamCatalog('broncos')?.teamId).toBe('broncos');
    expect(getTeamCatalog('chargers')).toBeUndefined();
  });

  for (const { catalog, parts } of registered) {
    describe(catalog.teamId, () => {
      it('validates', () => {
        expect(validateCatalog(catalog, parts)).toEqual([]);
      });

      it('owns every archive row of its team', () => {
        const archived = UNIFORMS.filter((row) => row.teamId === catalog.teamId);
        expect(byId(archived)).toEqual(byId(catalogRows(catalog)));
      });

      it('owns its legacy accent pairs', () => {
        for (const [id, pair] of Object.entries(catalogAccents(catalog))) {
          expect(LEGACY_ACCENTS[id], id).toEqual(pair);
        }
      });

      it('registers exactly the catalog kits', () => {
        expect(parts.kits).toEqual(catalogKits(catalog));
      });
    });
  }
});

// Pins the catalog to the rows, accents and kits the Seahawks had before the catalog existed.
describe('Seahawks catalog conversion', () => {
  const catalog = getTeamCatalog('seahawks');
  if (!catalog) throw new Error('Seahawks catalog is not registered');

  it('reproduces the archived rows', () => {
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        {
          teamId: 'seahawks',
          slug: 'home',
          constructionKey: 'home',
          kind: 'home',
          name: 'Home',
          yearStart: 2012,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#002244', secondary: '#69BE28', accent: '#A5ACAF' },
        },
        {
          teamId: 'seahawks',
          slug: '1976-throwback',
          constructionKey: '1976-throwback',
          kind: 'throwback',
          name: 'Throwback',
          yearStart: 1976,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#0248B3', secondary: '#0E8329', accent: '#A7B0BA' },
        },
        {
          teamId: 'seahawks',
          slug: 'away',
          constructionKey: 'away',
          kind: 'away',
          name: 'Away',
          yearStart: 2012,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FFFFFF', secondary: '#002244', accent: '#69BE28' },
        },
        {
          teamId: 'seahawks',
          slug: 'rivalries-2025',
          constructionKey: 'rivalries-2025',
          kind: 'alternate',
          name: 'Rivalries',
          yearStart: 2025,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#AFB3B5', secondary: '#002244', accent: '#29594C' },
        },
        {
          teamId: 'seahawks',
          slug: 'color-rush',
          constructionKey: 'color-rush',
          kind: 'color-rush',
          name: 'Color Rush',
          yearStart: 2016,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#B6FF3E', secondary: '#002244', accent: '#FFFFFF' },
        },
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      'seahawks-home-2012': { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      'seahawks-1976-throwback-1976': { uiAccent: '#3DB06A', onAccent: '#0a0e1a' },
      'seahawks-away-2012': { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      'seahawks-rivalries-2025-2025': { uiAccent: '#AFB3B5', onAccent: '#0a0e1a' },
      'seahawks-color-rush-2016': { uiAccent: '#B6FF3E', onAccent: '#15161a' },
    });
  });

  it('reproduces the kit map', () => {
    expect(catalogKits(catalog)).toEqual({
      home: { helmet: 'navy-hawk', jersey: 'navy', pants: 'navy' },
      away: { helmet: 'navy-hawk', jersey: 'white', pants: 'white-plain' },
      'color-rush': { helmet: 'navy-hawk', jersey: 'action-green', pants: 'action-green' },
      '1976-throwback': { helmet: 'throwback-silver', jersey: 'throwback', pants: 'throwback' },
      'rivalries-2025': {
        helmet: 'teal-hawk',
        jersey: 'rivalries-silver',
        pants: 'rivalries-silver',
        socks: 'navy',
      },
    });
  });
});

// Pins the catalog to the rows and accents the Bears had before the catalog existed.
describe('Bears catalog conversion', () => {
  const catalog = getTeamCatalog('bears');
  if (!catalog) throw new Error('Bears catalog is not registered');

  it('reproduces the archived rows', () => {
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        {
          teamId: 'bears',
          slug: 'home',
          constructionKey: 'home',
          kind: 'home',
          name: 'Home',
          yearStart: 2012,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#0B162A', secondary: '#C83803', accent: '#C83803' },
        },
        {
          teamId: 'bears',
          slug: 'away',
          constructionKey: 'away',
          kind: 'away',
          name: 'Away',
          yearStart: 2012,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FFFFFF', secondary: '#0B162A', accent: '#C83803' },
        },
        {
          teamId: 'bears',
          slug: 'orange-alternate',
          constructionKey: 'orange-alternate',
          kind: 'alternate',
          name: 'Orange Alternate',
          yearStart: 2005,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#C83803', secondary: '#0B162A', accent: '#FFFFFF' },
        },
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      'bears-home-2012': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      'bears-away-2012': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      'bears-orange-alternate-2005': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
    });
  });

  it('pairs the home and away jerseys with white hooped socks, and adds white pants', () => {
    expect(catalogKits(catalog)).toEqual({
      home: { helmet: 'navy-c', jersey: 'navy', pants: 'navy', socks: 'white' },
      'home--white-pants': { helmet: 'navy-c', jersey: 'navy', pants: 'white', socks: 'navy' },
      away: { helmet: 'navy-c', jersey: 'white', pants: 'navy', socks: 'white' },
      'orange-alternate': { helmet: 'navy-c', jersey: 'orange', pants: 'navy' },
    });
  });
});

// Pins the catalog to the rows and accents the Broncos had before the catalog existed.
describe('Broncos catalog conversion', () => {
  const catalog = getTeamCatalog('broncos');
  if (!catalog) throw new Error('Broncos catalog is not registered');

  it('reproduces the archived rows', () => {
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        {
          teamId: 'broncos',
          slug: 'home',
          constructionKey: 'home',
          kind: 'home',
          name: 'Home',
          yearStart: 2024,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FB4F14', secondary: '#002244', accent: '#002244' },
        },
        {
          teamId: 'broncos',
          slug: 'away',
          constructionKey: 'away',
          kind: 'away',
          name: 'Away',
          yearStart: 2024,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FFFFFF', secondary: '#FB4F14', accent: '#002244' },
        },
        {
          teamId: 'broncos',
          slug: 'orange-alt',
          constructionKey: 'orange-alt',
          kind: 'alternate',
          name: 'Orange Alternate',
          yearStart: 2024,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FB4F14', secondary: '#002244', accent: '#FFFFFF' },
        },
        {
          teamId: 'broncos',
          slug: 'orange-crush',
          constructionKey: 'orange-crush',
          kind: 'throwback',
          name: 'Orange Crush',
          yearStart: 1968,
          yearEnd: 1996,
          isCurrent: false,
          colors: { primary: '#001489', secondary: '#FA4616', accent: '#FFFFFF' },
        },
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      'broncos-home-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      'broncos-away-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      'broncos-orange-alt-2024': { uiAccent: '#FF6A33', onAccent: '#0a0e1a' },
      'broncos-orange-crush-1968': { uiAccent: '#FA4616', onAccent: '#0a0e1a' },
    });
  });

  it('gives every kit its socks and adds the worn pants and socks pairings', () => {
    const modern = { helmet: 'navy-horse' };
    expect(catalogKits(catalog)).toEqual({
      home: { ...modern, jersey: 'orange', pants: 'orange', socks: 'white' },
      'home--navy-socks': { ...modern, jersey: 'orange', pants: 'orange', socks: 'navy' },
      away: { ...modern, jersey: 'white', pants: 'white', socks: 'white' },
      'away--navy-socks': { ...modern, jersey: 'white', pants: 'white', socks: 'navy' },
      'away--navy-pants': { ...modern, jersey: 'white', pants: 'navy', socks: 'navy' },
      'away--navy-pants-white-socks': { ...modern, jersey: 'white', pants: 'navy', socks: 'white' },
      'away--orange-pants': { ...modern, jersey: 'white', pants: 'orange', socks: 'white' },
      'orange-alt': { ...modern, jersey: 'orange', pants: 'white', socks: 'navy' },
      'orange-alt--orange-socks': { ...modern, jersey: 'orange', pants: 'white', socks: 'orange' },
      'orange-alt--white-socks': { ...modern, jersey: 'orange', pants: 'white', socks: 'white' },
      'orange-crush': { helmet: 'royal-d', jersey: 'crush', pants: 'white', socks: 'crush' },
    });
  });
});

// A strict team's parts come only from its registered TeamSpec; the fixtures in team-spec.test.ts
// prove the checks themselves.
describe('strict teams', () => {
  const strictCatalogs = getAllTeamCatalogs().filter(
    (entry): entry is typeof entry & { strict: NonNullable<(typeof entry)['strict']> } =>
      entry.strict !== undefined
  );

  it('has a directory on disk for every strict team', () => {
    for (const { catalog } of strictCatalogs) {
      expect(existsSync(join(TEAMS_DIR, catalog.teamId))).toBe(true);
    }
  });

  for (const { catalog, parts, strict } of strictCatalogs) {
    describe(catalog.teamId, () => {
      it('expands to exactly the registered parts', () => {
        expect(expandTeamSpec(catalog.teamId, strict)).toEqual({
          helmets: parts.helmets,
          jerseys: parts.jerseys,
          pants: parts.pants,
          socks: parts.socks ?? {},
        });
      });

      it('draws no coordinate outside marks/', () => {
        expect(findCoordinateLiterals(join(TEAMS_DIR, catalog.teamId))).toEqual([]);
      });

      it('resolves every colour ref against its palette', () => {
        expect(findUnresolvedColors(expandTeamSpec(catalog.teamId, strict), parts.palette)).toEqual(
          []
        );
      });

      it('renders every archived kit identically twice', () => {
        const definition = getTeamUniformDefinition(catalog.teamId);
        for (const row of UNIFORMS.filter((r) => r.teamId === catalog.teamId)) {
          const id = rowId(row);
          const first = renderUniformThumbSVG(
            row.colors,
            id,
            definition,
            'full',
            row.constructionKey
          );
          const second = renderUniformThumbSVG(
            row.colors,
            id,
            definition,
            'full',
            row.constructionKey
          );
          expect(second).toBe(first);
        }
      });

      it('renders every extra combination kit key identically twice', () => {
        const definition = getTeamUniformDefinition(catalog.teamId);
        for (const design of catalog.designs) {
          const row = UNIFORMS.find((r) => r.teamId === catalog.teamId && r.slug === design.slug);
          if (!row) continue;
          const id = rowId(row);
          for (const combination of extraCombinations(design)) {
            const key = combinationKitKey(design, combination);
            const first = renderUniformThumbSVG(row.colors, id, definition, 'full', key);
            const second = renderUniformThumbSVG(row.colors, id, definition, 'full', key);
            expect(second).toBe(first);
          }
        }
      });
    });
  }
});
