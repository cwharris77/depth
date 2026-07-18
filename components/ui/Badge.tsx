import type { ReactNode } from 'react';
import { colors } from './tokens';

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
}: BadgeProps) {
  if (kind === 'status' && status) {
    return (
      <span
        className="text-[13px] font-bold"
        style={{ color: status === 'starter' ? accent : STATUS_COLORS[status] }}>
        {STATUS_LABELS[status]}
      </span>
    );
  }
  if (kind === 'tag') {
    return (
      <span
        className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold"
        style={{ color: accent, background: `${accent}1a`, border: `1px solid ${accent}55` }}>
        {children}
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ color: accent, background: 'rgba(0,34,68,0.8)', border: `1px solid ${accent}66` }}>
      {children}
    </span>
  );
}
