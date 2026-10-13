#!/usr/bin/env python3
"""Outline a deterministic wordmark using a fixed font asset."""
from __future__ import annotations

import argparse

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTCollection, TTFont
from fontTools.misc.transform import Transform


def load_font(path: str, index: int):
    if path.endswith('.ttc'):
        return TTCollection(path).fonts[index]
    return TTFont(path)


class PairPathPen(SVGPathPen):
    """Writes every segment as explicit x,y pairs rounded to two places, with no H/V shorthand."""

    @staticmethod
    def _pair(pt):
        return '%s,%s' % (round(pt[0], 2), round(pt[1], 2))

    def _moveTo(self, pt):
        self._commands.append('M' + self._pair(pt))

    def _lineTo(self, pt):
        self._commands.append('L' + self._pair(pt))

    def _qCurveToOne(self, pt1, pt2):
        self._commands.append('Q%s %s' % (self._pair(pt1), self._pair(pt2)))

    def _curveToOne(self, pt1, pt2, pt3):
        self._commands.append('C%s %s %s' % (self._pair(pt1), self._pair(pt2), self._pair(pt3)))

    def getCommands(self):
        return ' '.join(self._commands)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--font', required=True)
    ap.add_argument('--font-number', type=int, default=0)
    ap.add_argument('--size', type=float, default=38)
    ap.add_argument('--center-x', type=float, default=294)
    ap.add_argument('--baseline-y', type=float, default=520)
    ap.add_argument('--tracking', type=float, default=0)
    # Horizontal stretch about the centre, for numerals wider than the font draws them.
    ap.add_argument('--x-scale', type=float, default=1)
    # Emit only M/L/Q/C/Z with explicit x,y pairs, as jersey numeral glyphs require.
    ap.add_argument('--pairs', action='store_true')
    args = ap.parse_args()
    font = load_font(args.font, args.font_number)
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = args.size / font['head'].unitsPerEm
    glyphs = [glyphset[cmap[ord(char)]] for char in args.text]
    advances = [glyph.width * scale * args.x_scale for glyph in glyphs]
    x = args.center_x - (sum(advances) + args.tracking * (len(glyphs) - 1)) / 2
    paths = []
    for glyph, advance in zip(glyphs, advances):
        pen = PairPathPen(glyphset) if args.pairs else SVGPathPen(glyphset)
        transform = Transform(scale * args.x_scale, 0, 0, -scale, x, args.baseline_y)
        glyph.draw(TransformPen(pen, transform))
        paths.append(pen.getCommands())
        x += advance + args.tracking
    print(''.join(paths))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
