"""Bake the supplied Houston Texans bull logo into lib/uniforms/teams/texans/marks/logo.ts.

Usage: python3 scripts/uniform-draw/texans_sleeve_logo.py /path/to/texans-mark.svg

The supplied file is three filled paths (keyline silhouette, navy head with the star cut out,
red horn) written with relative m/c/l/z commands. They are converted to absolute commands
without simplification (filled paths close implicitly, so each open subpath gets a Z), keeping the source order and curves, and emitted as one mark whose box
is the keyline silhouette's bounds. Placement belongs to the anchor.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SLOTS = ['keyline', 'head', 'horn']


def absolute(d):
    tokens = re.findall(r'[mclz]|-?\d+(?:\.\d+)?', d)
    out, pts = [], []
    x = y = sx = sy = 0.0
    i = 0
    cmd = None
    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd == 'z':
                out.append('Z')
                x, y = sx, sy
                continue
        if cmd == 'm':
            if out and out[-1] != 'Z':
                out.append('Z')
            x += float(tokens[i])
            y += float(tokens[i + 1])
            i += 2
            sx, sy = x, y
            out.append(f'M{x:.2f},{y:.2f}')
            pts.append((x, y))
            cmd = 'l'
        elif cmd == 'l':
            x += float(tokens[i])
            y += float(tokens[i + 1])
            i += 2
            out.append(f'L{x:.2f},{y:.2f}')
            pts.append((x, y))
        elif cmd == 'c':
            v = [float(t) for t in tokens[i : i + 6]]
            i += 6
            c1 = (x + v[0], y + v[1])
            c2 = (x + v[2], y + v[3])
            end = (x + v[4], y + v[5])
            out.append('C%.2f,%.2f %.2f,%.2f %.2f,%.2f' % (*c1, *c2, *end))
            for t in range(1, 21):
                u = t / 20
                a, b, c, e = (1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u**3
                pts.append(
                    (
                        a * x + b * c1[0] + c * c2[0] + e * end[0],
                        a * y + b * c1[1] + c * c2[1] + e * end[1],
                    )
                )
            x, y = end
        else:
            raise ValueError(f'Unsupported command: {cmd}')
    if out and out[-1] != 'Z':
        out.append('Z')
    return ' '.join(out), pts


root = ET.fromstring(Path(sys.argv[1]).read_bytes())
paths = [el for el in root.iter() if el.tag.endswith('path')]
assert len(paths) == len(SLOTS), len(paths)
baked = [absolute(el.attrib['d']) for el in paths]
xs = [p[0] for p in baked[0][1]]
ys = [p[1] for p in baked[0][1]]
box = [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)]
lines = [
    "import type { Mark } from '../../core/marks';",
    '',
    '// The supplied bull logo, converted to absolute commands without simplification: a keyline',
    '// silhouette, the navy head (its star is a cut-out) and the red horn, in source paint order.',
    "export const TEXANS_LOGO: Mark<'keyline' | 'head' | 'horn'> = {",
    f'  box: [{box[0]}, {box[1]}, {box[2]}, {box[3]}],',
    '  paths: [',
]
for slot, (d, _) in zip(SLOTS, baked):
    lines += ['    {', f"      slot: '{slot}',", f"      d: '{d}',", '    },']
lines += ['  ],', '};', '']
target = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/texans/marks/logo.ts'
target.write_text('\n'.join(lines))
print(f'wrote {target} box={box}')
