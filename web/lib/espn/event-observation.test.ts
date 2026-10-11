import { describe, expect, it } from 'vitest';
import { observeTeamEvents } from './event-observation';
import type { EspnRoster, EspnDepthcharts } from './types';
const roster: EspnRoster = {
  season: { year: 2026 },
  athletes: [
    {
      position: 'WR',
      items: [
        { id: '1', fullName: 'Player A', injuries: [] },
        { id: '2', fullName: 'Player B', injuries: [{ status: 'Questionable' }] },
      ],
    },
  ],
};
const chart: EspnDepthcharts = {
  items: [
    {
      name: 'Base',
      positions: {
        wr: {
          athletes: [
            { rank: 4, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
            { rank: 5, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/2' } },
          ],
        },
        kr: {
          athletes: [
            { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
          ],
        },
        h: { athletes: [] },
      },
    },
  ],
};
const args = {
  teamId: 'seahawks',
  teamName: 'Seahawks',
  observedAt: '2026-10-10T15:00Z',
  roster,
  depthcharts: chart,
};
describe('complete raw event observations', () => {
  it('retains uncapped source ranks and returners without reranking', () => {
    const result = observeTeamEvents(args);
    expect(result.errors).toEqual([]);
    expect(result.observation.slots.map((s) => [s.position, s.depthRank, s.playerId])).toEqual([
      ['KR', 1, '1'],
      ['WR', 4, '1'],
      ['WR', 5, '2'],
    ]);
    expect(result.observation.injuries[1].designations).toEqual(['Questionable']);
  });
  it('treats missing injury fields and unknown labels as unknown, with diagnostics', () => {
    const result = observeTeamEvents({
      ...args,
      roster: {
        ...roster,
        athletes: [
          {
            position: 'WR',
            items: [
              { id: '1', fullName: 'Player A' },
              { id: '2', fullName: 'Player B', injuries: [{ status: 'Mystery' }] },
            ],
          },
        ],
      },
    });
    expect(result.observation.injuries.map((i) => i.designations)).toEqual([null, null]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
  it.each([
    {
      items: [
        {
          name: 'Base',
          positions: {
            wr: {
              athletes: [
                { rank: 4, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/99' } },
              ],
            },
          },
        },
      ],
    },
    { items: [{ name: 'Base', positions: { mystery: { athletes: [] } } }] },
    {
      items: [
        {
          name: 'Base',
          positions: {
            wr: {
              athletes: [
                { rank: 0, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
              ],
            },
          },
        },
      ],
    },
  ])('quarantines unknown positions, invalid ranks and unresolved biographies', (depthcharts) => {
    const result = observeTeamEvents({ ...args, depthcharts });
    expect(result.errors).toEqual([]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.observation.coveredPositions).toEqual([]);
  });
  it('keeps an explicitly empty position covered', () => {
    expect(
      observeTeamEvents({
        ...args,
        depthcharts: { items: [{ name: 'Base', positions: { wr: { athletes: [] } } }] },
      }).observation.coveredPositions
    ).toEqual(['WR']);
  });
  it('quarantines conflicting athletes at one source rank', () => {
    const dup = {
      items: [
        {
          name: 'Base',
          positions: {
            wr: {
              athletes: [
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/2' } },
              ],
            },
          },
        },
      ],
    };
    const result = observeTeamEvents({ ...args, depthcharts: dup });
    expect(result.observation.coveredPositions).toEqual([]);
    expect(result.observation.slots).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

it('preserves distinct left and right source tackle slots without changing app positions', () => {
  const result = observeTeamEvents({
    ...args,
    depthcharts: {
      items: [
        {
          name: 'Defense',
          positions: {
            ldt: {
              athletes: [
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
              ],
            },
            rdt: {
              athletes: [
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/2' } },
              ],
            },
          },
        },
      ],
    },
  });
  expect(result.errors).toEqual([]);
  expect(result.observation.slots.map((s) => s.position)).toEqual(['LDT', 'RDT']);
});

it('preserves valid positions alongside an uncertain position', () => {
  const result = observeTeamEvents({
    ...args,
    depthcharts: {
      items: [
        {
          name: 'Base',
          positions: {
            wr: {
              athletes: [
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/99' } },
              ],
            },
            qb: {
              athletes: [
                { rank: 1, athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' } },
              ],
            },
          },
        },
      ],
    },
  });
  expect(result.errors).toEqual([]);
  expect(result.observation.coveredPositions).toEqual(['QB']);
  expect(result.observation.slots.map((s) => s.position)).toEqual(['QB']);
});

it('quarantines a player occupying two different ranks at one position', () => {
  const result = observeTeamEvents({
    ...args,
    depthcharts: {
      items: [
        {
          name: 'Base',
          positions: {
            wr: {
              athletes: [1, 2].map((rank) => ({
                rank,
                athlete: { $ref: 'https://sports.core.api.espn.com/v2/athletes/1' },
              })),
            },
          },
        },
      ],
    },
  });
  expect(result.observation.coveredPositions).toEqual([]);
  expect(result.observation.slots).toEqual([]);
  expect(result.diagnostics.length).toBeGreaterThan(0);
});

it('reports malformed source structures without throwing', () => {
  const result = observeTeamEvents({
    ...args,
    roster: JSON.parse('{"athletes":[null]}'),
    depthcharts: JSON.parse('{"items":[null]}'),
  });
  expect(result.errors.length).toBeGreaterThan(0);
});

it('treats a malformed slot or injury as uncertainty', () => {
  const result = observeTeamEvents({
    ...args,
    roster: JSON.parse(
      '{"athletes":[{"items":[{"id":"1","fullName":"Player A","injuries":[null]}]}]}'
    ),
    depthcharts: JSON.parse(
      '{"items":[{"positions":{"wr":{"athletes":[null]},"qb":{"athletes":[]}}}]}'
    ),
  });
  expect(result.errors).toEqual([]);
  expect(result.observation.coveredPositions).toEqual(['QB']);
  expect(result.observation.injuries[0].designations).toBeNull();
});
