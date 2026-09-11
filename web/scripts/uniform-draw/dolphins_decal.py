"""Regenerate the Miami Dolphins helmet decal in ``lib/uniforms/teams/dolphins.ts``.

    python3 scripts/uniform-draw/dolphins_decal.py            # print the paths
    python3 scripts/uniform-draw/dolphins_decal.py --check    # verify dolphins.ts matches

This is a CONTOUR TRACE based on the approved standalone Dolphins mark, not on the internal
uniform composite. The upstream mark is Wikimedia's ``File:Miami Dolphins logo.svg``: a
trademarked, non-free mark used as a fair-use visual reference. No source SVG or raster is
committed. The internal 2025 GUD composite is used only for placement measurements and pants
option enumeration.

TOPOLOGY, measured before tracing. Rendering the SVG at its true 250:198 aspect and cropping to
the painted art gives a 458x333 art box. The usable helmet mark has two orange components (the
sunburst is split by the dolphin), two teal components (main dolphin and rear fin), and five
navy components (body/keyline and four small separated details). The apparent white disc and
white dolphin gaps are shell-coloured negative space, not additional painted layers, so they are
excluded. The colour predicates are applied to the cropped artwork and components below 30
pixels are rejected only as antialias debris; all five navy components exceed that threshold.

SELECTION TRAPS. The SVG's white region is not a helmet decal layer: on the white-shell GUD
reference it is the shell showing through, and on the navy shell the current composite still
shows the shell between the orange rays. The source also contains separated navy details that
must not be collapsed into the teal body. Each colour is therefore traced independently, with
all components sharing one art crop so their relative topology is retained.

PLACEMENT. In the 2025 GUD composite, the current helmet shell is approximately x=59..164,
y=75..162 and the visible coloured mark is approximately x=72..153, y=91..132: about 12.4%
left, 77.1% wide, 18.4% top, and 47.1% tall. Those fractions are transferred to raw helmet
space, then the flat mark's true 458:333 aspect is preserved in the emitted box rather than
stretching the source to the foreshortened composite height. The established raw placement box
is ``Box(220.0, 98.0, 347.0, 252.4)``; clipping handles the wrapped rear edge and keeps the
front extent aligned with the existing helmet landmark.

RENDERER WORKAROUND. qlmanage thumbnails wide SVGs as squares, so this script uses ImageMagick
at the SVG's true aspect before handing pixels to drawkit. It deliberately delegates masks,
connected components, contour simplification, path emission, and ``--check`` to drawkit.py.
The generated paths are mechanically copied into the team module; do not hand-edit them.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box, components, crop_to_art, main, mask, trace  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/dolphins/dolphins-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'dolphins.ts'
BOX = Box(220.0, 98.0, 347.0, 252.4)
MIN_REGION = 30
EPS = 1.2


def render_reference():
    # Preserve the source aspect before drawkit measures its colour topology; qlmanage would
    # otherwise letterbox this wide mark into a square thumbnail.
    with tempfile.TemporaryDirectory() as tmp:
        rendered = Path(tmp) / 'dolphins-mark.png'
        subprocess.run(
            ['magick', '-background', 'white', '-density', '180', str(REF), str(rendered)],
            check=True,
            capture_output=True,
        )
        return crop_to_art(Image.open(rendered).convert('RGB'))


def orange(c):
    return c[0] > 180 and c[1] < 130 and c[2] < 80


def teal(c):
    return c[1] > 100 and c[1] > c[0] * 1.5 and c[1] > c[2] * 0.9


def navy(c):
    return c[2] > 60 and c[2] > c[0] * 1.3 and c[1] < 130


def colour_mask(im, predicate):
    m, w, h = mask(im, predicate)
    # Keep every measured component in this shared crop. The source's white negative spaces are
    # intentionally absent from all three masks.
    selected = [cell for component in components(m, w, h, MIN_REGION) for cell in component]
    cells = set(selected)
    return [[1 if (x, y) in cells else 0 for x in range(w)] for y in range(h)], w, h


def build():
    im = render_reference()
    out = {}
    for name, predicate in (
        ('DOLPHINS_DECAL_SUNBURST_PATH', orange),
        ('DOLPHINS_DECAL_DOLPHIN_PATH', teal),
        ('DOLPHINS_DECAL_NAVY_PATH', navy),
    ):
        m, w, h = colour_mask(im, predicate)
        out[name] = trace(m, w, h, BOX, eps=EPS, minsize=MIN_REGION, space='image')
    return out


if __name__ == '__main__':
    main(build, MODULE)
