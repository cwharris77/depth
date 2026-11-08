// New York's own construction layers, bound to palette keys. Each export is a placed mark, emitted
// exactly as written, or a mark placed by anchor.
import {
  JETS_DECAL_PATH,
  JETS_OVAL_PATCH_FIELD,
  JETS_OVAL_PATCH_RING,
  JETS_SLEEVE_PANEL_LEFT,
  JETS_SLEEVE_PANEL_RIGHT,
} from './paths';
import { placeMark, placed, type Mark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { seatedCrownStripe } from '../../core/shared';

const decal = (id: string, fill: string): PartLayer => ({
  id,
  surface: 'helmet',
  d: JETS_DECAL_PATH,
  clip: true,
  kind: 'fill',
  fill,
});

// The keyline is a stroke on the wordmark's own outline painted beneath its fill, so only the outer
// half of the stroke shows around each letter.
const keyline = (id: string, stroke: string): PartLayer => ({
  id,
  surface: 'helmet',
  d: JETS_DECAL_PATH,
  clip: true,
  kind: 'stroke',
  stroke,
  strokeWidth: 5,
});

const crownStripe = (id: string, fill: string) => seatedCrownStripe([{ id, fill, weight: 1 }]);

// The wordmark: four letterforms with the jet sweeping out of the J, in one fill.
export const JETS_WORDMARK_WHITE = placed([decal('jets-decal', 'white')]);
// The black shell's green wordmark carries a thin white keyline.
export const JETS_WORDMARK_GREEN_KEYLINED = placed([
  keyline('jets-decal-keyline', 'white'),
  decal('jets-decal', 'green'),
]);
// A single seated centre stripe under the wordmark.
export const jetsStripedWordmark = (wordmark: string, stripe: string) =>
  placed([...crownStripe('jets-crown-stripe', stripe), decal('jets-decal', wordmark)]);

// A whole sleeve in one colour beside the shoulder stripes.
export const jetsSleevePanels = (fill: string) =>
  placed([
    {
      id: 'jets-sleeve-panel-left',
      surface: 'sleeve-left',
      d: JETS_SLEEVE_PANEL_LEFT,
      clip: true,
      kind: 'fill',
      fill,
    },
    {
      id: 'jets-sleeve-panel-right',
      surface: 'sleeve-right',
      d: JETS_SLEEVE_PANEL_RIGHT,
      clip: true,
      kind: 'fill',
      fill,
    },
  ]);

// The oval chest patch over the wearer's heart: a ring around a solid field.
const JETS_OVAL_PATCH: Mark<'ring' | 'field'> = {
  box: [0, 0, 100, 60],
  paths: [
    { slot: 'ring', d: JETS_OVAL_PATCH_RING },
    { slot: 'field', d: JETS_OVAL_PATCH_FIELD },
  ],
};
export const jetsChestPatch = (ring: string, field: string) =>
  placed(placeMark('jets-chest-patch', JETS_OVAL_PATCH, 'chest-left', { ring, field }));
