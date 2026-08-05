# Team-Owned Uniform Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the central trim switchboard with typed per-team uniform definitions, preserve Bengals and Bills output, and add the Seahawks navy home construction geometry.

**Architecture:** Runtime `TeamColors` remain authoritative. Plain-data team definitions describe known helmet, jersey, sleeve, collar, number, pants, and leg layers; a pure resolver merges generic defaults, team defaults, and kit overrides. `UniformFigure` owns shared mannequin geometry, clipping, and paint order and receives only the applicable definition data from its caller.

**Tech Stack:** TypeScript 5, React 19 server rendering, Next.js 16 App Router, SVG, Vitest 4, Prettier 3.

## Global Constraints

- Do not modify `lib/uniforms/data.ts` or database-owned uniform colors.
- Do not add dependencies.
- Do not reproduce trademarked team logos, wordmarks, league shields, or sponsor marks.
- Keep helmet paths in raw helmet coordinates (`x:139-802, y:65-674`) and body paths in outer-viewBox coordinates.
- Unknown or incomplete definitions must render the generic uniform without throwing.
- Preserve the one-team client payload on team pages; only the archive may receive all definitions.
- Run Prettier only on files changed by this plan; do not create unrelated formatting diffs.

---

### Task 1: Add the typed definition contract and pure resolver

**Files:**
- Create: `lib/uniforms/teams/types.ts`
- Create: `lib/uniforms/model.ts`
- Create: `lib/uniforms/model.test.ts`

**Interfaces:**
- Produces: `ColorRef`, `UniformSurface`, `UniformLayer`, `NumberStyle`, `UniformStyle`, `UniformStyleOverride`, and `TeamUniformDefinition`.
- Produces: `resolveColor(ref, colors, bodyColor)` and `resolveUniformModel(definition, kitSlug, colors)`.
- Consumes: `TeamColors` from `lib/types.ts` and `readableTextOn` from `lib/colors.ts`.

- [ ] **Step 1: Write failing resolver tests**

Create `lib/uniforms/model.test.ts` with focused tests using this fixture:

```ts
const colors: TeamColors = {
  primary: '#002244',
  secondary: '#69BE28',
  accent: '#A5ACAF',
  uiAccent: '#69BE28',
  onAccent: '#000000',
};
```

Assert all of the following independently:

```ts
expect(resolveColor('primary', colors, colors.primary)).toBe('#002244');
expect(resolveColor('readable-on-body', colors, colors.primary)).toBe(
  readableTextOn(colors.primary)
);
expect(resolveColor('#FFFFFF', colors, colors.primary)).toBe('#FFFFFF');
```

Build a definition whose team default supplies helmet and sleeve layers and whose `home` override
replaces the helmet layer by stable ID, removes the sleeve layer through `removeLayerIds`, appends a
new collar layer, and leaves the number style omitted. Assert that `resolveUniformModel` applies
generic → team → kit precedence, distinguishes omission from selective removal, and preserves the
generic number fallback. Add separate assertions that an unknown kit slug uses team defaults and
an undefined definition returns the generic model.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- lib/uniforms/model.test.ts
```

Expected: FAIL because `lib/uniforms/model.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal contract**

In `lib/uniforms/teams/types.ts`, define discriminated filled/stroked path layers and the style
shape. Use stable string IDs so integrity tests and SVG keys do not depend on array position:

```ts
export type ColorRef = 'primary' | 'secondary' | 'accent' | 'readable-on-body' | `#${string}`;
export type UniformSurface =
  | 'helmet'
  | 'jersey'
  | 'sleeve-left'
  | 'sleeve-right'
  | 'collar'
  | 'number'
  | 'pants'
  | 'leg-left'
  | 'leg-right';

interface LayerBase {
  id: string;
  surface: UniformSurface;
  d: string;
  clip: boolean;
}

