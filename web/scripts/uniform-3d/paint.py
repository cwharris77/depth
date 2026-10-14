"""Paints a kit spec into the base garments' fixed UV layouts.

Every texel is located on its garment in 3D, and each kit field is drawn in a frame that belongs to the garment, not the
team, so one kit file places art on any base built by base.py:

  jersey chest/back   straight-on projection; heights are fractions of the jersey length below the shoulder top
  jersey sleeve cap   polar frame centred on the cap, unrolled to the shoulder close-up photo's pixels (cap = 385 px),
                      x toward the front of the player on the right sleeve and toward the back on the left, y up
  pants leg           arc length in metres from the outer seam line, positive toward the back
  helmet side         polar frame about the ear hole seen from the side, angles from straight forward, counter-clockwise
                      on the right side of the helmet (so 90 is the crown and 180 the back)
  helmet front/back   straight-on projection centred on the brow / the back of the shell, in metres"""
import re, subprocess, bpy, numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).parent
REPO = HERE.parents[2]
TEXT_MASK = HERE / 'build' / 'text_mask'
FONTS = Path('/System/Library/Fonts/Supplemental')
JW, JH = 4096, 1638
# Sleeve-cap frame of the base jersey: cap radius, frame centre below the cap top, and where this jersey's hem lip falls
# in photo pixels (the photographed cap runs from y 300 at the top to -280 at its cuff).
CAP_R, CAP_DZ, CUFF_Y = .085, -.022, -140

# ---------- spec helpers

def ts_export(ref):
    """Reads a string or flat object literal exported from a TypeScript module, given as 'path#EXPORT'."""
    path, name = ref.split('#'); src = (REPO / path).read_text()
    m = re.search(rf'export const {name}\b[^=]*=\s*', src); rest = src[m.end():]
    if rest[0] == "'": return rest[1:rest.index("'", 1)]
    body = rest[1:rest.index('}')]
    return dict(re.findall(r"(\w+):\s*'([^']*)'", body))

def palette(kit):
    pal = dict(ts_export(kit['palette']['from'])) if 'from' in kit['palette'] else {}
    pal.update(kit['palette'].get('extra', {}))
    return pal

def rgb(pal, key):
    h = pal[key] if not key.startswith('#') else key
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255

def magick(*args):
    subprocess.run(['magick', *map(str, args)], check=True)

def load_rgba(path):
    img = bpy.data.images.load(str(path))
    a = np.array(img.pixels[:], np.float32).reshape(img.size[1], img.size[0], 4)   # rows bottom-up, like UV v
    bpy.data.images.remove(img)
    return a

def mask_png(path):
    a = load_rgba(path); m = np.zeros(a.shape, np.float32); m[..., :3] = 1; m[..., 3] = a[..., 0]
    return m

def glyph_mask(ref, out, scale=8):
    """Rasterises an SVG path (from a TS export or given inline) at scale x its own units, cropped to the ink."""
    d = ts_export(ref) if '#' in ref else ref
    xs = [float(x) for x in re.findall(r'(-?[\d.]+),', d)]; ys = [float(y) for y in re.findall(r',(-?[\d.]+)', d)]
    x0, y0, w, h = min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys); pad = 40
    magick('-size', f'{int(w * scale) + 2 * pad}x{int(h * scale) + 2 * pad}', 'xc:black', '-fill', 'white',
           '-draw', f"affine {scale},0,0,{scale},{pad - x0 * scale},{pad - y0 * scale} path '{d}'", out)
    return out

def text_mask(font, text, out, tracking=0, xscale=1):
    """White-on-black mask of a line of text in an installed font, by PostScript name or a file in the font folder."""
    if font.endswith('.ttf'):
        magick('-size', '3000x700', 'xc:black', '-font', FONTS / font, '-pointsize', 500, '-kerning', tracking * 500, '-fill', 'white',
               '-gravity', 'center', '-annotate', '+0+0', text, '-trim', '+repage', '-resize', f'{xscale * 100}%x100%!',
               '-bordercolor', 'black', '-border', 20, out)
    else:
        if not TEXT_MASK.exists():
            TEXT_MASK.parent.mkdir(exist_ok=True); subprocess.run(['swiftc', '-O', HERE / 'text_mask.swift', '-o', TEXT_MASK], check=True)
        subprocess.run([TEXT_MASK, font, text, out, str(tracking), str(xscale)], check=True)
    return out

