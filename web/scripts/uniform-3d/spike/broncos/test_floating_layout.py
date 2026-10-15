import unittest

from floating_layout import offsets


class FloatingLayoutTests(unittest.TestCase):
    def test_gaps_move_groups_without_changing_jersey(self):
        bounds = {
            'jersey': (1.0, 1.6),
            'pants': (.5, 1.1),
            'socks': (.0, .4),
            'helmet': (1.65, 1.9),
        }
        layout = {'jersey_pants_overlap': .1, 'pants_socks_gap': .08, 'helmet_jersey_gap': .05}
        shifts = offsets(bounds, layout)
        self.assertAlmostEqual(shifts['pants'], 0)
        self.assertAlmostEqual(shifts['socks'], .02)
        self.assertAlmostEqual(shifts['helmet'], 0)


if __name__ == '__main__':
    unittest.main()
