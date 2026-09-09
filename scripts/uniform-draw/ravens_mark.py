"""Regenerates the Baltimore Ravens helmet mark in ``lib/uniforms/teams/ravens.ts``.

    python3 scripts/uniform-draw/ravens_mark.py            # print generated paths
    python3 scripts/uniform-draw/ravens_mark.py --check    # verify ravens.ts matches

This is a contour trace of the approved standalone club mark, not a trace of the
low-resolution helmet thumbnail.  The source is Wikimedia's ``File:Baltimore
Ravens logo.svg`` (non-free/fair-use artwork on en.wikipedia; the trademark and
licence audit are recorded in the vault's 2026-09-03 Decisions entry).  The
reference is kept in the sibling ``nfl-uniform-refs`` checkout and is never
committed here.

Topology, measured from a 2400px true-aspect raster of that SVG before tracing:
gold is 3 connected components, purple is 3, white is 6 enclosed components,
and red is 1.  The large white page background is border-connected and discarded;
the white mark pieces are holes/details, not background.  Black is deliberately
not emitted: on every Ravens helmet it is the shell colour and therefore supplies
the mark's negative-space gaps.  The selection trap is the SVG's full lockup: its
black shell gaps and white page background must not become extra decal layers, and
the tiny red eye must be selected independently rather than lost in the purple
head.

Placement is measured only from the GUD 2025 helmet composite.  In the first
right-facing helmet, the shell is x=56..160, y=28..126 and the visible mark is
x=72..139, y=39..69: left=15.4%, width=64.4%, top=11.2%, height=31.6% of the
shell.  Transferred to the raw helmet silhouette x=139..701.5, y=65..637.4,
that is ``Box(225.7, 129.1, 362.0, 180.9)``.  The mark is allowed to overhang
inside that measured box only where the shell clip hides the wrapped rear edge;
no side-seam or leg detail is authored for the front-facing figure.

The SVG is too wide for qlmanage's square-thumbnail behavior, so the generator
rasterizes it with ImageMagick at its true aspect before handing masks to
``drawkit.trace``.  No tracing logic is duplicated here: connected components,
contour simplification, path emission, and ``--check`` all come from drawkit.
The generated masks were compared in the same normalized art bbox as the source
and visually checked on the black mannequin shell at final thumbnail size.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, components, main, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/ravens/ravens-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'ravens.ts'
RENDER_WIDTH = 2400
EPS = 2.4
MIN_REGION = 100

BOX = Box(225.7, 129.1, 362.0, 180.9)

PALETTE = {
    'gold': (154, 118, 17),
    'purple': (36, 19, 95),
    'white': (255, 255, 255),
    'red': (200, 16, 46),
    'black': (0, 0, 0),
}


def raster():
    """Rasterize the wide SVG without qlmanage's square crop/letterbox ambiguity."""
    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / 'ravens-mark.png'
        subprocess.run(
            [
                'magick',
                str(REF),
                '-background',
                'white',
                '-alpha',
                'remove',
                '-alpha',
                'off',
                '-resize',
                f'{RENDER_WIDTH}x!',
                str(output),
            ],
            check=True,
        )
        return Image.open(output).convert('RGB').copy()


def classify(im):
    """Assign pixels to the nearest source ink, retaining antialiased edges."""
    px = im.load()
    labels = []
    for y in range(im.height):
        row = []
        for x in range(im.width):
            color = px[x, y]
            row.append(
                min(
                    PALETTE,
                    key=lambda name: sum(
                        (color[i] - PALETTE[name][i]) ** 2 for i in range(3)
                    ),
                )
            )
        labels.append(row)
    return labels


def ink_mask(labels, name):
    """Keep non-border-connected regions of one ink, excluding page background."""
    h, w = len(labels), len(labels[0])
    raw = [[1 if labels[y][x] == name else 0 for x in range(w)] for y in range(h)]
    kept = []
    for region in components(raw, w, h, MIN_REGION):
        if any(x in (0, w - 1) or y in (0, h - 1) for x, y in region):
            continue
        kept.extend(region)
    cells = set(kept)
    return [[1 if (x, y) in cells else 0 for x in range(w)] for y in range(h)]


def build():
    labels = classify(raster())
    height, width = len(labels), len(labels[0])
    art = [
        (x, y)
        for y, row in enumerate(labels)
        for x, name in enumerate(row)
        if name != 'white'
    ]
    x0, y0 = min(x for x, _ in art), min(y for _, y in art)
    x1, y1 = max(x for x, _ in art) + 1, max(y for _, y in art) + 1

    def crop(mask):
        return [row[x0:x1] for row in mask[y0:y1]]

    art_width, art_height = x1 - x0, y1 - y0
    return {
        'RAVENS_DECAL_GOLD_PATH': trace(crop(ink_mask(labels, 'gold')), art_width, art_height, BOX, eps=EPS, minsize=MIN_REGION, space='image'),
        'RAVENS_DECAL_PURPLE_PATH': trace(crop(ink_mask(labels, 'purple')), art_width, art_height, BOX, eps=EPS, minsize=MIN_REGION, space='image'),
        'RAVENS_DECAL_WHITE_PATH': trace(crop(ink_mask(labels, 'white')), art_width, art_height, BOX, eps=EPS, minsize=MIN_REGION, space='image'),
        'RAVENS_DECAL_EYE_PATH': trace(crop(ink_mask(labels, 'red')), art_width, art_height, BOX, eps=EPS, minsize=MIN_REGION, space='image'),
    }


if __name__ == '__main__':
    main(build, MODULE)
