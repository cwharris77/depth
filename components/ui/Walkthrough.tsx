'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { colors } from './tokens';

// Multi-step anchored hint: like Coachmark, but advances through several messages via an
// explicit "Next"/"Got it" tap instead of showing one message and auto-timing out — for
// callouts that need more than a single line to land (see components/DepthChartField's
// edit-mode walkthrough, lib/edit-mode-walkthrough.ts for the dismiss-gate pattern it follows).
// Purely presentational — no localStorage logic here, callers own visibility and dismissal.
// Positioned by the caller via a `relative` ancestor; this renders `absolute` beneath that
// anchor, right-aligned so the arrow sits under a right-aligned trigger (e.g. an overflow menu).
export default function Walkthrough({
  steps,
  onDismiss,
}: {
  steps: string[];
  onDismiss: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <motion.div
      role="tooltip"
      className="absolute right-0 top-full z-10 mt-2 w-60 rounded-xl px-3 py-2.5 text-[12px] font-medium leading-snug"
      style={{
        color: colors.textPrimary,
        background: colors.surfaceMenu,
        border: `1px solid ${colors.borderStrong}`,
        boxShadow: `0 8px 24px ${colors.scrimLight}`,
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}>
      <span
        aria-hidden="true"
        className="absolute -top-1 right-4 h-2 w-2 rotate-45"
        style={{
          background: colors.surfaceMenu,
          borderLeft: `1px solid ${colors.borderStrong}`,
          borderTop: `1px solid ${colors.borderStrong}`,
        }}
      />
      {steps[stepIndex]}
      <div className="mt-2.5 flex items-center justify-between">
        <span style={{ color: colors.textFaint }}>
          {stepIndex + 1} of {steps.length}
        </span>
        <button
          type="button"
          onClick={() => (isLastStep ? onDismiss() : setStepIndex((i) => i + 1))}
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: colors.accent, color: colors.onAccent }}>
          {isLastStep ? 'Got it' : 'Next'}
        </button>
      </div>
    </motion.div>
  );
}
