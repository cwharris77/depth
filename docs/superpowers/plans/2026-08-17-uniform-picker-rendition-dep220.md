# Uniform Picker Artifact Pipeline + iOS Row Rendition (DEP-220)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Vault ticket:** `../obsidian/Projects/depth/Tickets/Uniform picker has no visual rendition of the uniform.md` (backlog, P2, effort L).
**Vault spec linkage:** no dedicated DEP-220 spec exists; round-4 spec (`2026-08-15-native-ios-round-4-header-and-stats-design.md`) explicitly defers the art-delivery decision to this ticket.

**Goal:** Render a visual rendition of each uniform in the native iOS `UniformPickerSheet` row, backed by a reproducible artifact pipeline that delivers uniform art to the client.

**Architecture (locked decision):** pre-rendered WebP rasters, generated once from the existing React `UniformFigure` renderer and committed under `public/uniforms/`. SwiftUI has no SVG decoder, and the web SVGs are React-rendered, not static files — so a raster export is the only option that serves both platforms from one artifact. Hosting is Vercel static (`https://depth-ashen.vercel.app/uniforms/<id>.webp`) — the same committed-raster precedent as `scripts/gen-icons.mts` (which writes `ios/Depth/LaunchMark.png`), zero new infrastructure/secrets, and the iOS app already depends on `depth-ashen.vercel.app` (see `AppBuildInfo.swift`). Supabase Storage was considered and rejected: it adds bucket config + upload tooling + a second origin for no benefit over the existing static-assets path.

**Data flow:** one script renders every row the picker shows (all `uniforms` rows: `source='espn'` home rows, `source='curated'` kits, and reconcile-retired `-home-<year>` snapshots) using each row's own colors + its team's definition (`getTeamUniformDefinition`), rasterizes with sharp → `public/uniforms/<id>.webp`. The deterministic URL is written into the DB (`uniforms.image_path`, the column whose comment already says `null -> generated jersey-SVG fallback (PR2)` — this is PR2): a backfill migration sets it for every existing row, and `seed-sql.ts` derives it for every future curated kit. Both platforms read `image_path` unchanged.

**Tech stack:** TypeScript 5, React 19 server rendering, sharp (already in devDependencies), Supabase Postgres, SwiftUI.

## Global Constraints

