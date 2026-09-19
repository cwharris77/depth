import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { playerSeasonsKey, publishIndexKey } from './layout';
import { createPublisher } from './publisher';
import { FileSystemStatFileTarget } from './targets';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'stat-files-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function storedBody(target: FileSystemStatFileTarget, key: string): Promise<string> {
  const raw = await target.get(key);
  if (!raw) throw new Error(`expected a stored object at ${key}`);
  return gunzipSync(Buffer.from(raw)).toString('utf8');
}

describe('filesystem target', () => {
  it('writes gzip bytes plus a headers sidecar', async () => {
    const target = new FileSystemStatFileTarget(root);
    const publisher = await createPublisher(target, { currentSeason: 2026 });
    await publisher.put(playerSeasonsKey('1'), { hello: 'world' });
    await publisher.flush();

    expect(await storedBody(target, playerSeasonsKey('1'))).toBe('{\n  "hello": "world"\n}\n');

    const headers = await target.headersFor(playerSeasonsKey('1'));
    expect(headers).toEqual({
      contentType: 'application/json',
      contentEncoding: 'gzip',
      cacheControl: 'public, max-age=3600',
    });
    expect(await target.get('v1/players/missing/seasons.json')).toBeNull();
  });
});

describe('publisher change detection', () => {
  it('skips an unchanged body on the next publish', async () => {
    const target = new FileSystemStatFileTarget(root);
    const first = await createPublisher(target, { currentSeason: 2026 });
    await first.put(playerSeasonsKey('1'), { season: 2025 });
    await first.flush();
    expect(first.uploaded).toBe(1);
    expect(first.skipped).toBe(0);

    const second = await createPublisher(target, { currentSeason: 2026 });
    await second.put(playerSeasonsKey('1'), { season: 2025 });
    await second.flush();
    expect(second.uploaded).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it('uploads a changed body', async () => {
    const target = new FileSystemStatFileTarget(root);
    const first = await createPublisher(target, { currentSeason: 2026 });
    await first.put(playerSeasonsKey('1'), { season: 2025 });
    await first.flush();

    const second = await createPublisher(target, { currentSeason: 2026 });
    await second.put(playerSeasonsKey('1'), { season: 2025, touchdowns: 1 });
    await second.flush();
    expect(second.uploaded).toBe(1);

    expect(JSON.parse(await storedBody(target, playerSeasonsKey('1')))).toEqual({
      season: 2025,
      touchdowns: 1,
    });
  });

  it('persists the publish index across publisher instances without recording itself', async () => {
    const target = new FileSystemStatFileTarget(root);
    const first = await createPublisher(target, { currentSeason: 2026 });
    await first.put(playerSeasonsKey('1'), { a: 1 });
    await first.flush();

    const index = JSON.parse(await storedBody(target, publishIndexKey())) as {
      objects: Record<string, string>;
    };
    expect(index.objects[playerSeasonsKey('1')]).toMatch(/^[0-9a-f]{64}$/);
    expect(index.objects[publishIndexKey()]).toBeUndefined();
  });

  it('degrades a corrupt index to an empty one instead of throwing', async () => {
    const target = new FileSystemStatFileTarget(root);
    await target.put(publishIndexKey(), Buffer.from('not gzip'), {
      contentType: 'application/json',
      contentEncoding: 'gzip',
      cacheControl: 'no-store',
    });
    const publisher = await createPublisher(target, { currentSeason: 2026 });
    await publisher.put(playerSeasonsKey('1'), { a: 1 });
    expect(publisher.uploaded).toBe(1);
  });
});

describe('deterministic output', () => {
  it('produces byte-identical uncompressed JSON across two publishers', async () => {
    const first = new FileSystemStatFileTarget(join(root, 'a'));
    const second = new FileSystemStatFileTarget(join(root, 'b'));
    for (const target of [first, second]) {
      const publisher = await createPublisher(target, { currentSeason: 2026 });
      await publisher.put(playerSeasonsKey('2'), { z: 1, a: [1, 2, 3] });
      await publisher.flush();
    }
    expect(await storedBody(first, playerSeasonsKey('2'))).toBe(
      await storedBody(second, playerSeasonsKey('2'))
    );
  });
});

describe('sidecar headers are written on disk', () => {
  it('stores a readable JSON sidecar', async () => {
    const target = new FileSystemStatFileTarget(root);
    const publisher = await createPublisher(target, { currentSeason: 2026 });
    await publisher.put(playerSeasonsKey('3'), { a: 1 });
    const sidecar = JSON.parse(
      await readFile(join(root, 'v1', 'players', '3', 'seasons.json.headers.json'), 'utf8')
    );
    expect(sidecar.cacheControl).toBe('public, max-age=3600');
    expect(sidecar.contentEncoding).toBe('gzip');
  });
});
