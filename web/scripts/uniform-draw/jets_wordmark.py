"""Regenerates the New York Jets helmet wordmark in ``lib/uniforms/teams/jets.ts``.

    python3 scripts/uniform-draw/jets_wordmark.py            # print the path
    python3 scripts/uniform-draw/jets_wordmark.py --check    # verify jets.ts matches

This is a CONTOUR TRACE rather than the hand-drawn geometry in
``Reference/uniform-hand-drawing.md`` (in the vault). The wordmark has several small italic letter
cuts and a sweeping J/jet shape; tracing the visible helmet decal is less
ambiguous than rebuilding those cuts as guessed anchors.

SOURCE AND PLACEMENT. The attached standalone SVG contains the JETS wordmark
as four green paths. The paths are rasterized locally only to feed drawkit's
generic component/contour machinery; no source SVG or raster is committed. The
internal 2025 uniform composite is used only to measure the helmet placement
box, never as the wordmark source. The upstream mark is non-free and
trademarked; the fair-use licence audit is recorded in the vault's Decisions.md,
2026-09-03.

TOPOLOGY, MEASURED BEFORE TRACING. The SVG wordmark contains four usable
8-connected green components, with no enclosed holes. The four components are
emitted as plain white fill subpaths without an evenodd rule. The SVG's other
art is excluded by cropping to the wordmark's connected-component bounds.

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

from drawkit import Box, components, crop_to_art, main, mask, trace  # noqa: E402

REF = Path.home() / 'Downloads/New-York-Jets-Logo-New.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'jets.ts'

MIN_REGION = 100
EPS = 1.2

# Preserve the established raw helmet-space placement while replacing its hand trace.
BOX = Box(210.9, 154.2, 394.1, 118.6)


def green(c):
    """Match the attached SVG's green wordmark ink."""
    return c[1] > 60 and c[1] > c[0] * 1.5 and c[1] > c[2] * 1.2


def wordmark_mask():
    # qlmanage crops wide SVG thumbnails on macOS; ImageMagick renders the
    # attached 2048x1152 source at its true aspect before drawkit measures it.
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'wordmark.png'
        subprocess.run(
            ['magick', '-background', 'white', '-density', '150', str(REF), str(rendered)],
            check=True,
            capture_output=True,
        )
        im = crop_to_art(Image.open(rendered).convert('RGB'))
    m, w, h = mask(im, green)
    candidates = components(m, w, h, MIN_REGION)
    wordmark = candidates
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
