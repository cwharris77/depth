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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--font', required=True)
    ap.add_argument('--font-number', type=int, default=0)
    ap.add_argument('--size', type=float, default=38)
    ap.add_argument('--center-x', type=float, default=294)
    ap.add_argument('--baseline-y', type=float, default=520)
    ap.add_argument('--tracking', type=float, default=0)
    args = ap.parse_args()
    font = load_font(args.font, args.font_number)
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = args.size / font['head'].unitsPerEm
    glyphs = [glyphset[cmap[ord(char)]] for char in args.text]
    advances = [glyph.width * scale for glyph in glyphs]
    x = args.center_x - (sum(advances) + args.tracking * (len(glyphs) - 1)) / 2
    paths = []
    for glyph, advance in zip(glyphs, advances):
        pen = SVGPathPen(glyphset)
        glyph.draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, args.baseline_y)))
        paths.append(pen.getCommands())
        x += advance + args.tracking
    print(''.join(paths))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
