// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildNotification, deliveryKey, MAX_PAYLOAD_EVENT_IDS, planSends } from './plan-sends';
import type { PushDevice, PushableEvent } from './types';

const NOW = new Date('2026-10-10T20:00:00Z');

function device(overrides: Partial<PushDevice> = {}): PushDevice {
  return {
    id: 'd1',
    apnsToken: 'a'.repeat(64),
    teamId: 'seahawks',
    tier: 'big_moments',
    bundleId: 'com.cwharris.depth',
    apnsEnvironment: 'production',
    notifyAfter: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function event(overrides: Partial<PushableEvent> = {}): PushableEvent {
  return {
    id: 'e1',
    type: 'starter_change',
    tier: 'big_moments',
    teamId: 'seahawks',
    headline: 'Seahawks: Sam Darnold is the new starter at QB',
    detail: 'Replaces Geno Smith.',
    createdAt: '2026-10-10T19:00:00Z',
    ...overrides,
  };
}

function plan(devices: PushDevice[], events: PushableEvent[], delivered: string[] = []) {
  return planSends({ devices, events, delivered: new Set(delivered), now: NOW });
}

describe('planSends', () => {
  it('sends a new event to a device following that team', () => {
    expect(plan([device()], [event()])).toEqual([{ device: device(), events: [event()] }]);
  });

  it('sends nothing to another team, an off device, or an already delivered pair', () => {
    expect(plan([device({ teamId: 'bills' })], [event()])).toEqual([]);
    expect(plan([device({ tier: 'off' })], [event()])).toEqual([]);
    expect(plan([device()], [event()], [deliveryKey('e1', 'd1')])).toEqual([]);
  });

  it('keeps everything-tier events from a big-moments device', () => {
    const minor = event({ id: 'e2', tier: 'everything' });
    expect(plan([device()], [minor])).toEqual([]);
    expect(plan([device({ tier: 'everything' })], [minor])).toHaveLength(1);
    expect(plan([device({ tier: 'everything' })], [event()])).toHaveLength(1);
  });

  it('never sends an event created at or before the device subscribed', () => {
    const subscribedLater = device({ notifyAfter: '2026-10-10T19:00:00Z' });
    expect(plan([subscribedLater], [event()])).toEqual([]);
    expect(plan([subscribedLater], [event({ createdAt: '2026-10-10T19:00:01Z' })])).toHaveLength(1);
  });

  it('never sends an event older than 36 hours', () => {
    expect(plan([device()], [event({ createdAt: '2026-10-09T07:59:59Z' })])).toEqual([]);
    expect(plan([device()], [event({ createdAt: '2026-10-09T08:00:01Z' })])).toHaveLength(1);
  });

  it('batches one device’s events into one send, oldest first, ties by id', () => {
    const later = event({ id: 'e3', createdAt: '2026-10-10T19:30:00Z' });
    const tieB = event({ id: 'e2b' });
    const tieA = event({ id: 'e2a' });
    const [send] = plan([device()], [later, tieB, tieA]);
    expect(send.events.map((e) => e.id)).toEqual(['e2a', 'e2b', 'e3']);
  });

  it('orders events by instant, not by how the timestamp is written', () => {
    const utc = event({ id: 'e1', createdAt: '2026-10-10T19:30:00Z' });
    const offset = event({ id: 'e2', createdAt: '2026-10-10T21:00:00.123456+02:00' });
    const [send] = plan([device()], [utc, offset]);
    expect(send.events.map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('orders sends by device id so a run is repeatable', () => {
    const sends = plan([device({ id: 'd2' }), device({ id: 'd1' })], [event()]);
    expect(sends.map((s) => s.device.id)).toEqual(['d1', 'd2']);
  });
});

describe('buildNotification', () => {
  it('uses the stored headline and detail for one event', () => {
    const { payload } = buildNotification(device(), [event()]);
    expect(payload).toEqual({
      aps: {
        alert: {
          title: 'Seahawks: Sam Darnold is the new starter at QB',
          body: 'Replaces Geno Smith.',
        },
        sound: 'default',
        'thread-id': 'seahawks',
      },
      team_id: 'seahawks',
      event_ids: ['e1'],
      event_type: 'starter_change',
    });
  });

  it('omits the body when the event has no detail', () => {
    const { payload } = buildNotification(device(), [event({ detail: null })]);
    expect(payload.aps.alert).toEqual({ title: 'Seahawks: Sam Darnold is the new starter at QB' });
  });

  it('summarizes several events with a fixed template', () => {
    const events = [1, 2, 3, 4, 5, 6].map((n) => event({ id: `e${n}`, headline: `Headline ${n}` }));
    const { payload } = buildNotification(device(), events);
    expect(payload.aps.alert).toEqual({
      title: '6 updates on your team',
      body: 'Headline 1\nHeadline 2\nHeadline 3\nHeadline 4\nand 2 more',
    });
    expect(payload.event_ids).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
    expect(payload.event_type).toBeUndefined();
  });

  it.each([
    [2, 'Headline 1\nHeadline 2'],
    [4, 'Headline 1\nHeadline 2\nHeadline 3\nHeadline 4'],
    [5, 'Headline 1\nHeadline 2\nHeadline 3\nHeadline 4\nand 1 more'],
  ])('summarizes exactly %i events', (count, body) => {
    const events = Array.from({ length: count }, (_, i) =>
      event({ id: `e${i + 1}`, headline: `Headline ${i + 1}` })
    );
    expect(buildNotification(device(), events).payload.aps.alert).toEqual({
      title: `${count} updates on your team`,
      body,
    });
  });

  describe('a batch too large to list every event id', () => {
    const headline =
      'Seahawks: Jaxon Smith-Njigba moves to WR1 ahead of Cooper Kupp on the depth chart';
    const events = Array.from({ length: 100 }, (_, i) =>
      event({ id: `3f2b8c1e-7a4d-4e9b-b0c6-${String(i).padStart(12, '0')}`, headline })
    );
    const { payload, collapseId } = buildNotification(device(), events);

    it('carries only the first event ids, in send order, and stays under the APNs limit', () => {
      expect(MAX_PAYLOAD_EVENT_IDS).toBe(20);
      expect(payload.event_ids).toHaveLength(20);
      expect(payload.event_ids).toEqual(events.slice(0, 20).map((e) => e.id));
      expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(4096);
    });

    it('still counts every event in the title', () => {
      expect(headline.length).toBeGreaterThanOrEqual(80);
      expect(payload.aps.alert.title).toBe('100 updates on your team');
    });

    it('derives the collapse id from every event id, not only the listed ones', () => {
      const sameFirstTwenty = [...events.slice(0, 99), event({ id: 'another-event', headline })];
      expect(buildNotification(device(), sameFirstTwenty).payload.event_ids).toEqual(
        payload.event_ids
      );
      expect(buildNotification(device(), sameFirstTwenty).collapseId).not.toBe(collapseId);
    });
  });

  it('marks a batch holding an everything-tier event so the app can offer to leave it', () => {
    const everything = device({ tier: 'everything' });
    expect(
      buildNotification(everything, [event({ tier: 'everything' })]).payload.aps.category
    ).toBe('EVERYTHING_TIER');
    expect(buildNotification(everything, [event()]).payload.aps.category).toBeUndefined();
  });

  it('gives the same events the same collapse id and different events a different one', () => {
    const a = buildNotification(device(), [event()]).collapseId;
    expect(buildNotification(device(), [event()]).collapseId).toBe(a);
    expect(buildNotification(device(), [event({ id: 'e9' })]).collapseId).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
