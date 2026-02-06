import Foundation
import Cocoa

/// Tracks when the user switches between applications using NSWorkspace notifications.
final class AppSwitchTracker: @unchecked Sendable {
    private var observer: NSObjectProtocol?
    private var onAction: ActionCallback?
    private var sessionStartTime: Date?
    private var lastAppBundleID: String?
    private let accessibilityReader = AccessibilityReader()

    /// Start tracking app switches.
    func start(sessionStart: Date, onAction: @escaping ActionCallback) {
        self.sessionStartTime = sessionStart
        self.onAction = onAction
        self.lastAppBundleID = NSWorkspace.shared.frontmostApplication?.bundleIdentifier

        observer = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            self?.handleAppSwitch(notification)
        }
    }

    /// Stop tracking app switches.
    func stop() {
        if let observer = observer {
            NSWorkspace.shared.notificationCenter.removeObserver(observer)
            self.observer = nil
        }
        onAction = nil
    }

    private func handleAppSwitch(_ notification: Notification) {
        guard let sessionStart = sessionStartTime,
              let userInfo = notification.userInfo,
              let app = userInfo[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
            return
        }

        let newBundleID = app.bundleIdentifier
        guard newBundleID != lastAppBundleID else { return }

        lastAppBundleID = newBundleID
        let relativeTime = Date().timeIntervalSince(sessionStart)

        let screenFrame = NSScreen.main?.frame ?? CGRect(x: 0, y: 0, width: 2560, height: 1600)

        let action = CapturedAction(
            relativeTime: relativeTime,
            actionType: .appSwitch,
            viewportWidth: Int(screenFrame.width),
            viewportHeight: Int(screenFrame.height),
            appBundleID: app.bundleIdentifier,
            appName: app.localizedName,
            windowTitle: accessibilityReader.frontWindowTitle()
        )

        onAction?(action)
    }
}
