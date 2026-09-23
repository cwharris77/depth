// The v1 stat-file object layout and its cache policy (the R2-on-Cloudflare design,
// 2026-09-16). This module is the single place the key grammar lives: every producer and
// the local server read keys from here so the layout can't drift between them.
//
// All served objects are gzip JSON. `_build/` checkpoints are private working state (a WAF
// blocks that prefix on the public hostname) and are written `no-store`; `players/*` is served
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

/**
 * The `Cache-Control` for an object. `players/{espn_id}/seasons.json` and the manifest
 * revalidate hourly (a current season's stats keep moving); a completed season's game log
 * is weekly.
 * `currentSeason` is the canonical `nflSeasonState()` value — never a source's own label.
 */
export function cacheControlFor(key: string, currentSeason: number): string {
  if (isBuildKey(key)) return 'no-store';
  const gameLogMatch = key.match(/\/games\/(\d{4})\.json$/);
  if (gameLogMatch) {
    const season = Number(gameLogMatch[1]);
    return season >= currentSeason ? 'public, max-age=3600' : 'public, max-age=604800';
  }
  return 'public, max-age=3600';
}
