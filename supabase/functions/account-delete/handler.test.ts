// Contract tests for the runtime-neutral deletion handler. All privileged dependencies are
// fakes so these cases cannot mutate Auth while exercising authorization and failure mapping.
import { describe, expect, it } from 'vitest';
import { handleAccountDeletion, type AccountDeletionDependencies } from './handler';

function dependencies(
  overrides: Partial<AccountDeletionDependencies> = {}
): AccountDeletionDependencies {
  return {
    nowSeconds: () => 2_000_000_000,
    newCorrelationId: () => 'correlation-123',
    verifyJwt: async () => ({
      sub: '11111111-1111-4111-8111-111111111111',
      amr: [{ method: 'otp', timestamp: 1_999_999_900 }],
    }),
    deleteUser: async () => {},
    ...overrides,
  };
}

describe('handleAccountDeletion', () => {
  it('deletes the verified JWT subject after recent OTP authentication', async () => {
    const deletedUserIds: string[] = [];
    const response = await handleAccountDeletion(
      new Request('http://localhost/account-delete', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-user-jwt' },
      }),
      dependencies({ deleteUser: async (userId) => void deletedUserIds.push(userId) })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deletedUserIds).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('rejects a refreshed JWT when its OTP authentication is stale', async () => {
    const deletedUserIds: string[] = [];
    const response = await handleAccountDeletion(
      new Request('http://localhost/account-delete', {
        method: 'POST',
        headers: { authorization: 'Bearer freshly-refreshed-jwt' },
      }),
      dependencies({
        verifyJwt: async () => ({
          sub: '11111111-1111-4111-8111-111111111111',
          amr: [
            { method: 'otp', timestamp: 1_999_999_399 },
            { method: 'token_refresh', timestamp: 2_000_000_000 },
          ],
        }),
        deleteUser: async (userId) => void deletedUserIds.push(userId),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'reauthentication_required' });
    expect(deletedUserIds).toEqual([]);
  });

  it('returns a support-safe correlation ID and no false success when deletion fails', async () => {
    const response = await handleAccountDeletion(
      new Request('http://localhost/account-delete', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-user-jwt' },
      }),
      dependencies({ deleteUser: async () => Promise.reject(new Error('private database detail')) })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'delete_failed',
      correlationId: 'correlation-123',
    });
  });

  it('rejects a request without a bearer user JWT', async () => {
    const response = await handleAccountDeletion(
      new Request('http://localhost/account-delete', { method: 'POST' }),
      dependencies()
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });
});
