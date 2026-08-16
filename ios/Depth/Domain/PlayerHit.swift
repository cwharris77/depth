import Foundation

// A player-search hit that can come from any of the 32 teams (searchPlayers), not just
// the roster already loaded on screen — so it carries its own team, unlike a plain
// roster `Player`. Mirrors lib/types.ts's PlayerHit.
struct PlayerHit: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    let number: Int
    let position: Position
    let college: String?
    let photoUrl: String?
    let team: Team
}

// Search-normalization helpers ported verbatim from lib/utils/search/search.ts so the
// native cross-team search behaves identically to web's: same normalized cache key, same
// LIKE escaping, same name-prefix-first ranking, same colloquial position groups.
enum PlayerSearch {
    /// The longest query worth running against Postgres (web's MAX_PLAYER_SEARCH_QUERY_LENGTH).
    static let maxQueryLength = 30

    /// Normalize a raw search input: trim, then collapse internal whitespace runs so
    /// "geno  smith" and "geno smith" are one query. Nil when empty/whitespace-only or
    /// over the length cap — search is unauthenticated, so nothing user-supplied may
    /// reach Postgres unvetted.
    static func normalizePlayerSearchQuery(_ raw: String) -> String? {
        let q = raw
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
        guard !q.isEmpty, q.count <= maxQueryLength else { return nil }
        return q
    }

    /// Escape LIKE wildcards (`%`, `_`, `\`) so they match literally instead of acting
    /// as pattern wildcards (web's escapeLike). An input of "100%" must not match every
    /// name merely starting with "100".
    static func escapeLike(_ input: String) -> String {
        var escaped = ""
        escaped.reserveCapacity(input.count)
        for char in input {
            if char == "\\" || char == "%" || char == "_" {
                escaped.append("\\")
            }
            escaped.append(char)
        }
        return escaped
    }

    /// Name-prefix hits rank first, then alphabetical — stable and predictable, the same
    /// order web applies after merging its separately-filtered queries.
    static func rankByNameMatch(_ hits: [PlayerHit], query: String) -> [PlayerHit] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return hits.sorted { a, b in
            let aStarts = a.name.lowercased().hasPrefix(q) ? 0 : 1
            let bStarts = b.name.lowercased().hasPrefix(q) ? 0 : 1
            if aStarts != bStarts { return aStarts < bStarts }
            return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
        }
    }

    /// Resolve a colloquial position-group query ("OL", "d-line", "secondary") to its
    /// member positions, or nil when the query isn't a known group. Keys are normalized
    /// (lowercased, spaces/hyphens stripped), matching web's POSITION_GROUPS.
    static func positionGroupPositions(_ query: String) -> [Position]? {
        let key = query
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "-", with: "")
            .filter { !$0.isWhitespace }
            .lowercased()
        return positionGroups[key]
    }

    private static let offensePositions: Set<Position> = [
        .qb, .rb, .fb, .wr, .te, .lt, .lg, .c, .rg, .rt,
    ]
    private static let defensePositions: Set<Position> = [
        .de, .lde, .rde, .dt, .nt, .lb, .wlb, .lilb, .rilb, .slb,
        .cb, .lcb, .rcb, .nb, .s, .ss, .fs,
    ]

    private static let positionGroups: [String: [Position]] = [
        "ol": [.lt, .lg, .c, .rg, .rt],
        "oline": [.lt, .lg, .c, .rg, .rt],
        "offensiveline": [.lt, .lg, .c, .rg, .rt],
        "dl": [.de, .lde, .rde, .dt, .nt],
        "dline": [.de, .lde, .rde, .dt, .nt],
        "defensiveline": [.de, .lde, .rde, .dt, .nt],
        "edge": [.de, .lde, .rde],
        "db": [.cb, .lcb, .rcb, .nb, .s, .ss, .fs],
        "dbs": [.cb, .lcb, .rcb, .nb, .s, .ss, .fs],
        "secondary": [.cb, .lcb, .rcb, .nb, .s, .ss, .fs],
        "lbs": [.lb, .wlb, .lilb, .rilb, .slb],
        "linebackers": [.lb, .wlb, .lilb, .rilb, .slb],
        "off": Array(offensePositions),
        "offense": Array(offensePositions),
        "def": Array(defensePositions),
        "defense": Array(defensePositions),
        "st": [.k, .p, .ls],
        "specialteams": [.k, .p, .ls],
    ]
}