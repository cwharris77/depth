"""Regenerates the throwback hawk in lib/uniforms/teams/seahawks/source.ts from $DECAL_SVGS.

    DECAL_SVGS=<dir> python3 scripts/uniform-draw/seahawks_throwback_hawk.py          # print
    DECAL_SVGS=<dir> python3 scripts/uniform-draw/seahawks_throwback_hawk.py --check  # verify

The reference is a 1200px vector of the original hawk, saved as seahawks_throwback_hawk.svg in
$DECAL_SVGS. Its first path is the white canvas; the rest are, in paint order, the royal body, the
green rear block, the white head, the white eye ring, the green eye, the white cheek line and the
green brow line. Each path's translation is applied and its points mapped straight into mannequin
space without rasterizing or simplifying.

The layers regroup those paths by color. That keeps paint order intact because the green block
touches only the royal body, and the green eye and brow sit on the white head and eye ring.

The helmet placement keeps the previous decal's x-range and vertical centre on the shell, and takes
its height from the reference's aspect. The sleeve logo is the same drawing without its royal body,
which disappears into the royal sleeve. It faces outward on each sleeve, so the viewer's-left copy
is mirrored, and its beak overhangs the outer sleeve edge where the clip trims it.
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, main  # noqa: E402

REF = Path(os.environ.get('DECAL_SVGS', '.')) / 'seahawks_throwback_hawk.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'seahawks' / 'source.ts'
SVG_NS = '{http://www.w3.org/2000/svg}'
TOKEN = re.compile(r'[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
TRANSLATE = re.compile(r'^translate\(\s*([-+]?[\d.]+)\s*(?:,\s*([-+]?[\d.]+))?\s*\)$')

ROYAL, GREEN, WHITE = '#0B3298', '#21843A', '#FEFEFE'
# (fill, layer) per reference path after the canvas, in paint order.
EXPECTED = (
    (ROYAL, 'ROYAL'),
    (GREEN, 'BLOCK'),
    (WHITE, 'WHITE'),
    (WHITE, 'WHITE'),
    (GREEN, 'EYE'),
    (WHITE, 'WHITE'),
    (GREEN, 'EYE'),
)

# Helmet x-range and vertical centre, in the shell's raw space.
HELMET_X0, HELMET_W, HELMET_CY = 154.0, 310.0, 293.0
# Sleeve logo width and vertical centre in mannequin space, read off the GUD figure's sleeve.
SLEEVE_W = 74.0
SLEEVE_Y = 505.0


def polygons(d, tx, ty):
    """Absolute point lists for a path made only of M/L/H/V/Z commands."""
    tokens = TOKEN.findall(d)
    x = y = 0.0
    shapes, current = [], None
    i, cmd = 0, None
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
        if cmd in 'Zz':
            shapes.append(current)
            current, cmd = None, None
            continue
        if cmd in 'MmLl':
            dx, dy = float(tokens[i]), float(tokens[i + 1])
            i += 2
            x, y = (x + dx, y + dy) if cmd.islower() else (dx, dy)
            if cmd in 'Mm':
                current = []
                cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Hh':
            v = float(tokens[i])
            i += 1
            x = x + v if cmd == 'h' else v
        elif cmd in 'Vv':
            v = float(tokens[i])
            i += 1
            y = y + v if cmd == 'v' else v
        else:
            raise ValueError('unsupported SVG command %r' % cmd)
        current.append((x + tx, y + ty))
    return shapes


def layers():
    paths = ET.parse(REF).getroot().findall(SVG_NS + 'path')[1:]
    if len(paths) != len(EXPECTED):
        raise ValueError('expected %d hawk paths, got %d' % (len(EXPECTED), len(paths)))
    out = {}
    for el, (fill, layer) in zip(paths, EXPECTED):
        if el.get('fill') != fill:
            raise ValueError('expected fill %s, got %s' % (fill, el.get('fill')))
        m = TRANSLATE.fullmatch(el.get('transform'))
        out.setdefault(layer, []).extend(
            polygons(el.get('d'), float(m.group(1)), float(m.group(2) or 0))
        )
    return out


def emit(box, bounds, shapes, mirror=False):
    x0, y0, x1, y1 = bounds
    subpaths = []
    for pts in shapes:
        mapped = []
        for x, y in pts:
            u = (x - x0) * 100.0 / (x1 - x0)
            mapped.append((100.0 - u if mirror else u, (y - y0) * 100.0 / (y1 - y0)))
        mapped = box.map(mapped)
        subpaths.append(
            'M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z'
        )
    return ' '.join(subpaths)


def build():
    shapes = layers()
    xs = [x for pts in shapes['ROYAL'] for x, _ in pts]
    ys = [y for pts in shapes['ROYAL'] for _, y in pts]
    bounds = (min(xs), min(ys), max(xs), max(ys))
    aspect = (bounds[2] - bounds[0]) / (bounds[3] - bounds[1])
    helmet = Box.from_center(HELMET_X0, HELMET_W, HELMET_CY, aspect)
    out = {
        'SEAHAWKS_THROWBACK_HAWK_%s_PATH' % layer: emit(helmet, bounds, shapes[layer])
        for layer in ('ROYAL', 'WHITE', 'BLOCK', 'EYE')
    }
    for side, x0, mirror in (('LEFT', 24.0, True), ('RIGHT', 588.0 - 24.0 - SLEEVE_W, False)):
        box = Box.from_center(x0, SLEEVE_W, SLEEVE_Y, aspect)
        for layer in ('WHITE', 'BLOCK', 'EYE'):
            out['SEAHAWKS_THROWBACK_SLEEVE_%s_%s' % (layer, side)] = emit(
                box, bounds, shapes[layer], mirror=mirror
            )
    return out


if __name__ == '__main__':
    main(build, MODULE)
