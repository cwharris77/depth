import {
  GIANTS_AWAY_SLEEVE_X_LEFT,
  GIANTS_AWAY_SLEEVE_X_RIGHT,
  GIANTS_AWAY_STRIPE_BANDS,
} from '../source';
// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { sleeveStripes } from '../parts';

// Away jersey: white body, thin/thick/thin red sleeve stripes, red numerals.
export const JERSEY_WHITE: UniformPart = {
  base: 'white',
  layers: sleeveStripes(
    GIANTS_AWAY_STRIPE_BANDS,
    GIANTS_AWAY_SLEEVE_X_LEFT,
    GIANTS_AWAY_SLEEVE_X_RIGHT,
    ['red', 'red', 'red']
  ),
  number: { fill: 'red', outline: 'red', outlineWidth: 10 },
};
