import SwiftUI

// Basic player detail (design spec Milestone 1: "basic player detail" — full profiles
// with bio/stats are T8). Shows what the T6 snapshot actually carries: name, number,
// position, and a cleared photo when one exists.
struct PlayerDetailView: View {
    let player: Player
    let team: Team?

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                photo
                Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                    .font(.title2.bold())
                Text("\(player.position.rawValue) · #\(player.number)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }

    @ViewBuilder
    private var photo: some View {
        let accent = team.map { Color(hex: $0.colors.uiAccent) } ?? .accentColor
        let onAccent = team.map { Color(hex: $0.colors.onAccent) } ?? .white
        ZStack {
            Circle().fill(accent)
            if let url = player.photoUrl.flatMap(URL.init(string:)) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        initials(onAccent)
                    }
                }
                .clipShape(Circle())
            } else {
                initials(onAccent)
            }
        }
        .frame(width: 96, height: 96)
        .accessibilityHidden(true)
    }

    private func initials(_ color: Color) -> some View {
        Text("\(player.number)")
            .font(.title.bold())
            .foregroundStyle(color)
    }
}
