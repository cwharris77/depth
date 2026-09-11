// Aggregates nflverse game-level snap counts (snap_counts_<season>.csv) into season
// totals per player, for the positions whose only meaningful stat is participation --
// offensive line, long snapper, punter. `player_recent_snaps` keeps the bounded
// recent-team-game window (DEP-313); this is the season aggregate merged onto the
// matching `player_stats` row by scripts/ingest-nflverse.mts, never shipped as raw rows.
//
// Identity is PFR -> ESPN through the caller's crosswalk, never name matching (same rule
// as snap-counts.ts: a name join can silently attribute snaps to the wrong player).
//
// Percentage is the true season share -- the player's total snaps over the number of
// team plays he was available for -- not the mean of nflverse's per-game shares (the
// convention `player_recent_snaps` uses for its short window), so a game he barely
// played can't inflate it. nflverse gives only a per-game percentage, so team plays are
// recovered as snaps / pct for that game; a row whose snaps are non-zero but whose pct is
// missing or out of range is dropped (counted, never guessed), the same posture
// snap-counts.ts takes for a malformed unit.

export interface SeasonSnapTotalsInsert {
  player_id: string;
  season: number;
  offense_snaps: number;
  offense_pct: number | null;
  defense_snaps: number;
  defense_pct: number | null;
  special_teams_snaps: number;
  special_teams_pct: number | null;
}

export interface SeasonSnapTotalsResult {
  rows: SeasonSnapTotalsInsert[];
  malformedRows: number;
  unresolvedRows: number;
}

// One unit's contribution from a single game: the player's snaps and the team's play
// count for that game (snaps / pct), so season share is sum(snaps) / sum(plays).
interface UnitContribution {
  snaps: number;
  plays: number;
}

interface SeasonUnits {
  offense: UnitContribution;
  defense: UnitContribution;
  specialTeams: UnitContribution;
}

function emptyContribution(): UnitContribution {
  return { snaps: 0, plays: 0 };
}

function emptySeason(): SeasonUnits {
  return {
    offense: emptyContribution(),
    defense: emptyContribution(),
    specialTeams: emptyContribution(),
  };
}

// '' on both count and pct -> the unit was not played (zero snaps, no denominator).
// A non-negative integer count with a share in (0, 1] -> snaps and derived team plays.
// Anything else (bad count, or snaps with no usable share) -> null, row dropped.
function parseUnit(
  countValue: string | undefined,
  pctValue: string | undefined
): UnitContribution | null {
  const count = countValue?.trim();
  const pct = pctValue?.trim();
  if (!count && !pct) return emptyContribution();
  const snaps = Number(count);
  if (!Number.isInteger(snaps) || snaps < 0) return null;
  if (snaps === 0) return emptyContribution();
  const share = Number(pct);
  if (!Number.isFinite(share) || share <= 0 || share > 1) return null;
  return { snaps, plays: snaps / share };
}

function parseSeason(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function addContribution(left: UnitContribution, right: UnitContribution): UnitContribution {
  return { snaps: left.snaps + right.snaps, plays: left.plays + right.plays };
}

function toShare(units: UnitContribution): number | null {
  if (units.plays <= 0) return null;
  return Math.min(Math.max(units.snaps / units.plays, 0), 1);
}

export function toSeasonSnapTotals(
  csvRows: Record<string, string>[],
  pfrToEspn: ReadonlyMap<string, string>
): SeasonSnapTotalsResult {
  let malformedRows = 0;
  let unresolvedRows = 0;

  // A duplicate (season, game, player) row would double-count both snaps and the team
  // denominator; skip every occurrence after the first.
  const seenSourceKeys = new Set<string>();
  const totals = new Map<string, SeasonUnits>();

  for (const row of csvRows) {
    if (row.game_type?.trim() !== 'REG') continue;

    const season = parseSeason(row.season);
    const gameId = row.game_id?.trim();
    const pfrPlayerId = row.pfr_player_id?.trim();
    const offense = parseUnit(row.offense_snaps, row.offense_pct);
    const defense = parseUnit(row.defense_snaps, row.defense_pct);
    const specialTeams = parseUnit(row.st_snaps, row.st_pct);

    if (
      season === null ||
      !gameId ||
      !pfrPlayerId ||
      offense === null ||
      defense === null ||
      specialTeams === null
    ) {
      malformedRows++;
      continue;
    }

    const sourceKey = `${season}|${gameId}|${pfrPlayerId}`;
    if (seenSourceKeys.has(sourceKey)) {
      malformedRows++;
      continue;
    }
    seenSourceKeys.add(sourceKey);

    const playerId = pfrToEspn.get(pfrPlayerId);
    if (!playerId) {
      unresolvedRows++;
      continue;
    }

    const key = `${playerId}|${season}`;
    const existing = totals.get(key) ?? emptySeason();
    totals.set(key, {
      offense: addContribution(existing.offense, offense),
      defense: addContribution(existing.defense, defense),
      specialTeams: addContribution(existing.specialTeams, specialTeams),
    });
  }

  const rows: SeasonSnapTotalsInsert[] = [];
  for (const [key, units] of totals) {
    const totalSnaps = units.offense.snaps + units.defense.snaps + units.specialTeams.snaps;
    if (totalSnaps === 0) continue;
    const separator = key.lastIndexOf('|');
    rows.push({
      player_id: key.slice(0, separator),
      season: Number(key.slice(separator + 1)),
      offense_snaps: units.offense.snaps,
      offense_pct: toShare(units.offense),
      defense_snaps: units.defense.snaps,
      defense_pct: toShare(units.defense),
      special_teams_snaps: units.specialTeams.snaps,
      special_teams_pct: toShare(units.specialTeams),
    });
  }

  rows.sort(
    (left, right) => right.season - left.season || left.player_id.localeCompare(right.player_id)
  );
  return { rows, malformedRows, unresolvedRows };
}
