import Foundation
import Observation

// The T5 update gate (design spec's "Database evolution and update gate"). A build below
// `app_config.minimum_supported_build` blocks with `BlockingUpdateView`; every other
// outcome — equal/newer build, or the config being entirely unreachable with nothing
// ever cached — lets the app proceed, since migrations stay additive
// ("do not brick first launch during a config outage").
@Observable
@MainActor
final class UpdateGateViewModel {
    private(set) var isBlocked = false
    private(set) var maintenanceMessage: String?

    private let repository: CachingDepthRepository
    private let currentBuild: Int

    init(repository: CachingDepthRepository, currentBuild: Int = UpdateGateViewModel.installedBuildNumber()) {
        self.repository = repository
        self.currentBuild = currentBuild
    }

    func check() async {
        guard let config = try? await repository.appConfig() else {
            isBlocked = false
            return
        }
        isBlocked = currentBuild < config.minimumSupportedBuild
        maintenanceMessage = config.maintenanceMessage
    }

    nonisolated static func installedBuildNumber() -> Int {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String,
            let build = Int(raw)
        else {
            return Int.max // Fail open in a dev/test environment with no build number set.
        }
        return build
    }
}
