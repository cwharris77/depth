// Arizona's helmet decals as placed marks. Every region carries its own holes, so every layer
// renders with fill-rule evenodd.
import { placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import {
  CARDINALS_DECAL_BEAK_LOWER_PATH,
  CARDINALS_DECAL_BEAK_UPPER_PATH,
  CARDINALS_DECAL_BODY_PATH,
  CARDINALS_DECAL_EYE_PATH,
  CARDINALS_DECAL_KEYLINE_PATH,
  CARDINALS_EGGSHELL_DECAL_BEAK_LOWER_PATH,
  CARDINALS_EGGSHELL_DECAL_BEAK_UPPER_PATH,
  CARDINALS_EGGSHELL_DECAL_BODY_PATH,
  CARDINALS_EGGSHELL_DECAL_EYE_PATH,
  CARDINALS_EGGSHELL_DECAL_KEYLINE_PATH,
} from './decals';

const decalLayers = (regions: [string, string, string][]): PartLayer[] =>
  regions.map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fillRule: 'evenodd' as const,
    fill,
  }));

// The full-colour mark on the white and black shells.
export const CARDINALS_HELMET_DECAL: PlacedMark = placed(
  decalLayers([
    ['cardinals-decal-keyline', CARDINALS_DECAL_KEYLINE_PATH, 'numberKeyline'],
    ['cardinals-decal-body', CARDINALS_DECAL_BODY_PATH, 'decalRed'],
    ['cardinals-decal-beak-upper', CARDINALS_DECAL_BEAK_UPPER_PATH, 'decalGold'],
    ['cardinals-decal-beak-lower', CARDINALS_DECAL_BEAK_LOWER_PATH, 'decalGold'],
    ['cardinals-decal-eye', CARDINALS_DECAL_EYE_PATH, 'white'],
  ])
);

// The red-on-cream mark on the Rivalries shell.
export const CARDINALS_EGGSHELL_HELMET_DECAL: PlacedMark = placed(
  decalLayers([
    ['cardinals-eggshell-decal-keyline', CARDINALS_EGGSHELL_DECAL_KEYLINE_PATH, 'eggshellDecalRed'],
    ['cardinals-eggshell-decal-body', CARDINALS_EGGSHELL_DECAL_BODY_PATH, 'eggshellDecalCream'],
    [
      'cardinals-eggshell-decal-beak-upper',
      CARDINALS_EGGSHELL_DECAL_BEAK_UPPER_PATH,
      'eggshellDecalOrange',
    ],
    [
      'cardinals-eggshell-decal-beak-lower',
      CARDINALS_EGGSHELL_DECAL_BEAK_LOWER_PATH,
      'eggshellDecalOrange',
    ],
    ['cardinals-eggshell-decal-eye', CARDINALS_EGGSHELL_DECAL_EYE_PATH, 'eggshellDecalWhite'],
  ])
);
