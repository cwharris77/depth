// Turns nflverse's nfldata/games.csv rows into `games` + `schedules` upsert rows. Pure:
// no fetch, no DB. Each CSV row is one shared game (home + away on a single row); it
// becomes one game row and contributes a schedule row for each team's (team, season) —
// the ingest upserts schedules first so the games' composite FKs resolve
// (docs/superpowers/specs/2026-07-17-team-schedule-design.md). A row whose home or away
// code doesn't crosswalk (resolveCode -> null), or whose season isn't a number, is
// skipped and counted -- never guessed, same posture as the player-stats transform.

export interface ScheduleInsert {
  team_id: string;
  season: number;
}

export interface GameInsert {
  game_id: string;
  season: number;
  game_type: string;
  week: number | null;
  gameday: string | null;
  gametime: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}

// '' -> null (nflverse's blank-cell convention, e.g. an unplayed game's score or a
// far-future game's date), else Number(...); a malformed numeric cell degrades to null
// rather than throwing.
function nullableInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function nullableText(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function toScheduleAndGameRows(
  csvRows: Record<string, string>[],
  resolveCode: (code: string) => string | null
): { games: GameInsert[]; schedules: ScheduleInsert[]; skipped: number } {
  const games: GameInsert[] = [];
  const scheduleKeys = new Set<string>(); // `${team_id}|${season}`, dedup across a team's games
  let skipped = 0;

  for (const row of csvRows) {
    // Guard the empty string explicitly: Number('') is 0, not NaN, so a blank season would
    // otherwise slip through as year 0.
    const seasonRaw = row.season?.trim() ?? '';
    const season = Number(seasonRaw);
    const homeId = resolveCode(row.home_team?.trim() ?? '');
    const awayId = resolveCode(row.away_team?.trim() ?? '');
    if (
      seasonRaw === '' ||
      !Number.isInteger(season) ||
      !homeId ||
      !awayId ||
      !row.game_id?.trim()
    ) {
      skipped++;
      continue;
    }

    games.push({
      game_id: row.game_id.trim(),
      season,
      game_type: row.game_type?.trim() || 'REG',
      week: nullableInt(row.week),
      gameday: nullableText(row.gameday),
      gametime: nullableText(row.gametime),
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: nullableInt(row.home_score),
      away_score: nullableInt(row.away_score),
    });
    scheduleKeys.add(`${homeId}|${season}`);
    scheduleKeys.add(`${awayId}|${season}`);
  }

  // Stable order (team then season) so a rerun writes the same batch — nice for
  // idempotent upserts and deterministic tests.
  const schedules: ScheduleInsert[] = [...scheduleKeys]
    .map((key) => {
      const [team_id, season] = key.split('|');
      return { team_id, season: Number(season) };
    })
    .sort((a, b) => a.team_id.localeCompare(b.team_id) || a.season - b.season);

  return { games, schedules, skipped };
}
