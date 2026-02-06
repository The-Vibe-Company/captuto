import Cocoa
import ServiceManagement

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var menuBarController: MenuBarController?
    private let permissionChecker = PermissionChecker()

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide dock icon - menu bar only
        NSApp.setActivationPolicy(.accessory)

        // Prevent macOS from auto-terminating the app when no windows are visible
        ProcessInfo.processInfo.disableAutomaticTermination("Menu bar app must stay alive")
        ProcessInfo.processInfo.disableSuddenTermination()

        // Setup menu bar
        menuBarController = MenuBarController()

        // Check permissions on launch (silent - no system dialog)
        let screenPerm = permissionChecker.checkScreenRecordingSilent()
        let accessPerm = permissionChecker.checkAccessibility()
        if screenPerm != .granted || accessPerm != .granted {
            showOnboarding()
        }

        // Register for app activation
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appDidActivate(_:)),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }

    @objc private func appDidActivate(_ notification: Notification) {
        // Track app switches for the recording session
        guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
            return
        }
        let bundleID = app.bundleIdentifier ?? "unknown"
        let appName = app.localizedName ?? "Unknown App"
        Task { @MainActor in
            SessionManager.shared.handleAppSwitch(
                bundleID: bundleID,
                name: appName
            )
        }
    }

    private func showOnboarding() {
        let onboarding = OnboardingWindowController()
        onboarding.showWindow(nil)
    }

    /// Register the app as a login item.
    func setLaunchAtLogin(_ enabled: Bool) {
        if #available(macOS 13.0, *) {
            do {
                if enabled {
                    try SMAppService.mainApp.register()
                } else {
                    try SMAppService.mainApp.unregister()
                }
            } catch {
                print("[AppDelegate] Failed to update login item: \(error)")
            }
        }
    }
}
