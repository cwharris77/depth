# Uniform art — agent guide

How a team's uniform art is built and changed. Read this before touching `teams/`. The web app rules in `web/CLAUDE.md` still apply; this file covers the art pipeline only.

## How the art is put together

- Every team is a module in `teams/<team>/`: `source.ts` (raw path data such as decals and wordmarks), `parts.ts` (palette, helmets built with `expandHelmet()`, pants, socks), `jerseys/<name>.ts` (one file per jersey), `index.ts` (assembles the `TeamPartsDefinition` and calls `compileParts`).
- A part is a base colour plus ordered layers (`PartLayer`). Later layers paint over earlier ones. Coordinates are the shared mannequin space: jersey crop `viewBox="20 372 560 452"`, neck at y≈384, sleeve hems at y≈589.
- Colours in layers are palette keys, never hexes. `hex()` throws on an unknown key. The one team-independent paint is `outline` (the mannequin's grey, `FIGURE_OUTLINE`), for keylines that separate a band from a body of the same colour.
- Geometry that is a fact about the mannequin, not about a team, lives in `teams/core/shared.ts` (collars, the helmet crown stripe, the helmet numeral). Team modules own everything team-specific.
- The silhouette, the collar geometry and the numeral glyph (a `3`) are shared by every team. Don't chase a reference's collar width or depth or its numeral shape in a team module; that is a catalog change affecting everyone.

## Jerseys are specs first

A jersey's construction (body, collar, sleeve cap, sleeve stripes, cuff, numeral colours) is written as a `JerseySpec` (`teams/core/jersey-spec.ts`) and expanded with `expandJersey()`. The spec names primitives and palette keys; it holds no coordinates. `teams/broncos/jerseys/orange.ts` is the worked example.

```ts
const spec = expandJersey('<team>-<jersey>', {
  body: 'orange',
  collar: { style: 'inset-v', color: 'orange', inside: 'orangeNeck', lining: 'navy', outline: true, backBar: 'navy' },
  shoulderPanel: { bands: [{ color: 'white', size: 'l' }, { color: 'navy', size: 'm' }] },
  number: { fill: 'white', outline: 'navy', outlineWeight: 'thin' },
});
```

Anything the spec cannot describe is appended as ordinary layers after `spec.layers`: chest wordmarks, patches, printed pattern fields. A jersey dominated by a pattern field may skip the spec and call the shared primitives directly (`teams/seahawks/jerseys/rivalries-2025.ts`).

### Spec vocabulary

| Field | Meaning |
|---|---|
| `body` | Torso colour. |
| `collar.style` | `inset-v` (modern V with a band down to a point), `shallow-v`, `rounded` (period crew neck), `none`. |
| `collar.color` / `trim` | Collar band and, for `inset-v`, its centre inset. |
| `collar.inside` | Fill inside the V (defaults to the body). Use a darker shade of the body (a `<colour>Neck` palette key) when the reference shows one, or when a body-coloured collar disappears without it. |
| `collar.lining` / `backBar` / `outline` | `inset-v` only: a band on the inner half of the collar; the bar across the back of the neck (always drawn, in the collar colour unless `backBar` sets another); grey keylines on both collar edges and under the back bar. |
| `shoulderPanel.bands` | Colour blocks from the top of the sleeve down. The first is the cap, filling to the shoulder seam with a curved inner edge; every edge slopes down toward the body. |
| `shoulderStripes` | Canted stripes running down the sleeve from the shoulder line, listed from the collar outward, each leaning its lower end toward the body. Same `gap` steps as `sleeveStripes`. |
| `shoulderNumber` | The numeral lying along the top of each shoulder, in `fill` with an optional thin `outline`. On a reference sheet it often reads as a short bar. See the orientation rule below. |
| `sleeveStripes` | Horizontal stripes lower on the sleeve, with `gap` `none` / `narrow` / `wide` / `broad`. `edge` pipes every stripe with a thin band of that colour above and below it; the gap is then measured between pipings. |
| `cuff` | A solid band at the sleeve hem. |
| `sleeveNumber` | The numeral, small and upright on the lower outer face of each sleeve (TV numbers), in `fill`. |
| `number` | Numeral fill, outline colour and `outlineWeight` (`none` / `thin` / `regular` / `heavy`). `outline` is required even with `none`. |

**Shoulder number orientation** (a frequent mistake): seen from above, the two numerals' tops point at each other, toward the collar (`→ ←`), and on both shoulders the open side of the numeral (the tips of a `3`) faces the back of the jersey. The right shoulder is therefore the left one mirrored, not rotated. On the front view this puts the open side toward the top of the shoulder on both sleeves.

Sizes are `s` / `m` / `l` (11 / 16 / 28 mannequin units); gaps are `none` / `narrow` / `wide` / `broad` (0 / 6 / 12 / 18). Pick the nearest step. A stripe with a contrasting border is one band with `edge` piping, not three bands. If a reference sits well between steps and the difference is visible at 390px, add a step (see below) rather than faking it with extra bands. Each primitive is drawn on both sleeves with unique layer ids.

### Pants and socks

Pants and socks are specs too (`teams/core/pants-spec.ts`), expanded with `expandPants()` and `expandSocks()` into ordinary parts. A kit names its socks with `socks:` in its `KitRef` and the team registers them under `socks`; a kit without socks paints them in the pants colour.

```ts
pants: { navy: expandPants('<team>-navy-pants', { body: 'navy', stripes: { position: 'leg-edge', bands: [{ color: 'orange', size: 'm' }], gap: 'none', edge: 'white' } }) },
socks: { navy: expandSocks('<team>-navy-socks', { color: 'navy', stripes: { bands: [{ color: 'orange', size: 's' }], gap: 'none' } }) },
```

| Field | Meaning |
|---|---|
| `PantsSpec.body` | Pants colour. |
| `PantsSpec.stripes` | Stripes from the waist to the hem, listed from the outer edge inward, with the jersey's `gap` and `edge` rules. `position: 'leg-edge'` follows the leg's outer silhouette (how a side-seam stripe reads from the front); `'center'` is a straight stack on the leg's seam line. Stripes stop at the hem. |
| `SocksSpec.color` | Sock colour, painted on both shins below the hem. |
| `SocksSpec.stripes` | Hoops around the calf, listed from the top down. |

When a team moves to these specs, any shin art it had drawn as pants layers on `leg-left`/`leg-right` (such as full-shin sock rectangles) moves into its socks part instead — leg layers paint over the sock colour, so leaving them in place would hide it.

Pants and socks use the same step names as the jersey with narrower widths: sizes `s` / `m` / `l` are 8 / 16 / 24 units, gaps `none` / `narrow` / `wide` / `broad` are 0 / 4 / 8 / 12, and `edge` piping is 2. A reference sheet often draws the leg stripe in a swatch beside the figure; the swatch beside the socks is the sock, not the pant.

## Helmets

Every helmet is built with `expandHelmet()` (`teams/core/helmet-spec.ts`) from a `HelmetSpec`, and `teams/__tests__/helmets.test.ts` fails if one isn't.

```ts
const HELMET_WHITE = expandHelmet('<team>-white-helmet', {
  shell: 'white',
  facemask: 'gold',                    // or 'neutral' for the shared grey cage
  decal: placed(decalLayers),          // or 'none'
  number: { fill: 'powderBlue' },      // or 'none'
});
```

| Field | Meaning |
|---|---|
| `shell` | Shell colour. |
| `facemask` | Cage colour, or `'neutral'` for the shared grey cage. |
| `decal` | The shell's finished art, crown stripes included (a few older helmet parts also carry collar or sleeve layers, which pass through the same way), as a placed mark: `placed(layers)` emits the layers exactly as written. Existing helmet art is never redrawn or re-fitted. |
| `number` | The athletic 3 on the side panel, in `fill`, or `'none'`. It fits the one shared shell, so adding a missing number is this one field. |

## Marks

Marks are polygon art only for now: a mark is fixed vector art such as a helmet decal or sleeve logo, drawn as absolute M/L/Z polygons — curve commands are not supported yet. `teams/<team>/marks/<name>.ts` exports a `Mark` whose paths are absolute M/L/Z polygons in the art's own space, one per colour slot in paint order, plus a `box`: the box must contain every slot, so use `boundsOf` of the slot whose bounds contain all the others. `placeMark(idPrefix, mark, anchor, slots)` in `teams/core/marks.ts` fits the box to a named anchor and emits ordinary layers; `placeMarkOnSleeves` does both sleeves, the left mirrored so both face outward. `slots` maps each slot to a palette key, or to `null` to drop it (a body colour that would vanish into the garment). An unmapped slot throws. `placed(layers)` is the pass-through form for art that is already in mannequin space, used when a helmet's decal is a fixed layer set rather than a mark placed by anchor.

Marks are extracted from a supplied SVG by a script in `scripts/uniform-draw/` and never hand-edited. Scripts emit the mark only; placement belongs to the anchor. A mark that needs a position no anchor gives is a new anchor in `ANCHORS`, not per-team coordinates.

Anchors today: `helmet-side`, `sleeve-left`, `sleeve-right`.

## Strict teams

A team becomes strict when its accuracy conversion registers a `TeamSpec` (`teams/core/team-spec.ts`) — complete specs for every helmet, jersey, pants and socks part — as `strict` in `teams/catalogs.ts`.

Strict means:

- every spec field is stated, with `'none'` or a named default for absence (`teams/core/complete.ts`'s `Complete*` types make a skipped field a type error instead of a silent omission);
- parts come only from `expandTeamSpec`;
- no path literal is allowed outside `marks/`;
- kits render identically twice.

Jersey art goes in `marks` (placed, or anchored to the sleeves; `under`/`over`). A new anchor is a reviewed change to `core/marks.ts`, never a per-team nudge.

`QUESTIONS` in `core/complete.ts` is the per-field checklist for authoring a complete spec.

## Team catalog

A converting team's rows come from `teams/<team>/catalog.ts` instead of hand-written `data.ts` entries: `catalogRow` (in `data.ts`) reads a design's canonical row from it, at that design's original position, so a converted team's archive order never changes. The same catalog is also the source for that team's frozen legacy accent pairs and for the kits the renderer registers.

A design's `periods` are its wear span: `from`/`to` per period, chronological, and only the last may be open (`to` omitted means still current). A closed period needs a `source` — a provenance id, or `needs-source` until one is recorded.

A design's `combinations` are verified pairings only, canonical first. The canonical combination is the design's own kit — `constructionKey` (or the slug, if unset) — and renders the row's own two rasters. Every combination after it is an extra: it registers as kit `<constructionKey>--<key>` and, once rendered, its own full-figure raster at `<rowId>--<key>-full.webp`, listed in the manifest's `combinations` for that row (jersey crops are never duplicated — an extra combination shares the row's).

A team registers itself in `teams/catalogs.ts`. Row ids (`<teamId>-<slug>-<yearStart>`) never change once seeded, catalog or not.

To add a design to a converted team:

1. add the design to `teams/<team>/catalog.ts`;
2. add its `catalogRow` line to the end of `data.ts`'s array (append-only);
3. regenerate the seed migration and the rasters.

A converting team whose kits list several pants options must turn each verified one into a combination and drop the rest, because the registered kits must equal the catalog's.

## Growing the catalog

When a jersey shows a construction detail the spec cannot express, add it to the catalog instead of drawing it once in a team module:

1. Add an optional field to `JerseySpec`, or an option to the shared primitive it expands to (the inset-V collar's `lining`, `backBar` and `outline` were added this way).
2. The new option must add layers only when it is set. Every other team's rasters must stay byte-identical: check `git status web/public/uniforms` after regenerating.
3. Cover it in `jersey-spec.test.ts`: the layers appear when set, are absent when not, and resolve to the expected paint.
4. Sleeve primitives go through `bothSleeves()`, which calls the shape once per sleeve with that sleeve's outer and inner x, so one function draws both; add new ones in paint order inside `expandJersey()` (shoulder, stripes, cuff, then collar on top).
5. Add the new field to the vocabulary table above.

A new palette-independent colour is a new reserved paint in `teams/core/shared.ts`, handled in `hex()` and `isResolvablePaint`; it is never a per-team hex.

## Authoring a team

1. Read the team's current module and its committed renders (`ls public/uniforms | grep <team>`; year starts are the kit's first season, not the reference's). Rasters are `web/public/uniforms/<team>-<kitSlug>-<yearStart>[-full].webp`; kits map to jerseys in `<team>/parts.ts` (`kits: { home: { jersey: 'navy', … } }`), so `colts-home-2004` wears `jerseys/navy.ts`. A `-full` raster is 560×1535 px of viewBox `20 45 560 1535`; the jersey crop (`20 372 560 452`) is pixel rows 327–779. The rasters are transparent: composite them on white before comparing.
2. Read the jersey facts from the reference: body, collar cut and colours (outside, inside, lining, back of neck), sleeve cap bands top to bottom, stripes, cuff, numeral fill and outline. Ignore manufacturer and league marks, collar-tab lettering, numeral textures, one-season patches (memorials, anniversaries, playoffs), and seams the reference sheet draws on every jersey. The grey keylines along a same-colour collar are the exception: keep them with `collar.outline`.

   A kit the reference doesn't show keeps its existing construction and colours: re-express it in the spec rather than recolouring a sibling jersey, and leave anything the spec can't express as it was.
3. Write one spec per jersey in `jerseys/<name>.ts`. Reuse parts the reference does not show (helmets, decals, pants); never replace them with empty parts.
4. Wordmarks are outlined from a font, never drawn by hand: `python scripts/uniform-draw/outline-wordmark.py --text … --font … --size … --center-x 294 --baseline-y … --tracking …` (needs `fontTools`). Put the path in `source.ts` and append it as a layer.
5. Move spec-covered paths out of `source.ts` and delete anything left unused, including comments that describe removed code or point at files that no longer exist.
6. Regenerate and compare (below): reference crop · before · after, one row per jersey, about 390px wide. Fix the largest difference against the reference first; repeat.

Colours come from the team palette. Never sample a colour from a reference image; if the palette looks wrong against the reference, say so in the PR instead of changing it.

Never add reference images to the repo. One team per PR.

## Commands (from `web/`)

A fresh worktree needs `npm ci` first.

```bash
npm run gen:uniform-thumbs          # rasters + public/uniforms/manifest.json
npx vitest run lib/uniforms         # spec, manifest and art tests
npx tsc --noEmit
npm run format:check
npm run check:public-comments -- --changed-since origin/main
```

Run `gen:uniform-thumbs` after `format` too: the manifest digest covers the source text, so a reformat after generating leaves it stale. The `current environment` suite in `toolchain.test.ts` fails locally when installed font hashes differ from `toolchain.lock.json`; CI skips it.

## Comments

Comments in these modules describe construction and geometry only; `check:public-comments` enforces the rest of the policy.
