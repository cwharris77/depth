import { placeMark, placed } from '../../core/marks';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import type { PartLayer } from '../../core/parts';
import { TITANS_FLAMING_T_PATHS } from './flaming-t';
import { TITANS_2026_SHIELD } from './shield';

const fill = (id: string, surface: PartLayer['surface'], d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

const flamingT = TITANS_FLAMING_T_PATHS.map(({ d, fill: color }, index) =>
  fill(`titans-flaming-t-${index}`, 'helmet', d, color)
);

export const TITANS_2018_HELMET = placed([
  fill('titans-2018-crown-silver', 'helmet', HELMET_CROWN_STRIPE_PATH, 'silver'),
  ...flamingT,
]);

const OILERS_DERRICK = {
  box: [0, 0, 120, 120] as const,
  paths: [
    { slot: 'white' as const, d: 'M52,5 L64,5 L65,118 L54,118 Z' },
    { slot: 'white' as const, d: 'M48,9 L80,9 L80,16 L48,16 Z' },
    { slot: 'white' as const, d: 'M49,10 L55,11 L110,105 L104,108 Z' },
    { slot: 'white' as const, d: 'M47,40 L95,89 L91,95 L47,49 Z' },
    { slot: 'white' as const, d: 'M51,105 L98,48 L102,54 L57,112 Z' },
    { slot: 'white' as const, d: 'M51,76 L84,41 L88,47 L52,85 Z' },
    { slot: 'white' as const, d: 'M47,42 L78,35 L81,43 L48,50 Z' },
  ],
};

export const OILERS_1960_HELMET = placed([
  fill('oilers-1960-center-stripe', 'helmet', HELMET_CROWN_STRIPE_PATH, 'white'),
  ...OILERS_DERRICK.paths.flatMap((path, index) =>
    placeMark(
      `oilers-1960-derrick-${index}`,
      { box: OILERS_DERRICK.box, paths: [path] },
      'helmet-side',
      { white: 'white' }
    )
  ),
]);

export const TITANS_2026_HELMET = placed([
  fill('titans-2026-crown-navy', 'helmet', HELMET_CROWN_STRIPE_PATH, 'navy'),
  fill(
    'titans-2026-crown-red',
    'helmet',
    'M243,131 L257,121 L306,99 L337,88 L376,76 L403,73 L454,73 L507,81 L544,93 L588,116 L626,143 L625,146 L589,119 L545,96 L508,85 L455,78 L402,79 L375,84 L336,95 L305,108 L257,133 L242,146 Z',
    'red2026'
  ),
  ...TITANS_2026_SHIELD.paths.flatMap((path, index) =>
    placeMark(
      `titans-2026-shield-${index}`,
      { box: TITANS_2026_SHIELD.box, paths: [path] },
      'helmet-side',
      {
        red: 'red2026',
        white: 'white',
        lightBlue: 'lightBlue2026',
      }
    )
  ),
]);

export const TITANS_2018_SHOULDERS = placed([
  fill('titans-yoke-left', 'sleeve-left', 'M30,386 L205,412 L36,548 Z', 'silver'),
  fill('titans-yoke-right', 'sleeve-right', 'M558,386 L383,412 L552,548 Z', 'silver'),
  fill('titans-bar-left', 'sleeve-left', 'M96,415 H158 V435 H96 Z', 'navy'),
  fill('titans-bar-right', 'sleeve-right', 'M492,415 H430 V435 H492 Z', 'navy'),
]);

export const TITANS_2018_PANTS_SWORD = placed([
  fill('titans-pants-sword-left', 'leg-left', 'M113,858 L170,887 L170,904 L113,877 Z', 'silver'),
  fill('titans-pants-sword-right', 'leg-right', 'M475,858 L418,887 L418,904 L475,877 Z', 'silver'),
]);

const sleeveBand = (id: string, y0: number, y1: number, color: string): PartLayer[] => [
  fill(`${id}-left`, 'sleeve-left', `M30,${y0} H96 V${y1} H30 Z`, color),
  fill(`${id}-right`, 'sleeve-right', `M492,${y0} H558 V${y1} H492 Z`, color),
];

export const TITANS_2026_SLEEVES = placed([
  ...sleeveBand('titans-2026-sleeve-red-top', 476, 481, 'red2026'),
  ...sleeveBand('titans-2026-sleeve-white-top', 481, 487, 'white'),
  ...sleeveBand('titans-2026-sleeve-blue', 487, 529, 'lightBlue2026'),
  ...[492, 498, 504, 510, 516, 522].flatMap((y, index) =>
    sleeveBand(`titans-2026-string-${index}`, y, y + 2, 'navy')
  ),
  ...sleeveBand('titans-2026-sleeve-white-bottom', 529, 535, 'white'),
  ...sleeveBand('titans-2026-sleeve-red-bottom', 535, 540, 'red2026'),
]);
