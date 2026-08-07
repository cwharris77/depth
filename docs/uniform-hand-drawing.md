# Hand-drawing a helmet mark

The procedure used to draw Houston's bull (`lib/uniforms/teams/texans.ts`). It is written to be reproducible by someone — or something — with no memory of that pass. It replaces machine tracing for marks the tracer cannot reach, and produces original geometry rather than a reproduction, which is the posture `nfl-uniform-refs/INDEX.md` describes.

Read `uniform-model-brief.md` §6 first for the tracing workflow this sits beside. Tracing is still the default; this is what you do when tracing fails, or when a trace needs replacing with real artwork.

## Predict the outcome before starting

One property decides how well this goes, and it is worth checking first because it changes whether the effort is worth spending.

**Does the mark's main body contrast with the shell it sits on?**

- **Yes → hand-drawing works well.** The mark is carried by positive shapes. Errors in a positive shape are forgiving: a curve a few units off still reads as a bull horn. Houston's bull converged in two passes.
- **No → hand-drawing is much harder.** If the mark's body is the same colour as the shell (Seattle's navy hawk on a navy shell, San Francisco's, Tennessee's), then the entire mark is carried by *thin white negative space*. The same few units of error that were invisible in a positive shape now break the mark, because what you are drawing is the gap between two things rather than a thing. A Seattle attempt reached roughly 60% in three passes and still failed at helmet scale.

Do not conclude from a good flat rendering that a negative-space mark is finished. Check it on the shell colour, at swatch size, early — that is where it fails.

## Step 1 — Get a flat vector reference and record its licence

Wikipedia carries most primary club marks as SVG. They are almost always **non-free, fair-use** — Commons generally has only the wordmark free. That is acceptable here *as a look-at reference for proportions*, which is the posture `INDEX.md` sets, and it is not acceptable as a source of path data. Do not copy path data. Do not commit the file to this repo.

Record the URL and the licence in the module header.

## Step 2 — Render it flat, and work around two rendering traps

Both of these cost real time on the first pass:

- **`qlmanage` letterboxes into a square.** Pad the SVG's `viewBox` to square yourself, so the art lands in a known place, then crop by measured bounding box rather than by assumed offsets.
- **Transparent → black.** `Image.open(...).convert('RGB')` turns unpainted pixels black, so a non-white bounding-box scan returns the whole canvas. Composite onto white first:

```python
im = Image.open(f).convert('RGBA')
im = Image.alpha_composite(Image.new('RGBA', im.size, (255, 255, 255, 255)), im).convert('RGB')
```

## Step 3 — Establish topology before drawing anything

**This is the step that most changes the result, and it is easy to skip.** Run connected components per colour and ask: how many separate shapes are there, and for each enclosed region, is it a *hole* or a *concavity*?

```python
for name, c in (('navy', (0, 34, 68)), ('grey', (165, 172, 175)), ('green', (105, 190, 40))):
    m, W, H = mask(im, near(c))
    for cells, touches in comps(m, W, H, 60):
        ...  # count, bbox, whether it touches the crop border
```

The distinction matters because it decides the shape of your outline:

- A **hole** (fully enclosed) becomes its own path, drawn on top in the colour that shows through.
- A **concavity** (an indentation open to the outside) is an *excursion in the outer boundary* — you walk into it and back out. Getting this wrong is what collapsed the first Seattle draft: the channel separating crest from head is a concavity, and treating it as absent left the two merged.

Seattle's answer, for reference: navy is ONE connected shape with a deep concavity and three enclosed voids, plus a separate grey wedge and a green pupil.

## Step 4 — Measure, do not eyeball

Produce a table of horizontal extents every few percent of height — for each colour's outer boundary, and separately for each enclosed void.

```python
def runs(v, pred):
    y = int(v * H / 100)
    xs = [x for x in range(W) if pred(p[x, y])]
    return (round(min(xs) * 100 / W), round(max(xs) * 100 / W)) if xs else None
```

These numbers are your anchors. Reading a grid overlay by eye gets the gross proportions right and the transitions wrong — the first bull draft put a notch between horn and head that does not exist, because at a glance the shape looked like it had one.

## Step 5 — Choose the layer stack from how the mark sits on the shell

Look at how the reference sheet draws the mark *on the helmet*, not just the logo in isolation. Two cases:

