// Advances one team's starter state by one observed depth chart and reports the changes
// that have now been seen twice in a row. Pure: no fetch, no DB.
//
// A new name at rank 1 is held as a candidate on its first sighting and confirmed on the
// next run only if it is still there. A source that flips for a single run therefore
// never produces an event, at the cost of one run of delay.

import { starterChangeCopy } from './copy';
import type { StarterState, TeamEvent, TeamEventTier } from './types';

export interface ObservedStarter {
  position: string;
  playerId: string;
  playerName: string;
}

// Positions whose starter changing is recorded but is not a headline moment.
const EVERYTHING_ONLY_POSITIONS = new Set(['LS']);

function tierFor(position: string): TeamEventTier {
  return EVERYTHING_ONLY_POSITIONS.has(position) ? 'everything' : 'big_moments';
}

export function advanceStarters(args: {
  teamId: string;
  teamName: string;
  previous: readonly StarterState[];
  observed: readonly ObservedStarter[];
  now: string;
}): { next: StarterState[]; events: TeamEvent[] } {
  const { teamId, teamName, now } = args;
  const priorByPosition = new Map(args.previous.map((row) => [row.position, row]));
  const next: StarterState[] = [];
  const events: TeamEvent[] = [];

  for (const seen of args.observed) {
    const prior = priorByPosition.get(seen.position);
    const settled: StarterState = {
      teamId,
      position: seen.position,
      confirmedPlayerId: seen.playerId,
      confirmedPlayerName: seen.playerName,
      candidatePlayerId: null,
      candidatePlayerName: null,
    };

    if (!prior || prior.confirmedPlayerId === seen.playerId) {
      next.push(settled);
      continue;
    }
    if (prior.candidatePlayerId !== seen.playerId) {
      next.push({
        ...prior,
        candidatePlayerId: seen.playerId,
        candidatePlayerName: seen.playerName,
      });
      continue;
    }

    const copy = starterChangeCopy({
      teamName,
      position: seen.position,
      playerName: seen.playerName,
      previousName: prior.confirmedPlayerName,
    });
    events.push({
      dedupeKey: `starter_change:${teamId}:${seen.position}:${seen.playerId}:${now.slice(0, 10)}`,
      type: 'starter_change',
      tier: tierFor(seen.position),
      teamId,
      playerId: seen.playerId,
      headline: copy.headline,
      detail: copy.detail,
      payload: {
        position: seen.position,
        player_name: seen.playerName,
        previous_player_id: prior.confirmedPlayerId,
        previous_player_name: prior.confirmedPlayerName,
      },
      source: 'espn_depth_chart',
      occurredAt: now,
    });
    next.push(settled);
  }

  return { next, events };
}
