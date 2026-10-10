import SwiftUI

/// The notification setting, as rows for the Settings preferences card: one value out of
/// three, the team it applies to, and a way to the system's own notification settings.
/// The rows carry their own horizontal padding and dividers, like their siblings there.
struct NotificationSettingsCard: View {
    let store: NotificationSettingsStore
    let teams: [Team]
    /// The team adopted if the user turns notifications on before choosing one.
    let candidateTeamId: String?

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.openURL) private var openURL

    private var shownTeamId: String? { store.teamId ?? candidateTeamId }

    private var teamLabel: String {
        guard let id = shownTeamId, let team = teams.first(where: { $0.id == id }) else {
            return "Choose a team"
        }
        return "\(team.city) \(team.name)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Menu {
                    ForEach(NotificationTier.allCases, id: \.self) { tier in
                        Button(tier.title) {
                            Task { await store.setTier(tier, candidateTeamId: candidateTeamId) }
                        }
                    }
                } label: {
                    valueRow(icon: "bell.fill", title: "Notifications", value: store.tier.title)
                }
                .accessibilityIdentifier("settings-notifications-tier")

                Text(store.tier.summary)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .accessibilityIdentifier("settings-notifications-summary")

                if store.authorization == .denied, store.tier != .off {
                    Text("Notifications are turned off for this app in iOS Settings.")
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                        .accessibilityIdentifier("settings-notifications-denied")
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.bottom, DesignTokens.Spacing.sm)

            if store.tier != .off {
                divider
                Menu {
                    ForEach(teams, id: \.id) { team in
                        Button("\(team.city) \(team.name)") {
                            Task { await store.setTeam(team.id) }
                        }
                    }
                } label: {
                    valueRow(icon: "person.2.fill", title: "Team", value: teamLabel)
                }
                .accessibilityIdentifier("settings-notifications-team")
                .padding(.horizontal, DesignTokens.Spacing.md)
            }

            divider
            Button {
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
                    openURL(url)
                }
            } label: {
                rowLayout {
                    SettingsIconBadge(
                        systemName: "gearshape.fill", tint: DesignTokens.Colors.accent)
                    Text("iOS Notification Settings")
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .fixedSize(horizontal: false, vertical: dynamicTypeSize.isAccessibilitySize)
                    if !dynamicTypeSize.isAccessibilitySize { Spacer() }
                    Image(systemName: "arrow.up.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .contentShape(Rectangle())
            }
            .accessibilityIdentifier("settings-notifications-system-settings")
        }
    }

    private var divider: some View {
        Divider().overlay(DesignTokens.Colors.borderSubtle)
    }

    /// The icon, title, current value and menu chevrons of a menu row. Stacks at
    /// accessibility sizes, where a title and a value no longer fit on one line.
    private func valueRow(icon: String, title: String, value: String) -> some View {
        rowLayout {
            SettingsIconBadge(systemName: icon, tint: DesignTokens.Colors.accent)
            Text(title)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                .minimumScaleFactor(dynamicTypeSize.isAccessibilitySize ? 1 : 0.75)
            Image(systemName: "chevron.up.chevron.down")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.textFaint)
        }
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
    }

    private func rowLayout<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        let layout =
            dynamicTypeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: DesignTokens.Spacing.sm))
            : AnyLayout(HStackLayout(spacing: DesignTokens.Spacing.md))
        return layout { content() }
    }
}
