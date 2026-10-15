# Broncos spike (archived)

Spike code, not production. Nothing here is imported by the pipeline in the parent folder, which stays on the Rams-verified `paint.py` and `dress.py`.

This folder holds an unfinished generalization of the painter that was tried on the Broncos orange alternate with orange socks:

- `paint.py`, `dress.py`: replace the parent files. They add layered sleeve-cap `bands` with a sleeve `mark`, a chest wordmark from an SVG glyph, slanted pant-stripe ends (`until`), pants `side_text` and `manufacturer_mark`, a three-layer helmet `logo` placed by a side-silhouette box, and a crown triangle stripe. Rams kit output is unchanged apart from anti-aliased numeral edges.
- `floating_layout.py`: the jersey, pants, socks and helmet gaps for the floating-only export.
- `validate_kit.py`: checks a kit file without opening Blender.
- `kits/broncos-orange-alt-orange-socks-2024.json`: the kit, with the references each measurement came from and a `todo` list of what is still estimated.
- `TEMPLATE.md`, `SIDE_PROFILE_METHOD.md`: the field frames and the side-view sourcing rules.
- `test_*.py`: unit tests for the validator, band and triangle geometry, floating layout and pants text.

The weak points are the marks that wrap the shoulder cap (they cross UV seams on a doubly curved surface where the base has few texels), the procedural fabric, and placement that depends on measurements taken by hand from photos.

To run it, copy these files over the parent folder (keeping `kits/rams-royal-home-2026.json` there, which the tests use), then follow the parent README.
