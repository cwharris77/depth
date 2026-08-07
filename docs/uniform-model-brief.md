# Mapping a team kit into `lib/uniforms/teams/`

The exact procedure for turning a reference image into a `TeamUniformDefinition`. Every step here exists because skipping it cost a rework on a real team; where a rule names a team, that is the pass it was learned on.

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

Three traps live here:

**1. `accent` always equals `secondary` on the `home` kit.** `toTeamColors` in `lib/espn/transform.ts` literally sets `accent: secondary` — ESPN supplies only two colors, so a synthesized home row has no third token. Any construction color that is neither body nor trim must be a **literal hex with a cited source**. This silently painted Seattle's wolf-grey shoulder band green and Arizona's white shoulder bars black. Curated archive rows (away/throwback/alternate, from `lib/uniforms/data.ts`) *do* carry three real colors — only the home row collapses.

**2. A kit's `primary` is often not its jersey color.** Where `alternateColor` is neutral black, `isNeutral()` keeps `primary` as the team's pop color while the real jersey is black — and the generic model paints helmet, jersey *and* pants from `primary`. A full 32-team sweep found exactly four: **bengals, steelers, falcons, saints**. Read that sweep as scoped to **ESPN-synthesized home rows**, which is all it covered. Curated rows in `data.ts` fail the same way for a different reason: a curator may set `primary` to an era's *identity* color rather than its jersey color. Denver's Orange Crush stores `#001489` royal — the helmet and the era's identity — while the jersey is orange, making it a fifth case. So the rule is not "only these four"; it is **check every kit, and treat `primary` as an assertion to verify against the figure rather than a fact.** Fix in the definition (`jerseyColor: 'secondary'`), never by patching `teams.colors` — that is machine-owned and the weekly ingest overwrites it (invariant 3).

**3. The stored home row can be stale, and a later correction is not always a safe re-color.** `lib/uniforms/reconcile.ts` pins a home row until a change is confirmed on two consecutive runs, so a home palette can sit disagreeing with `teams.colors` indefinitely. Cross-check it before authoring:

```bash
# every team whose home uniform row disagrees with its teams.color_primary
curl -s ".../teams?select=id,color_primary" -H "apikey: $K" > /tmp/t.json
curl -s ".../uniforms?kind=eq.home&select=team_id,color_primary" -H "apikey: $K" > /tmp/u.json
# join on id and print the mismatches
```

Most disagreements are shade drift and harmless. Three are categorical — **broncos, steelers, titans** — where the stored primary is a different color entirely from what ESPN now reports. Denver stores orange against a navy team primary, which is why its `home` and `orange-alt` both render orange and why the reference's navy jersey has no kit to hold it.

**The dangerous part is what happens when such a row is corrected.** A palette flip re-colors a kit safely only if the construction is symmetric in those tokens. Denver's is not: the orange jersey wears white-over-navy on the shoulder and the navy jersey wears orange-over-white — the *order* inverts, not just the colors. Promote that home row and the kit renders the wedge upside-down with its collar and numeral keyline on the wrong colors, silently. When you author against a palette you know to be stale, say so in the module header, name the figure to re-measure against, and say which assignments will not survive.

Note which colors the kit needs that no token supplies. Those become literals.

## Step 2 — Read the reference and identify the kits

Open the composite and map each combo to a depth kit slug. Watch for:

