import { describe, expect, it } from 'vitest';
import { getAllTeamUniformDefinitions } from '@/lib/uniforms/teams';
import { numeralMate, placeMarkOnPair, type Mark } from '@/lib/uniforms/teams/core/marks';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const pairs = (d: string) => {
  const n = numbers(d);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]] as const);
};
const key = ([x, y]: readonly [number, number]) => `${Math.round(x)},${Math.round(y)}`;
const area = (d: string) => {
  const p = pairs(d);
  return Math.sign(
    p.reduce((s, [x, y], i) => s + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y, 0)
  );
};

// A numeral on one sleeve must be the same numeral turned, not reflected, on the other: a
// reflected 3 reads backwards.
describe('sleeve and shoulder numerals', () => {
  const layers: Array<{ team: string; left: string; right: string; id: string }> = [];
  for (const [team, def] of Object.entries(getAllTeamUniformDefinitions())) {
    const byId = new Map<string, string>();
    JSON.stringify(def, (_k, v) => {
      if (v && typeof v.id === 'string' && typeof v.d === 'string') byId.set(v.id, v.d);
      return v;
    });
    for (const [id, d] of byId) {
      const m = /^(.*-(?:shoulder|sleeve)-number(?:-outline)?)-left$/.exec(id);
      const right = m && byId.get(`${m[1]}-right`);
      if (m && right) layers.push({ team, id, left: d, right });
    }
  }

  it('finds the numerals it guards', () => {
    expect(new Set(layers.map((l) => l.team)).size).toBeGreaterThan(20);
  });

  it('never draws the right numeral as a reflection of the left', () => {
    for (const { id, left, right } of layers) {
      const mirrored = new Set(pairs(left).map(([x, y]) => key([588 - x, y])));
      const same = pairs(right).filter((p) => mirrored.has(key(p))).length;
      expect(same / pairs(right).length, id).toBeLessThan(0.9);
      expect(area(right), id).toBe(area(left));
    }
  });
});

describe('handed marks', () => {
  const mark: Mark = {
    box: [356, 360, 576, 532],
    paths: [
      { slot: 'n', d: 'M400,400 L440,400 L440,410 L410,410 L410,420 L400,420 Z', handed: true },
    ],
  };
  it('turns a handed path on the mirrored shoulder instead of reflecting it', () => {
    const [left, right] = placeMarkOnPair('t', mark, 'shoulders', { n: 'white' });
    expect(area(left.d)).toBe(area(right.d));
  });
  it('turns a numeral about its own centre', () => {
    const d = 'M10,10 L30,10 L30,16 L16,16 L16,20 L10,20 Z';
    const mate = pairs(numeralMate(d));
    expect(mate[0]).toEqual([578, 20]);
    expect(mate[3]).toEqual([572, 14]);
  });
});
