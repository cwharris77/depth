"""Reusable toolkit for hand-drawing helmet marks.

Companion to `Reference/uniform-hand-drawing.md` in the vault, which is the procedure; this is the
machinery that procedure calls for. Nothing here is team-specific — the per-team
curve lists live beside it (see texans_bull.py for the worked example).

Four groups of things, matching the steps in the doc:

  Steps 2-4  render_flat / art_bbox / runs / extents   — look at a reference and
             turn it into numbers, working around the two rendering traps.
  Step 3     regions                                    — topology: how many
             shapes, and is each enclosed area a hole or a concavity.
  Step 5     mask / fill_holes / trace / check_paths    — the other route: trace
             a vector reference, for marks too fine to hand-draw at helmet
             scale. A team script is then a reference, a set of colour
             predicates and a placement box, and nothing else.
  Steps 6-7  Box / path / star / compare                — draw in a normalised
             box, then verify numerically against the reference.

Requires Pillow, and `qlmanage` for rendering (macOS). Pillow is a local dev
dependency only: this is a manual tool, never imported by the app, never run in
CI, and deliberately not a package.json entry.
"""

from __future__ import annotations

import math
import re
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

from PIL import Image

# --------------------------------------------------------------------------
# Rendering (doc step 2)
# --------------------------------------------------------------------------


def render_flat(svg_text, size=1200, workdir=None):
    """Render SVG source to a PIL image, composited over white.

    Two traps this exists to absorb, both of which cost real time when hit
    directly:

    * qlmanage always produces a SQUARE thumbnail, so a wide mark gets
      letterboxed and any assumed crop offset is wrong. Pass a square viewBox
      (see square_viewbox) and crop by measured bbox instead.
    * PIL's .convert('RGB') turns unpainted pixels BLACK, so a scan for
      "non-white" then returns the entire canvas rather than the art. Hence the
      alpha_composite onto white here.
    """
    tmp = Path(workdir or tempfile.mkdtemp())
    src = tmp / 'render.svg'
    src.write_text(svg_text)
    subprocess.run(
        ['qlmanage', '-t', '-s', str(size), '-o', str(tmp), str(src)],
        capture_output=True,
        check=False,
    )
    out = tmp / 'render.svg.png'
    if not out.exists():
        raise RuntimeError('qlmanage produced no output for %s' % src)
    im = Image.open(out).convert('RGBA')
    white = Image.new('RGBA', im.size, (255, 255, 255, 255))
    return Image.alpha_composite(white, im).convert('RGB')


def square_viewbox(x0, y0, w, h):
    """A viewBox string that pads a w-by-h box out to square, centred.

    Keeps the art in a predictable place inside qlmanage's square output.
    """
    side = max(w, h)
    return '%.3f %.3f %.3f %.3f' % (x0 - (side - w) / 2.0, y0 - (side - h) / 2.0, side, side)


def art_bbox(im, bg=245):
    """Bounding box of everything that is not background-white."""
    p = im.load()
    w, h = im.size
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = p[x, y]
            if not (r > bg and g > bg and b > bg):
                xs.append(x)
                ys.append(y)
    if not xs:
        raise ValueError('image is entirely background')
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def crop_to_art(im, bg=245):
    return im.crop(art_bbox(im, bg))


# --------------------------------------------------------------------------
# Measurement (doc step 4)
# --------------------------------------------------------------------------


def near(rgb, tol=40):
    """Predicate matching colours within `tol` of rgb on every channel."""
    r0, g0, b0 = rgb
    return lambda q: abs(q[0] - r0) < tol and abs(q[1] - g0) < tol and abs(q[2] - b0) < tol


def runs(im, pred, v, min_frac=0.008):
    """Horizontal runs matching pred at `v` percent of height.

    Returns [(start%, end%), ...]. Runs narrower than min_frac of the width are
    dropped as antialiasing. Multiple runs on one row are the signal that a
    concavity or a void splits the shape there — do not collapse them.
    """
    p = im.load()
    w, h = im.size
    y = min(h - 1, int(v * h / 100.0))
    out, start = [], None
    for x in range(w):
        hit = pred(p[x, y])
        if hit and start is None:
            start = x
        elif not hit and start is not None:
            if x - start > w * min_frac:
                out.append((round(start * 100.0 / w), round(x * 100.0 / w)))
            start = None
    if start is not None:
        out.append((round(start * 100.0 / w), 100))
    return out


