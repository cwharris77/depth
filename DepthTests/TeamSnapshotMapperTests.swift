import Foundation
import Testing
@testable import Depth

// Explicit mapper tests — every DTO → domain conversion, including every failure path
// (design spec's "Explicit mapping tests cover every conversion").

private func player(
    id: String, teamId: String = "t", name: String = "Player", number: Int? = 1,
    position: String = "QB", status: String? = "starter"
) -> PlayerDTO {
    PlayerDTO(
        id: id, teamId: teamId, name: name, number: number, position: position, status: status,
        age: 25, college: "Test U", experience: 1, height: "6'0\"", weight: 200, bio: "", photoUrl: nil
    )
}

private func team(
    depthChartEntries: [DepthChartEntryDTO] = [],
    specialTeamsSlots: [SpecialTeamsSlotDTO] = [],
    uniforms: [UniformDTO] = [],
    formations: [TeamFormationDTO] = []
) -> TeamDTO {
    TeamDTO(
        id: "bills", abbrev: "BUF", city: "Buffalo", name: "Bills",
        conference: "AFC", division: "East",
        logoUrl: nil, logoDarkUrl: nil,
        depthChartEntries: depthChartEntries, specialTeamsSlots: specialTeamsSlots,
        uniforms: uniforms, teamFormations: formations
    )
}

@Suite struct TeamListRowDTOTests {
    @Test func decodesIncomingCoachFields() throws {
        let data = Data(
            """
            {
              "id": "bills", "abbrev": "BUF", "city": "Buffalo", "name": "Bills",
              "conference": "AFC", "division": "East", "uniforms": [],
              "coach_name": "Joe Brady", "coach_experience": 0
            }
            """.utf8
        )

        let dto = try JSONDecoder().decode(TeamListRowDTO.self, from: data)

        #expect(dto.coachName == "Joe Brady")
        #expect(dto.coachExperience == 0)
    }
}

@Test func mapsTeamIdentityAndColorsFromCurrentHomeUniform() throws {
    let dto = team(uniforms: [
        UniformDTO(
            id: "bills-home-2002", teamId: "bills", kind: "home", name: "Retired Home",
            yearStart: 2002, yearEnd: 2010, isCurrent: false,
            colorPrimary: "#111111", colorSecondary: "#222222", colorAccent: "#333333", imagePath: nil
        ),
        UniformDTO(
            id: "bills-home-2011", teamId: "bills", kind: "home", name: "Current Home",
            yearStart: 2011, yearEnd: nil, isCurrent: true,
            colorPrimary: "#00338D", colorSecondary: "#C60C30", colorAccent: "#C60C30", imagePath: nil
        ),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.team.id == "bills")
    #expect(snapshot.team.abbrev == "BUF")
    #expect(snapshot.team.colors.primary == "#00338D")
    // Asserted against all three so the test still proves the mapper took the *current*
    // home kit rather than the retired one — the retired row's #111111/#222222/#333333
    // would fail any of them. This previously leaned on onAccent, which no longer exists.
    #expect(snapshot.team.colors.secondary == "#C60C30")
    #expect(snapshot.team.colors.accent == "#C60C30")
}

@Test func mapsDepthChartPlayerWithRealDepthRank() throws {
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 1, playerId: "p1", player: player(id: "p1", position: "QB")),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.players.count == 1)
    #expect(snapshot.players[0].id == "p1")
    #expect(snapshot.players[0].depthRank == 1)
    #expect(snapshot.players[0].position == .qb)
}

