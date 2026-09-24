"""Regenerates the throwback hawk mark in lib/uniforms/teams/seahawks/marks/throwback-hawk.ts.

    DECAL_SVGS=<dir> python3 scripts/uniform-draw/seahawks_throwback_hawk.py          # print
    DECAL_SVGS=<dir> python3 scripts/uniform-draw/seahawks_throwback_hawk.py --check  # verify

The reference is a 1200px vector of the original hawk, saved as seahawks_throwback_hawk.svg in
$DECAL_SVGS. Its first path is the white canvas; the rest are, in paint order, the royal body, the
green rear block, the white head, the white eye ring, the green eye, the white cheek line and the
green brow line. Each path's translation is applied and its points written in the reference's own
space, regrouped by colour. That keeps paint order intact because the green block touches only the
royal body, and the green eye and brow sit on the white head and eye ring.

Placement is not decided here: lib/uniforms/teams/core/marks.ts fits the mark to a named anchor.
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import main  # noqa: E402

REF = Path(os.environ.get('DECAL_SVGS', '.')) / 'seahawks_throwback_hawk.svg'
MODULE = (
    Path(__file__).resolve().parents[2]
    / 'lib' / 'uniforms' / 'teams' / 'seahawks' / 'marks' / 'throwback-hawk.ts'
)
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


def num(v):
    """Shortest exact text for a coordinate: 631.0 -> '631', 50.5 -> '50.5'."""
    s = repr(float(v))
    return s[:-2] if s.endswith('.0') else s


def raw(shapes):
    return ' '.join(
        'M%s,%s ' % (num(pts[0][0]), num(pts[0][1]))
        + ' '.join('L%s,%s' % (num(x), num(y)) for x, y in pts[1:])
        + ' Z'
        for pts in shapes
    )


def build():
    shapes = layers()
    return {
        'SEAHAWKS_THROWBACK_HAWK_MARK_%s' % layer: raw(shapes[layer])
        for layer in ('ROYAL', 'WHITE', 'BLOCK', 'EYE')
    }


if __name__ == '__main__':
    main(build, MODULE)
