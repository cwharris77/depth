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

@Test func unknownPositionThrowsDecodingError() {
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "XX", depthRank: 1, playerId: "p1", player: player(id: "p1", position: "XX")),
    ])
    #expect(throws: DepthError.self) {
        try TeamSnapshotMapper.map(dto)
    }
}

@Test func missingJerseyNumberThrowsDecodingError() {
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 1, playerId: "p1", player: player(id: "p1", number: nil)),
    ])
    #expect(throws: DepthError.self) {
        try TeamSnapshotMapper.map(dto)
    }
}

@Test func outOfRangeDepthRankThrowsDecodingError() {
    let dto = team(depthChartEntries: [
        DepthChartEntryDTO(teamId: "bills", position: "QB", depthRank: 7, playerId: "p1", player: player(id: "p1")),
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
