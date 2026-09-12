"""Regenerate the Raiders helmet decal from the supplied 2026_LasVegas.svg.

    python3 scripts/uniform-draw/raiders_decal.py
    python3 scripts/uniform-draw/raiders_decal.py --check

The external vector is read directly and its original path order is preserved. Paths 0, 4, and 6
are the square backdrop/canvas artifacts rather than mark geometry. The remaining 75 paths are
mapped uniformly from source bbox x=457..1597, y=193..1592 to raw helmet bbox x=350..520,
y=140..348.6. The placement keeps the upright shield centered on the visible side panel while
making it 27% of the shell width, matching the supplied current-season helmet reference.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REF = Path.home() / 'Downloads' / '2026_LasVegas.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'raiders-decal.ts'
SOURCE_X0, SOURCE_Y0 = 457.0, 193.0
TARGET_X0, TARGET_Y0 = 350.0, 140.0
SCALE = 170.0 / 1140.0
SKIP_PATHS = {0, 4, 6}
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
PATH = re.compile(r'<path\b(?P<attrs>[^>]*)/>')
ATTR = re.compile(r'(?P<name>transform|d|fill)="(?P<value>[^"]+)"')
TRANSLATE = re.compile(
    r'translate\(([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)'
    r'(?:[, ]+([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?))?\)'
)


def point(x: float, y: float) -> tuple[float, float]:
    return (TARGET_X0 + (x - SOURCE_X0) * SCALE, TARGET_Y0 + (y - SOURCE_Y0) * SCALE)


def transformed_path(source: str, tx: float, ty: float) -> str:
    tokens = TOKEN.findall(source)
    i = 0
    command = ''
    x = y = start_x = start_y = 0.0
    out: list[str] = []

    def read() -> float:
        nonlocal i
        value = float(tokens[i])
        i += 1
        return value

    def emit(kind: str, px: float, py: float) -> None:
        mx, my = point(px, py)
        out.append(f'{kind}{mx:.3f},{my:.3f}')

    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
            if command in 'Zz':
                out.append('Z')
                x, y = start_x, start_y
                continue
        if command in 'Mm':
            first = True
            while i < len(tokens) and not tokens[i].isalpha():
                nx, ny = read(), read()
                if command == 'm':
                    x += nx
                    y += ny
                else:
                    x, y = nx, ny
                if first:
                    start_x, start_y = x, y
                    emit('M', x + tx, y + ty)
                    first = False
                else:
                    emit('L', x + tx, y + ty)
            continue
        if command in 'Ll':
            while i < len(tokens) and not tokens[i].isalpha():
                nx, ny = read(), read()
                if command == 'l':
                    x += nx
                    y += ny
                else:
                    x, y = nx, ny
                emit('L', x + tx, y + ty)
            continue
        if command in 'Hh':
            while i < len(tokens) and not tokens[i].isalpha():
                nx = read()
                x = x + nx if command == 'h' else nx
                emit('L', x + tx, y + ty)
            continue
        if command in 'Vv':
            while i < len(tokens) and not tokens[i].isalpha():
                ny = read()
                y = y + ny if command == 'v' else ny
                emit('L', x + tx, y + ty)
            continue
        raise ValueError(f'Unsupported SVG command {command!r}')
    return ' '.join(out)


def palette_key(fill: str) -> str:
    value = fill.lstrip('#')
    if len(value) == 3:
        value = ''.join(channel * 2 for channel in value)
    rgb = tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))
    lightness = sum(rgb) / 3
    if lightness < 80:
        return 'black'
    if lightness < 235:
        return 'silver'
    return 'white'


def build() -> str:
    layers: list[tuple[str, str]] = []
    for source_index, match in enumerate(PATH.finditer(REF.read_text())):
        if source_index in SKIP_PATHS:
            continue
        attrs = dict(ATTR.findall(match.group('attrs')))
        translate = TRANSLATE.fullmatch(attrs['transform'])
        if translate is None:
            raise ValueError(f'Unsupported SVG transform {attrs["transform"]!r}')
        tx, ty = float(translate.group(1)), float(translate.group(2) or '0')
        layers.append((transformed_path(attrs['d'], tx, ty), palette_key(attrs['fill'])))
    if len(layers) != 75:
        raise ValueError(f'Expected 75 decal paths, found {len(layers)}')

    lines = [
        '// Generated Raiders decal geometry. The source SVG remains external; regenerate with',
        '// scripts/uniform-draw/raiders_decal.py rather than hand-editing these paths.',
        '',
        'export const RAIDERS_DECAL_PATHS = [',
    ]
    for d, fill in layers:
        lines.append(f"  {{ d: '{d}', fill: '{fill}' }},")
    lines.extend(['] as const;', ''])
    return '\n'.join(lines)


if __name__ == '__main__':
    prettier = MODULE.parents[3] / 'node_modules' / '.bin' / 'prettier'
    output = subprocess.run(
        [prettier, '--parser', 'typescript'],
        input=build(),
        text=True,
        capture_output=True,
        check=True,
    ).stdout
    if '--check' in sys.argv:
        raise SystemExit(0 if MODULE.read_text() == output else 1)
    MODULE.write_text(output)
