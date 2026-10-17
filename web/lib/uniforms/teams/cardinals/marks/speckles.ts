import { placed } from '../../core/marks';

function speckles(top: number, height: number, count: number): string {
  let seed = 202509;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const x = 30 + random() * 528;
    const y = top + random() * height;
    const r = 0.3 + random() * 0.65;
    return `M${x.toFixed(2)},${y.toFixed(2)}l${r.toFixed(2)},${(-r).toFixed(2)} ${r.toFixed(2)},${(r * 1.7).toFixed(2)}Z`;
  }).join('');
}

export const CARDINALS_JERSEY_SPECKLES = speckles(383, 423, 7000);
export const CARDINALS_PANTS_SPECKLES = placed([
  {
    id: 'cardinals-pants-speckles',
    surface: 'pants',
    clip: true,
    kind: 'fill',
    fill: 'speckle',
    d: speckles(807, 389, 6500),
  },
]);