export type UniformLayer =
  | (LayerBase & { kind: 'fill'; fill: ColorRef })
  | (LayerBase & {
      kind: 'stroke';
      stroke: ColorRef;
      strokeWidth: number;
      lineCap?: 'butt' | 'round' | 'square';
    });

export interface NumberStyle {
  fill: ColorRef;
  outline: ColorRef;
  outlineWidth: number;
  glyphPath?: string;
}

export interface UniformStyle {
  helmetColor: ColorRef;
  jerseyColor: ColorRef;
  pantsColor: ColorRef;
  layers: UniformLayer[];
  number: NumberStyle;
}

export interface UniformStyleOverride {
  helmetColor?: ColorRef;
  jerseyColor?: ColorRef;
  pantsColor?: ColorRef;
  layers?: UniformLayer[];
  removeLayerIds?: string[];
  number?: Partial<NumberStyle> | null;
}

export interface TeamUniformDefinition {
  teamId: string;
  defaults?: UniformStyleOverride;
  kits: Record<string, UniformStyleOverride>;
}
```

In `lib/uniforms/model.ts`, define `GENERIC_UNIFORM_STYLE` with the existing renderer defaults and
implement immutable merge functions. Layers merge by stable `id`: matching IDs replace inherited
layers in place, new IDs append, `removeLayerIds` deletes inherited IDs before additions, and an
omitted `layers`/`removeLayerIds` pair inherits unchanged. `number: null` restores the generic
number style. Validate literal hex format only in integrity tests; runtime resolution must degrade
an unrecognized reference to the generic resolved color rather than throw.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `npm test -- lib/uniforms/model.test.ts`.

Expected: all resolver tests pass with zero failures.

- [ ] **Step 5: Format and commit Task 1**

Run:

```bash
npx prettier --write lib/uniforms/teams/types.ts lib/uniforms/model.ts lib/uniforms/model.test.ts
git add lib/uniforms/teams/types.ts lib/uniforms/model.ts lib/uniforms/model.test.ts
git commit -m "refactor(uniforms): add team definition model"
```

---

### Task 2: Migrate Bengals and Bills into team modules

**Files:**
- Create: `lib/uniforms/teams/bengals.ts`
- Create: `lib/uniforms/teams/bills.ts`
- Create: `lib/uniforms/teams/index.ts`
- Create: `lib/uniforms/teams/definitions.test.ts`
- Read only for source geometry: `lib/uniforms/trim.ts`

**Interfaces:**
- Consumes: `TeamUniformDefinition` and layer types from Task 1.
- Produces: `BENGALS_UNIFORMS`, `BILLS_UNIFORMS`, `TEAM_UNIFORM_DEFINITIONS`,
  `getTeamUniformDefinition(teamId)`, and `getAllTeamUniformDefinitions()`.
- Preserves every existing path string, stroke width, literal brand hex, and kit-specific absence
  currently encoded in `trim.ts`.

- [ ] **Step 1: Capture visual baselines before migration**

Start the dev server on the auto-selected port and capture full-uniform screenshots for:

```text
bengals-home
bengals-color-rush
bills-home
bills-away
bills-rivalries-2025
```

Save them under `/tmp/depth-uniform-baseline/`. Do not add them to git. Record the actual route and
viewport used in the task notes so the same route and viewport are reused after migration.

- [ ] **Step 2: Write failing definition-integrity tests**

Create `lib/uniforms/teams/definitions.test.ts`. Assert:

```ts
expect(getTeamUniformDefinition('bengals')?.teamId).toBe('bengals');
expect(getTeamUniformDefinition('bills')?.teamId).toBe('bills');
expect(getTeamUniformDefinition('unknown')).toBeUndefined();
```

Iterate all definitions and assert that team IDs and layer IDs are unique; every kit key is
non-empty; every color is a known semantic token or `/^#[0-9A-Fa-f]{6}$/`; every stroke width is
positive; and each `sleeve-left` layer ID has a corresponding `sleeve-right` layer ID after
normalizing the `-left`/`-right` suffix.

