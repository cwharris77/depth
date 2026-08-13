import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { colors } from './tokens';
import { withAlpha } from '@/lib/colors';

type Status = 'starter' | 'backup' | 'rookie' | 'injured';
type Kind = 'position' | 'status' | 'tag';

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
  kind?: Kind;
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
  kind = 'position',
  status,
  accent = colors.accent,
  children,
  className,
}: BadgeProps) {
  if (kind === 'status' && status) {
    return (
      <span
        className={cn('text-[13px] font-bold', className)}
        style={{ color: status === 'starter' ? accent : STATUS_COLORS[status] }}>
        {STATUS_LABELS[status]}
      </span>
    );
  }
  if (kind === 'tag') {
    return (
      <span
        className={cn('inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold', className)}
        style={{
          color: accent,
          background: withAlpha(accent, 10),
          border: `1px solid ${withAlpha(accent, 33)}`,
        }}>
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 text-xs font-bold', className)}
      style={{
        color: accent,
        background: colors.surfaceNavy,
        border: `1px solid ${withAlpha(accent, 40)}`,
      }}>
      {children}
    </span>
  );
}
