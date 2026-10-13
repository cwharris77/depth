import type { JerseyColors, UniformKind } from '../../../types';
import type { UniformSeed } from '../../data';
import type { LegacyAccentPair } from '../../legacy-accents';
import type { KitRef, TeamPartsDefinition } from './parts';
import type { SleeveNikePlacement } from './sleeve-logos';

// A team's catalog: one entry per distinct uniform design. It is the single source for that
// team's archive rows, their frozen legacy accent pairs, and the kits the renderer registers.

// Seasons a design was worn. An omitted end means it remains in rotation.
export interface WearPeriod {
  from: number;
  to?: number;
  startSource?: string;
  source?: string;
  verifiedOn?: string;
}

export const NEEDS_SOURCE = 'needs-source';

// One verified helmet/pants/socks pairing for a design's jersey. Parts are never freely mixed.
export interface Combination {
  // Palette paint for the Nike mark; omission keeps the construction unbranded.
  pantsNike?: string;
  key: string;
  label: string;
  helmet: string;
  pants: string;
  // Omitted, the socks take the pants colour.
  socks?: string;
}

export interface CatalogDesign {
  referencePacket?: {
    readonly classification: string;
    readonly sources: readonly {
      readonly url: string;
      readonly role: string;
      readonly covers: readonly string[];
    }[];
    readonly observed: readonly string[];
    readonly approximations: readonly string[];
  };
  // Immutable database and artifact identity, independent of corrected wearing dates.
  id: string;
  // Explicit equipment treatment, independent of the design's original season.
  sleeveNike?: string;
  sleeveNikePlacement?: SleeveNikePlacement;
  collarShield?: boolean | 'rounded';
  slug: string;
  // Kit key the canonical combination registers as. Defaults to the slug.
  constructionKey?: string;
  name: string;
  kind: UniformKind;
  jersey: string;
  colors: JerseyColors;
  // Frozen compatibility pair for installed iOS builds; see legacy-accents.ts.
  legacyAccent: LegacyAccentPair;
  // Chronological. The database row exposes the latest actual wearing period.
  periods: readonly WearPeriod[];
  // Canonical first: it renders the row's own rasters.
  combinations: readonly Combination[];
}

