'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Star } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { getSettings, putSettings } from '@/lib/settings-client';
import OtpInput from '@/components/ui/OtpInput';
import { colors } from '@/components/ui/tokens';

// The sign-in / account page body (Phase C, auth pass 1; OTP-code sign-in, auth pass 3).
// Reached from the nav drawer's account item at /signin. Signed out: email + 6-digit code
// sign-in ("opt in — no account, no data") — verified synchronously in this page via
// verifyOtp(), no link/redirect/cross-app handoff involved (see supabase/config.toml's
// [auth] comment for why the magic-link approach was retired). Signed in: the account
// (email + sign out) plus the favorite-team picker — the team the home route opens to on
// startup. Favorite lives here (not a contextual per-team toggle) because this is the
// settings surface.
type SendState = 'idle' | 'sending' | 'sent' | 'error';
type VerifyState = 'idle' | 'verifying' | 'error';
type TeamOption = { id: string; label: string };

export default function AccountView({ teams }: { teams: TeamOption[] }) {
  const { user, loading } = useUser();
  const [email, setEmail] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [code, setCode] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  // Set on a successful in-page sign-in so we show a success confirmation instead of
  // auto-navigating or dropping the user straight into the settings form. Cleared when they
  // choose to manage settings.
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [startOnFavorite, setStartOnFavorite] = useState(true);
  // Settings load via a second async call (getSettings) after `loading` flips false, so gate the
  // settings-derived controls on this to avoid rendering the default "No favorite" before the
  // real value arrives (flash-then-jump).
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>('idle');

  useEffect(() => {
    if (!user) {
      setFavoriteTeamId(null);
      setSettingsLoaded(false);
      return;
    }
    setSettingsLoaded(false);
    getSettings().then((s) => {
      setFavoriteTeamId(s?.favoriteTeamId ?? null);
      setStartOnFavorite(s?.startOnFavorite ?? true);
      setSettingsLoaded(true);
    });
  }, [user]);

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSendState('sending');
    const { error } = await getBrowserClient().auth.signInWithOtp({ email: trimmed });
    setSendState(error ? 'error' : 'sent');
  };

  // Verify the 6-digit code the user types from the email. Synchronous, in-page — the browser
  // client holds the session directly on success, no redirect/link/cross-app handoff involved.
  // On success we don't navigate: onAuthStateChange flips the user to signed-in, and we show a
  // success confirmation (justSignedIn) that points to the settings rather than auto-opening them.
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
    setJustSignedIn(true);
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

  // Just signed in: confirm success in place and point to the settings, rather than
  // auto-navigating away or dropping straight into the settings form. The page's Back arrow
  // (rendered by signin/page.tsx) still returns the user to where they came from.
  if (user && justSignedIn) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: 'rgba(105,190,40,0.14)',
            border: '1px solid rgba(105,190,40,0.3)',
          }}>
          <Check size={30} color="#69BE28" strokeWidth={3} />
        </div>
        <div>
          <div className="text-xl font-black" style={{ color: '#f0f4ff' }}>
            You&apos;re signed in
          </div>
          <p className="mt-1 text-sm" style={{ color: '#A5ACAF' }}>
            {user.email ? `Signed in as ${user.email}. ` : ''}
            Your favorite team and settings now sync across devices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setJustSignedIn(false)}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          style={{ background: '#69BE28', color: '#0a0e1a' }}>
          Manage account settings
          <ChevronRight size={16} color="#0a0e1a" />
        </button>
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
            style={{
              background: 'rgba(105,190,40,0.14)',
              border: '1px solid rgba(105,190,40,0.3)',
            }}>
            <span className="text-lg font-bold" style={{ color: '#69BE28' }}>
              {initial}
            </span>
          </div>
          <div className="min-w-0">
            <div
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: '#7d848c' }}>
              Signed in as
            </div>
            <div className="truncate text-base font-bold" style={{ color: '#f0f4ff' }}>
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
              {settingsLoaded ? (
                <select
                  id="favorite-team"
                  value={favoriteTeamId ?? ''}
                  onChange={(e) => changeFavorite(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-base outline-none transition-shadow duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#f0f4ff',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.focusRing}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                  <option value="">No favorite</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                // Skeleton until getSettings resolves — avoids flashing the default "No favorite"
                // before the real favorite arrives.
                <div
                  aria-hidden="true"
                  className="animate-pulse rounded-xl"
                  style={{
                    height: 46,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                />
              )}
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
          style={{
            background: '#0f1623',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#dfe5f0',
          }}>
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
            style={{
              background: 'rgba(255,107,107,0.05)',
              border: '1px solid rgba(255,107,107,0.22)',
            }}>
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
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,107,107,0.4)',
                  color: '#ff6b6b',
                }}>
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
          <p className="mt-1 text-[12px]" style={{ color: '#7d848c' }}>
            Don&apos;t see it? Check your spam folder.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <OtpInput
            onChange={(value) => {
              setCode(value);
              setVerifyState('idle');
            }}
            onEnter={verifyCode}
            disabled={verifyState === 'verifying'}
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
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendCode();
          }}
          placeholder="you@email.com"
          className="rounded-xl px-4 py-3 text-base outline-none transition-shadow duration-150"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#f0f4ff',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.focusRing}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          type="button"
          onClick={sendCode}
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
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: '#7d848c' }}>
        By continuing you agree to our{' '}
        <Link href="/privacy" style={{ color: '#69BE28' }} className="underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
