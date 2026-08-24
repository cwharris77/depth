// Converts nflverse game-level snap counts into the bounded, recent-team-game window
// consumed by later ingestion layers. Player identity stays entirely on nflverse's PFR-to-ESPN
// crosswalk: no name matching is permitted because it can silently attribute snaps incorrectly.

export interface RecentSnapSummaryInsert {
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
  source: 'nflverse-pfr';
}

export interface SnapCountsDiagnostics {
  fetchedRows: number;
  validRows: number;
  malformedRows: number;
  unresolvedRows: number;
  selectedTeams: number;
  selectedGames: number;
  summaries: number;
}

export interface SnapCountsTransformResult {
  rows: RecentSnapSummaryInsert[];
  diagnostics: SnapCountsDiagnostics;
}

interface SnapUnit {
  snaps: number;
  pct: number | null;
}

interface ValidSnapRow {
  gameId: string;
  season: number;
  week: number;
  teamId: string;
  pfrPlayerId: string;
  playerId: string | null;
  offense: SnapUnit;
  defense: SnapUnit;
  specialTeams: SnapUnit;
}

interface PlayerGameSnaps {
  offense: SnapUnit;
  defense: SnapUnit;
  specialTeams: SnapUnit;
}

function parseInteger(value: string | undefined, minimum: number): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : null;
}

function parseUnit(
  countValue: string | undefined,
  percentageValue: string | undefined
): SnapUnit | null {
  const count = countValue?.trim() ?? '';
  const percentage = percentageValue?.trim() ?? '';
  if (!count && !percentage) return { snaps: 0, pct: 0 };

  const snaps = parseInteger(count, 0);
  if (snaps === null) return null;

  const parsedPercentage = Number(percentage);
  const pct =
    percentage &&
    Number.isFinite(parsedPercentage) &&
    parsedPercentage >= 0 &&
    parsedPercentage <= 1
      ? parsedPercentage
      : null;
  return { snaps, pct };
}

function addUnit(left: SnapUnit, right: SnapUnit): SnapUnit {
  return {
    snaps: left.snaps + right.snaps,
    pct: left.pct === null || right.pct === null ? null : left.pct + right.pct,
  };
}

function emptyPlayerGameSnaps(): PlayerGameSnaps {
  return {
    offense: { snaps: 0, pct: 0 },
    defense: { snaps: 0, pct: 0 },
    specialTeams: { snaps: 0, pct: 0 },
  };
}

function addPlayerGameSnaps(left: PlayerGameSnaps, right: PlayerGameSnaps): PlayerGameSnaps {
  return {
    offense: addUnit(left.offense, right.offense),
    defense: addUnit(left.defense, right.defense),
    specialTeams: addUnit(left.specialTeams, right.specialTeams),
  };
}

