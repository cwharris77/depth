import SwiftUI
import UIKit

// A glyph drawn with a fill *and* a contrasting outline, for the player-card jersey
// numeral (2026-09-01 team-color-surface spec, direction 3).
//
// This exists because SwiftUI cannot do it. There is no text-stroke modifier, and
// `Text(AttributedString)` silently drops `strokeColor`/`strokeWidth` — those live in the
// UIKit attribute scope, and SwiftUI's renderer honours only its own. Verified on device:
// the attributes compile, apply cleanly, and render a flat fill with no outline. UILabel
// does honour them, so this is the smallest bridge that actually works.
//
// Two traps worth stating, because both are silent:
//   - `.strokeWidth` is a PERCENTAGE of the font's point size, not a point value. Passing a
//     computed point width gives a wildly heavy outline at large Dynamic Type sizes.
//   - A NEGATIVE width fills and strokes. A positive one strokes only, leaving the glyph
//     hollow — which reads as a broken font rather than an outline.
struct StrokedText: UIViewRepresentable {
    let text: String
    let size: CGFloat
    let weight: UIFont.Weight
    /// Letter spacing in points, matching SwiftUI's `.tracking`.
    let tracking: CGFloat
    let fill: Color
    let stroke: Color
    /// Outline weight as a percentage of the font size (see the trap note above).
    let strokeWidthPercent: CGFloat

    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.numberOfLines = 1
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.5
        label.baselineAdjustment = .alignCenters
        // Hug the glyph horizontally so SwiftUI lays it out at its intrinsic width rather
        // than stretching it across the identity column.
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }

    func updateUIView(_ label: UILabel, context: Context) {
        label.attributedText = NSAttributedString(
            string: text,
            attributes: [
                .font: UIFont.systemFont(ofSize: size, weight: weight),
                .foregroundColor: UIColor(fill),
                .strokeColor: UIColor(stroke),
                .strokeWidth: -strokeWidthPercent,
                .kern: tracking,
            ]
        )
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UILabel, context: Context) -> CGSize? {
        uiView.intrinsicContentSize
    }
}
