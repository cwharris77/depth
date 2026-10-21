import Foundation

/// One calendar day of a team's feed: a heading and that day's events in the order given.
struct TeamFeedDay: Equatable, Identifiable {
    /// The start of the day, so the id holds for every event on it.
    let id: Date
    let title: String
    let events: [TeamEvent]

    /// Splits events, already newest first, into days in the same order. Today and
    /// yesterday are named; older days carry the weekday and date, and the year only
    /// when it is not the current one.
    static func group(
        _ events: [TeamEvent], now: Date, calendar: Calendar = .current,
        locale: Locale = .current
    ) -> [TeamFeedDay] {
        var days: [TeamFeedDay] = []
        for event in events {
            let start = calendar.startOfDay(for: event.occurredAt)
            if let last = days.last, last.id == start {
                days[days.count - 1] = TeamFeedDay(
                    id: start, title: last.title, events: last.events + [event])
            } else {
                days.append(
                    TeamFeedDay(
                        id: start,
                        title: title(
                            for: start, now: now, calendar: calendar,
                            locale: locale),
                        events: [event]))
            }
        }
        return days
    }

    private static func title(
        for day: Date, now: Date, calendar: Calendar, locale: Locale
    ) -> String {
        if calendar.isDate(day, inSameDayAs: now) { return "Today" }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now),
            calendar.isDate(day, inSameDayAs: yesterday)
        {
            return "Yesterday"
        }
        var style = Date.FormatStyle(
            locale: locale, calendar: calendar, timeZone: calendar.timeZone
        )
        .weekday(.wide).month(.abbreviated).day()
        if calendar.component(.year, from: day) != calendar.component(.year, from: now) {
            style = style.year()
        }
        return day.formatted(style)
    }
}
