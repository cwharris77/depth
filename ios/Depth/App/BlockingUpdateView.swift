import SwiftUI
import UIKit

// Shown when the installed build is below `app_config.minimum_supported_build`. The App
// Store product page URL is a placeholder until Gate 0 (T1) reserves the real App Store
// Connect record and app id.
struct BlockingUpdateView: View {
    var body: some View {
        ContentUnavailableView {
            Label("Update Required", systemImage: "arrow.down.circle")
        } description: {
            Text("A newer version of Depth is required to continue.")
        } actions: {
            Button("Update") {
                if let url = URL(string: "itms-apps://itunes.apple.com/app/id0") {
                    UIApplication.shared.open(url)
                }
            }
        }
    }
}
