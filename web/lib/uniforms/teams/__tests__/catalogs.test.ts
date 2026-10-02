import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderUniformThumbSVG } from '../../art';
import { UNIFORMS, type UniformSeed } from '../../data';
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

  it('includes the Seahawks, the Bears, the Broncos, the Chargers, the Colts and the Jets', () => {
    expect(getTeamCatalog('seahawks')?.teamId).toBe('seahawks');
    expect(getTeamCatalog('bears')?.teamId).toBe('bears');
    expect(getTeamCatalog('broncos')?.teamId).toBe('broncos');
    expect(getTeamCatalog('chargers')?.teamId).toBe('chargers');
    expect(getTeamCatalog('colts')?.teamId).toBe('colts');
    expect(getTeamCatalog('bengals')?.teamId).toBe('bengals');
    expect(getTeamCatalog('49ers')?.teamId).toBe('49ers');
    expect(getTeamCatalog('jets')?.teamId).toBe('jets');
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

// Pins the catalog to the rows and accents the Chargers had before the catalog existed.
describe('Chargers catalog conversion', () => {
  const catalog = getTeamCatalog('chargers');
  if (!catalog) throw new Error('Chargers catalog is not registered');

  it('reproduces the archived rows', () => {
    const row = (
      slug: string,
      kind: string,
      name: string,
      yearStart: number,
      colors: { primary: string; secondary: string; accent: string }
    ) => ({
      teamId: 'chargers',
      slug,
      constructionKey: slug,
      kind,
      name,
      yearStart,
      yearEnd: null,
      isCurrent: true,
      colors,
    });
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        row('home', 'home', 'Home', 2020, {
          primary: '#0080C6',
          secondary: '#FFC20E',
          accent: '#FFC20E',
        }),
        row('away', 'away', 'Away', 2020, {
          primary: '#FFFFFF',
          secondary: '#0080C6',
          accent: '#FFC20E',
        }),
        row('powder-blue', 'alternate', 'Powder Blue', 1960, {
          primary: '#0080C6',
          secondary: '#FFC20E',
          accent: '#FFFFFF',
        }),
        row('charger-power', 'alternate', 'Charger Power', 2025, {
          primary: '#FFC20E',
          secondary: '#0080C6',
          accent: '#FFFFFF',
        }),
        row('super-chargers', 'alternate', 'Super Chargers', 2025, {
          primary: '#002244',
          secondary: '#FFC20E',
          accent: '#FFFFFF',
        }),
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      'chargers-home-2020': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      'chargers-away-2020': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      'chargers-powder-blue-1960': { uiAccent: '#36A7E0', onAccent: '#0a0e1a' },
      'chargers-charger-power-2025': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
      'chargers-super-chargers-2025': { uiAccent: '#FFC20E', onAccent: '#0a0e1a' },
    });
  });

  it('pairs every kit with its socks and registers the worn pants and socks pairings', () => {
    const white = { helmet: 'white' };
    expect(catalogKits(catalog)).toEqual({
      home: { ...white, jersey: 'powder', pants: 'gold', socks: 'powder' },
      'home--white-pants': { ...white, jersey: 'powder', pants: 'white', socks: 'powder' },
      'home--powder-pants': { ...white, jersey: 'powder', pants: 'powder', socks: 'white' },
      'home--powder-out': { ...white, jersey: 'powder', pants: 'powder', socks: 'powder' },
      away: { ...white, jersey: 'white', pants: 'gold', socks: 'powder' },
      'away--white-pants': { ...white, jersey: 'white', pants: 'white', socks: 'powder' },
      'away--powder-pants': { ...white, jersey: 'white', pants: 'powder', socks: 'white' },
      'away--powder-out': { ...white, jersey: 'white', pants: 'powder', socks: 'powder' },
      'away--white-out': { ...white, jersey: 'white', pants: 'white', socks: 'white' },
      'powder-blue': { ...white, jersey: 'powder', pants: 'gold', socks: 'powder' },
      'charger-power': { ...white, jersey: 'gold', pants: 'gold', socks: 'gold' },
      'super-chargers': { helmet: 'navy', jersey: 'navy', pants: 'navy', socks: 'navy' },
    });
  });
});

