import SwiftUI

// Tab for the uniform archive (port of the web `/uniforms` page). Mirrors the web's
// structure: kits grouped conference → division → team, each kit's full-mannequin WebP
// thumbnail with its name and years, and the attribution footer. Filters and grouping
// are pure logic in UniformListing.swift (same rules as lib/uniforms/filter.ts) so the
// two clients can't drift. A new tab in the root TabView, after Depth Charts and before
// Compare.
//
// DEP-271: unlike web (which keeps its filter bar inline — a wide viewport has room for
// scrolling chips + a dropdown), the phone-native surface puts kind/era/current-only
// filters behind a Filters button that opens UniformFilterSheet, badged with the
// active-filter count. Lives on the page next to `kitCountSummary` (Cooper review:
// not in the shared `depthTopNavToolbar` — that's global chrome, filtering is this
// screen's own content control). See UniformFilterSheet's header for the full design
// reasoning.
struct UniformsTab: View {
    @State private var viewModel: UniformArchiveViewModel
    @State private var showAccount = false
    @State private var showFilterSheet = false

    init(repository: DepthRepository) {
        _viewModel = State(initialValue: UniformArchiveViewModel(repository: repository))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Uniforms")
                .navigationBarTitleDisplayMode(.inline)
                .background(DesignTokens.Colors.bg)
                // DEP-252/DEP-277 (Cooper review): shared app-wide top nav — see
                // `depthTopNavToolbar`. No team pill on this screen; the Filters
                // button lives on the page instead (see `kitCountSummary`).
                .toolbar {
                    depthTopNavToolbar(teamPill: { EmptyView() }) {
                        showAccount = true
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
        // DEP-271: filters are a live binding into the sheet, so toggling a row there
        // updates `archiveList` behind it immediately — no separate "Apply" step.
        .sheet(isPresented: $showFilterSheet) {
            UniformFilterSheet(
                filters: Binding(
                    get: { viewModel.filters },
                    set: { viewModel.filters = $0 }
                ),
                eraOptions: viewModel.eraOptions
            )
        }
    }

    /// The single entry point into filtering (DEP-271), replacing the old scrolling
    /// chip row + era dropdown. A pill matching the app's chip vocabulary (active fill =
    /// accent, same as the removed `FilterChip`) rather than a bare toolbar glyph, since
    /// this is page content, not chrome. The count badge is the only remaining
    /// always-visible signal of an active filter, so it must never silently disappear
    /// while a filter is set.
    private var filterButton: some View {
        let isActive = viewModel.activeFilterCount > 0
        return Button {
            showFilterSheet = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "line.3.horizontal.decrease")
                Text("Filters")
                if isActive {
                    Text("\(viewModel.activeFilterCount)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(isActive ? DesignTokens.Colors.accent : .clear)
                        .frame(minWidth: 16, minHeight: 16)
                        .background(DesignTokens.Colors.onAccent, in: Circle())
                }
            }
            .font(isActive ? .caption.weight(.semibold) : .caption)
            .foregroundStyle(isActive ? DesignTokens.Colors.onAccent : DesignTokens.Colors.textSecondary)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(
                isActive ? DesignTokens.Colors.accent : DesignTokens.Colors.surfaceChip,
                in: Capsule()
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("uniforms-filter-button")
        .accessibilityLabel(isActive ? "Filters, \(viewModel.activeFilterCount) active" : "Filters")
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
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    summaryRow
                    archiveList
                    attribution
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.top, DesignTokens.Spacing.sm)
            }
        }
    }

    /// Web's "{kits.length} kits · 32 teams" summary (UniformArchive.tsx:88-89) plus the
    /// DEP-271 Filters entry point, on one row at the top of the scroll content — a
    /// page-level control (Cooper review), not global chrome. The team count is the
    /// league size, not a filtered count — matching web.
    private var summaryRow: some View {
        HStack {
            let kitCount = viewModel.groups.flatMap(\.teams).flatMap(\.kits).count
            Text("\(kitCount) kits · 32 teams")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textFaint)
            Spacer()
            filterButton
        }
    }

    @ViewBuilder
    private var archiveList: some View {
        if viewModel.groups.isEmpty {
            Text("No kits match these filters.")
                .font(.footnote)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .padding(.top, DesignTokens.Spacing.md)
        } else {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                ForEach(viewModel.groups) { group in
                    section(group)
                }
            }
        }
    }

    private func section(_ group: UniformArchive.DivisionGroup) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("\(group.conference) \(group.division.uppercased())")
                .font(.footnote.bold())
                // Web: tracking-[0.2em] on a ~13pt footnote ≈ 2pt.
                .tracking(2)
                .foregroundStyle(DesignTokens.Colors.textFaint)
                .padding(.bottom, DesignTokens.Spacing.xs)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(DesignTokens.Colors.borderDrawer).frame(height: 1)
                }

            ForEach(group.teams, id: \.teamId) { team in
                teamRow(team)
            }
        }
    }

    private func teamRow(_ team: UniformArchive.TeamGroup) -> some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
            // Per-team color accent bar, mirroring web's 3px gradient rail.
            let home = team.kits.first(where: { $0.kind == .home }) ?? team.kits[0]
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(hex: home.colors.primary),
                            Color(hex: home.colors.secondary),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 3)
                .padding(.vertical, 2)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(team.teamName)
                    .font(.subheadline.bold())
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                // DEP-267: web wraps with `flex flex-wrap`; a fixed HStack clipped a
                // team's later kits off-screen once it had 5+ (throwback/alternate/color
                // rush). An adaptive-column grid wraps to a new row instead.
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 56), spacing: DesignTokens.Spacing.md)],
                    alignment: .leading,
                    spacing: DesignTokens.Spacing.md
                ) {
                    ForEach(team.kits) { kit in
                        KitFigure(kit: kit, teamName: team.teamName)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
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

/// One kit's full-mannequin WebP thumbnail plus name and years — the archive's unit.
private struct KitFigure: View {
    let kit: UniformListing
    let teamName: String

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            UniformThumb(url: UniformArt.fullURL(for: kit.id), size: 56)
            Text(kit.name)
                .font(.caption2)
                .foregroundStyle(DesignTokens.Colors.textMuted)
                .multilineTextAlignment(.center)
                .lineLimit(2, reservesSpace: true)
            if let years = yearsText {
                Text(years)
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
        }
        .frame(width: 56)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var accessibilityText: String {
        [teamName, kit.name, yearsText].compactMap { $0 }.joined(separator: ", ")
    }

    private var yearsText: String? {
        guard let start = kit.yearStart else { return nil }
        if let end = kit.yearEnd { return start == end ? "\(start)" : "\(start)–\(end)" }
        return "\(start)–"
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
