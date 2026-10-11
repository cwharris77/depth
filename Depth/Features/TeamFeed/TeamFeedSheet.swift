import SwiftUI

/// A team's events, newest first. A row with somewhere more specific to go is a button;
/// the rest are plain rows.
struct TeamFeedSheet: View {
    let viewModel: TeamFeedViewModel
    let teamName: String
    let accent: Color
    /// The ids on the loaded roster, used to decide which rows lead somewhere.
    let rosterPlayerIds: Set<String>
    let onSelect: (TeamEvent) -> Void

    var body: some View {
        DepthSheet(title: "What's new") {
            content
                .task { await viewModel.load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .idle, .loading:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .loaded(let events) where events.isEmpty:
            message(
                "Nothing new yet",
                "Starter changes, trades and record chases for the \(teamName) show up here."
            )
            .accessibilityIdentifier("team-feed-empty")
        case .loaded(let events):
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(events) { event in row(event) }
                }
                .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
            .accessibilityIdentifier("team-feed-list")
        case .failed:
            VStack(spacing: DesignTokens.Spacing.md) {
                message("Couldn't load what's new", "Check your connection and try again.")
                Button("Try again") { Task { await viewModel.load() } }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("team-feed-retry")
            }
        }
    }

    @ViewBuilder
    private func row(_ event: TeamEvent) -> some View {
        if TeamEventDestination.resolve(event, rosterPlayerIds: rosterPlayerIds) == .feed {
            TeamEventCard(event: event, accent: accent)
                .accessibilityIdentifier("team-feed-row-\(event.id)")
        } else {
            Button {
                onSelect(event)
            } label: {
                TeamEventCard(event: event, accent: accent)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens this in the app")
            .accessibilityIdentifier("team-feed-row-\(event.id)")
        }
    }

    private func message(_ title: String, _ body: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text(title)
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Text(body)
                .font(.subheadline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
