#if INTERNAL_BUILD
    import Foundation
    import Observation

    // Permanent internal-build conveniences, separate from feature flags (which are
    // temporary and expire). Compiled only into Debug and Staging; Release has no code
    // path that reads or writes these.
    @MainActor
    @Observable
    final class DeveloperSettings {
        static let bypassUpdateGateKey = "developer.bypassUpdateGate"

        /// Skips the forced-update block so a build behind `app_config.minimum_supported_build`
        /// (e.g. Staging) stays usable. On unless explicitly turned off.
        var bypassUpdateGate: Bool {
            didSet { defaults.set(bypassUpdateGate, forKey: Self.bypassUpdateGateKey) }
        }

        @ObservationIgnored private let defaults: UserDefaults

        init(defaults: UserDefaults = .standard) {
            self.defaults = defaults
            bypassUpdateGate = defaults.object(forKey: Self.bypassUpdateGateKey) as? Bool ?? true
        }
    }
#endif
