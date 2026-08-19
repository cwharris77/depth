import SwiftUI

// Tab for the uniform archive (port of the web `/uniforms` page). Mirrors the web's
// structure: a horizontally-scrollable kind/era/current filter bar, then kits grouped
// conference → division → team, each kit's full-mannequin WebP thumbnail with its name
// and years, and the attribution footer. Filters and grouping are pure logic in
// UniformListing.swift (same rules as lib/uniforms/filter.ts) so the two clients can't
// drift. A new tab in the root TabView, after Depth Charts and before Compare.
struct UniformsTab: View {
    @State private var viewModel: UniformArchiveViewModel

    init(repository: DepthRepository) {
        _viewModel = State(initialValue: UniformArchiveViewModel(repository: repository))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Uniforms")
                .navigationBarTitleDisplayMode(.inline)
                .background(DesignTokens.Colors.bg)
                // DEP-277: app-wide brand mark, same placement/size as every other
                // top-level screen.
                .depthBrandMarkToolbar()
        }
        .task { await viewModel.load() }
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
                    kitCountSummary
                    filterBar
                    archiveList
                    attribution
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.top, DesignTokens.Spacing.sm)
            }
        }
    }

    /// Web's "{kits.length} kits · 32 teams" summary (UniformArchive.tsx:88-89) above the
    /// filter bar. The team count is the league size, not a filtered count — matching web.
    private var kitCountSummary: some View {
        let kitCount = viewModel.groups.flatMap(\.teams).flatMap(\.kits).count
        return Text("\(kitCount) kits · 32 teams")
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.textFaint)
    }

    /// The horizontally-scrollable filter bar: kind chips, then Current-only toggle and
    /// era menu — mirroring web's one-scrollable-row filter bar.
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(UniformArchiveKindOption.allCases) { option in
                    FilterChip(
                        label: option.label,
                        isActive: viewModel.filters.kind == option.kind,
                        action: { viewModel.setKind(option.kind) }
                    )
                }

                Rectangle()
                    .fill(DesignTokens.Colors.borderStrong)
                    .frame(width: 1, height: 20)

                FilterChip(
                    label: "Current only",
                    isActive: viewModel.filters.currentOnly,
                    action: { viewModel.toggleCurrentOnly() }
                )

                Menu {
                    Button("All eras") { viewModel.setEra(nil) }
                    ForEach(viewModel.eraOptions, id: \.self) { era in
                        Button(era) { viewModel.setEra(era) }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(viewModel.filters.era ?? "All eras")
                        Image(systemName: "chevron.down")
                    }
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 44)
                    .background(DesignTokens.Colors.surfaceChip, in: Capsule())
                }
            }
            .padding(.vertical, DesignTokens.Spacing.xs)
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

/// One filter pill in the horizontal archive filter bar — the native FillPill
/// equivalent. Active state is filled with the app accent (web's FilterPill active
/// treatmenut, active fill = accent, text on onAccent).
private struct FilterChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                // DEP-267: emphasize the active label, matching Compare's position
                // chips — the two hand-rolled pills previously disagreed.
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
        .accessibilityAddTraits(isActive ? .isSelected : [])
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

/// The leading full-mannequin thumbnail, kept with a surfaced slot so rows don't shift
/// while loading (AGENTS.md #16). The mannequin viewBox is ~2.7:1 tall, so a 56-wide
/// tile is ~151 tall; object-fit scaled-to-fit keeps the whole figure visible.
private struct UniformThumb: View {
    let url: URL?
    let size: CGFloat

    var body: some View {
        AsyncImage(url: url) { phase in
            if let image = phase.image {
                image.resizable().scaledToFit()
            } else {
                // Reserve the slot so the row doesn't reflow once image loads (#16).
                Color.clear
            }
        }
        .frame(width: size, height: size * 2.7)
        .accessibilityHidden(true)
    }
}