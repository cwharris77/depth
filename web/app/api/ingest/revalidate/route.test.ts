import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getIngestRevalidateSecret } from '@/lib/utils/env';

vi.mock('@/lib/utils/env', () => ({
  getIngestRevalidateSecret: vi.fn(),
}));

const revalidateTagMock = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({
  revalidateTag: revalidateTagMock,
}));

const post = (body: unknown, auth?: string) =>
  POST(
    new NextRequest('http://localhost/api/ingest/revalidate', {
      method: 'POST',
      headers: auth ? { authorization: auth } : undefined,
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getIngestRevalidateSecret).mockReturnValue('the-real-secret');
});

describe('POST /api/ingest/revalidate', () => {
  it('401s with no authorization header', async () => {
    const res = await post({ tags: ['ingest:espn'] });
    expect(res.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('401s with the wrong secret', async () => {
    const res = await post({ tags: ['ingest:espn'] }, 'Bearer wrong-secret');
    expect(res.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/ingest/revalidate', {
        method: 'POST',
        headers: { authorization: 'Bearer the-real-secret' },
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('400s when tags is missing', async () => {
    const res = await post({}, 'Bearer the-real-secret');
    expect(res.status).toBe(400);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('400s when tags is an empty array', async () => {
    const res = await post({ tags: [] }, 'Bearer the-real-secret');
    expect(res.status).toBe(400);
  });

  it('400s when tags contains a non-string', async () => {
    const res = await post({ tags: ['ingest:espn', 42] }, 'Bearer the-real-secret');
    expect(res.status).toBe(400);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it('revalidates every tag and 200s with the valid secret', async () => {
    const res = await post({ tags: ['ingest:espn', 'ingest:nflverse'] }, 'Bearer the-real-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ['ingest:espn', 'ingest:nflverse'] });
    expect(revalidateTagMock).toHaveBeenCalledWith('ingest:espn', 'ingest');
    expect(revalidateTagMock).toHaveBeenCalledWith('ingest:nflverse', 'ingest');
    expect(revalidateTagMock).toHaveBeenCalledTimes(2);
  });
});
