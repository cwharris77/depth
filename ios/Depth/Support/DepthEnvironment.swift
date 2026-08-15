import Foundation
import Supabase

// Constructs the one shared SupabaseClient from the values baked into Info.plist by the
// active .xcconfig (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY — see ios/xcconfig/). Only
// the public publishable key ever reaches the app bundle; the secret key is never
// referenced anywhere in ios/.
enum DepthEnvironment {
    static let supabaseClient: SupabaseClient = {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: urlString),
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_PUBLISHABLE_KEY") as? String
        else {
            fatalError("Missing SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY in Info.plist — check the active .xcconfig")
        }
        return SupabaseClient(supabaseURL: url, supabaseKey: key)
    }()

    static let repository: DepthRepository = SupabaseDepthRepository(client: supabaseClient)
}
