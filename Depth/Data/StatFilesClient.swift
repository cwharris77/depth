import Foundation

// Reads the per-player stat files published to R2. The default `URLSession` configuration
// carries the shared `URLCache`, so the files' `Cache-Control`/`ETag` headers drive
// revalidation, and gzip bodies are decoded transparently. Features never fetch these URLs:
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
        // An ESPN athlete id is numeric; anything else could not name a file and must not be
        // spliced into a path.
        guard !espnId.isEmpty, espnId.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        let url =
            baseURL
            .appending(path: "players")
            .appending(path: espnId)
            .appending(path: "seasons.json")
        do {
            let (data, response) = try await load(URLRequest(url: url))
            guard let http = response as? HTTPURLResponse else {
                throw DepthError.server("non-HTTP response from \(url.host() ?? "stat files")")
            }
            switch http.statusCode {
            case 200..<300:
                return try JSONDecoder().decode(PlayerSeasonsFileDTO.self, from: data)
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
