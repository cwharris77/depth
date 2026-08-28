import Foundation

// DTO → domain mapping for the team-snapshot query. Every conversion is explicit and
// fails loudly (DepthError.decoding) rather than silently coercing bad data — the
// existing web `dbRosterSource` conflating "not found" with "unavailable" is exactly the
// failure mode the design spec calls out to not reproduce here.
enum TeamSnapshotMapper {
    static func map(_ dto: TeamDTO) throws -> TeamSnapshot {
        let uniforms = try dto.uniforms.map(mapUniform)
        let team = Team(
            id: dto.id, city: dto.city, name: dto.name, abbrev: dto.abbrev,
            conference: dto.conference, division: dto.division,
            colors: currentHomeColors(uniforms),
            logo: dto.logoUrl, logoDark: dto.logoDarkUrl
        )

        // Depth-chart players first (real depthRank), then special-teams-only players
        // get a nominal depthRank 3 — mirrors the web app's dbRosterSource assembly
        // (fetchTeamRoster) exactly, including silently skipping a special-teams slot
        // with no player and never duplicating a player already seated on the chart.
        var players: [Player] = []
        var seenPlayerIds = Set<String>()
        for entry in dto.depthChartEntries {
            let player = try mapPlayer(entry.player, depthRank: entry.depthRank)
            players.append(player)
            seenPlayerIds.insert(player.id)
        }
        for slot in dto.specialTeamsSlots {
            guard let playerDTO = slot.player, !seenPlayerIds.contains(playerDTO.id) else { continue }
            let player = try mapPlayer(playerDTO, depthRank: 3)
            players.append(player)
            seenPlayerIds.insert(player.id)
        }

        let specialTeams = dto.specialTeamsSlots.map { slot in
            SpecialSlot(id: slot.id, playerId: slot.playerId, x: slot.x, y: slot.y, label: slot.label)
        }

        return TeamSnapshot(
            team: team, players: players, specialTeams: specialTeams,
            uniforms: uniforms, formations: mapFormations(dto.teamFormations)
        )
    }

    static func mapTeamListRow(_ dto: TeamListRowDTO) -> Team {
        Team(
            id: dto.id, city: dto.city, name: dto.name, abbrev: dto.abbrev,
            conference: dto.conference, division: dto.division,
            colors: currentHomeColors(dto.uniforms),
            logo: dto.logoUrl, logoDark: dto.logoDarkUrl
        )
    }

    private static let neutralTeamColors = TeamColors(
        primary: "#333333", secondary: "#666666", accent: "#666666",
        uiAccent: "#4CC3FF", onAccent: "#0a0e1a"
    )

    private static func currentHomeColors(_ uniforms: [Uniform]) -> TeamColors {
        uniforms.first(where: { $0.kind == .home && $0.isCurrent })?.colors ?? neutralTeamColors
    }

    private static func currentHomeColors(_ uniforms: [TeamColorUniformDTO]) -> TeamColors {
        guard let home = uniforms.first(where: { $0.kind == "home" && $0.isCurrent }) else {
            return neutralTeamColors
        }
        return TeamColors(
            primary: home.colorPrimary, secondary: home.colorSecondary, accent: home.colorAccent,
            uiAccent: home.uiAccent, onAccent: home.onAccent
        )
    }

    /// A search hit skips (rather than throws) when its embedded team is null — a
    /// dangling player.team_id can't happen FK-enforced, but web's toPlayerHit skips
    /// rather than surfacing a hit with no team to jump to; an unknown position decodes
    /// to nil the same way. Missing jersey number defaults to 0 (web's `?? 0`).
    static func mapPlayerHit(_ dto: PlayerSearchRowDTO) -> PlayerHit? {
        guard let team = dto.teams.map(mapTeamListRow),
              let position = Position(rawValue: dto.position) else {
            return nil
        }
        return PlayerHit(
            id: dto.id,
            name: dto.name,
            number: dto.number ?? 0,
            position: position,
            college: dto.college,
            photoUrl: dto.photoUrl,
            team: team
        )
    }

    static func mapAppConfig(_ dto: AppConfigDTO) -> AppConfig {
        AppConfig(minimumSupportedBuild: dto.minimumSupportedBuild, maintenanceMessage: dto.maintenanceMessage)
    }

