import Foundation

@testable import Depth

// Shared test double recording every `AppEvent` passed to `record(_:)`, so view-model
// tests can assert exactly which product/error events a code path fires — including
// the negative case (no event fired) — without a real Supabase insert. A plain
// lock-protected class (not an actor): `AppEventsRecording.record` is deliberately
// synchronous/non-async so callers never await it, and an actor would force tests to
// wait for the async hop to land before asserting.
final class RecordingAppEventsRecorder: AppEventsRecording, @unchecked Sendable {
    private let lock = NSLock()
    private var recorded: [AppEvent] = []

    func record(_ event: AppEvent) {
        lock.lock()
        recorded.append(event)
        lock.unlock()
    }

    func events() -> [AppEvent] {
        lock.lock()
        defer { lock.unlock() }
        return recorded
    }
}
