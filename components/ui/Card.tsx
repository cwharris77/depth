import { cn } from '@/lib/class-names';
import type { ReactNode } from 'react';
import { colors } from './tokens';

type CardProps = {
  children: ReactNode;
  dense?: boolean;
  className?: string;
};

// Generic surface panel — the settings card, privacy-link row, and nested list
// backgrounds all use this fill/border/radius combo at different densities. Padding is
// Tailwind via `className` (default `p-4`, matching the old `padding={16}` default) —
// Card never takes raw pixel padding (audit 2026-08-11 #18).
export default function Card({ children, dense, className = '' }: CardProps) {
  return (
    <div
      className={cn('rounded-3xl p-4', className)}
      style={{
        background: dense ? colors.surfaceCard2 : colors.surfaceCard,
        border: `1px solid ${dense ? colors.borderSubtle : colors.borderDefault}`,
      }}>
      {children}
    </div>
  );
}
