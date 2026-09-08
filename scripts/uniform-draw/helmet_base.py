"""Derive the generated helmet art files every kit paints from.

Input is Cooper's own hand-made helmet illustration, which was authored in Seahawks
livery (College Navy shell + facemask, wolf-grey mark). This script strips what is
club-specific and leaves what is not: the shell shading, the facemask hardware, the
vents, the rivets, the chin strap and the ear-hole padding all survive verbatim.

Four transforms, in order:

  1. The club mark is repainted flat shell, NOT deleted. It sits on top of a wolf-grey
     underlay (source path 2, a single compound path that also carries the outer rim
     and the facemask ground), so deleting the mark exposes a grey hawk silhouette.
  2. PATCH_D covers the one strip of that underlay the mark never covered — the grey
     wedge along the front-left edge, which is club livery rather than construction. The
     crown flecks go too (is_speck): a livery motif, not construction.
  3. Everything that is only there because the reference sat on a white page is removed:
     the rim drawn outside the silhouette (DROPPED) and every near-white fill (WHITE_L) —
     the ear-hole edge, the shell/facemask junction, and the gaps between the facemask
     bars. A base composites over anything, so those have to be nothing, not white.
  4. Every blue-family fill is re-hued onto a neutral placeholder, keeping its
     lightness offset from the base navy. The shading deltas are what make the shell
     read as a curved surface, so they are preserved rather than flattened; a team
     recolour is then a hue swap over the same offsets.

The reference file is not committed (it carries the club mark). It lives beside the other
uncommitted references, at ../nfl-uniform-refs/helmet/helmet-base-reference.svg — see that
folder's README, whose provenance differs from the rest of nfl-uniform-refs. Re-run as:

    python3 scripts/uniform-draw/helmet_base.py \
      ../nfl-uniform-refs/helmet/helmet-base-reference.svg lib/uniforms/helmet-base.svg
    npm run format          # the generator writes helmet-art.ts unformatted

Then `npm run gen:uniform-thumbs`, since every kit's raster bakes this art in.

The TypeScript module is written beside the SVG as helmet-art.ts.
"""
import colorsys, re, sys
from pathlib import Path

SRC, OUT = sys.argv[1], sys.argv[2]
PATH_RE = re.compile(r'<path\s+transform="translate\(([^)]*)\)"\s+d="([^"]*)"\s+fill="([^"]*)"\s*/>')

# Paths whose bbox centre lands in the club-mark region (x 230-1000, y 370-700).
LOGO = {4,6,9,28,34,57,62,67,69,72,81,82,94,97,110,115,119,126,128,136,139,144,145,147,149,
        161,168,182,185,186,192,200,211,213,214,225,229,231,238,242,251,258,266,270,271,275,
        282,283,284,288,299,306,307,322,331,332,352,355,361,365,372,385,411,421,422,423,435,
        437,438,446,447,448,453,455,456,467}
BACKGROUND = 0            # opaque page rect — a base must composite over anything

# The outer rim: a #949595 compound drawn OUTSIDE the shell silhouette, so it reads as a
# halo over any ground but white. It also carried the underlay beneath the mark and the
# facemask, both of which are fully covered by what paints over them.
DROPPED = {2}

# Near-white paint is the reference's canvas showing through, not paint: it exists only
# because the illustration sat on a white page, and it reads as a white blob over any other
# ground. The real chrome highlights are a full stop darker (#B7B7B6-#CECDCC) and stay.
# LOGO paths are exempt: they are repainted flat shell below, not dropped.
WHITE_L = 0.90

# Inside the cage, near-white is doing one of two jobs, and they need opposite treatment.
# The enclosed openings have to become actual holes (is_opening -> the cut mask); the rest
# are specular streaks along the bars and are simply dropped. A hole is chunky and roughly
# as tall as it is wide; a streak runs long and thin down a bar (aspect 2.7-9.1).
#
# The reference is the only authority on which is which: every real opening is carved there
# in white over the solid cage blob, so a region the drawing never carved is a bar, however
# much a render makes it look like negative space. Do not hand-author gap contours here.
OPENING_ASPECT = 2.2
OPENING_AREA = 1000

def is_opening(bb, d, transform):
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    if not w or not h or max(w / h, h / w) >= OPENING_ASPECT:
        return False
    return poly_area(transform, d) > OPENING_AREA

