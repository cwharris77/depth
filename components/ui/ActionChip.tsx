import type { ReactNode } from 'react';
import { withAlpha } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { typeScale } from './tokens';

type ActionChipProps = {
  icon: ReactNode;
  label: ReactNode;
  onClick: () => void;
  accent: string;
  className?: string;
};

// Small accent-tinted pill button with a leading icon — a status/action chip like
// "Custom order · Reset all" or "2022 season · Back to today". Extracted from
// DepthChartField's FieldHeader, where two byte-identical chips shared this markup.
export default function ActionChip({ icon, label, onClick, accent, className }: ActionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex items-center gap-1 font-bold px-2 py-1 rounded-full', className)}
      style={{
        color: accent,
        background: withAlpha(accent, 10),
        border: `1px solid ${withAlpha(accent, 33)}`,
        fontSize: typeScale.caption,
        width: 'fit-content',
        touchAction: 'manipulation',
      }}>
      {icon} {label}
    </button>
  );
}
