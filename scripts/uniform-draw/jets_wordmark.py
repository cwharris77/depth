"""Regenerates the New York Jets helmet wordmark in ``lib/uniforms/teams/jets.ts``.

    python3 scripts/uniform-draw/jets_wordmark.py            # print the path
    python3 scripts/uniform-draw/jets_wordmark.py --check    # verify jets.ts matches

This is a CONTOUR TRACE rather than the hand-drawn geometry in
``docs/uniform-hand-drawing.md``. The wordmark has several small italic letter
cuts and a sweeping J/jet shape; tracing the visible helmet decal is less
ambiguous than rebuilding those cuts as guessed anchors.

WHY NOT THE FETCHED MARK. ``nfl-uniform-refs/jets/jets-mark.svg`` is the flat
Jets oval lockup, with an aspect of about 1.67. The wordmark on the GUD 2025
helmet is about 3.39 (61x18 source pixels). Fitting the flat logo into the
helmet box would thicken and compress every stroke, exactly the flat-mark trap
called out in the tracing procedure. The linework here therefore comes from
the first green helmet in ``jets-current-season-2025.png``; neither reference
is committed here. The upstream mark is non-free and trademarked; the fair-use
licence audit is recorded in the vault's Decisions.md, 2026-09-03.

TOPOLOGY, MEASURED BEFORE TRACING. The helmet crop contains four usable
8-connected white wordmark components, with no enclosed holes. Its counters are
green shell showing through the union, so the four components are emitted as
plain fill subpaths without an evenodd rule. White facemask pieces and the page
background are separate components and are rejected by their crop-relative
bounding boxes.

PLACEMENT. The GUD helmet shell is approximately x255-342, y25-114 and the
wordmark is x265-326, y38-56: 11.5% left, 70.1% wide, 14.6% top, and 20.2%
tall against the shell. The existing raw mannequin placement x210.9-605.0,
y154.2-272.8 is retained because its shell transfer was already measured
against HELMET_ART's x139-701.5, y65-637.4 box. The trace is normalised to the
wordmark's own bbox before mapping into that box, so the source drawing rather
than the surrounding crop controls the proportions.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box, components, main, mask, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/jets/jets-current-season-2025.png'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'jets.ts'

# The first top-row helmet, with enough page around it for component selection.
HELMET = (255, 25, 343, 115)
UPSCALE = 8
# The wordmark is about 61x18 source pixels; this drops shell antialias debris while
# retaining the four letter cuts and the jet sweep.
MIN_REGION = 200
EPS = 3.0

# Preserve the established raw helmet-space placement while replacing its hand trace.
BOX = Box(210.9, 154.2, 394.1, 118.6)


def white(c):
    """Match the white ink, not the green shell or its grey antialias edge."""
    return c[0] > 215 and c[1] > 215 and c[2] > 215


def wordmark_mask():
    im = Image.open(REF).convert('RGB').crop(HELMET)
    im = im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.LANCZOS)
    m, w, h = mask(im, white)
    candidates = components(m, w, h, MIN_REGION)
    # The wordmark is the only sizeable enclosed white component in the upper-left
    # interior of this crop. Facemask pieces touch the right/bottom selection box.
    wordmark = [
        cells
        for cells in candidates
        if 5 * UPSCALE < min(x for x, _ in cells) < 80 * UPSCALE
        and 8 * UPSCALE < min(y for _, y in cells) < 40 * UPSCALE
        and max(x for x, _ in cells) < 80 * UPSCALE
        and max(y for _, y in cells) < 40 * UPSCALE
    ]
    all_cells = [cell for component in wordmark for cell in component]
    xs = [x for x, _ in all_cells]
    ys = [y for _, y in all_cells]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    cells = set(all_cells)
    return (
        [[1 if (x + x0, y + y0) in cells else 0 for x in range(x1 - x0)] for y in range(y1 - y0)],
        x1 - x0,
        y1 - y0,
    )


def build():
    m, w, h = wordmark_mask()
    return {'JETS_DECAL_PATH': trace(m, w, h, BOX, eps=EPS, minsize=MIN_REGION)}


if __name__ == '__main__':
    main(build, MODULE)
