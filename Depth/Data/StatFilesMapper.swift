import Foundation

// Maps a decoded stat file onto the profile ledger's `PlayerSeasonStats`. Regular-season rows
// only, newest first; a traded player keeps one row per team stint, in the file's order.
enum StatFilesMapper {
    static func map(
        _ file: PlayerSeasonsFileDTO, teamAbbrevs: [String: String]
    ) -> [PlayerSeasonStats] {
        file.seasons
            .filter { $0.seasonType == PlayerSeasonType.regular.rawValue }
            .enumerated()
            .sorted { left, right in
                left.element.season != right.element.season
                    ? left.element.season > right.element.season
                    : left.offset < right.offset
            }
            .map { mapRow($0.element, teamAbbrevs: teamAbbrevs) }
    }

    private static func mapRow(
        _ row: PlayerSeasonRowDTO, teamAbbrevs: [String: String]
    ) -> PlayerSeasonStats {
        let box = row.box
        let snaps = row.snaps
        let pfr = row.pfr
        return PlayerSeasonStats(
            season: row.season, seasonType: .regular,
            teamAbbrev: row.team.flatMap { teamAbbrevs[$0] },
            games: box?.int("games"), completions: box?.int("completions"),
            attempts: box?.int("attempts"), passingYards: box?.int("passing_yards"),
            passingTds: box?.int("passing_tds"),
            passingInterceptions: box?.int("passing_interceptions"),
            carries: box?.int("carries"), rushingYards: box?.int("rushing_yards"),
            rushingTds: box?.int("rushing_tds"), receptions: box?.int("receptions"),
            targets: box?.int("targets"), receivingYards: box?.int("receiving_yards"),
            receivingTds: box?.int("receiving_tds"),
            defTacklesSolo: box?.int("def_tackles_solo"), defSacks: box?.double("def_sacks"),
            defInterceptions: box?.int("def_interceptions"), fgMade: box?.int("fg_made"),
            fgAtt: box?.int("fg_att"), defTackleAssists: box?.int("def_tackle_assists"),
            defTacklesForLoss: box?.int("def_tackles_for_loss"),
            defQbHits: box?.int("def_qb_hits"), defPassDefended: box?.int("def_pass_defended"),
            defFumblesForced: box?.int("def_fumbles_forced"), defTds: box?.int("def_tds"),
            defSafeties: box?.int("def_safeties"),
            fumbleRecoveries: box?.int("fumble_recovery_opp"),
            fumbleRecoveryTds: box?.int("fumble_recovery_tds"),
            puntReturns: box?.int("punt_returns"), puntReturnYards: box?.int("punt_return_yards"),
            kickoffReturns: box?.int("kickoff_returns"),
            kickoffReturnYards: box?.int("kickoff_return_yards"),
            specialTeamsTds: box?.int("special_teams_tds"), penalties: box?.int("penalties"),
            penaltyYards: box?.int("penalty_yards"), patMade: box?.int("pat_made"),
            patAtt: box?.int("pat_att"), fgLong: box?.int("fg_long"),
            offenseSnaps: snaps?.int("offense_snaps"), offensePct: snaps?.double("offense_pct"),
            defenseSnaps: snaps?.int("defense_snaps"), defensePct: snaps?.double("defense_pct"),
            specialTeamsSnaps: snaps?.int("special_teams_snaps"),
            specialTeamsPct: snaps?.double("special_teams_pct"),
            punts: box?.int("pt_att"), puntYards: box?.int("pt_yards"),
            puntNetYards: box?.int("pt_net_yards"), puntLong: box?.int("pt_long"),
            puntsInside20: box?.int("pt_inside_20"), puntTouchbacks: box?.int("pt_touchback"),
            missedTackles: pfr?.int("def_missed_tackles"),
            rushingYardsBeforeContactPerCarry: pfr?.double("rushing_yards_before_contact_avg"),
            rushingYardsAfterContactPerCarry: pfr?.double("rushing_yards_after_contact_avg"),
            timeToThrow: row.ngs?.double("avg_time_to_throw"),
            passingCpoe: box?.double("passing_cpoe")
        )
    }
}
