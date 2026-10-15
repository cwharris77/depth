"""Validate a uniform kit before starting Blender."""

import json
import re
import sys
from pathlib import Path


HERE = Path(__file__).parent
REPO = HERE.parents[2]
HEX = re.compile(r'^#[0-9A-Fa-f]{6}$')


def export(ref, label):
    if not isinstance(ref, str) or ref.count('#') != 1:
        raise ValueError(f'{label}: expected path#EXPORT')
    name, symbol = ref.split('#')
    path = (REPO / name).resolve()
    if not path.is_relative_to(REPO) or not path.is_file():
        raise ValueError(f'{label}: missing source {name}')
    source = path.read_text()
    match = re.search(rf'export const {re.escape(symbol)}\b[^=]*=\s*', source)
    if not match:
        raise ValueError(f'{label}: missing export {symbol}')
    return source[match.end():]


def required(value, keys, label):
    if not isinstance(value, dict):
        raise ValueError(f'{label}: expected object')
    for key in keys:
        if key not in value:
            raise ValueError(f'{label}: missing {key}')


def validate_kit(path):
    path = Path(path)
    kit = json.loads(path.read_text())
    required(kit, ('id', 'palette', 'jersey', 'pants', 'socks', 'helmet'), 'kit')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', kit['id']):
        raise ValueError('kit.id: expected lowercase slug')
    palette = kit['palette']
    required(palette, (), 'palette')
    colors = {}
    if 'from' in palette:
        source = export(palette['from'], 'palette.from')
        if not source.startswith('{') or '}' not in source:
            raise ValueError('palette.from: expected literal object')
        colors.update(re.findall(r"(\w+):\s*'([^']*)'", source[:source.index('}')]))
        colors = dict(colors)
    colors.update(palette.get('extra', {}))
    if not colors:
        raise ValueError('palette: no colors')
    for name, color in colors.items():
        if not isinstance(color, str) or not HEX.fullmatch(color):
            raise ValueError(f'palette.{name}: expected #RRGGBB')

    def color(value, label):
        if value not in colors and (not isinstance(value, str) or not HEX.fullmatch(value)):
            raise ValueError(f'{label}: unknown palette color {value!r}')

    jersey, pants, socks, helmet = (kit[name] for name in ('jersey', 'pants', 'socks', 'helmet'))
    for label, part in (('jersey', jersey), ('pants', pants)):
        required(part, ('body',), label)
        color(part['body'], f'{label}.body')
    required(socks, ('color',), 'socks')
    color(socks['color'], 'socks.color')
    required(helmet, ('shell', 'facemask'), 'helmet')
    color(helmet['shell'], 'helmet.shell')
    color(helmet['facemask'], 'helmet.facemask')
    for label in ('number', 'name'):
        required(jersey.get(label), ('fill', 'front', 'back') if label == 'number' else ('text', 'font', 'color', 'top', 'height'), f'jersey.{label}')
    number = jersey['number']
    color(number['fill'], 'jersey.number.fill')
    if 'glyph' in number:
        value = export(number['glyph'], 'jersey.number.glyph').lstrip()
        if not re.match(r"['\"]M[\d.,\sA-Za-z-]+['\"]", value):
            raise ValueError('jersey.number.glyph: expected SVG path string')
    elif not (number.get('font') and number.get('text')):
        raise ValueError('jersey.number: requires glyph or font and text')
    for side in ('front', 'back'):
        required(number[side], ('top', 'height'), f'jersey.number.{side}')
    for kind in ('inline', 'outline'):
        if kind in number:
            required(number[kind], ('color', 'width'), f'jersey.number.{kind}')
            color(number[kind]['color'], f'jersey.number.{kind}.color')
    color(jersey['name']['color'], 'jersey.name.color')
    for stripe in pants.get('stripes', []):
        required(stripe, ('color', 'from', 'to'), 'pants.stripe')
        color(stripe['color'], 'pants.stripe.color')
        if stripe['from'] >= stripe['to']:
            raise ValueError('pants.stripe: from must be below to')
        if 'until' in stripe and not (len(stripe['until']) == 2 and all(0 < v <= 1 for v in stripe['until'])):
            raise ValueError('pants.stripe.until: expected two drops in (0, 1]')
    if 'side_text' in pants:
        text = pants['side_text']
        required(text, ('text', 'font', 'color', 'length', 'height'), 'pants.side_text')
        color(text['color'], 'pants.side_text.color')
        if ('at' in text) == ('top' in text):
            raise ValueError('pants.side_text: expected exactly one of at or top')
    if 'manufacturer_mark' in pants:
        nike = pants['manufacturer_mark']
        required(nike, ('color', 'centre', 'size', 'side'), 'pants.manufacturer_mark')
        color(nike['color'], 'pants.manufacturer_mark.color')
        if nike['side'] not in (-1, 1) or len(nike['centre']) != 2 or len(nike['size']) != 2 or min(nike['size']) <= 0:
            raise ValueError('pants.manufacturer_mark: invalid placement')
    if 'chest_wordmark' in jersey:
        wordmark = jersey['chest_wordmark']
        required(wordmark, ('color', 'top', 'height'), 'jersey.chest_wordmark')
        color(wordmark['color'], 'jersey.chest_wordmark.color')
        if 'glyph' in wordmark:
            export(wordmark['glyph'], 'jersey.chest_wordmark.glyph')
        elif not (wordmark.get('font') and wordmark.get('text')):
            raise ValueError('jersey.chest_wordmark: requires glyph or font and text')
    cap = jersey.get('sleeve_cap', {})
    if 'color' in cap:
        color(cap['color'], 'jersey.sleeve_cap.color')
    elif {'rim_band', 'crescent'} & cap.keys():
        raise ValueError('jersey.sleeve_cap: rim_band and crescent need color')
    if ('bands' in cap or 'mark' in cap) and 'seam_psi' not in cap:
        raise ValueError('jersey.sleeve_cap: bands and mark need seam_psi')
    for band in cap.get('bands', []):
        required(band, ('color', 'top', 'bottom'), 'jersey.sleeve_cap.band')
        color(band['color'], 'jersey.sleeve_cap.band.color')
        for edge in ('top', 'bottom'):
            xs = [point[0] for point in band[edge]]
            if len(xs) < 2 or any(len(point) != 2 for point in band[edge]) or xs != sorted(xs):
                raise ValueError(f'jersey.sleeve_cap.band.{edge}: expected [X, Y] points sorted by X')
    for key in ('mark', 'swoosh'):
        if key in cap:
            required(cap[key], ('color', 'centre', 'size'), f'jersey.sleeve_cap.{key}')
            color(cap[key]['color'], f'jersey.sleeve_cap.{key}.color')
    if 'side_decal' in helmet:
        decal = helmet['side_decal']
        required(decal, ('type',), 'helmet.side_decal')
        if decal['type'] not in ('horn', 'logo'):
            raise ValueError('helmet.side_decal: unknown type')
        if decal['type'] == 'logo':
            required(decal, ('layers', 'box'), 'helmet.side_decal')
            if not decal['layers']:
                raise ValueError('helmet.side_decal.layers: empty')
            for layer in decal['layers']:
                required(layer, ('glyph', 'color'), 'helmet.side_decal.layer')
                export(layer['glyph'], 'helmet.side_decal.layer.glyph')
                color(layer['color'], 'helmet.side_decal.layer.color')
            for axis in ('back', 'top'):
                lo, hi = decal['box'].get(axis, (None, None))
                if lo is None or not 0 <= lo < hi <= 1:
                    raise ValueError(f'helmet.side_decal.box.{axis}: expected two ascending fractions')
    if 'crown_triangle_stripe' in helmet:
        stripe = helmet['crown_triangle_stripe']
        keys = ('color', 'gap', 'width', 'from_deg', 'to_deg', 'taper', 'pitch', 'base', 'height')
        required(stripe, keys, 'helmet.crown_triangle_stripe')
        color(stripe['color'], 'helmet.crown_triangle_stripe.color')
        if stripe['from_deg'] >= stripe['to_deg'] or stripe['width'] <= 0 or min(stripe['pitch']) <= 0:
            raise ValueError('helmet.crown_triangle_stripe: invalid extent')
    return kit


if __name__ == '__main__':
    try:
        validate_kit(sys.argv[1])
    except (IndexError, OSError, ValueError) as exc:
        print(f'KIT_INVALID: {exc}', file=sys.stderr)
        sys.exit(1)
    print('KIT_VALID')
