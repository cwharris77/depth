import SwiftUI

// The uniform archive tab. v2 (2026-08-27 archive redesign) replaces the flat
// conference → division → team → thumbnail list with a browsable archive: a persistent
// header carrying search and a By team / By era switch, a two-column team-card grid or a
// decade timeline underneath it, a per-team drill-in, and a detail sheet per kit.
//
// The header is page content, not chrome (Cooper review, DEP-271) — the shared
// `depthTopNavToolbar` stays global, and search / view mode / Filters sit on the page
// where they belong to this screen. Sort and kind moved into the Filters sheet in v2 so
// the header holds exactly three controls at phone width.
//
// All grouping, filtering, search and label logic is pure and lives in `UniformArchive`
// (Domain/UniformListing.swift); this file is composition.
struct UniformsTab: View {
    @State private var viewModel: UniformArchiveViewModel
    @State private var showAccount = false
    @State private var showFilterSheet = false
    @State private var selectedKit: UniformListing?
    @State private var path: [String] = []

    /// Jumps to a team's depth chart on the Depth Charts tab — the kit sheet's primary
    /// action. Supplied by RootTabView, which owns both the tab selection and the route
    /// store the other tab reads.
    private let onOpenDepthChart: (String) -> Void

    init(repository: DepthRepository, onOpenDepthChart: @escaping (String) -> Void) {
        _viewModel = State(initialValue: UniformArchiveViewModel(repository: repository))
        self.onOpenDepthChart = onOpenDepthChart
    }

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Uniforms")
                .navigationBarTitleDisplayMode(.inline)
                .background(DesignTokens.Colors.bg)
                // DEP-252/DEP-277 (Cooper review): shared app-wide top nav — see
                // `depthTopNavToolbar`. No team pill on this screen.
                .toolbar {
                    depthTopNavToolbar(teamPill: { EmptyView() }) {
                        showAccount = true
                    }
                }
                // Pushed by team id, not by value: the group is re-derived on every
                // render so a filter changed from the drill-in is reflected there.
                .navigationDestination(for: String.self) { teamId in
                    if let team = viewModel.team(id: teamId) {
                        UniformTeamDetailView(team: team) { selectedKit = $0 }
                    } else {
                        // The team's last kit was filtered out from under the pushed
                        // screen — degrade to an explanation, never an empty screen.
                        ContentUnavailableView(
                            "No kits match",
                            systemImage: "tshirt",
                            description: Text("This team has no kits left under the current filters.")
                        )
                        .background(DesignTokens.Colors.bg)
                    }
                }
                .sheet(isPresented: $showAccount) {
                    SettingsView(
                        sessionStore: DepthEnvironment.authSessionStore,
                        authService: DepthEnvironment.authService,
                        events: DepthEnvironment.appEvents,
                        onboarding: DepthEnvironment.onboarding,
                        settingsStore: DepthEnvironment.userSettingsStore
                    )
                }
        }
        .task { await viewModel.load() }
        // Live bindings into both sheets, so a change made in either is visible in the
        // archive behind it immediately — no separate apply step.
        .sheet(isPresented: $showFilterSheet) {
            UniformFilterSheet(
                filters: Binding(get: { viewModel.filters }, set: { viewModel.filters = $0 }),
                kindCounts: viewModel.kindCounts,
                applyLabel: viewModel.applyLabel
            )
        }
        .sheet(item: $selectedKit) { kit in
            UniformKitSheet(kit: kit) { onOpenDepthChart(kit.teamId) }
                // A `.sheet()` gets a fresh UITraitCollection rather than inheriting the
                // presenter's Dynamic Type override — see UITestingDynamicTypeOverride.
                .modifier(UITestingDynamicTypeOverride())
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.loadState {
        case .loading:
            ProgressView("Loading uniforms…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityIdentifier("uniforms-loading")
        case .failed(let error):
            ContentUnavailableView {
                Label("Couldn't load uniforms", systemImage: "exclamationmark.triangle")
            } description: {
                Text(error.recoveryDescription)
            } actions: {
                Button("Retry") { Task { await viewModel.load() } }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityIdentifier("uniforms-retry")
            }
            .accessibilityIdentifier("uniforms-error")
        case .loaded:
            VStack(spacing: 0) {
                header
                ScrollView {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                        summaryRow
                        body(for: viewModel.viewMode)
                        attribution
                    }
                    .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                    .padding(.top, DesignTokens.Spacing.sm + 6)
                    .padding(.bottom, DesignTokens.Spacing.lg)
                }
            }
        }
    }

    // MARK: - Header

    /// Search, the view switch and Filters, pinned above the scrolling body — the archive
    /// is long enough that scrolling its controls away would strand you mid-list with no
    /// way back to them.
    private var header: some View {
        VStack(spacing: DesignTokens.Spacing.sm + 1) {
            DepthSearchField(
                text: Binding(get: { viewModel.query }, set: { viewModel.query = $0 }),
                placeholder: "Team, kit or era",
                identifier: "uniforms-search"
            )
            HStack(spacing: DesignTokens.Spacing.sm) {
                DepthSegmentedControl(
                    options: [
                        DepthSegmentedOption<UniformArchiveViewModel.ViewMode>(
                            value: .team, label: "By team", identifier: "uniforms-view-team"
                        ),
                        DepthSegmentedOption<UniformArchiveViewModel.ViewMode>(
                            value: .era, label: "By era", identifier: "uniforms-view-era"
                        ),
                    ],
                    selection: viewModel.viewMode,
                    onChange: { viewModel.viewMode = $0 },
                    fullWidth: true
                )
                filterButton
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.screenMargin)
        .padding(.bottom, DesignTokens.Spacing.sm + 2)
        .background(DesignTokens.Colors.bg)
        .overlay(alignment: .bottom) {
            Rectangle().fill(DesignTokens.Colors.borderSubtle).frame(height: 1)
        }
    }

    /// The single entry point into filtering (DEP-271). A pill matching the app's chip
    /// vocabulary rather than a bare toolbar glyph, since this is page content, not
    /// chrome. The count badge is the only always-visible signal of an active filter, so
    /// it must never silently disappear while one is set.
    private var filterButton: some View {
        let count = viewModel.filters.activeCount
        let isActive = count > 0
        return Button {
            showFilterSheet = true
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs + 1) {
                Image(systemName: "line.3.horizontal.decrease")
                Text("Filters")
                if isActive {
                    Text("\(count)")
                        .font(.caption2.weight(.bold).monospacedDigit())
                        .foregroundStyle(DesignTokens.Colors.onAccent)
                        .frame(minWidth: 16, minHeight: 16)
                        .background(DesignTokens.Colors.accent, in: Circle())
                }
            }
            .font(.caption.weight(isActive ? .semibold : .regular))
            .foregroundStyle(isActive ? DesignTokens.Colors.accentSoft : DesignTokens.Colors.textSecondary)
            .padding(.horizontal, DesignTokens.Spacing.sm + 4)
            .frame(minHeight: 44)
            .background(
                isActive ? DesignTokens.Colors.accent.opacity(0.16) : DesignTokens.Colors.surfaceChip,
                in: Capsule()
            )
            .overlay {
                Capsule().strokeBorder(
                    isActive ? DesignTokens.Colors.accent.opacity(0.66) : .clear,
                    lineWidth: 1
                )
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniforms-filter-button")
        .accessibilityLabel(isActive ? "Filters, \(count) active" : "Filters")
    }

    private var summaryRow: some View {
        HStack {
            Text(viewModel.summary)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Spacer()
            if viewModel.filters.activeCount > 0 {
                Button("Reset") { viewModel.resetFilters() }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.accent)
                    .accessibilityIdentifier("uniforms-reset")
            }
        }
        .frame(minHeight: 18)
    }

    // MARK: - Bodies

    @ViewBuilder
    private func body(for mode: UniformArchiveViewModel.ViewMode) -> some View {
        if viewModel.isEmpty {
            emptyState
        } else {
            switch mode {
            case .team: teamGrid
            case .era: eraTimeline
            }
        }
    }

    private var teamGrid: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg - 4) {
            ForEach(viewModel.groups) { group in
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 3) {
                    Text(group.label)
                        .font(.caption.bold())
                        // Web: tracking-[0.2em] on a ~13pt footnote ≈ 2pt.
                        .tracking(2)
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm + 2),
                            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm + 2),
                        ],
                        spacing: DesignTokens.Spacing.sm + 2
                    ) {
                        ForEach(group.teams) { team in
                            teamCard(team)
                        }
                    }
                }
            }
        }
    }

    /// One team as an abbreviation, its home jersey and a kit count — the grid trades
    /// per-kit detail for seeing a whole division at once; the drill-in restores it.
    private func teamCard(_ team: UniformArchive.TeamGroup) -> some View {
        Button {
            path.append(team.teamId)
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                Text(team.teamAbbrev)
                    .font(.title3.weight(.bold).monospaced())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Spacer(minLength: DesignTokens.Spacing.sm)
                VStack(alignment: .leading, spacing: 1) {
                    Text(team.teamShortName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                        .lineLimit(1)
                    Text(team.kitCountLabel)
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(DesignTokens.Colors.textMuted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DesignTokens.Spacing.sm + 4)
            .padding(.vertical, DesignTokens.Spacing.sm + 3)
            .frame(height: 104)
            .background(alignment: .trailing) {
                // Sits clear of the card's top edge rather than bleeding off it, so the
                // jersey reads as a whole garment instead of a cropped shoulder.
                UniformThumb(
                    url: UniformArt.jerseyURL(for: team.representativeKit.id),
                    size: 80,
                    heightMultiplier: 1
                )
                .padding(.top, DesignTokens.Spacing.lg + 6)
                .padding(.trailing, 2)
            }
            .background(
                LinearGradient(
                    colors: [
                        Color(hex: team.representativeKit.colors.primary).opacity(0.27),
                        DesignTokens.Colors.surfaceCard2,
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .strokeBorder(DesignTokens.Colors.borderSubtle, lineWidth: 1)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniforms-team-\(team.teamId)")
        .accessibilityLabel("\(team.teamName), \(team.kitCountLabel)")
        .accessibilityAddTraits(.isButton)
    }

    /// The archive read the other way round: every kit by the decade it was introduced,
    /// which is the only view where two teams' kits sit side by side.
    private var eraTimeline: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            ForEach(viewModel.decades) { decade in
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 2) {
                    HStack(spacing: DesignTokens.Spacing.sm + 2) {
                        Text(decade.label)
                            .font(.largeTitle.weight(.bold).monospacedDigit())
                            .foregroundStyle(DesignTokens.Colors.textPrimary)
                        Rectangle()
                            .fill(
                                LinearGradient(
                                    colors: [DesignTokens.Colors.borderDrawer, .clear],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(height: 1)
                        Text(decade.countLabel)
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(DesignTokens.Colors.textFaintest)
                    }
                    ScrollView(.horizontal) {
                        HStack(alignment: .top, spacing: DesignTokens.Spacing.sm + 4) {
                            ForEach(decade.kits) { kit in
                                eraCell(kit)
                            }
                        }
                        // The row scrolls under the page's own margin, so its cells stop
                        // at the same edge the grid's cards do rather than at the screen.
                        .padding(.horizontal, DesignTokens.Spacing.screenMargin)
                    }
                    .scrollIndicators(.hidden)
                    .padding(.horizontal, -DesignTokens.Spacing.screenMargin)
                }
            }
        }
    }

    private func eraCell(_ kit: UniformListing) -> some View {
        Button {
            selectedKit = kit
        } label: {
            VStack(spacing: DesignTokens.Spacing.xs + 1) {
                UniformThumb(url: UniformArt.fullURL(for: kit.id), size: 56)
                Text(kit.teamAbbrev)
                    .font(.caption2.weight(.bold).monospaced())
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                Text(UniformArchive.shortKitName(kit.name))
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textMuted)
                    .lineLimit(1)
                Text(UniformArchive.years(kit))
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.top, DesignTokens.Spacing.sm)
            .padding(.bottom, DesignTokens.Spacing.sm + 2)
            .frame(width: 104)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .depthCard(dense: true, padded: false, radius: DesignTokens.Radius.sm)
        .accessibilityIdentifier("uniforms-era-kit-\(kit.id)")
        .accessibilityLabel("\(kit.teamName), \(kit.name), \(UniformArchive.yearsLong(kit))")
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.sm + 2) {
            Image(systemName: "tshirt")
                .font(.largeTitle)
                .foregroundStyle(DesignTokens.Colors.borderDrawer)
            Text("Nothing matches")
                .font(.headline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text("Try a team name, a kit name like Creamsicle, or a decade like 1970s.")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 250)
            Button {
                viewModel.resetAll()
            } label: {
                Text("Clear search and filters")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .padding(.horizontal, DesignTokens.Spacing.md + 2)
                    .frame(minHeight: 44)
                    .background(DesignTokens.Colors.surfaceChip, in: Capsule())
            }
            .buttonStyle(.plain)
            .padding(.top, DesignTokens.Spacing.xs + 2)
            .accessibilityIdentifier("uniforms-clear-all")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl + 20)
        .accessibilityIdentifier("uniforms-empty")
    }

    private var attribution: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // DEP-267: matches web's full first paragraph (UniformArchive.tsx:216-229) —
            // native was missing the CC BY 3.0 template credit, a licensing surface.
            Text(
                "Uniform figures are original artwork; team marks are reproduced for identification only. Proportions modeled on the NFL uniform template by JohnnySeoul, used under CC BY 3.0 (modified)."
            )
            Text("All kits shown here are drawn SVG references, not official NFL-owned images. For a more detailed uniform archive, see Gridiron Uniforms.")
        }
        .font(.caption2)
        .foregroundStyle(DesignTokens.Colors.textFaintest)
        .padding(.top, DesignTokens.Spacing.sm)
    }
}

/// A uniform-art thumbnail (either the full mannequin or the plain jersey crop), kept
/// with a surfaced slot so rows don't shift while loading (AGENTS.md #16). The two
/// rasters have different aspect ratios (mannequin ~2.7:1 tall, jersey crop ~0.81:1 —
/// see lib/uniforms/art.tsx's `jersey`/`full` viewBoxes), so `heightMultiplier` picks
/// the right frame for whichever URL variant the caller passed; object-fit scaled-to-fit
/// keeps the whole figure visible either way. Internal (not private): DEP-256 reuses
/// this same component in UniformPickerSheet's carousel for drop-in parity with the
/// archive, rather than re-implementing jersey rendering there.
enum UniformArtworkRetryPolicy {
    static func shouldRetry(after failures: Int) -> Bool {
        failures < 1
    }
}

struct UniformThumb: View {
    let url: URL?
    let size: CGFloat
    var heightMultiplier: CGFloat = 2.7
    @State private var failureCount = 0

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFit()
            case .failure:
                Color.clear
                    .task(id: failureCount) {
                        guard UniformArtworkRetryPolicy.shouldRetry(after: failureCount) else {
                            return
                        }
                        try? await Task.sleep(for: .milliseconds(200))
                        guard !Task.isCancelled else { return }
                        failureCount += 1
                    }
            default:
                // Reserve the slot so the row doesn't reflow once image loads (#16).
                Color.clear
            }
        }
        .id("\(url?.absoluteString ?? "none")-\(failureCount)")
        .onChange(of: url) { _, _ in failureCount = 0 }
        .frame(width: size, height: size * heightMultiplier)
        .accessibilityHidden(true)
    }
}
