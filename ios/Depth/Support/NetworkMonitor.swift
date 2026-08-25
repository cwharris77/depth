import Foundation
import Network
import Observation

// Publishes live network reachability so the offline-banner copy can tell "no signal"
// apart from "just haven't refreshed yet" (shipped bug: the stale-data banner always said
// "pull to refresh" even when the device had no connection to refresh with). One
// NWPathMonitor for the whole app, wired through DepthEnvironment like CurrentTeamStore —
// features read `isOffline`, nothing constructs its own monitor.
@MainActor
@Observable
final class NetworkMonitor {
    private(set) var isOffline = false

    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let offline = path.status != .satisfied
            Task { @MainActor in
                self?.isOffline = offline
            }
        }
        monitor.start(queue: DispatchQueue(label: "com.depth.networkmonitor"))
    }
}
