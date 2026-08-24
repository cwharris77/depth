// Maps the bounded player_recent_snaps read into Compare's domain contract. The
// mapper chooses one complete ingest window and rejects mixed metadata so callers
// never receive a summary assembled across seasons or ingestion runs.
import type {
  ParticipationUnit,
  PlayerRecentParticipation,
  RecentParticipation,
} from '@/lib/types';

export interface PlayerRecentSnapsRow {
  team_id: string;
  season: number;
  player_id: string;
  window_start_week: number;
  window_end_week: number;
  window_game_ids: string[];
  games: number;
  offense_snaps: number;
  offense_pct: number | null;
  defense_snaps: number;
  defense_pct: number | null;
  special_teams_snaps: number;
  special_teams_pct: number | null;
  source: string;
  updated_at: string;
}

function participationUnit(snaps: number, percentage: number | null): ParticipationUnit {
  return percentage === null ? { snaps } : { snaps, percentage };
}

function toPlayer(row: PlayerRecentSnapsRow): PlayerRecentParticipation {
  return {
    playerId: row.player_id,
    offense: participationUnit(row.offense_snaps, row.offense_pct),
    defense: participationUnit(row.defense_snaps, row.defense_pct),
    specialTeams: participationUnit(row.special_teams_snaps, row.special_teams_pct),
  };
}

function sameWindow(a: PlayerRecentSnapsRow, b: PlayerRecentSnapsRow): boolean {
  return (
    a.team_id === b.team_id &&
    a.window_start_week === b.window_start_week &&
    a.window_end_week === b.window_end_week &&
    a.games === b.games &&
    a.source === b.source &&
    a.window_game_ids.length === b.window_game_ids.length &&
    a.window_game_ids.every((gameId, index) => gameId === b.window_game_ids[index])
  );
}

export function buildRecentParticipation(
  rows: PlayerRecentSnapsRow[]
): RecentParticipation | undefined {
  if (rows.length === 0) return undefined;

  const season = Math.max(...rows.map((row) => row.season));
  const seasonRows = rows.filter((row) => row.season === season);
  const timestamps = seasonRows.map((row) => Date.parse(row.updated_at));
  if (timestamps.some(Number.isNaN)) throw new Error('invalid recent participation timestamp');

  const winningTimestamp = Math.max(...timestamps);
  const winningRows = seasonRows.filter((row) => Date.parse(row.updated_at) === winningTimestamp);
  const first = winningRows[0];
  if (!first || winningRows.some((row) => !sameWindow(first, row))) {
    throw new Error('inconsistent recent participation metadata');
  }
  if (first.source !== 'nflverse-pfr') {
    throw new Error(`unknown recent participation source: ${first.source}`);
  }

  return {
    teamId: first.team_id,
    season,
    windowStartWeek: first.window_start_week,
    windowEndWeek: first.window_end_week,
    gameIds: first.window_game_ids,
    source: 'nflverse / Pro Football Reference',
    updatedAt: first.updated_at,
    players: winningRows.map(toPlayer).sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}
