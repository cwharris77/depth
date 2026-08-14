import { cn } from '@/lib/class-names';
import type { ReactNode } from 'react';
import { colors, typeScale } from './tokens';
import { withAlpha } from '@/lib/utils/colors';
import type { Intent } from './variants';

type Status = 'starter' | 'backup' | 'rookie' | 'injured';
// Badge's content-type subset of the shared vocabulary (variants.ts) — what the badge says.
type Variant = Extract<Intent, 'position' | 'status' | 'tag'>;

const STATUS_COLORS: Record<Status, string> = {
  starter: colors.accent,
  backup: colors.statusBackup,
  rookie: colors.statusRookie,
  injured: colors.statusInjured,
};
const STATUS_LABELS: Record<Status, string> = {
  starter: 'STARTER',
  backup: 'BACKUP',
  rookie: 'ROOKIE',
  injured: 'INJURED',
};

type BadgeProps = {
  variant?: Variant;
  status?: Status;
  accent?: string;
  children?: ReactNode;
  className?: string;
};

// Three small label styles used across player/roster surfaces:
// - 'position': pill for a position code (QB, WR…) — dark navy fill, accent border+text.
// - 'status': plain bold text (no bg) colored per player status (starter/backup/rookie/injured).
//   For 'starter', pass the team's uiAccent as `accent` — status color falls back to it.
// - 'tag': the small filled/outlined pill for meta flags like "CUSTOM" or a depth badge.
export default function Badge({
  variant = 'position',
  status,
  accent = colors.accent,
  children,
  className,
}: BadgeProps) {
  if (variant === 'status' && status) {
    return (
      <span
        className={cn('font-bold', className)}
        style={{
          color: status === 'starter' ? accent : STATUS_COLORS[status],
          fontSize: typeScale.title,
        }}>
        {STATUS_LABELS[status]}
      </span>
    );
  }
  if (variant === 'tag') {
    return (
      <span
        className={cn('inline-block rounded-full px-1.5 py-0.5 font-bold', className)}
        style={{
          color: accent,
          background: withAlpha(accent, 10),
          border: `1px solid ${withAlpha(accent, 33)}`,
          fontSize: typeScale.body,
        }}>
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 font-bold', className)}
      style={{
        color: accent,
        background: colors.surfaceNavy,
        border: `1px solid ${withAlpha(accent, 40)}`,
        fontSize: typeScale.body,
      }}>
      {children}
    </span>
  );
}
