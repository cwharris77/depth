import Testing

@testable import Depth

@Test func notificationTierWireValuesMatchTheServerCheckConstraint() {
    #expect(NotificationTier.allCases.map(\.rawValue) == ["big_moments", "everything", "off"])
}

@Test func notificationTierTitlesAreTheThreeControlLabels() {
    #expect(NotificationTier.allCases.map(\.title) == ["Big moments", "Everything", "Off"])
}

@Test func proactiveNotificationsFlagIsNotLaunched() {
    let definition = FeatureFlag.proactiveNotifications.definition
    #expect(definition.key == "proactiveNotifications")
    #expect(definition.launched == false)
}
