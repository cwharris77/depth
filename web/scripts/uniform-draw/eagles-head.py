"""Extract ordered, absolute paths from a standalone eagle-head SVG."""

import argparse
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('svg', type=Path)
args = parser.parse_args()
root = ET.parse(args.svg).getroot()
slots = {'white': 'white', '#004851': 'logoGreen', 'black': 'black', '#A2AAAD': 'logoSilver'}
paths = []
for element in root:
    if element.tag.rsplit('}', 1)[-1] != 'path':
        raise ValueError('Expected only standalone path elements')
    if element.get('transform') or element.get('stroke'):
        raise ValueError('Transforms and strokes must be flattened before extraction')
    d = element.attrib['d']
    if set(re.findall(r'[A-Za-z]', d)) - set('MLCZ'):
        raise ValueError('Expected absolute move, line, cubic and close commands')
    paths.append({'slot': slots[element.attrib['fill']], 'd': d})
if len(paths) != 5:
    raise ValueError('Expected the five ordered eagle-head paint layers')
print("import { boundsOf, type Mark } from '../../core/marks';\n")
print('export const EAGLES_HEAD_PALETTE = { logoGreen: \'#004851\', logoSilver: \'#A2AAAD\' };\n')
print('export const EAGLES_HEAD_MARK: Mark<\'white\' | \'logoGreen\' | \'black\' | \'logoSilver\'> = {')
print('  box: boundsOf(' + json.dumps(paths[0]['d']) + '),')
print('  paths: ' + json.dumps(paths, indent=2) + ',\n};')
