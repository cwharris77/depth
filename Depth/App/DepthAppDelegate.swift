import UIKit
import UserNotifications

// Remote-notification callbacks have no SwiftUI equivalent: the APNs token and
// notification responses are delivered only to an application delegate and a
// notification-center delegate. Everything is handed straight to stores; no state
// lives here.
final class DepthAppDelegate: NSObject, UIApplicationDelegate {
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

    private static func perform(_ response: NotificationResponse) async {
        await response.perform(
            routes: DepthEnvironment.teamRouteStore,
            onboarding: DepthEnvironment.onboarding,
            settings: DepthEnvironment.notificationSettings)
    }
}

// The completion-handler forms, not the async ones: the system requires its handler to
// be called on the main thread, and an async delegate method hands control back to the
// system on whatever executor the call resumed on. These run on the main actor from
// start to finish and call the handler there. The protocol itself declares no isolation,
// so the conformance is `@preconcurrency`; the system delivers both callbacks on the
// main thread, which that conformance checks at run time.
extension DepthAppDelegate: @preconcurrency UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let parsed = NotificationResponse.parse(
            actionIdentifier: response.actionIdentifier,
            userInfo: response.notification.request.content.userInfo)
        Task {
            await Self.perform(parsed)
            completionHandler()
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler:
            @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // An event that arrives while the app is open is still shown.
        completionHandler([.banner, .list, .sound])
    }
}
