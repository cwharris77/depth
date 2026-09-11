import Testing
@testable import Depth

// PlayerStatCategory drives the profile ledger's tabs, bars and strips (design option 2).

private func season(
    _ year: Int, team: String? = "SEA", games: Int? = 17,
    completions: Int? = nil, attempts: Int? = nil, passingYards: Int? = nil, passingTds: Int? = nil,
    passingInterceptions: Int? = nil, carries: Int? = nil, rushingYards: Int? = nil,
    rushingTds: Int? = nil, receptions: Int? = nil, targets: Int? = nil,
    receivingYards: Int? = nil, receivingTds: Int? = nil, tackles: Int? = nil,
    sacks: Double? = nil, interceptions: Int? = nil, fgMade: Int? = nil, fgAtt: Int? = nil
) -> PlayerSeasonStats {
    PlayerSeasonStats(
        season: year, seasonType: .regular, teamAbbrev: team, games: games,
        completions: completions, attempts: attempts, passingYards: passingYards,
        passingTds: passingTds, passingInterceptions: passingInterceptions, carries: carries,
        rushingYards: rushingYards, rushingTds: rushingTds, receptions: receptions,
        targets: targets, receivingYards: receivingYards, receivingTds: receivingTds,
        defTacklesSolo: tackles, defSacks: sacks, defInterceptions: interceptions,
        fgMade: fgMade, fgAtt: fgAtt
    )
}

@Test func ledgerTabsFollowPositionAndOnlyIncludeCategoriesWithData() {
    // A QB's post-interception tackle doesn't earn a defensive tab.
    let qb = [season(2025, attempts: 580, passingYards: 4_118, carries: 62, rushingYards: 341, tackles: 2)]
    #expect(PlayerStatCategory.categories(for: qb, position: .qb) == [.passing, .rushing])

    // An RB with a trick-play pass still leads with rushing.
    let rb = [season(2025, attempts: 1, passingYards: 12, carries: 200, rushingYards: 900, receptions: 30, targets: 40)]
    #expect(PlayerStatCategory.categories(for: rb, position: .rb) == [.rushing, .receiving, .passing])

    let dt = [season(2025, tackles: 44, sacks: 6.5), season(2024, tackles: 51, interceptions: 1)]
    #expect(PlayerStatCategory.categories(for: dt, position: .dt) == [.tackles, .passRush, .turnovers])

    let kicker = [season(2025, tackles: 2, fgMade: 30, fgAtt: 34)]
    #expect(PlayerStatCategory.categories(for: kicker, position: .k) == [.kicking])
}

@Test func ledgerFallsBackToGamesWhenPositionRecordsNothingElse() {
    let guardSeasons = [season(2025, games: 17), season(2024, games: 12)]
    #expect(PlayerStatCategory.categories(for: guardSeasons, position: .lg) == [.games])
    #expect(PlayerStatCategory.categories(for: [season(2025, games: 0)], position: .lg).isEmpty)
    #expect(PlayerStatCategory.games.details(guardSeasons[0]).isEmpty)
}

@Test func ledgerHeadlineSummaryAndDetailsUseStoredColumnsOnly() {
    let row = season(2025, completions: 401, attempts: 580, passingYards: 4_118, passingTds: 31, passingInterceptions: 9)
    let passing = PlayerStatCategory.passing
    #expect(passing.headline(row).value == "4,118")
    #expect(passing.summary(row).map { "\($0.value) \($0.short)" } == ["31 TD", "9 INT"])
    #expect(passing.details(row).map(\.short) == ["CMP/ATT", "CMP%", "YPA", "GP"])
    #expect(passing.details(row).map(\.value) == ["401/580", "69.1", "7.1", "17"])

    let tackles = PlayerStatCategory.tackles
    let dtRow = season(2025, games: 16, tackles: 44)
    #expect(tackles.headline(dtRow).value == "44")
    #expect(tackles.summary(dtRow).map { "\($0.value) \($0.short)" } == ["16 GP"])
    #expect(tackles.details(dtRow).map(\.value) == ["2.8"])
    #expect(tackles.details(season(2025, games: nil, tackles: 3)).map(\.value) == ["—"])
}

@Test func ledgerBarScalesToCareerBest() {
    let seasons = [season(2025, rushingYards: 341), season(2024, rushingYards: 404), season(2023, rushingYards: 0)]
    #expect(PlayerStatCategory.rushing.barFraction(seasons[1], among: seasons) == 1)
    #expect(abs(PlayerStatCategory.rushing.barFraction(seasons[0], among: seasons) - 341.0 / 404.0) < 0.0001)
    #expect(PlayerStatCategory.rushing.barFraction(seasons[2], among: seasons) == 0)
    #expect(PlayerStatCategory.passing.barFraction(seasons[0], among: seasons) == 0)
}