- **Body contrasts with shell** (Houston's bull on navy): white keyline underneath, then body colours on top. The keyline is a **stroke** on the body path — safe here, because hand-drawn curves are smooth. Do not do this with a machine trace: this renderer exposes no `strokeLinejoin`, so a miter spikes at every reversal of a jagged contour, which is why Detroit's keyline is a grown fill instead.
- **Body equals shell** (Seattle's hawk on navy): the mark is the white channels and the shell supplies the body. You still author the body shape so the mark survives on a differently-coloured shell, but what a viewer sees is the negative space.

## Step 6 — Draw in a normalised box, map at emit time

Design in 0–100 on both axes — percentages of the placement box in each direction, matching the measurement tables — and map into raw helmet space only when emitting. This keeps the numbers you are typing the same numbers you measured.

```python
X0, Y0, W, H = 284.0, 104.0, 270.0, 246.0          # placement box in raw helmet space

def mapped(pts):
    return [(X0 + u * W / 100.0, Y0 + v * H / 100.0) for u, v in pts]

def fmt(cmds):                                      # ('M'|'L', pt) or ('C', c1, c2, pt)
    out = []
    for c in cmds:
        k, pts = c[0], mapped(c[1:])
        if k == 'M':
            out.append('M%.1f,%.1f' % pts[0])
        elif k == 'L':
            out.append('L%.1f,%.1f' % pts[0])
        else:
            out.append('C%.1f,%.1f %.1f,%.1f %.1f,%.1f' % (pts[0] + pts[1] + pts[2]))
    return ' '.join(out) + ' Z'
```

**Placement box:** take the width and vertical centre from wherever the mark already sits (an existing trace's bbox is the best evidence), but compute the height from the mark's **true** aspect ratio rather than GUD's. GUD draws a 3/4 shell, so its rendering is foreshortened; the mannequin draws a flat side profile.

Walk the outline in one consistent direction and name each segment in a comment as you go — "up the head's right edge", "into the channel", "along the underside of the crest". Ordering errors around concavities are the most common structural bug, and they are obvious in a commented list and invisible in a path string.

## Step 7 — Verify numerically, then iterate on the largest divergence

Render your drawing into the same normalised box, run the Step 4 measurement on it, and diff the tables against the reference's.

```
y   REF-navy                MINE-navy
4   [(15, 40)]              []            <- crown tapers to a point; reference has a band
12  [(5, 24)]               [(10, 27)]
84  [(31, 44)]              [(40, 42)]    <- lower-left flank is 9 units too far right
```

**Iterate on the biggest numeric divergence, not on visual impression.** The first bull draft looked plausible on screen with a collapsed horn; the table showed the row at y=4 was empty when it should have spanned x15–40. Two rows of numbers found in seconds what staring did not.

Once the tables agree, render on the actual shell colour at both swatch size and about 4x, and compare against the reference sheet's helmet.

## Step 8 — Write the module

Follow the house pattern in `texans.ts`:

- Export one path const per shape, plus a keyline width if the keyline is a stroke.
- Header comment states: that it is **hand-drawn, not traced**; the design box and placement box; what was read off the reference and how; that no path data was lifted; and how it was verified.
- Do **not** carry `TRACE-PENDING-STYLIZE` — that marker means "literal reproduction awaiting replacement", and hand-drawn geometry is the replacement. Removing it is the point.
- Fixed art takes literal hexes rather than palette tokens; the mark does not recolour with the kit.

## Quick reference

| Step | Action | Failure it prevents |
|---|---|---|
| 0 | Check body-vs-shell contrast | Spending a day on a negative-space mark that will not converge |
| 1 | Vector reference, licence recorded | Copying path data; unsourced geometry |
| 2 | Square-pad viewBox; composite over white | Wrong crops, bogus bounding boxes |
| 3 | Connected components per colour | Holes drawn as concavities and vice versa |
| 4 | Row-extent tables | Transitions that look right and are not |
| 5 | Layer stack from the helmet, not the logo | A mark that vanishes into its own shell |
| 6 | Normalised design box, commented segments | Outline ordering bugs |
| 7 | Numeric diff, then iterate | Iterating on impressions and converging slowly or not at all |
| 8 | Module header states hand-drawn | A future reader treating original art as a trace to be replaced |
