import Foundation

// Static About-section content (Settings) — design spec Gate 0 item 9's in-app
// non-affiliation disclaimer, Milestone 2B item 24's "settings" item, and the DEP-160
// privacy-policy link (required by Apple — reachable from within the app, not just the
// App Store listing). The production site (depth-ashen.vercel.app) hosts the /privacy
// page; verified live before wiring the link here.
enum AppBuildInfo {
    /// Reads the live bundle's CFBundleDisplayName rather than a literal — a hardcoded
    /// string here silently went stale during the "The Sticks" rename (caught in QA:
    /// this row kept showing "Depth" even after the bundle's Info.plist was fixed).
    /// Falls back to CFBundleName, then "Depth", for the same reason versionAndBuild
    /// degrades rather than crashing on a missing key.
    static var displayName: String {
        (Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String)
            ?? (Bundle.main.infoDictionary?["CFBundleName"] as? String)
            ?? "Depth"
    }

    static let nonAffiliationDisclaimer =
        "This app is not endorsed by or affiliated with the National Football League. "
        + "Any trademarks used in the app are used solely to identify the respective "
        + "entities and remain the property of their respective owners."

    /// The live production `/privacy` page (verified 200 on depth-ashen.vercel.app).
    /// Kept as a string so a typo degrades to a nil URL at the call site rather than a
    /// crash — the About card simply omits the row if it can't be constructed.
    static let privacyPolicyURLString = "https://depth-ashen.vercel.app/privacy"

    static var privacyPolicyURL: URL? { URL(string: privacyPolicyURLString) }

    /// The support/feedback contact address — previously an unfilled Gate 0 item (no
    /// placeholder was invented before a real address existed). Also published on the
    /// production `/support` page for App Store Connect's Support URL field.
    static let supportEmail = "cwharris365@gmail.com"

    /// `mailto:` link pre-filled with a subject carrying the version/build, so a report
    /// sent from the About card always identifies which build it came from without the
    /// user having to type it. Body is left blank rather than pre-filled with a template
    /// — most people just start typing over an empty body but tend to leave scaffolding
    /// untouched, which produces useless reports.
    static var feedbackMailtoURL: URL? {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = supportEmail
        components.queryItems = [
            URLQueryItem(name: "subject", value: "\(displayName) feedback (\(versionAndBuild))")
        ]
        return components.url
    }

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
