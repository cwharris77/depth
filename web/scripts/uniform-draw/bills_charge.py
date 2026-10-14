"""Regenerates the Charge helmet streak from the supplied standalone mark.

    python3 scripts/uniform-draw/bills_charge.py --check

The input is ``nfl-uniform-refs/bills/bills-charge-mark.svg``, outside this repository. It holds a
full-frame background rectangle (dropped), the red streak and horn, and the white edge and horn
painted over it. Both paths are polylines in relative commands; they are made absolute and fitted,
at their true aspect, to a box on the side of the shell running from behind the back edge (the
shell clip trims it) to the horn ahead of the ear hole.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import main  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/bills/bills-charge-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/bills/marks/decal.ts'
# Raw helmet space: the art's left edge sits behind the shell and its horn ends ahead of the ear hole.
X0, X1 = 80.0, 485.0
CENTER_Y = 335.0


def polygons(svg):
    out = []
    for tag in re.finditer(r'<path([^>]*)/>', svg):
        attrs = tag.group(1)
        fill = re.search(r'fill="([^"]+)"', attrs).group(1).upper()
        if fill == '#03358B':
            continue
        tx, ty = map(float, re.search(r'translate\(([-\d.]+),?([-\d.]*)\)', attrs).groups() or (0, 0))
        d = re.search(r'\sd="([^"]+)"', attrs).group(1)
        x = y = 0.0
        rings, ring = [], []
        for cmd, args in re.findall(r'([mMlLhHvVzZ])([^mMlLhHvVzZ]*)', d):
            nums = [float(n) for n in re.findall(r'-?\d*\.?\d+', args)]
            if cmd in 'zZ':
                if ring:
                    rings.append(ring)
                ring = []
                continue
            if cmd in 'hH':
                for n in nums:
                    x = x + n if cmd == 'h' else n
                    ring.append((x, y))
            elif cmd in 'vV':
                for n in nums:
                    y = y + n if cmd == 'v' else n
                    ring.append((x, y))
            else:
                pairs = list(zip(nums[0::2], nums[1::2]))
                for i, (a, b) in enumerate(pairs):
                    if cmd in 'ml':
                        x, y = x + a, y + b
                    else:
                        x, y = a, b
                    if cmd in 'mM' and i == 0 and ring:
                        rings.append(ring)
                        ring = []
                    ring.append((x, y))
        if ring:
            rings.append(ring)
        out.append((fill, [[(px + tx, py + (ty or 0)) for px, py in r] for r in rings]))
    return out


def build():
    polys = polygons(REF.read_text())
    pts = [p for _, rings in polys for r in rings for p in r]
    ax0, ax1 = min(p[0] for p in pts), max(p[0] for p in pts)
    ay0, ay1 = min(p[1] for p in pts), max(p[1] for p in pts)
    scale = (X1 - X0) / (ax1 - ax0)
    oy = CENTER_Y - (ay1 - ay0) * scale / 2

    def fmt(rings):
        parts = []
        for r in rings:
            xy = ['%.1f,%.1f' % (X0 + (px - ax0) * scale, oy + (py - ay0) * scale) for px, py in r]
            parts.append('M' + xy[0] + ''.join(' L' + p for p in xy[1:]) + ' Z')
        return ' '.join(parts)

    names = {'#C20D3A': 'BILLS_CHARGE_STREAK_PATH', '#FEFEFE': 'BILLS_CHARGE_EDGE_PATH'}
    return {names[fill]: fmt(rings) for fill, rings in polys}


if __name__ == '__main__':
    main(build, MODULE)
