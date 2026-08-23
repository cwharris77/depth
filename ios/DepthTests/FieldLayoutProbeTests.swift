import CoreGraphics
import Foundation
import Testing
@testable import Depth

// THROWAWAY PROBE — delete with the phone-field readability experiment. Prints the real
// computed geometry (dot centers, label boxes, callout tags) for the formations that keep
// producing visual defects, so those can be diagnosed from numbers instead of guessed at
// from screenshots. Not an assertion suite; it always passes and just reports.
struct FieldLayoutProbeTests {
    private let field = CGSize(width: 370, height: 600)

    private func probe(_ alignment: String, _ code: String) {
        let formation = buildRealFormation(alignment: alignment, code: code)
        // Give every slot a player so nothing is skipped for want of a name.
        let slots = formation.map { slot in
            RenderSlot(
                key: slot.id, x: slot.x, y: slot.y, label: slot.label,
                player: Player(
                    id: slot.id, name: "Test", position: slot.position,
                    depthRank: 1, number: 0
                ),
                onLine: slot.onLine
            )
        }
        let layout = DepthChartFieldLayout.compute(
            slots: slots, fieldSize: field, fillWidth: true
        )
        let d = layout.dotSize

        print("=== \(alignment) \(code) — dot \(d) ===")
        for slot in slots.sorted(by: { ($0.y, $0.x) < ($1.y, $1.x) }) {
            guard let p = layout.positions[slot.key] else { continue }
            let cy = p.y + DepthChartFieldLayout.lineOffset(
                y: slot.y, onLine: slot.onLine, dotSize: d
            )
            let mode = layout.nameCallouts[slot.key] != nil ? "callout" : "inline"
            print(String(
                format: "  %-4@ charted(%.0f,%.0f) -> (%.0f,%.0f) onLine=%@ %@",
                slot.label as NSString, slot.x, slot.y, p.x, cy,
                (slot.onLine == true ? "Y" : "n") as NSString, mode as NSString
            ))
        }

        // Report anything that actually collides: dot-vs-dot, and each inline label box
        // against every other dot.
        for (i, a) in slots.enumerated() {
            guard let pa = layout.positions[a.key] else { continue }
            let ay = pa.y + DepthChartFieldLayout.lineOffset(y: a.y, onLine: a.onLine, dotSize: d)
            for b in slots.dropFirst(i + 1) {
                guard let pb = layout.positions[b.key] else { continue }
                let by = pb.y + DepthChartFieldLayout.lineOffset(y: b.y, onLine: b.onLine, dotSize: d)
                let gap = hypot(pa.x - pb.x, ay - by)
                if gap < d {
                    print(String(format: "  !! DOTS %@/%@ overlap by %.0f", a.label, b.label, d - gap))
                }
            }
            guard layout.nameCallouts[a.key] == nil else { continue }
            let w = DepthChartFieldLayout.estimatedNameWidth("Test")
            let label = CGRect(
                x: pa.x - w / 2,
                y: ay + d / 2 + DepthChartFieldLayout.labelTopGap,
                width: w,
                height: DepthChartFieldLayout.labelBlockHeight
            )
            for b in slots where b.key != a.key {
                guard let pb = layout.positions[b.key] else { continue }
                let by = pb.y + DepthChartFieldLayout.lineOffset(y: b.y, onLine: b.onLine, dotSize: d)
                let dot = CGRect(x: pb.x - d / 2, y: by - d / 2, width: d, height: d)
                if label.intersects(dot) {
                    print("  !! LABEL \(a.label) hits DOT \(b.label)")
                }
            }
        }
    }

    @Test("probe the formations that keep breaking")
    func probeFormations() {
        probe("SHOTGUN", "11")
        probe("SHOTGUN", "00")
        probe("UNDER_CENTER", "21")
    }
}
