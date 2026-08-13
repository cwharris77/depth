import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { getServerClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(),
}));

function mockSignedIn() {
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    },
  };
  vi.mocked(getServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof getServerClient>>
  );
  return client;
}

function mockAdminClient(deleteUser: ReturnType<typeof vi.fn>) {
  const client = { auth: { admin: { deleteUser } } };
  vi.mocked(getAdminClient).mockReturnValue(client as unknown as ReturnType<typeof getAdminClient>);
  return client;
}

beforeEach(() => vi.resetAllMocks());

describe('POST /api/account/delete', () => {
  it('401s when signed out', async () => {
    const client = {
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
    };
    vi.mocked(getServerClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof getServerClient>>
    );
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('500s with JSON when getUser() itself throws, not an unhandled error', async () => {
    const client = {
      auth: {
        getUser: vi.fn(async () => {
          throw new Error('network error');
        }),
      },
    };
    vi.mocked(getServerClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof getServerClient>>
    );
    const res = await POST();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read failed' });
  });

  it('500s with JSON when the secret-key env is missing instead of throwing', async () => {
    mockSignedIn();
    vi.mocked(getAdminClient).mockImplementation(() => {
      throw new Error('Missing required environment variable: SUPABASE_SECRET_KEY');
    });
    const res = await POST();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'delete failed' });
  });

  it('500s when the admin client reports a delete error', async () => {
    mockSignedIn();
    mockAdminClient(vi.fn(async () => ({ error: { message: 'user not found' } })));
    const res = await POST();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'delete failed' });
  });

  it('200s when the deletion succeeds', async () => {
    mockSignedIn();
    const admin = mockAdminClient(vi.fn(async () => ({ error: null })));
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('u1');
  });
});
