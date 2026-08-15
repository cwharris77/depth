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
