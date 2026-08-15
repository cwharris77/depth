import Foundation

// Mirrors lib/utils/colors.ts's contrastRatio/readableTextOn exactly — WCAG relative
// luminance contrast between two `#rrggbb` hex colors, and picking white or the dark
// app background as whichever reads better on an arbitrary brand color. Used by the
// share card (Task 8E) to paint text on a team's primary, which — unlike uiAccent — is
// only curated to read on `DARK_BG`, not on itself.
let darkBackgroundHex = "#0a0e1a"
private let lightTextHex = "#ffffff"

private func channel(_ value: Double) -> Double {
    let s = value / 255
    return s <= 0.03928 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4)
}

private func luminance(_ hex: String) -> Double {
    let cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "#", with: "")
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    let r = Double((value >> 16) & 0xFF)
    let g = Double((value >> 8) & 0xFF)
    let b = Double(value & 0xFF)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

func contrastRatio(_ a: String, _ b: String) -> Double {
    let la = luminance(a)
    let lb = luminance(b)
    let (hi, lo) = la > lb ? (la, lb) : (lb, la)
    return (hi + 0.05) / (lo + 0.05)
}

func readableTextOn(_ background: String) -> String {
    contrastRatio(lightTextHex, background) >= contrastRatio(darkBackgroundHex, background)
        ? lightTextHex : darkBackgroundHex
}
