"""Regenerates the Los Angeles bolts in lib/uniforms/teams/chargers.ts.

    python3 scripts/uniform-draw/chargers_bolt.py            # print the six paths
    python3 scripts/uniform-draw/chargers_bolt.py --check    # verify chargers.ts matches

A CONTOUR TRACE rather than the hand-drawn geometry docs/uniform-hand-drawing.md
produces — see that doc's "second route" section for the procedure and for what
drawkit supplies. Both marks here are broad solid shapes with no fine interior
detail, so the doc's negative-space warning does not apply and a trace is both
stable and closer to the reference than an anchor list would be.

TWO DIFFERENT BOLTS, which is the thing to know before touching this file. The
helmet wears the club's arched logo bolt; the pants wear a straight, symmetric,
double-tapered bolt that is a separate drawing, not the logo rotated. They come
from different references for that reason.

  helmet   Commons `File:Los Angeles Chargers logo.svg`, public domain (the fetch
           row is in nfl-uniform-refs/MARKS-FETCH.json, and gate-check.py clears
           it: 577x233, 1 component, stable under 0.75x).
  pants    the GUD 2025 composite's own leg swatch, because the logo file does
           not contain this bolt at all.

Neither reference is committed here — both live in the sibling nfl-uniform-refs/
checkout. Both references face the way the mannequin does, so nothing is mirrored
for direction; the right leg is the left leg's trace reflected, so the two legs
are one drawing.

Topology, measured rather than assumed (docs step 3). The logo is THREE stacked
shapes — an outer white keyline, a blue keyline, a gold body — and on a white
shell the outer white is invisible, so only two are authored (a navy-shell kit
would need the third). The blue-plus-gold union is ONE component with no enclosed
hole: its 1832px of apparent holes at a 1400px render are the antialiased seam
between the two inks, which is exactly why the keyline is traced from the filled
union and not from the blue alone. The gold body is one component with no holes.
The leg bolt has the same two-part structure. No fill rule anywhere.

Placement (docs step 7) is measured from the GUD 2025 composite, not from the
logo.

  Helmet. The shell silhouette cannot be measured as "everything that is not
  white" — the shell IS white, and the gold facemask sits inside its bounding
  box, which reads the shell 14% too wide. It is measured instead as the largest
  ENCLOSED white region (flood the page white in from the border; what stays is
  the shell interior), giving x15-108, y24-113 on the sheet. The bolt is the blue
  keyline component plus the gold body component, at x23-98, y32-76 — separated
  by colour, because the facemask's gold and the decal's gold are different
  values (255,175,0 against 253,198,64) and the drawn jersey number is the same
  blue as the keyline. That is left 8.6%, width 80.7%, top 9.0%, height 49.4% of
  the shell box.

  The mannequin's own shell silhouette is x139-701.5, y65-637.4 in raw helmet
  space (HELMET_ART_CLIP through HELMET_ART_TRANSFORM), so those four fractions
  transfer to HELMET_BOX. It stretches the logo vertically by about 47%: the flat
  logo is 2.49 aspect and the box is 1.60. That difference is real and not a
  measurement error — a helmet bolt is applied around a curved shell and arches
  far more in side profile than the flat logo does, and this mannequin draws the
  same side profile GUD does (0.98 shell aspect against GUD's 1.05).

  Pants. GUD draws the leg bolt ONLY in the swatch beside each figure, never on
  the figure, whose legs render flat — the trap that shipped Carolina without a
  stripe. The swatch is drawn at the figure's own scale: its box is y283-406 and
  the figure's pants run y284-409. The bolt inside it is 12x104px, so it is 27%
  of a leg (45px below the crotch) and 83% of the pants' height, at 0.115 aspect.

  Those two fractions cannot both hold here, because the mannequin's leg is
  proportionally much longer than GUD's pant panel — the mannequin paints the
  whole leg to the ankle in the pant colour, while GUD's pants stop below the
  knee with socks under them. Width wins, per Box's own rule: take the width from
  the reference and derive the height from the mark's true aspect. 27% of the
  ~130-unit leg is 35 units, so the bolt is 35x304. Matching the height fraction
  instead would have drawn it 62x542, half again as wide against the leg as the
  reference has it.

  The top sits 22% down the leg rather than the reference's 8% because the
  mannequin's leg tapers hard toward the waist — its left edge is x176 at y807
  but x113 by y1050 — and a bolt starting higher has its upper taper clipped off
  square by the leg's own edge. LEG_BOX_RIGHT is LEG_BOX_LEFT reflected about
  x=294, the mannequin's centre (its pants span x113-474 and the generic stripes
  sit 176 units either side of it).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

from drawkit import (  # noqa: E402
    Box,
    crop_to_art,
    fill_holes,
    main,
    mask,
    near,
    render_flat,
    trace,
)

REFS = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/chargers'
MARK = REFS / 'chargers-mark.svg'
SHEET = REFS / 'chargers-current-season-2025.png'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'chargers.ts'

# Render width for the logo trace. 1400 crops to 1346px of art, so one source pixel
# is a third of a unit in the placement box — finer than the renderer resolves.
RENDER = 1400
# The 2025 sheet's left leg swatch, interior only: the box's grey border and the
# gold field's antialiased edge both fall outside this crop, so the bolt is the
# only art in it.
SWATCH = (176, 286, 202, 404)
# The swatch is 26x118 source pixels. Without upsampling, one pixel is three units
# of the placed bolt and every taper stair-steps.
SWATCH_UPSCALE = 8
# Douglas-Peucker tolerance, in the pixels of whichever trace is running. 0.9 on the
# logo holds every notch while dropping antialias stair-steps; the upsampled swatch
# needs more, because its edges were interpolated rather than drawn.
EPS_MARK = 0.9
EPS_SWATCH = 4.0
MIN_REGION = 40

# The logo's two visible inks.
BLUE = near((0, 128, 198), tol=45)
GOLD = near((255, 194, 14), tol=45)


def field(c):
    """The swatch's gold ground. Anything that is not the ground is bolt.

    These are the SWATCH's colours, not the ones this paints with — on a blue
    pant the same bolt is gold inside white. Only the shape comes from here; the
    colours are named per pant in chargers.parts.ts.
    """
    return c[0] > 200 and 150 < c[1] < 235 and c[2] < 130


def white(c):
    return c[0] > 235 and c[1] > 235 and c[2] > 235


HELMET_BOX = Box(187.4, 116.5, 453.7, 283.0)
LEG_BOX_LEFT = Box(126.0, 950.0, 35.0, 304.0)
LEG_BOX_RIGHT = Box(2 * 294.0 - (126.0 + 35.0), 950.0, 35.0, 304.0)


def build():
    logo = crop_to_art(render_flat(MARK.read_text(), size=RENDER))
    ink, w, h = mask(logo, lambda c: BLUE(c) or GOLD(c))
    body, _, _ = mask(logo, GOLD)

    swatch = Image.open(SHEET).convert('RGB').crop(SWATCH)
    swatch = swatch.resize(
        (swatch.width * SWATCH_UPSCALE, swatch.height * SWATCH_UPSCALE), Image.LANCZOS
    )
    leg_ink, lw, lh = mask(swatch, lambda c: not field(c))
    leg_body, _, _ = mask(swatch, white)

    out = {
        'CHARGERS_DECAL_KEYLINE_PATH': trace(
            fill_holes(ink, w, h), w, h, HELMET_BOX, eps=EPS_MARK, minsize=MIN_REGION
        ),
        'CHARGERS_DECAL_BOLT_PATH': trace(body, w, h, HELMET_BOX, eps=EPS_MARK, minsize=MIN_REGION),
    }
    for side, box, mirror in (('LEFT', LEG_BOX_LEFT, False), ('RIGHT', LEG_BOX_RIGHT, True)):
        out['CHARGERS_LEG_KEYLINE_%s' % side] = trace(
            fill_holes(leg_ink, lw, lh),
            lw,
            lh,
            box,
            eps=EPS_SWATCH,
            minsize=MIN_REGION,
            mirror=mirror,
        )
        out['CHARGERS_LEG_BOLT_%s' % side] = trace(
            leg_body, lw, lh, box, eps=EPS_SWATCH, minsize=MIN_REGION, mirror=mirror
        )
    return out


if __name__ == '__main__':
    main(build, MODULE)
