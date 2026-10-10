// Which devices are owed which events, and the notification each one gets. Pure: no
// fetch, no DB, no clock other than the `now` passed in.

import { createHash } from 'node:crypto';
import type { PushDevice, PushableEvent } from './types';

/** An event older than this is history, not news, and is never pushed. */
export const MAX_EVENT_AGE_HOURS = 36;

/** The notification category that carries the "Turn off Everything" action. */
export const EVERYTHING_CATEGORY = 'EVERYTHING_TIER';

/** How many headlines a summary lists before it counts the rest. */
export const SUMMARY_HEADLINE_LIMIT = 4;

/**
 * How many event ids a payload lists. APNs rejects a payload over 4096 bytes, and the
 * ids are the only part that grows with the batch.
 */
export const MAX_PAYLOAD_EVENT_IDS = 20;

export function deliveryKey(eventId: string, deviceId: string): string {
  return `${eventId}:${deviceId}`;
}

export interface ApnsPayload {
  aps: {
    alert: { title: string; body?: string };
    sound: 'default';
    'thread-id': string;
    category?: string;
  };
  team_id: string;
  event_ids: string[];
  event_type?: string;
}

export interface PlannedSend {
  device: PushDevice;
  events: PushableEvent[];
}

function wants(device: PushDevice, event: PushableEvent): boolean {
  if (device.tier === 'off') return false;
  if (device.teamId !== event.teamId) return false;
  return device.tier === 'everything' || event.tier === 'big_moments';
}

export function planSends(args: {
  devices: readonly PushDevice[];
  events: readonly PushableEvent[];
  /** `deliveryKey` of every pair already claimed. */
  delivered: ReadonlySet<string>;
  now: Date;
}): PlannedSend[] {
  const oldest = args.now.getTime() - MAX_EVENT_AGE_HOURS * 60 * 60 * 1000;
  const fresh = args.events
    .filter((event) => Date.parse(event.createdAt) > oldest)
    // Compared as instants: Postgres writes offsets and fractional seconds that do not
    // sort as text.
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));

  const sends: PlannedSend[] = [];
  for (const device of [...args.devices].sort((a, b) => a.id.localeCompare(b.id))) {
    const subscribed = Date.parse(device.notifyAfter);
    const events = fresh.filter(
      (event) =>
        wants(device, event) &&
        Date.parse(event.createdAt) > subscribed &&
        !args.delivered.has(deliveryKey(event.id, device.id))
    );
    if (events.length) sends.push({ device, events });
  }
  return sends;
}

/**
 * One notification for one device. A single event is shown with its stored text; more
 * than one becomes a fixed summary. The collapse id is derived from every event id in
 * the batch, including the ones the payload does not list, so if the same batch ever
 * reached a device twice the second would replace the first.
 */
export function buildNotification(
  device: PushDevice,
  events: readonly PushableEvent[]
): { payload: ApnsPayload; collapseId: string } {
  const [first] = events;
  const alert =
    events.length === 1
      ? { title: first.headline, ...(first.detail ? { body: first.detail } : {}) }
      : {
          title: `${events.length} updates on your team`,
          body: [
            ...events.slice(0, SUMMARY_HEADLINE_LIMIT).map((event) => event.headline),
            ...(events.length > SUMMARY_HEADLINE_LIMIT
              ? [`and ${events.length - SUMMARY_HEADLINE_LIMIT} more`]
              : []),
          ].join('\n'),
        };
  const offerLeave =
    device.tier === 'everything' && events.some((event) => event.tier === 'everything');
  const ids = events.map((event) => event.id);
  return {
    payload: {
      aps: {
        alert,
        sound: 'default',
        'thread-id': device.teamId,
        ...(offerLeave ? { category: EVERYTHING_CATEGORY } : {}),
      },
      team_id: device.teamId,
      event_ids: ids.slice(0, MAX_PAYLOAD_EVENT_IDS),
      ...(events.length === 1 ? { event_type: first.type } : {}),
    },
    collapseId: createHash('sha256').update(ids.join(',')).digest('hex'),
  };
}
