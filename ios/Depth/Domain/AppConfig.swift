import Foundation

// The public `app_config` singleton row (design spec's "Database evolution and update
// gate"). `minimumSupportedBuild` compares against `CFBundleVersion` as an integer —
// both TestFlight and App Store builds use monotonically increasing integer build
// numbers, never a semver string.
struct AppConfig: Codable, Equatable {
    let minimumSupportedBuild: Int
    let maintenanceMessage: String?
}
