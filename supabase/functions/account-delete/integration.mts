// Local-runtime contract test for the privileged adapter. It creates only random users
// and user-owned rows, derives test JWTs from real local Auth sessions, and proves both
// stale-OTP rejection and the Auth/database cascades after a fresh-OTP deletion.
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const apiUrl = required('API_URL');
const anonKey = required('ANON_KEY');
const serviceRoleKey = required('SERVICE_ROLE_KEY');
const jwtSecret = required('JWT_SECRET');
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(apiUrl, serviceRoleKey, clientOptions);
const authClient = createClient(apiUrl, anonKey, clientOptions);

type Fixture = {
  userId: string;
  accessToken: string;
};

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function signJwt(payload: Record<string, unknown>): string {
  const headerAndPayload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', jwtSecret).update(headerAndPayload).digest('base64url');
  return `${headerAndPayload}.${signature}`;
}

async function createFixture(): Promise<Fixture> {
  const email = `t7-delete-${randomUUID()}@example.com`;
  const password = `test-${randomUUID()}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const userId = created.user.id;
  try {
    const { data: signedIn, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    const writes = await Promise.all([
      admin.from('user_settings').insert({ user_id: userId }),
      admin.from('depth_overrides').insert({
        user_id: userId,
        team_id: 'bills',
        position: 'QB',
        player_ids: ['disposable-player'],
      }),
      admin.from('shared_boards').insert({
        slug: `t7-${randomUUID()}`,
        user_id: userId,
        team_id: 'bills',
        owner_name: 't7-test',
      }),
    ]);
    const writeError = writes.find(({ error }) => error)?.error;
    if (writeError) throw writeError;

    return { userId, accessToken: signedIn.session.access_token };
  } catch (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw error;
  }
}

function jwtWithAmr(fixture: Fixture, amr: unknown[]): string {
  const payload = JSON.parse(
    Buffer.from(fixture.accessToken.split('.')[1], 'base64url').toString('utf8')
  ) as Record<string, unknown>;
  return signJwt({ ...payload, amr });
}

async function invoke(jwt: string): Promise<Response> {
  return fetch(`${apiUrl}/functions/v1/account-delete`, {
    method: 'POST',
    headers: { authorization: `Bearer ${jwt}`, apikey: anonKey },
  });
}

async function ownedRowCounts(userId: string): Promise<Record<string, number | null>> {
  const counts: Record<string, number | null> = {};
  for (const table of ['user_settings', 'depth_overrides', 'shared_boards']) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    counts[table] = count;
  }
  return counts;
}

const fixtures: Fixture[] = [];
try {
  const now = Math.floor(Date.now() / 1_000);

  const stale = await createFixture();
  fixtures.push(stale);
  const staleResponse = await invoke(
    jwtWithAmr(stale, [
      { method: 'otp', timestamp: now - 600 },
      { method: 'token_refresh', timestamp: now },
    ])
  );
  assert.equal(staleResponse.status, 403, await staleResponse.text());
  assert.deepEqual(await ownedRowCounts(stale.userId), {
    user_settings: 1,
    depth_overrides: 1,
    shared_boards: 1,
  });

  const fresh = await createFixture();
  fixtures.push(fresh);
  const freshResponse = await invoke(
    jwtWithAmr(fresh, [{ method: 'otp', timestamp: Math.floor(Date.now() / 1_000) }])
  );
  assert.equal(freshResponse.status, 200, await freshResponse.text());

  const { data: deletedUser, error: deletedUserError } = await admin.auth.admin.getUserById(
    fresh.userId
  );
  assert.ok(deletedUserError || !deletedUser.user, 'auth user still exists after deletion');
  const cascadeCounts = await ownedRowCounts(fresh.userId);
  assert.deepEqual(cascadeCounts, {
    user_settings: 0,
    depth_overrides: 0,
    shared_boards: 0,
  });

  console.log(
    JSON.stringify({ staleStatus: staleResponse.status, freshStatus: freshResponse.status, cascadeCounts })
  );
} finally {
  await Promise.all(fixtures.map(({ userId }) => admin.auth.admin.deleteUser(userId).catch(() => {})));
}
