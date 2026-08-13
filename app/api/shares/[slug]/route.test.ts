import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';
import { getServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: vi.fn(),
}));

type QueryResult = { data: unknown; error: unknown };

function mockClient(boardResult: QueryResult, rowsResult: QueryResult) {
  const boardChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => boardResult),
      })),
    })),
  };
  const rowsChain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => rowsResult),
      })),
    })),
  };
  const client = {
    from: vi.fn((table: string) => (table === 'shared_boards' ? boardChain : rowsChain)),
  };
  vi.mocked(getServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof getServerClient>>
  );
  return client;
}

const get = (slug: string) =>
  GET(new Request('http://localhost'), { params: Promise.resolve({ slug }) });

beforeEach(() => vi.resetAllMocks());

describe('GET /api/shares/[slug]', () => {
  it('500s when the shared_boards query fails, not 404', async () => {
    mockClient({ data: null, error: { message: 'db down' } }, { data: [], error: null });
    const res = await get('abc123');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read failed' });
  });

  it('404s only for a genuinely missing slug', async () => {
    mockClient({ data: null, error: null }, { data: [], error: null });
    const res = await get('abc123');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('500s when the overrides query fails', async () => {
    mockClient(
      { data: { user_id: 'u1', team_id: 'seahawks', owner_name: 'cooper' }, error: null },
      { data: null, error: { message: 'db down' } }
    );
    const res = await get('abc123');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read failed' });
  });

  it('resolves the board with the owner override mapped by position', async () => {
    mockClient(
      { data: { user_id: 'u1', team_id: 'seahawks', owner_name: 'cooper' }, error: null },
      { data: [{ position: 'QB', player_ids: ['p1', 'p2'] }], error: null }
    );
    const res = await get('abc123');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      teamId: 'seahawks',
      ownerName: 'cooper',
      override: { QB: ['p1', 'p2'] },
    });
  });

  it('resolves with an empty override when the owner has no rows', async () => {
    mockClient(
      { data: { user_id: 'u1', team_id: 'seahawks', owner_name: 'cooper' }, error: null },
      { data: [], error: null }
    );
    const res = await get('abc123');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      teamId: 'seahawks',
      ownerName: 'cooper',
      override: {},
    });
  });
});
