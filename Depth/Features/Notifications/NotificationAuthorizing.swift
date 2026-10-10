import UIKit
import UserNotifications

/// The three permission states the app distinguishes.
enum NotificationAuthorization: Sendable, Equatable {
    case notDetermined
    case denied
    case authorized
}

/// The system notification APIs behind a protocol, so the settings store is testable
/// without a permission dialog.
protocol NotificationAuthorizing: Sendable {
    func status() async -> NotificationAuthorization
    /// Shows the system permission dialog. Returns whether it was granted.
    func request() async -> Bool
    /// Asks the system for an APNs token; it arrives through the app delegate.
    @MainActor func registerForRemoteNotifications()
}

struct SystemNotificationAuthorizer: NotificationAuthorizing {
    func status() async -> NotificationAuthorization {
        switch await UNUserNotificationCenter.current().notificationSettings().authorizationStatus {
        case .notDetermined: .notDetermined
        case .denied: .denied
        default: .authorized
        }
    }

    func request() async -> Bool {
        (try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound])) ?? false
    }

    @MainActor func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }
}

/// Test, preview and fixture-backend double: never prompts, never registers.
struct NoOpNotificationAuthorizer: NotificationAuthorizing {
    var fixed: NotificationAuthorization = .notDetermined
    func status() async -> NotificationAuthorization { fixed }
    func request() async -> Bool { false }
    @MainActor func registerForRemoteNotifications() {}
}
