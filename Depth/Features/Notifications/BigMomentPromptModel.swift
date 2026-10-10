import Foundation
import Observation

/// Decides whether to show the one-time notification prompt, with a real event about
/// the user's team as its content. It is shown at most once, never in the first
/// session, and only while the system permission dialog has never been answered.
@MainActor
@Observable
final class BigMomentPromptModel {
    /// How recent the event must be to be worth showing as the reason to opt in.
    static let maximumEventAge: TimeInterval = 7 * 24 * 60 * 60

    /// The event to show, while the prompt is up.
    private(set) var event: TeamEvent?

    @ObservationIgnored private let repository: any DepthRepository
    @ObservationIgnored private let authorizer: any NotificationAuthorizing
    @ObservationIgnored private let settings: NotificationSettingsStore
    @ObservationIgnored private let preferences: UserPreferences
    @ObservationIgnored private let isSuppressed: Bool
    @ObservationIgnored private let now: @Sendable () -> Date

    /// `isSuppressed` switches the prompt off for the life of the process, whatever the
    /// stored state says.
    init(
        repository: any DepthRepository,
        authorizer: any NotificationAuthorizing,
        settings: NotificationSettingsStore,
        preferences: UserPreferences,
        isSuppressed: Bool = false,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.repository = repository
        self.authorizer = authorizer
        self.settings = settings
        self.preferences = preferences
        self.isSuppressed = isSuppressed
        self.now = now
    }

    /// The conditions that can be checked without asking the system or the server.
    /// Callers use it to skip the work of finding a candidate team when the prompt
    /// could not appear anyway.
    var isEligible: Bool {
        !isSuppressed && settings.isAvailable && event == nil
            && preferences.hasFinishedFirstSession && !preferences.bigMomentPromptShown
    }

    func evaluate(candidateTeamId: String?) async {
        guard isEligible, let candidateTeamId,
            await authorizer.status() == .notDetermined,
            let latest = try? await repository.latestBigMoment(teamId: candidateTeamId),
            now().timeIntervalSince(latest.occurredAt) <= Self.maximumEventAge,
            // Checked again because two evaluations can overlap across the awaits above.
            isEligible
        else { return }
        event = latest
    }

    func accept() async {
        guard let shown = event else { return }
        preferences.bigMomentPromptShown = true
        event = nil
        await settings.enable(teamId: shown.teamId)
    }

    /// A no-op unless the prompt is up, so a dismissal reported after an answer was
    /// already recorded changes nothing.
    func decline() {
        guard event != nil else { return }
        preferences.bigMomentPromptShown = true
        event = nil
    }
}
