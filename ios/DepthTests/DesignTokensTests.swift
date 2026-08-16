import Testing
import SwiftUI
@testable import Depth

// Token values are a literal port of components/ui/tokens.ts — these tests pin the
// values against that source so a future edit can't silently drift from web without a
// test failing. Not exhaustive color-by-color; spot-checks the values most likely to be
// "close but wrong" (transcription errors) rather than re-deriving every hex.
@Test func backgroundTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.bg == Color(hex: "#0a0e1a"))
}

@Test func accentTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.accent == Color(hex: "#69BE28"))
}

@Test func surfaceCardTokenMatchesWebTokensTs() {
    #expect(DesignTokens.Colors.surfaceCard == Color(hex: "#0f1623"))
}

@Test func spacingScaleIsAnEightPointFamily() {
    #expect(DesignTokens.Spacing.xs == 4)
    #expect(DesignTokens.Spacing.sm == 8)
    #expect(DesignTokens.Spacing.md == 16)
    #expect(DesignTokens.Spacing.lg == 24)
    #expect(DesignTokens.Spacing.xl == 32)
}

@Test func radiusScaleMatchesWebsCardRadius() {
    #expect(DesignTokens.Radius.sm == 12)
    #expect(DesignTokens.Radius.lg == 24)
}