def extents(im, pred, step=5, min_frac=0.008):
    """{v: [runs]} for v in 0..100. This table is your set of anchors."""
    return {v: runs(im, pred, v, min_frac) for v in range(0, 101, step)}


# --------------------------------------------------------------------------
# Topology (doc step 3) — run this BEFORE drawing anything
# --------------------------------------------------------------------------


def _mask(im, pred):
    p = im.load()
    w, h = im.size
    return [[1 if pred(p[x, y]) else 0 for x in range(w)] for y in range(h)], w, h


_N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
_N8 = _N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def _components(m, w, h, minsize, conn=_N4):
    seen = [[False] * w for _ in range(h)]
    out = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or not m[sy][sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            cells, touches = [], False
            while q:
                x, y = q.popleft()
                cells.append((x, y))
                if x in (0, w - 1) or y in (0, h - 1):
                    touches = True
                for dx, dy in conn:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and m[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(cells) >= minsize:
                out.append((cells, touches))
    return out


def regions(im, pred, minsize=60):
    """Connected regions matching pred, largest first.

    Each entry is {n, bbox (in percent), touches_border}. The border flag is the
    whole point: an enclosed white area is a HOLE and becomes its own path drawn
    on top, while one that reaches the border is a CONCAVITY and must be walked
    into and back out of as part of the outer boundary. Confusing the two is the
    single most common structural bug — it is what merged Seattle's crest and
    head on a first pass.
    """
    m, w, h = _mask(im, pred)
    found = []
    for cells, touches in _components(m, w, h, minsize):
        xs = [c[0] for c in cells]
        ys = [c[1] for c in cells]
        found.append(
            {
                'n': len(cells),
                'bbox': (
                    round(min(xs) * 100.0 / w),
                    round(min(ys) * 100.0 / h),
                    round(max(xs) * 100.0 / w),
                    round(max(ys) * 100.0 / h),
                ),
                'touches_border': touches,
            }
        )
    return sorted(found, key=lambda r: -r['n'])


def region_rows(im, pred, index=0, step=5, minsize=60):
    """Per-row extents of ONE region (by size rank), for drawing a single void.

    Whole-image `runs` cannot separate two voids that share rows; this can.
    """
    m, w, h = _mask(im, pred)
    comps = sorted(
        (c for c in _components(m, w, h, minsize) if not c[1]),
        key=lambda c: -len(c[0]),
    )
    cells = set(comps[index][0])
    out = {}
    for v in range(0, 101, step):
        y = min(h - 1, int(v * h / 100.0))
        row = [x for (x, yy) in cells if yy == y]
        if row:
            out[v] = (round(min(row) * 100.0 / w), round(max(row) * 100.0 / w))
    return out


# --------------------------------------------------------------------------
# Tracing (doc step 5, the alternative to drawing by hand)
# --------------------------------------------------------------------------
#
# Some marks are not hand-drawable at helmet scale — Carolina's fangs and
# whiskers, the Rams' horn — and for those the honest move is to trace a
# vector reference instead of guessing anchors. That is a different procedure
# from the rest of this file, not a shortcut past it: the topology still has to
# be MEASURED first (regions, above), because what the trace produces is a
# per-element mask and you have to know whether an enclosed area is a hole or a
# concavity before you decide how many elements there are.
#
# Everything below is deliberately generic. A team script supplies the
# reference, the colour predicates that separate its inks, and the placement
# boxes; it should not carry its own copy of a flood fill or a curve simplifier
# (three of them did, identically, before this section existed).


def mask(im, pred):
    """(grid, w, h) of 1/0 for every pixel matching pred."""
    return _mask(im, pred)


def fill_holes(m, w, h):
    """The mask with every enclosed background area filled in.

    This is what an outline element is traced from. Tracing the keyline ink
    ALONE breaks it into slivers wherever the body ink touches it, and the
    antialiased seam between two inks reads as neither, so the union-then-fill
    is what keeps a keyline continuous.
    """
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
        for dx, dy in _N4:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and not m[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))
    return [[1 if m[y][x] or not seen[y][x] else 0 for x in range(w)] for y in range(h)]


def holes_of(m, w, h):
    """Only the enclosed background areas — the detail element painted back on top."""
    filled = fill_holes(m, w, h)
    return [[1 if filled[y][x] and not m[y][x] else 0 for x in range(w)] for y in range(h)]


def components(m, w, h, minsize=40):
    """8-connected components of a mask, largest first.

    8-connected on purpose: a diagonal one-pixel bridge is a real connection in
    a drawn mark, and treating it as a break scatters a mark into specks.
    `minsize` drops antialias debris that would otherwise survive into the path
    as visible dots.
    """
    return sorted((c for c, _ in _components(m, w, h, minsize, _N8)), key=len, reverse=True)


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


def simplify(pts, eps):
    """Douglas-Peucker, iterative so a 20k-point contour cannot blow the stack.

    `eps` is in source pixels. Too tight and every antialias stair-step survives
    into the path; too loose and the mark's own notches round off. Tune it
    against the reference, not against the path's length.
    """
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
            dist = (
                abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
                if norm
                else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            )
            if dist > best:
                best, bi = dist, i
        if best > eps:
            keep[bi] = True
            stack.append((a, bi))
            stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def trace(m, w, h, box, eps=0.9, minsize=40, space='image', mirror=False):
    """One mask -> one multi-subpath `d`, placed in `box`.

    `space` chooses what 0..100 means. 'image' spreads the whole rendered
    reference across the box, which is right when the reference was cropped to
    this element already. 'art' uses the bounding box of everything traced, so
    several components keep their relative positions instead of each being
    stretched to its own extents — the difference between a two-part mark
    landing as one drawing and as two.

    `mirror` reflects design u (u -> 100 - u), for a reference that faces the
    other way from the mannequin, or for the opposite limb.
    """
    regions_ = components(m, w, h, minsize)
    if space == 'art':
        cells = [c for r in regions_ for c in r]
        if not cells:
            return ''
        x0 = min(x for x, _ in cells)
        x1 = max(x for x, _ in cells)
        y0 = min(y for _, y in cells)
        y1 = max(y for _, y in cells)
        span_x, span_y = float(x1 - x0) or 1.0, float(y1 - y0) or 1.0
    elif space == 'image':
        x0, y0, span_x, span_y = 0.0, 0.0, float(w), float(h)
    else:
        raise ValueError('unknown space %r' % (space,))

    subpaths = []
    for cells in regions_:
        pts = simplify(outline(cells), eps)
        if len(pts) < 3:
            continue
        design = [((x - x0) * 100.0 / span_x, (y - y0) * 100.0 / span_y) for x, y in pts]
        if mirror:
            design = [(100.0 - u, v) for u, v in design]
        mapped = box.map(design)
        subpaths.append(
            'M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z'
        )
    return ' '.join(subpaths)


def check_paths(module, paths):
    """True when every generated path is byte-identical to the one in `module`.

    The point of a generator is that the committed path can be re-derived, so
    every team script exposes this as `--check`: it is the thing that fails if
    someone hand-edits a path, or if the mannequin's geometry moves under a
    placement box that was measured against the old one.
    """
    src = Path(module).read_text()
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


def main(build, module, argv=None):
    """The whole of a team script's `if __name__ == '__main__'` block."""
    argv = sys.argv if argv is None else argv
    built = build()
    if '--check' in argv:
        raise SystemExit(0 if check_paths(module, built) else 1)
    for name, d in built.items():
        print('export const %s =\n  %r;' % (name, d))


# --------------------------------------------------------------------------
# Drawing (doc step 6)
# --------------------------------------------------------------------------


class Box:
    """A placement box in raw helmet space, addressed in 0..100 design units.

    Design coordinates are percentages of the box in EACH direction, so they are
    the same numbers the measurement tables produce. The box is usually not
    square; that is intentional.

    Take width and vertical centre from wherever the mark already sits (an
    existing trace's bbox is the best evidence), but compute height from the
    mark's TRUE aspect ratio — GUD draws a 3/4 shell, so its rendering is
    foreshortened, while the mannequin draws a flat side profile.
    """

    def __init__(self, x0, y0, w, h):
        self.x0, self.y0, self.w, self.h = float(x0), float(y0), float(w), float(h)

    @classmethod
    def from_center(cls, x0, w, center_v, aspect):
        """Keep an existing x-range and vertical centre; derive height from aspect."""
        h = w / float(aspect)
        return cls(x0, center_v - h / 2.0, w, h)

    def map(self, pts):
        return [(self.x0 + u * self.w / 100.0, self.y0 + v * self.h / 100.0) for u, v in pts]

    def viewbox(self):
        return '%.1f %.1f %.1f %.1f' % (self.x0, self.y0, self.w, self.h)

    def square_viewbox(self):
        return square_viewbox(self.x0, self.y0, self.w, self.h)


def path(box, cmds):
    """Emit an SVG path from ('M'|'L', pt) and ('C', c1, c2, pt) in design space.

    Walk the outline in one consistent direction and comment each segment in the
    caller — ordering errors around concavities are obvious in a commented list
    and invisible in a path string.
    """
    out = []
    for c in cmds:
        kind = c[0]
        pts = box.map(c[1:])
        if kind == 'M':
            out.append('M%.1f,%.1f' % pts[0])
        elif kind == 'L':
            out.append('L%.1f,%.1f' % pts[0])
        elif kind == 'C':
            out.append('C%.1f,%.1f %.1f,%.1f %.1f,%.1f' % (pts[0] + pts[1] + pts[2]))
        else:
            raise ValueError('unknown command %r' % (kind,))
    return ' '.join(out) + ' Z'


def star(box, cx, cv, r_out, r_in, points=5, turn=0.0):
    """A regular star in design space. Dallas, Tennessee and Houston all need one.

    `turn` rotates in degrees; 0 puts a point straight up. Radii are in design
    units, so on a non-square box the star is stretched by the box's aspect —
    which is usually what you want, since the mark is stretched the same way.
    """
    pts = []
    for i in range(points * 2):
        a = math.radians(turn - 90 + i * (180.0 / points))
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cv + r * math.sin(a)))
    mapped = box.map(pts)
    return 'M%.1f,%.1f ' % mapped[0] + ' '.join('L%.1f,%.1f' % p for p in mapped[1:]) + ' Z'