@Test func specialTeamsOnlyPlayerGetsNominalDepthRankThree() throws {
    let dto = team(specialTeamsSlots: [
        SpecialTeamsSlotDTO(id: "st-kr", teamId: "bills", label: "KR", playerId: "p2", x: 30, y: 18, player: player(id: "p2", position: "RB")),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.players.count == 1)
    #expect(snapshot.players[0].id == "p2")
    #expect(snapshot.players[0].depthRank == 3)
}

@Test func playerOnBothDepthChartAndSpecialTeamsIsNotDuplicated() throws {
    let dto = team(
        depthChartEntries: [
            DepthChartEntryDTO(teamId: "bills", position: "WR", depthRank: 2, playerId: "p3", player: player(id: "p3", position: "WR")),
        ],
        specialTeamsSlots: [
            SpecialTeamsSlotDTO(id: "st-pr", teamId: "bills", label: "PR", playerId: "p3", x: 70, y: 18, player: player(id: "p3", position: "WR")),
        ]
    )
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.players.count == 1)
    #expect(snapshot.players[0].depthRank == 2, "keeps the real depth-chart rank, not the nominal special-teams one")
}

@Test func nullPlayerOnASpecialTeamsSlotIsSkippedNotCrashed() throws {
    let dto = team(specialTeamsSlots: [
        SpecialTeamsSlotDTO(id: "st-pr", teamId: "bills", label: "PR", playerId: nil, x: 70, y: 18, player: nil),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.players.isEmpty)
    #expect(snapshot.specialTeams.count == 1)
    #expect(snapshot.specialTeams[0].playerId == nil)
}

@Test func anUnknownPositionDropsThatRowAndKeepsTheRestOfTheTeam() throws {
    // The launch screen must survive a value this build doesn't know. Strictness here is
    // what made every new position/rank/status a gated client release (DEP-486).
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 1, playerId: "p1", player: player(id: "p1", position: "QB")),
        DepthChartEntryDTO(teamId: "bills", position: "XX", depthRank: 1, playerId: "p2", player: player(id: "p2", position: "XX")),
    ])

    let result = try TeamSnapshotMapper.mapWithDiagnostics(dto)

    #expect(result.snapshot.players.map(\.id) == ["p1"])
    #expect(result.snapshot.depthChart?.map(\.position) == [.qb])
    #expect(result.dropped == [
        TeamSnapshotMapper.DroppedRow(id: "bills/XX", reason: .unknownSeatPosition("XX")),
    ])
}

@Test func aMissingJerseyNumberDefaultsToZeroRatherThanDroppingThePlayer() throws {
    // Matches mapPlayerHit and the historical mapper's `?? 0`. Losing a rostered athlete
    // because ESPN omitted his number costs more than it protects.
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 1, playerId: "p1", player: player(id: "p1", number: nil)),
    ])

    let result = try TeamSnapshotMapper.mapWithDiagnostics(dto)

    #expect(result.snapshot.players.map(\.number) == [0])
    #expect(result.dropped.isEmpty)
}

@Test func aDepthRankPastThirdIsAcceptedNotRejected() throws {
    // The 1...3 cap is a property of today's ingest and its CHECK constraint, not of the
    // domain — this build already decodes an uncapped chart.
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 7, playerId: "p1", player: player(id: "p1")),
    ])

    let result = try TeamSnapshotMapper.mapWithDiagnostics(dto)

    #expect(result.snapshot.players.map(\.depthRank) == [7])
    #expect(result.snapshot.depthChart?.map(\.depthRank) == [7])
    #expect(result.dropped.isEmpty)
}

@Test func anUnrecognizedStatusFallsBackToTheRankDerivedOne() throws {
    // The prerequisite for storing ESPN's real designations: an older build shows the
    // athlete at his correct rank instead of failing the whole team.
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 1, playerId: "p1", player: player(id: "p1", status: "Questionable")),
        DepthChartEntryDTO(teamId: "bills", position: "RB", depthRank: 2, playerId: "p2", player: player(id: "p2", position: "RB", status: "Doubtful")),
    ])

    let result = try TeamSnapshotMapper.mapWithDiagnostics(dto)

    #expect(result.snapshot.players.map(\.status) == [.starter, .backup])
    #expect(result.dropped.isEmpty)
}

