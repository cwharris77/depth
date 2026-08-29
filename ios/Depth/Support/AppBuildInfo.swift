import Foundation

// Static About-section content (Settings) — design spec Gate 0 item 9's in-app
// non-affiliation disclaimer, Milestone 2B item 24's "settings" item, and the DEP-160
// legal links (required by Apple — reachable from within the app, not just the App Store
// listing). The production site hosts both public pages; every in-app destination derives
// from this one canonical origin rather than repeating or guessing hosts at call sites.
enum AppBuildInfo {
    /// Reads the live bundle's CFBundleDisplayName rather than a literal — a hardcoded
    /// string here silently went stale during the "The Sticks" rename (caught in QA:
    /// this row kept showing "Depth" even after the bundle's Info.plist was fixed).
    /// Falls back to CFBundleName, then "The Sticks", for the same reason versionAndBuild
    /// degrades rather than crashing on a missing key.
    static var displayName: String {
        (Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String)
            ?? (Bundle.main.infoDictionary?["CFBundleName"] as? String)
            ?? "The Sticks"
    }

    static let nonAffiliationDisclaimer =
        "This app is not endorsed by or affiliated with the National Football League. "
        + "Any trademarks used in the app are used solely to identify the respective "
        + "entities and remain the property of their respective owners."

    /// Canonical public origin — the branded custom domain, not the generated
    /// `depth-ashen.vercel.app` alias this shipped with before 2026-08-28. The alias still
    /// 301s here, so builds already in testers' hands keep resolving these links; new
    /// builds skip the hop. Kept as a string so malformed configuration degrades to nil at
    /// each call site.
    ///
    /// NOTE: `UniformArt.baseURL` deliberately still points at the old alias — the
    /// `uniforms.image_path` rows in production embed that origin, so moving the artwork
    /// origin is a code+data migration rather than a constant swap. Don't "fix" the
    /// inconsistency by editing one side.
    private static let publicSiteURLString = "https://sticks.cooper-harris.site"

    static let privacyPolicyURLString = "\(publicSiteURLString)/privacy"
    static let termsOfServiceURLString = "\(publicSiteURLString)/terms"

    static var privacyPolicyURL: URL? { URL(string: privacyPolicyURLString) }
    static var termsOfServiceURL: URL? { URL(string: termsOfServiceURLString) }

    /// The support/feedback contact address. Mirrors SUPPORT_EMAIL in lib/utils/legal.ts —
    /// the same address is published on `/privacy`, `/terms` and `/support`, so the two
    /// must change together (nothing enforces that at build time). Also the address behind
    /// App Store Connect's Support URL field.
    static let supportEmail = "support@cooper-harris.site"

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

    /// Customer-facing marketing version shown in Settings. The build number stays out
    /// of the visible About card, while `versionAndBuild` below retains it for support
    /// email diagnostics and update-gate troubleshooting.
    static var version: String {
        guard
            let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
            !version.isEmpty
        else { return "\u{2014}" }
        return version
    }

    /// Diagnostic version/build used in support email subjects. A production
    /// `Bundle.main` always has both keys, but a missing value still degrades to "—"
    /// rather than crashing or showing "nil".
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