// Pins the catalog to the rows and accents the Colts had before the catalog existed.
describe('Colts catalog conversion', () => {
  const catalog = getTeamCatalog('colts');
  if (!catalog) throw new Error('Colts catalog is not registered');

  it('reproduces the archived rows', () => {
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        {
          teamId: 'colts',
          slug: 'home',
          constructionKey: 'home',
          kind: 'home',
          name: 'Home',
          yearStart: 2004,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#002C5F', secondary: '#A2AAAD', accent: '#A2AAAD' },
        },
        {
          teamId: 'colts',
          slug: 'away',
          constructionKey: 'away',
          kind: 'away',
          name: 'Away',
          yearStart: 2004,
          yearEnd: null,
          isCurrent: true,
          colors: { primary: '#FFFFFF', secondary: '#002C5F', accent: '#A2AAAD' },
        },
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      'colts-home-2004': { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
      'colts-away-2004': { uiAccent: '#A2AAAD', onAccent: '#0a0e1a' },
    });
  });

  it('pairs both jerseys with the white pants and navy socks', () => {
    expect(catalogKits(catalog)).toEqual({
      home: { helmet: 'white-horseshoe', jersey: 'navy', pants: 'white', socks: 'navy' },
      away: { helmet: 'white-horseshoe', jersey: 'white', pants: 'white', socks: 'navy' },
    });
  });
});

// Pins the catalog to the rows and accents the Jets had before the catalog existed.
describe('Jets catalog conversion', () => {
  const catalog = getTeamCatalog('jets');
  if (!catalog) throw new Error('Jets catalog is not registered');

  const row = (
    slug: string,
    kind: 'home' | 'away' | 'alternate',
    name: string,
    yearStart: number,
    colors: { primary: string; secondary: string; accent: string }
  ) => ({
    teamId: 'jets',
    slug,
    constructionKey: slug,
    kind,
    name,
    yearStart,
    yearEnd: null,
    isCurrent: true,
    colors,
  });

  it('reproduces the archived rows', () => {
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        row('home', 'home', 'Home', 2024, {
          primary: '#125740',
          secondary: '#FFFFFF',
          accent: '#FFFFFF',
        }),
        row('away', 'away', 'Away', 2024, {
          primary: '#FFFFFF',
          secondary: '#125740',
          accent: '#125740',
        }),
        row('rivalries-2025', 'alternate', 'Rivalries', 2025, {
          primary: '#115740',
          secondary: '#000000',
          accent: '#FFFFFF',
        }),
        row('black-alt', 'alternate', 'Black Alternate', 2024, {
          primary: '#000000',
          secondary: '#125740',
          accent: '#FFFFFF',
        }),
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    const pair = { uiAccent: '#4CC38A', onAccent: '#0a0e1a' };
    expect(catalogAccents(catalog)).toEqual({
      'jets-home-2024': pair,
      'jets-away-2024': pair,
      'jets-rivalries-2025-2025': pair,
      'jets-black-alt-2024': pair,
    });
  });

  it("registers each design's own kit with its helmet, pants and socks", () => {
    const kits = catalogKits(catalog);
    expect(kits.home).toEqual({ helmet: 'green', jersey: 'green', pants: 'green', socks: 'green' });
    expect(kits.away).toEqual({ helmet: 'green', jersey: 'white', pants: 'white', socks: 'white' });
    expect(kits['rivalries-2025']).toEqual({
      helmet: 'riv-green',
      jersey: 'riv',
      pants: 'riv',
      socks: 'riv',
    });
    expect(kits['black-alt']).toEqual({
      helmet: 'black',
      jersey: 'black',
      pants: 'black',
      socks: 'black',
    });
  });
});

