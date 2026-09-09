"""Regenerate Ravens helmet paths from the supplied 2026_Baltimore.svg.

    python3 scripts/uniform-draw/ravens_decal.py
    python3 scripts/uniform-draw/ravens_decal.py --check

The supplied vector is the approved, trademarked club-mark source and remains outside the
repository at ``~/Downloads/2026_Baltimore.svg``. This generator reads its SVG paths directly:
there is no rasterization, contour tracing, or simplification. It applies only the measured
uniform scale and translation into the raw helmet coordinate space, then emits the original path
layers in their original paint order.

Reference: the current GUD Ravens composite is used only to measure the black-shell placement.
The source art bbox is x=326..1773, y=677..1354; it maps uniformly to x=330..641,
y=130..275.5 (scale 311 / 1447, 0 degrees rotation). This keeps the decal within the visible
front-facing shell. The source has 16 non-background paths: purple body regions, black cuts,
gold keyline and B regions, white beak regions, and one gold eye-ring path. The eye ring is
path 12 and is rendered red in the parts definition; its black pupil remains the source path
beside it. Do not select the white SVG backdrop, helmet shell, or facemask as decal geometry.

``drawkit.main`` owns ``--check``. The generated literals are mechanically copied into
``lib/uniforms/teams/ravens-decal.ts`` and checked byte-for-byte.
"""

from __future__ import annotations

import re
import sys
from collections import OrderedDict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import main  # noqa: E402

REF = Path.home() / 'Downloads' / '2026_Baltimore.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'ravens-decal.ts'
SOURCE_X0, SOURCE_Y0 = 326.0, 677.0
TARGET_X0, TARGET_Y0 = 330.0, 130.0
SCALE = 311.0 / 1447.0
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
PATH = re.compile(r'<path\b(?P<attrs>[^>]*)/>')
ATTR = re.compile(r'(?P<name>transform|d|fill)="(?P<value>[^"]+)"')
TRANSLATE = re.compile(r'translate\(([-+]?\d+(?:\.\d+)?)(?:[, ]+([-+]?\d+(?:\.\d+)?))?\)')


def number(token: str) -> float:
    return float(token)


def point(x: float, y: float) -> tuple[float, float]:
    return (TARGET_X0 + (x - SOURCE_X0) * SCALE, TARGET_Y0 + (y - SOURCE_Y0) * SCALE)


def transformed_path(source: str, tx: float, ty: float) -> str:
    """Convert the supplied move/line-only SVG path to placed absolute commands."""
    tokens = TOKEN.findall(source)
    i = 0
    command = ''
    x = y = start_x = start_y = 0.0
    out: list[str] = []

    def read() -> float:
        nonlocal i
        value = number(tokens[i])
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


def build():
    paths: OrderedDict[str, str] = OrderedDict()
    for attrs_match in PATH.finditer(REF.read_text()):
        attrs = dict(ATTR.findall(attrs_match.group('attrs')))
        if attrs.get('transform') == 'translate(0)':
            continue
        translate = TRANSLATE.fullmatch(attrs['transform'])
        if translate is None:
            raise ValueError(f'Unsupported SVG transform {attrs["transform"]!r}')
        tx, ty = number(translate.group(1)), number(translate.group(2) or '0')
        index = len(paths) + 1
        paths[f'RAVENS_DECAL_SVG_{index:02}_PATH'] = transformed_path(attrs['d'], tx, ty)
    if len(paths) != 16:
        raise ValueError(f'Expected 16 non-background SVG paths, found {len(paths)}')
    return paths


if __name__ == '__main__':
    main(build, MODULE)
