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
      d: 'M478,456 C484,474 490,486 506,496 C520,504 540,506 564,507 L564,580 C548,578 530,572 514,556 C500,542 492,526 489,504 C486,486 482,470 478,456 Z',
    },
    {
      slot: 'red',
      d: 'M518,524 C530,530 544,534 564,536 L564,549 C548,549 532,544 518,524 Z',
    },
  ],
};

// The away crescent with a red notch cut into its outer edge and a separate talon above it.
export const TEXANS_BATTLE_RED_SLEEVE_SWOOSH: Mark<'navy'> = {
  box: SLEEVE_BOX,
  paths: [
    {
      slot: 'navy',
      d: 'M479,453 C486,470 494,482 506,488 C518,495 534,501 564,505 L564,532 Q540,522 520,520 Q536,534 564,551 L564,583 C550,580 540,576 532,566 C522,556 512,540 504,526 C496,512 490,500 487,487 C484,476 481,466 479,453 Z M532,470 C531,478 530,485 530,490 C536,490 548,486 564,485 L564,478 C552,479 540,477 532,470 Z',
    },
  ],
};

export const TEXANS_HOME_SLEEVE_HORN: Mark<'red'> = {
  box: SLEEVE_BOX,
  paths: [
    {
      slot: 'red',
      d: 'M521,498 C530,502 536,505 539,510 C541,516 540,520 541,526 C543,536 548,548 555,560 C549,554 544,546 539,537 C534,530 528,526 524,522 C519,518 516,510 517,503 C518,500 519,498 521,498 Z',
    },
  ],
};
