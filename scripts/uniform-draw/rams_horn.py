"""Regenerates the Los Angeles helmet horn in lib/uniforms/teams/rams.ts.

    python3 scripts/uniform-draw/rams_horn.py            # print the path
    python3 scripts/uniform-draw/rams_horn.py --check    # verify rams.ts matches

Like panthers_decal.py this is a CONTOUR TRACE rather than the hand-drawn geometry
docs/uniform-hand-drawing.md produces. The horn is a single smooth spiral with no
fine interior detail, so the doc's negative-space warning does not apply and a
trace is both stable and closer to the reference than an anchor list would be.

WHY NOT THE FETCHED MARK. gate-check.py's NOTES row for `rams` is the whole story:
the reference fetch resolves `File:Los Angeles Rams Logo.png`, which is the LA
lockup, and the helmet decal is the horn ALONE — the horn is not in that file at
all. The linework here comes instead from Commons `File:Los Angeles Rams Uniforms
2025.png` (CC BY-SA 4.0 as an illustration; the horn itself is the club's
trademark, licence audit in the vault's Decisions.md, 2026-09-03), whose helmet is
about 400px across against the GUD composite's 90. Neither reference is committed
here — both live in the sibling nfl-uniform-refs/ checkout.

That illustration draws the helmet facing LEFT and the mannequin faces RIGHT, so
the trace is mirrored in design space (u -> 100 - u) before it is mapped.

Topology, measured rather than assumed (docs step 4). The horn is TWO 8-connected
yellow components with NO enclosed holes: the spiral's tip laps back over its own
body and the shell shows blue through the gap, which splits the ring into a lower
crescent and an upper tail. Two subpaths, one fill, no fill rule anywhere. The
shipped path before this had the same two-component count but was traced off the
46px GUD helmet, so its outline stair-stepped and it read as a torn blob.

Placement (docs step 7) is measured from the GUD 2025 helmet composite, not from
this illustration, because the illustration draws a wider, flatter shell than the
mannequin does. Both boxes below are morphological measurements, not eyeballed: an
opening with a 7px element drops the facemask's thin strokes so the sheet's SHELL
alone measures x466-556, y80-171, and the horn is the two yellow components at
x477-554, y86-161. That is left 12.2%, width 85.6%, top 6.6%, height 82.4% of the
shell box.

The mannequin's own shell silhouette is x139-701.5, y65-637.4 in raw helmet space
(HELMET_ART_CLIP through HELMET_ART_TRANSFORM), so those four fractions transfer
to the box below. It squashes the traced horn about 9% horizontally: the
illustration's horn bbox is 1.11 aspect and the box is 1.02, which is the
difference between the two drawings' shells and not a measurement error.
"""

import re
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import Box  # noqa: E402

REF = (
    Path.home()
    / 'Documents/GitHubProjects/nfl-uniform-refs/rams/rams-uniforms-illustration-2025.png'
)
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'rams.ts'

# The illustration's home helmet, in the source file's own pixels. Cropped by hand
# because the sheet holds four helmets and only this one is needed.
HELMET = (150, 10, 620, 400)
# Upsample before tracing. The horn is ~295 source px wide against 481 units in the
# placement box, so one source pixel is over a unit and a half; 2x puts the contour
# comfortably under the renderer's resolution and lets EPS stay tight.
UPSCALE = 2
# Douglas-Peucker tolerance in upsampled pixels. 2.4 (= 1.2 source px) holds the
# spiral's taper while dropping the antialias stair-steps.
EPS = 2.4
# Drop specks below this many upsampled pixels — antialias debris that would
# otherwise survive as visible dots on the shell.
MIN_REGION = 200

BOX = Box(207.7, 102.7, 481.3, 471.8)


def yellow(c):
    """The illustration's horn gold, wide enough to take its antialiased edge."""
    r, g, b = c[0], c[1], c[2]
    return r > 200 and 150 < g < 240 and b < 110


def mask():
    im = Image.open(REF).convert('RGBA')
    flat = Image.alpha_composite(Image.new('RGBA', im.size, (255, 255, 255, 255)), im)
    crop = flat.convert('RGB').crop(HELMET)
    crop = crop.resize((crop.width * UPSCALE, crop.height * UPSCALE), Image.LANCZOS)
    w, h = crop.size
    px = crop.load()
    return [[1 if yellow(px[x, y]) else 0 for x in range(w)] for y in range(h)], w, h


def components(m, w, h, minsize=MIN_REGION):
    """8-connected components, largest first."""
    seen = [[False] * w for _ in range(h)]
    out = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or not m[sy][sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            cells = []
            while q:
                x, y = q.popleft()
                cells.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and m[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(cells) >= minsize:
                out.append(cells)
    return sorted(out, key=len, reverse=True)


_DIRS = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]


def outline(cells):
    """Moore-neighbour boundary walk of one 8-connected component."""
    filled = set(cells)
    start = min(cells, key=lambda c: (c[1], c[0]))
    contour = [start]
    cur, back = start, 4
    limit = 8 * len(cells) + 16
    while len(contour) < limit:
        for i in range(1, 9):
            d = _DIRS[(back + i) % 8]
            nb = (cur[0] + d[0], cur[1] + d[1])
            if nb in filled:
                back = _DIRS.index((-d[0], -d[1]))
                cur = nb
                break
        else:
            break
        if cur == start:
            break
        contour.append(cur)
    return contour


def simplify(pts, eps=EPS):
    """Douglas-Peucker, iterative so a long contour cannot blow the stack."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5
        best, bi = -1.0, None
        for i in range(a + 1, b):
            x, y = pts[i]
            dist = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm if norm else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            if dist > best:
                best, bi = dist, i
        if best > eps:
            keep[bi] = True
            stack.append((a, bi))
            stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def build():
    m, w, h = mask()
    regions = components(m, w, h)
    # Design space is the horn's own bbox in 0..100, so the placement box lands the
    # two components together rather than each on its own extents.
    cells = [c for r in regions for c in r]
    x0 = min(x for x, _ in cells)
    x1 = max(x for x, _ in cells)
    y0 = min(y for _, y in cells)
    y1 = max(y for _, y in cells)
    span_x = float(x1 - x0)
    span_y = float(y1 - y0)
    subpaths = []
    for r in regions:
        pts = simplify(outline(r))
        if len(pts) < 3:
            continue
        # Mirror in u: the illustration faces left, the mannequin faces right.
        design = [(100.0 - (x - x0) * 100.0 / span_x, (y - y0) * 100.0 / span_y) for x, y in pts]
        mapped = BOX.map(design)
        subpaths.append('M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z')
    return {'RAMS_DECAL_HORN_PATH': ' '.join(subpaths)}


def check(paths):
    src = MODULE.read_text()
    ok = True
    for name, want in paths.items():
        m = re.search(r"%s =\s*\n?\s*'([^']*)'" % name, src)
        if not m:
            print('MISSING  %s' % name)
            ok = False
        elif m.group(1) != want:
            print('DIFFERS  %s' % name)
            ok = False
        else:
            print('ok       %s' % name)
    return ok


if __name__ == '__main__':
    built = build()
    if '--check' in sys.argv:
        sys.exit(0 if check(built) else 1)
    for name, d in built.items():
        print('export const %s =\n  %r;' % (name, d))
