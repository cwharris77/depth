"""Regenerates the New York Jets helmet wordmark in ``lib/uniforms/teams/jets.ts``.

    python3 scripts/uniform-draw/jets_wordmark.py            # print the path
    python3 scripts/uniform-draw/jets_wordmark.py --check    # verify jets.ts matches

This is a CONTOUR TRACE rather than the hand-drawn geometry in
``Reference/uniform-hand-drawing.md`` (in the vault). The wordmark has several small italic letter
cuts and a sweeping J/jet shape; tracing the visible helmet decal is less
ambiguous than rebuilding those cuts as guessed anchors.

SOURCE AND PLACEMENT. The approved SVG is the club's full oval lockup, so it is
not safe to trace as a whole: it also contains ``NEW YORK`` and a football. The
SVG is rasterized locally only to feed drawkit's generic contour machinery; no
source SVG or raster is committed. The internal 2025 uniform composite is used
only to measure helmet placement, never as the wordmark source. The upstream
mark is non-free and trademarked; the fair-use licence audit is recorded in the
vault's Decisions.md, 2026-09-03.

TOPOLOGY, MEASURED BEFORE TRACING. In the cropped JETS region, the approved
render has five substantial white 8-connected components: four letter/jet
components and one football. The wordmark is the four components whose row
centroids are above the football; ``NEW YORK`` is outside the crop. None of the
four selected components has an enclosed hole, so they are emitted as plain
fill subpaths without an evenodd rule. This selection prevents the lockup's
football or background border from becoming helmet artwork.

PLACEMENT. The internal 2025 uniform composite's helmet shell is approximately
x255-342, y25-114 and the wordmark is x265-326, y38-56: 11.5% left, 70.1% wide, 14.6% top, and 20.2%
tall against the shell. The existing raw mannequin placement x210.9-605.0,
y154.2-272.8 is retained because its shell transfer was already measured
against HELMET_ART's x139-701.5, y65-637.4 box. The trace is normalised to the
wordmark's own bbox before mapping into that box, so the source drawing rather
than the surrounding crop controls the proportions.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box, components, main, mask, trace  # noqa: E402

REF = Path('/Users/cwharris/Documents/GitHubProjects/nfl-uniform-refs/jets/jets-mark.svg')
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'jets.ts'

MIN_REGION = 1000
EPS = 1.2

# The SVG is rendered at its true aspect before selecting the JETS region. These
# fractions are measured from the 1200px-wide render: x=13.5..89.5%, y=36.2..72.7%.
WORDMARK_CROP = (0.135, 0.362, 0.895, 0.727)

# Preserve the established raw helmet-space placement while replacing its hand trace.
BOX = Box(210.9, 154.2, 394.1, 118.6)


def white(c):
    """Match the white negative-space ink used by the supplied lockup."""
    return min(c) > 220 and max(c) - min(c) < 15


def wordmark_mask():
    # qlmanage crops wide SVG thumbnails on macOS; ImageMagick renders the
    # attached source at a fixed true aspect before drawkit measures it.
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'wordmark.png'
        subprocess.run(
            [
                'magick',
                '-background',
                'white',
                '-density',
                '300',
                str(REF),
                '-resize',
                '1200x',
                str(rendered),
            ],
            check=True,
            capture_output=True,
        )
        full = Image.open(rendered).convert('RGB')
        w, h = full.size
        x0, y0 = round(w * WORDMARK_CROP[0]), round(h * WORDMARK_CROP[1])
        x1, y1 = round(w * WORDMARK_CROP[2]), round(h * WORDMARK_CROP[3])
        im = full.crop((x0, y0, x1, y1))
    m, w, h = mask(im, white)
    candidates = components(m, w, h, MIN_REGION)
    # The football is the only substantial component below this centroid line.
    wordmark = [component for component in candidates if sum(y for _, y in component) / len(component) < h * 0.65]
    if len(wordmark) != 4:
        raise ValueError('expected four JETS components after excluding lockup artwork')
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
    return {'JETS_DECAL_PATH': trace(m, w, h, BOX, eps=EPS, minsize=MIN_REGION, space='art')}


if __name__ == '__main__':
    main(build, MODULE)
