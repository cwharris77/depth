# Mapping a team kit into `lib/uniforms/teams/`

The exact procedure for turning a reference image into a `TeamUniformDefinition`. Written after doing bengals, bills, seahawks, cardinals, packers, steelers, bears, vikings, falcons and saints — every step here exists because skipping it cost a rework on one of those.

**Do one to three teams per pass, measured.** The value is in actually measuring the reference, not in generated approximations. A fast pass produces plausible-looking modules that are wrong in ways only a browser render reveals.

## Inputs

- Reference: `../nfl-uniform-refs/<team>/<team>-current-season-2025.png|gif`, plus an era sheet for some throwbacks. Some are GIFs — `Image.open(...).convert('RGB')` handles both.
- A running local Supabase (`supabase status`) and dev server.

Reference images are internal-only: never committed to this repo and never redistributed.

---

## Step 1 — Check the runtime palette FIRST

Non-negotiable, and it goes first. This has caught a bug on most teams.

```bash
curl -s "http://127.0.0.1:54321/rest/v1/uniforms?team_id=eq.<team>&select=id,kind,name,color_primary,color_secondary,color_accent" \
  -H "apikey: <local anon key from 'supabase status'>" | python3 -m json.tool
```

Two traps live here:

**1. `accent` always equals `secondary` on the `home` kit.** `toTeamColors` in `lib/espn/transform.ts` literally sets `accent: secondary` — ESPN supplies only two colors, so a synthesized home row has no third token. Any construction color that is neither body nor trim must be a **literal hex with a cited source**. This silently painted Seattle's wolf-grey shoulder band green and Arizona's white shoulder bars black. Curated archive rows (away/throwback/alternate, from `lib/uniforms/data.ts`) *do* carry three real colors — only the home row collapses.

**2. ESPN's `color` is often not the jersey color.** Where `alternateColor` is neutral black, `isNeutral()` keeps `primary` as the team's pop color while the real jersey is black — and the generic model paints helmet, jersey *and* pants from `primary`. A full 32-team sweep found exactly four: **bengals, steelers, falcons, saints**. All four are fixed; no fifth exists, so any new team is safe on this axis unless its jersey is black. Fix in the definition (`jerseyColor: 'secondary'`), never by patching `teams.colors` — that is machine-owned and the weekly ingest overwrites it (invariant 3).

Note which colors the kit needs that no token supplies. Those become literals.

## Step 2 — Read the reference and identify the kits

Open the composite and map each combo to a depth kit slug. Watch for:

- **Kits absent from the 2025 composite** (Chicago's orange alternate, Atlanta's red alternate). Those must be *inferred* by recoloring measured construction — say so in the module header and treat as provisional.
- **Kits with identical stored palettes** that differ only in construction (Minnesota's away vs Winter Warrior). The definition expresses the difference via `helmetColor`/`pantsColor`.
- **Stale data**: Tennessee stores navy but the 2025 reference is light blue. That is a data decision, not a definition fix — surface it, don't paper over it.

## Step 3 — Locate the figures

```python
def nb(x, y):                       # non-background
    r, g, b = p[x, y]
    return not (r > 245 and g > 245 and b > 245)

# column groups within a horizontal band that crosses the jerseys
prof = [(x, sum(1 for y in range(Y0, Y1) if nb(x, y))) for x in range(W)]
run = [x for x, n in prof if n > 0]
groups = [...]                      # itertools.groupby on x - index
```

GUD figures are consistently **169px wide**. Groups of that width are figures; anything narrower is a stripe swatch or patch.

## Step 4 — Establish the coordinate mapping

Two anchors per axis, then a linear map into mannequin space.

```
scaleX = 264 / (figure_half_width)          # mannequin sleeve half-span is 264
depthX = 294 + (refX - figure_center) * scaleX

scaleY = 191 / (sleeve_hem - jersey_top)    # mannequin jersey_top 383 → sleeve hem 574
depthY = 383 + (refY - jersey_top) * scaleY
```

Find `jersey_top` as the first row with a wide run of body color, and `sleeve_hem` as the row where the figure's width collapses from full (sleeves) to torso-only. **Do not anchor on the helmet** — it is often the same color as the jersey and will be caught by the same predicate (this cost a rework on Minnesota).

Both scales should land near 3.0–3.2. If they diverge much, an anchor is wrong.

## Step 5 — Measure the construction

Two techniques, both cheap:

**Column sample** — print every color change down one x through the sleeve. Best for stripe stacks:

```python
prev = None
for y in range(y0, y1):
    c = p[X, y]
    if c != prev: print(y, c)
    prev = c
```

**Scanline runs** — contiguous runs of a predicate across a row. Best for horizontal extent and vertical bars.

Classifier pitfalls that have each cost a pass:

- **Pure white marks get eaten by the background test.** `r>245 and g>245 and b>245` matches both the page background *and* a white stripe. Detect white explicitly and disambiguate by position.
- **Team greens/navies are darker than you expect.** GUD renders Packers green as `#004001`. Sample raw RGB before writing a predicate.
- **Gradients split across predicates.** Arizona's cardinal runs bright→near-black; a naive `is_black` swallowed the dark half. Key on channel *separation* (`r - g > 28`), not absolute brightness.
- **Numerals occlude stripes.** Scan below them.

Record every measurement in the module as a comment — the reference coordinates and the derived mannequin values.

### Before authoring, separate the kit from GUD's drawing of it

You are measuring a rendering, so every boundary you find belongs either to the kit or to GUD's presentation of it — seam outlines, hem lines, drop-shadows, highlights. No color predicate can tell those apart; they are made of the same pixels. Transcribing presentation as construction produces a module that is pixel-faithful to the sheet and wrong about the jersey, and it will not show up until Step 8. Two tells, both structural rather than chromatic:

- **A thin neutral line between two same-colored regions is a seam, not a gap.** Jacksonville's sleeve measures as two runs of black six units apart; that gap is GUD's own hem outline drawn over one continuous band. The mannequin draws no such outline, so authored as two bands it rendered as two thin stripes with the jersey color showing between them, where the reference reads as a solid block. Kansas City reached the same conclusion ("only a hairline outline between them — so the mannequin bands are authored contiguous"). **Author contiguous.** Two bands are only genuinely two bands when they are different colors, as on Jacksonville's throwback.
- **A dark edge on one side only is a shadow, not trim.** Baltimore's shoulder bar reads white with a gold keyline, but its full outer boundary spans seven pixels, because the lower two are a black drop-shadow. Folding that into the gold rendered the keyline at twice its weight — the bar came out gold-with-a-white-slot instead of white-with-a-gold-keyline.

The general fix for both: **measure a cut through the middle of the shape, not its silhouette.** A column sample across the interior crosses each layer exactly once and names it; an outer-boundary trace cannot distinguish a layer from its own shadow. Where the two disagree, the interior cut is right.

## Step 6 — The helmet decal: trace-then-stylize

The decal **is** in scope. The workflow is: land an accurate machine trace as a faithful starting point, then hand-stylize it. Every traced path carries a `TRACE-PENDING-STYLIZE` comment; `grep -rn TRACE-PENDING-STYLIZE lib components docs` lists everything awaiting that pass.

**Decide first whether it will trace at all.** Proven both ways across seven attempts:

| Traces well | Does not trace |
|---|---|
| Solid filled regions (Cardinals, 4 color regions) | Thin swooping linework (Seahawks keyline, Falcons falcon) |
| Bold letterforms (Bears C at 31×21px, Packers G) | Marks embedding a wordmark (Steelers — also out of scope) |
| Bold solid shapes (Vikings horn) | Anything under ~25px of *stroke-bearing* detail |

Size alone does not decide it — the Bears C traced beautifully at 31×21px while the Falcons falcon shredded at 28×34px. **Shape character decides it.** When it won't trace, leave the shell bare and say why in the module header; an illegible trace is worse than none.

**How many layers a decal needs is decided by the interior, not by how complex the mark looks.** Ask whether the mark's interior regions are the shell color. If they are, they need no path at all — the shell reads through a single traced region. Chiefs' arrowhead is one path: the letters inside it are shell-red, so tracing the white region alone renders the whole mark. Cowboys' star needs two; the 49ers' oval needs three. Count the distinct *non-shell* colors in the mark and that is your layer count.

Tracer mechanics (`scratchpad`, pure PIL, no numpy):

1. Crop tight to the mark, upsample ~10× LANCZOS, threshold per color region.
2. Connected components → Moore-neighbor boundary walk → Douglas–Peucker simplify.
3. **Detect holes**: background components inside a shape's bbox that cannot reach its border are emitted as extra subpaths. Without this, any shape with a counter fills solid — this was the original defect in the Seahawks trace.
4. Emit all subpaths of a layer into one `d`, and set **`fillRule: 'evenodd'`** so the holes punch through.
5. Filter border-touching components (they are background, not mark).

**Do not trace letterforms as `evenodd` holes.** The rule in (4) is safe for a genuine counter in a solid region, where whatever sits beneath the hole is what should show. It is not safe for letters. A glyph's edge is antialiased, so the pixels ringing it fall *outside* the color predicate and get emitted as hole subpaths — the hole then punches all the way through to the layer beneath. The 49ers' "F" rendered solid black this way: the shading around the letter became a hole exposing the dark layer under the oval. Trace letters as plain unions stacked in paint order instead — one filled path per color, no `evenodd`, later paths covering earlier ones.

Two useful inversions:
- Trace the *white* region and paint a slightly larger shape beneath it — the Packers G came out as two clean paths this way instead of a fragmented sixteen, because the white region's boundary already *is* the oval-minus-glyph.
- Paint order matters: keyline/shadow first, body over it, details last.

**Never trace a keyline as its own region — trace the union and let the body cover it.** A keyline is thin by definition, so a predicate that selects only its color returns slivers: Carolina's blue outline came back as nine disconnected fragments that read as debris beside the panther. Tracing blue OR black instead gives one silhouette; painting the black body over it leaves precisely the keyline showing, and it is continuous because it was never cut up. This is the Packers inversion generalized, and it is what makes an animal mark with an outline tractable at all. It also means a mark whose keyline is its only detail (Baltimore's raven) still does not trace — there is no body to paint over.