# The club's crown texture: ~150 dice-sized flecks scattered along the front crown in a
# band, sometimes merging into small blobs. A livery motif rather than construction, and
# nothing sits under them but shell, so dropping them leaves the crown solid — which is
# what a plain helmet looks like.
SPECK_MAX = 30                     # a lone fleck is under 30u on both axes
CLUSTER_MAX = 70                   # flecks also merge into blobs up to 70u
SPECK_BOX = (990, 150, 760)        # x0, y0, y1 — the crown band they occupy

def is_speck(bb, fill):
    x0, y0, x1, y1 = bb
    if not (x0 > SPECK_BOX[0] and y0 > SPECK_BOX[1] and y1 < SPECK_BOX[2]):
        return False
    w, h = x1 - x0, y1 - y0
    if w < SPECK_MAX and h < SPECK_MAX:
        return True
    # A merged blob has to be navy to count: the chrome highlights along the front rim
    # (#BDBDBB, #C3C2C1) are the same size and are construction.
    return w < CLUSTER_MAX and h < CLUSTER_MAX and is_blue(fill)

# The shell and the facemask are both painted navy in the reference but are separate
# team surfaces here (clubs run a facemask that differs from the shell — see the Bears'
# navy mask on a navy shell). Split them by region: everything forward of and below
# FACEMASK_BOX is mask, except the rear-shell dimple texture that pokes into it.
FACEMASK_BOX = (880, 540)          # x0, y0 — a path must start at or past both
DIMPLE_BOX = (1270, 540, 1400, 700)  # shell texture inside FACEMASK_BOX; stays shell
# The two cage bolt heads are the only genuinely metal parts of the facemask — real chrome,
# identical on every kit. Everything else grey inside the cage is the bars' own lighting and
# belongs to the facemask surface: leaving it hardware renders a red mask with grey bars
# (Cooper, 2026-09-05). A bolt is its disc plus the slot cut into it, all centred on the same
# point; the size cap keeps the big grey cage compounds, which happen to centre nearby, out.
RIVETS = ((1020, 770), (1066, 1182))
RIVET_R = 20
RIVET_MAX = 80

def is_rivet(bb):
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    if max(bb[2] - bb[0], bb[3] - bb[1]) > RIVET_MAX:
        return False
    return any((cx - rx) ** 2 + (cy - ry) ** 2 < RIVET_R ** 2 for rx, ry in RIVETS)

SHELL_BASE = '#0E2335'    # College Navy as the trace rendered it
NEUTRAL_BASE = '#575757'  # hue-free placeholder; every team swaps this at render time

# Covers the wolf-grey underlay the mark was painted over. Left edge follows the
# outer silhouette inset ~20u so the grey rim survives as the helmet's outline.
PATCH_D = ('M251,506 241,529 236,543 237,554 241,563 250,593 255,612 255,650 '
           '253,700 620,700 620,506Z')

NUM = re.compile(r'-?\d*\.?\d+')
TOKEN = re.compile(r'[mlhvzMLHVZ]|-?\d*\.?\d+')

def bbox(transform, d):
    """Absolute bounding box. The reference is polygon-only (m/l/h/v/z), so every
    point on the path is an explicit vertex — no curve flattening needed."""
    o = [float(v) for v in NUM.findall(transform)] or [0.0]
    ox, oy = o[0], (o[1] if len(o) > 1 else 0.0)
    toks = TOKEN.findall(d)
    x = y = sx = sy = 0.0
    xs, ys = [], []
    i, cmd = 0, None
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in 'zZ':
                x, y = sx, sy
            continue
        rel, c = cmd.islower(), cmd.lower()
        if c in 'ml':
            a, b = float(toks[i]), float(toks[i + 1])
            i += 2
            x, y = (x + a, y + b) if rel else (a, b)
            if c == 'm':
                sx, sy = x, y
                cmd = 'l' if rel else 'L'
        elif c == 'h':
            a = float(toks[i]); i += 1
            x = x + a if rel else a
        else:
            a = float(toks[i]); i += 1
            y = y + a if rel else a
        xs.append(x + ox)
        ys.append(y + oy)
    return min(xs), min(ys), max(xs), max(ys)

