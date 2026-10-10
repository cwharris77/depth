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

function confirmed(starter: ObservedStarter, candidate: ObservedStarter | null = null) {
  return {
    teamId: 'seahawks',
    position: starter.position,
    confirmedPlayerId: starter.playerId,
    confirmedPlayerName: starter.playerName,
    candidatePlayerId: candidate?.playerId ?? null,
    candidatePlayerName: candidate?.playerName ?? null,
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

  it('keeps the same dedupe key for a second run on the same day', () => {
    const morning = run([confirmed(geno, sam)], [sam], '2026-10-09T15:00:00.000Z');
    const evening = run([confirmed(geno, sam)], [sam], '2026-10-09T20:00:00.000Z');
    expect(evening.events[0].dedupeKey).toBe(morning.events[0].dedupeKey);
  });

  it('files a long snapper change under the everything tier', () => {
    const old = { position: 'LS', playerId: '40', playerName: 'Old Snapper' };
    const fresh = { position: 'LS', playerId: '41', playerName: 'New Snapper' };
    expect(run([confirmed(old, fresh)], [fresh]).events[0].tier).toBe('everything');
  });
});