Prefer a flat, straight-on source when one exists — GUD draws a 3/4 shell, so a trace bakes in the curvature distortion. But check licensing: Commons carries most *wordmarks* freely while the primary head/animal marks are typically non-free fair-use on English Wikipedia. Surface the source and its license rather than picking one silently.

**Always out of scope, every kit:** chest wordmarks, league shields, sponsor marks.

## Step 7 — Write the module

Structure that has held up across ten teams:

- Header comment: reference used, what is measured vs inferred, coordinate spaces, the mirroring rule.
- Named `const` exports for every path and fixed color, each with its source cited.
- Small factories for anything shared across kits (`sleeveStripes(edge, core)`, `decal(a, b)`) — kits usually share one construction and differ only in which token colors it. This is also what keeps mistake #17 (pasted structure) out of the diff.
- `GENERIC_STRIPPED` array — most teams remove nearly the whole generic model.
- Per-kit overrides, each with a comment saying what the reference shows.

Prefer tokens (`'primary'`/`'secondary'`/`'accent'`) over literals wherever the palette genuinely supplies the color; use a cited literal where it does not.

`number.outlineWidth` defaults to 26, which is tuned for a keyline that reads at swatch size. Teams with a *thin* numeral trim need ~10–14, or the trim swallows the face and every number renders as one solid color (caught on Minnesota).

## Step 8 — Register, verify, and only then claim done

```bash
# add the import + registry entry in lib/uniforms/teams/index.ts, then:
npm run format
npx tsc --noEmit
npx vitest run lib/ --exclude '**/.worktrees/**' --exclude '**/.claude/worktrees/**'
npm run format:check
```

The `--exclude` flags matter: stale worktrees under `.worktrees/` and `.claude/worktrees/` contain old copies of the test suite and will report failures unrelated to your change.

Then **look at it in a browser**. This is not optional — it has caught something on nearly every team that the measurements did not:

```js
// paste into the console on /uniforms — blows up one team's kits side by side
const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(e => e.textContent.includes('<Team>'));
const svgs = [...h.closest('div,section,li,article').parentElement.querySelectorAll('svg')];
// clone into a fixed overlay at width 188 and screenshot
```

Inspect `[data-layer-id]` fills to confirm each layer resolved to the color you intended, rather than trusting that it did.

If a `data.ts` palette needs correcting, regenerate the seed and apply **locally only**:

```bash
npx tsx scripts/gen-uniform-seed.mts supabase/migrations/<ts>_<slug>.sql
supabase migration up --local
```

Never `db push` to the linked prod project as part of this work — that is Cooper's call.

## Done means

- [ ] Runtime palette checked before authoring; literals used where no token exists, each citing a source
- [ ] Every path derived from a measurement recorded in a comment, not eyeballed
- [ ] Anything inferred rather than measured is labelled as such in the module header
- [ ] Traced decals carry `TRACE-PENDING-STYLIZE`; skipped decals say why
- [ ] `tsc`, tests and `format:check` clean
- [ ] Rendered in a browser and visually compared against the reference
