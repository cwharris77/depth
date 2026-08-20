import SwiftUI

// Literal port of components/ui/tokens.ts's `colors` object, plus a spacing and corner-
// radius scale (2026-08-15 visual-pass spec, locked decision #2: "literal token port,
// not reinterpretation"). Every color value here must match tokens.ts exactly — if the
// web file changes, update this file by hand; there is no shared build-time generation
// between the two (unlike the domain/formations fixtures, which do have one). Only
// tokens with a current native call site are ported — add more here when a screen
// actually needs one, not speculatively (YAGNI).
enum DesignTokens {
    enum Colors {
        static let bg = Color(hex: "#15161a")
        static let textPrimary = Color(hex: "#f0f4ff")
        static let textSecondary = Color(hex: "#dfe5f0")
        static let textMuted = Color(hex: "#A5ACAF")
        static let textFaint = Color(hex: "#7d848c")
        /// Matches web's `textFaintest` — footer tickers and micro-rank labels.
        static let textFaintest = Color(hex: "#5a616a")
        /// The app's own UI accent (link colors, focus rings, tab-bar tint) — never
        /// team-specific. Distinct from any team's `uiAccent`. DEP-272: was Seahawks'
        /// literal uiAccent (#69BE28); replaced with a muted steel blue that isn't any
        /// of the 32 teams' uiAccent.
        static let accent = Color(hex: "#6E8CAE")
        static let onAccent = Color(hex: "#15161a")
        static let danger = Color(hex: "#ff6b6b")
        /// Matches web's `statusInjured` — injury status and negative point differential.
        static let statusInjured = Color(hex: "#ef5350")
        /// Native-only (DEP-264) — no web tokens.ts counterpart. Carries forward the
        /// pre-token `Color.green` dark-appearance system green
        /// (`#30D158`, Apple HIG system green in dark mode) so a game-card win keeps its
        /// distinct color rather than the team accent, matching the DIFF-positive value
        /// on the Stats page (DesignTokens.Colors.statusWin replaces uiAccent there too).
        static let statusWin = Color(hex: "#30D158")
        /// The bare neutral-slate hue behind web's `surfaceNavy` (`rgba(30,32,38,0.8)`),
        /// surfaced so callers that need the same tone at a different opacity (the
        /// depth-chart field's end zones draw it at 0.3) don't re-declare the RGB literal
        /// (DEP-260). DEP-272: was Seahawks' literal primary (#002244); no longer navy,
        /// name kept to avoid a call-site rename.
        static let navy = Color(red: 30 / 255, green: 32 / 255, blue: 38 / 255)
        /// Matches web's `surfaceNavy` (`rgba(30,32,38,0.8)`) — the position-badge pill fill.
        static let surfaceNavy = navy.opacity(0.8)
        static let surfaceCard = Color(hex: "#1a1e23")
        static let surfaceCard2 = Color.white.opacity(0.03)
        /// Matches web's `surfaceRaised` — faint raised fill (rows, subtle cards).
        static let surfaceRaised = Color.white.opacity(0.05)
        /// Matches web's `surfaceChip` (`rgba(255,255,255,0.07)`) — pill/chip backgrounds
        /// like the team-switcher trigger.
        static let surfaceChip = Color.white.opacity(0.07)
        static let borderDefault = Color.white.opacity(0.08)
        static let borderSubtle = Color.white.opacity(0.06)
        /// Matches web's `borderInput` — stronger hairlines, dashed "degraded" borders.
        static let borderInput = Color.white.opacity(0.14)
        /// Used by the depth-chart field's yard lines.
        static let borderStrong = Color.white.opacity(0.10)
        /// Field-surface group (DEP-260): native-only tokens, no web tokens.ts
        /// counterpart — the grass hexes live inline in web's
        /// `DepthChartFieldSurface.tsx` and the LOS blue in `FieldMarkings.tsx`.
        /// Carried forward verbatim from the pre-token field; named so the field's
        /// palette can be themed centrally.