- **Kits absent from the 2025 composite** (Chicago's orange alternate, Atlanta's red alternate, Jacksonville's black alternate, Detroit's gridiron-gray). Those must be *inferred* by recoloring measured construction — say so in the module header and treat as provisional.
- **Kits with identical stored palettes** that differ only in construction (Minnesota's away vs Winter Warrior). The definition expresses the difference via `helmetColor`/`pantsColor`.
- **Two kits that are genuinely the same uniform.** Los Angeles' `home` and `powder-blue` store the same palette but for `accent`, and the reference draws exactly one powder-blue jersey — so they are not a bug to route around, they are two rows describing one look. Don't force them apart. Share the construction and let the difference be which token each reaches a color through: `home` takes white as a literal, `powder-blue` takes it from `accent`, and the two render identically because they should. Confirm that in the browser rather than asserting it.
- **Stale data**: Tennessee stores navy but the 2025 reference is light blue. That is a data decision, not a definition fix — surface it, don't paper over it. See Step 1 trap 3: Tennessee is one of three teams whose home row disagrees categorically with `teams.colors`, so this is likely the same stale-home-row cause rather than its own oddity.
- **A jersey in the reference with no kit to hold it** is the same signal read from the other end. Denver's navy jersey and Los Angeles' gold and navy alternates all appear on the 2025 sheets with no row to render them. Record them in the module header as candidates; adding rows is a data decision.

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

GUD figures are consistently **169–170px wide**. Groups of that width are figures; anything narrower is a stripe swatch or patch. Two things this predicate gets wrong on its own:

- **White jerseys vanish.** The non-background test eats them, so a row of white figures returns fewer groups than there are figures, or groups that are only as wide as the numerals. Find that row's figures from its *helmet* band instead — helmets are never white-on-white against the page — and derive each figure's left edge from the helmet's, which sits at a fixed offset (+40px on every sheet checked).
- **Rows are not always on the same grid.** Denver's row 3 and Miami's row 2 are both indented relative to row 1, so figure *n* in one row is not at figure *n*'s x in another. Locate figures per row, never once for the sheet.

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

You are measuring a rendering, so every boundary you find belongs to one of three things: the kit, GUD's *presentation* of the kit (seam outlines, hem lines, drop-shadows, highlights), or GUD's *annotation* of it (shoulder numerals, sleeve patches, collar tabs, era patches). No color predicate can tell them apart; they are made of the same pixels. Transcribing either of the latter two as construction produces a module that is pixel-faithful to the sheet and wrong about the jersey, and it will not show up until Step 8. Three tells, all structural rather than chromatic:

- **An isolated mark high on the shoulder is GUD's numeral, not a stripe.** Miami's home sleeve column crosses a clean orange run just below the shoulder seam; it is the "1" GUD draws above the sleeve. Authoring from that column alone would have put a stripe on two kits that have none — Miami's home and away carry no sleeve trim at all. The tell is that a stripe runs the width of the sleeve while an annotation is a short isolated island: **row-run across the whole sleeve before believing any column.** When a mark looks like construction but only one column shows it, crop the figure and look at it.

- **A thin neutral line between two same-colored regions is a seam, not a gap.** Jacksonville's sleeve measures as two runs of black six units apart; that gap is GUD's own hem outline drawn over one continuous band. The mannequin draws no such outline, so authored as two bands it rendered as two thin stripes with the jersey color showing between them, where the reference reads as a solid block. Kansas City reached the same conclusion ("only a hairline outline between them — so the mannequin bands are authored contiguous"). **Author contiguous.** Two bands are only genuinely two bands when they are different colors, as on Jacksonville's throwback.
- **A dark edge on one side only is a shadow, not trim.** Baltimore's shoulder bar reads white with a gold keyline, but its full outer boundary spans seven pixels, because the lower two are a black drop-shadow. Folding that into the gold rendered the keyline at twice its weight — the bar came out gold-with-a-white-slot instead of white-with-a-gold-keyline.

The general fix for the last two: **measure a cut through the middle of the shape, not its silhouette.** A column sample across the interior crosses each layer exactly once and names it; an outer-boundary trace cannot distinguish a layer from its own shadow. Where the two disagree, the interior cut is right.

And the general fix for all three: **crop the figure at 8× and look at it before you author.** Every one of these was found by eye in seconds and would have survived any amount of further sampling. Measurement tells you where a boundary is; only looking tells you what it belongs to.

**A team with no construction at all is a real answer.** Las Vegas' sleeve runs unbroken black from shoulder to hem, its pants are unbroken silver, its collar has no trim; Miami's home and away are the same. Those modules carry zero layers and are correct. Say so explicitly in the header — an empty module otherwise reads as unfinished work, and the next person re-measures it.

## Step 6 — The helmet decal: trace-then-stylize

The decal **is** in scope. The workflow is: land an accurate machine trace as a faithful starting point, then hand-stylize it. Every traced path carries a `TRACE-PENDING-STYLIZE` comment; `grep -rn TRACE-PENDING-STYLIZE lib components docs` lists everything awaiting that pass.

**The tracer is not only for helmets.** Any solid construction mark is a candidate, and a traced one beats a hand-approximated one whenever the shape has corners you would otherwise guess at. Los Angeles' shoulder bolt is traced into mannequin *sleeve* space — same tracer, same union-and-cover method, only the coordinate map changes (`X = 294 + (refX − center) · scaleX`, `Y = 383 + (refY − jerseyTop) · scaleY` instead of the helmet map). Reach for it whenever hand-authoring would mean inventing a zigzag.

**Mirroring a traced path** is a regex over the coordinate pairs — `x → 588 − x`, y untouched. Generate the mirror in the scratchpad script rather than by hand.

**Every mark in this archive traces.** All 32 teams, all 31 that carry a helmet mark at all — Cleveland is the exception and wears no logo. There is no does-not-trace column any more, and the history of that column is the most useful thing in this section, so it is kept below rather than deleted.

What still varies is **how much work a mark costs and which technique it needs**, and that is worth predicting before you start:

| Cost | Shape | Technique |
|---|---|---|
| One path | Solid single-color mark, or one whose interior regions are all shell-colored | Plain trace (Chiefs arrowhead, Commanders W, Saints fleur) |
| Two | Solid body under a keyline | Trace the union, paint the body over it (Carolina, Baltimore, Detroit) |
| Three to four | Multi-color mark, or body + keyline + detail | Plain unions stacked in paint order (Eagles, Buccaneers, Patriots, Falcons, Jaguars) |
| Four, plus a second figure | A mark that shares a color with its shell | Trace from a kit whose shell differs (Houston — see below) |
| Mixed | A mark at or below the ~25px floor | Fit primitives for what won't trace, trace the rest, say which is which (Titans, Steelers' disc) |

