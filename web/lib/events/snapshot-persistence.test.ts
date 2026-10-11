// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
const url = process.env.LOCAL_SUPABASE_URL;
const key = process.env.LOCAL_SUPABASE_SERVICE_KEY;
const state = {
  schemaVersion: 1,
  confirmedSlots: [],
  coveredPositions: [],
  candidates: {},
  injuries: [],
};
describe.skipIf(!url || !key)(
  'snapshot persistence (requires explicit local Supabase configuration)',
  () => {
    let teamId: string;
    const client = () => {
      if (!url || !key || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
        throw new Error('Local Supabase configuration required');
      return createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    };
    beforeEach(async () => {
      teamId = `snapshot-test-${randomUUID()}`;
      const { error } = await client().from('teams').insert({
        id: teamId,
        city: 'Fixture',
        name: 'Snapshot test',
        abbrev: 'SNT',
        conference: 'NFC',
        division: 'West',
      });
      if (error) throw error;
    });
    afterEach(async () => {
      const { error } = await client().from('teams').delete().eq('id', teamId);
      if (error) throw error;
    });
    function commit(
      revision = 0,
      time = '1900-01-01T15:00Z',
      events: Database['public']['Functions']['commit_team_event_snapshot']['Args']['p_events'] = []
    ) {
      return client().rpc('commit_team_event_snapshot', {
        p_team_id: teamId,
        p_expected_revision: revision,
        p_observed_at: time,
        p_state: state,
        p_events: events,
        p_starter_state: [],
      });
    }
    it('serializes racing first observations and does not duplicate their event', async () => {
      const event = {
        dedupe_key: `${teamId}:injury`,
        event_type: 'injury_change',
        tier: 'everything',
        team_id: teamId,
        player_id: null,
        headline: 'Fixture changed',
        detail: null,
        payload: {},
        source: 'espn_injuries',
        occurred_at: '1900-01-01T15:00Z',
      };
      const results = await Promise.all([
        commit(0, undefined, [event]),
        commit(0, undefined, [event]),
      ]);
      expect(results.map((r) => r.error)).toEqual([null, null]);
      expect(results.map((r) => r.data).sort()).toEqual([false, true]);
      const saved = await client()
        .from('team_event_snapshot_state')
        .select('revision')
        .eq('team_id', teamId)
        .single();
      expect(saved.data?.revision).toBe(1);
      const rows = await client().from('team_events').select('id').eq('team_id', teamId);
      expect(rows.data).toHaveLength(1);
    });
    it('rolls back an invalid event and permits a clean retry from the same revision', async () => {
      const invalid = {
        dedupe_key: `${teamId}:invalid`,
        event_type: 'injury_change',
        tier: 'invalid',
        team_id: teamId,
        headline: 'Fixture changed',
        payload: {},
        source: 'espn_injuries',
        occurred_at: '1900-01-01T15:00Z',
      };
      expect((await commit(0, undefined, [invalid])).error).not.toBeNull();
      expect(
        (await client().from('team_event_snapshot_state').select('*').eq('team_id', teamId)).data
      ).toEqual([]);
      expect((await commit()).data).toBe(true);
      expect((await commit(1, '1900-01-01T15:00Z')).data).toBe(false);
    });
  }
);
