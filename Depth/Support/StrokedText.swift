import SwiftUI
import UIKit

// A glyph run drawn with a fill *and* a contrasting outline, for the player-card jersey
// numeral (2026-09-01 team-color-surface spec, direction 3).
//
// This exists because SwiftUI cannot do it. There is no text-stroke modifier, and
// `Text(AttributedString)` silently drops `strokeColor`/`strokeWidth` — those live in the
// UIKit attribute scope, and SwiftUI's renderer honours only its own. Verified on device:
// the attributes compile, apply cleanly, and render a flat fill with no outline.
//
// It draws in TWO PASSES — outline first, fill on top — rather than using UIKit's built-in
// combined fill-and-stroke (a negative `.strokeWidth`). That built-in is the obvious
// approach and it is wrong for this glyph set, for a reason that is entirely invisible
// until you look closely at a `#`:
//
//   The system font draws `#` as FOUR OVERLAPPING BARS, not one merged shape. Filling uses
//   a winding rule, so the fill looks correct — but stroking traces every subpath's whole
//   outline, including the segments buried inside the intersections. The result is trim
//   drawn straight THROUGH the glyph, chopping it into nine tiles. No stroke width fixes
//   it; a thinner one just draws thinner lines through the middle. This was the original
//   "the outline goes through the hashtag" bug, and it survived two attempts to fix it by
//   changing weight (Cooper, 2026-09-02).
//
// Drawing the outline behind the fill fixes it for any glyph, however its path is built:
// the interior crossings are painted over by the fill, so only the outer silhouette is
// left. Pass 1 strokes with a POSITIVE `.strokeWidth` (stroke only) at double the intended
// weight, because a centred stroke shows only its outer half once the fill covers the rest.
// Pass 2 draws the fill with no stroke at all.
//
// The remaining trap is silent and worth stating: `.strokeWidth` is a PERCENTAGE of the
// font's point size, not a point value. Passing a computed point width gives a wildly heavy
// outline at large Dynamic Type sizes.
struct StrokedText: UIViewRepresentable {
    /// One styled segment of the line. `fill == nil` leaves the segment hollow — outline
    /// only, no interior.
    struct Run: Equatable {
        let text: String
        /// Point size for this run. Runs share a baseline, so a smaller run reads as a
        /// prefix/suffix mark against a larger one rather than as a separate line.
        let size: CGFloat
        let fill: Color?
        let stroke: Color
        /// Outline weight as a percentage of *this run's* size (see the trap note above).
        /// This is the weight that ends up VISIBLE, which the stroke pass doubles to get.
        let strokeWidthPercent: CGFloat
    }

    let runs: [Run]
    let weight: UIFont.Weight
    /// Letter spacing in points, matching SwiftUI's `.tracking`.
    let tracking: CGFloat

    func makeUIView(context: Context) -> StrokedLabel {
        StrokedLabel()
    }

    func updateUIView(_ label: StrokedLabel, context: Context) {
        label.outlinePass = Self.attributedString(runs: runs, weight: weight, tracking: tracking, pass: .outline)
        label.fillPass = Self.attributedString(runs: runs, weight: weight, tracking: tracking, pass: .fill)
        label.overflow = Self.strokeOverflow(runs)
        label.invalidateIntrinsicContentSize()
        label.setNeedsDisplay()
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: StrokedLabel, context: Context) -> CGSize? {
        uiView.intrinsicContentSize
    }

    enum Pass {
        /// Outline only, at double weight — the fill pass covers the inner half.
        case outline
        /// Interior only, no stroke.
        case fill
    }

    /// Built per pass rather than per label so the two-pass rule above is assertable without
    /// a SwiftUI `Context`. Both passes share font, kerning and text, so they land on
    /// identical glyph positions and can be drawn at the same origin.
    static func attributedString(
        runs: [Run], weight: UIFont.Weight, tracking: CGFloat, pass: Pass
    ) -> NSAttributedString {
        let string = NSMutableAttributedString()
        for run in runs {
            var attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: run.size, weight: weight),
                .kern: tracking,
            ]
            switch pass {
            case .outline:
                // Positive width strokes without filling. Doubled because a centred stroke
                // keeps only its outer half once the fill lands on top.
                attributes[.strokeColor] = UIColor(run.stroke)
                attributes[.strokeWidth] = run.strokeWidthPercent * 2
                attributes[.foregroundColor] = UIColor.clear
            case .fill:
                // A hollow run has no interior; its outline pass already drew everything.
                attributes[.foregroundColor] = run.fill.map(UIColor.init) ?? UIColor.clear
                attributes[.strokeWidth] = 0
            }
            string.append(NSAttributedString(string: run.text, attributes: attributes))
        }
        return string
    }

    /// Point width of the heaviest VISIBLE stroke — how much room the outline needs outside
    /// the typographic bounds. Core Text centres a stroke on the glyph path, and the text's
    /// measured size covers only those bounds, so without this padding the outline (and the
    /// glyph edges under it) is clipped off every side. Shipped bug: at 64pt this cut the
    /// first and last glyph visibly. `strokeWidthPercent` is a percentage of each run's own
    /// size, so convert before comparing.
    static func strokeOverflow(_ runs: [Run]) -> CGFloat {
        runs.map { $0.strokeWidthPercent / 100 * $0.size }.max() ?? 0
    }
}

/// Draws the two passes at one origin. A `UILabel` cannot do this — it renders its
/// `attributedText` exactly once — so this is a plain view that owns its drawing.
final class StrokedLabel: UIView {
    var outlinePass: NSAttributedString?
    var fillPass: NSAttributedString?
    /// Extra room for the half of the outline that falls outside the text's own bounds.
    var overflow: CGFloat = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        setContentHuggingPriority(.required, for: .horizontal)
        setContentHuggingPriority(.required, for: .vertical)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var intrinsicContentSize: CGSize {
        guard let fillPass else { return .zero }
        let size = fillPass.size()
        return CGSize(width: ceil(size.width + overflow), height: ceil(size.height + overflow))
    }

    override func draw(_ rect: CGRect) {
        // Both passes share metrics, so one origin — inset by half the overflow — keeps the
        // outline inside the view on every side.
        let origin = CGPoint(x: overflow / 2, y: overflow / 2)
        outlinePass?.draw(at: origin)
        fillPass?.draw(at: origin)
    }
}
