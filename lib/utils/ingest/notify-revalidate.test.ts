import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyRevalidate } from './notify-revalidate';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.APP_URL = 'https://depth-ashen.vercel.app';
  process.env.INGEST_REVALIDATE_SECRET = 'the-secret';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('notifyRevalidate', () => {
  it('skips silently when APP_URL is unset (local run)', async () => {
    delete process.env.APP_URL;
    const fetchImpl = vi.fn();
    await notifyRevalidate(['ingest:espn'], { fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips silently when INGEST_REVALIDATE_SECRET is unset', async () => {
    delete process.env.INGEST_REVALIDATE_SECRET;
    const fetchImpl = vi.fn();
    await notifyRevalidate(['ingest:espn'], { fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs the tags with the bearer secret when both are set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await notifyRevalidate(['ingest:espn', 'ingest:nflverse'], { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://depth-ashen.vercel.app/api/ingest/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer the-secret' }),
        body: JSON.stringify({ tags: ['ingest:espn', 'ingest:nflverse'] }),
      })
    );
  });

  it('logs and never throws on a non-ok response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    await expect(notifyRevalidate(['ingest:espn'], { fetchImpl })).resolves.toBeUndefined();
  });

  it('logs and never throws when the request itself rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(notifyRevalidate(['ingest:espn'], { fetchImpl })).resolves.toBeUndefined();
  });
});
