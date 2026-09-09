"""Regenerates the Denver Broncos current helmet horse in ``broncos.ts``.

    python3 scripts/uniform-draw/broncos_horse.py            # print the paths
    python3 scripts/uniform-draw/broncos_horse.py --check    # verify broncos.ts matches

This is a contour trace from the approved ``Denver Broncos logo.svg`` reference, not a
hand-drawn reconstruction. The source is the fair-use, trademarked Wikipedia mark recorded
in the vault's 2026-09-03 licence audit; it is used as a visual/vector reference only and
stays in the sibling ``nfl-uniform-refs`` checkout. The internal GUD 2025 composite is used
only to retain the helmet placement: the visible decal occupies the existing raw helmet box
x=203..579, y=148..340. The source's navy body is the shell-colored negative space, so only
the orange mane and white head are emitted as two color layers.

Topology was measured after true-aspect ImageMagick rasterisation: the source has one navy
body component, three orange mane components, and one white head component; the apparent eye
and nostril are holes/shell-colored gaps, not additional foreground paths. The SVG is rendered
at its true aspect because qlmanage's square thumbnail would distort this wide mark. Both
colored masks are traced in one shared art bounding box so their relative placement survives
mechanically. Numeric bbox/extents comparison against the normalized reference and the
generated module's ``--check`` are part of the local verification workflow.
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image  # noqa: E402

from drawkit import Box, components, main, mask, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/broncos/broncos-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'broncos.ts'
BOX = Box(203.0, 147.6, 375.9, 192.7)
MIN_REGION = 100
EPS = 3.0


def render_reference():
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'broncos.png'
        subprocess.run(
            ['magick', '-background', 'white', '-density', '300', str(REF), str(rendered)],
            check=True,
            capture_output=True,
        )
        return Image.open(rendered).convert('RGB')


def orange(c):
    return c[0] > 210 and c[1] < 130 and c[2] < 80


def white(c):
    return min(c) > 210


def shared_masks():
    im = render_reference()
    orange_mask, w, h = mask(im, orange)
    white_mask, _, _ = mask(im, white)
    orange_regions = components(orange_mask, w, h, MIN_REGION)
    # The page background is the white component touching the crop border; the horse is the
    # separate enclosed white component. Keeping only that component prevents the canvas from
    # becoming a traced rectangle.
    white_regions = [
        cells
        for cells in components(white_mask, w, h, MIN_REGION)
        if not any(x in (0, w - 1) or y in (0, h - 1) for x, y in cells)
    ]
    all_regions = orange_regions + white_regions
    cells = [cell for region in all_regions for cell in region]
    x0 = min(x for x, _ in cells)
    y0 = min(y for _, y in cells)
    x1 = max(x for x, _ in cells) + 1
    y1 = max(y for _, y in cells) + 1
    orange_cells = {cell for cells in orange_regions for cell in cells}
    white_cells = set(white_regions[0])
    crop = lambda cells: [
        [1 if (x + x0, y + y0) in cells else 0 for x in range(x1 - x0)]
        for y in range(y1 - y0)
    ]
    return crop(orange_cells), crop(white_cells), x1 - x0, y1 - y0


def build():
    orange_mask, white_mask, w, h = shared_masks()
    return {
        'BRONCOS_DECAL_MANE_PATH': trace(orange_mask, w, h, BOX, eps=EPS, minsize=MIN_REGION),
        'BRONCOS_DECAL_HORSE_PATH': trace(white_mask, w, h, BOX, eps=EPS, minsize=MIN_REGION),
    }


if __name__ == '__main__':
    main(build, MODULE)
