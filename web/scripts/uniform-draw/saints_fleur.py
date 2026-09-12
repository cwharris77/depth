"""Regenerate the Saints helmet fleur from the supplied SVG reference.

The SVG is kept outside the repository. Its three ink colours are raster-classified and traced
into the existing Saints helmet placement envelope (raw helmet x321..500, y196..372).
"""
from pathlib import Path
import subprocess
import tempfile
from PIL import Image
from collections import deque

from drawkit import Box, trace, fill_holes

REF = Path('/Users/cwharris/Downloads/decal_svgs/saints_fluer.svg')
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'saints.ts'
BOX = Box(321, 196, 179, 176)

def render():
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / 'saints.png'
        subprocess.run(['magick', str(REF), '-background', 'white', '-flatten', str(out)], check=True)
        return Image.open(out).convert('RGB')

def build():
    im = render()
    w, h = im.size
    px = im.load()
    def mask(pred):
        return [[1 if pred(px[x, y]) else 0 for x in range(w)] for y in range(h)]
    black = mask(lambda c: max(c) < 40)
    gold = mask(lambda c: c[0] > 120 and c[0] > c[1] * 1.05 and c[1] > c[2] * 1.1)
    white = mask(lambda c: min(c) > 240)
    # Discard the white canvas, retaining only enclosed white channels in the mark.
    seen = set()
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not white[y][x]:
            continue
        seen.add((x, y))
        q.extend((nx, ny) for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                 if 0 <= nx < w and 0 <= ny < h)
    white = [[v and (x, y) not in seen for x, v in enumerate(row)] for y, row in enumerate(white)]
    return {
        'SAINTS_DECAL_BLACK_PATH': trace(fill_holes(black, w, h), w, h, BOX, eps=1.0, minsize=40),
        'SAINTS_DECAL_GOLD_PATH': trace(fill_holes(gold, w, h), w, h, BOX, eps=1.0, minsize=40),
        'SAINTS_DECAL_WHITE_PATH': trace(white, w, h, BOX, eps=1.0, minsize=40),
    }

if __name__ == '__main__':
    values = build()
    for name, value in values.items():
        print(f"{name} = {value!r}")
