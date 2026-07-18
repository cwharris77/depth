// Shared design tokens for components/ui/ primitives — the depth design system's foundation.
// Values are the app's existing UI-chrome palette, extracted as-is from where they're already
// used (AccountView.tsx, NavDrawer.tsx, PlayerCard.tsx, etc.) rather than newly chosen, so
// primitives stay visually consistent with the rest of the app. Distinct from the brand
// primary/secondary/accent and curated uiAccent/onAccent team colors in lib/colors.ts — see
// AGENTS.md invariant 4; these are UI chrome only, never team-specific. Mirrors
// tokens/colors.css in the Depth Design System (claude.ai/design project df062d5f), which was
// reverse-extracted from this same codebase — code here remains the ground truth.
export const colors = {
  bg: '#0a0e1a',
  bgFilterbar: '#0d1220',
  bgDrawer: '#0d1320',
  textPrimary: '#f0f4ff',
  textSecondary: '#dfe5f0',
  textMuted: '#A5ACAF',
  textFaint: '#7d848c',
  textFaintest: '#5a616a',
  accent: '#69BE28',
  onAccent: '#0a0e1a',
  danger: '#ff6b6b',
  dangerOn: '#2a0e0e',
  surfaceCard: '#0f1623',
  surfaceCard2: 'rgba(255,255,255,0.03)',
  surfaceInput: 'rgba(255,255,255,0.06)',
  surfaceChip: 'rgba(255,255,255,0.07)',
  surfaceChipHover: 'rgba(255,255,255,0.12)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderInput: 'rgba(255,255,255,0.14)',
  borderDrawer: '#222b3d',
  statusBackup: '#A5ACAF',
  statusRookie: '#4fc3f7',
  statusInjured: '#ef5350',
  scrim: 'rgba(0,0,0,0.6)',
  scrimLight: 'rgba(0,0,0,0.5)',
  focusRing: 'rgba(105,190,40,0.3)',
} as const;
