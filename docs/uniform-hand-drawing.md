# Hand-drawing a helmet mark

The procedure used to draw Houston's bull. It is written to be followed by someone — or something — with **no prior knowledge of this repo**, so it starts with what the output actually is.

It replaces machine tracing for marks the tracer cannot reach, and produces original geometry rather than a reproduction of someone else's artwork.

---

## 0. What you are producing

A football uniform is rendered as an SVG mannequin: a helmet, a jersey, sleeves, pants. On top of that, each team supplies **layers** — flat shapes painted onto one named surface. A helmet mark is a handful of layers on the `helmet` surface.

Each layer is an object of roughly this shape:

```ts
{
  id: 'texans-bull-head',   // unique, kebab-case, team-prefixed
  surface: 'helmet',        // which mannequin part it is clipped to
  d: 'M304.4,320.4 C...',   // an SVG path string — this is what you are drawing
  clip: true,               // clip to the surface silhouette
  kind: 'fill',             // 'fill' or 'stroke'
  fill: '#031825',          // fill colour (kind: 'fill')
  // stroke, strokeWidth    // instead of fill, when kind: 'stroke'
}
```

Layers paint **in array order**, so later layers cover earlier ones. That ordering is how a keyline works: draw the shape as a fat white stroke first, then the same shape as a fill on top, and what remains visible is a white rim.

**Your deliverable is the `d` strings.** Everything else is boilerplate.

### The coordinate space

Helmet paths are authored in **raw helmet space: x from 139 to 802, y from 65 to 674**. That is the untransformed coordinate system of the helmet artwork; the renderer applies its own translate/scale afterwards, which you can ignore. A mark occupying roughly x280–560, y100–350 sits on the upper-left of the shell, which is where clubs put them.

### One renderer constraint that matters

**There is no `strokeLinejoin` control.** Strokes therefore use the default miter join, which spikes badly at sharp reversals. This is fine for hand-drawn smooth curves — and it is exactly why hand-drawn marks may use a stroked keyline while machine traces may not.

---

## 1. Predict the outcome before starting

One property decides how well this goes. Check it first; it changes whether the effort is worth spending.

**Does the mark's main body contrast with the shell colour it sits on?**

- **Yes → hand-drawing works well.** The mark is carried by positive shapes, and errors in a positive shape are forgiving: a curve a few units off still reads as a bull horn. Houston's bull converged in two passes.
- **No → hand-drawing is much harder.** If the mark's body is the same colour as the shell (Seattle's navy hawk on a navy helmet, San Francisco's, Tennessee's), the entire mark is carried by *thin white negative space*. The same few units of error that were invisible in a positive shape now break it, because what you are drawing is the gap between two things rather than a thing. A Seattle attempt reached roughly 60% in three passes and still failed at helmet scale.

Do not conclude from a good flat rendering that a negative-space mark is finished. Check it on the shell colour, at final size, early — that is where it fails.

---

## 2. Get a flat vector reference, and record its licence

Wikipedia carries most primary club marks as SVG. They are almost always **non-free, fair use** — Wikimedia Commons generally carries only the wordmark freely, and any Commons file for the primary mark is worth opening before trusting, because some are unrelated placeholder graphics.

Using such a file **as a look-at reference for proportions** is the posture this project takes. Using it as a source of path data is not. Do not copy path data. Do not commit the file.

Record the URL and licence in the module header.

---

## 3. Render it flat — two traps

Both cost real time when hit directly.

- **`qlmanage` always produces a square thumbnail**, so a wide mark is letterboxed and any assumed crop offset is wrong. Pad the `viewBox` to square yourself, then crop by *measured* bounding box.
- **Transparent renders as black.** PIL's `.convert('RGB')` turns unpainted pixels black, so a scan for "non-white" returns the whole canvas instead of the art. Composite onto white first:

```python
im = Image.open(f).convert('RGBA')
im = Image.alpha_composite(Image.new('RGBA', im.size, (255, 255, 255, 255)), im).convert('RGB')
```

---

## 4. Establish topology before drawing anything

**This is the step that most changes the result, and it is the easiest to skip** because it feels like preamble.

Run connected components per colour. For each region ask: **is this a hole or a concavity?**

- A **hole** — fully enclosed, does not touch the crop border — becomes its own path, drawn on top in the colour that shows through.
- A **concavity** — an indentation open to the outside — is an *excursion in the outer boundary*. You walk into it and back out as part of the same outline.

Confusing the two is the most common structural bug. Seattle's mark is one connected navy shape with a deep concavity separating crest from head; a first pass treated that channel as absent and the two merged into a blob.

`drawkit.regions()` returns each region's size, bbox and `touches_border` flag, which is the hole/concavity test.

---

## 5. Measure, do not eyeball

