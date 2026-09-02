import Foundation

// THROWAWAY: verifying the ios-ui-screenshots gate exempts Data/ — not for merge.
// Typed error surface for every repository operation (design spec's "Data and state
// contract"). One case per distinct recovery UI needs — never a bare String/nil.
enum DepthError: Error, Equatable {
    case notFound
    case offline
    case unauthenticated
    case permissionDenied
    case validation(String)
    case incompatibleBuild
    case server(String)
    case decoding(String)
}

// A URLError from the Supabase client is only a real "offline" condition for a few
// codes — the internet connection itself is gone (airplane mode, Wi-Fi with no service,
// cellular data disabled). Everything else (wrong address, connection refused, ATS
// block, timeout, task cancelled) means the user IS online but the request couldn't
// complete against that server — a server error, never a claim that their internet is
// down. This is the single source of truth for every service's URLError mapping.
extension URLError {
    var isNetworkUnavailable: Bool {
        switch code {
        case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed:
            return true
        default:
            return false
        }
    }
}

// One mapper producing user-facing recovery copy per case (design spec's "Data and
// state contract": "One mapper produces specific user recovery states"). Never surfaces
// the raw associated-value diagnostic string to users — that's for os.Logger only.
extension DepthError {
    var recoveryDescription: String {
        switch self {
        case .notFound:
            return "We couldn't find that."
        case .offline:
            return "You're offline. Check your connection and try again."
        case .unauthenticated:
            return "Sign in to continue."
        case .permissionDenied:
            return "You don't have permission to do that."
        case .validation:
            return "That doesn't look right. Please check and try again."
        case .incompatibleBuild:
            return "Please update the app to continue."
        case .server, .decoding:
            return "Something went wrong loading this. Please try again."
        }
    }

    /// Non-sensitive bucket for `AppEvent.error` (design spec Milestone 2B item 26) —
    /// the case name only, never the associated diagnostic string.
    var telemetryCategory: String {
        switch self {
        case .notFound: "notFound"
        case .offline: "offline"
        case .unauthenticated: "unauthenticated"
        case .permissionDenied: "permissionDenied"
        case .validation: "validation"
        case .incompatibleBuild: "incompatibleBuild"
        case .server: "server"
        case .decoding: "decoding"
        }
    }
}
