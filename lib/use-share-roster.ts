'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import { rosterShareUrlPath } from '@/lib/share';
import type { TeamRoster } from '@/lib/types';

// Share the roster as it currently stands. Signed in: a durable `?board=<slug>` reference
// link that tracks future edits (POST /api/share); signed out: the self-contained `?order=`
// snapshot as before. Prefers the native share sheet, else copies with a brief check.
// `user` is passed in rather than read via useUser() here so a single subscription is
// shared with useTeamOverride.
export function useShareRoster(
  roster: TeamRoster,
  override: TeamDepthOverride,
  kitId: string | undefined,
  user: User | null
) {
  const [shareCopied, setShareCopied] = useState(false);
  const { team } = roster;

  const buildShareUrl = async (): Promise<string> => {
    if (user) {
      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: team.id }),
        });
        if (res.ok) {
          const { slug } = (await res.json()) as { slug: string };
          return `${window.location.origin}/team/${encodeURIComponent(team.id)}?board=${slug}`;
        }
      } catch {
        // fall through to the offline-safe ?order= link
      }
    }
    const homeKitId = roster.uniforms[0]?.id;
    const sharedKitId = kitId && kitId !== homeKitId ? kitId : undefined;
    return window.location.origin + rosterShareUrlPath(team.id, override, sharedKitId);
  };

  const handleShareRoster = async () => {
    const url = await buildShareUrl();
    const title = `${team.city} ${team.name} depth chart · Depth`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // share sheet dismissed / unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — no-op
    }
  };

  return { shareCopied, handleShareRoster };
}
