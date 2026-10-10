// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApnsClient, ApnsOutcome, ApnsRequest } from './apns';
import { deliveryKey } from './plan-sends';
import { formatSummary, runSender, type DeliveryPair, type PushStore } from './send-run';
import type { PushDevice, PushableEvent } from './types';

const NOW = new Date('2026-10-10T20:00:00Z');

function device(id: string, overrides: Partial<PushDevice> = {}): PushDevice {
  return {
    id,
    apnsToken: id.padEnd(64, '0'),
    teamId: 'seahawks',
    tier: 'big_moments',
    bundleId: 'com.cwharris.depth',
    apnsEnvironment: 'production',
    notifyAfter: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function event(id: string, overrides: Partial<PushableEvent> = {}): PushableEvent {
  return {
    id,
    type: 'trade',
    tier: 'big_moments',
    teamId: 'seahawks',
    headline: `Headline ${id}`,
    detail: null,
    createdAt: '2026-10-10T19:00:00Z',
    ...overrides,
  };
}

class FakeStore implements PushStore {
  claimed = new Set<string>();
  removed: string[] = [];
  constructor(
    public devices: PushDevice[],
    public events: PushableEvent[]
  ) {}
  async listDevices() {
    return this.devices.filter((d) => !this.removed.includes(d.id));
  }
  async listEventsSince() {
    return this.events;
  }
  async listDeliveries() {
    return new Set(this.claimed);
  }
  async claim(pairs: readonly DeliveryPair[]) {
    const won = new Set<string>();
    for (const pair of pairs) {
      const key = deliveryKey(pair.eventId, pair.deviceId);
      if (!this.claimed.has(key)) {
        this.claimed.add(key);
        won.add(key);
      }
    }
    return won;
  }
  async release(pairs: readonly DeliveryPair[]) {
    for (const pair of pairs) this.claimed.delete(deliveryKey(pair.eventId, pair.deviceId));
  }
  async removeDevice(deviceId: string) {
    this.removed.push(deviceId);
  }
}

class FakeApns implements ApnsClient {
  requests: ApnsRequest[] = [];
  constructor(private outcomeFor: (request: ApnsRequest) => ApnsOutcome = () => 'sent') {}
  async send(request: ApnsRequest) {
    this.requests.push(request);
    const outcome = this.outcomeFor(request);
    return { outcome, status: outcome === 'sent' ? 200 : 500, reason: null };
  }
  close() {}
}

describe('runSender', () => {
  it('sends each device one notification and marks every pair', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1'), event('e2')]);
    const apns = new FakeApns();
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(summary).toEqual({
      paused: false,
      planned: 2,
      sent: 2,
      pruned: 0,
      failed: 0,
      fatal: null,
    });
    expect(apns.requests).toHaveLength(2);
    expect(apns.requests[0]).toMatchObject({
      token: device('d1').apnsToken,
      environment: 'production',
      topic: 'com.cwharris.depth',
    });
    expect(store.claimed.size).toBe(4);
  });

  it('sends nothing on a second run', async () => {
    const store = new FakeStore([device('d1')], [event('e1')]);
    await runSender({ store, client: new FakeApns(), enabled: true, now: NOW });
    const second = new FakeApns();
    const summary = await runSender({ store, client: second, enabled: true, now: NOW });
    expect(second.requests).toEqual([]);
    expect(summary.planned).toBe(0);
  });

  it('sends only the events it won when another run claimed some first', async () => {
    const store = new FakeStore([device('d1')], [event('e1'), event('e2')]);
    // The other run claims e1 after this run has read deliveries but before it claims.
    const realList = store.listDeliveries.bind(store);
    store.listDeliveries = async () => {
      const seen = await realList();
      store.claimed.add(deliveryKey('e1', 'd1'));
      return seen;
    };
    const apns = new FakeApns();
    await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests).toHaveLength(1);
    expect((apns.requests[0].payload as { event_ids: string[] }).event_ids).toEqual(['e2']);
  });

  it('sends nothing when another run won every pair', async () => {
    const store = new FakeStore([device('d1')], [event('e1')]);
    const realList = store.listDeliveries.bind(store);
    store.listDeliveries = async () => {
      const seen = await realList();
      store.claimed.add(deliveryKey('e1', 'd1'));
      return seen;
    };
    const apns = new FakeApns();
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests).toEqual([]);
    expect(summary.sent).toBe(0);
  });

  it('releases the claim on a retryable failure so the next run tries again', async () => {
    const store = new FakeStore([device('d1')], [event('e1')]);
    const summary = await runSender({
      store,
      client: new FakeApns(() => 'retry'),
      enabled: true,
      now: NOW,
    });
    expect(summary).toMatchObject({ sent: 0, failed: 1 });
    expect(store.claimed.size).toBe(0);
  });

  it('removes a device APNs says is gone and keeps going', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    const summary = await runSender({
      store,
      client: new FakeApns((request) => (request.token.startsWith('d1') ? 'prune' : 'sent')),
      enabled: true,
      now: NOW,
    });
    expect(store.removed).toEqual(['d1']);
    expect(summary).toMatchObject({ sent: 1, pruned: 1, failed: 0 });
  });

  it('stops on a provider-credential failure and releases what it held', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    const apns = new FakeApns(() => 'fatal');
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests).toHaveLength(1);
    expect(store.claimed.size).toBe(0);
    expect(store.removed).toEqual([]);
    expect(summary.fatal).not.toBeNull();
  });

  it('claims and sends nothing while paused, but reports what is owed', async () => {
    const store = new FakeStore([device('d1')], [event('e1')]);
    const summary = await runSender({ store, client: null, enabled: false, now: NOW });
    expect(summary).toEqual({
      paused: true,
      planned: 1,
      sent: 0,
      pruned: 0,
      failed: 0,
      fatal: null,
    });
    expect(store.claimed.size).toBe(0);
  });

  it('rejects an enabled run with no client instead of reporting an empty send', async () => {
    const store = new FakeStore([device('d1')], [event('e1')]);
    await expect(runSender({ store, client: null, enabled: true, now: NOW })).rejects.toThrow(
      /client/
    );
    expect(store.claimed.size).toBe(0);
  });
});

describe('formatSummary', () => {
  it('is one greppable line either way', () => {
    expect(
      formatSummary({ paused: false, planned: 3, sent: 2, pruned: 1, failed: 0, fatal: null })
    ).toBe('push sender: sent 2, pruned 1, failed 0');
    expect(
      formatSummary({ paused: true, planned: 3, sent: 0, pruned: 0, failed: 0, fatal: null })
    ).toBe('push sender: paused (3 notifications owed)');
  });
});
