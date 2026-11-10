// Indianapolis' own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  COLTS_C_LOGO_GROMMETS_PATH,
  COLTS_C_LOGO_PATH,
  COLTS_DECAL_HORSESHOE_NAVY_PATH,
  COLTS_DECAL_HORSESHOE_WHITE_PATH,
} from './paths';
import { placeMark, placed, type Mark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

const decal = (id: string, d: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill,
});

// The horseshoe is a single navy band with its seven isolated rivets restored on top in white.
const HORSESHOE = [
  decal('colts-helmet-horseshoe-band', COLTS_DECAL_HORSESHOE_NAVY_PATH, 'navy'),
  decal('colts-helmet-horseshoe-rivets', COLTS_DECAL_HORSESHOE_WHITE_PATH, 'white'),
];

// The white shell: one navy crown stripe seated on the shell, then the horseshoe.
export const COLTS_HORSESHOE_DECAL = placed([
  ...seatedCrownStripe([{ id: 'colts-helmet-crown', fill: 'navy', weight: 1 }]),
  ...HORSESHOE,
]);

// The black shell: a navy crown stripe piped in white on both edges, then the horseshoe with a
// thin white keyline drawn under the band so it separates from the dark shell.
export const COLTS_NIGHTS_HELMET_DECAL = placed([
  ...seatedCrownStripe([
    { id: 'colts-nights-crown-white-upper', fill: 'white', weight: 1 },
    { id: 'colts-nights-crown-navy', fill: 'navy', weight: 3 },
    { id: 'colts-nights-crown-white-lower', fill: 'white', weight: 1 },
  ]),
  {
    id: 'colts-nights-horseshoe-keyline',
    surface: 'helmet',
    d: COLTS_DECAL_HORSESHOE_NAVY_PATH,
    clip: true,
    kind: 'stroke',
    stroke: 'white',
    strokeWidth: 6,
  },
  ...HORSESHOE,
]);

const C_LOGO: Mark<'body' | 'grommets'> = {
  box: [0, 0, 100, 130],
  paths: [
    { slot: 'body', d: COLTS_C_LOGO_PATH },
    { slot: 'grommets', d: COLTS_C_LOGO_GROMMETS_PATH },
  ],
};

// The C on the inside back of the neck, in a colour that reads against the collar.
export const coltsCollarLogo = (fill: string) =>
  placed(placeMark('colts-collar-logo', C_LOGO, 'collar-back', { body: fill, grommets: null }));

// The C worn as a white patch over the wearer's heart, its grommets showing the body colour. The
// patch is narrower than the anchor's badge and sits at its inboard, lower edge, clear of the
// shoulder stripes, so its box is padded right and above the art.
const CHEST_C: Mark<'body' | 'grommets'> = { ...C_LOGO, box: [0, -250, 208, 135] };
export const COLTS_CHEST_C = placed(
  placeMark('colts-chest-logo', CHEST_C, 'chest-left', { body: 'white', grommets: 'navy' })
);
