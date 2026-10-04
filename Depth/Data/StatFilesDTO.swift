import Foundation

// The wire shape of `v1/players/{espn_id}/seasons.json`: one ledger per player, a row per
// (season, season type, team) with a numeric stat line per source section. Every field is
// optional so a file written by a newer pipeline, or a season missing a source, still decodes.

/// One section's numbers keyed by source column. Non-numeric cells (the per-kick distance
/// lists) are skipped, so a new text column can never fail a decode.
struct StatLineDTO: Decodable, Equatable {
    private let values: [String: Double]

    init(values: [String: Double]) {
        self.values = values
    }

    init(from decoder: Decoder) throws {
        let cells = try decoder.singleValueContainer().decode([String: Cell].self)
        values = cells.compactMapValues(\.number)
    }

    func double(_ column: String) -> Double? { values[column] }

    func int(_ column: String) -> Int? { values[column].map { Int($0.rounded()) } }

    private struct Cell: Decodable {
        let number: Double?

        init(from decoder: Decoder) throws {
            number = try? decoder.singleValueContainer().decode(Double.self)
        }
    }
}

struct PlayerSeasonRowDTO: Decodable, Equatable {
    let season: Int
    let seasonType: String
    /// The team's id (a slug such as "chiefs"), not its abbreviation.
    let team: String?
    let box: StatLineDTO?
    let snaps: StatLineDTO?
    let pfr: StatLineDTO?
    let ngs: StatLineDTO?

    enum CodingKeys: String, CodingKey {
        case season, team, box, snaps, pfr, ngs
        case seasonType = "season_type"
    }
}

struct PlayerSeasonsFileDTO: Decodable, Equatable {
    let seasons: [PlayerSeasonRowDTO]
}
