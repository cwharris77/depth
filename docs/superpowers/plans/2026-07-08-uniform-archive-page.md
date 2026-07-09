# Uniform Archive Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/uniforms` archive page that renders every curated kit for all 32 teams as generated vector uniforms, grouped by team, with client-side filters — behind a launch flag.

**Architecture:** A composable SVG renderer (`UniformFigure`) drives both the archive and the existing picker. A new `listUniforms()` seam returns lightweight kit metadata for all teams. A server route gates on a flag and hands the kit list to a thin client component that filters/groups with pure helpers.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, Vitest, Supabase Postgres, Vercel Flags SDK.

## Global Constraints

- Formatting is Prettier's job: run `npm run format` before every commit; `npm run format:check` is a CI gate. Config: single quotes, 100 width, es5 trailing commas, bracket-same-line.
- Every new `lib/` module opens with a role-and-constraint header comment ("why", not line narration).
- No new dependencies. There is no jsdom/RTL in this repo — do NOT add component-DOM tests; extract testable logic into pure `lib/` functions and test those.
- Imports use the `@/*` alias. Package manager is npm.
- Launch gates are Vercel Flags SDK flags in `lib/flags.ts`; `decide()` stays request-free (no cookies/headers) so pages stay statically prerenderable. Client components never read a flag.
- All roster/kit reads go through the `RosterSource` seam. Components never query Supabase directly.
- Untrusted/dangling input degrades, never throws (skip dangling team refs; unknown flag → off).
- Conventional Commits with a scope from: `uniforms`, `field`, `flags`/`theme`, `supabase`, `specs`. Squash-merge only.
- Two color systems: `uiAccent`/`onAccent` for anything legible on `#0a0e1a`; `primary`/`secondary`/`accent` are brand-true surfaces (the jersey figure uses these).

**Reference spec:** `docs/superpowers/specs/2026-07-08-uniform-archive-page-design.md`

---

## File Structure

- `lib/uniforms/figure.ts` (new) — pure variant spec (which parts + viewBox per variant). Testable.
- `components/UniformFigure.tsx` (new) — composable SVG renderer (Helmet/Jersey/Pants parts) driven by `figure.ts` + `TeamColors`; honors `imagePath`.
- `components/JerseySwatch.tsx` (modify) — becomes a thin wrapper over `UniformFigure variant="jersey"`; same props/output so the picker is untouched.
- `lib/uniforms/filter.ts` (new) — pure `eraBucket`, `matchesFilters`, `eraOptions`, `groupByDivision`. Testable.
- `lib/roster-source.ts` (modify) — add `UniformListing` type + `listUniforms()` to the interface.
- `lib/roster-source.db.ts` (modify) — implement `listUniforms()` (reuses `UNIFORM_SELECT`, `uniformColors`, `fetchAllTeamMeta`).
- `lib/flag-decisions.ts` (modify) — `decideShowUniformArchive`.
- `lib/flags.ts` (modify) — `showUniformArchive` flag.
- `app/uniforms/page.tsx` (new, server) — flag gate + fetch + render `<UniformArchive>`.
- `components/UniformArchive.tsx` (new, client) — filter state + controls + grouped grid of `UniformFigure`.
- Tests: `lib/__tests__/uniform-figure.test.ts`, `lib/__tests__/uniform-filter.test.ts`, `lib/__tests__/flag-decisions.test.ts` (extend), `lib/__tests__/roster-source.db.test.ts` (extend).

---

## Task 1: Pure figure variant spec

**Files:**
- Create: `lib/uniforms/figure.ts`
- Test: `lib/__tests__/uniform-figure.test.ts`

**Interfaces:**
- Produces: `type UniformVariant = 'jersey' | 'full' | 'helmet'`; `type FigurePart = 'helmet' | 'jersey' | 'pants'`; `interface VariantSpec { parts: FigurePart[]; viewBox: string }`; `function variantSpec(variant: UniformVariant): VariantSpec` (unknown → the `'jersey'` spec, defensive).

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/uniform-figure.test.ts
import { describe, it, expect } from 'vitest';
import { variantSpec } from '../uniforms/figure';

