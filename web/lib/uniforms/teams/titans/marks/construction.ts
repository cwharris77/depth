import { numeralMate, placeMark, placed } from '../../core/marks';
import { HELMET_CROWN_STRIPE_PATH } from '../../core/shared';
import type { PartLayer } from '../../core/parts';
import { TITANS_FLAMING_T_PATHS } from './flaming-t';
import { TITANS_2026_SHIELD } from './shield';
import { NIKE_MARK } from '../../core/pants-logos';

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

export const TITANS_2018_NAVY_PANELS = placed([
  fill(
    'titans-navy-yoke-left',
    'sleeve-left',
    'M20,360 H218 V429 L164,439 Q105,449 78,471 Q50,502 30,548 H20 Z',
    'wolfGrey'
  ),
  fill(
    'titans-navy-yoke-right',
    'sleeve-right',
    'M568,360 H370 V429 L424,439 Q483,449 510,471 Q538,502 558,548 H568 Z',
    'wolfGrey'
  ),
  fill(
    'titans-navy-yoke-bevel-left',
    'sleeve-left',
    'M218,420 L164,430 Q105,440 72,466 Q44,499 20,548 H30 Q50,502 78,471 Q105,449 164,439 L218,429 Z',
    'steelGrey'
  ),
  fill(
    'titans-navy-yoke-bevel-right',
    'sleeve-right',
    'M370,420 L424,430 Q483,440 516,466 Q544,499 568,548 H558 Q538,502 510,471 Q483,449 424,439 L370,429 Z',
    'steelGrey'
  ),
  fill(
    'titans-underarm-left',
    'jersey',
    'M30,565 L130,565 Q143,577 152,607 L155,650 L150,692 L138,683 L141,601 L136,591 L44,589 L34,582 Z',
    'lightBlue'
  ),
  fill(
    'titans-underarm-right',
    'jersey',
    'M558,565 L458,565 Q445,577 436,607 L433,650 L438,692 L450,683 L447,601 L452,591 L544,589 L554,582 Z',
    'lightBlue'
  ),
]);

export const TITANS_2018_NECK_STARS = placed([
  fill(
    'titans-neck-star-0',
    'collar',
    'M270.00,386.50 L271.35,390.14 L275.23,390.30 L272.19,392.71 L273.23,396.45 L270.00,394.30 L266.77,396.45 L267.81,392.71 L264.77,390.30 L268.65,390.14 Z',
    'red'
  ),
  fill(
    'titans-neck-star-1',
    'collar',
    'M294.00,386.50 L295.35,390.14 L299.23,390.30 L296.19,392.71 L297.23,396.45 L294.00,394.30 L290.77,396.45 L291.81,392.71 L288.77,390.30 L292.65,390.14 Z',
    'red'
  ),
  fill(
    'titans-neck-star-2',
    'collar',
    'M318.00,386.50 L319.35,390.14 L323.23,390.30 L320.19,392.71 L321.23,396.45 L318.00,394.30 L314.77,396.45 L315.81,392.71 L312.77,390.30 L316.65,390.14 Z',
    'red'
  ),
]);

const TITANS_SHOULDER_NUMBER_LEFT =
  'M157.20,411.00 L158.00,428.00 L126.00,426.26 L124.40,423.52 L120.80,426.26 L101.60,426.26 L96.00,424.33 L96.00,411.00 L111.60,411.00 L106.40,413.87 L106.40,421.75 L115.20,421.75 L125.60,413.06 L136.00,421.75 L146.00,421.75 L146.80,413.87 L141.60,411.00 Z';

export const TITANS_2018_NAVY_NUMBERS = placed([
  {
    id: 'titans-navy-shoulder-number-outline-left',
    surface: 'sleeve-left',
    d: TITANS_SHOULDER_NUMBER_LEFT,
    clip: true,
    kind: 'stroke',
    stroke: 'lightBlue',
    strokeWidth: 2,
  },
  fill('titans-navy-shoulder-number-left', 'sleeve-left', TITANS_SHOULDER_NUMBER_LEFT, 'navy'),
  {
    id: 'titans-navy-shoulder-number-outline-right',
    surface: 'sleeve-right',
    d: numeralMate(TITANS_SHOULDER_NUMBER_LEFT),
    clip: true,
    kind: 'stroke',
    stroke: 'lightBlue',
    strokeWidth: 2,
  },
  fill(
    'titans-navy-shoulder-number-right',
    'sleeve-right',
    numeralMate(TITANS_SHOULDER_NUMBER_LEFT),
    'navy'
  ),
]);

export const TITANS_2018_NAVY_NIKE = placed(
  ['left', 'right'].map((side) => {
    const [x0, y0, x1, y1] = NIKE_MARK.box;
    let coordinate = 0;
    const d = NIKE_MARK.paths[0].d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
      const value = Number(n);
      if (coordinate++ % 2) return (449 + ((value - y0) * 12) / (y1 - y0)).toFixed(2);
      const x = 79 - ((value - x0) * 30) / (x1 - x0);
      return (side === 'left' ? x : 588 - x).toFixed(2);
    });
    return fill(
      `titans-navy-nike-${side}`,
      side === 'left' ? 'sleeve-left' : 'sleeve-right',
      d,
      'red'
    );
  })
);

export const TITANS_2018_BLUE_PANELS = placed(
  TITANS_2018_NAVY_PANELS.layers.map((layer) => ({
    ...layer,
    fill:
      layer.kind === 'fill' && layer.fill === 'lightBlue'
        ? 'navy'
        : layer.kind === 'fill'
          ? layer.fill
          : 'navy',
  }))
);
export const TITANS_2018_BLUE_NUMBERS = placed(
  TITANS_2018_NAVY_NUMBERS.layers.map((layer) =>
    layer.kind === 'stroke' ? { ...layer, stroke: 'white' } : layer
  )
);
