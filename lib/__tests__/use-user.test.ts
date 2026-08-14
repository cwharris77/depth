import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

const getBrowserClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({
  getBrowserClient,
}));

const mockUser = (id: string) => ({ id }) as unknown as User;

type EmittedSession = { user: User | null } | null;
type AuthCallback = (event: string, session: EmittedSession) => void;

let emitAuth: AuthCallback;
let auth: {
  getUser: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.resetModules();
  emitAuth = () => {};
  auth = {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn((callback: AuthCallback) => {
      emitAuth = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
  getBrowserClient.mockReturnValue({ auth });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function loadStore() {
  return await import('@/lib/hooks/use-user');
}

describe('use-user auth store', () => {
  it('applies a successful getUser() read to the state', async () => {
    const user = mockUser('server');
    auth.getUser.mockResolvedValue({ data: { user } });
    const { subscribe, getSnapshot } = await loadStore();
    const listener = vi.fn();
    subscribe(listener);

    expect(getSnapshot()).toEqual({ user: null, loading: true });
    await flush();

    expect(getSnapshot()).toEqual({ user, loading: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resolves a failed getUser() read to the unauthenticated state instead of hanging', async () => {
    auth.getUser.mockRejectedValue(new Error('network'));
    const { subscribe, getSnapshot } = await loadStore();
    subscribe(() => {});

    expect(getSnapshot()).toEqual({ user: null, loading: true });
    await flush();

    expect(getSnapshot()).toEqual({ user: null, loading: false });
  });

  it('does not let a delayed getUser() resolve clobber a newer auth event', async () => {
    let resolveGetUser: ((value: { data: { user: User | null } }) => void) | undefined;
    auth.getUser.mockReturnValue(
      new Promise((resolve) => {
        resolveGetUser = resolve;
      })
    );
    const { subscribe, getSnapshot } = await loadStore();
    subscribe(() => {});

    emitAuth('SIGNED_IN', { user: mockUser('event') });
    expect(getSnapshot()).toEqual({ user: mockUser('event'), loading: false });

    resolveGetUser?.({ data: { user: mockUser('stale') } });
    await flush();

    expect(getSnapshot()).toEqual({ user: mockUser('event'), loading: false });
  });

  it('does not let a delayed getUser() failure wipe out a newer auth event', async () => {
    let rejectGetUser: ((reason: unknown) => void) | undefined;
    auth.getUser.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectGetUser = reject;
      })
    );
    const { subscribe, getSnapshot } = await loadStore();
    subscribe(() => {});

    emitAuth('SIGNED_IN', { user: mockUser('event') });
    expect(getSnapshot()).toEqual({ user: mockUser('event'), loading: false });

    rejectGetUser?.(new Error('network'));
    await flush();

    expect(getSnapshot()).toEqual({ user: mockUser('event'), loading: false });
  });
});
