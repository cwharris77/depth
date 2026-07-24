'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Star } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { getSettings, putSettings } from '@/lib/settings-client';
import OtpInput from '@/components/ui/OtpInput';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import SectionLabel from '@/components/ui/SectionLabel';
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

  // Legitimate effect: fetching data reacting to `user` becoming available, not a value
  // derivable during render.
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
      <div className="text-sm" style={{ color: colors.textMuted }}>
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
        {/* Accent-tinted (not chrome) — 0.3-alpha border matches colors.focusRing exactly; the
            0.14-alpha fill derives from colors.accent via the house hex+alpha-suffix convention
            (see PlayerCard/TeamStatsView migrations). */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: `${colors.accent}24`,
            border: `1px solid ${colors.focusRing}`,
          }}>
          <Check size={30} color={colors.accent} strokeWidth={3} />
        </div>
        <div>
          <div className="text-xl font-black" style={{ color: colors.textPrimary }}>
            You&apos;re signed in
          </div>
          <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
            {user.email ? `Signed in as ${user.email}. ` : ''}
            Your favorite team and settings now sync across devices.
          </p>
        </div>
        <Button onClick={() => setJustSignedIn(false)}>
          Manage account settings
          <ChevronRight size={16} color={colors.onAccent} />
        </Button>
      </div>
    );
  }

  if (user) {
    const initial = (user.email ?? '?').charAt(0).toUpperCase();
    return (
      <div className="flex flex-col gap-6">
        {/* Identity — bare row, not a card (no bg/border to migrate to Card). */}
        <div className="flex items-center gap-3.5">
          {/* Same accent-tint derivation as the just-signed-in circle above. */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `${colors.accent}24`,
              border: `1px solid ${colors.focusRing}`,
            }}>
            <span className="text-lg font-bold" style={{ color: colors.accent }}>
              {initial}
            </span>
          </div>
          <div className="min-w-0">
            <div
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: colors.textFaint }}>
              Signed in as
            </div>
            <div className="truncate text-base font-bold" style={{ color: colors.textPrimary }}>
              {user.email}
            </div>
          </div>
        </div>

        {/* Settings section */}
        <div>
          {/* Not SectionLabel: deliberately accent-colored for emphasis, unlike SectionLabel's
              fixed textMuted — SectionLabel's API has no color override. */}
          <div
            className="mb-2.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: colors.accent }}>
            Settings
          </div>
          <Card padding={16} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="favorite-team"
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: colors.textPrimary }}>
                <Star size={15} color={colors.accent} /> Favorite team
              </label>
              <p className="mb-0.5 text-[12px]" style={{ color: colors.textFaint }}>
                Opens automatically when you start the app.
              </p>
              {settingsLoaded ? (
                <select
                  id="favorite-team"
                  value={favoriteTeamId ?? ''}
                  onChange={(e) => changeFavorite(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-base outline-none transition-shadow duration-150"
                  style={{
                    background: colors.surfaceInput,
                    border: `1px solid ${colors.borderInput}`,
                    color: colors.textPrimary,
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
                    background: colors.surfaceInput,
                    border: `1px solid ${colors.borderInput}`,
                  }}
                />
              )}
            </div>

            {favoriteTeamId && (
              <>
                <div style={{ height: 1, background: colors.borderSubtle }} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    Open this team when I start the app
                  </span>
                  <Toggle checked={startOnFavorite} onChange={toggleStartOnFavorite} />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Privacy link */}
        <Link
          href="/privacy"
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold no-underline"
          style={{
            background: colors.surfaceCard,
            border: `1px solid ${colors.borderDefault}`,
            color: colors.textSecondary,
          }}>
          Privacy policy
          <ChevronRight size={16} color={colors.textFaintest} />
        </Link>

        <Button variant="secondary" size="sm" onClick={() => getBrowserClient().auth.signOut()}>
          Sign out
        </Button>

        {/* Danger zone */}
        <div>
          <SectionLabel className="mb-2.5 uppercase">Danger zone</SectionLabel>
          {/* Card doesn't fit: this needs rounded-2xl (Card hardcodes rounded-3xl) and a
              danger-tinted fill/border that Card's surfaceCard/surfaceCard2 pair can't express.
              The fill/border colors derive from colors.danger via the house hex+alpha-suffix
              convention (see PlayerCard/TeamStatsView migrations). */}
          <div
            className="flex flex-col gap-3 rounded-2xl p-4"
            style={{
              background: `${colors.danger}0d`,
              border: `1px solid ${colors.danger}38`,
            }}>
            {isConfirmingDelete ? (
              <>
                <div>
                  <div className="mb-1 text-sm font-bold" style={{ color: colors.textPrimary }}>
                    Delete your account?
                  </div>
                  <p
                    className="m-0 text-[12px] leading-relaxed"
                    style={{ color: colors.textMuted }}>
                    This permanently removes your account, favorite team, and settings. This
                    can&apos;t be undone.
                  </p>
                </div>
                {deleteState === 'error' && (
                  <div className="text-[12px]" style={{ color: colors.danger }}>
                    Couldn&apos;t delete your account — try again.
                  </div>
                )}
                <div className="flex gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={deleteState === 'deleting'}
                    onClick={() => setIsConfirmingDelete(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    disabled={deleteState === 'deleting'}
                    onClick={deleteAccount}>
                    {deleteState === 'deleting' ? 'Deleting…' : 'Yes, delete my account'}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}>
                Delete account
              </Button>
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
          <div className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Check your email
          </div>
          <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
            We sent a 6-digit code to{' '}
            <span style={{ color: colors.textPrimary }}>{email.trim()}</span>. Enter it below to
            finish signing in.
          </p>
          <p className="mt-1 text-[12px]" style={{ color: colors.textFaint }}>
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
          <Button onClick={verifyCode} disabled={verifyState === 'verifying' || code.length !== 6}>
            {verifyState === 'verifying' ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          {verifyState === 'error' && (
            <div className="text-[12px]" style={{ color: colors.danger }}>
              That code is invalid or expired — use the newest email, or resend below.
            </div>
          )}
        </div>

        {/* Two inline links: "Resend code" (same email, calls sendCode directly) and
            "Use a different email" (returns to email-entry screen). Both are inline underlined
            text links, not Button — Button's variants always render padding + rounded + font-bold,
            no bare-text style. */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={sendCode}
            className="text-[12px] underline"
            style={{ color: colors.textMuted }}>
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setSendState('idle');
              setCode('');
              setVerifyState('idle');
            }}
            className="text-[12px] underline"
            style={{ color: colors.textMuted }}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-black" style={{ color: colors.textPrimary }}>
        Sign in
      </h1>

      <div className="flex flex-col gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          ariaLabel="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendCode();
          }}
          placeholder="you@email.com"
        />
        <Button onClick={sendCode} disabled={sendState === 'sending'}>
          {sendState === 'sending' ? 'Sending…' : 'Email me a sign-in code'}
        </Button>
        {sendState === 'error' && (
          <div className="text-[12px]" style={{ color: colors.danger }}>
            Couldn&apos;t send — try again.
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: colors.textFaint }}>
        By continuing you agree to our{' '}
        <Link href="/privacy" style={{ color: colors.accent }} className="underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
