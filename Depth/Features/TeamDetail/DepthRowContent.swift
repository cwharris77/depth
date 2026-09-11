import SwiftUI

// The single rank/number/name (+ checkmark) row body shared by the player profile's
// read-only DEPTH CHART rows and PositionReorderSheet's drag rows (2026-09-11 merge spec).
// Extracted unchanged from the deleted player card, which mirrored web's DepthRowContent.
struct DepthRowContent: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let player: Player
    let isCurrent: Bool
    let accent: Color

    var body: some View {
        let layout = dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.sm))
        layout {
            Text(depthRankLabel(player.depthRank))
                .font(.caption.bold())
                .foregroundStyle(playerStatusColor(player.status, accent: accent))
                .frame(minWidth: 64, alignment: .leading)
            Text("#\(player.number)")
                .font(.footnote.bold())
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .frame(minWidth: 28, alignment: .leading)
            Text(player.name.isEmpty ? "#\(player.number)" : player.name)
                .font(.subheadline.bold())
                .foregroundStyle(isCurrent ? accent : DesignTokens.Colors.textPrimary)
                .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
            Spacer()
            if isCurrent {
                Image(systemName: "checkmark")
                    .font(.footnote.bold())
                    .foregroundStyle(accent)
                    .accessibilityHidden(true)
            }
        }
    }
}

// Mirrors web PlayerCardDepthList.depthRankLabel: ranks are capped at 3, so anything past
// 2 is "reserve" rather than a literal ordinal.
func depthRankLabel(_ rank: Int) -> String {
    switch rank {
    case 1: "STARTER"
    case 2: "BACKUP"
    default: "RESERVE"
    }
}
