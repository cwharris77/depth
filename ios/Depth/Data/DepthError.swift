import Foundation

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
}