Size does not decide any of this — the Bears C traced beautifully at 31×21px and the Titans disc needed reconstruction at 25px. **Shape character and color separability decide it.**

**Six marks in this archive were once recorded as untraceable and all six were wrong**, which is a high enough error rate that the default should now be to attempt the trace and let it fail rather than to predict failure. Ravens ("a 2px gold keyline"), Jaguars ("read through a sub-2px white jaw"), Saints ("a thin ornamental mark"), Steelers ("embeds a wordmark"), Falcons ("no solid region"), Raiders ("fine linework at every scale") — every one shipped clean once its hard part was handled separately instead of treated as disqualifying. The generalisation is the single most expensive mistake this workflow makes:

> **Never let the hardest feature of a mark decide whether the mark traces.** Ask instead what the mark is *mostly* made of. If that part is solid, it traces — and the hard feature is then a separate, smaller question with its own answer: derive it (a keyline is a filled shape one layer down), let it fall out for free (a shell-colored spot is a gap), take it from another figure (a color that collides with the shell), or drop it (a sub-2px interior line, a six-px wordmark) and say so in the header. Three of those four answers cost nothing.

**When a mark shares its color with its shell, look for a kit where it does not.** Houston is the case that looks genuinely impossible and is not: on a navy shell the bull's left half samples *exactly* the shell navy — both `(3,24,37)` — and the white keyline dividing them breaks into four disconnected components, so the mark can be neither selected nor enclosed. But the Battle Red kit wears the same bull on a **red** shell, drawn as one solid navy silhouette, and that silhouette is precisely the shape the navy figures were hiding. Overlay it on the away figure and the red half, white divider and star all land inside it correctly, so the two figures register; the keyline is then derived by growing it, and the broken keyline never has to be reassembled because it never has to be read. **A club that wears one mark on two shell colors has already solved the separation problem for you** — check the whole sheet before concluding a mark is unreachable.

