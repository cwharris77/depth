import type { JerseyColors, UniformKind } from '../../../types';
import type { UniformSeed } from '../../data';
import type { LegacyAccentPair } from '../../legacy-accents';
import type { KitRef, TeamPartsDefinition } from './parts';

// A team's catalog: one entry per distinct uniform design. It is the single source for that
// team's archive rows, their frozen legacy accent pairs, and the kits the renderer registers.

// Seasons a design was worn. `to` is the last season worn; an open period means the design is
// still in rotation. A closed period names the provenance record dating its end, or
// NEEDS_SOURCE until one is recorded.
export interface WearPeriod {
  from: number;
  to?: number;
  source?: string;
}

export const NEEDS_SOURCE = 'needs-source';

// One verified helmet/pants/socks pairing for a design's jersey. Parts are never freely mixed.
export interface Combination {
  key: string;
  label: string;
  helmet: string;
  pants: string;
  // Omitted, the socks take the pants colour.
  socks?: string;
}

export interface CatalogDesign {
  slug: string;
  // Kit key the canonical combination registers as. Defaults to the slug.
  constructionKey?: string;
  name: string;
  kind: UniformKind;
  jersey: string;
  colors: JerseyColors;
  // Frozen compatibility pair for installed iOS builds; see legacy-accents.ts.
  legacyAccent: LegacyAccentPair;
  // Chronological. The row spans the first start to the last end.
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

// Row ids are `${teamId}-${slug}-${yearStart}` and never change once seeded.
export function designRowId(teamId: string, design: CatalogDesign): string {
  return `${teamId}-${design.slug}-${design.periods[0].from}`;
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
  const last = design.periods[design.periods.length - 1];
  return {
    teamId,
    slug: design.slug,
    constructionKey: designConstructionKey(design),
    kind: design.kind,
    name: design.name,
    yearStart: design.periods[0].from,
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

// Every structural problem in a catalog, as readable lines. Empty means the catalog is valid.
export function validateCatalog(catalog: TeamCatalog, parts: CatalogParts): string[] {
  const issues: string[] = [];
  const slugs = new Set<string>();
  const has = (group: Record<string, unknown> | undefined, key: string) =>
    group !== undefined && Object.hasOwn(group, key);

  for (const design of catalog.designs) {
    const at = design.slug;
    if (slugs.has(at)) issues.push(`${at}: duplicate slug`);
    slugs.add(at);

    if (!has(parts.jerseys, design.jersey)) {
      issues.push(`${at}: unknown jersey "${design.jersey}"`);
    }

    if (design.periods.length === 0) issues.push(`${at}: needs at least one wear period`);
    design.periods.forEach((period, index) => {
      const isLast = index === design.periods.length - 1;
      if (period.to === undefined) {
        if (!isLast) issues.push(`${at}: only the last period may be open`);
      } else {
        if (period.to < period.from) {
          issues.push(`${at}: period ${period.from}-${period.to} ends before it starts`);
        }
        if (!period.source) {
          issues.push(
            `${at}: period ${period.from}-${period.to} ends without a source (use a provenance id or "${NEEDS_SOURCE}")`
          );
        }
      }
      const previous = design.periods[index - 1];
      if (previous?.to !== undefined && period.from <= previous.to) {
        issues.push(`${at}: period starting ${period.from} overlaps or precedes the one before it`);
      }
    });

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
