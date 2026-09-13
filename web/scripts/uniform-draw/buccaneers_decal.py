"""Regenerate Tampa Bay decals from the supplied source SVGs (DEP-481).

The source paths are carried into the renderer directly, in source paint order. Path zero in each
file is a full-canvas white export backdrop, not foreground decal art; every other path and its
exact supplied color is retained. The coordinates are scaled to the helmet envelope measured from
the reference composite, which supplies placement only.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / 'lib/uniforms/teams/buccaneers-decal.ts'
SOURCES = (
    ('BUCCANEERS_FLAG_DECAL_PATHS', Path('/Users/cwharris/Downloads/decal_svgs/bucaneers_flag.svg'), 2048, 2048),
    ('BUCCANEERS_CREAMSICLE_DECAL_PATHS', Path('/Users/cwharris/Downloads/decal_svgs/cucaneers_creamsicle.svg'), 2000, 1126),
)

# The reference composite sets the side-panel decal envelope: x=234..542, y=126..346 in raw
# helmet space.
TARGET_X0, TARGET_Y0, TARGET_WIDTH, TARGET_HEIGHT = 234.0, 126.0, 308.0, 220.0
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
PATH = re.compile(r'<path\b(?P<attrs>[^>]*)/>')
ATTR = re.compile(r'(?P<name>transform|d|fill)="(?P<value>[^"]+)"')
TRANSLATE = re.compile(r'translate\(([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)(?:[, ]+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?))?\)')


def transform_path(source: str, tx: float, ty: float, source_width: int, source_height: int) -> str:
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
        x1 = TARGET_X0 + (px + tx) * TARGET_WIDTH / source_width
        y1 = TARGET_Y0 + (py + ty) * TARGET_HEIGHT / source_height
        out.append(f'{kind}{x1:.3f},{y1:.3f}')

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
                x, y = (x + nx, y + ny) if command == 'm' else (nx, ny)
                if first:
                    start_x, start_y = x, y
                    first = False
                    emit('M', x, y)
                else:
                    emit('L', x, y)
            continue
        if command in 'Ll':
            while i < len(tokens) and not tokens[i].isalpha():
                nx, ny = read(), read()
                x, y = (x + nx, y + ny) if command == 'l' else (nx, ny)
                emit('L', x, y)
            continue
        if command in 'Hh':
            while i < len(tokens) and not tokens[i].isalpha():
                nx = read()
                x = x + nx if command == 'h' else nx
                emit('L', x, y)
            continue
        if command in 'Vv':
            while i < len(tokens) and not tokens[i].isalpha():
                ny = read()
                y = y + ny if command == 'v' else ny
                emit('L', x, y)
            continue
        raise ValueError(f'unsupported SVG command {command!r}')
    return ' '.join(out)


def paths(path: Path, source_width: int, source_height: int, prefix: str) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    for index, match in enumerate(PATH.finditer(path.read_text())):
        if index == 0:
            continue
        attrs = dict(ATTR.findall(match.group('attrs')))
        translate = TRANSLATE.fullmatch(attrs['transform'])
        if translate is None:
            raise ValueError(f'{path.name}: unsupported transform {attrs["transform"]!r}')
        tx, ty = float(translate.group(1)), float(translate.group(2) or '0')
        result.append((transform_path(attrs['d'], tx, ty, source_width, source_height), f'{prefix}-{attrs["fill"][1:].lower()}'))
    return result


def build() -> str:
    lines = [
        '// Generated Buccaneers decal geometry. The source SVG paths and their paint order are',
        '// retained directly; regenerate with scripts/uniform-draw/buccaneers_decal.py.',
        '',
    ]
    for name, path, width, height in SOURCES:
        prefix = 'flag' if 'FLAG' in name else 'creamsicle'
        source_paths = paths(path, width, height, prefix)
        colors = sorted({fill for _, fill in source_paths})
        lines.append(f'export const {name}_COLORS = {{')
        for color in colors:
            lines.append(f"  '{color}': '#{color.rsplit('-', 1)[1].upper()}',")
        lines.extend(['} as const;', ''])
        lines.append(f'export const {name} = [')
        for d, fill in source_paths:
            lines.append(f"  {{ d: '{d}', fill: '{fill}' }},")
        lines.extend(['] as const;', ''])
    return '\n'.join(lines)


if __name__ == '__main__':
    output = subprocess.run(
        [ROOT / 'node_modules/.bin/prettier', '--parser', 'typescript'],
        input=build(),
        text=True,
        capture_output=True,
        check=True,
    ).stdout
    if '--check' in sys.argv:
        raise SystemExit(0 if MODULE.read_text() == output else 1)
    MODULE.write_text(output)
