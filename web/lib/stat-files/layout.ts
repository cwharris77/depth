// The v1 stat-file object layout and its cache policy (the R2-on-Cloudflare design,
// 2026-09-16). This module is the single place the key grammar lives: every producer and
// the local server read keys from here so the layout can't drift between them.
//
// All served objects are gzip JSON. `_build/` checkpoints are private working state (a WAF
// blocks that prefix on the public hostname) and are written `no-store`; `players/*` and `teams/*` are served
// from the edge cache, with the current season's objects revalidating hourly and a completed
// season's game log weekly (nflverse issues corrections, so not `immutable`).

/** Schema version segment baked into every key. A breaking shape change writes `v2/`. */
export const STAT_FILES_SCHEMA_VERSION = 1;

const PREFIX = `v${STAT_FILES_SCHEMA_VERSION}`;

/** `v1/manifest.json` — coverage + crosswalk-miss counts, rewritten every publish. */
export function manifestKey(): string {
  return `${PREFIX}/manifest.json`;
}

/** `v1/players/{espn_id}/seasons.json` — one career ledger per player. */
export function playerSeasonsKey(espnId: string): string {
  return `${PREFIX}/players/${espnId}/seasons.json`;
}

/** `v1/players/{espn_id}/games/{season}.json` — one player-season game log. */
export function playerGamesKey(espnId: string, season: number): string {
  return `${PREFIX}/players/${espnId}/games/${season}.json`;
}

/** `v1/teams/{team_id}/seasons.json` — one team's per-game lines, allowed rates and ranks. */
export function teamSeasonsKey(teamId: string): string {
  return `${PREFIX}/teams/${teamId}/seasons.json`;
}

/** `v1/_build/team-rows/{season}.json` — the publisher checkpoint of one season's team-games. */
export function teamCheckpointKey(season: number): string {
  return `${PREFIX}/_build/team-rows/${season}.json`;
}

/** `v1/_build/season-rows/{season}.json` — the publisher checkpoint for one season. */
export function seasonCheckpointKey(season: number): string {
  return `${PREFIX}/_build/season-rows/${season}.json`;
}

/** `v1/_build/publish-index.json` — key → sha256 of the last uploaded (uncompressed) body. */
export function publishIndexKey(): string {
  return `${PREFIX}/_build/publish-index.json`;
}

/** A private working object (`_build/*`) is never served and never cached at the edge. */
export function isBuildKey(key: string): boolean {
  return key.startsWith(`${PREFIX}/_build/`);
}

/** Root of the raw source archive. It sits beside `v1/`, so a schema bump never moves it. */
export const RAW_PREFIX = '_raw';

/**
 * `_raw/{source}/{season}/{asset}.gz` — a fetched source file exactly as served, gzipped.
 * `season` is `all` for a whole-history file.
 */
export function rawAssetKey(source: string, season: number | 'all', asset: string): string {
  return `${RAW_PREFIX}/${source}/${season}/${asset}.gz`;
}

/** `_raw/{source}/{season}/{asset}.meta.json` — provenance for the archived copy. */
export function rawMetaKey(source: string, season: number | 'all', asset: string): string {
  return `${RAW_PREFIX}/${source}/${season}/${asset}.meta.json`;
}

export function isRawKey(key: string): boolean {
  return key.startsWith(`${RAW_PREFIX}/`);
}

/**
 * The `Cache-Control` for an object. `players/{espn_id}/seasons.json` and the manifest
 * revalidate hourly (a current season's stats keep moving); a completed season's game log
 * is weekly.
 * `currentSeason` is the canonical `nflSeasonState()` value — never a source's own label.
 */
export function cacheControlFor(key: string, currentSeason: number): string {
  if (isBuildKey(key) || isRawKey(key)) return 'no-store';
  const gameLogMatch = key.match(/\/games\/(\d{4})\.json$/);
  if (gameLogMatch) {
    const season = Number(gameLogMatch[1]);
    return season >= currentSeason ? 'public, max-age=3600' : 'public, max-age=604800';
  }
  return 'public, max-age=3600';
}
