import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { buildRecordFiles, type RecordGameRow } from '@/lib/stat-files/records';
import { writeStatEvents } from './write-stat-events';
const row = (id: string, season: number, yards: number): RecordGameRow => ({
  player_id: id,
  team: 'seahawks',
  season,
  week: 1,
  stats: { rushing_yards: yards },
});
const rowsBySeason = new Map([
  [2025, Array.from({ length: 11 }, (_, i) => row(`old${i}`, 2025, 300 - i * 10))],
  [2026, [row('1', 2026, 100)]],
]);
const args = {
  built: buildRecordFiles(rowsBySeason, 1),
  rowsBySeason,
  currentSeason: 2026,
  now: '2026-10-10T15:00Z',
};
function client(fail: 'names' | 'insert' | null = null) {
  const written: unknown[] = [];
  const supabase = createClient<Database>('http://fixture.local', 'fixture-key', {
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
        if (url.pathname.endsWith('/players'))
          return fail === 'names'
            ? reply({ message: 'names failed' }, 400)
            : reply([
                { id: '1', name: 'Player One' },
                { id: '2', name: 'Player Two' },
              ]);
        if (url.pathname.endsWith('/team_events')) {
          if (fail === 'insert') return reply({ message: 'insert failed' }, 400);
          written.push(...JSON.parse(String(init?.body)));
          expect(url.searchParams.get('on_conflict')).toBe('dedupe_key');
          expect(new Headers(init?.headers).get('Prefer')).toContain(
            'resolution=ignore-duplicates'
          );
          return reply(null, 201);
        }
        throw new Error(`unexpected query ${url}`);
      },
    },
  });
  return { supabase, written };
}
describe('finished stat build event writing', () => {
  it('writes good weeks when there are no Big moments', async () => {
    const f = client();
    expect(await writeStatEvents(f.supabase, args)).toBe(1);
    expect(f.written).toMatchObject([
      { event_type: 'good_week', tier: 'everything', dedupe_key: 'good_week:2026:1:seahawks:1' },
    ]);
  });
  it('writes mixed tiers in one batch with no historic/good overlap', async () => {
    const f = client();
    const rows = new Map(rowsBySeason);
    rows.set(2026, [row('1', 2026, 100), row('2', 2026, 215)]);
    await writeStatEvents(f.supabase, {
      ...args,
      built: buildRecordFiles(rows, 1),
      rowsBySeason: rows,
    });
    expect(f.written).toHaveLength(2);
    expect(f.written).toMatchObject([
      { event_type: 'historic_week', player_id: '2' },
      { event_type: 'good_week', player_id: '1' },
    ]);
  });
  it.each(['names', 'insert'] as const)('surfaces %s failures', async (failure) => {
    const f = client(failure);
    await expect(writeStatEvents(f.supabase, args)).rejects.toThrow();
    expect(f.written).toEqual([]);
  });
  it('does not assume absent record files prove a non-historic game', async () => {
    const f = client();
    await writeStatEvents(f.supabase, { ...args, built: { ...args.built, records: new Map() } });
    expect(f.written).toEqual([]);
  });
  it('does not backfill an older week when the latest week lacks a comparator', async () => {
    const f = client();
    const rows = new Map(rowsBySeason);
    rows.set(2026, [
      row('1', 2026, 100),
      { ...row('1', 2026, 0), week: 2, stats: { passing_yards: 300 } },
      { ...row('2', 2026, 100), week: 2 },
    ]);
    const records = new Map(args.built.records);
    records.delete('passing_yards');
    await writeStatEvents(f.supabase, {
      ...args,
      rowsBySeason: rows,
      built: { ...args.built, records },
    });
    expect(f.written).toMatchObject([
      { event_type: 'good_week', player_id: '2', payload: { week: 2 } },
    ]);
    expect(f.written).toHaveLength(1);
  });
});
