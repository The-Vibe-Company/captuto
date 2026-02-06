import SwiftUI

@main
struct VibeTutoApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            PreferencesView()
                .frame(width: 480, height: 400)
        }
    }
}
