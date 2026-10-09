"""Emit the league-wide uniform marks from their supplied vector sources, kept outside the repo.

    python3 scripts/uniform-draw/league_marks.py --swoosh SWOOSH.svg --shield SHIELD.svg
    python3 scripts/uniform-draw/league_marks.py --swoosh SWOOSH.svg --shield SHIELD.svg --check

Writes lib/uniforms/teams/league/marks/swoosh.ts and shield.ts, or with --check verifies the
committed modules match. Both sources are traced vectors: absolute M/L/C/Z paths, each placed by
a translate(). Baking adds the translate to every point; no curve is re-fitted or simplified.

Swoosh. One body path in the dark fill; every other path is a grey sliver the tracer cut from the
anti-aliased edge, so it is dropped. The source draws the hook on the left and the tail rising to
the right, the orientation a mark has on the right sleeve and on the right hip.

Shield. The source is cropped to the shield's outer edge on a white ground, so its white border
merges with the ground: the navy area is the hole in the full-canvas white path, and the border's
outer silhouette is not in the file. It is rebuilt as that hole offset outward with mitred
corners, by the distance that brings its sides to the canvas edges. The rest is carried as drawn:
the white lower panel, three red letters, eight white stars, the white ball and its five navy
lines. One small mid-blue path between the ball and the navy field is an anti-aliasing sliver
and is dropped. Every source path is accounted for, or the script fails.
"""

import argparse
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'league' / 'marks'

SWOOSH_BODY = '#020202'

# Source fill -> shield slot. Stars and the ball's lines are traced in several near-identical
# shades of one colour each.
SHIELD_FILLS = {
    '#FEFBFB': 'panel',
    '#D50D0D': 'letters',
    '#D50E0E': 'letters',
    '#FAFBFC': 'ball',
    '#EBEFF3': 'stars',
    '#EFF2F5': 'stars',
    '#F0F3F6': 'stars',
    '#F2F5F7': 'stars',
    '#F4F6F8': 'stars',
    '#F6F8FA': 'stars',
    '#124073': 'lines',
    '#0F3E71': 'lines',
    '#134274': 'lines',
    '#114072': 'lines',
}
SHIELD_GROUND = '#05366B'  # the full-canvas navy rectangle, replaced by the field
SHIELD_FRAME = '#FEFEFE'  # the canvas minus the field: ground and border together
SHIELD_DROPPED = {'#3E648D'}
SHIELD_COUNTS = {'panel': 1, 'letters': 3, 'ball': 1, 'stars': 8, 'lines': 5}
SHIELD_ORDER = ['border', 'field', 'panel', 'letters', 'stars', 'ball', 'lines']

TOKEN = re.compile(r'[MLCZ]|-?\d+(?:\.\d+)?')
ARITY = {'M': 2, 'L': 2, 'C': 6}


def fmt(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def translate_of(el):
    t = el.attrib.get('transform', '')
    m = re.fullmatch(r'translate\((-?[\d.]+),(-?[\d.]+)\)', t)
    if not m:
        raise ValueError('expected a translate() transform, got %r' % t)
    return float(m.group(1)), float(m.group(2))


def subpaths(el):
    """The element's closed subpaths as lists of (cmd, [points]), translate baked in."""
    tx, ty = translate_of(el)
    tokens = TOKEN.findall(el.attrib['d'])
    out, current, i = [], None, 0
    while i < len(tokens):
        cmd = tokens[i]
        if cmd == 'Z':
            if current is None:
                raise ValueError('Z without an open subpath')
            out.append(current)
            current = None
            i += 1
            continue
        if cmd not in ARITY:
            raise ValueError('unsupported path token %r' % cmd)
        n = ARITY[cmd]
        nums = [float(t) for t in tokens[i + 1:i + 1 + n]]
        if len(nums) != n:
            raise ValueError('%s is missing coordinates' % cmd)
        pts = [(nums[k] + tx, nums[k + 1] + ty) for k in range(0, n, 2)]
        if cmd == 'M':
            if current is not None:
                raise ValueError('subpath not closed before M')
            current = [('M', pts)]
        else:
            current.append((cmd, pts))
        i += 1 + n
    if current is not None:
        raise ValueError('unclosed trailing subpath')
    return out


def path_d(subs):
    return ' '.join(
        ' '.join(cmd + ' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in pts) for cmd, pts in sub)
        + ' Z'
        for sub in subs
    )


def flatten(sub, steps=8):
    pts = []
    at = None
    for cmd, cps in sub:
        if cmd in ('M', 'L'):
            pts.append(cps[0])
        else:
            (x1, y1), (x2, y2), (x3, y3) = cps
            x0, y0 = at
            for k in range(1, steps + 1):
                t = k / steps
                u = 1 - t
                pts.append((
                    u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                    u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
                ))
        at = pts[-1]
    clean = []
    for p in pts:
        if not clean or math.dist(p, clean[-1]) > 1e-6:
            clean.append(p)
    if math.dist(clean[0], clean[-1]) <= 1e-6:
        clean.pop()
    return clean


def offset_mitred(poly, d):
    """The polygon pushed outward by d, each corner mitred to the meeting of its offset edges."""
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]))
    sign = 1 if area > 0 else -1
    n = len(poly)

    def normal(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        # Outward for either winding: rotate the edge away from the interior.
        return (sign * dy / length, -sign * dx / length)

    out = []
    for i in range(n):
        n1 = normal(poly[i - 1], poly[i])
        n2 = normal(poly[i], poly[(i + 1) % n])
        k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1])
        out.append((poly[i][0] + k * (n1[0] + n2[0]), poly[i][1] + k * (n1[1] + n2[1])))
    return out


