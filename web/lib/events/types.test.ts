import { describe, expect, it } from 'vitest';
import {
  fromStarterStateRow,
  toStarterStateRow,
  toTeamEventRow,
  type StarterState,
  type TeamEvent,
} from './types';

describe('toTeamEventRow', () => {
  it('maps to the snake_case columns', () => {
    const event: TeamEvent = {
      dedupeKey: 'trade:eagles:2026-10-07:out:camjurgens',
      type: 'trade',
      tier: 'big_moments',
      teamId: 'eagles',
      playerId: null,
      headline: 'Eagles traded G Cam Jurgens',
      detail: null,
      payload: { direction: 'out', position: 'G' },
      source: 'espn_transactions',
      occurredAt: '2026-10-07T07:00:00.000Z',
    };
    expect(toTeamEventRow(event)).toEqual({
      dedupe_key: 'trade:eagles:2026-10-07:out:camjurgens',
      event_type: 'trade',
      tier: 'big_moments',
      team_id: 'eagles',
      player_id: null,
      headline: 'Eagles traded G Cam Jurgens',
      detail: null,
      payload: { direction: 'out', position: 'G' },
      source: 'espn_transactions',
      occurred_at: '2026-10-07T07:00:00.000Z',
    });
  });
});

describe('starter state rows', () => {
  const state: StarterState = {
    teamId: 'seahawks',
    position: 'QB',
    confirmedPlayerId: '1',
    confirmedPlayerName: 'Geno Smith',
    candidatePlayerId: '2',
    candidatePlayerName: 'Sam Darnold',
    candidateSeenAt: '2026-10-08T20:00:00.000Z',
  };

  it('round-trips through the row shape', () => {
    const row = toStarterStateRow(state, '2026-10-09T15:00:00.000Z');
    expect(row.updated_at).toBe('2026-10-09T15:00:00.000Z');
    expect(fromStarterStateRow(row)).toEqual(state);
  });
});
