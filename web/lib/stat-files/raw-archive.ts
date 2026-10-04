// A gzipped mirror of every source file a build fetches, kept beside `v1/` under `_raw/`.
// A rebuild never has to depend on nflverse keeping an old file, or its old column layout,
// available: `--from-raw` serves the archive instead of the network.
//
// Each asset is stored as the exact text the source returned, plus a `.meta.json` with the
// URL, fetch time, optional release `updated_at` and header columns. The body hash lives in
// the meta, so an unchanged re-fetch writes nothing (no changed bytes, no new fetch time).

import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { rawAssetKey, rawMetaKey } from './layout';
import type { StatFileTarget } from './publish';

export interface RawAssetLocation {
  source: string;
  season: number | 'all';
  asset: string;
}

export interface RawAssetMeta {
  url: string;
  fetched_at: string;
  release_updated_at?: string;
  header_columns: string[];
  /** sha256 of the uncompressed text. */
  sha256: string;
}

const RELEASE_URL =
  /^https:\/\/github\.com\/nflverse\/nflverse-data\/releases\/download\/([^/]+)\/([^/]+)$/;
const NFLDATA_URL = /^https:\/\/github\.com\/nflverse\/nfldata\/raw\/[^/]+\/data\/([^/]+)$/;

/**
 * Where a source URL is archived: release assets by `{tag}` and the season in the file name
 * (`all` for a whole-history file), nfldata files under `nfldata`. A `.gz` file name is
 * archived decompressed, so the archive key never ends in `.gz.gz`.
 */
export function rawLocationForUrl(url: string): RawAssetLocation {
  const release = RELEASE_URL.exec(url);
  const nfldata = NFLDATA_URL.exec(url);
  const [source, file] = release
    ? [release[1], release[2]]
    : nfldata
      ? ['nfldata', nfldata[1]]
      : [];
  if (!source || !file) throw new Error(`no raw archive location for ${url}`);
  const asset = file.replace(/\.gz$/, '');
  const season = /(?:^|_)(\d{4})(?:_|\.)/.exec(asset);
  return { source, season: season ? Number(season[1]) : 'all', asset };
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export interface RawArchive {
  /** Archive fetched text. Returns false, writing nothing, when the bytes are unchanged. */
  store(
    url: string,
    text: string,
    info: { headerColumns: string[]; releaseUpdatedAt?: string; fetchedAt?: string }
  ): Promise<boolean>;
  /** The archived text for a URL, or null when it was never archived. */
  read(url: string): Promise<string | null>;
}

export function createRawArchive(target: StatFileTarget): RawArchive {
  return {
    async store(url, text, info) {
      const { source, season, asset } = rawLocationForUrl(url);
      const hash = sha256(text);
      const existing = await target.get(rawMetaKey(source, season, asset));
      if (existing) {
        try {
          const meta = JSON.parse(Buffer.from(existing).toString('utf8')) as RawAssetMeta;
          if (meta.sha256 === hash) return false;
        } catch {
          // An unreadable meta is treated as absent: re-archive rather than trust it.
        }
      }
      const meta: RawAssetMeta = {
        url,
        fetched_at: info.fetchedAt ?? new Date().toISOString(),
        ...(info.releaseUpdatedAt ? { release_updated_at: info.releaseUpdatedAt } : {}),
        header_columns: info.headerColumns,
        sha256: hash,
      };
      await target.put(
        rawAssetKey(source, season, asset),
        gzipSync(Buffer.from(text, 'utf8'), { level: 9 }),
        {
          contentType: 'application/gzip',
          cacheControl: 'no-store',
        }
      );
      await target.put(
        rawMetaKey(source, season, asset),
        Buffer.from(`${JSON.stringify(meta, null, 2)}\n`),
        {
          contentType: 'application/json',
          cacheControl: 'no-store',
        }
      );
      return true;
    },
    async read(url) {
      const { source, season, asset } = rawLocationForUrl(url);
      const bytes = await target.get(rawAssetKey(source, season, asset));
      return bytes ? gunzipSync(Buffer.from(bytes)).toString('utf8') : null;
    },
  };
}

/**
 * The text fetcher a build hands to the source guard. Live mode fetches and archives;
 * `fromRaw` serves the archive only, and a missing asset surfaces as a 404 so the guard
 * treats it exactly like a source that doesn't publish that file.
 */
export function createSourceFetcher(opts: {
  archive: RawArchive;
  fromRaw: boolean;
  fetchLive: (url: string) => Promise<string>;
  headerColumns: (text: string) => string[];
  releaseUpdatedAt?: (url: string) => Promise<string | undefined>;
}): (url: string) => Promise<string> {
  return async (url) => {
    if (opts.fromRaw) {
      const text = await opts.archive.read(url);
      if (text === null) throw new Error(`404 ${url} (not in the raw archive)`);
      return text;
    }
    const text = await opts.fetchLive(url);
    await opts.archive.store(url, text, {
      headerColumns: opts.headerColumns(text),
      releaseUpdatedAt: await opts.releaseUpdatedAt?.(url),
    });
    return text;
  };
}
