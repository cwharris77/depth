import SwiftUI

/// The notification rows of Settings. Notifications are about the favorite team, so
/// there is one switch and, while it is on, a choice of how much to hear. Without a
/// favorite, or with the system permission refused, the rows are replaced by the one
/// step that fixes it.
struct NotificationSettingsRows: View {
    let store: NotificationSettingsStore
    /// The team notifications are about.
    let favoriteTeam: Team?
    let onChooseFavorite: () -> Void

    @Environment(\.openURL) private var openURL

    /// Until the system permission question is answered nothing is delivered, whatever
    /// level is stored, so the switch reads off. Turning it on is what asks the question.
    private var isOn: Bool { store.authorization == .authorized && store.isOn }

    var body: some View {
        if let favoriteTeam {
            if store.authorization == .denied {
                blocked(
                    title: "Notifications are off for \(AppBuildInfo.displayName)",
                    detail: "Allow them in iOS Settings, then choose what to hear about here.",
                    action: "Open iOS Settings",
                    identifier: "settings-notifications-system-settings"
                ) {
                    if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
                        openURL(url)
                    }
                }
            } else {
                controls(for: favoriteTeam)
            }
        } else {
            blocked(
                title: "Notifications follow your favorite team",
                detail: "Pick one to turn them on.",
                action: "Choose Favorite Team",
                identifier: "settings-notifications-choose-favorite",
                perform: onChooseFavorite)
        }
    }

    @ViewBuilder
    private func controls(for team: Team) -> some View {
        Toggle(
            "Notify me about the \(team.name)",
            isOn: Binding(
                get: { isOn },
                set: { on in Task { await store.setOn(on, teamId: team.id) } })
        )
        .foregroundStyle(DesignTokens.Colors.textPrimary)
        .frame(minHeight: SettingsMetrics.rowHeight)
        .accessibilityIdentifier("settings-notifications-toggle")

        if isOn {
            ForEach([NotificationTier.bigMoments, .everything], id: \.self) { tier in
                SettingsOptionRow(
                    title: tier.title, detail: tier.summary, isSelected: store.tier == tier
                ) {
                    Task { await store.setTier(tier, candidateTeamId: team.id) }
                }
                .accessibilityIdentifier("settings-notifications-tier-\(tier.rawValue)")
            }
        } else {
            Text("A new starter, a trade, a record chase or a historic game. Nothing else.")
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .accessibilityIdentifier("settings-notifications-summary")
        }
    }

    private func blocked(
        title: String, detail: String, action: String, identifier: String,
        perform: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(title)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
            }
            Button(action: perform) {
                Text(action)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.bordered)
            .tint(DesignTokens.Colors.textPrimary)
            .accessibilityIdentifier(identifier)
        }
        .padding(.top, DesignTokens.Spacing.sm)
    }
}
