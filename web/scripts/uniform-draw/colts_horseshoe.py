#!/usr/bin/env python3
"""Regenerate the Colts helmet horseshoe in ``lib/uniforms/teams/colts-decal.ts``.

The linework is a contour trace of Wikimedia Commons'
``File:Indianapolis Colts logo.svg`` (public domain / PD-ineligible; source supplied by
the Indianapolis Colts at https://static.www.nfl.com/league/api/clubs/logos/IND.svg).
The external vector lives at ``nfl-uniform-refs/colts/colts-mark.svg`` and is never
committed. It is the exact helmet horseshoe, not the wordmark or 2020 Indiana-C secondary.

Topology, measured from the source before tracing: one connected navy band with seven enclosed
white rivet holes. The centre is open to the top and therefore shell-coloured rather than a
counter. The navy outline is traced after filling the rivets; their mask is emitted separately
and painted white, preserving every source-visible hole. The 0.75x render keeps one navy
component and all seven holes; its thinnest critical navy band is over 2 source pixels.

Placement comes only from the GUD 2025 Colts helmet composite, not from the flat mark:
the side-shell is x58..150, y332..414 and the horseshoe is x92..125, y341..376. That puts
its centre at 50.5% shell width and 32.3% shell height. GUD foreshortens the three-quarter
shell, so its width (34.0% of the shell) and centre transfer to the mannequin while its
height derives from the vector's 0.946 true aspect: raw helmet box x330.0..525.0,
y146.0..352.1. The mark faces the mannequin's right-facing side directly; no rotation or
mirroring is applied. The old 46px-GUD trace was both broader and higher.

``qlmanage`` renders SVG thumbnails square and can hide white source holes against a
transparent background. ``drawkit.render_flat`` composites the source over white, then
``crop_to_art`` measures the navy band; the hole mask is calculated from that band rather
than from a transparent-pixel scan. Paths below must be mechanically regenerated and checked
with ``python3 scripts/uniform-draw/colts_horseshoe.py --check``.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from drawkit import Box, crop_to_art, fill_holes, holes_of, main, mask, near, render_flat, trace

REF = Path.home() / 'Documents/GitHubProjects/nfl-uniform-refs/colts/colts-mark.svg'
MODULE = Path(__file__).resolve().parents[2] / 'lib' / 'uniforms' / 'teams' / 'colts.ts'
BOX = Box(330.0, 146.0, 195.0, 206.1)
NAVY = (1, 51, 105)


def build():
    """Trace the source band and its enclosed white counter/rivets separately."""
    im = crop_to_art(render_flat(REF.read_text(), size=1200))
    m, w, h = mask(im, near(NAVY, 40))
    return {
        'COLTS_DECAL_HORSESHOE_NAVY_PATH': trace(fill_holes(m, w, h), w, h, BOX, eps=2.0),
        'COLTS_DECAL_HORSESHOE_WHITE_PATH': trace(holes_of(m, w, h), w, h, BOX, eps=2.0),
    }


if __name__ == '__main__':
    main(build, MODULE)
