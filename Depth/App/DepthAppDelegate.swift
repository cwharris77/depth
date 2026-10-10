import UIKit
import UserNotifications

// Remote-notification callbacks have no SwiftUI equivalent: the APNs token and
// notification responses are delivered only to an application delegate and a
// notification-center delegate. Everything is handed straight to stores; no state
// lives here.
final class DepthAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let center = UNUserNotificationCenter.current()
        // Set before launch finishes so a tap that cold-starts the app is delivered.
        center.delegate = self
        center.setNotificationCategories([
            UNNotificationCategory(
                identifier: NotificationResponse.everythingCategory,
                actions: [
                    UNNotificationAction(
                        identifier: NotificationResponse.turnOffEverythingAction,
                        title: "Turn off Everything")
                ],
                intentIdentifiers: [])
        ])
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { await DepthEnvironment.notificationSettings.handleDeviceToken(deviceToken) }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: any Error
    ) {
        // Nothing to recover: the next foreground asks the system again.
    }

    // The notification-center callbacks are not main-actor isolated, and the system's
    // response object is not Sendable, so the response is reduced to a Sendable value
    // here and only that value crosses to the main actor.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let parsed = NotificationResponse.parse(
            actionIdentifier: response.actionIdentifier,
            userInfo: response.notification.request.content.userInfo)
        await Self.perform(parsed)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // An event that arrives while the app is open is still shown.
        [.banner, .list, .sound]
    }

    private static func perform(_ response: NotificationResponse) async {
        await response.perform(
            routes: DepthEnvironment.teamRouteStore,
            onboarding: DepthEnvironment.onboarding,
            settings: DepthEnvironment.notificationSettings)
    }
}
