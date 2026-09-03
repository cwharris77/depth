import SwiftUI
import UIKit

// A glyph run drawn with a fill *and* a contrasting outline, for the player-card jersey
// numeral (2026-09-01 team-color-surface spec, direction 3).
//
// This exists because SwiftUI cannot do it. There is no text-stroke modifier, and
// `Text(AttributedString)` silently drops `strokeColor`/`strokeWidth` — those live in the
// UIKit attribute scope, and SwiftUI's renderer honours only its own. Verified on device:
// the attributes compile, apply cleanly, and render a flat fill with no outline. UILabel
// does honour them, so this is the smallest bridge that actually works.
//
// Styling is per-run rather than per-label because the numeral mixes two treatments in one
// line: a small hollow `#` and large solid digits. Font, colour and `.strokeWidth` are all
// NSAttributedString attributes, so they vary by range for free — the label is still one
// label, one layout pass, one shared baseline.
//
// Two traps worth stating, because both are silent:
//   - `.strokeWidth` is a PERCENTAGE of the font's point size, not a point value. Passing a
//     computed point width gives a wildly heavy outline at large Dynamic Type sizes.
//   - A NEGATIVE width fills and strokes. A positive one strokes only, leaving the glyph
//     hollow — which is deliberate for `fill == nil` runs and a bug everywhere else.
struct StrokedText: UIViewRepresentable {
    /// One styled segment of the line. `fill == nil` draws the segment hollow: outline
    /// only, no interior, which is what a positive `.strokeWidth` means in UIKit.
    struct Run: Equatable {
        let text: String
        /// Point size for this run. Runs share a baseline, so a smaller run reads as a
        /// prefix/suffix mark against a larger one rather than as a separate line.
        let size: CGFloat
        let fill: Color?
        let stroke: Color
        /// Outline weight as a percentage of *this run's* size (see the trap note above).
        let strokeWidthPercent: CGFloat
    }

    let runs: [Run]
    let weight: UIFont.Weight
    /// Letter spacing in points, matching SwiftUI's `.tracking`.
    let tracking: CGFloat

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
        label.attributedText = Self.attributedString(runs: runs, weight: weight, tracking: tracking)
    }

    /// Split out of `updateUIView` so the `.strokeWidth` sign rule — the trap in this
    /// file's header — is assertable without a SwiftUI `Context`.
    static func attributedString(
        runs: [Run], weight: UIFont.Weight, tracking: CGFloat
    ) -> NSAttributedString {
        let string = NSMutableAttributedString()
        for run in runs {
            string.append(NSAttributedString(
                string: run.text,
                attributes: [
                    .font: UIFont.systemFont(ofSize: run.size, weight: weight),
                    // A hollow run has no interior, so the foreground colour is unused;
                    // clear it rather than leaving UILabel's inherited default behind.
                    .foregroundColor: run.fill.map(UIColor.init) ?? UIColor.clear,
                    .strokeColor: UIColor(run.stroke),
                    .strokeWidth: run.fill == nil ? run.strokeWidthPercent : -run.strokeWidthPercent,
                    .kern: tracking,
                ]
            ))
        }
        return string
    }

    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UILabel, context: Context) -> CGSize? {
        uiView.intrinsicContentSize
    }
}
