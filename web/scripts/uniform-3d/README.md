# uniform-3d

Builds a 3D player model (jersey, pants, socks, cleats, helmet with facemask) and dresses it in one kit from a JSON spec. Every garment keeps one fixed UV layout, so a kit is only textures painted into those layouts: the cloth simulation and helmet fitting run once, and each kit after that is a paint and render pass.

Nothing generated is committed. Source meshes and every output live under `build/`, which is ignored.

The pipeline is paused at the Rams kit, which is the only verified one. [`spike/broncos/`](spike/broncos/README.md) archives an unfinished attempt to generalize the painter; nothing here uses it.

## Requirements

- Blender 5.2 (`/Applications/Blender.app/Contents/MacOS/Blender`, called `Blender` below)
- ImageMagick 7 (`magick`) for glyph and font masks
- Xcode command line tools (`swiftc`): `paint.py` compiles `text_mask.swift` into `build/text_mask` the first time a kit uses a font by PostScript name. It renders installed system fonts through CoreText, which reaches faces inside `.ttc` collections that ImageMagick can't select.
- A Python 3 with `numpy scipy trimesh networkx` for `assemble_helmet.py` only. Blender's bundled Python runs everything else.

## Source models

Download and unzip these into `3d/sources/` at the root of the main checkout. Git ignores that folder, and worktrees find it through git's common dir. Set `UNIFORM_3D_SOURCES` to use another folder. Reference photos for authoring kits go in `3d/references/`, which is also ignored.

| Folder | Model |
|---|---|
| `american-football-player/source/3x.fbx` | "American Football Player" by Stuffed Dog Digital, https://sketchfab.com/3d-models/american-football-player-10bf41a1c05a4c9cb74676b7dd8cb18e. It provides the rigged body, jersey, pants, cleats and chinstrap. |
| `Speedflex+decon+shell_stls/` | SpeedFlex replica print files by wahchs, https://makerworld.com/en/models/1344559. They provide the shell sections, facemask, clips, washers and screws. |

## Run

From this folder:

```bash
python3 assemble_helmet.py                                        # build/speedflex.glb, ~10 s
Blender -b --python fuse_helmet.py                                # build/speedflex-fused.glb, ~1 min
Blender -b --python base.py                                       # build/base.blend, ~30 s
Blender -b --python dress.py -- kits/rams-royal-home-2026.json    # Workbench previews, ~40 s
Blender -b --python dress.py -- kits/rams-royal-home-2026.json --final
```

The first three steps run once. After that, a kit is only a `dress.py` run. `--final` renders with Cycles and also writes `uniform-floating.glb`, `uniform-equipped.glb`, a packed `<kit id>.blend` and `uv-layout-{jersey,pants,helmet}.png` into `build/out/<kit id>/`.

## Pipeline

1. `assemble_helmet.py` places the replica's print-bed shell sections. It registers each section onto its neighbour by the planar cut faces they share (rigid ICP, no scaling) and stands the facemask upright.
2. `fuse_helmet.py` turns the sections into one continuous shell: a 0.65 mm voxel remesh, a light smooth, then decimation to 15 %.
3. `base.py` builds the base:
   - It poses the player hands-on-hips and scales them to 1.86 m.
   - It thickens the quad-based jersey and settles it with a cloth simulation. The forearms and hands are left out of the collider so the arms can't knot the jersey sides.
   - It sews the side seams the source leaves open, by welding open edges from different UV pieces on the same side.
   - It deletes the belt faces from the pants.
   - It seats the fused helmet's facemask on the shell's four screw holes with the package's own clip parts (`helmet.py`).
   - It box-unwraps the shell and re-seats the chinstrap.
   - It names each role's material `kit <role>`, so `dress.py` can find them, and stores the jersey's pre-simulation positions as the `rest` attribute, which the painter projects from so cloth folds don't distort the art.
4. `dress.py` opens `build/base.blend`. It calls `paint.py` to paint the jersey, pants and helmet textures from the kit spec, sets the materials (knit normal maps and a helmet clear coat in final renders), then renders and exports.

## Kit spec

`kits/<kit id>.json` holds everything team-specific. A kit is drawn from reference photos, so it covers views (the back, the sleeve cap, the helmet sides) that the 2D archive art doesn't. It reuses the 2D archive by reference instead of copying it:

- `palette.from: "web/lib/uniforms/teams/<team>/parts.ts#<EXPORT>"` reads that palette object. `palette.extra` adds colours the 2D palette doesn't have.
- `jersey.number.glyph: "web/lib/uniforms/teams/<team>/marks/numbers.ts#<EXPORT>"` rasterises that SVG path.

Those exports must be plain literals (`'#RRGGBB'` strings, or a string path), because `paint.ts_export` reads them with a regex instead of evaluating the TypeScript.

Each field is placed in a frame that belongs to the garment, not the team, so one kit file fits any base built by `base.py`:

| Field | Frame |
|---|---|
| Jersey `number`, `name` | Straight-on projection. Heights are fractions of the jersey length below the shoulder top. |
| Jersey `sleeve_cap` | Polar frame centred on the cap, unrolled to the shoulder close-up's pixel scale (cap radius = 385 px), y up. |
| Pants `stripes` | Arc length in metres from the outer seam line, positive toward the back. |
| Helmet `horn` | Polar frame about the ear hole, angles from straight forward (90 is the crown). `radius` and `width` are `[angle, metres]` control points. `shrink_from`, `shrink_full` and `clearance` pull the horn in where the shell silhouette narrows. |
| Helmet `crown_band`, `bumper` | Straight-on projection centred on the brow. The brow is found by a ray walk down the front of the shell. |

To add a kit, copy the Rams file, change its `id` and fields, and iterate with preview runs. Compare each render against the reference photos one view at a time (`jersey-front`, `sleeve-left`, `helmet-side`, and so on).
