"""Bake the supplied Saints fleur-de-lis logo into lib/uniforms/teams/saints/marks/fleur.ts.

Usage: python3 scripts/uniform-draw/saints_sleeve_fleur.py /path/to/saints-mark.svg

The supplied file is four filled paths (black outer silhouette, white keyline, black inner fleur,
gold face) under two nested matrix transforms, written with relative commands; the gold face also
carries its own matrix. Each path is run through its transforms with fontTools and re-emitted
with absolute M/L/C/Z commands, without simplification, in source paint order. The box spans
every path's points, control points included. Placement belongs to the anchor.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

SLOTS = ['outer', 'keyline', 'inner', 'face']
NUMBER = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')


def matrix(value):
    nums = [float(n) for n in NUMBER.findall(value)]
    assert value.strip().startswith('matrix(') and len(nums) == 6, value
    return nums


def bake(d, transforms):
    rec = RecordingPen()
    pen = rec
    for m in transforms:
        pen = TransformPen(pen, m)
    parse_path(d, pen)
    out, pts = [], []

    def p(x, y):
        pts.append((x, y))
        return f'{x:.2f},{y:.2f}'

    for op, args in rec.value:
        if op == 'moveTo':
            out.append('M' + p(*args[0]))
        elif op == 'lineTo':
            out.append('L' + p(*args[0]))
        elif op == 'curveTo':
            out.append('C' + ' '.join(p(*a) for a in args))
        elif op in ('closePath', 'endPath'):
            out.append('Z')
        else:
            raise ValueError(f'unsupported pen operation {op}')
    return ' '.join(out).replace('-0.00', '0.00'), pts


root = ET.fromstring(Path(sys.argv[1]).read_bytes())
transforms = []
node = root
while True:
    groups = [el for el in node if el.tag.endswith('g')]
    if not groups:
        break
    node = groups[0]
    transforms.append(matrix(node.attrib['transform']))
paths = [el for el in node if el.tag.endswith('path')]
assert len(paths) == len(SLOTS), len(paths)
# TransformPen applies its own matrix before passing points on, so the innermost transform (a
# path's own) goes last.
baked = []
for el in paths:
    own = [matrix(el.attrib['transform'])] if 'transform' in el.attrib else []
    baked.append(bake(el.attrib['d'], transforms + own))
xs = [x for _, pts in baked for x, _ in pts]
ys = [y for _, pts in baked for _, y in pts]
box = [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)]
lines = [
    "import type { Mark } from '../../core/marks';",
    '',
    '// The supplied fleur-de-lis logo, converted to absolute commands without simplification: a black',
    '// silhouette, a white keyline, the black fleur and its gold face, in source paint order.',
    "export const SAINTS_FLEUR: Mark<'outer' | 'keyline' | 'inner' | 'face'> = {",
    f'  box: [{box[0]}, {box[1]}, {box[2]}, {box[3]}],',
    '  paths: [',
]
for slot, (d, _) in zip(SLOTS, baked):
    lines += ['    {', f"      slot: '{slot}',", f"      d: '{d}',", '    },']
lines += ['  ],', '};', '']
target = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/saints/marks/fleur.ts'
target.write_text('\n'.join(lines))
print(f'wrote {target} box={box}')
