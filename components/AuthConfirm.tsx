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
    })
      .then((res) => {
        if (res.ok) {
          window.location.assign(next);
        } else {
          toSignInError();
        }
      })
      .catch(toSignInError);
  }, [next]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm" style={{ color: '#A5ACAF' }}>
        {failed ? 'That sign-in link expired — redirecting…' : 'Signing you in…'}
      </p>
    </div>
  );
}
