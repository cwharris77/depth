import SwiftUI
import Testing
import UIKit

@testable import Depth

// The player-card jersey numeral is drawn in two passes — outline first, fill over it —
// because the system font builds `#` from four overlapping bars, and stroking on top of a
// fill traces the segments buried inside those intersections, drawing trim straight through
// the glyph. That failure survived two rounds of visual review before its cause was found,
// so the pass structure is pinned here rather than left to a screenshot diff.

private let filled = StrokedText.Run(
    text: "14", size: 64, fill: .blue, stroke: .white, strokeWidthPercent: 3
)
private let hollow = StrokedText.Run(
    text: "#", size: 32, fill: nil, stroke: .white, strokeWidthPercent: 3
)

@MainActor
private func attributes(
    _ runs: [StrokedText.Run], pass: StrokedText.Pass, at index: Int
) -> [NSAttributedString.Key: Any] {
    StrokedText.attributedString(runs: runs, weight: .black, tracking: -2, pass: pass)
        .attributes(at: index, effectiveRange: nil)
}

@MainActor @Test func outlinePassStrokesOnlyAndNeverFills() {
    let attrs = attributes([filled], pass: .outline, at: 0)
    // A POSITIVE width strokes without filling; a negative one fills and strokes, which is
    // the single-pass behaviour this design replaced.
    #expect(attrs[.strokeWidth] as? CGFloat == 6, "outline pass doubles the visible weight")
    #expect(attrs[.foregroundColor] as? UIColor == UIColor.clear, "outline pass must not fill")
}

@MainActor @Test func fillPassDoesNotStroke() {
    let attrs = attributes([filled], pass: .fill, at: 0)
    #expect(attrs[.strokeWidth] as? CGFloat == 0, "the fill pass must not re-stroke the glyph")
    #expect(attrs[.foregroundColor] as? UIColor == UIColor(Color.blue))
}

@MainActor @Test func hollowRunHasNoFillOnEitherPass() {
    #expect(attributes([hollow], pass: .fill, at: 0)[.foregroundColor] as? UIColor == UIColor.clear)
    #expect(attributes([hollow], pass: .outline, at: 0)[.strokeWidth] as? CGFloat == 6)
}

@MainActor @Test func bothPassesShareTextMetricsSoTheyAlign() {
    let runs = [hollow, filled]
    let outline = StrokedText.attributedString(
        runs: runs, weight: .black, tracking: -2, pass: .outline
    )
    let fill = StrokedText.attributedString(runs: runs, weight: .black, tracking: -2, pass: .fill)
    // Same string, same fonts, same kerning — the passes are drawn at one origin, so any
    // divergence here would show up as a visibly doubled glyph.
    #expect(outline.string == fill.string)
    #expect(outline.string == "#14")
    for index in 0..<runs.count {
        let outlineFont = attributes(runs, pass: .outline, at: index)[.font] as? UIFont
        let fillFont = attributes(runs, pass: .fill, at: index)[.font] as? UIFont
        #expect(outlineFont?.pointSize == fillFont?.pointSize)
        #expect(attributes(runs, pass: .outline, at: index)[.kern] as? CGFloat == -2)
    }
    // The `#` stays half the digits' size; they share a baseline as one attributed string.
    #expect((attributes(runs, pass: .fill, at: 0)[.font] as? UIFont)?.pointSize == 32)
    #expect((attributes(runs, pass: .fill, at: 1)[.font] as? UIFont)?.pointSize == 64)
}

// Core Text centres a stroke on the glyph path, so half of it lands outside the typographic
// bounds the text measures. Without padding, the view clips it — a shipped bug that cut the
// first and last glyph once the numeral grew to 64pt.
@MainActor @Test func strokeOverflowUsesTheHeaviestRunInPoints() {
    // 3% of 64 = 1.92pt beats 3% of 32 = 0.96pt: the percentage is per-run, not global.
    #expect(StrokedText.strokeOverflow([hollow, filled]) == 1.92)
}

@MainActor @Test func strokeOverflowIsZeroForNoRuns() {
    #expect(StrokedText.strokeOverflow([]) == 0)
}
