import type { CompleteJerseySpec } from '../../core/complete';
import { RAMS_JERSEY_ROYAL } from './royal';
import { RAMS_2026_HOME_HORNS, RAMS_2026_AWAY_HORNS } from '../marks/primary-2026';

export const RAMS_JERSEY_ROYAL_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_ROYAL,
  number: { fill: 'yellow', outline: 'yellow', outlineWeight: 'none', texture: 'plain' },
  marks: [{ paint: 'over', mark: RAMS_2026_HOME_HORNS }],
};
export const RAMS_JERSEY_WHITE_2026: CompleteJerseySpec = {
  ...RAMS_JERSEY_ROYAL_2026,
  body: 'white',
  collar: {
    style: 'inset-v',
    color: 'royal',
    trim: 'none',
    inside: 'body',
    lining: 'none',
    backBar: 'none',
    outline: true,
  },
  shoulderPanel: 'none',
  number: { fill: 'royal', outline: 'yellow', outlineWeight: 'thin', texture: 'plain' },
  marks: [{ paint: 'over', mark: RAMS_2026_AWAY_HORNS }],
};
