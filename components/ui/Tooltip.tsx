'use client';

import { Popover } from '@base-ui/react/popover';
import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { colors } from './tokens';

type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

// Explanatory bubble for a single trigger element, e.g. "why is this control unavailable."
// Built on Base UI's Popover (not its Tooltip) with openOnHover layered on top of the
// Trigger's default click behavior: Base UI's own docs flag Tooltip as hover-only and
// disabled on touch by design (touch has no hover to detect), and recommend Popover +
// openOnHover for anything a touch user needs to see. depth is primarily used installed on
// iOS, so a hover-only tooltip would never surface for most users -- this gives one
// primitive that opens on hover on desktop and on tap on touch. `children` must be a single
// element (typically a button) -- Popover.Trigger clones it via the `render` prop rather
// than wrapping it, so no extra DOM node is introduced around the trigger.
export default function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger render={children} openOnHover delay={300} closeDelay={100} />
      <Popover.Portal>
        <Popover.Positioner side={side} sideOffset={8} className="z-20">
          <Popover.Popup
            className="max-w-[220px] rounded-xl px-3 py-2 text-[11px] font-medium leading-snug"
            style={{
              color: colors.textPrimary,
              background: colors.surfaceMenu,
              border: `1px solid ${colors.borderStrong}`,
              boxShadow: `0 8px 24px ${colors.scrimLight}`,
            }}>
            {content}
            <Popover.Arrow
              className={(state) =>
                cn(
                  'h-2 w-2 rotate-45 border-0',
                  state.side === 'top' && 'border-b border-r',
                  state.side === 'bottom' && 'border-l border-t',
                  state.side === 'left' && 'border-r border-t',
                  state.side === 'right' && 'border-b border-l'
                )
              }
              style={{ background: colors.surfaceMenu, borderColor: colors.borderStrong }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
