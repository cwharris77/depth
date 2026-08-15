import Foundation
import SwiftUI

// Formats the on-device cache timestamps `CachingDepthRepository` already exposes
// (`teamListCachedAt`, `TeamDetailViewModel.cachedAt`) into copy honest about what the
// value actually is: when this device last saved a snapshot to disk — not the upstream
// ESPN ingestion `updated_at`, which the app never fetches (task-8d brief).
enum DataTimestamp {
    static let notSavedYet = "Not saved yet"

    /// Secondary copy clarifying the timestamp isn't a source/ingestion freshness signal.
    static let explanation =
        "This is when your device last saved this data, not when the underlying stats "
        + "were last updated."

    /// `now`/`locale`/`timeZone` are explicit (never default to a live clock/Locale.current
    /// inside the formatter) so tests get a deterministic string.
    static func savedOnDeviceLabel(
        _ cachedAt: Date?,
        now: Date = Date(),
        locale: Locale = .current,
        timeZone: TimeZone = .current
    ) -> String {
        guard let cachedAt else { return notSavedYet }
        var calendar = Calendar.current
        calendar.locale = locale
        calendar.timeZone = timeZone
        let formatter = RelativeDateTimeFormatter()
        formatter.calendar = calendar
        formatter.locale = locale
        formatter.unitsStyle = .full
        let relative = formatter.localizedString(for: cachedAt, relativeTo: now)
        return "Saved on this device \(relative)"
    }
}

/// Re-renders `savedOnDeviceLabel` every minute via `TimelineView` so the relative text
/// ("2 hours ago") doesn't silently go stale while a screen stays on-screen (Greptile
/// review on depth#366: a plain `Text` computed once never advances on its own).
struct SavedOnDeviceLabel: View {
    let cachedAt: Date?

    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { context in
            Text(DataTimestamp.savedOnDeviceLabel(cachedAt, now: context.date))
        }
    }
}