**A closed keyline is a separator; a broken one is not.** This is what distinguishes Atlanta from Houston, and it is the thing to check when a mark's body is the shell color. The falcon's body is the same black as its shell, which sounds fatal — but its white keyline is an unbroken ring, so filling that ring's hole yields the silhouette, and the body then falls out as the black component that does not touch the crop border (the shell's black does). Houston's keyline is the same idea in four pieces, which is why it needs the other figure. Before giving up on a body that collides with its shell, ask whether something *around* it closes.

**How many layers a decal needs is decided by the interior, not by how complex the mark looks.** Ask whether the mark's interior regions are the shell color. If they are, they need no path at all — the shell reads through a single traced region. Chiefs' arrowhead is one path: the letters inside it are shell-red, so tracing the white region alone renders the whole mark. Cowboys' star needs two; the 49ers' oval needs three. Count the distinct *non-shell* colors in the mark and that is your layer count.

**That rule extends past interiors to any shell-colored region, including scattered ones** — and it is what makes Jacksonville's jaguar tractable. The black spots freckling its gold crown look like the evenodd trap waiting to happen; they are not, because they *are* the shell color. Trace the gold as plain unions and every spot falls out as a gap between components, with the shell showing through it. No holes, no extra layer, no trap.

**But a shell-colored trick is scoped to the kits whose shell is actually that color, and that is a scope decision you must make explicitly.** Jacksonville wears black on three kits and teal on the throwback: on teal every spot would come out teal and the crown would read as a different animal, so the throwback ships bare with a comment saying what it would need. Whenever you rely on "the shell reads through", enumerate the kits and check each one — this is the same class of error as assuming one construction serves every kit (§5).

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

**Never trace a keyline as its own region — trace the union and let the body cover it.** A keyline is thin by definition, so a predicate that selects only its color returns slivers: Carolina's blue outline came back as nine disconnected fragments that read as debris beside the panther. Tracing blue OR black instead gives one silhouette; painting the black body over it leaves precisely the keyline showing, and it is continuous because it was never cut up. This is the Packers inversion generalized, and it is what makes an animal mark with an outline tractable at all.

This paragraph used to end by claiming Baltimore's raven "still does not trace — there is no body to paint over". It has a body: a purple head. The mistake was reading "the keyline is the mark's most distinctive feature" as "the keyline is all there is", which is the same error the rule above warns about. Traced as a filled silhouette with the purple painted over it, the gold keyline is exactly the two px it should be and never had to be traced as a stroke at all. **An outline too thin to trace is usually a filled shape one layer down.**

**But do not assume the union is one component, and never reduce it with "take the largest".** The two colors often do not touch: an antialiased seam runs between them matching neither predicate, so the union is two disjoint components. Los Angeles' shell bolt is exactly this — keyline 22k px, body 26k px, adjacent and separate. Taking the largest component returns the body alone, drops the keyline entirely, raises no error, and produces a mark that looks completely plausible until you hold it against the reference. **Keep every non-border component and filter by size instead**, which is both safer and does other necessary work: on that same helmet the size floor is what removes the numerals GUD paints on the shell, which are the keyline's exact blue and would otherwise be traced as part of the mark.

Three distinct ways a keyline trace fails, then, and they need different fixes: traced alone it fragments (union it); traced with `evenodd` its antialiasing punches through (stack unions); traced as a union it may not be connected (keep all components, filter by size).

**A fourth: the keyline has no usable predicate at all, and then you grow one.** Detroit's lion is white-keylined on a silver shell — after upsampling, the keyline's two px blend to values no white predicate catches without also catching the shell, so tracing it returns the *body contour* again (the giveaway: your keyline path and your body path come back with the same point count). The fix is to take the body mask, **dilate it by N upsampled px, and trace that as a fill** to paint under the body. It is the union trick with the union synthesised instead of sampled, and it generalises: whenever a keyline's color is not separable, its geometry is still just the body grown outward.

Do **not** reach for a stroked contour instead. It is the obvious alternative and it is wrong here for a concrete reason: `UniformFigure` exposes `strokeWidth` and `lineCap` but **no `strokeLinejoin`**, so the default miter spikes at every reversal of a jagged machine trace. Grown fills have no joins.