- [ ] **Step 3: Run the tests and verify RED**

Run `npm test -- lib/uniforms/teams/definitions.test.ts`.

Expected: FAIL because the team modules and registry do not exist.

- [ ] **Step 4: Move Bengals geometry without altering it**

Create `bengals.ts`. Copy the existing tiger helmet, sleeve, and knee path strings byte-for-byte
from `trim.ts`; rename them as team-local exported constants. Express the four existing kit configs
as `TeamUniformDefinition.kits` entries. Preserve the current body/helmet color remapping and the
absence of pants stripes where currently configured.

- [ ] **Step 5: Move Bills geometry without altering it**

Create `bills.ts`. Copy every Bills path, brand hex, stroke width, and collar band width byte-for-byte
from `trim.ts`. Express home, away, and Rivalries behavior as declarative layers and number styles.
Use `removeLayerIds` for the Rivalries sleeve/collar construction while its helmet layers remain
independently configurable. Keep the abstract decal geometry; do not add new logo detail.

- [ ] **Step 6: Add the server-side registry**

Create `index.ts` with static definitions and lookup helpers:

```ts
const DEFINITIONS = {
  bengals: BENGALS_UNIFORMS,
  bills: BILLS_UNIFORMS,
} satisfies Record<string, TeamUniformDefinition>;

export function getTeamUniformDefinition(teamId: string) {
  return DEFINITIONS[teamId as keyof typeof DEFINITIONS];
}

export function getAllTeamUniformDefinitions() {
  return DEFINITIONS;
}
```

Do not import this registry from `UniformFigure` or another component used by a team page.

- [ ] **Step 7: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- lib/uniforms/model.test.ts lib/uniforms/teams/definitions.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Format and commit Task 2**

Run Prettier on the four created files, stage them, and commit:

```bash
git commit -m "refactor(uniforms): split existing team definitions"
```

---

### Task 3: Make UniformFigure a generic layer assembler

**Files:**
- Modify: `components/UniformFigure.tsx`
- Modify: `components/JerseySwatch.tsx`
- Modify: `components/UniformSheet.tsx`
- Modify: `components/DepthChartField.tsx`
- Modify: `components/UniformArchive.tsx`
- Modify: `app/team/[id]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/uniforms/page.tsx`
- Replace test contents and rename: `lib/__tests__/uniform-figure.test.ts` →
  `lib/__tests__/uniform-figure.test.tsx`
- Delete: `lib/uniforms/trim.ts`

**Interfaces:**
- Consumes: `TeamUniformDefinition` and `resolveUniformModel` from Tasks 1–2.
- `UniformFigure` adds `definition?: TeamUniformDefinition`; existing callers without a definition
  retain generic rendering.
- `JerseySwatch` adds `kitId?: string` and `definition?: TeamUniformDefinition`.
- `DepthChartField` and `UniformSheet` receive the current team's optional definition.
- `UniformArchive` receives a serializable record of definitions keyed by team ID.

- [ ] **Step 1: Write renderer tests before changing production code**

Rename the current test to `.tsx`, preserve all `variantSpec` tests, and use
`renderToStaticMarkup` from `react-dom/server` for new behavior tests. Create a small definition
with one clipped helmet fill path, paired sleeve paths, a collar stroke, and an authored number
glyph. Render `UniformFigure` with and without that definition and assert:

- the generic render omits each custom layer ID;
- the custom render includes every layer's `data-layer-id`;
- the custom helmet path is inside the helmet clip group;
- the authored number path appears and the fallback text does not;
- an unknown kit uses team defaults without throwing.

- [ ] **Step 2: Run the renderer test and verify RED**

Run `npm test -- lib/__tests__/uniform-figure.test.tsx`.

Expected: FAIL because `UniformFigure` does not accept or render `definition`.

