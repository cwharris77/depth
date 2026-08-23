---
name: depth
description: Interactive NFL depth chart viewer — rosters rendered as living formations on a broadcast-dark field
colors:
  bg: "#15161a"
  bg-page: "#0a0e1a"
  accent: "#6E8CAE"
  on-accent: "#15161a"
  text-primary: "#f0f4ff"
  text-secondary: "#dfe5f0"
  text-muted: "#A5ACAF"
  text-faint: "#7d848c"
  text-faintest: "#5a616a"
  danger: "#ff6b6b"
  danger-on: "#2a0e0e"
  surface-card: "#1a1e23"
  surface-card-dense: "rgba(255,255,255,0.03)"
  surface-raised: "rgba(255,255,255,0.05)"
  surface-input: "rgba(255,255,255,0.06)"
  surface-chip: "rgba(255,255,255,0.07)"
  surface-chip-hover: "rgba(255,255,255,0.12)"
  surface-navy: "rgba(30,32,38,0.8)"
  surface-menu: "#212434"
  border-subtle: "rgba(255,255,255,0.06)"
  border-default: "rgba(255,255,255,0.08)"
  border-strong: "rgba(255,255,255,0.10)"
  border-input: "rgba(255,255,255,0.14)"
  border-drawer: "#2d333d"
  field-green: "#2d5a1b"
  field-green-deep: "#1e3d10"
  field-line: "rgba(255,255,255,0.15)"
  scrimmage-blue: "#2d6fe0"
  status-rookie: "#4fc3f7"
  status-injured: "#ef5350"
  scrim: "rgba(0,0,0,0.6)"
  scrim-light: "rgba(0,0,0,0.5)"
  focus-ring: "rgba(110,140,174,0.3)"
typography:
  display:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "60px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: "1.25"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  label:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  caption:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 500
  micro:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 400
rounded:
  full: "9999px"
  card: "24px"
  track: "16px"
  control: "12px"
  control-sm: "8px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-inactive:
    backgroundColor: "{colors.surface-chip}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: depth

## Overview

**Creative North Star: "The Broadcast Booth"**

depth's visual language is a dark broadcast control room. The chrome stays quiet and consistent — charcoal surfaces, translucent white-alpha fills, hairline borders — so team color is always the loudest thing on screen. Every surface is built from a small set of translucent layers stacked on a near-black ground; depth comes from alpha values, not from paint or drop shadows.

The system is compact and instrument-panel dense. Text is small by design (the entire UI chrome type scale spans 9–13 px), borders are white alpha at 6–14%, and controls are pill-shaped with tight radii. The goal is to vanish: the field, the roster, the team identity — those are the content. The interface is a frame that earns its darkness by never competing with what it holds.

Mobile-first is the structural reality. The full layout is a single column with bottom-sheet navigation; only at the xl breakpoint (1280 px) does the page expand into a viewport-height three-column grid (team rail · content · context panel). Touch targets, hit-slop, and one-handed reach govern every interaction surface.

**Key Characteristics:**
- Two-tier color system: team brand colors for identity surfaces, curated legible accents for interactive content
- Translucent white-alpha surfaces and hairline borders instead of solid fills and drop shadows
- Compact micro type scale (9–13 px) with generous touch targets (44 pt minimum)
- Pill-shaped controls with fill-based state changes, never bouncy or decorative
- Dark-first with WCAG-AA-tested contrast on every curated color pair
- The field itself is the visual anchor: a green gradient with white-alpha yard lines and a blue scrimmage line

## Colors

The palette is a near-black chrome ramp accented by a single muted steel blue, with team color injected at runtime through a separate two-tier system (brand-true primaries on large surfaces, curated uiAccent pairs for legible text and interactive elements).

### Primary

