// Shared design tokens for components/ui/ primitives — the depth design system's foundation.
// Values are the app's existing UI-chrome palette, extracted as-is from where they're already
// used (AccountView.tsx, NavDrawer.tsx, PlayerCard.tsx, etc.) rather than newly chosen, so
// primitives stay visually consistent with the rest of the app. Distinct from the brand
// primary/secondary/accent and curated uiAccent/onAccent team colors in lib/utils/colors.ts — see
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
  panelGradient: 'linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)',
  surfaceRaised: 'rgba(255,255,255,0.05)', // faint raised fill (rows, subtle cards)
  surfaceInput: 'rgba(255,255,255,0.06)',
  surfaceChip: 'rgba(255,255,255,0.07)',
  surfaceChipHover: 'rgba(255,255,255,0.12)',
  surfaceNavy: 'rgba(0,34,68,0.8)',
  surfaceMenu: '#161c2c', // opaque popover/menu background (field overflow menu)
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.10)', // heavier hairline (menu edge, dividers)
  borderInput: 'rgba(255,255,255,0.14)',
  borderDrawer: '#222b3d',
  statusBackup: '#A5ACAF',
  statusRookie: '#4fc3f7',
  statusInjured: '#ef5350',
  scrim: 'rgba(0,0,0,0.6)',
  scrimLight: 'rgba(0,0,0,0.5)',
  focusRing: 'rgba(105,190,40,0.3)',
  shadowThumb: '0 1px 2px rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.2)', // Toggle's raised thumb
} as const;

// The app's one small text scale. Every sub-body-size font size in UI chrome must come
// from here — a bare arbitrary font-size utility is a judgment call per component, which
// is exactly how near-identical pills ended up disagreeing (SegmentedControl 9px vs
// FilterPill 12px). These five steps cover every recurring small size in the codebase
// (9–13px, verified by sweep); anything smaller (8/8.5px) or larger (16px+ display
// numerals) is an intentional per-container one-off and deliberately not part of the
// scale. Same-purpose text always uses the same token: every pill (FilterPill,
// SegmentedControl, Badge position/tag) renders at `body`; section/stat/meta labels at
// `caption`; tabs and tooltips at `label`; emphasized labels (Badge status) at `title`.
// Components apply a token as an inline `fontSize` (mirroring how `colors`/`zIndex` are
// consumed) so the classname stays free of arbitrary values.
export const typeScale = {
  micro: '9px', // smallest text — overlines, compact micro-labels
  caption: '10px', // section labels, stat headers, menu meta
  label: '11px', // default small UI labels — tabs, tooltips
  body: '12px', // standard body text — menu items, pills, coachmarks
  title: '13px', // emphasized labels — badge status
} as const;

// The app's one stacking-order scale. Every z-index in the app must come from here —
// a hardcoded number (inline `zIndex:` or a Tailwind `z-*` class) is an ESLint error
// (see the no-restricted-syntax rules in eslint.config.js) precisely because a value
// picked in isolation, without checking what else it needs to clear, is how the field's
// overflow menu once ended up tied with (and losing to) the player dots it's supposed to
// float above. Add a new tier here — never a bare number at the call site — and the
// lint rule extends to it automatically.
export const springSheet = { type: 'spring', stiffness: 360, damping: 38 } as const;

export const zIndex = {
  dot: 10, // resting player dot (DepthChartField)
  dotSelected: 20, // selected player dot, raised above resting dots
  popover: 30, // anchored popovers: field overflow menu, Tooltip, Coachmark
  overlayBackdrop: 40, // sheet/modal dimmed backdrop
  overlayPanel: 50, // sheet/modal panel content, nav drawer, install-hint toast
} as const;