- [ ] **Step 3: Replace team branches with generic layer rendering**

In `UniformFigure.tsx`:

1. Remove all imports from `lib/uniforms/trim.ts`.
2. Resolve the model from `definition`, the kit slug derived from `definition.teamId`, and colors.
3. Keep shared `GEO`, clip paths, variants, outline, facemask, and generic defaults.
4. Render layers by surface at the existing paint positions: pants/legs before shoes, jersey and
   sleeves before collar/number, helmet before facemask.
5. Resolve every layer color through `resolveColor`.
6. Add `data-layer-id={layer.id}` to custom SVG elements for deterministic tests and inspection.
7. Render `number.glyphPath` as a path when present; otherwise keep the shared text `1`.

There must be no `bengals`, `bills`, or `seahawks` string and no team-specific path import in this
component.

- [ ] **Step 4: Thread definitions through callers**

- `JerseySwatch` passes `kitId` and `definition` to `UniformFigure`.
- `UniformSheet` passes each `u.id` and its team definition into `JerseySwatch`.
- `DepthChartField` accepts the one optional team definition and passes it to `UniformSheet`.
- `app/team/[id]/page.tsx` and both `DepthChartField` call sites in `app/page.tsx` resolve exactly
  one definition with `getTeamUniformDefinition(roster.team.id)` and pass it down.
- `app/uniforms/page.tsx` passes `getAllTeamUniformDefinitions()` to `UniformArchive`.
- `UniformArchive` selects `definitions[k.teamId]` for each figure.

Do not import the all-team registry into any client component.

- [ ] **Step 5: Delete the legacy trim module**