describe('variantSpec', () => {
  it('jersey renders only the jersey part in a 48x48 box', () => {
    expect(variantSpec('jersey')).toEqual({ parts: ['jersey'], viewBox: '0 0 48 48' });
  });
  it('full renders helmet + jersey + pants stacked', () => {
    const spec = variantSpec('full');
    expect(spec.parts).toEqual(['helmet', 'jersey', 'pants']);
    expect(spec.viewBox).toBe('0 0 48 96');
  });
  it('helmet renders only the helmet part', () => {
    expect(variantSpec('helmet').parts).toEqual(['helmet']);
  });
  it('an unknown variant falls back to the jersey spec (defensive)', () => {
    // @ts-expect-error exercising the runtime fallback
    expect(variantSpec('bogus')).toEqual(variantSpec('jersey'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/uniform-figure.test.ts`
Expected: FAIL — cannot find module `../uniforms/figure`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/uniforms/figure.ts
// Variant registry for the generated vector uniform (UniformFigure). A "variant" is a
// preset naming which uniform parts to draw and the SVG viewBox — the ONLY place that
// couples a variant to geometry. New variants (e.g. 'helmet') are one map entry here;
// the component reads this and renders the named parts, so no geometry changes are
// needed to add one. The picker uses 'jersey' (see components/JerseySwatch.tsx).

export type UniformVariant = 'jersey' | 'full' | 'helmet';
export type FigurePart = 'helmet' | 'jersey' | 'pants';

export interface VariantSpec {
  parts: FigurePart[];
  viewBox: string;
}

const VARIANTS: Record<UniformVariant, VariantSpec> = {
  jersey: { parts: ['jersey'], viewBox: '0 0 48 48' },
  full: { parts: ['helmet', 'jersey', 'pants'], viewBox: '0 0 48 96' },
  helmet: { parts: ['helmet'], viewBox: '0 0 48 40' },
};

export function variantSpec(variant: UniformVariant): VariantSpec {
  return VARIANTS[variant] ?? VARIANTS.jersey;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/uniform-figure.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/uniforms/figure.ts lib/__tests__/uniform-figure.test.ts
git commit -m "feat(uniforms): pure variant spec for the uniform figure renderer"
```

---

## Task 2: UniformFigure component + JerseySwatch wrapper

**Files:**
- Create: `components/UniformFigure.tsx`
- Modify: `components/JerseySwatch.tsx` (replace body with a wrapper)
- Reference (do not change): `components/UniformSheet.tsx:73` renders `<JerseySwatch colors={u.colors} size={34} />`

**Interfaces:**
- Consumes: `variantSpec`, `UniformVariant` from `lib/uniforms/figure`; `readableTextOn` from `lib/colors`; `TeamColors` from `lib/types`.
- Produces: default export `UniformFigure(props: { colors: TeamColors; variant?: UniformVariant; size?: number; imagePath?: string; title?: string })`. `JerseySwatch(props: { colors: TeamColors; size?: number })` keeps its current signature.

- [ ] **Step 1: Create the composable renderer**

The `jersey` part MUST reproduce today's `JerseySwatch` paths exactly so the picker's output is unchanged. Helmet/pants are simple generic shapes colored from the same slots.

```tsx
// components/UniformFigure.tsx
import type { TeamColors } from '@/lib/types';
import { readableTextOn } from '@/lib/colors';
import { variantSpec, type UniformVariant, type FigurePart } from '@/lib/uniforms/figure';

// The generated vector uniform. Colors/striping/layout are facts (not copyrightable),
// so every kit is drawn from its TeamColors — zero external image assets. One renderer
// backs both the picker (variant="jersey", the original JerseySwatch geometry) and the
// archive (variant="full"). Variants are presets in lib/uniforms/figure.ts. If a kit has
// committed art (imagePath), we show that instead of the generated figure.
// Color contract: primary = body/helmet shell, secondary = sleeves/collar/stripes,
// number = readableTextOn(primary).

function Jersey({ colors }: { colors: TeamColors }) {
  const { primary, secondary } = colors;
  const numberColor = readableTextOn(primary);
  return (
    <g>
      <path d="M15 7 L5 13 L2 23 L9 27 L15 18 Z" fill={secondary} />
      <path d="M33 7 L43 13 L46 23 L39 27 L33 18 Z" fill={secondary} />
      <path d="M15 7 L19 5 Q24 9 29 5 L33 7 L33 43 L15 43 Z" fill={primary} />
      <path d="M19 5 Q24 11 29 5 L26.5 4 Q24 6.5 21.5 4 Z" fill={secondary} />
      <text x="24" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill={numberColor}>
        1
      </text>
    </g>
  );
}

function Helmet({ colors }: { colors: TeamColors }) {
  // Shell = primary, facemask/stripe = secondary. Sits in the top 40 units.
  const { primary, secondary } = colors;
  return (
    <g>
      <path d="M12 22 Q12 8 24 8 Q38 8 38 24 L34 24 Q34 14 24 14 Q17 14 16 24 Z" fill={primary} />
      <path d="M16 24 L34 24 L33 30 Q24 33 15 30 Z" fill={secondary} />
      <rect x="23" y="8" width="2" height="16" fill={secondary} />
    </g>
  );
}

function Pants({ colors }: { colors: TeamColors }) {
  // Pants = primary with a secondary side stripe. Sits in the bottom band (y 66-96).
  const { primary, secondary } = colors;
  return (
    <g>
      <path d="M16 66 L32 66 L31 94 L26 94 L24 74 L22 94 L17 94 Z" fill={primary} />
      <rect x="23" y="66" width="2" height="28" fill={secondary} />
    </g>
  );
}

const PARTS: Record<FigurePart, (p: { colors: TeamColors }) => React.JSX.Element> = {
  helmet: Helmet,
  jersey: Jersey,
  pants: Pants,
};

// Vertical offset per part so 'full' stacks helmet(0) / jersey(24) / pants(0, drawn at
// its own y in the path). Jersey is authored at y 5-43; in 'full' we nudge it below the
// helmet. Keep the jersey UNSHIFTED for the 'jersey' variant so the picker is identical.
const PART_SHIFT: Record<UniformVariant, Partial<Record<FigurePart, number>>> = {
  jersey: {},
  full: { jersey: 26, helmet: 0, pants: 0 },
  helmet: {},
};

export default function UniformFigure({
  colors,
  variant = 'jersey',
  size = 34,
  imagePath,
  title,
}: {
  colors: TeamColors;
  variant?: UniformVariant;
  size?: number;
  imagePath?: string;
  title?: string;
}) {
  const spec = variantSpec(variant);
  const [, , vbW, vbH] = spec.viewBox.split(' ').map(Number);
  if (imagePath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imagePath} alt={title ?? ''} width={size} height={(size * vbH) / vbW} />;
  }
  const shifts = PART_SHIFT[variant] ?? {};
  return (
    <svg
      width={size}
      height={(size * vbH) / vbW}
      viewBox={spec.viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}>
      {spec.parts.map((part) => {
        const Part = PARTS[part];
        const dy = shifts[part] ?? 0;
        return (
          <g key={part} transform={dy ? `translate(0 ${dy})` : undefined}>
            <Part colors={colors} />
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Rewire JerseySwatch as a thin wrapper**

```tsx
// components/JerseySwatch.tsx
import type { TeamColors } from '@/lib/types';
import UniformFigure from './UniformFigure';

// Back-compat wrapper: the picker (components/UniformSheet.tsx) renders this. It is now
// UniformFigure's 'jersey' variant, whose geometry is byte-identical to the original
// swatch, so the selector is unchanged. New surfaces should use UniformFigure directly.
export default function JerseySwatch({ colors, size = 34 }: { colors: TeamColors; size?: number }) {
  return <UniformFigure colors={colors} variant="jersey" size={size} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Verify the picker still renders (build the affected route)**

Run: `npx vitest run` (whole suite still green — no logic regressed)
Expected: PASS. (Visual parity of the picker swatch is verified in Task 6's browser check.)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add components/UniformFigure.tsx components/JerseySwatch.tsx
git commit -m "feat(uniforms): composable UniformFigure renderer; JerseySwatch becomes its jersey variant"
```

---

## Task 3: Pure filter + grouping logic

**Files:**
- Create: `lib/uniforms/filter.ts`
- Test: `lib/__tests__/uniform-filter.test.ts`

**Interfaces:**
- Consumes: `UniformListing` from `lib/roster-source` (defined in Task 4 — its shape is fixed here: `{ teamId, teamName, conference, division, id, kind, name, colors, yearStart, yearEnd, isCurrent, imagePath? }`). To avoid a task-ordering dependency, `filter.ts` imports the type from `@/lib/roster-source`; Task 4 must land the type. If executing strictly in order, do Task 4's type export first — see note.
- Produces: `interface UniformFilters { kind: UniformKind | 'all'; era: string; currentOnly: boolean }`; `function eraBucket(yearStart: number | null): string`; `function eraOptions(kits: UniformListing[]): string[]`; `function matchesFilters(kit: UniformListing, f: UniformFilters): boolean`; `interface TeamGroup { teamId: string; teamName: string; kits: UniformListing[] }`; `interface DivisionGroup { conference: Conference; division: Division; teams: TeamGroup[] }`; `function groupByDivision(kits: UniformListing[]): DivisionGroup[]`.

> **Ordering note:** This task references the `UniformListing` type. Land Task 4 Step 1 (the type export) before this task, or define the type in Task 4 and import here. The plan orders Task 4 after 3 only because the DB impl is heavier; move the *type export* earlier if your executor is strict about compile order.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/uniform-filter.test.ts
import { describe, it, expect } from 'vitest';
import { eraBucket, eraOptions, matchesFilters, groupByDivision } from '../uniforms/filter';
import type { UniformListing } from '../roster-source';

const kit = (over: Partial<UniformListing>): UniformListing => ({
  teamId: 'bills',
  teamName: 'Buffalo Bills',
  conference: 'AFC',
  division: 'East',
  id: 'bills-x',
  kind: 'alternate',
  name: 'X',
  colors: { primary: '#000', secondary: '#111', accent: '#222', uiAccent: '#5B9BFF', onAccent: '#0a0e1a' },
  yearStart: null,
  yearEnd: null,
  isCurrent: true,
  ...over,
});

describe('eraBucket', () => {
  it('maps a year to its decade', () => {
    expect(eraBucket(1976)).toBe('1970s');
    expect(eraBucket(2009)).toBe('2000s');
  });
  it('maps a null year to Undated', () => {
    expect(eraBucket(null)).toBe('Undated');
  });
});

describe('eraOptions', () => {
  it('returns distinct buckets sorted with Undated last', () => {
    const kits = [kit({ yearStart: 1976 }), kit({ yearStart: null }), kit({ yearStart: 1995 }), kit({ yearStart: 1976 })];
    expect(eraOptions(kits)).toEqual(['1970s', '1990s', 'Undated']);
  });
});

describe('matchesFilters', () => {
  const k = kit({ kind: 'throwback', yearStart: 1976, isCurrent: false });
  it('passes when all filters are all/false', () => {
    expect(matchesFilters(k, { kind: 'all', era: 'all', currentOnly: false })).toBe(true);
  });
  it('filters by kind', () => {
    expect(matchesFilters(k, { kind: 'away', era: 'all', currentOnly: false })).toBe(false);
    expect(matchesFilters(k, { kind: 'throwback', era: 'all', currentOnly: false })).toBe(true);
  });
  it('filters by era bucket', () => {
    expect(matchesFilters(k, { kind: 'all', era: '1970s', currentOnly: false })).toBe(true);
    expect(matchesFilters(k, { kind: 'all', era: '1990s', currentOnly: false })).toBe(false);
  });
  it('filters current-only against isCurrent', () => {
    expect(matchesFilters(k, { kind: 'all', era: 'all', currentOnly: true })).toBe(false);
    expect(matchesFilters(kit({ isCurrent: true }), { kind: 'all', era: 'all', currentOnly: true })).toBe(true);
  });
});

describe('groupByDivision', () => {
  it('nests kits under conference/division/team, teams alpha by name', () => {
    const kits = [
      kit({ teamId: 'rams', teamName: 'Los Angeles Rams', conference: 'NFC', division: 'West', id: 'rams-a' }),
      kit({ teamId: '49ers', teamName: 'San Francisco 49ers', conference: 'NFC', division: 'West', id: 'niners-a' }),
      kit({ teamId: 'rams', teamName: 'Los Angeles Rams', conference: 'NFC', division: 'West', id: 'rams-b' }),
    ];
    const groups = groupByDivision(kits);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ conference: 'NFC', division: 'West' });
    expect(groups[0].teams.map((t) => t.teamName)).toEqual(['Los Angeles Rams', 'San Francisco 49ers']);
    expect(groups[0].teams[0].kits.map((k) => k.id)).toEqual(['rams-a', 'rams-b']);
  });
  it('returns an empty array for no kits', () => {
    expect(groupByDivision([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/uniform-filter.test.ts`
Expected: FAIL — cannot find module `../uniforms/filter` (and `../roster-source` type until Task 4).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/uniforms/filter.ts
// Pure archive filtering + grouping (roadmap Phase 7 archive page). Kept out of the
// client component so every rule is unit-tested and the component stays state-only.
// Era and current-only are independent axes: a reintroduced throwback (yearStart 1976,
// isCurrent true) sits in the '1970s' bucket AND passes current-only.

import type { Conference, Division, UniformKind } from './../types';
import type { UniformListing } from './../roster-source';

export interface UniformFilters {
  kind: UniformKind | 'all';
  era: string; // 'all' | a bucket from eraBucket
  currentOnly: boolean;
}

export function eraBucket(yearStart: number | null): string {
  if (yearStart === null) return 'Undated';
  return `${Math.floor(yearStart / 10) * 10}s`;
}

// Distinct buckets present, decades ascending, 'Undated' last.
export function eraOptions(kits: UniformListing[]): string[] {
  const buckets = new Set(kits.map((k) => eraBucket(k.yearStart)));
  const undated = buckets.delete('Undated');
  const decades = Array.from(buckets).sort();
  return undated ? [...decades, 'Undated'] : decades;
}

export function matchesFilters(kit: UniformListing, f: UniformFilters): boolean {
  if (f.kind !== 'all' && kit.kind !== f.kind) return false;
  if (f.era !== 'all' && eraBucket(kit.yearStart) !== f.era) return false;
  if (f.currentOnly && !kit.isCurrent) return false;
  return true;
}

export interface TeamGroup {
  teamId: string;
  teamName: string;
  kits: UniformListing[];
}
export interface DivisionGroup {
  conference: Conference;
  division: Division;
  teams: TeamGroup[];
}

const CONFERENCES: Conference[] = ['AFC', 'NFC'];
const DIVISIONS: Division[] = ['East', 'North', 'South', 'West'];

// Stable conference→division→team order (matches the switcher convention). Preserves
// each team's incoming kit order (the DB returns them in a deterministic order).
export function groupByDivision(kits: UniformListing[]): DivisionGroup[] {
  const groups: DivisionGroup[] = [];
  for (const conference of CONFERENCES) {
    for (const division of DIVISIONS) {
      const inDiv = kits.filter((k) => k.conference === conference && k.division === division);
      if (inDiv.length === 0) continue;
      const byTeam = new Map<string, TeamGroup>();
      for (const k of inDiv) {
        let g = byTeam.get(k.teamId);
        if (!g) {
          g = { teamId: k.teamId, teamName: k.teamName, kits: [] };
          byTeam.set(k.teamId, g);
        }
        g.kits.push(k);
      }
      const teams = Array.from(byTeam.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
      groups.push({ conference, division, teams });
    }
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/uniform-filter.test.ts`
Expected: PASS (after Task 4's type export exists). If run before Task 4, the type import fails — do Task 4 Step 1 first.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/uniforms/filter.ts lib/__tests__/uniform-filter.test.ts
git commit -m "feat(uniforms): pure filter + division grouping for the archive"
```

---

## Task 4: listUniforms() seam

**Files:**
- Modify: `lib/roster-source.ts` (add type + interface method)
- Modify: `lib/roster-source.db.ts` (implement; reuse `UNIFORM_SELECT`, `uniformColors`, `fetchAllTeamMeta`, `toTeam`)
- Test: `lib/__tests__/roster-source.db.test.ts` (extend; env-gated)

**Interfaces:**
- Consumes: existing `TeamRow`, `UniformRow`, `UNIFORM_SELECT`, `uniformColors(row)`, `fetchAllTeamMeta()`, `toTeam(row)` in `lib/roster-source.db.ts`.
- Produces: `interface UniformListing { teamId: string; teamName: string; conference: Conference; division: Division; id: string; kind: UniformKind; name: string; colors: TeamColors; yearStart: number | null; yearEnd: number | null; isCurrent: boolean; imagePath?: string }`; `RosterSource.listUniforms(): Promise<UniformListing[]>`.

- [ ] **Step 1: Add the type + interface method in `lib/roster-source.ts`**

Add near `TeamMeta`:

```ts
import type { Conference, Division, TeamColors, UniformKind } from './types';

// A single kit flattened with its team's identity, for the archive listing (Phase 7
// archive page). Lightweight — no player data — so shipping all of them to the archive
// route does not violate the "one team's roster per page" invariant (this is kit
// metadata, not rosters).
export interface UniformListing {
  teamId: string;
  teamName: string;
  conference: Conference;
  division: Division;
  id: string;
  kind: UniformKind;
  name: string;
  colors: TeamColors;
  yearStart: number | null;
  yearEnd: number | null;
  isCurrent: boolean;
  imagePath?: string;
}
```

Add to the `RosterSource` interface:

```ts
  // Every kit for every team (home + curated), flattened with team identity, for the
  // uniform archive. No player data. Dangling team refs are skipped.
  listUniforms(): Promise<UniformListing[]>;
```

- [ ] **Step 2: Write the failing test (env-gated, mirrors existing style)**

Add inside the existing `maybeDescribe` block in `lib/__tests__/roster-source.db.test.ts`:

```ts
  it('lists every kit flattened with team identity', async () => {
    const kits = await dbRosterSource.listUniforms();
    expect(kits.length).toBeGreaterThan(72); // 72 curated + 32 home
    const creamsicle = kits.find((k) => k.id === 'buccaneers-creamsicle');
    expect(creamsicle).toBeDefined();
    expect(creamsicle).toMatchObject({
      teamId: 'buccaneers',
      teamName: 'Tampa Bay Buccaneers',
      conference: 'NFC',
      division: 'South',
      kind: 'throwback',
    });
    expect(kits.some((k) => k.kind === 'home')).toBe(true);
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `SUPABASE_URL=$SUPABASE_URL SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY npx vitest run lib/__tests__/roster-source.db.test.ts` (with `.env.local` present)
Expected: FAIL — `dbRosterSource.listUniforms is not a function`. (If env vars are absent the suite skips; set them from `.env.local` to actually exercise it.)

- [ ] **Step 4: Implement in `lib/roster-source.db.ts`**

Add a fetch helper near `fetchAllTeamMeta`:

```ts
async function fetchAllUniformRows(): Promise<UniformRow[]> {
  const client = getClient();
  const { data, error } = await client
    .from('uniforms')
    .select(UNIFORM_SELECT)
    .order('team_id', { ascending: true })
    .order('is_current', { ascending: false })
    .returns<UniformRow[]>();
  if (error) throw error;
  return data ?? [];
}
```

Add the method to the exported `dbRosterSource` object (alongside `listTeams`/`getTeam`), importing `UniformListing`:

```ts
  async listUniforms(): Promise<UniformListing[]> {
    const [teamRows, uniformRows] = await Promise.all([fetchAllTeamMeta(), fetchAllUniformRows()]);
    const teamsById = new Map(teamRows.map((r) => [r.id, toTeam(r)]));
    // flatMap + [] skips a kit whose team row is missing (dangling ref, invariant 6).
    return uniformRows.flatMap((row) => {
      const team = teamsById.get(row.team_id);
      if (!team) return [];
      return [
        {
          teamId: team.id,
          teamName: `${team.city} ${team.name}`,
          conference: team.conference,
          division: team.division,
          id: row.id,
          kind: row.kind as UniformKind,
          name: row.name,
          colors: uniformColors(row),
          yearStart: row.year_start,
          yearEnd: row.year_end,
          isCurrent: row.is_current,
          imagePath: row.image_path ?? undefined,
        },
      ];
    });
  },
```

Ensure `UniformListing`, `Conference`, `Division`, `UniformKind` are imported at the top of the file (add to existing import lines).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/roster-source.db.test.ts` (with env vars) and `npx tsc --noEmit`
Expected: PASS; tsc exits 0.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add lib/roster-source.ts lib/roster-source.db.ts lib/__tests__/roster-source.db.test.ts
git commit -m "feat(uniforms): listUniforms() seam returning every kit with team identity"
```

---

## Task 5: show-uniform-archive launch flag

**Files:**
- Modify: `lib/flag-decisions.ts`
- Modify: `lib/flags.ts`
- Test: `lib/__tests__/flag-decisions.test.ts`

**Interfaces:**
- Produces: `decideShowUniformArchive(env: { SHOW_UNIFORM_ARCHIVE?: string }): boolean`; `showUniformArchive` flag (async, `() => Promise<boolean>`).

- [ ] **Step 1: Write the failing test**

Add to `lib/__tests__/flag-decisions.test.ts`:

```ts
import { decideShowUniformArchive } from '../flag-decisions';

describe('decideShowUniformArchive', () => {
  it('is on only when SHOW_UNIFORM_ARCHIVE is exactly "1"', () => {
    expect(decideShowUniformArchive({ SHOW_UNIFORM_ARCHIVE: '1' })).toBe(true);
    expect(decideShowUniformArchive({ SHOW_UNIFORM_ARCHIVE: 'true' })).toBe(false);
    expect(decideShowUniformArchive({})).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/flag-decisions.test.ts`
Expected: FAIL — `decideShowUniformArchive` is not exported.

- [ ] **Step 3: Implement the decision + flag**

In `lib/flag-decisions.ts`:

```ts
export function decideShowUniformArchive(env: { SHOW_UNIFORM_ARCHIVE?: string }): boolean {
  return env.SHOW_UNIFORM_ARCHIVE === '1';
}
```

In `lib/flags.ts` (import the new decision, add the flag):

```ts
import { decideShowUniformPicker, decideShowUniformArchive } from '@/lib/flag-decisions';

// Phase 7 uniform archive page (/uniforms). Off until the archive page is ready to
// launch; flip via the SHOW_UNIFORM_ARCHIVE env var + redeploy (or Vercel Toolbar in a
// preview). Gates the route (404 when off) and any nav link.
export const showUniformArchive = flag<boolean>({
  key: 'show-uniform-archive',
  description: 'Expose the /uniforms archive gallery (Phase 7)',
  defaultValue: false,
  options: [
    { value: false, label: 'Hidden' },
    { value: true, label: 'Visible' },
  ],
  decide: () => decideShowUniformArchive(process.env as { SHOW_UNIFORM_ARCHIVE?: string }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/flag-decisions.test.ts` and `npx tsc --noEmit`
Expected: PASS; tsc exits 0.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/flag-decisions.ts lib/flags.ts lib/__tests__/flag-decisions.test.ts
git commit -m "feat(flags): show-uniform-archive launch gate for the archive page"
```

---

## Task 6: /uniforms route + UniformArchive client component

**Files:**
- Create: `app/uniforms/page.tsx` (server)
- Create: `components/UniformArchive.tsx` (client)

**Interfaces:**
- Consumes: `dbRosterSource.listUniforms()`, `showUniformArchive()`, `UniformListing`; `matchesFilters`, `eraOptions`, `groupByDivision`, `UniformFilters` from `lib/uniforms/filter`; `UniformFigure`; `UNIFORM_KINDS` (define locally — the union `UniformKind`).

- [ ] **Step 1: Create the client archive component**

```tsx
// components/UniformArchive.tsx
'use client';

import { useMemo, useState } from 'react';
import type { UniformListing } from '@/lib/roster-source';
import type { UniformKind } from '@/lib/types';
import {
  matchesFilters,
  eraOptions,
  groupByDivision,
  type UniformFilters,
} from '@/lib/uniforms/filter';
import UniformFigure from './UniformFigure';

const KINDS: (UniformKind | 'all')[] = ['all', 'home', 'away', 'throwback', 'alternate', 'color-rush'];

// The uniform archive (roadmap Phase 7). Receives every kit from the server route and
// filters/groups client-side with the pure helpers in lib/uniforms/filter. State-only:
// no data fetching here. Kits are drawn as generated vector uniforms (UniformFigure).
export default function UniformArchive({ kits }: { kits: UniformListing[] }) {
  const [filters, setFilters] = useState<UniformFilters>({ kind: 'all', era: 'all', currentOnly: false });
  const eras = useMemo(() => eraOptions(kits), [kits]);
  const groups = useMemo(
    () => groupByDivision(kits.filter((k) => matchesFilters(k, filters))),
    [kits, filters]
  );

  return (
    <main style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#f0f4ff' }} className="px-4 py-6">
      <h1 className="text-xl font-bold">Uniform Archive</h1>
      <p className="mt-1 text-sm" style={{ color: '#A5ACAF' }}>
        Every kit for all 32 teams.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          aria-label="Filter by kind"
          value={filters.kind}
          onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value as UniformKind | 'all' }))}
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f4ff' }}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k === 'all' ? 'All kinds' : k}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by era"
          value={filters.era}
          onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value }))}
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f0f4ff' }}>
          <option value="all">All eras</option>
          {eras.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.currentOnly}
            onChange={(e) => setFilters((f) => ({ ...f, currentOnly: e.target.checked }))}
          />
          Current only
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: '#A5ACAF' }}>
          No kits match these filters.
        </p>
      ) : (
        groups.map((g) => (
          <section key={`${g.conference}-${g.division}`} className="mt-8">
            <h2 className="text-xs font-semibold tracking-widest" style={{ color: '#A5ACAF' }}>
              {g.conference} {g.division.toUpperCase()}
            </h2>
            {g.teams.map((t) => (
              <div key={t.teamId} className="mt-3">
                <h3 className="text-sm font-bold">{t.teamName}</h3>
                <div className="mt-2 flex flex-wrap gap-4">
                  {t.kits.map((k) => (
                    <figure key={k.id} className="w-20 text-center">
                      <UniformFigure
                        colors={k.colors}
                        variant="full"
                        size={64}
                        imagePath={k.imagePath}
                        title={`${t.teamName} ${k.name}`}
                      />
                      <figcaption className="mt-1 text-[11px]" style={{ color: '#c8cdd6' }}>
                        {k.name}
                        {k.yearStart ? ` · ${k.yearStart}${k.yearEnd ? `–${k.yearEnd}` : '–'}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
```

- [ ] **Step 2: Create the server route**

```tsx
// app/uniforms/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbRosterSource } from '@/lib/roster-source.db';
import { showUniformArchive } from '@/lib/flags';
import UniformArchive from '@/components/UniformArchive';

export const metadata: Metadata = {
  title: 'Uniform Archive · Depth',
  description: 'Browse every NFL uniform kit — home, away, throwbacks, and alternates — for all 32 teams.',
};

// Archive gallery (roadmap Phase 7). Gated by the show-uniform-archive flag (off until
// launch). The flag decide() is request-free so this route stays statically
// prerenderable. Resolves the full kit list server-side and hands it to the client
// filter component — kit metadata only, no rosters.
export default async function UniformsPage() {
  if (!(await showUniformArchive())) {
    notFound();
  }
  const kits = await dbRosterSource.listUniforms();
  return <UniformArchive kits={kits} />;
}
```

- [ ] **Step 3: Typecheck + full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc exits 0; suite green.

- [ ] **Step 4: Verify in the browser (flag on)**

Start the dev server with the flag enabled, then drive the page:

```bash
SHOW_UNIFORM_ARCHIVE=1 npm run dev
```

- Load `/uniforms` → confirm teams appear grouped by conference/division, each with labeled `full` uniform figures.
- Change the **kind** filter to `throwback` → grid narrows to throwbacks only.
- Toggle **Current only** → retired kits (e.g. Seahawks 1976 Throwback) drop out.
- Load a team page (e.g. `/team/eagles`) with `SHOW_UNIFORM_PICKER=1`, open the picker → the jersey swatches look identical to before (JerseySwatch parity).
- With the flag off (`npm run dev` without the env var), `/uniforms` returns 404.
- Check at 390px width: filters wrap, figures reflow, no horizontal scroll.

Capture a screenshot of `/uniforms` for the PR.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add app/uniforms/page.tsx components/UniformArchive.tsx
git commit -m "feat(uniforms): /uniforms archive gallery behind show-uniform-archive flag"
```

---

## Self-Review Notes (author)

- **Spec coverage:** renderer+variants (T1/T2), picker parity (T2), listUniforms seam (T4), page+grouping (T3/T6), filters (T3/T6), flag (T5), performance (route is code-split + flagged, no assets — inherent). All spec sections map to a task.
- **No new deps:** tests are pure `lib/` + env-gated DB; no jsdom/RTL added.
- **Type consistency:** `UniformListing`, `UniformFilters`, `variantSpec`, `matchesFilters`, `groupByDivision`, `showUniformArchive`, `decideShowUniformArchive`, `listUniforms` used identically across tasks. `UniformListing` is defined in Task 4 Step 1 — land that export before Task 3 compiles (noted in Task 3).
- **Out of scope respected:** no per-kit striping data, no `imagePath` art produced, no URL filter state, no per-team route, home-load slowness left to its Backlog ticket.
