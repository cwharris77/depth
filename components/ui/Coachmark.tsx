'use client';

import { motion } from 'framer-motion';
import { colors } from './tokens';

// One-time anchored hint: a small arrow-tipped bubble pointing up at whatever it's rendered
// under. Purely presentational — no localStorage/timeout logic here, callers own visibility
// (see components/DepthMark's nav-drawer coachmark, lib/nav-drawer-coachmark.ts for the
// dismiss-gate pattern it follows). Positioned by the caller via a `relative` ancestor; this
// renders `absolute` beneath that anchor, left-aligned so the arrow sits under the trigger.
export default function Coachmark({ message }: { message: string }) {
  return (
    <motion.div
      role="tooltip"
      className="absolute left-0 top-full z-10 mt-2 w-56 rounded-xl px-3 py-2.5 text-[12px] font-medium leading-snug"
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
        className="absolute -top-1 left-4 h-2 w-2 rotate-45"
        style={{
          background: colors.surfaceMenu,
          borderLeft: `1px solid ${colors.borderStrong}`,
          borderTop: `1px solid ${colors.borderStrong}`,
        }}
      />
      {message}
    </motion.div>
  );
}
