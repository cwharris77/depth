// One sender run against an injected store and APNs client. The store claims each
// (event, device) pair before the request goes out, so two runs can never both send
// it; a retryable failure gives the claim back, anything else keeps it.

import type { ApnsClient } from './apns';
import { buildNotification, deliveryKey, MAX_EVENT_AGE_HOURS, planSends } from './plan-sends';
import type { PushDevice, PushableEvent } from './types';

export interface DeliveryPair {
  eventId: string;
  deviceId: string;
}

export interface PushStore {
  listDevices(): Promise<PushDevice[]>;
  listEventsSince(iso: string): Promise<PushableEvent[]>;
  listDeliveries(eventIds: readonly string[]): Promise<Set<string>>;
  /** Inserts the pairs it can and returns the `deliveryKey` of each one it inserted. */
  claim(pairs: readonly DeliveryPair[]): Promise<Set<string>>;
  release(pairs: readonly DeliveryPair[]): Promise<void>;
  removeDevice(deviceId: string): Promise<void>;
}

export interface SenderSummary {
  paused: boolean;
  /** Notifications owed at the start of the run. */
  planned: number;
  sent: number;
  pruned: number;
  failed: number;
  /** Set when the provider credentials were rejected and the run stopped early. */
  fatal: string | null;
}

export async function runSender(args: {
  store: PushStore;
  /** Null only when `enabled` is false. */
  client: ApnsClient | null;
  enabled: boolean;
  now: Date;
}): Promise<SenderSummary> {
  const { store, now } = args;
  if (args.enabled && !args.client) throw new Error('An enabled sender run needs an APNs client');
  const since = new Date(now.getTime() - MAX_EVENT_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const [devices, events] = await Promise.all([store.listDevices(), store.listEventsSince(since)]);
  const delivered = await store.listDeliveries(events.map((event) => event.id));
  const sends = planSends({ devices, events, delivered, now });

  const summary: SenderSummary = {
    paused: !args.enabled,
    planned: sends.length,
    sent: 0,
    pruned: 0,
    failed: 0,
    fatal: null,
  };
  if (!args.enabled || !args.client) return summary;

  for (const send of sends) {
    const pairs = send.events.map((event) => ({ eventId: event.id, deviceId: send.device.id }));
    const won = await store.claim(pairs);
    const mine = send.events.filter((event) => won.has(deliveryKey(event.id, send.device.id)));
    if (mine.length === 0) continue;
    const held = mine.map((event) => ({ eventId: event.id, deviceId: send.device.id }));

    const { payload, collapseId } = buildNotification(send.device, mine);
    const response = await args.client.send({
      token: send.device.apnsToken,
      environment: send.device.apnsEnvironment,
      topic: send.device.bundleId,
      collapseId,
      payload,
    });

    if (response.outcome === 'sent') {
      summary.sent += 1;
    } else if (response.outcome === 'prune') {
      // Deleting the device cascades to its delivery rows.
      await store.removeDevice(send.device.id);
      summary.pruned += 1;
    } else if (response.outcome === 'retry') {
      await store.release(held);
      summary.failed += 1;
    } else {
      await store.release(held);
      summary.fatal =
        `APNs rejected the provider token: ${response.status} ${response.reason ?? ''}`.trim();
      break;
    }
  }
  return summary;
}

export function formatSummary(summary: SenderSummary): string {
  if (summary.paused) return `push sender: paused (${summary.planned} notifications owed)`;
  return `push sender: sent ${summary.sent}, pruned ${summary.pruned}, failed ${summary.failed}`;
}
