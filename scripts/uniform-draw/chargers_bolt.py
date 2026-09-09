"""Regenerates the Los Angeles helmet bolt in lib/uniforms/teams/chargers.ts.

    python3 scripts/uniform-draw/chargers_bolt.py            # print the two paths
    python3 scripts/uniform-draw/chargers_bolt.py --check    # verify chargers.ts matches

A CONTOUR TRACE rather than the hand-drawn geometry docs/uniform-hand-drawing.md
produces — see that doc's "second route" section for the procedure and for what
drawkit supplies. The bolt is a broad solid shape with no fine interior detail,
so the doc's negative-space warning does not apply and a trace is both stable
and closer to the reference than an anchor list would be.

WHY NOT THE FETCHED MARK, which is the thing to know before touching this file.
`File:Los Angeles Chargers logo.svg` traces clean and IS the club's bolt, and
the first version of this script used it — placed in a box measured off the
shell, which is the normal procedure. It reads wrong on the helmet, and the
reason is that the flat logo and the decal are not the same drawing. The logo
is 2.48 aspect with short blunt tails; the bolt GUD draws on the shell is 1.71
aspect with long thin ones, because a decal applied around a curved shell
arches far more in side profile than the flat mark does. Squeezing the logo
into the decal's box gets the extents right and the drawing wrong: every stroke
thickens with the stretch, so the mark lands fat and blunt where the reference
is slender and swept. The linework here is therefore traced from the shell in
the GUD 2025 composite itself — the same reference the placement comes from.

The trade is resolution: that helmet is 93px across and its bolt 76px, so the
crop is upsampled 8x before tracing and EPS is set against the interpolated
edge rather than a drawn one. That is the same bargain the Rams' horn made in
reverse (there the GUD helmet was too coarse and a larger illustration existed;
here no larger drawing of THIS bolt exists). The reference is not committed —
it lives in the sibling nfl-uniform-refs/ checkout.

Topology, measured rather than assumed (docs step 3). The decal is two visible
shapes, a blue keyline under a gold body, and the antialiased seam between them
means they are NOT one 8-connected component — which is exactly why the keyline
is traced from the filled union of the blue ring and not from the blue ink. Each
is one component with no enclosed hole. One subpath per element, no fill rule.
The real helmet carries a third, outer white keyline; it is invisible on a white
shell and is not authored (a navy-shell kit would need it).

Selecting the bolt out of the helmet needs care: the drawn jersey number is the
same blue, and the facemask is a near-enough gold that a colour predicate alone
picks up both. The bolt is found instead as the largest BLUE component, and the
body as the one gold component that lies entirely inside its box.

Placement (docs step 7) is measured from that same helmet. The shell silhouette
cannot be measured as "everything that is not white" — the shell IS white, and
the facemask sits inside its bounding box, which reads the shell 14% too wide.
It is measured instead as the largest ENCLOSED white region (flood the page
white in from the border; what stays is the shell interior). Against that box
the bolt is left 7.6%, width 87.3%, top 8.8%, height 50.4%.

The mannequin's own shell silhouette is x139-701.5, y65-637.4 in raw helmet
space (HELMET_ART_CLIP through HELMET_ART_TRANSFORM), so those four fractions
transfer directly to HELMET_BOX. Nothing is stretched on the way: the box is
1.70 aspect and the traced bolt 1.71, because the reference already draws the
mark at the proportion a shell puts it at.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box, components, fill_holes, main, mask, trace  # noqa: E402

REFS = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/chargers'
SHEET = REFS / 'chargers-current-season-2025.png'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'chargers.ts'

# The 2025 sheet's left (home) helmet, with room around it so the flood fill that
# finds the shell has a border of page to start from.
HELMET = (40, 30, 175, 145)
# The bolt is 76 source pixels wide against 491 units in the placement box, so one
# source pixel is over six units. 8x puts the contour under the renderer's
# resolution; without it every taper stair-steps.
UPSCALE = 8
# Douglas-Peucker tolerance in upsampled pixels. 3.5 holds all six notches while
# dropping the ripple LANCZOS leaves along an interpolated edge; 2.0 keeps the
# ripple and 5.0 starts rounding the notches off.
EPS = 3.5
# Drop anything smaller than a real part of the mark — at 8x, debris is large.
MIN_REGION = 2000

# The sheet's two decal inks. GOLD is deliberately loose enough to take the seam
# pixels where the body meets the keyline; a tight predicate leaves the body a
# ring narrower than the reference draws it.
BLUE = lambda c: abs(c[0] - 60) < 75 and abs(c[1] - 160) < 70 and abs(c[2] - 220) < 70  # noqa: E731
GOLD = lambda c: c[0] > 200 and 140 < c[1] < 228 and c[2] < 150  # noqa: E731

HELMET_BOX = Box(181.8, 115.4, 491.1, 288.5)


def bolt_masks():
    """(keyline, body, w, h) for the shell bolt alone, cropped to its own box."""
    im = Image.open(SHEET).convert('RGB').crop(HELMET)
    im = im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.LANCZOS)
    blue, w, h = mask(im, BLUE)
    gold, _, _ = mask(im, GOLD)
    # The largest blue region is the keyline; the jersey number's strokes are the
    # next two and an order of magnitude smaller.
    ring = set(components(blue, w, h, MIN_REGION)[0])
    xs = [x for x, _ in ring]
    ys = [y for _, y in ring]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    sw, sh = x1 - x0, y1 - y0
    inside = lambda c: x0 <= c[0] < x1 and y0 <= c[1] < y1  # noqa: E731
    # The facemask is the larger gold region but straddles the box; the body is the
    # one that lies wholly within it.
    body_cells = next(
        set(c) for c in components(gold, w, h, MIN_REGION) if all(inside(p) for p in c)
    )
    keyline = [[1 if (x + x0, y + y0) in ring else 0 for x in range(sw)] for y in range(sh)]
    body = [[1 if (x + x0, y + y0) in body_cells else 0 for x in range(sw)] for y in range(sh)]
    return keyline, body, sw, sh


def build():
    keyline, body, w, h = bolt_masks()
    return {
        'CHARGERS_DECAL_KEYLINE_PATH': trace(
            fill_holes(keyline, w, h), w, h, HELMET_BOX, eps=EPS, minsize=MIN_REGION
        ),
        'CHARGERS_DECAL_BOLT_PATH': trace(
            body, w, h, HELMET_BOX, eps=EPS, minsize=MIN_REGION
        ),
    }


if __name__ == '__main__':
    main(build, MODULE)
