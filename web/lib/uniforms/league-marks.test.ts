import { describe, expect, it } from 'vitest';
import { boundsOf, type Mark } from '@/lib/uniforms/teams/core/marks';
import { LEAGUE_SHIELD } from '@/lib/uniforms/teams/league/marks/shield';
import { LEAGUE_SWOOSH } from '@/lib/uniforms/teams/league/marks/swoosh';

const MARKS: [string, Mark][] = [
  ['shield', LEAGUE_SHIELD],
  ['swoosh', LEAGUE_SWOOSH],
];

describe.each(MARKS)('league %s mark', (_, mark) => {
  it('has a box that contains every slot', () => {
    const [x0, y0, x1, y1] = mark.box;
    for (const { d } of mark.paths) {
      const [a, b, c, e] = boundsOf(d);
      expect(a).toBeGreaterThanOrEqual(x0);
      expect(b).toBeGreaterThanOrEqual(y0);
      expect(c).toBeLessThanOrEqual(x1);
      expect(e).toBeLessThanOrEqual(y1);
    }
  });
});

describe('league shield', () => {
  it('paints the border first and keeps every source part', () => {
    expect(LEAGUE_SHIELD.paths.map((p) => p.slot)).toEqual([
      'border',
      'field',
      'panel',
      'letters',
      'stars',
      'ball',
      'lines',
    ]);
    const subpaths = (slot: string) =>
      (LEAGUE_SHIELD.paths.find((p) => p.slot === slot)?.d.match(/Z/g) ?? []).length;
    expect(subpaths('letters')).toBe(3);
    expect(subpaths('stars')).toBe(8);
    expect(subpaths('lines')).toBe(5);
  });
});