def poly_area(transform, d):
    """Absolute area of a polygon-only path, subpaths summed. Separates a cage opening
    from a highlight streak, which a bounding box alone cannot do."""
    o = [float(v) for v in NUM.findall(transform)] or [0.0]
    toks = TOKEN.findall(d)
    x = y = sx = sy = 0.0
    subs, cur = [], []
    i, cmd = 0, None
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in 'zZ':
                x, y = sx, sy
                if cur:
                    subs.append(cur)
                    cur = []
            continue
        rel, c = cmd.islower(), cmd.lower()
        if c in 'ml':
            a, b = float(toks[i]), float(toks[i + 1])
            i += 2
            x, y = (x + a, y + b) if rel else (a, b)
            if c == 'm':
                if cur:
                    subs.append(cur)
                cur = []
                sx, sy = x, y
                cmd = 'l' if rel else 'L'
        elif c == 'h':
            a = float(toks[i]); i += 1
            x = x + a if rel else a
        else:
            a = float(toks[i]); i += 1
            y = y + a if rel else a
        cur.append((x, y))
    if cur:
        subs.append(cur)
    total = 0.0
    for pts in subs:
        acc = 0.0
        for j in range(len(pts)):
            x1, y1 = pts[j]
            x2, y2 = pts[(j + 1) % len(pts)]
            acc += x1 * y2 - x2 * y1
        total += abs(acc) / 2
    return total

def in_cage(bb):
    """Inside the facemask region at all — the gate for cutting an opening.

    Deliberately does NOT apply DIMPLE_BOX. That carve-out answers a different question
    (which team surface owns a path), and letting it gate opening detection suppressed a
    real hole: source path 31, the 68x103 opening at the top of the cage, lands inside the
    dimple box and so was dropped as paint instead of cut, leaving it filled (Cooper,
    2026-09-08).
    """
    return bb[0] >= FACEMASK_BOX[0] and bb[1] >= FACEMASK_BOX[1]

def in_facemask(bb):
    """Which team surface owns this path: the mask, or the shell behind it."""
    x0, y0, x1, y1 = bb
    if not in_cage(bb):
        return False
    dx0, dy0, dx1, dy1 = DIMPLE_BOX
    return not (x0 >= dx0 and x1 <= dx1 and y0 >= dy0 and y1 <= dy1)

def to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def to_hex(r, g, b):
    return '#%02X%02X%02X' % tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))

def is_blue(fill):
    r, g, b = to_rgb(fill)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return s > 0.12 and 0.5 < h < 0.75

BH, BL, BS = colorsys.rgb_to_hls(*to_rgb(SHELL_BASE))
NH, NL, NS = colorsys.rgb_to_hls(*to_rgb(NEUTRAL_BASE))

def neutralize(fill):
    """Re-hue a shell shade onto the placeholder, keeping its lightness offset."""
    h, l, s = colorsys.rgb_to_hls(*to_rgb(fill))
    l2 = max(0.0, min(1.0, NL + (l - BL)))
    s2 = NS * (s / BS) if BS else NS
    return to_hex(*colorsys.hls_to_rgb(NH, l2, min(1.0, s2)))

def translate_xy(transform):
    values = [float(v) for v in NUM.findall(transform)] or [0.0]
    return values[0], (values[1] if len(values) > 1 else 0.0)

def art_space_d(transform, d):
    """Bake a translate-only source path into art space for standalone constants."""
    tx, ty = translate_xy(transform)
    if not d.startswith('m0 0'):
        raise ValueError('expected generated path to begin at its translate origin')
    # Keep the relative move: any coordinate pairs immediately after it are implicit
    # relative line commands and would become absolute if the `m` were replaced by `M`.
    return 'M%s %s%s' % (number(tx), number(ty), d)

def shell_only_d(transform, d):
    """Keep the traced crown/back, replacing the cage portion of the page silhouette.

    Source path 1 enclosed BOTH shell and cage. Painting that whole path with the shell
    colour leaves a second, larger cage behind the facemask — the white halo on LA.
    The replacement front edge sits underneath the mounting pads and cheek brace;
    the facemask's own paths now supply its perimeter, independently of shell colour.
    """
    prefix, marker, rest = d.partition('17 1 5 6 8 11')
    _, tail_marker, tail = rest.partition('h-55l-39')
    if not marker or not tail_marker:
        raise ValueError('source shell silhouette changed; recheck the shell/cage boundary')
    return (art_space_d(transform, prefix)
            + ' L1340 620 L1325 665 L1180 700 L980 660 L925 720 L930 820 '
              'L975 860 L1045 935 L1070 1005 L1020 1080 L975 1150 '
              'L1000 1190 L1030 1230 L1044 1288 h-55l-39' + tail)

