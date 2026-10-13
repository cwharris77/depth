import { placed } from '../../core/marks';
import type { Mark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import {
  TEXANS_BATTLE_RED_DECAL_PATH,
  TEXANS_BULL_KEYLINE_WIDTH,
  TEXANS_BULL_NAVY_PATH,
  TEXANS_BULL_RED_PATH,
  TEXANS_BULL_STAR_PATH,
} from './decal';

const fill = (id: string, d: string, color: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

const keyline = (id: string, d: string): PartLayer => ({
  id,
  surface: 'helmet',
  d,
  clip: true,
  kind: 'stroke',
  stroke: 'white',
  strokeWidth: TEXANS_BULL_KEYLINE_WIDTH,
});

export const TEXANS_BULL = placed([
  keyline('texans-bull-keyline-navy', TEXANS_BULL_NAVY_PATH),
  keyline('texans-bull-keyline-red', TEXANS_BULL_RED_PATH),
  fill('texans-bull-head', TEXANS_BULL_NAVY_PATH, 'decalNavy'),
  fill('texans-bull-horn', TEXANS_BULL_RED_PATH, 'decalRed'),
  fill('texans-bull-star', TEXANS_BULL_STAR_PATH, 'white'),
]);

export const TEXANS_BATTLE_RED_HORN = placed([
  fill('texans-decal-battle-red-horn', TEXANS_BATTLE_RED_DECAL_PATH, 'decalNavy'),
]);

// The blackletter H: a hairline left stem with a spur, a capped thick stem, a crossbar and a
// right stem ending in a tail, sized to the bull decal's footprint. The red keyline is stroked
// under the blue fill so only its outer half shows.
const TEXANS_H_PATH =
  'M310.5,144.6 L373.2,137.4 L381.1,139.8 L381.1,154.1 L310.5,156.5 Z M326.2,154.1 L339.3,154.1 L339.3,266 L326.2,268.3 Z M307.9,206.5 L326.2,194.6 L331.4,206.5 L326.2,218.4 Z M352.3,139.8 L381.1,139.8 L381.1,268.3 L352.3,268.3 Z M315.7,268.3 L381.1,266 L381.1,280.2 L320.9,280.2 Z M378.5,201.7 L409.9,201.7 L409.9,223.1 L378.5,223.1 Z M404.6,139.8 L425.6,125.5 L438.6,139.8 L438.6,277.9 L404.6,277.9 Z M404.6,273.1 L438.6,273.1 L451.7,285 L464.8,299.3 L436,294.5 L409.9,285 Z';
const TEXANS_H_STAR_PATH =
  'M462.2,190.8 L466.6,202.7 L479.3,203.3 L469.4,211.2 L472.7,223.4 L462.2,216.4 L451.6,223.4 L454.9,211.2 L445,203.3 L457.7,202.7 Z';

export const TEXANS_H = placed([
  {
    id: 'texans-h-keyline',
    surface: 'helmet',
    d: TEXANS_H_PATH,
    clip: true,
    kind: 'stroke',
    stroke: 'red',
    strokeWidth: TEXANS_BULL_KEYLINE_WIDTH,
  },
  fill('texans-h-letter', TEXANS_H_PATH, 'hTownBlue'),
  fill('texans-h-star', TEXANS_H_STAR_PATH, 'red'),
]);

// Sleeve marks are authored in mannequin space for the right sleeve: this box is exactly the
// sleeve anchor's placement box, so path coordinates land unscaled. The sleeve's outer edge sits
// near x=556 and its hem near y=586; paths run past the edge to x=564 and the jersey clip trims
// them.
const SLEEVE_BOX = [490, 405, 564, 605] as const;

export const TEXANS_AWAY_SLEEVE_SWOOSH: Mark<'navy' | 'red'> = {
  box: SLEEVE_BOX,
  paths: [
    {
      slot: 'navy',
      d: 'M486.5,447.7 C491.4,462.6 496.4,472.4 509.6,480.7 C521.1,487.3 537.6,488.9 564,489.8 L564,550 C544.2,548.4 529.4,543.4 516.2,530.2 C504.6,518.6 498.1,505.4 495.6,487.3 C493.1,472.4 489.8,459.2 486.5,447.7 Z',
    },
    {
      slot: 'red',
      d: 'M519.5,503.8 C529.4,508.8 541,512 564,513.7 L564,524.4 C544.2,524.4 531,520.3 519.5,503.8 Z',
    },
  ],
};

// The away crescent with a red notch cut into its outer edge and a separate talon above it.
export const TEXANS_BATTLE_RED_SLEEVE_SWOOSH: Mark<'navy'> = {
  box: SLEEVE_BOX,
  paths: [
    {
      slot: 'navy',
      d: 'M480.9,443.4 C487,458.2 494,468.8 504.5,474 C515,480.1 529,485.4 564,488.9 L564,512.5 Q534.2,503.8 516.8,502 Q530.8,514.2 564,529.1 L564,557.1 C543,554.5 534.2,551 527.2,542.2 C518.5,533.5 509.8,519.5 502.8,507.2 C495.8,495 490.5,484.5 487.9,473.1 C485.2,463.5 482.6,454.8 480.9,443.4 Z M527.2,458.2 C526.4,465.2 525.5,471.4 525.5,475.8 C530.8,475.8 541.2,472.2 564,471.4 L564,465.2 C544.8,466.1 534.2,464.4 527.2,458.2 Z',
    },
  ],
};
