import type { CompleteJerseySpec } from '../../core/complete';
import { RAMS_JERSEY_ROYAL } from './royal';
import { RAMS_JERSEY_WHITE } from './white';
import { ramsFullSleeveHorn } from '../marks/construction';
import { RAMS_NUMBER_THREE } from '../marks/numbers';

// The sleeve carries the full horn, whose front-facing part tapers down from the shoulder; the
// numerals lose their fade and keyline.
export const RAMS_JERSEY_ROYAL_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_ROYAL,
  number: {
    fill: 'yellow',
    outline: 'yellow',
    outlineWeight: 'none',
    texture: 'plain',
    glyphPath: RAMS_NUMBER_THREE,
    glyphLabel: '3',
  },
  marks: [{ paint: 'over', mark: ramsFullSleeveHorn('yellow') }],
};

// The same horn in royal over a yellow sleeve, with a plain hem and flat royal numerals.
export const RAMS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_WHITE,
  cuff: 'none',
  marks: [{ paint: 'over', mark: ramsFullSleeveHorn('royal', 'yellow') }],
};