def number(value):
    if value == int(value):
        return str(int(value))
    return ('%.6f' % value).rstrip('0').rstrip('.')

def ts_string(value):
    return "'%s'" % value.replace('\\', '\\\\').replace("'", "\\'")

src = open(SRC).read()
head = src[:src.index('<path')]
kept, art_paths, src_indices, cutters, cutter_ds = [], [], [], [], []
for i, m in enumerate(PATH_RE.finditer(src)):
    if i == BACKGROUND or i in DROPPED:
        continue
    fill = m.group(3)
    bb = bbox(m.group(1), m.group(2))
    if i not in LOGO and colorsys.rgb_to_hls(*to_rgb(fill))[1] >= WHITE_L:
        # Near-white inside the cage is not paint to delete but a hole to cut: the
        # facemask under it is a solid blob (source path 3), so simply dropping the
        # white leaves the openings filled. They become a mask instead — see CUT_MASK.
        if in_cage(bb) and is_opening(bb, m.group(2), m.group(1)):
            cutters.append(m.group(0).replace('fill="%s"' % fill, 'fill="#000"'))
            cutter_ds.append(art_space_d(m.group(1), m.group(2)))
        continue
    if i not in LOGO and is_speck(bb, fill):
        continue
    if i in LOGO:
        # The mark's own paths are repainted flat shell rather than deleted: they
        # sit on top of a wolf-grey underlay (source path 2) that would otherwise
        # be exposed as a grey hawk silhouette.
        bucket, new = 'shell', neutralize(SHELL_BASE)
    elif is_blue(fill):
        bucket = 'facemask' if in_facemask(bb) else 'shell'
        new = neutralize(fill)
    elif in_facemask(bb) and not is_rivet(bb):
        # The cage's grey lighting. Its fill is kept literal rather than run through
        # neutralize(), which maps navy shades: these are already hue-free greys, so they
        # are placeholder-plus-lightness in exactly the sense the shell fills are.
        bucket, new = 'facemask', fill
    else:
        bucket, new = 'hardware', fill
    src_indices.append(i)
    tx, ty = translate_xy(m.group(1))
    d = m.group(2)
    if i == 1:
        d = shell_only_d(m.group(1), d)
        tx = ty = 0.0
    art_paths.append({
        'd': d,
        'tx': tx,
        'ty': ty,
        'role': bucket,
        'fill': new if bucket == 'hardware' else None,
        'dl': None if bucket == 'hardware' else colorsys.rgb_to_hls(*to_rgb(new))[1] - NL,
    })
    # class= carries the role so a consumer can recolour by selector; fill= keeps the
    # baked shade so the file also stands alone as a picture.
    tag = m.group(0).replace('fill="%s"' % fill, 'fill="%s"' % new)
    if i == 1:
        tag = '<path transform="translate(0,0)" d="%s" fill="%s"/>' % (d, new)
    kept.append('<path class="%s"%s' % (bucket, tag[len('<path'):]))

# The patch paints after every mark path, so index order alone places it correctly.
patch = ('<path class="shell" transform="translate(0)" d="%s" fill="%s"/>'
         % (PATCH_D, neutralize(SHELL_BASE)))
kept.insert(sum(1 for i in src_indices if i <= max(LOGO)), patch)
art_paths.insert(sum(1 for i in src_indices if i <= max(LOGO)), {
    'd': PATCH_D,
    'tx': 0.0,
    'ty': 0.0,
    'role': 'shell',
    'fill': None,
    'dl': 0.0,
})

