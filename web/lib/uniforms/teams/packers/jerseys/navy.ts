import { LEGACY_ROUNDED_COLLAR_PATH } from '../../core/shared';
import {
  PACKERS_COLLAR_WIDTHS,
  PACKERS_SLEEVE_GOLD_LOWER_LEFT,
  PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
  PACKERS_SLEEVE_GOLD_UPPER_LEFT,
  PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
  PACKERS_SLEEVE_WHITE_LEFT,
  PACKERS_SLEEVE_WHITE_RIGHT,
} from '../source';
import type { PartLayer } from '../../core/parts';
// Jersey construction moved intact from parts.ts.
import type { UniformPart } from '../../core/parts';
import { COLLAR_PATH } from '../parts';

// The 1923 navy body: bronze sleeve bands and a bronze collar (the kit's stripped construction
// keeps only those), bronze numerals.
export const JERSEY_NAVY: UniformPart = {
  base: 'navy',
  layers: [
    ...(
      [
        {
          id: 'packers-sleeve-gold-upper-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_GOLD_UPPER_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-upper-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_GOLD_UPPER_RIGHT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-white-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_WHITE_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-white-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_WHITE_RIGHT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-lower-left',
          surface: 'sleeve-left' as const,
          d: PACKERS_SLEEVE_GOLD_LOWER_LEFT,
          fill: 'bronze',
        },
        {
          id: 'packers-sleeve-gold-lower-right',
          surface: 'sleeve-right' as const,
          d: PACKERS_SLEEVE_GOLD_LOWER_RIGHT,
          fill: 'bronze',
        },
      ] as const
    ).map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' })),
    {
      id: 'packers-collar-outer',
      surface: 'collar',
      d: LEGACY_ROUNDED_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.gold,
    },
    {
      id: 'packers-collar-mid',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.white,
    },
    {
      id: 'packers-collar-inner',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: 'bronze',
      strokeWidth: PACKERS_COLLAR_WIDTHS.goldInner,
    },
  ],
  number: { fill: 'bronze', outline: 'bronze', outlineWidth: 26 },
};
