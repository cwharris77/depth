// Byte-store targets for the stat-file publisher. The filesystem target is the one the
// local build and `stat-files:serve` use, so the whole pipeline runs without Cloudflare
// credentials; the R2 target arrives with DEP-577 and is deliberately not here yet (it
// would add the only new dependency the design allows, `@aws-sdk/client-s3`).
//
// The filesystem target stores each gzip body at `<root>/<key>` plus a sidecar
// `<key>.headers.json` so the local server can replay the exact `Content-Type`,
// `Content-Encoding` and `Cache-Control` a real bucket would return.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StatFileHeaders, StatFileTarget } from './publisher';

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