Produce a table of horizontal extents every few percent of height — for each colour's outer boundary, and separately for each enclosed void (`drawkit.runs`, `drawkit.extents`, `drawkit.region_rows`).

```
v=4    [(15, 40)]
v=12   [(5, 24)]
v=20   [(4, 26)]
v=44   [(17, 42), (43, 60)]     <- two runs: something splits the shape here
```

These numbers are your anchors. A grid overlay read by eye gets gross proportions right and transitions wrong: the first Houston draft included a notch between horn and head that does not exist, because at a glance the shape looked like it had one.

**Rows with multiple runs are information.** They mark exactly where a concavity or void divides the shape.

---

## 6. Choose the layer stack from how the mark sits on the helmet

Look at how a reference *photograph or uniform illustration* draws the mark on the shell, not just the logo in isolation.

- **Body contrasts with shell** — white keyline underneath, then body colours on top. The keyline is a stroke on the body path, safe because these curves are smooth (see §0).
- **Body equals shell** — the mark *is* the white channels; the shell supplies the body colour. Author the body shape anyway so the mark survives on a differently-coloured shell, but understand that what a viewer sees is negative space.

---

## 7. Draw in a normalised box, map at emit time

Design in **0–100 on both axes** — percentages of the placement box in each direction, matching the measurement tables — and map into helmet space only when emitting. The numbers you type are then the numbers you measured.

```python
box = Box(284.0, 104.0, 270.0, 246.0)      # x0, y0, width, height in helmet space
d = path(box, [
    ('M', (42, 88)),                        # bottom point
    ('C', (48, 82), (54, 74), (57, 64)),    # up the head's right edge
    ...
])
```

**Placement box:** take width and vertical centre from wherever the mark already sits, but compute height from the mark's **true** aspect ratio. Reference uniform illustrations are often drawn as a 3/4 view and are foreshortened; a flat side-profile mannequin needs the undistorted ratio.

**Walk the outline in one consistent direction and comment each segment** — "up the head's right edge", "into the channel", "along the underside of the crest". Ordering errors around concavities are obvious in a commented list and invisible in a path string.

---

## 8. Verify numerically, then iterate on the largest divergence

Render your drawing into the same normalised box, run the §5 measurement on it, and diff the tables (`drawkit.compare`).

```
v     REF-navy               MINE-navy
4     [(15, 40)]             []              <- crown tapers to a point; reference has a band
12    [(5, 24)]              [(10, 27)]
84    [(31, 44)]             [(40, 42)]      <- lower-left flank is 9 units too far right
```

**Iterate on the biggest numeric divergence, not on visual impression.** The first Houston draft looked plausible on screen with a *collapsed horn*; the table showed row v=4 empty where the reference spanned x15–40. Two rows of numbers found in seconds what staring did not. This is the difference between converging in two passes and stalling.

Once the tables agree, render on the actual shell colour at both final size and about 4x.

---

## 9. Write the module

- One exported path constant per shape, plus a keyline width if the keyline is a stroke.
- Header comment states: that it is **hand-drawn, not traced**; the design box and placement box; what was read off the reference and how; that no path data was lifted; and how it was verified.
- Do **not** mark it `TRACE-PENDING-STYLIZE`. In this repo that marker means "literal reproduction awaiting replacement" — hand-drawn geometry *is* the replacement, and removing the marker is the point.
- Fixed art takes literal hex colours rather than palette tokens: the mark does not recolour with the kit.

---

## Toolkit and worked example

- `scripts/uniform-draw/drawkit.py` — everything above, as functions. Requires Pillow, and `qlmanage` for rendering on macOS. It is a manual dev tool: never imported by the app, never run in CI, deliberately not a package.json dependency.
- `scripts/uniform-draw/texans_bull.py` — the Houston bull's actual anchor lists. The paths in the module are *emitted output*, so tuning the mark means editing anchors and re-running, not hand-editing coordinate strings.

```bash
python3 scripts/uniform-draw/texans_bull.py            # print the paths
python3 scripts/uniform-draw/texans_bull.py --check    # assert the module still matches
```

---

## Quick reference

| Step | Action | Failure it prevents |
|---|---|---|
| 1 | Check body-vs-shell contrast | Spending a day on a negative-space mark that will not converge |
| 2 | Vector reference, licence recorded | Copying path data; unsourced geometry |
| 3 | Square-pad viewBox; composite over white | Wrong crops, bogus bounding boxes |
| 4 | Connected components per colour | Holes drawn as concavities and vice versa |
| 5 | Row-extent tables | Transitions that look right and are not |
| 6 | Layer stack from the helmet, not the logo | A mark that vanishes into its own shell |
| 7 | Normalised design box, commented segments | Outline ordering bugs |
| 8 | Numeric diff, then iterate | Iterating on impressions and converging slowly or not at all |
| 9 | Header states hand-drawn | A future reader treating original art as a trace to be replaced |
