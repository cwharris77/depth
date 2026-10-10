/**
 * Sends a push notification for each team event a subscribed device has not had yet.
 *
 * Sends only when PUSH_SENDER_ENABLED is exactly "true". Anything else pauses the
 * sender: it still reads what is owed and reports it, but claims and sends nothing, so
 * events keep landing in `team_events` untouched.
 *
 * Usage: npm run push:send
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { createApnsJwt, createHttp2ApnsClient } from '@/lib/push/apns';
import { deliveryKey } from '@/lib/push/plan-sends';
import { formatSummary, runSender, type DeliveryPair, type PushStore } from '@/lib/push/send-run';
import {
  fromPushDeviceRow,
  fromTeamEventRow,
  type PushDevice,
  type PushableEvent,
} from '@/lib/push/types';

// The API returns at most this many rows per request by default.
const PAGE = 1000;
// Keeps an `in (...)` filter's URL well inside the request-line limit.
const ID_CHUNK = 100;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function supabaseStore(supabase: SupabaseClient<Database>): PushStore {
  return {
    async listDevices() {
      const devices: PushDevice[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('push_devices')
          .select('id, apns_token, team_id, tier, bundle_id, apns_environment, notify_after')
          .neq('tier', 'off')
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`push_devices read: ${error.message}`);
        devices.push(...(data ?? []).map(fromPushDeviceRow));
        if (!data || data.length < PAGE) return devices;
      }
    },
    async listEventsSince(iso) {
      const events: PushableEvent[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('team_events')
          .select('id, event_type, tier, team_id, headline, detail, created_at')
          .gt('created_at', iso)
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw new Error(`team_events read: ${error.message}`);
        events.push(...(data ?? []).map(fromTeamEventRow));
        if (!data || data.length < PAGE) return events;
      }
    },
    async listDeliveries(eventIds) {
      const keys = new Set<string>();
      for (const ids of chunk(eventIds, ID_CHUNK)) {
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from('team_event_deliveries')
            .select('event_id, device_id')
            .in('event_id', ids)
            .order('event_id')
            .order('device_id')
            .range(from, from + PAGE - 1);
          if (error) throw new Error(`team_event_deliveries read: ${error.message}`);
          for (const row of data ?? []) keys.add(deliveryKey(row.event_id, row.device_id));
          if (!data || data.length < PAGE) break;
        }
      }
      return keys;
    },
    async claim(pairs: readonly DeliveryPair[]) {
      // `ignoreDuplicates` makes this insert-or-skip, and the returned rows are only
      // the ones this call inserted.
      const { data, error } = await supabase
        .from('team_event_deliveries')
        .upsert(
          pairs.map((pair) => ({ event_id: pair.eventId, device_id: pair.deviceId })),
          { onConflict: 'event_id,device_id', ignoreDuplicates: true }
        )
        .select('event_id, device_id');
      if (error) throw new Error(`team_event_deliveries claim: ${error.message}`);
      return new Set((data ?? []).map((row) => deliveryKey(row.event_id, row.device_id)));
    },
    async release(pairs) {
      for (const pair of pairs) {
        const { error } = await supabase
          .from('team_event_deliveries')
          .delete()
          .eq('event_id', pair.eventId)
          .eq('device_id', pair.deviceId);
        if (error) throw new Error(`team_event_deliveries release: ${error.message}`);
      }
    },
    async removeDevice(deviceId) {
      const { error } = await supabase.from('push_devices').delete().eq('id', deviceId);
      if (error) throw new Error(`push_devices delete: ${error.message}`);
    },
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const now = new Date();
  const supabase = createClient<Database>(
    required('SUPABASE_URL'),
    required('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false } }
  );
  const enabled = process.env.PUSH_SENDER_ENABLED === 'true';
  const client = enabled
    ? createHttp2ApnsClient({
        jwt: createApnsJwt({
          keyP8: required('APNS_KEY_P8'),
          keyId: required('APNS_KEY_ID'),
          teamId: required('APNS_TEAM_ID'),
          now,
        }),
        now,
      })
    : null;
  try {
    const summary = await runSender({ store: supabaseStore(supabase), client, enabled, now });
    console.log(formatSummary(summary));
    if (summary.fatal) console.error(summary.fatal);
    if (summary.fatal || summary.failed > 0) process.exitCode = 1;
  } finally {
    client?.close();
  }
}

main().catch((error) => {
  console.error(`push sender: ${(error as Error).message}`);
  process.exitCode = 1;
});