def polygon_d(poly):
    return 'M%s %s ' % (fmt(poly[0][0]), fmt(poly[0][1])) + ' '.join(
        'L%s %s' % (fmt(x), fmt(y)) for x, y in poly[1:]
    ) + ' Z'


def svg_paths(path):
    root = ET.fromstring(Path(path).read_bytes())
    return [el for el in root.iter() if el.tag.endswith('path')]


def build_swoosh(path):
    bodies = [el for el in svg_paths(path) if el.attrib['fill'].upper() == SWOOSH_BODY]
    if len(bodies) != 1:
        raise SystemExit('swoosh: expected one %s body path, found %d' % (SWOOSH_BODY, len(bodies)))
    subs = subpaths(bodies[0])
    if len(subs) != 1:
        raise SystemExit('swoosh: expected one closed body outline, found %d' % len(subs))
    return {'body': path_d(subs)}


def build_shield(path):
    slots = {name: [] for name in SHIELD_COUNTS}
    counts = {name: 0 for name in SHIELD_COUNTS}
    field = None
    width = height = None
    root = ET.fromstring(Path(path).read_bytes())
    width, height = float(root.attrib['width']), float(root.attrib['height'])
    for el in svg_paths(path):
        fill = el.attrib['fill'].upper()
        if fill == SHIELD_GROUND or fill in SHIELD_DROPPED:
            continue
        if fill == SHIELD_FRAME:
            subs = subpaths(el)
            if len(subs) != 2:
                raise SystemExit('shield: the white frame should be canvas + field, got %d' % len(subs))
            field = subs[1]
            continue
        slot = SHIELD_FILLS.get(fill)
        if slot is None:
            raise SystemExit('shield: unclassified source fill %s' % fill)
        slots[slot].extend(subpaths(el))
        counts[slot] += 1
    if counts != SHIELD_COUNTS:
        raise SystemExit('shield: expected %r, found %r' % (SHIELD_COUNTS, counts))
    if field is None:
        raise SystemExit('shield: no field outline found')

    poly = flatten(field)
    xs = [x for x, _ in poly]
    # The source is cropped to the border's outer edge, so the side margins are its width.
    d = (min(xs) + (width - max(xs))) / 2
    border = offset_mitred(poly, d)
    bx = [x for x, _ in border]
    by = [y for _, y in border]
    print(
        'shield border %.2f: x %.1f..%.1f (canvas 0..%g), y %.1f..%.1f (canvas 0..%g)'
        % (d, min(bx), max(bx), width, min(by), max(by), height),
        file=sys.stderr,
    )
    out = {'border': polygon_d(border), 'field': path_d([field])}
    out.update({name: path_d(subs) for name, subs in slots.items()})
    return {name: out[name] for name in SHIELD_ORDER}


HEADER = """// Generated by scripts/uniform-draw/league_marks.py from the supplied vector source. Re-run the
// script rather than editing these paths.
"""


def module(const, slots, role, box_slot, notes):
    names = {slot: '%s_%s' % (const, slot.upper()) for slot in slots}
    lines = [HEADER.rstrip('\n')]
    lines += ['// ' + note for note in notes]
    lines.append("import { boundsOf, type Mark } from '../../core/marks';")
    lines.append('')
    for slot, d in slots.items():
        lines.append('export const %s =' % names[slot])
        lines.append("  '%s';" % d)
    lines.append('')
    union = ' | '.join("'%s'" % slot for slot in slots)
    head = 'export const %s: Mark<%s> = {' % (const, union)
    if len(head) > 100:
        lines.append('export const %s: Mark<' % const)
        lines.append('  ' + union)
        lines.append('> = {')
    else:
        lines.append(head)
    lines.append('  // %s' % role)
    lines.append('  box: boundsOf(%s),' % names[box_slot])
    entries = ["{ slot: '%s', d: %s }" % (slot, names[slot]) for slot in slots]
    one_line = '  paths: [%s],' % ', '.join(entries)
    if len(one_line) <= 100:
        lines.append(one_line)
    else:
        lines.append('  paths: [')
        lines += ['    %s,' % entry for entry in entries]
        lines.append('  ],')
    lines.append('};')
    return '\n'.join(lines) + '\n'


def outputs(args):
    swoosh = module(
        'LEAGUE_SWOOSH',
        build_swoosh(args.swoosh),
        'The body is the whole mark, so it sets the box.',
        'body',
        [
            'The manufacturer swoosh: hook on the left, tail rising to the right, as it reads on the',
            'right sleeve and the right hip. A left-side anchor mirrors it.',
        ],
    )
    shield = module(
        'LEAGUE_SHIELD',
        build_shield(args.shield),
        'The border is the outer silhouette and contains every other slot.',
        'border',
        [
            'The league shield, in paint order: the border, the navy field, the lower panel, the',
            'letters, the stars, the ball and its lines.',
        ],
    )
    return {OUT_DIR / 'swoosh.ts': swoosh, OUT_DIR / 'shield.ts': shield}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--swoosh', required=True)
    parser.add_argument('--shield', required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    stale = []
    for target, text in outputs(args).items():
        if args.check:
            if not target.exists() or target.read_text() != text:
                stale.append(str(target))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
            print('wrote %s' % target, file=sys.stderr)
    if stale:
        raise SystemExit('stale: ' + ', '.join(stale))


if __name__ == '__main__':
    main()
