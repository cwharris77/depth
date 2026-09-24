import { describe, expect, it } from 'vitest';
import {
  catalogAccents,
  catalogKits,
  catalogRow,
  catalogRows,
  combinationArtifactName,
  combinationKitKey,
  designRow,
  extraCombinations,
  NEEDS_SOURCE,
  validateCatalog,
  type CatalogDesign,
  type TeamCatalog,
} from './teams/core/catalog';
import { compileParts } from './teams/core/parts';
import { SEAHAWKS_PARTS } from './teams/seahawks';

const COLORS = { primary: '#002244', secondary: '#69BE28', accent: '#A5ACAF' };
const ACCENT = { uiAccent: '#69BE28', onAccent: '#0a0e1a' };

const HOME: CatalogDesign = {
  slug: 'home',
  name: 'Home',
  kind: 'home',
  jersey: 'navy',
  colors: COLORS,
  legacyAccent: ACCENT,
  periods: [{ from: 2012 }],
  combinations: [
    { key: 'standard', label: 'Standard', helmet: 'navy-hawk', pants: 'navy' },
    { key: 'white-pants', label: 'White pants', helmet: 'navy-hawk', pants: 'white-plain' },
  ],
};

const RETIRED: CatalogDesign = {
  slug: 'old',
  constructionKey: 'old-construction',
  name: 'Old',
  kind: 'throwback',
  jersey: 'throwback',
  colors: COLORS,
  legacyAccent: ACCENT,
  periods: [
    { from: 1990, to: 1995, source: 'ref-1' },
    { from: 2002, to: 2004, source: NEEDS_SOURCE },
  ],
  combinations: [
    { key: 'standard', label: 'Standard', helmet: 'throwback-silver', pants: 'throwback' },
  ],
};

const FIXTURE: TeamCatalog = { teamId: 'seahawks', designs: [HOME, RETIRED] };

describe('catalog rows', () => {
  it('derives an open design as a current row keyed by its first season', () => {
    expect(designRow('seahawks', HOME)).toEqual({
      teamId: 'seahawks',
      slug: 'home',
      constructionKey: 'home',
      kind: 'home',
      name: 'Home',
      yearStart: 2012,
      yearEnd: null,
      isCurrent: true,
      colors: COLORS,
    });
  });

  it('ends a closed design at its last period and honours an explicit construction key', () => {
    const row = designRow('seahawks', RETIRED);
    expect(row.yearStart).toBe(1990);
    expect(row.yearEnd).toBe(2004);
    expect(row.isCurrent).toBe(false);
    expect(row.constructionKey).toBe('old-construction');
  });

  it('looks up one row by slug and lists every design in order', () => {
    expect(catalogRow(FIXTURE, 'old').slug).toBe('old');
    expect(catalogRows(FIXTURE).map((row) => row.slug)).toEqual(['home', 'old']);
    expect(() => catalogRow(FIXTURE, 'missing')).toThrow(/seahawks.*missing/);
  });

  it('keys legacy accents by row id', () => {
    expect(catalogAccents(FIXTURE)).toEqual({
      'seahawks-home-2012': ACCENT,
      'seahawks-old-1990': ACCENT,
    });
  });

  it('throws on a design with no wear periods', () => {
    expect(() => designRow('seahawks', { ...HOME, periods: [] })).toThrow(
      'seahawks catalog design "home" has no wear periods'
    );
  });
});

describe('catalog kits and combinations', () => {
  it('registers the canonical combination under the construction key and extras under <key>--<combo>', () => {
    expect(catalogKits(FIXTURE)).toEqual({
      home: { helmet: 'navy-hawk', jersey: 'navy', pants: 'navy' },
      'home--white-pants': { helmet: 'navy-hawk', jersey: 'navy', pants: 'white-plain' },
      'old-construction': { helmet: 'throwback-silver', jersey: 'throwback', pants: 'throwback' },
    });
  });

  it('carries socks only when a combination names them', () => {
    const withSocks: TeamCatalog = {
      teamId: 'seahawks',
      designs: [{ ...HOME, combinations: [{ ...HOME.combinations[0], socks: 'navy' }] }],
    };
    expect(catalogKits(withSocks).home).toEqual({
      helmet: 'navy-hawk',
      jersey: 'navy',
      pants: 'navy',
      socks: 'navy',
    });
    expect(catalogKits(FIXTURE).home).not.toHaveProperty('socks');
  });

  it('names extra combinations and their rasters', () => {
    expect(extraCombinations(HOME).map((c) => c.key)).toEqual(['white-pants']);
    expect(extraCombinations(RETIRED)).toEqual([]);
    expect(combinationKitKey(HOME, HOME.combinations[1])).toBe('home--white-pants');
    expect(combinationArtifactName('seahawks-home-2012', 'white-pants')).toBe(
      'seahawks-home-2012--white-pants-full.webp'
    );
  });

  it('compiles a combination kit through the existing parts pipeline', () => {
    const compiled = compileParts({ ...SEAHAWKS_PARTS, kits: catalogKits(FIXTURE) });
    expect(compiled.kits).toHaveProperty('home--white-pants');
  });
});