**Order of operations in that dilation is load-bearing: drop border-touching components BEFORE growing, never after.** Grow first and the mark fuses to whatever same-colored furniture shares the crop — a helmet edge, a facemask — and the fused blob now touches the border, so the border filter discards *the mark itself*. The symptom is an empty result with no error. (`trace_keyline` in the scratchpad does it in the right order.)

**The Moore walk can lock onto the inner contour of an annulus and hand you the hole.** Any mark drawn as an *outlined* shape whose middle is shell-colored — New Orleans' fleur-de-lis is the canonical one — is topologically a ribbon, and the boundary walk can return its inner loop instead of its outer one. It renders as a thin skeleton of the real mark: recognisable enough that you may accept it, wrong enough to matter. **Close the holes before walking** (flood the background in from the border; anything unreached is a hole; fill it, then trace). That is `trace_filled`. Reach for it by default on any outlined shape, and sanity-check a suspicious trace by comparing the traced polygon's shoelace area against the mask's cell count — they should agree within a percent or two.

**When the shape is a circle, do not trace it — fit it.** A traced disc comes back polygonal, and notched wherever something punches into it (Pittsburgh's disc is notched by the wordmark, which reads as damage rather than as a circle). Fit a circle to the traced bounds and emit an `A` arc pair instead: cleaner, two orders of magnitude smaller, and closer to the thing it represents. Same for concentric rings.

**Half-traced and half-constructed is a legitimate outcome, not a failure.** Tennessee's circle-T is right on the ~25px floor: its rings came back as broken dashes, so they are fitted circles, while the T and stars inside them are genuine traces from a box drawn *inside* the disc so the ring's own white does not join them. Say which is which in the header — a future reader needs to know which parts are measurements and which are reconstructions.

**Not every component of a color is the feature you want, and size does not tell you which is which.** New England's white traces to four components; three are pieces of the *keyline* and only one is the star. Painted on top, the keyline pieces repaint over the face and swallow detail that should show. Identify the component you want **by bbox position**, not by rank — and note this is the same reduction hazard as "take the largest": any rank-based pick assumes the candidates are alternatives when they are actually parts.

Prefer a flat, straight-on source when one exists — GUD draws a 3/4 shell, so a trace bakes in the curvature distortion. But check licensing: Commons carries most *wordmarks* freely while the primary head/animal marks are typically non-free fair-use on English Wikipedia. Surface the source and its license rather than picking one silently.

**Normalize GIF sources to RGB before measuring — and then re-derive your predicates, don't reuse them.** Three sheets are GIFs (Raiders, Dolphins, Patriots, Steelers). Converting is the obvious half; the half that costs a wasted trace is that the palettes differ enough to break thresholds tuned on the PNG sheets. New England's navy samples `(3,18,51)`, so a blue-channel test of `b > 60` — perfectly reasonable, and correct on every PNG team — matches nothing and the face comes back empty with no error. **Sample the actual colors in the crop before writing any predicate**, every time; it costs one `Counter` over the region.

**A team can wear more than one mark.** Miami's 1972 throwback wears a dolphin breaking through a solid ring where its current kits wear a dolphin inside a sunburst; Denver's Orange Crush wears the era "D" where the modern kits wear the horse. Check every kit's helmet before assuming one traced decal serves them all, and give the second mark its own pair of paths with a `throwback` flag on the factory rather than a second copy of the factory.

**Always out of scope, every kit:** chest wordmarks, league shields, sponsor marks, GUD's shoulder numerals, sleeve patches, and collar tabs (Carolina's "KEEP POUNDING", Denver's "BRONCOS COUNTRY", Miami's "MIAMI"/"GO FINS!").

## Step 7 — Write the module

Structure that has held up across twenty-odd teams:

- Header comment: reference used, what is measured vs inferred, coordinate spaces, the mirroring rule.
- Named `const` exports for every path and fixed color, each with its source cited.
- Small factories for anything shared across kits (`sleeveStripes(edge, core)`, `decal(a, b)`) — kits usually share one construction and differ only in which token colors it. This is also what keeps mistake #17 (pasted structure) out of the diff.
- `GENERIC_STRIPPED` array — most teams remove nearly the whole generic model.
- Per-kit overrides, each with a comment saying what the reference shows.