// Pins the catalog to the rows and accents the 49ers had before the catalog existed.
describe('49ers catalog conversion', () => {
  const catalog = getTeamCatalog('49ers');
  if (!catalog) throw new Error('49ers catalog is not registered');

  it('reproduces the archived rows', () => {
    const row = (
      slug: string,
      kind: 'home' | 'away' | 'alternate',
      name: string,
      yearStart: number,
      colors: { primary: string; secondary: string; accent: string }
    ) => ({
      teamId: '49ers',
      slug,
      constructionKey: slug,
      kind,
      name,
      yearStart,
      yearEnd: null,
      isCurrent: true,
      colors,
    });
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        row('home', 'home', 'Home', 2022, {
          primary: '#AA0000',
          secondary: '#B3995D',
          accent: '#B3995D',
        }),
        row('away', 'away', 'Away', 2022, {
          primary: '#FFFFFF',
          secondary: '#AA0000',
          accent: '#B3995D',
        }),
        row('rivalries-2025', 'alternate', 'Rivalries', 2025, {
          primary: '#101820',
          secondary: '#B3995D',
          accent: '#AA0000',
        }),
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    expect(catalogAccents(catalog)).toEqual({
      '49ers-home-2022': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      '49ers-away-2022': { uiAccent: '#FF4D4D', onAccent: '#0a0e1a' },
      '49ers-rivalries-2025-2025': { uiAccent: '#B3995D', onAccent: '#0a0e1a' },
    });
  });

  it('pairs each jersey with its helmet, pants and red socks', () => {
    expect(catalogKits(catalog)).toEqual({
      home: { helmet: 'gold', jersey: 'red', pants: 'gold', socks: 'red' },
      away: { helmet: 'gold', jersey: 'white', pants: 'gold', socks: 'red' },
      'rivalries-2025': { helmet: 'black', jersey: 'black', pants: 'black', socks: 'red' },
    });
  });
});

// Pins the catalog to the rows and accents the Bengals had before the catalog existed.
describe('Bengals catalog conversion', () => {
  const catalog = getTeamCatalog('bengals');
  if (!catalog) throw new Error('Bengals catalog is not registered');

  it('reproduces the archived rows', () => {
    const row = (
      slug: string,
      kind: UniformSeed['kind'],
      name: string,
      yearStart: number,
      yearEnd: number | null,
      colors: UniformSeed['colors']
    ): UniformSeed => ({
      teamId: 'bengals',
      slug,
      constructionKey: slug,
      kind,
      name,
      yearStart,
      yearEnd,
      isCurrent: yearEnd === null,
      colors,
    });
    expect(byId(catalogRows(catalog))).toEqual(
      byId([
        row('home', 'home', 'Home', 2021, null, {
          primary: '#FB4F14',
          secondary: '#000000',
          accent: '#000000',
        }),
        row('away', 'away', 'Away', 2021, null, {
          primary: '#FFFFFF',
          secondary: '#FB4F14',
          accent: '#FB4F14',
        }),
        row('orange-alt', 'alternate', 'Orange Alternate', 2021, null, {
          primary: '#FB4F14',
          secondary: '#000000',
          accent: '#FFFFFF',
        }),
        row('color-rush', 'color-rush', 'Color Rush', 2016, 2022, {
          primary: '#FFFFFF',
          secondary: '#000000',
          accent: '#000000',
        }),
      ])
    );
  });

  it('reproduces the frozen legacy accents', () => {
    const pair = { uiAccent: '#FF6A33', onAccent: '#0a0e1a' };
    expect(catalogAccents(catalog)).toEqual({
      'bengals-home-2021': pair,
      'bengals-away-2021': pair,
      'bengals-orange-alt-2021': pair,
      'bengals-color-rush-2016': pair,
    });
  });

  it('registers every kit on the orange helmet', () => {
    const kits = catalogKits(catalog);
    expect(Object.values(kits).every((kit) => kit.helmet === 'orange')).toBe(true);
    expect(kits['color-rush']).toEqual({
      helmet: 'orange',
      jersey: 'color-rush',
      pants: 'white-claws',
      socks: 'white',
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
