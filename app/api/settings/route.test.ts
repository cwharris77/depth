import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './route';
import { getServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: vi.fn(),
}));

type QueryResult = { data: unknown; error: unknown };

interface Chain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
}

function makeChain(result: QueryResult): Chain {
  const chain: Chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn(async () => result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function mockClient(result: QueryResult, userId: string | null = 'u1') {
  const chain = makeChain(result);
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null }, error: null })),
    },
    from: vi.fn(() => chain),
  };
  vi.mocked(getServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof getServerClient>>
  );
  return { client, chain };
}

const EMPTY_SETTINGS = { favoriteTeamId: null, lastTeamId: null, startOnFavorite: true };

const put = (body: unknown) =>
  PUT(
    new NextRequest('http://localhost/api/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  );

beforeEach(() => vi.resetAllMocks());

describe('GET /api/settings', () => {
  it('401s when signed out', async () => {
    mockClient({ data: null, error: null }, null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('500s on a read error instead of returning EMPTY defaults', async () => {
    mockClient({ data: null, error: { message: 'db down' } });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read failed' });
  });

  it('returns EMPTY defaults when there is no row', async () => {
    mockClient({ data: null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(EMPTY_SETTINGS);
  });

  it('returns the stored row when present', async () => {
    mockClient({
      data: { favorite_team_id: 'seahawks', last_team_id: null, start_on_favorite: false },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      favoriteTeamId: 'seahawks',
      lastTeamId: null,
      startOnFavorite: false,
    });
  });
});

describe('PUT /api/settings', () => {
  it('401s when signed out', async () => {
    mockClient({ data: null, error: null }, null);
    const res = await put({ startOnFavorite: true });
    expect(res.status).toBe(401);
  });

  it('400s on invalid JSON', async () => {
    mockClient({ data: null, error: null });
    const res = await PUT(
      new NextRequest('http://localhost/api/settings', { method: 'PUT', body: 'not json' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects a non-boolean startOnFavorite without writing', async () => {
    const { chain } = mockClient({ data: null, error: null });
    const res = await put({ startOnFavorite: 'yes' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad request' });
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it('rejects a non-string favoriteTeamId', async () => {
    const { chain } = mockClient({ data: null, error: null });
    const res = await put({ favoriteTeamId: 42 });
    expect(res.status).toBe(400);
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it('rejects a non-string lastTeamId', async () => {
    mockClient({ data: null, error: null });
    const res = await put({ lastTeamId: ['seahawks'] });
    expect(res.status).toBe(400);
  });

  it('accepts null favoriteTeamId (clears the favorite)', async () => {
    const { chain } = mockClient({ data: null, error: null });
    const res = await put({ favoriteTeamId: null });
    expect(res.status).toBe(200);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ favorite_team_id: null }),
      expect.anything()
    );
  });

  it('writes a boolean startOnFavorite as-is', async () => {
    const { chain } = mockClient({ data: null, error: null });
    const res = await put({ startOnFavorite: false });
    expect(res.status).toBe(200);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ start_on_favorite: false }),
      expect.anything()
    );
  });

  it('500s when the upsert fails', async () => {
    const { chain } = mockClient({ data: null, error: null });
    chain.upsert.mockResolvedValue({ data: null, error: { message: 'db down' } });
    const res = await put({ lastTeamId: 'seahawks' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'write failed' });
  });
});
