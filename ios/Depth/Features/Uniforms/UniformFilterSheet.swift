import SwiftUI

// DEP-271: replaces the Uniforms tab's scrolling kind-chip row + era dropdown with a
// single sheet, matching the List-based picker pattern already established by
// UniformPickerSheet and SeasonPickerSheet (Support/SeasonPicker.swift) — sectioned
// rows with a checkmark on the selected value, a nav-bar close button, and
// `.presentationBackground` — rather than inventing new sheet chrome.
//
// Design call (the ticket left "which native pattern" explicitly undecided): kind has
// six options (All/Home/Away/Throwback/Alternate/Color rush), which is one too many to
// read cleanly in a single-row segmented control at phone widths, and era's option
// count is data-driven (however many decades are present) — neither fits a fixed
// segmented track. A grouped List of checkmark rows handles both without truncating or
// wrapping, and it's the same shape iOS users already know from Settings-style filter
// sheets. `filters` is a live binding, so toggling a row updates the archive behind the
// sheet immediately — no separate "Apply" step.
struct UniformFilterSheet: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var filters: UniformArchive.Filters
    let eraOptions: [String]

    var body: some View {
        NavigationStack {
            List {
                Section("Kind") {
                    ForEach(UniformArchiveKindOption.allCases) { option in
                        filterRow(
                            label: option.label,
                            isSelected: filters.kind == option.kind,
                            identifier: "filter-kind-\(option.id)"
                        ) {
                            filters.kind = option.kind
                        }
                    }
                }

                Section {
                    Toggle("Current only", isOn: $filters.currentOnly)
                        .tint(DesignTokens.Colors.accent)
                        .frame(minHeight: 44)
                        .accessibilityIdentifier("filter-current-only")
                }
                .listRowBackground(DesignTokens.Colors.surfaceCard2)

                Section("Era") {
                    filterRow(
                        label: "All eras",
                        isSelected: filters.era == nil,
                        identifier: "filter-era-all"
                    ) {
                        filters.era = nil
                    }
                    ForEach(eraOptions, id: \.self) { era in
                        filterRow(
                            label: era,
                            isSelected: filters.era == era,
                            identifier: "filter-era-\(era)"
                        ) {
                            filters.era = era
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(DesignTokens.Colors.bg)
            .scrollIndicators(.hidden)
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                // Only shown once a filter is active — an always-visible "Reset" button
                // that's usually a no-op just adds noise to a sheet this small.
                if filters != UniformArchive.Filters() {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Reset") { filters = UniformArchive.Filters() }
                            .frame(minWidth: 44, minHeight: 44)
                            .accessibilityIdentifier("filter-reset")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationBackground(DesignTokens.Colors.bg)
        .accessibilityIdentifier("uniform-filter-sheet")
    }

    private func filterRow(
        label: String,
        isSelected: Bool,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(DesignTokens.Colors.accent)
                }
            }
        }
        .frame(minHeight: 44)
        .accessibilityIdentifier(identifier)
        .accessibilityLabel("\(label)\(isSelected ? ", selected" : "")")
        .listRowBackground(DesignTokens.Colors.surfaceCard2)
    }
}
