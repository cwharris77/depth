import Foundation

// Maps a decoded team file onto `TeamStatHistory`. Newest season first; games in the file's
// order (regular season, then postseason). A window with no games is dropped rather than
// shown as a zero line.
enum TeamStatFilesMapper {
    static func map(_ file: TeamSeasonsFileDTO) -> TeamStatHistory {
        TeamStatHistory(
            seasons: file.seasons.sorted { $0.season > $1.season }.map(mapSeason))
    }

    private static func mapSeason(_ entry: TeamSeasonEntryDTO) -> TeamSeasonHistory {
        let derived = entry.derived
        return TeamSeasonHistory(
            season: entry.season,
            allowed: derived.flatMap {
                window(
                    games: $0.games, throughWeek: nil, rates: $0.allowedPerGame,
                    ranks: $0.ranks, rankedTeams: $0.rankedTeams)
            },
            recent: derived?.recent.flatMap {
                window(
                    games: $0.games, throughWeek: $0.throughWeek, rates: $0.allowedPerGame,
                    ranks: $0.ranks, rankedTeams: $0.rankedTeams)
            },
            games: (entry.games ?? []).compactMap { game in
                guard let opponent = game.opponent else { return nil }
                return TeamGameLine(
                    id: game.gameId ?? "\(entry.season)-\(game.week)-\(opponent)",
                    week: game.week, isPostseason: game.seasonType == "POST",
                    opponentId: opponent, offense: side(game.offense),
                    allowed: side(game.allowed))
            })
    }

    private static func window(
        games: Int?, throughWeek: Int?, rates: StatLineDTO?, ranks: StatLineDTO?,
        rankedTeams: Int?
    ) -> TeamAllowedWindow? {
        guard let games, games > 0, let rates else { return nil }
        // Ranks only mean something with their denominator.
        let ranked = rankedTeams != nil ? ranks : nil
        return TeamAllowedWindow(
            games: games, throughWeek: throughWeek,
            rates: TeamAllowedRates(
                passingYards: rates.double("passing_yards"),
                rushingYards: rates.double("rushing_yards"),
                totalYards: rates.double("total_yards"),
                passingEpa: rates.double("passing_epa"),
                rushingEpa: rates.double("rushing_epa"),
                passingEpaPerDropback: rates.double("passing_epa_per_dropback"),
                rushingEpaPerCarry: rates.double("rushing_epa_per_carry")),
            ranks: ranked.map {
                TeamAllowedRanks(
                    passingYards: $0.int("passing_yards"),
                    rushingYards: $0.int("rushing_yards"),
                    totalYards: $0.int("total_yards"),
                    passingEpa: $0.int("passing_epa"),
                    rushingEpa: $0.int("rushing_epa"),
                    passingEpaPerDropback: $0.int("passing_epa_per_dropback"),
                    rushingEpaPerCarry: $0.int("rushing_epa_per_carry"))
            },
            rankedTeams: ranked == nil ? nil : rankedTeams)
    }

    private static func side(_ line: StatLineDTO?) -> TeamGameSide? {
        guard let line else { return nil }
        return TeamGameSide(
            passingYards: line.double("passing_yards"),
            rushingYards: line.double("rushing_yards"),
            passingEpa: line.double("passing_epa"),
            rushingEpa: line.double("rushing_epa"))
    }
}
