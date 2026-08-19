import Foundation
import Testing
@testable import Depth

// Browsing a connection that's genuinely down should read as offline; a wrong
// address / refused / ATS-blocked / cancelled request is a server error, never a
// claim that the user's internet is gone.
@Test func networkUnavailableURLCodeMapsToOffline() {
    #expect(URLError(.notConnectedToInternet).isNetworkUnavailable == true)
    #expect(URLError(.networkConnectionLost).isNetworkUnavailable == true)
    #expect(URLError(.dataNotAllowed).isNetworkUnavailable == true)
}

@Test func reachableButGenuinelyServerSideURLCodeIsNotOffline() {
    #expect(URLError(.cannotConnectToHost).isNetworkUnavailable == false)
    #expect(URLError(.timedOut).isNetworkUnavailable == false)
    #expect(URLError(.appTransportSecurityRequiresSecureConnection).isNetworkUnavailable == false)
    #expect(URLError(.cancelled).isNetworkUnavailable == false)
    #expect(URLError(.badServerResponse).isNetworkUnavailable == false)
}