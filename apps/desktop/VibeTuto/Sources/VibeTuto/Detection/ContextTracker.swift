import Foundation
import Cocoa

/// Tracks the current application context (which app is active, window title, URL).
/// Used to enrich step metadata and detect context-based steps like URL navigation.
final class ContextTracker: @unchecked Sendable {
    private let lock = NSLock()
    private var currentAppBundleID: String?
    private var currentAppName: String?
    private var currentWindowTitle: String?
    private var appsUsed: Set<String> = []

    private let accessibilityReader = AccessibilityReader()

    /// Update context from the frontmost application.
    func updateContext() {
        lock.lock()
        defer { lock.unlock() }

        guard let app = NSWorkspace.shared.frontmostApplication else { return }

        currentAppBundleID = app.bundleIdentifier
        currentAppName = app.localizedName
        currentWindowTitle = accessibilityReader.frontWindowTitle()

        if let bundleID = app.bundleIdentifier {
            appsUsed.insert(bundleID)
        }
    }

    /// Get the current app context.
    var context: (bundleID: String?, appName: String?, windowTitle: String?) {
        lock.lock()
        defer { lock.unlock() }
        return (currentAppBundleID, currentAppName, currentWindowTitle)
    }

    /// Get all apps used during the recording session.
    var allAppsUsed: [String] {
        lock.lock()
        defer { lock.unlock() }
        return Array(appsUsed).sorted()
    }

    /// Reset for a new session.
    func reset() {
        lock.lock()
        defer { lock.unlock() }
        currentAppBundleID = nil
        currentAppName = nil
        currentWindowTitle = nil
        appsUsed.removeAll()
    }
}
