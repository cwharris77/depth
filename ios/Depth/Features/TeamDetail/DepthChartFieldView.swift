import SwiftUI

// Renders one resolved `Unit` (offense/defense/special) as dots on a field, using the
// shared `resolveUnit` domain logic (T3) unchanged — this view's only job is turning
// `RenderSlot` percentages into an on-screen layout and a tap target per slot.
//
// Dot geometry comes from `DepthChartFieldLayout` (DEP-207): the tightest same-row gap
// decides the drawn dot size so neighbouring dots never touch, and rows that can't fit
// at the minimum size are re-spread around their centroid. The *visual* dot shrinks, but
// the *tap target* stays at the 44-point minimum via `.frame(minWidth:minHeight:)` +
// `.contentShape` — the same 30px-visual/44px-hit-slop contract the web uses. The field's
// text is still capped at `.accessibility1`: positioned slots can't reflow, so a scaled
// glyph would merge the offensive line into one shape, and the full content stays
// reachable at any size through each slot's VoiceOver label.
struct DepthChartFieldView: View {
    let snapshot: TeamSnapshot
    let unit: Unit
    let onSelectPlayer: (Player) -> Void

    private var slots: [RenderSlot] {
        let roster = Roster(players: snapshot.players, specialTeams: snapshot.specialTeams)
        return resolveUnit(roster: roster, unit: unit)
    }

    var body: some View {
        GeometryReader { proxy in
            let layout = DepthChartFieldLayout.compute(slots: slots, fieldSize: proxy.size)
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(hex: snapshot.team.colors.primary).opacity(0.15))

                ForEach(slots, id: \.key) { slot in
                    slotView(slot, dotSize: layout.dotSize)
                        .position(layout.positions[slot.key] ?? .zero)
                }
            }
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private func slotView(_ slot: RenderSlot, dotSize: CGFloat) -> some View {
        if let player = slot.player {
            Button {
                onSelectPlayer(player)
            } label: {
                slotDot(label: slot.label, number: player.number, dotSize: dotSize)
                    // The visual dot shrinks with the geometry (DEP-207); the hit area
                    // stays at the 44-point minimum, mirroring the web's 30px dot +
                    // 44px hit-slop (components/PlayerDot.tsx).
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("\(slot.label), \(player.name.isEmpty ? "number \(player.number)" : player.name)")
            .accessibilityHint("Opens player detail")
            .accessibilityIdentifier("player-slot-\(slot.key)")
        } else {
            slotDot(label: slot.label, number: nil, dotSize: dotSize)
                .accessibilityLabel("\(slot.label), unfilled")
        }
    }

    private func slotDot(label: String, number: Int?, dotSize: CGFloat) -> some View {
        VStack(spacing: 4) {
            Circle()
                .fill(Color(hex: snapshot.team.colors.uiAccent))
                .overlay {
                    if let number {
                        // Verbatim: a jersey number is an identifier, not a quantity —
                        // LocalizedStringKey interpolation would group it ("1,000"), the
                        // same bug class already fixed for the season year elsewhere.
                        Text(verbatim: "\(number)")
                            .font(.caption.bold())
                            .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
                    } else {
                        Image(systemName: "questionmark")
                            .font(.caption2)
                            .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
                    }
                }
                .frame(width: dotSize, height: dotSize)
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }
}
