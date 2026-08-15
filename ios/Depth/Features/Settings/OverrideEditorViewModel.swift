import Foundation
import Observation

// Retryable editor state for a single position group. The visible saved order changes
// only after the awaited RPC succeeds; a failed save leaves the complete draft intact.
@Observable
@MainActor
final class OverrideEditorViewModel {
    let teamId: String
    let position: String
    private(set) var savedPlayerIds: [String]
    var draftPlayerIds: [String]
    private(set) var isSaving = false
    private(set) var error: DepthError?

    @ObservationIgnored private let writer: any DepthOverrideWriting

    init(teamId: String, position: String, playerIds: [String], writer: any DepthOverrideWriting) {
        self.teamId = teamId
        self.position = position
        savedPlayerIds = playerIds
        draftPlayerIds = playerIds
        self.writer = writer
    }

    var hasUnsavedChanges: Bool { draftPlayerIds != savedPlayerIds }

    func move(fromOffsets: IndexSet, toOffset: Int) {
        draftPlayerIds.move(fromOffsets: fromOffsets, toOffset: toOffset)
    }

    func cancel() {
        draftPlayerIds = savedPlayerIds
        error = nil
    }

    func save() async -> Bool {
        guard !isSaving else { return false }
        guard !draftPlayerIds.isEmpty else {
            error = .validation("Keep at least one starter in this group.")
            return false
        }
        guard Set(draftPlayerIds).count == draftPlayerIds.count else {
            error = .validation("A player can appear only once in a position group.")
            return false
        }

        isSaving = true
        error = nil
        defer { isSaving = false }
        do {
            try await writer.save(teamId: teamId, position: position, playerIds: draftPlayerIds)
            savedPlayerIds = draftPlayerIds
            return true
        } catch let depthError as DepthError {
            error = depthError
            return false
        } catch let unexpectedError {
            error = .server(unexpectedError.localizedDescription)
            return false
        }
    }
}
