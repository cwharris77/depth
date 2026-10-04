import Foundation

// Maps decoded record files onto the domain types. Only regular-season files are read: a file
// with any other scope would be a different comparator, so it maps to nil rather than being
// shown under a regular-season caption. An entry missing a field a claim needs is dropped, never
// filled in.
enum RecordStatFilesMapper {
    private static let supportedScope = "REG"

    static func map(_ file: PlayerHighlightsFileDTO) -> PlayerHighlights? {
        guard file.scope == supportedScope else { return nil }
        var entries: [RecordStat: [RecordKind: PlayerHighlight]] = [:]
        for (statName, kinds) in file.highlights ?? [:] {
            guard let stat = RecordStat(rawValue: statName) else { continue }
            for (kindName, dto) in kinds {
                guard let kind = RecordKind(rawValue: kindName), let highlight = highlight(dto)
                else { continue }
                entries[stat, default: [:]][kind] = highlight
            }
        }
        let highlights = PlayerHighlights(coverage: coverage(file.coverage), entries: entries)
        return highlights.isEmpty ? nil : highlights
    }

    static func map(_ file: LeagueRecordsFileDTO) -> LeagueRecords? {
        guard file.scope == supportedScope, let stat = file.stat.flatMap(RecordStat.init)
        else { return nil }
        return LeagueRecords(
            stat: stat, coverage: coverage(file.coverage),
            singleGame: section(file.singleGame), singleSeason: section(file.singleSeason))
    }

    private static func coverage(_ dto: RecordCoverageDTO?) -> RecordCoverage? {
        guard let from = dto?.fromSeason, let to = dto?.toSeason else { return nil }
        return RecordCoverage(fromSeason: from, toSeason: to)
    }

    private static func highlight(_ dto: HighlightDTO) -> PlayerHighlight? {
        // A rank is meaningless without the value and the count it is measured against.
        guard let value = dto.value, let season = dto.season, let rank = dto.allTimeRank,
            let atOrAbove = dto.playersAtOrAbove
        else { return nil }
        let hasTeamRank = dto.teamRank != nil && dto.teamPlayersAtOrAbove != nil
        return PlayerHighlight(
            value: value, season: season, week: dto.week, teamId: dto.team, gameId: dto.gameId,
            opponentId: dto.opponent, allTimeRank: rank, playersAtOrAbove: atOrAbove,
            teamRank: hasTeamRank ? dto.teamRank : nil,
            teamPlayersAtOrAbove: hasTeamRank ? dto.teamPlayersAtOrAbove : nil)
    }

    private static func section(_ dto: RecordSectionDTO?) -> LeagueRecordSection {
        LeagueRecordSection(
            top: (dto?.top ?? []).compactMap { entry in
                guard let playerId = entry.playerId, let rank = entry.rank,
                    let value = entry.value, let season = entry.season
                else { return nil }
                return LeagueRecordEntry(
                    playerId: playerId, rank: rank, value: value, season: season,
                    week: entry.week, teamId: entry.team, gameId: entry.gameId,
                    opponentId: entry.opponent)
            },
            milestones: (dto?.thresholds ?? []).compactMap { threshold in
                guard let value = threshold.value, let performances = threshold.performances,
                    let players = threshold.players
                else { return nil }
                return LeagueRecordMilestone(
                    value: value, performances: performances, players: players)
            })
    }
}
