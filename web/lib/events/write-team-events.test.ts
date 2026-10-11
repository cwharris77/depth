import { describe, expect, it } from 'vitest';
import { canWriteEventCohort, writeCompleteTeamEvents, writeTeamEvents } from './write-team-events';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { TeamObservation } from './types';
const obs: TeamObservation = {
  teamId: 'seahawks',
  teamName: 'Seahawks',
  observedAt: '2026-10-10T15:00Z',
  slots: [{ position: 'WR', depthRank: 1, playerId: '1', playerName: 'Player One' }],
  coveredPositions: ['WR'],
  injuries: [],
};
const args = {
  observations: [obs],
  transactions: [],
  teamIdByEspnId: new Map([['26', 'seahawks']]),
  teams: [{ id: 'seahawks', name: 'Seahawks', city: 'Seattle' }],
  now: obs.observedAt,
};
const cohort = {
  expectedTeams: ['seahawks'],
  builtTeams: ['seahawks'],
  writtenTeams: ['seahawks'],
  errors: [],
  observationErrors: [],
};
function fake(failure: 'rpc' | 'read' | 'conflict' | 'response-loss' | null = null) {
  let snapshot: unknown = null;
  let calls = 0;
  let reads = 0;
  const client = createClient<Database>('http://fixture.local', 'fixture-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `fixture-${Math.random()}`,
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const reply = (data: unknown, status = 200) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        if (url.pathname.endsWith('/rpc/commit_team_event_snapshot')) {
          calls++;
          const body = JSON.parse(String(init?.body));
          if (failure === 'rpc') return reply({ message: 'fixture write failed' }, 400);
          if (failure === 'response-loss' && calls === 1) {
            snapshot = { revision: 1, observed_at: body.p_observed_at, state: body.p_state };
            throw new Error('response lost');
          }
          if (failure === 'conflict' && calls === 1) return reply(false);
          snapshot = {
            revision: body.p_expected_revision + 1,
            observed_at: body.p_observed_at,
            state: body.p_state,
          };
          return reply(true);
        }
        if (url.pathname.endsWith('/team_event_snapshot_state')) {
          reads++;
          if (failure === 'read') return reply({ message: 'schema missing' }, 400);
          return reply(snapshot);
        }
        if (url.pathname.endsWith('/team_starter_state')) return reply([]);
        if (url.pathname.endsWith('/team_events')) return reply(null, 201);
        throw new Error(`Unexpected query ${url}`);
      },
    },
  });
  return {
    client,
    get calls() {
      return calls;
    },
    get reads() {
      return reads;
    },
    get snapshot() {
      return snapshot;
    },
  };
}
describe('complete source gating and atomic writes', () => {
  it.each([
    { ...cohort, writtenTeams: [] },
    { ...cohort, builtTeams: ['other'] },
    { ...cohort, errors: ['failed'] },
    { ...cohort, observationErrors: ['missing bio'] },
    { ...cohort, writtenTeams: ['seahawks', 'seahawks'] },
  ])('skips the actual event phase on incomplete input', async (incomplete) => {
    const f = fake();
    expect(canWriteEventCohort(incomplete)).toBe(false);
    expect(await writeCompleteTeamEvents(f.client, { ...args, cohort: incomplete })).toBe(0);
    expect(f.reads).toBe(0);
    expect(f.calls).toBe(0);
  });
  it('atomically baselines once and ignores exact repeats', async () => {
    const f = fake();
    await writeTeamEvents(f.client, args);
    expect(f.calls).toBe(1);
    await writeTeamEvents(f.client, args);
    expect(f.calls).toBe(1);
    expect(f.snapshot).toMatchObject({ revision: 1 });
  });
  it('recomputes one revision conflict', async () => {
    const f = fake('conflict');
    await writeTeamEvents(f.client, args);
    expect(f.calls).toBe(2);
    expect(f.reads).toBe(2);
  });
  it.each(['rpc', 'read'] as const)('surfaces %s failure without advancing', async (failure) => {
    const f = fake(failure);
    await expect(writeTeamEvents(f.client, args)).rejects.toThrow();
    expect(f.snapshot).toBeNull();
  });
  it('recovers a response lost after commit without counting another sighting', async () => {
    const f = fake('response-loss');
    await expect(writeTeamEvents(f.client, args)).rejects.toThrow();
    await writeTeamEvents(f.client, args);
    expect(f.calls).toBe(1);
    expect(f.snapshot).toMatchObject({ revision: 1 });
  });
});
