'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import Coachmark from './ui/Coachmark';
import { colors } from './ui/tokens';
import {
  dismissNavDrawerCoachmark,
  hasDismissedNavDrawerCoachmark,
} from '@/lib/nav-drawer-coachmark';

// The single shared mark-to-wordmark gap, used here and by any other spot that hand-rolls
// Logo + "depth" text (currently just app/signin/page.tsx, which needs a larger size than
// this component renders) — keeps the gap identical everywhere even where DepthMark itself
// can't be reused as-is.
export const MARK_WORDMARK_GAP = 'gap-1';

const COACHMARK_TIMEOUT_MS = 4000;

// The depth logo + "depth" wordmark. Doubles as the nav-drawer trigger in the team header
// (DepthChartField) and the uniform archive header (UniformArchive) — centralized here so a
// size bump lands once instead of drifting per call site (ticket: bigger menu button and
// wordmark). Also rendered non-interactively in app/team/[id]/loading.tsx's skeleton so the
// real header doesn't jump in at a different size once data loads.
//
// Sizing: the wordmark span's color is always the fixed `colors.textMuted` chrome token used
// everywhere it's rendered; only the logo mark's color varies (team/brand accent), so it's the
// one prop here.
//
// First-load coachmark: shown once per visitor, gated by lib/nav-drawer-coachmark.ts's
// localStorage flag (set the instant the mark shows, not on dismiss — so navigating away
// before it dismisses still counts as "shown"). Only wired up when this is acting as the nav
// trigger (`onClick` set) — the non-interactive renders (loading skeleton, sign-in page) never
// show it. Dismissed by any click on the trigger or automatically after ~4s.
export default function DepthMark({ color, onClick }: { color: string; onClick?: () => void }) {
  const [showCoachmark, setShowCoachmark] = useState(false);

  // Legitimate effect, not a lazy-init candidate: DepthMark renders inside a server-rendered
  // header, and this localStorage check decides whether the coachmark renders at all. Checking
  // it in a lazy useState initializer would disagree between the server render (no `window`)
  // and the client's first hydration render (`window` present), causing a hydration mismatch —
  // deferring to an effect (client-only, post-hydration) is what avoids that. The setTimeout
  // auto-dismiss also has no derived-render equivalent.
  useEffect(() => {
    if (!onClick) return;
    if (hasDismissedNavDrawerCoachmark(window.localStorage)) return;
    dismissNavDrawerCoachmark(window.localStorage);
    setShowCoachmark(true);
    const timer = window.setTimeout(() => setShowCoachmark(false), COACHMARK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
    // Intentionally runs once per mount, not on `onClick` identity — it only gates
    // interactive-vs-not here and isn't expected to change across the trigger's lifetime.
  }, []);

  const content = (
    <>
      <Logo size={26} color={color} />
      <span className="text-base font-bold tracking-widest" style={{ color: colors.textMuted }}>
        depth
      </span>
    </>
  );

  if (!onClick) {
    return <div className={`flex items-center ${MARK_WORDMARK_GAP} shrink-0`}>{content}</div>;
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setShowCoachmark(false);
          onClick();
        }}
        aria-label="Open navigation"
        className={`flex items-center ${MARK_WORDMARK_GAP} shrink-0`}
        style={{ touchAction: 'manipulation' }}>
        {content}
      </button>
      <AnimatePresence>
        {showCoachmark && (
          <Coachmark message="Depth charts, the uniform archive, and your account live here." />
        )}
      </AnimatePresence>
    </div>
  );
}
