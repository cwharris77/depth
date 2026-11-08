"""Bake the supplied underlined GIANTS wordmark SVG into the helmet decal path.

    python3 scripts/uniform-draw/giants_wordmark.py <New_York_Giants_wordmark.svg>

The source SVG holds two paths (the underline, and the
letters with the A's counter as its own subpath) under two nested group matrices. Every point,
control points included, is carried through both matrices and then fitted, aspect preserved, to
the measured helmet envelope, so the curves stay curves. Relative commands and the smooth `s`
curve are resolved to absolute M/L/C; each subpath is closed with Z. The letters are emitted
with the counter as a subpath, so the layer paints with the even-odd rule.
"""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if SOURCE is None:
    sys.exit(f'usage: {Path(__file__).name} <source.svg>')
TARGET = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/giants/marks/wordmark.ts'
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
ARITY = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4}

# Helmet-space envelope: the decal runs from the shell's back quarter to just short of the cage,
# centred on the side panel the monogram decal occupies.
TARGET_X0, TARGET_X1, TARGET_CY = 248.0, 533.0, 236.5

Matrix = tuple[float, float, float, float, float, float]


def parse_matrix(value: str) -> Matrix:
    match = re.fullmatch(r'matrix\(([^)]*)\)', value.strip())
    if not match:
        raise ValueError(f'unsupported transform {value!r}')
    a, b, c, d, e, f = (float(n) for n in re.split(r'[\s,]+', match.group(1).strip()))
    return a, b, c, d, e, f


def compose(outer: Matrix, inner: Matrix) -> Matrix:
    a1, b1, c1, d1, e1, f1 = outer
    a2, b2, c2, d2, e2, f2 = inner
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def apply(m: Matrix, x: float, y: float) -> tuple[float, float]:
    a, b, c, d, e, f = m
    return a * x + c * y + e, b * x + d * y + f


def subpaths(d: str) -> list[list[tuple[str, list[tuple[float, float]]]]]:
    """Absolute segments per subpath: ('M'|'L'|'C', points)."""
    tokens, i, command = TOKEN.findall(d), 0, ''
    x = y = 0.0
    last_ctrl: tuple[float, float] | None = None
    out: list[list[tuple[str, list[tuple[float, float]]]]] = []
    current: list[tuple[str, list[tuple[float, float]]]] | None = None
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
            if command in 'Zz':
                if current:
                    x, y = current[0][1][0]
                    out.append(current)
                current, last_ctrl = None, None
                continue
        op, rel = command.upper(), command.islower()
        n = [float(t) for t in tokens[i : i + ARITY[op]]]
        i += ARITY[op]
        if op == 'M':
            if current:
                out.append(current)
            x, y = (x + n[0], y + n[1]) if rel else (n[0], n[1])
            current = [('M', [(x, y)])]
            command = 'l' if rel else 'L'
            last_ctrl = None
            continue
        assert current is not None
        if op in ('L', 'H', 'V'):
            if op == 'L':
                x, y = (x + n[0], y + n[1]) if rel else (n[0], n[1])
            elif op == 'H':
                x = x + n[0] if rel else n[0]
            else:
                y = y + n[0] if rel else n[0]
            current.append(('L', [(x, y)]))
            last_ctrl = None
        elif op == 'C':
            pts = [(x + n[k], y + n[k + 1]) if rel else (n[k], n[k + 1]) for k in (0, 2, 4)]
            current.append(('C', pts))
            last_ctrl, (x, y) = pts[1], pts[2]
        else:  # S
            c1 = (2 * x - last_ctrl[0], 2 * y - last_ctrl[1]) if last_ctrl else (x, y)
            pts = [(x + n[k], y + n[k + 1]) if rel else (n[k], n[k + 1]) for k in (0, 2)]
            current.append(('C', [c1, *pts]))
            last_ctrl, (x, y) = pts[0], pts[1]
    if current:
        out.append(current)
    return out


root = ET.fromstring(SOURCE.read_bytes())
shapes: list[list[list[tuple[str, list[tuple[float, float]]]]]] = []


def walk(element: ET.Element, matrix: Matrix) -> None:
    if 'transform' in element.attrib:
        matrix = compose(matrix, parse_matrix(element.attrib['transform']))
    if element.tag.rsplit('}', 1)[-1] == 'path':
        shapes.append(
            [[(cmd, [apply(matrix, *p) for p in pts]) for cmd, pts in sp] for sp in subpaths(element.attrib['d'])]
        )
    for child in element:
        walk(child, matrix)


walk(root, (1.0, 0.0, 0.0, 1.0, 0.0, 0.0))
if len(shapes) != 2:
    raise ValueError(f'expected the underline and the letters, found {len(shapes)} paths')

points = [p for shape in shapes for sp in shape for _, pts in sp for p in pts]
min_x, max_x = min(x for x, _ in points), max(x for x, _ in points)
min_y, max_y = min(y for _, y in points), max(y for _, y in points)
scale = (TARGET_X1 - TARGET_X0) / (max_x - min_x)
top = TARGET_CY - (max_y - min_y) * scale / 2


def fit(p: tuple[float, float]) -> str:
    return f'{TARGET_X0 + (p[0] - min_x) * scale:.2f},{top + (p[1] - min_y) * scale:.2f}'


def emit(shape) -> str:
    return ' '.join(
        ' '.join(f"{cmd}{' '.join(fit(p) for p in pts)}" for cmd, pts in sp) + ' Z' for sp in shape
    )


TARGET.write_text(
    '// Generated by scripts/uniform-draw/giants_wordmark.py; coordinates include placement.\n'
    '// The underline, then the letters with the A counter as its own subpath (paint even-odd).\n'
    f"export const GIANTS_WORDMARK_UNDERLINE_PATH =\n  '{emit(shapes[0])}';\n"
    f"export const GIANTS_WORDMARK_LETTERS_PATH =\n  '{emit(shapes[1])}';\n"
)
print(f'wrote {TARGET}: {min_x:.1f}..{max_x:.1f} x {min_y:.1f}..{max_y:.1f} -> scale {scale:.4f}')
