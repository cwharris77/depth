'use client';

import { useEffect, useState } from 'react';
import { User, LogOut, Star } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/use-user';
import { getSettings, putSettings } from '@/lib/settings-client';

// The account surface at the bottom of the nav's idle view (Phase C, auth pass 1). Signed
// out: an email magic-link sign-in ("opt in — no account, no data"). Signed in: the
// user's email + a favorite-team toggle (this team opens on startup) + sign out. No new
// header icon — the nav is the app's primary surface (vault Decisions 2026-07-02).
//
// `teamId`/`teamName` are the team currently being viewed, so "Set as favorite" acts on
// what the user is looking at without a separate team picker.
type SendState = 'idle' | 'sending' | 'sent' | 'error';

export default function AccountPanel({
  teamId,
  teamName,
  accentColor,
}: {
  teamId: string;
  teamName: string;
  accentColor: string;
}) {
  const { user, loading } = useUser();
  const [email, setEmail] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [linkExpired, setLinkExpired] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);

  // Surface an expired/invalid magic link (auth/confirm redirects to /?auth_error=1),
  // then strip the param so a reload is clean.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) {
      setLinkExpired(true);
      params.delete('auth_error');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, []);

  // Load the user's favorite once signed in, so the star reflects saved state.
  useEffect(() => {
    if (!user) {
      setFavoriteTeamId(null);
      return;
    }
    getSettings().then((s) => setFavoriteTeamId(s?.favoriteTeamId ?? null));
  }, [user]);

  const sendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSendState('sending');
    setLinkExpired(false);
    const { error } = await getBrowserClient().auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setSendState(error ? 'error' : 'sent');
  };

  const isFavorite = favoriteTeamId === teamId;
  const toggleFavorite = () => {
    const next = isFavorite ? null : teamId;
    setFavoriteTeamId(next); // optimistic
    putSettings({ favoriteTeamId: next });
  };

  const container = 'mx-5 mt-3 mb-4 rounded-2xl p-4';
  const containerStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  };

  if (loading) return null;

  if (user) {
    const localPart = user.email?.split('@')[0] ?? 'account';
    return (
      <div className={container} style={containerStyle}>
        <div className="flex items-center gap-3">
          <User size={18} color={accentColor} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: '#f0f4ff' }}>
              {localPart}
            </div>
            <div className="text-[11px]" style={{ color: '#A5ACAF' }}>
              Synced across your devices
            </div>
          </div>
          <button
            type="button"
            onClick={() => getBrowserClient().auth.signOut()}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: '#A5ACAF', touchAction: 'manipulation' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
        <button
          type="button"
          onClick={toggleFavorite}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors"
          style={{
            background: isFavorite ? accentColor : 'rgba(255,255,255,0.06)',
            color: isFavorite ? '#0a0e1a' : '#f0f4ff',
            touchAction: 'manipulation',
          }}>
          <Star size={15} fill={isFavorite ? '#0a0e1a' : 'none'} />
          {isFavorite ? `${teamName} is your startup team` : `Open ${teamName} on startup`}
        </button>
      </div>
    );
  }

  return (
    <div className={container} style={containerStyle}>
      {sendState === 'sent' ? (
        <div className="flex items-center gap-3">
          <User size={18} color={accentColor} />
          <div className="text-sm" style={{ color: '#f0f4ff' }}>
            Check your email — link sent to <span className="font-bold">{email.trim()}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <User size={18} color={accentColor} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: '#f0f4ff' }}>
                Sign in
              </div>
              <div className="text-[11px]" style={{ color: '#A5ACAF' }}>
                Sync your teams &amp; settings. No account, no data saved.
              </div>
            </div>
          </div>
          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${accentColor}55` }}>
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
              className="flex-1 bg-transparent outline-none py-2.5 text-base"
              style={{ color: '#f0f4ff' }}
            />
            <button
              type="button"
              onClick={sendLink}
              disabled={sendState === 'sending'}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold"
              style={{ background: accentColor, color: '#0a0e1a', touchAction: 'manipulation' }}>
              {sendState === 'sending' ? 'Sending…' : 'Send link'}
            </button>
          </div>
          {sendState === 'error' && (
            <div className="mt-2 text-[11px]" style={{ color: '#ff6b6b' }}>
              Couldn&apos;t send — try again.
            </div>
          )}
          {linkExpired && (
            <div className="mt-2 text-[11px]" style={{ color: '#ff6b6b' }}>
              Sign-in link expired — try again.
            </div>
          )}
        </>
      )}
    </div>
  );
}
