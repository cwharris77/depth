'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { colors } from '@/components/ui/tokens';

// Partial bottom-anchored sheet: slides up from the bottom and leaves the top of the
// screen visible — unlike FullScreenSheet, which covers everything. Used by the uniform
// picker so the field stays on screen and recolors live as you tap a kit. A dimmed
// backdrop fills the rest; tapping it (or the sheet's own close control) dismisses.
// Positioned absolutely within DepthChartField's relative root.
export default function BottomSheet({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="absolute inset-0 z-40"
            style={{ background: colors.scrimLight }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 z-50"
            style={{
              background: `linear-gradient(180deg, #131a2b 0%, ${colors.bg} 100%)`,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: `1px solid ${colors.borderDefault}`,
              boxShadow: `0 -8px 32px ${colors.scrimLight}`,
              paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              maxHeight: '70%',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
