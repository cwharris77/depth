import type { ReactNode } from 'react';
import { colors as uiTokens, typeScale } from '@/components/ui/tokens';

// Shared building blocks for the static long-form pages (/privacy, /terms, /support).
// Those three pages are the only long-form prose in the app and had identical structure —
// a bold heading over a muted body — repeated once per section in each file, along with the
// same untokenized body color. That is the copy-pasted-structure regression AGENTS.md §4
// #17 names, and it scales badly: the privacy policy alone runs to ~18 sections.
//
// The body color below is deliberately the value these pages already shipped (#c5cbd8),
// not a token: it sits between `textSecondary` and `textMuted` and has no token of its own.
// Centralizing it here keeps rendering pixel-identical to what shipped while giving the
// eventual tokenization a single place to land.
const PROSE_BODY_COLOR = '#c5cbd8';

export function ProseBody({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-4 leading-relaxed"
      style={{ color: PROSE_BODY_COLOR, fontSize: typeScale.title }}>
      {children}
    </div>
  );
}

// Children rather than a `body` string so a section can carry links, lists, and emphasis
// without needing a second variant.
export function ProseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 font-bold" style={{ color: uiTokens.textPrimary }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function ProseList({ children }: { children: ReactNode }) {
  return <ul className="m-0 mt-1 flex list-disc flex-col gap-1 pl-5">{children}</ul>;
}
