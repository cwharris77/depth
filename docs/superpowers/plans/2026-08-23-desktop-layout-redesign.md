# Desktop Layout Redesign

**User scope:** Whole pass for desktop — widen the layout, enrich the field, and fill the aside with meaningful content across every route.

**Anchor points:**
- `components/TeamPageShell.tsx:48` — current xl grid definition
- `components/TeamRail.tsx:3` — desktop-only left rail
- `components/PlayerCard.tsx:3` — mobile sheet / desktop docked aside
- `components/DepthChartField.tsx:45` — desktop aside wiring
- `components/CompareView.tsx` — two-column compare (no aside)
- `components/UniformArchive.tsx` — two-column archive (no aside)
- `DESIGN.md` — visual system, tokens, typography

---

## 1. Surface and Purpose

The entire desktop web experience at the `xl` breakpoint (≥1280 px). Currently a three-column grid (232 px rail · fluid main · 348 px aside, capped at 1600 px) with the aside only occupied by a docked player card. The centered-column cap is an interim state — the real "use the space" pass has not been done. This brief designs the full desktop layout across all routes: `/team/[id]`, `/uniforms`, `/compare`, and the home/settings/support pages.

The desktop experience must feel like a **broadcast booth** — dense, authoritative, information-rich — not a blown-up mobile layout.

## 2. Target Users and Primary Tasks

Cooper (daily power user) and NFL fans on wide screens. Primary tasks:

- **Browse a roster** — scan the field, compare players at a glance, spot injury status without tapping
- **Compare teams** — see two rosters side-by-side or offense vs. defense simultaneously
- **Browse the uniform archive** — see more kits at once, filter by era/division without scrolling
- **Switch teams fast** — the rail is always visible; the field updates instantly

The desktop user has screen space. Every pixel of that space should carry information or reduce friction.

## 3. Success Criteria

- At 1920 px width, the layout uses at least 80% of horizontal space (no wasteful centering)
- Player dots show position + name + status (injury/rookie) at a glance without tapping
- The aside panel shows contextual content on every route (not just a player card)
- The compare view shows both teams simultaneously without switching tabs
- The uniform archive shows 3+ columns of kits at xl without scrolling
- Navigation from rail → field → aside takes zero clicks for common tasks
- Mobile experience (`< xl`) is completely unaffected

## 4. Scope and Constraints

### In scope

- TeamPageShell grid restructure (column widths, max-width removal)
- Field enrichment (player dot labels, status indicators at xl)
- Aside panel content for each route (player card for roster, team snapshot for schedule, PF/PA trend for stats, comparison preview for compare)
- CompareView desktop layout (side-by-side team panels in the aside or expanded main)
- UniformArchive desktop grid (3–4 column layout at xl)
- Home page and other pages getting proper desktop treatment

### Out of scope

- Mobile layout changes (mobile web and iOS will be separate tickets)
- New features or data sources
- Visual redesign of the field, dots, or player card content
- Changes to the design system tokens or typography

### Binding constraints

- The rail stays at 232 px (established in DESIGN.md)
- Team colors remain per-team accents, not global
- No new API calls — all data is already available from the server components
- The `xl` breakpoint (1280 px) stays the single breakpoint
- Must remain a PWA — no native desktop features

## 5. Interaction and Data Model

### Field enrichment (xl only)

At xl, each player dot gains a label below it: `#number` + truncated name (8 chars max). The label uses `uiTokens.textMuted` at `typeScale.micro` (9 px). Injury status shows as a red dot overlay (same as current `status-injured` indicator but smaller). Rookie status shows as a blue dot overlay. These labels are **hidden** below xl to preserve the mobile dot-only experience.

### Aside panel content by route

| Route | Aside content | Behavior |
|-------|--------------|----------|
| `/team/[id]` (roster tab) | Docked PlayerCard (existing) | Opens on player tap, closes on field tap |
| `/team/[id]` (schedule tab) | Team snapshot: next game, record, streak | Always visible (not empty when no player selected) |
| `/team/[id]` (stats tab) | Season stats summary: PF/PA, top performers | Always visible |
| `/compare` | Second team's depth chart or position breakdown | Always visible when two teams selected |
| `/uniforms` | Team detail panel: full kit list for selected team | Opens on kit tap |
| `/` (home) | Last viewed team's roster in aside | Persistent on desktop |

### Compare view desktop layout

On desktop, the compare view uses the full main column for the comparison table/grid. The aside shows the second team's depth chart for the currently selected position, so users can see both rosters without switching views. The segmented control (Matchup / By-position) stays in the main column header.

### Uniform archive desktop grid

At xl, the archive shifts from a 1-column mobile scroll to a 3-column grid of team sections. Each team section shows its kits in a 2×N sub-grid. Division headers span the full width. The rail provides navigation (no change needed there).

## 6. States

- **Default (no player selected):** Aside shows route-specific persistent content (team snapshot, stats summary, or comparison preview). No empty right column.
- **Player selected (roster tab):** Aside transitions from persistent content to PlayerCard. Smooth crossfade or slide.
- **Player selected (other tabs):** Aside stays at route-specific content. Player card opens as a modal/overlay instead of replacing aside content.
- **No team selected (uniforms, compare):** Rail shows without active team highlight. Aside shows archive detail or comparison content.
- **Narrow desktop (1280–1440 px):** Aside may collapse to 300 px. Field labels remain visible but may truncate more aggressively.
- **Ultra-wide (≥ 2400 px):** Layout centers at max 1920 px (remove the 1600 px cap). No edge-to-edge stretching beyond this.

## 7. Non-Goals

- **Mobile layout changes** — separate tickets for mobile web and iOS
- **New data sources or API changes** — everything needed is already in the server components
- **Visual redesign** — this is a layout pass, not a brand refresh
- **New features** — no new tabs, no new views, no new interactive elements beyond what's described
- **Accessibility overhaul** — a11y improvements are welcome but not the focus of this pass
- **Performance optimization** — the existing data loading strategy (server components, batched queries) stays as-is
