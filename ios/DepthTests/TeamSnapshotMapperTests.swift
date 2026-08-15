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
    uniforms: [UniformDTO] = []
) -> TeamDTO {
    TeamDTO(
        id: "bills", abbrev: "BUF", city: "Buffalo", name: "Bills",
        conference: "AFC", division: "East",
        colorPrimary: "#00338d", colorSecondary: "#d50a0a", colorAccent: "#d50a0a",
        uiAccent: "#d50a0a", onAccent: "#ffffff", logoUrl: nil, logoDarkUrl: nil,
        depthChartEntries: depthChartEntries, specialTeamsSlots: specialTeamsSlots, uniforms: uniforms
    )
}

@Test func mapsTeamIdentityAndColors() throws {
    let dto = team()
    let snapshot = try TeamSnapshotMapper.map(dto)
    #expect(snapshot.team.id == "bills")
    #expect(snapshot.team.abbrev == "BUF")
    #expect(snapshot.team.colors.primary == "#00338d")
    #expect(snapshot.team.colors.onAccent == "#ffffff")
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
            colorPrimary: "#00338D", colorSecondary: "#C60C30", colorAccent: "#C60C30",
            uiAccent: "#5B9BFF", onAccent: "#0a0e1a", imagePath: nil
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
            colorPrimary: "#000", colorSecondary: "#000", colorAccent: "#000",
            uiAccent: "#000", onAccent: "#000", imagePath: nil
        ),
    ])
    #expect(throws: DepthError.self) {
        try TeamSnapshotMapper.map(dto)
    }
}