    static func mapPlayer(_ dto: PlayerDTO, depthRank: Int) throws -> Player {
        guard let position = Position(rawValue: dto.position) else {
            throw DepthError.decoding("player \(dto.id): unknown position \"\(dto.position)\"")
        }
        guard let number = dto.number else {
            throw DepthError.decoding("player \(dto.id): missing jersey number")
        }
        guard (1...3).contains(depthRank) else {
            throw DepthError.decoding("player \(dto.id): depthRank \(depthRank) out of range 1...3")
        }
        guard let status = PlayerStatus(rawValue: dto.status ?? "backup") else {
            throw DepthError.decoding("player \(dto.id): unknown status \"\(dto.status ?? "")\"")
        }
        return Player(
            id: dto.id, name: dto.name, position: position, depthRank: depthRank, number: number,
            status: status, age: dto.age ?? 0, college: dto.college ?? "",
            experience: dto.experience ?? 0, height: dto.height ?? "", weight: dto.weight ?? 0,
            bio: dto.bio ?? "", photoUrl: dto.photoUrl
        )
    }

    static func mapPlayerSeasonStats(_ dto: PlayerSeasonStatsDTO) -> PlayerSeasonStats {
        PlayerSeasonStats(
            season: dto.season, seasonType: .regular, teamAbbrev: dto.teams?.abbrev,
            games: dto.games, completions: dto.completions, attempts: dto.attempts,
            passingYards: dto.passingYards, passingTds: dto.passingTds,
            passingInterceptions: dto.passingInterceptions, carries: dto.carries,
            rushingYards: dto.rushingYards, rushingTds: dto.rushingTds,
            receptions: dto.receptions, targets: dto.targets, receivingYards: dto.receivingYards,
            receivingTds: dto.receivingTds, defTacklesSolo: dto.defTacklesSolo,
            defSacks: dto.defSacks, defInterceptions: dto.defInterceptions, fgMade: dto.fgMade,
            fgAtt: dto.fgAtt
        )
    }

    static func mapUniform(_ dto: UniformDTO) throws -> Uniform {
        guard let kind = UniformKind(rawValue: dto.kind) else {
            throw DepthError.decoding("uniform \(dto.id): unknown kind \"\(dto.kind)\"")
        }
        return Uniform(
            id: dto.id, teamId: dto.teamId, kind: kind, name: dto.name,
            yearStart: dto.yearStart, yearEnd: dto.yearEnd, isCurrent: dto.isCurrent,
            colors: TeamColors(
                primary: dto.colorPrimary, secondary: dto.colorSecondary, accent: dto.colorAccent,
                uiAccent: dto.uiAccent, onAccent: dto.onAccent
            ),
            imagePath: dto.imagePath
        )
    }

    /// The archive's flat kit listing (mirrors web's listUniforms): a uniform row joined
    /// with its team's conference/division. A dangling team reference (invariant 6 —
    /// never possible FK-enforced, but the remote read is untrusted) is skipped, not
    /// thrown, exactly like web's `flatMap` skip. An unknown kind throws so one bad row
    /// can't surface a wrongly-labeled kit.
    static func mapUniformListing(_ dto: UniformListingRowDTO, team: Team) throws -> UniformListing {
        guard let kind = UniformKind(rawValue: dto.kind) else {
            throw DepthError.decoding("uniform listing \(dto.id): unknown kind \"\(dto.kind)\"")
        }
        return UniformListing(
            id: dto.id, teamId: team.id, teamName: "\(team.city) \(team.name)",
            teamAbbrev: team.abbrev, teamShortName: team.name,
            conference: team.conference, division: team.division, kind: kind, name: dto.name,
            yearStart: dto.yearStart, yearEnd: dto.yearEnd, isCurrent: dto.isCurrent,
            colors: TeamColors(
                primary: dto.colorPrimary, secondary: dto.colorSecondary, accent: dto.colorAccent,
                uiAccent: dto.uiAccent, onAccent: dto.onAccent
            ),
            imagePath: dto.imagePath
        )
    }

    /// Maps real per-team formations, keeping only the latest ingested season — mirrors
    /// web's `getTeamFormations` (the ingest writes per-season rows and the field renders
    /// the most recent one). An unknown unit string (only offense/defense exist in the
    /// data) is skipped rather than throwing, so one bad row never takes down the whole
    /// snapshot (AGENTS.md invariant 6). Empty input yields an empty array, which the
    /// field treats as "no real formation data → generic layout".
    static func mapFormations(_ dtos: [TeamFormationDTO]) -> [TeamFormation] {
        guard let latest = dtos.map(\.season).max() else { return [] }
        return dtos
            .filter { $0.season == latest }
            .compactMap { dto in
                guard let unit = Unit(rawValue: dto.unit) else { return nil }
                return TeamFormation(
                    season: dto.season, rank: dto.rank, unit: unit,
                    alignment: dto.alignment, personnel: dto.personnel, pct: dto.pct
                )
            }
    }
}
