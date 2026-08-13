// Dialog focus trap for PlayerCard's mobile bottom sheet (the docked variant sits
// beside the field, not over it, so it isn't a modal and never traps focus). On
// activation: captures the trigger element for restore, focuses the panel's first
// focusable element, and wraps Tab/Shift+Tab between first/last focusables while
// Escape closes. Legitimate effect: focus management is a DOM mutation with no
// derived-render equivalent.
import { useEffect, useRef, type RefObject } from 'react';

export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  active: boolean,
  activeKey: string | undefined,
  onClose: () => void
) {
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel
      ? Array.from(
          panel.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')
        )
      : [];
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocus.current?.focus();
    };
    // activeKey (player id) intentionally retriggers the trap on player switch
    // even though it isn't read in the effect body.
  }, [active, activeKey, onClose, panelRef]);
}
