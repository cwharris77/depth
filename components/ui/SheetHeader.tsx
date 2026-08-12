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
      {title ? (
        <h2 className="text-base font-black" style={{ color: uiTokens.textPrimary }}>
          {title}
        </h2>
      ) : null}
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
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
