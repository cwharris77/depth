import SwiftUI

// The archive's one filtering surface (DEP-271; reshaped by the 2026-08-27 archive v2).
// v1 was a grouped List of single-select checkmark rows for kind and era. v2 changes what
// it holds rather than how it is reached:
//   • Sort moved in from the top bar, as the checked list at the top — it is a choice
//     about the same result set, so it belongs beside the filters instead of competing
//     with search for header space.
//   • Kind became multi-select chips carrying live counts, because "throwbacks and color
//     rush" is a real question and single-select couldn't ask it. The counts are of the
//     whole archive, not the filtered set, so a chip never reads "0" just because a
//     different chip is on.
//   • Era left entirely: browsing by decade is now a whole view mode behind the By era
//     segment, not a value you narrow to.
//
// Bindings are live, so every change is visible in the archive behind the sheet as it is
// made. The bottom button is therefore a dismiss, not an Apply — it states the count it is
// dismissing you back to, which is the one thing the sheet can say that the screen behind
// it can't while covered.
struct UniformFilterSheet: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var filters: UniformArchive.Filters
    /// Per-kind totals across the unfiltered archive.
    let kindCounts: [UniformKind: Int]
    /// "Show 42 kits" — what dismissing leaves on screen.
    let applyLabel: String

    var body: some View {
        DepthSheet(
            title: nil,
            sizing: .height(520),
            showDragIndicator: true,
            // No X: this sheet's own "Show N kits" bottom button is the dismiss, and the
            // header row already carries a trailing control ("Reset all"). The X would
            // collide with it.
            showClose: false,
            background: DesignTokens.Colors.surfaceCard
        ) {
            ScrollView {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    header
                    sortSection
                    kindSection
                    currentOnlyRow
                    applyButton
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.sm)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
            .scrollBounceBehavior(.basedOnSize)
            .background(DesignTokens.Colors.bg)
        }
        .accessibilityIdentifier("uniform-filter-sheet")
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Filters")
                .font(.title3.bold())
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Spacer()
            Button("Reset all") { filters = UniformArchive.Filters() }
                .font(.subheadline.weight(.semibold))
                // Shown even when inert so the row doesn't reflow as filters come and
                // go; disabled rather than hidden, which is also what tells you nothing
                // is on.
                .foregroundStyle(
                    filters.isDefault ? DesignTokens.Colors.textFaintest : DesignTokens.Colors.accent
                )
                .disabled(filters.isDefault)
                .accessibilityIdentifier("filter-reset")
        }
    }

    private var sortSection: some View {
        section("SORT") {
            VStack(spacing: 1) {
                ForEach(UniformArchive.SortOrder.allCases) { order in
                    sortRow(order)
                }
            }
        }
    }

    private func sortRow(_ order: UniformArchive.SortOrder) -> some View {
        let isSelected = filters.sort == order
        return Button {
            filters.sort = order
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text(order.label)
                        .font(.subheadline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                    Text(order.hint)
                        .font(.caption)
                        .foregroundStyle(DesignTokens.Colors.textFaint)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DesignTokens.Colors.accent)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md - 2)
            .frame(minHeight: 46)
            .background(
                isSelected ? DesignTokens.Colors.accent.opacity(0.12) : .clear,
                in: RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            )
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("filter-sort-\(order.id)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var kindSection: some View {
        section("KIND") {
            // Chips wrap rather than scroll: five of them fit two phone-width rows, and a
            // horizontal scroller would hide the last one behind an edge with no hint.
            DepthFlowLayout(spacing: DesignTokens.Spacing.sm - 1) {
                ForEach(UniformArchive.kindOrder, id: \.self) { kind in
                    kindChip(kind)
                }
            }
        }
    }

    private func kindChip(_ kind: UniformKind) -> some View {
        let isOn = filters.kinds.contains(kind)
        return Button {
            if isOn { filters.kinds.remove(kind) } else { filters.kinds.insert(kind) }
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs + 2) {
                Text(UniformArchive.kindChipLabel(kind))
                    .font(.footnote.weight(.semibold))
                Text("\(kindCounts[kind] ?? 0)")
                    .font(.caption.monospacedDigit())
                    .opacity(0.65)
            }
            .foregroundStyle(isOn ? DesignTokens.Colors.accentSoft : DesignTokens.Colors.textSecondary)
            .padding(.horizontal, DesignTokens.Spacing.md - 3)
            .frame(minHeight: 44)
            .background(
                isOn ? DesignTokens.Colors.accent.opacity(0.16) : DesignTokens.Colors.surfaceRaised,
                in: Capsule()
            )
            .overlay {
                Capsule().strokeBorder(
                    isOn ? DesignTokens.Colors.accent.opacity(0.66) : DesignTokens.Colors.borderSubtle,
                    lineWidth: 1
                )
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("filter-kind-\(kind.rawValue)")
        .accessibilityLabel("\(UniformArchive.kindChipLabel(kind)), \(kindCounts[kind] ?? 0) kits")
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    private var currentOnlyRow: some View {
        Toggle(isOn: $filters.currentOnly) {
            VStack(alignment: .leading, spacing: 1) {
                Text("Current kits only")
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Text("Hide retired and one-off kits")
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textFaint)
            }
        }
        .tint(DesignTokens.Colors.accent)
        .frame(minHeight: 46)
        .accessibilityIdentifier("filter-current-only")
    }

    private var applyButton: some View {
        Button {
            dismiss()
        } label: {
            Text(applyLabel)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(DesignTokens.Colors.onAccent)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(DesignTokens.Colors.accent, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("filter-apply")
    }

    private func section<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm + 1) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .tracking(1.4)
                .foregroundStyle(DesignTokens.Colors.textFaintest)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