HEADER = """<!-- Team-neutral helmet base: the shell, facemask, vents, rivets and chin strap
     every kit paints on. Derived from Cooper's own helmet illustration by
     scripts/uniform-draw/helmet_base.py, which strips the club mark and re-hues the
     shell family onto the %s placeholder while preserving its shading offsets.
     Fill colours are NOT hand-editable — change the script and re-derive, or the next
     run silently reverts you. Every path carries its role: class="shell" and
     class="facemask" recolour with the team (separately — clubs run a mask that
     differs from the shell); class="hardware" (the two cage bolts, crown vents, chin
     strap, rear seam, ear padding) is construction and stays neutral on every kit. There is
     no outline: nothing paints outside the shell silhouette, and the gaps are real —
     the facemask openings are cut by mask="url(#helmet-openings)", so a dark app
     background shows through the cage rather than the reference's white page. -->
""" % NEUTRAL_BASE

# The cage openings. Applied to the whole helmet rather than to the facemask alone: the
# mask paths and the shell paths interleave in z-order, so there is no contiguous group to
# scope it to, and every cutter is verified to fall strictly inside the cage.
CUT_MASK = ('<defs><mask id="helmet-openings">'
            '<rect width="1720" height="1440" fill="#fff"/>%s</mask></defs>'
            % ''.join(cutters))

open(OUT, 'w').write(head + HEADER + CUT_MASK + '\n<g mask="url(#helmet-openings)">\n'
                     + '\n'.join(kept) + '\n</g>\n</svg>\n')

TS_HEADER = """/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Team-neutral helmet art: the shell, facemask, vents, rivets, and chin strap every
 * kit paints on. Derived from Cooper's own helmet illustration by
 * scripts/uniform-draw/helmet_base.py, which strips the club mark and stores the shell
 * and facemask shading as lightness offsets from the %s placeholder. Change the script
 * and re-derive this file, or the next run will silently revert manual edits.
 */
""" % NEUTRAL_BASE

ts_lines = [
    TS_HEADER.rstrip(),
    '',
    "export type HelmetRole = 'shell' | 'facemask' | 'hardware';",
    '',
    'export interface HelmetArtPath {',
    '  d: string;',
    '  tx: number;',
    '  ty: number;',
    '  role: HelmetRole;',
    '  /** Hardware only: the literal fill, unchanged on every kit. */',
    '  fill?: string;',
    '  /** Shell/facemask only: HSL lightness delta from the surface base. */',
    '  dl?: number;',
    '}',
    '',
    'export const HELMET_ART: readonly HelmetArtPath[] = [',
]
for path in art_paths:
    ts_lines.extend([
        '  {',
        '    d: %s,' % ts_string(path['d']),
        '    tx: %s,' % number(path['tx']),
        '    ty: %s,' % number(path['ty']),
        "    role: '%s'," % path['role'],
        ('    fill: %s,' % ts_string(path['fill']) if path['fill'] is not None
         else '    dl: %s,' % number(path['dl'])),
        '  },',
    ])
ts_lines.extend([
    '] as const;',
    '',
    '/**',
    ' * Original art bbox 216,144–1540,1360 maps to raw helmet bbox 139,65–802,674.',
    ' * The independent scales are 663/1324 = 0.500755 and 609/1216 = 0.500822;',
    ' * applying their 0.50079 midpoint gives 139 - 216×0.50079 = 30.83 and',
    ' * 65 - 144×0.50079 = -7.11, so the registration can be re-checked here.',
    ' * Keep this registration when trimming the shell/cage outline; decals share it.',
    ' */',
    "export const HELMET_ART_TRANSFORM = 'translate(30.83,-7.11) scale(0.50079)';",
    '',
    '/** The outer shell silhouette in art space, used to clip team decals. */',
    'export const HELMET_ART_CLIP =',
    '  %s;' % ts_string(
        art_paths[0]['d']
    ),
    '',
    '/** Facemask openings in art space, including the narrow gaps between bars. */',
    'export const HELMET_ART_CUT = [',
])
ts_lines.extend('  %s,' % ts_string(d) for d in cutter_ds)
ts_lines.extend(['] as const;', ''])

ts_out = Path(OUT).with_name('helmet-art.ts')
ts_out.write_text('\n'.join(ts_lines))

print('kept %d paths, %d cage cutters (%d repainted flat over the mark, %d dropped)'
      % (len(kept), len(cutters), len(LOGO),
         len(list(PATH_RE.finditer(src))) - len(kept) - len(cutters) + 1))
