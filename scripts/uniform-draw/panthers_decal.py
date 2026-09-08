"""Regenerates the Carolina helmet mark in lib/uniforms/teams/panthers.ts.

    python3 scripts/uniform-draw/panthers_decal.py            # print the four paths
    python3 scripts/uniform-draw/panthers_decal.py --check    # verify panthers.ts matches

This is a CONTOUR TRACE, not the hand-drawn geometry docs/uniform-hand-drawing.md
produces. The panther head is carried by fine positive detail — jaw, fangs,
whisker slashes — that a hand-drawn anchor list cannot hold at helmet scale, and
the mark's body contrasts with both shells, so the trace is stable where the doc's
negative-space warning would not apply. The mark is the club's non-free
trademarked artwork (en.wikipedia `File:Carolina Panthers logo.svg`, fair use;
licence audit: the vault's Decisions.md, 2026-09-03) and the reference file is
never committed here — it lives in the sibling nfl-uniform-refs/ checkout.

Topology, measured rather than assumed (docs step 4). The mark is ONE connected
component and has NO enclosed white area: every gap that reads as a whisker or a
muzzle slash is BLUE showing through the black, not the shell. That is what makes
the stack four plain unions in paint order with no fill rule anywhere — the
evenodd hole that punched through the 49ers "F" has nothing to do here.

  1. keyline    blue   the whole silhouette, holes filled
  2. body       black  the black+grey region, holes filled, painted over it
  3. detail     blue   exactly those holes, painted back on top
  4. highlight  grey   the fangs and brow

Placement (docs step 7) is measured from the GUD 2025 helmet composite, not from
the flat logo. Both boxes are connected-component measurements, not eyeballed:
the sheet's helmet silhouette is x254-360, y83-180, of which x254-347 is the
shell and the rest is the facemask, and the mark is the 974px component at
x262-316, y94-127. That is left 8.6%, width 58.1%, top 11.3%, height 34.0% of
the shell box. Measure the mark's top with a colour predicate that excludes the
shell's own dark OUTLINE or it reads ~10px high and the mark ends up hugging the
crown, which is the one thing the reference does not do — there is clear silver
between the crown edge and the blue arc.

The mannequin's own shell silhouette is x139-701.5, y65-637.4 in raw helmet space
(HELMET_ART_CLIP through HELMET_ART_TRANSFORM). It is a 0.98 aspect box against
GUD's 0.96, so those four fractions transfer directly and land the box below.
Height therefore comes from the composite and NOT from the flat logo's true 1.84
aspect: this mannequin draws the same three-quarter shell GUD does, so the mark
wraps and reads nearer 1.65 on both.
"""

import re
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, crop_to_art, render_flat  # noqa: E402

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/panthers/panthers-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'panthers.ts'

# Render width for the trace. 1200 crops to 764px of art, so one source pixel is
# under half a unit in the placement box below — finer than the renderer resolves.
RENDER = 1200
# Douglas-Peucker tolerance in source pixels. 0.9 holds every whisker while
# dropping the antialias stair-steps that would otherwise triple the path length.
EPS = 0.9
# Drop specks below this many pixels: at 764px of art they are antialias debris,
# and each one would survive into the path as a visible dot on the shell.
MIN_REGION = 40

BOX = Box(187.4, 129.7, 326.8, 194.6)

# The reference's own three ink colours, plus the white it is composited onto.
PALETTE = {
    'bg': (255, 255, 255),
    'blue': (0, 133, 202),
    'grey': (191, 192, 191),
    'black': (0, 0, 0),
}


def classify():
    """Label every pixel with the nearest reference colour.

    Nearest-colour rather than a tolerance band on purpose: an antialiased edge
    pixel belongs to whichever side it is closer to, and a band would leave it
    unlabelled and punch a one-pixel hole along every boundary.
    """
    im = crop_to_art(render_flat(REF.read_text(), size=RENDER))
    w, h = im.size
    px = im.load()
    lab = [[None] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lab[y][x] = min(
                PALETTE, key=lambda k: (r - PALETTE[k][0]) ** 2 + (g - PALETTE[k][1]) ** 2 + (b - PALETTE[k][2]) ** 2
            )
    return lab, w, h


def mask_of(lab, w, h, keys):
    return [[1 if lab[y][x] in keys else 0 for x in range(w)] for y in range(h)]


def fill_holes(m, w, h):
    """The mask with every enclosed background area filled in."""
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not m[y][x] and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not m[y][x] and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and not m[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))
    return [[1 if m[y][x] or not seen[y][x] else 0 for x in range(w)] for y in range(h)]


def holes_of(m, w, h):
    filled = fill_holes(m, w, h)
    return [[1 if filled[y][x] and not m[y][x] else 0 for x in range(w)] for y in range(h)]


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
    """Douglas-Peucker, iterative so a 20k-point contour cannot blow the stack."""
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


def emit(regions, w, h):
    """Map traced contours into the placement box as one multi-subpath `d`."""
    subpaths = []
    for cells in regions:
        pts = simplify(outline(cells))
        if len(pts) < 3:
            continue
        mapped = BOX.map([(x * 100.0 / w, y * 100.0 / h) for x, y in pts])
        subpaths.append(
            'M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z'
        )
    return ' '.join(subpaths)


def build():
    lab, w, h = classify()
    ink = mask_of(lab, w, h, {'blue', 'black', 'grey'})
    body = mask_of(lab, w, h, {'black', 'grey'})
    return {
        'PANTHERS_DECAL_KEYLINE_PATH': emit(components(fill_holes(ink, w, h), w, h), w, h),
        'PANTHERS_DECAL_BODY_PATH': emit(components(fill_holes(body, w, h), w, h), w, h),
        'PANTHERS_DECAL_DETAIL_PATH': emit(components(holes_of(body, w, h), w, h), w, h),
        'PANTHERS_DECAL_HIGHLIGHT_PATH': emit(components(mask_of(lab, w, h, {'grey'}), w, h), w, h),
    }


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
