"""Generate the Saints fleur paths directly from the supplied SVG reference.

The supplied 2048px SVG contains four fleur paths: black outer, gold, black inner, and white.
This script applies each path's translation and maps its coordinates into the established raw
helmet envelope (x321..500, y196..372) without rasterizing, tracing, merging, or simplifying it.
The white canvas and grey export-frame artifacts are outside the fleur and deliberately excluded.
"""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

REF = Path('/Users/cwharris/Downloads/decal_svgs/saints_fluer.svg')
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'saints.ts'
BOX = (321, 196, 179, 176)
SVG_NS = '{http://www.w3.org/2000/svg}'
TOKEN = re.compile(r'[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
TRANSLATE = re.compile(r'^translate\(\s*([-+]?\d+(?:\.\d+)?)\s*(?:,?\s*([-+]?\d+(?:\.\d+)?))?\s*\)$')

# The first path is the white canvas; paths 1..4 are the fleur in SVG paint order. Remaining
# paths are the screenshot/export frame at the viewBox edge, not helmet-decal geometry.
DECAL_PATHS = (
    ('SAINTS_DECAL_BLACK_OUTER_PATH', '#010001', 1),
    ('SAINTS_DECAL_GOLD_PATH', '#D1BB8F', 2),
    ('SAINTS_DECAL_BLACK_INNER_PATH', '#010001', 3),
    ('SAINTS_DECAL_WHITE_PATH', '#F9F9F9', 4),
)


def fmt(value: float) -> str:
    return f'{value:.6f}'.rstrip('0').rstrip('.') or '0'


def translation(value: str | None) -> tuple[float, float]:
    match = TRANSLATE.fullmatch(value or '')
    if not match:
        raise ValueError(f'expected translate transform, got {value!r}')
    return float(match.group(1)), float(match.group(2) or 0)


def transform_path(d: str, tx: float, ty: float) -> str:
    tokens = TOKEN.findall(d)
    x = y = 0.0
    start_x = start_y = 0.0
    index = 0
    command: str | None = None
    out: list[str] = []
    sx = BOX[2] / 2048
    sy = BOX[3] / 2048

    def point(raw_x: float, raw_y: float) -> tuple[float, float]:
        return BOX[0] + (raw_x + tx) * sx, BOX[1] + (raw_y + ty) * sy

    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
        if command is None:
            raise ValueError('path begins without a command')
        if command in 'Zz':
            out.append('Z')
            x, y = start_x, start_y
            command = None
            continue
        if command not in 'MmLlHhVv':
            raise ValueError(f'unsupported SVG command {command!r}')
        if index >= len(tokens) or tokens[index].isalpha():
            raise ValueError(f'missing values for SVG command {command!r}')
        if command in 'MmLl':
            raw_x, raw_y = float(tokens[index]), float(tokens[index + 1])
            index += 2
            if command.islower():
                x += raw_x
                y += raw_y
            else:
                x, y = raw_x, raw_y
            px, py = point(x, y)
            if command in 'Mm':
                out.append(f'M{fmt(px)},{fmt(py)}')
                start_x, start_y = x, y
            else:
                out.append(f'L{fmt(px)},{fmt(py)}')
        elif command in 'Hh':
            raw_x = float(tokens[index])
            index += 1
            x = x + raw_x if command == 'h' else raw_x
            px, py = point(x, y)
            out.append(f'L{fmt(px)},{fmt(py)}')
        else:
            raw_y = float(tokens[index])
            index += 1
            y = y + raw_y if command == 'v' else raw_y
            px, py = point(x, y)
            out.append(f'L{fmt(px)},{fmt(py)}')
    return ' '.join(out)


def build() -> dict[str, str]:
    paths = ET.parse(REF).getroot().findall(f'{SVG_NS}path')
    if len(paths) != 11:
        raise ValueError(f'expected 11 source paths, got {len(paths)}')
    result: dict[str, str] = {}
    for name, fill, path_index in DECAL_PATHS:
        path = paths[path_index]
        if path.get('fill') != fill:
            raise ValueError(f'{name}: expected fill {fill}, got {path.get("fill")}')
        tx, ty = translation(path.get('transform'))
        result[name] = transform_path(path.attrib['d'], tx, ty)
    return result


def generated_block() -> str:
    return '\n'.join(f"export const {name} =\n  '{path}';" for name, path in build().items())


def write() -> None:
    source = MODULE.read_text()
    start = '// BEGIN GENERATED SAINTS FLEUR PATHS'
    end = '// END GENERATED SAINTS FLEUR PATHS'
    block = f'''// The source's four fleur paths are transformed directly by saints_fleur.py. The source canvas
// and its export-frame remnants are intentionally not decal geometry; every actual fleur path
// retains its original fill, paint order, and points within the established helmet envelope.
{start}
{generated_block()}
{end}
'''
    if start in source:
        before, remainder = source.split(start, 1)
        _, after = remainder.split(end, 1)
        MODULE.write_text(f'{before}{start}\n{generated_block()}\n{end}{after}')
        return
    updated, count = re.subn(
        r'// The fleur-de-lis,[\s\S]*?(?=// White is a literal)', block, source, count=1
    )
    if count != 1:
        raise ValueError('could not locate existing Saints decal constants')
    MODULE.write_text(updated)


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--write':
        write()
    elif len(sys.argv) == 1:
        print(generated_block())
    else:
        raise SystemExit('usage: saints_fleur.py [--write]')
