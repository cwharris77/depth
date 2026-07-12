# Implicit-Flow Magic Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix magic-link sign-in requiring the same browser/app it was requested from, without touching prod email templates (no custom SMTP, no domain purchase).

**Architecture:** Switch the sign-in request from Supabase's forced PKCE flow (via `@supabase/ssr`'s `createBrowserClient`, which cannot be overridden) to implicit flow, using a bare `@supabase/supabase-js` client for the `signInWithOtp` call only. GoTrue's implicit-flow completion redirects with session tokens in the URL **fragment** (`#access_token=...`), which never reaches the server — so `/auth/confirm` becomes a client component page that parses the fragment and POSTs the tokens to a new API route, which persists them as httpOnly session cookies via the existing server Supabase client. A full-page navigation to `next` afterward lets server components (which read auth from cookies) see the fresh session.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` (server client, cookie adapter), `@supabase/supabase-js` (bare client for the implicit-flow request), Vitest.

## Global Constraints

- No new dependencies — `@supabase/supabase-js` is already a direct dependency (used in `lib/supabase/admin.ts`).
- Prettier: single quotes, 100 char width, es5 trailing commas, bracket-same-line. Run `npm run format` before every commit.
- Conventional Commits, scope `auth`.
- Every new/changed module gets a role-and-constraint header comment (house style — state the WHY, not the WHAT).
- Pure logic lives in `lib/` with colocated tests in `lib/__tests__/`. Route handlers and page/client components stay thin and are **not** unit-tested — matches this repo's existing convention (zero route-handler tests exist today); their correctness is verified live in the final task.
- The `?next=` return path must stay validated as same-origin-only (never an open redirect) — this plan centralizes that check into one tested function instead of the two duplicated inline copies that exist today.
- This is the first time raw auth tokens flow through client JS to a cookie-sync endpoint in this app — a new trust-surface pattern, called out explicitly in Task 6 for review. The tokens themselves are already-issued, GoTrue-signed JWTs (verified server-side by `setSession`); nothing here trusts unverified client input beyond string-shape checks.
- Verify live in the browser before claiming done — this whole fix is unverifiable by unit tests alone (see Task 8).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/auth-redirect.ts` (new) | `safeNext()` — validates `?next=` against open redirects. Replaces two duplicated inline copies. |
| `lib/auth-hash.ts` (new) | `parseAuthHash()` — pure parser for the URL fragment GoTrue's implicit-flow redirect carries tokens/errors in. |
| `lib/auth-session-payload.ts` (new) | `parseSetSessionBody()` — validates the untrusted POST body to the new set-session route. |
| `lib/supabase/client.ts` (modify) | Add `signInWithOtpImplicit()` — a one-off bare `supabase-js` client used only to fire the sign-in request with `flowType: 'implicit'`. |
| `app/api/auth/set-session/route.ts` (new) | POST route: takes `{accessToken, refreshToken}`, calls `getServerClient().auth.setSession()` to persist httpOnly cookies. |
| `app/auth/confirm/route.ts` (delete) | Old PKCE-code/token_hash server route handler — replaced by the page below. |
| `app/auth/confirm/page.tsx` (new) | Thin server wrapper (mirrors `app/signin/page.tsx`): validates `next` server-side, renders the client component. |
| `components/AuthConfirm.tsx` (new) | Client component: parses `window.location.hash`, POSTs tokens to set-session, navigates to `next`; degrades to `/signin?auth_error=1` on anything invalid. |
| `app/signin/page.tsx` (modify) | Import `safeNext` from `lib/auth-redirect` instead of its local copy. |
| `components/AccountView.tsx` (modify) | `sendLink()` uses `signInWithOtpImplicit` instead of the PKCE-forced `getBrowserClient()`; "check your email" copy drops the now-inaccurate "on this device" constraint. |

---

### Task 1: Extract `safeNext` into a shared, tested module

**Files:**
- Create: `lib/auth-redirect.ts`
- Test: `lib/__tests__/auth-redirect.test.ts`
- Modify: `app/signin/page.tsx:13-17` (remove local `safeNext`, import the shared one)

**Interfaces:**
- Produces: `safeNext(raw: string | string[] | undefined): string` — used by Task 6's `app/auth/confirm/page.tsx` and by `app/signin/page.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/auth-redirect.test.ts
import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/auth-redirect';

