'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { getSettings, putSettings } from '@/lib/settings-client';

// The sign-in / account page body (Phase C, auth pass 1). Reached from the nav drawer's
// account item at /signin. Signed out: email magic-link sign-in ("opt in — no account,
// no data"). Signed in: the account (email + sign out) plus the favorite-team picker —
// the team the home route opens to on startup. Favorite lives here (not a contextual
// per-team toggle) because this is the settings surface.
type SendState = 'idle' | 'sending' | 'sent' | 'error';
type TeamOption = { id: string; label: string };

export default function AccountView({ teams, next }: { teams: TeamOption[]; next: string }) {
  const { user, loading } = useUser();
  const [email, setEmail] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [code, setCode] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [linkExpired, setLinkExpired] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [startOnFavorite, setStartOnFavorite] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>('idle');

  // Surface an expired/invalid magic link (auth/confirm -> /signin?auth_error=1), then
  // strip the param so a reload is clean.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) {
      setLinkExpired(true);
      params.delete('auth_error');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteTeamId(null);
      return;
    }
    getSettings().then((s) => {
      setFavoriteTeamId(s?.favoriteTeamId ?? null);
      setStartOnFavorite(s?.startOnFavorite ?? true);
    });
  }, [user]);

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

  // Verify the 6-digit code the user types from the email. This is the robust path: a typed code
  // can't be consumed by an email prefetch/scanner (the magic link's failure mode) and doesn't
  // depend on the link opening in the same browser (no PKCE code_verifier needed). On success the
  // browser client holds the session, so a full navigation to `next` lands them signed in there.
  const verifyCode = async () => {
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) return;
    setVerifyState('verifying');
    const { error } = await getBrowserClient().auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    if (error) {
      setVerifyState('error');
      return;
    }
    window.location.assign(next);
  };

  const changeFavorite = (id: string) => {
    const prev = favoriteTeamId;
    const next = id || null;
    setFavoriteTeamId(next); // optimistic
    // Setting a favorite for the first time opts into open-at-startup by default.
    if (next && !prev) {
      setStartOnFavorite(true);
      putSettings({ favoriteTeamId: next, startOnFavorite: true });
    } else {
      putSettings({ favoriteTeamId: next });
    }
  };

  const toggleStartOnFavorite = () => {
    const next = !startOnFavorite;
    setStartOnFavorite(next); // optimistic
    putSettings({ startOnFavorite: next });
  };

  // Permanently deletes the account (App Store submission requirement). The server cascades
  // user_settings/depth_overrides/shared_boards via FK, so this is the only call needed. On
  // success the account no longer exists — sign out locally to clear the now-invalid session
  // and land back on the sign-in state.
  const deleteAccount = async () => {
    setDeleteState('deleting');
    const res = await fetch('/api/account/delete', { method: 'POST' });
    if (!res.ok) {
      setDeleteState('error');
      return;
    }
    await getBrowserClient().auth.signOut();
    window.location.assign('/');
  };

  if (loading) {
    return (
      <div className="text-sm" style={{ color: '#A5ACAF' }}>
        Loading…
      </div>
    );
  }

  if (user) {
    const initial = (user.email ?? '?').charAt(0).toUpperCase();
    return (
      <div className="flex flex-col gap-6">
        {/* Identity */}
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(105,190,40,0.14)', border: '1px solid rgba(105,190,40,0.3)' }}>
            <span className="text-lg font-bold" style={{ color: '#69BE28' }}>
              {initial}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#5b6478' }}>
              Signed in as
            </div>
            <div
              className="truncate text-base font-bold"
              style={{ color: '#f0f4ff' }}>
              {user.email}
            </div>
          </div>
        </div>

        {/* Settings section */}
        <div>
          <div
            className="mb-2.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: '#69BE28' }}>
            Settings
          </div>
          <div
            className="flex flex-col gap-4 rounded-2xl p-4"
            style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="favorite-team"
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: '#f0f4ff' }}>
                <Star size={15} color="#69BE28" /> Favorite team
              </label>
              <p className="mb-0.5 text-[12px]" style={{ color: '#8891a3' }}>
                Opens automatically when you start the app.
              </p>
              <select
                id="favorite-team"
                value={favoriteTeamId ?? ''}
                onChange={(e) => changeFavorite(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-base outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#f0f4ff',
                }}>
                <option value="">No favorite</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {favoriteTeamId && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <button
                  type="button"
                  role="switch"
                  aria-checked={startOnFavorite}
                  onClick={toggleStartOnFavorite}
                  className="flex items-center justify-between gap-3 bg-transparent p-0 text-left">
                  <span className="text-sm" style={{ color: '#dfe5f0' }}>
                    Open this team when I start the app
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative inline-flex shrink-0 rounded-full transition-colors"
                    style={{
                      width: 40,
                      height: 24,
                      background: startOnFavorite ? '#69BE28' : 'rgba(255,255,255,0.18)',
                    }}>
                    <span
                      className="absolute rounded-full transition-transform"
                      style={{
                        top: 2,
                        left: 2,
                        width: 20,
                        height: 20,
                        background: '#f0f4ff',
                        transform: startOnFavorite ? 'translateX(16px)' : 'translateX(0)',
                      }}
                    />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Privacy link */}
        <Link
          href="/privacy"
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold no-underline"
          style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', color: '#dfe5f0' }}>
          Privacy policy
          <ChevronRight size={16} color="#5b6478" />
        </Link>

        <button
          type="button"
          onClick={() => getBrowserClient().auth.signOut()}
          className="self-start rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#dfe5f0',
          }}>
          Sign out
        </button>

        {/* Danger zone */}
        <div>
          <div
            className="mb-2.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: '#8891a3' }}>
            Danger zone
          </div>
          <div
            className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.22)' }}>
            {isConfirmingDelete ? (
              <>
                <div>
                  <div className="mb-1 text-sm font-bold" style={{ color: '#f0f4ff' }}>
                    Delete your account?
                  </div>
                  <p className="m-0 text-[12px] leading-relaxed" style={{ color: '#A5ACAF' }}>
                    This permanently removes your account, favorite team, and settings. This
                    can&apos;t be undone.
                  </p>
                </div>
                {deleteState === 'error' && (
                  <div className="text-[12px]" style={{ color: '#ff6b6b' }}>
                    Couldn&apos;t delete your account — try again.
                  </div>
                )}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={deleteState === 'deleting'}
                    className="flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#dfe5f0',
                    }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deleteState === 'deleting'}
                    className="flex-1 rounded-xl px-3 py-2.5 text-[13px] font-bold"
                    style={{ background: '#ff6b6b', border: 'none', color: '#2a0e0e' }}>
                    {deleteState === 'deleting' ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="self-start rounded-xl px-3.5 py-2 text-[13px] font-semibold"
                style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b' }}>
                Delete account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (sendState === 'sent') {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
            Check your email
          </div>
          <p className="mt-1 text-sm" style={{ color: '#A5ACAF' }}>
            We sent a 6-digit code to <span style={{ color: '#f0f4ff' }}>{email.trim()}</span>.
            Enter it below to finish signing in.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              setVerifyState('idle');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') verifyCode();
            }}
            placeholder="123456"
            aria-label="6-digit sign-in code"
            className="rounded-xl px-4 py-3 text-lg tracking-[0.4em] outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#f0f4ff',
            }}
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={verifyState === 'verifying' || code.length !== 6}
            className="rounded-xl px-4 py-3 text-sm font-bold"
            style={{
              background: '#69BE28',
              color: '#0a0e1a',
              opacity: code.length === 6 ? 1 : 0.6,
            }}>
            {verifyState === 'verifying' ? 'Verifying…' : 'Verify & sign in'}
          </button>
          {verifyState === 'error' && (
            <div className="text-[12px]" style={{ color: '#ff6b6b' }}>
              That code is invalid or expired — use the newest email, or resend below.
            </div>
          )}
        </div>

        {/* The same email also has a sign-in link as a fallback. Kept because it's zero-friction
            when it works; the code is the reliable path when a scanner eats the link. */}
        <p className="text-[12px]" style={{ color: '#A5ACAF' }}>
          The email also has a sign-in link if you prefer — open it on this device.
        </p>
        <button
          type="button"
          onClick={() => {
            setSendState('idle');
            setCode('');
            setVerifyState('idle');
          }}
          className="self-start text-[12px] underline"
          style={{ color: '#A5ACAF' }}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-black" style={{ color: '#f0f4ff' }}>
        Sign in
      </h1>

      <div className="flex flex-col gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendLink();
          }}
          placeholder="you@email.com"
          className="rounded-xl px-4 py-3 text-base outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#f0f4ff',
          }}
        />
        <button
          type="button"
          onClick={sendLink}
          disabled={sendState === 'sending'}
          className="rounded-xl px-4 py-3 text-sm font-bold"
          style={{ background: '#69BE28', color: '#0a0e1a' }}>
          {sendState === 'sending' ? 'Sending…' : 'Email me a sign-in code'}
        </button>
        {sendState === 'error' && (
          <div className="text-[12px]" style={{ color: '#ff6b6b' }}>
            Couldn&apos;t send — try again.
          </div>
        )}
        {linkExpired && (
          <div className="text-[12px]" style={{ color: '#ff6b6b' }}>
            That sign-in link expired — request a new one.
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: '#5b6478' }}>
        By continuing you agree to our{' '}
        <Link href="/privacy" style={{ color: '#69BE28' }} className="underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
