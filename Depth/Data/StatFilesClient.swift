import Foundation

// Reads the per-player and per-team stat files published to R2. The default `URLSession`
// configuration carries the shared `URLCache`, so the files' `Cache-Control`/`ETag` headers
// drive revalidation, and gzip bodies are decoded transparently. Features never fetch these URLs:
// `SupabaseDepthRepository` is the one caller.
struct StatFilesClient: Sendable {
    typealias Load = @Sendable (URLRequest) async throws -> (Data, URLResponse)

    private let baseURL: URL
    private let load: Load

    init(
        baseURL: URL,
        load: @escaping Load = { request in try await URLSession.shared.data(for: request) }
    ) {
        self.baseURL = baseURL
        self.load = load
    }

    /// The base URL baked into Info.plist by the active xcconfig, or nil when it is absent.
    static func fromBundle(_ bundle: Bundle = .main) -> StatFilesClient? {
        guard
            let value = bundle.object(forInfoDictionaryKey: "STAT_FILES_BASE_URL") as? String,
            let url = URL(string: value)
        else { return nil }
        return StatFilesClient(baseURL: url)
    }

    /// The player's career ledger, or nil when no file exists for that id (a 404).
    func playerSeasons(espnId: String) async throws -> PlayerSeasonsFileDTO? {
        guard isESPNId(espnId) else { return nil }
        return try await fetch(
            baseURL.appending(path: "players").appending(path: espnId)
                .appending(path: "seasons.json"))
    }

    /// The team's per-game lines, allowed rates and ranks, or nil when no file exists for
    /// that id (a 404).
    func teamSeasons(teamId: String) async throws -> TeamSeasonsFileDTO? {
        // A team id is a lowercase slug ("chiefs", "49ers"); anything else could not name a
        // file and must not be spliced into a path.
        guard !teamId.isEmpty,
            teamId.allSatisfy({ $0.isASCII && ($0.isLowercase || $0.isNumber || $0 == "-") })
        else { return nil }
        return try await fetch(
            baseURL.appending(path: "teams").appending(path: teamId)
                .appending(path: "seasons.json"))
    }

    /// A player's career highs and their league ranks, or nil when no file exists for that
    /// id (a 404).
    func playerHighlights(espnId: String) async throws -> PlayerHighlightsFileDTO? {
        guard isESPNId(espnId) else { return nil }
        return try await fetch(
            baseURL.appending(path: "players").appending(path: espnId)
                .appending(path: "highlights.json"))
    }

    /// The league-wide record file for one stat, or nil on a 404.
    func leagueRecords(stat: RecordStat) async throws -> LeagueRecordsFileDTO? {
        try await fetch(
            baseURL.appending(path: "records").appending(path: "\(stat.rawValue).json"))
    }

    /// An ESPN athlete id is numeric; anything else could not name a file and must not be
    /// spliced into a path.
    private func isESPNId(_ id: String) -> Bool {
        !id.isEmpty && id.allSatisfy { $0.isASCII && $0.isNumber }
    }

    private func fetch<File: Decodable>(_ url: URL) async throws -> File? {
        do {
            let (data, response) = try await load(URLRequest(url: url))
            guard let http = response as? HTTPURLResponse else {
                throw DepthError.server("non-HTTP response from \(url.host() ?? "stat files")")
            }
            switch http.statusCode {
            case 200..<300:
                return try JSONDecoder().decode(File.self, from: data)
            case 404:
                return nil
            default:
                throw DepthError.server("stat files returned HTTP \(http.statusCode)")
            }
        } catch let error as DepthError {
            throw error
        } catch let error as DecodingError {
            throw DepthError.decoding("\(error)")
        } catch let error as URLError {
            throw error.isNetworkUnavailable ? DepthError.offline : DepthError.server("\(error)")
        } catch {
            throw DepthError.server("\(error)")
        }
    }
}
