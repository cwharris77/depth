// One sender run against an injected store and APNs client. The store claims each
// (event, device) pair before the request goes out, so two runs can never both send
// it. The claim is given back only when APNs definitely did not deliver; a request
// whose outcome is unknown keeps it, because sending again could reach the device twice.

import type { ApnsClient, ApnsResponse } from './apns';
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

/** This many requests in a row with no HTTP status at all ends the run. */
export const MAX_CONSECUTIVE_UNREACHABLE = 3;

export interface SenderSummary {
  paused: boolean;
  /** Notifications owed at the start of the run. */
  planned: number;
  sent: number;
  pruned: number;
  /** Notifications not confirmed sent: rejected, unanswered, or a store call threw. */
  failed: number;
  /** Set when the provider token was rejected and the run stopped early. */
  fatal: string | null;
  /** Set when APNs stopped answering and the run stopped early. */
  aborted: string | null;
}

/** Runs a store call whose failure must not end the run; false when it threw. */
async function settled(call: () => Promise<unknown>): Promise<boolean> {
  try {
    await call();
    return true;
  } catch {
    return false;
  }
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
    aborted: null,
  };
  if (!args.enabled || !args.client) return summary;

  const client = args.client;
  let unreachable = 0;
  for (const send of sends) {
    const pairs = send.events.map((event) => ({ eventId: event.id, deviceId: send.device.id }));
    let won: Set<string>;
    try {
      won = await store.claim(pairs);
    } catch {
      summary.failed += 1;
      continue;
    }
    const mine = send.events.filter((event) => won.has(deliveryKey(event.id, send.device.id)));
    if (mine.length === 0) continue;
    const held = mine.map((event) => ({ eventId: event.id, deviceId: send.device.id }));

    const { payload, collapseId } = buildNotification(send.device, mine);
    let response: ApnsResponse;
    try {
      response = await client.send({
        token: send.device.apnsToken,
        environment: send.device.apnsEnvironment,
        topic: send.device.bundleId,
        collapseId,
        payload,
      });
    } catch (error) {
      // The request may have gone out before the client threw.
      response = { outcome: 'unknown', status: 0, reason: (error as Error).message };
    }

    if (response.outcome === 'sent') {
      summary.sent += 1;
    } else if (response.outcome === 'prune') {
      // Deleting the device cascades to its delivery rows. If the delete fails the
      // claim stays, and the device is pruned when a later event is sent to it.
      if (await settled(() => store.removeDevice(send.device.id))) summary.pruned += 1;
      else summary.failed += 1;
    } else if (response.outcome === 'unknown') {
      summary.failed += 1;
    } else {
      // A release that throws leaves the claim in place: the event is lost to this
      // device rather than sent twice.
      await settled(() => store.release(held));
      summary.failed += 1;
      if (response.outcome === 'fatal') {
        summary.fatal =
          `APNs rejected the provider token: ${response.status} ${response.reason ?? ''}`.trim();
        break;
      }
    }

    const answered = response.outcome !== 'unknown' && response.status !== 0;
    unreachable = answered ? 0 : unreachable + 1;
    if (unreachable >= MAX_CONSECUTIVE_UNREACHABLE) {
      summary.aborted = `APNs unreachable: stopped after ${unreachable} consecutive requests without a response`;
      break;
    }
  }
  return summary;
}

export function formatSummary(summary: SenderSummary): string {
  if (summary.paused) return `push sender: paused (${summary.planned} notifications owed)`;
  const stopped = summary.fatal ?? summary.aborted;
  return (
    `push sender: sent ${summary.sent}, pruned ${summary.pruned}, failed ${summary.failed}` +
    (stopped ? ` (stopped: ${stopped})` : '')
  );
}