export function toRecentSnapSummaries(
  csvRows: Record<string, string>[],
  pfrToEspn: ReadonlyMap<string, string>,
  resolveTeam: (code: string) => string | null
): SnapCountsTransformResult {
  const diagnostics: SnapCountsDiagnostics = {
    fetchedRows: csvRows.length,
    validRows: 0,
    malformedRows: 0,
    unresolvedRows: 0,
    selectedTeams: 0,
    selectedGames: 0,
    summaries: 0,
  };
  const candidates: ValidSnapRow[] = [];

  for (const row of csvRows) {
    const gameId = row.game_id?.trim();
    const teamCode = row.team?.trim();
    const pfrPlayerId = row.pfr_player_id?.trim();
    const season = parseInteger(row.season, 1);
    const week = parseInteger(row.week, 1);
    const offense = parseUnit(row.offense_snaps, row.offense_pct);
    const defense = parseUnit(row.defense_snaps, row.defense_pct);
    const specialTeams = parseUnit(row.st_snaps, row.st_pct);
    const teamId = teamCode ? resolveTeam(teamCode) : null;

    if (
      !gameId ||
      !pfrPlayerId ||
      season === null ||
      week === null ||
      !teamId ||
      !offense ||
      !defense ||
      !specialTeams
    ) {
      diagnostics.malformedRows++;
      continue;
    }
    if (row.game_type?.trim() !== 'REG') continue;

    candidates.push({
      gameId,
      season,
      week,
      teamId,
      pfrPlayerId,
      playerId: pfrToEspn.get(pfrPlayerId) ?? null,
      offense,
      defense,
      specialTeams,
    });
  }

  const duplicateKeys = new Set<string>();
  const sourceKeyCounts = new Map<string, number>();
  for (const row of candidates) {
    const key = `${row.season}|${row.teamId}|${row.gameId}|${row.pfrPlayerId}`;
    const count = (sourceKeyCounts.get(key) ?? 0) + 1;
    sourceKeyCounts.set(key, count);
    if (count === 2) duplicateKeys.add(key);
  }

  const validRows = candidates.filter((row) => {
    const key = `${row.season}|${row.teamId}|${row.gameId}|${row.pfrPlayerId}`;
    return !duplicateKeys.has(key);
  });
  diagnostics.malformedRows += candidates.length - validRows.length;
  diagnostics.validRows = validRows.length;
  diagnostics.unresolvedRows = validRows.filter((row) => row.playerId === null).length;

  const gamesByTeamSeason = new Map<string, Map<string, { gameId: string; week: number }>>();
  for (const row of validRows) {
    const teamSeasonKey = `${row.season}|${row.teamId}`;
    const games = gamesByTeamSeason.get(teamSeasonKey) ?? new Map();
    games.set(row.gameId, { gameId: row.gameId, week: row.week });
    gamesByTeamSeason.set(teamSeasonKey, games);
  }

  const selectedGamesByTeamSeason = new Map<string, { gameId: string; week: number }[]>();
  for (const [teamSeasonKey, games] of gamesByTeamSeason) {
    const selectedGames = [...games.values()]
      .sort((left, right) => left.week - right.week || left.gameId.localeCompare(right.gameId))
      .slice(-3);
    selectedGamesByTeamSeason.set(teamSeasonKey, selectedGames);
    diagnostics.selectedTeams++;
    diagnostics.selectedGames += selectedGames.length;
  }

  const playerGames = new Map<string, Map<string, PlayerGameSnaps>>();
  for (const row of validRows) {
    if (!row.playerId) continue;
    const teamSeasonKey = `${row.season}|${row.teamId}`;
    const selectedGames = selectedGamesByTeamSeason.get(teamSeasonKey);
    if (!selectedGames?.some((game) => game.gameId === row.gameId)) continue;

    const playerKey = `${teamSeasonKey}|${row.playerId}`;
    const games = playerGames.get(playerKey) ?? new Map<string, PlayerGameSnaps>();
    const existing = games.get(row.gameId) ?? emptyPlayerGameSnaps();
    games.set(
      row.gameId,
      addPlayerGameSnaps(existing, {
        offense: row.offense,
        defense: row.defense,
        specialTeams: row.specialTeams,
      })
    );
    playerGames.set(playerKey, games);
  }

  const rows: RecentSnapSummaryInsert[] = [];
  for (const [teamSeasonKey, selectedGames] of selectedGamesByTeamSeason) {
    const [seasonString, teamId] = teamSeasonKey.split('|');
    const season = Number(seasonString);
    const gameIds = selectedGames.map((game) => game.gameId);
    for (const [playerKey, games] of playerGames) {
      if (!playerKey.startsWith(`${teamSeasonKey}|`)) continue;
      const playerId = playerKey.slice(teamSeasonKey.length + 1);
      const totals = selectedGames.reduce(
        (total, game) =>
          addPlayerGameSnaps(total, games.get(game.gameId) ?? emptyPlayerGameSnaps()),
        emptyPlayerGameSnaps()
      );
      const gameCount = selectedGames.length;
      rows.push({
        team_id: teamId,
        season,
        player_id: playerId,
        window_start_week: selectedGames[0].week,
        window_end_week: selectedGames[gameCount - 1].week,
        window_game_ids: gameIds,
        games: gameCount,
        offense_snaps: totals.offense.snaps,
        offense_pct: totals.offense.pct === null ? null : totals.offense.pct / gameCount,
        defense_snaps: totals.defense.snaps,
        defense_pct: totals.defense.pct === null ? null : totals.defense.pct / gameCount,
        special_teams_snaps: totals.specialTeams.snaps,
        special_teams_pct:
          totals.specialTeams.pct === null ? null : totals.specialTeams.pct / gameCount,
        source: 'nflverse-pfr',
      });
    }
  }

  rows.sort(
    (left, right) =>
      right.season - left.season ||
      left.team_id.localeCompare(right.team_id) ||
      left.player_id.localeCompare(right.player_id)
  );
  diagnostics.summaries = rows.length;
  return { rows, diagnostics };
}
