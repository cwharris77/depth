// The static server behind `npm run stat-files:serve`. It serves the filesystem target's
// output (default `web/.stat-files/`) so the iOS reader and the builders can read
// published objects locally, without Cloudflare credentials. Node's `http` only — no new
// dependency — and it replays each object's `<key>.headers.json` sidecar verbatim, so a
// `curl` sees the same `Content-Type: application/json`, `Content-Encoding: gzip` and
// `Cache-Control` a real R2 bucket would return.
//
// The request handler is a plain function over (root, url) so it is testable end to end;
// the script is the thin listen/serve glue.

import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve as resolvePath, sep } from 'node:path';
import type { StatFileHeaders } from './publish';

export interface StatFileServerOptions {
  root: string;
}

export interface StatFileServerHandle {
  server: Server;
  /** Start listening and resolve once bound (port `0` picks a free port). */
  listen(port: number, host: string): Promise<{ port: number; host: string }>;
  close(): Promise<void>;
}

/** A server that resolves each request against `root` and replays its header sidecar. */
export function createStatFileServer(options: StatFileServerOptions): StatFileServerHandle {
  const root = resolvePath(options.root);
  const server = createServer((req, res) => {
    void handleRequest(req, res, root);
  });
  return {
    server,
    listen(port, host) {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          const address = server.address();
          if (address === null || typeof address === 'string') {
            resolve({ port, host });
          } else {
            resolve({ port: address.port, host: address.address });
          }
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  root: string
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    // A malformed percent-encoding is untrusted input — 400, never a thrown handler.
    res.writeHead(400);
    res.end('bad request');
    return;
  }
  const resolved = resolveObjectPath(root, pathname);
  if (!resolved.ok) {
    res.writeHead(resolved.status);
    res.end(resolved.status === 403 ? 'forbidden' : 'not found');
    return;
  }
  const filePath = resolved.filePath;

  let body: Buffer;
  try {
    body = await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    throw error;
  }

  const headers = await readSidecarHeaders(filePath);
  res.writeHead(200, {
    'content-type': headers?.contentType ?? 'application/octet-stream',
    ...(headers?.contentEncoding ? { 'content-encoding': headers.contentEncoding } : {}),
    ...(headers?.cacheControl ? { 'cache-control': headers.cacheControl } : {}),
    'content-length': String(body.length),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/**
 * Map a URL path to a file inside `root`. Returns 404 for a path with no object form (the
 * root itself, or a `.headers.json` sidecar — storage detail, not a servable object) and 403
 * for anything that would escape the tree.
 */
function resolveObjectPath(
  root: string,
  pathname: string
): { ok: true; filePath: string } | { ok: false; status: 403 | 404 } {
  const relative = pathname.replace(/^\/+/, '');
  if (relative === '' || relative.endsWith('.headers.json')) return { ok: false, status: 404 };
  const filePath = resolvePath(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, filePath };
}

async function readSidecarHeaders(filePath: string): Promise<StatFileHeaders | null> {
  try {
    return JSON.parse(await readFile(`${filePath}.headers.json`, 'utf8')) as StatFileHeaders;
  } catch {
    // A missing or corrupt sidecar still serves the bytes; it just loses the header replay.
    return null;
  }
}
