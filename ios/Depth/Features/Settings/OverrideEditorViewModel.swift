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
    @ObservationIgnored private let events: any AppEventsRecording

    init(
        teamId: String, position: String, playerIds: [String], writer: any DepthOverrideWriting,
        events: any AppEventsRecording = NoOpAppEventsRecorder()
    ) {
        self.teamId = teamId
        self.position = position
        savedPlayerIds = playerIds
        draftPlayerIds = playerIds
        self.writer = writer
        self.events = events
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
            events.record(.error(category: "validation"))
            return false
        }
        guard Set(draftPlayerIds).count == draftPlayerIds.count else {
            error = .validation("A player can appear only once in a position group.")
            events.record(.error(category: "validation"))
            return false
        }

        isSaving = true
        error = nil
        defer { isSaving = false }
        do {
            try await writer.save(teamId: teamId, position: position, playerIds: draftPlayerIds)
            savedPlayerIds = draftPlayerIds
            events.record(.overrideSaved)
            return true
        } catch let depthError as DepthError {
            error = depthError
            events.record(.error(category: depthError.telemetryCategory))
            return false
        } catch let unexpectedError {
            error = .server(unexpectedError.localizedDescription)
            events.record(.error(category: "server"))
            return false
        }
    }
}
