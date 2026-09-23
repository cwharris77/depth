import SwiftUI

// Literal port of web/components/ui/tokens.ts's `colors` object, plus a spacing and corner-
// radius scale. Every color value here must match tokens.ts exactly — if the
// web file changes, update this file by hand; there is no shared build-time generation
// between the two (unlike the domain/formations fixtures, which do have one). Only
// tokens with a current native call site are ported — add more here when a screen
// actually needs one.
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
        /// team-specific. Distinct from any team's `uiAccent`.
        static let accent = Color(hex: "#6E8CAE")
        static let onAccent = Color(hex: "#15161a")
        /// A legible-on-dark lift of `accent`, for text and glyphs sitting *on* an
        /// accent-tinted fill (`accent.opacity(0.16)` chips) where `accent` itself is too
        /// close in value to the fill to separate from it. Native-only so far — the
        /// uniform archive's "IN ROTATION" badge and its active filter chips
        /// used by the uniform archive's status badge and active filter chips.
        static let accentSoft = Color(hex: "#8fa8c4")
        static let danger = Color(hex: "#ff6b6b")
        /// Matches web's `statusInjured` — injury status and negative point differential.
        static let statusInjured = Color(hex: "#ef5350")
        /// Native-only — no web tokens.ts counterpart. Carries forward the
        /// pre-token `Color.green` dark-appearance system green
        /// (`#30D158`, Apple HIG system green in dark mode) so a game-card win keeps its
        /// distinct color rather than the team accent, matching the DIFF-positive value
        /// on the Stats page (DesignTokens.Colors.statusWin replaces uiAccent there too).
        static let statusWin = Color(hex: "#30D158")
        /// The bare neutral-slate hue behind web's `surfaceNavy` (`rgba(30,32,38,0.8)`),
        /// surfaced so callers that need the same tone at a different opacity (the
        /// depth-chart field's end zones draw it at 0.3) don't re-declare the RGB literal
        /// so callers do not re-declare the RGB literal.
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
        /// Field-surface group: native-only tokens, no web tokens.ts
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
        /// The field's yard lines and per-yard ticks, drawn as chalk.
        ///
        /// These used to share `borderStrong` (0.10 white) with app chrome, which is right
        /// for a hairline between two dark surfaces and wrong on turf — at 10% they read as
        /// grey haze rather than markings. Once the field became a real ruler the lines have
        /// to be legible enough to count, so they get their own value at chalk strength
        /// instead of borrowing a border token.
        static let fieldChalk = Color.white.opacity(0.55)
        /// The five-yard lines, a touch brighter than the single-yard ticks between them so
        /// the ruler has a readable rhythm rather than a uniform comb.
        static let fieldChalkMajor = Color.white.opacity(0.75)
        /// Matches web's `borderDrawer` — the Uniforms tab's division-header hairline.
        static let borderDrawer = Color(hex: "#2d333d")
        /// Native-only — no web tokens.ts counterpart. Shared redacted-skeleton
        /// placeholder fill, replacing system `.tertiary`/`.gray` (two different greys
        /// used across the app's loading states with no single source of truth).
        static let surfacePlaceholder = Color.white.opacity(0.12)
        /// Native-only — no web tokens.ts counterpart. Rookie status color
        /// (player detail sheet's status label / depth-row rank). Carries forward the
        /// pre-token literal `#4fc3f7` exactly, same pattern as `statusWin`.
        static let statusRookie = Color(hex: "#4fc3f7")
        /// Matches web's `CONFERENCE_COLORS` (`web/lib/utils/colors.ts`) — the NFL's own
        /// shield brand colors (brandcolorcode.com/nfl-national-football-league), used for
        /// the AFC/NFC conference picker. Unlike `accent`, which stays
        /// neutral, this control's job is to distinguish the two conferences, so the real
        /// broadcast/bracket-graphic red/blue is the right fit.
        static let conferenceAFC = Color(hex: "#D50A0A")
        static let conferenceNFC = Color(hex: "#013369")
    }

    /// 8-point spacing scale.
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        /// The horizontal inset used to align page-level
        /// content to the screen edge — same value as `md`, named separately so call
        /// sites read as "screen margin" rather than an arbitrary spacing choice. Use
        /// this (not a raw `.padding(.horizontal)`, which silently relies on SwiftUI's
        /// default) anywhere content needs to line up with the screen edge the way
        /// `TeamDetailView`'s toolbar and page switcher now both explicitly do.
        static let screenMargin: CGFloat = md
    }

    /// Shared corner-radius scale for bounded surfaces and controls.
    enum Radius {
        static let sm: CGFloat = 12
        /// Matches web's `Card.tsx` (`rounded-3xl`). Also the depth-chart field's and
        /// uniform-thumbnail's corner radius.
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let full: CGFloat = 999
    }

    /// Native motion vocabulary for state changes that recur across the app. Motion is
    /// deliberately restrained: selection should feel immediate, formation changes get
    /// enough time to explain where players moved, and Reduce Motion callers retain a
    /// short crossfade instead of losing state feedback entirely.
    enum Motion {
        static let feedback = Animation.easeOut(duration: 0.12)
        static let selection = Animation.snappy(duration: 0.24, extraBounce: 0)
        static let formation = Animation.smooth(duration: 0.36)
    }
}
