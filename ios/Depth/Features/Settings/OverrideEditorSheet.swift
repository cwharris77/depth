import SwiftUI
import UIKit

// Native drag-to-reorder sheet for one group. Interactive dismissal is blocked while a
// draft exists, and success haptics fire only after Supabase confirms the atomic save.
struct OverrideEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: OverrideEditorViewModel
    @State private var showDiscardConfirmation = false

    private let playerNames: [String: String]
    private let onSaved: ([String]) -> Void

    init(
        viewModel: OverrideEditorViewModel,
        playerNames: [String: String],
        onSaved: @escaping ([String]) -> Void = { _ in }
    ) {
        _viewModel = State(initialValue: viewModel)
        self.playerNames = playerNames
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.draftPlayerIds, id: \.self) { playerId in
                    Text(playerNames[playerId] ?? "Unknown player")
                        .accessibilityValue("Drag to change depth order")
                }
                .onMove(perform: viewModel.move)

                if let error = viewModel.error {
                    Text(error.recoveryDescription)
                        .foregroundStyle(.red)
                        .accessibilityIdentifier("override-error")
                }
            }
            .environment(\.editMode, .constant(.active))
            .navigationTitle("\(viewModel.position) Order")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if viewModel.hasUnsavedChanges {
                            showDiscardConfirmation = true
                        } else {
                            dismiss()
                        }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            if await viewModel.save() {
                                onSaved(viewModel.savedPlayerIds)
                                UINotificationFeedbackGenerator().notificationOccurred(.success)
                                dismiss()
                            }
                        }
                    }
                    .disabled(!viewModel.hasUnsavedChanges || viewModel.isSaving)
                }
            }
        }
        .interactiveDismissDisabled(viewModel.hasUnsavedChanges)
        .confirmationDialog("Discard changes?", isPresented: $showDiscardConfirmation) {
            Button("Discard Changes", role: .destructive) {
                viewModel.cancel()
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        }
    }
}
