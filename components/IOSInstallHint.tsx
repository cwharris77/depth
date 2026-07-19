'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  dismissInstallHint,
  hasDismissedInstallHint,
  isIOSSafari,
  isStandaloneDisplay,
} from '@/lib/ios-install-hint';
import { colors as uiTokens } from '@/components/ui/tokens';
import IconButton from '@/components/ui/IconButton';

// One-time hint for iOS Safari visitors pointing at Share -> Add to Home Screen. iOS Safari has
// no native install prompt (`beforeinstallprompt` is Chromium-only), so without this the PWA
// ServiceWorkerRegistrar sets up is undiscoverable there. Mounted from the root layout so it
// covers every route; gated to iOS Safari, not-yet-standalone, and not previously dismissed
// (lib/ios-install-hint). Dismissal persists in localStorage — it never reappears once closed.
export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standaloneNav = (navigator as Navigator & { standalone?: boolean }).standalone;
    const eligible =
      isIOSSafari(navigator.userAgent, navigator.maxTouchPoints) &&
      !isStandaloneDisplay(
        standaloneNav,
        window.matchMedia('(display-mode: standalone)').matches
      ) &&
      !hasDismissedInstallHint(window.localStorage);
    setVisible(eligible);
  }, []);

  const dismiss = () => {
    dismissInstallHint(window.localStorage);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Install this app"
          className="fixed inset-x-3 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-[13px]"
          style={{
            bottom: 'max(env(safe-area-inset-bottom), 12px)',
            color: uiTokens.textSecondary,
            background: `linear-gradient(180deg, #131a2b 0%, ${uiTokens.bg} 100%)`,
            border: `1px solid ${uiTokens.surfaceChipHover}`,
            boxShadow: `0 8px 32px ${uiTokens.scrimLight}`,
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
          <span className="min-w-0 flex-1">
            Install Depth: tap <span className="font-semibold">Share</span>{' '}
            <span aria-hidden="true">⎋</span>, then{' '}
            <span className="font-semibold">Add to Home Screen</span>.
          </span>
          <IconButton
            icon={<X size={16} color={uiTokens.textSecondary} />}
            variant="plain"
            size="sm"
            onClick={dismiss}
            ariaLabel="Dismiss install hint"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
