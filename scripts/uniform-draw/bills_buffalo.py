"""Regenerates Buffalo's helmet buffalo from the approved standalone mark.

    python3 scripts/uniform-draw/bills_buffalo.py --check

The linework source is ``nfl-uniform-refs/bills/bills-mark.svg`` (the club mark,
non-free/trademarked; provenance and fair-use treatment are recorded in the
vault's 2026-09-03 licence audit). The GUD 2025 composite is used only for the
raw helmet placement box, not as the mark source. The SVG contains two visible
8-connected components: one navy buffalo and one red diagonal stripe; the
white gap is shell-colored negative space, not a third path or a hole. The
source is rendered at its true 189:126 aspect before tracing so qlmanage's
square-thumbnail crop cannot change the topology. Both masks use the same
canvas and ``space='image'`` so their shared placement and relative extents
are preserved. The box is the established GUD-measured helmet mark extent in
raw mannequin space; no side-seam or leg detail is relevant to the front view.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box, crop_to_art, main, mask, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/bills/bills-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/bills.ts'
BOX = Box(204.0, 123.0, 344.0, 272.0)
UPSCALE = 4
EPS = 1.6
MIN_REGION = 80


def navy(c):
    return c[2] > 90 and c[2] > c[0] * 1.4 and c[2] > c[1] * 1.2


def red(c):
    return c[0] > 150 and c[0] > c[1] * 1.5 and c[0] > c[2] * 1.4


def mark_masks():
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'bills-mark.png'
        subprocess.run(
            ['magick', '-background', 'white', '-density', '150', str(REF), str(rendered)],
            check=True,
            capture_output=True,
        )
        im = crop_to_art(Image.open(rendered).convert('RGB'))
    im = im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.Resampling.LANCZOS)
    navy_mask, w, h = mask(im, navy)
    red_mask, _, _ = mask(im, red)
    return navy_mask, red_mask, w, h


def build():
    navy_mask, red_mask, w, h = mark_masks()
    return {
        'BILLS_HELMET_DECAL_BUFFALO_PATH': trace(
            navy_mask, w, h, BOX, eps=EPS, minsize=MIN_REGION, space='image'
        ),
        'BILLS_HELMET_DECAL_STRIPE_PATH': trace(
            red_mask, w, h, BOX, eps=EPS, minsize=MIN_REGION, space='image'
        ),
    }


if __name__ == '__main__':
    main(build, MODULE)
