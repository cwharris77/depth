import type { ReactNode } from 'react';
import { colors } from './tokens';

type CardProps = {
  children: ReactNode;
  padding?: number;
  dense?: boolean;
  className?: string;
};

// Generic surface panel — the settings card, privacy-link row, and nested list
// backgrounds all use this fill/border/radius combo at different densities.
export default function Card({ children, padding = 16, dense, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-3xl ${className}`}
      style={{
        background: dense ? colors.surfaceCard2 : colors.surfaceCard,
        border: `1px solid ${dense ? colors.borderSubtle : colors.borderDefault}`,
        padding,
      }}>
      {children}
    </div>
  );
}
