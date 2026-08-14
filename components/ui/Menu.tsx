'use client';

import { cn } from '@/lib/class-names';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Tooltip from './Tooltip';
import { colors, typeScale, zIndex } from './tokens';

type MenuItem = {
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  checked?: boolean;
  accent?: string;
  // A disabled item stays visible (dimmed, inert) instead of being omitted, with
  // disabledReason shown in a Tooltip on hover/tap explaining why -- e.g. "Edit depth
  // chart" while viewing a past season.
  disabled?: boolean;
  disabledReason?: ReactNode;
  // Trailing secondary text, e.g. the current selection preview for "Formations".
  // Mutually exclusive with `checked` in practice -- an item shows one trailing
  // indicator or the other, never both.
  meta?: ReactNode;
};

// Anchored "•••" overflow menu: a trigger button toggling a right-aligned popover of
// items, dismissed on outside-click or item select. Presentational — callers pass the
// trigger glyph and item handlers. Used by the field's uniform/share overflow. An item
// with `checked` set renders as a menuitemcheckbox (trailing filled dot when on) for
// on/off actions like "Edit depth chart" that live in the menu instead of their own row.
export default function Menu({
  ariaLabel,
  trigger,
  items,
  className,
}: {
  ariaLabel: string;
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Legitimate effect: subscribing to a document-level DOM event with no derived-render
  // equivalent.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div className={cn('relative pb-2.5', className)} ref={ref}>
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
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: colors.surfaceMenu,
            border: `1px solid ${colors.borderStrong}`,
            minWidth: 168,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: zIndex.popover,
          }}>
          {items.map((item, i) => {
            const row = (
              <button
                key={i}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick();
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                style={{
                  color: item.disabled ? colors.textFaint : colors.textPrimary,
                  borderTop: i > 0 ? `1px solid ${colors.borderDefault}` : undefined,
                  fontSize: typeScale.body,
                  touchAction: 'manipulation',
                }}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.meta && (
                  <span
                    className="font-semibold"
                    style={{ color: colors.textFaint, fontSize: typeScale.caption }}>
                    {item.meta}
                  </span>
                )}
                {item.checked && (
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ background: item.accent ?? colors.accent }}
                  />
                )}
              </button>
            );
            return item.disabled && item.disabledReason ? (
              <Tooltip key={i} content={item.disabledReason} side="left">
                {row}
              </Tooltip>
            ) : (
              row
            );
          })}
        </div>
      )}
    </div>
  );
}
