# 3D kit template

Each kit is one JSON file in `kits/`. Copy the closest existing kit, set a unique lowercase `id`, and run `python3 validate_kit.py kits/<id>.json` before Blender. The validator checks required fields, palette values and glyph exports without opening `base.blend`.

The palette should point to the matching 2D team's literal `parts.ts` palette. Add only colors absent there under `palette.extra`; note any inferred color in the kit's references or TODOs. A number should use the archive's `marks/numbers.ts` SVG export when available. `font` and `text` remain supported for a documented placeholder.

## Garment frames

| Field | Frame and units |
| --- | --- |
| `jersey.number.front/back`, `jersey.name`, `jersey.chest_wordmark` | `top` and `height` are fractions of the jersey length below the shoulder top. `chest_wordmark.glyph` takes an archive SVG export in place of `font` and `text`. |
| `jersey.sleeve_cap.rim_band`, `crescent` | Shared sleeve-cap polar frame, unrolled to the 385 px photo scale (X toward the front on both caps, Y up). |
| `jersey.sleeve_cap.bands` | Each band lies between a `top` and a `bottom` edge, each a polyline of `[X, Y]` points in that frame sorted by X, painted up to the armhole at `seam_psi` degrees from the deltoid point. On this base the shoulder top sits near Y 261 and the outer hem lip near Y -500, so map a photo's top-to-hem span onto that range. |
| `jersey.sleeve_cap.mark` | Swoosh `color`, `centre` and `size` in the same frame, placed at the same spot on both caps and reading left to right in each cap's own side view. Legacy `sleeve_cap.swoosh` keeps the Rams placement, whose centre X changes sign between the caps. |
| `pants.stripes` | `from` and `to` are arc lengths in metres from the outside seam, positive toward the back. `until: [a, b]` ends the stripe partway down the leg on a slanted cut, at drop `a` along `from` and `b` along `to` (drop 0 is the waistband's top edge, 1 the hem). |
| `pants.side_text` | Text runs down the outer seam, centred at drop `at` (or `top`, a fraction of the hip-to-knee axis) and `arc` metres from the seam; `length` and `height` are metres. |
| `pants.manufacturer_mark` | Front swoosh on one hip: `side` 1 is the wearer's left. `centre` is metres out from the centre line and down from the waist; `size` is metres. |
| `helmet.side_decal` | `type: horn` uses polar `radius` and `width` tables. `type: logo` paints archive SVG `layers` in order by straight side projection, placed by `box`: `back` and `top` fraction pairs of the shell's side silhouette, measured on a side photo from the back and from the top. The far side reads mirrored so the logo faces forward on both. |
| `helmet.crown_triangle_stripe` | Two strips of staggered triangles, `gap` metres either side of the centre line and `width` metres wide, from `from_deg` (straight back is 0) to `to_deg` (90 is the crown). `taper` shortens each strip's ends per metre outward; `pitch` is the column and row spacing in metres, and `base` and `height` are each triangle's share of its cell. |
| `helmet.bumper` | Front projection about the measured brow, in metres. |
| `floating_layout` | `jersey_pants_overlap`, `pants_socks_gap` and `helmet_jersey_gap` are metres; adjust one value to move its garment group while preserving the current kit's other gaps. |

Use `jersey.number.outline` for an outer stroke and `inline` for an inset stroke. `jersey.collar_mark.type: triangle` draws a summit-marker triangle; `collar_shield: true` retains the legacy league shield. These are separate options so the Rams kit keeps its original paths.

The renderer writes review PNGs, textures, one floating GLB and a packed floating-only blend to ignored `build/out/<id>/`. Keep source photos outside the repository and link them in `references`. Check the side view with [SIDE_PROFILE_METHOD.md](SIDE_PROFILE_METHOD.md), then adjust one JSON parameter at a time. The Broncos kit lists the references each measurement came from and keeps explicit TODOs for marks whose source or placement has not been verified.
