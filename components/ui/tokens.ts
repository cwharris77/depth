// Shared design tokens for components/ui/ primitives — the depth design system's foundation
// (first primitive: OtpInput.tsx). Values are the app's existing UI-chrome palette, extracted
// as-is from where they're already used (AccountView.tsx, NavDrawer.tsx) rather than newly
// chosen, so primitives stay visually consistent with the rest of the app. Distinct from the
// brand primary/secondary/accent and curated uiAccent/onAccent team colors in lib/colors.ts —
// see AGENTS.md invariant 4; these are UI chrome only, never team-specific.
export const colors = {
  textPrimary: '#f0f4ff',
  textMuted: '#A5ACAF',
  accent: '#69BE28',
  danger: '#ff6b6b',
  surfaceInput: 'rgba(255,255,255,0.06)',
  borderInput: 'rgba(255,255,255,0.14)',
  focusRing: 'rgba(105,190,40,0.3)',
} as const;