        /// Field grass gradient stops (`DepthChartFieldSurface.tsx`'s
        /// `linear-gradient(180deg, #1e3d10 0%, #2d5a1b 40%, #2d5a1b 60%, #1e3d10 100%)`).
        static let surfaceField1 = Color(hex: "#1e3d10")
        static let surfaceField2 = Color(hex: "#2d5a1b")
        /// Solid LOS blue, matching TV broadcast overlays (`FieldMarkings.tsx`).
        static let fieldLineOfScrimmage = Color(hex: "#2d6fe0")
        /// Hash-mark strokes, distinct from `borderStrong`'s 0.10 — field lines at
        /// 0.12 white (`FieldMarkings.tsx`'s `surfaceChipHover`).
        static let fieldHashMark = Color.white.opacity(0.12)
        /// Matches web's `borderDrawer` — the Uniforms tab's division-header hairline.
        static let borderDrawer = Color(hex: "#2d333d")
        /// Native-only (DEP-259) — no web tokens.ts counterpart. Shared redacted-skeleton
        /// placeholder fill, replacing system `.tertiary`/`.gray` (two different greys
        /// used across the app's loading states with no single source of truth).
        static let surfacePlaceholder = Color.white.opacity(0.12)
        /// Native-only (DEP-259) — no web tokens.ts counterpart. Rookie status color
        /// (player detail sheet's status label / depth-row rank). Carries forward the
        /// pre-token literal `#4fc3f7` exactly, same pattern as `statusWin` (DEP-264).
        static let statusRookie = Color(hex: "#4fc3f7")
        /// Matches web's `CONFERENCE_COLORS` (`lib/utils/colors.ts`) — the NFL's own
        /// shield brand colors (brandcolorcode.com/nfl-national-football-league), used for
        /// the AFC/NFC conference picker. Unlike `accent` (DEP-272), which had to stay
        /// neutral, this control's job is to distinguish the two conferences, so the real
        /// broadcast/bracket-graphic red/blue is the right fit.
        static let conferenceAFC = Color(hex: "#D50A0A")
        static let conferenceNFC = Color(hex: "#013369")
    }

    /// 8-point spacing scale (design-pass item 29's explicit requirement).
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        /// Cooper review (DEP-252): the horizontal inset used to align page-level
        /// content to the screen edge — same value as `md`, named separately so call
        /// sites read as "screen margin" rather than an arbitrary spacing choice. Use
        /// this (not a raw `.padding(.horizontal)`, which silently relies on SwiftUI's
        /// default) anywhere content needs to line up with the screen edge the way
        /// `TeamDetailView`'s toolbar and page switcher now both explicitly do.
        static let screenMargin: CGFloat = md
    }

    /// DEP-276 app-wide radius audit. The ticket's motivating instance
    /// (`SeasonChipRow.swift:81`, `cornerRadius: 3` on the Stats page's season-chip
    /// header) no longer exists — DEP-278 replaced that flat chip row with
    /// `SeasonPickerTrigger`/`SeasonPickerSheet` (`Support/SeasonPicker.swift`), a
    /// `Capsule()`/`.buttonStyle(.glass)` control with no bare radius literal.
    ///
    /// The audit (every `cornerRadius:`/`RoundedRectangle(cornerRadius:)` literal
    /// under `ios/Depth`, excluding `ShareCardMetrics`'s web-pixel-parity constants
    /// and `DepthBrandMark`'s fixed logo path, both intentionally outside this scale)
    /// found 8 more. Two matched an existing step exactly and are snapped here as a
    /// mechanical DRY fix (`DepthSegmentedControl.swift`'s 12→`sm` and 16→`md`, no new
    /// token, no design decision). The remaining 6 don't fit `sm`/`md`/`lg`/`full` and
    /// need a new named step each — per the ticket's escalation boundary (radius-
    /// hierarchy naming is a design-system decision, not a mechanical fix), those are
    /// proposed in the PR body pending Cooper's sign-off rather than added here
    /// speculatively (YAGNI, per this enum's header comment above):
    /// - skeleton placeholder cells (`PlayerDetailView.swift`, `TeamListView.swift`) — 4pt
    /// - small icon-badge stroke (`TeamStatsView.swift`'s opponent-abbrev badge) — 8pt
    /// - decorative accent rail (`UniformsTab.swift`'s per-team gradient bar) — 2pt
    enum Radius {
        static let sm: CGFloat = 12
        /// Matches web's `Card.tsx` (`rounded-3xl`). Also the depth-chart field's and
        /// uniform-thumbnail's corner radius, preserved exactly with a name (DEP-260).
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let full: CGFloat = 999
    }
}