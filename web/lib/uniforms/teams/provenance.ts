// Per-construction provenance records (Astra review item 6).
//
// Identical pixels prove reproducibility, not historical accuracy. This module is the
// historical-accuracy ledger: for each durable construction it records where the facts came
// from, which facts were observed vs inferred, what was intentionally approximated, and what is
// still unresolved at feature level. It is deliberately separate from:
//
//   - reproducibility, which is the artifact manifest's source/build digest (item 7); and
//   - review status, which this record carries but does not conflate with fidelity.
//
// Approval and fidelity are separate fields: an approved intentional approximation is still an
// approximation. Uncertainty is stated per feature ("collar supported; sleeve detail
// unresolved"), never as a numeric confidence score, because one number cannot say which feature
// is trustworthy. Reference images stay external: `sources` holds URLs or identifiers, never
// image bytes or committed files.
//
// Coverage is explicit rather than derived: every `constructionKey` in lib/uniforms/data.ts has
// an entry, and a construction with no documented evidence points at the single
// UNSOURCED_PROVENANCE placeholder rather than inventing a source. gen-uniform-thumbs.mts
// refuses to publish a row whose key has no entry, so a new authored construction must add
// either a sourced record or an explicit UNSOURCED marker before it can ship.

export type ReviewStatus =
  // No human/premium pass has looked at this record.
  | 'unreviewed'
  // A pass has looked at the record; see `approved` for its verdict.
  | 'reviewed';

export type FidelityStatus =
  // No evidence has been checked against this construction.
  | 'unverified'
  // Checked against the sources, and every reviewed feature matches.
  | 'verified'
  // Checked, and an intentional, documented approximation was accepted in its place.
  | 'approximate';

export interface ConstructionProvenance {
  // URLs or human-readable identifiers for the external references. Empty only on UNSOURCED.
  sources: readonly string[];
  // Facts measured or read directly from a source.
  observed: readonly string[];
  // Details reasoned from the sources or borrowed from existing parts rather than seen.
  inferred: readonly string[];
  // Deliberate departures from the reference (proxy geometry, omitted micro-detail).
  approximations: readonly string[];
  // Feature-level uncertainty. Named features, never a single confidence score.
  unresolved: readonly string[];
  review: {
    // Whether the record has been looked at at all.
    status: ReviewStatus;
    // Approval is separate from fidelity; see FidelityStatus.
    approved: boolean;
  };
  // Fidelity is separate from approval and from reproducibility.
  fidelity: FidelityStatus;
}

// The single explicit unsourced marker. Constructions with no documented evidence point here
// rather than inventing a source. `sources: []` is what findUnsourcedConstructions reports for
// review; replacing this with a sourced record is the backfill task.
export const UNSOURCED_PROVENANCE: ConstructionProvenance = {
  sources: [],
  observed: [],
  inferred: [],
  approximations: [],
  unresolved: ['No source recorded; this construction has not been audited against a reference.'],
  review: { status: 'unreviewed', approved: false },
  fidelity: 'unverified',
};

