import Foundation

// Mirrors lib/utils/format.ts's formatLastName — the last word of a player's full
// name for space-constrained labels (field dot names, compare-view mobile columns).
// A trailing generational suffix ("Jr.", "Sr.", "II", "III", "IV", "V") is stripped
// first so it isn't mistaken for the last name; a single-word name falls back to the
// full string.
private let nameSuffixes: Set<String> = ["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]

func formatLastName(_ full: String) -> String {
    var parts = full.split(whereSeparator: \.isWhitespace).map(String.init)
    while parts.count > 1, nameSuffixes.contains(parts[parts.count - 1].lowercased()) {
        parts.removeLast()
    }
    return parts.last ?? full
}
