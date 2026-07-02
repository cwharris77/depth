"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FullScreenSheetProps {
  isOpen: boolean;
  children: ReactNode;
}

// Full-viewport overlay for the app's nav (team + player switcher): slides down
// from under the safe area and covers the whole screen, more like a page than a
// dropdown sheet. No backdrop — there's no "outside" left to tap, so closing is
// always an explicit action inside the content (a close button).
export default function FullScreenSheet({ isOpen, children }: FullScreenSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col"
          style={{
            background: "linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)",
            paddingTop: "max(env(safe-area-inset-top), 12px)",
          }}
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 38 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
