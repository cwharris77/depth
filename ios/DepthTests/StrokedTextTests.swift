import SwiftUI
import Testing
import UIKit

@testable import Depth

// The player-card jersey numeral mixes a hollow `#` with filled digits, and the only thing
// separating those two treatments is the SIGN of `.strokeWidth` — negative fills and
// strokes, positive strokes only. That sign is invisible in a screenshot diff and silently
// wrong if inverted (a hollow number reads as a broken font, a filled `#` was the artefact
// this treatment replaced), so it is asserted here rather than left to a visual pass.

private let filled = StrokedText.Run(
    text: "14", size: 64, fill: .blue, stroke: .white, strokeWidthPercent: 6
)
private let hollow = StrokedText.Run(
    text: "#", size: 32, fill: nil, stroke: .white, strokeWidthPercent: 4
)

// `StrokedText` is a UIViewRepresentable, so its members are @MainActor; the helper and
// every test here inherit that isolation rather than hopping.
@MainActor
private func attributes(
    _ runs: [StrokedText.Run], at index: Int
) -> [NSAttributedString.Key: Any] {
    StrokedText.attributedString(runs: runs, weight: .black, tracking: -2)
        .attributes(at: index, effectiveRange: nil)
}

@MainActor @Test func filledRunStrokeWidthIsNegative() {
    let width = attributes([filled], at: 0)[.strokeWidth] as? CGFloat
    #expect(width == -6, "a run with a fill must fill AND stroke")
}

@MainActor @Test func hollowRunStrokeWidthIsPositive() {
    let width = attributes([hollow], at: 0)[.strokeWidth] as? CGFloat
    #expect(width == 4, "a run with no fill must stroke only")
}

@MainActor @Test func hollowRunHasNoForegroundColor() {
    let color = attributes([hollow], at: 0)[.foregroundColor] as? UIColor
    #expect(color == UIColor.clear, "a hollow run must not inherit UILabel's default fill")
}

@MainActor @Test func runsKeepTheirOwnSizeAndAreConcatenatedInOrder() {
    let runs = [hollow, filled]
    let string = StrokedText.attributedString(runs: runs, weight: .black, tracking: -2)
    #expect(string.string == "#14")
    // The `#` is deliberately smaller than the digits it prefixes; they share a baseline
    // because they are one attributed string in one label.
    let hashFont = attributes(runs, at: 0)[.font] as? UIFont
    let digitFont = attributes(runs, at: 1)[.font] as? UIFont
    #expect(hashFont?.pointSize == 32)
    #expect(digitFont?.pointSize == 64)
}