**Do not assume one construction per team.** It is the common case, not the rule. Miami is three: home and away carry no sleeve trim, the throwback a five-band set, Rivalries a sleeve wedge with a slash and a collar V. When kits genuinely differ, write separate factories rather than one factory with a growing flag list.

**Parameterize both colors of a two-tone mark, not one.** It is tempting to treat a two-tone shoulder as "trim over body" and hard-code the one you think is fixed. Denver proves why not — the orange jersey wears white-over-navy and the navy jersey wears orange-over-white, so a factory that assumes either position renders one of them inverted. `shoulderWedge(upper, lower)` costs nothing and is flip-safe.

Two mannequin facts worth reaching for before hand-rolling:

- **Collars.** The generic chevron `M206,388 L294,455 L386,388` (bears, bills) is right when the arms meet at the chest. Often they don't: Jacksonville and Denver both wear short arcs down each side of the neck that stop well short of closing, and drawing a chevron there wrongly seals the V. Extrapolate the measured arms — if their meeting point is far below where the color ends, author two separate strokes. Carolina's V is the opposite case: it closes, but far deeper than the generic path (y=513 against y=455), so it needs its own path rather than the shared one.
- **Helmet crown stripes.** `HELMET_CROWN_STRIPE_PATH` in `shared.ts` hugs the crown silhouette, which is all a side view can show. The generic model's straight rectangle is the wrong shape and should be stripped. Miami wears one on all four kits — orange on three, teal on the throwback — and it is easy to miss because it sits exactly on the shell's outline where it reads as the drawing's own edge.

Prefer tokens (`'primary'`/`'secondary'`/`'accent'`) over literals wherever the palette genuinely supplies the color; use a cited literal where it does not. Where a kit has no keyline at all, set `outline` to the face color rather than leaving it to inherit the generic model's contrasting stroke.

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

Inspect `[data-layer-id]` fills to confirm each layer resolved to the color you intended, rather than trusting that it did. Two things that check does not cover, and both have bitten:

- **`jerseyColor` / `helmetColor` / `pantsColor` are not layers**, so a `jerseyColor: 'secondary'` override does not appear in that audit at all. Confirm the body color by censusing every fill in the kit's SVG — on Denver's Orange Crush that is what proved the body resolved to orange rather than the palette's royal `primary`.
- **Render at 380–400px as well as at swatch size.** Fine work reads as noise at 188px and you cannot tell "correct but small" from "collapsed". Miami's throwback bands, Denver's shoulder wedge and Los Angeles' bolt tail all needed the larger render to confirm.

Console errors during a session are cumulative and survive a reload, so stale HMR failures from a mid-edit state will still be listed after the fix. Confirm health with a server-side fetch (`curl -o /dev/null -w '%{http_code}' /uniforms`, plus `/team/<id>`) rather than by reading the console buffer.

If a `data.ts` palette needs correcting, regenerate the seed and apply **locally only**:

```bash
npx tsx scripts/gen-uniform-seed.mts supabase/migrations/<ts>_<slug>.sql
supabase migration up --local
```

Never `db push` to the linked prod project as part of this work — that is Cooper's call.

## Done means

- [ ] Runtime palette checked before authoring; literals used where no token exists, each citing a source
- [ ] Home row cross-checked against `teams.color_primary`; any drift, and which token assignments would not survive it, recorded in the header
- [ ] Every kit's `primary` verified against its figure rather than assumed to be the jersey color
- [ ] Figure cropped and *looked at* before authoring, not only sampled
- [ ] Every path derived from a measurement recorded in a comment, not eyeballed
- [ ] Anything inferred rather than measured is labelled as such in the module header; a layerless module says it is deliberate
- [ ] Traced decals carry `TRACE-PENDING-STYLIZE`; skipped decals say why; every kit's helmet checked for a second mark
- [ ] `tsc`, tests and `format:check` clean
- [ ] Rendered in a browser at both swatch size and ~390px, and visually compared against the reference
- [ ] Layer fills read back from the DOM; body/helmet/pants overrides confirmed by fill census, since they are not layers