# --------------------------------------------------------------------------
# Verification (doc step 7)
# --------------------------------------------------------------------------


def compare(ref_im, mine_im, pred, step=5, label='shape'):
    """Print reference vs drawn extents side by side, and return the rows that differ.

    Iterate on the biggest numeric divergence, NOT on visual impression. A first
    Houston draft looked plausible on screen with a collapsed horn; this table
    showed the row at v=4 empty where the reference spanned 15-40, in seconds.
    """
    a, b = extents(ref_im, pred, step), extents(mine_im, pred, step)
    print('v     REF-%-18s MINE-%s' % (label, label))
    bad = []
    for v in sorted(a):
        ra, rb = a[v], b.get(v, [])
        flag = ''
        if len(ra) != len(rb) or any(
            abs(x1 - x2) > 3 or abs(y1 - y2) > 3 for (x1, y1), (x2, y2) in zip(ra, rb)
        ):
            flag = '  <-'
            bad.append(v)
        print('%-5d %-22s %s%s' % (v, ra, rb, flag))
    return bad


def svg(box, body, bg='#ffffff', size=1200, square=True):
    """Wrap drawn paths in an SVG string ready for render_flat."""
    vb = box.square_viewbox() if square else box.viewbox()
    x0, y0, w, h = [float(t) for t in vb.split()]
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%s">'
        '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>%s</svg>'
    ) % (size, size, vb, x0, y0, w, h, bg, body)
