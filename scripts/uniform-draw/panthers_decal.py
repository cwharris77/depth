"""Regenerates the Carolina helmet mark in lib/uniforms/teams/panthers.ts.

    python3 scripts/uniform-draw/panthers_decal.py            # print the four paths
    python3 scripts/uniform-draw/panthers_decal.py --check    # verify panthers.ts matches

This is a CONTOUR TRACE, not the hand-drawn geometry docs/uniform-hand-drawing.md
produces. The panther head is carried by fine positive detail — jaw, fangs,
whisker slashes — that a hand-drawn anchor list cannot hold at helmet scale, and
the mark's body contrasts with both shells, so the trace is stable where the doc's
negative-space warning would not apply. The mark is the club's non-free
trademarked artwork (en.wikipedia `File:Carolina Panthers logo.svg`, fair use;
licence audit: the vault's Decisions.md, 2026-09-03) and the reference file is
never committed here — it lives in the sibling nfl-uniform-refs/ checkout.

Topology, measured rather than assumed (docs step 4). The mark is ONE connected
component and has NO enclosed white area: every gap that reads as a whisker or a
muzzle slash is BLUE showing through the black, not the shell. That is what makes
the stack four plain unions in paint order with no fill rule anywhere — the
evenodd hole that punched through the 49ers "F" has nothing to do here.

  1. keyline    blue   the whole silhouette, holes filled
  2. body       black  the black+grey region, holes filled, painted over it
  3. detail     blue   exactly those holes, painted back on top
  4. highlight  grey   the fangs and brow

Placement (docs step 7) is measured from the GUD 2025 helmet composite, not from
the flat logo. Both boxes are connected-component measurements, not eyeballed:
the sheet's helmet silhouette is x254-360, y83-180, of which x254-347 is the
shell and the rest is the facemask, and the mark is the 974px component at
x262-316, y94-127. That is left 8.6%, width 58.1%, top 11.3%, height 34.0% of
the shell box. Measure the mark's top with a colour predicate that excludes the
shell's own dark OUTLINE or it reads ~10px high and the mark ends up hugging the
crown, which is the one thing the reference does not do — there is clear silver
between the crown edge and the blue arc.

The mannequin's own shell silhouette is x139-701.5, y65-637.4 in raw helmet space
(HELMET_ART_CLIP through HELMET_ART_TRANSFORM). It is a 0.98 aspect box against
GUD's 0.96, so those four fractions transfer directly and land the box below.
Height therefore comes from the composite and NOT from the flat logo's true 1.84
aspect: this mannequin draws the same three-quarter shell GUD does, so the mark
wraps and reads nearer 1.65 on both.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import (  # noqa: E402
    Box,
    crop_to_art,
    fill_holes,
    holes_of,
    main,
    render_flat,
    trace,
)

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/panthers/panthers-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'panthers.ts'

# Render width for the trace. 1200 crops to 764px of art, so one source pixel is
# under half a unit in the placement box below — finer than the renderer resolves.
RENDER = 1200
# Douglas-Peucker tolerance in source pixels. 0.9 holds every whisker while
# dropping the antialias stair-steps that would otherwise triple the path length.
EPS = 0.9
# Drop specks below this many pixels: at 764px of art they are antialias debris,
# and each one would survive into the path as a visible dot on the shell.
MIN_REGION = 40

BOX = Box(187.4, 129.7, 326.8, 194.6)

# The reference's own three ink colours, plus the white it is composited onto.
PALETTE = {
    'bg': (255, 255, 255),
    'blue': (0, 133, 202),
    'grey': (191, 192, 191),
    'black': (0, 0, 0),
}


def classify():
    """Label every pixel with the nearest reference colour.

    Nearest-colour rather than a tolerance band on purpose: an antialiased edge
    pixel belongs to whichever side it is closer to, and a band would leave it
    unlabelled and punch a one-pixel hole along every boundary.
    """
    im = crop_to_art(render_flat(REF.read_text(), size=RENDER))
    w, h = im.size
    px = im.load()
    lab = [[None] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lab[y][x] = min(
                PALETTE, key=lambda k: (r - PALETTE[k][0]) ** 2 + (g - PALETTE[k][1]) ** 2 + (b - PALETTE[k][2]) ** 2
            )
    return lab, w, h


def mask_of(lab, w, h, keys):
    return [[1 if lab[y][x] in keys else 0 for x in range(w)] for y in range(h)]


def emit(m, w, h):
    return trace(m, w, h, BOX, eps=EPS, minsize=MIN_REGION)


def build():
    lab, w, h = classify()
    ink = mask_of(lab, w, h, {'blue', 'black', 'grey'})
    body = mask_of(lab, w, h, {'black', 'grey'})
    return {
        'PANTHERS_DECAL_KEYLINE_PATH': emit(fill_holes(ink, w, h), w, h),
        'PANTHERS_DECAL_BODY_PATH': emit(fill_holes(body, w, h), w, h),
        'PANTHERS_DECAL_DETAIL_PATH': emit(holes_of(body, w, h), w, h),
        'PANTHERS_DECAL_HIGHLIGHT_PATH': emit(mask_of(lab, w, h, {'grey'}), w, h),
    }


if __name__ == '__main__':
    main(build, MODULE)
