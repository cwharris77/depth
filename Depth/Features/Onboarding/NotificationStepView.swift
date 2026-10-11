import SwiftUI

// First run, after a team is picked: the offer to be notified about that team. The main
// action is the only thing that raises the system permission dialog, which the system
// shows once; declining here leaves it unspent for a later, better moment.
struct NotificationStepView: View {
    let controller: OnboardingController
    let repository: any DepthRepository
    let favoriteTeamId: String?
    let store: NotificationSettingsStore

    @State private var team: Team?
    @State private var isAsking = false

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                NotificationExample(team: team)

                VStack(spacing: DesignTokens.Spacing.sm) {
                    Text(team.map { "Turn on \($0.name) notifications" } ?? "Turn on notifications")
                        .font(.title.bold())
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .multilineTextAlignment(.center)
                        .accessibilityAddTraits(.isHeader)
                    Text("A new starter. A trade. A record chase. A historic game. Nothing else.")
                        .font(.body)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) { actions }
        .background(DesignTokens.Colors.bg)
        .ignoresSafeArea(edges: .top)
        .tint(DesignTokens.Colors.accent)
        .task {
            guard let favoriteTeamId, let teams = try? await repository.teams() else { return }
            team = teams.first { $0.id == favoriteTeamId }
        }
    }

    private var actions: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Button {
                guard let favoriteTeamId, !isAsking else { return }
                isAsking = true
                Task {
                    await store.enable(teamId: favoriteTeamId)
                    controller.continueFromNotifications()
                }
            } label: {
                Text("Enable Notifications")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .disabled(isAsking)
            .accessibilityIdentifier("onboarding-notifications-enable")

            Button {
                controller.continueFromNotifications()
            } label: {
                Text("Not Now")
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(isAsking)
            .accessibilityIdentifier("onboarding-notifications-not-now")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.lg)
        .background(DesignTokens.Colors.bg)
    }
}

/// What is being offered, drawn rather than described: a strip of the field with one
/// player marked as changed, and the notification that would announce it.
private struct NotificationExample: View {
    let team: Team?

    private static let height: CGFloat = 340
    private static let dotSize: CGFloat = 30

    private var teamColor: Color {
        team.map { Color(hex: $0.colors.primary) } ?? DesignTokens.Colors.navy
    }

    private var headline: String {
        "\(team?.name ?? "Your team"): a new starter at left tackle"
    }

    var body: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [
                    DesignTokens.Colors.surfaceField1, DesignTokens.Colors.surfaceField2,
                    DesignTokens.Colors.surfaceField1,
                ],
                startPoint: .top, endPoint: .bottom)

            VStack(spacing: 0) {
                Spacer()
                Rectangle().fill(DesignTokens.Colors.fieldLineOfScrimmage).frame(height: 2)
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(0..<5, id: \.self) { index in dot(isMarked: index == 0) }
                }
                .padding(.top, DesignTokens.Spacing.md)
                dot(isMarked: false)
                    .padding(.top, DesignTokens.Spacing.lg)
                    .padding(.bottom, DesignTokens.Spacing.xl)
            }

            // Fades the strip into the page so it reads as a view of the field, not a
            // boxed picture.
            LinearGradient(
                colors: [DesignTokens.Colors.bg.opacity(0), DesignTokens.Colors.bg],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 64)
            .frame(maxHeight: .infinity, alignment: .bottom)

            banner
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.top, 84)
        }
        .frame(height: Self.height)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Example notification: \(headline)")
        .accessibilityIdentifier("onboarding-notifications-example")
    }

    private func dot(isMarked: Bool) -> some View {
        Circle()
            .fill(teamColor)
            .frame(width: Self.dotSize, height: Self.dotSize)
            .overlay {
                Circle().strokeBorder(DesignTokens.Colors.fieldChalk, lineWidth: 1)
            }
            .overlay {
                if isMarked {
                    Circle()
                        .strokeBorder(DesignTokens.Colors.textPrimary, lineWidth: 2)
                        .padding(-5)
                }
            }
            .shadow(color: .black.opacity(0.5), radius: 4, y: 2)
    }

    private var banner: some View {
        HStack(spacing: DesignTokens.Spacing.sm + DesignTokens.Spacing.xs) {
            DepthBrandMark(size: 24)
                .frame(width: 40, height: 40)
                .background(
                    DesignTokens.Colors.bg,
                    in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline) {
                    Text(AppBuildInfo.displayName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Spacer(minLength: DesignTokens.Spacing.sm)
                    Text("now")
                        .font(.footnote)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                }
                Text(headline)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(DesignTokens.Spacing.sm + DesignTokens.Spacing.xs)
        .background(
            DesignTokens.Colors.navy, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
        )
        .overlay {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .strokeBorder(DesignTokens.Colors.borderStrong, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.45), radius: 16, y: 12)
    }
}