// Seattle's 2025 Rivalries kit is the one construction with a written evidence trail: the
// 2026-09-13 authoring-model test ran a cheaper model against a product photo and the GUD sheet,
// then listed exactly which features matched and which stayed coarse. Facts below are
// transcribed from that record; no source beyond those two is asserted.
const SEAHAWKS_RIVALRIES_2025: ConstructionProvenance = {
  sources: [
    'Gridiron Uniform Database — 2025 Seahawks Rivalries sheet (layout and structure)',
    '2025 Seahawks Rivalries product photo (external reference; facts only, never committed)',
  ],
  observed: [
    'Printed green-to-copper dash motif reads across the shoulders and sleeves; the center chest panel is plain.',
    'Body reads as a darker wolf grey than the catalog render; the row used #C6D3DC.',
    'Navy V-collar with a knit insert.',
    'Sleeve cuffs span the full sleeve hem as bands.',
    'Numeral reads as a muted, desaturated grey-green print, not the jersey action green.',
    'Navy SEAHAWKS wordmark, positioned from the flat GUD sheet.',
  ],
  inferred: [
    'Helmet construction reuses the existing teal-hawk shell and its three decal layers; a jersey reference cannot show a helmet.',
    'Dash-field tile pitch, rotation, and the shoulder-weighted fade are reconstructed parameters, not measured values.',
  ],
  approximations: [
    'Dash field is a single parametric tile with a green-to-copper gradient; the reference print is finer, denser, and directional.',
    'Wordmark is outlined Arial Bold (a proxy for Seattle custom letterforms) so rasters never depend on an installed font.',
    'Numeral uses the archive single-glyph convention, not the worn number, and its micro-print fill is omitted.',
    'Manufacturer marks (Nike swoosh, NFL shield, jock tag) are omitted by design.',
  ],
  unresolved: [
    'Motif pitch and density: the authored tile reads coarser than the reference dash field.',
    'Numeral fill: the muted grey-green print is unresolved; the authored pine reads dark.',
    'Body grey: unresolved tone mismatch, authored lighter and cooler than the reference.',
    'Sleeve silhouette: the shared mannequin sleeve is bulkier than the fitted reference garment.',
  ],
  review: { status: 'reviewed', approved: true },
  fidelity: 'approximate',
};

// The Eagles Kelly Green is the construction-identity test case: the 1987 original and the
// modern throwback share a body and number treatment but are different constructions. The collar
// is the distinguishing feature, and the vault records that distinction explicitly.
const EAGLES_KELLY_GREEN_SOURCES: readonly string[] = [
  'teamcolorcodes.com — Eagles historical kelly green (#046A38) and jersey silver (#A5ACAF)',
  'Gridiron Uniform Database — Eagles kelly-green era (1987–1995)',
  'obsidian:Projects/depth/specs/2026-09-13-uniform-art-pipeline-design.md § Construction identity is explicit',
  'obsidian:Projects/depth/Reference/2026-09-14-uniform-art-pipeline-astra-review.md § Known correctness issue: Eagles Kelly Green',
];

const EAGLES_KELLY_GREEN_ORIGINAL: ConstructionProvenance = {
  sources: EAGLES_KELLY_GREEN_SOURCES,
  observed: [
    'Kelly-green body with no sleeve cuff; the sleeve runs unbroken to the hem.',
    'Original-era rounded collar, not the modern deep yoke.',
    'White numerals keylined silver.',
    'Kelly shell wearing the shared wing decal.',
  ],
  inferred: [
    'The original-era collar is approximated by the shared legacy rounded-collar helper rather than a measured 1987 path.',
    'Helmet and pants are the shared kelly parts; the collar is the only construction difference from the modern throwback.',
  ],
  approximations: [
    'Collar geometry is the shared legacy rounded path, not a measured original.',
    'Numerals use the archive single-glyph convention.',
    'Both Kelly constructions render on the modern mannequin silhouette.',
  ],
  unresolved: [
    'Original collar curvature: the exact 1987 profile is unresolved.',
    'Sleeve hem: the reference suggests an unbroken sleeve, but the authored construction simply omits the cuff.',
  ],
  review: { status: 'reviewed', approved: true },
  fidelity: 'approximate',
};

const EAGLES_KELLY_GREEN_MODERN: ConstructionProvenance = {
  sources: EAGLES_KELLY_GREEN_SOURCES,
  observed: [
    'Kelly-green body, white numerals keylined silver, and no sleeve cuff, as in the original construction.',
    'Deep collar yoke (the current Eagles home collar), not the original rounded collar.',
  ],
  inferred: [
    'The modern throwback reuses the original body, sleeve and number treatment and restores only the deep collar.',
    'Helmet and pants are the shared kelly parts.',
  ],
  approximations: [
    'Deep yoke reuses the modern collar path; the throwback collar is assumed identical to the current home collar.',
    'Numerals use the archive single-glyph convention.',
  ],
  unresolved: [
    'Whether the modern throwback collar matches the current home collar exactly is not confirmed against a worn reference.',
  ],
  review: { status: 'reviewed', approved: true },
  fidelity: 'approximate',
};

