import { describe, expect, it } from 'vitest';
import { advanceStarters, type ObservedStarter } from './starter-changes';
import type { StarterState } from './types';

const NOW = '2026-10-09T15:00:00.000Z';
const geno: ObservedStarter = { position: 'QB', playerId: '1', playerName: 'Geno Smith' };
const sam: ObservedStarter = { position: 'QB', playerId: '2', playerName: 'Sam Darnold' };
const drew: ObservedStarter = { position: 'QB', playerId: '3', playerName: 'Drew Lock' };

function run(previous: StarterState[], observed: ObservedStarter[], now = NOW) {
  return advanceStarters({ teamId: 'seahawks', teamName: 'Seahawks', previous, observed, now });
}

function confirmed(
  starter: ObservedStarter,
  candidate: ObservedStarter | null = null,
  seenAt: string = NOW
) {
  return {
    teamId: 'seahawks',
    position: starter.position,
    confirmedPlayerId: starter.playerId,
    confirmedPlayerName: starter.playerName,
    candidatePlayerId: candidate?.playerId ?? null,
    candidatePlayerName: candidate?.playerName ?? null,
    candidateSeenAt: candidate ? seenAt : null,
  } satisfies StarterState;
}

describe('advanceStarters', () => {
  it('records every starter and emits nothing when there is no prior state', () => {
    const result = run([], [geno, { position: 'LT', playerId: '9', playerName: 'Charles Cross' }]);
    expect(result.events).toEqual([]);
    expect(result.next).toHaveLength(2);
    expect(result.next[0]).toEqual(confirmed(geno));
  });

  it('emits nothing when the starter is unchanged', () => {
    const result = run([confirmed(geno)], [geno]);
    expect(result.events).toEqual([]);
    expect(result.next).toEqual([confirmed(geno)]);
  });

  it('holds a first sighting as a candidate without an event', () => {
    const result = run([confirmed(geno)], [sam]);
    expect(result.events).toEqual([]);
    expect(result.next).toEqual([confirmed(geno, sam)]);
  });

  it('confirms and emits on the second consecutive sighting', () => {
    const result = run([confirmed(geno, sam)], [sam]);
    expect(result.next).toEqual([confirmed(sam)]);
    expect(result.events).toEqual([
      {
        dedupeKey: 'starter_change:seahawks:QB:2:2026-10-09',
        type: 'starter_change',
        tier: 'big_moments',
        teamId: 'seahawks',
        playerId: '2',
        headline: 'Seahawks: Sam Darnold is the new starter at QB',
        detail: 'Replaces Geno Smith.',
        payload: {
          position: 'QB',
          player_name: 'Sam Darnold',
          previous_player_id: '1',
          previous_player_name: 'Geno Smith',
        },
        source: 'espn_depth_chart',
        occurredAt: NOW,
      },
    ]);
  });

  it('emits nothing when a candidate reverts to the confirmed starter', () => {
    const result = run([confirmed(geno, sam)], [geno]);
    expect(result.events).toEqual([]);
    expect(result.next).toEqual([confirmed(geno)]);
  });

  it('restarts the hold when a different candidate appears', () => {
    const swapped = run([confirmed(geno, sam)], [drew]);
    expect(swapped.events).toEqual([]);
    expect(swapped.next).toEqual([confirmed(geno, drew)]);

    const settled = run(swapped.next, [drew]);
    expect(settled.events).toHaveLength(1);
    expect(settled.events[0].payload.previous_player_name).toBe('Geno Smith');
  });

  it('leaves a position it did not observe out of the next state', () => {
    const lt = { position: 'LT', playerId: '9', playerName: 'Charles Cross' };
    const result = run([confirmed(geno, sam), confirmed(lt)], [lt]);
    expect(result.next.map((row) => row.position)).toEqual(['LT']);
    expect(result.events).toEqual([]);
  });

  it('dates the key by when the candidate first appeared, so a late retry cannot duplicate', () => {
    const held = [confirmed(geno, sam, '2026-10-08T20:00:00.000Z')];
    const first = run(held, [sam], '2026-10-09T15:00:00.000Z');
    const retry = run(held, [sam], '2026-10-10T15:00:00.000Z');
    expect(first.events[0].dedupeKey).toBe('starter_change:seahawks:QB:2:2026-10-08');
    expect(retry.events[0].dedupeKey).toBe(first.events[0].dedupeKey);
  });

  it('gives the same change a new key when it happens again later', () => {
    const early = run([confirmed(geno, sam, '2026-09-10T15:00:00.000Z')], [sam]);
    const late = run([confirmed(geno, sam, '2026-11-20T15:00:00.000Z')], [sam]);
    expect(late.events[0].dedupeKey).not.toBe(early.events[0].dedupeKey);
  });

  it('keeps the first-seen time while the same candidate is held', () => {
    const first = run([confirmed(geno)], [sam], '2026-10-08T20:00:00.000Z');
    expect(first.next[0].candidateSeenAt).toBe('2026-10-08T20:00:00.000Z');
  });

  it('files a long snapper change under the everything tier', () => {
    const old = { position: 'LS', playerId: '40', playerName: 'Old Snapper' };
    const fresh = { position: 'LS', playerId: '41', playerName: 'New Snapper' };
    expect(run([confirmed(old, fresh)], [fresh]).events[0].tier).toBe('everything');
  });
});
