'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
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

export default function AccountView({ teams }: { teams: TeamOption[] }) {
  const { user, loading } = useUser();
  const [email, setEmail] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [linkExpired, setLinkExpired] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [startOnFavorite, setStartOnFavorite] = useState(true);

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
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/signin` },
    });
    setSendState(error ? 'error' : 'sent');
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

  if (loading) {
    return (
      <div className="text-sm" style={{ color: '#A5ACAF' }}>
        Loading…
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: '#A5ACAF' }}>
            Signed in as
          </div>
          <div className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
            {user.email}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="favorite-team"
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: '#f0f4ff' }}>
            <Star size={15} color="#69BE28" /> Favorite team
          </label>
          <p className="text-[12px]" style={{ color: '#A5ACAF' }}>
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

          {favoriteTeamId && (
            <button
              type="button"
              role="switch"
              aria-checked={startOnFavorite}
              onClick={toggleStartOnFavorite}
              className="mt-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
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
          )}
        </div>

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
      </div>
    );
  }

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#f0f4ff' }}>
          Sign in
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#A5ACAF' }}>
          Sync your favorite team, last-viewed team, and settings across devices. Signing in is
          optional — no account, no data saved.
        </p>
      </div>

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
          {sendState === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
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
    </div>
  );
}