// The registry. Keyed `teamId` -> `constructionKey`; the value is either a sourced record or the
// explicit UNSOURCED_PROVENANCE marker. Listing every key is deliberate: it forces a provenance
// decision for a new construction instead of letting it inherit a placeholder by default.
export const CONSTRUCTION_PROVENANCE: Readonly<
  Record<string, Readonly<Record<string, ConstructionProvenance>>>
> = {
  '49ers': {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  bears: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'orange-alternate': UNSOURCED_PROVENANCE,
  },
  bengals: {
    away: UNSOURCED_PROVENANCE,
    'color-rush': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'orange-alt': UNSOURCED_PROVENANCE,
  },
  bills: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  broncos: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'orange-alt': UNSOURCED_PROVENANCE,
    'orange-crush': UNSOURCED_PROVENANCE,
  },
  browns: {
    '1946-throwback': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  buccaneers: {
    away: UNSOURCED_PROVENANCE,
    creamsicle: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  cardinals: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  chargers: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'powder-blue': UNSOURCED_PROVENANCE,
  },
  chiefs: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  colts: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  commanders: {
    '70s-burgundy': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  cowboys: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  dolphins: {
    '1972-throwback': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  eagles: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'kelly-green-modern': EAGLES_KELLY_GREEN_MODERN,
    'kelly-green-original': EAGLES_KELLY_GREEN_ORIGINAL,
  },
  falcons: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'red-alt': UNSOURCED_PROVENANCE,
  },
  giants: {
    '1980s-throwback': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  jaguars: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'teal-throwback': UNSOURCED_PROVENANCE,
  },
  jets: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  lions: {
    away: UNSOURCED_PROVENANCE,
    'gridiron-gray': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  packers: {
    '1923-throwback': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'winter-warning': UNSOURCED_PROVENANCE,
  },
  panthers: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  patriots: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'pat-patriot': UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  raiders: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  rams: {
    away: UNSOURCED_PROVENANCE,
    bone: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': UNSOURCED_PROVENANCE,
  },
  ravens: {
    away: UNSOURCED_PROVENANCE,
    'black-alt': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  saints: {
    away: UNSOURCED_PROVENANCE,
    'color-rush': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  seahawks: {
    '1976-throwback': UNSOURCED_PROVENANCE,
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'rivalries-2025': SEAHAWKS_RIVALRIES_2025,
  },
  steelers: {
    away: UNSOURCED_PROVENANCE,
    bumblebee: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  texans: {
    away: UNSOURCED_PROVENANCE,
    'battle-red': UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
  },
  titans: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'navy-alt': UNSOURCED_PROVENANCE,
    'oilers-throwback': UNSOURCED_PROVENANCE,
  },
  vikings: {
    away: UNSOURCED_PROVENANCE,
    home: UNSOURCED_PROVENANCE,
    'purple-classic': UNSOURCED_PROVENANCE,
    'winter-warrior': UNSOURCED_PROVENANCE,
  },
};

export function getConstructionProvenance(
  teamId: string,
  constructionKey: string
): ConstructionProvenance | undefined {
  return CONSTRUCTION_PROVENANCE[teamId]?.[constructionKey];
}

export interface ProvenanceRow {
  id: string;
  teamId: string;
  constructionKey: string;
}

// Rows whose construction key has no registry entry at all. gen-uniform-thumbs.mts hard-fails on
// these: publishing art with no recorded provenance decision is the failure item 6 prevents.
export function findUnrecordedConstructions(rows: ReadonlyArray<ProvenanceRow>): ProvenanceRow[] {
  return rows.filter(
    (row) => getConstructionProvenance(row.teamId, row.constructionKey) === undefined
  );
}

// Rows carrying the UNSOURCED placeholder: allowed to ship, flagged for review. This is the
// honest backfill list, not a shipping blocker.
export function findUnsourcedConstructions(rows: ReadonlyArray<ProvenanceRow>): ProvenanceRow[] {
  return rows.filter((row) => {
    const record = getConstructionProvenance(row.teamId, row.constructionKey);
    return record !== undefined && record.sources.length === 0;
  });
}