describe('validateCatalog', () => {
  it('accepts a well-formed catalog', () => {
    expect(validateCatalog(FIXTURE, SEAHAWKS_PARTS)).toEqual([]);
  });

  const invalid = (design: Partial<CatalogDesign>) =>
    validateCatalog({ teamId: 'seahawks', designs: [{ ...HOME, ...design }] }, SEAHAWKS_PARTS);

  it('requires a canonical combination', () => {
    expect(invalid({ combinations: [] })).toEqual([
      'home: needs at least one combination (canonical first)',
    ]);
  });

  it('rejects unknown parts', () => {
    expect(
      invalid({
        jersey: 'nope',
        combinations: [{ key: 'standard', label: 'Standard', helmet: 'x', pants: 'y', socks: 'z' }],
      })
    ).toEqual([
      'home: unknown jersey "nope"',
      'home/standard: unknown helmet "x"',
      'home/standard: unknown pants "y"',
      'home/standard: unknown socks "z"',
    ]);
  });

  it('rejects duplicate or malformed combination keys', () => {
    expect(
      invalid({
        combinations: [HOME.combinations[0], { ...HOME.combinations[1], key: 'standard' }],
      })
    ).toEqual(['home/standard: duplicate combination key']);
    expect(invalid({ combinations: [{ ...HOME.combinations[0], key: 'Bad Key' }] })).toEqual([
      'home/Bad Key: combination key must be lowercase kebab-case',
    ]);
  });

  it('requires ordered periods, only the last open, and a source on every end', () => {
    expect(invalid({ periods: [] })).toEqual(['home: needs at least one wear period']);
    expect(invalid({ periods: [{ from: 2012, to: 2014 }] })).toEqual([
      'home: period 2012-2014 ends without a source (use a provenance id or "needs-source")',
    ]);
    expect(invalid({ periods: [{ from: 2012 }, { from: 2016 }] })).toEqual([
      'home: only the last period may be open',
    ]);
    expect(invalid({ periods: [{ from: 2012, to: 2016, source: 'a' }, { from: 2015 }] })).toEqual([
      'home: period starting 2015 overlaps or precedes the one before it',
    ]);
    expect(invalid({ periods: [{ from: 2016, to: 2012, source: 'a' }] })).toEqual([
      'home: period 2016-2012 ends before it starts',
    ]);
  });

  it('rejects duplicate slugs', () => {
    expect(validateCatalog({ teamId: 'seahawks', designs: [HOME, HOME] }, SEAHAWKS_PARTS)).toEqual([
      'home: duplicate slug',
    ]);
  });

  it('rejects a bad slug', () => {
    expect(invalid({ slug: 'Home Design' })).toContainEqual(
      'Home Design: slug must be lowercase kebab-case'
    );
  });

  it('rejects a bad constructionKey', () => {
    expect(invalid({ constructionKey: 'Bad_Key' })).toContainEqual(
      'home: constructionKey must be lowercase kebab-case'
    );
  });

  it('flags two designs whose kit keys collide', () => {
    const other: CatalogDesign = {
      ...HOME,
      slug: 'home-alt',
      constructionKey: 'home',
      combinations: [HOME.combinations[0]],
    };
    expect(
      validateCatalog({ teamId: 'seahawks', designs: [HOME, other] }, SEAHAWKS_PARTS)
    ).toContainEqual('home: kit key registered by home and home-alt');
  });

  it("flags a slug that collides with another design's extra-combination kit key", () => {
    const collider: CatalogDesign = {
      ...HOME,
      slug: 'home--white-pants',
      combinations: [HOME.combinations[0]],
    };
    const issues = validateCatalog(
      { teamId: 'seahawks', designs: [HOME, collider] },
      SEAHAWKS_PARTS
    );
    expect(
      issues.some(
        (issue) =>
          issue === 'home--white-pants: slug must be lowercase kebab-case' ||
          issue.startsWith('home--white-pants: kit key registered by')
      )
    ).toBe(true);
  });
});
