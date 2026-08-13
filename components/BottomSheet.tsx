'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { colors, springSheet, zIndex } from '@/components/ui/tokens';

// Partial bottom-anchored sheet: slides up from the bottom and leaves the top of the
// screen visible — unlike FullScreenSheet, which covers everything. Used by the uniform
// picker so the field stays on screen and recolors live as you tap a kit. A dimmed
// backdrop fills the rest; tapping it (or the sheet's own close control) dismisses.
// Positioned absolutely within DepthChartField's relative root.
//
// Sizing contract: THIS component owns the sheet's height cap (maxHeight below) and the
// flex column that children lay out in — content passed as `children` renders directly
// inside it, as a Fragment of top-level rows, not wrapped in its own sizing div. A child
// that needs to fill remaining space (a scrollable list) sets `flex: '1 1 auto'` +
// `minHeight: 0` on itself; a child that should hug the top/bottom sets `flex: '0 0
// auto'`. Never give a child of BottomSheet its own height/maxHeight in vh or % — that
// duplicates this component's cap and, if the two disagree, the excess silently gets
// clipped by `overflow: hidden` below (DEP formations-sheet bug: a content component
// once set a fixed 74vh here, which exceeded this cap and cut off the bottom of a long
// list). One cap, defined once, here.
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
            className="absolute inset-0"
            style={{ background: colors.scrimLight, zIndex: zIndex.overlayBackdrop }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 flex flex-col"
            style={{
              background: colors.panelGradient,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTop: `1px solid ${colors.borderDefault}`,
              boxShadow: `0 -8px 32px ${colors.scrimLight}`,
              paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              maxHeight: '70%',
              overflow: 'hidden',
              zIndex: zIndex.overlayPanel,
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
