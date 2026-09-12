'use client';

import { cn } from '@/lib/class-names';
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Tooltip from './Tooltip';
import { colors, typeScale, zIndex } from './tokens';

type MenuItem = {
  // Stable React reconciliation key (DEP-187): lets the menu reorder/remove items
  // without index-keyed row identity breaking focus or the a11y tree. Falls back to
  // the label text when the caller supplies no id -- callers with dynamic labels can
  // pass an id to keep the row stable across label changes.
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  checked?: boolean;
  accent?: string;
  // Renders a role="separator" row above this item (DEP-187). Dividers are item
  // metadata so they survive reorder/removal, replacing the old positional
  // borderTop-on-every-row styling that misbehaved when the first item was removed.
  divider?: boolean;
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
// items, dismissed on outside-click, Escape, or item select. Menu-button semantics
// (DEP-187): the popup carries role="menu", ArrowDown/ArrowUp move focus between items
// (skipping disabled rows, wrapping), Home/End jump to first/last, and Escape or an item
// selection restore focus to the trigger. Presentational — callers pass the trigger
// glyph and item handlers. Used by the field's uniform/share overflow. An item with
// `checked` set renders as a menuitemcheckbox (trailing filled dot when on) for on/off
// actions like "Edit depth chart" that live in the menu instead of their own row.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // ArrowUp on the trigger opens with focus on the last item (APG menu button); an
  // ArrowDown open or any click-open lands on the first.
  const focusLastOnOpen = useRef(false);
  const menuId = useId();
  // Legitimate effect: the open menu's interaction contract is DOM-level -- a document
  // mousedown for click-outside, a document keydown for arrow/Escape navigation that
  // must work regardless of which item holds focus, and imperative focus-on-open that
  // can only run after the popup mounts -- with no derived-render equivalent for any
  // of the three, so they share one effect scoped to the menu being open.
  useEffect(() => {
    if (!open) return;
    const popup = popupRef.current;
    const enabledItems = () => {
      if (!popup) return [];
      // Disabled rows stay focusable (the Tooltip wrapper needs live pointer/focus
      // events, unlike a native disabled attribute), so keyboard navigation filters
      // them out of the focus sequence instead.
      return Array.from(
        popup.querySelectorAll<HTMLButtonElement>('[role="menuitem"], [role="menuitemcheckbox"]')
      ).filter((el) => el.getAttribute('aria-disabled') !== 'true');
    };
    const items = enabledItems();
    const target = focusLastOnOpen.current ? items[items.length - 1] : items[0];
    focusLastOnOpen.current = false;
    target?.focus();
    const onDown = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const index = document.activeElement
        ? enabledItems().indexOf(document.activeElement as HTMLButtonElement)
        : -1;
      const list = enabledItems();
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          (index === -1 ? list[0] : list[(index + 1) % list.length])?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          (index === -1
            ? list[list.length - 1]
            : list[(index - 1 + list.length) % list.length]
          )?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          list[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          list[list.length - 1]?.focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        }
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
  const selectItem = (item: MenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    // Menu-button semantics: the trigger regains focus after a selection, whether it
    // was made by mouse or keyboard (DEP-187).
    triggerRef.current?.focus();
    item.onClick();
  };
  return (
    <div className={cn('relative pb-2.5', className)} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // Only meaningful while closed: an open menu's arrow keys are handled by the
          // popup's document keydown listener, and Enter/Space toggle natively.
          if (open) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            focusLastOnOpen.current = e.key === 'ArrowUp';
            setOpen(true);
          }
        }}
        className="flex items-center justify-center px-1"
        style={{ touchAction: 'manipulation', color: colors.textMuted }}>
        {trigger}
      </button>
      {open && (
        <div
          ref={popupRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: colors.surfaceMenu,
            border: `1px solid ${colors.borderStrong}`,
            minWidth: 168,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: zIndex.popover,
          }}>
          {items.map((item, i) => {
            // Stable reconciliation key: the caller's id when given, else the label
            // text, and never the array index (DEP-187). `menu-item-${i}` is the
            // last-resort key for a non-string label that has no id -- callers that
            // reorder dynamically should pass an id instead.
            const key = item.id ?? (typeof item.label === 'string' ? item.label : `menu-item-${i}`);
            const row = (
              <button
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked}
                aria-disabled={item.disabled || undefined}
                onClick={() => selectItem(item)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                style={{
                  color: item.disabled ? colors.textFaint : colors.textPrimary,
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
            return (
              <Fragment key={key}>
                {item.divider && (
                  <div
                    role="separator"
                    className="w-full"
                    style={{ borderTop: `1px solid ${colors.borderDefault}` }}
                  />
                )}
                {item.disabled && item.disabledReason ? (
                  <Tooltip content={item.disabledReason} side="left">
                    {row}
                  </Tooltip>
                ) : (
                  row
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
