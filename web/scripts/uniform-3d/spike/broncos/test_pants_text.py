"""Checks the 5280 print on the actual pants surface."""

import json
import sys
import unittest
from pathlib import Path

import bpy
import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import paint


class PantsTextTests(unittest.TestCase):
    def test_5280_ink_reaches_pants_texture(self):
        bpy.ops.wm.open_mainfile(filepath=str(HERE / 'build/base.blend'))
        kit = json.loads((HERE / 'kits/broncos-orange-alt-orange-socks-2024.json').read_text())
        kit['pants']['side_text'] = {
            'text': '5280', 'font': 'AvenirNext-HeavyItalic', 'color': '#B8B8B8',
            'top': .3, 'length': .1, 'height': .018,
        }
        jersey = bpy.data.objects['jersey_garment']
        legs = np.array(jersey['legs']).reshape(2, 2, 3)
        image = paint.paint_pants(bpy.data.objects['pants'], kit, paint.palette(kit), legs, HERE / 'build/test-pants-text.png')
        pixels = np.array(image.pixels[:], np.float32).reshape(-1, 4)[:, :3]
        grey = np.array([184, 184, 184]) / 255
        self.assertGreater(np.count_nonzero(np.linalg.norm(pixels - grey, axis=1) < .04), 100)

    def test_stripe_does_not_paint_waist_above_leg_axis(self):
        bpy.ops.wm.open_mainfile(filepath=str(HERE / 'build/base.blend'))
        kit = json.loads((HERE / 'kits/broncos-orange-alt-orange-socks-2024.json').read_text())
        for mark in ('manufacturer_mark', 'side_text'):   # only the stripes are under test
            kit['pants'].pop(mark, None)
        jersey = bpy.data.objects['jersey_garment']
        pants = bpy.data.objects['pants']
        legs = np.array(jersey['legs']).reshape(2, 2, 3)
        image = paint.paint_pants(pants, kit, paint.palette(kit), legs, HERE / 'build/test-pants-waist.png')
        positions, _, hit = paint.texels(pants, 2048, 2048)
        pixels = np.array(image.pixels[:], np.float32).reshape(2048, 2048, 4)[..., :3]
        waist = hit & (positions[..., 2] > legs[:, 0, 2].max() + .002)
        self.assertEqual(np.count_nonzero(waist & (np.linalg.norm(pixels - 1, axis=2) > .1)), 0)


if __name__ == '__main__':
    unittest.main(argv=['test_pants_text.py'])
