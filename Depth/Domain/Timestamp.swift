import Foundation

// One tolerant ISO-8601 parser for the timestamp strings that arrive from Supabase.
//
// Postgres `timestamptz` serializes with fractional seconds ("2026-01-06T12:00:00.123456+00:00"),
// which a default `ISO8601DateFormatter` refuses — it needs `.withFractionalSeconds` set, and
// then *that* formatter refuses a timestamp without them. Every caller therefore has to try
// both, and each one that forgot silently degraded: `compareFreshness` returned `.unavailable`
// for a perfectly fresh row (stamping "Update time unavailable"), and Compare's season stamp
// dropped its date and printed a bare "17 GAMES". This helper exists so that "try both" is
// written once instead of per call site.
//
// Extracted from RecentParticipationMapper's private `parseTimestamp`, which had the correct
// two-formatter shape and is now the caller rather than the owner.
enum Timestamp {
    /// Parses an ISO-8601 timestamp with or without fractional seconds. Returns nil only for
    /// input that is genuinely not a timestamp — untrusted values degrade, never throw.
    /// The formatters are built per call rather than cached in a `static let`:
    /// `ISO8601DateFormatter` is a mutable reference type and therefore not `Sendable`, so a
    /// shared static would need an `@unchecked`/`nonisolated(unsafe)` escape hatch that the
    /// iOS operating manual rules out. Parsing happens a few times per screen, never in a
    /// loop over rows, so the allocation is not worth buying back with a data race.
    static func parseISO8601(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }
}
