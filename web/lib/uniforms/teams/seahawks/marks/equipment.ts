import { NIKE_MARK } from '../../core/pants-logos';
import { placeMark, placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import { SEAHAWKS_THROWBACK_HAWK } from './throwback-hawk';

const EDGE = [
  [176, 807],
  [170, 812],
  [155, 839],
  [145, 909],
  [129, 923],
  [113, 1050],
  [117, 1066],
  [128, 1077],
  [128, 1097],
  [118, 1133],
  [118, 1196],
] as const;

function edgeAt(y: number): number {
  const i = EDGE.findIndex((p) => p[1] >= y);
  if (i <= 0) return EDGE[0][0];
  const [a, b] = [EDGE[i - 1], EDGE[i]];
  return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
}

function legPath(points: readonly (readonly [number, number])[], side: string): string {
  return (
    points
      .map(([offset, y], i) => {
        const x = edgeAt(y) + offset;
        return `${i ? 'L' : 'M'}${(side === 'left' ? x : 588 - x).toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
}

export function seahawksPantsFeathers(color: string): PlacedMark {
  return placed(
    ['left', 'right'].flatMap((side) =>
      Array.from({ length: 12 }, (_, i): PartLayer => {
        const y = 815 + i * 31;
        return {
          id: `seahawks-pants-feather-${side}-${i}`,
          surface: side === 'left' ? 'leg-left' : 'leg-right',
          clip: true,
          kind: 'fill',
          fill: color,
          d: legPath(
            [
              [4, y],
              [11, y + 8],
              [18, y],
              [17, y + 17],
              [11, y + 25],
              [5, y + 17],
            ],
            side
          ),
        };
      })
    )
  );
}

export const SEAHAWKS_RIVALRIES_PANTS_PRINT = placed(
  ['left', 'right'].flatMap((side) =>
    Array.from({ length: 48 }, (_, i): PartLayer => {
      const y = 813 + i * 7.8;
      const tilt = side === 'left' ? 6 : -6;
      return {
        id: `seahawks-rivalries-pants-wave-${side}-${i}`,
        surface: side === 'left' ? 'leg-left' : 'leg-right',
        clip: true,
        kind: 'fill',
        fill: i % 3 === 0 ? 'rivalriesJerseyOlive' : 'rivalriesPine',
        d: legPath(
          [
            [5, y + Math.max(0, -tilt)],
            [19, y + Math.max(0, tilt)],
            [19, y + Math.max(0, tilt) + 2.2],
            [5, y + Math.max(0, -tilt) + 2.2],
          ],
          side
        ),
      };
    })
  )
);

// The outer shoulder curves away from the front view, clipping the tip of the swoosh.
export function seahawksSleeveNike(color: string): PlacedMark {
  const [x0, y0, x1, y1] = NIKE_MARK.box;
  const scale = 40 / (x1 - x0);
  const layers: PartLayer[] = ['left', 'right'].map((side) => {
    let coordinate = 0;
    const d = NIKE_MARK.paths[0].d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
      const value = Number(n);
      if (coordinate++ % 2) return (442 + (value - (y0 + y1) / 2) * scale).toFixed(2);
      const x = 61 - (value - x0) * scale;
      return (side === 'left' ? x : 588 - x).toFixed(2);
    });
    return {
      id: `seahawks-sleeve-nike-${side}`,
      surface: side === 'left' ? 'sleeve-left' : 'sleeve-right',
      d,
      clip: true,
      kind: 'fill',
      fill: color,
    };
  });
  return placed(layers);
}

export const SEAHAWKS_THROWBACK_SLEEVE_HAWKS = placed(
  placeMark('seahawks-throwback-sleeve', SEAHAWKS_THROWBACK_HAWK, 'sleeve-left', {
    royal: 'throwbackRoyal',
    white: 'white',
    block: 'throwbackGreen',
    eye: 'throwbackGreen',
  }).flatMap((layer): PartLayer[] => {
    let coordinate = 0;
    const left = layer.d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
      const value = Number(n);
      return (coordinate++ % 2 ? 515 + (value - 505) * 2.2 : 88 - (value - 24) * 2.2).toFixed(2);
    });
    coordinate = 0;
    const right = left.replace(/-?\d+(?:\.\d+)?/g, (n) =>
      coordinate++ % 2 ? n : (588 - Number(n)).toFixed(2)
    );
    const pair: PartLayer[] = [
      { ...layer, d: left },
      { ...layer, id: layer.id.replace('-left', '-right'), surface: 'sleeve-right', d: right },
    ];
    return layer.id.includes('-royal-')
      ? pair.flatMap((head): PartLayer[] => [
          {
            id: head.id.replace('-royal-', '-outline-'),
            surface: head.surface,
            clip: true,
            kind: 'stroke',
            stroke: 'white',
            strokeWidth: 2.2,
            d: head.d,
          },
          head,
        ])
      : pair;
  })
);

// The rear sleeve stripe continues behind the head as a short white-green-white tail.
export const SEAHAWKS_THROWBACK_SLEEVE_TAILS = placed(
  ['left', 'right'].flatMap((side) =>
    [
      { y0: 501, y1: 529, color: 'white' },
      { y0: 506, y1: 524, color: 'throwbackGreen' },
    ].map(({ y0, y1, color }): PartLayer => {
      const x0 = side === 'left' ? 78 : 492;
      return {
        id: `seahawks-throwback-sleeve-tail-${color}-${side}`,
        surface: side === 'left' ? 'sleeve-left' : 'sleeve-right',
        clip: true,
        kind: 'fill',
        fill: color,
        d: `M${x0},${y0} H${x0 + 18} V${y1} H${x0} Z`,
      };
    })
  )
);