After `rg -n "uniforms/trim|TRIM_CONFIGS|BILLS_|HELMET_STRIPE_PATH" .` shows only the legacy file,
delete `lib/uniforms/trim.ts`. Run the same search again and require zero legacy references.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm test -- lib/uniforms/model.test.ts lib/uniforms/teams/definitions.test.ts lib/__tests__/uniform-figure.test.tsx
npm run typecheck
```

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 7: Compare migrated-team screenshots**

Capture the same five kits at the same route and viewport used in Task 2. Compare each new image
with its `/tmp/depth-uniform-baseline/` counterpart. Require no visible geometry, color, clipping,
or layer-order regression. If pixels differ, inspect the declarative mapping and fix it; do not
change the copied path geometry to hide a migration error.

- [ ] **Step 8: Format and commit Task 3**

Run Prettier on only the files listed in Task 3, rerun the focused tests and typecheck, then commit:

```bash
git commit -m "refactor(uniforms): render typed team layers"
```

---

### Task 4: Add the Seahawks navy home definition

**Files:**
- Create: `lib/uniforms/teams/seahawks.ts`
- Modify: `lib/uniforms/teams/index.ts`
- Modify: `lib/uniforms/teams/definitions.test.ts`
- Read only: `/tmp/SEA_F_home_ref.png`
- Read only: `/tmp/hawks_singles/SEA_singles_contact.png`

**Interfaces:**
- Produces: `SEAHAWKS_UNIFORMS` with a `home` kit override.
- Consumes: the declarative layer contract and runtime `TeamColors` tokens.

- [ ] **Step 1: Confirm the reference and enumerate only genuine overrides**

Inspect both supplied images and record that `SEA_F` is the navy-shell home combination. Before
authoring paths, list each visible difference from the generic renderer. At minimum inspect the
thin helmet center stripe, stepped silver/lime shoulder construction, collar, number treatment,
and pants leg stripe. Record generic defaults that are already correct and will remain omitted.

- [ ] **Step 2: Write the failing Seahawks definition test**

Add assertions that the registry returns `seahawks`, that it contains `home`, that the home override
uses the expected named layer IDs, and that it does not contain a helmet-logo or wordmark layer.
Also resolve the model with the Seahawks runtime palette and assert inherited navy body colors and
semantic silver/lime layer colors resolve correctly.

- [ ] **Step 3: Run the test and verify RED**

Run `npm test -- lib/uniforms/teams/definitions.test.ts`.

Expected: FAIL because `SEAHAWKS_UNIFORMS` is not registered.

- [ ] **Step 4: Author the Seahawks team module**

Create `seahawks.ts` and export named path constants for only the verified geometry. Author the
left sleeve in outer-viewBox coordinates and calculate the right path with `mirroredX = 588 - x`,
then store the resulting explicit right path. Author helmet construction in helmet coordinates.
Use semantic `primary`, `secondary`, and `accent` tokens wherever the runtime palette supplies the
correct color. Do not set body colors, number style, collar, or pants layers when the generic model
already matches the reference. Do not trace the feather/wing helmet logo.

- [ ] **Step 5: Register Seahawks and verify GREEN**

Add `seahawks: SEAHAWKS_UNIFORMS` to the registry and run:

```bash
npm test -- lib/uniforms/teams/definitions.test.ts lib/__tests__/uniform-figure.test.tsx
npm run typecheck
```

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 6: Render and inspect the Seahawks screenshot**

Run the dev server using `.claude/launch.json`'s auto-port behavior. Open the archive picker at the
same deterministic viewport used for migration baselines, select/render `seahawks-home`, and save a
screenshot under `/tmp/depth-seahawks-home-render.png`. Inspect it side-by-side with
`/tmp/SEA_F_home_ref.png` and verify:

- navy helmet, jersey, and pants remain runtime-color driven;
- the generic wide helmet band is absent and the thin center construction is present;
- silver/lime shoulder geometry matches the reference's stepped placement;
- no helmet logo, chest wordmark, or shield was introduced;
- collar, number, and pants are overridden only where the reference required it;
- no custom geometry escapes its clip surface.

- [ ] **Step 7: Format and commit Task 4**

Run Prettier on the three changed files, rerun the focused tests and typecheck, then commit:

```bash
git commit -m "feat(uniforms): add Seahawks home definition"
```

---

### Task 5: Full verification and documentation closeout

**Files:**
- Modify only if behavior descriptions became stale: `README.md`
- Verify: every file changed in Tasks 1–4

**Interfaces:**
- Consumes the completed renderer migration and Seahawks definition.
- Produces fresh automated and browser evidence suitable for a PR description.

- [ ] **Step 1: Review the final diff for scope**

Run:

```bash
git status --short
git diff main...HEAD --stat
git diff main...HEAD --check
rg -n "uniforms/trim|TRIM_CONFIGS|bengals|bills|seahawks" components/UniformFigure.tsx
```

Require no unrelated files, no whitespace errors, no legacy trim references, and no team names in
the generic renderer.

- [ ] **Step 2: Run the requested focused test**

Run `npm test -- lib/__tests__/uniform-figure.test.tsx`.

Expected: all variant and renderer tests pass.

- [ ] **Step 3: Run the full quality gate**

Run each command separately and require exit code 0:

```bash
npm test
npm run typecheck
npm run format:check
```

Record test-file and test counts from Vitest output. Existing lint warnings are not part of these
commands and must not be presented as new failures.

- [ ] **Step 4: Capture final visual evidence**

Take final screenshots for `bengals-home`, `bills-home`, and `seahawks-home` at the same viewport.
Verify the first two against their baselines and the Seahawks against the supplied reference. Keep
screenshots in `/tmp`; do not add owner-supplied reference art to the repository.

- [ ] **Step 5: Update README only if necessary**

Read the current uniform-archive status line. Change it only if the architecture migration makes a
current statement factually wrong; do not claim all teams are accurate after migrating three.

- [ ] **Step 6: Commit any necessary closeout documentation**

If Step 5 changed documentation, commit it with:

```bash
git commit -m "docs(uniforms): update renderer status"
```

If no documentation changed, do not create an empty commit.