@Test func careerTotalsSumSeasonsAndKeepUnrecordedColumnsNil() {
    let career = PlayerStatLedger.careerTotals([
        season(2025, games: 17, passingYards: 4_118, sacks: 1.5),
        season(2024, games: 16, passingYards: 3_702, sacks: 2),
    ])
    #expect(career.games == 33)
    #expect(career.passingYards == 7_820)
    #expect(career.defSacks == 3.5)
    #expect(career.rushingYards == nil)
    #expect(PlayerStatLedger.seasonCountLabel(1) == "REG · 1 SEASON")
    #expect(PlayerStatLedger.seasonCountLabel(5) == "REG · 5 SEASONS")
}

@Test func ledgerRowLabelPairsEveryNumberWithItsStat() {
    let row = season(2025, passingYards: 4_118, passingTds: 31, passingInterceptions: 9)
    #expect(PlayerStatLedger.rowLabel(for: row, category: .passing)
        == "2025 season, SEA, Passing yards 4,118, 31 touchdowns, 9 interceptions")
}

@Test func profileDisplayJerseyNameInitialsAndVitals() {
    #expect(PlayerProfileDisplay.jerseyName("Marcus Ellery") == "ELLERY")
    #expect(PlayerProfileDisplay.jerseyName("Marvin Harrison Jr.") == "HARRISON")
    #expect(PlayerProfileDisplay.jerseyName("") == nil)
    #expect(PlayerProfileDisplay.initials("Marcus Ellery") == "ME")
    #expect(PlayerProfileDisplay.initials("Marvin Harrison Jr.") == "MH")
    #expect(PlayerProfileDisplay.initials("Pelé") == "P")
    #expect(PlayerProfileDisplay.initials("") == nil)

    #expect(PlayerProfileDisplay.vitals(age: 27, experience: 5, height: "6' 4\"", weight: 218).map(\.text)
        == ["AGE 27", "EXP 5 YRS", "6' 4\"", "218 LB"])
    #expect(PlayerProfileDisplay.vitals(age: 0, experience: 0, height: "", weight: 0).map(\.text) == ["ROOKIE"])
}

@Test func profileDisplayVitalsAppendCollegeLast() {
    let parts = PlayerProfileDisplay.vitals(
        age: 27, experience: 5, height: "6' 4\"", weight: 218, college: "Alabama"
    )
    #expect(parts.map(\.text) == ["AGE 27", "EXP 5 YRS", "6' 4\"", "218 LB", "ALABAMA"])
    #expect(parts.last?.spoken == "College, Alabama")
    // ESPN's em-dash placeholder and blank strings mean "no college", not a part.
    #expect(
        PlayerProfileDisplay.vitals(age: nil, experience: nil, height: nil, weight: nil, college: " — ")
            .isEmpty
    )
    #expect(
        PlayerProfileDisplay.vitals(age: nil, experience: nil, height: nil, weight: nil, college: nil)
            .isEmpty
    )
}

/// ESPN records a transfer's schools as one ";"-separated string, and the vitals strip is a
/// single line whose parts share layout priority — so a 44-character college would shrink
/// AGE/EXP/height/weight with it. The strip shows the first school; VoiceOver still reads
/// every one (2026-09-11 merge-spec review ruling).
@Test func profileDisplayVitalsShowFirstCollegeAndSpeakAllOfThem() {
    let schools = "West Alabama; Garden City CC; Oklahoma State"
    let parts = PlayerProfileDisplay.vitals(
        age: 27, experience: 5, height: "6' 4\"", weight: 218, college: schools
    )
    #expect(parts.map(\.text) == ["AGE 27", "EXP 5 YRS", "6' 4\"", "218 LB", "WEST ALABAMA"])
    #expect(parts.last?.spoken == "College, \(schools)")

    // A single school is unchanged by the split — display and spoken both keep the whole value.
    let single = PlayerProfileDisplay.vitals(
        age: nil, experience: nil, height: nil, weight: nil, college: "Alabama"
    )
    #expect(single.map(\.text) == ["ALABAMA"])
    #expect(single.last?.spoken == "College, Alabama")
}

@Test func profileDisplayBioHidesEmptyAndHistoricalBios() {
    #expect(PlayerProfileDisplay.bio("Accurate passer.", isHistorical: false) == "Accurate passer.")
    #expect(PlayerProfileDisplay.bio("  \n", isHistorical: false) == nil)
    // HistoricalRosterMapper fills bio with "{season} · {city} {name}" filler.
    #expect(PlayerProfileDisplay.bio("2019 · Buffalo Bills", isHistorical: true) == nil)
}
