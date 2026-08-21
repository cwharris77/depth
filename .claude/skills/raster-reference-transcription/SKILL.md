---
name: raster-reference-transcription
description: Use when measuring a raster/rendered image (a printed uniform photo, a rendered reference PNG, any picture of an artifact) pixel-by-pixel to reproduce its subject as vector paths or structured data. Reach for this before authoring an SVG/vector definition from a reference image, and especially before using "largest connected component" or a similar heuristic to isolate a shape from a color selection.
---

# Raster reference transcription

## Why this exists

Measuring a rendering measures two things at once: the subject, and the renderer's own
presentation of it — outlines, seams, drop-shadows, antialiasing. Both are made of exactly
the same pixels, so no color predicate alone can tell them apart. A transcription that copies
presentation artifacts as content is pixel-faithful to the reference and wrong about the
subject — and because it's plausible-looking, it usually isn't caught by a typecheck or a
render smoke-test, only by holding the output against the source.

This repo has hit three concrete instances of the same underlying problem:

- **A seam mistaken for a gap.** A sleeve marking measured as two same-colored bands with a
  gap between them — the "gap" was the reference renderer's own seam outline over a
  continuous band, not part of the artwork. (See `lib/uniforms/` for the module that resolved
  this inline; the finding wasn't in the procedure, so it got rediscovered from scratch once
  before.)
- **"Largest connected component" silently dropped a real part.** A two-color mark (solid
  body inside a contrasting outline) selected with `colorA OR colorB`, then reduced to "keep
  the largest component" to strip unrelated nearby artwork. The outline and body don't touch —
  an antialiased seam separates them — so the union was two components, and "largest" kept
  only the body. The output looked clean and complete; the outline was silently gone.
- **A drop-shadow measured as trim.** A trimmed shape's full outer silhouette folded a
  drop-shadow into the trim color, doubling the apparent keyline weight. The fix was to
  measure a cut through the shape's interior (crosses every layer once) instead of tracing its
  outer boundary (can't distinguish a layer from its shadow beneath it).

## Procedure

1. **Classify every measured boundary before authoring it**: is this a feature of the subject,
   or of the rendering? A thin neutral line between two same-colored regions is almost always
   a seam, not a gap. A dark band along one edge only (the side away from the light source) is
   a shadow, not trim.

2. **Prefer a cut through the interior of a shape over tracing its outer silhouette.** An
   interior cut crosses each layer exactly once and can't confuse a layer with its own shadow;
   a silhouette trace can't tell the two apart.

3. **Never reduce a multi-component selection with a rank-based heuristic (largest, first,
   nearest) when the component count itself is diagnostic.** If two colors are combined with
   OR and treated as one object, that assumption — that they're actually connected — needs to
   be checked, not assumed. Prefer a size *threshold* that admits every plausible component,
   then verify the resulting count against what the subject should contain (e.g. "this mark
   should be 1 body + 1 outline = expect ≥2 components before painting the body over them").

4. **Write capability verdicts as provisional, not settled**, unless they're a proven
   impossibility. A *demonstrated* impossibility records the measurement that proves it (e.g.
   "unreachable: this team's navy samples exactly the shell's navy, `(3,24,37)`" — a fact a
   reader can re-check in one line). A *judgement* that something is "too hard" should name the
   specific method that failed and say what would change the answer — not be written in the
   same settled voice as a measured fact. Assessing a mark's single hardest feature and letting
   that verdict stand for the whole mark is a recurring trap: ask what the subject is *mostly*
   made of, and treat the hard part as its own smaller, usually cheaper question.

## Principle

Measuring a rendering measures two things at once — the subject and the renderer — and no
color predicate distinguishes them; the tell is almost always structural (a seam line, a
one-sided shadow) rather than chromatic. A reduction step that turns many components into one
encodes a precondition that the candidates are alternatives, not parts — when they're parts,
the reduction succeeds on a fragment instead of failing, which is the worse outcome. And a
negative capability judgement is a claim about the method tried, not a property of the
subject — record what was tried, not just the conclusion, so a later pass can tell "provably
impossible" from "looked hard once."
