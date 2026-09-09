#!/usr/bin/env python3
"""Regenerate Pittsburgh's helmet-only hypocycloid mark from its approved vector.

The external source is ``nfl-uniform-refs/steelers/steelers-mark.svg`` (Wikimedia
Commons public-domain mark). It is never committed. The source is a full lockup;
the helmet uses only the white disc and its gold, red, and blue hypocycloids. Its
grey ring, separator, and small wordmark are selection traps and are intentionally
removed before rendering.

The source clears the linework gate at 1200 px (p5 critical stroke 15 px and 11
components stable under a 0.75x downscale). GUD's current Steelers composite is
the placement authority: the unrotated disc occupies the upper-left of the black
shell. Its measured raw-helmet box is x346.3--516.0, y140.5--310.3. ``qlmanage``
square thumbnails are neutralized by rendering only the mark elements and cropping
to their measured bounds. ``--check`` delegates to drawkit.main.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, crop_to_art, main, mask, near, path, render_flat, trace  # noqa: E402

REFERENCE = Path('/Users/cwharris/Documents/GitHubProjects/nfl-uniform-refs/steelers/steelers-mark.svg')
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'steelers-decal.ts'
BOX = Box(346.3, 140.5, 169.7, 169.8)


def build() -> dict[str, str]:
    paths = re.findall(r'<path[^>]+/>', REFERENCE.read_text())
    # The first five paths are disc, ring, gold, red, blue. The ring is not helmet art.
    source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1152">' + ''.join(
        paths[index] for index in (0, 2, 3, 4)
    ) + '</svg>'
    image = crop_to_art(render_flat(source, size=1600))
    return {
        # The source disc is visually circular at helmet scale; tracing its white fill would also
        # select the canvas between lobes, so retain the approved fitted-circle pattern.
        'STEELERS_DECAL_DISC_PATH': path(
            BOX,
            [
                ('M', (50, 0)),
                ('C', (77.6, 0), (100, 22.4), (100, 50)),
                ('C', (100, 77.6), (77.6, 100), (50, 100)),
                ('C', (22.4, 100), (0, 77.6), (0, 50)),
                ('C', (0, 22.4), (22.4, 0), (50, 0)),
            ],
        ),
        'STEELERS_DECAL_GOLD_PATH': trace(*mask(image, near((255, 201, 0), 24)), BOX, eps=1.5),
        'STEELERS_DECAL_RED_PATH': trace(*mask(image, near((223, 26, 32), 24)), BOX, eps=1.5),
        'STEELERS_DECAL_BLUE_PATH': trace(*mask(image, near((1, 63, 133), 24)), BOX, eps=1.5),
    }


if __name__ == '__main__':
    main(build, MODULE)