- **Steel Blue** (#6E8CAE): The one interactive accent for UI chrome — input focus rings, active chips, button fills, toggle on-state, progress indicators. Its rarity is structural: it appears only on active or focused elements against the dark ground, never as decoration.
- **On Accent** (#15161a): Text and icon color when rendered on a Steel Blue fill.

### Tertiary

Signal colors that communicate status without competing with team color:

- **Danger** (#ff6b6b): Destructive actions — delete confirmation buttons, error states, injured-status badges. Its on-color is #2a0e0e.
- **Rookie Blue** (#4fc3f7): Roster status indicator for rookie players.
- **Injured Red** (#ef5350): Roster status indicator for injured players.

### Neutral

The chrome ramp — every surface, border, and text color in the UI, all built from near-black with subtle white-alpha layering:

- **Chrome Ground** (#15161a): Base for all UI chrome primitives (chips, inputs, cards, drawers). Distinct from the page ground.
- **Page Ground** (#0a0e1a): The deepest background — body, PWA chrome, mobile browser theme.
- **Surface Card** (#1a1e23): Cards and elevated panels.
- **Surface Card Dense** (rgba(255,255,255,0.03)): Dense/nested card variant.
- **Surface Raised** (rgba(255,255,255,0.05)): Faint fill for rows, subtle cards.
- **Surface Input** (rgba(255,255,255,0.06)): Input and select backgrounds.
- **Surface Chip** (rgba(255,255,255,0.07)): Inactive chips, icon button backgrounds.
- **Surface Chip Hover** (rgba(255,255,255,0.12)): Chip hover state.
- **Surface Navy** (rgba(30,32,38,0.8)): Opaque slate overlay — end zones, semi-transparent panels.
- **Surface Menu** (#212434): Popover and overflow menu background.
- **Text Primary** (#f0f4ff): Primary text on dark surfaces.
- **Text Secondary** (#dfe5f0): Secondary text — descriptions, inactive chips.
- **Text Muted** (#A5ACAF): Tertiary text — labels, captions, icon buttons at rest.
- **Text Faint** (#7d848c): Section headers, stat labels.
- **Text Faintest** (#5a616a): Overlines, micro-labels.
- **Border Subtle** (rgba(255,255,255,0.06)): Lightest hairline — dense cards.
- **Border Default** (rgba(255,255,255,0.08)): Standard card borders.
- **Border Strong** (rgba(255,255,255,0.10)): Dividers, menu edges, field yard lines.
- **Border Input** (rgba(255,255,255,0.14)): Input borders at rest.
- **Border Drawer** (#2d333d): Navigation drawer border.
- **Scrim** (rgba(0,0,0,0.6)): Modal backdrop.
- **Scrim Light** (rgba(0,0,0,0.5)): Player dot resting shadow.

Field and broadcast colors (not chrome — part of the field experience):

- **Field Green** (#2d5a1b): The field surface — gradient from deep to mid green.
- **Field Green Deep** (#1e3d10): Top/bottom edge of field gradient.
- **Field Line** (rgba(255,255,255,0.15)): Yard lines and hash marks.
- **Scrimmage Blue** (#2d6fe0): Line of scrimmage — solid blue, matching TV broadcast overlays.

### Named Rules

**The Two-Voice Rule.** Team brand colors (primary, secondary, accent) speak on identity surfaces — field tint, header band, dot fills, uniform panels. Curated legible accents (uiAccent, onAccent) speak on everything that must be read on dark. Never style interactive chrome with a raw brand hex; never paint identity surfaces with UI chrome gray.

**The Translucency Rule.** Depth on flat chrome comes from white-alpha fills layered on the charcoal ground (3% → 14% → navy 80%), not from solid color steps or drop shadows. Surfaces are differentiated by opacity, not by hue.

## Typography

**Display Font:** Geist Sans (system sans-serif fallback)
**Body Font:** Geist Sans (with Geist Mono available for monospaced contexts)
**Numeral Font:** Anton — used exclusively for uniform-figure jersey numerals and the ghost watermark, loaded as a Google Font.

**Character:** Compact and instrument-panel dense. The type scale is deliberately small (9–13 px for all chrome labels) because the content — field, roster, team identity — should dominate the visual hierarchy, not UI text.

### Hierarchy

- **Display** (900 weight, 60px, line-height 1, letter-spacing -0.03em): Ghost jersey number watermark in the player card — a giant translucent numeral behind the player identity. Used only in PlayerCardHeader.
- **Headline** (900 weight, 24px, line-height ~1.25, letter-spacing -0.01em): Player name in the card header. Tight tracking, high weight for impact at a moderate size.
- **Title** (700 weight, 13px): Emphasized labels — Badge status text.
- **Body** (400 weight, 12px): Standard chrome text — menu items, pills, coachmarks, chip labels.
- **Label** (600 weight, 11px): Default small UI labels — tabs, tooltips, active chip text.
- **Caption** (500 weight, 10px): Section labels, stat headers, menu meta text.
- **Micro** (400 weight, 9px): Smallest text — overlines, compact micro-labels.

### Named Rules

**The Five-Step Rule.** Every chrome label at or below 13 px takes one of the five scale steps (micro / caption / label / body / title). Same-purpose text always uses the same token — never pick an arbitrary size per component. This prevents near-identical pills from disagreeing on label size.

## Layout

Mobile-first single column is the structural default. Content fills the viewport width; padding and rhythm come from Tailwind spacing tokens (6 / 8 / 12 / 16 / 20 px steps). Card padding is 16 px; button padding is 12 px vertical × 20 px horizontal; chip padding is 6 px × 12 px.

At the xl breakpoint (≥1280 px), the team page transforms into a viewport-height three-column grid: 232 px team rail, fluid main content, optional 348 px context panel — capped at 1600 px total width. Below xl, the rail and panel are CSS-hidden (not removed from DOM) so the prerendered HTML is correct at every width with no JavaScript layout switch. The interim state for non-shell pages (loading skeletons, some sub-routes) uses a centered 720 px column.

Per-unit label visibility uses content-dependent breakpoints, not screen width alone: offense labels appear at ≥720 px (OL dots are shoulder-to-shoulder), defense at ≥520 px (more spread), special teams always visible (few dots, no collision). Labels are viewport-height-clamped (`clamp(6px, 1.1dvh, 8px)`) so they shrink ahead of colliding when the field's available height shrinks.

## Elevation & Depth

The system is nearly shadowless. Chrome is flat by default — depth is conveyed entirely through translucent white-alpha surfaces layered on the charcoal ground. Drop shadows are reserved for physically floating elements: player dots resting on the field (`0 2px 8px rgba(0,0,0,0.5)`), the toggle thumb (`0 1px 2px rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.2)`), and focus rings (`0 0 0 3px rgba(110,140,174,0.3)`). Overlays use a scrim (`rgba(0,0,0,0.6)`) rather than elevation.

The panel gradient (`linear-gradient(180deg, #1c1e24 0%, #15161a 100%)`) is used on both mobile bottom sheets and the desktop aside panel, creating a subtle vertical depth cue without a shadow.

### Shadow Vocabulary

- **Dot Rest** (`0 2px 8px rgba(0,0,0,0.5)`): Player dots on the field — establishes physical distance from the green surface.
- **Dot Selected** (`0 0 0 3px rgba(uiAccent, 0.4)`): Glowing halo around the selected player dot — structural, not decorative; communicates selection state at a glance.
- **Thumb** (`0 1px 2px rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.2)`): Toggle thumb — subtle lift to communicate the draggable affordance.
- **Focus Ring** (`0 0 0 3px rgba(110,140,174,0.3)`): Keyboard focus indicator on inputs and interactive elements — accent-tinted glow.

### Named Rules

**Shadow Means Floating.** A shadow is never decoration. It appears only on elements that are physically above another surface (dots on the field, thumb on the track, focus ring above the input). Chrome surfaces at rest are always flat.

## Shapes

Two shape families, governed by surface size: circles for small interactive elements, rounded rectangles for larger surfaces. Radius scales inversely with the surface it belongs to — the smaller the element, the rounder the corner.

**Circles** (rounded-full): Player dots (30 px), avatar frames, icon buttons (36 px), toggles (40 × 24 px), active chips, all badges, filter pills. Circles are the system's smallest interactive elements and share a single radius: fully round.

**Rounded rectangles**, decreasing by surface area:
- **Card** (24 px / rounded-3xl): Settings cards, player card container, nested list backgrounds.
- **Track** (16 px / rounded-2xl): Segmented control track, toggle track.
- **Control** (12 px / rounded-xl): Buttons (md), inputs, segmented control items (md).
- **Control-sm** (8 px / rounded-lg): Buttons (sm), segmented control items (sm).

**Borders** are always 1 px solid, always white alpha, differentiated by opacity not width:
- 6% — dense/nested surfaces
- 8% — standard card borders
- 10% — dividers, menu edges, field markings
- 14% — input borders (heavier to define the field)

### Named Rules

**The Hairline Rule.** Borders are always white alpha at 1 px. Emphasis is encoded in opacity (6% → 14%), never in width or color. A thicker border is a layout error.

## Components

### Buttons

Precise instrument controls — rare in this UI, used only for true actions (primary CTAs, destructive confirms, ghost closes). Fill-based state changes; no hover choreography.

- **Shape:** 12 px radius (md) / 8 px radius (sm)
- **Primary:** Steel Blue fill (#6E8CAE), on-accent text (#15161a), bold 14 px. Active = the fill itself.
- **Secondary:** Translucent white (6%) fill, secondary text, 14% white-alpha border. For cancel/alternative actions.
- **Ghost:** Transparent background, muted text. For close buttons, tertiary actions.
- **Danger:** Red fill (#ff6b6b), danger-on text (#2a0e0e). Destructive confirmation.
- **Danger-outline:** Transparent with 40% danger border. Open danger zone.
- **Disabled:** 60% opacity, default cursor. No visual affordance beyond the dimming.
- **Sizes:** md (px-5 py-3, 12 px vertical × 20 px horizontal), sm (px-3.5 py-2.5, 10 px × 14 px).

### Chips / Filter Pills

Full-round capsules for filtering and selection. Always in horizontally scrollable rows on mobile.

- **Active:** Accent fill (or team uiAccent on team-specific surfaces), on-accent text, semibold 12 px. No border.
- **Inactive:** White-alpha fill (7%), secondary text, regular weight 12 px. No border.
- **Hover:** Fill deepens to 12% white alpha.

### Segmented Control

Pill-tab group for switching between options (offense/defense/special, seasons, roster/schedule/stats).

- **Track:** White-alpha fill (7%), 16 px radius, 4 px internal padding, flex gap.
- **Item (md):** 12 px radius, 6 px × 10 px padding, bold 12 px.
- **Item (sm):** 8 px radius, 4 px × 8 px padding, bold 10 px.
- **Active:** Fill color (Steel Blue default, or team brand color via activeColor prop), on-accent text.
- **Inactive:** Transparent — text on the track fill.

### Card

Generic surface panel for settings, nested lists, and content containers.

- **Corner:** 24 px radius.
- **Background:** Surface card (#1a1e23); dense variant uses 3% white alpha.
- **Border:** 1 px solid, 8% white alpha (standard) or 6% (dense).
- **Padding:** 16 px default; tight variants apply via className.
- **Shadow:** None — flat surface, per Shadow Means Floating.

### Input

Single style text input — translucent fill, hairline border, glow focus.

- **Background:** Surface input (6% white alpha).
- **Border:** 1 px solid, 14% white alpha at rest; swaps to accent + glow on focus.
- **Radius:** 12 px.
- **Padding:** 12 px × 16 px.
- **Text:** 16 px (text-base), text-primary color.
- **Focus:** Border color shifts to accent; glow ring appears (`0 0 0 3px accent@30%`).
- **Placeholder:** Text-faint color (#7d848c).

### IconButton

Circular icon-only buttons for tight spaces (card header, sheet header, menu triggers).

- **Shape:** Fully round, 36 px (md) or 32 px (sm).
- **Background:** Surface chip (7% white alpha); active state fills to accent at 15%.
- **Border:** 1 px solid, accent at 25%.
- **Icon:** Lucide React, 18 px, muted color at rest; accent color when active.
- **Focus:** Follows Input's glow-ring pattern.

### Toggle

Switch control for boolean settings.

- **Track:** 40 × 24 px, fully round. On: accent fill. Off: navy (rgba(30,32,38,0.8)).
- **Thumb:** 20 px white circle, offset 2 px from edge. Raised with subtle shadow.
- **Transition:** Transform 150 ms ease-out (thumb slides 16 px), background-color 150 ms ease-out.
- **Focus:** Glow ring matching Input pattern.

### Badge

Small inline labels for position codes, roster status, and meta tags.

- **Position:** Full-round pill, accent fill, on-accent text, bold, tight padding. Identifies the player's position code.
- **Status:** Colored text only (no background), using semantic colors — rookie blue, injured red, or backup silver. Weight 500.
- **Tag:** Full-round pill, translucent fill, secondary text. For meta-flags (CUSTOM, HOME/AWAY, UPCOMING).

### PlayerDot (Signature)

The system's signature component — a 30 px circle representing one player on the football field. Every visual decision in this component reflects the design system's priorities: team identity first, chrome second, performance always.

- **Resting:** Team primary fill, 2 px team secondary ring, jersey number in 11 px bold white or near-black (via `readableTextOn` for contrast). Shadow: `0 2px 8px rgba(0,0,0,0.5)` for physical lift off the field.
- **Selected:** White ring, team uiAccent fill, jersey number in onAccent. Halo: `0 0 0 3px uiAccent@40%`. Scale animates to 1.18× via spring (stiffness 400, damping 28).
- **Hit area:** 30 px visual dot + 7 px padding = ~44 pt effective touch target, matching the HIG minimum.
- **Labels:** Position code in faint text, player last name in primary text (or uiAccent when selected). Breakpoint-gated per unit (offense ≥720 px, defense ≥520 px, special always). Viewport-height-clamped font sizes so labels shrink ahead of colliding.

### BottomSheet

Modal sheet for player cards and secondary views.

- **Animation:** Spring transition (stiffness 360, damping 38) via Framer Motion.
- **Background:** Panel gradient (`linear-gradient(180deg, #1c1e24 0%, #15161a 100%)`) — same gradient the desktop aside uses, creating visual continuity between mobile and desktop.
- **Backdrop:** Scrim (rgba(0,0,0,0.6)).
- **z-index:** Overlay panel (50).

## Do's and Don'ts

### Do:

- **Do** use the Five-Step Type Scale for all chrome labels (micro 9 / caption 10 / label 11 / body 12 / title 13 px). Same-purpose text, same step.
- **Do** route team-color-dependent text and interactive elements through curated uiAccent/onAccent, never raw brand hexes (Two-Voice Rule).
- **Do** compose every UI surface from `components/ui/` primitives. Before hand-rolling a styled element, check what exists — extend with a prop before forking a new component.
- **Do** use fill-based state changes for active/selected states — accent fill + on-accent text. No outlines, no glows, no scale bounces for state.
- **Do** use white-alpha borders at 1 px to differentiate surfaces. Emphasis via opacity (6% → 14%), never width (Hairline Rule).
- **Do** use the shared `Intent` vocabulary (`primary` / `secondary` / `ghost` / `danger`) across all component variant props. Never invent per-component visual names.
- **Do** use the z-index scale (dot 10 → dotSelected 20 → popover 30 → backdrop 40 → panel 50). Never hardcode a z-index value.
- **Do** use skeletons sized to eventual content while data loads; never let a component render its post-load shape from data that hasn't arrived.

### Don't:

- **Don't** use generic 3-column white-card grids, centered-everything layouts, decorative blobs, or icon-in-colored-circle rows. (Prior design review guardrails, still in force.)
- **Don't** style text, dots, or interactive elements with `primary` (the raw team brand color) when `uiAccent` is the curated legible alternative for dark backgrounds.
- **Don't** hand-edit team colors in the database or seed files — they are machine-owned by the weekly ESPN ingest. Corrections happen in the transform.
- **Don't** invent z-index values at the call site. Add a new tier to the scale instead.
- **Don't** use arbitrary font sizes outside the five-step type scale for chrome text. Per-container one-offs (display numerals, field labels) are acceptable and deliberately outside the scale.
- **Don't** add drop shadows to chrome surfaces. Shadows appear only on physically floating elements (Shadow Means Floating).
- **Don't** hand-roll a styled `<button>` or `<div>` group when a `components/ui/` primitive covers the use case. "One-off" is how the same control gets rebuilt five different ways.
- **Don't** commit without running `npm run format`. Prettier is the only style authority.
- **Don't** delete curated archive rows. Retirement is a flag, never a delete — archives are append-only.
- **Don't** enable RLS on a new table without shipping a read policy in the same migration.
