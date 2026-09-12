"""Generate the Commanders helmet mark from the supplied standalone SVG (DEP-473)."""

from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from drawkit import main  # noqa: E402

REF = Path('/Users/cwharris/Downloads/decal_svgs/commanders_w.svg')
MODULE = Path(__file__).resolve().parents[2] / 'lib/uniforms/teams/commanders-decal.ts'
TOKEN = re.compile(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
PATH = re.compile(r'<path\b(?P<attrs>[^>]*)/>')
ATTR = re.compile(r'(?P<name>transform|d|fill)="(?P<value>[^"]+)"')
TRANSLATE = re.compile(r'translate\(([-+]?\d+(?:\.\d+)?)(?:[, ]+([-+]?\d+(?:\.\d+)?))?\)')

# The GUD helmet composite measures the existing mark envelope at x=336..592, y=143..274.
X0, Y0, W, H = 336.0, 143.0, 256.0, 131.0
SOURCE_X0, SOURCE_Y0, SOURCE_W, SOURCE_H = 34.0, 67.0, 1892.0, 946.0


def placed_path(source: str, tx: float, ty: float) -> str:
    tokens, i, command, x, y = TOKEN.findall(source), 0, '', 0.0, 0.0
    out = []

    def read():
        nonlocal i
        value = float(tokens[i])
        i += 1
        return value

    def point(px, py):
        return (X0 + ((px + tx) - SOURCE_X0) * W / SOURCE_W,
                Y0 + ((py + ty) - SOURCE_Y0) * H / SOURCE_H)

    def emit(kind, px, py):
        qx, qy = point(px, py)
        out.append(f'{kind}{qx:.3f},{qy:.3f}')

    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
            if command in 'Zz':
                out.append('Z')
                continue
        if command in 'MmLl':
            relative = command.islower()
            first = True
            while i < len(tokens) and not tokens[i].isalpha():
                nx, ny = read(), read()
                x, y = (x + nx, y + ny) if relative else (nx, ny)
                emit('M' if command in 'Mm' and first else 'L', x, y)
                first = False
            continue
        if command in 'HhVv':
            relative = command.islower()
            while i < len(tokens) and not tokens[i].isalpha():
                if command in 'Hh':
                    nx = read(); x = x + nx if relative else nx
                else:
                    ny = read(); y = y + ny if relative else ny
                emit('L', x, y)
            continue
        raise ValueError(f'unsupported SVG command {command!r}')
    return ' '.join(out)


def build():
    paths = []
    for match in PATH.finditer(REF.read_text()):
        attrs = dict(ATTR.findall(match.group('attrs')))
        if attrs.get('fill') not in ('#FEFDFD', '#591513'):
            continue
        transform = TRANSLATE.fullmatch(attrs.get('transform', 'translate(0)'))
        if transform is None:
            raise ValueError(f'unsupported transform: {attrs.get("transform")}')
        d = attrs['d']
        if attrs.get('fill') == '#FEFDFD':
            # The source's first subpath is a white page rectangle; keep only the W silhouette.
            d = 'm1926' + d.split('zm1926', 1)[1]
        paths.append(placed_path(d, float(transform.group(1)), float(transform.group(2) or 0)))
    if len(paths) != 5:
        raise ValueError(f'expected five mark paths, found {len(paths)}')
    return {'COMMANDERS_DECAL_OUTER_PATH': paths[0], 'COMMANDERS_DECAL_INNER_PATH': ' '.join(paths[1:])}


if __name__ == '__main__':
    main(build, MODULE)
