# Left navigation drawer — design

Date: 2026-07-08
Status: approved (design)
Roadmap: addresses the recurring "navigation as the app grows" / "design pass on navigation"
items ([[Ideas]]). Not a numbered phase — an IA refactor that unblocks adding views (uniform
archive now; compare/coaches/draft-boards later) without further crowding the team header.

## Problem

The team-page header (`components/DepthChartField.tsx`) mixes primary navigation with
contextual actions: wordmark, team-switcher pill, search, uniform picker, uniform archive
link, share. At 390px it's overloaded, and every new view (Phase E) would add another icon.

## Research (informs the decision, not relitigated)

Mobile IA research is consistent: hidden navigation hurts discoverability (Nielsen Norman:
hidden menus cut task completion ~21%); do **not** hide *primary* navigation. Recommended
pattern is hybrid — persistent primary destinations + a drawer for secondary/growing items.
So: keep the team switcher (the app's core interaction) visible; move *global* navigation into
a logo-triggered left drawer that can grow.

## Locked decisions

| Decision | Choice |
|---|---|
| Trigger | The header wordmark/logo (top-left) opens the drawer; it gains a `ti-menu`-style affordance. |
| Drawer contents (v1) | **Depth charts** → `/` (home; resolves to saved/default team). **Uniform archive** → `/uniforms`, shown only when `showUniformArchive` is true (same gate as the header icon). No Settings/About (no content yet). Future views (Compare, …) are added here as they ship. |
| Header after | Keeps: logo (drawer trigger), switcher pill, **search**, uniform picker (unchanged, flag-gated), share. **Removes** the standalone archive icon (now in the drawer). |
| Width | Responsive: `min(82vw, 320px)`. |
| Dismissal + a11y | Scrim (tap to close) + Esc + a close button. On open, move focus into the drawer and trap it; on close, restore focus to the trigger. `role="dialog"`, `aria-modal`, labelled. Body scroll locked while open. |
| Motion | Slide in from the left + scrim fade; respects `prefers-reduced-motion` (no transform animation, just show). |
| Theming | Active item + affordance tint use the current team's `uiAccent` (threaded like the picker), consistent with the rest of the header. |
| Scope | v1 puts the drawer on the **team page** (the crowded header). The archive page keeps its existing "← DEPTH" back link. Promoting the header+drawer into a shared app shell (so every view shares one nav) is a follow-up once there are ≥3 views. |

## Components & files

- `components/NavDrawer.tsx` (new, client) — the drawer: scrim + panel, nav links, focus trap,
  Esc/scrim/close dismissal, reduced-motion aware. Props: `{ open, onClose, showUniformArchive, accent }`.
- `components/DepthChartField.tsx` — add `drawerOpen` state; make the logo a drawer trigger with
  a menu affordance; remove the archive `Link` from the right cluster; render `<NavDrawer>`.
- No new server wiring: `showUniformArchive` is already threaded to `DepthChartField` (depth#73).

## Tests

- No jsdom/RTL in this repo, so the interactive drawer is **verified live** (browser), not unit
  tested — consistent with the header/picker.
- Any pure logic that emerges (e.g. a `useFocusTrap`/`useBodyScrollLock` helper) gets colocated
  unit tests if it's worth testing; otherwise keep it in the component.
- Browser checklist: logo opens the drawer; Depth charts + (flag-on) Uniform archive navigate;
  scrim tap / Esc / close button all dismiss and restore focus to the logo; archive icon is gone
  from the header; 390px width holds; reduced-motion shows no slide.

## Out of scope

Shared app-shell refactor (header+drawer across all routes); swipe-to-close gesture (Esc/scrim/
button only in v1); Settings/About pages; folding search into the switcher (search stays a
header control per Cooper); the launch-flag flip itself.
