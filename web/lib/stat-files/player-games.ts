// Weekly nflverse rows → one game row per (player, season, season_type, team, week). Pure:
// no fetch, no DB, no filesystem. It reuses the season fold from `player-seasons.ts` on a
// single week's rows, so a game line carries exactly the section fields a season line does
// (`box`, `snaps`, `pfr`, `ngs`, `qbr`), and a source with no row for that week omits its
// section rather than zero-filling it.
//
// Game identity and opponent come from the schedule (`GameIndex`, built from nfldata
// games.csv), keyed by (season, week, team) — never by name matching and never copied from
// a source whose game ids use a different scheme. A week with no schedule match ships
// without `game_id`/`opponent`.

import {
  foldSection,
  foldSnaps,
  SECTION_SPECS,
  type PlayerWeekRow,
  type SeasonSections,
  type SeasonType,
  type StatLine,
} from './player-seasons';

export interface ScheduledGame {
  game_id: string;
  season: number;
  week: number | null;
  home_team_id: string;
  away_team_id: string;
}

export interface GameRef {
  game_id: string;
  opponent: string;
}

export type GameIndex = ReadonlyMap<string, GameRef>;

function gameIndexKey(season: number, week: number, team: string): string {
  return `${season}\u0000${week}\u0000${team}`;
}

/** (season, week, team) → the game that team played that week. */
export function buildGameIndex(games: readonly ScheduledGame[]): GameIndex {
  const index = new Map<string, GameRef>();
  for (const game of games) {
    if (game.week === null) continue;
    index.set(gameIndexKey(game.season, game.week, game.home_team_id), {
      game_id: game.game_id,
      opponent: game.away_team_id,
    });
    index.set(gameIndexKey(game.season, game.week, game.away_team_id), {
      game_id: game.game_id,
      opponent: game.home_team_id,
    });
  }
  return index;
}

export interface PlayerGameRow {
  player_id: string;
  season: number;
  season_type: SeasonType;
  week: number;
  team: string | null;
  game_id?: string;
  opponent?: string;
  box?: StatLine;
  snaps?: StatLine;
  pfr?: StatLine;
  ngs?: StatLine;
  qbr?: StatLine;
}

const SEASON_TYPE_ORDER: Record<SeasonType, number> = { REG: 0, POST: 1 };

interface GameGroup {
  playerId: string;
  seasonType: SeasonType;
  week: number;
  team: string | null;
  sections: SeasonSections;
}

/**
 * One season's weekly rows (already identity-resolved) → one row per
 * (player, season_type, team, week). A traded player's weeks stay on the team they played
 * for. Sorted by week so the output is independent of fetch order.
 */
export function consolidateGames(
  season: number,
  sections: SeasonSections,
  index: GameIndex
): PlayerGameRow[] {
  const groups = new Map<string, GameGroup>();
  for (const name of Object.keys(sections) as (keyof SeasonSections)[]) {
    for (const row of sections[name] ?? []) {
      if (row.season !== season) continue;
      const key = `${row.playerId}\u0000${row.seasonType}\u0000${row.team ?? ''}\u0000${row.week}`;
      const group = groups.get(key) ?? {
        playerId: row.playerId,
        seasonType: row.seasonType,
        week: row.week,
        team: row.team,
        sections: {},
      };
      (group.sections[name] ??= []).push(row);
      groups.set(key, group);
    }
  }

  const out: PlayerGameRow[] = [];
  for (const group of groups.values()) {
    for (const rows of Object.values(group.sections)) {
      rows?.sort((left: PlayerWeekRow, right: PlayerWeekRow) =>
        (left.stats.game_id ?? '').localeCompare(right.stats.game_id ?? '')
      );
    }
    const row: PlayerGameRow = {
      player_id: group.playerId,
      season,
      season_type: group.seasonType,
      week: group.week,
      team: group.team,
    };
    const ref = group.team ? index.get(gameIndexKey(season, group.week, group.team)) : undefined;
    if (ref) {
      row.game_id = ref.game_id;
      row.opponent = ref.opponent;
    }
    for (const name of ['box', 'pfr', 'ngs', 'qbr'] as const) {
      const rows = group.sections[name];
      if (!rows?.length) continue;
      const line = foldSection(rows, SECTION_SPECS[name]);
      if (Object.keys(line).length) row[name] = line;
    }
    if (group.sections.snaps?.length) {
      const snaps = foldSnaps(group.sections.snaps);
      if (Object.keys(snaps).length) row.snaps = snaps;
    }
    out.push(row);
  }

  out.sort(
    (left, right) =>
      SEASON_TYPE_ORDER[left.season_type] - SEASON_TYPE_ORDER[right.season_type] ||
      left.week - right.week ||
      (left.team ?? '').localeCompare(right.team ?? '') ||
      left.player_id.localeCompare(right.player_id)
  );
  return out;
}

export interface PlayerGamesFile {
  schema_version: number;
  player_id: string;
  season: number;
  games: Omit<PlayerGameRow, 'player_id' | 'season'>[];
}

/** Groups one season's game rows into a file per player, keyed by ESPN id. */
export function buildPlayerGamesFiles(
  season: number,
  rows: readonly PlayerGameRow[],
  schemaVersion: number
): Map<string, PlayerGamesFile> {
  const files = new Map<string, PlayerGamesFile>();
  for (const { player_id: playerId, season: _season, ...game } of rows) {
    const file = files.get(playerId) ?? {
      schema_version: schemaVersion,
      player_id: playerId,
      season,
      games: [],
    };
    file.games.push(game);
    files.set(playerId, file);
  }
  return files;
}
