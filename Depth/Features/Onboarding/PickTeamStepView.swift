import SwiftUI

// First run, after the welcome screen: choose the team the app is about. The choice
// becomes the favorite team and the depth chart the app opens on. Skipping leaves no
// favorite and goes on to the tour.
struct PickTeamStepView: View {
    let controller: OnboardingController
    let repository: any DepthRepository
    let settingsStore: UserSettingsStore
    let teamRouteStore: TeamRouteStore

    @State private var teams: [Team] = []
    @State private var hasLoaded = false
    @State private var query = ""
    @State private var selectedTeamId: String?

    private var shownTeams: [Team] {
        let sorted = teams.sorted { "\($0.city) \($0.name)" < "\($1.city) \($1.name)" }
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return sorted }
        return sorted.filter { "\($0.city) \($0.name)".localizedCaseInsensitiveContains(trimmed) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text("Pick your team")
                        .font(.largeTitle.bold())
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Text("The app opens on their depth chart. You can change it in Settings.")
                        .font(.body)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                .padding(.top, DesignTokens.Spacing.xl)

                DepthSearchField(
                    text: $query, placeholder: "Search teams",
                    identifier: "onboarding-team-search")

                teamList
            }
            .padding(.horizontal, DesignTokens.Spacing.screenMargin)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollDismissesKeyboard(.immediately)
        .safeAreaInset(edge: .bottom) { actions }
        .background(DesignTokens.Colors.bg)
        .tint(DesignTokens.Colors.accent)
        .task { await load() }
    }

    @ViewBuilder
    private var teamList: some View {
        if !hasLoaded {
            ProgressView()
                .frame(maxWidth: .infinity, minHeight: 120)
        } else if teams.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text("Couldn't load the teams. Check your connection and try again.")
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                Button("Try Again") { Task { await load() } }
                    .buttonStyle(.bordered)
                    .tint(DesignTokens.Colors.textPrimary)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("onboarding-team-retry")
            }
        } else if shownTeams.isEmpty {
            Text("No team matches \u{201C}\(query)\u{201D}.")
                .foregroundStyle(DesignTokens.Colors.textMuted)
        } else {
            LazyVStack(spacing: 0) {
                ForEach(shownTeams, id: \.id) { team in row(team) }
            }
        }
    }

    private func row(_ team: Team) -> some View {
        let isSelected = team.id == selectedTeamId
        return Button {
            selectedTeamId = team.id
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                TeamBadge(team: team)
                Text("\(team.city) \(team.name)")
                    .font(.body.weight(isSelected ? .semibold : .regular))
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Spacer(minLength: 0)
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title3)
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(DesignTokens.Colors.onAccent, DesignTokens.Colors.accent)
                        .accessibilityHidden(true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: SettingsMetrics.rowHeight, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityIdentifier("onboarding-team-row-\(team.id)")
    }

    private var actions: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Button {
                guard let selectedTeamId else { return }
                settingsStore.selectTeam(selectedTeamId)
                teamRouteStore.request(teamId: selectedTeamId)
                controller.continueFromTeam()
            } label: {
                Text("Continue")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .foregroundStyle(DesignTokens.Colors.onAccent)
            .disabled(selectedTeamId == nil)
            .accessibilityIdentifier("onboarding-team-continue")

            Button {
                controller.continueFromTeam()
            } label: {
                Text("Skip")
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("onboarding-team-skip")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.sm)
        .padding(.bottom, DesignTokens.Spacing.lg)
        .background(DesignTokens.Colors.bg)
    }

    private func load() async {
        teams = (try? await repository.teams()) ?? []
        hasLoaded = true
    }
}
