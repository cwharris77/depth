// The in-memory shape of a team event and of the starter detector's working state, plus
// the mappers to and from the Postgres rows.

export type TeamEventType = 'starter_change' | 'trade' | 'record_chase' | 'historic_week';
export type TeamEventTier = 'big_moments' | 'everything';
export type TeamEventSource = 'espn_depth_chart' | 'espn_transactions' | 'nflverse_stats';
export type TeamEventPayload = Record<string, string | number | boolean | null>;

export interface TeamEvent {
  // Stable for a given real-world event, so detecting it again writes nothing.
  dedupeKey: string;
  type: TeamEventType;
  tier: TeamEventTier;
  teamId: string;
  playerId: string | null;
  headline: string;
  detail: string | null;
  payload: TeamEventPayload;
  source: TeamEventSource;
  // ISO 8601.
  occurredAt: string;
}

export interface TeamEventRow {
  dedupe_key: string;
  event_type: TeamEventType;
  tier: TeamEventTier;
  team_id: string;
  player_id: string | null;
  headline: string;
  detail: string | null;
  payload: TeamEventPayload;
  source: TeamEventSource;
  occurred_at: string;
}

export function toTeamEventRow(event: TeamEvent): TeamEventRow {
  return {
    dedupe_key: event.dedupeKey,
    event_type: event.type,
    tier: event.tier,
    team_id: event.teamId,
    player_id: event.playerId,
    headline: event.headline,
    detail: event.detail,
    payload: event.payload,
    source: event.source,
    occurred_at: event.occurredAt,
  };
}

export interface StarterState {
  teamId: string;
  position: string;
  confirmedPlayerId: string;
  confirmedPlayerName: string;
  candidatePlayerId: string | null;
  candidatePlayerName: string | null;
  // When the candidate was first seen (ISO 8601); null when there is no candidate.
  candidateSeenAt: string | null;
}

export interface StarterStateRow {
  team_id: string;
  position: string;
  confirmed_player_id: string;
  confirmed_player_name: string;
  candidate_player_id: string | null;
  candidate_player_name: string | null;
  candidate_seen_at: string | null;
  updated_at?: string;
}

export function toStarterStateRow(state: StarterState, now: string): StarterStateRow {
  return {
    team_id: state.teamId,
    position: state.position,
    confirmed_player_id: state.confirmedPlayerId,
    confirmed_player_name: state.confirmedPlayerName,
    candidate_player_id: state.candidatePlayerId,
    candidate_player_name: state.candidatePlayerName,
    candidate_seen_at: state.candidateSeenAt,
    updated_at: now,
  };
}

export function fromStarterStateRow(row: StarterStateRow): StarterState {
  return {
    teamId: row.team_id,
    position: row.position,
    confirmedPlayerId: row.confirmed_player_id,
    confirmedPlayerName: row.confirmed_player_name,
    candidatePlayerId: row.candidate_player_id,
    candidatePlayerName: row.candidate_player_name,
    candidateSeenAt: row.candidate_seen_at,
  };
}
