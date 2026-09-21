// The generic writer every stat file goes through (R2-on-Cloudflare design, 2026-09-16).
// It knows nothing about football: serialize → content-hash → skip if unchanged → gzip →
// write with headers. A daily run therefore re-uploads only objects whose body actually
// changed, which is what keeps a batch job far below R2's Class-A operation budget.
//
// Targets are pluggable so the builders run without Cloudflare credentials: the
// filesystem target is what `stat-files:build` and the local server use, and the R2 target
// over `@aws-sdk/client-s3` lives beside it in `targets.ts`. This module stays SDK-free.
//
// The change signal is the sha256 of the *uncompressed* JSON body (not the gzip bytes),
// stored in `v1/_build/publish-index.json` under the object key. Body-hash rather than
// byte-diff so the index is one small object instead of re-reading every published file.

import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { cacheControlFor, manifestKey, publishIndexKey, STAT_FILES_SCHEMA_VERSION } from './layout';

export interface StatFileHeaders {
  contentType: string;
  contentEncoding?: string;
  cacheControl: string;
}

/** A byte sink for stat objects. `get` returns the stored bytes (as written), or null. */
export interface StatFileTarget {
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, body: Uint8Array, headers: StatFileHeaders): Promise<void>;
}

/** Per-source coverage and identity counts carried into the published manifest. */
export interface StatFilesManifest {
  schema_version: number;
  generated_at: string;
  sources: Record<
    string,
    {
      min_season: number | null;
      max_season: number | null;
      crosswalk_misses: number;
    }
  >;
}

export interface PublishCounts {
  uploaded: number;
  skipped: number;
}

export interface Publisher extends PublishCounts {
  /** Serialize + hash + upload unless the body is byte-identical to the last publish. */
  put(key: string, value: unknown): Promise<boolean>;
  writeManifest(manifest: Omit<StatFilesManifest, 'schema_version'>): Promise<void>;
  /** Persist the publish index for the next run. Call once, after all puts. */
  flush(): Promise<void>;
}

interface PublishIndex {
  schema_version: number;
  /** object key → sha256 of the last uploaded uncompressed body */
  objects: Record<string, string>;
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function serializeIndex(index: PublishIndex): string {
  const objects = Object.fromEntries(
    Object.entries(index.objects).sort(([left], [right]) => left.localeCompare(right))
  );
  return `${JSON.stringify({ ...index, objects }, null, 2)}\n`;
}

async function loadIndex(target: StatFileTarget): Promise<PublishIndex> {
  const raw = await target.get(publishIndexKey());
  if (!raw) return { schema_version: STAT_FILES_SCHEMA_VERSION, objects: {} };
  try {
    const parsed = JSON.parse(gunzipSync(Buffer.from(raw)).toString('utf8')) as PublishIndex;
    // The index never records itself: a self-referential hash would change on every
    // flush and break the skip for the object that is written every publish.
    const self = publishIndexKey();
    const objects = Object.fromEntries(
      Object.entries(parsed.objects ?? {}).filter(([key]) => key !== self)
    );
    return { schema_version: STAT_FILES_SCHEMA_VERSION, objects };
  } catch {
    // A corrupt/unreadable index must not block a publish — treat it as empty, so every
    // object is treated as changed and re-uploaded. Degrade, never throw.
    return { schema_version: STAT_FILES_SCHEMA_VERSION, objects: {} };
  }
}

/** Deterministic JSON: a stable body is required for the hash-skip to ever trigger. */
function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * A publisher over any target. `currentSeason` drives the cache policy (see layout.ts) and
 * is the canonical `nflSeasonState()` value, not a source label.
 */
export async function createPublisher(
  target: StatFileTarget,
  opts: { currentSeason: number }
): Promise<Publisher> {
  const index = await loadIndex(target);
  const counts: PublishCounts = { uploaded: 0, skipped: 0 };

  async function put(key: string, value: unknown): Promise<boolean> {
    const body = Buffer.from(stableStringify(value), 'utf8');
    const hash = sha256Hex(body);
    if (index.objects[key] === hash) {
      counts.skipped++;
      return false;
    }
    const gz = gzipSync(body, { level: 9 });
    await target.put(key, gz, {
      contentType: 'application/json',
      contentEncoding: 'gzip',
      cacheControl: cacheControlFor(key, opts.currentSeason),
    });
    index.objects[key] = hash;
    counts.uploaded++;
    return true;
  }

  return {
    get uploaded() {
      return counts.uploaded;
    },
    get skipped() {
      return counts.skipped;
    },
    put,
    async writeManifest(manifest) {
      await put(manifestKey(), { schema_version: STAT_FILES_SCHEMA_VERSION, ...manifest });
    },
    async flush() {
      // The index is private working state (`_build`, no-store) rewritten every publish;
      // it is not counted as a published object and never records itself, so it stays a
      // stable value a later run can load and diff against.
      const body = gzipSync(Buffer.from(serializeIndex(index), 'utf8'), { level: 9 });
      await target.put(publishIndexKey(), body, {
        contentType: 'application/json',
        contentEncoding: 'gzip',
        cacheControl: cacheControlFor(publishIndexKey(), opts.currentSeason),
      });
    },
  };
}