# ---------- league marks, shared by every kit

def swoosh(out):
    magick('-size', '620x300', 'xc:black', '-fill', 'white', '-draw',
           "path 'M 70,215 C 0,252 30,292 175,238 L 596,24 L 196,150 C 116,176 84,170 98,128 C 70,160 58,190 70,215 Z'", out)
    return mask_png(out)

def shield(out):
    magick('-size', '300x360', 'xc:none', '-fill', 'white', '-draw', "path 'M 8,8 L 292,8 L 292,200 C 292,300 150,352 150,352 C 150,352 8,300 8,200 Z'",
           '-fill', '#013369', '-draw', "path 'M 30,30 L 270,30 L 270,196 C 270,282 150,326 150,326 C 150,326 30,282 30,196 Z'",
           '-fill', '#D50A0A', '-draw', 'rectangle 70,40 230,95', '-font', FONTS / 'DIN Condensed Bold.ttf', '-pointsize', 120, '-fill', 'white',
           '-gravity', 'center', '-annotate', '+0+40', 'NFL', out)
    return load_rgba(out)

# ---------- surface sampling

def texels(obj, W, H, materials=None, outer_from=None, co=None):
    """Surface position and normal for every texel covered by the UV layout (optionally only some material slots)."""
    me = obj.data; me.calc_loop_triangles()
    uv = np.empty(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) * [W, H] - .5
    if co is None: co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    no = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('normal', no); no = no.reshape(-1, 3)
    # Welded pattern pieces do not share a winding, so point every normal away from the body's vertical axis.
    axis = np.array([np.median(co[:, 0]), (co[:, 1].min() + co[:, 1].max()) / 2, 0])
    out = co - axis; out[:, 2] = 0
    no[(no * out).sum(1) < 0] *= -1
    tl = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    tv = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    mi = np.empty(len(me.loop_triangles), int); me.loop_triangles.foreach_get('material_index', mi)
    P = np.zeros((H, W, 3), np.float32); N = np.zeros((H, W, 3), np.float32); hit = np.zeros((H, W), bool)
    D = np.full((H, W), -1.0, np.float32)
    for loops, vs, m in zip(tl, tv, mi):
        if materials is not None and m not in materials: continue
        a, b, c = uv[loops]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int); x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9: continue
        l1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
        l2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
        l3 = 1 - l1 - l2
        inside = (l1 > -.02) & (l2 > -.02) & (l3 > -.02)
        if not inside.any(): continue
        L = np.stack([l1, l2, l3], -1)[inside]
        X, Y = gx[inside], gy[inside]; pos = L @ co[vs]
        if outer_from is not None:   # where projected surfaces overlap in the layout, keep the outermost
            dist = np.linalg.norm(pos - outer_from, axis=1); keep = dist > D[Y, X]
            X, Y, pos, L, dist = X[keep], Y[keep], pos[keep], L[keep], dist[keep]; D[Y, X] = dist
        P[Y, X] = pos; N[Y, X] = L @ no[vs]; hit[Y, X] = True
    N /= np.maximum(np.linalg.norm(N, axis=-1, keepdims=True), 1e-9)
    return P, N, hit

class Canvas:
    """Colours for the texels one garment covers, with straight-on decal projection."""
    def __init__(self, P, N, hit, base):
        self.flat = np.flatnonzero(hit); self.hit = hit
        self.p, self.n = P.reshape(-1, 3)[self.flat], N.reshape(-1, 3)[self.flat]
        self.col = np.zeros((len(self.flat), 3), np.float32); self.col[:] = base
    def put(self, idx, color, alpha):
        alpha = np.asarray(alpha, np.float32)
        self.col[idx] = self.col[idx] * (1 - alpha[:, None]) + np.asarray(color) * alpha[:, None]
    def decal(self, image, centre, u, v, w, h, facing, thr=.15, depth=None):
        u, v, facing = (np.array(a, float) for a in (u, v, facing))
        d = self.p - centre; s = d @ u / w + .5; t = d @ v / h + .5
        ok = (s >= 0) & (s < 1) & (t >= 0) & (t < 1) & (self.n @ facing > thr)
        if depth is not None: ok &= np.abs(d @ facing) < depth
        ok = np.flatnonzero(ok); hh, ww = image.shape[:2]
        px = image[(t[ok] * (hh - 1)).astype(int), (s[ok] * (ww - 1)).astype(int)]
        self.put(ok, px[:, :3], px[:, 3])
    def save(self, path, name):
        img = np.zeros(self.hit.shape + (3,), np.float32); img.reshape(-1, 3)[self.flat] = self.col
        return save(img, self.hit, path, name)

