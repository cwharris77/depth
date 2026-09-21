# stat-files

The writer for the stat-history objects served from Cloudflare R2. It knows nothing about football — only the v1 object layout, gzip JSON encoding, cache headers, and change detection. The builders (DEP-544 career files, DEP-576 game logs) produce values and hand them to `createPublisher`; the iOS reader (DEP-542) consumes the resulting objects. The design spec lives in the vault (`2026-09-16-stat-history-on-r2-design`); this file is the developer reference for the code here.

## Layout

`layout.ts` is the single source of the key grammar, so every producer and the local server agree on it:

| Key | Object | Cache-Control |
| --- | --- | --- |
| `v1/manifest.json` | schema version, `generated_at`, per-source coverage, crosswalk misses | `public, max-age=3600` |
| `v1/players/{espn_id}/seasons.json` | one player's career ledger | `public, max-age=3600` |
| `v1/players/{espn_id}/games/{season}.json` | one player-season game log | current season `max-age=3600`, completed `max-age=604800` |
| `v1/_build/season-rows/{season}.json` | publisher checkpoint (private) | `no-store` |
| `v1/_build/publish-index.json` | key → sha256 of the last uploaded body (private) | `no-store` |

Every served object is gzip JSON with `Content-Type: application/json` and `Content-Encoding: gzip`. `_build/*` is working state and is never cached. `cacheControlFor(key, currentSeason)` derives the header; `currentSeason` is the canonical `nflSeasonState()` value, never a source's own label. A breaking shape change bumps `STAT_FILES_SCHEMA_VERSION` and writes a new `v2/` prefix.

## Targets

`targets.ts` puts two stores behind the same `StatFileTarget` seam (`get` / `put`):

- `FileSystemStatFileTarget(root)` — for local runs with no Cloudflare credentials. Writes each gzip body to `<root>/<key>` plus a sidecar `<key>.headers.json`, so the local server can replay the exact headers a bucket would return.
- `R2StatFileTarget` / `r2StatFileTargetFromEnv()` — Cloudflare R2 over `@aws-sdk/client-s3`. The endpoint is `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; credentials come from the environment only (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`). Transient failures (5xx, throttling, dropped connections) are retried with linear backoff; a missing object returns `null` so it is treated as "not uploaded yet".

## Publishing

`publish.ts`'s `createPublisher(target, { currentSeason })` is the writer every stat file goes through. `put(key, value)` serializes deterministically, hashes the uncompressed body, skips the upload when the hash matches the last publish (`v1/_build/publish-index.json`), and otherwise gzips and writes with the right headers. `writeManifest(...)` writes `v1/manifest.json`; `flush()` persists the index and must be called once after all puts. The returned `uploaded` / `skipped` counts are what keeps a daily run far below R2's Class-A operation budget — an unchanged second publish uploads zero objects.

## Serving locally

```
npm run stat-files:build -- --seasons 1999-2026 --out .stat-files
npm run stat-files:serve
```

`stat-files:serve` starts a Node `http` server (no dependency) on `127.0.0.1:54330` over `.stat-files/`, replaying each sidecar's headers. Override with `-- --host <host> --port <port> --root <dir>`. Then:

```
curl -sD - http://127.0.0.1:54330/v1/manifest.json | gunzip
```

The `Content-Encoding: gzip` and `Cache-Control` in the response are the same ones a real bucket returns. `web/.stat-files/` is gitignored.
