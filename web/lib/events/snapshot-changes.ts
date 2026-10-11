import { mapDepthchartPosition } from '@/lib/espn/positions';
import { depthChangeCopy, injuryChangeCopy } from './copy';
import type {
  ObservedDepthSlot,
  SnapshotState,
  StoredSnapshot,
  TeamEvent,
  TeamObservation,
} from './types';

const signature = (slots: readonly ObservedDepthSlot[]) =>
  JSON.stringify(slots.map((s) => [s.depthRank, s.playerId]));
const positionSlots = (slots: readonly ObservedDepthSlot[], position: string) =>
  slots.filter((s) => s.position === position).sort((a, b) => a.depthRank - b.depthRank);

export function advanceSnapshot(args: {
  previous: StoredSnapshot | null;
  observed: TeamObservation;
  starterEvents: readonly TeamEvent[];
}): { next: SnapshotState; events: TeamEvent[] } {
  const { previous, observed } = args;
  if (previous && Date.parse(observed.observedAt) <= Date.parse(previous.observedAt))
    return { next: previous.state, events: [] };
  if (!previous)
    return {
      next: {
        schemaVersion: 1,
        confirmedSlots: [...observed.slots],
        coveredPositions: [...observed.coveredPositions],
        candidates: {},
        injuries: observed.injuries.filter((i) => i.designations !== null).map((i) => ({ ...i })),
      },
      events: [],
    };
  const next: SnapshotState = {
    schemaVersion: 1,
    confirmedSlots: [...previous.state.confirmedSlots],
    coveredPositions: [...previous.state.coveredPositions],
    candidates: { ...previous.state.candidates },
    injuries: [...previous.state.injuries],
  };
  const events: TeamEvent[] = [];
  const revision = previous.revision + 1;
  for (const position of Object.keys(next.candidates))
    if (!observed.coveredPositions.includes(position)) delete next.candidates[position];
  for (const position of observed.coveredPositions) {
    const prior = positionSlots(next.confirmedSlots, position);
    const seen = positionSlots(observed.slots, position);
    if (!next.coveredPositions.includes(position) || signature(prior) === signature(seen)) {
      next.confirmedSlots = next.confirmedSlots.filter((s) => s.position !== position).concat(seen);
      if (!next.coveredPositions.includes(position)) next.coveredPositions.push(position);
      delete next.candidates[position];
      continue;
    }
    const candidate = next.candidates[position];
    if (!candidate || signature(candidate.slots) !== signature(seen)) {
      next.candidates[position] = { slots: seen, firstSeenAt: observed.observedAt };
      continue;
    }
    const suppressed = new Set<string>();
    if (mapDepthchartPosition(position) !== null) {
      const before = prior.find((s) => s.depthRank === 1)?.playerId;
      const after = seen.find((s) => s.depthRank === 1)?.playerId;
      if (before !== after) {
        if (before) suppressed.add(before);
        if (after) suppressed.add(after);
      }
      for (const event of args.starterEvents.filter((e) => e.payload.position === position)) {
        if (event.playerId) suppressed.add(event.playerId);
        if (typeof event.payload.previous_player_id === 'string')
          suppressed.add(event.payload.previous_player_id);
      }
    }
    const ids = [...new Set([...prior, ...seen].map((s) => s.playerId))];
    for (const playerId of ids) {
      const old = prior.find((s) => s.playerId === playerId);
      const current = seen.find((s) => s.playerId === playerId);
      if (suppressed.has(playerId) || old?.depthRank === current?.depthRank) continue;
      const player = current ?? old;
      if (!player) continue;
      const playerName = player.playerName;
      const copy = depthChangeCopy({
        teamName: observed.teamName,
        position,
        playerName,
        rank: current?.depthRank ?? null,
        previousRank: old?.depthRank ?? null,
      });
      events.push({
        dedupeKey: `depth_change:${observed.teamId}:${position}:${playerId}:${revision}`,
        type: 'depth_change',
        tier: 'everything',
        teamId: observed.teamId,
        playerId,
        ...copy,
        payload: {
          position,
          player_name: playerName,
          depth_rank: current?.depthRank ?? null,
          previous_depth_rank: old?.depthRank ?? null,
        },
        source: 'espn_depth_chart',
        occurredAt: candidate.firstSeenAt,
      });
    }
    next.confirmedSlots = next.confirmedSlots.filter((s) => s.position !== position).concat(seen);
    delete next.candidates[position];
  }
  const injuries = new Map(next.injuries.map((i) => [i.playerId, i]));
  for (const seen of observed.injuries) {
    if (seen.designations === null) continue;
    const prior = injuries.get(seen.playerId);
    if (
      prior?.designations &&
      JSON.stringify(prior.designations) !== JSON.stringify(seen.designations)
    ) {
      const copy = injuryChangeCopy({
        teamName: observed.teamName,
        playerName: seen.playerName,
        designations: seen.designations,
        previous: prior.designations,
      });
      events.push({
        dedupeKey: `injury_change:${observed.teamId}:${seen.playerId}:${revision}`,
        type: 'injury_change',
        tier: 'everything',
        teamId: observed.teamId,
        playerId: seen.playerId,
        ...copy,
        payload: {
          player_name: seen.playerName,
          designation: seen.designations.join(', '),
          previous_designation: prior.designations.join(', '),
        },
        source: 'espn_injuries',
        occurredAt: observed.observedAt,
      });
    }
    injuries.set(seen.playerId, { ...seen });
  }
  next.injuries = [...injuries.values()];
  return { next, events };
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
function slots(value: unknown): value is ObservedDepthSlot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) =>
        object(s) &&
        text(s.position) &&
        text(s.playerId) &&
        text(s.playerName) &&
        Number.isSafeInteger(s.depthRank) &&
        Number(s.depthRank) > 0
    ) &&
    new Set(value.map((s) => `${s.position}:${s.depthRank}`)).size === value.length &&
    new Set(value.map((s) => `${s.position}:${s.playerId}`)).size === value.length
  );
}
export function parseStoredSnapshot(row: {
  revision: unknown;
  observed_at: unknown;
  state: unknown;
}): StoredSnapshot {
  const s = row.state;
  if (
    !Number.isSafeInteger(row.revision) ||
    Number(row.revision) < 1 ||
    !date(row.observed_at) ||
    !object(s) ||
    s.schemaVersion !== 1 ||
    !slots(s.confirmedSlots) ||
    !Array.isArray(s.coveredPositions) ||
    !s.coveredPositions.every(text) ||
    !object(s.candidates) ||
    !Object.entries(s.candidates).every(
      ([p, c]) =>
        text(p) &&
        object(c) &&
        slots(c.slots) &&
        c.slots.every((slot) => slot.position === p) &&
        date(c.firstSeenAt)
    ) ||
    !Array.isArray(s.injuries) ||
    !s.injuries.every(
      (i) =>
        object(i) &&
        text(i.playerId) &&
        text(i.playerName) &&
        Array.isArray(i.designations) &&
        i.designations.every(text)
    )
  )
    throw new Error('Invalid team event snapshot state');
  // The checks above establish the serialized state contract before it reaches a detector.
  return {
    revision: row.revision as number,
    observedAt: row.observed_at,
    state: s as unknown as SnapshotState,
  };
}
