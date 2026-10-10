import SwiftUI

/// The one-time prompt: a real event about the user's team, then the offer to be told
/// about the next one. Accepting leads to the system permission dialog.
struct BigMomentPromptSheet: View {
    let event: TeamEvent
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        DepthSheet(
            title: "New on your team", sizing: .medium, closeIdentifier: "big-moment-prompt-close"
        ) {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        Text(event.headline)
                            .font(.headline)
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        if let detail = event.detail {
                            Text(detail)
                                .font(.subheadline)
                                .foregroundStyle(DesignTokens.Colors.textMuted)
                        }
                        Text(event.occurredAt, format: .dateTime.month().day())
                            .font(.caption)
                            .foregroundStyle(DesignTokens.Colors.textFaint)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .depthCard()
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("big-moment-prompt-event")

                    Text(
                        "Want to hear about moments like this when they happen? Only new "
                            + "starters, trades, record chases and historic games. Nothing else."
                    )
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Button(action: onAccept) {
                            Text("Notify me about big moments")
                                .font(.body.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.borderedProminent)
                        .foregroundStyle(DesignTokens.Colors.onAccent)
                        .accessibilityIdentifier("big-moment-prompt-accept")

                        Button(action: onDecline) {
                            Text("Not now")
                                .foregroundStyle(DesignTokens.Colors.textMuted)
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("big-moment-prompt-decline")
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
            .scrollIndicators(.hidden)
        }
        .tint(DesignTokens.Colors.accent)
    }
}
