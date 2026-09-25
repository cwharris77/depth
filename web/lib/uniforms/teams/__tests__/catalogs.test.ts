import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG } from '../../art';
import { UNIFORMS } from '../../data';
import { HAND_ACCENTS, LEGACY_ACCENTS } from '../../legacy-accents';
import { getTeamUniformDefinition } from '../index';
import { getAllTeamCatalogs, getTeamCatalog } from '../catalogs';
import { catalogAccents, catalogKits, catalogRows, validateCatalog } from '../core/catalog';
import { expandTeamSpec, findCoordinateLiterals } from '../core/team-spec';

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

  it('includes the Seahawks', () => {
    expect(getTeamCatalog('seahawks')?.teamId).toBe('seahawks');
    expect(getTeamCatalog('bears')).toBeUndefined();
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
      },
    });
  });
});

// A strict team's parts come only from its registered TeamSpec: no team sets `strict` yet, so
// the per-team loop below is empty and the fixtures in team-spec.test.ts prove the checks
// themselves. The sanity check runs unconditionally so this suite never reports zero tests.
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
    });
  }
});
