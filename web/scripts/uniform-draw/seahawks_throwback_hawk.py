"""Regenerates the throwback hawk in lib/uniforms/teams/seahawks/source.ts.

    python3 scripts/uniform-draw/seahawks_throwback_hawk.py            # print the paths
    python3 scripts/uniform-draw/seahawks_throwback_hawk.py --check    # verify source.ts matches

HAND-DRAWN ANCHORS, not a contour trace. The only drawing of this decal is the throwback helmet
in the GUD 2025 composite, where the whole mark is about 52 x 24 source pixels: a contour trace
keeps the royal body but loses the white head's thin lower lines and smears the eye. The anchors
below are read off that crop at 12x (sheet x258-330, y785-818, so one source pixel is 12 units)
and walk each outline in one direction.

The decal is a royal body under a white head, eye ring and two cheek lines, with a green eye and a
green block at the rear. The body is one closed shape and the white and green shapes paint over
it, so no fill rule is needed.

Placement keeps the extents a contour trace of the same helmet measured against the shell (the
largest silver region), transferred to the mannequin shell's raw-space box x139-701.5, y65-637.4.

The sleeve logo is the same drawing without its royal body, which disappears into the royal
sleeve. It faces outward on each sleeve, so the viewer's-left copy is mirrored, and its beak
overhangs the outer sleeve edge where the clip trims it.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, main  # noqa: E402

MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'seahawks' / 'source.ts'

# Crop-pixel extents of the royal body; everything below is expressed against them.
X0, X1, Y0, Y1 = 75.0, 705.0, 110.0, 392.0

HELMET_BOX = Box(154.0, 212.0, 310.0, 162.0)
# Sleeve logo width and vertical centre in mannequin space, read off the GUD figure's sleeve.
SLEEVE_W = 74.0
SLEEVE_Y = 505.0

BODY = [
    (78, 125), (120, 112), (440, 118), (470, 128), (640, 140), (690, 185), (705, 260),
    (690, 330), (665, 390), (640, 380), (80, 385),
]
HEAD = [(455, 160), (620, 160), (655, 200), (655, 335), (560, 325), (440, 285), (452, 230)]
EYE_RING = [(190, 235), (240, 185), (410, 190), (432, 215), (400, 266), (210, 282)]
EYE = [(218, 235), (270, 198), (330, 198), (385, 226), (340, 258), (232, 260)]
BROW = [(80, 232), (200, 222), (205, 246), (80, 252)]
CHEEK_UPPER = [(200, 305), (530, 300), (622, 328), (530, 316), (215, 322)]
CHEEK_LOWER = [(230, 345), (600, 340), (642, 356), (250, 364)]
BLOCK = [(80, 262), (160, 262), (190, 300), (190, 382), (80, 382)]


def design(pts, mirror=False):
    out = []
    for x, y in pts:
        u = (x - X0) * 100.0 / (X1 - X0)
        out.append((100.0 - u if mirror else u, (y - Y0) * 100.0 / (Y1 - Y0)))
    return out


def poly(box, *shapes, mirror=False):
    subpaths = []
    for pts in shapes:
        mapped = box.map(design(pts, mirror))
        subpaths.append(
            'M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z'
        )
    return ' '.join(subpaths)


def build():
    out = {
        'SEAHAWKS_THROWBACK_HAWK_ROYAL_PATH': poly(HELMET_BOX, BODY),
        'SEAHAWKS_THROWBACK_HAWK_WHITE_PATH': poly(
            HELMET_BOX, HEAD, EYE_RING, BROW, CHEEK_UPPER, CHEEK_LOWER
        ),
        'SEAHAWKS_THROWBACK_HAWK_BLOCK_PATH': poly(HELMET_BOX, BLOCK),
        'SEAHAWKS_THROWBACK_HAWK_EYE_PATH': poly(HELMET_BOX, EYE),
    }
    sleeve_h = SLEEVE_W * HELMET_BOX.h / HELMET_BOX.w
    for side, x0, mirror in (('LEFT', 24.0, True), ('RIGHT', 588.0 - 24.0 - SLEEVE_W, False)):
        box = Box(x0, SLEEVE_Y - sleeve_h / 2.0, SLEEVE_W, sleeve_h)
        white = (HEAD, EYE_RING, BROW, CHEEK_UPPER, CHEEK_LOWER)
        out['SEAHAWKS_THROWBACK_SLEEVE_WHITE_%s' % side] = poly(box, *white, mirror=mirror)
        out['SEAHAWKS_THROWBACK_SLEEVE_BLOCK_%s' % side] = poly(box, BLOCK, mirror=mirror)
        out['SEAHAWKS_THROWBACK_SLEEVE_EYE_%s' % side] = poly(box, EYE, mirror=mirror)
    return out


if __name__ == '__main__':
    main(build, MODULE)
