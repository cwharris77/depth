import Foundation

/// The small print shown with an event: where it came from and when.
enum TeamEventCaption {
    /// A readable name for a known source. Nil for one this build does not know, which
    /// is then left out rather than shown as a raw identifier.
    static func sourceLabel(_ source: String) -> String? {
        switch source {
        case "espn_depth_chart": "ESPN depth chart"
        case "espn_transactions": "ESPN transactions"
        case "nflverse_stats": "nflverse"
        default: nil
        }
    }

    static func line(
        for event: TeamEvent, calendar: Calendar = .current, locale: Locale = .current
    ) -> String {
        var style = Date.FormatStyle(
            locale: locale, calendar: calendar, timeZone: calendar.timeZone)
        style = style.month(.abbreviated).day()
        let date = event.occurredAt.formatted(style)
        guard let source = sourceLabel(event.source) else { return date }
        return "\(source) · \(date)"
    }

    /// How far a record chase has come, from 0 to 1. Nil for any other event and when the
    /// numbers are missing or the record is not a positive number.
    static func progress(for event: TeamEvent) -> Double? {
        guard event.type == "record_chase", let value = event.payload.value,
            let record = event.payload.record, record > 0
        else { return nil }
        return min(max(value / record, 0), 1)
    }
}
