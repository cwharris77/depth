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