export interface TeamCatalog {
  teamId: string;
  designs: readonly CatalogDesign[];
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function designConstructionKey(design: CatalogDesign): string {
  return design.constructionKey ?? design.slug;
}

export function designRowId(_teamId: string, design: CatalogDesign): string {
  return design.id;
}

export function extraCombinations(design: CatalogDesign): readonly Combination[] {
  return design.combinations.slice(1);
}

export function combinationKitKey(design: CatalogDesign, combination: Combination): string {
  return `${designConstructionKey(design)}--${combination.key}`;
}

// Extra combinations share the row's jersey crop, so only a full-figure raster is rendered.
export function combinationArtifactName(rowId: string, key: string): string {
  return `${rowId}--${key}-full.webp`;
}

export function designRow(teamId: string, design: CatalogDesign): UniformSeed {
  if (design.periods.length === 0) {
    throw new Error(`${teamId} catalog design "${design.slug}" has no wear periods`);
  }
  const last = design.periods[design.periods.length - 1];
  return {
    id: design.id,
    teamId,
    slug: design.slug,
    constructionKey: designConstructionKey(design),
    kind: design.kind,
    name: design.name,
    yearStart: last.from,
    yearEnd: last.to ?? null,
    isCurrent: last.to === undefined,
    colors: { ...design.colors },
  };
}

export function catalogRow(catalog: TeamCatalog, slug: string): UniformSeed {
  const design = catalog.designs.find((entry) => entry.slug === slug);
  if (!design) throw new Error(`no ${catalog.teamId} catalog design "${slug}"`);
  return designRow(catalog.teamId, design);
}

export function catalogRows(catalog: TeamCatalog): UniformSeed[] {
  return catalog.designs.map((design) => designRow(catalog.teamId, design));
}

export function catalogAccents(catalog: TeamCatalog): Record<string, LegacyAccentPair> {
  return Object.fromEntries(
    catalog.designs.map((design) => [designRowId(catalog.teamId, design), design.legacyAccent])
  );
}

function kitRef(design: CatalogDesign, combination: Combination): KitRef {
  const ref: KitRef = {
    helmet: combination.helmet,
    jersey: design.jersey,
    pants: combination.pants,
  };
  if (combination.pantsNike !== undefined) ref.pantsNike = combination.pantsNike;
  if (design.sleeveNike !== undefined) ref.sleeveNike = design.sleeveNike;
  if (design.sleeveNikePlacement !== undefined)
    ref.sleeveNikePlacement = design.sleeveNikePlacement;
  if (design.collarShield !== undefined) ref.collarShield = design.collarShield;
  if (combination.socks !== undefined) ref.socks = combination.socks;
  return ref;
}

export function catalogKits(catalog: TeamCatalog): Record<string, KitRef> {
  const kits: Record<string, KitRef> = {};
  for (const design of catalog.designs) {
    const [canonical, ...extras] = design.combinations;
    if (canonical) kits[designConstructionKey(design)] = kitRef(design, canonical);
    for (const combination of extras) {
      kits[combinationKitKey(design, combination)] = kitRef(design, combination);
    }
  }
  return kits;
}

type CatalogParts = Pick<TeamPartsDefinition, 'helmets' | 'jerseys' | 'pants' | 'socks'>;

export function validateWearPeriods(design: CatalogDesign, now = new Date()): string[] {
  const issues: string[] = [];
  const at = design.slug;
  const validYear = (year: number) =>
    Number.isInteger(year) && year >= 1920 && year <= now.getUTCFullYear();
  const validSource = (source: string | undefined) => {
    if (!source || source.trim() !== source) return false;
    try {
      const url = new URL(source);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  };
  if (design.periods.length === 0) issues.push(`${at}: needs at least one wear period`);
  design.periods.forEach((period, index) => {
    if (!validYear(period.from)) issues.push(`${at}: invalid start year ${period.from}`);
    if (!validSource(period.startSource)) issues.push(`${at}: start needs a resolved HTTP source`);
    const verified = period.verifiedOn;
    const parsed = verified ? new Date(verified) : undefined;
    if (
      !verified ||
      !/^\d{4}-\d{2}-\d{2}$/.test(verified) ||
      !parsed ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== verified ||
      verified > now.toISOString().slice(0, 10)
    ) {
      issues.push(`${at}: needs a valid verification date`);
    }
    if (period.to === undefined) {
      if (index !== design.periods.length - 1)
        issues.push(`${at}: only the last period may be open`);
    } else {
      if (!validYear(period.to)) issues.push(`${at}: invalid end year ${period.to}`);
      if (period.to < period.from)
        issues.push(`${at}: period ${period.from}-${period.to} ends before it starts`);
      if (!validSource(period.source)) issues.push(`${at}: end needs a resolved HTTP source`);
    }
    const previous = design.periods[index - 1];
    if (previous && (previous.to === undefined || period.from <= previous.to)) {
      issues.push(`${at}: period starting ${period.from} overlaps or precedes the one before it`);
    }
  });
  return issues;
}

// Every structural problem in a catalog, as readable lines. Empty means the catalog is valid.
export function validateCatalog(catalog: TeamCatalog, parts: CatalogParts): string[] {
  const issues: string[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();
  const kitKeyOwners = new Map<string, string>();
  const has = (group: Record<string, unknown> | undefined, key: string) =>
    group !== undefined && Object.hasOwn(group, key);
  const claimKitKey = (key: string, slug: string) => {
    const owner = kitKeyOwners.get(key);
    if (owner !== undefined && owner !== slug) {
      issues.push(`${key}: kit key registered by ${owner} and ${slug}`);
    } else {
      kitKeyOwners.set(key, slug);
    }
  };

  for (const design of catalog.designs) {
    const at = design.slug;
    if (slugs.has(at)) issues.push(`${at}: duplicate slug`);
    slugs.add(at);
    if (!design.id || !KEBAB.test(design.id) || !design.id.startsWith(`${catalog.teamId}-`)) {
      issues.push(`${at}: invalid stable row id`);
    }
    if (ids.has(design.id)) issues.push(`${at}: duplicate stable row id`);
    ids.add(design.id);

    if (!KEBAB.test(design.slug)) issues.push(`${at}: slug must be lowercase kebab-case`);
    if (design.constructionKey !== undefined && !KEBAB.test(design.constructionKey)) {
      issues.push(`${at}: constructionKey must be lowercase kebab-case`);
    }

    claimKitKey(designConstructionKey(design), at);
    for (const combination of extraCombinations(design)) {
      claimKitKey(combinationKitKey(design, combination), at);
    }

    if (!has(parts.jerseys, design.jersey)) {
      issues.push(`${at}: unknown jersey "${design.jersey}"`);
    }

    issues.push(...validateWearPeriods(design));

    if (design.combinations.length === 0) {
      issues.push(`${at}: needs at least one combination (canonical first)`);
    }
    const keys = new Set<string>();
    for (const combination of design.combinations) {
      const where = `${at}/${combination.key}`;
      if (!KEBAB.test(combination.key)) {
        issues.push(`${where}: combination key must be lowercase kebab-case`);
      }
      if (keys.has(combination.key)) issues.push(`${where}: duplicate combination key`);
      keys.add(combination.key);
      if (!has(parts.helmets, combination.helmet)) {
        issues.push(`${where}: unknown helmet "${combination.helmet}"`);
      }
      if (!has(parts.pants, combination.pants)) {
        issues.push(`${where}: unknown pants "${combination.pants}"`);
      }
      if (combination.socks !== undefined && !has(parts.socks, combination.socks)) {
        issues.push(`${where}: unknown socks "${combination.socks}"`);
      }
    }
  }
  return issues;
}
