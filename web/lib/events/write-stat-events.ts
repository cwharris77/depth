// Record chases and historic games from a finished record build, written to
// `team_events`. Shared by the stat-files build and the fixture replay so both exercise
// the same read, the same detector and the same upsert.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { RecordGameRow, RecordOutputs } from '@/lib/stat-files/records';
import { findStatMoments, statMomentEvents } from './stat-events';
import { toTeamEventRow } from './types';

export async function writeStatEvents(
  supabase: SupabaseClient<Database>,
  args: {
    built: RecordOutputs;
    rowsBySeason: ReadonlyMap<number, readonly RecordGameRow[]>;
    currentSeason: number;
    now: string;
  }
): Promise<number> {
  const moments = findStatMoments({
    currentSeason: args.currentSeason,
    records: args.built.records,
    currentRows: args.rowsBySeason.get(args.currentSeason) ?? [],
  });
  if (moments.length === 0) return 0;

  const ids = [...new Set(moments.map((moment) => moment.playerId))];
  const { data, error: namesError } = await supabase
    .from('players')
    .select('id, name')
    .in('id', ids);
  if (namesError) throw new Error(`players read: ${namesError.message}`);

  const events = statMomentEvents(moments, {
    playerNames: new Map((data ?? []).map((player) => [player.id, player.name])),
    now: args.now,
  });
  if (events.length === 0) return 0;
  const { error } = await supabase
    .from('team_events')
    .upsert(events.map(toTeamEventRow), { onConflict: 'dedupe_key', ignoreDuplicates: true });
  if (error) throw new Error(`team_events upsert: ${error.message}`);
  return events.length;
}