describe('safeNext', () => {
  it('returns a valid relative path unchanged', () => {
    expect(safeNext('/team/seahawks')).toBe('/team/seahawks');
  });

  it('falls back to home for undefined', () => {
    expect(safeNext(undefined)).toBe('/');
  });

  it('falls back to home for an array (repeated query param)', () => {
    expect(safeNext(['/a', '/b'])).toBe('/');
  });

  it('rejects a protocol-relative URL (open-redirect risk)', () => {
    expect(safeNext('//evil.com')).toBe('/');
  });

  it('rejects an absolute URL', () => {
    expect(safeNext('https://evil.com')).toBe('/');
  });

  it('rejects an empty string', () => {
    expect(safeNext('')).toBe('/');
  });

  it('rejects a path with no leading slash', () => {
    expect(safeNext('team/seahawks')).toBe('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/auth-redirect.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth-redirect'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/auth-redirect.ts
// Validates a `?next=` return-path param so it can't become an open redirect. Only same-origin
// relative paths are honored — a protocol-relative (`//host`) or absolute URL falls back to
// home. Shared by /signin (back arrow, land-here-after-sign-in) and the magic-link confirm page
// — both need the identical safety check, previously duplicated inline in each.
export function safeNext(raw: string | string[] | undefined): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/auth-redirect.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Wire `app/signin/page.tsx` to the shared function**

Replace lines 13-17 (the local `safeNext` definition) with an import, and delete the now-redundant local copy:

```typescript
// app/signin/page.tsx — top of file, alongside the other imports
import { safeNext } from '@/lib/auth-redirect';
```

Remove this block entirely (previously lines 13-17):

```typescript
// Only same-origin relative paths are honored — never a protocol-relative (`//host`) or absolute
// URL — so the ?next= return target can't be turned into an open redirect. Falls back to home.
function safeNext(raw: string | string[] | undefined): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All tests pass, no type errors.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add lib/auth-redirect.ts lib/__tests__/auth-redirect.test.ts app/signin/page.tsx
git commit -m "refactor(auth): extract safeNext into a shared, tested module"
```

---

### Task 2: `parseAuthHash` — pure parser for the implicit-flow URL fragment

**Files:**
- Create: `lib/auth-hash.ts`
- Test: `lib/__tests__/auth-hash.test.ts`

**Interfaces:**
- Produces: `AuthHashResult` type and `parseAuthHash(hash: string): AuthHashResult`, consumed by Task 6's `components/AuthConfirm.tsx`.
  ```typescript
  type AuthHashResult =
    | { status: 'tokens'; accessToken: string; refreshToken: string }
    | { status: 'error'; message: string }
    | { status: 'none' };
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/auth-hash.test.ts
import { describe, expect, it } from 'vitest';
import { parseAuthHash } from '@/lib/auth-hash';

describe('parseAuthHash', () => {
  it('extracts access_token and refresh_token from a valid fragment', () => {
    const hash = '#access_token=abc123&refresh_token=def456&expires_in=3600&token_type=bearer';
    expect(parseAuthHash(hash)).toEqual({
      status: 'tokens',
      accessToken: 'abc123',
      refreshToken: 'def456',
    });
  });

  it('works without the leading #', () => {
    const hash = 'access_token=abc123&refresh_token=def456';
    expect(parseAuthHash(hash)).toEqual({
      status: 'tokens',
      accessToken: 'abc123',
      refreshToken: 'def456',
    });
  });

  it('extracts an error message from an error fragment', () => {
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid';
    expect(parseAuthHash(hash)).toEqual({
      status: 'error',
      message: 'Email link is invalid',
    });
  });

  it('returns none for an empty fragment', () => {
    expect(parseAuthHash('')).toEqual({ status: 'none' });
  });

  it('returns none for a bare #', () => {
    expect(parseAuthHash('#')).toEqual({ status: 'none' });
  });

  it('returns none when only access_token is present (defensive — should not happen)', () => {
    expect(parseAuthHash('#access_token=abc123')).toEqual({ status: 'none' });
  });

  it('returns none for unrelated query-shaped garbage', () => {
    expect(parseAuthHash('#foo=bar&baz=qux')).toEqual({ status: 'none' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/auth-hash.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth-hash'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/auth-hash.ts
// Parses the URL fragment GoTrue's implicit-flow magic-link redirect carries session tokens in
// (`#access_token=...&refresh_token=...`) or an error in (`#error=...&error_description=...`).
// Fragments never reach the server, so this can only ever run client-side, fed
// `window.location.hash` from components/AuthConfirm.tsx — see lib/supabase/client.ts's
// signInWithOtpImplicit for why implicit flow (not PKCE) is used for the sign-in request.
export type AuthHashResult =
  | { status: 'tokens'; accessToken: string; refreshToken: string }
  | { status: 'error'; message: string }
  | { status: 'none' };

export function parseAuthHash(hash: string): AuthHashResult {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const errorDescription = params.get('error_description');
  if (errorDescription) return { status: 'error', message: errorDescription };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { status: 'tokens', accessToken, refreshToken };

  return { status: 'none' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/auth-hash.test.ts`
Expected: PASS (7 tests). Note: `URLSearchParams` decodes `+` as a space per the
`application/x-www-form-urlencoded` spec, so `error_description=Email+link+is+invalid` parses to
`"Email link is invalid"` with no extra decoding step needed.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/auth-hash.ts lib/__tests__/auth-hash.test.ts
git commit -m "feat(auth): add parseAuthHash for the implicit-flow URL fragment"
```

---

### Task 3: `parseSetSessionBody` — validate the untrusted set-session POST body

**Files:**
- Create: `lib/auth-session-payload.ts`
- Test: `lib/__tests__/auth-session-payload.test.ts`

**Interfaces:**
- Produces: `SetSessionPayload` type and `parseSetSessionBody(body: unknown): SetSessionPayload | null`, consumed by Task 4's `app/api/auth/set-session/route.ts`.
  ```typescript
  type SetSessionPayload = { accessToken: string; refreshToken: string };
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/auth-session-payload.test.ts
import { describe, expect, it } from 'vitest';
import { parseSetSessionBody } from '@/lib/auth-session-payload';

describe('parseSetSessionBody', () => {
  it('parses a valid payload', () => {
    expect(parseSetSessionBody({ accessToken: 'abc', refreshToken: 'def' })).toEqual({
      accessToken: 'abc',
      refreshToken: 'def',
    });
  });

  it('rejects a missing accessToken', () => {
    expect(parseSetSessionBody({ refreshToken: 'def' })).toBeNull();
  });

  it('rejects a missing refreshToken', () => {
    expect(parseSetSessionBody({ accessToken: 'abc' })).toBeNull();
  });

  it('rejects non-string fields', () => {
    expect(parseSetSessionBody({ accessToken: 1, refreshToken: 'def' })).toBeNull();
  });

  it('rejects empty-string fields', () => {
    expect(parseSetSessionBody({ accessToken: '', refreshToken: 'def' })).toBeNull();
  });

  it('rejects null', () => {
    expect(parseSetSessionBody(null)).toBeNull();
  });

  it('rejects an array', () => {
    expect(parseSetSessionBody(['abc', 'def'])).toBeNull();
  });

  it('rejects a plain string', () => {
    expect(parseSetSessionBody('not an object')).toBeNull();
  });

  it('rejects undefined', () => {
    expect(parseSetSessionBody(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/auth-session-payload.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth-session-payload'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/auth-session-payload.ts
// Validates the POST body to /api/auth/set-session. Untrusted client input — degrades to null on
// anything malformed rather than throwing (AGENTS.md invariant 6), so the route can respond 400
// instead of 500. Note: arrays pass `typeof x === 'object'`, so they're excluded explicitly.
export type SetSessionPayload = { accessToken: string; refreshToken: string };

export function parseSetSessionBody(body: unknown): SetSessionPayload | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const { accessToken, refreshToken } = body as Record<string, unknown>;
  if (typeof accessToken !== 'string' || !accessToken) return null;
  if (typeof refreshToken !== 'string' || !refreshToken) return null;
  return { accessToken, refreshToken };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/auth-session-payload.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add lib/auth-session-payload.ts lib/__tests__/auth-session-payload.test.ts
git commit -m "feat(auth): add parseSetSessionBody validator for the set-session route"
```

---

### Task 4: `/api/auth/set-session` route — persist implicit-flow tokens as cookies

**Files:**
- Create: `app/api/auth/set-session/route.ts`

**Interfaces:**
- Consumes: `parseSetSessionBody` from Task 3 (`lib/auth-session-payload.ts`), `getServerClient` from `lib/supabase/server.ts` (existing, unmodified).
- Produces: `POST /api/auth/set-session` — `200 {ok: true}` on success, `400 {error: string}` on any invalid/rejected input. Consumed by Task 6's `components/AuthConfirm.tsx`.

No unit test for this file — matches this repo's existing convention (zero route-handler tests
exist; `app/api/account/delete/route.ts`, `app/api/overrides/route.ts`, etc. are all untested).
Its only branching logic is `parseSetSessionBody`, already tested in Task 3. Correctness is
verified live in Task 8.

- [ ] **Step 1: Write the route handler**

```typescript
// app/api/auth/set-session/route.ts
// Syncs an implicit-flow session into httpOnly cookies. components/AuthConfirm.tsx parses
// access_token/refresh_token out of the magic-link redirect's URL fragment client-side (fragments
// never reach the server) and POSTs them here once. setSession() re-issues them as the standard
// Supabase session cookies via getServerClient()'s cookie adapter, so server components can read
// the session on the next page load. The tokens are already-issued, GoTrue-signed JWTs — this
// route only checks their shape (parseSetSessionBody), not their validity; setSession() itself
// rejects a forged or expired token.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { parseSetSessionBody } from '@/lib/auth-session-payload';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = parseSetSessionBody(body);
  if (!payload) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

  const supabase = await getServerClient();
  const { error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  });
  if (error) return NextResponse.json({ error: 'invalid session' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Format and commit**

```bash
npm run format
git add app/api/auth/set-session/route.ts
git commit -m "feat(auth): add /api/auth/set-session route to persist implicit-flow tokens"
```

---

### Task 5: `signInWithOtpImplicit` — fire the sign-in request outside forced PKCE

**Files:**
- Modify: `lib/supabase/client.ts`

**Interfaces:**
- Produces: `signInWithOtpImplicit(email: string, emailRedirectTo: string): Promise<{error: AuthError | null}>` (return type matches `supabase-js`'s `signInWithOtp` result), consumed by Task 7's `components/AccountView.tsx`.

No unit test — this is a thin wrapper around a third-party SDK call with no branching logic of
its own to test; its correctness (that it actually produces a non-PKCE token) was already
verified via curl against local Supabase in the investigation that produced this plan, and is
re-verified end-to-end in Task 8.

- [ ] **Step 1: Add the implicit-flow client helper**

Read the current file first — it's small, shown here in full context. Add the import and new
export; leave the existing `getBrowserClient` untouched (it stays PKCE — still used for
`useUser()`, sign-out, and delete-account, none of which involve the magic-link redirect):

```typescript
// lib/supabase/client.ts
// Browser Supabase client for auth (Phase C, auth pass 1). The app's data reads still go
// through dbRosterSource with the server-side anon key; this client exists only so the
// browser can run the magic-link sign-in flow and observe auth state. Singleton — one
// client per tab keeps a single auth/session listener and cookie writer.
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// @supabase/ssr's createBrowserClient hard-codes flowType: 'pkce' (splats it after spreading
// caller-supplied auth options in createBrowserClient.js — there is no supported override; a
// Supabase maintainer confirmed this is intentional in supabase/ssr#175, recommending exactly
// this workaround). PKCE requires the emailed magic link to be opened in the same browser that
// requested it (a code_verifier cookie set at request time), which breaks when the link opens in
// a different app/browser than the one signed in from. Routing the OTP request through a bare
// @supabase/supabase-js client with flowType: 'implicit' avoids that — GoTrue then redirects with
// session tokens in the URL fragment instead of a PKCE code, parsed client-side by
// components/AuthConfirm.tsx (see lib/auth-hash.ts). This one-off client only ever sends the
// request — it never persists a session, so it needs none of the SSR client's cookie wiring.
export function signInWithOtpImplicit(email: string, emailRedirectTo: string) {
  const otpClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
  return otpClient.auth.signInWithOtp({ email, options: { emailRedirectTo } });
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Format and commit**

```bash
npm run format
git add lib/supabase/client.ts
git commit -m "feat(auth): add signInWithOtpImplicit to route around forced PKCE"
```

---

### Task 6: Rebuild `/auth/confirm` as a client-side fragment-parsing page

**Files:**
- Delete: `app/auth/confirm/route.ts`
- Create: `app/auth/confirm/page.tsx`
- Create: `components/AuthConfirm.tsx`

**Interfaces:**
- Consumes: `safeNext` (Task 1, `lib/auth-redirect.ts`), `parseAuthHash` (Task 2, `lib/auth-hash.ts`), `POST /api/auth/set-session` (Task 4).
- Produces: the `/auth/confirm` route, now a page instead of a route handler. Same external contract as before (redirects to `next` on success, to `/signin?auth_error=1&next=...` on failure) — nothing outside this task's files needs to change to match it.

This is the security-sensitive core of the plan: raw session tokens flow through client JS for
the first time in this app. Read both new files fully before moving to Task 7.

- [ ] **Step 1: Delete the old route handler**

```bash
rm app/auth/confirm/route.ts
```

(There is no test file for it to remove — confirmed no route-handler tests exist in this repo.)

- [ ] **Step 2: Write the client component**

```typescript
// components/AuthConfirm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { parseAuthHash } from '@/lib/auth-hash';

// Client-side landing for the implicit-flow magic link (Phase C, auth pass 2). GoTrue completes
// verification at its own /verify endpoint and redirects here with session tokens in the URL
// FRAGMENT (`#access_token=...`) — fragments never reach the server, so this can only run
// client-side (see lib/auth-hash.ts and lib/supabase/client.ts's signInWithOtpImplicit for why).
// Posts the tokens to /api/auth/set-session to persist them as httpOnly cookies, then does a
// full navigation to `next` so server components see the fresh session. Untrusted input degrades,
// never throws (AGENTS.md invariant 6): a missing/expired/malformed fragment redirects to
// /signin?auth_error=1, same external behavior as the old PKCE-code route handler had.
export default function AuthConfirm({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // React 18 Strict Mode double-invokes effects in dev; guard against firing the POST twice.
    if (hasRun.current) return;
    hasRun.current = true;

    const toSignInError = () => {
      setFailed(true);
      window.location.replace(`/signin?auth_error=1&next=${encodeURIComponent(next)}`);
    };

    const result = parseAuthHash(window.location.hash);
    if (result.status !== 'tokens') {
      toSignInError();
      return;
    }

    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    }).then((res) => {
      if (res.ok) {
        window.location.assign(next);
      } else {
        toSignInError();
      }
    });
  }, [next]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm" style={{ color: '#A5ACAF' }}>
        {failed ? 'That sign-in link expired — redirecting…' : 'Signing you in…'}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Write the server-wrapper page**

```typescript
// app/auth/confirm/page.tsx
import type { Metadata } from 'next';
import AuthConfirm from '@/components/AuthConfirm';
import { safeNext } from '@/lib/auth-redirect';

export const metadata: Metadata = {
  title: 'Signing in · Depth',
};

// Server wrapper for the magic-link landing (Phase C, auth pass 2). No server data to fetch —
// session tokens arrive in the URL fragment, which only the client can read (see
// components/AuthConfirm.tsx) — so this just validates `next` server-side (same safeNext check
// as /signin) and hands off.
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  return <AuthConfirm next={next} />;
}
```

- [ ] **Step 4: Run typecheck and the full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No type errors, all tests pass (the new pure-function tests from Tasks 1-3, unchanged
otherwise).

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add app/auth/confirm/page.tsx components/AuthConfirm.tsx
git rm app/auth/confirm/route.ts
git commit -m "feat(auth): rebuild /auth/confirm as a client-side fragment-parsing page"
```

---

### Task 7: Wire `AccountView` to the implicit-flow sign-in

**Files:**
- Modify: `components/AccountView.tsx`

**Interfaces:**
- Consumes: `signInWithOtpImplicit` from Task 5 (`lib/supabase/client.ts`).

- [ ] **Step 1: Swap the sign-in call in `sendLink`**

Change the import (line 6) from:

```typescript
import { getBrowserClient } from '@/lib/supabase/client';
```

to:

```typescript
import { getBrowserClient, signInWithOtpImplicit } from '@/lib/supabase/client';
```

Replace the body of `sendLink` (currently lines 51-64):

```typescript
  const sendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSendState('sending');
    setLinkExpired(false);
    const { error } = await getBrowserClient().auth.signInWithOtp({
      email: trimmed,
      options: {
        // Land back on the page the user came from (threaded via ?next=), not the sign-in page.
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setSendState(error ? 'error' : 'sent');
  };
```

with:

```typescript
  const sendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSendState('sending');
    setLinkExpired(false);
    // Land back on the page the user came from (threaded via ?next=), not the sign-in page.
    const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { error } = await signInWithOtpImplicit(trimmed, emailRedirectTo);
    setSendState(error ? 'error' : 'sent');
  };
```

- [ ] **Step 2: Drop the now-inaccurate "on this device" copy**

The whole point of this fix is that the link no longer requires the same browser/app. Update the
"sent" screen (currently lines 309-321):

```typescript
  if (sendState === 'sent') {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
          Check your email
        </div>
        <p className="text-sm" style={{ color: '#A5ACAF' }}>
          We sent a sign-in link to <span style={{ color: '#f0f4ff' }}>{email.trim()}</span>. Open
          it on this device to finish signing in.
        </p>
      </div>
    );
  }
```

to:

```typescript
  if (sendState === 'sent') {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
          Check your email
        </div>
        <p className="text-sm" style={{ color: '#A5ACAF' }}>
          We sent a sign-in link to <span style={{ color: '#f0f4ff' }}>{email.trim()}</span>. Open
          it to finish signing in.
        </p>
      </div>
    );
  }
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Format and commit**

```bash
npm run format
git add components/AccountView.tsx
git commit -m "feat(auth): sign in via implicit flow; drop same-device copy"
```

---

### Task 8: End-to-end live verification (no code changes)

This fix cannot be claimed done from unit tests alone — the whole point is the redirect/cookie
behavior across the fragment boundary, which only a real browser exercises. Reuse the exact
decisive check already proven earlier in this investigation (curl against local Supabase), then
confirm the full UI flow.

**Files:** none — verification only.

- [ ] **Step 1: Ensure Docker and local Supabase are running**

```bash
docker info >/dev/null 2>&1 || open -a Docker
supabase status || supabase start
```

Expected: `supabase status` prints `API_URL`, `ANON_KEY`, etc. without error.

- [ ] **Step 2: Start the dev server (Claude Browser pane, not Bash)**

Use `preview_start` with `{name: "next-dev"}`. Confirm no build errors in `preview_logs`.

- [ ] **Step 3: Decisive check via curl — confirm the token is non-PKCE and the fragment carries session tokens**

```bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
curl -s -X POST "http://127.0.0.1:54321/auth/v1/otp" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"planverify@example.com","options":{"emailRedirectTo":"http://localhost:3000/auth/confirm?next=%2F"}}' \
  -w "\nHTTP:%{http_code}\n"
```

Expected: `HTTP:200`.

```bash
curl -s "http://127.0.0.1:54324/api/v1/messages" | python3 -c "
import json,sys
d = json.load(sys.stdin)
for m in d['messages']:
    if 'planverify' in str(m.get('To')):
        print(m['ID']); break
"
```

Fetch the message by ID from the previous command's output, extract the link:

```bash
curl -s "http://127.0.0.1:54324/api/v1/message/<ID_FROM_ABOVE>" | python3 -c "
import json,sys,re
d = json.load(sys.stdin)
m = re.search(r'href=\"([^\"]+)\"', d['HTML'])
print(m.group(1).replace('&amp;','&'))
"
```

Expected: the `token=` query param does **not** start with `pkce_`.

Follow the link exactly once and inspect the redirect:

```bash
curl -sD - -o /dev/null "<LINK_FROM_ABOVE>" | grep -i location
```

Expected: `Location: http://localhost:3000/auth/confirm?next=%2F#access_token=...&refresh_token=...&type=magiclink` — tokens in the fragment, not `?code=`.

- [ ] **Step 4: Full UI flow — happy path**

In the Claude Browser pane: navigate to `http://localhost:3000/signin`, sign out if a session is
present, submit a fresh email (e.g. `planverify2@example.com`), open Mailpit at
`http://127.0.0.1:54324` in a second tab, find the code/link email, extract the link (same
`javascript_tool` fetch-the-Mailpit-API approach used earlier in this investigation), navigate to
it. Expected: brief "Signing you in…" flash, then a full-page landing on the origin team page or
home, signed in — confirm via `read_page` or a screenshot that the account UI shows "Signed in
as planverify2@example.com".

- [ ] **Step 5: Cookie check**

After Step 4, inspect cookies via `javascript_tool`:

```javascript
document.cookie
```

Expected: Supabase session cookie(s) present (name starts with `sb-`).

- [ ] **Step 6: Malformed/expired-link path**

Re-visit the same magic-link URL from Step 4 a second time (simulating a stale/reused link — the
underlying GoTrue token is single-use, so this should now fail server-side at GoTrue's own
`/verify` step, landing on `/auth/confirm` with an error in the fragment instead of tokens).

Expected: lands on `/signin?auth_error=1&next=...` with the existing "That sign-in link expired —
request a new one." message visible (unchanged from before this plan — `AccountView`'s
`auth_error` handling was not touched).

- [ ] **Step 7: Full gate re-run**

```bash
npm run format:check
npx tsc --noEmit
npx vitest run --exclude '**/.claude/**'
```

Expected: all clean. (Use `--exclude '**/.claude/**'` — this repo has a stray git worktree under
`.claude/worktrees/` that otherwise double-counts the suite; see the separately-flagged tooling
ticket, unrelated to this change.)

- [ ] **Step 8: Stop local services**

```bash
# Stop the dev server via preview_stop in the Claude Browser pane.
# Leave Supabase running if more manual testing is wanted, or:
supabase stop
```

---

## Self-Review

**Spec coverage:** Every requirement from the investigation is covered — implicit-flow sign-in
request (Task 5), fragment parsing (Task 2, Task 6), cookie sync (Task 3, Task 4), page rebuild
(Task 6), UI wiring + copy fix (Task 7), and the live verification the whole approach depends on
(Task 8). The `next`-param duplication noticed while reading the existing code was folded into
Task 1 rather than left as drive-by cleanup outside the plan.

**Placeholder scan:** No TBD/TODO/"add appropriate handling" language; every step has literal
code or an exact command with expected output.

**Type consistency:** `AuthHashResult` (Task 2) is consumed by name in Task 6's `AuthConfirm.tsx`.
`SetSessionPayload` (Task 3) is consumed by name in Task 4's route handler. `safeNext` (Task 1)
is consumed identically in Task 6's `page.tsx` and the existing `app/signin/page.tsx`. Field names
(`accessToken`/`refreshToken` in the JS/TS layer vs. `access_token`/`refresh_token` in the
Supabase SDK calls) are consistent within each task and match `supabase-js`'s actual
`setSession()`/JWT-fragment field names at the boundary.
