import CoreGraphics
import Foundation

// Pure geometry for the depth-chart field (DEP-207). Given a unit's resolved slots
// (percentage x/y coordinates) and the field's on-screen size, picks the largest dot
// diameter at which no two dots sit closer than `dotSize + gap`, and re-spreads any row
// that still can't fit at the minimum size around its centroid. Deliberately free of
// SwiftUI so the overlap guarantee is unit-testable without a view — DepthChartFieldView
// just applies the returned size and positions.
//
// The 44-point tap target is the view's job (.frame(minWidth: 44, minHeight: 44) +
// .contentShape), matching the web's 30px visual dot with a 44px hit-slop; this type
// only decides what's actually drawn.
struct DepthChartFieldLayout: Equatable {
    /// Visual dot diameter in points.
    let dotSize: CGFloat
    /// Center of each slot, in points, keyed by `RenderSlot.key`.
    let positions: [String: CGPoint]

    static let minDotSize: CGFloat = 26
    static let maxDotSize: CGFloat = 36
    static let gap: CGFloat = 2
    /// Max y spread (percent of field height) that still counts as one row.
    static let rowTolerancePct: CGFloat = 3

    /// Groups slots into rows by y proximity (percent coordinates, greedy on sorted y).
    /// Shared by `compute` and the geometry tests so "same row" has one definition.
    static func rows(in slots: [RenderSlot]) -> [[RenderSlot]] {
        var rows: [[RenderSlot]] = []
        for slot in slots.sorted(by: { $0.y < $1.y }) {
            if let first = rows.last?.first, slot.y - first.y <= rowTolerancePct {
                rows[rows.count - 1].append(slot)
            } else {
                rows.append([slot])
            }
        }
        return rows
    }

    static func compute(slots: [RenderSlot], fieldSize: CGSize) -> DepthChartFieldLayout {
        let width = fieldSize.width
        guard width > 0, fieldSize.height > 0, !slots.isEmpty else {
            return DepthChartFieldLayout(dotSize: maxDotSize, positions: [:])
        }

        // Tightest same-row horizontal gap (in points) drives the dot size, clamped to
        // the safe range. The shoulder-to-shoulder offensive line (8% apart in the
        // generic formation) is what forces the small end; the spread-out defense caps
        // at the max.
        var tightestGap = CGFloat.greatestFiniteMagnitude
        for row in rows(in: slots) where row.count > 1 {
            let xs = row.map(\.x).sorted()
            for i in 1..<xs.count {
                tightestGap = min(tightestGap, (xs[i] - xs[i - 1]) / 100 * width)
            }
        }
        let dotSize = max(minDotSize, min(maxDotSize, tightestGap - gap))

        var centers: [String: CGPoint] = [:]
        for slot in slots {
            centers[slot.key] = CGPoint(
                x: width * slot.x / 100,
                y: fieldSize.height * slot.y / 100
            )
        }

        // A row whose tightest gap can't hold `dotSize + gap` gets re-spread evenly
        // around its centroid so the no-touch guarantee holds at any width. Only the
        // tight row moves — its neighbors keep the formation's coordinates.
        let spacing = dotSize + gap
        let spacingPct = spacing / width * 100
        for row in rows(in: slots) where row.count > 1 {
            let xs = row.map(\.x).sorted()
            var rowTightest = CGFloat.greatestFiniteMagnitude
            for i in 1..<xs.count {
                rowTightest = min(rowTightest, (xs[i] - xs[i - 1]) / 100 * width)
            }
            guard rowTightest < spacing else { continue }

            let centroid = row.map(\.x).reduce(0, +) / CGFloat(row.count)
            let spanPct = spacingPct * CGFloat(row.count - 1)
            let startPct = max(0, min(100 - spanPct, centroid - spanPct / 2))
            for (i, slot) in row.sorted(by: { $0.x < $1.x }).enumerated() {
                centers[slot.key] = CGPoint(
                    x: width * (startPct + spacingPct * CGFloat(i)) / 100,
                    y: fieldSize.height * slot.y / 100
                )
            }
        }

        return DepthChartFieldLayout(dotSize: dotSize, positions: centers)
    }
}