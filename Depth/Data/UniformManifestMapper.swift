import Foundation

// Decodes the published uniform artifact manifest (web/lib/uniforms/manifest.ts) into each
// design's extra verified combinations. Only the fields the archive reads are decoded, and
// all of them leniently: a row or combination that is missing a field or has one of the
// wrong type is skipped, never fatal to the rest.
enum UniformManifestMapper {
    private struct ManifestDTO: Decodable {
        let rows: [Lossy<RowDTO>]?
    }

    private struct RowDTO: Decodable {
        let catalogId: String?
        let combinations: [Lossy<CombinationDTO>]?
    }

    /// One array element that decodes to nil instead of failing the whole array.
    private struct Lossy<Value: Decodable>: Decodable {
        let value: Value?

        init(from decoder: Decoder) throws {
            value = try? Value(from: decoder)
        }
    }

    private struct CombinationDTO: Decodable {
        let key: String?
        let label: String?
        let full: ArtifactDTO?
    }

    private struct ArtifactDTO: Decodable {
        let path: String?
    }

    /// Combinations keyed by catalog id; rows with none are left out.
    static func combinations(from data: Data) throws -> [String: [UniformCombination]] {
        let manifest = try JSONDecoder().decode(ManifestDTO.self, from: data)
        var result: [String: [UniformCombination]] = [:]
        for row in (manifest.rows ?? []).compactMap(\.value) {
            guard let id = row.catalogId else { continue }
            let combinations = (row.combinations ?? []).compactMap(\.value).compactMap {
                dto -> UniformCombination? in
                guard let key = dto.key, let label = dto.label, let url = artURL(dto.full?.path)
                else { return nil }
                return UniformCombination(key: key, label: label, fullURL: url)
            }
            if !combinations.isEmpty { result[id] = combinations }
        }
        return result
    }

    /// Manifest paths are origin-relative (`/uniforms/<file>.webp`); anything else is
    /// rejected rather than fetched from wherever it points.
    private static func artURL(_ path: String?) -> URL? {
        guard let path, path.hasPrefix("/uniforms/"), !path.contains("..") else { return nil }
        return URL(string: UniformArt.origin + path)
    }
}