@Test func aChartThatDecodesToNothingIsStillAnError() {
    // A blank field reads as a broken screen; an empty chart that was empty upstream does
    // not, and stays a valid snapshot (covered separately).
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "XX", depthRank: 1, playerId: "p1", player: player(id: "p1", position: "XX")),
    ])
    #expect(throws: DepthError.self) {
        try TeamSnapshotMapper.map(dto)
    }
}

@Test func mapsUniformKindAndColors() throws {
    let dto = team(uniforms: [
        UniformDTO(
            id: "bills-home", teamId: "bills", kind: "home", name: "Home",
            yearStart: nil, yearEnd: nil, isCurrent: true,
            colorPrimary: "#00338D", colorSecondary: "#C60C30", colorAccent: "#C60C30", imagePath: nil
        ),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.uniforms.count == 1)
    #expect(snapshot.uniforms[0].kind == .home)
    #expect(snapshot.uniforms[0].isCurrent == true)
}

@Test func unknownUniformKindThrowsDecodingError() {
    let dto = team(uniforms: [
        UniformDTO(
            id: "x", teamId: "bills", kind: "bogus", name: "X",
            yearStart: nil, yearEnd: nil, isCurrent: false,
            colorPrimary: "#000", colorSecondary: "#000", colorAccent: "#000", imagePath: nil
        ),
    ])
    #expect(throws: DepthError.self) {
        try TeamSnapshotMapper.map(dto)
    }
}

@Test func emptyFormationsMapToEmptyArray() throws {
    let dto = team()
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.formations.isEmpty)
}