- Do not modify `lib/uniforms/data.ts` or database-owned uniform colors.
- Do not add dependencies.
- Do not reproduce trademarked team logos, wordmarks, league shields, or sponsor marks (the figure's own constraint — the raster is a re-render of the same geometry, no new marks). Attribution/attribution carry-over is unchanged: `ATTRIBUTIONS.md` + `docs/uniform-model-brief.md` already cover the figure's provenance, and the raster introduces no new source material.
- Art must render exactly what the picker renders today: `variant='jersey'` (`lib/uniforms/figure.ts` viewBox `20 372 560 452`), colors from the uniform row, kit geometry from the team's definition (jersey/helmet absent in this crop, so only jersey/sleeve/collar/number layers apply).
- The generated SVG must be deterministic (stable bytes across runs) so re-running the generator never produces a spurious git diff.
- Do not write to the hosted DB outside a migration (AGENTS.md §6); the backfill ships as a committed migration applied by the Supabase pipeline on merge.
- Run Prettier only on files changed by this plan.

---

### Task 1: Add the pure art module and its tests

**Files:**
- Create: `lib/uniforms/art.tsx` (JSX — renders UniformFigure)
- Create: `lib/uniforms/art.test.ts`

**Interfaces:**
- `uniformArtURL(id: string): string` — `https://depth-ashen.vercel.app/uniforms/<id>.webp`.
- `renderUniformThumbSVG(colors, kitId, definition): string` — SSR of `UniformFigure` (`variant='jersey'`, `size=560`) via `renderToStaticMarkup`, with the Anton `var(--font-anton)` stack replaced by a rasterizer-safe `Helvetica, sans-serif` (librsvg/sharp can't resolve the CSS var; the swap is what makes the raster deterministic across machines).

- [x] **Step 1: Write failing tests**

Create `lib/uniforms/art.test.ts`:
- `uniformArtURL('bengals-color-rush')` → `'https://depth-ashen.vercel.app/uniforms/bengals-color-rush.webp'`.
- `renderUniformThumbSVG` with a Seahawks Rivalries palette + `getTeamUniformDefinition('seahawks')`:
  - output contains `viewBox="20 372 560 452"`;
  - output contains the resolved primary (`#C6D3DC` for seahawks-rivalries-2025) and the generic number outline color;
  - output does not contain `var(--font-anton)`;
  - two calls return identical strings (determinism).
- `renderUniformThumbSVG` with no definition (generic kit) still renders without throwing and contains the jersey surface.

- [x] **Step 2: Run and verify RED**

Run `npm test -- lib/uniforms/art.test.ts`. Expected: FAIL — `lib/uniforms/art.tsx` does not exist.

- [x] **Step 3: Implement the module**

Create `lib/uniforms/art.tsx` with the two exports and a role-and-constraint header. `renderUniformThumbSVG` renders `<UniformFigure colors kitId definition variant="jersey" size={560} />` and performs the single deterministic `font-family` replacement before returning.

- [x] **Step 4: Run and verify GREEN**

`npm test -- lib/uniforms/art.test.ts`. Expected: pass.

- [x] **Step 5: Format and commit**

```bash
npx prettier --write lib/uniforms/art.tsx lib/uniforms/art.test.ts
git add lib/uniforms/art.tsx lib/uniforms/art.test.ts
git commit -m "feat(uniforms): add deterministic thumbnail art module"
```

---

### Task 2: Wire the artifact pipeline script

**Files:**
- Create: `scripts/gen-uniform-thumbs.mts`
- Modify: `package.json` (add `gen:uniform-thumbs` script)

**Interfaces:**
- Reads every row of `uniforms` (id, team_id, color_primary, color_secondary, color_accent, ui_accent, on_accent) from the hosted DB via `createClient(getSupabaseUrl(), getSupabaseSecretKey())` — same I/O-glue pattern as the ingest scripts (`.env.local` auto-load; read-only, no writes).
- For each row: `renderUniformThumbSVG(rowColors, row.id, getTeamUniformDefinition(row.team_id))` → sharp `.webp()` → `public/uniforms/<id>.webp` (mkdir -p first).
- Prints a per-file line + total count; exits non-zero if any render fails.

- [x] **Step 1: Implement the script**

Follow the header-comment style of `scripts/gen-icons.mts` and the env handling of `scripts/ingest-espn.mts` (`getSupabaseUrl`/`getSupabaseSecretKey` live in `scripts/ingest-espn.mts` or a shared helper — reuse, don't duplicate).

- [x] **Step 2: Add the npm script**

```json
"gen:uniform-thumbs": "tsx scripts/gen-uniform-thumbs.mts"
```

- [x] **Step 3: Run the generator and inspect output**

```bash
npm run gen:uniform-thumbs
```

Verify: one file per DB row under `public/uniforms/`, and visually spot-check at least `seahawks-home`, `bengals-color-rush`, `bills-rivalries-2025` (a team with a definition, a curated kit, and the generic-render path). Convert a couple to PNG if the inspection tool needs it.

- [x] **Step 4: Format and commit**

```bash
npx prettier --write scripts/gen-uniform-thumbs.mts package.json
git add scripts/gen-uniform-thumbs.mts package.json public/uniforms
git commit -m "feat(uniforms): generate jersey thumbnails for every kit"
```

---

### Task 3: Persist the artifact URL in the DB

**Files:**
- Modify: `lib/uniforms/seed-sql.ts`
- Modify: `lib/__tests__/uniform-seed-gen.test.ts`
- Create: `supabase/migrations/<ts>_backfill_uniform_image_paths.sql`

**Interfaces:**
- Future curated seeds emit `image_path = uniformArtURL('${teamId}-${slug}')` unless `data.ts` explicitly sets `imagePath`.
- A one-time idempotent migration sets `image_path = 'https://depth-ashen.vercel.app/uniforms/' || id || '.webp'` for every existing row (curated + espn home + retired home snapshots).

- [x] **Step 1: Update seed-sql**

In `rowValues`, change `image_path: u.imagePath ?? null` to `image_path: u.imagePath ?? uniformArtURL(\`${u.teamId}-${u.slug}\`)`.

- [x] **Step 2: Extend the seed test**

In `uniform-seed-gen.test.ts`, add: every emitted row contains its derived `image_path` URL matching `uniformArtURL`, and no row emits `NULL` for `image_path`.

- [x] **Step 3: Add the backfill migration**

Create `<ts>_backfill_uniform_image_paths.sql` — plain idempotent UPDATE (no schema change, so `db:types` regeneration is NOT needed):

```sql
update uniforms
set image_path = 'https://depth-ashen.vercel.app/uniforms/' || id || '.webp',
    updated_at = now()
where image_path is null;
```

- [x] **Step 4: Run tests and commit**

```bash
npm test -- lib/__tests__/uniform-seed-gen.test.ts lib/uniforms/art.test.ts
npx prettier --write lib/uniforms/seed-sql.ts lib/__tests__/uniform-seed-gen.test.ts
git add lib/uniforms/seed-sql.ts lib/__tests__/uniform-seed-gen.test.ts supabase/migrations
git commit -m "feat(uniforms): persist thumbnail URL on uniform rows"
```

---

### Task 4: Render the thumbnail in the iOS picker

**Files:**
- Modify: `ios/Depth/Features/TeamDetail/UniformPickerSheet.swift`

- [x] **Step 1: Add the leading thumbnail**

In the row `HStack`, before the text `VStack`, render when `uniform.imagePath` resolves to a URL:

```swift
AsyncImage(url: url) { phase in
    if let image = phase.image {
        image.resizable().scaledToFill()
    }
}
.frame(width: 48, height: 64)          // 3:4, matches web's object-cover box
.background(DesignTokens.Colors.surfaceRaised)
.clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
.accessibilityHidden(true)             // the row label already names the kit
```

Rows without an `imagePath` keep today's text-only layout (no empty box — same degrade, don't fake rule as the web's JerseySwatch fallback).

- [x] **Step 2: Regenerate the Xcode project and run the targeted tests**

```bash
cd ios && xcodegen generate && cd ..
```

Run `xcodebuild test -project ios/Depth.xcodeproj -scheme Depth -destination 'platform=iOS Simulator,id=…' -only-testing:DepthTests/TeamSnapshotMapperTests` (the suite that touches Uniform mapping) plus `DepthUITests/DepthUITests` if it exercises the picker.

- [x] **Step 3: Format and commit**

```bash
git add ios/Depth/Features/TeamDetail/UniformPickerSheet.swift ios/Depth.xcodeproj/project.pbxproj
git commit -m "feat(ios): show uniform thumbnails in the picker"
```

---

### Task 5: Full verification and closeout

**Files:**
- Verify: every file changed in Tasks 1–4

- [x] **Step 1: Scope and quality gate**

```bash
git status --short
git diff main...HEAD --stat
git diff main...HEAD --check
npm run format:check
npx tsc --noEmit
npm test
```

Record test counts. Require no unrelated files, no whitespace errors, exit 0 everywhere.

- [x] **Step 2: Screenshot-verify the picker for ≥1 team with multiple kits**

Serve `public/uniforms/` on a local port (e.g. `python3 -m http.server 8787 -d public`), build the app to a simulator, and capture the `Choose Uniform` sheet for a multi-kit team (Bills or Bengals). Because the hosted DB's `image_path` is still NULL until the migration lands on merge, verification either (a) uses a Debug-only `UI_TESTING_UNIFORM_ART_BASE_URL` launch-argument hook that rewrites each uniform's image URL to `<base>/<id>.webp` for the screenshot, or (b) is completed post-merge against prod — record which. The generated WebP itself is already the exact pixel content the row will render, so the screenshot is confirming the row layout, frame sizing, and corner clipping.

- [x] **Step 3: Update README status line if the uniform-archive status is now stale**

Read the current uniform-archive status line; change it only if a statement becomes factually wrong.

- [x] **Step 4: Commit closeout docs (if any) and open the PR**

`gh pr create` with the house What/Why/Verification shape; squash-merge once green.
