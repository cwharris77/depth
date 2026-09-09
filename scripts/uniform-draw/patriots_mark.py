"""Regenerates the New England Patriots helmet mark in ``lib/uniforms/teams/patriots.ts``.

    python3 scripts/uniform-draw/patriots_mark.py            # print the paths
    python3 scripts/uniform-draw/patriots_mark.py --check    # verify patriots.ts matches

This is a contour trace of the approved standalone helmet-mark SVG, not the GUD composite. The
upstream mark is the non-free, trademarked ``File:New England Patriots logo.svg`` on Wikipedia;
the fair-use and provenance decision is recorded in the depth vault's Decisions.md (2026-09-03).
The SVG is used only as the linework source and is never committed. The GUD 2025 composite is
used only for placement measurements: on the home helmet the visible mark spans approximately
x=37..159 and y=285..399, or 11.5% left, 70.1% wide, 14.6% top, and 20.2% high against the
helmet shell. Transferred to the raw mannequin shell, that is the retained placement box
``Box(294.0, 128.0, 328.0, 152.0)``; its 2.16 aspect intentionally follows the shell's
foreshortened side view rather than squeezing the flat SVG to its own 2.03 aspect.

TOPOLOGY, measured before tracing from a black-backed raster of the SVG: one 8-connected navy
face component, two red streamer components, one silver face component, one white keyline
component, and one separate white star component. There are no enclosed holes. The selection trap
is that the white keyline and star share an ink colour, while the silver face is easy to mistake
for shell or facemask grey when selecting from the GUD composite; the generator selects each by
component in the approved SVG instead. All five colour layers are traced against one shared art
bbox so their relative positions survive emission.

The SVG is too wide for qlmanage's square-thumbnail behavior, so the generator uses ImageMagick
to rasterize it at its true aspect on a black background before drawkit measures components. The
black background prevents transparent/white confusion and is cropped away before tracing. The
generated paths were compared numerically against the same normalized source bbox at 5% row
intervals and visually at helmet-thumbnail scale; ``drawkit.main`` owns ``--check``.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, components, crop_to_art, main, mask, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/patriots/patriots-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'patriots.ts'
BOX = Box(294.0, 128.0, 328.0, 152.0)
MIN_REGION = 100
EPS = 1.2


def render_reference():
    """Rasterize the wide SVG at true aspect, avoiding qlmanage's square crop."""
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'patriots-mark.png'
        subprocess.run(
            ['magick', '-background', 'black', '-density', '300', str(REF), str(rendered)],
            check=True,
            capture_output=True,
        )
        return crop_to_art(Image.open(rendered).convert('RGB'), bg=10)


def predicate(name):
    if name == 'navy':
        return lambda c: c[2] > 30 and c[0] < 40 and c[1] < 90
    if name == 'red':
        return lambda c: c[0] > 120 and c[1] < 100 and c[2] < 110
    if name == 'silver':
        return lambda c: 90 < c[0] < 220 and 90 < c[1] < 220 and 90 < c[2] < 220 and max(c) - min(c) < 24
    if name == 'white':
        return lambda c: min(c) > 180
    raise ValueError(name)


def component_mask(im, name, index=0):
    m, w, h = mask(im, predicate(name))
    regions = components(m, w, h, MIN_REGION)
    cells = set(regions[index])
    return [[1 if (x, y) in cells else 0 for x in range(w)] for y in range(h)], w, h


def build():
    im = render_reference()
    _, w, h = mask(im, predicate('navy'))
    white, w, h = mask(im, predicate('white'))
    white_regions = components(white, w, h, MIN_REGION)
    # The keyline is the large white region; the smaller enclosed component is the star.
    keyline = set(white_regions[0])
    star = set(white_regions[1])
    keyline_mask = [[1 if (x, y) in keyline else 0 for x in range(w)] for y in range(h)]
    star_mask = [[1 if (x, y) in star else 0 for x in range(w)] for y in range(h)]
    red, _, _ = mask(im, predicate('red'))
    red_cells = {cell for region in components(red, w, h, MIN_REGION) for cell in region}
    red_mask = [[1 if (x, y) in red_cells else 0 for x in range(w)] for y in range(h)]

    def emit(component):
        return trace(component[0], component[1], component[2], BOX, eps=EPS, minsize=MIN_REGION)

    return {
        'PATRIOTS_DECAL_KEYLINE_PATH': emit((keyline_mask, w, h)),
        'PATRIOTS_DECAL_FACE_PATH': emit(component_mask(im, 'navy')),
        # Preserve both streamer components in one shared source bbox.
        'PATRIOTS_DECAL_STREAMERS_PATH': emit((red_mask, w, h)),
        'PATRIOTS_DECAL_SILVER_PATH': emit(component_mask(im, 'silver')),
        'PATRIOTS_DECAL_STAR_PATH': emit((star_mask, w, h)),
    }


if __name__ == '__main__':
    main(build, MODULE)