@Test func mapsRealFormationsForTheLatestSeasonOnly() throws {
    let dto = team(formations: [
        TeamFormationDTO(season: 2025, rank: 1, unit: "offense", alignment: "SHOTGUN", personnel: "11", pct: 60),
        TeamFormationDTO(season: 2025, rank: 2, unit: "offense", alignment: "UNDER CENTER", personnel: "21", pct: 25),
        TeamFormationDTO(season: 2025, rank: 1, unit: "defense", alignment: "Nickel", personnel: "4-2-5", pct: 55),
        // An older season's rows are dropped — the field renders the latest ingested season.
        TeamFormationDTO(season: 2024, rank: 1, unit: "offense", alignment: "SHOTGUN", personnel: "12", pct: 70),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.formations.count == 3)
    #expect(snapshot.formations.allSatisfy { $0.season == 2025 })
    #expect(snapshot.formations.first { $0.unit == .offense }?.alignment == "SHOTGUN")
    #expect(snapshot.formations.first { $0.unit == .offense }?.personnel == "11")
    #expect(snapshot.formations.first { $0.unit == .offense }?.rank == 1)
    #expect(snapshot.formations.first { $0.unit == .defense }?.personnel == "4-2-5")
}

@Test func formationWithInvalidUnitIsSkippedNotThrown() throws {
    let dto = team(formations: [
        TeamFormationDTO(season: 2025, rank: 1, unit: "bogus", alignment: "X", personnel: "11", pct: 5),
        TeamFormationDTO(season: 2025, rank: 1, unit: "offense", alignment: "SHOTGUN", personnel: "11", pct: 60),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.formations.count == 1)
    #expect(snapshot.formations[0].unit == .offense)
}

@Test func mapsSpecialUnitAsAValidFormation() throws {
    // `.special` is a valid Unit case (unlike web's `'offense'|'defense'` union), so it
    // decodes fine and is carried through — it simply never affects the field (topFormationSlots
    // returns nil for .special, and the footer gate matches the active unit).
    let dto = team(formations: [
        TeamFormationDTO(season: 2025, rank: 1, unit: "special", alignment: "X", personnel: "11", pct: 5),
    ])
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.formations.count == 1)
    #expect(snapshot.formations[0].unit == .special)
}

// Identity vs seat (DEP-585). ESPN cross-lists a swing tackle at LT2 and RT1, so one
// athlete can hold two depth-chart entries. `players` must stay one row per athlete
// while `depthChart` keeps both seats — seating off `players.position` is what left the
// second slot empty and the formation a man short.
@Suite struct CrossPositionSeatingTests {
    private func seatedTackles() -> TeamDTO {
        team(depthChartEntries: [
            DepthChartEntryDTO(
                teamId: "bills", position: "LT", depthRank: 1, playerId: "lt1",
                player: player(id: "lt1", position: "LT")),
            DepthChartEntryDTO(
                teamId: "bills", position: "LT", depthRank: 2, playerId: "swing",
                player: player(id: "swing", position: "LT")),
            DepthChartEntryDTO(
                teamId: "bills", position: "RT", depthRank: 1, playerId: "swing",
                player: player(id: "swing", position: "LT")),
        ])
    }

    @Test func oneAthleteHoldingTwoSeatsStaysOneIdentityRow() throws {
        let snapshot = try TeamSnapshotMapper.map(seatedTackles())

        #expect(snapshot.players.count == 2)
        #expect(snapshot.players.filter { $0.id == "swing" }.count == 1)
    }

    @Test func bothSeatsSurviveIntoTheDepthChart() throws {
        let snapshot = try TeamSnapshotMapper.map(seatedTackles())

        #expect(snapshot.depthChart?.count == 3)
        #expect(
            snapshot.depthChart?.contains(
                DepthSeat(position: .rt, depthRank: 1, playerId: "swing")) == true)
    }

    @Test func theSwingTackleFillsTheRightTackleSlot() throws {
        let snapshot = try TeamSnapshotMapper.map(seatedTackles())
        let roster = Roster(
            players: snapshot.players, specialTeams: snapshot.specialTeams,
            depthChart: snapshot.depthChart)

        // The seat's position wins over the player row's canonical LT.
        #expect(getPlayers(in: roster, at: .rt).map(\.id) == ["swing"])
        #expect(getPlayers(in: roster, at: .lt).map(\.id) == ["lt1", "swing"])
    }

    @Test func aRosterWithNoDepthChartStillSeatsFromThePlayersThemselves() {
        // The historical-season path: roster_history has no depth_chart_entries.
        let roster = Roster(players: [
            Player(id: "qb1", position: .qb, depthRank: 1, number: 7),
            Player(id: "qb2", position: .qb, depthRank: 2, number: 9),
        ])

        #expect(getPlayers(in: roster, at: .qb).map(\.id) == ["qb1", "qb2"])
    }

    @Test func aSeatNamingAnAbsentAthleteIsSkippedNotFaked() {
        let roster = Roster(
            players: [Player(id: "lt1", position: .lt, depthRank: 1, number: 77)],
            depthChart: [
                DepthSeat(position: .lt, depthRank: 1, playerId: "lt1"),
                DepthSeat(position: .rt, depthRank: 1, playerId: "ghost"),
            ])

        #expect(getPlayers(in: roster, at: .rt).isEmpty)
    }

    @Test func anUnknownSeatPositionDropsTheSeatAndKeepsTheAthlete() throws {
        // The seat can't be placed, but the athlete is still on the roster — he keeps his
        // other seats and stays in list surfaces rather than vanishing with the bad row.
        let dto = team(depthChartEntries: [
            DepthChartEntryDTO(
                teamId: "bills", position: "QB", depthRank: 1, playerId: "p1",
                player: player(id: "p1", position: "QB")),
            DepthChartEntryDTO(
                teamId: "bills", position: "XX", depthRank: 1, playerId: "p1",
                player: player(id: "p1", position: "QB")),
        ])

        let result = try TeamSnapshotMapper.mapWithDiagnostics(dto)

        #expect(result.snapshot.depthChart?.map(\.position) == [.qb])
        #expect(result.snapshot.players.map(\.id) == ["p1"])
        #expect(result.dropped == [
            TeamSnapshotMapper.DroppedRow(id: "bills/XX", reason: .unknownSeatPosition("XX")),
        ])
    }
}
