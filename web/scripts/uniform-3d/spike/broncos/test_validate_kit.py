import json
import tempfile
import unittest
from pathlib import Path

from validate_kit import validate_kit


HERE = Path(__file__).parent
BRONCOS = HERE / 'kits/broncos-orange-alt-orange-socks-2024.json'


class ValidateKitTests(unittest.TestCase):
    def test_rams_legacy_kit_passes(self):
        validate_kit(HERE / 'kits/rams-royal-home-2026.json')

    def test_missing_glyph_export_fails(self):
        kit = json.loads((HERE / 'kits/rams-royal-home-2026.json').read_text())
        kit['jersey']['number']['glyph'] += '_MISSING'
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'glyph'):
                validate_kit(path)

    def test_bad_palette_fails(self):
        kit = json.loads((HERE / 'kits/rams-royal-home-2026.json').read_text())
        kit['palette']['extra']['yellowShade'] = 'yellow'
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'palette'):
                validate_kit(path)

    def test_missing_required_section_fails(self):
        kit = json.loads((HERE / 'kits/rams-royal-home-2026.json').read_text())
        del kit['helmet']
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'missing helmet'):
                validate_kit(path)

    def test_broncos_kit_passes(self):
        validate_kit(BRONCOS)

    def test_band_edges_must_be_sorted(self):
        kit = json.loads(BRONCOS.read_text())
        kit['jersey']['sleeve_cap']['bands'][0]['top'].reverse()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'sorted by X'):
                validate_kit(path)

    def test_bands_require_seam(self):
        kit = json.loads(BRONCOS.read_text())
        del kit['jersey']['sleeve_cap']['seam_psi']
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'seam_psi'):
                validate_kit(path)

    def test_logo_layers_require_real_svg_exports(self):
        kit = json.loads(BRONCOS.read_text())
        kit['helmet']['side_decal']['layers'][0]['glyph'] = 'web/lib/uniforms/teams/broncos/marks/paths.ts#MISSING'
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'MISSING'):
                validate_kit(path)

    def test_logo_box_must_ascend(self):
        kit = json.loads(BRONCOS.read_text())
        kit['helmet']['side_decal']['box']['top'] = [0.5, 0.2]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'bad.json'
            path.write_text(json.dumps(kit))
            with self.assertRaisesRegex(ValueError, 'box.top'):
                validate_kit(path)


if __name__ == '__main__':
    unittest.main()
