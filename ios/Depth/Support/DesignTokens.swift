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
        static let bg = Color(hex: "#0a0e1a")
        static let textPrimary = Color(hex: "#f0f4ff")
        static let textSecondary = Color(hex: "#dfe5f0")
        static let textMuted = Color(hex: "#A5ACAF")
        static let textFaint = Color(hex: "#7d848c")
        /// The app's own UI accent (link colors, focus rings, tab-bar tint) — never
        /// team-specific. Distinct from any team's `uiAccent`.
        static let accent = Color(hex: "#69BE28")
        static let onAccent = Color(hex: "#0a0e1a")
        static let danger = Color(hex: "#ff6b6b")
        static let surfaceCard = Color(hex: "#0f1623")
        static let surfaceCard2 = Color.white.opacity(0.03)
        static let borderDefault = Color.white.opacity(0.08)
        static let borderSubtle = Color.white.opacity(0.06)
        /// Used by the depth-chart field's yard lines.
        static let borderStrong = Color.white.opacity(0.10)
    }

    /// 8-point spacing scale (design-pass item 29's explicit requirement).
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 12
        /// Matches web's `Card.tsx` (`rounded-3xl`).
        static let lg: CGFloat = 24
        static let full: CGFloat = 999
    }
}