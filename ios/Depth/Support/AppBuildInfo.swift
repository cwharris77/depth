import Foundation

// Static About-section content (Settings) — design spec Gate 0 item 9's in-app
// non-affiliation disclaimer, Milestone 2B item 24's "settings" item, and the DEP-160
// privacy-policy link (required by Apple — reachable from within the app, not just the
// App Store listing). The production site (depth-ashen.vercel.app) hosts the /privacy
// page; verified live before wiring the link here.
enum AppBuildInfo {
    static let displayName = "Depth"

    static let nonAffiliationDisclaimer =
        "This app is not endorsed by or affiliated with the National Football League. "
        + "Any trademarks used in the app are used solely to identify the respective "
        + "entities and remain the property of their respective owners."

    /// The live production `/privacy` page (verified 200 on depth-ashen.vercel.app).
    /// Kept as a string so a typo degrades to a nil URL at the call site rather than a
    /// crash — the About card simply omits the row if it can't be constructed.
    static let privacyPolicyURLString = "https://depth-ashen.vercel.app/privacy"

    static var privacyPolicyURL: URL? { URL(string: privacyPolicyURLString) }

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
