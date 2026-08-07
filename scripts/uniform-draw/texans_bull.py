"""Regenerates the hand-drawn Houston bull in lib/uniforms/teams/texans.ts.

The worked example for drawkit.py, and the reason the curve lists are kept: the
paths in the module are emitted output, so tuning the mark means editing the
anchors here and re-running, not hand-editing coordinate strings.

    python3 scripts/uniform-draw/texans_bull.py            # print the three paths
    python3 scripts/uniform-draw/texans_bull.py --check    # verify texans.ts matches

Original geometry. The proportions were read off a percentage grid over a
rendering of the club's mark; no path data was lifted from any source file. See
docs/uniform-hand-drawing.md for the procedure and its licensing posture.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, path, star  # noqa: E402

# Placement derived from where GUD draws the mark on the shell: reference
# x482-532, y37-81 inside shell bbox (461,30,570,139).
BOX = Box(284.0, 104.0, 270.0, 246.0)

# Left horn and head, one shape. Clockwise from the bottom point: up the head's
# right edge, over the crown to the horn's curled tip, back along the top, down
# the horn's outer sweep, in to the shoulder, the step, then the lower flank.
NAVY_CMDS = [
    ('M', (42, 88)),
    ('C', (48, 82), (54, 74), (57, 64)),
    ('C', (60, 56), (61, 50), (60, 44)),
    ('C', (58, 38), (51, 33), (44, 30)),
    ('C', (37, 27), (30, 24), (26, 19)),
    ('C', (24, 15), (25, 11), (29, 8)),
    ('C', (33, 5), (38, 3), (43, 2)),
    ('L', (14, 1)),
    ('C', (9, 7), (5, 14), (4, 20)),
    ('C', (4, 26), (6, 31), (10, 35)),
    ('C', (13, 37), (16, 39), (19, 40)),
    ('L', (12, 48)),
    ('C', (16, 52), (20, 57), (23, 62)),
    ('C', (26, 67), (28, 73), (28, 77)),
    ('L', (24, 80)),
    ('C', (29, 83), (35, 86), (42, 88)),
]

# Right horn. Clockwise from the same bottom point: up the inner edge, out under
# the horn's belly to its tip, round the outer sweep, then down the trailing edge.
RED_CMDS = [
    ('M', (46, 88)),
    ('C', (50, 82), (56, 74), (62, 64)),
    ('C', (65, 58), (67, 52), (67, 46)),
    ('C', (67, 42), (67, 40), (66, 38)),
    ('C', (74, 37), (81, 34), (85, 30)),
    ('C', (88, 26), (87, 22), (83, 19)),
    ('C', (92, 22), (97, 29), (97, 36)),
    ('C', (97, 44), (92, 50), (84, 52)),
    ('C', (80, 58), (72, 70), (60, 80)),
    ('C', (55, 84), (50, 87), (46, 88)),
]

PATHS = {
    'TEXANS_BULL_NAVY_PATH': path(BOX, NAVY_CMDS),
    'TEXANS_BULL_RED_PATH': path(BOX, RED_CMDS),
    'TEXANS_BULL_STAR_PATH': star(BOX, 40.0, 52.0, 12.0, 4.8, turn=-12.0),
}

MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'texans.ts'


def check():
    src = MODULE.read_text()
    ok = True
    for name, want in PATHS.items():
        m = re.search(r"%s =\s*\n?\s*'([^']*)'" % name, src)
        if not m:
            print('MISSING  %s' % name)
            ok = False
        elif m.group(1) != want:
            print('DIFFERS  %s' % name)
            ok = False
        else:
            print('ok       %s' % name)
    return ok


if __name__ == '__main__':
    if '--check' in sys.argv:
        sys.exit(0 if check() else 1)
    for name, d in PATHS.items():
        print('export const %s =\n  %r;' % (name, d))