def save(img, hit, path, name):
    h, w = hit.shape; filled = hit.copy()
    for _ in range(6):   # pad islands outward so seam filtering never reaches the unpainted background
        acc = np.zeros_like(img); cnt = np.zeros((h, w), np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(filled, (dy, dx), (0, 1)); acc += np.roll(img, (dy, dx), (0, 1)) * sh[..., None]; cnt += sh
        grow = ~filled & (cnt > 0); img[grow] = acc[grow] / cnt[grow, None]; filled |= grow
    if name in bpy.data.images: bpy.data.images.remove(bpy.data.images[name])
    im = bpy.data.images.new(name, w, h, alpha=False)
    im.pixels.foreach_set(np.concatenate([img, np.ones((h, w, 1), np.float32)], -1).ravel())
    im.filepath_raw = str(path); im.file_format = 'PNG'; im.save()
    return im

def recolor_mask(mask, fill):
    out = np.zeros(mask.shape, np.float32); out[..., :3] = fill; out[..., 3] = mask[..., 3]
    return out

# ---------- jersey

def paint_jersey(obj, kit, pal, tmp, path):
    J = kit['jersey']
    rest = np.empty(len(obj.data.vertices) * 3); obj.data.attributes['rest'].data.foreach_get('vector', rest); rest = rest.reshape(-1, 3)
    P, N, hit = texels(obj, JW, JH, co=rest)
    tree = BVHTree.FromPolygons([tuple(p) for p in rest], [tuple(p.vertices) for p in obj.data.polygons])
    def ray(origin, direction, depth=.15):
        direction = Vector(direction).normalized()
        loc, normal, i, d = tree.ray_cast(Vector(origin), direction)
        if loc is None: loc, normal, i, d = tree.find_nearest(Vector(origin) + direction * depth)
        return np.array(loc)
    torso = rest[np.abs(rest[:, 0] - np.median(rest[:, 0])) < .12]
    cx, cy = float(np.median(torso[:, 0])), float((torso[:, 1].min() + torso[:, 1].max()) / 2)
    zs = float(torso[:, 2].max()); L = zs - float(rest[:, 2].min())
    cv = Canvas(P, N, hit, rgb(pal, J['body'])); p = cv.p
    report = {}
    if 'number' in J:
        nm = J['number']; m = mask_png(glyph_mask(nm['glyph'], tmp / 'number.png')) if 'glyph' in nm else \
            mask_png(text_mask(nm['font'], nm['text'], tmp / 'number.png'))
        num = recolor_mask(m, rgb(pal, nm['fill']))
        if 'inline' in nm:   # a tonal line inset from the numeral's edge
            il = nm['inline']
            for name, r in (('e1', il['inset']), ('e2', il['inset'] + il['width'])):
                magick(tmp / 'number.png', '-morphology', 'Erode', f'Disk:{r}', tmp / f'number-{name}.png')
            e1, e2 = (load_rgba(tmp / f'number-{n}.png')[..., 0] > .5 for n in ('e1', 'e2'))
            num[e1 & ~e2, :3] = rgb(pal, il['color'])
        aspect = num.shape[1] / num.shape[0]
        for side, (u, facing) in (('front', ((1, 0, 0), (0, -1, 0))), ('back', ((-1, 0, 0), (0, 1, 0)))):
            if side not in nm: continue
            h = nm[side]['height'] * L
            cv.decal(num, np.array([cx, cy, zs - nm[side]['top'] * L - h / 2]), u, (0, 0, 1), h * aspect, h, facing)
    if 'name' in J:
        nn = J['name']; m = mask_png(text_mask(nn['font'], nn['text'], tmp / 'name.png', nn.get('tracking', 0)))
        h = nn['height'] * L
        cv.decal(recolor_mask(m, rgb(pal, nn['color'])), np.array([cx, cy, zs - nn['top'] * L - h / 2]), (-1, 0, 0), (0, 0, 1),
                 h * m.shape[1] / m.shape[0], h, (0, 1, 0))
    # The V's bottom and the nape: walking down the centre line, the first height where a ray from the front (or back)
    # meets that side of the jersey rather than passing through the neck opening.
    def first_hit(y0, dy, side):
        for z in np.arange(zs + .06, zs - .32, -.002):
            loc = tree.ray_cast(Vector((cx, y0, z)), Vector((0, dy, 0)))[0]
            if loc is not None and (loc.y - cy) * side > .02: return float(z)
        return zs - .1
    v_bottom, nape = first_hit(cy - .6, 1, -1), first_hit(cy + .6, -1, 1)
    if J.get('collar_shield'): cv.decal(shield(tmp / 'shield.png'), np.array([cx, cy, v_bottom - .028]), (1, 0, 0), (0, 0, 1), .030, .036, (0, -1, 0))
    if 'nape_patch' in J:
        np_ = J['nape_patch']; m = load_rgba(text_mask(np_['font'], np_['text'], tmp / 'nape.png'))[..., 0]
        hh, ww = 200, 320; patch = np.zeros((hh, ww, 4), np.float32); patch[..., 3] = 1; patch[..., :3] = rgb(pal, np_['border'])
        b = int(hh * .08); patch[b:-b, b:-b, :3] = rgb(pal, np_['fill'])
        th, tw = int(hh * .66), int(hh * .66 * m.shape[1] / m.shape[0])
        ys, xs = np.mgrid[0:th, 0:tw]; ink = m[(ys * (m.shape[0] - 1) / (th - 1)).astype(int), (xs * (m.shape[1] - 1) / (tw - 1)).astype(int)] > .5
        y0, x0 = (hh - th) // 2, (ww - tw) // 2; region = patch[y0:y0 + th, x0:x0 + tw, :3]; region[ink] = rgb(pal, np_['ink'])
        cv.decal(patch, np.array([cx, cy, nape - np_['height'] / 2 - .014]), (-1, 0, 0), (0, 0, 1), np_['width'], np_['height'], (0, 1, 0))
    if 'sleeve_cap' in J:
        sc = J['sleeve_cap']; sw = swoosh(tmp / 'swoosh.png') if 'swoosh' in sc else None
        for s_ in (-1, 1):
            T = ray((cx + s_ * .6, cy, zs - .05), (-s_, 0, 0), .35)
            C = np.array([T[0] - s_ * CAP_R, cy, T[2] + CAP_DZ]); d = p - C
            dn = d / np.linalg.norm(d, axis=1, keepdims=True)
            psi = np.arccos(np.clip(dn[:, 0] * s_, -1, 1)); phi = np.arctan2(dn[:, 2], -dn[:, 1])
            # unrolled photo coordinates, scaled so the photographed cap fits between this cap's top and its hem lip
            r = 385 * np.sin(np.minimum(psi, np.pi / 2)); a = (360 - CUFF_Y) / 580; b = 360 - 300 * a
            X, Y = r * np.cos(phi) / a, (r * np.sin(phi) - b) / a
            side = psi < np.radians(80)
            col = rgb(pal, sc['color'])
            if 'rim_band' in sc:   # along the cap's rim: grows in from `from`, full width over the top, fades out by `to`
                rb = sc['rim_band']; ph = np.degrees(phi); ph = np.where(ph < -110, ph + 360, ph)
                grow = np.clip((ph - rb['from']) / rb['ramp'], 0, 1) ** .8; fade = np.clip((rb['to'] - ph) / rb['ramp'], 0, 1) ** .9
                width = np.radians(rb['width']) * np.minimum(grow, fade) * (ph < rb['to'])
                mid = np.radians(rb['inset']) + width / 2
                al = np.clip((width / 2 - np.abs(psi - mid)) * .09 / .0009 + .5, 0, 1)
                sel = np.flatnonzero((psi < np.radians(125)) & (al > 0)); cv.put(sel, col, al[sel])
            if 'crescent' in sc:   # inside one circle and outside another, in photo pixels
                (ox, oy, orr), (ix, iy, ir) = sc['crescent']['outer'], sc['crescent']['inner']
                al = np.clip(np.minimum(orr - np.hypot(X - ox, Y - oy), np.hypot(X - ix, Y - iy) - ir) / 3 + .5, 0, 1)
                sel = np.flatnonzero(side & (al > 0)); cv.put(sel, col, al[sel])
            if sw is not None:   # reads left to right on both sleeves
                k = sc['swoosh']; st, tt = (-s_ * X - k['centre'][0]) / k['size'][0] + .5, (Y - k['centre'][1]) / k['size'][1] + .5
                ok = np.flatnonzero(side & (st >= 0) & (st < 1) & (tt >= 0) & (tt < 1))
                px = sw[(tt[ok] * (sw.shape[0] - 1)).astype(int), (st[ok] * (sw.shape[1] - 1)).astype(int)]
                cv.put(ok, rgb(pal, k['color']), px[:, 3])
    report.update(shoulder_top=round(zs, 3), length=round(L, 3), v_bottom=round(v_bottom, 3), nape=round(nape, 3))
    return cv.save(path, 'jersey-art'), report

# ---------- pants

def paint_pants(obj, kit, pal, legs, path):
    """Pants body with stripes running down the outer seam, each a band of arc length from the seam line."""
    Pk = kit['pants']; S = 2048
    P, N, hit = texels(obj, S, S)
    cv = Canvas(P, N, hit, rgb(pal, Pk['body'])); p = cv.p
    waist = float(p[:, 2].max()); mid = (legs[0][0][0] + legs[1][0][0]) / 2
    for hj, kn in legs:
        s = np.sign(hj[0] - mid); axis = kn - hj; t = np.clip((p - hj) @ axis / (axis @ axis), -.3, 1.4)
        r = p - (hj + t[:, None] * axis)
        phi = np.arctan2(r[:, 1], s * r[:, 0]); arc = phi * np.linalg.norm(r[:, :2], axis=1)
        mine = (np.sign(p[:, 0] - mid) == s) & (p[:, 2] < waist - Pk.get('stripe_top', .012)) & (np.abs(phi) < 1.2)
        for st in Pk.get('stripes', []):
            a = np.clip(np.minimum(arc - st['from'], st['to'] - arc) / .0012 + .5, 0, 1) * mine
            sel = np.flatnonzero(a > 0); cv.put(sel, rgb(pal, st['color']), a[sel])
    return cv.save(path, 'pants-art')

# ---------- helmet

def box_uvs(obj, name='paint'):
    """Six-way box projection: every face is projected along its dominant normal axis into one cell of a 3x2 atlas."""
    me = obj.data
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lo, hi = co.min(0), co.max(0); span = (hi - lo).max() * 1.02; c = (lo + hi) / 2
    layer = me.uv_layers.new(name=name); me.uv_layers.active = layer; layer.active_render = True
    fn = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('normal', fn); fn = fn.reshape(-1, 3)
    fc = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('center', fc); fc = fc.reshape(-1, 3)
    fn[((fc - c) * fn).sum(1) < 0] *= -1   # outward, whatever the face winding
    ax = np.abs(fn).argmax(1); sign = np.sign(fn[np.arange(len(fn)), ax]); cell = ax * 2 + (sign > 0)
    li = np.empty(len(me.loops), int); me.loops.foreach_get('vertex_index', li)
    loop_start = np.empty(len(me.polygons), int); me.polygons.foreach_get('loop_start', loop_start)
    order = np.argsort(loop_start); lf = np.repeat(order, np.diff(np.append(loop_start[order], len(me.loops))))
    p = (co[li] - c) / span + .5; k = cell[lf]; a = ax[lf]
    u = np.where(a == 0, p[:, 1], p[:, 0]); v = np.where(a == 2, p[:, 1], p[:, 2])
    uv = np.stack([(k % 3 + u) / 3, (k // 3 + v) / 2], 1)
    layer.data.foreach_set('uv', uv.astype(np.float32).ravel())
    return layer

def plate(w, h, radius, taper, fill):
    """A rounded plate wider at the bottom by `taper` of its width, as RGBA rows bottom-up."""
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32); half = w / 2 * (1 - taper * (ys / h))
    dx = np.maximum(np.abs(xs - w / 2) - (half - radius), 0); dy = np.maximum(np.maximum(radius - ys, ys - (h - radius)), 0)
    inside = np.hypot(dx, dy) <= radius
    out = np.zeros((h, w, 4), np.float32); out[inside, :3] = fill; out[inside, 3] = 1
    return out

def paint_helmet(shell, kit, pal, tmp, path):
    Hk = kit['helmet']; me = shell.data
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lo, hi = co.min(0), co.max(0); c = (lo + hi) / 2
    tree = BVHTree.FromPolygons([tuple(p) for p in co], [tuple(p.vertices) for p in me.polygons])
    # brow: walking up the centre line from below the face opening, the first height where a ray from the front
    # meets the front of the shell is the top edge of the opening
    brow, front_y = c[2], lo[1]
    for z in np.arange(c[2] - .06, hi[2], .002):
        loc = tree.ray_cast(Vector((c[0], lo[1] - .2, z)), Vector((0, 1, 0)))[0]
        if loc is not None and loc.y < c[1] - .05: brow, front_y = float(z), float(loc.y); break
    P, N, hit = texels(shell, 4096, 4096 * 2 // 3, outer_from=c)
    cv = Canvas(P, N, hit, rgb(pal, Hk['shell'])); p = cv.p
    cv.n[((p - c) * cv.n).sum(1) < 0] *= -1
    report = {'brow_z': round(brow, 4)}
    if 'horn' in Hk:
        h = Hk['horn']; ye, ze = c[1] + h['ear'][0], c[2] + h['ear'][1]
        Y, Z = -(p[:, 1] - ye), p[:, 2] - ze
        rho, alpha = np.hypot(Y, Z), np.arctan2(Z, Y)
        rad, wid = np.array(h['radius'], float), np.array(h['width'], float)
        start, end = rad[0, 0], rad[-1, 0]
        th = np.degrees(np.mod(alpha - np.radians(start), 2 * np.pi)) + start   # unwrapped from the horn's front end
        r, w = np.interp(th, *rad.T), np.interp(th, *wid.T)
        # Keep the curl inside the shell's side silhouette: measure it in 5 degree steps and shrink the radius and width
        # over the back half of the spiral until its outer edge stays `clearance` inside everywhere.
        bins = np.floor(np.degrees(alpha) / 5).astype(int)
        rim = {k: np.percentile(rho[bins == k], 98) for k in np.unique(bins) if (bins == k).sum() > 50}
        k = 1.; lo_th, hi_th = h['shrink_from'], h['shrink_full']
        for kb, rr in rim.items():
            tb = np.degrees(np.mod(np.radians(kb * 5 + 2.5) - np.radians(start), 2 * np.pi)) + start
            if tb < (lo_th + hi_th) / 2 or tb > end: continue
            k = min(k, (rr - h['clearance']) / (np.interp(tb, *rad.T) + np.interp(tb, *wid.T) / 2))
        f = np.clip((th - lo_th) / (hi_th - lo_th), 0, 1); kf = 1 - (1 - k) * f * f * (3 - 2 * f)
        r, w = r * kf, w * kf
        edge = np.where(th <= end, w / 2 - np.abs(rho - r), -1)
        band = np.abs(p[:, 0] - c[0]) - Hk.get('crown_band', {}).get('half_width', 0)
        a = np.clip(np.minimum(edge, band) / .0006 + .5, 0, 1); sel = np.flatnonzero(a > 0)
        cv.put(sel, rgb(pal, h['color']), a[sel]); report['curl_scale'] = round(float(k), 3)
    if 'bumper' in Hk:
        bp = Hk['bumper']; pw, ph = 900, int(900 * bp['height'] / bp['width'])
        img = plate(pw, ph, int(ph * bp.get('corner', .3)), bp.get('taper', 0), rgb(pal, bp['plate']))
        m = load_rgba(text_mask(bp['font'], bp['text'], tmp / 'bumper-text.png', bp.get('tracking', 0)))[..., 0]
        th_, tw_ = int(ph * bp['text_height']), 0; tw_ = int(th_ * m.shape[1] / m.shape[0])
        if tw_ > pw * bp.get('text_max_width', .86): tw_ = int(pw * bp.get('text_max_width', .86)); th_ = int(tw_ * m.shape[0] / m.shape[1])
        ys, xs = np.mgrid[0:th_, 0:tw_]; ink = m[(ys * (m.shape[0] - 1) / (th_ - 1)).astype(int), (xs * (m.shape[1] - 1) / (tw_ - 1)).astype(int)]
        y0, x0 = (ph - th_) // 2, (pw - tw_) // 2; reg = img[y0:y0 + th_, x0:x0 + tw_]
        reg[..., :3] = reg[..., :3] * (1 - ink[..., None]) + rgb(pal, bp['ink']) * ink[..., None]
        cv.decal(img, np.array([c[0], front_y, brow + bp['above_brow'] + bp['height'] / 2]), (1, 0, 0), (0, 0, 1),
                 bp['width'], bp['height'], (0, -1, 0), thr=0, depth=.06)
    if Hk.get('rear_shield'):
        cv.decal(shield(tmp / 'shield.png'), np.array([c[0], hi[1], c[2] - .035]), (-1, 0, 0), (0, 0, 1), .024, .029, (0, 1, 0), thr=.3, depth=.05)
    return cv.save(path, 'helmet-art'), report

# ---------- finishes

def knit_normal(path, kind, n=512):
    """Tiling normal map of the fabric surface: interlocked knit loops, plus the jersey's perforation holes."""
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    if kind == 'jersey':   # 32 x 32 knit cells with a perforation every second cell
        h = .5 + .5 * np.cos(2 * np.pi * x / 16) * np.abs(np.sin(np.pi * (y + 4 * np.abs(np.mod(x, 16) - 8) / 8) / 16))
        hx, hy = np.mod(x, 32) - 16, np.mod(y, 32) - 16
        h -= 1.2 * np.exp(-(hx ** 2 + hy ** 2) / 10)
    else:                  # finer, flatter warp knit for the stretch pants
        h = .5 + .5 * np.cos(2 * np.pi * x / 8) * np.abs(np.sin(np.pi * (y + 2 * np.abs(np.mod(x, 8) - 4) / 4) / 8))
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    nrm = np.stack([-gx * 2, -gy * 2, np.ones_like(h)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    im = bpy.data.images.new(f'{kind}-knit-normal', n, n, alpha=False)
    im.pixels.foreach_set(np.concatenate([nrm * .5 + .5, np.ones((n, n, 1), np.float32)], -1).ravel())
    im.filepath_raw = str(path); im.file_format = 'PNG'; im.save()
    im.colorspace_settings.name = 'Non-Color'
    return im

def uv_layout(obj, texture, path):
    """The object's UV wireframe drawn over its painted texture, for editing the artwork by hand."""
    img = bpy.data.images.load(str(texture)); w, h = img.size
    a = np.array(img.pixels[:], np.float32).reshape(h, w, 4); bpy.data.images.remove(img)
    me = obj.data; uv = np.empty(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
    for poly in me.polygons:
        ids = list(poly.loop_indices); q = uv[ids]; r = np.roll(q, -1, 0)
        t = np.linspace(0, 1, 24)[:, None, None]; pts = (q * (1 - t) + r * t).reshape(-1, 2) * [w - 1, h - 1]
        x, y = np.clip(pts[:, 0].round().astype(int), 0, w - 1), np.clip(pts[:, 1].round().astype(int), 0, h - 1)
        a[y, x, :3] = a[y, x, :3] * .35 + .65
    im = bpy.data.images.new(path.stem, w, h, alpha=False); im.pixels.foreach_set(a.ravel())
    im.filepath_raw = str(path); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
