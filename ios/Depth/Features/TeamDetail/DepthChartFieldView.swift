import SwiftUI

// Renders one resolved `Unit` (offense/defense/special) as dots on a field, using the
// shared `resolveUnit` domain logic (T3) unchanged — this view's only job is turning
// `RenderSlot` percentages into an on-screen layout and a tap target per slot.
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
        VStack(spacing: 2) {
            Circle()
                .fill(Color(hex: snapshot.team.colors.uiAccent))
                .overlay {
                    if let number {
                        Text("\(number)")
                            .font(.caption.bold())
                            .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
                    } else {
                        Image(systemName: "questionmark")
                            .font(.caption2)
                            .foregroundStyle(Color(hex: snapshot.team.colors.onAccent))
                    }
                }
                .frame(width: 44, height: 44)
            Text(label)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }
}
