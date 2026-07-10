// Magic-link landing (Phase C, auth pass 1). Supabase emails a link to this route with
// a one-time token_hash; we verify it, which sets the session cookies, then redirect to
// wherever the user started (`next`, default home). Untrusted input degrades, never
// throws (AGENTS.md invariant 6): a missing/invalid token redirects to /?auth_error=1,
// which the account row surfaces as "link expired — try again".
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Only allow same-origin relative redirects — never bounce to an attacker-supplied host.
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/';

  if (token_hash && type) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
