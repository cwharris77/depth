"""Checks the sleeve-cap band edges and the crown triangle strips on synthetic points."""

import unittest
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from paint import band_alpha, crown_triangles


class SleeveBandTests(unittest.TestCase):
    def test_band_covers_only_between_its_edges(self):
        band = {'top': [[-100, 50], [100, 50]], 'bottom': [[-100, -50], [0, 30], [100, -50]]}
        X = np.array([0, 0, 0, 80, 80])
        Y = np.array([40, 20, 60, -20, -60])
        self.assertEqual(band_alpha(X, Y, band).round().tolist(), [1, 0, 0, 1, 0])


class CrownTriangleTests(unittest.TestCase):
    stripe = {'gap': .004, 'width': .03, 'from_deg': -40, 'to_deg': 100, 'taper': .6,
              'pitch': [.0038, .0032], 'base': .65, 'height': .75}

    def test_strips_sit_beside_the_centre_line_on_the_back(self):
        c = np.zeros(3)
        rows = np.arange(.0, .4, .0032 / 8)   # angles in radians up the back at radius .12
        def hits(x, theta0):
            th = theta0 + rows
            p = np.stack([np.full_like(th, x), .12 * np.cos(th), .12 * np.sin(th)], 1)
            return crown_triangles(p, c, self.stripe).any()
        self.assertTrue(hits(.015, 0) and hits(-.015, 0))
        self.assertFalse(hits(0, 0))      # the centre gap stays shell-coloured
        self.assertFalse(hits(.05, 0))    # outside the strip
        self.assertFalse(hits(.015, -1.4))  # below the start angle, low on the back

if __name__ == '__main__':
    unittest.main(argv=['test_paint_geometry.py'])
