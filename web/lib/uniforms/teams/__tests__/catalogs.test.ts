import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UNIFORMS } from '../../data';
import { LEGACY_ACCENTS } from '../../legacy-accents';
import { getAllTeamCatalogs, getTeamCatalog } from '../catalogs';
import { catalogAccents, catalogKits, catalogRows, validateCatalog } from '../core/catalog';

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

// Once a team converts, its rows come from the catalog only; a hand-written entry left behind
// in legacy-accents.ts is dead weight nothing reads. `49ers` has no catalog and shares a
// numeric-looking id with no other team, so a plain prefix check is safe here.
describe('no leftover hand-written accents for a converted team', () => {
  it('has no hand-written key prefixed by a registered team id', () => {
    const registeredIds = getAllTeamCatalogs().map(({ catalog }) => `${catalog.teamId}-`);
    const catalogOwnedIds = new Set(
      getAllTeamCatalogs().flatMap(({ catalog }) => Object.keys(catalogAccents(catalog)))
    );
    const leftovers = Object.keys(LEGACY_ACCENTS).filter(
      (id) => !catalogOwnedIds.has(id) && registeredIds.some((prefix) => id.startsWith(prefix))
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
