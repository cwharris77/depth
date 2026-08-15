import Foundation

// Static About-section content (Settings) — design spec Gate 0 item 9's in-app
// non-affiliation disclaimer and Milestone 2B item 24's "settings" item. Privacy/support
// links are deliberately absent: T1/Gate 0 (domain reservation, App Store Connect record,
// support contact) has not landed, and this task's brief explicitly forbids guessing a
// placeholder URL/email — see `.superpowers/sdd/2026-08-14-native-ios-app/task-8d-settings-about-timestamps-brief.md`.
enum AppBuildInfo {
    static let displayName = "Depth"

    static let nonAffiliationDisclaimer =
        "This app is not endorsed by or affiliated with the National Football League. "
        + "Any trademarks used in the app are used solely to identify the respective "
        + "entities and remain the property of their respective owners."

    /// Reads the live bundle's version/build. A production `Bundle.main` always has both
    /// keys (Xcode fills them from the target's marketing/build-number settings), but a
    /// missing value still degrades to "—" rather than crashing or showing "nil".
    static var versionAndBuild: String {
        formattedVersionAndBuild(
            version: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
            build: Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        )
    }
}

/// Pure formatter so the missing/present branches are unit-testable without a real bundle.
func formattedVersionAndBuild(version: String?, build: String?) -> String {
    let fallback = "\u{2014}"  // em dash
    let versionText = (version?.isEmpty == false) ? version! : fallback
    let buildText = (build?.isEmpty == false) ? build! : fallback
    return "\(versionText) (\(buildText))"
}
