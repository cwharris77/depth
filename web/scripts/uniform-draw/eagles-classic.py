"""Extract the classic eagle mark, removing its backdrop and restoring gold accents."""

import argparse
import json
import re
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('svg')
args = parser.parse_args()
root = ET.parse(args.svg).getroot()
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
GOLD_PATHS = {11, 12, 15, 18, 19, 20}


def absolute(d, tx, ty):
    tokens = TOKEN.findall(d)
    i = 0
    command = ''
    x = y = sx = sy = 0
    out = []
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
            if command.lower() == 'z':
                out.append('Z')
                x, y = sx, sy
                continue
        if command.lower() not in {'m', 'l', 'h', 'v'}:
            raise ValueError(f'Unsupported command: {command}')
        a = float(tokens[i])
        i += 1
        if command.lower() in {'m', 'l'}:
            b = float(tokens[i])
            i += 1
            x, y = (x + a, y + b) if command.islower() else (a, b)
        elif command.lower() == 'h':
            x = x + a if command.islower() else a
        else:
            y = y + a if command.islower() else a
        kind = 'M' if command.lower() == 'm' else 'L'
        out.append(f'{kind}{x + tx:g},{y + ty:g}')
        if kind == 'M':
            sx, sy = x, y
            command = 'l' if command.islower() else 'L'
    return ' '.join(out)


palette = {'classicGold': '#FFA40D'}
paths = []
if len(root) != 23 or root[0].get('fill') != '#007040':
    raise ValueError('Expected the supplied 23-path classic mark with green backdrop')
for i, element in enumerate(root):
    if element.tag.rsplit('}', 1)[-1] != 'path':
        raise ValueError('Expected standalone paths')
    if i == 0:
        if element.get('d') != 'm0 0h1596v2e3h-1596z':
            raise ValueError('Unexpected backdrop geometry')
        continue
    transform = element.get('transform', '')
    match = re.fullmatch(r'translate\(([^)]+)\)', transform)
    if not match:
        raise ValueError('Expected translation only')
    xy = [float(n) for n in re.split(r'[, ]+', match[1])]
    tx, ty = xy[0], xy[1] if len(xy) > 1 else 0
    color = element.attrib['fill']
    slot = 'classicGold' if i in GOLD_PATHS else 'classic' + color[1:].upper()
    palette.setdefault(slot, '#FFA40D' if i in GOLD_PATHS else color)
    paths.append({'slot': slot, 'd': absolute(element.attrib['d'], tx, ty)})
print("import { boundsOf, type Mark } from '../../core/marks';\n")
print('export const EAGLES_CLASSIC_PALETTE = ' + json.dumps(palette, indent=2) + ';\n')
print('export const EAGLES_CLASSIC_MARK: Mark<keyof typeof EAGLES_CLASSIC_PALETTE> = {')
print('  box: boundsOf(' + json.dumps(paths[2]['d']) + '),')
print('  paths: ' + json.dumps(paths, indent=2) + ',\n};')
