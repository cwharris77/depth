import SwiftUI

// Renders one resolved `Unit` (offense/defense/special) as dots on a field, using the
// shared `resolveUnit` domain logic (T3) unchanged — this view's only job is turning
// `RenderSlot` percentages into an on-screen layout and a tap target per slot.
struct DepthChartFieldView: View {
    let snapshot: TeamSnapshot
    let unit: Unit
    let onSelectPlayer: (Player) -> Void

    // Slots are positioned by percentage on a fixed-aspect field, so they cannot reflow
    // the way a stack can — neighbouring dots simply overlap. The dot is therefore held
    // at the 44-point tap-target minimum rather than scaled with Dynamic Type (a scaled
    // dot merges the offensive line into one shape by Accessibility XXXL), and the text
    // inside the field is capped at `.accessibility1` for the same reason. The full
    // content stays reachable at any size through each slot's VoiceOver label, which is
    // the accessible path here — not a larger glyph.
    private let dotSize: CGFloat = 44

    private var slots: [RenderSlot] {
        let roster = Roster(players: snapshot.players, specialTeams: snapshot.specialTeams)
        return resolveUnit(roster: roster, unit: unit)
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(hex: snapshot.team.colors.primary).opacity(0.15))

                ForEach(slots, id: \.key) { slot in
                    slotView(slot)
                        .position(
                            x: proxy.size.width * slot.x / 100,
                            y: proxy.size.height * slot.y / 100
                        )
                }
            }
        }
        .aspectRatio(1.4, contentMode: .fit)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private func slotView(_ slot: RenderSlot) -> some View {
        if let player = slot.player {
            Button {
                onSelectPlayer(player)
            } label: {
                slotDot(label: slot.label, number: player.number)
            }
            .accessibilityLabel("\(slot.label), \(player.name.isEmpty ? "number \(player.number)" : player.name)")
            .accessibilityHint("Opens player detail")
            .accessibilityIdentifier("player-slot-\(slot.key)")
        } else {
            slotDot(label: slot.label, number: nil)
                .accessibilityLabel("\(slot.label), unfilled")
        }
    }

    private func slotDot(label: String, number: Int?) -> some View {
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
