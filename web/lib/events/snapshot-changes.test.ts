import { describe, expect, it } from 'vitest';
import { advanceSnapshot, parseStoredSnapshot } from './snapshot-changes';
import type { TeamObservation } from './types';
const at = '2026-10-10T15:00:00Z';
const slot = (id: string, depthRank: number, position = 'WR') => ({
  position,
  depthRank,
  playerId: id,
  playerName: `Player ${id}`,
});
const observed: TeamObservation = {
  teamId: 'seahawks',
  teamName: 'Seahawks',
  observedAt: at,
  slots: [slot('A', 1), slot('B', 2), slot('C', 3), slot('D', 4), slot('E', 5)],
  coveredPositions: ['WR'],
  injuries: [{ playerId: 'A', playerName: 'Player A', designations: ['Questionable'] }],
};
const baseline = () => ({
  revision: 1,
  observedAt: at,
  state: advanceSnapshot({ previous: null, observed, starterEvents: [] }).next,
});
const change = {
  ...observed,
  observedAt: '2026-10-10T16:00:00Z',
  slots: [slot('B', 1), slot('A', 2), slot('C', 3), slot('E', 4), slot('D', 5)],
};
function confirm(
  observation: TeamObservation,
  prior = baseline(),
  starterEvents = [] as Parameters<typeof advanceSnapshot>[0]['starterEvents']
) {
  const first = advanceSnapshot({ previous: prior, observed: observation, starterEvents });
  const saved = {
    revision: prior.revision + 1,
    observedAt: observation.observedAt,
    state: first.next,
  };
  return {
    first,
    second: advanceSnapshot({
      previous: saved,
      observed: { ...observation, observedAt: '2026-10-10T17:00:00Z' },
      starterEvents,
    }),
  };
}
describe('snapshot transitions', () => {
  it('baselines silently and requires a second distinct observation', () => {
    const prior = baseline();
    expect(advanceSnapshot({ previous: null, observed, starterEvents: [] }).events).toEqual([]);
    const first = advanceSnapshot({ previous: prior, observed: change, starterEvents: [] });
    expect(first.events).toEqual([]);
    const saved = { revision: 2, observedAt: change.observedAt, state: first.next };
    expect(
      advanceSnapshot({ previous: saved, observed: change, starterEvents: [] }).events
    ).toEqual([]);
    const second = advanceSnapshot({
      previous: saved,
      observed: { ...change, observedAt: '2026-10-10T17:00:00Z' },
      starterEvents: [],
    });
    expect(second.events.map((e) => e.playerId)).toEqual(['D', 'E']);
    expect(second.events.map((e) => e.payload.depth_rank)).toEqual([5, 4]);
    expect(second.events[0].occurredAt).toBe(change.observedAt);
  });
  it('keeps unrelated backup changes while suppressing both starter participants', () => {
    const { second } = confirm(change);
    expect(second.events.map((e) => e.playerId)).toEqual(['D', 'E']);
    expect(second.events.every((e) => e.tier === 'everything')).toBe(true);
  });
  it('cancels a one-run flap and does not count changed display names', () => {
    const { first } = confirm(change);
    const saved = { revision: 2, observedAt: change.observedAt, state: first.next };
    const restored = advanceSnapshot({
      previous: saved,
      observed: { ...observed, observedAt: '2026-10-10T17:00:00Z' },
      starterEvents: [],
    });
    expect(restored.events).toEqual([]);
    expect(restored.next.candidates).toEqual({});
    expect(
      confirm({
        ...observed,
        observedAt: change.observedAt,
        slots: observed.slots.map((s) => ({ ...s, playerName: 'New name' })),
      }).second.events
    ).toEqual([]);
  });
  it('does not invent removals from a missing position and requires two explicit empty sightings', () => {
    const missing = advanceSnapshot({
      previous: baseline(),
      observed: { ...change, slots: [], coveredPositions: [], injuries: [] },
      starterEvents: [],
    });
    expect(missing.next.confirmedSlots).toEqual(observed.slots);
    expect(missing.events).toEqual([]);
    const { second } = confirm({ ...change, slots: [] });
    expect(second.events.map((e) => e.playerId)).toEqual(['B', 'C', 'D', 'E']);
  });
  it('treats returner rank-one changes as Everything', () => {
    const kr = { ...observed, slots: [slot('A', 1, 'KR')], coveredPositions: ['KR'] };
    const prior = {
      revision: 1,
      observedAt: at,
      state: advanceSnapshot({ previous: null, observed: kr, starterEvents: [] }).next,
    };
    expect(
      confirm({ ...kr, observedAt: change.observedAt, slots: [slot('B', 1, 'KR')] }, prior).second
        .events
    ).toHaveLength(2);
  });
  it('emits known injury changes immediately but preserves unknown and missing athletes', () => {
    const prior = baseline();
    const out = {
      ...observed,
      observedAt: change.observedAt,
      injuries: [{ playerId: 'A', playerName: 'Player A', designations: ['Out'] }],
    };
    const result = advanceSnapshot({ previous: prior, observed: out, starterEvents: [] });
    expect(result.events[0].type).toBe('injury_change');
    for (const injuries of [[], [{ playerId: 'A', playerName: 'Player A', designations: null }]]) {
      const r = advanceSnapshot({
        previous: prior,
        observed: { ...out, injuries },
        starterEvents: [],
      });
      expect(r.events).toEqual([]);
      expect(r.next.injuries[0].designations).toEqual(['Questionable']);
    }
    const clear = advanceSnapshot({
      previous: { revision: 2, observedAt: out.observedAt, state: result.next },
      observed: {
        ...out,
        observedAt: '2026-10-10T17:00:00Z',
        injuries: [{ ...out.injuries[0], designations: [] }],
      },
      starterEvents: [],
    });
    expect(clear.events[0].headline).toContain('no longer listed on the injury report');
  });
  it('rejects malformed stored state rather than silently rebaselining', () => {
    expect(() => parseStoredSnapshot({ revision: 1, observed_at: at, state: {} })).toThrow();
    expect(() =>
      parseStoredSnapshot({ revision: NaN, observed_at: at, state: baseline().state })
    ).toThrow();
    expect(parseStoredSnapshot({ revision: 1, observed_at: at, state: baseline().state })).toEqual(
      baseline()
    );
  });
});
