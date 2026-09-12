"""Emit the Falcons helmet decal from the standalone club-mark reference (DEP-478).

The non-free trademarked Wikipedia ``File:Atlanta Falcons logo.svg`` supplies
linework. The reference remains outside the repository. The 2025 helmet sheet
supplies placement: the mark spans approximately x77..129, y27..77 against a
shell at x56..146, y21..111. Those shell-relative bounds map to the raw mannequin
shell x139..701.5, y65..637.4. Silver, white, black and red are retained separately;
the previous small composite trace lost the silver border and several feathers.

Run this script to print paths, or pass --check to verify the committed module.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drawkit import Box, fill_holes, main, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/falcons/falcons-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/falcons.ts'
BOX = Box(270.25, 103.16, 325.0, 318.0)
COLORS = {'silver': (165, 172, 175), 'white': (255, 255, 255),
          'black': (0, 0, 0), 'red': (167, 25, 48)}


def build():
    with tempfile.TemporaryDirectory() as tmp:
        raster = Path(tmp) / 'mark.png'
        subprocess.run(['magick', '-background', 'none', '-density', '600', str(REF),
                        '-resize', '1200x1200', str(raster)], check=True)
        im = Image.open(raster).convert('RGBA')
        im = im.crop(im.getbbox())
        w, h = im.size
        labels = [[None] * w for _ in range(h)]
        for y in range(h):
            for x in range(w):
                r, g, b, a = im.getpixel((x, y))
                if a >= 128:
                    labels[y][x] = min(COLORS, key=lambda k:
                        sum((v - c) ** 2 for v, c in zip((r, g, b), COLORS[k])))

    def emit(keys, solid=False):
        mask = [[int(labels[y][x] in keys) for x in range(w)] for y in range(h)]
        if solid:
            mask = fill_holes(mask, w, h)
        return trace(mask, w, h, BOX, eps=0.9, minsize=40)

    return {
        'FALCONS_DECAL_SILVER_PATH': emit(set(COLORS), True),
        'FALCONS_DECAL_SILHOUETTE_PATH': emit({'white', 'black', 'red'}, True),
        'FALCONS_DECAL_BODY_PATH': emit({'black', 'red'}),
        'FALCONS_DECAL_STREAKS_PATH': emit({'red'}),
    }


if __name__ == '__main__':
    main(build, MODULE)
