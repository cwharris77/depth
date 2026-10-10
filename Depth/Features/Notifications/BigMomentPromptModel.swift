import Foundation
import Observation

/// Decides whether to show the one-time notification prompt, with a real event about
/// the user's team as its content. It is shown at most once, never in the first
/// session or over the first-run tutorial, and only while the system permission dialog
/// has never been answered.
///
/// "Shown" is recorded when the event is published, not when it is answered, so
/// quitting the app with the prompt up does not bring it back. Publishing is not the
/// same as reaching the screen: a sheet cannot be presented while another one is open.
/// The view reports `didPresent()` when it appears, and an event that was published but
/// never appeared is withdrawn, without using up the one showing, by the next
/// `evaluate`, which then decides again from scratch.
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
    @ObservationIgnored private let isOnboardingIdle: @MainActor () -> Bool
    @ObservationIgnored private let now: @Sendable () -> Date
    /// Whether the published event's sheet has appeared.
    @ObservationIgnored private var isPresented = false

    /// `isSuppressed` switches the prompt off for the life of the process, whatever the
    /// stored state says. `isOnboardingIdle` is false while the first-run tutorial is up.
    init(
        repository: any DepthRepository,
        authorizer: any NotificationAuthorizing,
        settings: NotificationSettingsStore,
        preferences: UserPreferences,
        isSuppressed: Bool = false,
        isOnboardingIdle: @escaping @MainActor () -> Bool = { true },
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.repository = repository
        self.authorizer = authorizer
        self.settings = settings
        self.preferences = preferences
        self.isSuppressed = isSuppressed
        self.isOnboardingIdle = isOnboardingIdle
        self.now = now
    }

    /// The conditions that can be checked without asking the system or the server.
    /// Callers use it to skip the work of finding a candidate team when the prompt
    /// could not appear anyway.
    var isEligible: Bool {
        !isSuppressed && settings.isAvailable && event == nil && isOnboardingIdle()
            && preferences.hasFinishedFirstSession && !preferences.bigMomentPromptShown
    }

    /// The published event never reached the screen.
    var hasUnpresentedEvent: Bool { event != nil && !isPresented }

    /// The prompt's sheet appeared.
    func didPresent() {
        guard event != nil else { return }
        isPresented = true
    }

    func evaluate(candidateTeamId: String?) async {
        if hasUnpresentedEvent {
            event = nil
            preferences.bigMomentPromptShown = false
        }
        guard isEligible, let candidateTeamId,
            await authorizer.status() == .notDetermined,
            let latest = try? await repository.latestBigMoment(teamId: candidateTeamId),
            now().timeIntervalSince(latest.occurredAt) <= Self.maximumEventAge,
            // Checked again because two evaluations can overlap across the awaits above.
            isEligible
        else { return }
        preferences.bigMomentPromptShown = true
        isPresented = false
        event = latest
    }

    /// The prompt offers Big moments only, so that is the tier accepting leaves, even
    /// when a different one was stored before permission was ever asked for. Choosing a
    /// tier while the permission question is unanswered is what raises the system dialog.
    func accept() async {
        guard let shown = event else { return }
        preferences.bigMomentPromptShown = true
        event = nil
        isPresented = false
        await settings.setTier(.bigMoments, candidateTeamId: shown.teamId)
    }

    /// A no-op unless the prompt is up, so a dismissal reported after an answer was
    /// already recorded changes nothing.
    func decline() {
        guard event != nil else { return }
        preferences.bigMomentPromptShown = true
        event = nil
        isPresented = false
    }
}
