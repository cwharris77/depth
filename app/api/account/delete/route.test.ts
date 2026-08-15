import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { getServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: vi.fn(),
}));
vi.mock('@/lib/utils/env', () => ({
  getSupabaseUrl: () => 'https://example.supabase.co',
  getSupabaseAnonKey: () => 'publishable-key',
}));

function mockSession(accessToken: string | null) {
  vi.mocked(getServerClient).mockResolvedValue({
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      })),
    },
  } as unknown as Awaited<ReturnType<typeof getServerClient>>);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('POST /api/account/delete', () => {
  it('401s when signed out', async () => {
    mockSession(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('500s with JSON when session lookup throws, not an unhandled error', async () => {
    vi.mocked(getServerClient).mockRejectedValue(new Error('network error'));
    const res = await POST();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'delete failed' });
  });

  it('forwards a fresh-OTP denial and correlation-safe response from the function', async () => {
    mockSession('user-jwt');
    const request = vi.fn(async () =>
      Response.json({ error: 'fresh_otp_required' }, { status: 403 })
    );
    vi.stubGlobal('fetch', request);
    const res = await POST();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'fresh_otp_required' });
    expect(request).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/account-delete',
      expect.objectContaining({
        method: 'POST',
        headers: {
          apikey: 'publishable-key',
          authorization: 'Bearer user-jwt',
        },
      })
    );
  });

  it('200s only when the fresh-OTP function confirms deletion', async () => {
    mockSession('fresh-user-jwt');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true }))
    );
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
