import Foundation
import Supabase

// Privacy-minimal native-app usage counters (design spec Milestone 2B item 26; full
// App Privacy documentation lives at docs/ios-privacy-telemetry.md). `app_events`
// (supabase/migrations/20260815084146_add_app_events.sql) stores only a fixed event
// name, non-sensitive error category, and marketing version — never a user id, device id, or session id
// — so this type can never carry anything that identifies or tracks an individual.
enum AppEvent: Equatable {
    case appLaunch
    case depthChartReached
    case authStarted
    case authCompleted
    case overrideSaved
    /// `category` must be one of `DepthError`/`DepthAuthError`'s `telemetryCategory`
    /// values — the DB CHECK constraint rejects anything else.
    case error(category: String)

    var name: String {
        switch self {
        case .appLaunch: "app_launch"
        case .depthChartReached: "depth_chart_reached"
        case .authStarted: "auth_started"
        case .authCompleted: "auth_completed"
        case .overrideSaved: "override_saved"
        case .error: "error"
        }
    }

    var errorCategory: String? {
        if case .error(let category) = self { category } else { nil }
    }
}

protocol AppEventsRecording: Sendable {
    /// Fire-and-forget from the caller's perspective — never throws, never blocks the
    /// calling code, and never retries or queues on failure (unlike roster reads,
    /// there is nothing to show a user for a dropped usage event).
    func record(_ event: AppEvent)
}

// DEP-322: the wire payload admits only a numeric marketing version, never the
// Settings diagnostic string (which includes the build). Missing metadata is omitted
// so telemetry still works in bundles without a version, just like older clients.
struct AppEventPayload: Encodable, Sendable {
    let eventName: String
    let errorCategory: String?
    let appVersion: String?

    init(event: AppEvent, appVersion: String?) {
        eventName = event.name
        errorCategory = event.errorCategory
        if let appVersion, appVersion.utf8.count <= 32,
           appVersion.range(of: #"^[0-9]+(\.[0-9]+){0,2}\z"#, options: .regularExpression) != nil {
            self.appVersion = appVersion
        } else {
            self.appVersion = nil
        }
    }

    enum CodingKeys: String, CodingKey {
        case eventName = "event_name"
        case errorCategory = "error_category"
        case appVersion = "app_version"
    }
}

final class SupabaseAppEventsRecorder: AppEventsRecording, Sendable {
    private let client: SupabaseClient
    private let appVersion: String?

    init(
        client: SupabaseClient,
        appVersion: String? = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    ) {
        self.client = client
        self.appVersion = appVersion
    }

    func record(_ event: AppEvent) {
        let client = client
        let appVersion = appVersion
        Task.detached(priority: .background) {
            _ = try? await client.from("app_events")
                .insert(AppEventPayload(event: event, appVersion: appVersion))
                .execute()
        }
    }
}

/// Test/preview double — records nothing, makes no network call.
struct NoOpAppEventsRecorder: AppEventsRecording {
    func record(_ event: AppEvent) {}
}
