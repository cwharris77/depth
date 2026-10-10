// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApnsClient, ApnsOutcome, ApnsRequest, ApnsResponse } from './apns';
import { deliveryKey } from './plan-sends';
import {
  formatSummary,
  MAX_CONSECUTIVE_UNREACHABLE,
  runSender,
  type DeliveryPair,
  type PushStore,
} from './send-run';
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
  /** Drops the device's claims too, as the delivery rows' cascade does. */
  async removeDevice(deviceId: string) {
    this.removed.push(deviceId);
    for (const key of this.claimed) if (key.endsWith(`:${deviceId}`)) this.claimed.delete(key);
  }
}

const STATUS: Record<ApnsOutcome, number> = {
  sent: 200,
  prune: 410,
  retry: 500,
  fatal: 403,
  unknown: 0,
};

/** The device a fake request was addressed to; fixture tokens start with the device id. */
function deviceOf(request: ApnsRequest): string {
  return request.token.slice(0, 2);
}

class FakeApns implements ApnsClient {
  requests: ApnsRequest[] = [];
  constructor(
    private respond: (request: ApnsRequest) => ApnsOutcome | ApnsResponse = () => 'sent'
  ) {}
  async send(request: ApnsRequest): Promise<ApnsResponse> {
    this.requests.push(request);
    const response = this.respond(request);
    if (typeof response !== 'string') return response;
    return { outcome: response, status: STATUS[response], reason: null };
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
      aborted: null,
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
    expect(summary.failed).toBe(1);
  });

  it('keeps the first device’s claims when the second gets a fatal response', async () => {
    const store = new FakeStore(
      [device('d1'), device('d2'), device('d3')],
      [event('e1'), event('e2')]
    );
    const apns = new FakeApns((request) => (deviceOf(request) === 'd2' ? 'fatal' : 'sent'));
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests.map(deviceOf)).toEqual(['d1', 'd2']);
    expect([...store.claimed].sort()).toEqual(['e1:d1', 'e2:d1']);
    expect(summary).toMatchObject({ sent: 1, failed: 1 });
    expect(summary.fatal).toMatch(/403/);
  });

  it('leaves the other devices sent and claimed when one gets a retryable failure', async () => {
    const store = new FakeStore([device('d1'), device('d2'), device('d3')], [event('e1')]);
    const apns = new FakeApns((request) => (deviceOf(request) === 'd2' ? 'retry' : 'sent'));
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests).toHaveLength(3);
    expect([...store.claimed].sort()).toEqual(['e1:d1', 'e1:d3']);
    expect(summary).toMatchObject({ sent: 2, failed: 1, fatal: null, aborted: null });
  });

  it('drops a pruned device’s claims with the device', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1'), event('e2')]);
    await runSender({
      store,
      client: new FakeApns((request) => (deviceOf(request) === 'd1' ? 'prune' : 'sent')),
      enabled: true,
      now: NOW,
    });
    expect([...store.claimed].sort()).toEqual(['e1:d2', 'e2:d2']);
  });

  it('keeps the claim when the outcome is unknown, and keeps going', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    const apns = new FakeApns((request) => (deviceOf(request) === 'd1' ? 'unknown' : 'sent'));
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect([...store.claimed].sort()).toEqual(['e1:d1', 'e1:d2']);
    expect(summary).toMatchObject({ sent: 1, failed: 1, fatal: null, aborted: null });

    const second = new FakeApns();
    await runSender({ store, client: second, enabled: true, now: NOW });
    expect(second.requests).toEqual([]);
  });

  it('treats a client that throws as an unknown outcome', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    const apns = new FakeApns((request) => {
      if (deviceOf(request) === 'd1') throw new Error('socket hang up');
      return 'sent';
    });
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect([...store.claimed].sort()).toEqual(['e1:d1', 'e1:d2']);
    expect(summary).toMatchObject({ sent: 1, failed: 1, aborted: null });
  });

  it('counts a failed device removal and keeps going with the claim in place', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    store.removeDevice = async () => {
      throw new Error('push_devices delete: timeout');
    };
    const summary = await runSender({
      store,
      client: new FakeApns((request) => (deviceOf(request) === 'd1' ? 'prune' : 'sent')),
      enabled: true,
      now: NOW,
    });
    expect([...store.claimed].sort()).toEqual(['e1:d1', 'e1:d2']);
    expect(summary).toMatchObject({ sent: 1, pruned: 0, failed: 1 });
  });

  it('counts one failure and keeps going when a retry’s release throws', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    store.release = async () => {
      throw new Error('team_event_deliveries release: timeout');
    };
    const summary = await runSender({
      store,
      client: new FakeApns((request) => (deviceOf(request) === 'd1' ? 'retry' : 'sent')),
      enabled: true,
      now: NOW,
    });
    expect(summary).toMatchObject({ sent: 1, failed: 1, fatal: null });
  });

  it('still reports the fatal response and stops when its release throws', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    store.release = async () => {
      throw new Error('team_event_deliveries release: timeout');
    };
    const apns = new FakeApns(() => ({
      outcome: 'fatal',
      status: 403,
      reason: 'InvalidProviderToken',
    }));
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests).toHaveLength(1);
    expect(summary.failed).toBe(1);
    expect(summary.fatal).toBe('APNs rejected the provider token: 403 InvalidProviderToken');
  });

  it('counts a failed claim and moves on to the next device', async () => {
    const store = new FakeStore([device('d1'), device('d2')], [event('e1')]);
    const realClaim = store.claim.bind(store);
    store.claim = async (pairs) => {
      if (pairs[0].deviceId === 'd1') throw new Error('team_event_deliveries claim: timeout');
      return realClaim(pairs);
    };
    const apns = new FakeApns();
    const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
    expect(apns.requests.map(deviceOf)).toEqual(['d2']);
    expect(summary).toMatchObject({ sent: 1, failed: 1, aborted: null });
  });

  describe('when APNs stops answering', () => {
    const five = ['d1', 'd2', 'd3', 'd4', 'd5'].map((id) => device(id));
    const noStatusRetry = { outcome: 'retry', status: 0, reason: 'connect ECONNREFUSED' } as const;

    it('stops after consecutive unknown outcomes and keeps their claims', async () => {
      const store = new FakeStore(five, [event('e1')]);
      const apns = new FakeApns(() => 'unknown');
      const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
      expect(MAX_CONSECUTIVE_UNREACHABLE).toBe(3);
      expect(apns.requests).toHaveLength(3);
      expect([...store.claimed].sort()).toEqual(['e1:d1', 'e1:d2', 'e1:d3']);
      expect(summary).toMatchObject({ sent: 0, failed: 3, fatal: null });
      expect(summary.aborted).toBe(
        'APNs unreachable: stopped after 3 consecutive requests without a response'
      );
    });

    it('stops after consecutive requests that could not be started, releasing each', async () => {
      const store = new FakeStore(five, [event('e1')]);
      const apns = new FakeApns(() => noStatusRetry);
      const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
      expect(apns.requests).toHaveLength(3);
      expect(store.claimed.size).toBe(0);
      expect(summary).toMatchObject({ failed: 3 });
      expect(summary.aborted).not.toBeNull();
    });

    it('counts a thrown send and a mix of the two toward the same limit', async () => {
      const store = new FakeStore(five, [event('e1')]);
      const apns = new FakeApns((request) => {
        if (deviceOf(request) === 'd1') throw new Error('socket hang up');
        return deviceOf(request) === 'd2' ? noStatusRetry : 'unknown';
      });
      const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
      expect(apns.requests).toHaveLength(3);
      expect(summary.aborted).not.toBeNull();
    });

    it('starts counting again after any response with a real status', async () => {
      const store = new FakeStore(five, [event('e1')]);
      const apns = new FakeApns((request) => (deviceOf(request) === 'd3' ? 'retry' : 'unknown'));
      const summary = await runSender({ store, client: apns, enabled: true, now: NOW });
      expect(apns.requests).toHaveLength(5);
      expect(summary).toMatchObject({ failed: 5, aborted: null });
    });
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
      aborted: null,
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
  const base = {
    paused: false,
    planned: 3,
    sent: 0,
    pruned: 0,
    failed: 0,
    fatal: null,
    aborted: null,
  };

  it('is one greppable line either way', () => {
    expect(formatSummary({ ...base, sent: 2, pruned: 1 })).toBe(
      'push sender: sent 2, pruned 1, failed 0'
    );
    expect(formatSummary({ ...base, paused: true })).toBe(
      'push sender: paused (3 notifications owed)'
    );
  });

  it('says on the same line why a run stopped early', () => {
    expect(
      formatSummary({
        ...base,
        sent: 1,
        failed: 1,
        fatal: 'APNs rejected the provider token: 403 InvalidProviderToken',
      })
    ).toBe(
      'push sender: sent 1, pruned 0, failed 1 (stopped: APNs rejected the provider token: 403 InvalidProviderToken)'
    );
    expect(
      formatSummary({
        ...base,
        failed: 3,
        aborted: 'APNs unreachable: stopped after 3 consecutive requests without a response',
      })
    ).toBe(
      'push sender: sent 0, pruned 0, failed 3 (stopped: APNs unreachable: stopped after 3 consecutive requests without a response)'
    );
  });
});
