import argparse
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--python', required=True)
args = parser.parse_args()
root = ET.parse(args.source).getroot()
source = RecordingPen()
parse_path(root.find('.//{*}path').attrib['d'], source)
groups = []
for op, points in source.value:
    if op == 'moveTo':
        groups.append(RecordingPen())
    getattr(groups[-1], op)(*points)


def outline(scale, x, y, bottom=False):
    pen = SVGPathPen(None)
    transformed = TransformPen(pen, Transform(scale, 0, 0, -scale, x - 251.5 * scale, y + 356.8 * scale))
    for group in groups:
        bounds = BoundsPen(None)
        group.replay(bounds)
        if not bottom or bounds.bounds[3] < 289:
            group.replay(transformed)
    return pen.getCommands()


stack = outline(.15, 380, 452)
short = outline(.25, 380, 427, True)
neck = subprocess.check_output([
    args.python, str(Path(__file__).with_name('outline-wordmark.py')),
    '--text', 'RAMS HOUSE', '--font', '/System/Library/Fonts/Supplemental/Arial Narrow Bold.ttf',
    '--size', '10', '--center-x', '294', '--baseline-y', '400', '--pairs',
], text=True).strip()
print("import { placed } from '../../core/marks';\n\n"+f"const STACKED_WORDMARK = '{stack}';\nconst RAMS_WORDMARK = '{short}';\nconst NECK_WORDMARK = '{neck}';\n\n"+'''export const RAMS_CHEST_ROYAL = placed([
  { id: 'rams-royal-chest-label', surface: 'jersey', clip: true, kind: 'fill', fill: 'white', d: RAMS_WORDMARK },
]);

export const RAMS_CHEST_WHITE = placed([
  { id: 'rams-white-chest-label', surface: 'jersey', clip: true, kind: 'fill', fill: 'royal', d: RAMS_WORDMARK },
]);

export const RAMS_CHEST_BONE = placed([
  { id: 'rams-bone-chest-label-background', surface: 'jersey', clip: true, kind: 'fill', fill: 'white', d: 'M377,449 H428 V471 H377 Z' },
  { id: 'rams-bone-chest-label', surface: 'jersey', clip: true, kind: 'fill', fill: 'royal', d: STACKED_WORDMARK },
]);

export const RAMS_HOUSE_NECK = placed([
  { id: 'rams-house-neck-inscription', surface: 'collar', clip: true, kind: 'fill', fill: 'white', d: NECK_WORDMARK },
]);
''')
