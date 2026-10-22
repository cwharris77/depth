import SwiftUI

/// A team's events, newest first and headed by day. A row with somewhere more specific to
/// go is a button; the rest are plain rows. Rows swipe away one at a time or all at once.
struct TeamFeedSheet: View {
    let viewModel: TeamFeedViewModel
    let teamName: String
    let accent: Color
    /// The ids on the loaded roster, used to decide which rows lead somewhere.
    let rosterPlayerIds: Set<String>
    let onSelect: (TeamEvent) -> Void

    @State private var confirmingClear = false

    var body: some View {
        DepthSheet(title: "What's new") {
            content
                .task { await viewModel.load() }
                .toolbar {
                    if !viewModel.visibleEvents.isEmpty {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Clear all") { confirmingClear = true }
                                .accessibilityIdentifier("team-feed-clear-all")
                        }
                    }
                }
                .confirmationDialog(
                    "Clear everything in What's new?", isPresented: $confirmingClear,
                    titleVisibility: .visible
                ) {
                    Button("Clear all", role: .destructive) { viewModel.clearAll() }
                        .accessibilityIdentifier("team-feed-clear-all-confirm")
                } message: {
                    Text("New updates will still show up here.")
                }
                // A row with nowhere else to go is read in full here, so it stops counting
                // as unread once the sheet closes.
                .onDisappear {
                    viewModel.markRead(viewModel.visibleEvents.filter(isFeedOnly).map(\.id))
                }
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
        case .loaded where viewModel.visibleEvents.isEmpty:
            message(
                "You're all caught up",
                "New starter changes, trades and record chases for the \(teamName) show up here."
            )
            .accessibilityIdentifier("team-feed-cleared")
        case .loaded:
            let now = Date()
            List {
                if viewModel.refreshFailed {
                    RefreshFailedBanner()
                        .listRowInsets(rowInsets)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
                ForEach(TeamFeedDay.group(viewModel.visibleEvents, now: now)) { day in
                    Section {
                        ForEach(day.events) { event in
                            row(event, isUnread: viewModel.isUnread(event, now: now))
                                .listRowInsets(rowInsets)
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        withAnimation { viewModel.dismiss(event.id) }
                                    } label: {
                                        Label("Clear", systemImage: "xmark")
                                    }
                                }
                        }
                    } header: {
                        Text(day.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(DesignTokens.Colors.textSecondary)
                            .textCase(nil)
                            .accessibilityAddTraits(.isHeader)
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
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

    private var rowInsets: EdgeInsets {
        EdgeInsets(
            top: DesignTokens.Spacing.xs, leading: DesignTokens.Spacing.screenMargin,
            bottom: DesignTokens.Spacing.xs, trailing: DesignTokens.Spacing.screenMargin)
    }

    private func isFeedOnly(_ event: TeamEvent) -> Bool {
        TeamEventDestination.resolve(event, rosterPlayerIds: rosterPlayerIds) == .feed
    }

    @ViewBuilder
    private func row(_ event: TeamEvent, isUnread: Bool) -> some View {
        let card = TeamEventCard(
            event: event, accent: accent, showsDate: false, isUnread: isUnread)
        if isFeedOnly(event) {
            card
                .accessibilityValue(isUnread ? "Unread" : "")
                .accessibilityIdentifier("team-feed-row-\(event.id)")
        } else {
            Button {
                onSelect(event)
            } label: {
                card
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(isUnread ? "Unread" : "")
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
