'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { colors } from './tokens';

type MenuItem = { label: ReactNode; icon?: ReactNode; onClick: () => void };

// Anchored "•••" overflow menu: a trigger button toggling a right-aligned popover of
// items, dismissed on outside-click or item select. Presentational — callers pass the
// trigger glyph and item handlers. Used by the field's uniform/share overflow.
export default function Menu({
  ariaLabel,
  trigger,
  items,
}: {
  ariaLabel: string;
  trigger: ReactNode;
  items: MenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div className="relative pb-2.5" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center px-1"
        style={{ touchAction: 'manipulation', color: colors.textMuted }}>
        {trigger}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
          style={{
            background: colors.surfaceMenu,
            border: `1px solid ${colors.borderStrong}`,
            minWidth: 168,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap"
              style={{
                color: colors.textPrimary,
                borderTop: i > 0 ? `1px solid ${colors.borderDefault}` : undefined,
                touchAction: 'manipulation',
              }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
