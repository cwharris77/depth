import Foundation
import Testing
@testable import Depth

// Port of lib/__tests__/format.test.ts's formatLastName cases. DEP-250 renders the
// player's last name under each field dot, so the web formatter's behavior — including
// the generational-suffix stripping — must match exactly.
struct NameFormatTests {
    @Test("returns the final word for a plain two-word name")
    func plainTwoWordName() {
        #expect(formatLastName("Russell Wilson") == "Wilson")
    }

    @Test("keeps a hyphenated last name whole")
    func hyphenatedLastName() {
        #expect(formatLastName("Jaxon Smith-Njigba") == "Smith-Njigba")
    }

    @Test("treats a multi-word surname as the last name")
    func multiWordSurname() {
        #expect(formatLastName("Amon-Ra St. Brown") == "Brown")
    }

    @Test("strips a generational suffix so it is not mistaken for the last name")
    func stripsGenerationalSuffix() {
        #expect(formatLastName("Odell Beckham Jr.") == "Beckham")
        #expect(formatLastName("Odell Beckham Jr") == "Beckham")
        #expect(formatLastName("Michael Pittman III") == "Pittman")
    }

    @Test("falls back to the full string for a single-word name")
    func singleWordName() {
        #expect(formatLastName("Prime") == "Prime")
    }
}
