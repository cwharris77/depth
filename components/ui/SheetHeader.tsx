'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import IconButton from './IconButton';
import { colors as uiTokens } from './tokens';

interface SheetHeaderProps {
  title?: string;
  onClose: () => void;
  children?: ReactNode;
}

export default function SheetHeader({ title, onClose, children }: SheetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2" style={{ flex: '0 0 auto' }}>
      {/* Always two flex children (this group + the close button), even when title and
          children are both absent (FormationsSheet's case) -- otherwise justify-between
          with a single remaining child (the button) places it at the flex-start, not
          the end, per the CSS spec. */}
      <div className="flex items-center gap-2">
        {title ? (
          <h2 className="text-base font-black" style={{ color: uiTokens.textPrimary }}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
      <IconButton
        icon={<X size={16} color={uiTokens.textMuted} />}
        variant="plain"
        size="sm"
        onClick={onClose}
        ariaLabel="Close"
      />
    </div>
  );
}
