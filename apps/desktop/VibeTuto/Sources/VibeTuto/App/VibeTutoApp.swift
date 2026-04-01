import SwiftUI

@main
struct VibeTutoApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        // All UI is managed by FloatingPanelController via AppDelegate.
        // Settings are integrated as tabs in the main panel.
        Settings {
            EmptyView()
        }
    }
}
