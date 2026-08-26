'use client';

import { X } from 'lucide-react';
import IconButton from './IconButton';
import { colors as uiTokens } from './tokens';

// The app's one dismiss ("X") control — every sheet, drawer, panel, and toast closes
// through here. Five hand-rolled copies of the same IconButton+X pair had drifted into
// two sizes (SheetHeader's 16px glyph vs 18px everywhere else) and two tints (textMuted
// vs textSecondary) with no reason for either split, so a restyle meant hunting down
// each instance. This fixes the glyph, tint, and default size on top of IconButton's
// 'ghost' variant; `size` exists only for the inline-toast case (IOSInstallHint), where
// a 36px circle would blow out the pill it sits in.
type CloseButtonProps = {
  onClick: () => void;
  /** Overridden only where "Close" is ambiguous about *what* closes (nav drawer, player card). */
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export default function CloseButton({
  onClick,
  ariaLabel = 'Close',
  size = 'md',
  className,
}: CloseButtonProps) {
  return (
    <IconButton
      icon={<X size={size === 'sm' ? 16 : 18} color={uiTokens.textMuted} />}
      variant="ghost"
      size={size}
      onClick={onClick}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
