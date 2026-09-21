import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { manifestKey, playerGamesKey, playerSeasonsKey } from './layout';
import { createPublisher } from './publish';
import { createStatFileServer, type StatFileServerHandle } from './serve';
import { FileSystemStatFileTarget } from './targets';

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function request(port: number, path: string, method = 'GET'): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) })
      );
    });
    req.on('error', reject);
    req.end();
  });
}

let root: string;
let handle: StatFileServerHandle;
let port: number;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stat-files-serve-'));
  const target = new FileSystemStatFileTarget(root);
  const publisher = await createPublisher(target, { currentSeason: 2026 });
  await publisher.put(playerSeasonsKey('1'), { player: 'one' });
  await publisher.put(playerGamesKey('1', 2026), { season: 2026 });
  await publisher.put(playerGamesKey('1', 2015), { season: 2015 });
  await publisher.writeManifest({ generated_at: '2026-09-21T00:00:00.000Z', sources: {} });
  await publisher.flush();

  handle = createStatFileServer({ root });
  port = (await handle.listen(0, '127.0.0.1')).port;
});

afterAll(async () => {
  await handle.close();
  await rm(root, { recursive: true, force: true });
});

describe('stat-files local server', () => {
  it('serves a gzip object with its sidecar headers replayed', async () => {
    const reply = await request(port, `/${playerSeasonsKey('1')}`);
    expect(reply.status).toBe(200);
    expect(reply.headers['content-type']).toBe('application/json');
    expect(reply.headers['content-encoding']).toBe('gzip');
    expect(reply.headers['cache-control']).toBe('public, max-age=3600');
    expect(JSON.parse(gunzipSync(reply.body).toString('utf8'))).toEqual({ player: 'one' });
  });

  it('replays the per-class cache policy', async () => {
    expect((await request(port, `/${manifestKey()}`)).headers['cache-control']).toBe(
      'public, max-age=3600'
    );
    expect((await request(port, `/${playerGamesKey('1', 2015)}`)).headers['cache-control']).toBe(
      'public, max-age=604800'
    );
    expect((await request(port, `/${playerGamesKey('1', 2026)}`)).headers['cache-control']).toBe(
      'public, max-age=3600'
    );
  });

  it('answers HEAD with headers but no body', async () => {
    const reply = await request(port, `/${playerSeasonsKey('1')}`, 'HEAD');
    expect(reply.status).toBe(200);
    expect(reply.headers['content-encoding']).toBe('gzip');
    expect(reply.body.length).toBe(0);
  });

  it('404s a missing object and refuses path traversal', async () => {
    expect((await request(port, '/v1/players/999/seasons.json')).status).toBe(404);
    expect((await request(port, '/%2e%2e/%2e%2e/%2e%2e/etc/passwd')).status).not.toBe(200);
    expect((await request(port, `/${playerSeasonsKey('1')}.headers.json`)).status).toBe(404);
  });

  it('rejects non-GET methods', async () => {
    expect((await request(port, `/${playerSeasonsKey('1')}`, 'POST')).status).toBe(405);
  });

  it('400s a malformed percent-encoding instead of throwing', async () => {
    expect((await request(port, '/%')).status).toBe(400);
  });
});
