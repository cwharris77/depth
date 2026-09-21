// Byte-store targets for the stat-file publisher. Two implementations sit behind the same
// `StatFileTarget` seam:
//
//  - `FileSystemStatFileTarget` — the one the local build and `stat-files:serve` use, so the
//    whole pipeline runs without Cloudflare credentials. Each gzip body is stored at
//    `<root>/<key>` plus a sidecar `<key>.headers.json`, which lets the local server replay
//    the exact `Content-Type`, `Content-Encoding` and `Cache-Control` a real bucket returns.
//  - `R2StatFileTarget` — Cloudflare R2 over `@aws-sdk/client-s3`, the only dependency the
//    design allows for it. The endpoint is derived from `R2_ACCOUNT_ID`; credentials are
//    read from the environment only (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`), never
//    passed as arguments, so they can't be checked into a script or logged.
//
// A transient R2 failure (5xx, throttling, a dropped connection) is retried with linear
// backoff, mirroring the fetch retry in `scripts/build-stat-files.mts`; a missing object is
// never transient — it returns `null` so the publisher treats it as "not uploaded yet".

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { StatFileHeaders, StatFileTarget } from './publish';

/** Transient R2 failures are retried this many times before the error surfaces. */
export const R2_MAX_ATTEMPTS = 3;

export class FileSystemStatFileTarget implements StatFileTarget {
  constructor(private readonly root: string) {}

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const bytes = await readFile(this.pathFor(key));
      return new Uint8Array(bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async put(key: string, body: Uint8Array, headers: StatFileHeaders): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    await writeFile(`${path}.headers.json`, `${JSON.stringify(headers, null, 2)}\n`, 'utf8');
  }

  headersFor(key: string): Promise<StatFileHeaders | null> {
    return readSidecarHeaders(this.pathFor(key));
  }

  private pathFor(key: string): string {
    return join(this.root, ...key.split('/'));
  }
}

async function readSidecarHeaders(path: string): Promise<StatFileHeaders | null> {
  try {
    const raw = await readFile(`${path}.headers.json`, 'utf8');
    return JSON.parse(raw) as StatFileHeaders;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** The env var names the R2 target reads — the only place credentials may come from. */
export const R2_ENV = {
  accountId: 'R2_ACCOUNT_ID',
  bucket: 'R2_BUCKET',
  accessKeyId: 'R2_ACCESS_KEY_ID',
  secretAccessKey: 'R2_SECRET_ACCESS_KEY',
} as const;

export interface R2StatFileConfig {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class R2StatFileTarget implements StatFileTarget {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2StatFileConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      // R2 ignores the region but the SDK requires one; the endpoint is the real locator.
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const response = await withRetry(() =>
      this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    ).catch((error: unknown) => {
      if (isNotFound(error)) return null;
      throw error;
    });
    if (!response || !response.Body) return null;
    // The SDK streams the body; the publisher wants the full bytes back.
    return new Uint8Array(await response.Body.transformToByteArray());
  }

  async put(key: string, body: Uint8Array, headers: StatFileHeaders): Promise<void> {
    await withRetry(() =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: headers.contentType,
          ContentEncoding: headers.contentEncoding,
          CacheControl: headers.cacheControl,
        })
      )
    );
  }

  destroy(): void {
    this.client.destroy();
  }
}

/** Build the R2 target from the environment; throws if any required var is missing. */
export function r2StatFileTargetFromEnv(
  env: Record<string, string | undefined> = process.env
): R2StatFileTarget {
  return new R2StatFileTarget({
    accountId: requireEnv(env, R2_ENV.accountId),
    bucket: requireEnv(env, R2_ENV.bucket),
    accessKeyId: requireEnv(env, R2_ENV.accessKeyId),
    secretAccessKey: requireEnv(env, R2_ENV.secretAccessKey),
  });
}

function requireEnv(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`missing required env var ${name}`);
  return value;
}

/** Retry a transient failure with linear backoff, matching the build script's fetch retry. */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < R2_MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === R2_MAX_ATTEMPTS - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** A 404 / NoSuchKey means "not there yet" — a real answer, never retried. */
function isNotFound(error: unknown): boolean {
  const status = httpStatus(error);
  if (status === 404) return true;
  const name = (error as { name?: string } | null)?.name;
  return name === 'NoSuchKey' || name === 'NotFound';
}

function isTransient(error: unknown): boolean {
  const status = httpStatus(error);
  if (status !== undefined && status >= 500) return true;
  const name = (error as { name?: string } | null)?.name;
  if (
    name === 'RequestTimeout' ||
    name === 'TimeoutError' ||
    name === 'ThrottlingException' ||
    name === 'SlowDown' ||
    name === 'RequestTimeTooSkewed'
  ) {
    return true;
  }
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    code === 'EAI_AGAIN'
  );
}

function httpStatus(error: unknown): number | undefined {
  const metadata = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata;
  return metadata?.httpStatusCode;
}
