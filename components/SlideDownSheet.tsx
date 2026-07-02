"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SlideDownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  children: ReactNode;
}

// Shared chrome for the app's full-screen, top-anchored sheets (player search,
// team switcher): backdrop + a sheet that slides down from under the safe area.
// Content differs per use; only the shell is common.
export default function SlideDownSheet({
  isOpen,
  onClose,
  accentColor,
  children,
}: SlideDownSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 top-0 z-50 rounded-b-3xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)",
              borderBottom: `1px solid ${accentColor}40`,
              paddingTop: "max(env(safe-area-inset-top), 12px)",
              maxHeight: "85dvh",
            }}
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
