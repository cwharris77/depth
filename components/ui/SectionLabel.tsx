import type { ReactNode } from 'react';
import { colors } from './tokens';

// Caps micro-header that labels a section/group (e.g. "NFC EAST", "SETTINGS"). Muted,
// letter-spaced, uppercase-by-content. Repeated verbatim across nav/account/field/static
// surfaces — the one place its size and color are defined. Caller supplies padding via
// className where the default (px-5 py-2) doesn't fit.
export default function SectionLabel({
  children,
  className = 'px-5 py-2',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[10px] font-semibold tracking-widest ${className}`}
      style={{ color: colors.textMuted }}>
      {children}
    </div>
  );
}
