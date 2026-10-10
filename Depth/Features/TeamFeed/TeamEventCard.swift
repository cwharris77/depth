import SwiftUI

/// One event as shown everywhere it appears: its headline, its detail when it has one,
/// how far a record chase has come, and the source and date it rests on.
struct TeamEventCard: View {
    let event: TeamEvent
    /// Tints the progress bar; the team's accent where one is known.
    var accent: Color = DesignTokens.Colors.accent
    /// Shows a close control when set. The feed's rows pass nil.
    var onDismiss: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(event.headline)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                if let detail = event.detail, !detail.isEmpty {
                    Text(detail)
                        .font(.footnote)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let progress = TeamEventCaption.progress(for: event) {
                    ProgressView(value: progress)
                        .tint(accent)
                        .accessibilityLabel("Progress toward the record")
                        .accessibilityValue("\(Int((progress * 100).rounded())) percent")
                }
                Text(TeamEventCaption.line(for: event))
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Dismiss")
                .accessibilityIdentifier("team-event-card-dismiss")
            }
        }
        .depthCard(dense: true)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("team-event-card")
    }
}
