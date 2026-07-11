// Magic-link landing (Phase C, auth pass 1). Supabase emails a sign-in link; landing
// here establishes the session cookies, then we redirect to `next` (default home).
// Handles both @supabase/ssr link styles so it works with the default email template and
// a customized token_hash one: a PKCE `code` -> exchangeCodeForSession, or a
// `token_hash` + `type` -> verifyOtp. Untrusted input degrades, never throws (AGENTS.md
// invariant 6): anything invalid redirects to /signin?auth_error=1, surfaced there as
// "link expired — try again".
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Only allow same-origin relative redirects — never a protocol-relative (`//host`) or absolute
  // URL — so `next` can't be turned into an open redirect to an attacker-supplied host.
  const nextParam = searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const supabase = await getServerClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Preserve the return path across an expired/invalid link so retrying still lands home-of-origin.
  return NextResponse.redirect(`${origin}/signin?auth_error=1&next=${encodeURIComponent(next)}`);
}
