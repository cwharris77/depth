import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { mapDepthchartPosition } from '@/lib/espn/positions';
import { advanceStarters } from './starter-changes';
import { advanceSnapshot, parseStoredSnapshot } from './snapshot-changes';
import {
  buildNameIndex,
  tradeEvents,
  rosterTransactionEvents,
  type EspnTransaction,
  type TradeTeam,
} from './transactions';
import {
  fromStarterStateRow,
  toStarterStateRow,
  toTeamEventRow,
  type SnapshotState,
  type TeamObservation,
} from './types';

export interface EventCohort {
  expectedTeams: readonly string[];
  builtTeams: readonly string[];
  writtenTeams: readonly string[];
  errors: readonly unknown[];
  observationErrors: readonly unknown[];
}
export function canWriteEventCohort(args: EventCohort): boolean {
  const equal = (ids: readonly string[]) =>
    ids.length === args.expectedTeams.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => args.expectedTeams.includes(id));
  return (
    args.expectedTeams.length > 0 &&
    new Set(args.expectedTeams).size === args.expectedTeams.length &&
    equal(args.builtTeams) &&
    equal(args.writtenTeams) &&
    args.errors.length === 0 &&
    args.observationErrors.length === 0
  );
}
interface WriteArgs {
  observations: readonly TeamObservation[];
  transactions: readonly EspnTransaction[];
  teamIdByEspnId: ReadonlyMap<string, string>;
  teams: readonly TradeTeam[];
  now: string;
}
export async function writeCompleteTeamEvents(
  supabase: SupabaseClient<Database>,
  args: WriteArgs & { cohort: EventCohort }
): Promise<number> {
  if (!canWriteEventCohort(args.cohort)) return 0;
  const ids = args.observations.map((o) => o.teamId);
  if (
    ids.length !== args.cohort.expectedTeams.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !args.cohort.expectedTeams.includes(id))
  )
    throw new Error('Event observations do not match complete cohort');
  return writeTeamEvents(supabase, args);
}
function stateJson(state: SnapshotState): Json {
  return {
    schemaVersion: state.schemaVersion,
    coveredPositions: state.coveredPositions,
    confirmedSlots: state.confirmedSlots.map((slot) => ({ ...slot })),
    candidates: Object.fromEntries(
      Object.entries(state.candidates).map(([p, c]) => [
        p,
        { firstSeenAt: c.firstSeenAt, slots: c.slots.map((slot) => ({ ...slot })) },
      ])
    ),
    injuries: state.injuries.map((i) => ({
      ...i,
      designations: i.designations === null ? null : [...i.designations],
    })),
  };
}
export async function writeTeamEvents(
  supabase: SupabaseClient<Database>,
  args: WriteArgs
): Promise<number> {
  let count = 0;
  for (const observation of args.observations) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: row, error: snapshotError } = await supabase
        .from('team_event_snapshot_state')
        .select('revision, observed_at, state')
        .eq('team_id', observation.teamId)
        .maybeSingle();
      if (snapshotError)
        throw new Error(`team_event_snapshot_state read: ${snapshotError.message}`);
      const previous = row ? parseStoredSnapshot(row) : null;
      if (!Number.isFinite(Date.parse(observation.observedAt)))
        throw new Error('Invalid observation timestamp');
      if (previous && Date.parse(observation.observedAt) <= Date.parse(previous.observedAt)) break;
      const { data: starterRows, error: starterError } = await supabase
        .from('team_starter_state')
        .select('*')
        .eq('team_id', observation.teamId);
      if (starterError) throw new Error(`team_starter_state read: ${starterError.message}`);
      const priorStarters = (starterRows ?? []).map(fromStarterStateRow);
      const observed = observation.slots.filter(
        (s) => s.depthRank === 1 && mapDepthchartPosition(s.position) !== null
      );
      const starters = advanceStarters({
        teamId: observation.teamId,
        teamName: observation.teamName,
        previous: priorStarters,
        observed,
        now: observation.observedAt,
      });
      // An unobserved position breaks the consecutive-sighting hold without proving a removal.
      const missing = priorStarters
        .filter((p) => !observed.some((s) => s.position === p.position))
        .map((p) => ({
          ...p,
          candidatePlayerId: null,
          candidatePlayerName: null,
          candidateSeenAt: null,
        }));
      const snapshot = advanceSnapshot({
        previous,
        observed: observation,
        starterEvents: starters.events,
      });
      const events = [...starters.events, ...snapshot.events];
      const { data: committed, error } = await supabase.rpc('commit_team_event_snapshot', {
        p_team_id: observation.teamId,
        p_expected_revision: previous?.revision ?? 0,
        p_observed_at: observation.observedAt,
        p_state: stateJson(snapshot.next),
        p_events: events.map((e) => ({ ...toTeamEventRow(e) })),
        p_starter_state: [...starters.next, ...missing].map((s) => ({
          ...toStarterStateRow(s, observation.observedAt),
        })),
      });
      if (error) throw new Error(`team snapshot commit: ${error.message}`);
      if (committed === true) {
        count += events.length;
        break;
      }
      if (attempt === 1)
        throw new Error(`team snapshot commit conflicted twice: ${observation.teamId}`);
    }
  }
  const transactionArgs = {
    transactions: args.transactions,
    teamIdByEspnId: args.teamIdByEspnId,
    teams: args.teams,
    now: args.now,
    playerIdByName: buildNameIndex(
      args.observations.flatMap((o) =>
        o.injuries.map((i) => ({ id: i.playerId, name: i.playerName }))
      )
    ),
  };
  const events = [...tradeEvents(transactionArgs), ...rosterTransactionEvents(transactionArgs)];
  if (events.length) {
    const { error } = await supabase
      .from('team_events')
      .upsert(events.map(toTeamEventRow), { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (error) throw new Error(`team_events upsert: ${error.message}`);
  }
  return count + events.length;
}
